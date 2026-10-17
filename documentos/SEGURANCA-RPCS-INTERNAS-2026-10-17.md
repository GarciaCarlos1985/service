# Restrição de execução das RPCs internas — candidato de 17/10/2026

## Problema confirmado

A revisão posterior à publicação do painel confirmou no PostgreSQL real que
seis helpers internos legados têm execução concedida a `anon` e `authenticated`.
São funções `SECURITY DEFINER`, de propriedade de `postgres`, que devem ser
chamadas pelas RPCs do domínio e pelo backend confiável. A retirada anterior
de execução de `PUBLIC` em algumas funções não retirou os grants diretos dos
papéis da API existentes no projeto.

O achado inclui rotinas internas de carteira, ledger e notificação. Estarem
fora do MVP comercial não impede uma chamada direta à API. Não foi executada
exploração HTTP nem alterado dado financeiro real para demonstrar o risco.

## Correção e impacto

`20261017130133_guide_internal_rpc_permissions.sql` revoga somente `EXECUTE`
de `PUBLIC`, `anon` e `authenticated` nas seis assinaturas identificadas.
Preserva a execução do proprietário e explicita a permissão de `service_role`.
Notifica o PostgREST para atualizar o cache após a aplicação.

Não muda corpos de funções, dados, tabelas, senhas, MFA ou planos. As chamadas
internas feitas por RPCs `SECURITY DEFINER` continuam com o proprietário; os
fluxos legados são preservados e testados. Não há chamada direta a esses
helpers em `src/`. `_is_admin()` e as RPCs públicas do guia mantêm seus contratos.
Consumidores que chamassem diretamente helpers internos perderiam esse acesso,
que não faz parte do contrato do aplicativo.

## Validação e liberação

O runner `npm run test:admin:sql` aplica a migração candidata apenas na própria
transação e executa a suíte nova antes das sete regressões existentes. O bloco
final faz rollback em sucesso ou falha. A suíte verifica os privilégios reais,
recusa chamadas diretas de ambos os papéis da API e preserva as consultas públicas
de busca, vitrines e apresentação. As regressões exercitam ledger, notificações
e demais contratos legados usando seus fluxos internos.

Resultado medido: **oito suítes SQL aprovadas**, com rollback completo;
chamadas diretas negadas para ambos os papéis e chamadas internas preservadas.
Depois do rollback, as permissões originais continuaram no banco de produção:
nenhuma aplicação definitiva foi feita. Typecheck, lint sem erros (37 avisos
herdados), formatação, **87 unitários** e build normal de produção também passaram.

A aplicação definitiva é uma **terceira migração**, além das duas aprovadas na
publicação do painel. Este candidato deve passar no gate, ser revisado e receber
autorização humana antes da mesclagem e aplicação. Não precisa republicar o
Worker, pois não altera código do aplicativo. As políticas do Auth e os demais
avisos dos advisors não são alterados por esta correção.
