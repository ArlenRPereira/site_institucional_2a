## Descrição

<!-- O que esta PR faz? Por que esta mudança é necessária? -->

## Tipo de mudança

- [ ] `feat` — nova página / funcionalidade
- [ ] `fix` — correção de bug
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `chore` — dependências, build, configs, infra
- [ ] `docs` — documentação

## Mudança breaking?

- [ ] Sim — descrever impacto abaixo
- [ ] Não

## Checklist

- [ ] `npm run type-check` passando
- [ ] `npm run lint` passando
- [ ] `npm run build` sem erros
- [ ] `'use client'` ausente em `page.tsx`
- [ ] Fetch de dados iniciais em RSC (não em `useEffect`)
- [ ] `<Image>` com `width`/`height` — sem `<img>` nativa para imagens estáticas
- [ ] `<Link>` para rotas internas — sem `<a>` nativa
- [ ] `notFound()` em rotas dinâmicas sem resultado
- [ ] `metadata` ou `generateMetadata` em páginas públicas
- [ ] Tokens do tema — sem cores ou espaçamentos hardcoded
- [ ] Novo tipo de tabela derivado de `src/types/supabase.ts` (não escrito manualmente)
- [ ] `/sync-types` rodado se migration foi aplicada

## Core Web Vitals (para PRs de página pública)

- [ ] LCP esperado < 2.5s
- [ ] CLS esperado < 0.1
- [ ] Imagens com `priority` e `sizes` corretos

## Screenshots

<!-- Obrigatório para PRs que alteram UI — desktop e mobile -->

## Contexto adicional

<!-- Links úteis, issues relacionadas, decisões tomadas -->
