-- ============================================================
-- jj_ot_rate.sql — อัตราค่า OT ต่อชั่วโมง (ใช้กับปุ่ม ＋OT ในตารางเข้างาน)
-- รันครั้งเดียว รันซ้ำได้ · ตั้งค่าจริงในหน้า ⚙️ ตั้งค่า ของแอป
-- ============================================================
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS ot_rate numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN payroll_settings.ot_rate IS 'ค่า OT บาท/ชั่วโมง (0 = ยังไม่ตั้ง ปุ่ม OT จะเตือนให้ตั้งก่อน)';
