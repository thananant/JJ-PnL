-- ============================================================
-- JJ เช็คสต๊อก · ให้สิทธิ์ตารางของ "ระบบนับเดิม" กับแอพเช็คสต๊อกตัวใหม่ (17 ก.ย. 2569) — รันซ้ำได้
--
--   ทำไมต้องรัน: แอพนับเดิมล็อกอินผ่าน Supabase Auth (role = authenticated)
--                แอพเช็คสต๊อกตัวใหม่เรียก PostgREST ด้วย publishable key ตรง ๆ (role = anon)
--                → เลยเจอ ERROR 42501 "permission denied" ตอนบันทึกรอบสั่ง/ผูกกลุ่มไลน์
--
--   ให้สิทธิ์เท่าที่ตัวใหม่ต้องใช้จริง:
--     suppliers      → อ่าน + แก้ (รอบสั่ง-ส่ง, line_group_id)   *ไม่ให้สิทธิ์ลบ*
--     line_groups    → อ่านอย่างเดียว (รายชื่อกลุ่มที่บอทอยู่)
--     stock_receipts → อ่าน + เพิ่ม + แก้ (บันทึก "สั่งจริง" ตอนส่งไลน์สำเร็จ)  *ไม่ให้สิทธิ์ลบ*
--   (products / stock_counts / stock_current ใช้ได้อยู่แล้ว ไม่ต้องแตะ)
--
--   ⚠️ หมายเหตุความปลอดภัย: publishable key ฝังอยู่ในหน้าเว็บสาธารณะ = ใครก็เรียกได้
--      ไฟล์นี้จึงให้เท่าที่จำเป็นและ "ไม่ให้สิทธิ์ลบ" ทุกตาราง
-- ============================================================

-- ---------- 1) ดูสิทธิ์ปัจจุบันก่อน ----------
select table_name as ตาราง, grantee as role, string_agg(privilege_type,', ' order by privilege_type) as สิทธิ์ที่มี
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
  and table_name in ('suppliers','line_groups','stock_receipts','products','stock_counts','stock_current')
group by table_name, grantee order by table_name, grantee;

-- ---------- 2) ให้สิทธิ์ ----------
do $$
begin
  if to_regclass('public.suppliers') is not null then
    execute 'grant select, insert, update on public.suppliers to anon, authenticated';
  end if;
  if to_regclass('public.line_groups') is not null then
    execute 'grant select on public.line_groups to anon, authenticated';
  end if;
  if to_regclass('public.stock_receipts') is not null then
    execute 'grant select, insert, update on public.stock_receipts to anon, authenticated';
  end if;
end $$;

-- RLS: ถ้าตารางไหนเปิด RLS อยู่ ต้องมี policy ให้ด้วย (ไม่งั้น grant อย่างเดียวยังอ่าน/เขียนไม่ได้)
do $$
declare t text;
begin
  foreach t in array array['suppliers','line_groups','stock_receipts'] loop
    if to_regclass('public.'||t) is not null
       and exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                   where n.nspname='public' and c.relname=t and c.relrowsecurity)
       and not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='jjsc_allow')
    then
      execute format('create policy jjsc_allow on public.%I for all using (true) with check (true)', t);
      raise notice 'สร้าง policy jjsc_allow ให้ตาราง %', t;
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- ตรวจผล ----------
select table_name as ตาราง, grantee as role, string_agg(privilege_type,', ' order by privilege_type) as สิทธิ์หลังรัน
from information_schema.role_table_grants
where table_schema='public' and grantee='anon'
  and table_name in ('suppliers','line_groups','stock_receipts')
group by table_name, grantee order by table_name;

select count(*) as ซัพทั้งหมด, count(line_group_id) as ผูกกลุ่มไลน์แล้ว from suppliers;
-- คาด: anon มี SELECT,INSERT,UPDATE บน suppliers และ stock_receipts · SELECT บน line_groups
--      แล้วกลับไปรีเฟรชแอพเช็คสต๊อก → หน้า 🚚 รอบสั่งซัพ ต้องขึ้น "เจอในระบบเดิม 43/43 ซัพ"
