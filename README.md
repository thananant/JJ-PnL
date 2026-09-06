# SQL ของระบบ JJMK (รันครั้งเดียวใน Supabase → SQL Editor)

## ครัวกลาง (JJ Kitchen) — รันตามลำดับ

1. `jjmk_kitchen_setup.sql` — สร้างตาราง ck_* + สิทธิ์ + ฟังก์ชัน
2. `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้น (ซัพ 7 · วัตถุดิบ 42 · เมนู 17 · สูตร)

## แอพนับสต๊อกสาขา

- `jjmk-stock-b54.sql` — b54: ผูกชื่อนับ↔ชื่อบิล + อัตราแปลงหน่วยบิล→หน่วยนับ (supplier_items)

## หน้าเจ้าของ (jjmk-owner.html)

- `jjmk_owner_setup.sql` — ตารางผ่อนชำระ `pnl_installments` + ยอดขาย/กำไรใส่เองรายเดือน `pnl_owner_monthly` (รันซ้ำได้)

## ตารางบำรุงรักษาสาขา (ในแอพนับสต๊อก · เมนูซ่อมบำรุง)

- `jjmk_maint_setup.sql` — ตาราง maint_tasks/maint_logs + สิทธิ์ + bucket รูป `maint-photos`
  + งานตั้งต้น 9 งานให้ทุกสาขา (รันซ้ำได้ ไม่เพิ่มซ้ำ)

branch นี้เก็บเฉพาะไฟล์ SQL — ไม่รวมเข้า main และไม่ merge กับ branch อื่น

## ระบบเงินเดือน (JJ-Payroll — โค้ดอยู่ `payroll/` บน main)

- `payroll/*.sql` — migration ทั้งหมดที่เคยรันใน Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd` (15 ไฟล์ เรียงตามชื่อ รันซ้ำได้)
  ย้ายมาจาก repo `thananant/JJ-Payroll` (2026-09-06) — รายละเอียดแต่ละไฟล์ดู `payroll/CLAUDE.md` บน main
- ⚠️ Supabase SQL Editor ต้อง **Ctrl+A ก่อน Run** (editor รันเฉพาะส่วนที่ไฮไลต์)
- งานค้าง: `payroll/jj_tips.sql` เวอร์ชันล่าสุด (มี member_ids) ถ้ายังไม่ได้รันให้รัน · เติมรหัสเครื่องสแกน 17 คนใน `payroll/jj_info_fix.sql` ส่วน 4
