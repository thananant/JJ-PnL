-- ============================================================
-- JJ P&L · เฟส 1 เชื่อมระบบนับสต๊อก (25 ส.ค. 2569) — รันครั้งเดียว รันซ้ำได้
--   pnl_stock_map: ผูกสินค้าในระบบนับสต๊อก (products.product_id)
--   กับ "ชื่อสินค้าในบิล P&L" + ตัวคูณหน่วย (1 หน่วยบิล = factor หน่วยนับ)
--   * ไม่แตะตารางของระบบนับสต๊อกเลย อ่านอย่างเดียว *
-- ============================================================
create table if not exists pnl_stock_map (
  id bigint generated always as identity primary key,
  branch text not null,                -- JJRD / JJLP (สาขาฝั่ง P&L)
  product_id text not null,            -- products.id ของระบบนับสต๊อก (ผูกรายสาขาอยู่แล้ว)
  product_name text not null default '',-- ชื่อในระบบนับ (เก็บไว้ดู ไม่ใช้คำนวณ)
  pnl_item text not null,              -- ชื่อสินค้าในบิล P&L
  bill_unit text not null default '',  -- หน่วยในบิล (ไว้โชว์)
  stock_unit text not null default '', -- หน่วยที่นับ (ไว้โชว์)
  factor numeric not null default 1,   -- 1 หน่วยบิล = factor หน่วยนับ (บิลเป็นลัง นับเป็นกก. -> 9)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id)
);
alter table pnl_stock_map enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_stock_map' and policyname='allow_all') then
    create policy allow_all on pnl_stock_map for all using (true) with check (true);
  end if;
end $$;

-- เปิด Realtime ให้ด้วย (แอพหลายเครื่องเห็นการผูกพร้อมกัน)
do $$ begin
  if not exists (select 1 from pg_publication_tables
                  where pubname='supabase_realtime' and schemaname='public' and tablename='pnl_stock_map') then
    execute 'alter publication supabase_realtime add table public.pnl_stock_map';
  end if;
end $$;

select 'pnl_stock_map พร้อมใช้' as ok, count(*) as mapped from pnl_stock_map;
