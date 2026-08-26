-- BIANCA & RUBEN WEDDING REGISTRY — ADMIN SETUP
-- Run this ONCE in Supabase > SQL Editor AFTER the original supabase.sql.
-- This adds authenticated admin access and a storage bucket for registry images.

-- Authenticated users may manage all gifts.
drop policy if exists "admin can read all gifts" on public.gifts;
create policy "admin can read all gifts"
on public.gifts for select
to authenticated
using (true);

drop policy if exists "admin can insert gifts" on public.gifts;
create policy "admin can insert gifts"
on public.gifts for insert
to authenticated
with check (true);

drop policy if exists "admin can update gifts" on public.gifts;
create policy "admin can update gifts"
on public.gifts for update
to authenticated
using (true)
with check (true);

drop policy if exists "admin can delete gifts" on public.gifts;
create policy "admin can delete gifts"
on public.gifts for delete
to authenticated
using (true);

-- Reservation details remain private from guests, but authenticated admins may view/manage them.
drop policy if exists "admin can read reservations" on public.reservations;
create policy "admin can read reservations"
on public.reservations for select
to authenticated
using (true);

drop policy if exists "admin can update reservations" on public.reservations;
create policy "admin can update reservations"
on public.reservations for update
to authenticated
using (true)
with check (true);

drop policy if exists "admin can delete reservations" on public.reservations;
create policy "admin can delete reservations"
on public.reservations for delete
to authenticated
using (true);

-- Keep the guest reservation RPC usable by both logged-out guests and admins.
grant execute on function public.reserve_gift(uuid,text,text,integer,text) to anon, authenticated;

-- Admin RPC: change reservation status while keeping gift quantity counters correct.
create or replace function public.admin_change_reservation_status(
  p_reservation_id uuid,
  p_new_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res reservations%rowtype;
  v_gift gifts%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authorized';
  end if;

  if p_new_status not in ('reserved','purchased','released') then
    raise exception 'invalid status';
  end if;

  select * into v_res
  from reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'reservation not found'; end if;

  if v_res.status = p_new_status then return; end if;

  select * into v_gift
  from gifts
  where id = v_res.gift_id
  for update;

  -- Remove the old status quantity.
  if v_res.status = 'reserved' then
    update gifts
    set quantity_reserved = greatest(0, quantity_reserved - v_res.quantity), updated_at = now()
    where id = v_res.gift_id;
  elsif v_res.status = 'purchased' then
    update gifts
    set quantity_purchased = greatest(0, quantity_purchased - v_res.quantity), updated_at = now()
    where id = v_res.gift_id;
  end if;

  -- Apply the new status quantity, if active.
  if p_new_status in ('reserved','purchased') then
    select * into v_gift from gifts where id = v_res.gift_id for update;

    if (v_gift.quantity_wanted - v_gift.quantity_reserved - v_gift.quantity_purchased) < v_res.quantity then
      raise exception 'not enough gift quantity available';
    end if;

    if p_new_status = 'reserved' then
      update gifts
      set quantity_reserved = quantity_reserved + v_res.quantity, updated_at = now()
      where id = v_res.gift_id;
    else
      update gifts
      set quantity_purchased = quantity_purchased + v_res.quantity, updated_at = now()
      where id = v_res.gift_id;
    end if;
  end if;

  update reservations
  set status = p_new_status, updated_at = now()
  where id = p_reservation_id;
end;
$$;

grant execute on function public.admin_change_reservation_status(uuid,text) to authenticated;

-- Public image bucket. Only authenticated admins can upload/change/delete files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'registry-images',
  'registry-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view registry images" on storage.objects;
create policy "public can view registry images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'registry-images');

drop policy if exists "admin can upload registry images" on storage.objects;
create policy "admin can upload registry images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'registry-images');

drop policy if exists "admin can update registry images" on storage.objects;
create policy "admin can update registry images"
on storage.objects for update
to authenticated
using (bucket_id = 'registry-images')
with check (bucket_id = 'registry-images');

drop policy if exists "admin can delete registry images" on storage.objects;
create policy "admin can delete registry images"
on storage.objects for delete
to authenticated
using (bucket_id = 'registry-images');
