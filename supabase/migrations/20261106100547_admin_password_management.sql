-- Admin privileges are independent of the user/OB business role.
-- Provision the verified owner separately, never by editable user_metadata.
create table public.admin_password_jobs (
 id uuid primary key,
 actor_id uuid not null references auth.users(id) on delete cascade,
 target_id uuid not null references auth.users(id) on delete cascade,
 action text not null check(action in ('reset','change')),
 status text not null default 'pending' check(status in ('pending','done','failed')),
 session_id uuid not null,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
create index admin_password_jobs_target_time on public.admin_password_jobs(target_id,created_at desc);
create index admin_password_jobs_actor_time on public.admin_password_jobs(actor_id,created_at desc);
alter table public.admin_password_jobs enable row level security;
revoke all on public.admin_password_jobs from public,anon,authenticated;
grant all on public.admin_password_jobs to service_role;
create policy password_jobs_service_only on public.admin_password_jobs for all to service_role using(true) with check(true);

create function private.password_access_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=auth.uid() and s.id=nullif(auth.jwt()->>'session_id','')::uuid
 and coalesce(u.raw_app_meta_data->>'must_change_password','false')<>'true')
$$;
revoke all on function private.password_access_allowed() from public,anon;
grant execute on function private.password_access_allowed() to authenticated;

create function private.account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if not exists(select 1 from auth.sessions where user_id=auth.uid() and id=nullif(auth.jwt()->>'session_id','')::uuid) then
  raise exception 'Sesi berakhir. Silakan masuk kembali.' using errcode='42501';
 end if;
 select jsonb_build_object('role',p.role,'is_admin',coalesce(u.raw_app_meta_data->>'makanmana_admin','false')='true',
  'must_change_password',coalesce(u.raw_app_meta_data->>'must_change_password','false')='true') into result
 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid();
 return result;
end $$;
create function public.account_access() returns jsonb language sql stable security invoker set search_path='' as $$ select private.account_access() $$;
revoke all on function private.account_access(),public.account_access() from public,anon;
grant execute on function private.account_access(),public.account_access() to authenticated;

-- Also enforce mandatory changes against direct REST calls, not just the UI.
do $$ declare t text; begin
 foreach t in array array['profiles','menus','categories','favorites','orders','tardut_requests','teman_makan_groups','teman_makan_orders','split_bills','split_bill_items'] loop
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then
   execute format('create policy require_active_password on public.%I as restrictive for all to authenticated using ((select private.password_access_allowed())) with check ((select private.password_access_allowed()))',t);
  end if;
 end loop;
end $$;
create policy proof_require_active_password on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'payment-proofs' or (select private.password_access_allowed()))
 with check(bucket_id<>'payment-proofs' or (select private.password_access_allowed()));

-- Phone numbers are read from Auth only by the Edge Function's service client.
create function private.admin_list_accounts(search_text text,page_number integer) returns jsonb language sql stable security definer set search_path='' as $$
 with accounts as (
  select u.id,coalesce(nullif(p.name,''),'Karyawan') as name,split_part(u.email,'@',1) as phone,
   coalesce(p.role,'user') as role,coalesce(u.raw_app_meta_data->>'makanmana_admin','false')='true' as is_admin,
   coalesce(u.raw_app_meta_data->>'must_change_password','false')='true' as must_change_password
  from auth.users u left join public.profiles p on p.id=u.id
  where u.email ~ '^08[0-9]{8,12}@makanmana\.com$'
  and (nullif(btrim(search_text),'') is null or strpos(lower(coalesce(p.name,'')||' '||split_part(u.email,'@',1)),lower(btrim(search_text)))>0)
 ), paged as(select * from accounts order by lower(name),id limit 20 offset (greatest(1,least(page_number,10000))-1)*20)
 select jsonb_build_object('total',(select count(*) from accounts),'users',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb))
$$;
create function public.admin_list_accounts(search_text text default '',page_number integer default 1) returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_list_accounts(search_text,page_number) $$;

