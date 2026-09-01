-- ============================================================
-- JJ P&L · เปิดอ่านตารางระบบนับสต๊อก รอบ 2 (25 ส.ค. 2569) — รันครั้งเดียว รันซ้ำได้
--   เคส: GRANT ผ่านแล้ว (ไม่ขึ้น 401) แต่หน้ายังว่าง = ตารางเปิด RLS ไว้
--   และ policy เดิมให้เฉพาะผู้ใช้ที่ล็อกอิน -> anon อ่านได้ 0 แถวแบบเงียบ ๆ
--   ไฟล์นี้เพิ่ม policy "อ่านอย่างเดียว" ให้ anon โดยไม่แตะ policy เดิมของแอพนับ
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['products','stock_counts','stock_current','stock_receipts'] loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('grant select on public.%I to anon, authenticated', t);
      if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname=t and c.relrowsecurity)
         and not exists (select 1 from pg_policies
                          where schemaname='public' and tablename=t and policyname='pnl_read') then
        execute format('create policy pnl_read on public.%I for select to anon, authenticated using (true)', t);
      end if;
    end if;
  end loop;
end $$;

-- ทดสอบด้วยสิทธิ์เดียวกับแอพ P&L จริง ๆ (anon) — ตัวเลขต้องมากกว่า 0
set role anon;
select 'products (anon เห็น)' as ตรวจ, count(*) as แถว from products
union all select 'stock_counts (anon เห็น)', count(*) from stock_counts;
reset role;
