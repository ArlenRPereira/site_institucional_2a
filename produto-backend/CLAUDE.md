# API Backend — Constituição

> Referência rápida para o Claude Code. Mantenha curto — detalhes vão para Skills.

---

## 1. Stack

- **Runtime:** Node.js 22 LTS (engines pinned)
- **Framework:** Express.js 4.x + TypeScript strict
- **Validação:** Zod (schemas importados de `@org/shared-contracts`)
- **DB client:** `@supabase/supabase-js` v2 com `service_role` (server-side only)
- **Auth:** JWT verificado via middleware próprio em `src/middlewares/auth.ts`
- **Testes:** Jest + ts-jest + Supertest (integração) + Faker (dados fictícios)
- **Package manager:** pnpm
- **Logs:** Pino — NUNCA `console.log` direto
- **Variáveis de ambiente:** `.env` local, validadas via Zod no startup em `src/lib/env.ts`
- **Containerização:** Docker (imagem node:22-alpine), `docker-compose.yml` na raiz
- **Documentação de API:** `swagger-jsdoc` (coleta JSDoc `@openapi`) + `swagger-ui-express` (UI em `/docs`)

---

## 2. Comandos canônicos

```bash
# Desenvolvimento
pnpm dev                  # tsx watch src/server.ts (porta 3333)
pnpm dev:debug            # com --inspect para attach de debugger

# Qualidade
pnpm typecheck            # tsc --noEmit
pnpm lint                 # eslint + prettier check
pnpm lint:fix             # autofix
pnpm test                 # jest run (unit + integração)
pnpm test:watch           # jest --watch
pnpm test:coverage        # jest --coverage

# Banco
pnpm db:types             # supabase gen types → shared-contracts/src/types/database.ts

# Documentação
pnpm swagger:validate     # valida spec OpenAPI gerada (sem iniciar servidor)

# Build / deploy
pnpm build                # tsc --outDir dist
pnpm start                # node dist/server.js
pnpm docker:build         # docker build
pnpm docker:up            # docker compose up -d
```

---

## 3. Estrutura de pastas

```
src/
├── server.ts             # entry point: cria app Express, registra middlewares e rotas
├── app.ts                # factory createApp() — exportável para testes
├── routes/               # handlers HTTP por recurso (um arquivo por recurso)
├── services/             # lógica de negócio — sem dependência de HTTP
├── middlewares/
│   ├── auth.ts           # verifica JWT + injeta req.user
│   ├── validate.ts       # middleware de validação Zod genérico
│   ├── rateLimiter.ts
│   └── errorHandler.ts   # captura AppError e formata resposta padronizada
├── lib/
│   ├── env.ts            # parse + validação de process.env via Zod
│   ├── supabase.ts       # cliente service_role — NUNCA importar fora de services/
│   ├── errors.ts         # classe AppError com code tipado (ApiErrorCode)
│   └── logger.ts         # instância Pino configurada
├── docs/
│   └── swagger.ts        # definição base OpenAPI + configuração swagger-jsdoc (coletada de src/routes/**)

tests/
├── integration/          # testes que sobem buildApp() + banco de test
├── unit/                 # testes de services/utils sem HTTP
└── helpers/
    ├── setup.ts          # beforeAll/afterAll globais (start/stop app)
    └── factories.ts      # dados de teste com Faker
```

---

## 4. Regras invioláveis

1. **NUNCA expor `SUPABASE_SERVICE_ROLE_KEY`** em logs, responses ou mensagens de erro. Qualquer vazamento é bug crítico de segurança.
2. **Todo body POST/PUT/PATCH validado com Zod** (de `@org/shared-contracts`) **antes** do primeiro acesso a DB.
3. **Erros sempre via `AppError`** de `src/lib/errors.ts`. Proibido `throw new Error('string')` em código de produção.
4. **RLS do Supabase é a fonte de permissão.** O backend verifica autenticação (JWT válido) e passa a query para o Supabase executar sob as policies. Nunca reimplementar regra de acesso no Node.
5. **Toda rota nova nasce com teste de integração:** happy path, 401 sem auth, 400 body inválido, 404 recurso inexistente.
6. **Adaptação snake_case ↔ camelCase é explícita** na camada de rota — nunca retorne campo snake_case para o cliente.
7. **`src/lib/supabase.ts` é importado apenas pelos services.** Rotas → services → supabase. Nunca rotas → supabase diretamente.
8. **Variáveis de ambiente apenas via `src/lib/env.ts`.** Proibido `process.env.X` espalhado pelo código.
9. **`pnpm typecheck` e `pnpm test` passando** antes de qualquer entrega. Se o Claude quebrar um, conserta antes de parar.
10. **Sem `any`, sem `@ts-ignore`.** Use `@ts-expect-error <motivo>` com justificativa se absolutamente necessário.
11. **Toda rota nova ou modificada deve ter JSDoc `@openapi` completo** (summary, tags, parâmetros, requestBody, responses 200/400/401/404/500). Após criar ou alterar qualquer rota, executar `pnpm swagger:validate` e confirmar que a spec é válida. Informar ao usuário que o Swagger foi atualizado e está disponível em `/docs`.

