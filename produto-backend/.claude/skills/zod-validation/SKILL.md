---
name: zod-validation
description: >
  Padrões de validação de input com Zod para APIs Express. Use esta skill ao
  criar ou atualizar qualquer arquivo em src/schemas/ ou ao adicionar o middleware
  validate() em rotas. Cobre: estrutura canônica de schema por recurso, tipos de
  validação por contexto (body/params/query), middleware validate genérico,
  mensagens de erro padronizadas, transformações seguras e mapeamento de tipos
  Zod para TypeScript e OpenAPI.
---

Esta skill define como escrever e aplicar schemas Zod em toda a API.
Aplique-a sempre que criar arquivos em `src/schemas/` ou adicionar validação em rotas.

## Estrutura Canônica de Schema

Cada recurso tem um único arquivo de schema com objetos nomeados por contexto:

```typescript
// src/schemas/{resource}.schema.ts
import { z } from 'zod'

export const {Resource}Schema = {

  // Validação do body em POST
  create: z.object({
    name:        z.string().min(1, 'Name is required').max(255).trim(),
    description: z.string().max(1000).trim().optional(),
    status:      z.enum(['draft', 'active', 'archived']).default('draft'),
    amount:      z.number().positive().multipleOf(0.01).optional(),
  }),

  // Validação do body em PATCH — todos os campos opcionais
  update: z.object({
    name:        z.string().min(1).max(255).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    status:      z.enum(['draft', 'active', 'archived']).optional(),
    amount:      z.number().positive().multipleOf(0.01).optional(),
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
  ),

  // Validação de path params (:id, :projectId, etc.)
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Validação de query string (?page=1&limit=20&status=active)
  query: z.object({
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    search: z.string().max(100).trim().optional(),
    from:   z.string().datetime().optional(),
    to:     z.string().datetime().optional(),
  }),
}

// Tipos TypeScript inferidos — usar nos services
export type Create{Resource}Input = z.infer<typeof {Resource}Schema.create>
export type Update{Resource}Input = z.infer<typeof {Resource}Schema.update>
export type {Resource}QueryParams  = z.infer<typeof {Resource}Schema.query>
```

## Middleware `validate`

```typescript
// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

type Source = 'body' | 'params' | 'query'

export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({ error: 'Validation failed', details })
    }

    // Substitui req[source] pelo dado parseado/transformado (trim, coerce, default)
    req[source] = result.data as any
    next()
  }
```

**Aplicação no router:**
```typescript
// body (default)
router.post('/', authenticate, validate(ProjectSchema.create), controller.create)

// params
router.get('/:id', authenticate, validate(ProjectSchema.params, 'params'), controller.getById)

// query
router.get('/', authenticate, validate(ProjectSchema.query, 'query'), controller.list)

// múltiplos (params + body)
router.patch('/:id',
  authenticate,
  validate(ProjectSchema.params, 'params'),
  validate(ProjectSchema.update),
  controller.update
)
```

## Tipos Primitivos — Referência Rápida

```typescript
// Strings
z.string()                          // qualquer string
z.string().min(1)                   // não-vazia
z.string().min(1).max(255).trim()   // padrão para campos de texto curto
z.string().max(5000).trim()         // para campos de texto longo (bio, descrição)
z.string().email()                  // e-mail
z.string().url()                    // URL
z.string().uuid()                   // UUID v4
z.string().regex(/^\+[1-9]\d{7,14}$/) // telefone E.164
z.string().datetime()               // ISO 8601 datetime
z.string().date()                   // YYYY-MM-DD
z.literal('active')                 // valor exato

// Números
z.number()                          // qualquer número
z.number().int()                    // inteiro
z.number().positive()               // > 0
z.number().min(0).max(100)          // range
z.number().multipleOf(0.01)         // 2 casas decimais (monetário)
z.coerce.number()                   // converte string → number (útil em query params)
z.coerce.number().int().min(1)      // padrão para ?page=

// Booleanos
z.boolean()
z.coerce.boolean()                  // '1', 'true' → true (útil em query params)

// Enums
z.enum(['draft', 'active', 'archived'])
z.nativeEnum(MyEnum)                // para TypeScript enums nativos

// Opcionais e nullable
z.string().optional()               // string | undefined
z.string().nullable()               // string | null
z.string().nullish()                // string | null | undefined

// Arrays
z.array(z.string())
z.array(z.string().uuid()).min(1).max(50)

// Objetos
z.object({ key: z.string() })
z.record(z.string(), z.number())    // { [key: string]: number }

// Datas
z.string().datetime()               // valida formato ISO
z.coerce.date()                     // converte string/number → Date
```

## Transformações Seguras

Transformações executadas automaticamente pelo middleware após validação:

