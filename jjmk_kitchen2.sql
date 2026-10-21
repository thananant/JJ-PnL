-- jjmk_kitchen2.sql — JJ Kitchen v2 (ครัวกลาง จริงใจหมูกระทะ · rebuild 2026-10-16)
-- รันครั้งเดียวใน Supabase → SQL Editor (รันซ้ำได้ · ไม่ลบ/ไม่แก้ข้อมูลเดิม)
-- ใช้ตารางหลักเดิม ck_items / ck_recipes / ck_recipe_items / ck_sups / ck_settings + ตารางงานใหม่ prefix kc_*
-- แอพเข้าด้วยบัญชีกลาง pnl_users ผ่าน anon key (สิทธิ์รายคนตรวจที่ตัวแอพ / JJ Access) → เปิด RLS ให้ anon แบบเดียวกับ jjmk_kitchen_central.sql

-- ---------- 1) คอลัมน์ใหม่ในตารางหลักเดิม ----------
alter table ck_items add column if not exists avg_cost numeric;          -- ต้นทุนถัวเฉลี่ย/หน่วยหลัก
alter table ck_items add column if not exists last_price numeric;        -- ราคารับเข้าล่าสุด/หน่วยหลัก
alter table ck_items add column if not exists last_price_at date;
alter table ck_items add column if not exists packs jsonb;               -- [{"u":"ถุง","q":1000}] 1 u = q หน่วยหลัก
alter table ck_items add column if not exists count_unit text;
alter table ck_items add column if not exists dept text;
alter table ck_items add column if not exists min_qty numeric;
alter table ck_items add column if not exists max_qty numeric;           -- 🛒 สั่งเติมให้ถึง (Max · หน่วยหลัก) · ต่ำกว่า min_qty → สั่งถึงค่านี้ ปัดขึ้นเป็นหน่วยซื้อเต็ม (2026-10-19)
alter table ck_items add column if not exists active boolean default true;
alter table ck_recipes add column if not exists avg_cost numeric;        -- ต้นทุนถัวเฉลี่ย/หน่วยผลิต (จากล็อตจริง)
alter table ck_recipes add column if not exists target_qty numeric;      -- สต๊อกสำเร็จรูปที่ควรมี (ตายตัว)
alter table ck_recipes add column if not exists target_days numeric;     -- หรือ = กี่วันของยอดส่งเฉลี่ย
alter table ck_recipes add column if not exists max_qty numeric;         -- 🎯 ทำเติมให้ถึง (Max) · ว่าง = เติมถึง target_qty (Safety = ขั้นต่ำที่ต้องมี) — 2026-10-17
alter table ck_recipes add column if not exists markup_pct numeric;
alter table ck_recipes add column if not exists note text;
alter table ck_recipes add column if not exists active boolean default true;
alter table ck_recipe_items add column if not exists unit text;          -- null = หน่วยหลักของวัตถุดิบ
alter table ck_sups add column if not exists credit_days integer default 0;
alter table ck_sups add column if not exists line_group_id text;
alter table ck_sups add column if not exists order_days smallint[];
alter table ck_sups add column if not exists lead_days integer default 1;
alter table ck_sups add column if not exists active boolean default true;

-- ---------- 2) ตารางงานใหม่ kc_* ----------
create table if not exists kc_receipts (                      -- รับของ (หัวบิล)
  id text primary key, d date not null, sup_id text, sup_name text, bill_no text, total numeric default 0, note text, po_id text,
  by_name text, created_at timestamptz default now());
create table if not exists kc_receipt_lines (
  id bigserial primary key, receipt_id text not null references kc_receipts(id) on delete cascade,
  item_id text, name text, packs numeric, pack_unit text, pack_qty numeric, unit text, qty_base numeric,
  price_mode text, price numeric, price_total numeric, price_base numeric, sort integer default 0,
  prev_avg numeric, prev_last numeric, prev_last_at date, prev_qty numeric);   -- ค่าก่อนรับ (ไว้คืน/คิดใหม่ตอนยกเลิก)
alter table kc_receipt_lines add column if not exists prev_avg numeric;
alter table kc_receipt_lines add column if not exists prev_last numeric;
alter table kc_receipt_lines add column if not exists prev_last_at date;
alter table kc_receipt_lines add column if not exists prev_qty numeric;
create table if not exists kc_productions (                   -- ทำของ (ล็อต)
  id text primary key, d date not null, recipe_id text, name text, lots numeric, plan_qty numeric, actual_qty numeric, unit text,
  cost_items numeric, cost_overhead numeric, cost_total numeric, cost_unit numeric, kind text, note text,
  prev_avg numeric, prev_unit_cost numeric, prev_qty numeric,                               -- ต้นทุน/ยอดสินค้าก่อนล็อตนี้ (ไว้คืน/คิดใหม่ตอนยกเลิก)
  by_name text, created_at timestamptz default now());
alter table kc_productions add column if not exists prev_avg numeric;
alter table kc_productions add column if not exists prev_unit_cost numeric;
alter table kc_productions add column if not exists prev_qty numeric;
create table if not exists kc_production_lines (
  id bigserial primary key, production_id text not null references kc_productions(id) on delete cascade,
  item_id text, name text, qty_plan numeric, qty_used numeric, qty_waste numeric, unit text, unit_cost numeric, cost numeric, sort integer default 0);
