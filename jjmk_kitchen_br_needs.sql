-- ============================================================
-- ครัวกลาง: ตารางเก็บ "ยอดที่สาขาต้องการ vs ส่งจริง" (ck_br_needs)
-- ครัวอ่านยอดนับจากแอพนับสต๊อก แล้วคิดว่าต้องส่งแต่ละสาขาเท่าไร → พนักงานใส่ยอดส่งจริง
-- ตารางนี้เก็บทุกบรรทัด (สาขา × รอบนับ × สินค้า) ไว้ใช้วางแผนผลิต/สั่งของในอนาคต
-- รันครั้งเดียว · รันซ้ำได้ ไม่ลบข้อมูลใดๆ
-- ============================================================
create table if not exists ck_br_needs (
  id bigserial primary key,
  branch text not null,             -- JJRD / JJLP
  count_date date not null,         -- รอบนับ (วันขายที่สาขานับ)
  product_id text not null,         -- รหัสสินค้าในแอพนับสต๊อก
  name text, unit text,             -- ชื่อ/หน่วยฝั่งสาขา
  have numeric,                     -- สาขานับได้
  need numeric,                     -- ระบบคำนวณว่าต้องส่ง
  sent numeric,                     -- ส่งจริง
  recipe_id text, factor numeric,   -- สูตรครัวที่ผูกไว้ · 1 หน่วยสาขา = factor หน่วยสูตร
  d_send date, order_id text, by_name text,
  created_at timestamptz default now(),
  unique (branch, count_date, product_id)
);
create index if not exists ck_br_needs_d on ck_br_needs(count_date);

-- สิทธิ์แบบเดียวกับตาราง ck_* อื่น (แอพเข้าผ่านบัญชีกลางด้วย anon key — ตรวจสิทธิ์รายคนที่ตัวแอพ)
alter table ck_br_needs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ck_br_needs' and policyname='ck_all') then
    create policy ck_all on ck_br_needs for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on ck_br_needs to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
