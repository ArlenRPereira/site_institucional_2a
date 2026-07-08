# Skill: SEO Pattern

Leia este arquivo antes de criar ou modificar qualquer página, `layout.tsx`, `sitemap.ts`, `robots.ts` ou componente que impacte indexação e compartilhamento.

---

## Princípio fundamental

Cada URL pública do projeto deve responder três perguntas em milissegundos:

1. **Googlebot:** "O que é esta página e por que devo indexá-la?"
2. **Usuário no WhatsApp/LinkedIn:** "Vale a pena abrir esse link?"
3. **Usuário voltando do Google:** "Essa página entregou o que a SERP prometeu?"

Metadata, OG image e conteúdo da página devem contar a mesma história.

---

## Hierarquia de metadata

```
app/layout.tsx          ← defaults globais + template de title
  └── app/(auth)/...    ← herda tudo, raramente sobrescreve
  └── app/(dashboard)/  ← noindex (área autenticada)
      └── page.tsx      ← sobrescreve title + description
```

**Regra de herança:** campos não definidos em um `page.tsx` são herdados do `layout.tsx` mais próximo. Defina no `layout.tsx` apenas o que todas as páginas compartilham.

---

## `layout.tsx` raiz — configuração global

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'

const APP_NAME = 'Nome do App'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL!
const OG_IMAGE = `${APP_URL}/og-default.png`  // 1200×630px em /public/

export const metadata: Metadata = {
  // Resolve URLs relativas em OG/Twitter (obrigatório)
  metadataBase: new URL(APP_URL),

  applicationName: APP_NAME,

  // Template: páginas filhas usam %s → "Projetos | Nome do App"
  title: {
    default:  APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: 'Descrição padrão do app — até 160 caracteres, clara e com CTA implícito.',

  // Open Graph
  openGraph: {
    type:        'website',
    siteName:    APP_NAME,
    locale:      'pt_BR',
    url:         APP_URL,
    title:       APP_NAME,
    description: 'Descrição para preview em redes sociais.',
    images: [{
      url:    OG_IMAGE,
      width:  1200,
      height: 630,
      alt:    `Logo e tagline do ${APP_NAME}`,
    }],
  },

  // Twitter / X
  twitter: {
    card:        'summary_large_image',
    site:        '@handle_do_app',
    title:       APP_NAME,
    description: 'Descrição para preview no Twitter/X.',
    images:      [OG_IMAGE],
  },

  // Robots padrão (sobrescrito por páginas privadas)
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  // Ícones
  icons: {
    icon:    [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple:   '/apple-touch-icon.png',  // 180×180px
    shortcut:'/favicon.ico',
  },

  manifest: '/manifest.json',

  // Canonical padrão (páginas sobrescrevem com sua URL específica)
  alternates: { canonical: APP_URL },
}

// Viewport separado da Metadata (Next.js 14+)
export const viewport: Viewport = {
  themeColor:     '#ffffff',
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
}
```

---

## `page.tsx` — metadata por página

### Estática (rota fixa)

```tsx
// src/app/(public)/sobre/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Sobre',              // resulta em: "Sobre | Nome do App"
  description: 'Conheça a história, missão e o time por trás do Nome do App.',
  alternates:  { canonical: '/sobre' },
  // openGraph e twitter são herdados do layout raiz
  // sobrescreva apenas se esta página tiver imagem própria
}
```

### Dinâmica (rota `[id]`)

```tsx
// src/app/(public)/blog/[slug]/page.tsx
import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createServerClient()

  const { data: post } = await supabase
    .from('posts')
    .select('titulo, resumo, og_image_url, publicado_em, autor_nome')
    .eq('slug', slug)
    .single()

  // Fallback seguro — não indexar página de erro
  if (!post) return { title: 'Post não encontrado', robots: { index: false } }

  return {
    title:       post.titulo,
    description: post.resumo,
    alternates:  { canonical: `/blog/${slug}` },

    openGraph: {
      type:             'article',
      title:            post.titulo,
      description:      post.resumo,
      url:              `/blog/${slug}`,
      publishedTime:    post.publicado_em,
      authors:          [post.autor_nome],
      images: post.og_image_url
        ? [{ url: post.og_image_url, width: 1200, height: 630, alt: post.titulo }]
        : undefined,  // herda a OG image do layout raiz
    },

    twitter: {
      card:        'summary_large_image',
      title:       post.titulo,
      description: post.resumo,
      images:      post.og_image_url ? [post.og_image_url] : undefined,
    },
  }
}
```

### Área autenticada — sem indexação

```tsx
// src/app/(dashboard)/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Bloquear indexação de toda a área autenticada
  robots: { index: false, follow: false },
}
// Páginas filhas herdam automaticamente — não precisam repetir
```

---

## OG Image — geração dinâmica

### Padrão estático (arquivo em `/public/`)

Para a maioria das páginas, um arquivo `og-default.png` (1200×630px) em `/public/` é suficiente e não adiciona custo de runtime.

### Dinâmica com `ImageResponse` (edge)

Use quando cada página tem identidade visual diferente (posts de blog, perfis, produtos):

```tsx
// src/app/og/route.tsx  ← endpoint de OG image reutilizável
import { ImageResponse } from 'next/og'
import { NextRequest }   from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const titulo   = searchParams.get('titulo')  ?? 'Nome do App'
  const subtitulo = searchParams.get('sub')    ?? ''

  return new ImageResponse(
    (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'flex-end',
        width:          '100%',
        height:         '100%',
        padding:        '64px 72px',
        background:     'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      }}>
        {subtitulo && (
          <div style={{ fontSize: 22, color: '#60a5fa', marginBottom: 16, fontWeight: 500 }}>
            {subtitulo}
          </div>
        )}
        <div style={{ fontSize: 64, fontWeight: 700, color: '#f8fafc', lineHeight: 1.1 }}>
          {titulo}
        </div>
        <div style={{ marginTop: 40, fontSize: 20, color: '#94a3b8' }}>
          nome-do-app.com.br
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

Referência na metadata:

```ts
openGraph: {
  images: [{
    url:    `/og?titulo=${encodeURIComponent(post.titulo)}&sub=Blog`,
    width:  1200,
    height: 630,
    alt:    post.titulo,
  }],
}
```

---

## `sitemap.ts` — geração dinâmica

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createServerClient }  from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL!

export const revalidate = 3600  // regenerar a cada 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerClient()

  // Buscar apenas conteúdo público e indexável
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at')
    .eq('publicado', true)

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE,          lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/sobre`,lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const dinamicas: MetadataRoute.Sitemap = (posts ?? []).map(p => ({
    url:             `${BASE}/blog/${p.slug}`,
    lastModified:    new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority:        0.7,
  }))

  return [...estaticas, ...dinamicas]
}
```

---

## `robots.ts`

```ts
// src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  [
          '/api/',           // endpoints de API
          '/dashboard/',     // área autenticada
          '/configuracoes/', // área autenticada
          '/perfil/',        // área autenticada
          '/_next/',         // assets internos do Next.js
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
```

---

## Structured Data (JSON-LD)

### Componente reutilizável

```tsx
// src/components/common/JsonLd.tsx
interface JsonLdProps { data: Record<string, unknown> }

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

### Schemas por tipo de página

```tsx
// Landing / Home
<JsonLd data={{
  '@context':          'https://schema.org',
  '@type':             'SoftwareApplication',
  name:                'Nome do App',
  applicationCategory: 'BusinessApplication',
  operatingSystem:     'Web',
  url:                 process.env.NEXT_PUBLIC_APP_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
}} />

// Post de blog
<JsonLd data={{
  '@context':       'https://schema.org',
  '@type':          'Article',
  headline:         post.titulo,
  description:      post.resumo,
  datePublished:    post.publicado_em,
  dateModified:     post.updated_at,
  author:           { '@type': 'Person', name: post.autor_nome },
  publisher:        { '@type': 'Organization', name: 'Nome do App' },
  image:            post.og_image_url,
}} />

// Breadcrumb (em qualquer página com hierarquia)
<JsonLd data={{
  '@context': 'https://schema.org',
  '@type':    'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Blog',     item: `${APP_URL}/blog` },
    { '@type': 'ListItem', position: 2, name: post.titulo, item: `${APP_URL}/blog/${post.slug}` },
  ],
}} />

