-- ============================================================
-- JJ เช็คสต๊อก · ตารางแผนก "แยกตามสาขา" (17 ก.ย. 2569) — รันซ้ำได้
--   เดิมแผนกอยู่ในคอลัมน์ products.dept เท่านั้น → แผนกที่ยังไม่มีของจะหายไป
--   ตารางนี้เก็บ "รายชื่อแผนกของแต่ละสาขา" เพื่อให้ เพิ่ม/แก้ชื่อ/ลบ แผนกได้จากหน้าตั้งค่า
--   และแผนกใหม่ขึ้นแถบแผนกหน้านับทันที แม้ยังไม่มีสินค้าในแผนกนั้น
--
--   *** แผนกและของในแต่ละแผนก แยกกันคนละสาขา ***  (รัชดา/ลาดพร้าว ตั้งคนละชุดได้)
--   ที่ใช้ร่วมกัน 2 สาขา มีแค่: ชื่อบิล↔ชื่อนับ และ หน่วยบิล↔หน่วยนับ
-- ============================================================
create table if not exists sc_depts (
  id bigint generated always as identity primary key,
  branch_id text not null,             -- b19f0a17b4472 = รัชดา · b19f0a17b448212 = ลาดพร้าว
  name text not null,                  -- ชื่อแผนก เช่น ครัวร้อน
  zone text,                           -- หน้าร้าน / หลังร้าน (ว่าง = ยังไม่จัดโซน)
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (branch_id, name)
);
alter table sc_depts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='sc_depts' and policyname='allow_all') then
    create policy allow_all on sc_depts for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on sc_depts to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- ย้ายแผนกที่ตั้งไว้แล้วใน products เข้าตารางนี้ (แยกสาขา) ----------
do $$
declare has_dept boolean; has_zone boolean;
begin
  select count(*) filter (where column_name='dept')>0,
         count(*) filter (where column_name='zone')>0
    into has_dept, has_zone
  from information_schema.columns where table_name='products';
  if not has_dept then
    raise notice 'ยังไม่มีคอลัมน์ products.dept — รัน sql/jjmk_stockcheck_dept.sql ก่อน แล้วรันไฟล์นี้ซ้ำ';
    return;
  end if;
  if has_zone then
    execute $q$
      insert into sc_depts(branch_id,name,zone)
      select p.branch_id, btrim(p.dept), max(p.zone)
      from products p
      where p.dept is not null and btrim(p.dept)<>'' and p.deleted_at is null
      group by p.branch_id, btrim(p.dept)
      on conflict (branch_id,name) do nothing $q$;
  else
    execute $q$
      insert into sc_depts(branch_id,name)
      select p.branch_id, btrim(p.dept)
      from products p
      where p.dept is not null and btrim(p.dept)<>'' and p.deleted_at is null
      group by p.branch_id, btrim(p.dept)
      on conflict (branch_id,name) do nothing $q$;
  end if;
end $$;

-- ---------- ตรวจผล ----------
select branch_id as สาขา, count(*) as จำนวนแผนก from sc_depts group by branch_id order by branch_id;
select d.branch_id as สาขา, d.name as แผนก, coalesce(d.zone,'(ยังไม่จัดโซน)') as โซน,
       (select count(*) from products p
         where p.branch_id=d.branch_id and btrim(coalesce(to_jsonb(p)->>'dept',''))=d.name and p.deleted_at is null) as จำนวนสินค้า
from sc_depts d order by d.branch_id, d.sort, d.name;
-- คาด: เห็นแผนกของแต่ละสาขาแยกกัน · ถ้ายังไม่เคยตั้งแผนกเลย = ตารางว่าง (ไปเพิ่มเองที่หน้า ⚙️ ตั้งค่า › แผนก)
