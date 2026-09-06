-- ============================================================
-- jj_central_kitchen.sql — แยก "ครัวกลาง" เป็นสาขาใหม่ (JJCK)
-- ย้ายพนักงานที่แผนก Central Kitchen / ครัวกลาง ไปสังกัดสาขา JJCK
-- รันทั้งไฟล์ (Ctrl+A ก่อน Run) · รันซ้ำได้ ไม่พัง
-- ============================================================

-- ── ส่วน 1: ย้ายพนักงานครัวกลางเข้าสาขา JJCK ─────────────────
UPDATE employees
SET branch = 'JJCK'
WHERE lower(trim(coalesce(dept, ''))) IN ('central kitchen', 'ครัวกลาง')
  AND coalesce(branch, '') <> 'JJCK';

-- ── ส่วน 2: ตรวจผล — รายชื่อคนในสาขาครัวกลางตอนนี้ ───────────
SELECT code AS "รหัส", nick AS "ชื่อเล่น", full_name AS "ชื่อเต็ม",
       dept AS "แผนก", position AS "ตำแหน่ง",
       CASE WHEN active THEN 'ทำงานอยู่' ELSE 'พ้นสภาพ' END AS "สถานะ"
FROM employees
WHERE branch = 'JJCK'
ORDER BY active DESC, nick;
