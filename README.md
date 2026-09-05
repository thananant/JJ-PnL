# SQL ของระบบ JJMK (รันครั้งเดียวใน Supabase → SQL Editor)

## ครัวกลาง (JJ Kitchen) — รันตามลำดับ

1. `jjmk_kitchen_setup.sql` — สร้างตาราง ck_* + สิทธิ์ + ฟังก์ชัน
2. `jjmk_kitchen_data.sql` — ข้อมูลตั้งต้น (ซัพ 7 · วัตถุดิบ 42 · เมนู 17 · สูตร)

## แอพนับสต๊อกสาขา

- `jjmk-stock-b54.sql` — b54: ผูกชื่อนับ↔ชื่อบิล + อัตราแปลงหน่วยบิล→หน่วยนับ (supplier_items)

## ตารางบำรุงรักษาสาขา (ในแอพนับสต๊อก · เมนูซ่อมบำรุง)

- `jjmk_maint_setup.sql` — ตาราง maint_tasks/maint_logs + สิทธิ์ + bucket รูป `maint-photos`
  + งานตั้งต้น 9 งานให้ทุกสาขา (รันซ้ำได้ ไม่เพิ่มซ้ำ)

branch นี้เก็บเฉพาะไฟล์ SQL — ไม่รวมเข้า main และไม่ merge กับ branch อื่น
