-- MERCHANT APPLICATIONS
-- For USDT sellers to apply for merchant status
create table if not exists merchant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  business_description text,
  trading_volume_usdt numeric(18,6) not null default 0,
  preferred_payment_methods text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','under_review')),
  rejection_reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table merchant_applications enable row level security;

create policy "merchant_apps: user can view own" on merchant_applications for select using (auth.uid() = user_id or is_admin());
create policy "merchant_apps: user can insert own" on merchant_applications for insert with check (auth.uid() = user_id);
create policy "merchant_apps: admin can update" on merchant_applications for update using (is_admin());

-- Add is_merchant flag to profiles
alter table profiles 
add column is_merchant boolean not null default false;

-- Function to approve merchant application
create or replace function approve_merchant_application(p_app_id uuid, p_admin_id uuid)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  
  -- Update application status
  update merchant_applications 
  set status = 'approved', 
      reviewed_by = p_admin_id, 
      reviewed_at = now()
  where id = p_app_id;
  
  -- Set user as merchant
  update profiles 
  set is_merchant = true 
  where id = (select user_id from merchant_applications where id = p_app_id);
end;
$$;

-- Function to reject merchant application
create or replace function reject_merchant_application(p_app_id uuid, p_admin_id uuid, p_reason text)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  
  update merchant_applications 
  set status = 'rejected', 
      rejection_reason = p_reason,
      reviewed_by = p_admin_id, 
      reviewed_at = now()
  where id = p_app_id;
end;
$$;
