-- Production hardening. No orders or uploaded files are deleted.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.profiles add column if not exists ob_code text unique
  check (ob_code in ('OB 1','OB 2'));
-- One-time migration of the two verified legacy accounts; no generated IDs embedded.
update public.profiles set ob_code = case name when 'Bahul' then 'OB 1' when 'Masber' then 'OB 2' end
where role = 'OB' and ob_code is null and name in ('Bahul','Masber');
do $$ begin
 if exists(select 1 from public.profiles where role='OB' and ob_code is null) then
 raise exception 'An OB account needs an explicit code before hardening'; end if;
end $$;

create or replace function private.is_ob() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'OB' and ob_code is not null) $$;
create or replace function private.my_ob_code() returns text language sql stable security definer
set search_path = '' as $$ select ob_code from public.profiles where id = auth.uid() and role = 'OB' $$;

-- Protect location fields in addition to column privileges protecting role/ob_code.
create or replace function private.guard_profile_location() returns trigger language plpgsql
set search_path = '' as $$ begin
  if current_user in ('anon','authenticated') and not private.is_ob() and
    (new.last_lat is distinct from old.last_lat or new.last_lng is distinct from old.last_lng or new.last_updated_at is distinct from old.last_updated_at)
  then raise exception 'Only OB can publish a location' using errcode='42501'; end if;
  return new;
end $$;
create trigger guard_profile_location before update on public.profiles
for each row execute function private.guard_profile_location();

-- Signup works even when email confirmation means no session is available yet.
create or replace function private.create_signup_profile() returns trigger language plpgsql security definer
set search_path = '' as $$ begin
 insert into public.profiles(id,name,role) values(new.id,coalesce(nullif(btrim(new.raw_user_meta_data->>'name'),''),'Karyawan'),'user')
 on conflict(id) do nothing;
 return new;
end $$;
create trigger create_signup_profile after insert on auth.users for each row execute function private.create_signup_profile();

create or replace function private.owns_proof(reference text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from storage.objects s where s.bucket_id='payment-proofs' and s.owner_id=auth.uid()::text
 and s.name=case when reference like '%/payment-proofs/%' then split_part(reference,'/payment-proofs/',2) else reference end) $$;

-- Replace all existing public-table policies, including permissive duplicates.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
 and tablename in ('profiles','menus','categories','favorites','orders','tardut_requests','split_bills','split_bill_items','teman_makan_groups','teman_makan_orders') loop
 execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;
revoke all on public.profiles,public.menus,public.categories,public.favorites,public.orders,public.tardut_requests,
 public.split_bills,public.split_bill_items,public.teman_makan_groups,public.teman_makan_orders from public,anon,authenticated;
grant select on public.profiles,public.menus,public.categories,public.favorites,public.orders,public.tardut_requests,
 public.split_bills,public.split_bill_items,public.teman_makan_groups,public.teman_makan_orders to authenticated;
grant insert(id,name) on public.profiles to authenticated;
grant update(name,last_lat,last_lng,last_updated_at) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_create on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

-- Catalog is visible inside the office app; only OB may edit it.
grant insert,update,delete on public.menus,public.categories to authenticated;
create policy menus_read on public.menus for select to authenticated using(true);
create policy menus_ob on public.menus for all to authenticated using(private.is_ob()) with check(private.is_ob() and price>0 and length(btrim(food_name))>0);
create policy categories_read on public.categories for select to authenticated using(true);
create policy categories_ob on public.categories for all to authenticated using(private.is_ob()) with check(private.is_ob() and length(btrim(name))>0);
grant insert,delete on public.favorites to authenticated;
create policy favorites_own on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

grant insert(id,user_id,food_name,price,payment_method,proof_url,catatan,transfer_to) on public.orders to authenticated;
grant update(order_status,payment_status,assigned_to_ob) on public.orders to authenticated;
create policy orders_read on public.orders for select to authenticated using(user_id=auth.uid() or private.is_ob());
create policy orders_create on public.orders for insert to authenticated with check(
 user_id=auth.uid() and order_status='waiting' and payment_status='pending' and assigned_to_ob is null and price>0 and length(btrim(food_name))>0 and (proof_url is null or private.owns_proof(proof_url)) and (payment_method='cash' or proof_url is not null));
