-- Add payment_proof_url column to trades table
alter table trades 
add column payment_proof_url text;

-- Add comment
comment on column trades.payment_proof_url is 'Screenshot URL of payment proof uploaded by buyer';
