# Comando: new-component

Cria um novo componente React seguindo o Atomic Design e os padrões do projeto.

## Como usar

```
/new-component
```

O Claude irá coletar as informações e gerar o componente no local correto da árvore.

---

## Processo de execução

### 1. Coletar parâmetros

Pergunte ao usuário (em uma única mensagem):

- **Nome do componente** — PascalCase, ex: `ProductCard`, `UserAvatarGroup`
- **Camada Atomic Design**:
  - `ui` — átomo: elemento isolado, sem dependência de domínio (Button, Input, Badge)
  - `common` — molécula: combina átomos, agnóstica de feature (Header, Modal, DataTable)
  - `features/[nome-feature]` — organismo: acoplada a um domínio específico (ProductList, AuthForm)
- **Tipo de componente**:
  - Server Component (RSC) — sem interatividade, pode fazer fetch
  - Client Component — hooks, eventos, estado local
- **Recebe dados via props** | **busca próprios dados** (RSC via Supabase/service)
- **Variantes ou estados visuais** — ex: `size`, `variant`, `isLoading`, `isDisabled`
- **Precisa de** — `index.ts` barrel | arquivo de tipos separado | stories (Storybook)

### 2. Localização dos arquivos

```
# Átomo (ui/)
src/components/ui/
└── nome-componente.tsx

# Molécula (common/)
src/components/common/
└── NomeComponente/
    ├── NomeComponente.tsx
    └── index.ts

# Organismo (features/)
src/components/features/nome-feature/
├── NomeComponente.tsx
├── NomeComponente.types.ts   # se tipos forem extensos
└── index.ts
```

---

## Templates

### Átomo — Client Component com variantes (shadcn pattern)

```tsx
// src/components/ui/nome-componente.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const nomeComponenteVariants = cva(
  // base classes
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:  'border border-input bg-background hover:bg-accent',
        ghost:    'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface NomeComponenteProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof nomeComponenteVariants> {
  // props específicas do componente
}

export function NomeComponente({
  className,
  variant,
  size,
  ...props
}: NomeComponenteProps) {
  return (
    <div
      className={cn(nomeComponenteVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

### Molécula — Client Component com estado

```tsx
// src/components/common/NomeComponente/NomeComponente.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface NomeComponenteProps {
  /** Descrição da prop. */
  titulo: string
  /** Conteúdo interno. */
  children?: React.ReactNode
  className?: string
  onAcao?: (valor: string) => void
}

export function NomeComponente({
  titulo,
  children,
  className,
  onAcao,
}: NomeComponenteProps) {
  const [estado, setEstado] = useState(false)

  const handleAcao = () => {
    setEstado(prev => !prev)
    onAcao?.(titulo)
  }

  return (
    <div className={cn('relative', className)}>
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <button
          onClick={handleAcao}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {estado ? 'Fechar' : 'Abrir'}
        </button>
      </header>

      {estado && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}
```

### Organismo — RSC com fetch de dados

```tsx
// src/components/features/nome-feature/NomeComponente.tsx
import { createServerClient } from '@/lib/supabase/server'
import { NomeTipoItem } from './NomeComponente.types'
import { NomeComponenteItem } from './NomeComponenteItem'

interface NomeComponenteProps {
  filtro?: string
  limite?: number
}

export async function NomeComponente({
  filtro,
  limite = 20,
}: NomeComponenteProps) {
  const supabase = await createServerClient()

  const query = supabase
    .from('tabela')
    .select('id, campo1, campo2')
    .limit(limite)

  if (filtro) query.ilike('campo1', `%${filtro}%`)

  const { data, error } = await query

  if (error) throw new Error('Falha ao carregar dados')
  if (!data?.length) return <p className="text-muted-foreground">Nenhum item encontrado.</p>

  return (
    <ul className="grid gap-4">
      {data.map((item: NomeTipoItem) => (
        <NomeComponenteItem key={item.id} item={item} />
      ))}
    </ul>
  )
}
```

### Organismo — Client Component com hook + service

```tsx
// src/components/features/nome-feature/NomeComponente.tsx
'use client'

import { useNomeFeature } from '@/hooks/use-nome-feature'
import { Skeleton } from '@/components/ui/skeleton'

interface NomeComponenteProps {
  initialData?: NomeTipo[]
}

export function NomeComponente({ initialData }: NomeComponenteProps) {
  const { data, isLoading, error, refresh } = useNomeFeature({ initialData })

  if (isLoading) return <NomeComponenteSkeleton />
  if (error)     return <p className="text-destructive text-sm">{error.message}</p>

  return (
    <section aria-label="Lista de itens">
      {/* conteúdo */}
    </section>
  )
}

function NomeComponenteSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}
```

### Arquivo de tipos separado

```tsx
// src/components/features/nome-feature/NomeComponente.types.ts
export interface NomeTipoItem {
  id: string
  campo1: string
  campo2: number
  criadoEm: string
}

export interface NomeComponenteState {
  selecionado: string | null
  modo: 'visualizar' | 'editar'
}
```

### `index.ts` barrel

```tsx
// src/components/features/nome-feature/index.ts
export { NomeComponente } from './NomeComponente'
export type { NomeComponenteProps } from './NomeComponente'
// se tiver tipos separados:
// export type { NomeTipoItem } from './NomeComponente.types'
```

---

## Regras obrigatórias

- **Nomeação:** PascalCase para o componente e arquivo (`ProductCard.tsx`), kebab-case para a pasta (`product-card/`).
- **Exportações nomeadas, nunca `default`.** Facilita refatoração e tree-shaking.
- **Props tipadas com `interface`, não `type`.** Use `type` apenas para unions/intersections.
- **JSDoc nas props públicas.** Pelo menos uma linha descrevendo cada prop não óbvia.
- **`'use client'` somente quando necessário.** Se só precisa de `onClick`, extraia o handler para um componente filho client menor.
- **Não importar de `features/` dentro de `ui/` ou `common/`.** O fluxo de dependência é: `ui` ← `common` ← `features`.
- **Skeleton inline no próprio componente.** Não crie um arquivo separado para skeleton, a menos que seja muito complexo.
- **`cn()` para merging de classes.** Nunca concatenar strings de Tailwind diretamente.
- **Acessibilidade mínima:** roles semânticos corretos, `aria-label` em ícones sem texto, `alt` em imagens.

---

## Checklist de entrega

Após gerar, confirme com o usuário:

- [ ] Arquivo criado na camada correta (`ui/`, `common/`, `features/`)?
- [ ] Exportação nomeada (sem `default`)?
- [ ] Props totalmente tipadas com JSDoc?
- [ ] `'use client'` justificado ou removido?
- [ ] `index.ts` barrel exportando o componente?
- [ ] Skeleton / estado de loading coberto?
- [ ] Dependência de camada respeitada (`ui` ← `common` ← `features`)?
- [ ] Hook customizado necessário? (use `/new-component` de suporte ou crie manualmente)
