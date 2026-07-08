# Skill: Component Pattern

Leia este arquivo antes de criar, modificar ou revisar qualquer componente React. Ele define as convenções obrigatórias de estrutura, nomeação, tipagem e organização de componentes no projeto.

---

## Árvore de decisão: onde criar o componente?

```
O componente é específico de um domínio de negócio?
├── SIM → components/features/[nome-do-domínio]/
│         Exemplos: ProjetoCard, AuthForm, MetricasChart
└── NÃO → É reutilizável entre features?
          ├── SIM → Combina mais de um átomo ou tem estado?
          │         ├── SIM → components/common/
          │         │         Exemplos: DataTable, Modal, SearchInput
          │         └── NÃO → components/ui/
          │                   Exemplos: Button, Badge, Skeleton
          └── NÃO → Mantê-lo no próprio page.tsx ou extrair para features/
```

### Regra de dependência de camadas (nunca violar)

```
ui/  ←  common/  ←  features/  ←  app/
```

- `ui/` não importa de `common/` nem de `features/`
- `common/` não importa de `features/`
- `features/` pode importar de `ui/` e `common/`
- `app/` importa de qualquer camada

---

## Server Component vs Client Component

### Árvore de decisão

```
O componente precisa de:
├── useState / useReducer?          → 'use client'
├── useEffect / useLayoutEffect?    → 'use client'
├── useContext (que muda em runtime)?→ 'use client'
├── Handlers de evento (onClick...)?→ 'use client'
├── APIs do browser (window, document, localStorage)? → 'use client'
├── Animações imperativas (Framer Motion refs)? → 'use client'
└── Nada acima?                     → RSC (padrão, sem diretiva)
```

**Regra:** o `'use client'` deve ficar no menor escopo possível — nunca no `page.tsx`, raramente no componente de layout. Isole a interatividade no menor componente-folha da árvore.

```tsx
// ❌ Contamina toda a subárvore com bundle client
'use client'                              // no page.tsx
export default function ProjetosPage() {
  const [filtro, setFiltro] = useState('')
  return <ProjetoList filtro={filtro} />
}

// ✅ Isola a interatividade no componente mínimo necessário
// page.tsx — RSC, sem 'use client'
export default async function ProjetosPage() {
  const dados = await buscarProjetos()
  return (
    <>
      <ProjetoFiltro />            {/* 'use client' — só o filtro */}
      <ProjetoList dados={dados} /> {/* RSC — recebe dados via props */}
    </>
  )
}
```

---

## Estrutura de arquivo obrigatória

### Átomo — `components/ui/`

Arquivo único, sem pasta. Exportação nomeada.

```tsx
// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// 1. Variantes com CVA
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface-raised text-text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger:  'bg-danger/10  text-danger',
        info:    'bg-info/10    text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

// 2. Interface derivada das variantes + HTML nativo
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode  // props extras específicas do componente
}

// 3. Componente — exportação NOMEADA, nunca default
export function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
```

### Molécula — `components/common/NomeComponente/`

Pasta com barrel export. Separar subcomponentes internos no mesmo diretório.

```
src/components/common/
└── DataTable/
    ├── DataTable.tsx          # componente principal
    ├── DataTableHeader.tsx    # subcomponente interno
    ├── DataTableRow.tsx       # subcomponente interno
    ├── DataTable.types.ts     # tipos (se extensos)
    └── index.ts               # barrel export
```

```ts
// index.ts
export { DataTable }      from './DataTable'
export { DataTableHeader } from './DataTableHeader'
export type { DataTableProps, DataTableColumn } from './DataTable.types'
```

### Organismo — `components/features/[dominio]/`

```
src/components/features/
└── projetos/
    ├── ProjetoCard.tsx
    ├── ProjetoList.tsx        # pode ser RSC com fetch
    ├── ProjetoForm.tsx        # 'use client' — formulário
    ├── ProjetoDeleteModal.tsx # 'use client' — modal de confirmação
    └── index.ts
```

---

## Convenções de nomeação

| O quê | Convenção | Exemplos |
|---|---|---|
| Arquivo de componente | PascalCase | `ProjetoCard.tsx` |
| Pasta de componente | PascalCase | `DataTable/` |
| Pasta de domínio em features/ | kebab-case | `projetos/`, `auth/`, `metricas/` |
| Arquivo de tipos | PascalCase + `.types.ts` | `DataTable.types.ts` |
| Arquivo de barrel | sempre `index.ts` | `index.ts` |
| Hook customizado | camelCase + prefixo `use` | `use-projeto.ts` |
| Variante CVA | camelCase | `badgeVariants` |

---

## Tipagem de componentes

### Regras obrigatórias

```tsx
// ✅ Interface para props (não type — exceto para unions)
export interface ProjetoCardProps {
  /** Dados do projeto a exibir. */
  projeto: Projeto

  /** Callback ao clicar em editar. Opcional. */
  onEditar?: (id: string) => void

  /** Classes adicionais para o container. */
  className?: string
}

// ✅ Estender HTML quando fizer sentido
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

// ❌ Nunca usar any — nem mesmo para props "genéricas"
interface Props { dados: any }

// ✅ Usar unknown + type guard ou generics
interface Props<T> { dados: T; renderItem: (item: T) => React.ReactNode }
```

