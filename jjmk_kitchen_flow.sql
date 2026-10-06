-- ============================================================
-- ครัวกลาง: flow ประจำวัน (เจ้าของสั่ง 2026-10-06)
--   สต๊อกสำรอง (safety) · ราคาขายสาขา = ทุนจริง + % · สั่งผลิต vs ผลิตจริง
--   บิลรับของ + เครดิต/เจ้าหนี้ · เลขบิลส่งสาขา · กลุ่มไลน์ของซัพครัวกลาง
-- รันครั้งเดียว · รันซ้ำได้ · ไม่ลบข้อมูลใดๆ
-- ============================================================

-- 1) สินค้าที่ผลิต: % บวกจากทุน + สต๊อกสำรอง (ว่าง = ใช้ค่ากลางในหน้าตั้งค่า)
alter table if exists ck_recipes add column if not exists markup_pct numeric;
alter table if exists ck_recipes add column if not exists safety_days numeric;
alter table if exists ck_recipes add column if not exists safety_qty numeric;

-- 2) ซัพพลายเออร์ของครัว: เครดิตกี่วัน (0 = โอน/จ่ายทันที) + กลุ่มไลน์ที่ส่งใบสั่ง
alter table if exists ck_sups add column if not exists credit_days integer default 0;
alter table if exists ck_sups add column if not exists line_group_id text;

-- 3) สั่งผลิต (ด่วน/เติมสต๊อก) และยอดสั่งผลิตเทียบกับผลิตได้จริง
alter table if exists ck_plans add column if not exists kind text;
alter table if exists ck_productions add column if not exists plan_qty numeric;

-- 4) เลขบิลส่งของให้สาขา
alter table if exists ck_orders add column if not exists bill_no text;

-- 5) บิลรับของจากซัพ (หัวบิล) — รายการของอยู่ใน ck_moves (kind='buy', ref = id ของบิล)
create table if not exists ck_bills (
  id text primary key,
  d date not null,                       -- วันที่ตามบิล/วันรับของ
  sup text default '',
  bill_no text,
  total numeric default 0,
  credit_days integer default 0,         -- 0 = โอน/จ่ายทันที
  due_date date,                         -- วันครบกำหนดจ่าย
  paid_at date,                          -- จ่ายแล้ววันไหน (ว่าง = ค้างจ่าย)
  po_id text,                            -- รับจากใบสั่งซื้อใบไหน
  note text,
  by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now());
create index if not exists ck_bills_d on ck_bills(d);
create index if not exists ck_bills_due on ck_bills(due_date) where paid_at is null;

-- 6) สิทธิ์ (แบบเดียวกับตาราง ck_* อื่น — แอพเข้าด้วยบัญชีกลาง ผ่าน anon key)
alter table ck_bills enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ck_bills' and policyname='ck_all') then
    create policy ck_all on ck_bills for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on ck_bills to anon, authenticated;

-- ตรวจผล
select 'ck_bills' as "ตาราง", count(*) as "แถว" from ck_bills
union all select 'ck_recipes.markup_pct', count(*) from information_schema.columns
  where table_name='ck_recipes' and column_name in ('markup_pct','safety_days','safety_qty')
union all select 'ck_sups.credit_days', count(*) from information_schema.columns
  where table_name='ck_sups' and column_name in ('credit_days','line_group_id');
