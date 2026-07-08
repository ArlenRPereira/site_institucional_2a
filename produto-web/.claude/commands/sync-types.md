# Command: /sync-types

## Descrição
Regenera `src/types/supabase.ts` a partir do schema Supabase atual, detecta breaking changes e valida que o projeto ainda compila. Executar sempre que uma migration for aplicada na infra.

## Usage
```
/sync-types [--check] [--diff]
```

### Argumentos
| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--check` | ❌ | Apenas verifica divergências sem alterar o arquivo |
| `--diff` | ❌ | Exibe o diff antes de aplicar |

### Exemplos
```bash
/sync-types
/sync-types --check
/sync-types --diff
```

---

## Execution Plan

### Step 1 — Verificar pré-condições

```bash
# Variáveis de ambiente disponíveis
[ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "❌ NEXT_PUBLIC_SUPABASE_URL não definida"
[ -z "$SUPABASE_PROJECT_REF" ]     && echo "❌ SUPABASE_PROJECT_REF não definida"

# CLI Supabase instalada
npx supabase --version
```

---

### Step 2 — Regenerar `supabase.ts`

```bash
npm run types:supabase
# equivalente a:
# npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/types/supabase.ts
```

> ⚠️ `SUPABASE_PROJECT_REF` deve apontar para o projeto de **DEV** — nunca produção.

---

### Step 3 — Detectar breaking changes (se `--diff`)

```bash
git diff src/types/supabase.ts
```

Classificação automática:

| Mudança | Impacto |
|---|---|
| Nova tabela | ✅ Não-breaking |
| Nova coluna nullable | ✅ Não-breaking — verificar se `?` é necessário nos usos |
| Nova coluna NOT NULL | 🔴 Breaking — INSERT deve incluir o campo |
| Coluna removida | 🔴 Breaking — remover dos selects/types derivados |
| Coluna renomeada | 🔴 Breaking — atualizar todos os usos |
| Tipo de coluna alterado | 🟠 Verificar — pode quebrar narrowing TypeScript |

---

### Step 4 — Validar compilação

```bash
npm run type-check
```

Se houver erros:
1. Listar os arquivos com erro
2. Para breaking changes óbvias (campo removido, renamed): corrigir imediatamente
3. Para mudanças complexas: pausar e apresentar o diff ao dev antes de corrigir

---

### Step 5 — Verificar usos de `src/types/index.ts`

`src/types/index.ts` re-exporta e cria aliases derivados de `supabase.ts`. Após mudanças, verificar se os aliases ainda compilam:

```typescript
// src/types/index.ts
import type { Database } from './supabase'

export type OrderRow    = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
// etc.
```

Se uma tabela foi renomeada ou removida: atualizar os aliases aqui.

---

### Step 6 — Commitar

```bash
git add src/types/supabase.ts src/types/index.ts
git commit -m "chore(types): sync supabase.ts após migration"
```

> `src/types/supabase.ts` é gerado — commitar junto com o código que depende dele.
> **Nunca editar `supabase.ts` manualmente.**
