-- ============================================================
-- JJ · แก้ชื่อตามไฟล์ที่เคาะกลับมา 8 รายการ (26 ส.ค. 2569) — รันครั้งเดียว รันซ้ำได้
--   หลัก: สองระบบชื่อต่างกันได้ (เชื่อมด้วยการผูก) — แก้เฉพาะที่เคาะมา
-- ============================================================

-- [C] แก้การผูกที่ผิด (เปลี่ยนเฉพาะ "ชื่อบิลที่ผูกไว้" ของสินค้านับตัวนั้น)
update pnl_stock_map set pnl_item='แฟนต้าน้ำส้ม กล่อง 10 ลิตร'
 where product_name='fanta ส้ม' and active and pnl_item='ส้ม';
update pnl_stock_map set pnl_item='น้ำซอสบะหมี่หยก'
 where product_name='น้ำซอสบะหมี่หยก' and active and pnl_item='บะหมี่หยก';

-- [B1] เปลี่ยนชื่อบิลฝั่ง P&L: ส้ม -> น้ำส้ม · ลิ้นจี่ -> น้ำลิ้นจี่ (เฉพาะซัพเซ็นซอรี่ กันชนผลไม้ชื่อเดียวกัน)
with sc as (select id from pnl_suppliers where name like '%เซ็นซอรี%')
update pnl_bill_items set item='น้ำส้ม' where item='ส้ม' and supplier_id in (select id from sc);
with sc as (select id from pnl_suppliers where name like '%เซ็นซอรี%')
update pnl_bill_items set item='น้ำลิ้นจี่' where item='ลิ้นจี่' and supplier_id in (select id from sc);
update pnl_sup_items set item='น้ำส้ม' where item='ส้ม' and supplier_id in (select id from pnl_suppliers where name like '%เซ็นซอรี%');
update pnl_sup_items set item='น้ำลิ้นจี่' where item='ลิ้นจี่' and supplier_id in (select id from pnl_suppliers where name like '%เซ็นซอรี%');
update pnl_item_alias set item='น้ำส้ม' where item='ส้ม' and supplier_id in (select id from pnl_suppliers where name like '%เซ็นซอรี%');
update pnl_item_alias set item='น้ำลิ้นจี่' where item='ลิ้นจี่' and supplier_id in (select id from pnl_suppliers where name like '%เซ็นซอรี%');
update pnl_stock_map set pnl_item='น้ำส้ม' where pnl_item='ส้ม' and active;        -- (fanta ถูกย้ายไปแล้วใน [C] เหลือแต่ผงชง)
update pnl_stock_map set pnl_item='น้ำลิ้นจี่' where pnl_item='ลิ้นจี่' and active;
-- สอน OCR: บิลกระดาษยังพิมพ์ชื่อเดิม ให้ลงเป็นชื่อใหม่เงียบ ๆ
insert into pnl_item_alias(supplier_id,alias,item,unit,bill_unit,factor)
select id,'ส้ม','น้ำส้ม','ซอง',null,1 from pnl_suppliers where name like '%เซ็นซอรี%'
  and not exists (select 1 from pnl_item_alias a where a.alias='ส้ม' and a.supplier_id=pnl_suppliers.id);
insert into pnl_item_alias(supplier_id,alias,item,unit,bill_unit,factor)
select id,'ลิ้นจี่','น้ำลิ้นจี่','ซอง',null,1 from pnl_suppliers where name like '%เซ็นซอรี%'
  and not exists (select 1 from pnl_item_alias a where a.alias='ลิ้นจี่' and a.supplier_id=pnl_suppliers.id);

-- [B2] แก้พิมพ์ผิดชื่อบิล: ถุงขยะ 36x45 -> ถุงขยะ 35x45 (ทุกที่ในฝั่ง P&L)
update pnl_bill_items set item='ถุงขยะ 35x45' where item='ถุงขยะ 36x45';
update pnl_sup_items  set item='ถุงขยะ 35x45' where item='ถุงขยะ 36x45'
  and not exists (select 1 from pnl_sup_items x where x.supplier_id=pnl_sup_items.supplier_id and x.item='ถุงขยะ 35x45');
delete from pnl_sup_items where item='ถุงขยะ 36x45';  -- เผื่อซัพนั้นมี 35x45 อยู่แล้ว (กันซ้ำ)
update pnl_item_alias set item='ถุงขยะ 35x45' where item='ถุงขยะ 36x45';
update pnl_stock_map  set pnl_item='ถุงขยะ 35x45' where pnl_item='ถุงขยะ 36x45' and active;
insert into pnl_item_alias(supplier_id,alias,item,unit,bill_unit,factor)
select distinct supplier_id,'ถุงขยะ 36x45','ถุงขยะ 35x45','แพ็ค',null,1 from pnl_sup_items where item='ถุงขยะ 35x45'
  and not exists (select 1 from pnl_item_alias a where a.alias='ถุงขยะ 36x45' and a.supplier_id=pnl_sup_items.supplier_id);

-- [A] เปลี่ยนชื่อฝั่งระบบนับ (ทั้งสองสาขา · ประวัตินับผูกด้วยรหัส ไม่กระทบ)
update products set name='เกี๊ยวปลาถุงทอง'        where name='ถุงทองเกี๊ยวปลา' and deleted_at is null;
update products set name='ซอสพุดดิ้ง Blueberry'   where name='Blueberry'        and deleted_at is null;
update products set name='ซอสพุดดิ้ง Strawberry'  where name='Strawberry'       and deleted_at is null;
update products set name='น้ำลิ้นจี่'              where name='ลิ้นจี่'           and deleted_at is null;
update products set name='น้ำส้ม'                 where name='ส้ม'              and deleted_at is null;
update pnl_stock_map set product_name='เกี๊ยวปลาถุงทอง'       where product_name='ถุงทองเกี๊ยวปลา';
update pnl_stock_map set product_name='ซอสพุดดิ้ง Blueberry'  where product_name='Blueberry';
update pnl_stock_map set product_name='ซอสพุดดิ้ง Strawberry' where product_name='Strawberry';
update pnl_stock_map set product_name='น้ำลิ้นจี่'             where product_name='ลิ้นจี่';
update pnl_stock_map set product_name='น้ำส้ม'                where product_name='ส้ม';

-- ตรวจผล
select 'ผูก fanta ส้ม ->' as ตรวจ, pnl_item from pnl_stock_map where product_name='fanta ส้ม'
union all select 'ผูก น้ำซอสบะหมี่หยก ->', pnl_item from pnl_stock_map where product_name='น้ำซอสบะหมี่หยก'
union all select 'ผูก น้ำส้ม (ผงชง) ->', pnl_item from pnl_stock_map where product_name='น้ำส้ม'
union all select 'บิลชื่อ ถุงขยะ 36x45 เหลือ', count(*)::text from pnl_bill_items where item='ถุงขยะ 36x45'
union all select 'บิลชื่อ ส้ม (เซ็นซอรี่) เหลือ', count(*)::text from pnl_bill_items b join pnl_suppliers s on s.id=b.supplier_id where b.item='ส้ม' and s.name like '%เซ็นซอรี%';
