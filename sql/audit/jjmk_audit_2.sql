-- [2] ชื่อเดียวกันแต่หน่วยนับไม่ตรงกันสองสาขา — รันทั้งไฟล์ได้เลย
with rd as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit from products
             where branch_id='b19f0a17b4472' and deleted_at is null),
     lp as (select trim(regexp_replace(name,'\s+',' ','g')) nm, unit from products
             where branch_id='b19f0a17b448212' and deleted_at is null)
select rd.nm as "ชื่อสินค้า", rd.unit as "หน่วยรัชดา", lp.unit as "หน่วยลาดพร้าว"
from rd join lp on lower(rd.nm)=lower(lp.nm)
where coalesce(rd.unit,'') <> coalesce(lp.unit,'')
order by 1;
