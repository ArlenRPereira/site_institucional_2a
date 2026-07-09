# CLAUDE.md — Web App (Next.js Frontend)

> Este arquivo é lido automaticamente pelo Claude Code no início de toda sessão.
> Mantenha-o atualizado a cada mudança arquitetural relevante.

---

## O que é este projeto

Interface web do produto — **frontend exclusivo**, sem lógica de backend própria. Consome o backend compartilhado do workspace (Supabase + API REST), compartilhando schema de banco, autenticação, RLS e contratos de API via `@org/shared-contracts`.

O objetivo é oferecer a experiência completa do produto em navegador desktop e mobile web (responsivo).

---

## Stack e versões

| Tecnologia               | Versão                | Papel                    |
| ------------------------ | --------------------- | ------------------------ |
| Next.js                  | 15 (App Router)       | Framework principal      |
| React                    | 19                    | UI                       |
| TypeScript               | 5.x (`strict: true`)  | Linguagem                |
| Tailwind CSS             | 3.x                   | Estilização              |
| shadcn/ui                | latest                | Componentes base         |
| Supabase JS              | 2.x (`@supabase/ssr`) | Auth + DB + Storage      |
| Zod                      | 3.x                   | Validação de schema      |
| Zustand                  | 5.x                   | Estado global client     |
| class-variance-authority | 1.x                   | Variantes de componentes |
| Node.js                  | 20 LTS                | Runtime (container)      |
| Docker                   | multi-stage           | Empacotamento (imagem `output: standalone`) |
| EasyPanel                | —                     | Deploy/PaaS na VPS Hostinger (Traefik + Let's Encrypt) |

---

## Arquitetura: frontend consumindo backend compartilhado

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│         WEB APP (este repo)     │     │     BACKEND COMPARTILHADO    │
│         Next.js 15 — VPS        │     │  (produto-backend + Supabase) │
│                                 │     │                              │
│  RSC ──► createServerClient() ──┼─────┼──► Supabase (Postgres + RLS) │
│  Client ► createClient() ───────┼─────┼──► Supabase Auth             │
│  Route Handlers ────────────────┼─────┼──► Supabase Storage          │
│  Services ──► apiClient() ──────┼─────┼──► API REST (backend próprio)│
└─────────────────────────────────┘     └──────────────────────────────┘
```

### Princípios da integração

- **Supabase é o backend primário.** Auth, banco de dados e storage são consumidos diretamente via `@supabase/ssr`.
- **RLS protege todos os dados.** Nunca filtrar dados apenas no frontend. O Supabase aplica Row Level Security antes de retornar qualquer linha.
- **`shared-contracts` é a fonte de verdade dos tipos.** Tipos gerados por `supabase gen types` refletem o schema real do banco — nunca escrever tipos de tabela manualmente.
- **API REST complementar.** Endpoints do backend próprio (se existirem além do Supabase) são consumidos via `src/services/api/client.ts`.
- **Zero lógica de negócio duplicada.** Regras que já existem no backend (triggers, functions, RLS) não são reimplementadas no frontend.

---

## Estrutura do projeto

```
web-app/
├── CLAUDE.md                         ← você está aqui
├── .mcp.json                         ← servidores MCP do projeto
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── Dockerfile                        ← build da imagem (deploy EasyPanel)
├── .dockerignore                     ← exclusões do contexto de build
├── package.json
│
├── .claude/
│   ├── settings.json                 ← permissões e modelo
│   ├── agents/                       ← sub-agentes especializados
│   │   ├── page-builder.md
│   │   ├── navigation-architect.md
│   │   ├── api-client-agent.md
│   │   ├── seo-optimizer.md
│   │   ├── build-doctor.md
│   │   └── perf-analyzer.md
│   ├── skills/                       ← referências técnicas
│   │   ├── design-tokens/SKILL.md
│   │   ├── component-pattern/SKILL.md
│   │   ├── api-client-pattern/SKILL.md
│   │   └── seo-pattern/SKILL.md
│   └── commands/                     ← scaffolding rápido
│       ├── new-page.md
│       ├── new-component.md
│       └── new-route-handler.md
│
├── public/
│   ├── fonts/
│   ├── icons/
│   ├── images/
│   └── og-default.png                ← OG image padrão 1200×630px
│
└── src/
    ├── app/                          ← App Router
    │   ├── layout.tsx                ← root layout + metadata global
    │   ├── page.tsx                  ← landing / home pública
    │   ├── sitemap.ts
    │   ├── robots.ts
    │   ├── middleware.ts             ← auth guard + session refresh
    │   ├── (auth)/                   ← público: login, register
    │   ├── (dashboard)/              ← autenticado: app principal
    │   └── api/                      ← Route Handlers (webhooks, BFF)
    │
    ├── components/
    │   ├── ui/                       ← átomos (shadcn/ui + custom)
    │   ├── common/                   ← moléculas compartilhadas
    │   └── features/                 ← organismos por domínio
    │
    ├── services/
    │   └── api/
    │       ├── client.ts             ← fetch base + interceptors
    │       ├── auth.service.ts
    │       └── [feature].service.ts
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts             ← browser (anon key, RLS)
    │   │   ├── server.ts             ← RSC + Route Handlers
    │   │   └── middleware.ts         ← session refresh no edge
    │   ├── env.ts                    ← validação de variáveis obrigatórias
    │   └── utils.ts                  ← cn(), formatters
    │
    ├── hooks/                        ← custom hooks ('use client')
    ├── stores/                       ← Zustand stores
    ├── theme/                        ← tokens CSS + tailwind-preset
    └── types/
        ├── supabase.ts               ← GERADO — nunca editar manualmente
        └── index.ts                  ← aliases e tipos derivados
```

---

## Backend compartilhado — o que o frontend pode usar

### Tabelas disponíveis (Supabase)

> Atualizar esta seção sempre que uma migration for aplicada no backend.

```
usuarios          → perfil do usuário autenticado (user_id = auth.uid())
[feature_1]       → descrever tabela e relações
[feature_2]       → descrever tabela e relações
```

### Autenticação (Supabase Auth)

Mesma instância Supabase usada pelo backend — sessões via cookie no web:

| Método        | Trigger no web                                            |
| ------------- | --------------------------------------------------------- |
| Email + senha | Formulário em `(auth)/login`                              |
| Magic link    | Formulário em `(auth)/login`                              |
| OAuth Google  | Botão em `(auth)/login` → callback em `api/auth/callback` |
| OAuth GitHub  | Idem                                                      |

**Callback OAuth obrigatório:**

```ts
// src/app/api/auth/callback/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
```

### RLS — regras ativas no banco

> Descrever as políticas RLS relevantes para o frontend.
> Exemplo:

```
usuarios:   SELECT onde id = auth.uid()
projetos:   SELECT/INSERT/UPDATE/DELETE onde user_id = auth.uid()
```

O frontend **nunca** filtra por `user_id` manualmente — o RLS já garante isso. A query pode omitir o filtro; o banco retorna apenas as linhas do usuário autenticado.

### Storage (Supabase Storage)

```
bucket: avatars    → público, path: {user_id}/avatar.{ext}
bucket: uploads    → privado, RLS por user_id
```

---

## Rotas do projeto

```
PÚBLICAS (indexáveis)
  /                       landing page
  /blog                   listagem de posts (se aplicável)
  /blog/[slug]            post individual
  /sobre                  página institucional

AUTENTICAÇÃO (públicas, redireciona autenticados)
  /login
  /register
  /forgot-password
  /api/auth/callback      OAuth callback (Supabase)

AUTENTICADAS (redireciona anônimos para /login)
  /dashboard              visão geral
  /dashboard/[feature]    listagem de feature
  /dashboard/[feature]/[id]  detalhe

API INTERNA
  /api/webhooks/[...]     webhooks externos
```

**Middleware guard:** `src/app/middleware.ts` protege todos os prefixos `/dashboard/*` e `/configuracoes/*`. Qualquer nova rota autenticada deve ter seu prefixo adicionado à lista `ROTAS_PROTEGIDAS` no middleware.

---

## Variáveis de ambiente

### `.env.local` (desenvolvimento — nunca commitar)

```bash
# Supabase — compartilhado com o backend
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend REST (se houver além do Supabase)
NEXT_PUBLIC_API_URL=http://localhost:4000

# Server-only — nunca NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WEBHOOK_SECRET=whsec_...

# MCP (Claude Code — não vai para o servidor)
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=[project-ref]
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
```

### Variáveis de produção (EasyPanel → Environment)

As variáveis de produção **não vivem em arquivo no VPS** — ficam na aba **Environment** do serviço `web` no EasyPanel e são injetadas no container em runtime (e como build args). Conjunto atual:

```bash
NEXT_PUBLIC_APP_URL=https://2adesenvolvimento.com.br
N8N_CONTACT_WEBHOOK_URL=https://...easypanel.host/webhook/contato-2ad
N8N_CONTACT_WEBHOOK_TOKEN=...        # segredo — rotacionar se vazar
PORT=3000                           # obrigatório (ver seção "Deploy")
```

Após editar, clicar **Implantar** para aplicar.

---

## Scripts disponíveis

```bash
npm run dev            # servidor de desenvolvimento (Turbopack)
npm run build          # build de produção
npm run start          # servidor de produção local
npm run lint           # ESLint
npm run type-check     # tsc --noEmit (sem emitir arquivos)
npm run types:supabase # regenerar src/types/supabase.ts do schema
npm run analyze        # bundle analyzer (ANALYZE=true)
npm run deploy         # type-check + build (pre-deploy check)

# Testes
npm run test           # jest run
npm run test:watch     # jest --watch
npm run test:coverage  # jest --coverage
```

> **Sempre rodar `npm run type-check` antes de commitar.** O CI bloqueia PRs com erros TypeScript.

---

## Testes unitários

- **Framework:** Jest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`)
- **Localização:** `src/**/__tests__/*.test.ts(x)` ou `src/**/*.test.ts(x)` ao lado do módulo
- **O que testar:** hooks customizados, services/utils, transformações de dados, Server Actions com lógica isolável
- **O que NÃO testar:** RSC com dependências de Node (sem ambiente de browser simulado confiável) — cobrir com e2e (Playwright); páginas inteiras; configuração de Supabase
- **Mocking do Next.js (obrigatório em Client Components que usam roteamento):**

  ```typescript
  jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
  }));

  jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
  }));
  ```

- **Mocking do Supabase client:** criar `src/__mocks__/@supabase/ssr.ts` para evitar conexão real em testes unitários
- **Mocking de fetch / API:** usar `msw` (Mock Service Worker) para interceptar chamadas ao backend REST
- **Stores Zustand:** testar com `act()` do RTL; resetar store entre testes via `beforeEach`
- **Naming:** `describe('useAuthStore')` → `it('— limpa sessão e redireciona após logout')`
- **Coverage mínima:** 80% de branches em `src/hooks/` e `src/services/` — checar com `npm run test:coverage`
- **Não mockar o que pode ser testado puro:** funções de formatação, transformações, validators Zod — testá-los diretamente sem mocks

---

## Deploy — Hostinger VPS via EasyPanel

Produção roda como **container Docker gerenciado pelo EasyPanel** (PaaS self-hosted na VPS da Hostinger). O EasyPanel builda o `Dockerfile`, faz o reverse proxy (Traefik) e emite o SSL (Let's Encrypt) automaticamente — **não há PM2, Nginx nem Certbot manuais**.

```
push na branch de deploy (main)
      ↓
