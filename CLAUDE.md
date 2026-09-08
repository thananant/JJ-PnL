# JJ-PnL — จริงใจหมูกระทะ (บริษัท พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)

รวมแอปหลังบ้านของร้านหมูกระทะ 4 สาขา (JJLP ลาดพร้าว · JJRD รัชดา · JJCK ครัวกลาง · OFFICE)
ทุกแอปเป็น HTML ไฟล์เดียว รันจาก branch `main` ผ่าน GitHub Pages: https://thananant.github.io/JJ-PnL/
รายชื่อแอปทั้งหมดดู `README.md` · ผู้ใช้สื่อสารภาษาไทย — UI/คำตอบเป็นไทย

## กติกา repo

- **ห้ามเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน** — SQL ทั้งหมดอยู่ branch `sql` เท่านั้น (ไม่รวมเข้า main และไม่ merge กับใคร) · SQL ของระบบเงินเดือนอยู่ในโฟลเดอร์ `jjmk-payroll/` ของ branch นั้น · SQL ระบบ KPI คือ `jjmk-kpi.sql` ที่ root ของ branch นั้น
- กติกาเจ้าของ (2026-08-04): แก้เสร็จ+ตรวจผ่านแล้ว → เปิด PR + merge เข้า main อัตโนมัติ ไม่ต้องถามยืนยัน (ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — ถามก่อน)
- กติกาเจ้าของ (2026-09-08): SQL ที่ต้องรันใน Supabase → **แนบไฟล์ให้เจ้าของในแชทเสมอ** (SendUserFile — เจ้าของไม่ไปเปิดหาใน branch `sql` เอง แต่ยัง push เก็บที่ branch `sql` ตามกติกาข้อแรกด้วย) · งานที่ขึ้น GitHub ให้ push/merge เองเลย ไม่ต้องส่งไฟล์มาในแชท

## ระบบวัดความพึงพอใจลูกค้า (JJ KPI)

- แอปคือ `jjmk-kpi.html` ที่ root (ย้ายมาจาก repo `thananant/JJ-KPI` เมื่อ 2026-09-06) — **อ่าน `kpi/CLAUDE.md` ก่อนแก้ทุกครั้ง**
- ลูกค้ากดหน้าร้านผ่านแท็บเล็ต (`?kiosk=JJRD` / `?kiosk=JJLP`) · ไม่มี param = แดชบอร์ดเจ้าของ
- ตาราง Supabase ใช้ prefix `kpi_` ทั้งหมด (โปรเจกต์เดียวกับระบบอื่น) — **ห้ามแตะตารางที่ไม่ใช่ `kpi_*`**
- รายชื่อพนักงานให้ลูกค้าชม ซิงก์อัตโนมัติจากตาราง `employees` ของ payroll + โชว์เฉพาะคนกำลังเข้างานตามสแกน `punches` (RPC `kpi_sync_staff` / `kpi_on_duty` — อ่านอย่างเดียว)
- เทสอยู่ `kpi/test/` (`npm run check` + `npm test` ต้อง ALL PASSED ก่อนส่ง)
- แท็บเล็ตที่ยังชี้ URL เดิมของ repo JJ-KPI จะไม่ได้อัพเดตจาก repo นี้ — ต้องเปลี่ยนมาใช้ URL ใหม่

## ระบบเงินเดือน (JJ-Payroll)

- แอปคือ `jjmk-payroll.html` ที่ root เหมือนแอปอื่น (ย้ายมาจาก repo `thananant/JJ-Payroll` 2026-09-06) · ไฟล์ประกอบ (worker/tools/docs/logo) อยู่โฟลเดอร์ `jjmk-payroll/` — **อ่าน `jjmk-payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง** (กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม)
- แอปเปิดที่ https://thananant.github.io/JJ-PnL/jjmk-payroll.html
- ฐานข้อมูล Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd` (ตาราง employees/punches/adjustments/advances/... ดู `jjmk-payroll/docs/JJ-Payroll-Summary.md`)
- **งวดเงินเดือน = 26 เดือนก่อน → 25 เดือนนี้ (ไม่ตรงเดือนปฏิทิน)** — เวลาเอาค่าแรงเข้า PnL ต้องตกลงวิธีแบ่งก่อน · จุดเชื่อม Payroll↔PnL ดูข้อ 8 ใน `jjmk-payroll/docs/JJ-Payroll-Summary.md`
- `jjmk-payroll/worker.js` deploy ผ่าน Cloudflare dashboard (ไม่ใช่ GitHub) — เครื่องสแกน/รายงาน LINE ชี้ที่ Worker เดิม ไม่เกี่ยวกับการย้าย repo
