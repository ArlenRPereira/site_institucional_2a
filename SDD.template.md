# SDD — [Nome do App]

> Preencha este template e salve como `SDD.md` na raiz do Workspace.
> Depois rode `/build-from-spec` para iniciar a construção automática.
> Quanto mais detalhado, melhor a qualidade do código gerado.

---

## 1. Visão Geral

**Nome do app:** [ex: Taskly]
**Descrição:** [Uma frase clara do que o app faz e para quem]
**Autenticação:** [ex: JWT via Supabase Auth — e-mail + senha]

---

## 2. Entidades do Banco de Dados

> Uma seção por tabela. O orquestrador cria as migrations SQL + RLS a partir daqui.

### [NomeDaTabela]

| Campo | Tipo SQL | Nullable | Default | Descrição |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |
| user_id | uuid | NO | — | FK → auth.users |
| [campo] | [tipo] | [YES/NO] | [valor ou —] | [descrição] |

**Índices:** [ex: idx em user_id, idx composto em (status, created_at)]

**RLS:**
- SELECT: [ex: usuário lê apenas seus próprios registros]
- INSERT: [ex: qualquer usuário autenticado pode inserir com seu próprio user_id]
- UPDATE: [ex: usuário só atualiza os seus, apenas se status = 'pending']
- DELETE: [ex: bloqueado para usuários — apenas service_role]

---

## 3. Contratos de API

> Schemas Zod gerados em `produto-contracts`. Um bloco por recurso.

### [NomeDoRecurso]

**Create[NomeDoRecurso]Schema** (body do POST):
```
campo: tipo zod — [ex: z.string().min(1).max(100)]
campo: tipo zod
```

**[NomeDoRecurso]Schema** (resposta da API):
```
campo: tipo
campo: tipo
```

---

## 4. Endpoints da API

> Uma seção por endpoint. O orquestrador cria rota + service + testes.

### [MÉTODO] /[recurso]

- **Auth:** [required | public]
- **Body:** [Schema Zod usado — ex: CreateProductSchema]
- **Resposta de sucesso:** [status + shape — ex: 201 `{ data: Product }`]
- **Erros esperados:** [ex: 404 se não encontrado, 403 se não é dono]
- **Regras de negócio:** [ex: ao criar pedido, decrementar estoque atomicamente]

---

## 5. Páginas Web

> Uma seção por página. O orquestrador usa o agente `page-builder` para cada entrada.

### [NomeDaPagina] [--public | --auth | --route-handler]

- **Rota:** [ex: `(dashboard)/produtos/[id]`]
- **Tipo de renderização:** [ex: RSC com fetch Supabase | RSC + Client Component filho | Route Handler]
- **Dados exibidos:** [ex: detalhe do produto com nome, preço, imagens, reviews]
- **Ações disponíveis:** [ex: botão Comprar → POST /orders, favoritar → PATCH /produtos/:id]
- **Estados:** [ex: loading.tsx com skeleton, error.tsx com retry, not-found.tsx se id inválido]
- **SEO:** [ex: `generateMetadata` dinâmica com nome do produto, OG image]
- **Dados remotos:** [ex: Supabase direto via RSC | `GET /products/:id` via `services/api/`]

---

## 6. Regras de Negócio Globais

> Regras que afetam múltiplas camadas ou que não cabem nas seções acima.

- [ex: Toda operação de escrita é auditada em uma tabela `audit_log`]
- [ex: Usuário bloqueado não pode autenticar — verificar campo `is_blocked` na tabela users]
- [ex: Preços sempre em centavos (integer) — nunca float]

---

## 7. Requisitos Não-Funcionais

- **Performance:** [ex: listagens com mais de 100 itens usam paginação por cursor; Core Web Vitals dentro do orçamento]
- **Acessibilidade:** obrigatório — elementos interativos com semântica correta (roles, labels ARIA), navegação por teclado, contraste mínimo AA. [complementar: ex: descrever fluxos críticos cobertos]
- **SEO:** [ex: páginas públicas com metadata completa, sitemap e robots.txt]