EasyPanel — auto-deploy via GitHub
      ├── clona o repo (Build Path = /produto-web)
      ├── docker build -f Dockerfile   (multi-stage, output standalone)
      ├── injeta Environment como build args + runtime (NEXT_PUBLIC_APP_URL, PORT=3000, N8N_*)
      └── Traefik roteia o domínio → container:3000  (SSL automático)
```

**Serviço:** projeto `2a-site-institucional` · serviço `web` (App) · repo `ArlenRPereira/site_institucional_2a` · branch `main` · Build Path `/produto-web` · método Dockerfile · domínio `2adesenvolvimento.com.br` · VPS `82.25.77.31`.

**Pegadinhas (checar antes de debugar deploy):**

- **`PORT=3000` é obrigatório no Environment.** O EasyPanel injeta `PORT=80` por padrão e sobrescreve o `ENV PORT=3000` do Dockerfile; os domínios apontam para `:3000` → sem essa variável dá "Service is not reachable".
- **Campo "Arquivo" (aba Build) = só `Dockerfile`.** Variáveis vão no Environment, nunca nesse campo (senão o `-f` do docker build aponta para um arquivo inexistente).
- **`NEXT_PUBLIC_APP_URL` é embutido no build.** O EasyPanel repassa o Environment como build arg automaticamente — não há campo "Build Args" separado a preencher.

**Operação (aba do serviço no EasyPanel):** **Implantar** (deploy manual) · **Logs** (confirmar `Network: http://0.0.0.0:3000`) · **Environment** (variáveis de produção). Redeploy é automático a cada push na branch configurada.

