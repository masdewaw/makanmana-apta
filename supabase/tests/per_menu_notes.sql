-- Verify note isolation with real RLS. Everything is rolled back.
begin;
select set_config('test.note_user',(select id::text from public.profiles where role='user' order by id limit 1),true);
select set_config('test.note_ob',(select id::text from public.profiles where role='OB' and ob_code is not null order by id limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.note_user'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.note_user'),'role','authenticated')::text,true);
do $$ declare ids uuid[]; begin
 with inserted as (
 insert into public.orders(user_id,food_name,price,payment_method,catatan) values
 (auth.uid(),'Test menu A',1000,'cash','Sambal dipisah'),
 (auth.uid(),'Test menu A',1000,'cash','Sambal dipisah'),
 (auth.uid(),'Test menu B',1000,'cash','Tanpa es') returning id
 ) select array_agg(id) into ids from inserted;
 perform set_config('test.note_ids',array_to_string(ids,','),true);
 if (select count(*) from public.orders where id=any(ids) and food_name='Test menu A' and catatan='Sambal dipisah')<>2 then raise exception 'Portion notes were not preserved'; end if;
 if (select count(*) from public.orders where id=any(ids) and food_name='Test menu B' and catatan='Tanpa es')<>1 then raise exception 'Menu notes mixed'; end if;
 insert into public.orders(user_id,food_name,price,payment_method,catatan) values(auth.uid(),'No note test',1000,'cash',null);
 insert into public.orders(user_id,food_name,price,payment_method,catatan) values(auth.uid(),'Boundary test',1000,'cash',repeat('a',500));
 begin
 insert into public.orders(user_id,food_name,price,payment_method,catatan) values(auth.uid(),'Too long test',1000,'cash',repeat('a',501));
 raise exception 'Oversized note accepted';
 exception when check_violation then null; end;
 begin update public.orders set catatan='Changed after checkout' where id=ids[1];
 raise exception 'Post-checkout note edit unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.note_ob'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.note_ob'),'role','authenticated')::text,true);
do $$ begin
 if (select count(*) from public.orders where id=any(string_to_array(current_setting('test.note_ids'),',')::uuid[]) and catatan in ('Sambal dipisah','Tanpa es'))<>3 then raise exception 'OB cannot read per-menu notes'; end if;
end $$;
reset role;
select 'PASS: distinct menu notes, repeated portions, empty/500-char notes, oversized rejection, OB read and RLS (rolled back)' as result;
rollback;
