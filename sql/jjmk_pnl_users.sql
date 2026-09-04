-- ============================================================
-- JJ P&L · ระบบผู้ใช้ + สิทธิ์รายเมนู + ประวัติการใช้งาน
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ผู้ใช้เริ่มต้น: admin / jjmk1234  (เข้าแล้วควรเปลี่ยนรหัสทันที)
-- ============================================================
create table if not exists pnl_users (
  id bigint generated always as identity primary key,
  username     text not null unique,
  pass_hash    text not null,
  display_name text not null,
  role  text  not null default 'staff',      -- admin / staff
  perms jsonb not null default '{}'::jsonb,  -- {"income":"edit","dash":"view",...}
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pnl_activity_log (
  id bigint generated always as identity primary key,
  username text not null,
  branch   text,
  action   text not null,
  detail   text,
  created_at timestamptz not null default now()
);
create index if not exists pnl_activity_log_t on pnl_activity_log (created_at desc);

insert into pnl_users (username, pass_hash, display_name, role)
values ('admin', '178cc2b810f6de5e5252e5fc3aa31cd0e18634683b9b0854a6797199d97bf7bb', 'ผู้ดูแลระบบ', 'admin')
on conflict (username) do nothing;

alter table pnl_users enable row level security;
alter table pnl_activity_log enable row level security;
do $$ declare t text;
begin
  foreach t in array array['pnl_users','pnl_activity_log'] loop
    if not exists (select 1 from pg_policies where tablename=t and policyname='allow_all') then
      execute format('create policy allow_all on %I for all using (true) with check (true)', t);
    end if;
  end loop;
end $$;