---

## 5. Padrão de rota (resumo)

Rota = orquestração HTTP + chamada de service. Zero lógica de negócio no handler.

O JSDoc `@openapi` é **obrigatório** acima de cada handler — é a fonte da spec Swagger.

```typescript
/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Cria um novo pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post(
  "/orders",
  authenticate,
  validate(CreateOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.create(req.user!.id, req.body);
      return res.status(201).json({ data: order });
    } catch (err) { next(err) }
  },
);
```

> Após qualquer criação ou modificação de rota: executar `pnpm swagger:validate` e informar ao usuário que o Swagger foi atualizado (disponível em `GET /docs`).

## 6. Padrão de service (resumo)

Service = lógica pura. Sem `Request`, sem `Response`, sem imports de Express.

```typescript
async create(userId: string, data: CreateOrderRequest): Promise<Order> {
  const { data: row, error } = await supabaseAdmin
    .from('orders')
    .insert({ user_id: userId, ...toSnakeCase(data) })
    .select().single();

  if (error || !row) throw new AppError('INTERNAL_ERROR', 'Falha ao criar pedido');
  return toOrder(row); // adaptação explícita snake → camel
}
```

---

## 7. Testes — convenções

### 7.1 Testes de integração

- DB: projeto Supabase de **test** isolado (`SUPABASE_URL_TEST`), nunca dev/prod
- Factories em `tests/helpers/factories.ts` com Faker — nunca fixture hardcoded
- Assertions de erro: validar `{ code }` — nunca string match de mensagem
- Naming: `it('POST /orders — 201 com pedido criado')`
- Coverage mínima de rota nova: 5 casos (happy path + 401 + 400 + 404 + 500)

### 7.2 Testes unitários

- **Framework:** Jest + ts-jest (sem Supertest, sem banco real)
- **Localização:** `tests/unit/<módulo>.test.ts` — espelhando `src/services/` e `src/lib/`
- **O que testar:** services, utils, validators, transformações camelCase ↔ snake_case, `AppError` lançado corretamente
- **O que NÃO testar:** middlewares de framework, configuração do Express, código gerado, rotas HTTP (cobertos por integração)
- **Mocking do Supabase:**

  ```typescript
  jest.mock('../../src/lib/supabase', () => ({
    supabaseAdmin: {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    },
  }));
  ```

- **Assertions de erro:** testar que o service lança `AppError` com o `code` correto — nunca string match de mensagem
- **Naming:** `describe('OrderService.create')` → `it('— lança ORDER_NOT_FOUND quando DB retorna null')`
- **Coverage mínima:** 80% de branches em `src/services/` — checar com `pnpm test:coverage`
- **Factories:** reutilizar `tests/helpers/factories.ts` com Faker para montar payloads de entrada e saídas mockadas do DB

---

## 8. Quando delegar a subagentes

| Situação                               | Subagente                |
| -------------------------------------- | ------------------------ |
| Novo endpoint (rota + service + teste) | `route-architect`        |
| Query complexa ou otimização de query  | `supabase-query-builder` |
| Escrever/expandir testes de integração | `jest-test-writer`       |
| Revisão de segurança antes de PR       | `security-auditor`       |
| Gerar/atualizar spec OpenAPI           | `api-doc-writer`         |

Regra: tarefa com mais de 2 arquivos novos → delegar ao subagente especializado.

---

## 9. Skills relevantes neste repo

| Skill | Quando usar |
|---|---|
| `express-route-pattern` | Criar ou modificar qualquer arquivo em `src/routes/` |
| `error-handling` | Implementar error handler, criar classes de erro, revisar fluxo de erro na API |
| `zod-validation` | Criar ou atualizar `src/schemas/` ou adicionar middleware `validate` em rota |
| `supabase-admin-client` | Trabalhar com `src/lib/supabase.ts`, queries server-side ou Admin Auth API |
| `swagger-openapi` | Configurar `src/docs/swagger.ts`, escrever JSDoc `@openapi`, registrar componentes reutilizáveis (`$ref`), validar spec |

---

## 10. Workflow de PR

1. Branch: `feat/<scope>-<short-desc>` a partir de `develop` (padrão cross-repo do workspace)
2. Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
3. Pré-PR obrigatório: `pnpm typecheck && pnpm lint && pnpm test && pnpm swagger:validate`
4. Se mudou contrato → PR de `shared-contracts` PRIMEIRO, depois deste repo
5. Code review: checar vazamento de service_role, RLS como fonte de permissão, erros via AppError
