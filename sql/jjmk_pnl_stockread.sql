-- ============================================================
-- JJ P&L · เปิดสิทธิ์ "อ่าน" ตารางระบบนับสต๊อกให้แอพ P&L (25 ส.ค. 2569)
--   แก้ error 42501: permission denied for table products
--   สาเหตุ: ตารางชุดนับสต๊อกให้สิทธิ์เฉพาะผู้ใช้ที่ล็อกอิน (authenticated)
--   แอพ P&L ใช้ anon key เลยอ่านไม่ได้ — เปิด SELECT อย่างเดียว (ไม่ให้เขียน)
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['products','stock_counts','stock_current','stock_receipts','branches'] loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('grant select on public.%I to anon, authenticated', t);
      -- ถ้าตารางเปิด RLS ไว้แต่ไม่มี policy สำหรับอ่าน ให้เพิ่ม policy อ่านอย่างเดียว
      if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname=t and c.relrowsecurity)
         and not exists (select 1 from pg_policies
                          where schemaname='public' and tablename=t and cmd in ('SELECT','ALL')) then
        execute format('create policy pnl_read on public.%I for select using (true)', t);
      end if;
    end if;
  end loop;
end $$;

-- ตรวจผล: ต้องได้ true ทุกแถว
select t as "ตาราง",
       has_table_privilege('anon','public.'||t,'select') as "anon อ่านได้"
from unnest(array['products','stock_counts','stock_current','stock_receipts','branches']) t
where exists (select 1 from pg_tables where schemaname='public' and tablename=t);
