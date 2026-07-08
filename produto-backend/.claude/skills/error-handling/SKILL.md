---
name: error-handling
description: >
  Estratégia completa de tratamento de erros para APIs Express com TypeScript.
  Use esta skill ao implementar o error handler global, criar classes de erro
  customizadas, tratar erros específicos do Supabase/Postgres, ou revisar
  qualquer fluxo de erro na API. Cobre: hierarquia de AppError, mapeamento de
  códigos de erro do Postgres, error handler global com logging estruturado,
  respostas de erro seguras (sem stack trace em produção) e padrões de
  propagação de erro via next(err).
---

Esta skill define a estratégia de erros da API: como criar, propagar, capturar e responder.
Aplique-a em `src/middlewares/`, `src/services/` e `src/app.ts`.

## Hierarquia de Classes de Erro

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public readonly code: string = 'INTERNAL_ERROR',
    message: string = 'Internal server error',
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

// 400 — input inválido (complementa o Zod; para erros de negócio)
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

// 401 — não autenticado
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
  }
}

// 403 — autenticado mas sem permissão
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403)
  }
}

// 404 — recurso não encontrado
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

// 409 — conflito (unique constraint, estado inválido)
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

// 422 — input válido mas logicamente impossível
export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super('UNPROCESSABLE', message, 422, details)
  }
}

// 429 — rate limit (quando lançado manualmente)
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429)
  }
}
```

## Error Handler Global

```typescript
// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // 1. Erros de validação Zod (não deveriam chegar aqui se usar middleware validate,
  //    mas como fallback de segurança)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  // 2. Erros de domínio conhecidos (AppError e subclasses)
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path, method: req.method }, err.message)
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    })
  }

  // 3. Erros inesperados — logar completo, resposta genérica
  logger.error({ err, path: req.path, method: req.method, body: req.body }, 'Unhandled error')
  return res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err instanceof Error ? err.message : 'Unknown error'),
    code: 'INTERNAL_ERROR',
  })
}
```

**Registrar como último middleware em `src/app.ts`:**
```typescript
import { errorHandler } from './middlewares/errorHandler'

// ... todas as rotas registradas antes
app.use(errorHandler)
```

## Mapeamento de Erros do Postgres/Supabase

```typescript
// src/lib/errors.ts (adicionar ao mesmo arquivo)
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Converte um PostgrestError em AppError semântico.
 * Usar no service logo após checar `if (error) throw mapDbError(error)`.
 */
export function mapDbError(error: PostgrestError): AppError {
  switch (error.code) {
    // Unique constraint violated → 409 Conflict
    case '23505':
      return new ConflictError(parseUniqueConstraint(error.message))

    // Foreign key violation → 422 Unprocessable
    case '23503':
      return new UnprocessableError('Referenced resource does not exist')

    // Not null violation → 400 Validation
    case '23502':
      return new ValidationError(`Required field missing: ${error.message}`)

    // Check constraint violation → 422
    case '23514':
      return new UnprocessableError('Value violates database constraint')

    // RLS / permission denied → 403
    case '42501':
      return new ForbiddenError('Insufficient database permissions')

    // Row not found (PostgREST .single()) → tratado separado, ver abaixo
    case 'PGRST116':
      return new NotFoundError()

    // Timeout → 503
    case '57014':
      return new AppError('DB_TIMEOUT', 'Database query timeout', 503)

    default:
      return new AppError('DB_ERROR', error.message, 500)
  }
}

function parseUniqueConstraint(message: string): string {
  // Extrai o campo do detalhe da mensagem Postgres
  const match = message.match(/Key \((.+?)\)=/)
  return match ? `${match[1]} already exists` : 'Resource already exists'
}
```

## Padrão de Uso no Service

```typescript
// src/services/project.service.ts
import { supabaseAdmin } from '../lib/supabase'
import { NotFoundError, mapDbError } from '../lib/errors'
import type { CreateProjectInput } from '@org/shared-contracts'

export const ProjectService = {

  async findById(id: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    // PGRST116 = 0 rows — retornar null para o controller decidir 404
    if (error?.code === 'PGRST116') return null
    if (error) throw mapDbError(error)
    return data
  },

  async create(input: CreateProjectInput & { userId: string }) {
    const { userId, ...fields } = input
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({ ...fields, user_id: userId })
      .select()
      .single()

    if (error) throw mapDbError(error)  // 23505 → ConflictError automaticamente
    return data
  },

  async update(id: string, input: Partial<CreateProjectInput>, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error?.code === 'PGRST116') throw new NotFoundError('Project')
    if (error) throw mapDbError(error)
    return data
  },
}
```

## Padrão de Uso no Controller

```typescript
// Controller delega o tratamento de erro para next(err) → errorHandler global
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ProjectService.create({ ...req.body, userId: req.user!.id })
    return res.status(201).json({ data })
  } catch (err) {
    next(err) // ← sempre propagar, nunca tratar no controller
  }
}

// Exceção: 404 explícito após findById retornar null
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ProjectService.findById(req.params.id, req.user!.id)
    if (!data) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' })
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}
```

## Logger Estruturado

```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
  // Em produção: JSON puro — compatível com CloudWatch, Datadog, Loki, etc.
  redact: ['req.headers.authorization', 'body.password', 'body.secret'], // nunca logar
})
```

**Uso nos services (log de eventos de negócio):**
```typescript
import { logger } from '../lib/logger'

// Info — evento esperado
logger.info({ projectId: data.id, userId }, 'Project created')

// Warn — situação anormal mas controlada
logger.warn({ id, userId }, 'Project not found during update')

// Error — erro inesperado (geralmente capturado pelo errorHandler)
logger.error({ err, id }, 'Failed to delete project')
```

## Tratamento de Erros Não Capturados

```typescript
// src/index.ts (ponto de entrada do servidor)
import { logger } from './lib/logger'

// Promises rejeitadas sem .catch()
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection')
  process.exit(1)
})

// Exceções síncronas não capturadas
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception')
  process.exit(1)
})
```

## Resposta de Erro — Formato de Referência

```json
// 400 — Validação Zod
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "name",   "message": "Name is required" },
    { "field": "amount", "message": "Amount must be positive" }
  ]
}

// 401 — Sem token ou token inválido
{ "error": "Unauthorized", "code": "UNAUTHORIZED" }

// 403 — Autenticado, sem permissão
{ "error": "Forbidden", "code": "FORBIDDEN" }

// 404 — Não encontrado
{ "error": "Project not found", "code": "NOT_FOUND" }

// 409 — Conflito de unicidade
{ "error": "name already exists", "code": "CONFLICT" }

// 422 — Logicamente impossível
{ "error": "Discount must be less than amount", "code": "UNPROCESSABLE" }

// 500 — Erro inesperado (produção — sem detalhes internos)
{ "error": "Internal server error", "code": "INTERNAL_ERROR" }
```

## Anti-patterns

```typescript
// ❌ Expor stack trace em produção
res.status(500).json({ error: err.message, stack: err.stack })

// ✅ Mensagem genérica ao client, stack no log interno
logger.error({ err }, 'Unhandled error')
res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })

// ❌ Silenciar erros do Supabase
const { data, error } = await supabaseAdmin.from('projects').select('*')
return data ?? [] // ignora error silenciosamente

// ✅ Sempre checar e propagar
if (error) throw mapDbError(error)

// ❌ Tratar o erro no controller
export const create = async (req, res, next) => {
  try { ... }
  catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Duplicate' })
    return res.status(500).json({ error: 'Internal error' })
  }
}

// ✅ Lançar AppError no service, deixar o errorHandler global tratar
// service: throw new ConflictError('name already exists')
// controller: catch (err) { next(err) }

// ❌ Esquecer de registrar o errorHandler como último middleware
app.use('/api', router)
app.use(errorHandler) // ← deve vir depois de todas as rotas

// ❌ Erro silencioso em async sem try/catch
router.get('/', async (req, res) => {
  const data = await ProjectService.list(...) // se jogar, req fica pendurada
  res.json({ data })
})

// ✅ Sempre try/catch + next(err) em handlers async
router.get('/', async (req, res, next) => {
  try {
    const data = await ProjectService.list(...)
    res.json({ data })
  } catch (err) { next(err) }
})
```
