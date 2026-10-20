-- ============================================================
-- jj_deposit_check.sql — ตรวจเงินประกัน (อ่านอย่างเดียว ไม่แก้ข้อมูล)
-- รันทีละก้อน (เลือกเฉพาะก้อนแล้ว Run) — Supabase แสดงผลเฉพาะคำสั่งสุดท้ายที่รัน (Ctrl+A ทั้งไฟล์ = ไม่ error · เห็นแค่ก้อน 10)
-- ทุกก้อนรันได้ทั้งก่อน/หลัง jj_deposit_v2.sql (ก้อน 10 อ่านช่อง _v1 ผ่าน to_jsonb — ยังไม่มีช่องก็ไม่ error) · ก้อน 2b = ดูก่อนรัน v2
-- ครอบเงินสำรองเลี้ยงชีพ (pvd_*) ด้วยในก้อน 1 และ 9
-- ============================================================

-- ก้อน 1) ใครแก้ค่าเงินประกัน/สำรองฯ เมื่อไร (ไม่รวมการบันทึกฟอร์มพนักงาน ซึ่งส่ง deposit_* ไปด้วยทุกครั้ง
--         — การเปลี่ยนรหัสสแกนผ่านฟอร์มดูที่ก้อน 6 · ดูทุกบรรทัดของคนเดียวที่ก้อน 9)
SELECT id, at, username, tbl, action, left(detail, 300) AS detail
  FROM payroll_audit
 WHERE (tbl = 'employees' AND detail ~ 'deposit_(target|monthly|opening|on)' AND detail !~ '"nick"')
    OR (tbl = 'payroll_settings' AND detail ~ 'dep_start')
    OR tbl IN ('deposit_entries', 'pvd_members', 'pvd_entries', 'pvd_payouts')
 ORDER BY id;

-- ก้อน 2) คนที่ค่าไม่ปกติ (เก็บมาก่อน > 0 · ปิดหัก · เป้า 0) — รันได้ทั้งก่อน/หลัง v2
SELECT id, code, nick, full_name, branch, active,
       deposit_target, deposit_monthly, deposit_opening, deposit_on
  FROM employees
 WHERE deposit_opening > 0 OR deposit_on = false OR deposit_target = 0
 ORDER BY branch, nick;

-- ก้อน 2b) (ก่อนรัน jj_deposit_v2.sql เท่านั้น) เป้า/หักไม่ใช่ 5,000/500 — หลังรัน v2 ใช้ก้อน 10 แทน (3,000/300)
--          target_after / monthly_after = ค่าหลังรัน v2 (เป้า > 3,000 → 3,000 · หัก > 300 → 300 · เป้า 0/ต่ำกว่า 3,000 · หัก 0/ต่ำกว่า 300 = คงเดิม)
SELECT id, code, nick, full_name, branch, active,
       deposit_target, deposit_monthly, deposit_opening, deposit_on,
       CASE WHEN deposit_target > 3000 THEN 3000 ELSE deposit_target END AS target_after,
       CASE WHEN deposit_target > 0 AND deposit_monthly > 300 THEN 300 ELSE deposit_monthly END AS monthly_after
  FROM employees
 WHERE deposit_target > 0 AND (deposit_target <> 5000 OR deposit_monthly <> 500)
 ORDER BY branch, nick;

-- ก้อน 3) ชื่อจริงซ้ำ (คนเดียวมี 2 แถว — ยอดหักอาจอยู่อีกแถว) · แถวที่ Worker สร้างเอง (ชื่อจริงว่าง) ดูก้อน 7
SELECT full_name, count(*) AS n, string_agg(id || ':' || code || ':' || nick || ':' || active::text, ' | ') AS rows
  FROM employees
 WHERE coalesce(full_name, '') <> ''
 GROUP BY full_name
HAVING count(*) > 1;

-- ก้อน 4) รายการแก้รายงวดทั้งหมด + งวดเริ่มหัก
SELECT d.id, d.period, e.nick, e.branch, d.amount, d.note, d.created_at,
       (SELECT dep_start FROM payroll_settings WHERE id = 1) AS dep_start
  FROM deposit_entries d
  JOIN employees e ON e.id = d.employee_id
 ORDER BY d.period, e.nick;

-- ก้อน 5) การลบพนักงาน / ลบสแกน (ลบพนักงาน = ลบสแกนของรหัสนั้น + deposit_entries ถาวร)
SELECT id, at, username, tbl, action, page, left(detail, 300) AS detail
  FROM payroll_audit
 WHERE tbl IN ('employees', 'punches') AND action = 'delete'
 ORDER BY id;

-- ก้อน 6) รหัสสแกนตั้งแต่ 26 ก.ค. 69 ที่ไม่มีในรายชื่อพนักงาน (รหัสถูกเปลี่ยน/ถูกลบ — สแกนไม่ผูกกับใคร)
SELECT p.emp_code, min(p.punch_date) AS first_day, max(p.punch_date) AS last_day, count(*) AS n
  FROM punches p
 WHERE p.punch_date >= '2026-07-26'
   AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.code = p.emp_code)
 GROUP BY p.emp_code
 ORDER BY p.emp_code;

-- ก้อน 7) แถวพนักงานที่ Worker สร้างเอง (ชื่อจริงว่าง หรือชื่อเล่น = รหัส) ที่ยังทำงานอยู่ — อาจเป็นคนเดียวกับอีกแถว
SELECT id, code, nick, full_name, branch, active,
       deposit_target, deposit_monthly, deposit_opening, deposit_on
  FROM employees
 WHERE active AND (coalesce(full_name, '') = '' OR nick = code)
 ORDER BY branch, code;

