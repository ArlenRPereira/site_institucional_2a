# site_institucional — Constituição

> Leia este arquivo antes de qualquer sessão que envolva mais de um projeto.
> Ele é o mapa do workspace — não repete o que está nos CLAUDE.md de cada projeto.

---

## 1. Estrutura do workspace

```
site_institucional/
├── produto-infra/       # schema Supabase, migrations SQL, RLS, seeds
├── produto-contracts/   # @org/shared-contracts — Zod schemas + tipos gerados
├── produto-backend/     # API REST (Express.js 4.x + TypeScript strict) — consome Supabase via service_role
└── produto-web/         # Frontend Next.js 15 (App Router) — deploy em VPS
```

> Workspace dedicado a **WEB** (Next.js) e **Backend** (Node.js + TypeScript). Sem app mobile.

---

## 2. Fluxo de dependência

```
produto-infra
  └── gera database.ts
        └── produto-contracts  (@org/shared-contracts)
              ├── produto-backend   (Zod schemas + tipos)
              └── produto-web       (tipos de API + database.ts)
```

**Regra de ouro:** mudança que começa na infra termina nos consumidores.
Nunca o caminho inverso (consumers não definem schema).

---

## 3. Onde começa cada tipo de tarefa

| Tarefa | Começa em | Propaga para |
|---|---|---|
| Nova tabela / coluna | `infra` (migration) | `contracts` (database.ts) → `backend` → `web` |
| Novo endpoint da API | `contracts` (schema Zod) → `backend` (rota) | `web` (consumo) |
| Nova página | `web` | — (self-contained) |
| Mudança de contrato de API | `contracts` (bump versão) | `backend` + `web` |
| Fix de bug isolado | no projeto afetado | — |

---

## 4. Ordem de PR em mudanças cross-repo

**Padrão de branch (cross-repo):** `feat/<scope>-<short-desc>` | `fix/<scope>-<short-desc>` | `refactor/<scope>-<short-desc>`. O `<scope>` identifica o módulo afetado (ex: `orders`, `auth`, `contracts`). Obrigatório em todos os projetos.

Sempre mergear nesta ordem para não quebrar CI dos dependentes:

```
1. produto-infra       (migration aplicada, database.ts gerado)
2. produto-contracts   (schema/tipos atualizados, versão bumpeada)
3. produto-backend     (rota/service atualizado)
4. produto-web         (consumo atualizado)
```

---

## 5. Variáveis de ambiente — onde vivem

| Variável | Quem usa | Onde definir |
|---|---|---|
| `SUPABASE_URL` | backend, infra | `.env` de cada projeto |
| `SUPABASE_ANON_KEY` | web | `.env` de cada projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | backend, infra (local) | `.env` — **nunca commitar** |
| `SUPABASE_PROJECT_REF` | infra, web (MCP) | `.env` de cada projeto |
| `SUPABASE_ACCESS_TOKEN` | infra, web (MCP) | `.env` de cada projeto |
| `GITHUB_TOKEN` | todos (MCP GitHub) | `.env` de cada projeto |

Nenhuma variável de ambiente é compartilhada via arquivo entre projetos.
Cada projeto tem seu próprio `.env` local e `.env.example` commitado (sem valores).

---

## 6. Monorepo pnpm — estrutura e fluxo

Este workspace é um **pnpm monorepo** gerenciado pela raiz (`pnpm-workspace.yaml`).

```
site_institucional/
├── package.json           ← workspace root (turbo + changesets)
├── pnpm-workspace.yaml    ← declara os 4 membros
├── turbo.json             ← pipeline de build/typecheck/test
├── .changeset/            ← versionamento de @org/shared-contracts
└── pnpm-lock.yaml         ← lockfile único para todo o workspace
```

`@org/shared-contracts` é referenciado via protocolo workspace em todos os consumers:

```json
"@org/shared-contracts": "workspace:*"
```

Após qualquer mudança em `produto-contracts`:
```bash
# Na raiz — pnpm resolve o workspace:* automaticamente:
pnpm --filter @org/shared-contracts build

# Ou compilar tudo respeitando a ordem de dependência:
turbo build
```

> Package manager unificado: **pnpm** em todos os projetos (workspace:* exige pnpm).

---

## 7. Regras invioláveis do workspace

1. **Schema é imutável após aplicado.** Nunca editar migration já aplicada — criar nova.
2. **`database.ts` nunca editado manualmente.** Sempre gerado via `pnpm db:types` na infra.
3. **Sem `service_role` no web.** Apenas backend e infra (local) usam a chave privilegiada.
4. **PR de `contracts` é mergeado primeiro.** Antes de qualquer PR de consumer que dependa da mudança.
5. **Sem lógica de negócio duplicada.** Regras que vivem em RLS/triggers não são reimplementadas nos apps.
6. **Testes passando antes de PR.**
   - `contracts` e `backend`: `pnpm typecheck && pnpm lint && pnpm test`
   - `web`: `npm run type-check && npm run lint && npm run test`
   - Tudo de uma vez na raiz: `turbo typecheck lint test`
   - Detalhe por projeto: ver §7.2 (backend) e "Testes unitários" (web) nos CLAUDE.md de cada projeto

