-- ============================================================
-- JJ P&L · ค่าส่ง + ค่าธรรมเนียมอื่นๆ ท้ายบิล (บันทึกข้อมูลบิล)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
alter table pnl_bill_items
  add column if not exists ship_fee numeric not null default 0;   -- ค่าส่ง (บาท/บิล เก็บซ้ำทุกแถว)
alter table pnl_bill_items
  add column if not exists other_fee numeric not null default 0;  -- ค่าธรรมเนียมอื่นๆ (บาท/บิล)
