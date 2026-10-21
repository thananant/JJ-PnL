-- ============================================================
-- jj_deposit_v2.sql — เงินประกันกติกาใหม่ (เจ้าของสั่ง 2026-10-20)
-- เป้า 3,000 · หักเดือนละ 300 · เริ่มงวด 2026-10 · หักต่อจากยอดสะสมเดิม · ปรับรายคนได้
-- งวดก่อน 2026-10 แอปคิดด้วยค่าเดิมที่เก็บไว้ใน *_v1 (เท่าเดิมทุกบาท)
-- ⚠️ รันหลังทุกเครื่องได้แอปรุ่นใหม่แล้วเท่านั้น (ลากหน้าลง/F5 แล้วเห็นป้าย "เงินประกัน v2" ท้ายเมนู — ปุ่ม 🔄 ไม่พอ)
--    แอปรุ่นเก่าจะคิดงวด ส.ค./ก.ย. ด้วย 3,000/300 และเขียน 5,000/500 ทับตอนบันทึกฟอร์มพนักงาน
-- เปลี่ยนเฉพาะส่วนที่เกิน: เป้ามากกว่า 3,000 → 3,000 · หักมากกว่า 300 → 300
--    ข้อตกลงพิเศษคงเดิม (ไม่ถูกทับ): เป้า 0 (ไม่อยู่ในระบบเงินประกัน) · เป้าต่ำกว่า 3,000 · หัก 0 (ตั้งใจไม่หัก/ใช้แทนการปิดหัก) · หักต่ำกว่า 300
-- ⚠️ ก่อนรัน ให้รัน jj_deposit_check.sql ก้อน 2b ดูรายชื่อก่อน (ช่อง target_after / monthly_after = ค่าหลังรันไฟล์นี้)
-- กด Ctrl+A เลือกทั้งหมดก่อน Run · รันซ้ำได้ (ไม่ทับค่าที่ปรับรายคนทีหลัง)
-- ประวัติ: จดลง payroll_audit (หน้า 🕘) 1 บรรทัด "jj_deposit_v2 …" ตอนรันครั้งแรก · ย้อนกลับ = คอมเมนต์ท้ายไฟล์
-- หลังรัน: ทุกเครื่องโหลดหน้าใหม่อีกครั้ง · ผลตารางท้ายไฟล์ = คนที่ไม่ใช่ 3,000/300 — ต้องมีแต่ "ข้อตกลงพิเศษ" ที่ตั้งใจคงไว้
-- ============================================================

-- 0) ช่อง note ของ deposit_entries (แอปเขียน ✎ '' / 🔒 'lock' / 💸 'refund') — jj_deposit.sql สร้างไว้แล้ว · กันกรณีตารางถูกสร้างทางอื่น · รันซ้ำได้
ALTER TABLE deposit_entries ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

-- 0b) สิทธิ์อ่าน/เขียนสมุดเงินประกันของแอป (รอบ 10 — ตารางที่สร้างหลังเปลี่ยนค่าตั้งต้นของ Supabase ไม่ได้สิทธิ์ให้ anon/authenticated อัตโนมัติ
--     ถ้าไม่มีสิทธิ์ แอปอ่านสมุดไม่ได้ → การ์ด 🛡️ ประวัติเงินประกันขึ้นเตือน + ออกสลิป/K BIZ ไม่ได้) · มีสิทธิ์อยู่แล้ว = ไม่เปลี่ยนอะไร · รันซ้ำได้
GRANT SELECT, INSERT, UPDATE, DELETE ON deposit_entries TO anon, authenticated;

-- 1) ช่องเก็บ "เป้า/หักต่อเดือน" แบบเดิม (ใช้กับงวดก่อน 2026-10 เท่านั้น · แอปอ่านอย่างเดียว ไม่เคยเขียน)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deposit_target_v1  numeric;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deposit_monthly_v1 numeric;

COMMENT ON COLUMN employees.deposit_target_v1  IS 'เป้าเงินประกันแบบเดิม (ใช้คิดงวดก่อน 2026-10) — NULL = คนที่เข้ามาหลังเปลี่ยนกติกา';
COMMENT ON COLUMN employees.deposit_monthly_v1 IS 'หักต่อเดือนแบบเดิม (ใช้คิดงวดก่อน 2026-10)';

-- 1b) จดประวัติ (payroll_audit · หน้า 🕘 ของแอป) ก่อนเปลี่ยน — ครั้งเดียว (เงื่อนไขเดียวกับข้อ 2) · ยังไม่มีตาราง payroll_audit = ข้าม
DO $$
BEGIN
  IF to_regclass('public.payroll_audit') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM employees WHERE deposit_target_v1 IS NOT NULL) THEN
    EXECUTE format(
      'INSERT INTO payroll_audit (username, display_name, action, tbl, detail, page) VALUES (%L, %L, %L, %L, %L, %L)',
      'sql', 'SQL Editor (jj_deposit_v2.sql)', 'update', 'employees',
      'jj_deposit_v2: เงินประกัน 3,000/300 ตั้งแต่งวด 2026-10 · เก็บค่าเดิมใน deposit_target_v1/deposit_monthly_v1 · เปลี่ยน '
        || (SELECT count(*) FROM employees WHERE deposit_target > 3000 OR (deposit_target > 0 AND deposit_monthly > 300)) || ' คน (เป้า > 3,000 / หัก > 300)'
        || ' · คงข้อตกลงพิเศษ (เป้าต่ำกว่า 3,000 / หัก 0 หรือต่ำกว่า 300) '
        || (SELECT count(*) FROM employees WHERE deposit_target > 0 AND (deposit_target < 3000 OR deposit_monthly < 300)) || ' คน'
        || ' · ย้อนกลับ: คอมเมนต์ท้าย jj_deposit_v2.sql',
      '#sql');
  END IF;
