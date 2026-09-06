-- ============================================================
-- 🔧 แก้ 19 คนที่จับคู่ไม่ได้ — มี 4 ส่วน รันทั้งไฟล์ได้เลย (Ctrl+A → Run)
-- ส่วน 1: ค้นหาผู้สมัครที่ใกล้เคียง (ดูรหัสไปเติมในส่วน 4)
-- ส่วน 2: แก้อัตโนมัติ 2 คนที่มั่นใจ (พี่แจง→แจง CHO MAR LWIN · เเพร→แพร ธัญชนก)
-- ส่วน 3: ล้างวันเกิดผิด (เลย์ 2026) เผื่อรัน apply ฉบับแรกไปแล้ว
-- ส่วน 4: เทมเพลตเติมรหัส 17 คนที่เหลือ — เติม code แล้วรันซ้ำ (แถวที่ยังว่างถูกข้าม)
-- ============================================================

-- ── ส่วน 1: หาผู้สมัคร ─────────────────────────────────────
WITH prob(row_no, nick, name) AS (VALUES
 (4::int, 'พี่แจง'::text, 'CHI MAR LWIN'::text),
 (23, 'ลิลลี่', 'เกสร'),
 (42, 'น้ำฝน', 'Nan Khant Khant Hlaing'),
 (50, 'เล็ก', 'Saw Muscle Htoo'),
 (57, 'เมา', 'Sai Leng Mao'),
 (59, 'น้ำฝน', 'Nan Su Su Hlaing'),
 (60, 'พะแสง', 'Zin Min Thu'),
 (69, 'หนุ่ม', 'Sai Moon Oo'),
 (84, 'ฟ้า', 'นาย ไซ เลียน ฟา'),
 (85, 'ลิลลี่', 'NAN LIN LIN KHAING'),
 (92, 'เเพร', 'นางสาวธัญชนก บุญรัตน์'),
 (93, 'วี', 'นัน แคน แคน วิน'),
 (95, 'ต้น', 'XOUMPHONPHAKDY'),
 (99, 'Savana', 'Savanmanothay'),
 (100, 'หอม', 'Nan Hom Lin'),
 (102, 'น้อย', 'NANG PUT'),
 (114, 'โซ', 'SAW AUNG AUNG'),
 (140, 'แตงโม', 'MRS. LA LIN'),
 (144, 'วิน', 'มิน เอา ตู')
)
SELECT p.row_no AS "แถว", p.nick AS "ชื่อเล่น(ไฟล์)", p.name AS "ชื่อ(ไฟล์)",
       e.code  AS "รหัส → เอาไปเติมส่วน 4", e.nick AS "ชื่อเล่น(ระบบ)",
       e.full_name AS "ชื่อเต็ม(ระบบ)", e.branch AS "สาขา", e.dept AS "แผนก",
       CASE WHEN e.active THEN 'ทำงานอยู่' ELSE 'พ้นสภาพ' END AS "สถานะ"
FROM prob p
JOIN employees e ON (
     lower(trim(e.nick)) = lower(replace(p.nick, 'เเ', 'แ'))
  OR lower(trim(e.nick)) = lower(regexp_replace(p.nick, '^พี่', ''))
  OR lower(trim(e.nick)) = lower(p.nick)
  OR (length(split_part(p.name,' ',1)) >= 3 AND e.full_name ILIKE '%'||split_part(p.name,' ',1)||'%')
  OR (length(split_part(p.name,' ',2)) >= 3 AND e.full_name ILIKE '%'||split_part(p.name,' ',2)||'%')
)
ORDER BY p.row_no, e.active DESC, e.branch, e.nick;

-- ── ส่วน 2: แก้อัตโนมัติที่มั่นใจ ──────────────────────────
WITH m(nickmatch, fullmatch, birth, phone, bank, acc) AS (VALUES
 ('แจง'::text, '%CHO MAR LWIN%'::text, '1977-08-06'::date, '0619325526'::text, 'กรุงไทย'::text, '7660708333'::text),
 ('แพร', '%ธัญชนก%', '2004-03-29', '0824936992', 'กสิกร', '2121227536')
)
UPDATE employees e SET
  birth_date        = COALESCE(m.birth, e.birth_date),
  phone             = CASE WHEN m.phone <> '' THEN m.phone ELSE e.phone END,
  bank_name         = CASE WHEN m.bank  <> '' THEN m.bank  ELSE e.bank_name END,
  bank_account      = CASE WHEN m.acc   <> '' THEN m.acc   ELSE e.bank_account END,
  bank_account_name = CASE WHEN coalesce(e.bank_account_name,'') = '' AND m.bank <> '' AND m.bank <> 'เงินสด'
                           THEN coalesce(nullif(e.full_name,''), e.nick) ELSE e.bank_account_name END
