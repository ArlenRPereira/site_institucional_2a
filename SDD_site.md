# SDD — 2A Desenvolvimento e Tecnologia (Site Institucional)

> Site institucional one-page (Next.js + TailwindCSS), sem banco de dados, sem autenticação e sem API própria de domínio — conforme SDD original do projeto. A seção 2 (Entidades) do template não se aplica a este MVP; a seção 3 (Contratos de API) não define uma API própria, mas documenta o contrato de integração com o webhook externo do n8n usado pelo formulário de contato. **Exceção à renderização estática:** existe um único Route Handler server-side (`/api/webhooks/contato`, seção 4) que faz proxy dessa integração — por isso o app roda em runtime Node (VPS/PM2, já previsto na stack), e não em `output: 'export'` puro. Ver seção 7.

---

## 1. Visão Geral

**Nome do app:** 2A Desenvolvimento e Tecnologia — Site Institucional
**Descrição:** Landing page institucional one-page que apresenta a 2A Desenvolvimento e Tecnologia Ltda, comunicando suas duas frentes de atuação — Tecnologia/SaaS/IA e ESG/Desenvolvimento Institucional/Gestão de Projetos Sociais — para empresas, instituições, startups e prefeituras, e gera contatos comerciais via formulário.
**Autenticação:** Não há. Site 100% público, sem login e sem área administrativa.

---

## 2. Entidades do Banco de Dados

Não se aplica. MVP não possui banco de dados (RNF: SSG para as páginas — ver seção 7 sobre a exceção do Route Handler de contato). O formulário de contato envia os dados via webhook para um workflow n8n (ver seção 3, "Integração — Webhook n8n") — nenhum dado é persistido pela aplicação.

---

## 3. Contratos de API

Sem API própria de domínio (sem entidades, sem CRUD) — apenas um Route Handler interno que atua como proxy do envio do formulário para o webhook externo do n8n (ver "Integração — Webhook n8n" abaixo e seção 5, página "Home", ação de contato).

**ContactFormSchema** (payload enviado pelo frontend ao Route Handler, e por ele repassado ao n8n):
```
nome: string — min 1, max 120
email: string — email válido
telefone: string — opcional
empresa: string — opcional, max 160
interesse: enum — "Tecnologia, SaaS e IA" | "ESG e Projetos Sociais" | "Ambos" | "Outro"
mensagem: string — min 1, max 2000
```

**Integração — Webhook n8n:**

Ao submeter o formulário de contato, o frontend envia os dados para um Route Handler próprio do `produto-web` (`src/app/api/webhooks/contato/route.ts` — camada "API INTERNA" do projeto), que valida o payload com o `ContactFormSchema` (Zod) e repassa a requisição ao workflow n8n ativo, responsável por encaminhar o contato por e-mail. O n8n nunca é chamado diretamente do browser, para não expor o token de autenticação no bundle client-side.

**Workflow ativo em produção:** `n8n/formulario-contato-2ad.json` (v1, simples) — `Webhook → Enviar Email → Responder Sucesso`. Não há honeypot, captcha nem sanitização/validação adicional no lado do n8n; a única validação de payload nessa integração é a do Route Handler (Zod, `ContactFormSchema`) antes do repasse. Como o node "Enviar Email" interpola os campos (`nome`, `mensagem` etc.) direto no HTML do e-mail sem escapar, existe um risco baixo de HTML injection no corpo do e-mail recebido — aceitável para o volume/risco atual, mas vale revisitar se o formulário passar a receber tráfego não confiável em escala.

> `n8n/formulario-contato-2ad_v2.json` existe no repositório como uma versão mais robusta (honeypot + sanitização server-side dos campos) para adoção futura, caso o v1 se mostre insuficiente. O captcha via Cloudflare Turnstile que essa v2 previa foi desabilitado nela (nodes desconectados, não removidos) porque o frontend não implementa o widget Turnstile — ver nota "Instruções" dentro do próprio arquivo do workflow.

- **Frontend → Route Handler:** `POST /api/webhooks/contato`, body = `ContactFormSchema`
- **Route Handler → n8n:**
  - **Método:** `POST`
  - **URL:** variável de ambiente `N8N_CONTACT_WEBHOOK_URL`
  - **Headers:** `Content-Type: application/json`, `Authorization: Bearer ${N8N_CONTACT_WEBHOOK_TOKEN}`
  - **Body:** JSON com os campos do `ContactFormSchema`
- **Credenciais:** armazenadas em `produto-web/.env` (server-only, sem prefixo `NEXT_PUBLIC_`) — `N8N_CONTACT_WEBHOOK_URL` e `N8N_CONTACT_WEBHOOK_TOKEN`. Nunca commitadas; nunca referenciadas por valor literal em código ou documentação.
- **Resposta esperada:** o workflow n8n responde via node de resposta do Webhook indicando sucesso/erro; o Route Handler repassa esse resultado ao frontend, que alterna entre os estados "enviando" → "enviado"/erro (ver seção 5, estados do formulário)

`N8N_CONTACT_WEBHOOK_URL` aponta para o path de produção `webhook/contato-2ad` (sem `-test`) — o workflow correspondente precisa estar **ativado** no n8n para responder.

---

## 4. Endpoints da API

**`POST /api/webhooks/contato`** `--public`
- Único endpoint da aplicação. Route Handler interno (`src/app/api/webhooks/contato/route.ts`) que recebe o `ContactFormSchema` do formulário, injeta o header `Authorization: Bearer ${N8N_CONTACT_WEBHOOK_TOKEN}` e repassa ao webhook n8n (`N8N_CONTACT_WEBHOOK_URL`) — ver seção 3, "Integração — Webhook n8n".
- Existir apenas esse endpoint é o motivo de o app **não poder** usar `output: 'export'` (static export puro) no Next.js — precisa de runtime de servidor (Node) para o Route Handler funcionar. Ver seção 7 (RNF de performance).

