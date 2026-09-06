-- ============================================================
-- JJ Social — เปิดระบบดึง/วิเคราะห์/สรุป อัตโนมัติ (pg_cron)
-- ก่อนรัน: แทนที่ <SERVICE_ROLE_KEY> ด้วยคีย์จริง
--   (Supabase Dashboard → Project Settings → API Keys → service_role → Copy)
-- รันใน SQL Editor ครั้งเดียว
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ลบตารางเวลาเดิม (ถ้ามี) กันซ้ำ
do $$ begin
  perform cron.unschedule('social-poll');
exception when others then null; end $$;
do $$ begin
  perform cron.unschedule('social-daily-summary');
exception when others then null; end $$;

-- 1) ทุก 15 นาที: ดึงรีวิว Google + วิเคราะห์รีวิวที่ค้างด้วย AI
select cron.schedule('social-poll','*/15 * * * *', $cron$
  select net.http_post(
    url:='https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-brain',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body:='{"action":"cron"}'::jsonb);
$cron$);

-- 2) ทุกวัน 06:10 เวลาไทย: AI สรุปเมื่อวาน (ปัญหา/ใครทำดี/ช่วงเวลา)
select cron.schedule('social-daily-summary','10 23 * * *', $cron$
  select net.http_post(
    url:='https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-brain',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body:='{"action":"summary"}'::jsonb);
$cron$);

-- ตรวจว่าตั้งสำเร็จ: ต้องเห็น 2 แถว
select jobname, schedule, active from cron.job where jobname like 'social%';
