-- ADMIN WALLETS
-- Pre-configured wallet addresses for merchant deposits
create table if not exists admin_wallets (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  wallet_type text not null check (wallet_type in ('usdt_trc20','usdt_erc20','btc','eth')),
  network text not null,
  label text not null,
  is_active boolean not null default true,
  balance_usdt numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_wallets enable row level security;

create policy "admin_wallets: anyone can view active" on admin_wallets for select using (is_active = true);
create policy "admin_wallets: admin full access" on admin_wallets for all using (is_admin());
