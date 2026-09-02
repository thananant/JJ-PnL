-- ============================================================
-- JJ · จัดชื่อนับสองสาขาให้ตรงกัน + แก้ผูกซ้อน ตามไฟล์เคาะ 3 ก.ย. 2569 (16 รายการ)
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ · มีตรวจผลท้ายไฟล์
--   สิ่งที่ทำ: เปลี่ยนชื่อฝั่งนับ 3 ตัว · ย้าย fanta ส้ม ไปบิลแฟนต้าน้ำส้ม · เลิกผูกของที่เกาะบิลผิด 2 ตัว
--             ยุบสินค้านับซ้ำ 8 ตัว (ลบแบบ soft-delete ตามกลไกของแอพนับ ประวัตินับเก่าไม่หาย)
--             ผูกสาขาที่ยังขาด 5 ตัว (ก๊อปตัวคูณจากอีกสาขา)
-- ============================================================

-- 1) เปลี่ยนชื่อฝั่งนับ (สองสาขา) --------------------------------------------
update products set name='น้ำส้ม'
  where branch_id in ('b19f0a17b4472','b19f0a17b448212') and trim(name)='ส้ม' and deleted_at is null;
update products set name='เนยแท้ชนิดจืด'
  where branch_id='b19f0a17b4472' and trim(name)='เนยแท้ชนิดจืด สีเขียว' and deleted_at is null;
update products set name='หอมแขกปอก'
  where branch_id='b19f0a17b448212' and trim(name)='หอมแขกยำ' and deleted_at is null;

-- 2) fanta ส้ม หลุดมาเกาะบิล "ส้ม" -> ย้ายไปบิลแฟนต้าน้ำส้ม ---------------------
update pnl_stock_map m set pnl_item='แฟนต้าน้ำส้ม กล่อง 10 ลิตร'
  from products p where p.id=m.product_id and trim(p.name)='fanta ส้ม' and m.pnl_item<>'แฟนต้าน้ำส้ม กล่อง 10 ลิตร';

-- 3) ของคนละตัวที่มาเกาะบิลผิด -> เลิกผูก (ตัวสินค้ายังอยู่ รอบิลของตัวเองค่อยผูกใหม่)
delete from pnl_stock_map where product_id in
  (select id from products where trim(name) in ('น้ำซอสบะหมี่หยก','ชีสโตะอริจินัลชีสดิป'));

-- 4) ยุบสินค้านับซ้ำชื่อเดียวกัน (เก็บตัวที่มีผลนับล่าสุด ตัวที่เหลือย้ายการผูกมาก่อนแล้วลบ)
do $$
declare g record; keep_id text;
begin
  for g in select * from (values
      ('b19f0a17b448212','ข้าวคั่ว'),('b19f0a17b448212','น้ำมัน'),
      ('b19f0a17b448212','ไส้เป็ด'),('b19f0a17b448212','หมูยอ'),
      ('b19f0a17b4472','ข้าวคั่ว')) t(bid,nm) loop
    select p.id into keep_id from products p
      left join lateral (select max(count_date) mc from stock_counts sc where sc.product_id=p.id) c on true
      where p.branch_id=g.bid and trim(p.name)=g.nm and p.deleted_at is null
      order by c.mc desc nulls last, p.id limit 1;
    if keep_id is null then continue; end if;
    if not exists (select 1 from pnl_stock_map where product_id=keep_id) then
      update pnl_stock_map m set product_id=keep_id
        where m.id=(select min(m2.id) from pnl_stock_map m2 join products p2 on p2.id=m2.product_id
                     where p2.branch_id=g.bid and trim(p2.name)=g.nm and m2.product_id<>keep_id);
    end if;
    delete from pnl_stock_map where product_id in
      (select id from products where branch_id=g.bid and trim(name)=g.nm and id<>keep_id);
    update products set deleted_at=now()
      where branch_id=g.bid and trim(name)=g.nm and id<>keep_id and deleted_at is null;
  end loop;
end $$;

