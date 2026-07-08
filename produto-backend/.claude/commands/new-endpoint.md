# Command: /new-endpoint

## Descrição
Scaffolda um endpoint REST completo: schema Zod, service, controller, route, testes unitários + integração e entrada no OpenAPI. Executa em sequência usando os agents especializados.

## Usage
```
/new-endpoint <resource> [--methods <get,post,patch,delete>] [--public] [--nested <parent>]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `resource` | ✅ | Nome do recurso no singular (ex: `project`, `invoice`, `api-key`) |
| `--methods` | ❌ | Métodos a gerar. Default: `get,post,patch,delete` |
| `--public` | ❌ | Rotas sem middleware `authenticate` |
| `--nested` | ❌ | Recurso pai para rotas aninhadas (ex: `--nested project`) |

### Exemplos
```bash
/new-endpoint invoice
/new-endpoint member --nested project --methods get,post,delete
/new-endpoint health --methods get --public
```

---

## Execution Plan

### Step 1 — Análise e Planejamento (`route-architect`)
> Antes de gerar qualquer arquivo, mapear o contrato da API.

1. Identificar o nome da tabela Supabase correspondente (plural do resource)
2. Definir os campos esperados com base no contexto do projeto
3. Confirmar estrutura de URL:
   - Padrão: `/api/{resources}`
   - Aninhado: `/api/{parents}/:parentId/{resources}`
4. Listar os métodos que serão gerados e seus contratos de request/response

**Output esperado:** contrato em formato de tabela antes de gerar arquivos.

---

### Step 2 — Schema Zod (`supabase-query-builder` + `route-architect`)
> Criar em `produto-contracts/src/schemas/{resource}.schema.ts`, **não** no backend.

O backend importa schemas de `@org/shared-contracts` — nunca define schemas localmente.

```typescript
// produto-contracts/src/schemas/{resource}.schema.ts
import { z } from 'zod'

export const {Resource}Schema = {
  create: z.object({
    // campos inferidos do contexto
  }),

  update: z.object({
    // todos opcionais para PATCH
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  }),

  params: z.object({
    id: z.string().uuid(),
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
}

export type Create{Resource}Input = z.infer<typeof {Resource}Schema.create>
export type Update{Resource}Input = z.infer<typeof {Resource}Schema.update>
```

Após criar o schema em contracts:
1. Exportar via `produto-contracts/src/index.ts`
2. Rodar `pnpm build` em `produto-contracts`
3. Rodar `pnpm install` no backend para recarregar o pacote

**Regras:**
- Strings: sempre com `.min(1)`, `.max(N)` e `.trim()`
- UUIDs: `z.string().uuid()`
- Campos opcionais no `update` via `.optional()`
- Exportar os tipos inferidos

---

### Step 3 — Service (`supabase-query-builder`)
> Gerar `src/services/{resource}.service.ts`

```typescript
// src/services/{resource}.service.ts
import { supabaseAdmin } from '../lib/supabase'
import { AppError } from '../lib/errors'
import type { Create{Resource}Input, Update{Resource}Input } from '@org/shared-contracts'

const TABLE = '{resources}' as const

export const {Resource}Service = {
  async list({ userId, page, limit }: { userId: string; page: number; limit: number }) {
    const from = (page - 1) * limit
    const { data, error, count } = await supabaseAdmin
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw new AppError('INTERNAL_ERROR', 'Falha ao listar registros')
    return { data: data ?? [], total: count ?? 0 }
  },

  async findById(id: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new AppError('INTERNAL_ERROR', 'Falha ao buscar registro')
    return data
  },

  async create(input: Create{Resource}Input & { userId: string }) {
    const { userId, ...fields } = input
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({ ...fields, user_id: userId })
      .select()
      .single()

    if (error) throw new AppError('INTERNAL_ERROR', 'Falha ao criar registro')
    return data
  },

  async update(id: string, input: Update{Resource}Input, userId: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Registro não encontrado')
    if (error) throw new AppError('INTERNAL_ERROR', 'Falha ao atualizar registro')
    return data
  },

  async remove(id: string, userId: string) {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw new AppError('INTERNAL_ERROR', 'Falha ao remover registro')
  },
}
```

---

### Step 4 — Controller + Route (`route-architect`)
> Gerar `src/routes/{resource}.controller.ts` e `src/routes/{resource}.routes.ts`

**Controller** — thin, apenas orquestra request → service → response:
```typescript
// src/routes/{resource}.controller.ts
import { Request, Response, NextFunction } from 'express'
import { {Resource}Service } from '../services/{resource}.service'

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as { page: string; limit: string }
    const result = await {Resource}Service.list({
      userId: req.user!.id,
      page: Number(page ?? 1),
      limit: Number(limit ?? 20),
    })
    return res.json({ data: result.data, meta: { page: Number(page ?? 1), limit: Number(limit ?? 20), total: result.total } })
  } catch (err) { next(err) }
}

