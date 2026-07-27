-- MERCHANT DEPOSITS
-- Track deposits from merchants to admin wallets
create table if not exists merchant_deposits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references profiles(id) on delete cascade,
  admin_wallet_id uuid not null references admin_wallets(id) on delete cascade,
  amount_usdt numeric(18,6) not null,
  transaction_hash text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  proof_url text,
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table merchant_deposits enable row level security;

create policy "merchant_deposits: merchant can view own" on merchant_deposits for select using (auth.uid() = merchant_id or is_admin());
create policy "merchant_deposits: merchant can insert own" on merchant_deposits for insert with check (auth.uid() = merchant_id);
create policy "merchant_deposits: admin can update" on merchant_deposits for update using (is_admin());

-- Function to confirm merchant deposit
create or replace function confirm_merchant_deposit(p_deposit_id uuid, p_admin_id uuid)
returns void language plpgsql security definer as $$
declare
  v_merchant_id uuid;
  v_amount_usdt numeric(18,6);
  v_admin_wallet_id uuid;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  
  -- Get deposit details
  select merchant_id, amount_usdt, admin_wallet_id 
  into v_merchant_id, v_amount_usdt, v_admin_wallet_id
  from merchant_deposits 
  where id = p_deposit_id and status = 'pending';
  
  if not found then raise exception 'Deposit not found or already processed'; end if;
  
  -- Update deposit status
  update merchant_deposits 
  set status = 'confirmed',
      confirmed_by = p_admin_id,
      confirmed_at = now()
  where id = p_deposit_id;
  
  -- Add to merchant balance
  update profiles 
  set balance_usdt = balance_usdt + v_amount_usdt
  where id = v_merchant_id;
  
  -- Update admin wallet balance
  update admin_wallets 
  set balance_usdt = balance_usdt + v_amount_usdt
  where id = v_admin_wallet_id;
end;
$$;

-- Function to reject merchant deposit
create or replace function reject_merchant_deposit(p_deposit_id uuid, p_admin_id uuid, p_reason text)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  
  update merchant_deposits 
  set status = 'rejected',
      rejection_reason = p_reason,
      confirmed_by = p_admin_id,
      confirmed_at = now()
  where id = p_deposit_id and status = 'pending';
end;
$$;
