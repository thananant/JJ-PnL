-- jjmk_kitchen_setup.sql — ติดตั้งระบบครัวกลาง JJ Kitchen (รันครั้งเดียวใน Supabase SQL Editor)
-- ตาราง ck_* ทั้งหมด + RLS (ล็อกอินแล้วทำได้ทุกอย่าง / anon อ่านได้อย่างเดียว เพื่อให้แอพ P&L ดึงข้อมูลได้)
create table if not exists ck_items (
  id text primary key, name text not null, i18n jsonb, cat text default 'อื่นๆ',
  unit text default 'กก.', buy_unit text, buy_qty numeric default 1, price numeric,
  sup text default '', lead_days integer default 1, min_qty numeric, qty numeric default 0,
  image_url text, sort integer default 0, active boolean default true,
  deleted_at timestamptz, created_at timestamptz default now());
create table if not exists ck_sups (
  id text primary key, name text not null, phone text, lead_days integer default 1,
  note text, sort integer default 0, active boolean default true);
create table if not exists ck_recipes (
  id text primary key, name text not null, i18n jsonb, cat text default 'อื่นๆ',
  yield_qty numeric default 1, yield_unit text default 'กก.', extra_cost numeric default 0,
  qty numeric default 0, unit_cost numeric, stock_name text, image_url text, note text,
  sort integer default 0, active boolean default true, deleted_at timestamptz, created_at timestamptz default now());
create table if not exists ck_recipe_items (
  id bigserial primary key, recipe_id text not null, item_id text not null,
  qty numeric not null default 0, sort integer default 0);
create index if not exists ck_recipe_items_r on ck_recipe_items(recipe_id);
create table if not exists ck_plans (
  id text primary key, d date not null, recipe_id text not null, qty numeric not null,
  status text default 'plan', note text, by_name text, created_at timestamptz default now());
create index if not exists ck_plans_d on ck_plans(d);
create table if not exists ck_pos (
  id text primary key, po_no text, sup text default '', d_order date, d_due date, order_by date,
  status text default 'draft', total numeric, note text, by_name text, created_at timestamptz default now());
alter table ck_pos add column if not exists order_by date;
create table if not exists ck_po_items (
  id bigserial primary key, po_id text not null, item_id text, name text, unit text,
  qty numeric default 0, price numeric, received_qty numeric, sort integer default 0);
create index if not exists ck_po_items_po on ck_po_items(po_id);
create table if not exists ck_productions (
  id text primary key, d date not null, recipe_id text, name text, qty numeric not null,
  cost_mat numeric, cost_extra numeric, cost_total numeric, cost_unit numeric,
  note text, by_name text, plan_id text, created_at timestamptz default now());
create index if not exists ck_productions_d on ck_productions(d);
create table if not exists ck_prod_items (
  id bigserial primary key, prod_id text not null, item_id text, name text, unit text,
  qty numeric default 0, cost numeric default 0);
create index if not exists ck_prod_items_p on ck_prod_items(prod_id);
create table if not exists ck_orders (
  id text primary key, branch text default '', branch_name text default '', d date not null,
  status text default 'new', total numeric, note text, by_name text, created_at timestamptz default now());
create index if not exists ck_orders_d on ck_orders(d);
create table if not exists ck_order_items (
  id bigserial primary key, order_id text not null, recipe_id text, name text, unit text,
  qty numeric default 0, cost_unit numeric, amount numeric, sort integer default 0);
create index if not exists ck_order_items_o on ck_order_items(order_id);
create table if not exists ck_moves (
  id bigserial primary key, d date not null, kind text not null,
  item_kind text not null default 'item', ref_id text not null, name text,
  qty numeric not null, cost numeric, ref text, note text, branch text,
  by_name text, created_at timestamptz default now());
create index if not exists ck_moves_d on ck_moves(d);
create index if not exists ck_moves_ref on ck_moves(ref_id);
create table if not exists ck_price_log (
  id bigserial primary key, item_id text not null, d date not null, price numeric,
  buy_unit text, source text default 'po', created_at timestamptz default now());
create index if not exists ck_price_log_i on ck_price_log(item_id);
create table if not exists ck_settings (key text primary key, value jsonb);

-- ฟังก์ชันบวก/ลบยอดสต๊อกแบบ atomic (กันหลายเครื่องกดพร้อมกันแล้วยอดเพี้ยน)
create or replace function ck_add_qty(p_kind text, p_id text, p_delta numeric)
returns numeric language plpgsql security definer set search_path = public as $fn$
declare v numeric;
begin
  if p_kind = 'item' then
    update ck_items set qty = round(coalesce(qty,0) + p_delta, 2) where id = p_id returning qty into v;
  else
    update ck_recipes set qty = round(coalesce(qty,0) + p_delta, 2) where id = p_id returning qty into v;
  end if;
  return v;
end $fn$;
revoke execute on function ck_add_qty(text,text,numeric) from public, anon;
grant execute on function ck_add_qty(text,text,numeric) to authenticated;

-- สิทธิ์: ผู้ใช้ที่ล็อกอินและถูกอนุมัติ (app_users.status=active) ทำได้ทุกอย่าง / anon อ่านอย่างเดียว
do $$ declare tb text; begin
  foreach tb in array array['ck_items','ck_sups','ck_recipes','ck_recipe_items','ck_plans','ck_pos','ck_po_items','ck_productions','ck_prod_items','ck_orders','ck_order_items','ck_moves','ck_price_log','ck_settings'] loop
    execute format('alter table %I enable row level security', tb);
    if not exists (select 1 from pg_policies where tablename=tb and policyname='ck_auth_all') then
      execute format('create policy ck_auth_all on %I for all to authenticated using (true) with check (exists (select 1 from app_users au where au.auth_uid = auth.uid() and au.status = ''active''))', tb);
    end if;
    if not exists (select 1 from pg_policies where tablename=tb and policyname='ck_anon_read') then
      execute format('create policy ck_anon_read on %I for select to anon using (true)', tb);
    end if;
    execute format('grant select on %I to anon', tb);
    execute format('grant select, insert, update, delete on %I to authenticated', tb);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- รูปภาพ: ใช้ bucket product-images เดิมของแอพนับสต๊อก (มีอยู่แล้ว) — ถ้ายังไม่มีให้สร้าง
insert into storage.buckets (id, name, public) values ('product-images','product-images',true)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_up') then
    create policy ck_img_up on storage.objects for insert to authenticated
      with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_read') then
    create policy ck_img_read on storage.objects for select to anon, authenticated
      using (bucket_id = 'product-images');
  end if;
end $$;
