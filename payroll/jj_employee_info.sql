-- ============================================================
-- jj_employee_info.sql — ข้อมูลพนักงานเพิ่มเติม (JJ-Payroll)
-- วันเกิด / เบอร์โทร / บัญชีธนาคารสำหรับโอนเงินเดือน
-- รันทั้งไฟล์ใน Supabase SQL Editor (โปรเจกต์ jjmk-stock) ครั้งเดียว
-- รันซ้ำได้ ไม่พัง
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN employees.birth_date        IS 'วันเกิดพนักงาน';
COMMENT ON COLUMN employees.phone             IS 'เบอร์โทรติดต่อ';
COMMENT ON COLUMN employees.bank_name         IS 'ธนาคารสำหรับโอนเงินเดือน';
COMMENT ON COLUMN employees.bank_account      IS 'เลขบัญชี / เบอร์พร้อมเพย์';
COMMENT ON COLUMN employees.bank_account_name IS 'ชื่อเจ้าของบัญชี';
