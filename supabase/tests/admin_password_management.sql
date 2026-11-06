-- Auth metadata, audit fixtures, sessions, and all revocations roll back.
-- No Auth API calls and no password hashes are modified.
begin;
select set_config('test.admin',(select id::text from auth.users where email='085172459708@makanmana.com'),true);
select set_config('test.target',(select p.id::text from public.profiles p join auth.users u on u.id=p.id where p.role='user' and coalesce(u.raw_app_meta_data->>'makanmana_admin','false')<>'true' order by p.id limit 1),true);
select set_config('test.target_phone',(select split_part(email,'@',1) from auth.users where id=current_setting('test.target')::uuid),true);
select set_config('test.admin_session',gen_random_uuid()::text,true);
select set_config('test.target_session',gen_random_uuid()::text,true);
select set_config('test.job',gen_random_uuid()::text,true);
insert into auth.sessions(id,user_id,created_at,updated_at) values
(current_setting('test.admin_session')::uuid,current_setting('test.admin')::uuid,now(),now()),
(current_setting('test.target_session')::uuid,current_setting('test.target')::uuid,now(),now());
do $$ begin
 if has_function_privilege('authenticated','public.admin_list_accounts(text,integer)','EXECUTE') or has_function_privilege('anon','public.begin_password_action(uuid,uuid,uuid,text,uuid,text)','EXECUTE') then raise exception 'Privileged RPC leaked'; end if;
 if has_table_privilege('authenticated','public.admin_password_jobs','SELECT') then raise exception 'Audit leaked'; end if;
 if (public.admin_list_accounts('',1)->>'total')::integer<1 then raise exception 'Admin list empty'; end if;
 if public.begin_password_action(current_setting('test.admin')::uuid,current_setting('test.target')::uuid,current_setting('test.job')::uuid,'reset',current_setting('test.admin_session')::uuid,current_setting('test.target_phone'))<>'created' then raise exception 'Reservation failed'; end if;
 if public.begin_password_action(current_setting('test.admin')::uuid,current_setting('test.target')::uuid,current_setting('test.job')::uuid,'reset',current_setting('test.admin_session')::uuid,current_setting('test.target_phone'))<>'pending' then raise exception 'Request not idempotent'; end if;
 begin
  perform public.begin_password_action(current_setting('test.target')::uuid,current_setting('test.admin')::uuid,gen_random_uuid(),'reset',current_setting('test.target_session')::uuid,'085172459708');
  raise exception 'Non-admin reset allowed'; exception when insufficient_privilege then null;
 end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.target'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.target'),'role','authenticated','session_id',current_setting('test.target_session'))::text,true);
do $$ begin
 if not private.password_access_allowed() then raise exception 'Normal account blocked'; end if;
 if (public.account_access()->>'is_admin')::boolean then raise exception 'User promoted to admin'; end if;
end $$;
reset role;
update auth.users set raw_app_meta_data=raw_app_meta_data||'{"must_change_password":true}'::jsonb where id=current_setting('test.target')::uuid;
set local role authenticated;
do $$ begin
 if private.password_access_allowed() then raise exception 'Temporary password bypassed RLS'; end if;
 if not (public.account_access()->>'must_change_password')::boolean then raise exception 'Change gate missing'; end if;
 if (select count(*) from public.profiles where id=auth.uid())<>0 then raise exception 'Direct profile data bypassed gate'; end if;
 begin insert into public.orders(user_id,food_name,price,payment_method) values(auth.uid(),'Reset test',1000,'cash');
 raise exception 'Temporary account placed order'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select public.finish_password_action(current_setting('test.job')::uuid,true);
update auth.users set raw_app_meta_data=raw_app_meta_data||'{"must_change_password":false}'::jsonb where id=current_setting('test.target')::uuid;
set local role authenticated;
do $$ begin
 if private.password_access_allowed() then raise exception 'Revoked old session still has access'; end if;
 begin perform public.account_access(); raise exception 'Revoked session opened account'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: admin-only RPCs, list, idempotent reservation, mandatory password gate, revoked sessions; all fixtures rolled back' as result;
