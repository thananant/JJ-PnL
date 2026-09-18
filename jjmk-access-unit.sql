-- jjmk-access-unit.sql — เพิ่ม "ระดับตำแหน่ง + สังกัด (ประจำที่)" ให้บัญชีผู้ใช้
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ · ไม่ลบข้อมูลเดิม
-- (ต้องรัน jjmk-access.sql มาก่อน — ไฟล์นี้ต่อยอดจากตาราง pnl_users เดิม)
--
-- ระดับตำแหน่ง (role)          สังกัด/ประจำที่ (unit)
--   admin   ผู้ดูแลระบบ          ALL     ทุกที่ (ส่วนกลาง)
--   owner   เจ้าของ              OFFICE  ออฟฟิศ
--   manager ผู้จัดการ            JJCK    ครัวกลาง
--   staff   พนักงาน              JJLP    สาขาลาดพร้าว
--                                JJRD    สาขารัชดา

-- 1) คอลัมน์สังกัด --------------------------------------------------------------
alter table pnl_users add column if not exists unit text not null default 'ALL';

-- 2) จำกัดค่าที่ใส่ได้ ให้พิมพ์ผิดไม่ได้ ------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname='pnl_users_unit_ck') then
    alter table pnl_users add constraint pnl_users_unit_ck
      check (unit in ('ALL','OFFICE','JJCK','JJLP','JJRD'));
  end if;
  if not exists (select 1 from pg_constraint where conname='pnl_users_role_ck') then
    alter table pnl_users add constraint pnl_users_role_ck
      check (role in ('admin','owner','manager','staff'));
  end if;
end $$;

-- 3) บัญชีเดิมที่ยังไม่ได้ระบุสังกัด ----------------------------------------------
--    admin = ส่วนกลาง (ALL) · ที่เหลือคงค่า default 'ALL' ไว้ก่อน
--    ให้เจ้าของไปเลือกสังกัดรายคนในหน้า JJ Access → ผู้ใช้ & สิทธิ์ → ✏️
update pnl_users set unit='ALL' where unit is null or unit='';

-- 4) ดัชนีไว้กรองรายชื่อตามสังกัด ------------------------------------------------
create index if not exists pnl_users_unit_idx on pnl_users (unit);

-- เสร็จแล้ว: เปิดหน้า JJ Access → แท็บ "ผู้ใช้ & สิทธิ์" จะมีช่อง "ระดับ" และ "ประจำที่" ให้เลือก
