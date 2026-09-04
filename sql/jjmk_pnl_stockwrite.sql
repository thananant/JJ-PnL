-- ============================================================
-- JJ P&L · เฟส 2 β: เปิดสิทธิ์เขียนค่า safety/max กลับเข้าแอพนับสต๊อก
--   (26 ส.ค. 2569) รันครั้งเดียว รันซ้ำได้ · เขียนได้เฉพาะ 2 คอลัมน์นี้เท่านั้น
-- ============================================================
grant update (safety, max) on public.products to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='products' and policyname='pnl_write_safety') then
    create policy pnl_write_safety on public.products for update using (true) with check (true);
  end if;
end $$;
select '✅ พร้อมให้ระบบ P&L เขียน safety/max แล้ว' as ผล;
