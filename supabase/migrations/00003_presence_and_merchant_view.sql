-- ============================================================
-- Real "Active Merchants": presence tracking + merchant view
-- ============================================================

-- Track when a user was last active so we can show a genuine
-- "online now" indicator instead of fake/static data.
alter table profiles add column if not exists last_seen_at timestamptz not null default now();

-- Not in protect_profile_columns()'s locked list, so any authenticated
-- user can keep their own last_seen_at fresh via a normal update()
-- (RLS: "profiles: users can update own" already covers this).

-- Merchants = real, verified users with at least one completed trade.
-- Ordered by trust signals so the most credible traders surface first.
create or replace view active_merchants as
  select
    id, full_name, avatar_url, average_rating, total_reviews,
    completion_rate, total_trades, completed_trades, is_kyc_verified,
    last_seen_at,
    (last_seen_at > now() - interval '5 minutes') as is_online
  from profiles
  where is_kyc_verified = true
    and is_banned = false
    and completed_trades > 0
  order by completed_trades desc, completion_rate desc;
