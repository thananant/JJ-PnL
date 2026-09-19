-- ============================================================
-- JJ เช็คสต๊อก · ดึงข้อมูลสินค้าออกเป็นตาราง (19 ก.ย. 2569) — อ่านอย่างเดียว ไม่แก้อะไร
--   ชื่อสินค้า · ชื่อซัพ · หน่วยซื้อ · หน่วยนับ · ตัวคูณ · วันสั่ง–วันส่ง · อัตราใช้ต่อวัน
--   ตรงกับสคีมาจริง: pnl_stock_names(product_id,branch,stock_name,stock_unit,bill_name,bill_unit,factor)
--                   pnl_bill_items(branch,d,supplier_id,item,qty,unit,price) · pnl_unit_conv(item,from_unit,to_unit,factor)
--   วิธีใช้: รันใน Supabase SQL Editor → กด "Download CSV" → ส่งไฟล์มาในแชท เดี๋ยวแปลงเป็น .xlsx ให้
-- ============================================================
with dow(k, th, ord) as (
  values ('mon','จันทร์',1),('tue','อังคาร',2),('wed','พุธ',3),('thu','พฤหัสบดี',4),
         ('fri','ศุกร์',5),('sat','เสาร์',6),('sun','อาทิตย์',7)
),
br(id, name, code) as (
  values ('b19f0a17b4472','รัชดา','JJRD'),('b19f0a17b448212','ลาดพร้าว','JJLP')
)
select
  coalesce(b.name, p.branch_id)                                          as "สาขา",
  coalesce(nullif(btrim(p.dept),''), nullif(btrim(p.cat_label),''), 'ยังไม่จัดแผนก') as "แผนก",
  p.name                                                                 as "ชื่อสินค้า (ชื่อนับ)",
  coalesce(nullif(btrim(n.bill_name),''), nullif(btrim(p.bill_name),''), '') as "ชื่อบิล (P&L)",
  coalesce(nullif(btrim(p.sup),''),'(ไม่ระบุซัพ)')                        as "ชื่อซัพ",
  coalesce(nullif(btrim(n.bill_unit),''), nullif(btrim(p.pack_unit),''), bu.u, '') as "หน่วยซื้อ",
  coalesce(nullif(btrim(p.unit),''), nullif(btrim(n.stock_unit),''), '')  as "หน่วยนับ",
  coalesce(cv.factor, n.factor, p.pack)                                   as "ตัวคูณ (1 หน่วยซื้อ = กี่หน่วยนับ)",
  case when coalesce(s.order_mode,'any')='fixed' then 'วันสั่งตายตัว' else 'สั่งได้ทุกวัน' end as "รอบสั่ง",
  case when coalesce(s.order_mode,'any')='fixed' then coalesce(sc.txt,'(ยังไม่ตั้งวัน)')
       else 'สั่งวันนี้ · ส่งอีก '||greatest(coalesce(s.lead_days,1),1)||' วัน' end as "วันสั่ง → วันส่ง",
  nullif(btrim(coalesce(s.cutoff,'')),'')                                 as "เวลาตัดรอบสั่ง",
  s.cycle_days                                                            as "รอบทุกกี่วัน",
  s.min_cases                                                             as "ขั้นต่ำ (ลัง)",
  p.rate_wk                                                               as "ใช้ต่อวัน จ-พฤ",
  p.rate_fri                                                              as "ใช้ต่อวัน ศุกร์",
  p.rate_we                                                               as "ใช้ต่อวัน ส-อา",
  round(coalesce(p.rate_wk,0)*4 + coalesce(p.rate_fri,0) + coalesce(p.rate_we,0)*2, 2) as "ใช้รวม/สัปดาห์",
  p.safety                                                                as "safety (ค่าเดิม)",
  p.max                                                                   as "max (ค่าเดิม)",
  p.order_step                                                            as "สั่งเป็นขั้นละ",
  nullif(btrim(coalesce(p.step_unit,'')),'')                              as "หน่วยขั้นสั่ง",
  bu.u                                                                    as "หน่วยที่พบในบิลบ่อยสุด",
  bu.last_d                                                               as "วันที่บิลล่าสุด",
  bu.n                                                                    as "จำนวนบิล 180 วัน"
from products p
left join br b on b.id = p.branch_id
left join lateral (   -- ชื่อบิล/หน่วย จากตารางผูกชื่อของ P&L (รายสาขา)
  select x.bill_name, x.bill_unit, x.stock_unit, x.factor
  from pnl_stock_names x
  where x.product_id = p.id
    and coalesce(x.bill_name,'') not in ('','-')
  order by (x.branch is not distinct from b.code) desc
  limit 1
) n on true
left join suppliers s on lower(btrim(s.name)) = lower(btrim(p.sup))
left join lateral (   -- วันสั่ง → วันส่ง (แปลง schedule เป็นข้อความไทย)
  select string_agg('สั่ง'||d1.th||' → ส่ง'||d2.th, ' · ' order by d1.ord) as txt
  from jsonb_each_text(
    case when jsonb_typeof(to_jsonb(s)->'schedule')='object' then to_jsonb(s)->'schedule'
         when jsonb_typeof(to_jsonb(s)->'schedule')='string' and left(btrim(to_jsonb(s)->>'schedule'),1)='{'
           then (btrim(to_jsonb(s)->>'schedule'))::jsonb
         else '{}'::jsonb end) e(k,v)
  join dow d1 on d1.k = e.k
  join dow d2 on d2.k = e.v
) sc on true
left join lateral (   -- หน่วยที่ซัพลงบิลบ่อยสุดใน 180 วัน (ของสาขานี้)
  select bi.unit as u, max(bi.d) as last_d, count(*) as n
  from pnl_bill_items bi
  where bi.item = coalesce(nullif(btrim(n.bill_name),''), nullif(btrim(p.bill_name),''))
    and coalesce(bi.unit,'') <> '' and bi.d >= current_date - 180
  group by bi.unit
  order by count(*) desc, max(bi.d) desc
  limit 1
) bu on true
left join lateral (   -- ตัวคูณหน่วยซื้อ → หน่วยนับ (ใช้ร่วมกับ P&L)
  select c.factor from pnl_unit_conv c
  where c.item = coalesce(nullif(btrim(n.bill_name),''), nullif(btrim(p.bill_name),''))
    and lower(btrim(c.from_unit)) = lower(btrim(coalesce(nullif(btrim(n.bill_unit),''), nullif(btrim(p.pack_unit),''), bu.u, '')))
  order by c.id desc
  limit 1
) cv on true
where p.deleted_at is null
order by 1, 2, p.name;