-- 5) อูด้ง: ยุบ 'เส้นหนึบอุด้ง' รวมกับ 'อูด้ง' (ทั้งสองสาขา ตามที่เคาะ)
delete from pnl_stock_map where product_id in (select id from products where trim(name)='เส้นหนึบอุด้ง');
update products set deleted_at=now() where trim(name)='เส้นหนึบอุด้ง' and deleted_at is null;

-- 6) ตัวซ้ำ ลพ. ที่ยังไม่ผูก (หน่วยโล) -> ลบ
update products set deleted_at=now()
  where branch_id='b19f0a17b448212' and deleted_at is null
    and id not in (select product_id from pnl_stock_map)
    and ((trim(name)='แป้งเค้กตรามงกุฎม่วง') or (trim(name)='หอยแมลงภู่ชิลี' and unit='โล'));

-- 7) ชื่อในตารางผูกให้ตรงชื่อใหม่เสมอ
update pnl_stock_map m set product_name=p.name
  from products p where p.id=m.product_id and m.product_name<>p.name;

-- 8) ผูกสาขาที่ยังขาด (ก๊อป bill_unit/ตัวคูณ จากแถวของอีกสาขาบนบิลเดียวกัน ถ้าไม่มีใช้ 1)
insert into pnl_stock_map (branch,product_id,product_name,pnl_item,bill_unit,stock_unit,factor,active)
select v.br, p.id, p.name, v.bill, coalesce(o.bill_unit,''), coalesce(p.unit,''), coalesce(o.factor,1), true
from (values
  ('JJLP','b19f0a17b448212','ลูกชิ้นปลา รูปหัวใจ','HEARTKAMABOKO','JJRD'),
  ('JJLP','b19f0a17b448212','เต้าหู้ทูโทน','Two Tone Egg Bun','JJRD'),
  ('JJLP','b19f0a17b448212','ซุปต้มยำ จริงใจ','ซุปต้มยำ','JJRD'),
  ('JJRD','b19f0a17b4472','เบค่อน','เบคอน','JJLP'),
  ('JJLP','b19f0a17b448212','หอมแขกปอก','หอมแขกปอก','JJRD')
) v(br,bid,pname,bill,obr)
join products p on p.branch_id=v.bid and trim(p.name)=v.pname and p.deleted_at is null
left join pnl_stock_map o on o.branch=v.obr and lower(trim(o.pnl_item))=lower(v.bill) and o.active
on conflict (product_id) do nothing;

-- ============================================================ ตรวจผล
-- (ก) ต้องได้ 0 แถว = ไม่มีผูกซ้อนเหลือ
select m.branch, m.pnl_item, count(*) n from pnl_stock_map m
where m.active and m.product_id not like 'none:%'
group by m.branch, m.pnl_item having count(*)>1;
-- (ข) ชื่อใหม่ต้องมาครบ: น้ำส้ม 2 · เนยแท้ชนิดจืด 2 · หอมแขกปอก 2 · อูด้ง 2 (สาขาละ 1)
select trim(name) as name, count(*) as n from products
where deleted_at is null and trim(name) in ('น้ำส้ม','เนยแท้ชนิดจืด','หอมแขกปอก','อูด้ง','ข้าวคั่ว','น้ำมัน','ไส้เป็ด','หมูยอ','หอยแมลงภู่ชิลี')
group by 1 order by 1;
-- (ค) 5 ตัวที่ผูกเพิ่ม ต้องขึ้นครบ
select branch, pnl_item, product_name, factor from pnl_stock_map
where lower(trim(pnl_item)) in ('heartkamaboko','two tone egg bun','ซุปต้มยำ','เบคอน','หอมแขกปอก') and active
order by pnl_item, branch;
-- (ง) เช็คว่าบิลแฟนต้าส้มสะกดตรงกับที่ย้ายไป (ต้องเห็นชื่อเดียวกัน)
select distinct item from pnl_bill_items where item ilike '%แฟนต้า%ส้ม%' limit 5;
