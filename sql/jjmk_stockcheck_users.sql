-- ============================================================
-- JJ เช็คสต๊อก · ผู้ใช้ + สิทธิ์ (17 ก.ย. 2569) — รันครั้งเดียว รันซ้ำได้
--   username/password เข้าหน้าเช็คสต๊อก · จำกัดว่า เห็นสาขาไหนบ้าง + นับได้แผนกไหนบ้าง
--   branches = ['JJRD'] เห็นเฉพาะรัชดา · [] = ทุกสาขา
--   depts    = ['ครัว','บาร์น้ำ'] นับได้เฉพาะแผนกนี้ · [] = ทุกแผนก
--   ผู้ใช้แรก: admin / jjmk1234 (แอดมิน เห็นหมด + จัดการผู้ใช้ในหน้า Safety) — เข้าแล้วควรเปลี่ยนรหัส
-- ============================================================
create table if not exists sc_users (
  id bigint generated always as identity primary key,
  username text not null unique,
  pass_hash text not null,                      -- sha256(username|password|JJSC) แฮชฝั่งแอพ
  display_name text not null default '',
  role text not null default 'staff',           -- admin / staff
  branches jsonb not null default '[]'::jsonb,
  depts jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table sc_users enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='sc_users' and policyname='allow_all') then
    create policy allow_all on sc_users for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on sc_users to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ผู้ใช้ตั้งต้น admin / jjmk1234 (มีแล้วไม่ทับ)
insert into sc_users (username, pass_hash, display_name, role)
values ('admin', '7528960db432a298322eaeeba75e1bf16afd40545f42449e888522fa49087f0f', 'ผู้ดูแลระบบ', 'admin')
on conflict (username) do nothing;

-- ---------- ตรวจผล ----------
select username as ผู้ใช้, role as บทบาท, branches as สาขาที่เห็น, depts as แผนกที่นับได้, active as เปิดใช้
from sc_users order by id;
-- คาด: มีแถว admin (บทบาท admin) · branches/depts = [] = เห็นหมด
