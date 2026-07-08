# Shared Contracts — Constituição

> Pacote central de tipos e schemas compartilhados entre todos os projetos do workspace.
> Mantenha-o **mínimo e estável** — qualquer mudança aqui afeta 4 projetos simultaneamente.

---

## 1. O que é este pacote

`@org/shared-contracts` é a **fonte única de verdade** para contratos de API e tipos de banco.
Nenhum projeto define tipos de domínio ou schemas de validação localmente — tudo parte daqui.

```
produto-infra  ──gera──►  src/types/database.ts  (nunca editar manualmente)
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                  ▼
             produto-backend                produto-web
             (Zod schemas + tipos)              (tipos de API + database.ts)
```

---

## 2. Estrutura

```
src/
├── schemas/              # Zod schemas — a FONTE de verdade
│   ├── auth.schema.ts    # login, register, refresh
│   ├── api.schema.ts     # ApiResponse<T>, ApiError — envelopes canônicos de resposta
│   └── [feature].schema.ts
├── types/
│   ├── database.ts       # GERADO pela infra — nunca editar manualmente
│   ├── api.ts            # tipos inferidos de api.schema.ts (ApiResponse, ApiError, ApiErrorCode)
│   └── index.ts          # re-exports + tipos derivados via z.infer<>
└── index.ts              # barrel: exporta tudo que os consumers precisam
```

---

## 3. Regras invioláveis

1. **Schemas Zod são a fonte.** Tipos TypeScript são sempre derivados via `z.infer<>` — nunca escritos à mão.
2. **`src/types/database.ts` é gerado pela infra.** Nunca editar — a próxima geração sobrescreve.
3. **Dependência única permitida: `zod`.** Sem `axios`, sem `supabase-js`, sem nada mais.
4. **Nunca importar de nenhum dos consumers** (`backend`, `web`, `infra`).
5. **Mudança breaking exige `minor` ou `major`**, nunca `patch`:
   - Rename de campo, remoção de propriedade obrigatória, mudança de tipo → `minor` ou `major`
   - Adição de campo opcional, nova feature → `minor`
   - Correção de bug sem impacto na interface → `patch`
6. **Toda mudança aqui exige atualização nos consumers** antes de fechar o PR.
7. **PR de `shared-contracts` é mergeado PRIMEIRO**, depois os PRs dos consumers.
8. **Campos de API em camelCase.** Schemas Zod refletem o que a API envia e recebe — sempre camelCase (`userId`, não `user_id`). A conversão snake↔camel é responsabilidade exclusiva do backend; contracts nunca usa snake_case em campos de API.
9. **Compatibilidade de TypeScript.** `produto-web` e `produto-backend` usam TS 5.x. Versão mínima suportada: **TS 5.4**.

---

## 4. O que cada consumer usa

### Envelopes canônicos (todos os consumers)

Todo endpoint do backend retorna exatamente um de dois shapes. Ambos são tipos exportados por este pacote — nunca defina localmente nos consumers.

**Sucesso — `ApiResponse<T>`** (definido em `src/types/api.ts`):
```typescript
import type { ApiResponse } from '@org/shared-contracts'
// shape: { data: T }

const res: ApiResponse<Order> = await api.post('/orders', body)
const order = res.data
```

**Erro — `ApiError`** (definido em `src/types/api.ts`):
```typescript
import type { ApiError } from '@org/shared-contracts'
// shape: { code: ApiErrorCode; message?: string }

catch (err) {
  const error = err as ApiError
  if (error.code === 'NOT_FOUND') { ... }
}
```

> `ApiErrorCode` é um enum/union exportado que lista todos os códigos possíveis do backend. Consumers validam `code`, nunca `message` (que pode mudar sem versionamento).

---

### Backend (`produto-backend`)

```typescript
import { CreateOrderSchema, type CreateOrderRequest } from '@org/shared-contracts'

// Schemas Zod para validação de body nas rotas Express
app.post('/orders', handler)

// Tipos inferidos para os services
async function create(data: CreateOrderRequest): Promise<Order> { ... }
```

