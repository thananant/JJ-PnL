# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `index.html` — 🏠 ศูนย์รวมแอพ (หน้าแรก): รวมไอคอนทุกแอพ กดเข้าใช้งานได้เลย
- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-owner.html` — หน้าเจ้าของ (Owner Executive): ยอดขายทั้งปี กำไรสะสม งบรายเดือน การผ่อนชำระ (เข้าได้เฉพาะบัญชี admin)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา
- `jjmk-maint.html` — 🛠 ระบบซ่อมบำรุงสาขา (ตารางบำรุงรักษา · พนักงานบันทึกงาน+รูปถ่าย · ใช้บัญชีเดียวกับแอพนับสต๊อก)
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)
- `jjmk-social.html` — ระบบฟังเสียงลูกค้า + แชทบอท (JJ Social)
- `payroll/` — 💰 **ระบบเงินเดือน (JJ-Payroll)** ย้ายมาจาก repo `thananant/JJ-Payroll` (2026-09-06):
  เปิดที่ https://thananant.github.io/JJ-PnL/payroll/ · อ่าน `payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ **branch `sql`**
(https://github.com/thananant/JJ-PnL/tree/sql) — ไม่รวมเข้า main และไม่ merge กับใคร:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร)
- `jjmk_owner_setup.sql` — ตารางผ่อนชำระ `pnl_installments` (หน้า Owner)
- `jjmk_maint_setup.sql` — ติดตั้งตารางบำรุงรักษาสาขา + งานตั้งต้น 9 งานให้ทุกสาขา
- `payroll/*.sql` — migration ทั้งหมดของระบบเงินเดือน (15 ไฟล์ รันซ้ำได้ · Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd`)

ไฟล์ติดตั้งระบบ JJ Social (`jjmk_social_setup.sql`, Edge Functions ใน `supabase/`,
คู่มือ `README-SOCIAL.md`) อยู่ที่ branch
`claude/social-listening-system-342kax` — ไม่รวมเข้า main เช่นกัน

⚠️ อย่าเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน — แก้/เพิ่ม SQL ให้ทำที่ branch `sql` เท่านั้น