create policy orders_ob_update on public.orders for update to authenticated using(private.is_ob())
 with check(private.is_ob() and (assigned_to_ob is null or assigned_to_ob=private.my_ob_code()));

grant insert(user_id,amount,proof_url,status) on public.tardut_requests to authenticated;
grant update(status,assigned_to_ob) on public.tardut_requests to authenticated;
create policy tardut_read on public.tardut_requests for select to authenticated using(user_id=auth.uid() or private.is_ob());
create policy tardut_create on public.tardut_requests for insert to authenticated with check(user_id=auth.uid() and status='waiting' and assigned_to_ob is null and amount>0 and amount=trunc(amount) and private.owns_proof(proof_url));
create policy tardut_ob_update on public.tardut_requests for update to authenticated using(private.is_ob())
 with check(private.is_ob() and (assigned_to_ob is null or assigned_to_ob=private.my_ob_code()));

grant insert on public.teman_makan_groups,public.split_bills to authenticated;
grant update(status) on public.teman_makan_groups,public.split_bills to authenticated;
create policy tm_groups_read on public.teman_makan_groups for select to authenticated using(true);
create policy tm_groups_create on public.teman_makan_groups for insert to authenticated with check(creator_id=auth.uid() and status='open');
create policy tm_groups_finish on public.teman_makan_groups for update to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid() and status in ('open','finished'));
create policy bills_read on public.split_bills for select to authenticated using(true);
create policy bills_create on public.split_bills for insert to authenticated with check(creator_id=auth.uid() and status='open');
create policy bills_finish on public.split_bills for update to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid() and status in ('open','finished'));
grant insert,delete on public.teman_makan_orders to authenticated;
create policy tm_orders_read on public.teman_makan_orders for select to authenticated using(true);
create policy tm_orders_create on public.teman_makan_orders for insert to authenticated with check(user_id=auth.uid() and price>0 and length(btrim(menu_name))>0 and exists(
 select 1 from public.teman_makan_groups g where g.id=group_id and g.status='open' and (g.deadline is null or g.deadline>now())));
create policy tm_orders_delete on public.teman_makan_orders for delete to authenticated using(exists(
 select 1 from public.teman_makan_groups g where g.id=group_id and g.status='open' and (user_id=auth.uid() or g.creator_id=auth.uid())));

grant insert on public.split_bill_items to authenticated;
grant update(user_id) on public.split_bill_items to authenticated;
create policy items_read on public.split_bill_items for select to authenticated using(true);
create policy items_create on public.split_bill_items for insert to authenticated with check(length(btrim(item_name))>0 and
 price=trunc(price) and item_type in ('food','shared') and (item_type='shared' or price>0) and exists(
 select 1 from public.split_bills b where b.id=split_bill_id and b.creator_id=auth.uid() and b.status='open'));
create policy items_claim on public.split_bill_items for update to authenticated using(exists(
 select 1 from public.split_bills b where b.id=split_bill_id and b.status='open' and
 (b.creator_id=auth.uid() or (item_type='food' and (user_id is null or user_id=auth.uid())))))
 with check(exists(select 1 from public.split_bills b where b.id=split_bill_id and b.status='open' and
 (b.creator_id=auth.uid() or (item_type='food' and (user_id is null or user_id=auth.uid())))));

alter table public.split_bills alter column status set default 'open';

-- Narrow privileged operations live outside exposed schemas. API wrappers are invokers.
create or replace function private.complete_expired_orders() returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.orders set order_status='done' where order_status<>'done' and created_at<now()-interval '8 hours';
end $$;
create or replace function public.complete_expired_orders() returns void language sql security invoker set search_path='' as $$ select private.complete_expired_orders() $$;
create or replace function private.community_orders() returns table(id uuid,food_name text,price integer,created_at timestamptz,profiles jsonb)
language sql stable security definer set search_path='' as $$
 select o.id,o.food_name,o.price,o.created_at,jsonb_build_object('name',p.name) from public.orders o
 left join public.profiles p on p.id=o.user_id where auth.uid() is not null and o.created_at>now()-interval '2 hours'
 order by o.created_at desc limit 10 $$;
