-- ============================================================
-- jjmk-stock-b54.sql — รันครั้งเดียวใน Supabase SQL Editor
-- BETA b54: ผูกชื่อนับ ↔ ชื่อบิล + อัตราแปลงหน่วยบิล→หน่วยนับ
--
-- เพิ่มคอลัมน์อัตราแปลงหน่วยให้รายการบิล (supplier_items):
--   conv_factor = 1 หน่วยบิล เท่ากับกี่หน่วยนับ
--     เช่น บิลลง "ลัง" แต่นับเป็น "กก." และ 1 ลัง = 9 กก. → ใส่ 9
--   เว้นว่าง (NULL) = หน่วยบิลกับหน่วยนับเป็นหน่วยเดียวกัน (ระบบคิดเป็น 1)
--
-- ตั้งค่าอัตราแปลงได้ในแอปที่หน้า 🔗 ผูกชื่อ & แปลงหน่วย (เมนูข้าง)
-- ============================================================

alter table public.supplier_items add column if not exists conv_factor numeric;
comment on column public.supplier_items.conv_factor is '1 หน่วยบิล = กี่หน่วยนับ (NULL = หน่วยเดียวกัน คิดเป็น 1)';

-- ตรวจผล: ต้องเห็นทั้ง stock_name และ conv_factor
select column_name, data_type
  from information_schema.columns
 where table_schema='public' and table_name='supplier_items'
   and column_name in ('stock_name','conv_factor')
 order by column_name;
