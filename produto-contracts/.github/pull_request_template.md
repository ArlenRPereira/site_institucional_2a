## Descrição

<!-- O que mudou nos schemas ou tipos? Por que essa mudança é necessária? -->

## Nível de mudança

- [ ] `patch` — correção sem impacto na interface (regex, mensagem de erro)
- [ ] `minor` — adição de campo opcional, novo schema, novo enum value
- [ ] `major` — rename de campo, remoção de propriedade, mudança de tipo obrigatório

## Versão bumpeada?

- [ ] Sim — `package.json` atualizado para `v_.__.__`
- [ ] Não (explicar motivo)

## Consumers impactados

- [ ] `produto-backend` — PR aberto: #___
- [ ] `produto-web` — PR aberto: #___

<!-- Esta PR DEVE ser mergeada antes dos PRs dos consumers. -->

## Checklist

- [ ] `pnpm typecheck` passando
- [ ] `pnpm build` gerando `dist/` sem erros
- [ ] Tipos TypeScript derivados via `z.infer<>` — nenhum tipo escrito manualmente
- [ ] `src/types/database.ts` não editado manualmente (gerado pela infra)
- [ ] Sem dependências além de `zod` adicionadas
- [ ] Sem imports de consumers (`backend`, `web`, `infra`)
- [ ] Breaking change documentada no `CHANGELOG.md` com campo, tipo anterior e novo

## Contexto adicional

<!-- Schema anterior vs novo, motivação, issues relacionadas -->
