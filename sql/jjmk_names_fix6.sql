-- ============================================================
-- JJ · ตามเคาะ 3 ก.ย. 2569 (ต่อจาก fix5) — รันครั้งเดียว รันซ้ำได้ · ตรวจผลท้ายไฟล์
--   1) บิล "ข้าวไดโนเสาร์" ย้ายซัพ → หจก.รักษ์ข้าว (พร้อมย้ายยอดรายจ่ายรายวัน + ชุดสินค้าประจำ + alias OCR)
--   2) บิล "เค้กกล้วยหอม" ย้ายซัพ → ของหวาน (เหมือนกัน)
--   3) เพิ่ม "กล้วยหอม" ใหม่ในซัพผัก: ชื่อบิล (ชุดสินค้าประจำ) + ชื่อนับ (products สองสาขา ก๊อปหมวดจากผักบุ้ง) + ผูกกัน
--   หมายเหตุ: ยอดที่ย้ายคิดจากบรรทัดสินค้า (จำนวน×ราคา−ส่วนลด ปรับ VAT ตามโหมดบรรทัด)
--   ส่วนลดท้ายบิล/ค่าส่งของบิลเดิมคงอยู่กับซัพเดิม
-- ============================================================

-- ตัวช่วยย้ายบิลของสินค้า 1 ชื่อไปซัพใหม่ (บิลเก่าทุกใบ + expense_daily + sup_items + alias)
create or replace function pg_temp.jj_move_item(p_item text, p_sup_pattern text) returns text as $$
declare to_id bigint; r record; net numeric; moved int := 0;
begin
  select id into to_id from pnl_suppliers where trim(name)=p_sup_pattern
  union all
  select id from pnl_suppliers where name ilike '%'||p_sup_pattern||'%' order by 1 limit 1;
  if to_id is null then
    return '❌ ไม่พบซัพ "'||p_sup_pattern||'" — ไม่ย้าย '||p_item||' (เช็คชื่อซัพในหน้า ตั้งค่า)';
  end if;
  for r in select * from pnl_bill_items where trim(item)=p_item and supplier_id<>to_id loop
    net := (coalesce(r.qty,0)*coalesce(r.price,0)-coalesce(r.discount,0))
           * case when r.vat_mode='ex' then 1.07 else 1 end;
    update pnl_expense_daily set amount=greatest(0,amount-net)
      where branch=r.branch and d=r.d and supplier_id=r.supplier_id;
    insert into pnl_expense_daily(branch,d,supplier_id,amount)
      values (r.branch,r.d,to_id,net)
      on conflict (branch,d,supplier_id) do update set amount=pnl_expense_daily.amount+excluded.amount;
    update pnl_bill_items set supplier_id=to_id where ctid=r.ctid;
    moved := moved+1;
  end loop;
  delete from pnl_sup_items s where trim(s.item)=p_item and s.supplier_id<>to_id
    and exists (select 1 from pnl_sup_items t2 where t2.supplier_id=to_id and trim(t2.item)=p_item);
  update pnl_sup_items set supplier_id=to_id where trim(item)=p_item and supplier_id<>to_id;
  update pnl_item_alias set supplier_id=to_id where trim(item)=p_item and supplier_id<>to_id;
  return '✅ '||p_item||' → ซัพ #'||to_id||' · ย้ายบรรทัดบิล '||moved;
end $$ language plpgsql;

select pg_temp.jj_move_item('ข้าวไดโนเสาร์','รักษ์ข้าว') as ผล
union all
select pg_temp.jj_move_item('เค้กกล้วยหอม','ของหวาน');

-- 3) เพิ่ม "กล้วยหอม" ซัพผัก --------------------------------------------------
do $$
declare veg_id bigint; b text; tpl record; new_id text;
begin
  select id into veg_id from pnl_suppliers where trim(name)='ผัก'
  union all select id from pnl_suppliers where name ilike '%ผัก%' order by 1 limit 1;
  if veg_id is null then raise notice '❌ ไม่พบซัพ "ผัก" — ข้ามการเพิ่มกล้วยหอม'; return; end if;
  insert into pnl_sup_items(supplier_id,item,unit,sort)
    select veg_id,'กล้วยหอม','โล',coalesce((select max(sort) from pnl_sup_items where supplier_id=veg_id),0)+1
    where not exists (select 1 from pnl_sup_items where supplier_id=veg_id and trim(item)='กล้วยหอม');
  foreach b in array array['b19f0a17b4472','b19f0a17b448212'] loop  -- ชื่อนับใหม่ทั้งสองสาขา (ก๊อปหมวด/ซัพจากผักบุ้ง)
    if exists (select 1 from products where branch_id=b and trim(name)='กล้วยหอม' and deleted_at is null) then continue; end if;
    select * into tpl from products where branch_id=b and deleted_at is null
      and trim(name) in ('ผักบุ้ง','ผักกาดขาว','แครอท') limit 1;
    if tpl is null then raise notice '⚠ สาขา % ไม่เจอสินค้าผักต้นแบบ — เพิ่มกล้วยหอมในแอพนับเองครับ', b; continue; end if;
    new_id := 'kb'||substr(md5(random()::text||clock_timestamp()::text),1,11);
    insert into products select (jsonb_populate_record(null::products,
      to_jsonb(tpl) || jsonb_build_object('id',new_id,'name','กล้วยหอม','unit','โล','safety',null,'max',null))).*;
    insert into pnl_stock_map(branch,product_id,product_name,pnl_item,bill_unit,stock_unit,factor,active)
      values (case b when 'b19f0a17b4472' then 'JJRD' else 'JJLP' end, new_id,'กล้วยหอม','กล้วยหอม','โล','โล',1,true)
      on conflict (product_id) do nothing;
  end loop;
end $$;

-- ============================================================ ตรวจผล
-- (ก) บิลสองตัวนี้ต้องอยู่ซัพใหม่หมด
select b.item, s.name as sup, count(*) as lines from pnl_bill_items b
 left join pnl_suppliers s on s.id=b.supplier_id
 where trim(b.item) in ('ข้าวไดโนเสาร์','เค้กกล้วยหอม') group by 1,2 order by 1;
-- (ข) กล้วยหอมต้องมีครบ: ชุดประจำซัพผัก 1 · ชื่อนับ 2 สาขา · ผูกแล้ว 2
select 'sup_items' as t, count(*) n from pnl_sup_items where trim(item)='กล้วยหอม'
union all select 'products', count(*) from products where trim(name)='กล้วยหอม' and deleted_at is null
union all select 'map', count(*) from pnl_stock_map where trim(pnl_item)='กล้วยหอม' and active;
-- (ค) ยอดรายจ่ายวันที่ย้าย (เช็คสายตา: ซัพเดิมลด ซัพใหม่เพิ่ม เท่ายอดบรรทัด)
select e.branch, e.d, s.name as sup, e.amount from pnl_expense_daily e
 join pnl_suppliers s on s.id=e.supplier_id
 where (e.branch,e.d) in (select branch,d from pnl_bill_items where trim(item) in ('ข้าวไดโนเสาร์','เค้กกล้วยหอม'))
 order by e.d, e.branch, s.name;