> Fluxo completo, validação local da imagem e configuração de DNS: ver `README.md` (seção "Deploy — Hostinger VPS via EasyPanel").

---

## Agentes disponíveis

Mencione o agente pelo nome na conversa ou deixe o Claude delegar automaticamente conforme o contexto.

| Agente                 | Quando usar                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `page-builder`         | Criar ou refatorar `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`    |
| `navigation-architect` | Modelar fluxos de rota, middleware, route groups, redirects                   |
| `api-client-agent`     | Criar services, hooks, integração Supabase, realtime, Server Actions          |
| `seo-optimizer`        | Metadata, OG image, sitemap, robots, JSON-LD structured data                  |
| `build-doctor`         | Erros de TypeScript, falhas de build, Dockerfile, configuração EasyPanel, diagnóstico VPS |
| `perf-analyzer`        | Core Web Vitals, bundle size, re-renders, otimização de RSC e imagens         |

---

## Skills — ler antes de implementar

| Skill                         | Ler antes de...                                                     |
| ----------------------------- | ------------------------------------------------------------------- |
| `design-tokens/SKILL.md`      | Criar ou estilizar qualquer componente visual                       |
| `component-pattern/SKILL.md`  | Criar componente em qualquer camada (`ui/`, `common/`, `features/`) |
| `api-client-pattern/SKILL.md` | Criar service, hook de dados, integração Supabase ou Server Action  |
| `seo-pattern/SKILL.md`        | Criar página pública, atualizar metadata, adicionar ao sitemap      |

