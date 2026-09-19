-- ============================================================
-- JJ เช็คสต๊อก · คลังหน่วย (19 ก.ย. 2569) — รันซ้ำได้
--   ปัญหา: หน่วยถูกพิมพ์กระจัดกระจาย (โล / กก. / กิโล) ไม่มีที่รวมให้ดู/แก้
--   แก้  : ตารางรายชื่อหน่วยกลาง → หน้า ⚙️ ตั้งค่า › หน่วยซื้อ–หน่วยนับ
--          จะมีแผง "📏 หน่วยทั้งหมด" ให้ เพิ่ม / แก้ชื่อ / ลบ ได้จากแอพ
--   kind: 'count' = หน่วยนับ · 'buy' = หน่วยซื้อ (จากบิล) · 'both' = ใช้ทั้งสองแบบ
-- ============================================================
create table if not exists sc_units (
  id bigint generated always as identity primary key,
  name text not null unique,
  kind text not null default 'both',
  sort int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

alter table sc_units enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sc_units' and policyname='jjsc_allow') then
    create policy jjsc_allow on sc_units for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on sc_units to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- ดึงหน่วยที่ใช้อยู่จริงเข้ารายการ (หน่วยนับจากระบบนับ + หน่วยซื้อจากบิล 180 วัน) ----------
do $$
declare has_bill boolean := to_regclass('public.pnl_bill_items') is not null;
begin
  create temp table _u(name text, kind text) on commit drop;

  insert into _u(name,kind)
  select distinct btrim(unit),'count' from products
   where unit is not null and btrim(unit)<>'' and deleted_at is null;

  if to_regclass('public.pnl_stock_map') is not null then
    insert into _u(name,kind)
    select distinct btrim(stock_unit),'count' from pnl_stock_map
     where stock_unit is not null and btrim(stock_unit)<>'';
  end if;

  if has_bill then
    insert into _u(name,kind)
    select distinct btrim(unit),'buy' from pnl_bill_items
     where unit is not null and btrim(unit)<>'' and d >= (current_date - 180);
  end if;

  insert into sc_units(name,kind)
  select u.name,
         case when count(distinct u.kind)>1 then 'both' else max(u.kind) end
    from _u u
   where u.name is not null and u.name<>''
   group by u.name
  on conflict (name) do nothing;
end $$;

-- ---------- ตรวจผล ----------
select kind as ชนิด, count(*) as จำนวนหน่วย from sc_units group by kind order by kind;

select u.name as หน่วย,
       case u.kind when 'count' then 'หน่วยนับ' when 'buy' then 'หน่วยซื้อ (บิล)' else 'ทั้งสองแบบ' end as ชนิด,
       (select count(*) from products p where btrim(coalesce(p.unit,''))=u.name and p.deleted_at is null) as ใช้เป็นหน่วยนับ
  from sc_units u
 order by ใช้เป็นหน่วยนับ desc, u.name;
-- คาด: เห็นหน่วยทั้งหมดที่ใช้อยู่ · แก้ชื่อ/เพิ่ม/ลบ ต่อได้ในแอพที่ ⚙️ ตั้งค่า › หน่วยซื้อ–หน่วยนับ

-- ============================================================
-- เพิ่มเติม 19 ก.ย. 2569 · "ชื่อพ้อง" (alias) — หน่วยคนละชื่อแต่ของเดียวกัน
--   เช่น บิลซัพเขียน "กก." แต่หน่วยนับของร้านคือ "โล"
--   วิธีรวม: ตั้งหน่วยหลัก 1 ชื่อ แล้วชี้ชื่ออื่นเป็น alias_of ของมัน
--   ระบบนับ: เทียบหน่วยด้วย "ชื่อหลัก" → ไม่ขึ้น "ยังไม่ใส่ตัวคูณ" อีก
--   ฝั่ง P&L: แอพจะใส่ตัวคูณ 1:1 (pnl_unit_conv) ให้ทุกสินค้าที่บิลใช้ชื่อพ้องโดยอัตโนมัติ
--   *** บิลเก่าไม่ถูกแก้ *** (หน่วยในบิลเป็นของที่ซัพส่งมาจริง)
-- ============================================================
alter table sc_units add column if not exists alias_of text;
create index if not exists sc_units_alias_idx on sc_units(alias_of);

-- กันชี้วน (A→B→A) และกันชี้หาตัวเอง
do $$ begin
  if not exists (select 1 from pg_constraint where conname='sc_units_alias_self_chk') then
    alter table sc_units add constraint sc_units_alias_self_chk check (alias_of is null or btrim(alias_of) <> btrim(name));
  end if;
end $$;
-- ชี้ต่อกันเป็นทอด (ค→ข→ก) ให้ยุบไปที่ตัวหลักตัวเดียว
do $$
declare n int; i int := 0;
begin
  loop
    update sc_units a set alias_of=b.alias_of
      from sc_units b
     where a.alias_of is not null and btrim(b.name)=btrim(a.alias_of)
       and b.alias_of is not null and btrim(b.alias_of)<>btrim(a.name);
    get diagnostics n = row_count;
    i := i + 1;
    exit when n=0 or i>10;
  end loop;
  -- ที่ยังวนอยู่ (ก→ข→ก) หรือชี้หาตัวเอง = ตัดทิ้ง
  update sc_units a set alias_of=null
   where a.alias_of is not null
     and (btrim(a.alias_of)=btrim(a.name)
          or exists (select 1 from sc_units b where btrim(b.name)=btrim(a.alias_of) and b.alias_of is not null));
end $$;

-- ---------- ตรวจผล (ชื่อพ้อง) ----------
select coalesce(u.alias_of,u.name) as หน่วยหลัก,
       string_agg(u.name,', ' order by u.name) filter (where u.alias_of is not null) as ชื่อพ้อง
  from sc_units u
 group by coalesce(u.alias_of,u.name)
 having count(*) filter (where u.alias_of is not null) > 0
 order by 1;
-- คาด: ว่างถ้ายังไม่ได้รวมหน่วย · ไปรวมได้ในแอพที่ ⚙️ ตั้งค่า › หน่วยซื้อ–หน่วยนับ › ปุ่ม 🔗 รวม
