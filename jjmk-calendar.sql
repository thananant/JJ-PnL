-- ============================================================
-- jjmk-calendar.sql — ระบบปฏิทินองค์กร (JJ Calendar · แอพ jjmk-calendar.html บน main)
-- รันครั้งเดียวใน Supabase → SQL Editor (รันซ้ำได้ ไม่ทับข้อมูลเดิม)
-- ตาราง prefix cal_ · ล็อกอินใช้ pnl_users ร่วมกับระบบ P&L (ไม่แตะตารางระบบอื่น)
-- คู่กับ Edge Function "cal-feed" (ฟีด ICS ให้ subscribe ลงมือถือ — deploy ผ่าน Dashboard)
-- ============================================================

create extension if not exists pgcrypto;

-- นัดหมายภายในองค์กร
create table if not exists public.cal_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  branch text not null default 'ALL',        -- ALL / JJLP / JJRD / JJCK / OFFICE
  location text,
  all_day boolean not null default false,
  start_at timestamptz not null,             -- นัดแบบทั้งวัน: 00:00 เวลาไทยของวันแรก
  end_at   timestamptz not null,             -- นัดแบบทั้งวัน: 00:00 เวลาไทยของวันสุดท้าย (นับรวมวันนั้น)
  reminder_min integer not null default 60,  -- แจ้งเตือนล่วงหน้ากี่นาที · 0 = ไม่เตือน
  created_by   text not null,                -- username จาก pnl_users
  created_name text,
  updated_by   text,
  cancelled boolean not null default false,  -- ยกเลิกนัด = ซ่อนจากแอป+ฟีดมือถือ (soft delete)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cal_events_start on public.cal_events(start_at);

-- ผู้เข้าร่วมของแต่ละนัด (ใครต้องเข้าบ้าง)
create table if not exists public.cal_attendees (
  event_id uuid not null references public.cal_events(id) on delete cascade,
  username text not null,
  display_name text,
  primary key (event_id, username)
);
create index if not exists cal_attendees_u on public.cal_attendees(username);

-- ตั้งค่า: token ของฟีด ICS (กันคนนอกเปิดฟีดโดยไม่รู้ URL)
create table if not exists public.cal_settings (
  id text primary key,
  val jsonb not null default '{}'::jsonb
);
insert into public.cal_settings(id, val)
values ('feed', jsonb_build_object('token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')))
on conflict (id) do nothing;

-- updated_at อัพเดตอัตโนมัติ (DTSTAMP ของฟีดใช้ค่านี้)
create or replace function public.cal_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists cal_events_touch on public.cal_events;
create trigger cal_events_touch before update on public.cal_events
  for each row execute function public.cal_touch();

-- สิทธิ์: แบบเดียวกับตาราง kpi_* (แอพใช้ publishable key + ล็อกอินเองผ่าน pnl_users)
alter table public.cal_events    enable row level security;
alter table public.cal_attendees enable row level security;
alter table public.cal_settings  enable row level security;

drop policy if exists cal_events_all on public.cal_events;
create policy cal_events_all on public.cal_events for all using (true) with check (true);

drop policy if exists cal_attendees_all on public.cal_attendees;
create policy cal_attendees_all on public.cal_attendees for all using (true) with check (true);

-- cal_settings ให้อ่านได้อย่างเดียว (แก้ token ได้เฉพาะ service role/SQL Editor)
drop policy if exists cal_settings_read on public.cal_settings;
create policy cal_settings_read on public.cal_settings for select using (true);

grant select, insert, update, delete on public.cal_events, public.cal_attendees to anon, authenticated;
grant select on public.cal_settings to anon, authenticated;

-- เสร็จแล้วโชว์ token ของฟีด (ใช้ต่อท้าย URL ของ Edge Function cal-feed)
select 'ติดตั้ง JJ Calendar เรียบร้อย ✅ · token ฟีด: ' ||
  (select val->>'token' from public.cal_settings where id = 'feed') as result;
