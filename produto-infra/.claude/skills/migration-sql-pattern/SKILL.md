---
name: migration-sql-pattern
description: >
  Template canônico e convenções de migrations SQL para este projeto Supabase.
  Auto-invocada ao criar ou editar qualquer arquivo em supabase/migrations/.
  Cobre: estrutura obrigatória do arquivo, tipos de coluna padrão, trigger
  updated_at, comentários inline, índices e casos especiais (NOT NULL em 2 etapas,
  enum, drop com rollback). Leia antes de escrever qualquer SQL de migration.
---

Esta skill define o padrão de todo arquivo em `supabase/migrations/`.
Aplique-a sempre que criar ou modificar migrations.

## Regra Zero

Migration gerada pelo CLI, nunca editada após aplicada:

```bash
supabase migration new <nome_descritivo_em_snake_case>
# ✅ add_avatar_url_to_users
# ✅ create_orders_table
# ❌ migration1   ❌ update   ❌ fix
```

## Estrutura Obrigatória do Arquivo

```sql
-- Migration: <descrição legível da mudança>
-- Ticket: <referência>
-- Author: <nome>
-- Date: <YYYY-MM-DD>

-- ============================================================
-- DDL
-- ============================================================

-- (tabelas, colunas, índices)

-- ============================================================
-- RLS
-- ============================================================

-- (ENABLE + CREATE POLICY)

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

-- (CREATE TRIGGER set_updated_at)

-- ============================================================
-- Documentação inline
-- ============================================================

-- (COMMENT ON TABLE / COLUMN)
```

## Colunas Padrão de Toda Tabela Nova

```sql
CREATE TABLE IF NOT EXISTS public.<tabela> (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- demais colunas
);
```

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | sempre `gen_random_uuid()` — nunca serial |
| `user_id` | `uuid NOT NULL` | FK para `auth.users` com `ON DELETE CASCADE` |
| `created_at` | `timestamptz` | sempre com timezone — nunca `timestamp` |
| `updated_at` | `timestamptz` | gerenciado pelo trigger `set_updated_at` |

## Trigger `updated_at` (obrigatório em toda tabela nova)

```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<tabela>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## Índices

```sql
-- FK sempre indexada (PostgreSQL não cria automaticamente)
CREATE INDEX ON public.<tabela> (user_id);

-- Coluna de filtro frequente
CREATE INDEX ON public.<tabela> (status);

-- Paginação por data (mais comum)
CREATE INDEX ON public.<tabela> (user_id, created_at DESC);

-- Índice parcial (exclui estado terminal)
CREATE INDEX ON public.<tabela> (status) WHERE status != 'completed';

-- Em tabela com dados existentes: CONCURRENTLY evita lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<tabela>_<coluna>
  ON public.<tabela> (<coluna>);
```

## Documentação Inline (obrigatória)

```sql
COMMENT ON TABLE  public.<tabela>           IS '<responsabilidade da tabela>';
COMMENT ON COLUMN public.<tabela>.user_id   IS 'FK para auth.users — dono do registro';
COMMENT ON COLUMN public.<tabela>.<coluna>  IS '<o que representa, unidade se aplicável>';
```

## Casos Especiais

### Coluna NOT NULL em tabela com dados — 2 migrações separadas

```sql
-- Migration 1: adicionar nullable + backfill
ALTER TABLE public.<tabela> ADD COLUMN <col> <tipo>;
UPDATE public.<tabela> SET <col> = <default> WHERE <col> IS NULL;

-- Migration 2 (nova): NOT NULL após backfill confirmado
ALTER TABLE public.<tabela> ALTER COLUMN <col> SET NOT NULL;
```

### Enum

```sql
-- Novo enum
CREATE TYPE public.<nome> AS ENUM ('valor_1', 'valor_2');

-- Adicionar valor (sem rewrite da tabela)
ALTER TYPE public.<nome> ADD VALUE 'valor_3';
```

### Drop com rollback documentado

```sql
-- ROLLBACK: ver migration <timestamp_original> para recriar a tabela
DROP TABLE IF EXISTS public.<tabela> CASCADE;
```

## Critério de Aceite

```bash
supabase db reset   # deve completar sem erros — valida idempotência
```

## Anti-patterns

```sql
-- ❌ Timestamp sem timezone
created_at timestamp DEFAULT now()

-- ❌ PK sequencial (enumerável)
id serial PRIMARY KEY

-- ❌ NOT NULL sem DEFAULT em tabela com dados (usa 2 etapas)
ALTER TABLE public.users ADD COLUMN phone text NOT NULL;

-- ❌ DDL e DML de volume na mesma migration (risco de lock)
CREATE TABLE ...; INSERT INTO ... SELECT ... FROM outra_tabela_grande;

-- ❌ Tabela sem RLS (acesso irrestrito via API pública)
CREATE TABLE public.segredos (...);
-- (sem ENABLE ROW LEVEL SECURITY)
```
