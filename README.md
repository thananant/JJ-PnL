# JJ-PnL — จริงใจหมูกระทะ

แอพทั้งหมดรันจาก branch `main` (GitHub Pages: https://thananant.github.io/JJ-PnL/):

- `jjmk-pnl.html` — ระบบบัญชีรายรับ–รายจ่าย (P&L)
- `jjmk-stock-beta.html` — ระบบนับสต๊อกสาขา + 🛠 ตารางบำรุงรักษาสาขา
  (เมนูข้าง → ซ่อมบำรุง หรือเปิดตรง `jjmk-stock-beta.html#maint`)
- `jjmk-kitchen.html` — ระบบครัวกลาง (JJ Kitchen)

ไฟล์ SQL (รันครั้งเดียวใน Supabase → SQL Editor) เก็บที่ branch งาน — **ไม่รวมเข้า main**:

- `jjmk_kitchen_setup.sql` — ติดตั้งตารางระบบครัวกลาง (branch `claude/food-production-system-ph4g9g`)
- `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้นครัวกลาง (วัตถุดิบ/เมนู/สูตร) (branch เดียวกัน)
- `jjmk_maint_setup.sql` — ติดตั้งตารางบำรุงรักษาสาขา + งานตั้งต้น (branch `claude/branch-maintenance-schedule-5twl9m`)

⚠️ ตอน merge branch งานเข้า main: ตัดไฟล์ `.sql` ออกก่อน commit
(`git merge <branch> --no-commit` แล้ว `git rm *.sql`)
