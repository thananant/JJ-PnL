-- ============================================================
-- JJ P&L · โหมด VAT ของรายละเอียดบิล (none / ex=ยังไม่รวม+7% / inc=รวมแล้ว)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
alter table pnl_bill_items
  add column if not exists vat_mode text not null default 'none';
