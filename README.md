# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)
- `jjmk-social.html` — ระบบฟังเสียงลูกค้า + แชทบอท (JJ Social)

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ branch
`claude/food-production-system-ph4g9g` — **ไม่รวมเข้า main**:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร)

ระบบ JJ Social: ไฟล์ติดตั้ง (`jjmk_social_setup.sql`, โฟลเดอร์ `supabase/`,
คู่มือ `README-SOCIAL.md`) เก็บที่ branch `claude/social-listening-system-342kax`
— **ไม่รวมเข้า main** เช่นกัน

⚠️ ตอน merge branch งานเข้า main: ตัดไฟล์ `.sql` ออกก่อน commit
(`git merge <branch> --no-commit` แล้ว `git rm *.sql`)
