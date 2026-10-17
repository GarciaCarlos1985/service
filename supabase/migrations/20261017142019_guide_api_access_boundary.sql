-- O Service Guide publica somente suas RPCs. O marketplace legado permanece
-- preservado para o proprietário/backend, sem entradas públicas fora do MVP.
-- Nenhuma tabela, política, função legada ou dado é removido.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

-- REVOKE na tabela não retira concessões feitas diretamente em suas colunas.
do $$
declare relation record; routine record;
begin
  for relation in
    select c.relname,string_agg(format('%I',a.attname),',' order by a.attnum) as columns
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    where n.nspname='public' and c.relkind in ('r','p','v','m') group by c.relname
  loop
    execute format('revoke all (%s) on table public.%I from public,anon,authenticated',relation.columns,relation.relname);
  end loop;
  for routine in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.proowner='postgres'::regrole
    and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  loop
    execute format('revoke execute on function %s from public,anon,authenticated',routine.signature);
    execute format('grant execute on function %s to service_role',routine.signature);
  end loop;
end;
$$;

-- Lista explícita da API pública e autenticada realmente utilizada pelo guia.
grant execute on function
  public.guide_search(jsonb),
  public.guide_company_by_slug(text,text),
  public.guide_me(),
  public.guide_presentation(),
  public.guide_showcase(),
  public.guide_support(jsonb),
  public.guide_event(jsonb)
to anon, authenticated;

grant execute on function
  public.guide_update_profile(jsonb),
  public.guide_toggle_favorite(jsonb),
  public.guide_review(jsonb),
  public.guide_contact(jsonb),
  public.guide_admin_save(text,jsonb),
  public.guide_admin_list(text,integer,text,uuid,integer),
  public.guide_admin_company(uuid),
  public.guide_admin_order(text,uuid),
  public.guide_admin_reorder(text,uuid[],uuid[],uuid),
  public.guide_admin_upload_allowed(text),
  public.guide_admin_set_role(uuid,boolean)
to authenticated;

-- Novos objetos de aplicação só serão expostos por GRANT explícito.
-- O padrão global de EXECUTE de PUBLIC precisa ser retirado globalmente.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;

create or replace function guide_private.valid_session() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
   select 1 from auth.sessions s join auth.users u on u.id=s.user_id
   where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
   and (s.not_after is null or s.not_after>now())
   and u.deleted_at is null and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<=now())
 );
$$;
revoke all on function guide_private.valid_session() from public,anon,authenticated;

-- Extensão auxiliar não precisa morar no schema exposto da aplicação.
alter extension btree_gist set schema extensions;

notify pgrst, 'reload schema';
