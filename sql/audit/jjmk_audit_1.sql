-- [1] สินค้าที่มีสาขาเดียว (อีกสาขาไม่มีชื่อนี้เลย) — รันทั้งไฟล์ได้เลย
with rd as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit, sup from products
             where branch_id='b19f0a17b4472' and deleted_at is null),
     lp as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit, sup from products
             where branch_id='b19f0a17b448212' and deleted_at is null)
select coalesce(rd.nm,lp.nm) as "ชื่อสินค้า",
       case when lp.nm is null then '✅ มี' else '—' end as "รัชดา",
       case when rd.nm is null then '✅ มี' else '—' end as "ลาดพร้าว",
       coalesce(rd.unit,lp.unit) as "หน่วย", coalesce(rd.sup,lp.sup) as "ซัพ"
from rd full outer join lp on lower(rd.nm)=lower(lp.nm)
where rd.nm is null or lp.nm is null
order by 2 desc, 1;
