-- ============================================================
-- JJ P&L · ตารางข้อมูลย้อนหลังรายเดือน (ไว้คำนวณค่าเฉลี่ยจากข้อมูลจริง)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================

create table if not exists pnl_history (
  branch  text not null references pnl_branches(code),
  month   text not null,                 -- 'YYYY-MM'
  revenue numeric not null default 0,    -- รายได้รวม (ก่อน VAT + Delivery) ฐานคิด %
  note    text,
  primary key (branch, month)
);

create table if not exists pnl_history_items (
  branch  text not null,
  month   text not null,
  name    text not null,                 -- ชื่อซัพพลายเออร์ / กะเช้า / กะเย็น / Shopee
  amount  numeric not null default 0,
  primary key (branch, month, name),
  foreign key (branch, month) references pnl_history(branch, month) on delete cascade
);

alter table pnl_history enable row level security;
alter table pnl_history_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_history' and policyname='allow_all') then
    create policy allow_all on pnl_history for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='pnl_history_items' and policyname='allow_all') then
    create policy allow_all on pnl_history_items for all using (true) with check (true);
  end if;
end $$;
