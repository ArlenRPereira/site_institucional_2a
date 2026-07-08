## Descrição

<!-- O que esta migration faz? Qual problema de schema resolve? -->

## Tipo de mudança

- [ ] Nova tabela
- [ ] Nova coluna / índice
- [ ] Alteração de coluna existente
- [ ] Nova policy RLS
- [ ] Correção de policy RLS
- [ ] Nova Edge Function
- [ ] Seed / dados iniciais

## Breaking change?

- [ ] Sim — descrever impacto abaixo
- [ ] Não

<!-- Se sim: quais consumers precisam atualizar? Backend? Web? -->
<!-- Lembrar: PR de contracts DEPOIS deste, PRs dos consumers por último. -->

## Checklist de migration

- [ ] Arquivo criado via `supabase migration new <nome>` (timestamp automático)
- [ ] Nome descritivo em snake_case (`create_orders_table`, `add_avatar_url_to_users`)
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY` no mesmo arquivo
- [ ] Toda nova tabela tem trigger `set_updated_at`
- [ ] `COMMENT ON TABLE` e `COMMENT ON COLUMN` presentes
- [ ] Coluna `NOT NULL` em tabela com dados foi feita em 2 etapas (migrations separadas)
- [ ] `supabase db reset` passou sem erros (replay completo)
- [ ] Migration que dropa tabela/coluna tem rollback comentado no arquivo

## Checklist de RLS

- [ ] Toda nova tabela tem policies para SELECT, INSERT e UPDATE
- [ ] Ausência de DELETE policy é intencional e comentada
- [ ] Sem `USING (true)` não documentado
- [ ] Policies de UPDATE têm ambos `USING` e `WITH CHECK`
- [ ] Policies de INSERT usam `WITH CHECK` (não `USING`)
- [ ] `/review-rls` rodado — sem findings críticos

## Tipos sincronizados

- [ ] `pnpm db:types` executado após aplicar
- [ ] `database.ts` copiado para `produto-contracts/src/types/database.ts`
- [ ] Consumers (`backend`, `web`) atualizados via `pnpm install`

## Contexto adicional

<!-- ERD, decisões de modelagem, alternativas consideradas -->
