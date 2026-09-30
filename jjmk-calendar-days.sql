-- jjmk-calendar-days.sql — วันพิเศษกลางของทุกระบบ (ลงที่ JJ Calendar แท็บ 🎌 วันพิเศษ)
-- รันครั้งเดียวใน Supabase -> SQL Editor (รันซ้ำได้ · ไม่แตะตารางเดิมของระบบไหนเลย)
--
-- ลงวันพิเศษที่ปฏิทินที่เดียว แล้วระบบอื่นเอาไปใช้ (เจ้าของตัดสินใจ 2026-09-29)
--   💰 เงินเดือน : วันจ่ายค่าแรง ×2 — หน้าร้านได้ ×2 / ออฟฟิศได้หยุด (กฎเดิมของหน้า 🎌 ทุกข้อ)
--                  เลือกได้ว่าใช้กับใคร (เจ้าของสั่ง 2026-09-30 "ออฟฟิศมีวันหยุดพิเศษไม่เหมือนหน้าร้าน"):
--                    all = ทั้งคู่ (แบบเดิม) · store = หน้าร้าน ×2 อย่างเดียว (ออฟฟิศทำงานปกติ)
--                    office = ออฟฟิศหยุดอย่างเดียว (หน้าร้านทำงานปกติ ไม่ได้ ×2 ไม่ใช่วันห้ามหยุด) · ออฟฟิศ = พนักงานสาขา OFFICE
--                  มีผลกับเงินเดือนก็ต่อเมื่อกด ✅ ยืนยัน ในหน้า 🎌 ของระบบเงินเดือนเท่านั้น
--                  (ระบบเงินเดือนคิดเงินจากตาราง holidays — ไฟล์นี้แค่เพิ่มช่อง holidays.scope ให้ ไม่แก้ข้อมูลเดิม)
--   📦 สั่งของ   : วันขายดี = แอพนับสต๊อก + ครัวกลาง คิดยอดใช้วันนั้นแบบ "เสาร์–อาทิตย์" (เลือกสาขาได้)

create table if not exists public.cal_special_days (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
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

-- กันข้อมูลเพี้ยน (ตารางนี้ anon เขียนได้เหมือนตาราง cal_* อื่น)
alter table public.cal_special_days drop constraint if exists cal_sd_name;
alter table public.cal_special_days add  constraint cal_sd_name  check (length(btrim(name)) between 1 and 80);
alter table public.cal_special_days drop constraint if exists cal_sd_range;
alter table public.cal_special_days add  constraint cal_sd_range check (day_to >= day_from and day_to <= day_from + 31);
alter table public.cal_special_days drop constraint if exists cal_sd_pay;
alter table public.cal_special_days add  constraint cal_sd_pay   check (pay_multiplier is null or pay_multiplier in (1.5, 2, 3));
alter table public.cal_special_days drop constraint if exists cal_sd_scope;
alter table public.cal_special_days add  constraint cal_sd_scope check (pay_scope in ('all','store','office'));
alter table public.cal_special_days drop constraint if exists cal_sd_status;
alter table public.cal_special_days add  constraint cal_sd_status check (pay_status in ('none','pending','confirmed','declined'));
alter table public.cal_special_days drop constraint if exists cal_sd_grp;
alter table public.cal_special_days add  constraint cal_sd_grp   check (order_rate_group is null or order_rate_group in (0,1,2));
alter table public.cal_special_days drop constraint if exists cal_sd_br;
alter table public.cal_special_days add  constraint cal_sd_br    check (order_branches is null or
  (cardinality(order_branches) between 1 and 4 and order_branches <@ array['JJLP','JJRD','JJCK','OFFICE']::text[]));
alter table public.cal_special_days drop constraint if exists cal_sd_om;
alter table public.cal_special_days add  constraint cal_sd_om    check (order_multiplier is null or order_multiplier between 0.5 and 3);
-- วันจ่ายค่าแรง 2 รายการห้ามทับวันเดียวกัน (หน้า 🎌 ของเงินเดือนมีได้วันละแถวเดียว)
-- หน้าร้าน+ออฟฟิศหยุดวันเดียวกัน = ใช้รายการเดียว เลือก "ทั้งคู่"
alter table public.cal_special_days drop constraint if exists cal_sd_pay_once;
alter table public.cal_special_days add  constraint cal_sd_pay_once
  exclude using gist (daterange(day_from, day_to, '[]') with &&)
  where (pay_multiplier is not null and not cancelled);

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
         s.order_rate_group, s.order_branches, s.order_multiplier, s.closed, s.pay_scope
  from public.cal_special_days s,
       generate_series(s.day_from::timestamp, s.day_to::timestamp, interval '1 day') g(d)
  where not s.cancelled;
grant select on public.cal_special_days_v to anon, authenticated;

-- 💰 ระบบเงินเดือน: วันหยุดพิเศษเลือกได้ว่าใช้กับใคร (เหมือนไฟล์ jjmk-payroll/jj_holiday_scope.sql — รันซ้ำได้)
--    แถวเดิมทั้งหมดเป็น all = คิดเงินเหมือนเดิมทุกบาท
do $$ begin
  if to_regclass('public.holidays') is not null then
    alter table public.holidays add column if not exists scope text not null default 'all';
    alter table public.holidays drop constraint if exists holidays_scope;
    alter table public.holidays add constraint holidays_scope check (scope in ('all','store','office'));
  end if;
end $$;

-- เรียลไทม์: มีคนลงวันพิเศษ ปฏิทินเครื่องอื่นเห็นทันที
do $$ begin
  begin alter publication supabase_realtime add table public.cal_special_days;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;

select 'ติดตั้งวันพิเศษ (cal_special_days) เรียบร้อย ✅' as result;
