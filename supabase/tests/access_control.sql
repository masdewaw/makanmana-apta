-- Run only after harden_access_and_reliability has been applied.
-- Existing accounts are impersonated using transaction-local claims, without passwords.
-- Every fixture and any 8-hour cleanup performed during this test is rolled back.
begin;
select set_config('test.user_a',(select id::text from public.profiles where role='user' order by id limit 1),true);
select set_config('test.user_b',(select id::text from public.profiles where role='user' order by id offset 1 limit 1),true);
select set_config('test.ob',(select id::text from public.profiles where role='OB' and ob_code is not null order by id limit 1),true);
select set_config('test.old_order',gen_random_uuid()::text,true);
select set_config('test.fresh_order',gen_random_uuid()::text,true);
select set_config('test.foreign_order',gen_random_uuid()::text,true);
select set_config('test.bill',gen_random_uuid()::text,true);
select set_config('test.item',gen_random_uuid()::text,true);
insert into public.orders(id,user_id,food_name,price,payment_method,created_at) values
(current_setting('test.old_order')::uuid,current_setting('test.user_a')::uuid,'Security test old',1000,'cash',now()-interval '9 hours'),
(current_setting('test.fresh_order')::uuid,current_setting('test.user_a')::uuid,'Security test fresh',1000,'cash',now()-interval '7 hours'),
(current_setting('test.foreign_order')::uuid,current_setting('test.user_b')::uuid,'Security test foreign',1000,'cash',now()-interval '9 hours');
insert into public.split_bills(id,creator_id,title,status) values(current_setting('test.bill')::uuid,current_setting('test.user_b')::uuid,'Security test','open');
insert into public.split_bill_items(id,split_bill_id,item_name,price,user_id) values(current_setting('test.item')::uuid,current_setting('test.bill')::uuid,'Security test',1000,current_setting('test.user_b')::uuid);

do $$ begin
 if has_table_privilege('anon','public.orders','SELECT') or has_table_privilege('anon','public.profiles','UPDATE') then raise exception 'Anonymous table privileges remain'; end if;
 if has_function_privilege('anon','public.complete_expired_orders()','EXECUTE') then raise exception 'Anonymous cleanup access remains'; end if;
 if (select public from storage.buckets where id='payment-proofs') then raise exception 'Proof bucket is public'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.user_a'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$ declare changed integer; begin
 if (select count(*) from public.orders where id=current_setting('test.foreign_order')::uuid)<>0 then raise exception 'Foreign order visible'; end if;
 if (select count(*) from public.orders where id=current_setting('test.old_order')::uuid)<>1 then raise exception 'Own order invisible'; end if;
 begin update public.profiles set role='OB' where id=auth.uid(); raise exception 'Role escalation allowed'; exception when insufficient_privilege then null; end;
 begin update public.profiles set ob_code='OB 1' where id=auth.uid(); raise exception 'OB identity escalation allowed'; exception when insufficient_privilege then null; end;
 begin update public.profiles set last_lat=1 where id=auth.uid(); raise exception 'Staff location write allowed'; exception when insufficient_privilege then null; end;
 update public.profiles set name=name where id=auth.uid();
 update public.orders set payment_status='paid' where id=current_setting('test.old_order')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Staff payment verification allowed'; end if;
 begin insert into public.orders(user_id,food_name,price,payment_method) values(current_setting('test.user_b')::uuid,'Forged',1000,'cash'); raise exception 'Foreign order insert allowed'; exception when insufficient_privilege then null; end;
 insert into public.orders(user_id,food_name,price,payment_method) values(auth.uid(),'Own test order',1000,'cash');
 update public.split_bill_items set user_id=auth.uid() where id=current_setting('test.item')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Another participant item stolen'; end if;
 perform public.community_orders(); perform public.food_rankings();
 perform public.complete_expired_orders();
 if (select order_status from public.orders where id=current_setting('test.old_order')::uuid)<>'done' then raise exception '8-hour completion failed'; end if;
 if (select order_status from public.orders where id=current_setting('test.fresh_order')::uuid)<>'waiting' then raise exception 'Fresh order completed'; end if;
end $$;
-- Atomic split bill: valid save succeeds, invalid item leaves no bill behind.
do $$ declare before_count bigint; begin
 select count(*) into before_count from public.split_bills where creator_id=auth.uid();
 begin perform public.create_split_bill('Invalid test','', '[{"itemName":"Invalid","price":-1,"itemType":"food"}]'::jsonb);
 raise exception 'Invalid bill accepted'; exception when insufficient_privilege then null; end;
 if (select count(*) from public.split_bills where creator_id=auth.uid())<>before_count then raise exception 'Orphan bill created'; end if;
 perform public.create_split_bill('Valid test','', '[{"itemName":"Food","price":1000,"itemType":"food"}]'::jsonb);
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.ob'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.ob'),true);
do $$ declare changed integer; begin
 if not private.is_ob() then raise exception 'OB identity missing'; end if;
 if (select count(*) from public.orders where id=current_setting('test.foreign_order')::uuid)<>1 then raise exception 'OB cannot see queue'; end if;
 update public.orders set payment_status='paid',assigned_to_ob=private.my_ob_code() where id=current_setting('test.foreign_order')::uuid;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'OB cannot verify payment'; end if;
 update public.profiles set last_lat=0,last_lng=0,last_updated_at=now() where id=auth.uid();
end $$;
reset role;
select 'PASS: anon denied, ownership, role protection, OB identity, 8-hour rule, item claims, atomic bill (all rolled back)' as result;
rollback;
