-- [4] ผูกไว้สาขาเดียว (อีกสาขายังไม่ผูก) — รันทั้งไฟล์ได้เลย
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
