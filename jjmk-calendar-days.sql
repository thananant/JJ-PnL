-- jjmk-calendar-days.sql — วันพิเศษกลางของทุกระบบ (ลงที่ JJ Calendar แท็บ 🎌 วันพิเศษ)
-- รันครั้งเดียวใน Supabase -> SQL Editor (รันซ้ำได้ · ไม่แตะตารางเดิมของระบบไหนเลย)
--
-- ลงวันพิเศษที่ปฏิทินที่เดียว แล้วระบบอื่นเอาไปใช้ — แยกเป็น 3 ปฏิทิน (เจ้าของสั่ง 2026-09-30) · 1 แถว = 1 ปฏิทิน (ช่อง kind)
--   🏢 office : ปฏิทินที่ออฟฟิศหยุด — พนักงานสาขา OFFICE ได้หยุด นับเป็นวันทำงาน · หน้าร้านทำงานปกติ
--   💰 pay    : ปฏิทินที่พนักงานได้ค่าแรง ×2 — หน้าร้านได้ ×2 + วันนั้นห้ามหยุด · ออฟฟิศทำงานปกติ
--   📦 order  : ปฏิทินที่สั่งของเท่าวันเสาร์–อาทิตย์ — แอพนับสต๊อก + ครัวกลาง คิดยอดใช้วันนั้นแบบ ส–อา (เลือกสาขาได้)
--   วันเดียวกันอยู่ได้หลายปฏิทิน (เช่น สงกรานต์ อยู่ทั้ง 3) · 🏢/💰 มีผลกับเงินเดือนก็ต่อเมื่อกด ✅ ยืนยัน ในหน้า 🎌 ของระบบเงินเดือน
--   ระบบเงินเดือนคิดเงินจากตาราง holidays — ไฟล์นี้เพิ่มช่อง scope/cal_id ให้ และยอมให้วันเดียวกันมีทั้งแถวออฟฟิศและแถวหน้าร้าน
--   (แถวเดิมทุกแถวยังอยู่ครบ คิดเงินเท่าเดิมทุกบาท)

create table if not exists public.cal_special_days (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  kind             text,                       -- ปฏิทินไหน: office ออฟฟิศหยุด · pay ค่าแรง ×2 · order สั่งของแบบ ส–อา (null = ป้ายเดิม)
  day_from         date not null,              -- วันแรก (วันของร้าน)
  day_to           date not null,              -- วันสุดท้าย (นับรวม)
  pay_multiplier   numeric(3,1),               -- null = ไม่เกี่ยวเงินเดือน · 2 = ×2 (ความหมายเดียวกับ holidays.multiplier)
  pay_scope        text not null default 'all', -- ใช้กับใคร: all ทั้งคู่ · store หน้าร้าน · office ออฟฟิศ (= holidays.scope)
  pay_status       text not null default 'none', -- none / pending (รอยืนยันในเงินเดือน) / confirmed / declined
  pay_snapshot     jsonb,                      -- วันที่เงินเดือนยืนยันล่าสุด {"days":[...],"mult":2,"name":"..."}
  pay_decided_by   text,
  pay_decided_at   timestamptz,
  order_rate_group smallint,                   -- null = ไม่มีผลกับสั่งของ · 2 = คิดยอดใช้แบบ เสาร์–อาทิตย์
  order_branches   text[],                     -- สาขาที่ขายดี · null = ทุกสาขา
  order_multiplier numeric(4,2),               -- สำรองไว้ (ยังไม่ใช้)
  closed           boolean not null default false, -- สำรองไว้ (ร้านปิด — ยังไม่ใช้)
  note             text,
  created_by       text not null,
  created_name     text,
  updated_by       text,
  cancelled        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- เคยรันไฟล์รุ่นก่อน (ยังไม่มีช่องนี้) = เพิ่มให้ · แถวเดิมเป็น all = ใช้กับทุกคนเหมือนเดิม
alter table public.cal_special_days add column if not exists pay_scope text not null default 'all';
alter table public.cal_special_days add column if not exists kind text;

-- ย้ายแถวรุ่นก่อน (ที่ 1 แถวมีหลายผล) เข้า 3 ปฏิทิน — ไม่มีอะไรหาย · รันซ้ำได้ (ทำเฉพาะแถวที่ยังไม่มี kind)
alter table public.cal_special_days drop constraint if exists cal_sd_pay_once;
--   1) แถวที่ทั้งจ่ายค่าแรงและขายดี → แยกส่วนขายดีเป็นแถวปฏิทิน 📦
insert into public.cal_special_days (name, kind, day_from, day_to, pay_scope, pay_status, order_rate_group, order_branches,
                                     order_multiplier, closed, note, created_by, created_name, updated_by, cancelled)
  select name, 'order', day_from, day_to, 'all', 'none', order_rate_group, order_branches,
         order_multiplier, closed, note, created_by, created_name, updated_by, cancelled
  from public.cal_special_days where kind is null and pay_multiplier is not null and order_rate_group is not null;
