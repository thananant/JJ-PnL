-- ============================================================
-- JJ P&L · รายการสินค้าประจำของแต่ละซัพ (โชว์อัตโนมัติตอนลงรายละเอียดบิล)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_sup_items (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references pnl_suppliers(id) on delete cascade,
  item text not null,
  unit text not null default 'ชิ้น',
  sort int  not null default 0
);
create index if not exists pnl_sup_items_key on pnl_sup_items (supplier_id, sort);

alter table pnl_sup_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_sup_items' and policyname='allow_all') then
    create policy allow_all on pnl_sup_items for all using (true) with check (true);
  end if;
end $$;
