# SDD — 2A Desenvolvimento e Tecnologia (Site Institucional)

> Site institucional one-page (Next.js + TailwindCSS), sem banco de dados, sem autenticação e sem API própria de domínio. A seção 2 (Entidades) do template não se aplica a este MVP; a seção 3 (Contratos de API) não define uma API própria, mas documenta o contrato de integração com o webhook externo do n8n usado pelo formulário de contato. **Exceção à renderização estática:** existe um único Route Handler server-side (`/api/webhooks/contato`, seção 4) que faz proxy dessa integração — por isso o app roda em runtime Node (VPS/PM2, já previsto na stack), e não em `output: 'export'` puro. Ver seção 7.
>
> **Revisão v1.1 (Growth/Comunicação):** este documento incorpora a revisão de comunicação e Growth do SDD original (`SDD_site_institucional_2ADesenvolvimento.md` v1.1) — reposiciona a mensagem do site para priorizar valor de negócio sobre termos técnicos, adiciona as seções "Para quem ajudamos", "Problemas que resolvemos", "Como trabalhamos" e "Chamada para diagnóstico inicial", e amplia o formulário de contato. A recomendação técnica dessa revisão (static export + serviço externo de formulário) **não foi adotada** — mantém-se a integração já construída e validada em produção via Route Handler + webhook n8n (ver seção 3). Revisão já implementada no `produto-web` e nos workflows n8n.
>
> **Revisão v1.2 (Header + formulário de contato):** simplifica o header removendo o wordmark textual "2A Desenvolvimento" ao lado do logo (mantém só a marca — o nome por extenso já aparece na imagem do logo, no `alt` da imagem e no eyebrow do Hero, evitando repetição do nome da empresa na mesma tela). Revisa o formulário de contato: campo "Empresa / Instituição / Prefeitura" renomeado para "Organização (opcional)" com placeholder "Empresa, instituição ou prefeitura" (corrige quebra de linha do rótulo que desalinhava os campos ao lado de "Telefone / WhatsApp", e deixa explícito que o campo não se aplica a pessoa física); telefone passa a ser **obrigatório** (antes opcional); mensagem passa a ser **opcional** (antes obrigatória). Campos obrigatórios (nome, e-mail, telefone, tipo de interesse, momento do projeto) agora exibem `*` no rótulo, com nota explicativa no topo do formulário e alerta de validação acima do botão de envio quando a submissão é bloqueada por campo pendente. Revisão já implementada no `produto-web`.

---

## 1. Visão Geral

**Nome do app:** 2A Desenvolvimento e Tecnologia — Site Institucional
**Descrição:** Landing page institucional one-page que apresenta a 2A Desenvolvimento e Tecnologia Ltda, ajudando empresas, startups, instituições e prefeituras a transformar ideias e processos manuais em soluções digitais e projetos sociais — comunicando suas duas frentes de atuação (Tecnologia e Produtos Digitais; ESG, Desenvolvimento Institucional e Gestão de Projetos Sociais) e gerando contatos comerciais via formulário.
**Autenticação:** Não há. Site 100% público, sem login e sem área administrativa.

### 1.1 Diretrizes de comunicação (Growth)

**Princípio:** a comunicação prioriza **valor de negócio, resultado esperado e dores reais do cliente** — nunca abre com termos técnicos. Termos como *Arquitetura de Software, SaaS, Micro SaaS, APIs, IA e automações* existem no site como capacidades técnicas de suporte, exibidas em camada secundária dentro da seção "Tecnologia e Produtos Digitais" (§5), nunca no Hero, em "Para quem ajudamos" ou em "Problemas que resolvemos".

| ❌ Evitar como mensagem principal | ✅ Usar |
|---|---|
| "Desenvolvemos projetos de Arquitetura de Software, SaaS, Micro SaaS, IA, automações e produtos digitais." | "Transformamos ideias e processos manuais em MVPs, sistemas sob medida e plataformas digitais seguras, escaláveis e prontas para crescer." |

