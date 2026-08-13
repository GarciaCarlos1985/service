-- ============================================================
-- SERVICE — Milestone 2 · Escolha de tipo de conta via RPC
-- A alteração direta de user_type continua BLOQUEADA por RLS
-- (spec §63: usuário não altera próprio role). O onboarding usa
-- esta RPC — único caminho permitido, auditável.
-- ============================================================

create or replace function public.choose_user_type(p_user_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_type text;
begin
  if p_user_type not in ('client', 'professional') then
    raise exception 'tipo de usuário inválido';
  end if;

  select user_type into current_type
  from public.profiles
  where id = auth.uid();

  if current_type is null then
    raise exception 'perfil não encontrado';
  end if;

  update public.profiles
  set user_type = p_user_type
  where id = auth.uid();
end;
$$;

revoke all on function public.choose_user_type(text) from public, anon;
grant execute on function public.choose_user_type(text) to authenticated;

comment on function public.choose_user_type(text) is
  'Único caminho para o usuário escolher client/professional (onboarding). Nunca admin — admin é papel separado (M10).';