---

## Commands — scaffolding rápido

```
/new-page           Cria page.tsx + loading/error/not-found conforme necessário
/new-component      Cria componente na camada correta com barrel export
/new-route-handler  Cria route.ts com auth, validação Zod e CORS
```

---

## Convenções obrigatórias

### TypeScript

- `strict: true` — sem exceções. Nenhum `any`. Use `unknown` + narrowing.
- Tipos de tabela Supabase **apenas** via `npm run types:supabase` + re-export em `types/index.ts`.
- `params` e `searchParams` são `Promise<...>` no Next.js 15 — sempre `await`.
- Exportações **nomeadas** em componentes — nunca `export default function`.

### React / Next.js

- RSC por padrão. `'use client'` no menor escopo possível — nunca em `page.tsx`.
- Fetch de dados no servidor (RSC), nunca em `useEffect` para dados iniciais.
- `notFound()` obrigatório em rotas dinâmicas sem resultado.
- `metadata` ou `generateMetadata` em toda página pública.
- `<Image>` do `next/image` com `width`/`height` explícitos — nunca `<img>` nativa.
- `<Link>` do `next/link` — nunca `<a>` para rotas internas.

### Componentes

- Localização: `ui/` → átomos | `common/` → moléculas | `features/[dominio]/` → organismos.
- Dependência de camada: `ui ← common ← features` (nunca inverter).
- `cn()` para merge de classes Tailwind — nunca concatenação de string.
- Todo componente de dados cobre os quatro estados: loading, erro, vazio, dados.
- Skeleton inline no mesmo arquivo — sem arquivo separado para skeleton.

