-- ============================================================
-- jj_payroll_sql_check.sql — เช็คว่ารัน SQL ของแอปเงินเดือนครบหรือยัง (อ่านอย่างเดียว · ไม่แก้ข้อมูล)
-- กด Ctrl+A เลือกทั้งหมดก่อน Run · ผล ❌ ขึ้นบนสุด = ไฟล์ที่ยังต้องรัน (อยู่ branch sql โฟลเดอร์ jjmk-payroll/)
-- คอลัมน์ "แอปใช้ได้" = สิทธิ์ของแอป (anon) อ่าน/เขียนตารางนั้น · ❌ = แอปขึ้น permission denied (รันไฟล์นั้นซ้ำ — มีบล็อก GRANT)
-- ไม่อยู่ในรายการ (ไม่ต้องรันเพื่อให้แอปทำงาน): jj_deposit_check.sql · jj_pay_changes_diff.sql · jj_info_preview.sql (อ่านอย่างเดียว)
--   jj_info_apply.sql · jj_info_fix.sql · jj_deposit_reset.sql (ใส่/ล้างข้อมูลครั้งเดียว — ห้ามรันซ้ำ)
-- ============================================================
WITH col AS (
  SELECT table_name || '.' || column_name AS k FROM information_schema.columns WHERE table_schema = 'public'
), chk(ord, file, what, ok, tbl) AS (VALUES
  (1,  'jj_audit.sql',            'ตาราง payroll_audit (ประวัติ 🕘)',                     to_regclass('public.payroll_audit') IS NOT NULL, 'payroll_audit'),
  (2,  'jj_employee_info.sql',    'ข้อมูลพนักงาน: ธนาคาร/วันเกิด/เบอร์',                 'employees.bank_account' IN (SELECT k FROM col) AND 'employees.birth_date' IN (SELECT k FROM col), ''),
  (3,  'jj_employee_hr.sql',      'ข้อมูล HR: เอกสาร/ผู้ติดต่อฉุกเฉิน/สัญชาติ',           'employees.worker_group' IN (SELECT k FROM col) AND 'employees.emergency_name' IN (SELECT k FROM col), ''),
  (4,  'jj_work_dates.sql',       'วันเริ่ม/ออก + ตาราง fine_entries',                   'employees.start_date' IN (SELECT k FROM col) AND to_regclass('public.fine_entries') IS NOT NULL, 'fine_entries'),
  (5,  'jj_kbiz_added.sql',       'employees.kbiz_added (เพิ่มบัญชี K BIZ แล้ว)',         'employees.kbiz_added' IN (SELECT k FROM col), ''),
  (6,  'jj_ot_rate.sql',          'payroll_settings.ot_rate',                           'payroll_settings.ot_rate' IN (SELECT k FROM col), ''),
  (7,  'jj_holiday_scope.sql',    'วันหยุดรายสาขา (holidays.scope/cal_id)',              'holidays.scope' IN (SELECT k FROM col) AND 'holidays.cal_id' IN (SELECT k FROM col), ''),
  (8,  'jj_tips.sql',             'ตาราง tips + เลือกคน (member_ids)',                   'tips.member_ids' IN (SELECT k FROM col), 'tips'),
  (9,  'jj_sso.sql',              'ประกันสังคม: ตาราง sso_entries + ค่าตั้ง',              to_regclass('public.sso_entries') IS NOT NULL AND 'payroll_settings.sso_rate' IN (SELECT k FROM col) AND 'employees.sso_on' IN (SELECT k FROM col), 'sso_entries'),
  (10, 'jj_loans.sql',            'เงินยืม: loans + loan_entries',                       to_regclass('public.loans') IS NOT NULL AND to_regclass('public.loan_entries') IS NOT NULL, 'loan_entries'),
  (11, 'jj_mou.sql',              'MOU: mou_loans + mou_entries + doc_borrows',         to_regclass('public.mou_loans') IS NOT NULL AND to_regclass('public.mou_entries') IS NOT NULL AND to_regclass('public.doc_borrows') IS NOT NULL, 'mou_entries'),
  (12, 'jj_central_kitchen.sql',  'พนักงานแผนกครัวกลางอยู่สาขา JJCK ครบ',               NOT EXISTS (SELECT 1 FROM employees e WHERE lower(trim(coalesce(to_jsonb(e) ->> 'dept', ''))) IN ('central kitchen', 'ครัวกลาง') AND coalesce(to_jsonb(e) ->> 'branch', '') <> 'JJCK'), ''),
  (13, 'jj_birthday_line.sql',    'แจ้งวันเกิดทาง LINE (bday_line + payroll_line_log)',  'payroll_settings.bday_line' IN (SELECT k FROM col) AND to_regclass('public.payroll_line_log') IS NOT NULL, ''),
  (14, 'jj_deposit.sql',          'เงินประกัน: deposit_entries + ช่องในพนักงาน',          to_regclass('public.deposit_entries') IS NOT NULL AND 'employees.deposit_target' IN (SELECT k FROM col), 'deposit_entries'),
  (15, 'jj_deposit_start.sql',    'payroll_settings.dep_start (เริ่มหักตั้งแต่งวด)',      'payroll_settings.dep_start' IN (SELECT k FROM col), ''),
  (16, 'jj_deposit_v2.sql',       'เงินประกัน 3,000/300 (ช่อง _v1 + note)',               'employees.deposit_target_v1' IN (SELECT k FROM col) AND 'deposit_entries.note' IN (SELECT k FROM col), ''),
  (17, 'jj_deposit_start_fix.sql','เริ่มหักตั้งแต่งวด = ส.ค. 2569 (คืนค่า 21 ต.ค.)',      coalesce((SELECT max(to_jsonb(p) ->> 'dep_start') FROM payroll_settings p), '') = '2026-08', ''),
  (18, 'jj_provident.sql',        'เงินสำรองเลี้ยงชีพ: pvd_members/entries/payouts',     to_regclass('public.pvd_members') IS NOT NULL AND to_regclass('public.pvd_entries') IS NOT NULL AND to_regclass('public.pvd_payouts') IS NOT NULL, 'pvd_entries'),
  (19, 'jj_deposit_payouts.sql',  '💵 เบิกเงินประกันคืน: deposit_payouts',               to_regclass('public.deposit_payouts') IS NOT NULL, 'deposit_payouts'),
  (20, 'jj_emp_start.sql',        'เดือนเริ่มหักรายคน: deposit_start / sso_start',        'employees.deposit_start' IN (SELECT k FROM col) AND 'employees.sso_start' IN (SELECT k FROM col), ''),
  (21, 'jj_pay_close.sql',        '🔒 ปิดงวด: pay_batches + pay_slips + ตัวกันแก้/ลบ',   to_regclass('public.pay_batches') IS NOT NULL AND to_regclass('public.pay_slips') IS NOT NULL
                                                                                         AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pay_slips_ro'), 'pay_slips')
)
SELECT ord AS "ลำดับ", file AS "ไฟล์", what AS "ตรวจ",
       CASE WHEN ok THEN '✅ รันแล้ว' ELSE '❌ ยังไม่รัน' END AS "ผล",
       CASE WHEN tbl = '' THEN '' WHEN to_regclass('public.' || tbl) IS NULL THEN '–'
            WHEN has_table_privilege('anon', to_regclass('public.' || tbl), 'SELECT') AND has_table_privilege('anon', to_regclass('public.' || tbl), 'INSERT') THEN '✅'
            ELSE '❌ ไม่มีสิทธิ์' END AS "แอปใช้ได้"
FROM chk
ORDER BY ok, ord;
