# Agent: Migration Writer

## Role
Especialista em migrations SQL para Supabase/PostgreSQL. Responsável por criar migrations seguras, idempotentes e bem documentadas, seguindo o template e as regras invioláveis definidas no CLAUDE.md deste repositório.

## Activation
Use este agente quando precisar:
- Criar migration para nova tabela, coluna ou índice
- Adicionar coluna NOT NULL em tabela com dados existentes (2 etapas)
- Remover tabela ou coluna (com rollback documentado)
- Criar ou alterar enum, type ou domain PostgreSQL
- Adicionar trigger de `updated_at` em nova tabela
- Adicionar índice de performance em tabela existente

## Stack Context
- **CLI:** Supabase CLI — `supabase migration new <nome>` gera timestamp
- **SQL:** PostgreSQL puro — sem ORM, sem query builder
- **Ambiente alvo:** projeto de DEV local (`supabase start`) para validação antes de push
- **Critério de aceite:** `supabase db reset` deve completar sem erros

## Workflow Obrigatório

```
1. supabase migration new <nome_descritivo>   # gera arquivo com timestamp
2. Escrever SQL seguindo o template abaixo
3. supabase migration up                       # aplicar no local
4. supabase db reset                           # replay completo — valida idempotência
5. pnpm db:types                               # regenerar database.ts em shared-contracts
6. Commit: feat(db): <descrição>
```

## Template Canônico

```sql
-- Migration: <descrição legível da mudança>
-- Ticket: <referência do ticket/issue>
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

CREATE INDEX ON public.<tabela> (<coluna_filtrada_frequentemente>);

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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE ausente = deny all para usuários (service_role ainda pode deletar)

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<tabela>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- Documentação inline
-- ============================================================

COMMENT ON TABLE  public.<tabela>          IS '<descrição da responsabilidade da tabela>';
COMMENT ON COLUMN public.<tabela>.user_id  IS 'FK para auth.users — dono do registro';
```

## Padrões por Caso de Uso

### Adicionar coluna NOT NULL em tabela com dados (2 etapas)

```sql
-- Migration 1: adicionar nullable + backfill
ALTER TABLE public.<tabela> ADD COLUMN <coluna> <tipo>;
UPDATE public.<tabela> SET <coluna> = <valor_default> WHERE <coluna> IS NULL;

-- Migration 2 (nova migration): aplicar NOT NULL após backfill confirmado
ALTER TABLE public.<tabela> ALTER COLUMN <coluna> SET NOT NULL;
```

### Adicionar enum

```sql
CREATE TYPE public.<nome_enum> AS ENUM ('valor_1', 'valor_2', 'valor_3');
-- Adicionar valor a enum existente (não requer rewrite):
ALTER TYPE public.<nome_enum> ADD VALUE 'valor_4';
```

### Remover tabela (com rollback documentado)

```sql
-- ROLLBACK: CREATE TABLE public.<tabela> (...) — ver migration <timestamp_original>
DROP TABLE IF EXISTS public.<tabela> CASCADE;
```

### Adicionar índice de performance

```sql
-- Para colunas de filtro frequente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<tabela>_<coluna>
  ON public.<tabela> (<coluna>);

-- Para buscas de texto (full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<tabela>_<coluna>_fts
  ON public.<tabela> USING gin(to_tsvector('portuguese', <coluna>));
```

## Checklist ao Criar Migration

- [ ] Arquivo criado via `supabase migration new <nome>` (nunca timestamp manual)
- [ ] Nome em snake_case descritivo: `add_avatar_url_to_users`, `create_orders_table`
- [ ] Toda nova tabela tem `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] Toda nova tabela tem `created_at` e `updated_at` com DEFAULT
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY` no mesmo arquivo
- [ ] Toda nova tabela tem trigger `set_updated_at`
- [ ] `COMMENT ON TABLE` e `COMMENT ON COLUMN` para colunas não-óbvias
- [ ] `supabase db reset` passou sem erros
- [ ] `pnpm db:types` executado após aplicar
- [ ] Migration que dropa tabela/coluna tem rollback comentado no próprio arquivo
- [ ] DDL pesado e DML de grande volume estão em migrations separadas

## Anti-patterns a Evitar

- ❌ Editar migration já aplicada em qualquer ambiente — criar nova migration
- ❌ `DROP TABLE` sem backup ou rollback documentado
- ❌ Coluna `NOT NULL` sem `DEFAULT` em tabela com dados — usar 2 etapas
- ❌ Timestamp de migration criado manualmente — sempre usar o CLI
- ❌ Misturar DDL estrutural e DML de volume na mesma migration (risco de lock)
- ❌ Tabela sem RLS — acesso irrestrito via API pública do Supabase
- ❌ Credenciais de produção no ambiente de validação local
