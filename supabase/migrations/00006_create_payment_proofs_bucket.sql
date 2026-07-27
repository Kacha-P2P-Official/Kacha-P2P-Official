-- STORAGE BUCKET for payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Policies for payment proofs bucket
create policy "payment-proofs bucket: authenticated users can upload" on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and auth.uid() is not null);

create policy "payment-proofs bucket: trade parties can view" on storage.objects for select
  using (
    bucket_id = 'payment-proofs' and 
    (
      auth.uid()::text = (storage.foldername(name))[1] or
      exists (
        select 1 from trades t 
        where t.id = (storage.foldername(name))[2]::uuid 
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
      )
    )
  );
