# JJ-PnL — จริงใจหมูกระทะ (บริษัท พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)

รวมแอปหลังบ้านของร้านหมูกระทะ 4 สาขา (JJLP ลาดพร้าว · JJRD รัชดา · JJCK ครัวกลาง · OFFICE)
ทุกแอปเป็น HTML ไฟล์เดียว รันจาก branch `main` ผ่าน GitHub Pages: https://thananant.github.io/JJ-PnL/
รายชื่อแอปทั้งหมดดู `README.md` · ผู้ใช้สื่อสารภาษาไทย — UI/คำตอบเป็นไทย

## กติกา repo

- **ห้ามเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน** — SQL ทั้งหมดอยู่ branch `sql` เท่านั้น (ไม่รวมเข้า main และไม่ merge กับใคร) · SQL ของระบบเงินเดือนอยู่ในโฟลเดอร์ `payroll/` ของ branch นั้น
- กติกาเจ้าของ (2026-08-04): แก้เสร็จ+ตรวจผ่านแล้ว → เปิด PR + merge เข้า main อัตโนมัติ ไม่ต้องถามยืนยัน (ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — ถามก่อน)

## ระบบเงินเดือน (JJ-Payroll)

- โค้ดอยู่ที่ `payroll/` (ย้ายมาจาก repo `thananant/JJ-Payroll` เมื่อ 2026-09-06) — **อ่าน `payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง** (กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม)
- แอปเปิดที่ https://thananant.github.io/JJ-PnL/payroll/
- ฐานข้อมูล Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd` (ตาราง employees/punches/adjustments/advances/... ดู `payroll/docs/JJ-Payroll-Summary.md`)
- **งวดเงินเดือน = 26 เดือนก่อน → 25 เดือนนี้ (ไม่ตรงเดือนปฏิทิน)** — เวลาเอาค่าแรงเข้า PnL ต้องตกลงวิธีแบ่งก่อน · จุดเชื่อม Payroll↔PnL ดูข้อ 8 ใน `payroll/docs/JJ-Payroll-Summary.md`
- `payroll/worker.js` deploy ผ่าน Cloudflare dashboard (ไม่ใช่ GitHub) — เครื่องสแกน/รายงาน LINE ชี้ที่ Worker เดิม ไม่เกี่ยวกับการย้าย repo
