-- ============================================================
-- JJ P&L · ประวัติแก้ไขรายละเอียดบิล (ใครแก้ · แก้อะไร · เมื่อไหร่)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_bill_log (
  id bigint generated always as identity primary key,
  branch      text   not null,
  d           date   not null,
  supplier_id bigint not null,
  editor  text not null default 'ไม่ระบุ',
  change  text not null,
  created_at timestamptz not null default now()
);
create index if not exists pnl_bill_log_key
  on pnl_bill_log (branch, d, supplier_id, created_at desc);

alter table pnl_bill_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_bill_log' and policyname='allow_all') then
    create policy allow_all on pnl_bill_log for all using (true) with check (true);
  end if;
end $$;
