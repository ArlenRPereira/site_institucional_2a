---
name: pr-security-audit
description: >
  Workflow e checklist de auditoria de segurança cross-repo (OWASP Top 10 2021,
  OWASP SAMM, Twelve-Factor App) definidos em auditoria/SECURITY.md. Use esta skill antes
  de abrir ou atualizar qualquer pull request em produto-infra, produto-contracts,
  produto-backend ou produto-web: identifica quais projetos do monorepo mudaram,
  aplica o checklist correspondente a cada um, delega a auditoria de API ao
  agente security-auditor (produto-backend) e decide se a PR pode seguir para
  merge. Também se aplica quando SECURITY.md é editado ou quando pedirem
  "auditoria de segurança" no nível do workspace.
---

Esta skill define **quando** e **como** rodar a auditoria de segurança antes de um pull request neste workspace. O trabalho pesado (checklist completo, formato de relatório) vive no agente `pr-security-auditor`; esta skill é o gatilho e o runbook.

## Quando disparar

- Antes de `git push` de uma branch `feat/`, `fix/` ou `refactor/` em qualquer um dos 4 projetos
- Antes de abrir ou atualizar um pull request (usuário diz "abrir PR", "criar pull request", "preparar PR", "pode mergear?")
- Sempre que `SECURITY.md` for editado
- Quando pedirem explicitamente uma auditoria de segurança do workspace (não apenas de um endpoint isolado — isso é `/audit-security` em `produto-backend`)

**Não** dispare para commits que só tocam docs, testes ou config de tooling sem superfície de execução nova.

## Runbook

1. **Ler `auditoria/SECURITY.md`** primeiro — é a política vigente (OWASP Top 10, SAMM, Twelve-Factor). Se algo no código contradiz o que está documentado ali, isso é achado, não deve ser silenciado.
2. **Determinar escopo:** `git diff --stat <base>...HEAD` (ou `git status` se ainda não commitado) para saber quais dos 4 projetos (`produto-infra`, `produto-contracts`, `produto-backend`, `produto-web`) têm arquivos alterados.
3. **Invocar o agente `pr-security-auditor`** passando o escopo descoberto. Se o único projeto alterado for `produto-backend`, o agente delega ao `security-auditor` local (`/audit-security`) — não duplique o checklist de API aqui.
4. **Aplicar o gate de severidade:**
   - 🔴 Critical ou 🟠 High → não recomendar merge até corrigir
   - 🟡 Medium/🟢 Low → registrar no PR, pode mergear
5. **Atualizar o checklist do PR** (`.github/pull_request_template.md` de cada projeto já tem um item "auditoria de segurança rodada" — marcar com o resultado real, não deixar em branco).

## Referência rápida — OWASP Top 10 → onde procurar neste workspace

| Categoria | Onde olhar | Sintoma |
|---|---|---|
| A01 Broken Access Control | RLS em `produto-infra`, middleware/rotas protegidas em `produto-web`, `.eq('user_id', ...)` em `produto-backend` | Tabela sem RLS, rota autenticada fora de `ROTAS_PROTEGIDAS`, query sem ownership check |
| A02 Cryptographic Failures | cookies de sessão (`@supabase/ssr`), variáveis `.env` | Cookie sem `httpOnly`/`secure`, segredo fraco ou hardcoded |
| A03 Injection / XSS | schemas Zod em `produto-contracts`, `dangerouslySetInnerHTML` em `produto-web` | Campo aceito sem whitelist, HTML de dado externo renderizado sem sanitização |
| A05 Security Misconfiguration | CORS em Route Handlers, `origin: '*'`, headers | CORS aberto em produção, header de segurança ausente |
| A06 Vulnerable Components | lockfile diff (`pnpm-lock.yaml`) | Dependência nova sem `npm audit`/`pnpm audit` rodado |
| A08 Software/Data Integrity | versionamento de `@org/shared-contracts` | Breaking change sem bump de versão major |
| A09 Logging Failures | Pino (`produto-backend`), `console.log` no client (`produto-web`) | Token/PII em log |

Twelve-Factor relevante a toda mudança: **III. Config** (nada hardcoded), **XI. Logs** (stdout/stderr, sem arquivo local).

## Anti-patterns

```
❌ Rodar a auditoria só no hunk do diff — arquivos de auth/RLS/CORS precisam do arquivo inteiro no contexto
❌ Pular a auditoria "porque é só um fix pequeno" — mudanças pequenas em auth/RLS são as mais perigosas
❌ Confiar só em npm audit/pnpm audit — SCA cobre dependências, não cobre IDOR, RLS ausente ou XSS
❌ Copiar o checklist de SECURITY.md sem checar se ele reflete o stack real (o documento hoje descreve
   fluxo OAuth2/express-session que não existe neste monorepo Supabase — reportar a divergência,
   não replicar checks que não se aplicam)
❌ Marcar merge como liberado com finding 🔴 Critical ou 🟠 High em aberto
```

## Escalação

- Findings de escopo **backend** → agente `security-auditor` (`produto-backend/.claude/agents/security-auditor.md`) + comando `/audit-security`
- Findings de escopo **infra** (RLS, schema) → agentes `rls-policy-author` / `schema-reviewer`
- Findings cross-repo ou de **contracts**/**web** → agente `pr-security-auditor` (raiz do workspace)
