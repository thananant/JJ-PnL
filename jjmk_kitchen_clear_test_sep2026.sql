-- ============================================================
-- ลบข้อมูลทดลอง — การผลิตเดือน ก.ย. 2569 ของครัวกลาง
-- (หน้า 📈 สถิติ: ผลิตทั้งเดือน / ใช้เดือนนี้ / การใช้วัตถุดิบ / การผลิตตามเมนู)
--
-- ทำแบบเดียวกับปุ่ม "ลบการผลิต" ในแอพทุกอย่าง:
--   · คืนวัตถุดิบที่ถูกตัดไปตอนผลิต กลับเข้าสต๊อก
--   · ตัดน้ำจิ้ม/ของที่ผลิตออกจากสต๊อก
--   · แผนผลิตที่ถูกติ๊กว่า "ผลิตแล้ว" กลับเป็น "รอผลิต"
-- ไม่แตะ: การรับของ/สั่งซื้อ · การนับสต๊อก · ออเดอร์สาขา · ค่าใช้จ่าย · เมนู/สูตร/วัตถุดิบ/ราคา
-- รันซ้ำได้ ไม่พัง และไม่คืนสต๊อกซ้ำ
-- ============================================================

-- ① ดูก่อนว่าจะลบรายการไหน (ถ้าเห็นรายการที่ไม่ใช่ของทดลอง อย่ารันข้อ ②)
select p.d as "วันที่", p.name as "เมนู", p.qty as "จำนวน", round(p.cost_total,2) as "ต้นทุน"
from ck_productions p
where p.d between '2026-09-01' and '2026-09-30'
order by p.d, p.id;

-- ② ลบ (คำสั่งเดียว — สำเร็จทั้งหมดหรือไม่เปลี่ยนอะไรเลย)
with tp as (
  select id, plan_id from ck_productions where d between '2026-09-01' and '2026-09-30'
), tm as (
  select * from ck_moves where ref in (select id from tp) and kind in ('use','made')
), back_items as (
  update ck_items i set qty = round(coalesce(i.qty,0) - s.q, 2)
  from (select ref_id, sum(qty) q from tm where item_kind = 'item' group by ref_id) s
  where i.id = s.ref_id returning 1
), back_recipes as (
  update ck_recipes r set qty = round(coalesce(r.qty,0) - s.q, 2)
  from (select ref_id, sum(qty) q from tm where item_kind = 'recipe' group by ref_id) s
  where r.id = s.ref_id returning 1
), del_moves as (
  delete from ck_moves where id in (select id from tm) returning 1
), del_lines as (
  delete from ck_prod_items where prod_id in (select id from tp) returning 1
), del_prods as (
  delete from ck_productions where id in (select id from tp) returning 1
), reopen_plans as (
  update ck_plans set status = 'plan'
  where id in (select plan_id from tp where plan_id is not null) and status = 'done' returning 1
)
select (select count(*) from del_prods)    as "ลบการผลิต",
       (select count(*) from del_lines)    as "ลบวัตถุดิบที่ใช้",
       (select count(*) from del_moves)    as "ลบประวัติสต๊อก",
       (select count(*) from back_items)   as "คืนสต๊อกวัตถุดิบ",
       (select count(*) from back_recipes) as "ตัดสต๊อกของที่ผลิต",
       (select count(*) from reopen_plans) as "แผนกลับเป็นรอผลิต";