-- ก้อน 8) มีเป้าเงินประกัน แต่ไม่มีสแกนเลยตั้งแต่ 26 ก.ค. 69 (ยอดอาจอยู่ที่อีกแถว/อีกรหัส)
SELECT e.id, e.code, e.nick, e.full_name, e.branch, e.active, e.deposit_target
  FROM employees e
 WHERE e.deposit_target > 0
   AND NOT EXISTS (SELECT 1 FROM punches p WHERE p.emp_code = e.code AND p.punch_date >= '2026-07-26')
 ORDER BY e.branch, e.nick;

-- ก้อน 9) ทุกบรรทัดที่เกี่ยวกับพนักงานคนเดียว — แก้คำว่า ชื่อเล่น ในบรรทัด JOIN ก่อนรัน
--         เงินประกัน/สำรองฯ: insert/upsert = "employee_id":N · update/delete = employee_id=eq.N (แอปรุ่นใหม่จดแถวที่เขียนจริงด้วย)
SELECT a.id, a.at, a.username, a.tbl, a.action, a.page, left(a.detail, 500) AS detail
  FROM payroll_audit a
  JOIN employees e ON e.nick = 'ชื่อเล่น'
 WHERE (a.tbl = 'employees' AND a.detail ~ ('id=eq[.]' || e.id || '([^0-9]|$)'))
    OR (a.tbl IN ('deposit_entries', 'pvd_members', 'pvd_entries', 'pvd_payouts')
        AND (a.detail ~ ('"employee_id":' || e.id || '([^0-9]|$)') OR a.detail ~ ('employee_id=eq[.]' || e.id || '([^0-9]|$)')))
    OR (a.tbl = 'punches' AND a.detail ~ ('emp_code=eq[.]' || e.code || '([^0-9]|$)'))
 ORDER BY a.id;

-- ก้อน 9b) การลบแถวเงินประกัน/สำรองฯ ที่จดไว้แค่เลขแถว (แอปรุ่นก่อน 2026-10-20 — บอกไม่ได้ว่าเป็นของใคร/งวดไหน)
--          เทียบเวลา (at) กับก้อน 9 ของคนที่สงสัย · แถวที่ยังอยู่ในตาราง = ไม่ใช่ของที่ถูกลบ
SELECT a.id, a.at, a.username, a.tbl, a.action, a.page, left(a.detail, 300) AS detail
  FROM payroll_audit a
 WHERE a.tbl IN ('deposit_entries', 'pvd_entries', 'pvd_payouts') AND a.action = 'delete'
   AND a.detail !~ 'employee_id'
 ORDER BY a.id;

-- ก้อน 10) (หลังรัน jj_deposit_v2.sql · รันซ้ำก่อนสร้างไฟล์ K BIZ) คนที่ไม่ใช่ 3,000/300 หลังเปลี่ยนกติกา = คนที่มีข้อตกลงพิเศษ
--          "ข้อตกลงพิเศษ" = v2 คงค่าเดิมไว้ (เป้าต่ำกว่า 3,000 / หัก 0 หรือต่ำกว่า 300) — ตรวจว่าตั้งใจจริง
--          เจอ 5,000/500 (รวมคนใหม่ที่ _v1 ว่าง) = เครื่องที่ยังเป็นแอปรุ่นเก่าสร้าง/เขียนทับ → แก้ในหน้า 🛡️
--          ก่อนรัน v2 ทุกคนที่มีเป้าจะขึ้นพร้อมป้าย "ยังไม่ได้รัน jj_deposit_v2.sql" (ไม่ error)
SELECT e.id, e.code, e.nick, e.branch, e.active,
       to_jsonb(e) ->> 'deposit_target_v1'  AS deposit_target_v1,
       to_jsonb(e) ->> 'deposit_monthly_v1' AS deposit_monthly_v1,
       e.deposit_target, e.deposit_monthly,
       CASE WHEN NOT (to_jsonb(e) ? 'deposit_target_v1') THEN 'ยังไม่ได้รัน jj_deposit_v2.sql'
            WHEN to_jsonb(e) ->> 'deposit_target_v1' IS NULL THEN 'คนใหม่หลังรัน v2 — 5,000/500 = แอปรุ่นเก่าสร้าง'
            WHEN e.deposit_target  = CASE WHEN (to_jsonb(e) ->> 'deposit_target_v1')::numeric > 3000 THEN 3000
                                          ELSE (to_jsonb(e) ->> 'deposit_target_v1')::numeric END
             AND e.deposit_monthly = CASE WHEN (to_jsonb(e) ->> 'deposit_target_v1')::numeric > 0
                                           AND (to_jsonb(e) ->> 'deposit_monthly_v1')::numeric > 300 THEN 300
                                          ELSE (to_jsonb(e) ->> 'deposit_monthly_v1')::numeric END
            THEN 'ข้อตกลงพิเศษ — v2 คงค่าเดิม (เป้าต่ำกว่า 3,000 / หัก 0 หรือต่ำกว่า 300)'
            ELSE 'ปรับรายคนหลังรัน / เครื่องรุ่นเก่าเขียนทับ' END AS note
  FROM employees e
 WHERE e.deposit_target > 0
   AND (e.deposit_target <> 3000 OR e.deposit_monthly <> 300)
 ORDER BY e.branch, e.nick;
