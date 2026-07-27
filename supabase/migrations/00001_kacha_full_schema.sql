
-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  is_kyc_verified boolean not null default false,
  is_banned boolean not null default false,
  balance_usdt numeric(18,6) not null default 0,
  balance_etb numeric(18,2) not null default 0,
  total_trades integer not null default 0,
  completed_trades integer not null default 0,
  completion_rate numeric(5,2) not null default 0,
  average_rating numeric(3,2) not null default 0,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: users can view all" on profiles for select using (true);
create policy "profiles: users can update own" on profiles for update using (auth.uid() = id);
create policy "profiles: admin full" on profiles for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- trigger: create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- KYC APPLICATIONS
create table if not exists kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text not null default '',
  document_type text not null default 'national_id' check (document_type in ('national_id','passport','driver_license')),
  document_number text not null default '',
  id_document_url text,
  back_document_url text,
  selfie_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','under_review')),
  rejection_reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table kyc_applications enable row level security;

-- helper: is current user admin
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "kyc: user can view own" on kyc_applications for select using (auth.uid() = user_id or is_admin());
create policy "kyc: user can insert own" on kyc_applications for insert with check (auth.uid() = user_id);
create policy "kyc: admin can update" on kyc_applications for update using (is_admin());

-- enable realtime
alter publication supabase_realtime add table kyc_applications;

-- OFFERS
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('buy','sell')),
  amount_usdt numeric(18,6) not null,
  exchange_rate numeric(10,4) not null,
  min_limit_etb numeric(18,2) not null default 0,
  max_limit_etb numeric(18,2) not null default 0,
  payment_methods text[] not null default '{}',
  terms_conditions text,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table offers enable row level security;

create policy "offers: anyone can view active" on offers for select using (true);
create policy "offers: user can insert own" on offers for insert with check (auth.uid() = user_id);
create policy "offers: user can update own" on offers for update using (auth.uid() = user_id or is_admin());
create policy "offers: admin can delete" on offers for delete using (is_admin());

-- TRADES
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  amount_usdt numeric(18,6) not null,
  amount_etb numeric(18,2) not null,
  exchange_rate numeric(10,4) not null,
  payment_method text,
  status text not null default 'initiated' check (status in ('initiated','payment_pending','payment_confirmed','completed','cancelled','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trades enable row level security;

create policy "trades: parties can view own" on trades for select using (auth.uid() = buyer_id or auth.uid() = seller_id or is_admin());
create policy "trades: auth users can insert" on trades for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "trades: parties can update" on trades for update using (auth.uid() = buyer_id or auth.uid() = seller_id or is_admin());

alter publication supabase_realtime add table trades;

-- TRADE MESSAGES
create table if not exists trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  is_system_message boolean not null default false,
  created_at timestamptz not null default now()
);

alter table trade_messages enable row level security;

create policy "msgs: trade parties can view" on trade_messages for select using (
  exists (select 1 from trades t where t.id = trade_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid() or is_admin()))
);
create policy "msgs: trade parties can insert" on trade_messages for insert with check (
  exists (select 1 from trades t where t.id = trade_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid()))
);

alter publication supabase_realtime add table trade_messages;

-- DISPUTES
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id),
  opened_by uuid not null references profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved','closed')),
  resolution_notes text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table disputes enable row level security;

create policy "disputes: parties and admin can view" on disputes for select using (
  auth.uid() = opened_by or is_admin() or
  exists(select 1 from trades t where t.id = trade_id and (t.buyer_id = auth.uid() or t.seller_id = auth.uid()))
);
create policy "disputes: auth can insert" on disputes for insert with check (auth.uid() = opened_by);
create policy "disputes: admin can update" on disputes for update using (is_admin());

-- STORAGE BUCKET for KYC
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', true)
on conflict (id) do nothing;

create policy "kyc bucket: user upload" on storage.objects for insert
  with check (bucket_id = 'kyc' and auth.uid() is not null);
create policy "kyc bucket: user view own" on storage.objects for select
  using (bucket_id = 'kyc' and (auth.uid()::text = (storage.foldername(name))[1] or is_admin()));

-- admin rpc: transfer funds
create or replace function admin_transfer_funds(
  p_from_user uuid, p_to_user uuid,
  p_amount_usdt numeric, p_amount_etb numeric, p_reason text
) returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_from_user is not null and p_amount_usdt > 0 then
    update profiles set balance_usdt = balance_usdt - p_amount_usdt where id = p_from_user;
  end if;
  if p_to_user is not null and p_amount_usdt > 0 then
    update profiles set balance_usdt = balance_usdt + p_amount_usdt where id = p_to_user;
  end if;
  if p_from_user is not null and p_amount_etb > 0 then
    update profiles set balance_etb = balance_etb - p_amount_etb where id = p_from_user;
  end if;
  if p_to_user is not null and p_amount_etb > 0 then
    update profiles set balance_etb = balance_etb + p_amount_etb where id = p_to_user;
  end if;
end;
$$;
