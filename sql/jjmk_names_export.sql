-- ============================================================
-- JJ · ดึงชื่อสินค้าทุกตัว เทียบ "ชื่อหน้าสาขา (ระบบนับ)" กับ "ชื่อตอนลงบิล (P&L)"
--   รันทั้งไฟล์ → กดปุ่ม Export/Download CSV ที่มุมผลลัพธ์ → ส่งไฟล์ CSV กลับมา
--   อ่านอย่างเดียว ไม่แก้อะไร (26 ส.ค. 2569)
-- ============================================================
with p as (
  select distinct on (lower(trim(regexp_replace(name,'\s+',' ','g'))))
         trim(regexp_replace(name,'\s+',' ','g')) as nm, unit, sup
  from products
  where deleted_at is null and branch_id in ('b19f0a17b4472','b19f0a17b448212')
  order by lower(trim(regexp_replace(name,'\s+',' ','g'))), branch_id
),
m as (
  select distinct on (lower(trim(regexp_replace(product_name,'\s+',' ','g'))))
         trim(regexp_replace(product_name,'\s+',' ','g')) as nm, pnl_item, factor, active
  from pnl_stock_map
  order by lower(trim(regexp_replace(product_name,'\s+',' ','g'))), branch
)
select p.nm  as "ชื่อหน้าสาขา (ระบบนับ)",
       coalesce(case when m.active then m.pnl_item end,'') as "ชื่อตอนลงบิล (P&L)",
       case when m.nm is null then '❌ ยังไม่ผูก'
            when not m.active then '⏭ ข้ามไว้'
            when lower(m.pnl_item)=lower(p.nm) then '✅ ชื่อตรงกันแล้ว'
            else '⚠ ชื่อไม่เหมือนกัน' end as "สถานะ",
       p.unit as "หน่วยนับ",
       coalesce(m.factor,1) as "ตัวคูณ (1 หน่วยบิล = กี่หน่วยนับ)",
       p.sup  as "ซัพ"
from p left join m on lower(m.nm)=lower(p.nm)
order by case when m.nm is not null and m.active and lower(m.pnl_item)<>lower(p.nm) then 0
              when m.nm is null then 1
              when m.nm is not null and not m.active then 2
              else 3 end, p.nm;
