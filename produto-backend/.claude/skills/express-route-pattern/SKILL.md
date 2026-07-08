---
name: express-route-pattern
description: >
  Padrões canônicos para estruturar rotas Express com TypeScript. Use esta skill
  ao criar, refatorar ou revisar qualquer arquivo em src/routes/. Cobre a anatomia
  completa de um router Express: separação de responsabilidades entre route/controller/service,
  aplicação de middlewares em cadeia, tipagem do objeto Request com dados do usuário
  autenticado, tratamento de erros via next(err) e convenções de resposta JSON.
---

Esta skill define os padrões que toda rota Express deste projeto deve seguir.
Aplique-a sempre que criar ou modificar arquivos em `src/routes/`.

## Anatomia de uma Rota

Cada recurso é composto por três arquivos com responsabilidades bem definidas:

```
src/routes/
├── {resource}.routes.ts       # monta o Router, aplica middlewares
├── {resource}.controller.ts   # handlers HTTP (thin layer)
└── index.ts                   # agrega todos os routers
```

O service fica em `src/services/{resource}.service.ts` e contém toda a lógica de negócio e queries.

## Router File — `{resource}.routes.ts`

```typescript
import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { {Resource}Schema } from '@org/shared-contracts'
import * as controller from './{resource}.controller'

// mergeParams: true é necessário para rotas aninhadas herdarem params do pai
const router = Router({ mergeParams: true })

router.get('/',      authenticate, validate({Resource}Schema.query, 'query'),  controller.list)
router.get('/:id',   authenticate, validate({Resource}Schema.params, 'params'), controller.getById)
router.post('/',     authenticate, validate({Resource}Schema.create),           controller.create)
router.patch('/:id', authenticate, validate({Resource}Schema.params, 'params'),
                                   validate({Resource}Schema.update),           controller.update)
router.delete('/:id',authenticate, validate({Resource}Schema.params, 'params'), controller.remove)

export default router
```

**Regras de middlewares:**
- `authenticate` sempre primeiro nas rotas protegidas
- `validate(schema, 'params')` antes de `validate(schema)` do body quando ambos existem
- Nunca colocar lógica de negócio diretamente no router

## Controller File — `{resource}.controller.ts`

O controller é uma camada fina: recebe `req`, extrai dados, chama o service, devolve `res`.

```typescript
import { Request, Response, NextFunction } from 'express'
import { {Resource}Service } from '../services/{resource}.service'

// GET /resources
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await {Resource}Service.list({
      userId: req.user!.id,
      page: Number(page),
      limit: Number(limit),
    })
    return res.json({
      data: result.data,
      meta: { page: Number(page), limit: Number(limit), total: result.total },
    })
  } catch (err) {
    next(err)
  }
}

// GET /resources/:id
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await {Resource}Service.findById(req.params.id, req.user!.id)
    if (!data) return res.status(404).json({ error: 'Not found' })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

// POST /resources
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await {Resource}Service.create({ ...req.body, userId: req.user!.id })
    return res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

// PATCH /resources/:id
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await {Resource}Service.update(req.params.id, req.body, req.user!.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

// DELETE /resources/:id
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await {Resource}Service.remove(req.params.id, req.user!.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}
```

## Tipagem de `req.user`

Extender a interface do Express para incluir o usuário autenticado:

```typescript
// src/types/express.d.ts
import { User } from '@supabase/supabase-js'

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}
```

Acesso no controller: `req.user!.id` (non-null assertion após `authenticate`).

## Router Index — `src/routes/index.ts`

```typescript
import { Router } from 'express'
import projectRouter  from './project.routes'
import invoiceRouter  from './invoice.routes'
import memberRouter   from './member.routes'

const router = Router()

router.use('/projects',          projectRouter)
router.use('/invoices',          invoiceRouter)
// Rota aninhada — /projects/:projectId/members
router.use('/projects/:projectId/members', memberRouter)

export default router
```

## Convenções de Resposta JSON

```typescript
// Lista com paginação
res.json({
  data: [],
  meta: { page: 1, limit: 20, total: 100 },
})

// Item único
res.json({ data: { id: '...', ... } })

// Criação
res.status(201).json({ data: { id: '...', ... } })

// Remoção bem-sucedida
res.status(204).send()

// Erro de validação (gerado pelo middleware validate)
res.status(400).json({
  error: 'Validation failed',
  details: [{ field: 'name', message: 'Required' }],
})

// Não encontrado
res.status(404).json({ error: 'Not found' })

// Não autorizado
res.status(401).json({ error: 'Unauthorized' })
```

## Rotas Aninhadas

```typescript
// src/routes/member.routes.ts
// Acessa req.params.projectId graças a mergeParams: true
const router = Router({ mergeParams: true })

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params // ← disponível via mergeParams
    const data = await MemberService.listByProject(projectId, req.user!.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
})
```

## Middleware de Autenticação (referência)

```typescript
// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  req.user = user
  next()
}
```

## Anti-patterns

```typescript
// ❌ Lógica de negócio no controller
export const create = async (req, res, next) => {
  const exists = await supabaseAdmin.from('projects').select('id').eq('name', req.body.name)
  if (exists.data?.length) return res.status(409).json({ error: 'Already exists' })
  // ...
}

// ✅ Delegar para o service
export const create = async (req, res, next) => {
  try {
    const data = await ProjectService.create({ ...req.body, userId: req.user!.id })
    return res.status(201).json({ data })
  } catch (err) { next(err) }
}

// ❌ Retornar 200 em criação
res.status(200).json({ data: newProject })

// ✅
res.status(201).json({ data: newProject })

// ❌ Esquecer next(err) — erro silencioso
export const list = async (req, res) => {
  const data = await ProjectService.list(...)
  return res.json({ data })
}

// ✅ Sempre try/catch + next(err)
export const list = async (req, res, next) => {
  try {
    const data = await ProjectService.list(...)
    return res.json({ data })
  } catch (err) { next(err) }
}
```