---

## 5. Páginas Web

### Home `--public`

- **Rota:** `/`
- **Tipo de renderização:** SSG para o conteúdo da página (sem fetch a banco de dados); o envio do formulário passa pelo Route Handler server-side `/api/webhooks/contato` (ver seção 4) — não é `output: 'export'` puro
- **Dados exibidos:** conteúdo institucional fixo, definido em `src/data/` (empresa, serviços, projetos, diferenciais) — ver arquivo de referência visual `2A Desenvolvimento - Site Institucional.dc.html` no design.
  - Header: logo + nome, menu (Início, Sobre, Soluções, Diferenciais, Projetos, Contato), botão "Solicitar contato"
  - Hero (`#inicio`): título institucional, subtítulo, botões "Conheça nossas soluções" / "Fale conosco", badges das duas frentes
  - Sobre (`#sobre`): texto institucional (propósito, duas frentes, premissa de trabalho)
  - Soluções (`#solucoes`): 2 cards — Tecnologia/SaaS/IA e ESG/Desenvolvimento Institucional/Gestão de Projetos Sociais
  - Tecnologia, SaaS e IA (`#tecnologia`): texto + etapas (Ideia → Descoberta → MVP → Arquitetura → Desenvolvimento → Automação e IA → Deploy → Evolução) + lista de 15 serviços
  - ESG, Desenvolvimento Institucional e Gestão de Projetos Sociais (`#esg`): texto + etapas (Diagnóstico → Planejamento → Execução → Indicadores → Impacto → Prestação de contas) + lista de 12 serviços
  - Para quem atendemos (`#para-quem`... incluída dentro da seção Diferenciais no fluxo): badges de público-alvo
  - Diferenciais (`#diferenciais`): 8 cards numerados
  - Projetos possíveis (`#projetos`): 8 exemplos de tipo de projeto (com aviso de que não são cases reais)
  - Contato (`#contato`): texto de chamada, e-mail comercial, formulário (nome, e-mail, telefone, empresa, tipo de interesse, mensagem), aviso de uso de dados (LGPD)
  - Footer: logo, tagline, navegação, dados institucionais, copyright
- **Ações disponíveis:**
  - Scroll suave para âncoras via menu
  - Envio do formulário de contato → webhook n8n (ver seção 3, "Integração — Webhook n8n"; RF011 do SDD original) → estado de sucesso substitui o formulário
  - Validação client-side: nome obrigatório, e-mail obrigatório e válido, tipo de interesse obrigatório, mensagem obrigatória
- **Estados:**
  - Formulário: default → validando (erros inline por campo) → enviando ("Enviando...") → enviado (tela de confirmação com botão "Enviar outra mensagem")
  - Sem loading/error de página (conteúdo estático, sem fetch remoto)
- **SEO:** title `2A Desenvolvimento e Tecnologia | SaaS, IA, ESG e Engenharia Social`; description conforme SDD original (§14.1); Open Graph com título "2A Desenvolvimento e Tecnologia" e descrição "Tecnologia, inovação e impacto social para empresas e governos."; favicon; sitemap/robots básicos
- **Dados remotos:** nenhum — todo conteúdo é estático/local

### Política de Privacidade `--public`

- **Rota:** `/politica-de-privacidade`
- **Tipo de renderização:** SSG, página estática simples
- **Dados exibidos:** quais dados são coletados no formulário, finalidade (retorno comercial), como solicitar remoção, e-mail de contato, uso de cookies/analytics (se houver), declaração de não venda de dados
- **Ações disponíveis:** nenhuma (conteúdo informativo)
- **Estados:** nenhum
- **SEO:** title/description simples, `noindex` opcional
- **Dados remotos:** nenhum

---

## 6. Regras de Negócio Globais

- O site não deve sugerir cases reais já entregues — a seção "Projetos possíveis" é declaradamente ilustrativa (RF009 do SDD original).
- As duas frentes de atuação (Tecnologia/SaaS/IA e ESG/Desenvolvimento Institucional/Gestão de Projetos Sociais) devem ser sempre apresentadas como complementares, nunca como empresas ou marcas separadas.
- Nenhum dado de formulário é armazenado pela aplicação — envio é repassado via webhook ao workflow n8n responsável pelo processamento e encaminhamento por e-mail (ver seção 3).
- Texto de consentimento LGPD deve acompanhar sempre o formulário de contato.
- Conteúdo textual institucional é fonte única de verdade em `src/data/company.ts`, `services.ts`, `projects.ts`, `navigation.ts` — não deve ser hardcoded nos componentes de seção.

---

## 7. Requisitos Não-Funcionais

- **Performance:** SSG para as páginas, imagens otimizadas (webp), sem bibliotecas pesadas, animações moderadas (fade/slide de entrada por seção, hover sutil em cards/botões) — evitar excesso conforme diretriz "sem excesso de animações" do SDD original. Runtime Node necessário apenas pelo Route Handler `/api/webhooks/contato` (proxy do webhook n8n) — impede `output: 'export'` puro; demais páginas seguem estáticas.
- **Acessibilidade:** labels em todos os campos do formulário, contraste AA (paleta verde institucional sobre branco/verde-escuro já validada), navegação por teclado, estrutura semântica com headings.
- **SEO:** metadata completa (title, description, OG), sitemap, robots.txt, URLs amigáveis, favicon.
- **Responsividade:** breakpoints Tailwind padrão (sm/md/lg/xl/2xl); menu horizontal em desktop, hambúrguer em mobile.
