-- Each orders row already represents one portion. Keep historic notes unchanged.
comment on column public.orders.catatan is 'Optional note specific to this menu/portion. The cart copies the menu note to each portion when quantity is greater than one; not a checkout-wide note.';
alter table public.orders add constraint orders_catatan_max_length
 check (catatan is null or char_length(catatan) <= 500) not valid;
alter table public.orders validate constraint orders_catatan_max_length;
-- Existing grants and ownership/OB RLS policies remain unchanged.