// FAQ
<JsonLd data={{
  '@context':   'https://schema.org',
  '@type':      'FAQPage',
  mainEntity:   faqs.map(f => ({
    '@type':          'Question',
    name:             f.pergunta,
    acceptedAnswer:   { '@type': 'Answer', text: f.resposta },
  })),
}} />
```

---

## Checklist por tipo de página

### Toda página pública

- [ ] `title` com até 60 caracteres (incluindo " | Nome do App")?
- [ ] `description` entre 120 e 160 caracteres?
- [ ] `alternates.canonical` apontando para a URL exata da página?
- [ ] OG image definida (própria ou herdada do layout)?
- [ ] `twitter.card: 'summary_large_image'`?
- [ ] Apenas um `<h1>` na página?
- [ ] Hierarquia de headings sem pulos (`h1 → h2 → h3`)?

### Página com conteúdo dinâmico (`[id]` / `[slug]`)

- [ ] `generateMetadata` assíncrona com `await params`?
- [ ] Fallback de metadata quando o recurso não é encontrado?
- [ ] OG image específica do recurso ou fallback explícito?
- [ ] `type: 'article'` no openGraph para posts/conteúdo editorial?

### Área autenticada

- [ ] `robots: { index: false }` no `layout.tsx` do route group?
- [ ] Rotas do dashboard em `disallow` no `robots.ts`?

### Performance (impacta SEO diretamente)

- [ ] Imagem LCP com `priority` no `<Image>`?
- [ ] `width` e `height` definidos em todas as imagens (evita CLS)?
- [ ] Fontes carregadas com `next/font` e `display: 'swap'`?
- [ ] LCP < 2.5s no Lighthouse mobile (throttled 4G)?

### Conteúdo indexável

- [ ] URL no `sitemap.ts` com `lastModified` e `priority` corretos?
- [ ] JSON-LD aplicado conforme o tipo de conteúdo?
- [ ] Schema validado em [validator.schema.org](https://validator.schema.org)?

---

## Anti-padrões a evitar

| ❌ Errado | ✅ Correto |
|---|---|
| `metadataBase` ausente no layout raiz | Sempre definir com `new URL(APP_URL)` |
| `title` igual em todas as páginas | Template `%s \| App` + título único por rota |
| OG image com menos de 1200×630px | Exatamente 1200×630px para preview correto |
| Área autenticada sem `robots: { index: false }` | `noindex` obrigatório em todo route group privado |
| Canonical apontando para URL com trailing slash inconsistente | Padronizar com ou sem slash e manter sempre igual |
| `description` com mais de 160 caracteres | Google trunca — escrever dentro do limite |
| JSON-LD com dados hardcoded | Gerar dinamicamente a partir dos dados da página |
| Múltiplos `<h1>` na mesma página | Um único `<h1>` definido no `page.tsx` |
| `<img>` nativa sem dimensões | `<Image>` com `width` e `height` explícitos |
| Sitemap incluindo rotas autenticadas | Apenas rotas públicas e indexáveis no `sitemap.ts` |
