-- ============================================================
-- JJ P&L · หน่วยสินค้า (เพิ่ม/ลบเองได้ในหน้าตั้งค่า)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_units (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort int not null default 0
);

insert into pnl_units (name, sort) values
  ('กก.',10),('ชิ้น',20),('แพ็ค',30),('ลัง',40),('ถุง',50),('ขวด',60),
  ('กระป๋อง',70),('กล่อง',80),('ลิตร',90),('มัด',100),('ตัว',110),('กระสอบ',120)
on conflict (name) do nothing;

alter table pnl_units enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_units' and policyname='allow_all') then
    create policy allow_all on pnl_units for all using (true) with check (true);
  end if;
end $$;