Motivo: linguagem muito técnica reduz conversão de startups, empresas tradicionais, prefeituras e instituições que não dominam esse vocabulário — a primeira camada da comunicação precisa deixar claro o **problema resolvido**, não a entrega técnica.

**Frases-âncora do posicionamento:**
```
Principal (Hero):        Transformamos ideias e processos em soluções digitais prontas para crescer.
Complementar (Hero):     Da ideia à validação. Da validação ao produto. Do produto à escala.
Institucional ampla:     Tecnologia, inovação e impacto social para empresas, startups, instituições e governos.
```

**Mensagens de dor por público** (usadas em "Para quem ajudamos", §5):
```
Startups e empreendedores        → Valide sua ideia com um MVP antes de investir alto no produto completo.
Empresas privadas                → Digitalize processos, reduza controles manuais e ganhe eficiência operacional.
Empresas em crescimento          → Evolua sua solução para uma plataforma mais segura, escalável e preparada para alta demanda.
Prefeituras e instituições        → Estruture projetos sociais e ESG com gestão, indicadores, relatórios e impacto mensurável.
Organizações sociais              → Organize projetos, acompanhe resultados e demonstre impacto com mais clareza.
```

---

## 2. Entidades do Banco de Dados

Não se aplica. MVP não possui banco de dados (RNF: SSG para as páginas — ver seção 7 sobre a exceção do Route Handler de contato). O formulário de contato envia os dados via webhook para um workflow n8n (ver seção 3, "Integração — Webhook n8n") — nenhum dado é persistido pela aplicação.

---

## 3. Contratos de API

Sem API própria de domínio (sem entidades, sem CRUD) — apenas um Route Handler interno que atua como proxy do envio do formulário para o webhook externo do n8n (ver "Integração — Webhook n8n" abaixo e seção 5, página "Home", ação de contato).

**ContactFormSchema** (payload enviado pelo frontend ao Route Handler, e por ele repassado ao n8n):
```
nome: string — obrigatório, min 1, max 120
email: string — obrigatório, e-mail válido
telefone: string — obrigatório, min 1, max 30
empresa: string — opcional, max 160 (rótulo: "Organização (opcional)"; placeholder "Empresa, instituição ou prefeitura")
interesse: enum — obrigatório — "Criar um MVP ou produto digital" | "Desenvolver sistema sob medida" | "Automatizar processos com IA" | "Modernizar uma solução existente" | "ESG e Projetos Sociais" | "Ambos" | "Outro"
momentoProjeto: enum — obrigatório — "Tenho apenas uma ideia" | "Já tenho um escopo inicial" | "Preciso validar um MVP" | "Já tenho um sistema e preciso evoluir" | "Preciso estruturar um projeto social/ESG" | "Quero entender o melhor caminho"
mensagem: string — opcional, max 2000
```

**Integração — Webhook n8n:**

Ao submeter o formulário de contato, o frontend envia os dados para um Route Handler próprio do `produto-web` (`src/app/api/webhooks/contato/route.ts` — camada "API INTERNA" do projeto), que valida o payload com o `ContactFormSchema` (Zod) e repassa a requisição ao workflow n8n ativo, responsável por encaminhar o contato por e-mail. O n8n nunca é chamado diretamente do browser, para não expor o token de autenticação no bundle client-side.

**Workflow ativo em produção:** `n8n/formulario-contato-2ad.json` (v1, simples) — `Webhook → Enviar Email → Responder Sucesso`. Não há honeypot, captcha nem sanitização/validação adicional no lado do n8n; a única validação de payload nessa integração é a do Route Handler (Zod, `ContactFormSchema`) antes do repasse. Como o node "Enviar Email" interpola os campos (`nome`, `mensagem` etc.) direto no HTML do e-mail sem escapar, existe um risco baixo de HTML injection no corpo do e-mail recebido — aceitável para o volume/risco atual, mas vale revisitar se o formulário passar a receber tráfego não confiável em escala. O campo **From Email** desse node precisa ser um endereço fixo e verificado pela conta SMTP (ex.: `site@2adesenvolvimento.com.br`) — nunca dinâmico a partir do e-mail do visitante, sob risco de rejeição do provedor SMTP ("Sender address rejected: not owned by user..."); o e-mail do visitante vai apenas no campo **Reply To**.

