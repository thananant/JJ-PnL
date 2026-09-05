-- ============================================================
-- JJ · รวมชื่อบิลอายิโนะโมะโต๊ะสองสาขาเป็นตัวเดียว (26 ส.ค. 2569) — รันครั้งเดียว รันซ้ำได้
--   ชื่อที่เคาะ: 「อายิโนะโมะโต๊ะไซส์ 1 กก.」 หน่วย 「กก.」
--   (ฟองเต้าหู้เส้น 4/8 กก. = คนละไซส์จริง ไม่แตะ)
-- ============================================================

-- [1] บิลย้อนหลังทุกเดือน: รวมชื่อ + หน่วยเป็น กก.
update pnl_bill_items set item='อายิโนะโมะโต๊ะไซส์ 1 กก.', unit='กก.'
 where item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.';
update pnl_bill_items set unit='กก.'
 where item='อายิโนะโมะโต๊ะไซส์ 1 กก.' and coalesce(unit,'')<>'กก.';

-- [2] ชุดสินค้าประจำซัพ: เปลี่ยนชื่อ+หน่วย (กันซ้ำถ้าซัพนั้นมีชื่อใหม่อยู่แล้ว)
update pnl_sup_items set item='อายิโนะโมะโต๊ะไซส์ 1 กก.', unit='กก.'
 where item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.'
   and not exists (select 1 from pnl_sup_items x
                   where x.supplier_id=pnl_sup_items.supplier_id and x.item='อายิโนะโมะโต๊ะไซส์ 1 กก.');
delete from pnl_sup_items where item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.';
update pnl_sup_items set unit='กก.' where item='อายิโนะโมะโต๊ะไซส์ 1 กก.' and coalesce(unit,'')<>'กก.';

-- [3] ชื่อที่ OCR จำ: ชี้มาที่ชื่อใหม่ + สอนชื่อเดิมไว้ (สแกนบิลเก่าๆ ยังลงถูกเอง)
update pnl_item_alias set item='อายิโนะโมะโต๊ะไซส์ 1 กก.'
 where item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.';
insert into pnl_item_alias(supplier_id,alias,item,unit,bill_unit,factor)
select distinct supplier_id,'อายิโนะโมะโต๊ะ ผงชูรส 1 กก.','อายิโนะโมะโต๊ะไซส์ 1 กก.','กก.',null,1
from pnl_sup_items where item='อายิโนะโมะโต๊ะไซส์ 1 กก.'
  and not exists (select 1 from pnl_item_alias a
                  where a.alias='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.' and a.supplier_id=pnl_sup_items.supplier_id);

-- [4] การผูกกับระบบนับ (ถ้ามีตัวไหนผูกชื่อเดิมไว้)
update pnl_stock_map set pnl_item='อายิโนะโมะโต๊ะไซส์ 1 กก.'
 where pnl_item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.';

-- ตรวจผล
select 'บิลชื่อเดิมเหลือ' as ตรวจ, count(*)::text as ค่า from pnl_bill_items where item='อายิโนะโมะโต๊ะ ผงชูรส 1 กก.'
union all select 'บิลชื่อใหม่ (ต้องเป็น กก. หมด)', count(*)::text from pnl_bill_items where item='อายิโนะโมะโต๊ะไซส์ 1 กก.' and unit='กก.'
union all select 'บิลชื่อใหม่หน่วยอื่นค้าง', count(*)::text from pnl_bill_items where item='อายิโนะโมะโต๊ะไซส์ 1 กก.' and coalesce(unit,'')<>'กก.';
