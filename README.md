# site_institucional — 2A Desenvolvimento e Tecnologia

Monorepo do site institucional da **2A Desenvolvimento e Tecnologia Ltda**.

## Estrutura

```
site_institucional/
├── produto-infra/       # schema Supabase, migrations SQL — não utilizado neste MVP
├── produto-contracts/   # @org/shared-contracts — não utilizado neste MVP
├── produto-backend/     # API REST — não utilizado neste MVP
├── produto-web/         # site institucional Next.js — único projeto ativo
├── n8n/                 # workflow de automação do formulário de contato
└── SDD_site.md          # especificação funcional do site
```

> Este MVP é um site institucional one-page, sem banco de dados, sem autenticação e sem API própria de domínio (ver `SDD_site.md`). Por isso, apenas o **`produto-web`** está implementado — os demais projetos são scaffolding do template do workspace, reservados para uma eventual evolução futura do produto.

## Como rodar o site (`produto-web`)

### Pré-requisitos

- Node.js 20+
- pnpm (o projeto usa `pnpm@10.27.0`, declarado em `produto-web/package.json`)

### Passo a passo

```bash
cd produto-web
pnpm install
cp .env.example .env
```

Preencha o `.env` criado:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Webhook n8n do formulário de contato (server-only)
N8N_CONTACT_WEBHOOK_URL=...
N8N_CONTACT_WEBHOOK_TOKEN=...
```

Suba o servidor de desenvolvimento:

```bash
pnpm dev
```

Acesse **http://localhost:3000**.

### Outros comandos disponíveis

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento (Next.js + Turbopack) |
| `pnpm build` | build de produção (`next build`) |
| `pnpm start` | roda o build de produção localmente |
| `pnpm lint` | ESLint |
| `pnpm type-check` | checagem de tipos (`tsc --noEmit`) |
| `pnpm deploy` | `type-check` + `build` (checagem pré-deploy) |

## Deploy

Produção roda em VPS (Hostinger) via PM2 + Nginx — pipeline completo documentado em `produto-web/CLAUDE.md` (seção "Deploy — Hostinger VPS").

## Documentação

- [`SDD_site.md`](./SDD_site.md) — especificação funcional do site: páginas, formulário de contato e integração com o webhook do n8n
- [`CLAUDE.md`](./CLAUDE.md) — convenções do workspace/monorepo
- [`produto-web/CLAUDE.md`](./produto-web/CLAUDE.md) — stack, arquitetura e convenções específicas do frontend
- [`n8n/`](./n8n) — workflows do n8n usados pelo formulário de contato (`formulario-contato-2ad.json`, ativo em produção)