> `n8n/formulario-contato-2ad_v2.json` existe no repositório como uma versão mais robusta (honeypot + sanitização server-side dos campos) para adoção futura, caso o v1 se mostre insuficiente. O captcha via Cloudflare Turnstile que essa v2 previa foi desabilitado nela (nodes desconectados, não removidos) porque o frontend não implementa o widget Turnstile — ver nota "Instruções" dentro do próprio arquivo do workflow.

> **Nota sobre a recomendação técnica da revisão v1.1:** o documento de revisão sugere, como estratégia de MVP, `output: 'export'` (static export) combinado com um serviço externo de formulário (Formspree, Resend, Brevo, EmailJS). Essa recomendação **não se aplica mais** a este projeto: a integração com webhook n8n via Route Handler já está implementada, testada e rodando em produção (inclui autenticação Header Auth, validação Zod e tratamento de erro — ver `route.ts`). Substituí-la por um serviço externo seria um retrocesso sem ganho real, já que o runtime Node já está provisionado (VPS + PM2, seção 7).

- **Frontend → Route Handler:** `POST /api/webhooks/contato`, body = `ContactFormSchema`
- **Route Handler → n8n:**
  - **Método:** `POST`
  - **URL:** variável de ambiente `N8N_CONTACT_WEBHOOK_URL`
  - **Headers:** `Content-Type: application/json`, `Authorization: Bearer ${N8N_CONTACT_WEBHOOK_TOKEN}`
  - **Body:** JSON com os campos do `ContactFormSchema`