### Estilo

- Tokens semânticos do `theme/` — nunca valores hardcoded de cor ou espaçamento.
- Dark mode via CSS custom properties (`--color-text-primary`, `--color-surface`) — funciona automaticamente.
- Mobile first — classes base para mobile, prefixos `md:` / `lg:` para telas maiores.

### Git

- Branches: `feat/`, `fix/`, `refactor/`, `chore/` + descrição em kebab-case.
- Commits: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`.
- PRs sempre para `main`. CI deve passar antes do merge.
- Nunca commitar: `.env*`, `node_modules/`, `.next/`, arquivos de chave.

---

## O que nunca fazer

```
❌ Usar service_role key no bundle client (NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)
❌ Duplicar lógica de negócio que já existe em triggers/functions do banco
❌ Fazer fetch em useEffect para dados que podem vir do RSC
❌ Criar tipos de tabela manualmente (sempre gerar com supabase gen types)
❌ Colocar 'use client' em page.tsx
❌ Importar de lib/supabase/server em Client Component
❌ Usar params.id sem await no Next.js 15
❌ Hardcodar cores, espaçamentos ou fontes fora dos tokens
❌ Commitar qualquer arquivo .env
❌ Dar git push --force na branch main
❌ Remover a variável PORT=3000 do Environment do EasyPanel (o app cai em :80 e o Traefik perde o container)
❌ Editar src/types/supabase.ts manualmente
```

---

## Decisões arquiteturais registradas

| Data | Decisão                             | Motivo                                                           |
| ---- | ----------------------------------- | ---------------------------------------------------------------- |
| —    | App Router (não Pages Router)       | RSC, Suspense nativo, route groups, melhor DX                    |
| —    | Supabase SSR com `@supabase/ssr`    | Sessão via cookie compartilhada entre RSC e client               |
| 2026-07-09 | Hostinger VPS + EasyPanel (Docker)  | Build do Dockerfile, Traefik + SSL automático, sem PM2/Nginx/Certbot manuais |
| —    | shadcn/ui como base de componentes  | Copia código (sem dependência), customizável, acessível          |
| —    | Zustand para estado global client   | API mínima, seletores granulares, sem boilerplate                |
| —    | `ServiceResult<T>` sem throw        | Erros previsíveis tratados no call site, sem try/catch espalhado |
| —    | Exportações nomeadas em componentes | Refatoração segura, tree-shaking, sem ambiguidade                |

> Adicione novas decisões aqui com a data e o motivo — futuras sessões do Claude precisam desse contexto.

---

## Contexto do backend compartilhado

O backend (`produto-backend`) e o schema Supabase (`produto-infra`) são mantidos como projetos separados dentro do workspace. O web app é **consumidor** desse backend e desse schema — não altera o schema, não cria migrations, não modifica RLS diretamente.

Qualquer necessidade de mudança no banco (nova coluna, nova tabela, nova RLS policy) deve ser:

1. Implementada como migration em `produto-infra`
2. Propagada via `produto-contracts` (bump de versão)
3. Refletida aqui via `npm run types:supabase` após aplicada

**Nunca rodar migrations a partir deste repositório.**
