# Command: /bump-version

## Descrição
Bumpa a versão do pacote `@org/shared-contracts`, valida que o build passa, comita a tag e instrui os passos de atualização em cada consumer. Use após qualquer mudança de schema ou tipo.

## Usage
```
/bump-version <patch|minor|major> [--message "<descrição>"]
```

### Quando usar cada nível
| Nível | Quando | Exemplos |
|---|---|---|
| `patch` | Correção sem impacto na interface | Fix de regex em validação, mensagem de erro |
| `minor` | Adição de campo opcional, novo schema, novo enum value | Novo campo nullable, novo recurso |
| `major` | Rename, remoção, mudança de tipo obrigatório | Campo renomeado, tipo alterado, schema removido |

### Exemplos
```bash
/bump-version patch
/bump-version minor --message "add optional avatar_url to UserProfile"
/bump-version major --message "rename userId to user_id in all schemas"
```

---

## Execution Plan

### Step 1 — Validar antes de bumpar

```bash
pnpm typecheck   # deve passar sem erros
pnpm build       # dist/ gerado sem erros
```

Se `typecheck` ou `build` falharem: corrigir antes de continuar.

---

### Step 2 — Bumpar a versão

```bash
# patch
pnpm version patch

# minor
pnpm version minor

# major
pnpm version major
```

Isso atualiza `package.json` e cria uma tag git local (`v{X.Y.Z}`).

---

### Step 3 — Rebuild com nova versão

```bash
pnpm build
```

Verificar que `dist/` foi gerado com os arquivos corretos.

---

### Step 4 — Commitar e tagear

```bash
git add package.json dist/
git commit -m "chore(contracts): bump to v$(node -p 'require(\"./package.json\").version')"
git push && git push --tags
```

---

### Step 5 — Validar consumers após bump

Como o workspace usa `workspace:*`, não é necessário rodar `pnpm install` nos consumers.
Basta recompilar e verificar na raiz do workspace:

```bash
turbo typecheck
# ou filtrando só os consumers:
turbo typecheck --filter=backend --filter=web
```

Se algum consumer falhar no typecheck após bump major/minor:
- Listar os arquivos e erros
- Delegar ao agente correto do consumer para corrigir
- Abrir PR no consumer referenciando este commit de contracts

---

### Step 6 — Checklist de breaking change (apenas major/minor)

- [ ] `CHANGELOG.md` atualizado com a mudança e motivo
- [ ] Backend atualizado e typecheck passando
- [ ] Web atualizado e typecheck passando
- [ ] PRs dos consumers referenciam este bump de versão
