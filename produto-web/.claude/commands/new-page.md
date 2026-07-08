# Comando: new-page

Cria uma nova página no App Router do Next.js seguindo os padrões do projeto.

## Como usar

```
/new-page
```

O Claude irá coletar as informações necessárias e gerar todos os arquivos da página.

---

## Processo de execução

### 1. Coletar parâmetros

Pergunte ao usuário (em uma única mensagem):

- **Nome da página** — ex: `ProductDetail`, `UserSettings`
- **Rota completa** — ex: `(dashboard)/products/[id]`, `(auth)/forgot-password`
- **Route group** — `(auth)` | `(dashboard)` | raiz
- **Tipo de renderização** — RSC puro | RSC com Client Components filhos | Client Component
- **Busca de dados** — Supabase direto | `services/api/` | nenhuma
- **Precisa de** — `loading.tsx` | `error.tsx` | `not-found.tsx` | metadata dinâmica
- **Descrição rápida** — o que essa página faz

### 2. Arquivos a gerar

Com base nas respostas, gere **somente** os arquivos necessários:

```
src/app/(grupo)/rota/
├── page.tsx          # sempre
├── loading.tsx       # se solicitado ou fetch lento esperado
├── error.tsx         # se tiver ações críticas / dados externos
└── not-found.tsx     # se tiver rota dinâmica [id]
```

---

## Templates

### `page.tsx` — RSC com fetch de dados (Supabase)

```tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { NomePageClient } from '@/components/features/nome-feature/NomePageClient'

// Metadata estática
export const metadata: Metadata = {
  title: 'Título da Página',
  description: 'Descrição clara para SEO.',
}

// Metadata dinâmica (use quando a rota for [id])
// export async function generateMetadata(
//   { params }: { params: Promise<{ id: string }> }
// ): Promise<Metadata> {
//   const { id } = await params
//   const data = await fetchData(id)
//   if (!data) return { title: 'Não encontrado' }
//   return { title: data.name, description: data.description }
// }

interface NomePageProps {
  params: Promise<{ id: string }>      // remova se rota estática
  searchParams: Promise<{ q?: string }> // remova se não usa query string
}

export default async function NomePage({ params, searchParams }: NomePageProps) {
  const { id } = await params
  const { q } = await searchParams

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('tabela')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return (
    <main>
      <NomePageClient initialData={data} query={q} />
    </main>
  )
}
```

### `page.tsx` — RSC simples (sem fetch)

```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Título da Página',
  description: 'Descrição para SEO.',
}

export default function NomePage() {
  return (
    <main>
      {/* conteúdo */}
    </main>
  )
}
```

### `page.tsx` — Client Component (evite; prefira RSC + filho client)

```tsx
'use client'

import { useState } from 'react'

export default function NomePage() {
  const [state, setState] = useState(null)

  return (
    <main>
      {/* conteúdo interativo */}
    </main>
  )
}
```

### `loading.tsx`

```tsx
export default function NomeLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {/* Use o skeleton do design system do projeto */}
      <div className="animate-pulse space-y-4 w-full max-w-2xl">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    </div>
  )
}
```

### `error.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface NomeErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function NomeError({ error, reset }: NomeErrorProps) {
  useEffect(() => {
    // Registrar no serviço de monitoramento (ex: Sentry)
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  )
}
```

### `not-found.tsx`

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NomeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Não encontrado</h2>
      <p className="text-muted-foreground text-sm">
        O recurso que você procura não existe ou foi removido.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  )
}
```

---

## Regras obrigatórias

- **RSC por padrão.** Só adicione `'use client'` se a página precisar de hooks, eventos ou estado que não podem ser delegados a um componente filho.
- **`params` e `searchParams` são Promises no Next.js 15.** Sempre use `await params` e `await searchParams`.
- **`metadata` exportado em toda página.** Mínimo: `title` e `description`.
- **Fetch de dados no RSC, nunca em `useEffect`.** Dados do servidor ficam no `page.tsx`; interatividade vai para um componente filho client (`NomePageClient`).
- **`notFound()` para rotas dinâmicas sem resultado.** Nunca renderize uma página vazia.
- **Não use `layout.tsx` na própria página.** Layouts existem na raiz do grupo ou segmento pai.
- **Nomes de arquivo sempre em kebab-case para pastas**, PascalCase para componentes importados.

---

## Checklist de entrega

Após gerar os arquivos, confirme com o usuário:

- [ ] Rota acessível no caminho correto?
- [ ] `metadata` preenchida?
- [ ] Dados sendo buscados no servidor (RSC), não no cliente?
- [ ] `loading.tsx` cobre o tempo de fetch?
- [ ] `error.tsx` captura falhas da rota?
- [ ] Rota dinâmica tem `not-found.tsx`?
- [ ] Componente client filho criado em `components/features/`? (use `/new-component` se necessário)
