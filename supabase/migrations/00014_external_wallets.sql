-- External wallet addresses for users (Bybit, Binance, etc.)
-- Only admin can configure these for KYC-approved users

create table if not exists external_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_type text not null, -- e.g., 'Bybit', 'Binance', 'OKX', 'KuCoin', etc.
  wallet_address text not null,
  network text, -- e.g., 'TRC20', 'ERC20', 'BEP20', etc.
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table external_wallets enable row level security;

-- Users can only view their own external wallets
create policy "Users can view own external wallets"
  on external_wallets for select
  using (auth.uid() = user_id);

-- Admins can view all external wallets
create policy "Admins can view all external wallets"
  on external_wallets for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can insert external wallets
create policy "Admins can insert external wallets"
  on external_wallets for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can update external wallets
create policy "Admins can update external wallets"
  on external_wallets for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can delete external wallets
create policy "Admins can delete external wallets"
  on external_wallets for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Index for faster lookups
create index if not exists idx_external_wallets_user_id on external_wallets(user_id);
create index if not exists idx_external_wallets_wallet_type on external_wallets(wallet_type);

-- Updated at trigger
create trigger update_external_wallets_updated_at
  before update on external_wallets
  for each row
  execute function update_updated_at_column();
