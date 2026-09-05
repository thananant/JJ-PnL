-- ============================================================
-- JJ · ตรวจความตรงกันของสองสาขา (26 ส.ค. 2569) — อ่านอย่างเดียว ไม่แก้อะไร
--   รันทั้งไฟล์ใน Supabase SQL Editor แล้วส่งผลทุกตารางกลับมา
--   รัชดา = b19f0a17b4472 · ลาดพร้าว = b19f0a17b448212
-- ============================================================
with rd as (select id, trim(regexp_replace(name,'\s+',' ','g')) nm, unit, sup from products
             where branch_id='b19f0a17b4472' and deleted_at is null),
     lp as (select id, trim(regexp_replace(name,'\s+',' ','g')) nm, unit, sup from products
             where branch_id='b19f0a17b448212' and deleted_at is null)

-- [1] สินค้าที่มีสาขาเดียว (อีกสาขาไม่มีชื่อนี้เลย)
select coalesce(rd.nm,lp.nm) as "ชื่อสินค้า",
       case when lp.nm is null then '✅ มี' else '—' end as "รัชดา",
       case when rd.nm is null then '✅ มี' else '—' end as "ลาดพร้าว",
       coalesce(rd.unit,lp.unit) as "หน่วย", coalesce(rd.sup,lp.sup) as "ซัพ"
from rd full outer join lp on lower(rd.nm)=lower(lp.nm)
where rd.nm is null or lp.nm is null
order by 2 desc, 1;

-- [2] ชื่อเดียวกันแต่หน่วยนับไม่ตรงกัน (ตัวที่ระบบไม่กล้าผูกกระจกให้)
with rd as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit from products
             where branch_id='b19f0a17b4472' and deleted_at is null),
     lp as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit from products
             where branch_id='b19f0a17b448212' and deleted_at is null)
select rd.nm as "ชื่อสินค้า", rd.unit as "หน่วยรัชดา", lp.unit as "หน่วยลาดพร้าว"
from rd join lp on lower(rd.nm)=lower(lp.nm)
where coalesce(rd.unit,'') <> coalesce(lp.unit,'')
order by 1;

-- [3] การผูกชื่อที่ไม่เหมือนกันสองสาขา (ชื่อสินค้าเดียวกัน แต่ผูกคนละชื่อบิล/คนละตัวคูณ)
with m as (select branch, trim(regexp_replace(product_name,'\s+',' ','g')) nm, pnl_item, factor
            from pnl_stock_map where active),
     rd as (select * from m where branch='JJRD'),
     lp as (select * from m where branch='JJLP')
select rd.nm as "ชื่อสินค้า",
       rd.pnl_item as "รัชดาผูกกับ", lp.pnl_item as "ลาดพร้าวผูกกับ",
       rd.factor as "ตัวคูณรัชดา", lp.factor as "ตัวคูณลาดพร้าว"
from rd join lp on lower(rd.nm)=lower(lp.nm)
where rd.pnl_item<>lp.pnl_item or rd.factor<>lp.factor
order by 1;

-- [4] ผูกไว้สาขาเดียว (อีกสาขายังไม่ผูก)
with m as (select branch, trim(regexp_replace(product_name,'\s+',' ','g')) nm, pnl_item
            from pnl_stock_map where active),
     rd as (select * from m where branch='JJRD'),
     lp as (select * from m where branch='JJLP')
select coalesce(rd.nm,lp.nm) as "ชื่อสินค้า",
       coalesce(rd.pnl_item,'— ยังไม่ผูก') as "รัชดา",
       coalesce(lp.pnl_item,'— ยังไม่ผูก') as "ลาดพร้าว"
from rd full outer join lp on lower(rd.nm)=lower(lp.nm)
where rd.nm is null or lp.nm is null
order by 1;

-- [5] สรุปตัวเลขรวม
select 'สินค้าในระบบนับ รัชดา' as "รายการ", count(*)::text as "จำนวน" from products where branch_id='b19f0a17b4472' and deleted_at is null
union all select 'สินค้าในระบบนับ ลาดพร้าว', count(*)::text from products where branch_id='b19f0a17b448212' and deleted_at is null
union all select 'ผูกแล้ว รัชดา', count(*)::text from pnl_stock_map where branch='JJRD' and active
union all select 'ผูกแล้ว ลาดพร้าว', count(*)::text from pnl_stock_map where branch='JJLP' and active
union all select 'ข้ามไว้ รัชดา', count(*)::text from pnl_stock_map where branch='JJRD' and not active
union all select 'ข้ามไว้ ลาดพร้าว', count(*)::text from pnl_stock_map where branch='JJLP' and not active;
