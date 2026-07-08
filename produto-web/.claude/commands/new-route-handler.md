# Comando: new-route-handler

Cria um novo Route Handler (`route.ts`) no App Router do Next.js.

Use para: webhooks, BFF (Backend for Frontend), proxies de API externa, endpoints que precisam rodar no edge/servidor sem expor credenciais ao cliente.

> **Antes de criar:** confirme se o caso não é melhor resolvido por uma Server Action (mutações simples chamadas de um RSC ou form) ou por fetch direto no RSC (leitura de dados). Route Handlers fazem sentido quando há um cliente externo, webhook, ou necessidade de streaming/SSE.

## Como usar

```
/new-route-handler
```

---

## Processo de execução

### 1. Coletar parâmetros

Pergunte ao usuário (em uma única mensagem):

- **Caminho da rota** — ex: `api/webhooks/stripe`, `api/upload`, `api/[feature]/[id]`
- **Métodos HTTP** — `GET` | `POST` | `PUT` | `PATCH` | `DELETE` (pode ser mais de um)
- **Autenticação necessária** — pública | requer sessão Supabase | requer API key interna
- **Tipo de resposta** — JSON | stream (SSE) | redirect | arquivo (blob)
- **Corpo da requisição** — JSON | FormData | raw body (webhooks)
- **Precisa de** — validação com Zod | CORS | rate limiting | idempotência
- **Roda no** — Node.js runtime (padrão) | Edge runtime

### 2. Localização do arquivo

```
src/app/
└── api/
    └── [caminho-da-rota]/
        └── route.ts
```

---

## Templates

### GET — listagem autenticada com Supabase

```ts
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs' // ou 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Ler query params
    const { searchParams } = request.nextUrl
    const pagina = Number(searchParams.get('pagina') ?? 1)
    const limite = Math.min(Number(searchParams.get('limite') ?? 20), 100)
    const offset = (pagina - 1) * limite

    const { data, error, count } = await supabase
      .from('tabela')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limite - 1)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      data,
      meta: { pagina, limite, total: count ?? 0 },
    })
  } catch (err) {
    console.error('[GET /api/feature]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

### POST — criação com validação Zod

```ts
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const criarFeatureSchema = z.object({
  nome:      z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
  ativo:     z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Validar corpo
    const body = await request.json()
    const parsed = criarFeatureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('tabela')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/feature]', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

### GET + PATCH + DELETE — rota dinâmica `[id]`

```ts
// src/app/api/[feature]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function authorize(supabase: Awaited<ReturnType<typeof createServerClient>>, id: string) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data } = await supabase
    .from('tabela')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!data || data.user_id !== user.id) return null
  return user
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerClient()

  const user = await authorize(supabase, id)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { data, error } = await supabase
    .from('tabela')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  return NextResponse.json(data)
}

const atualizarSchema = z.object({
  nome:      z.string().min(1).max(100).optional(),
  descricao: z.string().max(500).optional(),
  ativo:     z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerClient()

  const user = await authorize(supabase, id)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await request.json()
  const parsed = atualizarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', detalhes: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('tabela')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerClient()

  const user = await authorize(supabase, id)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { error } = await supabase.from('tabela').delete().eq('id', id)
  if (error) throw error

  return new NextResponse(null, { status: 204 })
}
```

### POST — Webhook com verificação de assinatura

```ts
// src/app/api/webhooks/[provedor]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Necessário para ler o raw body (assinatura HMAC)
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headersList = await headers()
  const assinatura = headersList.get('x-assinatura-provedor')

  // Verificar assinatura HMAC
  const segredo = process.env.WEBHOOK_SECRET!
  const hmacEsperado = await computarHMAC(segredo, rawBody)

  if (assinatura !== hmacEsperado) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  let evento: Record<string, unknown>
  try {
    evento = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Processar eventos
  switch (evento.type) {
    case 'pagamento.confirmado':
      await processarPagamento(evento)
      break
    case 'assinatura.cancelada':
      await processarCancelamento(evento)
      break
    default:
      // Ignorar eventos desconhecidos — retornar 200 para não gerar retry
      break
  }

  return NextResponse.json({ recebido: true })
}

async function computarHMAC(segredo: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const chave = await crypto.subtle.importKey(
    'raw', encoder.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const assinatura = await crypto.subtle.sign('HMAC', chave, encoder.encode(payload))
  return Buffer.from(assinatura).toString('hex')
}

async function processarPagamento(_evento: Record<string, unknown>) { /* ... */ }
async function processarCancelamento(_evento: Record<string, unknown>) { /* ... */ }
```

### GET — Streaming SSE (Server-Sent Events)

```ts
// src/app/api/[feature]/stream/route.ts
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(_request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const enviar = (dados: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(dados)}\n\n`))
      }

      try {
        // Emitir dados em intervalos (substitua pela sua lógica)
        for (let i = 0; i < 10; i++) {
          enviar({ progresso: i * 10, mensagem: `Passo ${i + 1}` })
          await new Promise(r => setTimeout(r, 500))
        }
        enviar({ concluido: true })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // Desativa buffer no Nginx/Vercel
    },
  })
}
```

### Cabeçalhos CORS (para consumo de domínio externo)

```ts
// src/app/api/[feature]/route.ts
const corsHeaders = {
  'Access-Control-Allow-Origin':  process.env.NEXT_PUBLIC_APP_URL ?? '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Obrigatório para requisições com preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  // ... lógica ...
  return NextResponse.json(data, { headers: corsHeaders })
}
```

---

## Regras obrigatórias

- **`params` é uma Promise no Next.js 15.** Sempre `const { id } = await params`.
- **Nunca confiar no cliente para autorização.** Sempre verificar sessão Supabase no handler.
- **RLS do Supabase é a última linha de defesa, não a única.** Valide `user_id` na query além de confiar no RLS.
- **Raw body para webhooks.** Use `request.text()` antes de qualquer outro `await request.*` — body só pode ser lido uma vez.
- **Retornar `200` para eventos de webhook desconhecidos.** Provedores interpretam `4xx/5xx` como falha e reenviam.
- **Nunca logar o body completo de webhooks.** Pode conter dados sensíveis (PII, tokens).
- **`runtime = 'edge'` só quando necessário.** Edge não tem acesso a APIs Node.js nativas (`fs`, `crypto` síncrono, etc).
- **Status HTTP semânticos:** `201` para criação, `204` para deleção sem body, `422` para validação, `409` para conflito.
- **Zod em toda entrada externa.** Nunca castear `body as MinhaInterface` sem validação.

---

## Checklist de entrega

Após gerar, confirme com o usuário:

- [ ] `params` com `await` (Next.js 15)?
- [ ] Autenticação verificada antes de qualquer operação?
- [ ] Autorização de ownership (`user_id`) validada na query?
- [ ] Zod validando todo body externo?
- [ ] `OPTIONS` exportado se houver CORS?
- [ ] Webhook com verificação de assinatura HMAC?
- [ ] Variáveis de ambiente documentadas (adicionar ao `.env.example`)?
- [ ] `runtime` declarado explicitamente?
- [ ] Logs sem dados sensíveis?
