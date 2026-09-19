-- ============================================================
-- JJ เช็คสต๊อก · ดึงข้อมูลสินค้าออกเป็นตาราง — ฉบับสั้น คำสั่งเดียว (อ่านอย่างเดียว)
--   รันใน Supabase SQL Editor → กด Download CSV → ส่งไฟล์มาในแชท เดี๋ยวแปลงเป็น .xlsx ให้
--   * ถ้าโปรเจกต์ไม่มีตาราง pnl_stock_names ให้แก้เป็น pnl_stock_map (มีคอลัมน์ชุดเดียวกัน)
--   * ฉบับเต็ม (ทนตารางขาด + คอลัมน์ใหม่ order_ahead/prepay) อยู่ที่ sql/jjmk_export_products.sql
-- ============================================================
select
  case p.branch_id when 'b19f0a17b4472' then 'รัชดา' when 'b19f0a17b448212' then 'ลาดพร้าว' else p.branch_id end as "สาขา",
  coalesce(nullif(btrim(to_jsonb(p)->>'dept'),''), nullif(btrim(to_jsonb(p)->>'cat_label'),''), 'ยังไม่จัดแผนก') as "แผนก",
  p.name as "ชื่อสินค้า",
  coalesce(m.pnl_item,'') as "ชื่อบิล",
  coalesce(nullif(btrim(p.sup),''),'(ไม่ระบุซัพ)') as "ชื่อซัพ",
  coalesce(nullif(btrim(m.bill_unit),''),'') as "หน่วยซื้อ",
  coalesce(nullif(btrim(p.unit),''),'') as "หน่วยนับ",
  cv.factor as "ตัวคูณ 1หน่วยซื้อ=กี่หน่วยนับ",
  case when coalesce(s.order_mode,'any')='fixed' then coalesce(sc.txt,'(ยังไม่ตั้งวัน)')
       else 'สั่งได้ทุกวัน · ส่งอีก '||greatest(coalesce(s.lead_days,1),1)||' วัน' end as "วันสั่งของ",
  (to_jsonb(p)->>'rate_wk')::numeric  as "ใช้ต่อวัน จ-พฤ",
  (to_jsonb(p)->>'rate_fri')::numeric as "ใช้ต่อวัน ศุกร์",
  (to_jsonb(p)->>'rate_we')::numeric  as "ใช้ต่อวัน ส-อา",
  bu.u as "หน่วยที่พบในบิลล่าสุด"
from products p
left join pnl_stock_names m on m.product_id = p.id and coalesce(m.pnl_item,'') not in ('','-')
left join suppliers s on lower(btrim(s.name)) = lower(btrim(p.sup))
left join lateral (
  select string_agg('สั่ง'||d1.th||'→ส่ง'||d2.th, ' · ' order by d1.ord) as txt
  from jsonb_each_text(case when jsonb_typeof(to_jsonb(s)->'schedule')='object' then to_jsonb(s)->'schedule' else '{}'::jsonb end) e(k,v)
  join (values ('mon','จันทร์',1),('tue','อังคาร',2),('wed','พุธ',3),('thu','พฤหัส',4),('fri','ศุกร์',5),('sat','เสาร์',6),('sun','อาทิตย์',7)) d1(k,th,ord) on d1.k=e.k
  join (values ('mon','จันทร์',1),('tue','อังคาร',2),('wed','พุธ',3),('thu','พฤหัส',4),('fri','ศุกร์',5),('sat','เสาร์',6),('sun','อาทิตย์',7)) d2(k,th,ord) on d2.k=e.v
) sc on true
left join lateral (
  select bi.unit as u from pnl_bill_items bi
  where bi.item = m.pnl_item and coalesce(bi.unit,'')<>'' and bi.d >= current_date-180
  group by bi.unit order by count(*) desc, max(bi.d) desc limit 1
) bu on true
left join lateral (
  select c.factor from pnl_unit_conv c
  where c.item = m.pnl_item and lower(btrim(c.from_unit)) = lower(btrim(coalesce(nullif(btrim(m.bill_unit),''), bu.u, '')))
  limit 1
) cv on true
where p.deleted_at is null
order by 1, 2, p.name;
