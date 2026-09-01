-- ============================================================
-- JJ P&L · ลำดับหมวด Fix cost ใช้ร่วมทุกสาขา + รองรับเพิ่มสาขา
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================

-- 1) ตารางลำดับหมวด Fix cost (ค่ากลาง ทุกสาขาใช้ลำดับเดียวกัน)
create table if not exists pnl_fix_groups (
  name text primary key,
  sort int not null default 100
);
insert into pnl_fix_groups (name, sort)
select distinct grp, 100 from pnl_fixed_items where grp is not null and grp <> ''
on conflict (name) do nothing;
update pnl_fix_groups set sort = 10 where name in ('Fix cost','รายเดือน') and sort = 100;
update pnl_fix_groups set sort = 20 where name in ('สาธารณูปโภค','ค่าสาธารณูปโภค') and sort = 100;
update pnl_fix_groups set sort = 30 where name in ('พนักงาน','ค่าพนักงาน') and sort = 100;

alter table pnl_fix_groups enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_fix_groups' and policyname='allow_all') then
    create policy allow_all on pnl_fix_groups for all using (true) with check (true);
  end if;
end $$;

-- 2) ลำดับสาขา (เพิ่มสาขาใหม่ = insert แถวใน pnl_branches แอปรับเอง)
alter table pnl_branches add column if not exists sort int not null default 100;
update pnl_branches set sort = 1 where code = 'JJRD' and sort = 100;
update pnl_branches set sort = 2 where code = 'JJLP' and sort = 100;