### Web (`produto-web`)

```typescript
import type { Order } from '@org/shared-contracts'
import type { Database } from '@org/shared-contracts/types/database'

// database.ts é a fonte de verdade para tipos de tabela Supabase
import { createBrowserClient } from '@supabase/ssr'
const supabase = createBrowserClient<Database>(url, key)

// Nunca escrever tipos de tabela manualmente — sempre derivar:
type OrderRow = Database['public']['Tables']['orders']['Row']
```

### Infra (`produto-infra`)

A infra não consome — ela **entrega**:

```bash
# Após aplicar migration:
supabase gen types typescript --local > .claude/types/database.ts
cp .claude/types/database.ts ../produto-contracts/src/types/database.ts

# Dentro deste pacote, rodar após copiar:
pnpm build
```

Os consumers atualizam em seguida com `pnpm install`.

---

## 5. Comandos canônicos

```bash
pnpm build        # compila TS → dist/
pnpm watch        # watch mode (durante desenvolvimento ativo)
pnpm typecheck    # tsc --noEmit
pnpm version patch|minor|major  # bump + tag antes de notificar consumers
```

---

## 6. Uso em desenvolvimento (pnpm monorepo)

Este pacote é membro do pnpm workspace. Em cada consumer o `package.json` usa:

```json
{
  "dependencies": {
    "@org/shared-contracts": "workspace:*"
  }
}
```

Após qualquer mudança no pacote:

```bash
# Recompilar este pacote:
pnpm build

# pnpm workspace resolve workspace:* automaticamente —
# não é necessário rodar install nos consumers.

# Para validar que os consumers continuam compilando:
turbo typecheck   # na raiz do workspace
```

---

## 7. Fluxo de mudança de contrato

```
1. Criar branch: `feat/contracts-<short-desc>`
2. Alterar schemas/types neste pacote
3. pnpm typecheck && pnpm build  (passar)
4. Registrar changeset: pnpm changeset  (na raiz do workspace)
5. Abrir PR — mergear PRIMEIRO
6. Na raiz: pnpm changeset version  → bumpa versão + gera CHANGELOG.md
7. turbo typecheck  → valida que todos os consumers compilam
8. Abrir PRs dos consumers referenciando este PR
```

> Se a mudança quebra backend E web ao mesmo tempo, coordenar os PRs em sequência:
> contracts → backend → web.

---

## 8. Quando delegar a subagentes

Este pacote não tem subagentes próprios. Mudanças aqui geralmente disparam trabalho nos consumers:

| Situação | Onde agir |
|---|---|
| Nova tabela aplicada pela infra | `migration-writer` (infra) → copiar `database.ts` → `pnpm build` aqui |
| Novo endpoint no backend | Criar schema aqui → usar no backend via `route-architect` |
| Tipo inconsistente entre web e backend | Corrigir aqui → atualizar os dois consumers |

---

## 9. Anti-patterns

```typescript
// ❌ Tipo de domínio escrito manualmente em consumer
type Order = { id: string; status: string }  // diverge silenciosamente

// ✅ Importar do pacote
import type { Order } from '@org/shared-contracts'

// ❌ Campo de API em snake_case no schema
const OrderSchema = z.object({ user_id: z.string() })  // conflita com o que o backend envia

// ✅ Campo de API em camelCase (backend converte snake→camel antes de responder)
const OrderSchema = z.object({ userId: z.string() })

// ❌ Envelope de resposta definido localmente no consumer
type ApiResponse<T> = { data: T }  // deve vir de @org/shared-contracts

// ✅ Importar ApiResponse e ApiError do pacote
import type { ApiResponse, ApiError } from '@org/shared-contracts'

// ❌ Editar database.ts manualmente
// (a próxima geração da infra sobrescreve tudo)

// ❌ Importar de consumer dentro deste pacote
import something from '../produto-backend/src/...'

// ❌ Adicionar dependência além de zod
import axios from 'axios'  // não pertence aqui
```
