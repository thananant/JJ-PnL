-- ============================================================
-- JJ เช็คสต๊อก · ดึงข้อมูลสินค้าออกเป็นตาราง (19 ก.ย. 2569) — อ่านอย่างเดียว ไม่แก้อะไร
--   ชื่อสินค้า · ชื่อบิล · ซัพ · หน่วยซื้อ · หน่วยนับ · ตัวคูณ · วันสั่ง–วันส่ง · อัตราใช้ต่อวัน
--   วิธีใช้: รันใน Supabase SQL Editor → กดปุ่ม "Download CSV" มุมขวาบนของผลลัพธ์
--            แล้วส่งไฟล์ CSV กลับมาในแชท เดี๋ยวแปลงเป็น .xlsx ให้ (จัดหัวตาราง/ความกว้าง/ตรึงแถวบนให้เรียบร้อย)
--   หมายเหตุ: เปิด CSV ด้วย Excel ตรง ๆ ภาษาไทยอาจเพี้ยน (ต้อง Data › From Text/CSV › UTF-8)
-- ============================================================
-- ---------- เตรียมมุมมองชั่วคราว (เผื่อบางตารางยังไม่มีในโปรเจกต์) ----------
create or replace function pg_temp.has_cols(t text, cols text[]) returns boolean language sql as $f$
  select to_regclass('public.'||t) is not null and not exists (
    select 1 from unnest(cols) c
    where not exists (select 1 from information_schema.columns
                       where table_schema='public' and table_name=t and column_name=c));
$f$;
do $$
begin
  execute 'drop view if exists pg_temp._names';
  if pg_temp.has_cols('pnl_stock_names', array['product_id','pnl_item']) then
    execute 'create temp view _names as select product_id, pnl_item, bill_unit, stock_unit from public.pnl_stock_names';
  elsif pg_temp.has_cols('pnl_stock_map', array['product_id','pnl_item']) then
    execute 'create temp view _names as select product_id, pnl_item, bill_unit, stock_unit from public.pnl_stock_map';
  else
    execute 'create temp view _names as select null::text as product_id, null::text as pnl_item, null::text as bill_unit, null::text as stock_unit where false';
  end if;

  execute 'drop view if exists pg_temp._bills';
  if pg_temp.has_cols('pnl_bill_items', array['item','unit','d']) then
    execute 'create temp view _bills as select item, unit, d from public.pnl_bill_items';
  else
    execute 'create temp view _bills as select null::text as item, null::text as unit, null::date as d where false';
  end if;

  execute 'drop view if exists pg_temp._conv';
  if pg_temp.has_cols('pnl_unit_conv', array['item','from_unit','factor']) then
    execute 'create temp view _conv as select item, from_unit, to_unit, factor from public.pnl_unit_conv';
  else
    execute 'create temp view _conv as select null::text as item, null::text as from_unit, null::text as to_unit, null::numeric as factor where false';
  end if;
end $$;

