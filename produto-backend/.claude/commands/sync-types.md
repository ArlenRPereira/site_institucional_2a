# Command: /sync-types

## Descrição
Sincroniza os tipos TypeScript do projeto com o schema atual do banco Supabase. Regenera `src/types/database.ts`, detecta breaking changes, propaga atualizações para schemas Zod e documentação OpenAPI, e garante que o código compile sem erros após a sincronização.

## Usage
```
/sync-types [--check] [--schema <schema_name>] [--diff] [--fix-zod]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--check` | ❌ | Só verifica divergências, não altera arquivos |
| `--schema` | ❌ | Schema Postgres alvo. Default: `public` |
| `--diff` | ❌ | Exibe diff entre tipos atuais e novos antes de aplicar |
| `--fix-zod` | ❌ | Atualiza automaticamente schemas Zod após regenerar tipos |

### Exemplos
```bash
/sync-types
/sync-types --check
/sync-types --diff
/sync-types --fix-zod
/sync-types --schema public --diff --fix-zod
```

---

## Execution Plan

### Step 1 — Pre-flight Check
> Validar pré-condições antes de rodar a geração.

**Verificações:**
```bash
# 1. Variáveis de ambiente disponíveis
[ -z "$SUPABASE_URL" ]              && echo "❌ SUPABASE_URL não definida"
[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "❌ SUPABASE_SERVICE_ROLE_KEY não definida"

# 2. CLI Supabase instalada
supabase --version || echo "❌ Supabase CLI não encontrada"

# 3. Projeto vinculado
supabase status || echo "❌ Projeto não vinculado — rode: supabase link --project-ref <ref>"

# 4. Backup do arquivo atual
cp src/types/database.ts src/types/database.ts.bak 2>/dev/null || true
```

**Se `--check`:** apenas reportar divergências sem modificar arquivos.

---

### Step 2 — Regenerar `database.ts`
> Gerar tipos TypeScript a partir do schema Supabase atual.

**Comando:**
```bash
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > src/types/database.ts
```

**Alternativa com CLI local (ambiente de dev com Docker):**
```bash
supabase gen types typescript --local --schema public > src/types/database.ts
```

**Estrutura esperada do arquivo gerado:**
```typescript
// src/types/database.ts (gerado automaticamente — não editar manualmente)
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      // ... outras tabelas
    }
    Views: { [_ in never]: never }
    Functions: {
      calculate_monthly_revenue: {
        Args: { p_user_id: string; p_month: string }
        Returns: number
      }
    }
    Enums: {
      project_status: 'draft' | 'active' | 'archived'
    }
  }
}
```

> ⚠️ Nunca editar `database.ts` manualmente — é gerado automaticamente.

---

### Step 3 — Diff e Detecção de Breaking Changes
> Comparar versão anterior com a nova e classificar as mudanças.

**Se `--diff`:** exibir antes de aplicar:
```bash
diff src/types/database.ts.bak src/types/database.ts
```

**Classificação de mudanças:**

| Tipo de mudança | Impacto | Ação necessária |
|---|---|---|
| Nova tabela adicionada | ✅ Não-breaking | Oportunidade de novo endpoint |
| Nova coluna `nullable` adicionada | ✅ Não-breaking | Atualizar schema Zod (`.optional()`) |
| Nova coluna `NOT NULL` adicionada | 🔴 Breaking | Atualizar Zod + INSERT no service |
| Coluna removida | 🔴 Breaking | Remover do Zod + queries + OpenAPI |
| Coluna renomeada | 🔴 Breaking | Atualizar Zod + queries + OpenAPI |
| Tipo de coluna alterado | 🟠 Breaking potencial | Verificar Zod + queries |
| Novo enum value | ✅ Não-breaking | Atualizar Zod `z.enum([...])` |
| Enum value removido | 🔴 Breaking | Verificar todos os usos do enum |
| Nova função/RPC | ✅ Não-breaking | Oportunidade de uso no service |

**Relatório de diff gerado automaticamente:**
```
📊 Sync Diff — {data}

Tabelas
  ✅ Não alteradas: projects, users, settings
  ✅ Adicionadas:   invoices
  🔴 Modificadas:   tasks

Colunas alteradas em `tasks`
  🔴 REMOVED:   priority (text)
  ✅ ADDED:     priority_level (integer, NOT NULL, default: 1)
  ✅ ADDED:     due_date (timestamptz, nullable)

Enums
  ✅ ADDED value: project_status → 'paused'
```

---

### Step 4 — Verificar Compilação TypeScript
> Garantir que o código existente ainda compila após a regeneração.

```bash
npx tsc --noEmit
```

**Se houver erros de compilação:**
1. Listar todos os arquivos com erro
2. Para cada erro, identificar se vem de:
   - Tipo removido/renomeado → atualizar referência
   - Campo obrigatório novo → atualizar INSERT
   - Tipo de campo alterado → ajustar Zod + service

**Erros comuns e fixes:**

```typescript
// ❌ Erro: Property 'priority' does not exist on type 'tasks.Row'
// Causa: coluna renomeada de 'priority' para 'priority_level'

// Fix no service:
// Antes:
.order('priority', { ascending: false })
// Depois:
.order('priority_level', { ascending: false })
```

---

### Step 5 — Atualizar Schemas Zod (`supabase-query-builder` + `--fix-zod`)
> Sincronizar `src/schemas/*.schema.ts` com os novos tipos.

**Mapeamento de tipos DB → Zod:**

