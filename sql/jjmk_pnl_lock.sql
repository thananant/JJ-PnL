-- ============================================================
-- JJ P&L (BETA) · ล็อกเดือน กันแก้ข้อมูลย้อนหลังโดยไม่ตั้งใจ
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
alter table pnl_month_meta
  add column if not exists locked boolean not null default false;
