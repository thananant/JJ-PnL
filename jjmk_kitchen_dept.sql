-- jjmk_kitchen_dept.sql — ครัวกลาง: แยกวัตถุดิบเป็นแผนก "ครัวกลาง / ของหวาน" ก่อนแยกหมวด
-- รันซ้ำได้ · เพิ่มคอลัมน์อย่างเดียว ไม่แตะข้อมูลเดิม
-- ว่าง = ระบบดูจากสูตรให้เอง (ใช้ในเมนูกลุ่ม "ของหวาน" อย่างเดียว = ของหวาน · ใช้ทั้งสองแบบ = ใช้ทั้งสองแผนก)
alter table ck_items add column if not exists dept text;  -- main = ครัวกลาง · dessert = ของหวาน · both = ใช้ทั้งสองแผนก

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_items_dept_chk') then
    alter table ck_items add constraint ck_items_dept_chk check (dept is null or dept in ('main','dessert','both'));
  end if;
end $$;

notify pgrst, 'reload schema';

select 'ck_items.dept' as "คอลัมน์",
       exists(select 1 from information_schema.columns
              where table_schema='public' and table_name='ck_items' and column_name='dept') as "มีแล้ว";
