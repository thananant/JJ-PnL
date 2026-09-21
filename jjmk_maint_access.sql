-- jjmk_maint_access.sql — ให้แอพซ่อมบำรุง (jjmk-maint.html) ใช้บัญชีกลาง pnl_users ได้
-- รันครั้งเดียวใน Supabase → SQL Editor · รันซ้ำได้ · ไม่ลบ/ไม่แก้ข้อมูลเดิมแม้แต่แถวเดียว
--
-- ทำไมต้องรัน: เดิมตาราง maint_* ให้ "เขียน" ได้เฉพาะคนที่ล็อกอินผ่าน Supabase Auth (บัญชี app_users
-- ของระบบนับสต๊อก/ครัวกลาง) · พอเปิดให้ล็อกอินด้วยบัญชีกลาง pnl_users (ชุดเดียวกับหน้าศูนย์รวมแอพ)
-- ซึ่งไม่มี session ของ Supabase Auth จึงต้องเปิดสิทธิ์เขียนให้ role anon เหมือนที่ JJ Calendar /
-- P&L / Invoice ใช้อยู่ (ตัวแอพเป็นคนบังคับล็อกอินก่อนใช้งาน)
--
-- ⚠️ หมายเหตุความปลอดภัย: หลังรัน ใครถือ anon key (ซึ่งฝังอยู่ในไฟล์ HTML ทุกแอพอยู่แล้ว)
-- จะยิง API เขียนตาราง maint_* ได้โดยตรง = ระดับความปลอดภัยเท่ากับแอพอื่นในระบบทุกตัว
-- ให้สิทธิ์เท่าที่แอพใช้จริงเท่านั้น: DELETE เปิดให้เฉพาะ maint_logs (ปุ่มลบบันทึกในประวัติ)
-- ส่วนตารางอื่นลบแบบซ่อน (UPDATE deleted_at) จึงไม่ต้องให้สิทธิ์ DELETE

-- 1) นโยบาย RLS ของ role anon (ของเดิมที่ให้เฉพาะ authenticated ยังอยู่ครบ ไม่ถูกแตะ)
do $$ declare tb text; begin
  foreach tb in array array['maint_tasks','maint_logs','maint_assets','maint_counts'] loop
    if not exists (select 1 from pg_policies where tablename=tb and policyname='mt_anon_all') then
      execute format('create policy mt_anon_all on %I for all to anon using (true) with check (true)', tb);
    end if;
  end loop;
end $$;

-- 2) สิทธิ์ตาราง — ให้เท่าที่แอพใช้จริง
grant select, insert, update on maint_tasks,  maint_assets, maint_counts to anon;
grant select, insert, update, delete on maint_logs to anon;   -- ลบบันทึกงานในหน้าประวัติ

-- 3) อัปโหลดรูปเข้า bucket maint-photos ได้โดยไม่ต้องมี Supabase Auth
insert into storage.buckets (id, name, public) values ('maint-photos','maint-photos',true)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mt_img_up_anon') then
    create policy mt_img_up_anon on storage.objects for insert to anon with check (bucket_id = 'maint-photos');
  end if;
end $$;

-- 4) ตรวจผล
select 'เปิดสิทธิ์ให้บัญชีกลางใช้แอพซ่อมบำรุงเรียบร้อย ✅ · นโยบาย anon ที่มีตอนนี้: '
  || (select count(*) from pg_policies where policyname in ('mt_anon_all','mt_img_up_anon')) || ' รายการ' as result;
