-- ============================================================
-- JJ P&L · ตารางแปลงหน่วยรายสินค้า (26 ส.ค. 2569) — รันครั้งเดียว รันซ้ำได้
--   สินค้าที่ซัพส่งมาหลายหน่วย (บางบิลลัง บางบิลโล) ลงบิลตามจริงได้เลย
--   ระบบแปลงเป็นหน่วยหลักให้ตอนคำนวณ: 1 from_unit = factor to_unit
--   ใช้ร่วมกันทุกซัพทุกสาขา (อัตราแปลงเป็นเรื่องของตัวสินค้า)
-- ============================================================
create table if not exists pnl_unit_conv (
  id bigint generated always as identity primary key,
  item text not null,                  -- ชื่อสินค้าในบิล
  from_unit text not null,             -- หน่วยรอง เช่น ลัง
  to_unit text not null,               -- หน่วยหลัก เช่น กก.
  factor numeric not null,             -- 1 from_unit = factor to_unit
  created_at timestamptz not null default now(),
  unique (item, from_unit)
);
alter table pnl_unit_conv enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_unit_conv' and policyname='allow_all') then
    create policy allow_all on pnl_unit_conv for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on pnl_unit_conv to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
