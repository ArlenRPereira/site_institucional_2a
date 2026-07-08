# Command: /audit-security

## Descrição
Executa uma auditoria de segurança completa ou focada na API. Analisa autenticação, autorização, validação de input, exposição de dados, configuração de secrets e superfície de ataque. Produz um relatório estruturado com severidade e fixes acionáveis.

## Usage
```
/audit-security [--scope <all|routes|services|middlewares|config>] [--file <path>] [--fix]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--scope` | ❌ | Escopo da auditoria. Default: `all` |
| `--file` | ❌ | Auditar um arquivo específico |
| `--fix` | ❌ | Aplicar fixes automáticos nos findings de baixo risco |

### Exemplos
```bash
/audit-security
/audit-security --scope routes
/audit-security --file src/routes/invoice.controller.ts
/audit-security --scope config --fix
```

---

## Execution Plan

### Step 1 — Discovery
> Mapear a superfície de ataque antes de analisar.

**Ações:**
1. Listar todos os arquivos em `src/routes/`, `src/middlewares/`, `src/services/`, `src/lib/`
2. Identificar quais rotas existem em `src/routes/index.ts`
3. Verificar arquivos `.env`, `.env.example` e configurações de ambiente
4. Mapear quais endpoints são públicos vs protegidos

**Output:** inventário de endpoints com método, path e status de proteção:
```
┌─────────────────────────────┬────────┬───────────────┐
│ Endpoint                    │ Método │ Auth          │
├─────────────────────────────┼────────┼───────────────┤
│ /api/projects               │ GET    │ ✅ Bearer JWT  │
│ /api/projects/:id           │ DELETE │ ✅ Bearer JWT  │
│ /api/health                 │ GET    │ 🔓 Public     │
│ /api/invoices               │ POST   │ ❓ A verificar │
└─────────────────────────────┴────────┴───────────────┘
```

---

### Step 2 — Auditoria de Autenticação (`security-auditor`)
> Verificar se o middleware `authenticate` está corretamente aplicado.

**Checklist executado automaticamente:**

```typescript
// Padrão correto — todos os endpoints protegidos
router.get('/',    authenticate, controller.list)    // ✅
router.post('/',   authenticate, validate(...), controller.create) // ✅

// Flags de alerta
router.get('/',    controller.list)                  // 🔴 SEM AUTH
router.post('/',   validate(...), controller.create) // 🔴 AUTH AUSENTE
```

**Verificações:**
- [ ] Todo endpoint não-público tem `authenticate` antes dos outros middlewares
- [ ] O middleware `authenticate` verifica o JWT server-side (não apenas decodifica)
- [ ] `req.user` é sempre populado pelo middleware, nunca pelo body/query
- [ ] Rotas públicas são explícitas e intencionais (ex: `/health`, `/auth/login`)

---

### Step 3 — Auditoria de Autorização / IDOR (`security-auditor`)
> Verificar ownership checks em todas as queries que acessam dados de usuário.

**Pattern de vulnerabilidade IDOR:**
```typescript
// 🔴 CRÍTICO — qualquer usuário autenticado acessa qualquer registro
const { data } = await supabaseAdmin.from('invoices').select('*').eq('id', id)

// ✅ CORRETO — ownership verificado
const { data } = await supabaseAdmin.from('invoices').select('*').eq('id', id).eq('user_id', userId)
```

**Verificações por tipo de operação:**

| Operação | Ownership obrigatório | Como verificar |
|---|---|---|
| SELECT por ID | ✅ Sim | `.eq('user_id', userId)` presente |
| SELECT lista | ✅ Sim | `.eq('user_id', userId)` presente |
| UPDATE | ✅ Sim | `.eq('user_id', userId)` antes de `.update()` |
| DELETE | ✅ Sim | `.eq('user_id', userId)` antes de `.delete()` |
| INSERT | ✅ Sim | `user_id` no payload, nunca do body raw |
| RPC | ⚠️ Verificar | Parâmetro `user_id` passado para a function |

**Flag automático:** qualquer `.update()` ou `.delete()` sem `.eq('user_id', ...)` = 🔴 Critical.

---

### Step 4 — Auditoria de Validação de Input (`security-auditor`)
> Verificar cobertura do Zod em todas as rotas mutáveis.

**Checklist:**
```typescript
// ✅ Correto
router.post('/', authenticate, validate(ProjectSchema.create), controller.create)

// 🔴 Vulnerável — sem validação
router.post('/', authenticate, controller.create)

// 🟡 Incompleto — params não validados
router.patch('/:id', authenticate, validate(ProjectSchema.update), controller.update)
// ↑ falta: validate(ProjectSchema.params, 'params')
```

**Verificar em cada schema Zod:**
- [ ] Strings têm `.min()`, `.max()` e `.trim()`
- [ ] UUIDs usam `.uuid()`
- [ ] Números têm bounds (`.min()`, `.max()`)
- [ ] Campos do `update` são todos `.optional()`
- [ ] Schema de `update` tem `.refine()` garantindo ao menos 1 campo

