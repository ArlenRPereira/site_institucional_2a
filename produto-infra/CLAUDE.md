# Supabase Infra — Constituição

> Repositório de infraestrutura de banco de dados. Migrations SQL, RLS policies,
> seeds, e geração de tipos para shared-contracts. NÃO contém código de aplicação.

---

## 1. O que vive aqui

- **Migrations SQL** — histórico versionado e imutável do schema
- **RLS Policies** — definição de acesso por tabela e operação
- **Seeds** — dados iniciais para desenvolvimento e testes
- **Edge Functions** — funções Supabase (se usadas no projeto)
- **Script de geração de tipos** — atualiza `shared-contracts/src/types/database.ts`

O que **NÃO** vive aqui: lógica de aplicação, código TypeScript de produto, configs de deploy de app.

---

## 2. Stack e pré-requisitos

- **Supabase CLI** instalado globalmente (`supabase --version`)
- **PostgreSQL** compreendido — migrations são SQL puro, sem ORM
- **pnpm** para scripts de conveniência
- **.env** local com:
  ```
  SUPABASE_PROJECT_ID=xxxxxxxxxxxx
  SUPABASE_DB_URL=postgresql://...
  ```
- **Nunca** colocar credenciais de produção neste repo

---

## 3. Comandos canônicos

```bash
# Migrations
supabase migration new <nome>         # cria migration com timestamp
supabase migration up                 # aplica migrations pendentes
supabase migration list               # lista status de cada migration
supabase db reset                     # reset + replay de todas migrations + seed
supabase db diff --use-migra          # diff entre schema local e remoto

# Tipos
pnpm db:types                         # gera database.ts em shared-contracts

# Dev local
supabase start                        # sobe stack Supabase local (Docker)
supabase stop
supabase status                       # URLs e chaves do stack local

# Inspecionar
pnpm db:shell                         # psql no banco local
```

---

## 4. Estrutura de pastas

```
supabase/
├── config.toml
├── migrations/               # um arquivo por migration, nunca editados após aplicação
│   ├── 20240101000000_init.sql
│   └── ...
├── seed.sql                  # dados iniciais para dev/test
└── functions/                # Edge Functions (se aplicável)

scripts/
└── gen-types.sh              # geração de tipos para shared-contracts

docs/
└── schema.md                 # ERD + decisões de modelagem
```

---

## 5. Regras invioláveis de migrations

1. **Migration aplicada = imutável.** Nunca edite arquivo já aplicado em qualquer ambiente. Crie nova migration.
2. **Nome descritivo em snake_case:** `add_avatar_url_to_users`, `create_orders_table`.
3. **Timestamp gerado pelo CLI** via `supabase migration new <nome>` — nunca à mão.
4. **Toda tabela nova com RLS habilitada imediatamente** no mesmo arquivo. Tabela sem RLS = acesso irrestrito via API.
5. **Toda tabela nova com comentários inline** (`COMMENT ON TABLE`, `COMMENT ON COLUMN`).
6. **Coluna `NOT NULL` sem `DEFAULT` em tabela com dados** → 2 etapas: (1) nullable + backfill, (2) not null.
7. **`supabase db reset` deve rodar sem erro** — é o critério de aceite de toda migration.
8. **Nunca misturar DDL pesado e DML de grande volume** na mesma migration — risco de lock.

---

## 6. Regras invioláveis de RLS

1. **Toda tabela tem `ENABLE ROW LEVEL SECURITY`.**
2. **Policies criadas por operação** (SELECT, INSERT, UPDATE, DELETE) separadamente.
3. **Predicates referenciam `auth.uid()`** para operações de usuário. Nunca `USING (true)` sem comentário.
4. **Service role bypassa RLS** — intencional para o backend Node. Sem necessidade de policy para operações do backend.
5. **Nomes descritivos:** `"users can read own profile"`, não `"policy_1"`.
6. **USING** para condição de leitura (SELECT/UPDATE/DELETE); **WITH CHECK** para condição de escrita (INSERT/UPDATE).

```sql
-- Exemplo: set completo de policies para tabela orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own pending orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- DELETE: ausência de policy = deny all para usuários (service_role ainda pode deletar)
```

---

## 7. Template de migration

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
  created_at  timestamptz NOT NULL    DEFAULT now(),
  updated_at  timestamptz NOT NULL    DEFAULT now()
  -- demais colunas
);

CREATE INDEX ON public.<tabela> (<coluna_filtrada>);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<descrição>" ON public.<tabela>
  FOR SELECT USING (<predicate>);

-- ============================================================
-- Documentação inline
-- ============================================================

COMMENT ON TABLE  public.<tabela>          IS '<descrição da tabela>';
COMMENT ON COLUMN public.<tabela>.<coluna> IS '<descrição>';

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<tabela>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

---

## 8. Fluxo de trabalho padrão

1. Planejar: tabelas, colunas, policies, índices (com subagente `migration-writer` se feature grande)
2. `supabase migration new <nome>`
3. Escrever SQL seguindo o template
4. `supabase migration up` — aplicar local
5. `supabase db reset` — replay completo para validar idempotência
6. `pnpm db:types` — regenerar `database.ts` em shared-contracts
7. Commit: `feat(db): <descrição>`
8. PR → revisor valida RLS antes de merge

---

## 9. Quando delegar a subagentes

| Situação | Subagente |
|---|---|
| Migration de feature nova | `migration-writer` |
| Revisão/criação de RLS | `rls-policy-author` |
| Análise de performance de schema | `schema-reviewer` |

---

## 10. Segurança — crítico

- **MCP configurado em `.mcp.json` aponta SEMPRE para projeto de DEV** com `project_ref` explícito e `read_only=true`.
- **Nunca commitar `.env`** — está no `.gitignore`.
- **Seeds nunca contêm dados reais.** Apenas dados fictícios.
- **Backup antes de drop.** Migration que dropa tabela documenta rollback explícito.
- **Colunas com dados sensíveis** (CPF, telefone) comentadas com aviso de privacidade.
