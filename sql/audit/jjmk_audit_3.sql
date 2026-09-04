-- [3] สินค้าเดียวกันแต่สองสาขาผูกคนละชื่อบิล/คนละตัวคูณ — รันทั้งไฟล์ได้เลย
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
