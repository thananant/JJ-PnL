-- ============================================================
-- ครัวกลาง: แก้ "new row violates row-level security policy for table ck_moves"
-- + เพิ่มช่องเก็บ "หน่วยรับเข้า" ของแต่ละวัตถุดิบ (ck_items.packs)
--
-- สาเหตุ: ครัวกลางย้ายมาใช้บัญชีกลาง (pnl_users ผ่าน anon key) แล้ว แต่สิทธิ์ของตาราง ck_*
--         ในฐานข้อมูลยังเป็นแบบเดิม (ต้องล็อกอิน Supabase Auth) → บันทึกอะไรไม่ได้เลย
-- แก้: เปิดสิทธิ์ทุกตาราง ck_* ให้แอพ (แบบเดียวกับแอพอื่นในเครือ) — สิทธิ์รายคนยังตรวจที่ตัวแอพ (JJ Access)
-- รันครั้งเดียว · รันซ้ำได้ · ไม่ลบข้อมูลใดๆ
-- ============================================================

-- 1) ช่องใหม่: หน่วยรับเข้าของวัตถุดิบ เช่น [{"u":"ถุง","q":1000}] = 1 ถุง = 1000 หน่วยหลัก
alter table if exists ck_items add column if not exists packs jsonb;

-- 2) ทุกตาราง ck_* : ให้แอพอ่าน-เขียนได้ (แทนนโยบายเดิมที่ผูกกับ Supabase Auth)
do $$ declare tb text; begin
  for tb in select table_name from information_schema.tables
            where table_schema='public' and table_type='BASE TABLE' and table_name like 'ck\_%' loop
    execute format('alter table %I enable row level security', tb);
    execute format('drop policy if exists ck_auth_all on %I', tb);
    execute format('drop policy if exists ck_anon_read on %I', tb);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tb and policyname='ck_all') then
      execute format('create policy ck_all on %I for all to anon, authenticated using (true) with check (true)', tb);
    end if;
    execute format('grant select, insert, update, delete on %I to anon, authenticated', tb);
  end loop;
end $$;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 3) ฟังก์ชันบวก/ลบสต๊อก — ให้แอพเรียกได้
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='ck_add_qty') then
    execute 'revoke execute on function ck_add_qty(text,text,numeric) from public';
    execute 'grant execute on function ck_add_qty(text,text,numeric) to anon, authenticated';
  end if;
end $$;

-- 4) รูปวัตถุดิบ/เมนู (bucket product-images ใช้ร่วมกับแอพนับสต๊อก)
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
end $$;

-- 5) แอพต้องอ่านบัญชีกลางได้
grant select on pnl_users to anon, authenticated;
grant select on pnl_branches to anon, authenticated;

-- ตรวจผล: ทุกตาราง ck_* ต้องขึ้น ck_all
select tablename as "ตาราง", string_agg(policyname, ', ') as "สิทธิ์"
from pg_policies where schemaname='public' and tablename like 'ck\_%'
group by tablename order by tablename;
