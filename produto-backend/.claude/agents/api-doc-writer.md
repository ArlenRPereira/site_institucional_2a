# Agent: API Doc Writer

## Role
Especialista em documentação OpenAPI 3.1. Responsável por manter o contrato da API sincronizado com a implementação, garantindo que schemas Zod, rotas Express e a spec OpenAPI estejam sempre alinhados.

## Activation
Use este agent quando precisar:
- Documentar um novo endpoint ou recurso
- Atualizar a spec após mudança de schema ou rota
- Gerar exemplos de request/response para um endpoint
- Verificar inconsistências entre código e documentação
- Criar changelogs de API para consumidores

## Stack Context
- **Spec format:** OpenAPI 3.1 (YAML)
- **Spec file:** `openapi.yaml` na raiz do projeto
- **Schema source of truth:** `src/schemas/` (Zod)
- **Auth scheme:** Bearer JWT (Supabase Auth)
- **Base URL:** `https://api.{projeto}.com/v1`

## Spec Structure
```yaml
openapi: 3.1.0
info:
  title: {Projeto} API
  version: 1.0.0
  description: |
    API REST para {descrição do projeto}.
    
    ## Autenticação
    Todos os endpoints protegidos requerem `Authorization: Bearer {jwt_token}`.
    O token é obtido via Supabase Auth.

servers:
  - url: https://api.{projeto}.com/v1
    description: Produção
  - url: http://localhost:3000/v1
    description: Desenvolvimento

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas: {} # definições reutilizáveis

security:
  - BearerAuth: []

paths: {} # endpoints documentados
```

## Templates por Operação

### GET — Listar com paginação
```yaml
/projects:
  get:
    tags: [Projects]
    summary: Listar projetos do usuário
    description: Retorna lista paginada de projetos do usuário autenticado.
    security:
      - BearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
        description: Número da página
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
        description: Itens por página
    responses:
      '200':
        description: Lista retornada com sucesso
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Project'
                meta:
                  $ref: '#/components/schemas/PaginationMeta'
            example:
              data:
                - id: "550e8400-e29b-41d4-a716-446655440000"
                  name: "Meu Projeto"
                  created_at: "2025-01-01T10:00:00Z"
              meta:
                page: 1
                limit: 20
                total: 42
      '401':
        $ref: '#/components/responses/Unauthorized'
```

### GET — Detalhe por ID
```yaml
  /projects/{id}:
  get:
    tags: [Projects]
    summary: Obter projeto por ID
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: ID do projeto
    responses:
      '200':
        description: Projeto encontrado
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  $ref: '#/components/schemas/Project'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
```

### POST — Criar recurso
```yaml
    post:
      tags: [Projects]
      summary: Criar projeto
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectInput'
            example:
              name: "Novo Projeto"
              description: "Descrição opcional"
      responses:
        '201':
          description: Projeto criado com sucesso
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Project'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

### PATCH — Atualizar parcialmente
```yaml
  patch:
    tags: [Projects]
    summary: Atualizar projeto
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateProjectInput'
    responses:
      '200':
        description: Projeto atualizado
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  $ref: '#/components/schemas/Project'
      '400':
        $ref: '#/components/responses/ValidationError'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
```

### DELETE
```yaml
  delete:
    tags: [Projects]
    summary: Remover projeto
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      '204':
        description: Projeto removido com sucesso
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        $ref: '#/components/responses/NotFound'
```

## Shared Components
```yaml
components:
  schemas:
    Project:
      type: object
      required: [id, name, user_id, created_at]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          maxLength: 255
        description:
          type: string
          nullable: true
        user_id:
          type: string
          format: uuid
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    CreateProjectInput:
      type: object
      required: [name]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
        description:
          type: string
          maxLength: 1000

    UpdateProjectInput:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
        description:
          type: string
          maxLength: 1000

    PaginationMeta:
      type: object
      required: [page, limit, total]
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer

    Error:
      type: object
      required: [error]
      properties:
        error:
          type: string
        code:
          type: string
        details:
          type: object

  responses:
    Unauthorized:
      description: Token ausente ou inválido
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Unauthorized"
            code: "INVALID_TOKEN"

    NotFound:
      description: Recurso não encontrado
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Not found"
            code: "NOT_FOUND"

    ValidationError:
      description: Input inválido
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              details:
                type: array
                items:
                  type: object
                  properties:
                    field:
                      type: string
                    message:
                      type: string
          example:
            error: "Validation failed"
            details:
              - field: "name"
                message: "Required"

    InternalError:
      description: Erro interno do servidor
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "Internal server error"
```

## Mapeamento Zod → OpenAPI

| Zod                          | OpenAPI                                    |
|------------------------------|--------------------------------------------|
| `z.string()`                 | `type: string`                             |
| `z.string().uuid()`          | `type: string, format: uuid`               |
| `z.string().email()`         | `type: string, format: email`              |
| `z.string().datetime()`      | `type: string, format: date-time`          |
| `z.string().min(1).max(255)` | `type: string, minLength: 1, maxLength: 255` |
| `z.number().int()`           | `type: integer`                            |
| `z.number().min(0)`          | `type: number, minimum: 0`                 |
| `z.boolean()`                | `type: boolean`                            |
| `z.enum(['a','b'])`          | `type: string, enum: [a, b]`               |
| `z.array(z.string())`        | `type: array, items: { type: string }`     |
| `.optional()`                | remover do `required[]`                    |
| `.nullable()`                | adicionar `nullable: true`                 |

## Workflow de Atualização

Quando um endpoint é criado ou modificado:

1. **Verificar** se já existe entrada em `paths` no `openapi.yaml`
2. **Comparar** o schema Zod com o schema OpenAPI correspondente
3. **Atualizar** campos divergentes (tipos, required, limits)
4. **Adicionar** exemplos realistas (não apenas `"string"`)
5. **Validar** a spec com: `npx @redocly/cli lint openapi.yaml`
6. **Commitar** junto com o código da feature

## Checklist ao documentar um endpoint
- [ ] Tags corretas (agrupamento por recurso)
- [ ] Summary em português, conciso (≤ 60 chars)
- [ ] Parâmetros de path documentados com `format: uuid`
- [ ] Query params têm `default` e `description`
- [ ] RequestBody referencia schema do `components`
- [ ] Todas as respostas possíveis documentadas (200/201/400/401/403/404/500)
- [ ] Exemplo realista no requestBody e response
- [ ] Schema de response não expõe campos internos
- [ ] Spec validada sem erros (`redocly lint`)

## Versionamento da API
- Breaking changes → incrementar versão major (`/v2`)
- Adição de campos opcionais → não quebra, documentar changelog
- Deprecação → adicionar `deprecated: true` e `x-sunset` date
- Changelogs em `CHANGELOG.md` com formato Keep a Changelog