```typescript
// trim automático — nunca salvar espaços extras
name: z.string().min(1).max(255).trim()

// lowercase para campos de comparação
slug: z.string().min(1).max(100).toLowerCase().trim()

// coerce — query params chegam como string
page:  z.coerce.number().int().min(1).default(1)
limit: z.coerce.number().int().min(1).max(100).default(20)

// transform customizado — normalizar telefone
phone: z.string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Invalid phone format')
  .transform(v => v.replace(/\s/g, ''))

// preprocess — aceitar string ou número em JSON
amount: z.preprocess(
  val => (typeof val === 'string' ? parseFloat(val) : val),
  z.number().positive()
)
```

## Validações de Negócio com `.refine` e `.superRefine`

```typescript
// .refine — validação simples com mensagem única
const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to:   z.string().datetime(),
}).refine(
  data => new Date(data.from) < new Date(data.to),
  { message: '`from` must be before `to`', path: ['from'] }
)

// .superRefine — múltiplos erros / acesso ao ctx
const CreateInvoiceSchema = z.object({
  amount:       z.number().positive(),
  discount:     z.number().min(0).optional(),
  installments: z.number().int().min(1).max(12).optional(),
}).superRefine((data, ctx) => {
  if (data.discount && data.discount >= data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Discount must be less than amount',
      path: ['discount'],
    })
  }
  if (data.installments && data.installments > 1 && data.amount < 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Installments only available for amounts ≥ R$ 100',
      path: ['installments'],
    })
  }
})
```

## Schemas Compostos e Reutilizáveis

```typescript
// src/schemas/_shared.schema.ts — blocos reutilizáveis

// Paginação padrão — usar em todos os schemas.query
export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Param de UUID — usar em todos os schemas.params
export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// Filtro de data
export const DateRangeFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
}).refine(
  data => !(data.from && data.to) || new Date(data.from) <= new Date(data.to),
  { message: '`from` must be before or equal to `to`' }
)

// Composição
export const ProjectQuerySchema = PaginationSchema
  .merge(DateRangeFilterSchema)
  .extend({
    status: z.enum(['draft', 'active', 'archived']).optional(),
    search: z.string().max(100).trim().optional(),
  })
```

## Mensagens de Erro Customizadas

```typescript
// Passar mensagem diretamente
z.string().min(1, 'Name is required')
z.string().max(255, 'Name must have at most 255 characters')
z.string().uuid('Invalid ID format')
z.number().positive('Amount must be positive')
z.enum(['a', 'b'], { errorMap: () => ({ message: 'Invalid status' }) })

// Mensagem por tipo de erro
z.string({
  required_error:  'Name is required',
  invalid_type_error: 'Name must be a string',
})
```

## Formato de Erro da API

O middleware `validate` retorna sempre:
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "name",   "message": "Name is required" },
    { "field": "amount", "message": "Amount must be positive" },
    { "field": "from",   "message": "`from` must be before `to`" }
  ]
}
```

## Mapeamento Zod → OpenAPI 3.1

| Zod                              | OpenAPI                                        |
|----------------------------------|------------------------------------------------|
| `z.string()`                     | `{ type: 'string' }`                           |
| `z.string().uuid()`              | `{ type: 'string', format: 'uuid' }`           |
| `z.string().email()`             | `{ type: 'string', format: 'email' }`          |
| `z.string().datetime()`          | `{ type: 'string', format: 'date-time' }`      |
| `z.string().min(1).max(255)`     | `{ type: 'string', minLength: 1, maxLength: 255 }` |
| `z.number().int()`               | `{ type: 'integer' }`                          |
| `z.number().min(0)`              | `{ type: 'number', minimum: 0 }`               |
| `z.boolean()`                    | `{ type: 'boolean' }`                          |
| `z.enum(['a','b'])`              | `{ type: 'string', enum: ['a','b'] }`          |
| `z.array(z.string())`            | `{ type: 'array', items: { type: 'string' } }` |
| `.optional()`                    | remover do array `required`                    |
| `.nullable()`                    | `nullable: true`                               |
| `.default(value)`                | `default: value`                               |

## Anti-patterns

```typescript
// ❌ Schema sem limites de tamanho — permite payloads gigantes
name: z.string()

// ✅
name: z.string().min(1).max(255).trim()

// ❌ Campos do update com required — PATCH deve ser parcial
update: z.object({ name: z.string().min(1) })

// ✅
update: z.object({ name: z.string().min(1).optional() })
  .refine(d => Object.keys(d).length > 0, { message: 'At least one field required' })

// ❌ Usar z.any() — desativa validação
metadata: z.any()

// ✅ Ser explícito ou usar record
metadata: z.record(z.string(), z.unknown()).optional()

// ❌ Não exportar os tipos inferidos — force re-inferência em todo lugar
// (nenhum export)

// ✅ Exportar junto com o schema
export type CreateProjectInput = z.infer<typeof ProjectSchema.create>

// ❌ Validar manualmente no controller em vez de usar o middleware
export const create = async (req, res, next) => {
  if (!req.body.name) return res.status(400).json({ error: 'Name required' })
  // ...
}

// ✅ Deixar o Zod + middleware validate cuidar disso
router.post('/', authenticate, validate(ProjectSchema.create), controller.create)
```
