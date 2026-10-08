-- JJ Social: รายการโพสต์/คลิปทั้งหมดของร้าน (Facebook / Instagram / TikTok)
-- ใช้กับปุ่ม "🚀 ดึงทั้งหมด" (ดึงโพสต์ย้อนหลังทั้งหมด + คอมเมนต์ + วิเคราะห์) · หน้าแยกแพลตฟอร์มแบบช่อง ๆ · เมนู 📈 วิเคราะห์โพสต์/คลิป
-- รันใน Supabase → SQL Editor ครั้งเดียว (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
-- ฟังก์ชัน social-brain เป็นคนเขียน (service role) · แอปอ่านอย่างเดียว (คีย์สาธารณะเขียนไม่ได้)

create table if not exists public.social_posts (
  id           bigserial primary key,
  channel      text not null check (channel in ('facebook','instagram','tiktok')),
  pkey         text not null,                 -- คีย์ของลิงก์โพสต์ (ตัด www/m · ไม่มี / ท้าย) ใช้กันซ้ำ
  url          text not null,
  pid          text,                          -- เลขโพสต์ Facebook (ลิงก์มี 2 แบบ pfbid…/เลข)
  src_id       text,                          -- แหล่งในการ์ด ⚡ ที่เจอโพสต์นี้
  caption      text,
  posted_at    timestamptz,
  likes        integer,
  comments     integer,                       -- จำนวนคอมเมนต์บนแพลตฟอร์ม (ตอนดึงล่าสุด)
  views        bigint,
  img          text,                          -- รูปปก (Storage social-media หรือลิงก์ CDN)
  img_fail     smallint not null default 0,   -- เก็บรูปลง Storage พลาดกี่ครั้ง (2 = เลิกลอง)
  is_video     boolean not null default false,
  cm_pulled_at timestamptz,                   -- ดึงคอมเมนต์ของโพสต์นี้ครบแล้วเมื่อไร (ว่าง = ยังไม่ได้ดึง)
  cm_got       integer,                       -- ได้คอมเมนต์มากี่อัน
  cm_err       smallint not null default 0,   -- ดึงคอมเมนต์พลาดกี่ครั้ง (2 = ข้าม)
  first_seen   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (channel, pkey)
);

-- 2026-10-08: ยอดแชร์/เซฟ/ความยาวคลิป/แฮชแท็ก/ประเภทโพสต์ — ใช้กับเมนู 📈 วิเคราะห์โพสต์/คลิป (social-brain ≥ v2026-10-08.1)
alter table public.social_posts add column if not exists shares   integer;   -- จำนวนแชร์ (TikTok · Facebook)
alter table public.social_posts add column if not exists saves    integer;   -- จำนวนเซฟ/บันทึก (TikTok)
alter table public.social_posts add column if not exists duration real;      -- ความยาวคลิป (วินาที)
alter table public.social_posts add column if not exists hashtags text[];    -- แฮชแท็ก (ตัวเล็ก ไม่มี #)
alter table public.social_posts add column if not exists ptype    text;      -- video | photo | carousel | text

create index if not exists social_posts_ch_at on public.social_posts (channel, posted_at desc);
create index if not exists social_posts_todo on public.social_posts (channel, posted_at desc) where cm_pulled_at is null;

alter table public.social_posts enable row level security;
drop policy if exists social_posts_read on public.social_posts;
create policy social_posts_read on public.social_posts for select to anon, authenticated using (true);

revoke insert, update, delete on public.social_posts from anon, authenticated;
grant select on public.social_posts to anon, authenticated;
grant all on public.social_posts to service_role;
grant usage, select on sequence public.social_posts_id_seq to service_role;

-- 2026-10-08: สถานะของระบบที่คีย์สาธารณะแก้ไม่ได้ (ฟังก์ชัน social-brain เขียนเท่านั้น · แอปอ่านได้)
--   news_cfg = กลุ่ม LINE ที่ส่งสรุปประจำวัน · news_last = ผลส่งล่าสุด · news_push:<วันที่> / content_run:<วันที่> = กันส่ง/วิเคราะห์ซ้ำในวันเดียวกัน
--   news_manual:<วัน>:<n> (≤5) / content_ai:<วัน>:<n> (≤6) / news_cfg_note:<วัน>:<n> (≤3) = โควต้ารายวันของปุ่มส่ง LINE / ปุ่มวิเคราะห์ / แจ้งกลุ่มเดิมตอนเปลี่ยนกลุ่ม
create table if not exists public.social_sys (
  id         text primary key,
  val        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.social_sys enable row level security;
drop policy if exists social_sys_read on public.social_sys;
create policy social_sys_read on public.social_sys for select to anon, authenticated using (true);
revoke insert, update, delete on public.social_sys from anon, authenticated;
grant select on public.social_sys to anon, authenticated;
grant all on public.social_sys to service_role;

-- ตรวจผล: ควรเห็น 0 แถว (ตารางใหม่) หรือจำนวนโพสต์ที่มีอยู่แล้ว · มียอดแชร์แล้วกี่โพสต์
select channel, count(*) as posts, count(cm_pulled_at) as comments_pulled, count(shares) as with_shares
from public.social_posts group by channel order by channel;
