-- ============================================================
-- JJ · view "pnl_stock_names" = ชื่อคู่ (ชื่อนับ jj-stock ↔ ชื่อบิล P&L) ที่ทั้งสองแอพอ่านร่วมกัน
--   แหล่งความจริงที่เดียว: pnl_stock_map (การผูก) + products (ชื่อนับ "สด" ของ jj-stock)
--   -> เปลี่ยนชื่อในแอพนับเมื่อไหร่ ชื่อใน view เปลี่ยนตาม ไม่มีสำเนาค้าง · ไม่แตะตารางของ jj-stock (อ่านอย่างเดียว)
--   รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ (2 ก.ย. 2569)
--   ต้องรัน jjmk_pnl_stockread.sql มาก่อน (anon อ่าน products ได้) — ถ้ายัง view จะ error 42501 ตอนอ่านด้วย anon
-- ============================================================
create or replace view public.pnl_stock_names
  with (security_invoker = true)            -- ใช้สิทธิ์ของคนอ่าน (anon) ตามปกติ ไม่ยกระดับสิทธิ์
as
select m.product_id,                        -- products.id ของ jj-stock (คีย์จับคู่ ใช้ตัวนี้ ห้ามเทียบชื่อ)
       m.branch,                            -- JJRD รัชดา / JJLP ลาดพร้าว
       p.name        as stock_name,         -- ชื่อนับ (สด จาก products ของ jj-stock)
       p.unit        as stock_unit,         -- หน่วยนับ
       m.pnl_item    as bill_name,          -- ชื่อบิล (P&L)
       m.bill_unit,                         -- หน่วยในบิล (อาจว่าง)
       m.factor,                            -- 1 หน่วยบิล = factor หน่วยนับ
       (lower(trim(regexp_replace(p.name,'\s+',' ','g'))) = lower(trim(regexp_replace(m.pnl_item,'\s+',' ','g'))))
                     as same_name           -- true = สะกดเหมือนกันอยู่แล้ว ไม่ต้องโชว์ป้ายซ้ำ
from public.pnl_stock_map m
join public.products p on p.id = m.product_id
where m.active
  and m.product_id not like 'none:%'        -- แถว none:* = จำว่า "ไม่มีในระบบนับ" ไม่ใช่การผูก
  and m.pnl_item <> '-'
  and p.deleted_at is null;

comment on view public.pnl_stock_names is 'ชื่อคู่ ชื่อนับ(jj-stock)↔ชื่อบิล(P&L) อ่านร่วมกันสองแอพ · แก้การผูกที่หน้า "ใช้จริง" ของ P&L เท่านั้น';

do $$ begin
  if exists (select 1 from pg_roles where rolname='anon') then grant select on public.pnl_stock_names to anon; end if;
  if exists (select 1 from pg_roles where rolname='authenticated') then grant select on public.pnl_stock_names to authenticated; end if;
end $$;

-- ตรวจผล: จำนวนคู่ที่ผูกอยู่ต่อสาขา + ตัวอย่างคู่ที่ชื่อต่างกัน (ที่แอพต้องโชว์ป้าย)
select branch, count(*) as "คู่ที่ผูกอยู่", count(*) filter (where not same_name) as "ชื่อต่างกัน (โชว์ป้าย)"
from public.pnl_stock_names group by branch order by branch;
select branch, stock_name as "ชื่อนับ", bill_name as "ชื่อบิล", factor
from public.pnl_stock_names where not same_name order by branch, stock_name limit 20;
