-- ============================================================
-- JJ P&L · รายละเอียดบิล (รายการสินค้า จำนวน หน่วย ราคา/หน่วย)
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_bill_items (
  id bigint generated always as identity primary key,
  branch      text   not null references pnl_branches(code),
  d           date   not null,
  supplier_id bigint not null references pnl_suppliers(id),
  item  text    not null,
  qty   numeric not null default 0,
  unit  text    not null default 'ชิ้น',
  price numeric not null default 0,      -- ราคาต่อหน่วย
  sort  int     not null default 0
);
create index if not exists pnl_bill_items_key
  on pnl_bill_items (branch, d, supplier_id);

alter table pnl_bill_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_bill_items' and policyname='allow_all') then
    create policy allow_all on pnl_bill_items for all using (true) with check (true);
  end if;
end $$;
