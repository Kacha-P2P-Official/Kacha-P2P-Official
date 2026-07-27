-- Add account_name column to offers table
alter table offers 
add column account_name text;

-- Add comment
comment on column offers.account_name is 'Specific account name for the payment method (e.g., bank account holder name)';