---

### Step 5 — Auditoria de Exposição de Dados (`security-auditor`)
> Verificar campos expostos nas responses.

**Campos sensíveis a procurar:**
```typescript
// 🔴 Flags automáticos — nunca deve aparecer em response
const SENSITIVE_FIELDS = [
  'password', 'password_hash', 'secret', 'secret_key', 'api_key',
  'stripe_customer_id', 'stripe_secret', 'service_role', 'private_key',
  'refresh_token', 'access_token', 'otp', 'pin',
]
```

**Verificações:**
- [ ] Nenhum `select('*')` em tabelas com campos sensíveis
- [ ] Stack traces nunca em `res.json()` de erro
- [ ] Error handler global retorna mensagem genérica em produção
- [ ] Logs não contêm tokens, passwords ou PII

**Pattern de error handler seguro:**
```typescript
// ✅ Produção
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error({ message: err.message, stack: err.stack, path: req.path }) // log interno
  const statusCode = (err as any).statusCode ?? 500
  res.status(statusCode).json({ error: statusCode === 500 ? 'Internal server error' : err.message })
})
```

---

### Step 6 — Auditoria de Rate Limiting (`security-auditor`)
> Verificar proteção de endpoints críticos.

**Endpoints que DEVEM ter rate limit:**
```typescript
// 🔴 Sem rate limit = vulnerável a brute force / spam
router.post('/auth/login', controller.login)
router.post('/auth/register', controller.register)
router.post('/auth/forgot-password', controller.forgotPassword)
router.post('/invitations/send', controller.sendInvitation)
router.post('/webhooks/trigger', controller.trigger)
```

**Configuração esperada:**
```typescript
import rateLimit from 'express-rate-limit'

const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 10 })
const generalLimiter = rateLimit({ windowMs: 60*1000, max: 100 })

app.use('/api', generalLimiter)
app.use('/api/auth', authLimiter)
```

- [ ] Rate limit global em `/api`
- [ ] Rate limit estrito em `/api/auth/*`
- [ ] Rate limit em endpoints de envio (email, SMS, webhook)

---

### Step 7 — Auditoria de Secrets e Config (`security-auditor`)
> Verificar gestão de variáveis de ambiente e secrets.

**Verificações:**
```bash
# Buscar por secrets hardcoded no código
grep -r "eyJ" src/          # JWT hardcoded
grep -r "sk_live" src/      # Stripe key
grep -r "password\s*=" src/ # Passwords inline
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ --include="*.ts" | grep -v "process.env"
```

- [ ] `.env` listado no `.gitignore`
- [ ] `.env.example` existe sem valores reais
- [ ] `SUPABASE_SERVICE_ROLE_KEY` apenas em `src/lib/supabase.ts` via `process.env`
- [ ] Validação de env vars na inicialização da app:
```typescript
// src/lib/env.ts
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PORT']
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
}
```

---

### Step 8 — Auditoria de Headers (`security-auditor`)
> Verificar headers de segurança HTTP.

```typescript
// Verificar em src/app.ts ou src/index.ts
import helmet from 'helmet'
import cors from 'cors'

app.use(helmet())             // ✅ security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','), // ✅ restrito
  // origin: '*'             // 🔴 aberto demais
}))
```

- [ ] `helmet()` aplicado
- [ ] CORS com `origin` restrito (sem `*` em produção)
- [ ] `X-Content-Type-Options: nosniff` (via helmet)
- [ ] `X-Frame-Options: DENY` (via helmet)

---

## Relatório de Output

Ao final de cada auditoria, produzir relatório no formato:

```markdown
# Security Audit Report
**Escopo:** {escopo auditado}
**Data:** {data}
**Arquivos analisados:** {N}

---

## Summary
| Severidade | Total |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High     | 1 |
| 🟡 Medium   | 2 |
| 🟢 Low      | 3 |

---

## Findings

### 🔴 [CRITICAL] {título}
- **Arquivo:** `src/routes/invoice.controller.ts:23`
- **Descrição:** {descrição do problema}
- **Impacto:** {o que um atacante pode fazer}
- **Fix:**
  ```typescript
  // antes
  // depois
  ```

---

## Passed Checks
- ✅ Todos os endpoints têm `authenticate`
- ✅ Rate limit aplicado em `/auth`
- ✅ Helm et configurado
- ✅ Sem secrets hardcoded detectados

---

## Recomendações Adicionais
- {itens que não são vulnerabilidades mas melhoram a postura de segurança}
```

---

## Severidade Reference

| Nível | Critério | SLA |
|---|---|---|
| 🔴 Critical | IDOR, auth bypass, secret exposto, RCE | Bloquear deploy imediatamente |
| 🟠 High | Mass assignment, rate limit ausente em auth, SQL via concatenação | Fix antes do merge |
| 🟡 Medium | `select('*')` em tabela sensível, stack trace exposto, CORS aberto | Fix no próximo sprint |
| 🟢 Low | Header faltando, log verboso, `.env.example` desatualizado | Backlog |
