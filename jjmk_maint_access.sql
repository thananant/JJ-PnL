-- jjmk_maint_access.sql — ให้แอพซ่อมบำรุง (jjmk-maint.html) ใช้บัญชีกลาง pnl_users ได้
-- รันใน Supabase → SQL Editor · รันซ้ำได้ (เคยรันฉบับก่อนแล้วก็รันทับได้เลย) · ไม่ลบ/ไม่แก้ข้อมูลเดิมแม้แต่แถวเดียว
--
-- ทำไมต้องรัน: เดิมตาราง maint_* ให้ "เขียน" ได้เฉพาะคนที่ล็อกอินผ่าน Supabase Auth (บัญชี app_users
-- ของระบบนับสต๊อก/ครัวกลาง) · บัญชีกลาง pnl_users (ชุดเดียวกับหน้าศูนย์รวมแอพ) ไม่มี session ของ
-- Supabase Auth จึงต้องเปิดสิทธิ์ให้ role anon เหมือนที่ JJ Calendar / P&L / Invoice ใช้อยู่
-- (ตัวแอพเป็นคนบังคับล็อกอินก่อนใช้งาน)
--
-- ⚠️ ความปลอดภัย: หลังรัน ใครถือ anon key (ซึ่งฝังอยู่ในไฟล์ HTML ทุกแอพอยู่แล้ว) จะยิง API เขียนตาราง
-- maint_* ได้โดยตรง = ระดับเดียวกับแอพกลางตัวอื่นทุกตัว · ให้สิทธิ์เท่าที่แอพใช้จริงเท่านั้น:
-- DELETE เฉพาะ maint_logs (ปุ่มลบบันทึกในประวัติ) ตารางอื่นลบแบบซ่อน (UPDATE deleted_at)
-- ตาราง branches ให้แค่ "อ่าน" (รายชื่อสาขา)

-- 1) นโยบาย RLS ของ role anon (ของเดิมที่ให้ authenticated ยังอยู่ครบ ไม่ถูกแตะ)
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

-- 4) รายชื่อสาขา (ตาราง branches ชุดเดียวกับแอพนับสต๊อก) — บัญชีกลางต้อง "อ่าน" ได้ ไม่งั้นเข้าแอพไม่ได้
grant select on public.branches to anon;
do $$ begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'branches' and c.relrowsecurity)
     and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'branches'
                     and policyname = 'mt_branches_anon_read') then
    create policy mt_branches_anon_read on public.branches for select to anon using (true);
  end if;
end $$;

-- 5) ตรวจผล
select 'เปิดสิทธิ์ให้บัญชีกลางใช้แอพซ่อมบำรุงเรียบร้อย ✅ · นโยบาย anon ที่มีตอนนี้: '
  || (select count(*) from pg_policies where policyname in ('mt_anon_all','mt_img_up_anon','mt_branches_anon_read'))
  || ' รายการ · อ่านรายชื่อสาขาได้: '
  || case when has_table_privilege('anon','public.branches','select') then 'ได้' else 'ยังไม่ได้' end as result;
