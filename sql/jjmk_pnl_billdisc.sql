-- ============================================================
-- JJ P&L · ส่วนลดรายสินค้า + ส่วนลดท้ายบิล (บันทึกข้อมูลบิล)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
alter table pnl_bill_items
  add column if not exists discount numeric not null default 0;       -- ส่วนลดรายสินค้า (บาท/บรรทัด)
alter table pnl_bill_items
  add column if not exists bill_discount numeric not null default 0;  -- ส่วนลดท้ายบิล (เก็บซ้ำทุกแถวของบิล)
