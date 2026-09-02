-- ============================================================
-- JJ · รายชื่อคู่ "ชื่อนับ ↔ ชื่อบิล" ทั้งหมด สำหรับส่งให้ระบบอื่น (3 ก.ย. 2569)
--   อ่านอย่างเดียว รันซ้ำได้ · รันใน Supabase SQL Editor → Download CSV
--   ชื่อนับสองสาขาตรงกันแล้ว (หลัง jjmk_names_fix4) เลยยุบเหลือแถวเดียวต่อสินค้า
--   แถวที่ "ชื่อบิล" ว่าง = ยังไม่ผูก/ไม่มีบิล (ครัวกลาง ฯลฯ)
-- ============================================================
select nm as "ชื่อนับ",
       coalesce(bill,'') as "ชื่อบิล",
       units as "หน่วยนับ",
       brs as "สาขาที่มี"
from (
  select trim(regexp_replace(p.name,'\s+',' ','g')) as nm,
         min(m.pnl_item) as bill,
         string_agg(distinct p.unit, ' / ') as units,
         string_agg(distinct case p.branch_id when 'b19f0a17b4472' then 'รัชดา' else 'ลาดพร้าว' end, ' + ') as brs
  from products p
  left join pnl_stock_map m on m.product_id = p.id and m.active and m.pnl_item <> '-'
  where p.deleted_at is null and p.branch_id in ('b19f0a17b4472','b19f0a17b448212')
  group by 1
) t
order by (bill is null), nm;
-- ตรวจผล: จำนวนแถว ≈ จำนวนสินค้านับ (หลังยุบซ้ำ ~200) · แถวชื่อบิลว่างอยู่ท้ายตาราง
