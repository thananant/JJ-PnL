-- ============================================================
-- JJ เช็คสต๊อก · ใส่อัตราใช้ต่อวัน สาขา@@BR@@ (@@CODE@@) จากบิลจริง
--   ที่มา: ไฟล์ "รายสินค้า" ที่ export จาก P&L — @@MONTHS@@
--   วิธีคิด: ปริมาณที่ซื้อทุกเดือนรวมกัน เกลี่ยตามยอดขายของแต่ละกลุ่มวัน แล้วหารด้วยจำนวนวันขายในกลุ่ม
--            (รวมทุกเดือน: จ–พฤ @@DW@@ วัน · ศ @@DF@@ วัน · ส–อา @@DE@@ วัน)
--   ตัวเลขในไฟล์นี้เป็น "ต่อวัน ตามหน่วยที่ลงบิล" — สคริปต์แปลงเป็นหน่วยนับให้เอง
--   หน่วยบิล ≠ หน่วยนับ และยังไม่ได้ตั้งตัวคูณ → ข้ามไว้ ไม่เดาให้ (ดูรายการท้ายไฟล์)
--   *** รันซ้ำได้ · สำรองค่าเดิมไว้ที่ jjsc_rate_backup ก่อนเขียนทับเสมอ ***
--   ตั้งตัวคูณเพิ่มแล้ว (แอพนับ › ⚙️ ตั้งค่า › 📐 หน่วยซื้อ–หน่วยนับ) รันไฟล์นี้ซ้ำได้เลย เดี๋ยวใส่ให้เพิ่ม
-- ============================================================

-- ① ที่เก็บค่าเดิม (ย้อนกลับได้)
create table if not exists jjsc_rate_backup(
  id          bigint generated always as identity primary key,
  saved_at    timestamptz not null default now(),
  batch       text        not null,
  product_id  text        not null,
  branch_id   text,
  name        text,
  rate_wk     numeric,
  rate_fri    numeric,
  rate_we     numeric
);
alter table jjsc_rate_backup enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jjsc_rate_backup' and policyname='jjsc_allow')
  then create policy jjsc_allow on jjsc_rate_backup for all using (true) with check (true); end if;
end $$;
grant select, insert on jjsc_rate_backup to anon, authenticated;

-- ② ตัวเลขจากบิล (1 แถว = 1 สินค้า × 1 หน่วยที่ลงบิล)
drop table if exists pg_temp.jj_rate_src;
create temp table jj_rate_src(stock_name text, bill_unit text, rwk numeric, rfri numeric, rwe numeric, nu text);
insert into jj_rate_src(stock_name,bill_unit,rwk,rfri,rwe) values
  @@VALUES@@;
update jj_rate_src set nu = @@N_BILLUNIT@@;

-- ③ จับคู่กับสินค้าในระบบนับ (สาขานี้) + หาตัวคูณแปลงหน่วย
drop table if exists pg_temp.jj_rate_plan;
create temp table jj_rate_plan as
select p.id                                     as product_id,
       p.name                                   as name,
       coalesce(nullif(btrim(p.unit),''),'')    as count_unit,
       s.bill_unit, s.nu, s.rwk, s.rfri, s.rwe,
       case
         when s.nu = @@N_PUNIT@@ then 1::numeric              -- หน่วยเดียวกัน (เทียบแบบชื่อพ้อง กก./กิโลกรัม/โล)
         when cv.factor > 0 then cv.factor                    -- อัตราแปลงหน่วยของ P&L (pnl_unit_conv)
         when n.factor > 1 and @@N_NBILL@@ = s.nu
              and @@N_NSTOCK@@ = @@N_PUNIT@@ then n.factor    -- ตัวคูณที่ผูกไว้กับชื่อบิล
         when p.pack > 1 and @@N_PPACK@@ = s.nu then p.pack   -- ขนาดแพ็คของสินค้า
         else null                                            -- แปลงไม่ได้ → ข้ามสินค้าตัวนี้ทั้งตัว
       end                                      as f
from jj_rate_src s
join products p
  on p.branch_id = '@@BID@@'
 and lower(btrim(p.name)) = lower(btrim(s.stock_name))
