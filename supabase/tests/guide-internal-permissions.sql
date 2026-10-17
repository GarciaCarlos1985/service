-- Executar somente dentro do runner transacional: nunca deixar fixtures ou DDL.
do $$
declare
  signature text;
  function_id regprocedure;
begin
  foreach signature in array array[
    'public._get_or_create_wallet(uuid)',
    'public._get_platform_wallet()',
    'public._ledger_credit(uuid,text,integer,text,text,uuid,text)',
    'public._notify(uuid,text,text,text,jsonb)',
    'public._resolve_cashback(uuid,integer)',
    'public.process_booking_financials(uuid)'
  ] loop
    function_id := to_regprocedure(signature);
    if function_id is null then raise exception 'Helper ausente: %',signature; end if;
    if has_function_privilege('anon',function_id,'EXECUTE')
      or has_function_privilege('authenticated',function_id,'EXECUTE') then
      raise exception 'Helper interno acessível pela API: %',signature;
    end if;
    if not has_function_privilege('service_role',function_id,'EXECUTE')
      or not has_function_privilege('postgres',function_id,'EXECUTE') then
      raise exception 'Execução interna removida indevidamente: %',signature;
    end if;
  end loop;
  if not has_function_privilege('anon','public.guide_search(jsonb)','EXECUTE')
    or not has_function_privilege('anon','public.guide_showcase()','EXECUTE')
    or not has_function_privilege('anon','public.guide_presentation()','EXECUTE') then
    raise exception 'A API pública do guia foi alterada';
  end if;
  raise notice 'OK: seis helpers internos sem execução pública; proprietário e backend preservados';
end $$;

do $$
declare
  api_role text;
  attempt text;
begin
  foreach api_role in array array['anon','authenticated'] loop
    execute format('set local role %I',api_role);
    foreach attempt in array array[
      'select public._get_or_create_wallet(null::uuid)',
      'select public._get_platform_wallet()',
      'select public._ledger_credit(null::uuid,''credit'',1,''permission-check'',''permission-check'',null::uuid,''permission-check'')',
      'select public._notify(null::uuid,''system'',''permission-check'',''permission-check'',null::jsonb)',
      'select public._resolve_cashback(null::uuid,1)',
      'select public.process_booking_financials(null::uuid)'
    ] loop
      begin
        execute attempt;
        raise exception 'Chamada interna permitida para %',api_role;
      exception when insufficient_privilege then
        null;
      end;
    end loop;
    reset role;
    raise notice 'OK: chamadas diretas recusadas para % antes de executar o corpo',api_role;
  end loop;
  raise notice 'TODOS OS TESTES PASSARAM!';
end $$;
