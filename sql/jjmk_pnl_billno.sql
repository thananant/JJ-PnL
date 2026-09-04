-- ============================================================
-- JJ P&L · หลายบิลต่อซัพต่อวัน (เช่น บิล VAT + บิลไม่มี VAT วันเดียวกัน)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- บิลเดิมทั้งหมดกลายเป็น "บิลที่ 1" อัตโนมัติ
-- ============================================================
alter table pnl_bill_items
  add column if not exists bill_no int not null default 1;
create index if not exists pnl_bill_items_billno
  on pnl_bill_items (branch, d, supplier_id, bill_no);