### JSDoc nas props públicas

Todo `interface` de componente exportado deve ter JSDoc em cada prop não óbvia:

```tsx
export interface DataTableProps<T> {
  /** Array de dados a renderizar. */
  data: T[]

  /** Definição das colunas — chave, header e render. */
  columns: DataTableColumn<T>[]

  /**
   * Número de linhas por página.
   * @default 10
   */
  pageSize?: number

  /** Chamado quando o usuário ordena uma coluna. */
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
}
```

---

## Composição: padrão Slot / Children

Prefira composição explícita a props de conteúdo:

```tsx
// ❌ Props de conteúdo — inflexível
<Card title="Projetos" subtitle="3 projetos ativos" icon={<FolderIcon />} />

// ✅ Composição — extensível
<Card>
  <Card.Header>
    <FolderIcon />
    <Card.Title>Projetos</Card.Title>
    <Card.Subtitle>3 projetos ativos</Card.Subtitle>
  </Card.Header>
  <Card.Body>{/* conteúdo */}</Card.Body>
  <Card.Footer>{/* ações */}</Card.Footer>
</Card>
```

Implementação do padrão com `Object.assign`:

```tsx
// src/components/ui/card.tsx
function CardRoot({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6 shadow-md', className)} {...props}>
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start gap-3 mb-4', className)} {...props} />
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-text-primary', className)} {...props} />
}

function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-text-secondary', className)} {...props} />
}

// Exportação com sub-componentes
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title:  CardTitle,
  Body:   CardBody,
})
```

---

## Estados obrigatórios em todo componente de dados

Todo componente que exibe dados externos deve cobrir os quatro estados:

```tsx
'use client'
export function ProjetoList({ initialData }: { initialData: Projeto[] }) {
  const { data, isLoading, error } = useProjetos({ initialData })

  // 1. Loading
  if (isLoading) return <ProjetoListSkeleton />

  // 2. Erro
  if (error) return (
    <div role="alert" className="text-danger text-sm">
      {error}
    </div>
  )

  // 3. Vazio
  if (!data.length) return (
    <div className="text-center py-12 text-text-disabled">
      Nenhum projeto encontrado.
    </div>
  )

  // 4. Dados
  return (
    <ul className="grid gap-4">
      {data.map(p => <ProjetoCard key={p.id} projeto={p} />)}
    </ul>
  )
}
```

### Skeleton — padrão de implementação

O skeleton fica no **mesmo arquivo** do componente (função privada sem export):

```tsx
function ProjetoListSkeleton() {
  return (
    <ul className="grid gap-4" aria-label="Carregando projetos...">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="rounded-lg border border-border p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-surface-raised" />
          <div className="h-3 w-2/3 rounded bg-surface-raised" />
          <div className="h-3 w-1/2 rounded bg-surface-raised" />
        </li>
      ))}
    </ul>
  )
}
```

---

## Acessibilidade mínima obrigatória

```tsx
// ✅ Ícones decorativos
<svg aria-hidden="true" />
<i className="ti ti-star" aria-hidden="true" />

// ✅ Botão com apenas ícone
<button aria-label="Excluir projeto">
  <TrashIcon aria-hidden="true" />
</button>

// ✅ Imagem com alt descritivo
<Image src={url} alt="Screenshot do projeto Automação Industrial" />

// ✅ Listas semânticas
<ul role="list">
  {itens.map(i => <li key={i.id}>{i.nome}</li>)}
</ul>

// ✅ Mensagem de erro vinculada ao input
<input aria-describedby="email-error" aria-invalid={!!erro} />
<p id="email-error" role="alert">{erro}</p>

// ✅ Loading state anunciado
<div role="status" aria-live="polite">
  {isLoading ? 'Carregando...' : ''}
</div>
```

---

## `cn()` — merge de classes

Sempre usar `cn()` de `@/lib/utils` para combinar classes. Nunca concatenar strings:

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge }               from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```tsx
// ✅ cn() resolve conflitos de classes Tailwind automaticamente
<div className={cn(
  'rounded-lg p-4',         // base
  isActive && 'bg-brand-50', // condicional
  className                  // override externo (sempre por último)
)} />

// ❌ Concatenação — não resolve conflitos, pode gerar classes duplicadas
<div className={`rounded-lg p-4 ${isActive ? 'bg-brand-50' : ''} ${className}`} />
```

---

## Checklist de componente completo

- [ ] Criado na camada correta (`ui/` / `common/` / `features/`)?
- [ ] Exportação **nomeada** (sem `default`)?
- [ ] `interface` de props com JSDoc nas props não óbvias?
- [ ] `'use client'` justificado e no menor escopo possível?
- [ ] `cn()` para merge de classes com suporte a `className` externo?
- [ ] Os quatro estados cobertos (loading, erro, vazio, dados)?
- [ ] Skeleton no mesmo arquivo (sem arquivo separado)?
- [ ] Acessibilidade mínima: `aria-*`, `role`, `alt`, `aria-label`?
- [ ] `index.ts` barrel exportando o componente e seus tipos?
- [ ] Dependência de camada respeitada (`ui ← common ← features`)?
