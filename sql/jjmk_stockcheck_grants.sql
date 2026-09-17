-- ============================================================
-- JJ เช็คสต๊อก · ให้สิทธิ์ทุกตารางที่แอพเช็คสต๊อกตัวใหม่ต้องใช้ (17 ก.ย. 2569) — รันซ้ำได้
--
--   ทำไมต้องรัน: แอพนับสต๊อกเดิมล็อกอินผ่าน Supabase Auth → ทำงานด้วย role "authenticated"
--                แอพเช็คสต๊อกตัวใหม่เรียก PostgREST ด้วย publishable key → role "anon"
--                ตารางของระบบเดิมให้สิทธิ์ไว้เฉพาะ authenticated → เจอ ERROR 42501 permission denied
--
--   ให้สิทธิ์ตามที่ใช้จริง (ดูจากโค้ดแอพ) — *ไม่ให้สิทธิ์ลบ* ทุกตาราง ยกเว้น suppliers/sc_depts ที่ต้องลบได้
--     products        select, update            (แผนก/โซน/หน่วย/รูป/ชื่อนับ/เลิกใช้ = soft delete ด้วย deleted_at)
--     stock_counts    select, insert            (บันทึกการนับ)
--     stock_current   select, insert, update    (ยอดสดล่าสุด upsert)
--     stock_receipts  select, insert, update    (ยอดสั่งจริงตอนส่งไลน์สำเร็จ)
--     suppliers       select, insert, update, delete   (จัดการซัพ + รอบสั่ง + line_group_id)
--     line_groups     select, update            (ตั้งชื่อกลุ่มที่ไลน์ไม่ส่งชื่อมา)
--     sc_depts        select, insert, update, delete   (แผนกรายสาขา — ตารางของแอพใหม่)
--     sc_users        select, insert, update    (ผู้ใช้แอพใหม่)
--     pnl_stock_map   select, update            (หน่วยนับ/ชื่อนับ ฝั่ง P&L)
--     pnl_unit_conv   select, insert, update    (ตัวคูณหน่วยซื้อ↔หน่วยนับ)
--     pnl_bill_items / pnl_suppliers / pnl_stock_names   select  (อ่านหน่วยซื้อจากบิลจริง)
--
--   ⚠️ publishable key ฝังในหน้าเว็บสาธารณะ = ใครก็เรียกได้ → จึงไม่ให้สิทธิ์ลบข้อมูลสินค้า/ยอดนับ
-- ============================================================

-- ---------- 1) สิทธิ์ปัจจุบันก่อนรัน ----------
select table_name as ตาราง, grantee as role, string_agg(privilege_type,', ' order by privilege_type) as สิทธิ์เดิม
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
  and table_name in ('products','stock_counts','stock_current','stock_receipts','suppliers','line_groups',
                     'sc_depts','sc_users','pnl_stock_map','pnl_unit_conv','pnl_bill_items','pnl_suppliers')
group by table_name, grantee order by table_name, grantee;

-- ---------- 2) ให้สิทธิ์ ----------
do $$
declare
  spec text[][] := array[
    ['products','select, update'],
    ['stock_counts','select, insert'],
    ['stock_current','select, insert, update'],
    ['stock_receipts','select, insert, update'],
    ['suppliers','select, insert, update, delete'],
    ['line_groups','select, update'],
    ['sc_depts','select, insert, update, delete'],
    ['sc_users','select, insert, update'],
    ['pnl_stock_map','select, update'],
    ['pnl_unit_conv','select, insert, update'],
    ['pnl_bill_items','select'],
    ['pnl_suppliers','select'],
    ['pnl_stock_names','select']
  ];
  i int;
begin
  for i in 1..array_length(spec,1) loop
    if to_regclass('public.'||spec[i][1]) is not null then
      execute format('grant %s on public.%I to anon, authenticated', spec[i][2], spec[i][1]);
    else
      raise notice 'ข้าม % (ยังไม่มีตารางนี้)', spec[i][1];
    end if;
  end loop;
end $$;

-- RLS: ตารางไหนเปิด RLS อยู่ ต้องมี policy ด้วย (grant อย่างเดียวไม่พอ)
do $$
declare t text;
begin
  foreach t in array array['products','stock_counts','stock_current','stock_receipts','suppliers','line_groups',
                           'sc_depts','sc_users','pnl_stock_map','pnl_unit_conv','pnl_bill_items','pnl_suppliers'] loop
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
select table_name as ตาราง, string_agg(privilege_type,', ' order by privilege_type) as สิทธิ์ของ_anon
from information_schema.role_table_grants
where table_schema='public' and grantee='anon'
  and table_name in ('products','stock_counts','stock_current','stock_receipts','suppliers','line_groups',
                     'sc_depts','sc_users','pnl_stock_map','pnl_unit_conv')
group by table_name order by table_name;

select count(*) as ซัพทั้งหมด, count(line_group_id) as ผูกกลุ่มไลน์แล้ว from suppliers;
-- คาด: products = SELECT,UPDATE · suppliers = DELETE,INSERT,SELECT,UPDATE · ครบทุกบรรทัดตามหัวไฟล์
--      แล้วกลับไปรีเฟรชแอพ → ตั้งโซน/ย้ายแผนก/ผูกกลุ่มไลน์ ต้องบันทึกได้หมด