create function private.begin_password_action(actor uuid,target uuid,request_id uuid,operation text,actor_session uuid,expected_phone text) returns text language plpgsql security definer set search_path='' as $$
declare existing public.admin_password_jobs; meta jsonb; target_meta jsonb; target_email text; begin
 if operation not in ('reset','change') then raise exception 'Invalid action' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
 perform pg_advisory_xact_lock(hashtextextended(target::text,2));
 if not exists(select 1 from auth.sessions where user_id=actor and id=actor_session) then raise exception 'Sesi berakhir. Masuk kembali.' using errcode='42501'; end if;
 select raw_app_meta_data into meta from auth.users where id=actor;
 if operation='reset' and (coalesce(meta->>'makanmana_admin','false')<>'true' or coalesce(meta->>'must_change_password','false')='true' or actor=target) then
  raise exception 'Akses reset ditolak.' using errcode='42501';
 end if;
 if operation='change' and (actor<>target or coalesce(meta->>'must_change_password','false')<>'true') then raise exception 'Akses ditolak.' using errcode='42501'; end if;
 select email,raw_app_meta_data into target_email,target_meta from auth.users where id=target;
 if target_email is null or target_email !~ '^08[0-9]{8,12}@makanmana\.com$' or split_part(target_email,'@',1)<>expected_phone then raise exception 'Akun tujuan tidak cocok.' using errcode='22023'; end if;
 if operation='reset' and coalesce(target_meta->>'makanmana_admin','false')='true' then raise exception 'Password admin tidak dapat direset melalui menu ini.' using errcode='42501'; end if;
 select * into existing from public.admin_password_jobs where id=request_id;
 if found then
  if existing.actor_id<>actor or existing.target_id<>target or existing.action<>operation then raise exception 'Request tidak cocok.' using errcode='42501'; end if;
  return existing.status;
 end if;
 if exists(select 1 from public.admin_password_jobs where target_id=target and status='pending' and created_at>now()-interval '2 minutes') then raise exception 'Perubahan akun masih diproses. Tunggu lalu coba lagi.' using errcode='55P03'; end if;
 if operation='reset' and exists(select 1 from public.admin_password_jobs where target_id=target and action='reset' and status in ('pending','done') and created_at>now()-interval '1 minute') then raise exception 'Akun baru saja direset. Tunggu satu menit.' using errcode='54000'; end if;
 if operation='reset' and (select count(*) from public.admin_password_jobs where actor_id=actor and action='reset' and created_at>now()-interval '10 minutes')>=30 then raise exception 'Batas reset sementara tercapai. Coba lagi nanti.' using errcode='54000'; end if;
 insert into public.admin_password_jobs(id,actor_id,target_id,action,session_id) values(request_id,actor,target,operation,actor_session);
 return 'created';
end $$;
create function public.begin_password_action(actor uuid,target uuid,request_id uuid,operation text,actor_session uuid,expected_phone text) returns text language sql security invoker set search_path='' as $$ select private.begin_password_action(actor,target,request_id,operation,actor_session,expected_phone) $$;

create function private.finish_password_action(request_id uuid,succeeded boolean) returns void language plpgsql security definer set search_path='' as $$
declare job public.admin_password_jobs; begin
 select * into job from public.admin_password_jobs where id=request_id for update;
 if not found then raise exception 'Request tidak ditemukan'; end if;
 if job.status='done' then return; end if;
 if succeeded then
  -- Revoke all previous sessions. Stale access JWTs also fail the RLS session check.
  delete from auth.sessions where user_id=job.target_id;
 end if;
 update public.admin_password_jobs set status=case when succeeded then 'done' else 'failed' end,completed_at=now() where id=request_id;
end $$;
create function public.finish_password_action(request_id uuid,succeeded boolean) returns void language sql security invoker set search_path='' as $$ select private.finish_password_action(request_id,succeeded) $$;

revoke all on function private.admin_list_accounts(text,integer),public.admin_list_accounts(text,integer),
 private.begin_password_action(uuid,uuid,uuid,text,uuid,text),public.begin_password_action(uuid,uuid,uuid,text,uuid,text),
 private.finish_password_action(uuid,boolean),public.finish_password_action(uuid,boolean) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.admin_list_accounts(text,integer),public.admin_list_accounts(text,integer),
 private.begin_password_action(uuid,uuid,uuid,text,uuid,text),public.begin_password_action(uuid,uuid,uuid,text,uuid,text),
 private.finish_password_action(uuid,boolean),public.finish_password_action(uuid,boolean) to service_role;

create function private.admin_session_active(actor uuid,actor_session uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions where user_id=actor and id=actor_session)
$$;
create function public.admin_session_active(actor uuid,actor_session uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.admin_session_active(actor,actor_session) $$;
revoke all on function private.admin_session_active(uuid,uuid),public.admin_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function private.admin_session_active(uuid,uuid),public.admin_session_active(uuid,uuid) to service_role;
