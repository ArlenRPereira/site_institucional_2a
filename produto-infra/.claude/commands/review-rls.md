# Command: /review-rls

## Descrição
Audita a cobertura de RLS em todas as tabelas do schema `public`. Identifica tabelas sem RLS habilitado, tabelas com RLS mas sem policies, policies com padrões inseguros e bugs silenciosos (INSERT com USING). Produz relatório com severidade e SQL de correção.

## Usage
```
/review-rls [--table <nome>] [--fix]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--table` | ❌ | Auditar apenas uma tabela específica |
| `--fix` | ❌ | Gerar SQL de correção para os findings (não aplica automaticamente) |

### Exemplos
```bash
/review-rls
/review-rls --table orders
/review-rls --fix
```

---

## Execution Plan

### Step 1 — Mapear estado atual via MCP Supabase

Executar as queries de diagnóstico no banco de DEV:

```sql
-- 1. Tabelas sem RLS habilitado
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 2. Tabelas com RLS mas sem policies (nega tudo exceto service_role)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- 3. Todas as policies existentes
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

---

### Step 2 — Delegar análise ao agente `rls-policy-author`

Com os dados coletados, o agente `rls-policy-author` avalia:

1. **Cobertura por operação** — cada tabela tem SELECT, INSERT, UPDATE e DELETE cobertos ou a ausência é intencional e documentada?

2. **Padrões inseguros:**
   - `USING (true)` sem comentário justificando acesso irrestrito
   - `USING (auth.uid() IS NOT NULL)` — permite ler dados de outros usuários
   - Policy de INSERT usando `USING` em vez de `WITH CHECK` (bug silencioso do PostgreSQL)
   - UPDATE sem `WITH CHECK` — usuário pode mover dados para outro `user_id`

3. **Nomes descritivos** — policies genéricas (`policy_1`, `read_policy`) dificultam auditoria

---

### Step 3 — Verificar migrations

Para cada problema encontrado, verificar se a migration correspondente existe:

```bash
# Buscar na pasta de migrations
grep -l "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql
grep -l "CREATE POLICY" supabase/migrations/*.sql
```

Policies criadas pela dashboard do Supabase sem migration correspondente = risco de regressão no próximo `supabase db reset`.

---

### Step 4 — Relatório de output

```markdown
# RLS Audit Report — <data>
**Banco:** DEV — project: <project-ref>
**Tabelas analisadas:** N

---

## Findings

### 🔴 [CRÍTICO] Tabela `produtos` sem RLS habilitado
- **Impacto:** Qualquer cliente com a anon key pode ler/escrever todos os produtos.
- **Fix:**
  ```sql
  ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
  -- + CREATE POLICY conforme padrão de acesso
  ```

### 🟠 [ALTO] Policy INSERT em `pedidos` usa USING em vez de WITH CHECK
- **Arquivo de migration:** supabase/migrations/20240301_create_pedidos.sql
- **Impacto:** A policy não tem efeito — qualquer usuário autenticado pode inserir pedidos.
- **Fix:**
  ```sql
  DROP POLICY "users can create own pedidos" ON public.pedidos;
  CREATE POLICY "users can create own pedidos"
    ON public.pedidos FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```

### 🟡 [MÉDIO] Policy UPDATE em `perfis` sem WITH CHECK
- **Impacto:** Usuário pode mover um perfil para outro user_id via UPDATE.
- **Fix:** Adicionar `WITH CHECK (auth.uid() = user_id)` à policy existente.

---

## Aprovado
- ✅ Tabelas auth.* — gerenciadas pelo Supabase, fora do escopo
- ✅ `audit_logs` — sem policies intencionalmente (admin-only via service_role, documentado)
- ✅ `usuarios` — cobertura completa SELECT/INSERT/UPDATE

---

## Recomendações
- Criar migration para as policies criadas diretamente na dashboard (N policies órfãs)
- Adicionar `COMMENT ON TABLE` nas tabelas sem documentação inline
```

---

### Step 5 — Se `--fix`: gerar SQL de correção

Gerar uma nova migration com os fixes identificados:

```bash
supabase migration new fix_rls_coverage
```

Preencher com o SQL de correção de cada finding. **Não aplicar automaticamente** — apresentar ao dev para revisão antes de `supabase migration up`.