// ... getById, create, update, remove seguindo o mesmo padrão
```

**Route** — registra handlers com middlewares:
```typescript
// src/routes/{resource}.routes.ts
import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { {Resource}Schema } from '@org/shared-contracts'
import * as controller from './{resource}.controller'

const router = Router({ mergeParams: true }) // mergeParams para rotas aninhadas

router.get('/',     authenticate, validate({Resource}Schema.query, 'query'), controller.list)
router.get('/:id',  authenticate, validate({Resource}Schema.params, 'params'), controller.getById)
router.post('/',    authenticate, validate({Resource}Schema.create), controller.create)
router.patch('/:id',authenticate, validate({Resource}Schema.params, 'params'), validate({Resource}Schema.update), controller.update)
router.delete('/:id',authenticate, validate({Resource}Schema.params, 'params'), controller.remove)

export default router
```

> ⚠️ **Registrar** a nova rota em `src/routes/index.ts` após a geração.

---

### Step 5 — Testes (`jest-test-writer`)
> Gerar `tests/unit/services/{resource}.service.test.ts` e `tests/integration/routes/{resource}.routes.test.ts`

Cobrir obrigatoriamente:
- `list()` — happy path + erro Supabase
- `findById()` — encontrado + não encontrado (PGRST116) + erro
- `create()` — happy path + erro Supabase
- `update()` — happy path + not found + erro
- `remove()` — happy path + erro
- `GET /` — 200 com dados + 401 sem token
- `POST /` — 201 criado + 400 input inválido + 401
- `PATCH /:id` — 200 atualizado + 404 não encontrado + 400 + 401
- `DELETE /:id` — 204 + 404 + 401

---

### Step 6 — Documentação OpenAPI (`api-doc-writer`)
> Adicionar/atualizar entrada em `openapi.yaml`

1. Criar schema `{Resource}` em `components/schemas`
2. Criar schema `Create{Resource}Input` em `components/schemas`
3. Criar schema `Update{Resource}Input` em `components/schemas`
4. Adicionar path `/{resources}` com operações GET + POST
5. Adicionar path `/{resources}/{id}` com operações GET + PATCH + DELETE
6. Rodar validação: `npx @redocly/cli lint openapi.yaml`

---

### Step 7 — Checklist Final (`security-auditor`)
> Antes de concluir, verificar:

- [ ] Ownership check (`user_id`) em todas as queries UPDATE/DELETE
- [ ] Middleware `authenticate` em todas as rotas protegidas
- [ ] Middleware `validate` em todas as rotas mutáveis
- [ ] Nenhum campo sensível exposto na response
- [ ] `select('*')` substituído por campos explícitos se tabela tiver colunas sensíveis
- [ ] Rota registrada em `src/routes/index.ts`
- [ ] OpenAPI validado sem erros
- [ ] Tipos TypeScript exportados do schema

---

## Arquivos Gerados

**Em `produto-contracts`:**
```
src/schemas/{resource}.schema.ts      ← Zod schema + tipos inferidos (Step 2)
```

**Em `produto-backend`:**
```
src/
├── services/{resource}.service.ts    ← lógica de negócio + queries
└── routes/
    ├── {resource}.routes.ts          ← Express router
    └── {resource}.controller.ts      ← handlers HTTP

tests/
├── unit/services/{resource}.service.test.ts
└── integration/routes/{resource}.routes.test.ts

openapi.yaml                          ← atualizado com novo recurso
```

## Nota sobre `src/routes/index.ts`
Após gerar os arquivos, adicionar manualmente:
```typescript
import {resource}Router from './{resource}.routes'
router.use('/{resources}', {resource}Router)
```