- **Credenciais:** armazenadas em `produto-web/.env` (server-only, sem prefixo `NEXT_PUBLIC_`) — `N8N_CONTACT_WEBHOOK_URL` e `N8N_CONTACT_WEBHOOK_TOKEN`. Nunca commitadas; nunca referenciadas por valor literal em código ou documentação (o `.env.example` deve sempre ficar com valores em branco).
- **Resposta esperada:** o workflow n8n responde via node de resposta do Webhook indicando sucesso/erro; o Route Handler repassa esse resultado ao frontend, que alterna entre os estados "enviando" → "enviado"/erro (ver seção 5, estados do formulário). Um corpo de resposta ausente ou não-JSON do n8n é tratado como falha (502) — nunca mascarado como sucesso.

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
- **Dados exibidos:** conteúdo institucional fixo, definido em `src/data/` — não deve ser hardcoded nos componentes de seção (§6)
  - **Header:** logo (apenas a marca — sem wordmark textual ao lado; nome por extenso fica no `alt` da imagem, na imagem do logo em si e no eyebrow do Hero), menu (Início, Para quem, Soluções, Diferenciais, Contato), botão "Solicitar contato"
  - **Hero** (`#inicio`): título "Transformamos ideias e processos em soluções digitais prontas para crescer.", subtítulo sobre MVPs/sistemas sob medida/plataformas/IA, frase complementar "Da ideia à validação. Da validação ao produto. Do produto à escala.", botões "Solicitar uma conversa inicial" / "Conhecer soluções", badges das duas frentes
  - **Para quem ajudamos** (`#publicos`): cards — Startups e empreendedores, Empresas privadas, Empresas em crescimento, Prefeituras e instituições, Organizações sociais — cada card com a mensagem de dor correspondente (§1.1) (`src/data/audiences.ts`)
  - **Problemas que resolvemos** (`#problemas`): lista das 8 dores reais que levam o cliente a procurar a 2A (ideia sem direção, MVP não validado, apresentação a investidores, operação em planilha/WhatsApp, tarefas repetitivas, sistema antigo/lento, necessidade de segurança/escala, projeto social/ESG sem indicadores) (`src/data/problems.ts`)
  - **Frentes de atuação / Soluções** (`#solucoes`): 2 cards — "Tecnologia e Produtos Digitais" e "ESG e Projetos Sociais" (nomes comerciais; SaaS/Micro SaaS/arquitetura ficam como capacidades técnicas secundárias, não no nome do card — §1.1)
  - **Tecnologia e Produtos Digitais** (`#tecnologia`): texto orientado a negócio + ofertas comerciais (MVP para startups, produto para investidores, sistema sob medida, plataforma escalável, automação com IA, apps e portais, modernização, dashboards, integrações) + capacidades técnicas em camada secundária, exibida com peso visual reduzido (Arquitetura de Software, SaaS e Micro SaaS, Web, Mobile, APIs e Integrações, Automação com n8n, Agentes de IA, Cloud e DevOps, Dashboards)
  - **ESG, Desenvolvimento Institucional e Gestão de Projetos Sociais** (`#esg`): texto + entregáveis (diagnóstico territorial, estruturação, gestão, projetos ESG, desenvolvimento institucional, programas sociais, indicadores, relatórios, capacitação, prestação de contas, desenvolvimento comunitário, painéis)
  - **Como trabalhamos** (`#metodo`): jornada de Tecnologia (Ideia → Validação → MVP → Desenvolvimento → Implantação → Evolução → Escala) e jornada de ESG (Diagnóstico → Estruturação → Gestão → Indicadores → Relatórios → Impacto) (`src/data/method.ts`)
  - **Exemplos de soluções** (`#exemplos`): 8 exemplos de tipo de projeto, com aviso explícito de que não são cases reais entregues
  - **Diferenciais** (`#diferenciais`): 8 cards numerados (atuação da ideia à implementação, visão técnica + negócio, arquitetura de software, SaaS/Micro SaaS/IA, atuação em ESG, clareza na comunicação, soluções viáveis e evolutivas, foco em resultado prático)
  - **Chamada para diagnóstico inicial** (`#diagnostico`): faixa de destaque (fundo verde institucional sólido) com título "Solicite uma conversa inicial sobre seu projeto", texto de oferta de baixo compromisso e botão "Solicitar conversa inicial" — CTA intermediário antes do formulário completo
  - **Contato** (`#contato`): texto de chamada, e-mail comercial, formulário (nome\*, e-mail\*, telefone\*, organização — opcional, tipo de interesse\*, momento do projeto\*, mensagem — opcional; campos obrigatórios marcados com `*` no rótulo e reforçados por nota "Campos marcados com \* são obrigatórios" no topo do formulário), aviso de uso de dados (LGPD)
  - **Footer:** logo, tagline, navegação, dados institucionais, copyright
- **Ações disponíveis:**
  - Scroll suave para âncoras via menu
  - Envio do formulário de contato → webhook n8n (ver seção 3, "Integração — Webhook n8n") → estado de sucesso substitui o formulário
  - Validação client-side: nome, e-mail, telefone, tipo de interesse e momento do projeto obrigatórios; organização e mensagem opcionais
- **Estados:**
  - Formulário: default → validando (erros inline por campo, limpos assim que o campo é corrigido; se algum campo obrigatório ficar pendente, exibe também um alerta geral "Preencha todos os campos obrigatórios antes de enviar." acima do botão de envio) → enviando ("Enviando...") → enviado (tela de confirmação com botão "Enviar outra mensagem") → erro (mensagem genérica, sem mascarar falha do webhook como sucesso)
  - Sem loading/error de página (conteúdo estático, sem fetch remoto)
- **SEO:** title `2A Desenvolvimento e Tecnologia | MVPs, Sistemas, IA, ESG e Projetos Sociais`; description orientada a valor de negócio (ex.: "A 2A Desenvolvimento e Tecnologia ajuda empresas, startups e instituições a criar MVPs, sistemas sob medida, plataformas digitais, automações com IA e projetos ESG com impacto mensurável."); Open Graph com título "2A Desenvolvimento e Tecnologia" e descrição institucional ampla; favicon; sitemap/robots básicos
- **Dados remotos:** nenhum — todo conteúdo é estático/local

