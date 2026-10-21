-- jjmk-signup.sql — ระบบ "สมัครเป็นพนักงาน" ที่หน้าศูนย์รวมแอพ + ให้ admin อนุมัติ
-- รันครั้งเดียวใน Supabase -> SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
--
-- ทางเดินของเรื่อง
--   พนักงานใหม่กรอกใบสมัครที่หน้าแรก  ->  สร้างบัญชีสถานะ 'pending' (ล็อกอินได้ แต่เห็นแค่หน้ารออนุมัติ)
--   admin เปิด JJ Access แท็บ "รออนุมัติ" -> ตั้งระดับ/ประจำที่/ติ๊กแอพ -> กดอนุมัติ -> สถานะเป็น 'active'

-- 1) สถานะบัญชี + ร่องรอยการอนุมัติ ------------------------------------------
alter table pnl_users add column if not exists status         text not null default 'active';
alter table pnl_users add column if not exists created_at     timestamptz default now();
alter table pnl_users add column if not exists approved_by    text;
alter table pnl_users add column if not exists approved_at    timestamptz;
alter table pnl_users add column if not exists reject_reason  text;

update pnl_users set status='active' where status is null or status='';

alter table pnl_users drop constraint if exists pnl_users_status_chk;
alter table pnl_users add constraint pnl_users_status_chk
  check (status in ('active','pending','rejected'));

create index if not exists pnl_users_status_idx on pnl_users(status);

-- ชื่อผู้ใช้ต้องไม่ซ้ำ (กันคนสมัครชนกับบัญชีเดิม)
create unique index if not exists pnl_users_username_uidx on pnl_users(lower(username));

-- 2) ข้อมูลส่วนตัวของพนักงาน (แยกจากตารางบัญชี) -------------------------------
create table if not exists pnl_profiles (
  username          text primary key,
  first_name        text not null,
  last_name         text not null,
  nickname          text,
  birth_date        date,
  gender            text,          -- ชาย / หญิง / อื่น ๆ
  phone             text,
  addr_reg          text,          -- ที่อยู่ตามทะเบียนบ้าน
  addr_reg_province text,
  addr_reg_zip      text,
  addr_now          text,          -- ที่อยู่ปัจจุบัน
  addr_now_province text,
  addr_now_zip      text,
  addr_same         boolean default true,   -- ที่อยู่ปัจจุบันเหมือนทะเบียนบ้าน
  want_unit         text,          -- สาขาที่อยากทำงาน (ตอนสมัคร)
  note              text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- อายุคิดจากวันเกิดเสมอ (ไม่เก็บตัวเลขอายุไว้ จะได้ไม่มีวันขัดกัน)
create or replace view pnl_profiles_v as
  select p.*,
         case when p.birth_date is null then null
              else date_part('year', age(current_date, p.birth_date))::int end as age
  from pnl_profiles p;

-- 3) สิทธิ์ตาราง (แบบเดียวกับ pnl_* เดิม: แอพเข้าผ่าน anon key) ----------------
do $$ declare tb text; begin
  foreach tb in array array['pnl_profiles'] loop
    execute format('alter table %I enable row level security', tb);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tb and policyname=tb||'_all') then
      execute format('create policy %I on %I for all to anon, authenticated using (true) with check (true)', tb||'_all', tb);
    end if;
    execute format('grant select, insert, update, delete on %I to anon, authenticated', tb);
  end loop;
end $$;
grant select on pnl_profiles_v to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 4) นับใบสมัครที่ยังรออนุมัติ (ไว้โชว์ตัวเลขบนไอคอน JJ Access) ----------------
create or replace function pnl_pending_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from pnl_users where status = 'pending';
$$;
grant execute on function pnl_pending_count() to anon, authenticated;

-- 5) ค่าตั้งของระบบกลาง (ตั้งจากในแอพได้ ไม่ต้องเข้า Supabase) ------------------
--    ใช้เก็บ line_group_id = กลุ่ม LINE ที่จะให้แจ้งเตือนตอนมีคนสมัครใหม่
--    ⚠️ ตารางนี้ anon อ่านได้ **ห้ามเอาค่าลับ (token/รหัสผ่าน) มาเก็บที่นี่**
create table if not exists pnl_settings (
  id         text primary key,
  val        text,
  updated_at timestamptz default now(),
  updated_by text
);

do $$ begin
  execute 'alter table pnl_settings enable row level security';
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pnl_settings' and policyname='pnl_settings_all') then
    execute 'create policy pnl_settings_all on pnl_settings for all to anon, authenticated using (true) with check (true)';
  end if;
  execute 'grant select, insert, update, delete on pnl_settings to anon, authenticated';
end $$;

-- เสร็จแล้ว: เปิด https://thananant.github.io/JJ-PnL/ แล้วกดปุ่ม "🙋 สมัครพนักงานใหม่" ใต้ปุ่มเข้าสู่ระบบ
-- ใบสมัครจะไปโผล่ที่ JJ Access -> แท็บ "รออนุมัติ"

-- ===== JJ-GRANTS: สิทธิ์ Data API ของตารางในไฟล์นี้ (2026-10-21) =====
-- ตั้งแต่ 2026-10-30 Supabase ไม่เปิดสิทธิ์ให้ตารางใหม่เองแล้ว — ไม่มีบล็อกนี้ แอป (คีย์สาธารณะ) จะเจอ permission denied
-- สิทธิ์เท่ากับที่แอปใช้อยู่จริงก่อนหน้านี้ · ตาราง/วิวที่ไม่มีจะข้าม · รันซ้ำได้ · RLS ยังคุมแถวเหมือนเดิม
do $jjg$
declare t text; s text; tb text[] := array['pnl_profiles']::text[]; tr text[] := array[]::text[]; vw text[] := array[]::text[];
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
