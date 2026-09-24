-- jjmk_kitchen_central.sql — ย้ายระบบครัวกลาง (JJ Kitchen) มาใช้ "บัญชีกลาง" pnl_users
-- รันครั้งเดียวใน Supabase -> SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลใดๆ)
--
-- เดิม: แอพครัวกลางล็อกอินผ่าน Supabase Auth แล้ว RLS เช็คว่า auth.uid() ตรงกับ app_users
-- ใหม่: ล็อกอินด้วยบัญชีกลาง pnl_users เหมือน P&L / ปฏิทิน / ซ่อมบำรุง (ยิงผ่าน anon key)
--       จึงต้องเปิดสิทธิ์เขียนตาราง ck_* ให้ role anon ไม่งั้นบันทึกอะไรไม่ได้เลย
-- สิทธิ์รายคน (ใครเห็น/แก้หน้าไหนได้) ตรวจที่ตัวแอพตามที่ติ๊กใน JJ Access (pnl_users.apps.kitchen)

-- 1) ตาราง ck_* : ให้ anon อ่าน-เขียนได้ (แทนนโยบายเดิมที่ผูกกับ app_users) -------------
do $$ declare tb text; begin
  foreach tb in array array['ck_items','ck_sups','ck_recipes','ck_recipe_items','ck_plans',
                            'ck_pos','ck_po_items','ck_productions','ck_prod_items','ck_orders',
                            'ck_order_items','ck_moves','ck_price_log','ck_settings','ck_expenses'] loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=tb) then
      execute format('alter table %I enable row level security', tb);
      execute format('drop policy if exists ck_auth_all on %I', tb);
      execute format('drop policy if exists ck_anon_read on %I', tb);
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=tb and policyname='ck_all') then
        execute format('create policy ck_all on %I for all to anon, authenticated using (true) with check (true)', tb);
      end if;
      execute format('grant select, insert, update, delete on %I to anon, authenticated', tb);
    end if;
  end loop;
end $$;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 2) ฟังก์ชันบวก/ลบสต๊อกแบบ atomic — เดิมเปิดให้เฉพาะ authenticated -----------------------
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='ck_add_qty') then
    execute 'revoke execute on function ck_add_qty(text,text,numeric) from public';
    execute 'grant execute on function ck_add_qty(text,text,numeric) to anon, authenticated';
  end if;
end $$;

-- 3) รูปภาพวัตถุดิบ/เมนู (bucket product-images ใช้ร่วมกับแอพนับสต๊อก) --------------------
--    เพิ่มนโยบายชื่อใหม่ ไม่แตะของเดิม เพื่อไม่ให้แอพนับสต๊อกสะดุด
insert into storage.buckets (id, name, public) values ('product-images','product-images',true)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_up_anon') then
    create policy ck_img_up_anon on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_read_anon') then
    create policy ck_img_read_anon on storage.objects for select to anon, authenticated
      using (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_upd_anon') then
    create policy ck_img_upd_anon on storage.objects for update to anon, authenticated
      using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ck_img_del_anon') then
    create policy ck_img_del_anon on storage.objects for delete to anon, authenticated
      using (bucket_id = 'product-images');
  end if;
end $$;

-- 4) บัญชีกลางต้องอ่านได้จากแอพ (มีอยู่แล้วสำหรับ P&L — ใส่ซ้ำไว้กันพลาด) ----------------
grant select on pnl_users to anon, authenticated;
grant select on pnl_branches to anon, authenticated;

-- เสร็จแล้ว: เปิด https://thananant.github.io/JJ-PnL/jjmk-kitchen.html แล้วล็อกอินด้วยบัญชีกลาง
-- ถ้ายังเข้าไม่ได้ = ยังไม่ได้ติ๊กสิทธิ์ "ครัวกลาง" ให้บัญชีนั้นที่หน้า JJ Access