---

## 8. Modelos configurados por projeto

| Projeto | Modelo | Justificativa |
|---|---|---|
| `produto-backend` | `claude-sonnet-4-6` | API + testes — velocidade |
| `produto-web` | `claude-opus-4-7` | Next.js + SEO + VPS — máxima qualidade |
| `produto-infra` | `claude-sonnet-4-6` | migrations SQL — velocidade + precisão |
| `produto-contracts` | `claude-sonnet-4-6` | tipos/schemas — velocidade |

---

## 9. Agents disponíveis por projeto

| Projeto | Agents |
|---|---|
| `infra` | `migration-writer`, `rls-policy-author`, `schema-reviewer` |
| `backend` | `route-architect`, `jest-test-writer`, `security-auditor`, `api-doc-writer`, `supabase-query-builder` |
| `web` | `page-builder`, `navigation-architect`, `api-client-agent`, `seo-optimizer`, `build-doctor`, `perf-analyzer` |
| `workspace` (raiz) | `pr-security-auditor` — gate de segurança cross-repo, ver §11 |

`produto-contracts` não tem agents próprios — mudanças aqui disparam trabalho nos consumers.

---

## 10. Commands cross-repo

| Command | Projeto | O que faz |
|---|---|---|
| `/new-migration` | `infra` | Scaffolda migration SQL com template canônico |
| `/sync-types` | `infra` | Gera `database.ts` e propaga para `contracts` |
| `/review-rls` | `infra` | Audita cobertura de RLS em todas as tabelas |
| `/bump-version` | `contracts` | Bumpa versão (semântica `patch`/`minor`/`major`) e executa fluxo de 7 passos — ver `contracts/CLAUDE.md §7` |
| `/new-endpoint` | `backend` | Scaffolda rota Express + service + testes |
| `/sync-types` | `backend` | Sincroniza tipos com schema Supabase |
| `/audit-security` | `backend` | Auditoria de segurança completa da API |
| `/new-page` | `web` | Cria page.tsx + loading/error/not-found no App Router |
| `/new-component` | `web` | Cria componente React na camada correta (ui/common/features) |
| `/new-route-handler` | `web` | Cria Route Handler com auth, Zod e CORS |
| `/sync-types` | `web` | Regenera `supabase.ts` via `npm run types:supabase` |

### Command de orquestração (nível workspace)

| Command | O que faz |
|---|---|
| `/build-from-spec` | Lê `SDD.md` e constrói toda a aplicação na ordem correta: infra → contracts → backend → web |

---

## 11. Segurança cross-repo — auditoria antes de PR

Política vigente: `auditoria/SECURITY.md` — OWASP Top 10 (2021), OWASP SAMM, Twelve-Factor App.

| Componente | Local | O que faz |
|---|---|---|
| Skill `pr-security-audit` | `auditoria/skills/pr-security-audit/SKILL.md` | Gatilho: dispara antes de abrir/atualizar um PR em qualquer um dos 4 projetos, ou quando `SECURITY.md` muda. Runbook: descobre escopo via `git diff`, invoca o agent, aplica o gate de severidade. |
| Agent `pr-security-auditor` | `auditoria/agents/pr-security-auditor.md` | Checklist completo por projeto (infra/contracts/web) + delega API a `security-auditor` (backend). Produz relatório com severidade e decisão de gate (bloquear/permitir merge). |

Regra: **PR com finding 🔴 Critical ou 🟠 High em aberto não é mergeada.** Findings 🟡/🟢 são registrados no PR e podem seguir para merge.

> `SECURITY.md` hoje descreve alguns controles (fluxo OAuth2 com `express-session`/`csurf`) que não correspondem ao stack real deste monorepo (Supabase Auth + JWT). O agent trata isso como finding de Governance (SAMM) em vez de replicar checks que não se aplicam — vale revisar e atualizar o documento.

> **Nota de descoberta:** os demais agents/skills do workspace (§9) vivem em `<projeto>/.claude/agents` e `<projeto>/.claude/skills`, path que o Claude Code varre automaticamente para listar subagents e sugerir skills. Como `pr-security-auditor` e `pr-security-audit` foram movidos para `auditoria/` (fora de `.claude/`), eles não aparecem mais como agent/skill invocável automaticamente — são referência de checklist a ser lida/seguida manualmente (ex.: via Read, ou colada no início de uma sessão de PR). Para restaurar a invocação automática, seria necessário manter uma cópia (ou symlink) em `.claude/agents/` e `.claude/skills/` na raiz.
