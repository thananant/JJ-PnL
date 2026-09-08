# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `index.html` — 🏠 ศูนย์รวมแอพ (หน้าแรก): รวมไอคอนทุกแอพ กดเข้าใช้งานได้เลย
- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-owner.html` — หน้าเจ้าของ (Owner Executive): ยอดขายทั้งปี กำไรสะสม งบรายเดือน การผ่อนชำระ (เข้าได้เฉพาะบัญชี admin)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา
- `jjmk-maint.html` — 🛠 ระบบซ่อมบำรุงสาขา (ตารางบำรุงรักษา · พนักงานบันทึกงาน+รูปถ่าย · ใช้บัญชีเดียวกับแอพนับสต๊อก)
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)
- `jjmk-social.html` — ระบบฟังเสียงลูกค้า + แชทบอท (JJ Social)
- `jjmk-kpi.html` — 📊 ระบบวัดความพึงพอใจลูกค้า (JJ KPI): ลูกค้ากดหน้าร้านผ่านแท็บเล็ต
  (`?kiosk=JJRD` / `?kiosk=JJLP`) · ไม่มี param = แดชบอร์ดเจ้าของ · ย้ายมาจาก repo `thananant/JJ-KPI` (2026-09-06)
  อ่าน `kpi/CLAUDE.md` ก่อนแก้ทุกครั้ง · เทสอยู่ `kpi/test/`
- `jjmk-payroll.html` — 💰 **ระบบเงินเดือน (JJ Payroll)** ย้ายมาจาก repo `thananant/JJ-Payroll` (2026-09-06):
  เปิดที่ https://thananant.github.io/JJ-PnL/jjmk-payroll.html · ไฟล์ประกอบ (worker/tools/docs/logo)
  อยู่โฟลเดอร์ `jjmk-payroll/` · อ่าน `jjmk-payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง
- `jjmk-invoice.html` — 🧾 **ระบบออกใบกำกับภาษี (JJ Invoice)** พอร์ตจาก Google Apps Script (2026-09-08):
  ออกใบเสร็จรับเงิน/ใบกำกับภาษีตามฟอร์มบิล JJRD · ข้อมูลบิลเก็บใน Supabase (ตาราง prefix `inv_`
  ตัวหนังสือล้วน **ไม่เก็บไฟล์รูป/PDF ใดๆ ใน Supabase**) · ไฟล์ PDF บันทึกลงโฟลเดอร์ NAS
  ที่เลือกไว้ผ่านเบราว์เซอร์ (File System Access API, แยกโฟลเดอร์รายเดือน) · เลขบิลรันต่อสาขา
  ผ่าน RPC `inv_next_bill_no` · ลายเซ็นผู้รับเงินอัพโหลดครั้งเดียวในหน้าตั้งค่า (เก็บในเครื่อง)
  · ส่งอีเมลแนบ PDF หาลูกค้าอัตโนมัติผ่าน Apps Script ของ Gmail ร้าน (ใส่ URL ในหน้าตั้งค่า,
  เก็บใน `inv_settings`) + Apps Script ตรวจอีเมลตีกลับทุก 5 นาทีแล้วอัพเดตสถานะ
  ส่งถึงแล้ว/ส่งไม่สำเร็จ กลับเข้า Supabase · โค้ด Apps Script ส่งให้เจ้าของทางแชท

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ **branch `sql`**
(https://github.com/thananant/JJ-PnL/tree/sql) — ไม่รวมเข้า main และไม่ merge กับใคร:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร)
- `jjmk_owner_setup.sql` — ตารางหน้า Owner: ผ่อนชำระ `pnl_installments` + ยอดขาย/กำไรใส่เอง `pnl_owner_monthly`
- `jjmk_maint_setup.sql` — ติดตั้งตารางบำรุงรักษาสาขา + งานตั้งต้น 9 งานให้ทุกสาขา
- `jjmk-kpi.sql` — ติดตั้งตารางระบบวัดความพึงพอใจลูกค้า (JJ KPI, ตาราง prefix `kpi_`)
- `jjmk-payroll/*.sql` — migration ทั้งหมดของระบบเงินเดือน (15 ไฟล์ รันซ้ำได้ · Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd`)

ไฟล์ติดตั้งระบบ JJ Social (`jjmk_social_setup.sql`, Edge Functions ใน `supabase/`,
คู่มือ `README-SOCIAL.md`) อยู่ที่ branch
`claude/social-listening-system-342kax` — ไม่รวมเข้า main เช่นกัน

⚠️ อย่าเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน — แก้/เพิ่ม SQL ให้ทำที่ branch `sql` เท่านั้น
