# Skill: Design Tokens

Leia este arquivo antes de criar ou modificar qualquer componente visual, página ou estilo. Ele é a fonte de verdade para cores, espaçamento, tipografia, bordas e sombras do projeto.

---

## Onde vivem os tokens

```
src/theme/
├── tokens.css           # custom properties CSS — fonte primária
└── tailwind-preset.ts   # mapeamento tokens → classes Tailwind
```

Os tokens são definidos em CSS custom properties e mapeados para o Tailwind. **Nunca use valores hardcoded** — nem `#1a1a1a`, nem `16px`, nem `font-size: 14px`. Use sempre o token correspondente.

---

## Cores

### Paleta semântica (use estas na UI)

```css
/* src/theme/tokens.css */
:root {
  /* Brand */
  --color-brand-50:  /* tom mais claro */;
  --color-brand-100: ...;
  --color-brand-500: /* tom principal */;
  --color-brand-600: /* hover */;
  --color-brand-900: /* tom mais escuro */;

  /* Neutros */
  --color-gray-50:  #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-400: #9ca3af;
  --color-gray-600: #4b5563;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* Feedback */
  --color-success: #16a34a;
  --color-warning: #ca8a04;
  --color-danger:  #dc2626;
  --color-info:    #2563eb;

  /* Superfícies */
  --color-background:        #ffffff;
  --color-background-subtle: #f9fafb;
  --color-surface:           #ffffff;
  --color-surface-raised:    #f3f4f6;

  /* Texto */
  --color-text-primary:   #111827;
  --color-text-secondary: #4b5563;
  --color-text-disabled:  #9ca3af;
  --color-text-inverse:   #ffffff;

  /* Bordas */
  --color-border:        #e5e7eb;
  --color-border-strong: #d1d5db;
  --color-border-focus:  var(--color-brand-500);
}

/* Dark mode — override automático */
[data-theme="dark"],
.dark {
  --color-background:        #0f172a;
  --color-background-subtle: #1e293b;
  --color-surface:           #1e293b;
  --color-surface-raised:    #334155;
  --color-text-primary:      #f1f5f9;
  --color-text-secondary:    #94a3b8;
  --color-text-disabled:     #475569;
  --color-border:            #334155;
  --color-border-strong:     #475569;
}
```

### Mapeamento Tailwind

```ts
// src/theme/tailwind-preset.ts
import type { Config } from 'tailwindcss'

export const themePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'var(--color-brand-50)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          900: 'var(--color-brand-900)',
        },
        background: {
          DEFAULT: 'var(--color-background)',
          subtle:  'var(--color-background-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised:  'var(--color-surface-raised)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled:  'var(--color-text-disabled)',
          inverse:   'var(--color-text-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
          focus:   'var(--color-border-focus)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger:  'var(--color-danger)',
        info:    'var(--color-info)',
      },
    },
  },
}
```

### Regras de uso de cor

```tsx
// ✅ Texto sobre fundo branco
<p className="text-text-primary">Título</p>
<p className="text-text-secondary">Descrição</p>

// ✅ Superfícies
<div className="bg-background">Página</div>
<div className="bg-surface-raised">Card elevado</div>

// ✅ Bordas
<div className="border border-border">Normal</div>
<div className="border border-border-strong">Destaque</div>

// ✅ Estados de feedback
<span className="text-success">Salvo com sucesso</span>
<span className="text-danger">Erro ao salvar</span>

// ❌ Nunca hardcodar cor
<p className="text-gray-900">Texto</p>   // errado — quebra no dark mode
<p style={{ color: '#111' }}>Texto</p>   // errado — fora do sistema
```

---

## Espaçamento

O projeto usa a escala de espaçamento padrão do Tailwind (base 4px), sem customização. A escala segue a progressão:

| Token Tailwind | Valor | Uso típico |
|---|---|---|
| `space-1` | 4px | Gap mínimo entre elementos inline |
| `space-2` | 8px | Padding interno de badges/chips |
| `space-3` | 12px | Gap entre ícone e texto |
| `space-4` | 16px | Padding de botões, gap de formulários |
| `space-6` | 24px | Padding interno de cards |
| `space-8` | 32px | Separação entre seções de um card |
| `space-12` | 48px | Gap entre blocos de conteúdo |
| `space-16` | 64px | Separação entre seções de página |
| `space-24` | 96px | Espaçamento hero/landing |

### Regras de espaçamento

- **Padding de card:** sempre `p-6` (24px). Em mobile, reduzir para `p-4`.
- **Gap entre itens de lista/grid:** `gap-4` (16px) para denso, `gap-6` (24px) para confortável.
- **Margin entre seções de página:** `mb-8` ou `space-y-8`.
- **Nunca usar margin para posicionamento horizontal** — usar flexbox/grid com gap.

---

## Tipografia

