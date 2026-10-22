-- ============================================================
-- jj_emp_start.sql — งวดเริ่มหักรายคน: เงินประกัน + ประกันสังคม (JJ-Payroll · เจ้าของสั่ง 2026-10-21)
-- "อยากให้เพิ่มเงื่อนไข การหักเงินประกัน กับ ประกันสังคม ว่าเริ่มเดือนไหน เพราะมีพนักงานบางคนที่เพิ่งเริ่มหัก และหักมานานแล้ว"
--   employees.deposit_start = งวดแรกที่หักเงินประกันของคนนี้ (YYYY-MM) · '' = ตามระบบ (payroll_settings.dep_start)
--       แอปหักตั้งแต่งวดที่หลังกว่าระหว่าง ค่าระบบ กับ ค่ารายคน · แถว 🔒/💸/🏦 เดิมยังนับเหมือนเดิม
--   employees.sso_start     = งวดแรกที่หัก สปส. อัตโนมัติ (YYYY-MM) · '' = ทุกงวดที่ติ๊กเข้า สปส. (แบบเดิม) · ✎ รายงวดยังใช้ได้
-- เพิ่มคอลัมน์อย่างเดียว ค่าเริ่ม '' ทุกคน = ยอดเงินเท่าเดิมทุกบาท · ไม่แก้/ไม่ลบข้อมูลเดิม · รันซ้ำได้ ไม่พัง
-- ⚠️ ก่อนรัน: ทุกเครื่อง/ทุกแท็บที่เปิดแอปเงินเดือน (มือถือ ผจก. · คอมออฟฟิศ) ลากหน้าลงจนเห็นป้ายรุ่น "2026-10-21 · เงินประกัน v2.3 · เริ่มหักรายคน"
--    (ท้ายเมนู / หัวหน้า 🛡️) — แท็บรุ่นก่อนไม่รู้จักงวดเริ่มรายคน: สลิป/ไฟล์ K BIZ/🔒 อัตโนมัติวันจ่ายจากแท็บนั้นจะหักตามระบบ (🔒 ยอดที่ไม่ได้หักจริงถาวร)
-- กด Ctrl+A เลือกทั้งหมดก่อน Run · หลังรัน: เช็คป้ายรุ่นทุกเครื่องอีกครั้ง แล้วค่อยตั้ง "เริ่มหักงวด" ที่หน้า 🛡️ / 🧾 (ช่องเลือกใต้ชื่อพนักงาน)
-- ย้อนกลับ (ห้ามรันเอง — ปรึกษาก่อน · ค่าที่ตั้งไว้หาย ยอดกลับไปคิดตามระบบ):
--   ALTER TABLE employees DROP COLUMN IF EXISTS deposit_start; ALTER TABLE employees DROP COLUMN IF EXISTS sso_start;
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS deposit_start text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sso_start     text NOT NULL DEFAULT '';

-- รูปแบบงวด YYYY-MM หรือว่าง (ลบแล้วใส่ใหม่ = รันซ้ำได้)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_deposit_start_chk;
ALTER TABLE employees ADD CONSTRAINT employees_deposit_start_chk CHECK (deposit_start ~ '^([0-9]{4}-(0[1-9]|1[0-2]))?$');
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_sso_start_chk;
ALTER TABLE employees ADD CONSTRAINT employees_sso_start_chk CHECK (sso_start ~ '^([0-9]{4}-(0[1-9]|1[0-2]))?$');

COMMENT ON COLUMN employees.deposit_start IS 'งวดแรกที่หักเงินประกันของคนนี้ YYYY-MM (ว่าง = ตามระบบ payroll_settings.dep_start · แอปใช้งวดที่หลังกว่า)';
COMMENT ON COLUMN employees.sso_start     IS 'งวดแรกที่หักประกันสังคมอัตโนมัติ YYYY-MM (ว่าง = ทุกงวดที่ติ๊กเข้า สปส. · แก้รายงวดใน sso_entries ยังมีผล)';

-- ให้ API เห็นคอลัมน์ใหม่ทันที
NOTIFY pgrst, 'reload schema';

-- ตรวจผล: ต้องได้ 2 แถว (deposit_start, sso_start) · ค่าไม่ว่างตอนรันครั้งแรก = 0 คน
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employees' AND column_name IN ('deposit_start', 'sso_start')
ORDER BY column_name;
SELECT count(*) FILTER (WHERE deposit_start <> '') AS dep_set, count(*) FILTER (WHERE sso_start <> '') AS sso_set, count(*) AS employees
FROM employees;
