-- ============================================================
-- JJ เช็คสต๊อก · ผูกซัพเข้ากลุ่มไลน์ + ที่เก็บค่าตั้งค่าระบบ (17 ก.ย. 2569) — รันซ้ำได้
--   ใช้กับหน้า 🛒 สั่งของ → ปุ่ม "ส่งเข้าไลน์" ยิงใบสั่งเข้ากลุ่มไลน์ของซัพนั้นโดยตรง
--   *** โทเคนบอทไลน์ห้ามอยู่ในหน้าเว็บ *** (หน้านี้เปิดสาธารณะบน GitHub Pages)
--   แอพจะยิงไปที่ "ตัวกลาง" (Cloudflare Worker / Edge Function) ที่ถือโทเคนไว้ฝั่งเซิร์ฟเวอร์
--   แล้วตัวกลางค่อยเรียก LINE Messaging API (push ไป group_id)
-- ============================================================
create table if not exists sc_line_groups (
  id bigint generated always as identity primary key,
  supplier text not null,               -- ชื่อซัพ (ตรงกับ products.sup)
  group_id text,                        -- LINE group id (ขึ้นต้น C...) จากบอทที่อยู่ในกลุ่มแล้ว
  group_name text,                      -- ชื่อกลุ่มไว้ให้คนอ่าน
  branch_id text,                       -- ว่าง = ใช้ได้ทุกสาขา · ใส่ = เฉพาะสาขานั้น
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (supplier, branch_id)
);
alter table sc_line_groups enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='sc_line_groups' and policyname='allow_all') then
    create policy allow_all on sc_line_groups for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on sc_line_groups to anon, authenticated;

-- ค่าตั้งค่าระบบ (เก็บ URL ตัวกลางที่ใช้ยิงไลน์ ฯลฯ — ไม่เก็บโทเคน)
create table if not exists sc_config (
  k text primary key,
  v text,
  updated_at timestamptz not null default now()
);
alter table sc_config enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='sc_config' and policyname='allow_all') then
    create policy allow_all on sc_config for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on sc_config to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ตั้งชื่อซัพไว้ล่วงหน้าจากรายการสินค้า (ยังไม่ใส่ group_id — ไปกรอกในแอพ)
insert into sc_line_groups(supplier)
select distinct btrim(p.sup) from products p
where p.sup is not null and btrim(p.sup)<>'' and p.deleted_at is null
on conflict (supplier, branch_id) do nothing;

-- ---------- ตรวจผล ----------
select count(*) as ซัพทั้งหมด, count(group_id) as ผูกกลุ่มไลน์แล้ว from sc_line_groups;
select supplier as ซัพ, coalesce(group_name,'(ยังไม่ตั้ง)') as กลุ่มไลน์,
       case when group_id is null then '✗ ยังไม่ผูก' else '✓ ผูกแล้ว' end as สถานะ
from sc_line_groups order by supplier;
select coalesce((select v from sc_config where k='line_endpoint'),'(ยังไม่ตั้ง URL ตัวกลาง)') as ตัวกลางส่งไลน์;
-- คาด: เห็นรายชื่อซัพครบ ทุกตัวขึ้น "✗ ยังไม่ผูก" (ไปใส่ group id ที่หน้า ⚙️ ตั้งค่า › ไลน์ซัพ)
