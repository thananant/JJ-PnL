-- ============================================================
-- JJ · เปลี่ยนชื่อรอบเคาะสุดท้าย 3 ก.ย. 2569 (7 รายการ) — แก้ทั้งชื่อนับ ชื่อบิล และข้อมูลเก่าทั้งหมด
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ · ตรวจผลท้ายไฟล์
--   ชื่อนับ (products สองสาขา): ชาเขียวมะลิ→น้ำชาเขียวมะลิ · ซุปใส→ผงซุปใส จริงใจ · พันช์→น้ำพั้นซ์ · ลิ้นจี่→น้ำลิ้นจี่
--   ชื่อบิล (ย้อนหลังทุกตาราง: บิลเก่า/ชุดสินค้าประจำ/สมอง OCR/อัตราแปลงหน่วย/ตารางผูก):
--     ไซรัปข้าวโพด Mulyeot 10 ลิตร→ข้าวไดโนเสาร์ · กล้วยหอม→เค้กกล้วยหอม · ชาเขียวมะลิ→น้ำชาเขียวมะลิ
--     ซุปใส→ผงซุปใส จริงใจ · ส้ม→น้ำส้ม · พั้นซ์→น้ำพั้นซ์ · ลิ้นจี่→น้ำลิ้นจี่
--   เทียบชื่อแบบตรงตัว (trim) เท่านั้น — 'fanta ส้ม' ฯลฯ ไม่โดน
-- ============================================================

-- 1) ชื่อนับ (ระบบนับ jj-stock ทั้งสองสาขา)
do $$
declare r record;
begin
  for r in select * from (values
      ('ชาเขียวมะลิ','น้ำชาเขียวมะลิ'),
      ('ซุปใส','ผงซุปใส จริงใจ'),
      ('พันช์','น้ำพั้นซ์'),
      ('ลิ้นจี่','น้ำลิ้นจี่')) t(o,n) loop
    update products set name=r.n
      where branch_id in ('b19f0a17b4472','b19f0a17b448212')
        and trim(name)=r.o and deleted_at is null;
  end loop;
end $$;

-- 2) ชื่อบิล — ทุกที่ที่ชื่อบิลอยู่ (บิลเก่าทั้งหมดด้วย ตามที่สั่ง)
do $$
declare r record;
begin
  for r in select * from (values
      ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','ข้าวไดโนเสาร์'),
      ('กล้วยหอม','เค้กกล้วยหอม'),
      ('ชาเขียวมะลิ','น้ำชาเขียวมะลิ'),
      ('ซุปใส','ผงซุปใส จริงใจ'),
      ('ส้ม','น้ำส้ม'),
      ('พั้นซ์','น้ำพั้นซ์'),
      ('ลิ้นจี่','น้ำลิ้นจี่')) t(o,n) loop
    update pnl_bill_items  set item=r.n     where trim(item)=r.o;          -- บิลย้อนหลังทั้งหมด
    update pnl_stock_map   set pnl_item=r.n where trim(pnl_item)=r.o;     -- ตารางผูกชื่อ
    update pnl_item_alias  set item=r.n     where trim(item)=r.o;         -- สมอง OCR (alias เดิมชี้มาชื่อใหม่)
    delete from pnl_sup_items s                                            -- ชุดสินค้าประจำ: ถ้ามีชื่อใหม่อยู่แล้ว ลบตัวเก่าทิ้ง
      where trim(s.item)=r.o
        and exists (select 1 from pnl_sup_items t2 where t2.supplier_id=s.supplier_id and trim(t2.item)=r.n);
    update pnl_sup_items   set item=r.n     where trim(item)=r.o;
    delete from pnl_unit_conv s                                            -- อัตราแปลงหน่วย (unique item+from_unit)
      where trim(s.item)=r.o
        and exists (select 1 from pnl_unit_conv t2 where trim(t2.item)=r.n and t2.from_unit=s.from_unit);
    update pnl_unit_conv   set item=r.n     where trim(item)=r.o;
  end loop;
end $$;

-- 3) ชื่อนับใน map ให้ตรง products เสมอ
update pnl_stock_map m set product_name=p.name
  from products p where p.id=m.product_id and m.product_name<>p.name;

-- ============================================================ ตรวจผล
-- (ก) ชื่อเก่าต้องเหลือ 0 ทุกตาราง
select 'products' t, count(*) n from products where deleted_at is null and trim(name) in ('ชาเขียวมะลิ','ซุปใส','พันช์','ลิ้นจี่')
union all select 'pnl_bill_items', count(*) from pnl_bill_items where trim(item) in ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','กล้วยหอม','ชาเขียวมะลิ','ซุปใส','ส้ม','พั้นซ์','ลิ้นจี่')
union all select 'pnl_stock_map', count(*) from pnl_stock_map where trim(pnl_item) in ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','กล้วยหอม','ชาเขียวมะลิ','ซุปใส','ส้ม','พั้นซ์','ลิ้นจี่')
union all select 'pnl_sup_items', count(*) from pnl_sup_items where trim(item) in ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','กล้วยหอม','ชาเขียวมะลิ','ซุปใส','ส้ม','พั้นซ์','ลิ้นจี่')
union all select 'pnl_item_alias', count(*) from pnl_item_alias where trim(item) in ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','กล้วยหอม','ชาเขียวมะลิ','ซุปใส','ส้ม','พั้นซ์','ลิ้นจี่')
union all select 'pnl_unit_conv', count(*) from pnl_unit_conv where trim(item) in ('ไซรัปข้าวโพด Mulyeot 10 ลิตร','กล้วยหอม','ชาเขียวมะลิ','ซุปใส','ส้ม','พั้นซ์','ลิ้นจี่');
-- (ข) บิลชื่อใหม่ แยกตามซัพ — เช็คสายตาว่า "ข้าวไดโนเสาร์" มาจากซัพข้าวจริง ไม่มีบิลไซรัปของซัพอื่นโดนหางเลข
select b.item, s.name as sup, count(*) as lines, min(b.d) as first_d, max(b.d) as last_d
from pnl_bill_items b left join pnl_suppliers s on s.id=b.supplier_id
where trim(b.item) in ('ข้าวไดโนเสาร์','เค้กกล้วยหอม','น้ำชาเขียวมะลิ','ผงซุปใส จริงใจ','น้ำส้ม','น้ำพั้นซ์','น้ำลิ้นจี่')
group by 1,2 order by 1,2;
