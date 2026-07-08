# Skill: API Client Pattern

Leia este arquivo antes de criar qualquer integração com o backend, service, hook de dados ou chamada ao Supabase. Ele define os contratos de comunicação, tratamento de erros e padrões de estado do projeto.

---

## Mapa de responsabilidades

```
RSC (page.tsx)
  └── createServerClient()     → Supabase direto, dados iniciais
        ↓ props (initialData)
Client Component
  └── useFeature({ initialData })   → hook reativo
        └── featureService.*()      → service layer
              └── createClient()    → Supabase browser / apiClient
```

**Regra:** nenhuma chamada de rede acontece diretamente em componentes. Toda integração passa por `services/api/` e é consumida por um hook ou RSC.

---

## Tipo de retorno universal: `ServiceResult<T>`

Todo método de service retorna este tipo — nunca lança exceção:

```ts
// src/types/index.ts
export type ServiceResult<T> =
  | { data: T;    error: null  }
  | { data: null; error: string }

// Variante paginada
export type PaginatedResult<T> = ServiceResult<{
  items: T[]
  total: number
  pagina: number
  limite: number
}>
```

**Por que nunca `throw`?**
- Erros de rede são previsíveis — não são exceções, são resultados esperados
- Componentes verificam `result.error` sem try/catch espalhados pela UI
- TypeScript estreita o tipo automaticamente após o guard

```ts
// ✅ Consumo correto — TypeScript sabe que data não é null após o guard
const result = await featureService.criar(input)
if (result.error) {
  toast.error(result.error)
  return
}
console.log(result.data.id)  // TypeScript: data é Feature, não null
```

---

## Clientes Supabase — qual usar onde

```
Contexto                        │ Importar de
────────────────────────────────┼────────────────────────────────
RSC (page.tsx, layout.tsx)      │ @/lib/supabase/server
Route Handler (route.ts)        │ @/lib/supabase/server
Server Action ('use server')    │ @/lib/supabase/server
Client Component ('use client') │ @/lib/supabase/client
Middleware (middleware.ts)      │ @/lib/supabase/middleware
```

```ts
// RSC / Route Handler / Server Action
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()

// Client Component / Hook
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()   // uma instância por componente/hook
```

**Nunca** importar `server` em Client Component — causa erro de build. **Nunca** criar instância fora de função — causa problemas de singleton entre requests.

---

## Estrutura de um service

```ts
// src/services/api/[feature].service.ts
import { createClient }          from '@/lib/supabase/client'
import type { ServiceResult, PaginatedResult } from '@/types'
import type { Feature, CreateFeatureInput, UpdateFeatureInput } from '@/types'

export const featureService = {

  // ── Listagem paginada ───────────────────────────────────────────
  async listar(params?: {
    q?:      string
    pagina?: number
    limite?: number
    status?: Feature['status']
  }): Promise<PaginatedResult<Feature>> {
    const supabase = createClient()
    const pagina   = params?.pagina ?? 1
    const limite   = Math.min(params?.limite ?? 20, 100)
    const offset   = (pagina - 1) * limite

    let query = supabase
      .from('features')
      .select('id, nome, descricao, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1)

    if (params?.q)      query = query.ilike('nome', `%${params.q}%`)
    if (params?.status) query = query.eq('status', params.status)

    const { data, error, count } = await query

    if (error) return { data: null, error: error.message }
    return {
      data:  { items: data as Feature[], total: count ?? 0, pagina, limite },
      error: null,
    }
  },

  // ── Busca por ID ────────────────────────────────────────────────
  async buscarPorId(id: string): Promise<ServiceResult<Feature>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Feature, error: null }
  },

  // ── Criação ─────────────────────────────────────────────────────
  async criar(input: CreateFeatureInput): Promise<ServiceResult<Feature>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('features')
      .insert(input)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Feature, error: null }
  },

  // ── Atualização parcial ─────────────────────────────────────────
  async atualizar(
    id: string,
    input: UpdateFeatureInput
  ): Promise<ServiceResult<Feature>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('features')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Feature, error: null }
  },

  // ── Remoção ─────────────────────────────────────────────────────
  async deletar(id: string): Promise<ServiceResult<void>> {
    const supabase = createClient()
    const { error } = await supabase
      .from('features')
      .delete()
      .eq('id', id)

    if (error) return { data: null, error: error.message }
    return { data: undefined as unknown as void, error: null }
  },

} as const
```

---

## Integração com API REST externa (backend próprio)

Quando o backend não é Supabase direto, use o `apiClient` centralizado:

```ts
// src/services/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL

type FetchOptions = RequestInit & { token?: string }

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ServiceResult<T>> {
  const { token, ...rest } = options
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { data: null, error: body.message ?? `HTTP ${res.status}` }
    }

    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro de rede'
    return { data: null, error: msg }
  }
}

export const apiClient = {
  get:    <T>(url: string, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: 'GET', ...opts }),

  post:   <T>(url: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body), ...opts }),

  patch:  <T>(url: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),

  delete: <T>(url: string, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: 'DELETE', ...opts }),
} as const
```

