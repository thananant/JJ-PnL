-- ============================================================
-- JJ เช็คสต๊อก · ดึง "กติกาสั่ง–ส่งของซัพ + สินค้า + อัตราใช้" ทั้ง 2 สาขา ออกเป็นตารางเดียว (อ่านอย่างเดียว ไม่แก้อะไร)
--   ใช้ทำการทดสอบจำลองปฏิทินสั่งของ (scripts/sim-orders.js) — 1 แถว = 1 สินค้า พร้อมกติกาของซัพที่สินค้านั้นใช้
--   วิธีใช้: รันใน Supabase SQL Editor → กด "Download CSV" → ส่งไฟล์มาในแชท
--   หมายเหตุ: คอลัมน์ order_ahead / prepay จะเป็นค่าว่างถ้ายังไม่ได้รัน sql/jjmk_stockcheck_supflags.sql (ไม่ error)
-- ============================================================
with br(id, code, name) as (
  values ('b19f0a17b4472','JJRD','รัชดา'),('b19f0a17b448212','JJLP','ลาดพร้าว')
)
select
  b.code                                                  as branch_code,
  b.name                                                  as branch_name,
  p.id                                                    as product_id,
  p.name                                                  as name,
  coalesce(nullif(btrim(p.unit),''),'')                   as unit,
  coalesce(nullif(btrim(p.dept),''), nullif(btrim(p.cat_label),''), '') as dept,
  coalesce(nullif(btrim(p.sup),''),'')                    as sup,
  p.rate_wk, p.rate_fri, p.rate_we,
  s.name                                                  as sup_name,          -- ชื่อซัพในตาราง suppliers (ว่าง = ยังไม่มีในตารางซัพ)
  coalesce(s.order_mode, case when jsonb_typeof(to_jsonb(s)->'schedule')='object'
                                   and (to_jsonb(s)->'schedule') <> '{}'::jsonb then 'fixed' else 'any' end) as order_mode,
  case when jsonb_typeof(to_jsonb(s)->'schedule')='object' then (to_jsonb(s)->'schedule')::text
       when jsonb_typeof(to_jsonb(s)->'schedule')='string' then to_jsonb(s)->>'schedule'
       else '{}' end                                      as schedule,          -- {"mon":"wed",...} วันสั่ง→วันส่ง
  greatest(coalesce(s.lead_days,1),1)                     as lead_days,
  to_jsonb(s)->>'order_ahead'                             as order_ahead,       -- สั่งล่วงหน้ากี่วัน (ว่าง = 0)
  to_jsonb(s)->>'prepay'                                  as prepay,            -- true = ต้องจ่ายก่อนส่ง
  nullif(btrim(coalesce(s.line_group_id,'')),'')          as line_group_id,
  nullif(btrim(coalesce(s.cutoff,'')),'')                 as cutoff,
  s.min_cases                                             as min_cases,
  s.cycle_days                                            as cycle_days         -- รอบทุกกี่วัน (ค่าของระบบเดิม — หน้าสั่งของใหม่ยังไม่ใช้)
from products p
join br b on b.id = p.branch_id
left join suppliers s on lower(btrim(s.name)) = lower(btrim(p.sup))
where p.deleted_at is null
order by b.code, p.sup, p.name;
-- คาด: ประมาณ 400 แถว (สาขาละ ~200) · ทุกแถวมี order_mode เป็น any/fixed
