-- BIANCA & RUBEN WEDDING REGISTRY — SUPABASE SETUP
-- Run once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  brand text,
  price numeric(10,2) check (price is null or price >= 0),
  image_url text,
  store_url text,
  quantity_wanted integer not null default 1 check (quantity_wanted > 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  quantity_purchased integer not null default 0 check (quantity_purchased >= 0),
  featured boolean not null default false,
  open_choice boolean not null default false,
  is_visible boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_quantities_valid check (quantity_reserved + quantity_purchased <= quantity_wanted)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  guest_name text not null,
  guest_contact text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null check (status in ('reserved','purchased','released')),
  reservation_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_gift_id_idx on public.reservations(gift_id);
create unique index if not exists reservations_token_idx on public.reservations(reservation_token);

alter table public.gifts enable row level security;
alter table public.reservations enable row level security;

-- Public guests may only read the curated gift catalogue.
drop policy if exists "public can read visible gifts" on public.gifts;
create policy "public can read visible gifts" on public.gifts for select to anon using (is_visible = true);

-- Deliberately NO public SELECT policy on reservations: guest names/contact details stay private.
-- Deliberately NO public direct INSERT/UPDATE policies: reservations go through the security-definer RPC below.

create or replace function public.reserve_gift(
  p_gift_id uuid,
  p_guest_name text,
  p_guest_contact text,
  p_quantity integer,
  p_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift gifts%rowtype;
  v_reservation_id uuid;
begin
  if coalesce(trim(p_guest_name),'') = '' or coalesce(trim(p_guest_contact),'') = '' then
    raise exception 'name and contact are required';
  end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'invalid quantity'; end if;
  if p_status not in ('reserved','purchased') then raise exception 'invalid status'; end if;

  -- Locks this gift row: two guests cannot claim the same last unit simultaneously.
  select * into v_gift from gifts where id=p_gift_id and is_visible=true for update;
  if not found then raise exception 'gift not found'; end if;
  if (v_gift.quantity_wanted-v_gift.quantity_reserved-v_gift.quantity_purchased) < p_quantity then
    raise exception 'not enough gifts available';
  end if;

  insert into reservations(gift_id,guest_name,guest_contact,quantity,status)
  values(p_gift_id,trim(p_guest_name),trim(p_guest_contact),p_quantity,p_status)
  returning id into v_reservation_id;

  if p_status='reserved' then
    update gifts set quantity_reserved=quantity_reserved+p_quantity,updated_at=now() where id=p_gift_id;
  else
    update gifts set quantity_purchased=quantity_purchased+p_quantity,updated_at=now() where id=p_gift_id;
  end if;
  return v_reservation_id;
end;
$$;

grant execute on function public.reserve_gift(uuid,text,text,integer,text) to anon;

-- Enable Realtime for the public gift availability fields.
do $$ begin
  alter publication supabase_realtime add table public.gifts;
exception when duplicate_object then null;
end $$;

-- Starter gifts. Replace/edit freely in Supabase Table Editor.
insert into public.gifts(name,description,category,brand,price,quantity_wanted,featured,open_choice,display_order)
select * from (values
 ('Signature Round Casserole','A forever kitchen piece for Sunday lunches, slow dinners and everything in between.','Kitchen','Le Creuset',6499,1,true,false,10),
 ('White Bath Towel Set','Thick, hotel-style white cotton towels. No particular brand — choose something beautiful and classic.','Bedroom & Bath','Open choice',null,4,true,true,20),
 ('Champagne Flutes','Elegant, timeless glasses for celebrations at home.','Dining','Open choice',null,2,false,true,30),
 ('Air Fryer','A practical everyday appliance for our kitchen.','Kitchen','Preferred quality brand',2500,1,false,false,40),
 ('Serving Platter','A beautiful neutral platter for long-table dinners and entertaining.','Entertaining','Weylandts / @home style',900,2,true,true,50),
 ('Date Night Dinner','Contribute towards a special dinner together during our first year of marriage.','Experiences','Experience',1500,3,false,true,60)
) as seed(name,description,category,brand,price,quantity_wanted,featured,open_choice,display_order)
where not exists (select 1 from public.gifts);