---

## Padrão de Hook

O hook conecta o service ao estado React, gerencia loading e expõe mutações com atualização otimista.

```ts
// src/hooks/use-feature.ts
'use client'
import { useState, useCallback, useTransition } from 'react'
import { featureService }   from '@/services/api/feature.service'
import { useToast }         from '@/components/ui/toast'
import type { Feature, CreateFeatureInput } from '@/types'

interface UseFeatureOptions {
  initialData?: Feature[]
}

export function useFeature({ initialData = [] }: UseFeatureOptions = {}) {
  const [data, setData]         = useState<Feature[]>(initialData)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast }               = useToast()

  // ── Refresh ─────────────────────────────────────────────────────
  const refresh = useCallback((params?: Parameters<typeof featureService.listar>[0]) => {
    startTransition(async () => {
      const result = await featureService.listar(params)
      if (result.error) { setError(result.error); return }
      setData(result.data.items)
      setError(null)
    })
  }, [])

  // ── Criar (otimista) ────────────────────────────────────────────
  const criar = useCallback(async (input: CreateFeatureInput) => {
    const result = await featureService.criar(input)
    if (result.error) {
      toast({ variant: 'error', title: result.error })
      return { error: result.error }
    }
    setData(prev => [result.data, ...prev])           // adiciona imediatamente
    toast({ variant: 'success', title: 'Criado com sucesso' })
    return { error: null }
  }, [toast])

  // ── Deletar (otimista com rollback) ─────────────────────────────
  const deletar = useCallback(async (id: string) => {
    const backup = data                               // snapshot para rollback
    setData(prev => prev.filter(f => f.id !== id))   // remove imediatamente

    const result = await featureService.deletar(id)
    if (result.error) {
      setData(backup)                                 // rollback
      toast({ variant: 'error', title: result.error })
      return { error: result.error }
    }
    return { error: null }
  }, [data, toast])

  return {
    data,
    error,
    isLoading: isPending,
    refresh,
    criar,
    deletar,
  }
}
```

---

## Realtime Supabase

```ts
// src/hooks/use-feature-realtime.ts
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Feature } from '@/types'

export function useFeatureRealtime(
  onInsert: (item: Feature) => void,
  onUpdate: (item: Feature) => void,
  onDelete: (id:   string)  => void,
) {
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('features-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'features' },
        p => onInsert(p.new as Feature))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'features' },
        p => onUpdate(p.new as Feature))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'features' },
        p => onDelete((p.old as { id: string }).id))
      .subscribe()

    return () => { supabase.removeChannel(canal) }   // cleanup obrigatório
  }, [onInsert, onUpdate, onDelete])
}
```

---

## Tipagem a partir do schema Supabase

```bash
# Sempre regenerar após migrations — nunca escrever tipos de tabela à mão
npm run types:supabase
```

```ts
// src/types/index.ts

// Tipos base gerados (nunca editar supabase.ts diretamente)
export type { Database } from './supabase'

// Aliases legíveis para uso no projeto
export type Feature            = Database['public']['Tables']['features']['Row']
export type CreateFeatureInput = Database['public']['Tables']['features']['Insert']
export type UpdateFeatureInput = Database['public']['Tables']['features']['Update']

// Tipos derivados e compostos
export type FeatureStatus  = Feature['status']       // union dos valores possíveis
export type FeatureComAutor = Feature & {
  autor: Pick<Database['public']['Tables']['usuarios']['Row'], 'nome' | 'avatar_url'>
}
```

---

## Server Actions — mutações a partir de formulários RSC

Use Server Actions para formulários que submetem dados sem JavaScript no cliente (progressive enhancement) ou quando a mutação precisa de invalidação de cache no servidor.

```ts
// src/app/(dashboard)/features/actions.ts
'use server'
import { redirect }       from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z }              from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const criarSchema = z.object({
  nome:      z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
})

export async function criarFeatureAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = criarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.nome?.[0] ?? 'Dados inválidos' }
  }

  const { error } = await supabase
    .from('features')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/features')
  redirect('/dashboard/features')
}
```

### Quando usar Server Action vs Service + Hook

| Cenário | Usar |
|---|---|
| Formulário com submit tradicional (sem JS) | Server Action |
| Formulário com feedback imediato / otimismo | Service + Hook client |
| Mutação que precisa de `revalidatePath` | Server Action |
| Mutação disparada por evento não-form | Service + Hook client |
| Redirecionar após mutação no servidor | Server Action + `redirect()` |

---

## Checklist de integração

- [ ] Service retorna `ServiceResult<T>` — nunca lança exceção?
- [ ] Tipo correto de cliente Supabase para o contexto?
- [ ] Tipos gerados com `npm run types:supabase` — não escritos manualmente?
- [ ] Hook recebe `initialData` do RSC — sem fetch em `useEffect`?
- [ ] Atualização otimista com rollback em caso de erro?
- [ ] Canal Realtime com `removeChannel` no cleanup?
- [ ] `NEXT_PUBLIC_*` somente para variáveis seguras para o browser?
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca em variável `NEXT_PUBLIC_`?