update public.cal_special_days set order_rate_group = null, order_branches = null
  where kind is null and pay_multiplier is not null and order_rate_group is not null;
--   2) วันจ่ายค่าแรงแบบ "ทั้งคู่" → แยกส่วนออฟฟิศหยุดเป็นแถวปฏิทิน 🏢 (สถานะเงินเดือนตามแถวเดิม)
insert into public.cal_special_days (name, kind, day_from, day_to, pay_scope, pay_status, pay_snapshot, pay_decided_by, pay_decided_at,
                                     note, created_by, created_name, updated_by, cancelled)
  select name, 'office', day_from, day_to, 'office', pay_status, pay_snapshot, pay_decided_by, pay_decided_at,
         note, created_by, created_name, updated_by, cancelled
  from public.cal_special_days where kind is null and pay_multiplier is not null and pay_scope = 'all';
--   3) ใส่ชื่อปฏิทินให้แถวเดิม
update public.cal_special_days set kind = 'office', pay_multiplier = null
  where kind is null and pay_multiplier is not null and pay_scope = 'office';
update public.cal_special_days set kind = 'pay', pay_scope = 'store' where kind is null and pay_multiplier is not null;
update public.cal_special_days set kind = 'order' where kind is null and order_rate_group is not null;
--   แถวที่ไม่มีผลอะไรเลย (ป้ายเดิม) คงไว้ kind = null — แอพให้เลือกย้ายเข้าปฏิทินเองได้

-- กันข้อมูลเพี้ยน (ตารางนี้ anon เขียนได้เหมือนตาราง cal_* อื่น)
alter table public.cal_special_days drop constraint if exists cal_sd_name;
alter table public.cal_special_days add  constraint cal_sd_name  check (length(btrim(name)) between 1 and 80);
alter table public.cal_special_days drop constraint if exists cal_sd_range;
alter table public.cal_special_days add  constraint cal_sd_range check (day_to >= day_from and day_to <= day_from + 31);
alter table public.cal_special_days drop constraint if exists cal_sd_pay;
alter table public.cal_special_days add  constraint cal_sd_pay   check (pay_multiplier is null or pay_multiplier in (1.5, 2, 3));
alter table public.cal_special_days drop constraint if exists cal_sd_scope;
alter table public.cal_special_days add  constraint cal_sd_scope check (pay_scope in ('all','store','office'));
alter table public.cal_special_days drop constraint if exists cal_sd_kind;
alter table public.cal_special_days add  constraint cal_sd_kind  check (kind is null or kind in ('office','pay','order'));
alter table public.cal_special_days drop constraint if exists cal_sd_kind_pay;
alter table public.cal_special_days add  constraint cal_sd_kind_pay check (kind is distinct from 'pay' or pay_multiplier is not null);
alter table public.cal_special_days drop constraint if exists cal_sd_status;
alter table public.cal_special_days add  constraint cal_sd_status check (pay_status in ('none','pending','confirmed','declined'));
alter table public.cal_special_days drop constraint if exists cal_sd_grp;
alter table public.cal_special_days add  constraint cal_sd_grp   check (order_rate_group is null or order_rate_group in (0,1,2));
alter table public.cal_special_days drop constraint if exists cal_sd_br;
alter table public.cal_special_days add  constraint cal_sd_br    check (order_branches is null or
  (cardinality(order_branches) between 1 and 4 and order_branches <@ array['JJLP','JJRD','JJCK','OFFICE']::text[]));
alter table public.cal_special_days drop constraint if exists cal_sd_om;
alter table public.cal_special_days add  constraint cal_sd_om    check (order_multiplier is null or order_multiplier between 0.5 and 3);
-- ปฏิทินเดียวกันห้ามซ้อนวัน (🏢 กับ 🏢 · 💰 กับ 💰) — คนละปฏิทินซ้อนกันได้ (เช่น สงกรานต์ อยู่ทั้ง 🏢 และ 💰)
alter table public.cal_special_days drop constraint if exists cal_sd_pay_once;
alter table public.cal_special_days add  constraint cal_sd_pay_once
  exclude using gist (daterange(day_from, day_to, '[]') with &&)
  where (kind = 'pay' and not cancelled);
alter table public.cal_special_days drop constraint if exists cal_sd_off_once;
alter table public.cal_special_days add  constraint cal_sd_off_once
  exclude using gist (daterange(day_from, day_to, '[]') with &&)
  where (kind = 'office' and not cancelled);

create index if not exists cal_sd_days on public.cal_special_days (day_from, day_to) where not cancelled;

create or replace function public.cal_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists cal_special_days_touch on public.cal_special_days;
create trigger cal_special_days_touch before update on public.cal_special_days
  for each row execute function public.cal_touch();

