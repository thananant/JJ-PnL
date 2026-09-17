-- ============================================================
-- JJ เช็คสต๊อก · เพิ่มช่อง "แผนก" ในตารางสินค้าระบบนับ (17 ก.ย. 2569) — รันซ้ำได้
--   สินค้าแต่ละตัวสังกัดแผนก (ครัว/หน้าเตา/บาร์น้ำ ฯลฯ) ใช้จัดกลุ่มตอนเช็คสต๊อก
--   คนละเรื่องกับซัพพลายเออร์ (ซัพเดียวกันส่งของให้หลายแผนกได้)
--   หมายเหตุ: อัตราใช้/วัน (rate_wk=จ-พฤ, rate_fri=ศ, rate_we=ส-อา), safety/max,
--   และรูปสินค้า (image_url) มีอยู่แล้วในตาราง products — ไม่ต้องเพิ่ม
-- ============================================================
alter table products add column if not exists dept text;

-- ---------- ตรวจผล ----------
select column_name as คอลัมน์ที่ต้องมี
from information_schema.columns
where table_name='products' and column_name in ('dept','image_url','rate_wk','rate_fri','rate_we','safety','max')
order by column_name;
select count(*) as สินค้าทั้งหมด, count(dept) as ตั้งแผนกแล้ว from products where deleted_at is null;
-- คาด: เห็นคอลัมน์ dept (+ ตัวอื่นที่มีอยู่แล้ว) · ตั้งแผนกแล้ว 0 (ครั้งแรก) — ไปตั้งในหน้าเช็คสต๊อก แท็บ ⚙️ ตั้งค่า