### Política de Privacidade `--public`

- **Rota:** `/politica-de-privacidade`
- **Tipo de renderização:** SSG, página estática simples
- **Dados exibidos:** quais dados são coletados no formulário (incluindo o novo campo "momento do projeto"), finalidade (retorno comercial), como solicitar remoção, e-mail de contato, uso de cookies/analytics (se houver), declaração de não venda de dados
  > **Pendência:** o texto atual (`company.ts → privacyPolicy`) ainda descreve "telefone (opcional), empresa/instituição/prefeitura (opcional)" — desatualizado após a revisão v1.2 tornar telefone obrigatório e renomear o campo de organização (ver seção 3). Atualizar esse texto na próxima revisão de conteúdo.
- **Ações disponíveis:** nenhuma (conteúdo informativo)
- **Estados:** nenhum
- **SEO:** title/description simples, `noindex` opcional
- **Dados remotos:** nenhum

---

## 6. Regras de Negócio Globais

- **Comunicação orientada a valor, não a tecnologia** (§1.1): Hero, "Para quem ajudamos" e "Problemas que resolvemos" nunca abrem com termos técnicos (SaaS, Micro SaaS, APIs, arquitetura, automações). Esses termos só aparecem como capacidades técnicas secundárias dentro da seção "Tecnologia e Produtos Digitais".
- O site não deve sugerir cases reais já entregues — a seção "Exemplos de soluções" é declaradamente ilustrativa.
- As duas frentes de atuação (Tecnologia e Produtos Digitais; ESG, Desenvolvimento Institucional e Gestão de Projetos Sociais) devem ser sempre apresentadas como complementares, nunca como empresas ou marcas separadas.
- Nenhum dado de formulário é armazenado pela aplicação — envio é repassado via webhook ao workflow n8n responsável pelo processamento e encaminhamento por e-mail (ver seção 3).
- Texto de consentimento LGPD deve acompanhar sempre o formulário de contato.
- Campos obrigatórios do formulário de contato (nome, e-mail, telefone, tipo de interesse, momento do projeto) são sinalizados com `*` no rótulo e reforçados por uma nota explicativa e por um alerta de validação — organização e mensagem são opcionais.
- Conteúdo textual institucional é fonte única de verdade em `src/data/` (`company.ts`, `services.ts`, `projects.ts`, `navigation.ts`, `audiences.ts`, `problems.ts`, `method.ts`) — não deve ser hardcoded nos componentes de seção.
- O e-mail remetente (`From`) da integração de contato é sempre um endereço fixo e verificado do domínio da empresa — nunca o e-mail informado pelo visitante, que vai apenas no `Reply-To` (ver seção 3).

---

## 7. Requisitos Não-Funcionais

- **Performance:** SSG para as páginas, imagens otimizadas (webp), sem bibliotecas pesadas, animações moderadas (fade/slide de entrada por seção, hover sutil em cards/botões) — evitar excesso conforme diretriz "sem excesso de animações". Runtime Node necessário apenas pelo Route Handler `/api/webhooks/contato` (proxy do webhook n8n) — impede `output: 'export'` puro; demais páginas seguem estáticas.
- **Acessibilidade:** labels em todos os campos do formulário, contraste AA (paleta verde institucional sobre branco/verde-escuro já validada), navegação por teclado, estrutura semântica com headings.
- **SEO:** metadata completa (title, description, OG), sitemap, robots.txt, URLs amigáveis, favicon. Palavras-chave estratégicas conectadas a dores reais do cliente (ex.: "MVP para startups", "sistema sob medida para empresas", "automação de processos com IA", "projetos ESG para prefeituras", "gestão de projetos sociais com indicadores") — não apenas termos técnicos isolados.
- **Responsividade:** breakpoints Tailwind padrão (sm/md/lg/xl/2xl); menu horizontal em desktop, hambúrguer em mobile.
