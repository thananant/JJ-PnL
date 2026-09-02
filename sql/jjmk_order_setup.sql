-- ============================================================
-- JJ สั่งของ (jjmk-order.html) · ตารางชุด ord_* — แยกจาก P&L โดยสิ้นเชิง (2 ก.ย. 2569)
--   นับสต๊อก → คำนวณสั่งของตามรอบส่งของซัพ → รับของ · รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้
--   ใช้ Supabase โปรเจกต์เดียวกับ P&L/jj-stock แต่ไม่แตะตารางของใคร
-- ============================================================
create table if not exists ord_suppliers (
  id bigint generated always as identity primary key,
  name text not null unique,
  sched jsonb not null default '{"type":"any","lead":1}'::jsonb,  -- รอบสั่ง-ส่ง ดูรูปแบบในแอพ (days/map/cycle/any)
  lead_ok boolean not null default false,                          -- ยืนยันวันส่งแล้ว (seed ตั้ง false ให้เช็คก่อนใช้)
  contact text not null default '',                                -- LINE/เบอร์ ที่ใช้สั่ง
  note text not null default '',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists ord_products (
  id bigint generated always as identity primary key,
  branch text not null,                          -- JJRD / JJLP
  name text not null,                            -- ชื่อนับ (พนักงานเรียก)
  bill_name text not null default '',            -- ชื่อบิล (P&L) ไว้โชว์ตัวเล็ก
  name_en text not null default '', name_lo text not null default '', name_my text not null default '',
  dept text not null default '',                 -- แผนก/จุดเก็บ (จัดกลุ่มหน้าจอนับ)
  unit text not null default '',                 -- หน่วยนับ
  supplier_id bigint references ord_suppliers(id),
  pack_qty numeric,                              -- 1 แพ็ค/ลัง = กี่หน่วยนับ
  pack_unit text not null default '',            -- ชื่อหน่วยแพ็ค (ลัง/กล่อง/ถุง)
  order_step numeric,                            -- สั่งทีละ (ขั้น)
  order_unit text not null default '',           -- หน่วยของขั้นสั่ง (= pack_unit หรือ = unit)
  rate jsonb,                                    -- อัตราใช้/วัน ตั้งต้น {g0:จ–พฤ, g1:ศ, g2:ส–อา}
  safety_days numeric,                           -- safety เป็นจำนวนวันใช้ (ว่าง = ใช้ค่ากลางในตั้งค่า)
  safety_old numeric, max_old numeric,           -- ค่าจากโปรแกรมเก่า (ใช้เป็นโหมดสำรองเมื่อยังไม่มีอัตราใช้)
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (branch, name)
);
create table if not exists ord_counts (
  id bigint generated always as identity primary key,
  branch text not null,
  d date not null,
  product_id bigint not null references ord_products(id) on delete cascade,
  qty numeric not null default 0,
  out_of_stock boolean not null default false,
  by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch, d, product_id)
);
create index if not exists ord_counts_bd on ord_counts (branch, d);
create table if not exists ord_orders (
  id bigint generated always as identity primary key,
  branch text not null,
  supplier_id bigint not null references ord_suppliers(id),
  order_date date not null,
  deliver_date date not null,
  status text not null default 'draft',          -- draft / sent / received / cancelled
  note text not null default '',
  line_text text not null default '',
  sent_at timestamptz, received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (branch, supplier_id, order_date)
);
create table if not exists ord_order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references ord_orders(id) on delete cascade,
  product_id bigint not null references ord_products(id),
  qty numeric not null default 0,                -- จำนวนสั่ง (หน่วยนับ)
  packs numeric,                                 -- จำนวนแพ็ค/ลัง (ถ้ามี)
  calc jsonb,                                    -- ที่มาของตัวเลข (โชว์อธิบายได้)
  received_qty numeric,                          -- รับจริง (ว่าง = ยังไม่รับ)
  received_note text not null default '',
  unique (order_id, product_id)
);
create table if not exists ord_holidays (
  id bigint generated always as identity primary key,
  d date not null,
  kind text not null,                            -- closed = ร้านปิด · busy = วันขายดี (×factor) · nodeliv = ซัพไม่ส่ง
  supplier_id bigint references ord_suppliers(id) on delete cascade,  -- ใช้กับ nodeliv (ว่าง = ทุกซัพ)
  factor numeric not null default 1,
  note text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists ord_holidays_uq on ord_holidays (d, kind, coalesce(supplier_id,0));
create table if not exists ord_settings (
  key text primary key,
  val jsonb not null,
  updated_at timestamptz not null default now()
);
insert into ord_settings(key,val) values
  ('safety_days','1'), ('pin','"1234"'), ('min_learn','4'),
  ('line_head','"📦 สั่งของ จริงใจหมูกระทะ"')
on conflict (key) do nothing;

-- RLS + สิทธิ์ (แบบเดียวกับ pnl_*: anon key ผ่าน policy allow_all)
do $$
declare t text;
begin
  foreach t in array array['ord_suppliers','ord_products','ord_counts','ord_orders','ord_order_items','ord_holidays','ord_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='allow_all') then
      execute format('create policy allow_all on public.%I for all using (true) with check (true)', t);
    end if;
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ตรวจผล
select 'ord_* พร้อมใช้' as ok,
  (select count(*) from ord_suppliers) as suppliers, (select count(*) from ord_products) as products,
  (select count(*) from ord_counts) as counts, (select count(*) from ord_orders) as orders;
