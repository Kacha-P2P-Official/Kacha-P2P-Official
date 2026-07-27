-- Add online status tracking for sellers
alter table profiles add column if not exists online_until timestamptz;
