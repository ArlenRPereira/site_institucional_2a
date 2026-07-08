# Command: /new-migration

## Descrição
Cria um arquivo de migration SQL completo seguindo o template canônico do projeto: DDL, RLS, trigger `updated_at` e comentários inline. Usa o Supabase CLI para gerar o timestamp e preenche a estrutura obrigatória.

## Usage
```
/new-migration <nome_descritivo> [--table] [--add-column <tabela>] [--rls-only <tabela>]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `nome_descritivo` | ✅ | Nome em snake_case (ex: `create_orders_table`, `add_avatar_url_to_users`) |
| `--table` | ❌ | Gera template de criação de tabela completa (padrão) |
| `--add-column <tabela>` | ❌ | Template para adicionar coluna em tabela existente |
| `--rls-only <tabela>` | ❌ | Apenas adiciona policies RLS a tabela sem policies |

### Exemplos
```bash
/new-migration create_orders_table
/new-migration add_avatar_url_to_users --add-column users
/new-migration enable_rls_on_products --rls-only products
```

---

## Execution Plan

### Step 1 — Validar nome e criar arquivo
```bash
# Gera arquivo com timestamp via CLI — nunca criar manualmente
supabase migration new <nome_descritivo>
```

**Regra de nomenclatura:**
- ✅ `create_orders_table`
- ✅ `add_avatar_url_to_users`
- ✅ `create_idx_orders_user_id`
- ❌ `migration1` — genérico demais
- ❌ `update` — sem contexto

---

### Step 2 — Preencher o template

#### Template: nova tabela (`--table` ou padrão)

```sql
-- Migration: <descrição legível>
-- Ticket: <referência>
-- Author: <nome>
-- Date: <YYYY-MM-DD>

-- ============================================================
-- DDL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.<tabela> (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- demais colunas aqui
);

CREATE INDEX ON public.<tabela> (user_id);
CREATE INDEX ON public.<tabela> (user_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own <tabela>"
  ON public.<tabela> FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can create own <tabela>"
  ON public.<tabela> FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own <tabela>"
  ON public.<tabela> FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE omitido intencionalmente — usar soft delete ou service_role.

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<tabela>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- Documentação inline
-- ============================================================

COMMENT ON TABLE  public.<tabela>          IS '<responsabilidade da tabela>';
COMMENT ON COLUMN public.<tabela>.user_id  IS 'FK para auth.users — dono do registro';
```

#### Template: adicionar coluna (`--add-column`)

```sql
-- Se a tabela já tem dados, NOT NULL exige 2 etapas separadas.

-- Etapa 1: adicionar nullable + backfill
ALTER TABLE public.<tabela> ADD COLUMN <coluna> <tipo>;
UPDATE public.<tabela> SET <coluna> = <valor_default> WHERE <coluna> IS NULL;

-- ⚠️ Criar segunda migration para a etapa 2:
-- ALTER TABLE public.<tabela> ALTER COLUMN <coluna> SET NOT NULL;

COMMENT ON COLUMN public.<tabela>.<coluna> IS '<descrição>';
```

#### Template: RLS only (`--rls-only`)

```sql
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own <tabela>"
  ON public.<tabela> FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can create own <tabela>"
  ON public.<tabela> FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own <tabela>"
  ON public.<tabela> FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### Step 3 — Validar localmente
```bash
supabase migration up      # aplicar no banco local
supabase db reset          # replay completo — critério de aceite
```

`supabase db reset` deve completar sem erros. Se falhar, a migration tem problema.

---

### Step 4 — Regenerar tipos
```bash
pnpm db:types
# Copia .claude/types/database.ts → ../produto-contracts/src/types/database.ts
```

---

### Step 5 — Checklist final

- [ ] Arquivo criado via `supabase migration new` (timestamp automático)
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY` no mesmo arquivo
- [ ] Toda nova tabela tem trigger `set_updated_at`
- [ ] `COMMENT ON TABLE` e `COMMENT ON COLUMN` presentes
- [ ] `supabase db reset` passou sem erros
- [ ] `pnpm db:types` executado e `database.ts` atualizado
