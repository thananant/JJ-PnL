-- ============================================================
-- JJ · จัดชื่อสินค้าให้เหมือนกันทุกสาขา รอบที่ 1 (26 ส.ค. 2569)
--   เฉพาะรายการที่ชัวร์ว่าเป็นของเดียวกันแต่สะกดต่าง — เปลี่ยน "ชื่อ" อย่างเดียว
--   ปลอดภัยกับประวัติ: ข้อมูลนับผูกด้วยรหัสสินค้า ไม่ใช่ชื่อ · รันซ้ำได้
-- ============================================================

-- [A] ลาดพร้าว "กระเทียม" -> "กระเทียมปอก" (ให้ตรงรัชดา · ทั้งคู่ผูกบิล "กระเทียมจีน(ปอกเปลือก)" อยู่แล้ว)
update products set name='กระเทียมปอก'
 where branch_id='b19f0a17b448212' and name='กระเทียม' and deleted_at is null;
update pnl_stock_map set product_name='กระเทียมปอก'
 where branch='JJLP' and product_name='กระเทียม';

-- [B] ลาดพร้าว "ซุปน้ำใส" -> "ซุปใส" (ให้ตรงรัชดา)
update products set name='ซุปใส'
 where branch_id='b19f0a17b448212' and name='ซุปน้ำใส' and deleted_at is null;
update pnl_stock_map set product_name='ซุปใส'
 where branch='JJLP' and product_name='ซุปน้ำใส';

-- [C] ลาดพร้าว "น้ำยาเครื่องล้างจาน ถังขาว ฝาแดง" -> "น้ำยาเครื่องล้างจาน ถังขาวฝาแดง" (เว้นวรรคต่างกันเฉย ๆ)
update products set name='น้ำยาเครื่องล้างจาน ถังขาวฝาแดง'
 where branch_id='b19f0a17b448212' and name='น้ำยาเครื่องล้างจาน ถังขาว ฝาแดง' and deleted_at is null;
update pnl_stock_map set product_name='น้ำยาเครื่องล้างจาน ถังขาวฝาแดง'
 where branch='JJLP' and product_name='น้ำยาเครื่องล้างจาน ถังขาว ฝาแดง';

-- [D] ลาดพร้าว 3 ตัวที่ช่องหน่วยว่างเปล่า -> เติมให้ตรงรัชดา (โล) — เติมป้ายที่หายไป ไม่ใช่เปลี่ยนวิธีนับ
update products set unit='โล'
 where branch_id='b19f0a17b448212' and coalesce(unit,'')='' and deleted_at is null
   and name in ('เค้กกล้วยหอม','บัตเตอร์เค้ก','ผงนมพุดดิ้ง');

-- ตรวจผล: 4 ชื่อนี้ต้องเห็น "✅ มี" ทั้งสองสาขา
with rd as (select trim(name) nm from products where branch_id='b19f0a17b4472' and deleted_at is null),
     lp as (select trim(name) nm from products where branch_id='b19f0a17b448212' and deleted_at is null)
select x.nm as "ชื่อสินค้า",
       case when exists(select 1 from rd where lower(rd.nm)=lower(x.nm)) then '✅ มี' else '❌' end as "รัชดา",
       case when exists(select 1 from lp where lower(lp.nm)=lower(x.nm)) then '✅ มี' else '❌' end as "ลาดพร้าว"
from (values ('กระเทียมปอก'),('ซุปใส'),('น้ำยาเครื่องล้างจาน ถังขาวฝาแดง')) x(nm);