END $$;

-- 2) ลดเป็น 3,000 / 300 ครั้งเดียว แบบไม่ทับข้อตกลงพิเศษ — เก็บค่าเดิมลง *_v1 ในคำสั่งเดียวกัน
--    เป้า: มากกว่า 3,000 → 3,000 · เป้า 0 และเป้าที่ต่ำกว่า 3,000 คงเดิม
--    หัก:  (เป้า > 0 และ) มากกว่า 300 → 300 · หัก 0 (ตั้งใจไม่หัก) และหักที่ต่ำกว่า 300 คงเดิม · เป้า 0 คงหักเดิม
--    (ทุกช่องใน SET อ่านค่าก่อนแก้ของแถวนั้น) · ทำเฉพาะตอนที่ยังไม่มีใครมี *_v1 (= ยังไม่เคยรัน)
UPDATE employees
   SET deposit_target_v1  = deposit_target,
       deposit_monthly_v1 = deposit_monthly,
       deposit_target  = CASE WHEN deposit_target > 3000 THEN 3000 ELSE deposit_target END,
       deposit_monthly = CASE WHEN deposit_target > 0 AND deposit_monthly > 300 THEN 300 ELSE deposit_monthly END
 WHERE NOT EXISTS (SELECT 1 FROM employees x WHERE x.deposit_target_v1 IS NOT NULL);

-- 3) ค่าเริ่มต้นของพนักงานใหม่ (Worker สร้างพนักงานจากเครื่องสแกนโดยใช้ค่านี้)
ALTER TABLE employees ALTER COLUMN deposit_target  SET DEFAULT 3000;
ALTER TABLE employees ALTER COLUMN deposit_monthly SET DEFAULT 300;

-- 4) ความหมายช่อง note ของ deposit_entries (ไม่เปลี่ยนโครงตาราง)
COMMENT ON COLUMN deposit_entries.note IS
  ''''' = แก้เอง (✎) · ''lock'' = ปิดยอดงวดที่จ่ายแล้ว (🔒) · ''lock:neg|short:<ยอดปกติ>:<สุทธิก่อนหักเงินประกัน>'' = 🔒 ที่หักไม่ได้/ได้บางส่วนเพราะสุทธิไม่พอ · ''refund'' = คืนเงินประกันส่วนเกินในสลิป (💸 amount ติดลบ) · ''xfer:<YYYY-MM-DD>'' = โอนคืนนอกสลิป คนพ้นสภาพ (🏦 amount ติดลบ · ไม่เข้าสลิป)';

-- 5) ตรวจผล (อ่านอย่างเดียว · ซ้ำกับ jj_deposit_check.sql ก้อน 10) — คนที่ไม่ใช่ 3,000/300 หลังรัน
--    "ข้อตกลงพิเศษ" = SQL คงค่าเดิมไว้ (เป้าต่ำกว่า 3,000 / หัก 0 หรือต่ำกว่า 300) — ดูว่าตั้งใจจริง ไม่ใช่ = แก้รายคนที่หน้า 🛡️
--    คนใหม่ (_v1 ว่าง) ที่เป็น 5,000/500 = แอปรุ่นเก่าที่ยังค้างอยู่สักเครื่องสร้าง/เขียนทับ → แก้ในหน้า 🛡️ + ให้เครื่องนั้นลากหน้าลง
SELECT id, code, nick, branch, active,
       deposit_target_v1, deposit_monthly_v1, deposit_target, deposit_monthly,
       CASE WHEN deposit_target_v1 IS NULL THEN 'คนใหม่หลังรัน v2 — 5,000/500 = แอปรุ่นเก่าสร้าง'
            WHEN deposit_target  = CASE WHEN deposit_target_v1 > 3000 THEN 3000 ELSE deposit_target_v1 END
             AND deposit_monthly = CASE WHEN deposit_target_v1 > 0 AND deposit_monthly_v1 > 300 THEN 300 ELSE deposit_monthly_v1 END
            THEN 'ข้อตกลงพิเศษ — SQL คงค่าเดิม (เป้าต่ำกว่า 3,000 / หัก 0 หรือต่ำกว่า 300)'
            ELSE 'ปรับรายคนหลังรัน / เครื่องรุ่นเก่าเขียนทับ' END AS note
  FROM employees
 WHERE deposit_target > 0
   AND (deposit_target <> 3000 OR deposit_monthly <> 300)
 ORDER BY branch, nick;

-- ============================================================
-- ย้อนกลับ (ห้ามรันเอง — ปรึกษาก่อน · แอปจะกลับไปคิด 5,000/500 ทุกงวด · ค่าที่ปรับรายคนหลังรัน v2 หาย · แถว 🔒/💸 ที่บันทึกแล้วไม่ถูกลบ)
--   UPDATE employees SET deposit_target = deposit_target_v1, deposit_monthly = deposit_monthly_v1 WHERE deposit_target_v1 IS NOT NULL;
--   ALTER TABLE employees DROP COLUMN IF EXISTS deposit_target_v1;
--   ALTER TABLE employees DROP COLUMN IF EXISTS deposit_monthly_v1;
--   ALTER TABLE employees ALTER COLUMN deposit_target SET DEFAULT 5000;
--   ALTER TABLE employees ALTER COLUMN deposit_monthly SET DEFAULT 500;
-- ============================================================
