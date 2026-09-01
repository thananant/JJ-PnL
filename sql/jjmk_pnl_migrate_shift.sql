-- ============================================================
-- JJ P&L · Migration: แยกรายรับเป็นกะเช้า/กะเย็น
-- รันครั้งเดียวใน Supabase SQL Editor (โปรเจกต์เดิมที่รัน setup ไปแล้ว)
-- ปลอดภัยต่อการรันซ้ำ (idempotent)
-- ============================================================

alter table pnl_income_daily
  add column if not exists sales_pos_am numeric not null default 0,
  add column if not exists sales_pos_pm numeric not null default 0,
  add column if not exists deposit_am numeric not null default 0,
  add column if not exists deposit_pm numeric not null default 0,
  add column if not exists cash_drawer_am numeric not null default 0,
  add column if not exists cash_drawer_pm numeric not null default 0,
  add column if not exists transfer_total_am numeric not null default 0,
  add column if not exists transfer_total_pm numeric not null default 0,
  add column if not exists reserve_acct_am numeric not null default 0,
  add column if not exists reserve_acct_pm numeric not null default 0,
  add column if not exists transfer_pending_prev_am numeric not null default 0,
  add column if not exists transfer_pending_prev_pm numeric not null default 0,
  add column if not exists drawer_open_am numeric not null default 0,
  add column if not exists drawer_open_pm numeric not null default 0;

-- ย้ายข้อมูลเดิม (ถ้าเคยกรอกแบบรวมวัน) ไปไว้ที่กะเช้า แล้วลบคอลัมน์เก่า
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='pnl_income_daily' and column_name='sales_pos') then
    update pnl_income_daily set
      sales_pos_am            = sales_pos,
      deposit_am              = deposit,
      cash_drawer_am          = cash_drawer,
      transfer_total_am       = transfer_total,
      reserve_acct_am         = reserve_acct,
      transfer_pending_prev_am= transfer_pending_prev,
      drawer_open_am          = drawer_open;
    alter table pnl_income_daily
      drop column sales_pos,
      drop column deposit,
      drop column cash_drawer,
      drop column transfer_total,
      drop column reserve_acct,
      drop column transfer_pending_prev,
      drop column drawer_open;
  end if;
end $$;
