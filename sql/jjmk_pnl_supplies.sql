-- ============================================================
-- JJ P&L · สต๊อกของใช้/อุปกรณ์ (28 ก.ย. 2569) — รันครั้งเดียว รันซ้ำได้ (idempotent)
--   ของใช้ในร้านที่ไม่ใช่วัตถุดิบ: จาน ชาม ช้อน เตาไฟฟ้า เสื้อพนักงาน ฯลฯ
--   · pnl_supply_items  = รายการของใช้ รายสาขา + ระดับ safety ของแต่ละอย่าง
--   · pnl_supply_moves  = ประวัติเคลื่อนไหว (รับเข้า/เบิก/ชำรุด/ปรับยอดนับจริง) ใครทำ เมื่อไร
--   · pnl_supply_balance = view ยอดคงเหลือปัจจุบัน (รวมจากประวัติ) แอพอ่านจาก view นี้
-- ============================================================

-- 1) รายการของใช้ (แยกสาขา: ชื่อเดียวกันในสาขาเดียวกันมีได้แถวเดียว)
create table if not exists pnl_supply_items (
  id bigint generated always as identity primary key,
  branch text not null,                       -- JJRD / JJLP / รหัสสาขาใน pnl_branches
  name text not null,                         -- ชื่อของ เช่น จานกลม 9 นิ้ว
  cat text not null default 'อื่นๆ',          -- หมวด: ภาชนะ / อุปกรณ์ครัว / เครื่องใช้ไฟฟ้า / ยูนิฟอร์ม / ทำความสะอาด / อื่นๆ
  unit text not null default 'ชิ้น',          -- หน่วยนับ
  safety numeric not null default 0,          -- ระดับขั้นต่ำที่ควรมี (ต่ำกว่านี้ = เตือน)
  note text,
  sort int not null default 0,
  deleted_at timestamptz,                     -- เลิกใช้ = ซ่อน (ไม่ลบประวัติ)
  created_at timestamptz not null default now(),
  unique (branch, name)
);

-- 2) ประวัติเคลื่อนไหว
create table if not exists pnl_supply_moves (
  id bigint generated always as identity primary key,
  item_id bigint not null references pnl_supply_items(id) on delete cascade,
  branch text not null,
  d date not null default current_date,       -- วันที่ทำรายการ
  kind text not null check (kind in ('in','out','lost','adj')),  -- in=รับเข้า out=เบิก lost=ชำรุด/สูญหาย adj=ปรับยอดจากการนับจริง (qty เป็น ± ส่วนต่าง)
  qty numeric not null,                       -- in/out/lost = จำนวนบวก · adj = ส่วนต่าง (+เพิ่ม/-ลด)
  who text,                                   -- ผู้เบิก/ผู้รับ (ชื่อคนหน้างาน)
  by_user text,                               -- บัญชีที่บันทึก (pnl_users.username)
  note text,
  created_at timestamptz not null default now()
);
create index if not exists pnl_supply_moves_item_idx on pnl_supply_moves(item_id, d desc);
create index if not exists pnl_supply_moves_branch_idx on pnl_supply_moves(branch, d desc);

-- 3) ยอดคงเหลือปัจจุบัน (view) = รับเข้า − เบิก − ชำรุด ± ปรับยอด
create or replace view pnl_supply_balance as
select i.id as item_id, i.branch, i.name, i.cat, i.unit, i.safety, i.note, i.sort, i.deleted_at,
       coalesce(sum(case m.kind when 'in' then m.qty when 'out' then -m.qty when 'lost' then -m.qty when 'adj' then m.qty else 0 end),0) as qty,
       max(case when m.kind='out' then m.d end) as last_out_d,
       max(m.created_at) as last_move_at
from pnl_supply_items i
left join pnl_supply_moves m on m.item_id=i.id
group by i.id;

-- 4) RLS + policy + grant (แบบเดียวกับตารางอื่นของ P&L)
alter table pnl_supply_items enable row level security;
alter table pnl_supply_moves enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_supply_items' and policyname='allow_all') then
    create policy allow_all on pnl_supply_items for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='pnl_supply_moves' and policyname='allow_all') then
    create policy allow_all on pnl_supply_moves for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on pnl_supply_items, pnl_supply_moves to anon, authenticated;
grant select on pnl_supply_balance to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 5) ตัวอย่างหมวดเริ่มต้น (ใส่เฉพาะเมื่อยังไม่มีของเลย — รันซ้ำไม่เพิ่มซ้ำ)
insert into pnl_supply_items (branch, name, cat, unit, safety, sort)
select b.code, x.name, x.cat, x.unit, x.safety, x.sort
from (values
  ('จานกลม',        'ภาชนะ',           'ใบ',  50, 1),
  ('ชามซุป',        'ภาชนะ',           'ใบ',  40, 2),
  ('ช้อน',          'ภาชนะ',           'คัน', 60, 3),
  ('ตะเกียบ',       'ภาชนะ',           'คู่', 60, 4),
  ('เตาไฟฟ้า',      'เครื่องใช้ไฟฟ้า', 'เครื่อง', 2, 5),
  ('เสื้อพนักงาน',  'ยูนิฟอร์ม',       'ตัว', 5, 6)
) as x(name, cat, unit, safety, sort)
cross join (select code from pnl_branches where code in ('JJRD','JJLP')   -- 2 สาขาร้าน (ไม่ใส่ให้ส่วนกลาง)
            union select 'JJRD' where not exists (select 1 from pnl_branches where code='JJRD')
            union select 'JJLP' where not exists (select 1 from pnl_branches where code='JJLP')) b
where not exists (select 1 from pnl_supply_items);

-- ============================================================
-- ตรวจผล — ควรได้: ตาราง 2 · view 1 · policy 2 · ตัวอย่างของใช้ 6 รายการ/สาขา
-- ============================================================
select 'tables' as what, count(*) as n from information_schema.tables
 where table_name in ('pnl_supply_items','pnl_supply_moves') and table_type='BASE TABLE'
union all
select 'view', count(*) from information_schema.views where table_name='pnl_supply_balance'
union all
select 'policies', count(*) from pg_policies where tablename in ('pnl_supply_items','pnl_supply_moves')
union all
select 'items', count(*) from pnl_supply_items
union all
select 'moves', count(*) from pnl_supply_moves;
select branch, cat, name, unit, safety, qty from pnl_supply_balance where deleted_at is null order by branch, sort, name;
