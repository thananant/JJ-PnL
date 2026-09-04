-- ============================================================
-- JJ · ตารางรวมชื่อทุกตัว: ชื่อบิล ↔ ชื่อนับรัชดา ↔ ชื่อนับลาดพร้าว + ช่องว่างให้พิมพ์ "ชื่อนับหลัก"
--   ใช้แก้ชื่อสองสาขาให้เหมือนกันในรอบเดียว (2 ก.ย. 2569) · อ่านอย่างเดียว รันซ้ำได้
--   วิธีใช้: รันทั้งไฟล์ใน Supabase SQL Editor → Download CSV → เปิดใน Sheets/Excel
--            → พิมพ์ชื่อที่ต้องการในคอลัมน์ "✏ ชื่อนับหลัก" (เว้นว่าง = ชื่อเดิมโอเคแล้ว) → ส่งไฟล์กลับมา
--            → เดี๋ยวได้ไฟล์แก้ jjmk_names_fix4.sql เปลี่ยนชื่อทั้งสองสาขา + ตารางผูก ให้รันครั้งเดียว
-- ============================================================
with pr as (  -- สินค้านับที่ยังใช้อยู่ทั้งสองสาขา
  select id, name, unit, sup,
         case branch_id when 'b19f0a17b4472' then 'RD' when 'b19f0a17b448212' then 'LP' end as br,
         lower(trim(regexp_replace(name,'\s+',' ','g'))) as nk
  from products
  where deleted_at is null and branch_id in ('b19f0a17b4472','b19f0a17b448212')
),
mp as (      -- การผูกที่ใช้งานอยู่
  select m.branch, m.pnl_item, m.product_id, lower(trim(m.pnl_item)) as bk
  from pnl_stock_map m
  where m.active and m.product_id not like 'none:%' and m.pnl_item <> '-'
),
j as (       -- สินค้านับ + ชื่อบิลที่ผูก (ถ้ามี)
  select pr.*, mp.pnl_item, mp.bk from pr left join mp on mp.product_id = pr.id
),
g as (       -- จับกลุ่ม: ผูกแล้วใช้ชื่อบิลเป็นตัวกลาง · ยังไม่ผูกใช้ชื่อนับ (ตัด normalize) เป็นตัวกลาง
  select coalesce(bk, 'stk:'||nk) as gk,
         min(pnl_item) as bill,
         string_agg(distinct name, ' / ') filter (where br='RD') as rd,
         string_agg(distinct name, ' / ') filter (where br='LP') as lp,
         string_agg(distinct unit, ' / ') as units,
         string_agg(distinct sup,  ' / ') filter (where sup is not null and sup<>'') as sups,
         count(*) filter (where br='RD') as n_rd,
         count(*) filter (where br='LP') as n_lp
  from j group by 1
)
select coalesce(bill,'') as "ชื่อบิล (P&L)",
       coalesce(rd,'')  as "ชื่อนับ รัชดา",
       coalesce(lp,'')  as "ชื่อนับ ลาดพร้าว",
       ''                as "✏ ชื่อนับหลัก",
       trim(both ' · ' from
         case when n_rd>1 or n_lp>1 then '⚠ ผูกซ้อน ' || case when n_rd>1 then 'รด×'||n_rd||' ' else '' end || case when n_lp>1 then 'ลพ×'||n_lp else '' end || ' · ' else '' end ||
         case when bill is null then 'ยังไม่ผูกบิล · ' else '' end ||
         case when rd is null then 'ไม่มีที่รัชดา · ' when lp is null then 'ไม่มีที่ลาดพร้าว · ' else '' end ||
         case when rd is not null and lp is not null and lower(rd)=lower(lp) and n_rd=1 and n_lp=1 then 'ชื่อตรงกันแล้ว' else '' end
       ) as "สถานะ",
       coalesce(units,'') as "หน่วย", coalesce(sups,'') as "ซัพ"
from g
order by case when n_rd>1 or n_lp>1 then 0                       -- ผูกซ้อนขึ้นก่อน
              when rd is not null and lp is not null and lower(rd)<>lower(lp) then 1  -- สองสาขาชื่อไม่ตรง
              when bill is null then 2                            -- ยังไม่ผูกบิล
              when rd is null or lp is null then 3 else 4 end,    -- มีสาขาเดียว · เรียบร้อย
         1, 2;
-- ตรวจผล: จำนวนแถว ≈ จำนวนสินค้ารวมสองระบบหลังจับกลุ่ม (~210) · กลุ่มบนสุด = ⚠ ผูกซ้อน 12 กลุ่มจากที่เช็คไว้
