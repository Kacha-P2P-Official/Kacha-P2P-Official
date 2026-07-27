-- ============================================================
-- KACHA FIXES: RLS lockdown, real escrow settlement, dispute wiring
-- ============================================================

-- ---------- 1. Lock down profiles: users can only edit their own
--               display fields, never balances/role/kyc/stats ----------
create or replace function protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;

  -- Force protected columns back to their existing values for non-admins
  new.balance_usdt      := old.balance_usdt;
  new.balance_etb       := old.balance_etb;
  new.is_kyc_verified   := old.is_kyc_verified;
  new.is_banned         := old.is_banned;
  new.role              := old.role;
  new.total_trades      := old.total_trades;
  new.completed_trades  := old.completed_trades;
  new.completion_rate   := old.completion_rate;
  new.average_rating    := old.average_rating;
  new.total_reviews     := old.total_reviews;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns_trigger on profiles;
create trigger protect_profile_columns_trigger
  before update on profiles
  for each row execute procedure protect_profile_columns();

-- ---------- 2. Lock down trades: only status may change, and only
--               through valid transitions by the correct party -------
create or replace function protect_trade_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;

  -- Immutable fields for regular users
  new.offer_id       := old.offer_id;
  new.buyer_id       := old.buyer_id;
  new.seller_id      := old.seller_id;
  new.amount_usdt    := old.amount_usdt;
  new.amount_etb     := old.amount_etb;
  new.exchange_rate  := old.exchange_rate;
  new.escrow_status  := old.escrow_status; -- only settlement triggers may change this

  if new.status <> old.status then
    -- Validate the transition is one the calling party is actually allowed to make
    if not (
      (auth.uid() = old.buyer_id and old.status = 'initiated' and new.status in ('payment_pending', 'disputed'))
      or (auth.uid() = old.seller_id and old.status = 'payment_pending' and new.status in ('payment_confirmed', 'disputed'))
      or (auth.uid() = old.seller_id and old.status = 'payment_confirmed' and new.status in ('completed', 'disputed'))
      or ((auth.uid() = old.buyer_id or auth.uid() = old.seller_id) and old.status not in ('completed', 'cancelled', 'disputed') and new.status = 'disputed')
      or (auth.uid() = old.buyer_id and old.status = 'initiated' and new.status = 'cancelled')
    ) then
      raise exception 'Invalid trade status transition for this user';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_trade_columns_trigger on trades;
create trigger protect_trade_columns_trigger
  before update on trades
  for each row execute procedure protect_trade_columns();

-- ---------- 3. Escrow: lock seller's USDT the moment a trade starts ----------
alter table trades add column if not exists escrow_status text not null default 'held'
  check (escrow_status in ('held', 'released', 'refunded'));

create or replace function lock_escrow_on_trade_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seller_balance numeric;
begin
  select balance_usdt into seller_balance from profiles where id = new.seller_id for update;

  if seller_balance is null or seller_balance < new.amount_usdt then
    raise exception 'Seller does not have enough USDT balance to cover this trade';
  end if;

  update profiles set balance_usdt = balance_usdt - new.amount_usdt where id = new.seller_id;
  new.escrow_status := 'held';

  return new;
end;
$$;

drop trigger if exists lock_escrow_on_trade_insert_trigger on trades;
create trigger lock_escrow_on_trade_insert_trigger
  before insert on trades
  for each row execute procedure lock_escrow_on_trade_insert();

-- ---------- 4. Settlement: move real funds + update trust stats on completion/cancel ----------
create or replace function settle_trade_on_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Release escrow to buyer once the trade completes
  if new.status = 'completed' and old.status <> 'completed' and old.escrow_status = 'held' then
    update profiles set balance_usdt = balance_usdt + new.amount_usdt where id = new.buyer_id;
    update trades set escrow_status = 'released' where id = new.id;

    update profiles set
      total_trades = total_trades + 1,
      completed_trades = completed_trades + 1,
      completion_rate = round(((completed_trades + 1)::numeric / (total_trades + 1)::numeric) * 100, 2)
      where id = new.buyer_id;
    update profiles set
      total_trades = total_trades + 1,
      completed_trades = completed_trades + 1,
      completion_rate = round(((completed_trades + 1)::numeric / (total_trades + 1)::numeric) * 100, 2)
      where id = new.seller_id;
  end if;

  -- Refund escrow to seller if the trade is cancelled before completion
  if new.status = 'cancelled' and old.status <> 'cancelled' and old.escrow_status = 'held' then
    update profiles set balance_usdt = balance_usdt + new.amount_usdt where id = new.seller_id;
    update trades set escrow_status = 'refunded' where id = new.id;

    update profiles set total_trades = total_trades + 1 where id = new.buyer_id;
    update profiles set total_trades = total_trades + 1 where id = new.seller_id;
  end if;

  return new;
end;
$$;

drop trigger if exists settle_trade_on_status_change_trigger on trades;
create trigger settle_trade_on_status_change_trigger
  after update on trades
  for each row execute procedure settle_trade_on_status_change();

-- ---------- 5. Disputes: auto-link to the trade + give admins a real resolution path ----------
alter table disputes add column if not exists outcome text
  check (outcome in ('release_to_buyer', 'refund_to_seller'));

-- Opening a dispute row automatically flips the trade to 'disputed' —
-- keeps ActiveTrade.tsx simple (just insert into disputes) and guarantees
-- the trade and the dispute record can never go out of sync.
create or replace function mark_trade_disputed_on_dispute_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update trades set status = 'disputed' where id = new.trade_id and status not in ('completed', 'cancelled');
  return new;
end;
$$;

drop trigger if exists mark_trade_disputed_trigger on disputes;
create trigger mark_trade_disputed_trigger
  after insert on disputes
  for each row execute procedure mark_trade_disputed_on_dispute_insert();

-- Admin RPC: actually resolve a dispute by releasing escrow to the buyer
-- or refunding the seller, instead of just closing the ticket.
create or replace function admin_resolve_dispute(
  p_dispute_id uuid, p_outcome text, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_trade_id uuid;
  v_trade trades%rowtype;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_outcome not in ('release_to_buyer', 'refund_to_seller') then
    raise exception 'Invalid outcome';
  end if;

  select trade_id into v_trade_id from disputes where id = p_dispute_id;
  if v_trade_id is null then raise exception 'Dispute not found'; end if;

  select * into v_trade from trades where id = v_trade_id for update;
  if v_trade.escrow_status <> 'held' then
    raise exception 'Escrow for this trade has already been settled';
  end if;

  if p_outcome = 'release_to_buyer' then
    update profiles set balance_usdt = balance_usdt + v_trade.amount_usdt where id = v_trade.buyer_id;
    update trades set escrow_status = 'released', status = 'completed' where id = v_trade_id;
  else
    update profiles set balance_usdt = balance_usdt + v_trade.amount_usdt where id = v_trade.seller_id;
    update trades set escrow_status = 'refunded', status = 'cancelled' where id = v_trade_id;
  end if;

  update profiles set total_trades = total_trades + 1 where id = v_trade.buyer_id;
  update profiles set total_trades = total_trades + 1 where id = v_trade.seller_id;

  update disputes set
    status = 'resolved',
    outcome = p_outcome,
    resolution_notes = p_notes,
    resolved_by = auth.uid(),
    resolved_at = now()
  where id = p_dispute_id;
end;
$$;
