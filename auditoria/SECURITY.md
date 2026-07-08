Política e Modelo de Segurança — Gmail Cleaner Buddy

Este documento descreve as práticas de segurança da aplicação, seguindo OWASP Top 10 (2021), OWASP SAMM e a metodologia Twelve-Factor App.

Reporte de vulnerabilidades

Encontrou uma vulnerabilidade? Abra uma issue privada (security advisory) no repositório. Não divulgue publicamente antes da correção.

Mitigações por categoria — OWASP Top 10 (2021)

A01 — Broken Access Control

Cliente OAuth2 por requisição: o cliente OAuth2 nunca é compartilhado globalmente. Antes, um único cliente global recebia setCredentials() de qualquer sessão, o que permitia que requisições concorrentes de um usuário usassem os tokens de outro. Agora cada requisição autenticada cria seu próprio cliente a partir dos tokens da própria sessão (createOAuthClient).
Menor privilégio: somente o escopo gmail.modify é solicitado (já inclui leitura; o escopo gmail.readonly redundante foi removido).
Todas as rotas /api/\* exigem sessão autenticada (requireAuth).
A02 — Cryptographic Failures

SESSION_SECRET é obrigatório, com mínimo de 32 caracteres; a aplicação não inicia com segredo ausente ou fraco (sem fallback hardcoded).
Cookies de sessão: httpOnly, secure (em produção), sameSite=lax.
Comparação do state OAuth com crypto.timingSafeEqual (resistente a timing attacks).
HSTS habilitado via Helmet em produção.
A03 — Injection

O parâmetro sender de /api/clean é validado contra um padrão estrito de endereço de email (sem espaços, aspas, parênteses ou curingas) antes de ser interpolado na query de busca do Gmail, e a busca usa valor entre aspas (from:"..."). Isso impede a injeção de operadores de busca do Gmail que poderiam apagar emails arbitrários.
XSS: todo conteúdo derivado de emails (cabeçalho From, controlável por atacante externo) é renderizado via textContent/createElement, nunca por innerHTML ou handlers inline. O antigo onclick="cleanSender('${...}')" era vulnerável a XSS armazenado via aspas simples no cabeçalho From.
Content-Security-Policy restritiva (sem scripts externos, object-src 'none', frame-ancestors 'none').
A04 — Insecure Design

Rate limiting: 100 req/15min em /api/_ e 10 req/15min em /auth/_ (mitiga força bruta e abuso de quota da API do Gmail).
Limite de tamanho do corpo JSON (10 KB).
Paginação limitada na análise (máx. 50 páginas) para evitar exaustão de recursos.
A05 — Security Misconfiguration

Helmet: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, remoção do header X-Powered-By, HSTS.
Mensagens de erro genéricas para o cliente; detalhes (error.message, stack traces) ficam apenas nos logs do servidor.
trust proxy configurado apenas em produção, para cookies secure funcionarem atrás de load balancer.
Nome do cookie de sessão customizado (gcb.sid), sem revelar o framework.
A06 — Vulnerable and Outdated Components

googleapis atualizado (corrige advisory GHSA-w5hq-g745-h8pq no uuid transitivo); npm audit sem vulnerabilidades conhecidas.
Script npm run audit adicionado; rode-o regularmente e no CI.
engines.node >= 18 declarado.
A07 — Identification and Authentication Failures

OAuth state anti-CSRF (RFC 6749 §10.12): valor aleatório de 32 bytes gerado por requisição, guardado na sessão e validado no callback. Sem isso, um atacante poderia forjar o callback e logar a vítima na conta dele (login CSRF).
Regeneração da sessão após login (previne fixação de sessão).
saveUninitialized: false — nenhum cookie de sessão é emitido antes do login.
Logout completo: revoga o token no Google (revokeToken), destrói a sessão e limpa o cookie.
/auth/status não expõe mais detalhes internos (hasTokens).
A08 — Software and Data Integrity Failures

Sem scripts de terceiros no front-end (apenas fontes do Google Fonts via CSS, restritas pela CSP).
Dependências fixadas via package-lock.json (Twelve-Factor: II. Dependencies).
A09 — Security Logging and Monitoring Failures

Logs escritos em stdout/stderr (Twelve-Factor: XI. Logs) para coleta pelo ambiente de execução.
Erros logados com contexto no servidor, sem vazar para o cliente.
Tokens e segredos nunca são logados.
A10 — Server-Side Request Forgery (SSRF)

O servidor só faz chamadas de saída para a API do Gmail (googleapis.com), com URLs fixas do SDK oficial; nenhuma URL é construída a partir de entrada do usuário.
CSRF

O pacote csurf foi removido (arquivado/deprecado pelos mantenedores). A proteção agora é o middleware global verifySameOrigin: todo método que altera estado (POST/PUT/PATCH/DELETE) precisa de cabeçalho Origin/Referer pertencente ao próprio host, somado a sameSite=lax nos cookies.
Twelve-Factor App

