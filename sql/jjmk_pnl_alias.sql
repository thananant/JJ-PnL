-- ============================================================
-- JJ P&L · จับคู่ชื่อสินค้าจากบิล (OCR) -> ชื่อในแอพ + แปลงหน่วยต่อซัพ
-- เช่น ซัพ B: "ไข่ไก่สด 1 มัด" -> ไข่ไก่ (แผง) × 5  (factor = 5)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_item_alias (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references pnl_suppliers(id) on delete cascade,
  alias text not null,                    -- ชื่อที่พิมพ์บนบิล (ตัดช่องว่างซ้ำ/ตัวพิมพ์)
  item text not null,                     -- ชื่อสินค้าในแอพ (ยึดตัวนี้เสมอ)
  unit text,                              -- หน่วยในแอพ เช่น แผง
  bill_unit text,                         -- หน่วยบนบิล เช่น มัด
  factor numeric not null default 1,      -- 1 หน่วยบิล = factor × หน่วยแอพ
  created_at timestamptz not null default now(),
  unique(supplier_id, alias)
);
alter table pnl_item_alias enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_item_alias' and policyname='allow_all') then
    create policy allow_all on pnl_item_alias for all using (true) with check (true);
  end if;
end $$;
