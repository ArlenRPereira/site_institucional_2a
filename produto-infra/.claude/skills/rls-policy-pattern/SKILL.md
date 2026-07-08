---
name: rls-policy-pattern
description: >
  Templates canônicos de Row Level Security para este projeto Supabase.
  Auto-invocada ao criar ou revisar policies em qualquer migration.
  Cobre: USING vs WITH CHECK, 4 padrões de acesso (dados exclusivos, leitura
  pública, membros compartilhados, admin-only), nomes descritivos e checklist
  de cobertura por operação. Leia antes de escrever qualquer CREATE POLICY.
---

Esta skill define como criar e nomear policies RLS em todo o projeto.
Aplique-a sempre que uma migration incluir `CREATE POLICY` ou `ENABLE ROW LEVEL SECURITY`.

## Regra Zero

```sql
-- Toda tabela do schema public deve ter RLS habilitado
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
```

Tabela sem `ENABLE ROW LEVEL SECURITY` = acesso irrestrito via API pública do Supabase.

## USING vs WITH CHECK

| Cláusula | Quando usar | Pergunta |
|---|---|---|
| `USING` | SELECT, UPDATE, DELETE | "Quais linhas o usuário pode VER ou AFETAR?" |
| `WITH CHECK` | INSERT, UPDATE | "O que o usuário pode ESCREVER?" |

```sql
-- SELECT: só USING
CREATE POLICY "users can read own <tabela>"
  ON public.<tabela> FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: só WITH CHECK (linha ainda não existe)
CREATE POLICY "users can create own <tabela>"
  ON public.<tabela> FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: ambos (garante leitura E escrita no mesmo registro)
CREATE POLICY "users can update own <tabela>"
  ON public.<tabela> FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: só USING
CREATE POLICY "users can delete own <tabela>"
  ON public.<tabela> FOR DELETE
  USING (auth.uid() = user_id);
```

## Padrão 1 — Dados exclusivos do usuário (mais comum)

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

-- DELETE omitido = deny all para usuários. service_role ainda pode deletar.
-- Documentar se a ausência for intencional (soft delete, etc.)
```

## Padrão 2 — Leitura pública, escrita restrita ao dono

```sql
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<tabela> are publicly readable"
  ON public.<tabela> FOR SELECT
  USING (true);

CREATE POLICY "owners can update own <tabela>"
  ON public.<tabela> FOR UPDATE
  USING  (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owners can delete own <tabela>"
  ON public.<tabela> FOR DELETE
  USING (auth.uid() = owner_id);
```

## Padrão 3 — Recurso compartilhado entre membros

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read their projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "editors can update their projects"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'editor')
    )
  );
```

## Padrão 4 — Dados exclusivamente administrativos (sem policies)

```sql
-- Acesso exclusivo via service_role — anon e authenticated recebem deny
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Sem policies intencionalmente: service_role bypassa RLS.
COMMENT ON TABLE public.audit_logs IS 'Acesso exclusivo via service_role — sem policies intencionalmente.';
```

## Convenção de Nomes

```
"<sujeito> can <operação> <escopo> <tabela>"

✅ "users can read own orders"
✅ "users can create own orders"
✅ "members can read their projects"
✅ "owners can delete own posts"
✅ "orders are publicly readable"

❌ "policy_1"   ❌ "insert_policy"   ❌ "read"
```

## Checklist de Cobertura por Tabela

- [ ] `ENABLE ROW LEVEL SECURITY` presente
- [ ] SELECT — coberto ou ausência documentada
- [ ] INSERT — `WITH CHECK` (nunca `USING`)
- [ ] UPDATE — **ambos** `USING` e `WITH CHECK`
- [ ] DELETE — coberto ou ausência justificada no comentário
- [ ] `USING (true)` sem comentário = flag de revisão obrigatória
- [ ] Nomes seguem a convenção descritiva

## Bug Silencioso: INSERT com USING

```sql
-- ❌ USING em INSERT é ignorado pelo PostgreSQL — não bloqueia nada
CREATE POLICY "errado"
  ON public.<tabela> FOR INSERT
  USING (auth.uid() = user_id);  -- silenciosamente sem efeito!

-- ✅ Correto
CREATE POLICY "users can create own <tabela>"
  ON public.<tabela> FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
