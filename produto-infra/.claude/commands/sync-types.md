# Command: /sync-types

## Descrição
Regenera `database.ts` a partir do schema Supabase atual, copia para `produto-contracts` e valida que os consumers (backend e web) ainda compilam. Executar sempre após aplicar uma migration.

## Usage
```
/sync-types [--check] [--local]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--check` | ❌ | Apenas detecta divergências sem alterar arquivos |
| `--local` | ❌ | Força geração contra o Supabase local (Docker). Default: usa `SUPABASE_PROJECT_ID` |

### Exemplos
```bash
/sync-types
/sync-types --check
/sync-types --local
```

---

## Execution Plan

### Step 1 — Gerar `database.ts`

**Com Supabase local rodando (`supabase start`):**
```bash
supabase gen types typescript --local \
  > .claude/types/database.ts
```

**Com projeto remoto de DEV:**
```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  > .claude/types/database.ts
```

> ⚠️ `SUPABASE_PROJECT_ID` deve apontar para o projeto de **DEV**, nunca produção.

---

### Step 2 — Copiar para shared-contracts

```bash
cp .claude/types/database.ts ../produto-contracts/src/types/database.ts
```

Verificar que o arquivo foi copiado corretamente:
```bash
head -5 ../produto-contracts/src/types/database.ts
```

---

### Step 3 — Rebuild do pacote contracts

```bash
cd ../produto-contracts && pnpm build && cd -
```

---

### Step 4 — Verificar consumers

```bash
# Na raiz do workspace — turbo resolve a ordem automaticamente:
turbo typecheck
```

Não é necessário rodar `pnpm install` nos consumers — `workspace:*` é resolvido
pelo pnpm workspace e o build de contracts já está disponível via symlink.

Se algum consumer falhar no typecheck:
1. Identificar o campo/tabela que mudou
2. Atualizar schemas Zod em `produto-contracts/src/schemas/` se o contrato mudou
3. Atualizar queries nos services do consumer afetado
4. Rodar `turbo typecheck` novamente até passar

---

### Step 5 — Relatório de mudanças

Ao final, reportar:

```
Sync concluído — <data>
Arquivo: .claude/types/database.ts → ../produto-contracts/src/types/database.ts

Tabelas detectadas: [lista das tabelas no schema]
Enums detectados:   [lista dos enums]

Consumers:
  ✅ produto-backend  — typecheck passou
  ✅ produto-web      — typecheck passou
```

---

### Step 6 — Commit

```bash
git add .claude/types/database.ts
git commit -m "chore(types): sync database.ts após migration <nome>"
```

O commit do `database.ts` em `shared-contracts` é feito separadamente, dentro daquele repo.