left join lateral (
  select x.bill_name, x.bill_unit, x.stock_unit, x.factor
  from pnl_stock_names x
  where x.product_id = p.id and coalesce(x.bill_name,'') not in ('','-')
  order by (x.branch = '@@CODE@@') desc
  limit 1
) n on true
left join lateral (
  select c.factor from pnl_unit_conv c
  where lower(btrim(c.item)) = lower(btrim(coalesce(nullif(btrim(n.bill_name),''), p.name)))
    and @@N_CFROM@@ = s.nu
    and @@N_CTO@@   = @@N_PUNIT@@
    and c.factor > 0
  limit 1
) cv on true;

-- ④ รวมทุกหน่วยของสินค้าเดียวกัน (หลังแปลงเป็นหน่วยนับแล้ว) — มีหน่วยไหนแปลงไม่ได้ = ข้ามทั้งตัว
drop table if exists pg_temp.jj_rate_final;
create temp table jj_rate_final as
select product_id, name, count_unit,
       round(sum(rwk  * f), 3) as wk,
       round(sum(rfri * f), 3) as fri,
       round(sum(rwe  * f), 3) as we,
       bool_and(f is not null)                                          as ok,
       string_agg(distinct bill_unit, ', ')                             as bill_units,
       string_agg(distinct case when f is null then bill_unit end, ', ') as missing_units
from jj_rate_plan
group by 1,2,3;

-- ⑤ สำรองค่าเดิม แล้วเขียนค่าใหม่ (เฉพาะตัวที่แปลงหน่วยได้ครบ · ค่าไม่เปลี่ยนก็ไม่เขียน)
insert into jjsc_rate_backup(batch, product_id, branch_id, name, rate_wk, rate_fri, rate_we)
select '@@BATCH@@', p.id, p.branch_id, p.name, p.rate_wk, p.rate_fri, p.rate_we
from products p join jj_rate_final x on x.product_id = p.id
where x.ok and (p.rate_wk, p.rate_fri, p.rate_we) is distinct from (x.wk, x.fri, x.we);

update products p
   set rate_wk = x.wk, rate_fri = x.fri, rate_we = x.we
  from jj_rate_final x
 where p.id = x.product_id and x.ok
   and (p.rate_wk, p.rate_fri, p.rate_we) is distinct from (x.wk, x.fri, x.we);

-- ---------- ตรวจผล ----------
select 'ใส่อัตราใช้ให้แล้ว'                    as หัวข้อ, count(*) as จำนวน from jj_rate_final where ok
union all
select 'ข้ามไว้ (ยังไม่ได้ตั้งตัวคูณหน่วย)',        count(*) from jj_rate_final where not ok
union all
select 'สินค้าในระบบนับ สาขา@@BR@@ ทั้งหมด',  count(*) from products where branch_id='@@BID@@'
union all
select 'ยังไม่มีอัตราใช้เลย (หลังรันไฟล์นี้)',      count(*) from products
 where branch_id='@@BID@@' and coalesce(rate_wk,0)=0 and coalesce(rate_fri,0)=0 and coalesce(rate_we,0)=0;

-- ที่ข้ามไว้ → ตั้ง "1 หน่วยซื้อ = กี่หน่วยนับ" ที่แอพนับ › ⚙️ ตั้งค่า › 📐 หน่วยซื้อ–หน่วยนับ แล้วรันไฟล์นี้ซ้ำ
select name as สินค้า, count_unit as หน่วยนับ, bill_units as หน่วยที่ลงบิล,
       missing_units as หน่วยที่ยังแปลงไม่ได้
from jj_rate_final where not ok order by name;

-- 20 ตัวที่ตัวเลขขยับเยอะสุด (ไว้กวาดตาว่าสมเหตุสมผลไหม)
select p.name as สินค้า, p.unit as หน่วยนับ,
       b.rate_wk as เดิม_จพฤ, p.rate_wk as ใหม่_จพฤ,
       b.rate_we as เดิม_สอา, p.rate_we as ใหม่_สอา
from products p
join lateral (select * from jjsc_rate_backup z
               where z.product_id = p.id and z.batch = '@@BATCH@@'
               order by z.saved_at limit 1) b on true
where p.branch_id = '@@BID@@'
order by abs(coalesce(p.rate_wk,0) - coalesce(b.rate_wk,0)) desc
limit 20;

-- ย้อนกลับ (ถ้าไม่ถูกใจ) — เอา -- ออกแล้วรันเฉพาะคำสั่งนี้
-- update products p set rate_wk=b.rate_wk, rate_fri=b.rate_fri, rate_we=b.rate_we
--   from (select distinct on (product_id) * from jjsc_rate_backup
--          where batch='@@BATCH@@' order by product_id, saved_at) b
--  where p.id=b.product_id;