-- สิทธิ์: แบบเดียวกับ cal_events (แอพใช้ publishable key + ล็อกอินเองผ่าน pnl_users)
alter table public.cal_special_days enable row level security;
drop policy if exists cal_special_days_all on public.cal_special_days;
create policy cal_special_days_all on public.cal_special_days for all using (true) with check (true);
grant select, insert, update, delete on public.cal_special_days to anon, authenticated;

-- ประวัติการแก้ (จดเองด้วย trigger · แอพอ่านได้อย่างเดียว แก้/ลบไม่ได้)
create table if not exists public.cal_special_days_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  day_id  uuid,
  op      text not null,
  by_user text,
  before  jsonb,
  after   jsonb
);
create or replace function public.cal_sd_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.cal_special_days_log(day_id, op, by_user, before, after)
  values (case when tg_op = 'DELETE' then old.id else new.id end, tg_op,
          case when tg_op = 'DELETE' then old.updated_by else coalesce(new.updated_by, new.created_by) end,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return null;
end $$;
drop trigger if exists cal_special_days_log_t on public.cal_special_days;
create trigger cal_special_days_log_t after insert or update or delete on public.cal_special_days
  for each row execute function public.cal_sd_log();
alter table public.cal_special_days_log enable row level security;
drop policy if exists cal_sd_log_read on public.cal_special_days_log;
create policy cal_sd_log_read on public.cal_special_days_log for select using (true);
revoke insert, update, delete, truncate on public.cal_special_days_log from anon, authenticated;
grant select on public.cal_special_days_log to anon, authenticated;

-- 1 แถวต่อ 1 วัน (ไว้ให้ระบบอื่นอ่านง่าย ๆ)
create or replace view public.cal_special_days_v as
  select g.d::date as day, s.id, s.name, s.pay_multiplier, s.pay_status,
         s.order_rate_group, s.order_branches, s.order_multiplier, s.closed, s.pay_scope, s.kind
  from public.cal_special_days s,
       generate_series(s.day_from::timestamp, s.day_to::timestamp, interval '1 day') g(d)
  where not s.cancelled;
grant select on public.cal_special_days_v to anon, authenticated;

-- 💰 ระบบเงินเดือน (เหมือนไฟล์ jjmk-payroll/jj_holiday_scope.sql — รันซ้ำได้) · แถวเดิมทั้งหมดเป็น all = คิดเงินเหมือนเดิมทุกบาท
--    scope  = ใช้กับใคร: all ทุกคน · store หน้าร้าน (มาจากปฏิทิน 💰) · office ออฟฟิศ (มาจากปฏิทิน 🏢)
--    cal_id = มาจากรายการไหนในปฏิทิน (null = ตั้งเองในหน้า 🎌) — ยืนยันซ้ำ/ยกเลิกในปฏิทินจะแก้เฉพาะแถวของรายการนั้น
--    ไม่ซ้ำ: เดิม 1 วัน 1 แถว → (วัน, scope) · วันเดียวกันมีได้ทั้งแถวออฟฟิศและแถวหน้าร้าน
do $$ declare c record; dayatt smallint; begin
  if to_regclass('public.holidays') is not null then
    alter table public.holidays add column if not exists scope text not null default 'all';
    alter table public.holidays drop constraint if exists holidays_scope;
    alter table public.holidays add constraint holidays_scope check (scope in ('all','store','office'));
    select attnum into dayatt from pg_attribute where attrelid = 'public.holidays'::regclass and attname = 'day';
    if exists (select 1 from pg_constraint where conrelid = 'public.holidays'::regclass and contype = 'p' and conkey = array[dayatt]) then
      raise exception 'ตาราง holidays ใช้ day เป็น primary key — ยังแยกหน้าร้าน/ออฟฟิศในวันเดียวกันไม่ได้ (แจ้งผู้พัฒนา)';
    end if;
    for c in select conname from pg_constraint
             where conrelid = 'public.holidays'::regclass and contype = 'u' and conkey = array[dayatt] loop
      execute format('alter table public.holidays drop constraint %I', c.conname);
    end loop;
    for c in select i.relname from pg_index x join pg_class i on i.oid = x.indexrelid
             where x.indrelid = 'public.holidays'::regclass and x.indisunique and not x.indisprimary
               and x.indkey::text = dayatt::text
               and not exists (select 1 from pg_constraint k where k.conindid = x.indexrelid) loop
      execute format('drop index public.%I', c.relname);
    end loop;
    create unique index if not exists holidays_day_scope on public.holidays (day, scope);
    alter table public.holidays add column if not exists cal_id uuid;   -- เพิ่มท้ายสุด: แอพเห็นช่องนี้ = ขั้นบนเสร็จแล้ว
  end if;
end $$;

-- เรียลไทม์: มีคนลงวันพิเศษ ปฏิทินเครื่องอื่นเห็นทันที
do $$ begin
  begin alter publication supabase_realtime add table public.cal_special_days;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;

select 'ติดตั้งวันพิเศษ (cal_special_days) เรียบร้อย ✅' as result;
