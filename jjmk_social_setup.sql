-- ============================================================
-- JJ Social — ระบบฟังเสียงลูกค้า (Social Listening + Chatbot)
-- จริงใจหมูกระทะ
-- รันครั้งเดียวใน Supabase → SQL Editor
-- (ไฟล์นี้เก็บที่ branch งาน — ไม่รวมเข้า main ตามกติกา README)
-- ============================================================

-- ---------- 1) เสียงลูกค้าทุกช่องทาง (รีวิว/คอมเมนต์/แชท/แท็ก) ----------
create table if not exists social_mentions (
  id           bigint generated always as identity primary key,
  channel      text not null,                       -- line | facebook | instagram | google | tiktok | wongnai | grab | lineman | other
  kind         text not null default 'review',      -- review | comment | message | mention
  external_id  text,                                -- id จากแพลตฟอร์ม (กันซ้ำ)
  thread_id    text,                                -- แชท: userId/conversationId
  branch       text,                                -- JJRD | JJLP | null = ไม่ทราบ
  author_name  text,
  author_id    text,
  text         text not null default '',
  rating       numeric,                             -- 1-5 ถ้าแพลตฟอร์มมีดาว
  url          text,                                -- ลิงก์ไปโพสต์/รีวิวต้นทาง
  posted_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  raw          jsonb,
  -- ผลวิเคราะห์ AI
  sentiment    text,                                -- pos | neu | neg
  ai_score     numeric,                             -- 0-100 ความพึงพอใจ
  topics       jsonb,                               -- ["รสชาติอาหาร","บริการ",...]
  issues       jsonb,                               -- [{topic,detail,severity}]
  praises      jsonb,                               -- [{topic,detail}]
  staff        jsonb,                               -- [{name,sentiment,detail}]
  visit_slot   text,                                -- lunch | afternoon | dinner | late | unknown
  ai_summary   text,                                -- สรุปสั้น 1 บรรทัด
  ai_reply     text,                                -- ร่างคำตอบจาก AI
  analyzed_at  timestamptz,
  -- สถานะการตอบกลับ
  reply_status text not null default 'pending',     -- pending | draft | sent | auto_sent | skipped
  reply_text   text,
  replied_by   text,
  replied_at   timestamptz,
  unique(channel, external_id)
);
create index if not exists social_mentions_posted_idx   on social_mentions(posted_at desc);
create index if not exists social_mentions_branch_idx   on social_mentions(branch, posted_at desc);
create index if not exists social_mentions_pending_idx  on social_mentions(reply_status) where reply_status='pending';
create index if not exists social_mentions_analyze_idx  on social_mentions(id) where analyzed_at is null;

-- ---------- 2) บทสนทนาแชทบอท (ประวัติคุยรายลูกค้า) ----------
create table if not exists social_chat_log (
  id         bigint generated always as identity primary key,
  channel    text not null,                         -- line | facebook | instagram
  thread_id  text not null,                         -- userId ของลูกค้า
  direction  text not null,                         -- in | out
  author     text,                                  -- ชื่อลูกค้า / 'bot' / username คนตอบ
  text       text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists social_chat_thread_idx on social_chat_log(channel, thread_id, created_at desc);

-- ---------- 3) ตั้งค่าระบบ (ไม่เก็บ secret — token เก็บใน Edge Function Secrets) ----------
create table if not exists social_settings (
  id         text primary key,                      -- 'bot' | 'shop' | 'channels'
  val        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 4) รายชื่อพนักงาน (ช่วย AI จับชื่อ + สรุปใครทำดี/กะไหนดี) ----------
create table if not exists social_staff (
  id      bigint generated always as identity primary key,
  name    text not null,
  aliases text[] not null default '{}',             -- ชื่อเล่น/สะกดอื่น
  branch  text,                                     -- JJRD | JJLP | null = ทุกสาขา
  shift   text,                                     -- am | pm | all
  active  boolean not null default true
);

-- ---------- 5) สรุป AI รายวัน/รายสัปดาห์ ----------
create table if not exists social_daily (
  d          date not null,
  branch     text not null default 'ALL',
  kind       text not null default 'daily',         -- daily | weekly
  data       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (d, branch, kind)
);

-- ---------- RLS (แนวเดียวกับระบบเดิม: anon key + แอปคุมสิทธิ์รายเมนู) ----------
alter table social_mentions enable row level security;
alter table social_chat_log enable row level security;
alter table social_settings enable row level security;
alter table social_staff    enable row level security;
alter table social_daily    enable row level security;

do $$ declare t text;
begin
  foreach t in array array['social_mentions','social_chat_log','social_settings','social_staff','social_daily'] loop
    execute format('drop policy if exists %I on %I','social_all_'||t,t);
    execute format('create policy %I on %I for all using (true) with check (true)','social_all_'||t,t);
  end loop;
end $$;

-- ---------- Realtime (ฟีดอัพเดทตลอดเวลา) ----------
do $$ begin
  begin
    alter publication supabase_realtime add table social_mentions;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table social_chat_log;
  exception when duplicate_object then null; end;
end $$;

-- ---------- ค่าเริ่มต้น ----------
insert into social_settings(id,val) values
  ('bot', jsonb_build_object(
     'mode', jsonb_build_object('line','draft','facebook','draft','instagram','off'),
     'persona','คุณคือแอดมินร้าน "จริงใจหมูกระทะ" พูดจาสุภาพ เป็นกันเอง ลงท้ายครับ/ค่ะตามเหมาะสม ตอบสั้นกระชับ',
     'escalate_keywords', jsonb_build_array('ท้องเสีย','อาหารเป็นพิษ','เรียกร้อง','ฟ้อง','เคลม','คืนเงิน','ผู้จัดการ'),
     'fallback_text','ขอบคุณที่ทักมานะครับ 🙏 เดี๋ยวแอดมินรีบมาตอบโดยเร็วที่สุดครับ'
  )),
  ('shop', jsonb_build_object(
     'name','จริงใจหมูกระทะ',
     'info','ร้านหมูกระทะบุฟเฟ่ต์ มี 2 สาขา: รัชดา (JJRD) และ ลาดพร้าว (JJLP)',
     'hours','เปิดทุกวัน 16:00–24:00',
     'faq', jsonb_build_array()
  )),
  ('channels', jsonb_build_object(
     'google_places', jsonb_build_array(),          -- [{place_id,branch}]
     'line_branch','ALL',                           -- OA เดียวใช้ร่วม หรือระบุสาขา
     'facebook_branch','ALL'
  ))
on conflict (id) do nothing;

-- ============================================================
-- (ทางเลือก) pg_cron — งานอัตโนมัติฝั่งเซิร์ฟเวอร์
-- แก้ <PROJECT_REF> และ <SERVICE_ROLE_KEY> ก่อนรัน แล้วเอาคอมเมนต์ออก
-- ============================================================
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- -- ดึงรีวิว Google + วิเคราะห์รายการที่ค้าง ทุก 15 นาที
-- select cron.schedule('social-poll','*/15 * * * *', $cron$
--   select net.http_post(
--     url:='https://<PROJECT_REF>.supabase.co/functions/v1/social-brain',
--     headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body:='{"action":"cron"}'::jsonb);
-- $cron$);
--
-- -- สรุปรายวันด้วย AI ทุก 06:10 (เวลาไทย = 23:10 UTC ของวันก่อน)
-- select cron.schedule('social-daily-summary','10 23 * * *', $cron$
--   select net.http_post(
--     url:='https://<PROJECT_REF>.supabase.co/functions/v1/social-brain',
--     headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body:='{"action":"summary"}'::jsonb);
-- $cron$);