FROM m
WHERE e.active = true
  AND lower(trim(e.nick)) = lower(m.nickmatch)
  AND e.full_name ILIKE m.fullmatch;

-- ── ส่วน 3: ล้างวันเกิดผิดของ เลย์ (2026-06-06) ─────────────
UPDATE employees SET birth_date = NULL
WHERE code = '2147833848' AND birth_date = DATE '2026-06-06';

-- ── ส่วน 4: เติมรหัสแล้วรัน (คอลัมน์แรก '' → ใส่รหัสจากส่วน 1) ──
WITH m(code, birth, phone, bank, acc, accname) AS (VALUES
 (''::text, '2007-05-12'::date, '0996098609'::text, 'กสิกร'::text, '2272954006'::text, 'เกสร'::text),   -- แถว 23 · ลิลลี่ · เกสร
 ('', '2003-10-09', '', 'เงินสด', '', 'Nan Khant Khant Hlaing'),   -- แถว 42 · น้ำฝน · Nan Khant Khant Hlaing
 ('', '2007-03-15', '0941786162', 'เงินสด', '', 'Saw Muscle Htoo'),   -- แถว 50 · เล็ก · Saw Muscle Htoo
 ('', '2000-05-01', '0829613025', 'เงินสด', '', 'Sai Leng Mao'),   -- แถว 57 · เมา · Sai Leng Mao
 ('', '2005-03-13', '0627765020', 'เงินสด', '', 'Nan Su Su Hlaing'),   -- แถว 59 · น้ำฝน · Nan Su Su Hlaing
 ('', '2006-12-01', '0843374215', 'เงินสด', '', 'Zin Min Thu'),   -- แถว 60 · พะแสง · Zin Min Thu
 ('', '2006-12-02', '0647461217', '', '', 'Sai Moon Oo'),   -- แถว 69 · หนุ่ม · Sai Moon Oo
 ('', '2006-03-29', '0946095628', '', '', 'นาย ไซ เลียน ฟา'),   -- แถว 84 · ฟ้า · นาย ไซ เลียน ฟา
 ('', '2005-03-25', '0994708922', '', '', 'NAN LIN LIN KHAING'),   -- แถว 85 · ลิลลี่ · NAN LIN LIN KHAING
 ('', '2005-03-02', '0626204139', '', '', 'นัน แคน แคน วิน'),   -- แถว 93 · วี · นัน แคน แคน วิน
 ('', '2010-09-02', '0643467617', '', '', 'XOUMPHONPHAKDY'),   -- แถว 95 · ต้น · XOUMPHONPHAKDY
 ('', '2004-02-09', '0950766381', 'กสิกร', '2221714086', 'Savanmanothay'),   -- แถว 99 · Savana · Savanmanothay
 ('', '2008-09-03', '0628825085', '', '', 'Nan Hom Lin'),   -- แถว 100 · หอม · Nan Hom Lin
 ('', '1991-04-20', '0619617568', 'กสิกร', '1273371067', 'NANG PUT'),   -- แถว 102 · น้อย · NANG PUT
 ('', '1994-03-14', '0661460621', 'เงินสด', '', 'SAW AUNG AUNG'),   -- แถว 114 · โซ · SAW AUNG AUNG
 ('', '1990-04-14', '0627352754', 'กสิกร', '1991405263', 'MRS. LA LIN'),   -- แถว 140 · แตงโม · MRS. LA LIN
 ('', '2007-02-24', '0816854700', 'เงินสด', '', 'มิน เอา ตู')   -- แถว 144 · วิน · มิน เอา ตู
)
UPDATE employees e SET
  birth_date        = COALESCE(m.birth, e.birth_date),
  phone             = CASE WHEN m.phone <> '' THEN m.phone ELSE e.phone END,
  bank_name         = CASE WHEN m.bank  <> '' THEN m.bank  ELSE e.bank_name END,
  bank_account      = CASE WHEN m.acc   <> '' THEN m.acc   ELSE e.bank_account END,
  bank_account_name = CASE WHEN coalesce(e.bank_account_name,'') = '' AND m.bank <> '' AND m.bank <> 'เงินสด'
                           THEN m.accname ELSE e.bank_account_name END
FROM m
WHERE m.code <> '' AND e.code = m.code;
