-- User P2P wallets table - admin-configured wallet addresses for P2P trading
create table if not exists user_p2p_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_address text not null,
  wallet_type text not null check (wallet_type in ('trc20', 'erc20', 'bep20', 'native')),
  network text not null,
  label text,
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id),
  unique(user_id, wallet_address)
);

-- Add index for faster lookups
create index idx_user_p2p_wallets_user_id on user_p2p_wallets(user_id);
create index idx_user_p2p_wallets_is_active on user_p2p_wallets(is_active);

-- RLS Policies
alter table user_p2p_wallets enable row level security;

-- Users can view their own P2P wallets
create policy "user_p2p_wallets: users can view own wallets" on user_p2p_wallets for select
  using (auth.uid()::text = user_id::text);

-- Admins can view all P2P wallets
create policy "user_p2p_wallets: admins can view all" on user_p2p_wallets for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Only admins can insert P2P wallets
create policy "user_p2p_wallets: only admins can insert" on user_p2p_wallets for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Only admins can update P2P wallets
create policy "user_p2p_wallets: only admins can update" on user_p2p_wallets for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Only admins can delete P2P wallets
create policy "user_p2p_wallets: only admins can delete" on user_p2p_wallets for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
