-- ============================================================
-- JJ · ส่งออกตารางจับคู่ชื่อ "ระบบนับสต๊อก (jj-stock)" ↔ "ชื่อบิล (P&L)" รายสินค้า
--   ใช้กับแอพนับ: จับคู่ด้วย product_id (= products.id ของ jj-stock) ไม่ต้องเทียบชื่อ
--   รันทั้งไฟล์ใน Supabase SQL Editor → Export/Download CSV → เอาไปใช้กับ jj-stock ได้เลย
--   อ่านอย่างเดียว ไม่แก้อะไร รันซ้ำได้ (2 ก.ย. 2569)
--   * แอพ jj-stock อยู่โปรเจกต์ Supabase เดียวกัน อ่านตาราง pnl_stock_map สด ๆ ผ่าน PostgREST ได้เลย
--     (ดูวิธีใน docs/jj-stock-name-map.md) — ไฟล์ CSV นี้ไว้กรณีอยากได้สำเนาคงที่ *
-- ============================================================
select
  p.id                                   as product_id,            -- products.id (คีย์จับคู่)
  case p.branch_id when 'b19f0a17b4472' then 'JJRD' when 'b19f0a17b448212' then 'JJLP' else p.branch_id end
                                         as branch,                -- รหัสสาขาฝั่ง P&L
  case p.branch_id when 'b19f0a17b4472' then 'รัชดา' when 'b19f0a17b448212' then 'ลาดพร้าว' else '' end
                                         as "สาขา",
  trim(regexp_replace(p.name,'\s+',' ','g')) as "ชื่อนับ (jj-stock)",
  coalesce(case when m.active then m.pnl_item end,'') as "ชื่อบิล (P&L)",
  case when m.product_id is null then 'ยังไม่ผูก'
       when not m.active then 'ข้ามไว้ (ไม่มีในบิล)'
       when lower(trim(m.pnl_item))=lower(trim(regexp_replace(p.name,'\s+',' ','g'))) then 'ผูกแล้ว · ชื่อตรงกัน'
       else 'ผูกแล้ว · ชื่อต่างกัน' end as "สถานะ",
  p.unit                                 as "หน่วยนับ",
  coalesce(m.bill_unit,'')               as "หน่วยบิล",
  coalesce(m.factor,1)                   as "ตัวคูณหน่วย",         -- 1 หน่วยบิล = กี่หน่วยนับ
  p.sup                                  as "ซัพ (ในแอพนับ)"
from products p
left join pnl_stock_map m on m.product_id = p.id
where p.deleted_at is null
  and p.branch_id in ('b19f0a17b4472','b19f0a17b448212')
order by 2, case when m.product_id is null then 1 when not m.active then 2 else 0 end, 4;
-- ตรวจผล: แถว = จำนวนสินค้าที่ยังใช้อยู่ทั้งสองสาขา · คอลัมน์ "ชื่อบิล (P&L)" ว่าง = ยังไม่ผูก/ข้ามไว้
