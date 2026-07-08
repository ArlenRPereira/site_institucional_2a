---
name: supabase-admin-client
description: >
  Configuração e uso correto do cliente Supabase com service_role key no backend.
  Use esta skill ao trabalhar com src/lib/supabase.ts, ao criar queries que exigem
  bypass de RLS, ao gerenciar usuários via Admin API, ou ao integrar Storage e
  Edge Functions server-side. Cobre: setup do client tipado, diferença entre
  service_role e anon key, padrões de query seguros sem RLS, Admin Auth API,
  Storage server-side, invocação de Edge Functions e variáveis de ambiente
  obrigatórias.
---

Esta skill define como configurar e usar o cliente Supabase server-side com `service_role`.
Aplique-a em `src/lib/supabase.ts` e em qualquer arquivo que importe o client Supabase.

## Conceito Central: service_role vs anon

| Aspecto                  | `anon` key (frontend)         | `service_role` key (backend) |
|--------------------------|-------------------------------|------------------------------|
| Respeita RLS             | ✅ Sim                         | ❌ Não (bypass total)         |
| Acesso Admin Auth API    | ❌ Não                         | ✅ Sim                        |
| Onde usar                | Browser (cliente web)         | Servidor Node.js apenas      |
| Expor ao cliente         | ✅ Pode (é pública)            | ❌ NUNCA — acesso irrestrito  |
| Ownership check          | Automático via RLS            | **Manual obrigatório**       |

> ⚠️ Como o service_role bypassa RLS, **todo ownership check é responsabilidade do código**.
> Sempre incluir `.eq('user_id', userId)` em queries de leitura/escrita por usuário.

## Setup do Client Tipado

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Validar variáveis no carregamento do módulo
if (!process.env.SUPABASE_URL)              throw new Error('Missing SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,  // servidor não mantém sessão
      autoRefreshToken: false, // sem refresh automático server-side
    },
    db: {
      schema: 'public', // schema padrão
    },
    global: {
      headers: {
        'x-app-name': process.env.APP_NAME ?? 'api-backend',
      },
    },
  }
)
```

## Variáveis de Ambiente

```bash
# .env
SUPABASE_URL=https://{project-ref}.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Obtida em: Project Settings → API → service_role

# Opcional — para client tipado com schema customizado
SUPABASE_DB_SCHEMA=public

# .env.example (sem valores reais — commitar este)
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Padrões de Query — CRUD com Ownership

### SELECT com paginação
```typescript
import { supabase } from '../lib/supabase'

const { data, error, count } = await supabase
  .from('projects')
  .select('id, name, status, created_at', { count: 'exact' })
  .eq('user_id', userId)          // ← ownership obrigatório (RLS bypassed)
  .order('created_at', { ascending: false })
  .range(from, to)                // paginação server-side

if (error) throw new Error(error.message)
return { data: data ?? [], total: count ?? 0 }
```

### SELECT com join
```typescript
const { data, error } = await supabase
  .from('invoices')
  .select(`
    id, amount, status, due_date,
    client:clients ( id, name, email ),
    items:invoice_items ( id, description, quantity, unit_price )
  `)
  .eq('user_id', userId)
  .eq('id', invoiceId)
  .single()

if (error?.code === 'PGRST116') return null  // não encontrado
if (error) throw new Error(error.message)
return data
```

### INSERT retornando o registro criado
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    name,
    description,
    user_id: userId,    // sempre definido pelo servidor, nunca pelo cliente
    status: 'draft',
  })
  .select()             // necessário para retornar o registro criado
  .single()

if (error) throw new Error(error.message)
return data
```

### UPDATE com ownership e retorno
```typescript
const { data, error } = await supabase
  .from('projects')
  .update({
    name,
    updated_at: new Date().toISOString(),
  })
  .eq('id', id)
  .eq('user_id', userId)  // ownership check — sem isso, qualquer row seria atualizada
  .select()
  .single()

if (error?.code === 'PGRST116') throw new NotFoundError('Project')
if (error) throw new Error(error.message)
return data
```

### DELETE seguro
```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', id)
  .eq('user_id', userId)  // ownership obrigatório

if (error) throw new Error(error.message)
// DELETE não retorna dados por padrão — adicionar .select() se precisar
```

### UPSERT
```typescript
const { data, error } = await supabase
  .from('user_settings')
  .upsert(
    { user_id: userId, key: settingKey, value: settingValue },
    {
      onConflict: 'user_id, key',  // colunas da constraint UNIQUE
      ignoreDuplicates: false,      // atualizar em conflito (não ignorar)
    }
  )
  .select()
  .single()

if (error) throw new Error(error.message)
return data
```

## Admin Auth API

Operações de gerenciamento de usuários que só o service_role pode fazer:

```typescript
// Buscar usuário por ID (sem expor ao cliente)
const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
if (error || !user) throw new NotFoundError('User')

// Criar usuário sem fluxo de signup (ex: import em massa, convites)
const { data: { user }, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'temp-password-123',   // usuário deve alterar no primeiro acesso
  email_confirm: true,              // pular email de confirmação
  user_metadata: { name: 'João Silva', invited_by: adminUserId },
})

// Atualizar e-mail ou metadados de um usuário
const { data: { user }, error } = await supabase.auth.admin.updateUserById(userId, {
  email: 'new@example.com',
  user_metadata: { plan: 'pro' },
})

// Deletar usuário (+ cascade nos dados via DB trigger/FK)
const { error } = await supabase.auth.admin.deleteUser(userId)

// Gerar magic link para login sem senha
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'user@example.com',
  options: { redirectTo: 'https://app.example.com/dashboard' },
})

