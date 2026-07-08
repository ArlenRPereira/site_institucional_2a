## Descrição

<!-- O que esta PR faz? Por que esta mudança é necessária? -->

## Tipo de mudança

- [ ] `feat` — novo endpoint / recurso
- [ ] `fix` — correção de bug
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `test` — testes apenas
- [ ] `chore` — dependências, build, configs

## Mudança breaking de contrato?

- [ ] Sim — PR de `shared-contracts` mergeado primeiro?
- [ ] Não

<!-- Se sim: quais campos/rotas mudaram? Qual versão do @org/shared-contracts? -->

## Checklist

- [ ] `pnpm typecheck` passando
- [ ] `pnpm lint` passando
- [ ] `pnpm test` passando
- [ ] Novo endpoint tem testes: happy path + 401 + 400 + 404
- [ ] Toda query UPDATE/DELETE filtra por `user_id` (ownership check)
- [ ] Sem `SUPABASE_SERVICE_ROLE_KEY` em logs ou responses
- [ ] Erros via `AppError` — sem `throw new Error('string')`
- [ ] Adaptação snake_case → camelCase explícita no service
- [ ] `openapi.yaml` atualizado (se novo endpoint)
- [ ] `/audit-security` rodado antes desta PR

## Contexto adicional

<!-- Links úteis, issues relacionadas, decisões tomadas -->
