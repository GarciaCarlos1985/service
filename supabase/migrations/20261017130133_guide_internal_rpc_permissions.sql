-- Helpers internos do legado: somente o proprietário das RPCs e o backend
-- confiável podem chamá-los. Revogar PUBLIC não remove os grants diretos
-- atribuídos aos papéis da API pelos privilégios padrão do projeto.
-- Nenhum dado, corpo de função ou fluxo financeiro é alterado.
revoke execute on function
  public._get_or_create_wallet(uuid),
  public._get_platform_wallet(),
  public._ledger_credit(uuid,text,integer,text,text,uuid,text),
  public._notify(uuid,text,text,text,jsonb),
  public._resolve_cashback(uuid,integer),
  public.process_booking_financials(uuid)
from public, anon, authenticated;

grant execute on function
  public._get_or_create_wallet(uuid),
  public._get_platform_wallet(),
  public._ledger_credit(uuid,text,integer,text,text,uuid,text),
  public._notify(uuid,text,text,text,jsonb),
  public._resolve_cashback(uuid,integer),
  public.process_booking_financials(uuid)
to service_role;

notify pgrst, 'reload schema';