with dow(k, th, ord) as (
  values ('mon','จันทร์',1),('tue','อังคาร',2),('wed','พุธ',3),('thu','พฤหัสบดี',4),
         ('fri','ศุกร์',5),('sat','เสาร์',6),('sun','อาทิตย์',7)
),
br(id, name) as (
  values ('b19f0a17b4472','รัชดา'),('b19f0a17b448212','ลาดพร้าว')
),
prod as (
  select p.*, to_jsonb(p) as j from products p where p.deleted_at is null
),
sup as (
  select s.*, to_jsonb(s) as j from suppliers s
)
select
  coalesce(b.name, p.branch_id)                                        as "สาขา",
  coalesce(nullif(btrim(p.j->>'dept'),''), nullif(btrim(p.j->>'cat_label'),''), 'ยังไม่จัดแผนก') as "แผนก",
  p.name                                                               as "ชื่อสินค้า (ชื่อนับ)",
  coalesce(m.pnl_item,'')                                              as "ชื่อบิล (P&L)",
  coalesce(nullif(btrim(p.sup),''),'(ไม่ระบุซัพ)')                      as "ซัพพลายเออร์",
  coalesce(nullif(btrim(m.bill_unit),''), bu.u, '')                    as "หน่วยซื้อ",
  coalesce(nullif(btrim(p.unit),''), nullif(btrim(m.stock_unit),''),'') as "หน่วยนับ",
  cv.factor                                                            as "ตัวคูณ (1 หน่วยซื้อ = กี่หน่วยนับ)",
  case when coalesce(s.j->>'order_mode','any')='fixed' then 'วันสั่งตายตัว' else 'สั่งได้ทุกวัน' end as "รอบสั่ง",
  case when coalesce(s.j->>'order_mode','any')='fixed' then coalesce(sc.txt,'(ยังไม่ตั้งวัน)')
       else 'สั่งวันนี้ ส่งอีก '||greatest(coalesce((s.j->>'lead_days')::int,1),1)||' วัน' end               as "วันสั่ง → วันส่ง",
  coalesce((s.j->>'order_ahead')::int,0)                               as "สั่งล่วงหน้า (วัน)",
  case when coalesce((s.j->>'prepay')::boolean,false) then 'ต้องจ่ายก่อนส่ง' else '' end as "เงื่อนไขจ่าย",
  nullif(btrim(coalesce(s.j->>'cutoff','')),'')                              as "เวลาตัดรอบสั่ง",
  (p.j->>'rate_wk')::numeric                                            as "ใช้/วัน จ-พฤ",
  (p.j->>'rate_fri')::numeric                                           as "ใช้/วัน ศุกร์",
  (p.j->>'rate_we')::numeric                                            as "ใช้/วัน ส-อา",
  round(coalesce((p.j->>'rate_wk')::numeric,0)*4 + coalesce((p.j->>'rate_fri')::numeric,0)
       + coalesce((p.j->>'rate_we')::numeric,0)*2, 2)                       as "ใช้รวม/สัปดาห์",
  bu.u                                                                 as "หน่วยที่พบในบิลล่าสุด",
  bu.last_d                                                            as "วันที่บิลล่าสุด",
  (p.j->>'safety')::numeric                                            as "safety (ค่าเดิม)",
  (p.j->>'max')::numeric                                               as "max (ค่าเดิม)"
from prod p
left join br  b on b.id = p.branch_id
left join lateral (   -- ชื่อบิล/หน่วยจากตารางผูกชื่อ (pnl_stock_names ถ้ามี ไม่งั้น pnl_stock_map)
  select n.pnl_item, n.bill_unit, n.stock_unit
  from _names n
  where n.product_id = p.id and coalesce(n.pnl_item,'') <> '' and n.pnl_item <> '-'
  limit 1
) m on true
left join sup s on lower(btrim(s.name)) = lower(btrim(p.sup))
left join lateral (   -- วันสั่ง → วันส่ง (แปลง schedule เป็นข้อความไทย)
  select string_agg('สั่ง'||d1.th||' → ส่ง'||d2.th, ' · ' order by d1.ord) as txt
  from jsonb_each_text(
    case when jsonb_typeof(s.j->'schedule')='object' then s.j->'schedule'
         when jsonb_typeof(s.j->'schedule')='string' and left(btrim(s.j->>'schedule'),1)='{'
           then (btrim(s.j->>'schedule'))::jsonb
         else '{}'::jsonb end) e(k,v)
  join dow d1 on d1.k = e.k
  join dow d2 on d2.k = e.v
) sc on true
left join lateral (   -- หน่วยที่ซัพลงบิลบ่อยสุดใน 180 วัน (ไว้เทียบว่าหน่วยซื้อตรงกับบิลจริงไหม)
  select bi.unit as u, max(bi.d) as last_d
  from _bills bi
  where bi.item = m.pnl_item and coalesce(bi.unit,'') <> '' and bi.d >= current_date - 180
  group by bi.unit
  order by count(*) desc, max(bi.d) desc
  limit 1
) bu on true
left join lateral (   -- ตัวคูณหน่วยซื้อ → หน่วยนับ
  select c.factor from _conv c
  where c.item = m.pnl_item
    and lower(btrim(c.from_unit)) = lower(btrim(coalesce(nullif(btrim(m.bill_unit),''), bu.u, '')))
  limit 1
) cv on true
order by coalesce(b.name, p.branch_id),
         coalesce(nullif(btrim(p.j->>'dept'),''), nullif(btrim(p.j->>'cat_label'),''), 'ยังไม่จัดแผนก'),
         p.name;
