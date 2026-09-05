# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-owner.html` — หน้าเจ้าของ (Owner Executive): ยอดขายทั้งปี กำไรสะสม งบรายเดือน การผ่อนชำระ (เข้าได้เฉพาะบัญชี admin)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)
- `jjmk-social.html` — ระบบฟังเสียงลูกค้า + แชทบอท (JJ Social)

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ **branch `sql`**
(https://github.com/thananant/JJ-PnL/tree/sql) — ไม่รวมเข้า main และไม่ merge กับใคร:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร)
- `jjmk_owner_setup.sql` — ตารางผ่อนชำระ `pnl_installments` (หน้า Owner)

ไฟล์ติดตั้งระบบ JJ Social (`jjmk_social_setup.sql`, Edge Functions ใน `supabase/`,
คู่มือ `README-SOCIAL.md`) อยู่ที่ branch
`claude/social-listening-system-342kax` — ไม่รวมเข้า main เช่นกัน

⚠️ อย่าเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน — แก้/เพิ่ม SQL ให้ทำที่ branch `sql` เท่านั้น
