-- ============================================================
-- JJ · หาชื่อบิลที่ "ควรเป็นตัวเดียวกันแต่แตกเป็นสองบรรทัด" ในหน้าเทียบสาขา
--   รันทั้งไฟล์ (อ่านอย่างเดียว) เดือนปัจจุบัน · Export CSV ส่งกลับมาได้เลย
-- ============================================================

-- [1] ชื่อสะกดต่างกันแต่พอตัดช่องว่างแล้วเหมือนกัน (คู่แฝดชัวร์)
with t as (
  select distinct item from pnl_bill_items
  where d >= date_trunc('month', current_date)::date
)
select a.item as "ชื่อแบบที่ 1", b.item as "ชื่อแบบที่ 2"
from t a join t b
  on a.item < b.item
 and replace(lower(a.item),' ','') = replace(lower(b.item),' ','')
order by 1;

-- [2] ชื่อเดียวกันแต่สองสาขาลงคนละหน่วย (ระบบเลยไม่จับคู่ให้)
with t as (
  select distinct item, branch, coalesce(unit,'') as unit from pnl_bill_items
  where d >= date_trunc('month', current_date)::date and branch in ('JJRD','JJLP')
)
select a.item as "ชื่อในบิล", a.unit as "หน่วยรัชดา", b.unit as "หน่วยลาดพร้าว"
from t a join t b on a.item=b.item and a.branch='JJRD' and b.branch='JJLP' and a.unit<>b.unit
order by 1;

-- [3] ชื่อที่เดือนนี้มีบิลสาขาเดียว (เรียง ก-ฮ ให้คู่แฝดสะกดต่างมาอยู่ติดกัน ไล่ตาง่าย)
with t as (
  select item, max(coalesce(unit,'')) as unit, max(branch) as br, count(*) as n
  from pnl_bill_items
  where d >= date_trunc('month', current_date)::date and branch in ('JJRD','JJLP')
  group by item
  having count(distinct branch)=1
)
select item as "ชื่อในบิล (มีสาขาเดียวเดือนนี้)",
       case br when 'JJRD' then 'รัชดา' else 'ลาดพร้าว' end as "สาขา",
       unit as "หน่วย", n as "จำนวนแถว"
from t order by item;
