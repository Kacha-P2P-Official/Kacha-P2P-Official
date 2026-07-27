-- Admin-only functions for merchant transfers and refunds

-- Function to transfer funds from admin wallet to merchant
create or replace function transfer_to_merchant(
  p_admin_id uuid,
  p_merchant_id uuid,
  p_admin_wallet_id uuid,
  p_amount_usdt numeric,
  p_notes text default null
) returns void as $$
declare
  v_admin_role text;
  v_wallet_balance numeric;
  v_merchant_is_merchant boolean;
begin
  -- Verify admin role
  select role into v_admin_role from profiles where id = p_admin_id;
  if v_admin_role != 'admin' then
    raise exception 'Only admins can perform transfers';
  end if;

  -- Verify merchant status
  select is_merchant into v_merchant_is_merchant from profiles where id = p_merchant_id;
  if not coalesce(v_merchant_is_merchant, false) then
    raise exception 'User is not a merchant';
  end if;

  -- Check wallet balance
  select balance_usdt into v_wallet_balance from admin_wallets where id = p_admin_wallet_id;
  if v_wallet_balance < p_amount_usdt then
    raise exception 'Insufficient wallet balance';
  end if;

  -- Update admin wallet balance
  update admin_wallets 
  set balance_usdt = balance_usdt - p_amount_usdt
  where id = p_admin_wallet_id;

  -- Update merchant balance
  update profiles
  set balance_usdt = balance_usdt + p_amount_usdt
  where id = p_merchant_id;

  -- Log the transfer (optional - could add a transfers table)
  insert into merchant_deposits (
    merchant_id,
    admin_wallet_id,
    amount_usdt,
    transaction_hash,
    status,
    admin_reviewed_by,
    admin_reviewed_at,
    admin_notes
  ) values (
    p_merchant_id,
    p_admin_wallet_id,
    p_amount_usdt,
    'ADMIN_TRANSFER_' || gen_random_uuid()::text,
    'confirmed',
    p_admin_id,
    now(),
    p_notes
  );
end;
$$ language plpgsql security definer;

-- Function to confirm a merchant deposit
create or replace function confirm_merchant_deposit(
  p_admin_id uuid,
  p_deposit_id uuid
) returns void as $$
declare
  v_admin_role text;
  v_deposit merchant_deposits%rowtype;
begin
  -- Verify admin role
  select role into v_admin_role from profiles where id = p_admin_id;
  if v_admin_role != 'admin' then
    raise exception 'Only admins can confirm deposits';
  end if;

  -- Get deposit info
  select * into v_deposit from merchant_deposits where id = p_deposit_id;
  if not found then
    raise exception 'Deposit not found';
  end if;

  if v_deposit.status != 'pending' then
    raise exception 'Only pending deposits can be confirmed';
  end if;

  -- Update admin wallet balance (add funds)
  update admin_wallets
  set balance_usdt = balance_usdt + v_deposit.amount_usdt
  where id = v_deposit.admin_wallet_id;

  -- Update merchant balance
  update profiles
  set balance_usdt = balance_usdt + v_deposit.amount_usdt
  where id = v_deposit.merchant_id;

  -- Update deposit status
  update merchant_deposits
  set status = 'confirmed',
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = now()
  where id = p_deposit_id;
end;
$$ language plpgsql security definer;

-- Function to reject a merchant deposit
create or replace function reject_merchant_deposit(
  p_admin_id uuid,
  p_deposit_id uuid,
  p_reason text
) returns void as $$
declare
  v_admin_role text;
  v_deposit merchant_deposits%rowtype;
begin
  -- Verify admin role
  select role into v_admin_role from profiles where id = p_admin_id;
  if v_admin_role != 'admin' then
    raise exception 'Only admins can reject deposits';
  end if;

  -- Get deposit info
  select * into v_deposit from merchant_deposits where id = p_deposit_id;
  if not found then
    raise exception 'Deposit not found';
  end if;

  if v_deposit.status != 'pending' then
    raise exception 'Only pending deposits can be rejected';
  end if;

  -- Update deposit status
  update merchant_deposits
  set status = 'rejected',
      rejection_reason = p_reason,
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = now()
  where id = p_deposit_id;
end;
$$ language plpgsql security definer;

-- Function to refund a deposit back to merchant
create or replace function refund_merchant_deposit(
  p_admin_id uuid,
  p_deposit_id uuid,
  p_reason text
) returns void as $$
declare
  v_admin_role text;
  v_deposit merchant_deposits%rowtype;
  v_wallet_balance numeric;
begin
  -- Verify admin role
  select role into v_admin_role from profiles where id = p_admin_id;
  if v_admin_role != 'admin' then
    raise exception 'Only admins can perform refunds';
  end if;

  -- Get deposit info
  select * into v_deposit from merchant_deposits where id = p_deposit_id;
  if not found then
    raise exception 'Deposit not found';
  end if;

  if v_deposit.status != 'confirmed' then
    raise exception 'Only confirmed deposits can be refunded';
  end if;

  -- Check admin wallet balance
  select balance_usdt into v_wallet_balance from admin_wallets where id = v_deposit.admin_wallet_id;
  if v_wallet_balance < v_deposit.amount_usdt then
    raise exception 'Insufficient wallet balance for refund';
  end if;

  -- Deduct from admin wallet
  update admin_wallets
  set balance_usdt = balance_usdt - v_deposit.amount_usdt
  where id = v_deposit.admin_wallet_id;

  -- Refund to merchant balance
  update profiles
  set balance_usdt = balance_usdt + v_deposit.amount_usdt
  where id = v_deposit.merchant_id;

  -- Update deposit status
  update merchant_deposits
  set status = 'refunded',
      rejection_reason = p_reason,
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = now()
  where id = p_deposit_id;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users (RLS will enforce admin role)
grant execute on function transfer_to_merchant to authenticated;
grant execute on function refund_merchant_deposit to authenticated;
