-- 3VolutionTurbos - Base de dados inicial
-- Executar no Supabase: SQL Editor -> New query -> colar -> Run.

create extension if not exists pgcrypto;

-- Tabelas ---------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  nif text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_name_idx on public.customers using btree (lower(name));
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_nif_idx on public.customers (nif);

create table if not exists public.work_order_counters (
  year integer primary key,
  last_number integer not null default 0
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  category text not null check (
    category in (
      'Peças de Turbo',
      'Linhas de Escape',
      'Turbos Novos',
      'Reparações de Turbos',
      'Hibridações de Turbos',
      'Preparações de Turbos'
    )
  ),
  status text not null default 'Recebido' check (
    status in ('Recebido', 'Em diagnóstico', 'Em reparação', 'Pronto', 'Entregue')
  ),
  received_at date not null default current_date,
  delivered_at date,
  vehicle_brand_model text,
  license_plate text,
  engine text,
  turbo_reference text,
  issue_description text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_order_number_idx on public.work_orders (order_number);
create index if not exists work_orders_customer_idx on public.work_orders (customer_id);
create index if not exists work_orders_status_idx on public.work_orders (status);
create index if not exists work_orders_received_at_idx on public.work_orders (received_at desc);
create index if not exists work_orders_license_plate_idx on public.work_orders (license_plate);

create table if not exists public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  phase text not null check (phase in ('before', 'after')),
  storage_path text not null unique,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists work_order_photos_work_order_idx
  on public.work_order_photos (work_order_id);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  status text not null check (
    status in ('Recebido', 'Em diagnóstico', 'Em reparação', 'Pronto', 'Entregue')
  ),
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create index if not exists status_history_work_order_idx
  on public.status_history (work_order_id, changed_at desc);

-- Funções / triggers -----------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_updated_at();

drop trigger if exists work_orders_touch_updated_at on public.work_orders;
create trigger work_orders_touch_updated_at
before update on public.work_orders
for each row execute function public.touch_updated_at();

create or replace function public.assign_work_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer;
  n integer;
begin
  if new.order_number is not null then
    return new;
  end if;

  y := extract(year from new.received_at)::integer;

  insert into public.work_order_counters(year, last_number)
  values (y, 1)
  on conflict (year)
  do update set last_number = public.work_order_counters.last_number + 1
  returning last_number into n;

  new.order_number := 'OT-' || y::text || '-' || lpad(n::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists work_orders_assign_number on public.work_orders;
create trigger work_orders_assign_number
before insert on public.work_orders
for each row execute function public.assign_work_order_number();

create or replace function public.log_work_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.status_history(work_order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_log_status on public.work_orders;
create trigger work_orders_log_status
after insert or update of status on public.work_orders
for each row execute function public.log_work_order_status();

-- Criação transacional de cliente + obra --------------------------------------

create or replace function public.create_work_order(
  p_customer_name text,
  p_phone text default null,
  p_nif text default null,
  p_email text default null,
  p_address text default null,
  p_category text default 'Reparações de Turbos',
  p_received_at date default current_date,
  p_vehicle_brand_model text default null,
  p_license_plate text default null,
  p_engine text default null,
  p_turbo_reference text default null,
  p_issue_description text default null,
  p_notes text default null
)
returns table (id uuid, order_number text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.id
    into v_customer_id
  from public.customers c
  where
    (p_nif is not null and p_nif <> '' and c.nif = p_nif)
    or
    (p_phone is not null and p_phone <> '' and c.phone = p_phone)
  order by c.created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers(name, phone, nif, email, address)
    values (
      trim(p_customer_name),
      nullif(trim(p_phone), ''),
      nullif(trim(p_nif), ''),
      nullif(trim(p_email), ''),
      nullif(trim(p_address), '')
    )
    returning customers.id into v_customer_id;
  else
    update public.customers
    set
      name = coalesce(nullif(trim(p_customer_name), ''), name),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      nif = coalesce(nullif(trim(p_nif), ''), nif),
      email = coalesce(nullif(trim(p_email), ''), email),
      address = coalesce(nullif(trim(p_address), ''), address)
    where customers.id = v_customer_id;
  end if;

  insert into public.work_orders(
    customer_id,
    category,
    received_at,
    vehicle_brand_model,
    license_plate,
    engine,
    turbo_reference,
    issue_description,
    notes
  )
  values (
    v_customer_id,
    p_category,
    p_received_at,
    nullif(trim(p_vehicle_brand_model), ''),
    nullif(upper(trim(p_license_plate)), ''),
    nullif(trim(p_engine), ''),
    nullif(trim(p_turbo_reference), ''),
    nullif(trim(p_issue_description), ''),
    nullif(trim(p_notes), '')
  )
  returning work_orders.id, work_orders.order_number
  into v_order_id, v_order_number;

  return query select v_order_id, v_order_number;
end;
$$;

-- Pesquisa rápida --------------------------------------------------------------

create or replace function public.search_work_orders(search_term text)
returns table (
  order_id uuid,
  order_number text,
  customer_name text,
  phone text,
  nif text,
  category text,
  status text,
  received_at date,
  license_plate text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    w.id,
    w.order_number,
    c.name,
    c.phone,
    c.nif,
    w.category,
    w.status,
    w.received_at,
    w.license_plate
  from public.work_orders w
  join public.customers c on c.id = w.customer_id
  where
    nullif(trim(search_term), '') is null
    or c.name ilike '%' || trim(search_term) || '%'
    or coalesce(c.phone, '') ilike '%' || trim(search_term) || '%'
    or coalesce(c.nif, '') ilike '%' || trim(search_term) || '%'
    or coalesce(w.order_number, '') ilike '%' || trim(search_term) || '%'
    or coalesce(w.license_plate, '') ilike '%' || trim(search_term) || '%'
    or coalesce(w.turbo_reference, '') ilike '%' || trim(search_term) || '%'
  order by w.created_at desc
  limit 100;
$$;

-- Segurança (RLS) --------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_photos enable row level security;
alter table public.status_history enable row level security;

drop policy if exists "authenticated customers select" on public.customers;
create policy "authenticated customers select"
on public.customers for select to authenticated using (true);

drop policy if exists "authenticated customers insert" on public.customers;
create policy "authenticated customers insert"
on public.customers for insert to authenticated with check (true);

drop policy if exists "authenticated customers update" on public.customers;
create policy "authenticated customers update"
on public.customers for update to authenticated using (true) with check (true);

drop policy if exists "authenticated work orders select" on public.work_orders;
create policy "authenticated work orders select"
on public.work_orders for select to authenticated using (true);

drop policy if exists "authenticated work orders insert" on public.work_orders;
create policy "authenticated work orders insert"
on public.work_orders for insert to authenticated with check (true);

drop policy if exists "authenticated work orders update" on public.work_orders;
create policy "authenticated work orders update"
on public.work_orders for update to authenticated using (true) with check (true);

drop policy if exists "authenticated photos select" on public.work_order_photos;
create policy "authenticated photos select"
on public.work_order_photos for select to authenticated using (true);

drop policy if exists "authenticated photos insert" on public.work_order_photos;
create policy "authenticated photos insert"
on public.work_order_photos for insert to authenticated with check (true);

drop policy if exists "authenticated photos delete" on public.work_order_photos;
create policy "authenticated photos delete"
on public.work_order_photos for delete to authenticated using (true);

drop policy if exists "authenticated history select" on public.status_history;
create policy "authenticated history select"
on public.status_history for select to authenticated using (true);

-- Storage ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('work-order-photos', 'work-order-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "authenticated can read work order photos" on storage.objects;
create policy "authenticated can read work order photos"
on storage.objects for select to authenticated
using (bucket_id = 'work-order-photos');

drop policy if exists "authenticated can upload work order photos" on storage.objects;
create policy "authenticated can upload work order photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'work-order-photos');

drop policy if exists "authenticated can delete work order photos" on storage.objects;
create policy "authenticated can delete work order photos"
on storage.objects for delete to authenticated
using (bucket_id = 'work-order-photos');

-- Realtime --------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'work_orders'
  ) then
    execute 'alter publication supabase_realtime add table public.work_orders';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'work_order_photos'
  ) then
    execute 'alter publication supabase_realtime add table public.work_order_photos';
  end if;
end $$;
