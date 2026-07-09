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

## Deploy — Hostinger VPS via EasyPanel

Produção roda em **container Docker gerenciado pelo EasyPanel** (PaaS self-hosted instalado na VPS da Hostinger). O EasyPanel cuida do build (a partir do `Dockerfile`), do reverse proxy (Traefik) e do HTTPS (Let's Encrypt) automaticamente — não há PM2, Nginx nem Certbot configurados manualmente.

**Coordenadas do ambiente:**

| Item | Valor |
|---|---|
| Projeto EasyPanel | `2a_site_institucional` (serviço tipo **App**) |
| Repositório | `ArlenRPereira/site_institucional_2a` |
| Branch publicada | `develop_v2` |
| Build Path (subpasta) | `/produto-web` |
| Build method | Dockerfile |
| Porta do container | `3000` |
| Domínio | `2adesenvolvimento.com.br` |
| IP da VPS | `82.25.77.31` (hPanel → VPS → Overview) |

### 1. Arquivos de deploy (em `produto-web/`)

O que torna o projeto publicável — já commitado no repositório:

| Arquivo | Papel |
|---|---|
| `next.config.ts` | `output: "standalone"` — gera um servidor Node autocontido em `.next/standalone` |
| `Dockerfile` | build multi-stage (pnpm 10.27 / Node 20 alpine), usuário não-root, porta 3000, `NEXT_PUBLIC_APP_URL` como build arg |
| `.dockerignore` | exclui `node_modules`, `.next`, `.env*`, `.git`, `.claude` do contexto de build |

### 2. Validar a imagem localmente (opcional, antes de subir)

```bash
cd produto-web
docker build --build-arg NEXT_PUBLIC_APP_URL=https://2adesenvolvimento.com.br -t 2a-web .
docker run --rm -p 3000:3000 \
  -e N8N_CONTACT_WEBHOOK_URL="<url de produção do n8n>" \
  -e N8N_CONTACT_WEBHOOK_TOKEN="<token de produção>" \
  2a-web
# Acesse http://localhost:3000 — deve responder 200
```

### 3. Configurar o serviço no EasyPanel

No projeto `2a_site_institucional` → **+ Service → App**:

- **Source:** GitHub → repo `ArlenRPereira/site_institucional_2a`, branch `develop_v2`, **Build Path = `/produto-web`**.
- **Build:** method **Dockerfile**; em **Build Args**, adicionar `NEXT_PUBLIC_APP_URL=https://2adesenvolvimento.com.br`.
- **Environment:** as três variáveis de runtime:
  ```
  NEXT_PUBLIC_APP_URL=https://2adesenvolvimento.com.br
  N8N_CONTACT_WEBHOOK_URL=<url de produção do n8n>
  N8N_CONTACT_WEBHOOK_TOKEN=<token de produção>
  ```
- **Domains:** adicionar `2adesenvolvimento.com.br` (e `www`), **Port = 3000**, HTTPS ligado.

> ⚠️ `NEXT_PUBLIC_APP_URL` é embutido no bundle **em tempo de build** — por isso precisa estar tanto em **Build Args** quanto em **Environment**. Se faltar no build, `sitemap.xml`, `robots.txt` e canonical/OG saem apontando para `localhost`.

### 4. Apontar o DNS (hPanel → Domínios → Zona DNS)

O domínio precisa resolver para o IP da VPS:

| Nome | Tipo | Valor |
|---|---|---|
| `@` | A | `82.25.77.31` |
| `www` | CNAME | `2adesenvolvimento.com.br` (segue o apex) |

Propagação: de minutos a horas (conforme o TTL). Acompanhe com `dig +short 2adesenvolvimento.com.br` até retornar `82.25.77.31`.

### 5. Ordem de publicação (evita erro de SSL na primeira vez)

```
1. Deploy no EasyPanel (valida a app pelo domínio temporário *.easypanel.host)
2. Cadastrar 2adesenvolvimento.com.br no serviço (porta 3000, HTTPS on)
3. Trocar o registro A do @ para 82.25.77.31
4. DNS propaga → Traefik emite o certificado Let's Encrypt → site no ar com HTTPS
```

Configurar o DNS **antes** do serviço existir faz o Let's Encrypt falhar a primeira emissão (recupera depois, mas gera "certificado inválido" temporário).

### Redeploy

Com auto-deploy ligado, **todo push em `develop_v2` dispara um novo build/deploy** no EasyPanel. Na prática, `develop_v2` é a branch de produção deste projeto. Para publicar uma mudança:

```bash
# de dentro de produto-web, garanta que o build passa antes de subir:
pnpm deploy            # type-check + build
git push origin develop_v2
```

## Documentação

- [`SDD_site.md`](./SDD_site.md) — especificação funcional do site: páginas, formulário de contato e integração com o webhook do n8n
- [`CLAUDE.md`](./CLAUDE.md) — convenções do workspace/monorepo
- [`produto-web/CLAUDE.md`](./produto-web/CLAUDE.md) — stack, arquitetura e convenções específicas do frontend
- [`n8n/`](./n8n) — workflows do n8n usados pelo formulário de contato (`formulario-contato-2ad.json`, ativo em produção)