Fator Implementação
I. Codebase Repositório git único
II. Dependencies Declaradas em package.json + package-lock.json
III. Config 100% via variáveis de ambiente; .env.example versionado, .env no .gitignore; falha rápida se config obrigatória faltar
VII. Port binding Porta via PORT
IX. Disposability Encerramento gracioso em SIGTERM/SIGINT
X. Dev/prod parity Mesmo código; diferenças controladas só por NODE_ENV
XI. Logs Fluxo de eventos em stdout/stderr, sem arquivos de log
OWASP SAMM — práticas adotadas

Governance / Policy & Compliance: este documento define a política de segurança e o processo de reporte.
Design / Threat Assessment: principais ameaças mapeadas — roubo de tokens OAuth, CSRF de login, XSS via cabeçalhos de email, injeção na busca do Gmail, abuso de quota.
Design / Security Requirements: requisitos verificados na inicialização (segredos obrigatórios e fortes).
Implementation / Secure Build: CI no GitHub Actions (.github/workflows/security.yml) roda typecheck + npm audit (SCA) em todo push/PR para main; dependências travadas por lockfile.
Verification / Security Testing: revisar npm audit a cada mudança de dependência; testar manualmente fluxos de auth (state inválido, sessão expirada, sender malformado).
Operations / Environment Management: segredos só no ambiente; rotação do SESSION_SECRET e das credenciais OAuth em caso de suspeita de vazamento (revogar no Google Cloud Console).
Endurecimentos de 2026-07-05 (playbook SaaS)

Cache-Control: no-store em todas as respostas de /api/_ e /auth/_ — dados sensíveis (perfil, contagens, redirects de auth) não ficam em cache de navegador nem de proxies.
Rate limit em /auth/status — era a única rota dinâmica sem limiter.
Erros de body-parser mapeados para 4xx — JSON inválido responde 400 e payload acima de 10kb responde 413, em vez de cair no handler 500 e poluir o log com erro de cliente.
CI de segurança — workflow security.yml com typecheck e npm audit --omit=dev em cada push/PR.
Limitações conhecidas / próximos passos

Armazenamento de sessão em memória: express-session usa MemoryStore por padrão, que não é recomendado para produção (vaza memória e não escala horizontalmente — Twelve-Factor: VI. Processes). Para produção, configure um store externo (ex.: connect-redis).
CSP com 'unsafe-inline' para estilos: o CSS está inline no HTML. Migrar para arquivo externo permitiria remover essa exceção.
Refresh token na sessão: os tokens vivem apenas na sessão (expiram em 24h). Se a aplicação evoluir para persistência, criptografe os tokens em repouso.
Achados da revisão de código de 2026-06-10 — TODOS CORRIGIDOS

Achados confirmados pela revisão de alto esforço e as correções aplicadas:

✅ cleanAll() engolia falhas silenciosamente — agora usa apiFetch (trata 401), conta sucessos/falhas por remetente e o toast reporta o resultado real (⚠️ X movidos; Y falharam quando há falhas).
✅ isAuthError() não reconhecia todas as formas de token revogado — agora cobre error.status, error.response.status, error.code numérico, o código OAuth em error.response.data.error e a mensagem "expired or revoked" do Google.
✅ Erros de cota engolidos na análise — erros de auth dentro do lote agora propagam para o 401; os demais são contados em failedMessages, retornados na resposta e exibidos pelo front-end ("Análise parcial").
✅ Remetentes não-email quebravam o botão Limpar — a análise agora normaliza (trim/lowercase) e agrega apenas remetentes que passam na mesma validação do /api/clean; linhas impossíveis de limpar não aparecem.
✅ Estatísticas enganosas / chamadas desperdiçadas — a paginação para ao atingir o limite de análise (1000); totalMessages agora corresponde ao conjunto realmente analisado e a resposta inclui analyzedMessages/failedMessages.
✅ Origin opt-in por rota — verifySameOrigin virou middleware global para todos os métodos não seguros (POST/PUT/PATCH/DELETE); rotas mutantes futuras ficam protegidas automaticamente.
✅ Playbooks desatualizados na raiz — index2.html renomeado para index.html.old e INTRUÇÕES.md recebeu um aviso destacado de documento histórico ("não use este código").
Estado dos módulos npm (pasta node_modules)

npm audit: 0 vulnerabilidades conhecidas (após upgrade do googleapis 128→173, que corrigiu o advisory GHSA-w5hq-g745-h8pq do uuid transitivo).
node_modules/ foi removido do versionamento (estava commitado no main): dependências são instaláveis de forma reprodutível via npm ci + package-lock.json. Nunca recommite a pasta.
Rode npm run audit no CI e a cada mudança de dependência.