create or replace function public.community_orders() returns table(id uuid,food_name text,price integer,created_at timestamptz,profiles jsonb)
language sql stable security invoker set search_path='' as $$ select * from private.community_orders() $$;
create or replace function private.food_rankings() returns table(food_name text,count bigint)
language sql stable security definer set search_path='' as $$
 select o.food_name,count(*) from public.orders o where auth.uid() is not null group by o.food_name order by count(*) desc,o.food_name limit 10 $$;
create or replace function public.food_rankings() returns table(food_name text,count bigint)
language sql stable security invoker set search_path='' as $$ select * from private.food_rankings() $$;

-- Protect legacy root paths too, using owner_id or the requesting order's ownership.
create or replace function private.can_read_proof(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.is_ob() or exists(select 1 from storage.objects s where s.bucket_id='payment-proofs' and s.name=object_name and s.owner_id=auth.uid()::text)
 or exists(select 1 from public.orders o where o.user_id=auth.uid() and (o.proof_url=object_name or split_part(o.proof_url,'/payment-proofs/',2)=object_name))
 or exists(select 1 from public.tardut_requests t where t.user_id=auth.uid() and (t.proof_url=object_name or split_part(t.proof_url,'/payment-proofs/',2)=object_name))) $$;
-- Only replace this app's two storage policies; unrelated buckets stay untouched.
drop policy if exists "Allow Authenticated Upload" on storage.objects;
drop policy if exists "Allow Public Access" on storage.objects;
create policy payment_proof_upload on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy payment_proof_read on storage.objects for select to authenticated using(bucket_id='payment-proofs' and private.can_read_proof(name));
update storage.buckets set public=false,file_size_limit=10485760,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif'] where id='payment-proofs';

-- Lock privileged helpers and existing maintenance functions down.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_ob(),private.my_ob_code(),private.complete_expired_orders(),private.community_orders(),private.food_rankings(),private.can_read_proof(text),private.owns_proof(text) to authenticated;
grant execute on function private.guard_profile_location() to authenticated;
revoke all on function public.complete_expired_orders(),public.community_orders(),public.food_rankings() from public,anon;
grant execute on function public.complete_expired_orders(),public.community_orders(),public.food_rankings() to authenticated;
revoke execute on function public.rls_auto_enable(),public.cleanup_stale_locations() from public,anon,authenticated;
alter function public.cleanup_stale_locations() set search_path='';

-- One transaction for the bill and its items: no orphan bill on a failed save.
create or replace function private.create_split_bill(bill_title text, payment_info text, bill_items jsonb)
returns public.split_bills language plpgsql security invoker set search_path='' as $$
declare result public.split_bills; begin
 if auth.uid() is null or nullif(btrim(bill_title),'') is null or jsonb_typeof(bill_items)<>'array' or jsonb_array_length(bill_items)=0
 then raise exception 'Title and items are required' using errcode='22023'; end if;
 insert into public.split_bills(creator_id,title,bank_info,status) values(auth.uid(),btrim(bill_title),payment_info,'open') returning * into result;
 insert into public.split_bill_items(split_bill_id,item_name,price,item_type,user_id)
 select result.id,btrim(i->>'itemName'),(i->>'price')::numeric,i->>'itemType',nullif(i->>'userId','')::uuid from jsonb_array_elements(bill_items) i;
 return result;
end $$;
create or replace function public.create_split_bill(bill_title text, payment_info text, bill_items jsonb)
returns public.split_bills language sql security invoker set search_path='' as $$ select private.create_split_bill(bill_title,payment_info,bill_items) $$;
revoke all on function private.create_split_bill(text,text,jsonb),public.create_split_bill(text,text,jsonb) from public,anon;
grant execute on function private.create_split_bill(text,text,jsonb),public.create_split_bill(text,text,jsonb) to authenticated;
