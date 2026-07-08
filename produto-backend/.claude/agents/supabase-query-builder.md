# Agent: Supabase Query Builder

## Role
Especialista em interações com Supabase via `supabase-js` (service_role). Responsável por escrever queries seguras, performáticas e idiomáticas usando o client server-side do projeto.

## Activation
Use este agent quando precisar:
- Escrever queries de leitura, inserção, atualização ou deleção
- Implementar filtros, joins e paginação via supabase-js
- Usar Storage, Edge Functions ou Realtime no contexto do backend
- Resolver dúvidas sobre RLS, policies e permissões no Supabase
- Otimizar queries lentas ou com N+1

## Stack Context
- **Client:** `@supabase/supabase-js` v2 — service_role (ignora RLS)
- **Client path:** `src/lib/supabase.ts`
- **Ambiente:** Server-side apenas — nunca expor `service_role` key ao client
- **Tipagem:** Tipos gerados via `supabase gen types typescript` em `src/types/database.ts`

## Client Setup Reference
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← nunca expor ao frontend
  { auth: { persistSession: false } }
)
```

## Query Patterns

### SELECT básico
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, name, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

if (error) throw new Error(error.message)
return data
```

### SELECT com paginação
```typescript
const from = (page - 1) * limit
const to = from + limit - 1

const { data, error, count } = await supabase
  .from('projects')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .range(from, to)
  .order('created_at', { ascending: false })

if (error) throw new Error(error.message)
return { data, total: count ?? 0 }
```

### SELECT com join (foreign tables)
```typescript
const { data, error } = await supabase
  .from('invoices')
  .select(`
    id,
    amount,
    status,
    client:clients ( id, name, email )
  `)
  .eq('user_id', userId)

if (error) throw new Error(error.message)
return data
```

### SELECT com filtros dinâmicos
```typescript
let query = supabase
  .from('tasks')
  .select('*')
  .eq('user_id', userId)

if (filters.status) query = query.eq('status', filters.status)
if (filters.search) query = query.ilike('title', `%${filters.search}%`)
if (filters.from)   query = query.gte('created_at', filters.from)
if (filters.to)     query = query.lte('created_at', filters.to)

const { data, error } = await query.order('created_at', { ascending: false })
```

### INSERT
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({ name, user_id: userId, description })
  .select()
  .single()

if (error) throw new Error(error.message)
return data
```

### UPDATE parcial (PATCH)
```typescript
const { data, error } = await supabase
  .from('projects')
  .update({ name, updated_at: new Date().toISOString() })
  .eq('id', id)
  .eq('user_id', userId) // ← ownership check obrigatório
  .select()
  .single()

if (error) throw new Error(error.message)
if (!data) throw new Error('Record not found or access denied')
return data
```

### DELETE com ownership check
```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', id)
  .eq('user_id', userId) // ← sempre filtrar por dono

if (error) throw new Error(error.message)
```

### UPSERT
```typescript
const { data, error } = await supabase
  .from('settings')
  .upsert(
    { user_id: userId, key, value },
    { onConflict: 'user_id, key' }
  )
  .select()
  .single()

if (error) throw new Error(error.message)
return data
```

### RPC (Stored Procedure)
```typescript
const { data, error } = await supabase
  .rpc('calculate_monthly_revenue', { p_user_id: userId, p_month: month })

if (error) throw new Error(error.message)
return data
```

### Storage — Upload
```typescript
const { data, error } = await supabase.storage
  .from('attachments')
  .upload(`${userId}/${Date.now()}-${filename}`, buffer, {
    contentType: mimeType,
    upsert: false,
  })

if (error) throw new Error(error.message)
return data.path
```

## Error Handling Pattern
```typescript
// Wrapper utilitário para queries
async function query<T>(
  fn: () => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<T> {
  const { data, error } = await fn()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No data returned')
  return data
}

// Uso:
const project = await query(() =>
  supabase.from('projects').select('*').eq('id', id).single()
)
```

## Service Layer Template
```typescript
// src/services/{resource}.service.ts
import { supabase } from '../lib/supabase'

export const {Resource}Service = {
  async list({ userId, page, limit }: { userId: string; page: number; limit: number }) {
    const from = (page - 1) * limit
    const { data, error, count } = await supabase
      .from('{table}')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { data: data ?? [], total: count ?? 0 }
  },

  async findById(id: string, userId: string) {
    const { data, error } = await supabase
      .from('{table}')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data
  },
}
```

## Rules & Gotchas

### Segurança
- ✅ Sempre incluir `.eq('user_id', userId)` em UPDATE/DELETE
- ✅ Nunca expor o client `supabase` (service_role) em rotas públicas
- ✅ Validar input com Zod **antes** de passar para queries
- ❌ Não concatenar strings na query (usar `.eq`, `.filter`, etc.)
- ❌ Nunca usar `select('*')` em tabelas com dados sensíveis em produção

### Performance
- Usar `select('col1, col2')` em vez de `select('*')` sempre que possível
- Prefer `count: 'exact'` apenas quando o total for exibido na UI
- Usar `.range()` em vez de `.limit()` para paginação server-side
- Evitar joins profundos (>2 níveis) — prefer views ou RPCs

### Error Codes Supabase
| Código     | Significado                    |
|------------|-------------------------------|
| `PGRST116` | 0 rows (não encontrado)       |
| `23505`    | Unique constraint violation   |
| `23503`    | Foreign key violation         |
| `42501`    | RLS / permission denied       |