```css
/* src/theme/tokens.css */
:root {
  --font-sans:  'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, monospace;

  /* Escala de tamanhos */
  --text-xs:   0.75rem;   /* 12px — labels, captions */
  --text-sm:   0.875rem;  /* 14px — texto de apoio, metadados */
  --text-base: 1rem;      /* 16px — corpo do texto */
  --text-lg:   1.125rem;  /* 18px — subtítulos */
  --text-xl:   1.25rem;   /* 20px — títulos de card */
  --text-2xl:  1.5rem;    /* 24px — títulos de seção */
  --text-3xl:  1.875rem;  /* 30px — títulos de página */
  --text-4xl:  2.25rem;   /* 36px — hero */

  /* Pesos */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* Line height */
  --leading-tight:  1.25;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed:1.625;
}
```

### Hierarquia tipográfica — padrão de uso

```tsx
// Título de página (h1)
<h1 className="text-3xl font-bold tracking-tight text-text-primary">
  Meus Projetos
</h1>

// Título de seção (h2)
<h2 className="text-xl font-semibold text-text-primary">
  Projetos Recentes
</h2>

// Subtítulo / label (h3)
<h3 className="text-base font-medium text-text-primary">
  Detalhes do Projeto
</h3>

// Corpo
<p className="text-base text-text-secondary leading-relaxed">
  Descrição do projeto com informações detalhadas.
</p>

// Metadado / caption
<span className="text-sm text-text-disabled">
  Criado em 12 de maio
</span>

// Código inline
<code className="font-mono text-sm bg-surface-raised px-1.5 py-0.5 rounded">
  npm run dev
</code>
```

### Regras tipográficas

- **Nunca pular níveis** de heading (`h1` → `h3` sem `h2`).
- **Uma única `h1` por página** — determinada pelo `page.tsx`.
- **`tracking-tight`** obrigatório em títulos `text-2xl` ou maiores.
- **`leading-relaxed`** em parágrafos longos de corpo.
- **`font-medium` é o bold de UI** — `font-semibold` e `font-bold` apenas para títulos e CTAs primários.

---

## Bordas e arredondamento

```css
:root {
  --radius-sm:   0.25rem;  /* 4px  — badges, chips */
  --radius-md:   0.375rem; /* 6px  — inputs, botões pequenos */
  --radius-lg:   0.5rem;   /* 8px  — cards, modais */
  --radius-xl:   0.75rem;  /* 12px — cards grandes */
  --radius-full: 9999px;   /* pill — avatars, toggles */
}
```

| Elemento | Classe Tailwind |
|---|---|
| Badge / chip | `rounded` (4px) |
| Botão / input | `rounded-md` (6px) |
| Card padrão | `rounded-lg` (8px) |
| Modal / drawer | `rounded-xl` (12px) |
| Avatar / toggle | `rounded-full` |

---

## Sombras

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
}
```

| Uso | Classe |
|---|---|
| Input, botão (estado focus) | `shadow-sm` |
| Card padrão | `shadow-md` |
| Modal, dropdown, popover | `shadow-lg` |
| Sem sombra (flat UI) | sem classe (padrão) |

**Regra:** sombras são usadas com moderação. A hierarquia de elevação é comunicada principalmente por cor de superfície (`bg-surface` vs `bg-surface-raised`), não por sombra.

---

## Breakpoints

Seguem o padrão Tailwind sem modificação:

| Prefixo | Largura mínima | Uso típico |
|---|---|---|
| _(sem prefixo)_ | 0px | Mobile first — layout base |
| `sm:` | 640px | Tablets pequenos |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktops |
| `xl:` | 1280px | Desktops largos |
| `2xl:` | 1536px | Telas grandes |

**Mobile first obrigatório:** escreva a classe base para mobile e use prefixos para telas maiores.

```tsx
// ✅ Mobile first
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// ❌ Desktop first (não usar)
<div className="grid grid-cols-3 gap-4 md:grid-cols-2 sm:grid-cols-1">
```

---

## Tokens de animação

```css
:root {
  --duration-fast:   100ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);  /* ease-in-out suave */
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);
}
```

```tsx
// Transição padrão para hover/focus
<button className="transition-colors duration-200 ease-in-out hover:bg-brand-600">

// Transição de opacidade (loading, fade)
<div className="transition-opacity duration-300 opacity-0 data-[visible=true]:opacity-100">
```

**Regra:** toda interação visual tem transição. Mínimo `duration-200` para hover, `duration-300` para entradas de elemento.

---

## Checklist ao criar um componente visual

- [ ] Nenhuma cor hardcoded — apenas tokens semânticos?
- [ ] Espaçamento usando escala Tailwind (não `px` arbitrário em `style={{}}`)?
- [ ] Tipografia seguindo a hierarquia (`text-*` + `font-*` + `leading-*`)?
- [ ] Arredondamento correto para o tipo de elemento?
- [ ] Funciona no dark mode sem classes adicionais? (usar `text-text-*`, `bg-surface-*`)
- [ ] Mobile first com breakpoints progressivos?
- [ ] Transição adicionada em elementos interativos?
