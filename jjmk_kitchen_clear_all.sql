-- ============================================================
-- ล้างข้อมูลทดลองทั้งระบบครัวกลาง — เริ่มใช้งานจริงแบบสะอาด
--
-- ลบทั้งหมด: ประวัติเข้า-ออกสต๊อก (รับของ/ผลิต/ส่งสาขา/นับสต๊อก) · การผลิต · ใบสั่งซื้อ
--            ออเดอร์สาขา · แผนผลิต · ค่าใช้จ่าย · ยอดคงเหลือทุกตัวเป็น 0
-- เก็บไว้ครบ: รายชื่อวัตถุดิบ+ราคา+รูป · เมนู/สูตร/ส่วนผสม · ราคาขายสาขา · ซัพพลายเออร์
--            ประเภทค่าใช้จ่ายที่เพิ่มเอง · ประวัติราคา
-- รันซ้ำได้ ไม่พัง
-- ============================================================

-- ① ดูก่อนว่าจะลบอะไร และอะไรที่เก็บไว้
select 'ลบ' as "ทำอะไร", 'ประวัติเข้า-ออกสต๊อก' as "ข้อมูล", count(*) as "จำนวน" from ck_moves
union all select 'ลบ', 'การผลิต', count(*) from ck_productions
union all select 'ลบ', 'ใบสั่งซื้อ (PO)', count(*) from ck_pos
union all select 'ลบ', 'ออเดอร์สาขา', count(*) from ck_orders
union all select 'ลบ', 'แผนผลิต', count(*) from ck_plans
union all select 'ลบ', 'ค่าใช้จ่าย', count(*) from ck_expenses
union all select 'ตั้งเป็น 0', 'วัตถุดิบที่มียอดคงเหลือ', count(*) from ck_items where coalesce(qty,0) <> 0
union all select 'ตั้งเป็น 0', 'ของที่ผลิตที่มียอดคงเหลือ', count(*) from ck_recipes where coalesce(qty,0) <> 0
union all select 'เก็บไว้', 'วัตถุดิบ', count(*) from ck_items where deleted_at is null
union all select 'เก็บไว้', 'เมนู/สูตร', count(*) from ck_recipes where deleted_at is null
union all select 'เก็บไว้', 'ส่วนผสมในสูตร', count(*) from ck_recipe_items
union all select 'เก็บไว้', 'ซัพพลายเออร์', count(*) from ck_sups;

-- ② ล้าง (คำสั่งเดียว — สำเร็จทั้งหมดหรือไม่เปลี่ยนอะไรเลย)
--    Supabase จะเด้งถามว่า "destructive operation" ให้กดยืนยันรัน
with mv as (delete from ck_moves where true returning 1),
pi as (delete from ck_prod_items where true returning 1),
pr as (delete from ck_productions where true returning 1),
poi as (delete from ck_po_items where true returning 1),
po as (delete from ck_pos where true returning 1),
oi as (delete from ck_order_items where true returning 1),
od as (delete from ck_orders where true returning 1),
pl as (delete from ck_plans where true returning 1),
ex as (delete from ck_expenses where true returning 1),
qi as (update ck_items set qty = 0 where coalesce(qty,0) <> 0 returning 1),
qr as (update ck_recipes set qty = 0 where coalesce(qty,0) <> 0 returning 1)
select (select count(*) from mv) as "ลบประวัติสต๊อก",
       (select count(*) from pr) as "ลบการผลิต",
       (select count(*) from po) as "ลบใบสั่งซื้อ",
       (select count(*) from od) as "ลบออเดอร์สาขา",
       (select count(*) from pl) as "ลบแผนผลิต",
       (select count(*) from ex) as "ลบค่าใช้จ่าย",
       (select count(*) from qi) + (select count(*) from qr) as "สต๊อกกลับเป็น 0";
