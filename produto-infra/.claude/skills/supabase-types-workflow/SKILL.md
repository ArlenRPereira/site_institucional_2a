---
name: supabase-types-workflow
description: >
  Fluxo de geração e uso de tipos TypeScript a partir do schema Supabase neste
  projeto. Auto-invocada após qualquer migration aplicada ou ao trabalhar com
  shared-contracts. Cobre: quando e como rodar pnpm db:types, onde o arquivo
  gerado vive, como os consumidores (backend e web) atualizam a dependência,
  e o que nunca editar manualmente.
---

Esta skill define o fluxo completo de sincronização de tipos entre o banco Supabase
e os pacotes consumidores. Aplique-a após cada migration aplicada.

## Arquivo Gerado

```
produto-infra/.claude/types/database.ts   ← gerado por este projeto
```

Este arquivo é copiado/linkado para `produto-contracts/src/types/database.ts`
após a geração. **Nunca editar manualmente** — a próxima geração sobrescreve.

## Quando Rodar

```
supabase migration up   →   pnpm db:types   →   atualizar shared-contracts
```

Rodar `pnpm db:types` sempre que:
- Uma migration nova for aplicada
- Uma coluna, tabela ou enum mudar
- O `schema-reviewer` ou `migration-writer` indicar divergência de tipos

## Comando

```bash
pnpm db:types
# Executa: supabase gen types typescript --local > .claude/types/database.ts
```

Para gerar apontando ao projeto remoto de DEV (quando local não estiver rodando):

```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  > .claude/types/database.ts
```

## Estrutura do Arquivo Gerado

```typescript
// .claude/types/database.ts  (gerado — não editar)
export type Database = {
  public: {
    Tables: {
      orders: {
        Row:    { id: string; user_id: string; status: string; created_at: string }
        Insert: { id?: string; user_id: string; status?: string; created_at?: string }
        Update: { id?: string; user_id?: string; status?: string; created_at?: string }
      }
      // ...demais tabelas
    }
    Views:     { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      order_status: 'pending' | 'processing' | 'completed' | 'cancelled'
    }
  }
}
```

## Como os Consumidores Usam

### Backend (`produto-backend`)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@org/shared-contracts/types/database'

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Tipagem automática nas queries
const { data } = await supabaseAdmin
  .from('orders')   // ← autocomplete de tabelas
  .select('id, status, created_at')
  // data é tipado como { id: string; status: string; created_at: string }[]
```

### Web (`produto-web`)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'   // re-export de shared-contracts

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
```

## Propagar para shared-contracts

Após `pnpm db:types`, copiar o arquivo gerado para o pacote de contratos:

```bash
cp .claude/types/database.ts ../produto-contracts/src/types/database.ts
```

Em seguida, nos repos consumidores, atualizar a dependência:

```bash
# backend e web (npm link em dev via file:)
pnpm install
```

## Checklist Pós-Migration

- [ ] `supabase migration up` aplicou sem erros
- [ ] `supabase db reset` completa sem erros (idempotência)
- [ ] `pnpm db:types` gerou `.claude/types/database.ts` atualizado
- [ ] Arquivo copiado para `produto-contracts/src/types/database.ts`
- [ ] Backend e web rodaram `pnpm install` para recarregar o pacote
- [ ] `pnpm typecheck` passou em backend e web após atualização

## Anti-patterns

```bash
# ❌ Editar database.ts manualmente
vim .claude/types/database.ts   # sobrescrito na próxima geração

# ❌ Commitar database.ts com schema desatualizado
# (rodar pnpm db:types antes de qualquer commit de migration)

# ❌ Escrever tipos de tabela à mão nos consumidores
type Order = { id: string; status: string }   // diverge silenciosamente

# ✅ Sempre derivar dos tipos gerados
import type { Database } from '@org/shared-contracts/types/database'
type Order = Database['public']['Tables']['orders']['Row']
```