create table if not exists kc_moves (                         -- สมุดสต๊อก (วัตถุดิบ + สินค้า)
  id bigserial primary key, d date not null, kind text not null, ref_kind text not null, ref_id text not null, name text,
  qty numeric not null, cost numeric, ref_table text, ref_id2 text, note text, by_name text, created_at timestamptz default now());
create table if not exists kc_counts (                        -- นับสต๊อก
  id text primary key, d date not null, kind text not null, n integer default 0, diff integer default 0, note text,
  by_name text, created_at timestamptz default now());
create table if not exists kc_count_lines (
  id bigserial primary key, count_id text not null references kc_counts(id) on delete cascade,
  ref_id text, name text, sys_qty numeric, counted_qty numeric, delta numeric, unit text, count_unit text, count_qty numeric);
alter table kc_count_lines add column if not exists scrap_qty numeric;   -- ✂️ เศษตัดแต่ง (หน่วยหลัก · 2026-10-19)
alter table kc_count_lines add column if not exists used_qty numeric;    -- ใช้ไปตั้งแต่นับครั้งก่อน (คิด yield = 1 − เศษ/ใช้ไป)
alter table kc_count_lines add column if not exists scrap_cost numeric;  -- มูลค่าเศษตามต้นทุน
create table if not exists kc_deliveries (                    -- บิลส่งสาขา
  id text primary key, bill_no text, d date not null, branch text, branch_name text, order_date date, status text default 'sent',
  subtotal numeric default 0, overhead numeric default 0, total numeric default 0, line_sent_at timestamptz, line_group_id text, paid_at date, note text,
  by_name text, created_at timestamptz default now());
create table if not exists kc_delivery_lines (
  id bigserial primary key, delivery_id text not null references kc_deliveries(id) on delete cascade,
  recipe_id text, name text, stk_product_id text, ordered numeric, sent numeric, unit text, unit_cost numeric, unit_price numeric, amount numeric, sort integer default 0);
create table if not exists kc_links (                         -- ชื่อสินค้าสาขา (แอพนับสต๊อก) ↔ เมนูครัว
  id bigserial primary key, stk_name text not null unique, recipe_id text, factor numeric default 1,
  by_name text, created_at timestamptz default now());
create table if not exists kc_pos (                           -- ใบสั่งซื้อ
  id text primary key, po_no text, d date not null, sup_id text, sup_name text, status text default 'draft', text text, note text, line_sent_at timestamptz,
  by_name text, created_at timestamptz default now());
create table if not exists kc_po_lines (
  id bigserial primary key, po_id text not null references kc_pos(id) on delete cascade,
  item_id text, name text, packs numeric, pack_unit text, pack_qty numeric, qty_base numeric, unit text, price_est numeric, sort integer default 0);
create table if not exists kc_expenses (                      -- ค่าใช้จ่ายแฝง (overhead)
  id text primary key, d date not null, ym text not null, cat text, name text, amount numeric default 0, recurring boolean default false, note text,
  by_name text, created_at timestamptz default now());

create index if not exists kc_moves_d_idx on kc_moves (d);
create index if not exists kc_moves_ref_idx on kc_moves (ref_kind, ref_id);
create index if not exists kc_receipts_d_idx on kc_receipts (d);
create index if not exists kc_productions_d_idx on kc_productions (d);
create index if not exists kc_productions_recipe_idx on kc_productions (recipe_id);
create index if not exists kc_deliveries_d_idx on kc_deliveries (d);
create index if not exists kc_deliveries_branch_idx on kc_deliveries (branch, order_date);
create index if not exists kc_expenses_ym_idx on kc_expenses (ym);
create index if not exists kc_counts_d_idx on kc_counts (d);
-- เลขบิลสาขา / เลขใบสั่งซื้อ ห้ามซ้ำ (สองเครื่องกดออกบิลพร้อมกัน → เครื่องหลังได้ 23505 แล้วแอพอ่านเลขใหม่เอง) · มีเลขซ้ำอยู่แล้ว = แจ้งเตือน ไม่สร้าง index (แก้เลขซ้ำก่อนแล้วรันใหม่)
do $$ begin
  create unique index if not exists kc_deliveries_bill_no_uq on kc_deliveries (bill_no) where bill_no is not null;
exception when unique_violation then raise notice 'kc_deliveries: bill_no ซ้ำอยู่ — แก้เลขซ้ำก่อนแล้วรันใหม่ (ยังไม่สร้าง kc_deliveries_bill_no_uq)'; end $$;
do $$ begin
  create unique index if not exists kc_pos_po_no_uq on kc_pos (po_no) where po_no is not null;
exception when unique_violation then raise notice 'kc_pos: po_no ซ้ำอยู่ — แก้เลขซ้ำก่อนแล้วรันใหม่ (ยังไม่สร้าง kc_pos_po_no_uq)'; end $$;

