# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-owner.html` — หน้าเจ้าของ (Owner Executive): ยอดขายทั้งปี กำไรสะสม งบรายเดือน การผ่อนชำระ (เข้าได้เฉพาะบัญชี admin)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ branch
`claude/food-production-system-ph4g9g` — **ไม่รวมเข้า main**:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร)
- `jjmk_owner_setup.sql` — ตารางผ่อนชำระ `pnl_installments` (หน้า Owner)

⚠️ ตอน merge branch งานเข้า main: ตัดไฟล์ `.sql` ออกก่อน commit
(`git merge <branch> --no-commit` แล้ว `git rm *.sql`)