```typescript
// src/types/database.ts  →  src/schemas/{resource}.schema.ts

// text / varchar          → z.string()
// text NOT NULL           → z.string().min(1)
// text NULLABLE           → z.string().optional() ou z.string().nullable()
// integer                 → z.number().int()
// numeric / decimal       → z.number()
// boolean                 → z.boolean()
// uuid                    → z.string().uuid()
// timestamptz             → z.string().datetime()
// jsonb                   → z.record(z.unknown()) ou z.object({...})
// enum 'a'|'b'|'c'        → z.enum(['a', 'b', 'c'])
```

**Para cada schema afetado, verificar:**

```typescript
// Se nova coluna NOT NULL foi adicionada → adicionar no schema create
create: z.object({
  name: z.string().min(1).max(255).trim(),
  priority_level: z.number().int().min(1).max(5), // ← adicionado
})

// Se coluna removida → remover dos schemas
update: z.object({
  name: z.string().optional(),
  // priority: z.string().optional(), ← remover
  priority_level: z.number().int().optional(), // ← atualizar
})
```

**Se `--fix-zod`:** aplicar automaticamente campos evidentes (nullable, novos opcionais).
**Se ambíguo** (tipo mudou, campo removido com referências): pausar e perguntar ao dev.

---

### Step 6 — Atualizar Queries no Service (`supabase-query-builder`)
> Verificar e corrigir queries afetadas por mudanças de schema.

**Padrões a verificar:**

```typescript
// 1. Campos em INSERT — novas colunas NOT NULL precisam ser incluídas
await supabase.from('tasks').insert({
  title,
  user_id: userId,
  priority_level: input.priorityLevel, // ← novo campo obrigatório
})

// 2. Campos em select explícito — remover colunas deletadas
await supabase.from('tasks').select('id, title, priority_level, due_date') // ← atualizado

// 3. Campos em filter/order — renomeações
.order('priority_level') // ← era 'priority'

// 4. Uso de enums
.eq('status', 'paused') // ← novo valor adicionado ao enum project_status
```

---

### Step 7 — Atualizar OpenAPI (`api-doc-writer`)
> Propagar mudanças de schema para a documentação.

**Para cada tabela modificada:**

```yaml
# components/schemas/Task
Task:
  type: object
  required: [id, title, priority_level, user_id, created_at]
  properties:
    # priority: removido ← deletar
    priority_level:  # ← atualizar
      type: integer
      minimum: 1
      maximum: 5
    due_date:        # ← adicionar
      type: string
      format: date-time
      nullable: true
```

**Após atualizar:**
```bash
npx @redocly/cli lint openapi.yaml
```

---

### Step 8 — Atualizar o Client Supabase Tipado
> Garantir que o client use os tipos recém-gerados.

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database' // ← import do arquivo recém-gerado

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```

Verificar que o import está apontando para `../types/database` (não para uma versão cacheada).

---

### Step 9 — Rodar Testes (`jest-test-writer`)
> Verificar que nenhum teste quebrou após a sincronização.

```bash
# Rodar todos os testes
npx jest --passWithNoTests

# Com coverage para detectar regressões
npx jest --coverage --passWithNoTests
```

**Se testes falharem:**
1. Identificar se o mock do Supabase precisa de atualização (novos campos no retorno)
2. Verificar fixtures/mocks com campos renomeados
3. Atualizar mocks para refletir a nova estrutura

---

## Relatório Final de Sync

```markdown
# Type Sync Report
**Data:** {data}
**Supabase Project:** {project-ref}
**Schema:** public

---

## Mudanças Detectadas

### Tabelas
| Tabela    | Status         |
|-----------|----------------|
| projects  | ✅ Sem mudanças |
| users     | ✅ Sem mudanças |
| tasks     | 🔴 Modificada  |
| invoices  | ✅ Adicionada  |

### Breaking Changes em `tasks`
| Campo          | Mudança               | Arquivos afetados                    |
|----------------|-----------------------|--------------------------------------|
| `priority`     | Removido              | task.schema.ts, task.service.ts      |
| `priority_level`| Adicionado (NOT NULL) | task.schema.ts, task.service.ts      |
| `due_date`     | Adicionado (nullable) | task.schema.ts                       |

---

## Ações Executadas
- ✅ `src/types/database.ts` regenerado
- ✅ `npx tsc --noEmit` sem erros
- ✅ `src/schemas/task.schema.ts` atualizado (--fix-zod)
- ⚠️  `src/services/task.service.ts` requer revisão manual (L45, L89)
- ✅ `openapi.yaml` atualizado e validado
- ✅ Testes: 42 passed, 0 failed

---

## Ações Manuais Necessárias
- [ ] Revisar `src/services/task.service.ts:45` — query com campo `priority` removido
- [ ] Atualizar migration se mudança foi feita diretamente na dashboard Supabase
- [ ] Notificar consumers da API sobre remoção do campo `priority` (breaking change)
```

---

## Boas Práticas de Sincronização

**Sempre que alterar o schema no Supabase:**
1. Fazer via migration SQL (`supabase/migrations/`) — nunca pela dashboard em produção
2. Rodar `/sync-types` logo após aplicar a migration
3. Commitar `database.ts` junto com a migration
4. Atualizar CHANGELOG.md se for breaking change

**Estrutura de migration recomendada:**
```sql
-- supabase/migrations/{timestamp}_add_priority_level_to_tasks.sql
ALTER TABLE tasks
  DROP COLUMN IF EXISTS priority,
  ADD COLUMN priority_level integer NOT NULL DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
  ADD COLUMN due_date timestamptz;

COMMENT ON COLUMN tasks.priority_level IS 'Nível de prioridade: 1 (baixo) a 5 (crítico)';
```
