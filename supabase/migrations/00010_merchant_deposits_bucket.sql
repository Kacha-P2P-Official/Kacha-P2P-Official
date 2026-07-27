-- STORAGE BUCKET for merchant deposit proofs
insert into storage.buckets (id, name, public)
values ('merchant-deposits', 'merchant-deposits', true)
on conflict (id) do nothing;

-- Policies for merchant-deposits bucket
create policy "merchant-deposits bucket: authenticated users can upload" on storage.objects for insert
  with check (bucket_id = 'merchant-deposits' and auth.uid() is not null);

create policy "merchant-deposits bucket: merchant and admin can view" on storage.objects for select
  using (
    bucket_id = 'merchant-deposits' and
    (
      auth.uid()::text = (storage.foldername(name))[1] or
      exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );
