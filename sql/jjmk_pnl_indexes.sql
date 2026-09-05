-- ============================================================
-- JJ P&L · ดัชนีความเร็วรองรับข้อมูลโตระยะยาว (26 ส.ค. 2569)
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ · ไม่แตะข้อมูลใด ๆ
--   ผล: หน้าเดือน/รายซัพ/นับสต๊อก ยังเร็วเท่าเดิมแม้ข้อมูลสะสมเป็นแสน ๆ แถว
-- ============================================================
do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='pnl_bill_items') then
    create index if not exists idx_pnlbi_branch_d on public.pnl_bill_items(branch, d);
    create index if not exists idx_pnlbi_branch_sup_d on public.pnl_bill_items(branch, supplier_id, d);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='pnl_expense_daily') then
    create index if not exists idx_pnlexp_branch_d on public.pnl_expense_daily(branch, d);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='pnl_income_daily') then
    create index if not exists idx_pnlinc_branch_d on public.pnl_income_daily(branch, d);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='stock_counts') then
    create index if not exists idx_stkc_branch_date on public.stock_counts(branch_id, count_date);
  end if;
end $$;

-- ตรวจขนาดปัจจุบัน: ใช้ไปเท่าไรจากโควตา 500 MB (แผนฟรี)
select pg_size_pretty(pg_database_size(current_database())) as "ขนาดฐานข้อมูลรวมตอนนี้";
select relname as "ตาราง", pg_size_pretty(pg_total_relation_size(c.oid)) as "ขนาด"
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by pg_total_relation_size(c.oid) desc limit 10;