-- ---------- 3) บวก/ลบยอดแบบ atomic (ชื่อ/พารามิเตอร์เดียวกับแอพเดิม) ----------
-- รุ่นนี้ปัด 4 ตำแหน่ง (แอพใหม่เก็บยอดเป็นหน่วยหลัก 4 ตำแหน่ง — 4 กรัมของของที่นับเป็น กก. = 0.004 · รุ่นเดิมปัด 2 ตำแหน่งทำให้ยอดเล็ก ๆ หายไป)
-- · p_kind ต้องเป็น item/recipe เท่านั้น · p_delta เป็น null = ไม่แตะยอด คืนยอดปัจจุบัน (เดิมทำให้ qty กลายเป็น null)
create or replace function ck_add_qty(p_kind text, p_id text, p_delta numeric)
returns numeric language plpgsql security definer set search_path = public as $fn$
declare v numeric;
begin
  if p_kind is null or p_kind not in ('item','recipe') then
    raise exception 'ck_add_qty: p_kind must be item or recipe (got %)', coalesce(p_kind, 'null');
  end if;
  if p_delta is null then
    if p_kind = 'item' then select qty into v from ck_items where id = p_id; else select qty into v from ck_recipes where id = p_id; end if;
    return v;
  end if;
  if p_kind = 'item' then
    update ck_items set qty = round(coalesce(qty,0) + p_delta, 4) where id = p_id returning qty into v;
  else
    update ck_recipes set qty = round(coalesce(qty,0) + p_delta, 4) where id = p_id returning qty into v;
  end if;
  return v;
end $fn$;
revoke execute on function ck_add_qty(text,text,numeric) from public;
grant execute on function ck_add_qty(text,text,numeric) to anon, authenticated;

-- ---------- 4) สิทธิ์: anon อ่าน-เขียนได้ (แอพตรวจสิทธิ์รายคนเอง) ----------
do $$ declare tb text; begin
  foreach tb in array array['ck_items','ck_sups','ck_recipes','ck_recipe_items','ck_settings',
    'kc_receipts','kc_receipt_lines','kc_productions','kc_production_lines','kc_moves','kc_counts','kc_count_lines',
    'kc_deliveries','kc_delivery_lines','kc_links','kc_pos','kc_po_lines','kc_expenses'] loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=tb) then
      execute format('alter table %I enable row level security', tb);
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=tb and policyname='ck_all') then
        execute format('create policy ck_all on %I for all to anon, authenticated using (true) with check (true)', tb);
      end if;
      execute format('grant select, insert, update, delete on %I to anon, authenticated', tb);
    end if;
  end loop;
end $$;
grant usage, select on all sequences in schema public to anon, authenticated;
-- ตารางของระบบอื่นที่อ่านอย่างเดียว (มีสิทธิ์อยู่แล้วตามแอพเดิม — ใส่ซ้ำกันพลาด · ไม่มีตาราง = ข้าม)
do $$ declare tb text; begin
  foreach tb in array array['pnl_users','pnl_branches','line_groups','products','stock_receipts','branches','suppliers'] loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=tb) then
      execute format('grant select on %I to anon, authenticated', tb);
    end if;
  end loop;
end $$;
-- รูปภาพ (bucket เดิมที่แอพนับสต๊อก/ครัวกลางใช้อยู่) — มีอยู่แล้วจาก jjmk_kitchen_central.sql · ไม่แตะ

-- ===== JJ-GRANTS: สิทธิ์ Data API ของตารางในไฟล์นี้ (2026-10-21) =====
-- ตั้งแต่ 2026-10-30 Supabase ไม่เปิดสิทธิ์ให้ตารางใหม่เองแล้ว — ไม่มีบล็อกนี้ แอป (คีย์สาธารณะ) จะเจอ permission denied
-- สิทธิ์เท่ากับที่แอปใช้อยู่จริงก่อนหน้านี้ · ตาราง/วิวที่ไม่มีจะข้าม · รันซ้ำได้ · RLS ยังคุมแถวเหมือนเดิม
do $jjg$
declare t text; s text; tb text[] := array['kc_receipts','kc_receipt_lines','kc_productions','kc_production_lines','kc_moves','kc_counts','kc_count_lines','kc_deliveries','kc_delivery_lines','kc_links','kc_pos','kc_po_lines','kc_expenses']::text[]; tr text[] := array[]::text[]; vw text[] := array[]::text[];
begin
  foreach t in array tb || tr loop
    if to_regclass('public.'||quote_ident(t)) is null then continue; end if;
    execute format('grant select, insert, update%s on table public.%I to anon, authenticated',
                   case when t = any(tr) then '' else ', delete' end, t);
    execute format('grant all on table public.%I to service_role', t);
    for s in select c.relname from pg_class c join pg_depend d on d.objid = c.oid and d.deptype in ('a','i')
             where c.relkind = 'S' and d.refobjid = ('public.'||quote_ident(t))::regclass loop
      execute format('grant usage, select on sequence public.%I to anon, authenticated, service_role', s);
    end loop;
  end loop;
  foreach t in array vw loop
    if to_regclass('public.'||quote_ident(t)) is null then continue; end if;
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $jjg$;
