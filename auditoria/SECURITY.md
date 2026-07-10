Política e Modelo de Segurança — site_institucional (2A Desenvolvimento e Tecnologia)

Este documento descreve as práticas de segurança do site institucional (`produto-web`), seguindo OWASP Top 10 (2021), OWASP SAMM e a metodologia Twelve-Factor App.

## Escopo real do projeto

Site institucional one-page em Next.js 15 (App Router), **sem banco de dados, sem autenticação de usuário e sem API própria de domínio** (ver `SDD_site.md`). Os projetos `produto-infra`, `produto-contracts` e `produto-backend` são scaffolding do template do workspace, não implementados neste MVP — os controles abaixo descrevem apenas `produto-web`.

A única superfície de execução server-side é um endpoint público:

```
POST /api/webhooks/contato
  → valida o formulário de contato (Zod)
  → repassa para um webhook do n8n (Bearer token)
  → n8n envia o e-mail para contato@2adesenvolvimento.com.br
```

Deploy: container Docker (imagem `output: standalone`) publicado via **EasyPanel** em VPS Hostinger, atrás de Traefik (reverse proxy + Let's Encrypt).

## Reporte de vulnerabilidades

Encontrou uma vulnerabilidade? Abra uma issue privada (security advisory) no repositório. Não divulgue publicamente antes da correção.

## Mitigações por categoria — OWASP Top 10 (2021)

### A01 — Broken Access Control
Não aplicável na forma clássica: não há login, sessão nem rotas privadas — o site inteiro é público. Nenhum dado de usuário é armazenado ou consultado por identidade.

### A02 — Cryptographic Failures
Nenhum segredo de longo prazo é emitido para o cliente. `NEXT_PUBLIC_*` carrega apenas dado público (`APP_URL`, `APP_VERSION`). Segredos server-only (`N8N_CONTACT_WEBHOOK_TOKEN`) vivem só no ambiente de execução (aba Environment do EasyPanel em produção, `.env` não versionado em dev) e nunca chegam ao bundle do client — verificado por grep em CI/auditoria (nenhum `'use client'` referencia `process.env` de segredo).

### A03 — Injection / XSS
- **Validação do formulário:** `contactFormSchema` (Zod) usa whitelist estrita — `enum` para campos de opção, `max` length em todos os campos de texto, `email()` para e-mail, sem `.passthrough()` (campos extras são descartados, não repassados ao n8n).
- **JSON-LD:** dado estruturado (`JsonLd.tsx`) é hoje 100% estático (nome/URL/e-mail da empresa). Por defesa em profundidade, o `<` do JSON serializado é escapado (`<`) para impedir que um `</script>` embutido encerre a tag, caso o dado deixe de ser estático no futuro.
- **Sem `dangerouslySetInnerHTML`** com conteúdo dinâmico/externo em nenhum outro componente.

### A04 — Insecure Design
- **Honeypot** no formulário de contato (campo oculto `website`; preenchido = bot).
- **Rate limiting** em `/api/webhooks/contato`: 5 requisições / 10 min por IP (`src/lib/rate-limit.ts`, janela fixa em memória — adequado ao deploy atual de instância única; se a app escalar para múltiplas réplicas, substituir por store compartilhado como Redis).
- **Limite de tamanho de campo** em todos os inputs do formulário (Zod `max`).

### A05 — Security Misconfiguration
- Headers de segurança aplicados a toda rota via `next.config.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva (câmera/microfone/geolocalização desabilitados).
- HTTPS/HSTS e certificado gerenciados pelo Traefik do EasyPanel (Let's Encrypt automático).
- Mensagens de erro genéricas para o cliente; detalhes ficam apenas em `console.error` no servidor.
- `.env.example` versionado (sem valores); `.env` real no `.gitignore`.

### A06 — Vulnerable and Outdated Components
- `pnpm audit --prod` rodado antes de cada mudança de dependência relevante.
- Dependências travadas via `pnpm-lock.yaml`.

### A07 — Identification and Authentication Failures
Não aplicável — não há sistema de login/sessão neste MVP.

### A08 — Software and Data Integrity Failures
- Sem scripts de terceiros no front-end.
- Dependências fixadas via `pnpm-lock.yaml`.
- Nenhum dado sensível (token, chave) aparece em tipo de resposta de API.

### A09 — Security Logging and Monitoring Failures
- Logs do Next.js escritos em stdout/stderr, coletados pelo EasyPanel (Logs do serviço).
- O único log de erro do endpoint (`console.error` em falha de resposta do n8n) grava status HTTP e payload de erro — nunca o token do webhook nem dados pessoais do remetente.

### A10 — Server-Side Request Forgery (SSRF)
O servidor só faz uma chamada de saída, para a URL fixa do webhook n8n definida em variável de ambiente (`N8N_CONTACT_WEBHOOK_URL`) — nunca construída a partir de input do usuário.

## CORS

O endpoint `/api/webhooks/contato` é consumido apenas pelo próprio front-end (same-origin, via `fetch` do formulário). Nenhum header CORS permissivo (`Access-Control-Allow-Origin: *`) é configurado.

## Twelve-Factor App

| Fator | Implementação |
|---|---|
| I. Codebase | Repositório git único (monorepo), `produto-web` como app deployável |
| II. Dependencies | Declaradas em `package.json` + `pnpm-lock.yaml` |
| III. Config | 100% via variáveis de ambiente; `.env.example` versionado, `.env` no `.gitignore`; `src/lib/env.ts` falha rápido (`required()`) se `N8N_CONTACT_WEBHOOK_URL`/`TOKEN` estiverem ausentes |
| VII. Port binding | Porta via `PORT` (padrão 3000 — ver nota no deploy) |
| X. Dev/prod parity | Mesmo código e mesma imagem Docker; produção builda do `Dockerfile` |
| XI. Logs | stdout/stderr, coletados pelo EasyPanel — sem arquivo de log local |

## OWASP SAMM — práticas adotadas

- **Governance / Policy & Compliance:** este documento define a política de segurança e o processo de reporte para o stack real do projeto.
- **Design / Threat Assessment:** principais ameaças mapeadas — spam/abuso do formulário de contato (mitigado por honeypot + rate limit), vazamento do token do webhook n8n em logs de build (ver Limitações), XSS via dado estruturado se deixar de ser estático.
- **Verification:** `pnpm audit --prod` a cada mudança de dependência; `pnpm type-check && pnpm lint && pnpm build` antes de cada deploy.
- **Operations / Environment Management:** segredos apenas na aba Environment do EasyPanel (produção) ou `.env` local (dev); rotacionar `N8N_CONTACT_WEBHOOK_TOKEN` caso suspeite de vazamento.

## Limitações conhecidas / próximos passos

- **Autenticação do webhook n8n:** o app envia `Authorization: Bearer <token>`, mas isso só protege de fato se o node Webhook do workflow n8n tiver **Header Auth** configurado (verificar no n8n — está fora deste repositório). Sem isso, o token não é validado do lado do n8n.
- **Segredo em log de build:** o EasyPanel repassa as variáveis de Environment como build args, o que expõe `N8N_CONTACT_WEBHOOK_TOKEN` em texto claro no log de build. Mitigação: o token não é usado em tempo de build (só runtime) — o ideal é o EasyPanel não repassá-lo como build arg; até lá, restringir acesso aos logs de build e rotacionar o token periodicamente.
- **Rate limit em memória de processo:** reseta a cada restart do container e não é compartilhado entre réplicas. Aceitável para o deploy atual (instância única); reavaliar se a app escalar horizontalmente.
- **`.env.example` de `PORT`:** documentado, mas o EasyPanel injeta `PORT=80` por padrão — é preciso definir `PORT=3000` explicitamente no Environment de produção (ver `README.md`, seção de deploy).

## Estado das dependências

- `pnpm audit --prod`: revisar antes de cada mudança de dependência (rodar `cd produto-web && pnpm audit --prod`).
- `node_modules/` não é versionado — instalação reprodutível via `pnpm install --frozen-lockfile` (usado também no `Dockerfile`).
