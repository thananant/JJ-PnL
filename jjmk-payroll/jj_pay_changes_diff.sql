-- ============================================================
-- jj_pay_changes_diff.sql — อ่านอย่างเดียว · "ใครเปลี่ยนค่าที่กระทบเงินเดือน จากอะไรเป็นอะไร" ตั้งแต่ 2026-07-26
-- เจ้าของขอ 2026-10-21 (ตรวจว่าตั้งค่าอะไรผิด/แก้หลังจ่ายเงินไปแล้ว)
-- payroll_audit ของพนักงานจดทั้งฟอร์ม (ไม่จดค่าเดิม) → ไฟล์นี้เทียบกับการบันทึกครั้งก่อนของคนเดียวกันให้ เหลือเฉพาะช่องที่เปลี่ยนจริง
-- ช่องที่ดู: ชนิดค่าจ้าง · ค่าแรง · วิธีนับงาน · วันหยุด/เดือน · ได้เบี้ยวันหยุด · สาขา · สถานะทำงาน · ประกันสังคม
-- + ทุกการแก้ ตั้งค่าเงินเดือน / กะ / วันหยุดพิเศษ / เครื่องสแกน · ไม่ดึงข้อมูลส่วนตัว (เบอร์/บัญชี/วันเกิด)
-- ผลยาว = กด Download (CSV) แล้วส่งไฟล์
-- ============================================================
WITH e AS (
  SELECT a.at, a.display_name,
         substring(a.detail from '"code":"([^"]*)"')         AS code,
         substring(a.detail from '"nick":"([^"]*)"')         AS nick,
         substring(a.detail from '"wage_type":"([^"]*)"')    AS wage,
         substring(a.detail from '"rate":([0-9.]+)')         AS rate,
         substring(a.detail from '"work_mode":"([^"]*)"')    AS mode,
         substring(a.detail from '"off_count":([0-9]+)')     AS offc,
         substring(a.detail from '"holiday_pay":(true|false)') AS hol,
         substring(a.detail from '"branch":"([^"]*)"')       AS br,
         substring(a.detail from '"active":(true|false)')    AS act,
         substring(a.detail from '"sso_on":(true|false)')    AS sso
  FROM payroll_audit a
  WHERE a.tbl = 'employees' AND a.action IN ('insert', 'update', 'upsert')
    AND a.at >= '2026-05-01'
    AND a.detail LIKE '{"code":%'
), d AS (
  SELECT e.*,
         lag(wage) OVER w AS p_wage, lag(rate) OVER w AS p_rate, lag(mode) OVER w AS p_mode,
         lag(offc) OVER w AS p_offc, lag(hol) OVER w AS p_hol, lag(br) OVER w AS p_br,
         lag(act) OVER w AS p_act, lag(sso) OVER w AS p_sso
  FROM e
  WINDOW w AS (PARTITION BY code ORDER BY at)
), c AS (
  SELECT at, display_name, nick, code,
         concat_ws(' · ',
           CASE WHEN p_wage IS NOT NULL AND wage IS NOT NULL AND p_wage <> wage THEN 'ชนิดค่าจ้าง ' || p_wage || ' → ' || wage END,
           CASE WHEN p_rate IS NOT NULL AND rate IS NOT NULL AND p_rate::numeric <> rate::numeric THEN 'ค่าแรง ' || p_rate || ' → ' || rate END,
           CASE WHEN p_mode IS NOT NULL AND mode IS NOT NULL AND p_mode <> mode THEN 'วิธีนับงาน ' || p_mode || ' → ' || mode END,
           CASE WHEN p_offc IS NOT NULL AND offc IS NOT NULL AND p_offc <> offc THEN 'วันหยุด/เดือน ' || p_offc || ' → ' || offc END,
           CASE WHEN p_hol IS NOT NULL AND hol IS NOT NULL AND p_hol <> hol THEN 'เบี้ยวันหยุด ' || p_hol || ' → ' || hol END,
           CASE WHEN p_br IS NOT NULL AND br IS NOT NULL AND p_br <> br THEN 'สาขา ' || p_br || ' → ' || br END,
           CASE WHEN p_act IS NOT NULL AND act IS NOT NULL AND p_act <> act THEN 'ทำงานอยู่ ' || p_act || ' → ' || act END,
           CASE WHEN p_sso IS NOT NULL AND sso IS NOT NULL AND p_sso <> sso THEN 'ประกันสังคม ' || p_sso || ' → ' || sso END
         ) AS chg
  FROM d
  WHERE at >= '2026-07-26'
)
SELECT at AT TIME ZONE 'Asia/Bangkok' AS เวลา, display_name AS ผู้ทำ, 'พนักงาน: ' || coalesce(nick, '') || ' (' || coalesce(code, '') || ')' AS เรื่อง, chg AS เปลี่ยน
FROM c
WHERE chg <> ''
UNION ALL
SELECT a.at AT TIME ZONE 'Asia/Bangkok', a.display_name,
       CASE a.tbl WHEN 'payroll_settings' THEN 'ตั้งค่าเงินเดือน' WHEN 'shifts' THEN 'กะการทำงาน'
                  WHEN 'holidays' THEN 'วันหยุดพิเศษ' WHEN 'devices' THEN 'เครื่องสแกน' ELSE 'พนักงาน (แก้บางช่อง)' END || ' · ' || a.action,
       left(a.detail, 300)
FROM payroll_audit a
WHERE a.at >= '2026-07-26' AND a.action IN ('insert', 'update', 'upsert', 'delete')
  AND ( a.tbl IN ('payroll_settings', 'shifts', 'holidays', 'devices')
     OR (a.tbl = 'employees' AND a.detail NOT LIKE '{"code":%'
         AND a.detail ~* '"(rate|wage_type|work_mode|off_count|holiday_pay|branch|active|sso_on|deposit_[a-z_0-9]+|start_date|end_date)"') )
ORDER BY 1;
