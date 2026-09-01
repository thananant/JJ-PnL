-- ============================================================
-- JJ P&L · เปิด Supabase Realtime ให้ตารางข้อมูลรายวัน (24 ส.ค. 2569)
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ (ข้ามตารางที่เปิดแล้ว)
--   ผล: แอพทุกเครื่องเห็นข้อมูลที่คนอื่นกรอกแบบสด ๆ ไม่ต้องกดรีเฟรช
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'pnl_bill_items','pnl_expense_daily','pnl_income_daily',
    'pnl_cash_expenses','pnl_shopee','pnl_month_meta','pnl_fixed_monthly'
  ] loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t)
       and not exists (select 1 from pg_publication_tables
                        where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ตรวจ: ตารางที่เปิด Realtime แล้วทั้งหมด
select tablename as "ตารางที่เปิด Realtime แล้ว"
  from pg_publication_tables
 where pubname='supabase_realtime' and schemaname='public'
 order by 1;
