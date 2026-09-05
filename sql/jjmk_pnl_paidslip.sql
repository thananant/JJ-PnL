-- ============================================================
-- JJ P&L · สถานะจ่าย/ค้างจ่าย + แนบสลิป ในรายจ่ายรายบิล
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================

alter table pnl_expense_daily
  add column if not exists paid boolean not null default false,
  add column if not exists slip_url text;

-- ที่เก็บรูปสลิป (Supabase Storage bucket ชื่อ slips, เปิด public อ่านได้)
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do update set public = true;

drop policy if exists slips_all on storage.objects;
create policy slips_all on storage.objects
  for all to public
  using (bucket_id = 'slips')
  with check (bucket_id = 'slips');