// Verificar e decodificar um JWT (middleware authenticate)
const { data: { user }, error } = await supabase.auth.getUser(jwtToken)
if (error || !user) throw new UnauthorizedError()
```

## Storage — Server-side

```typescript
// Upload de arquivo
const filePath = `${userId}/${Date.now()}-${sanitizeFilename(originalName)}`
const { data, error } = await supabase.storage
  .from('attachments')             // nome do bucket
  .upload(filePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,                  // false = erro em conflito; true = sobrescrever
    cacheControl: '3600',
  })
if (error) throw new Error(error.message)
return data.path

// Download de arquivo (buffer)
const { data, error } = await supabase.storage
  .from('attachments')
  .download(filePath)
if (error) throw new Error(error.message)
const buffer = Buffer.from(await data.arrayBuffer())

// URL pública (bucket deve ser público)
const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
return data.publicUrl  // https://{project}.supabase.co/storage/v1/object/public/...

// URL assinada (bucket privado, expira em N segundos)
const { data, error } = await supabase.storage
  .from('attachments')
  .createSignedUrl(filePath, 3600)  // expira em 1h
if (error) throw new Error(error.message)
return data.signedUrl

// Deletar arquivo
const { error } = await supabase.storage
  .from('attachments')
  .remove([filePath])               // array — pode deletar múltiplos
if (error) throw new Error(error.message)

// Mover/renomear arquivo
const { error } = await supabase.storage
  .from('attachments')
  .move(oldPath, newPath)
```

## Chamada de Edge Functions

```typescript
// Invocar uma Edge Function server-side
const { data, error } = await supabase.functions.invoke('process-payment', {
  body: { invoiceId, amount, currency: 'BRL' },
  headers: { 'x-correlation-id': correlationId },
})
if (error) throw new Error(`Edge Function error: ${error.message}`)
return data
```

## Queries Avançadas

### Filtros combinados
```typescript
let query = supabase
  .from('tasks')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)

// Aplicar filtros dinamicamente
if (filters.status)  query = query.eq('status', filters.status)
if (filters.search)  query = query.ilike('title', `%${filters.search}%`)
if (filters.from)    query = query.gte('due_date', filters.from)
if (filters.to)      query = query.lte('due_date', filters.to)
if (filters.priority) query = query.in('priority', filters.priority) // array de valores

const { data, error, count } = await query
  .order('created_at', { ascending: false })
  .range(from, to)
```

### Chamada de função Postgres (RPC)
```typescript
const { data, error } = await supabase
  .rpc('calculate_monthly_revenue', {
    p_user_id: userId,
    p_month:   '2025-01',
  })
if (error) throw new Error(error.message)
return data as number
```

### Transação via RPC
```typescript
// Operações atômicas devem ser encapsuladas em função Postgres
// src/services/invoice.service.ts
const { data, error } = await supabase
  .rpc('create_invoice_with_items', {
    p_user_id:   userId,
    p_client_id: clientId,
    p_items:     JSON.stringify(items),   // jsonb no Postgres
    p_due_date:  dueDate,
  })
if (error) throw mapDbError(error)
return data
```

## Verificação de JWT no Middleware de Auth

```typescript
// src/middlewares/auth.ts
import { supabase } from '../lib/supabase'

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })

  // getUser valida a assinatura do JWT contra a chave pública do Supabase
  // Não confiar em jwt.decode() sem verificação de assinatura
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })

  req.user = user
  next()
}
```

## Segurança — Checklist Rápido

- [ ] `SUPABASE_SERVICE_ROLE_KEY` apenas em variável de ambiente, nunca no código
- [ ] Client importado apenas de `src/lib/supabase.ts` — nunca criar instâncias avulsas
- [ ] Todas as queries filtram por `user_id` (RLS está bypassed)
- [ ] `user_id` definido pelo servidor (`req.user!.id`), nunca aceito do `req.body`
- [ ] `supabase.auth.getUser(token)` usado para verificar JWTs (não `jwt.decode`)
- [ ] URLs de Storage assinadas para buckets privados (não URLs públicas)
- [ ] Nomes de arquivo sanitizados antes do upload (sem path traversal)

## Anti-patterns

```typescript
// ❌ Criar client fora de src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ✅ Sempre importar o singleton
import { supabase } from '../lib/supabase'

// ❌ Aceitar user_id do body — permite IDOR
await supabase.from('projects').insert({ ...req.body }) // req.body pode ter user_id falso

// ✅ user_id sempre do req.user (populado pelo middleware authenticate)
await supabase.from('projects').insert({ ...req.body, user_id: req.user!.id })

// ❌ Ignorar o campo error do Supabase
const { data } = await supabase.from('projects').select('*').eq('id', id)
return data ?? null  // se deu erro, data é null — silêncio perigoso

// ✅ Sempre checar error antes de usar data
const { data, error } = await supabase.from('projects').select('*').eq('id', id)
if (error) throw new Error(error.message)
return data

// ❌ select('*') em tabela com campos sensíveis
const { data } = await supabase.from('users').select('*')

// ✅ Selecionar apenas campos necessários
const { data } = await supabase.from('users').select('id, name, email, avatar_url')

// ❌ Upload sem sanitizar o nome do arquivo
.upload(`${userId}/${req.file.originalname}`, buffer)  // path traversal possível

// ✅ Sanitizar e usar timestamp para evitar colisão
import { sanitize } from 'sanitize-filename'
.upload(`${userId}/${Date.now()}-${sanitize(req.file.originalname)}`, buffer)
```
