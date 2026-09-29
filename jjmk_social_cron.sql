-- ============================================================
-- JJ Social — งานอัตโนมัติ (pg_cron) · เวอร์ชัน 2026-09-29.2
-- กด Run ได้เลย ไม่ต้องแก้อะไร — ใช้คีย์สาธารณะชุดเดียวกับหน้าแอป (ไม่ใช่คีย์ลับ)
-- รันซ้ำได้ ไม่ลบข้อมูล (แค่ตั้งตารางเวลาใหม่ทับของเดิม)
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

-- 1) ทุก 15 นาที: ซิงค์รีวิว Google + วิเคราะห์รายการใหม่ + อัพเกรดรายการ [เบื้องต้น] ด้วย AI
--    (ฟังก์ชันตอบกลับทันทีแล้วทำงานต่อเบื้องหลัง · ผลดูได้ที่การ์ด "สถานะระบบ" ในแอป)
select cron.schedule('social-poll', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-brain',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm","Authorization":"Bearer sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm"}'::jsonb,
    body := '{"action":"cron"}'::jsonb,
    timeout_milliseconds := 30000);
$cron$);

-- 2) ทุกวัน 06:10 เวลาไทย (23:10 UTC): สรุปเมื่อวาน + เรียนรู้คำถามที่ลูกค้าถามซ้ำ
select cron.schedule('social-daily-summary', '10 23 * * *', $cron$
  select net.http_post(
    url := 'https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-brain',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm","Authorization":"Bearer sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm"}'::jsonb,
    body := '{"action":"summary"}'::jsonb,
    timeout_milliseconds := 30000);
$cron$);

-- ตรวจว่าตั้งสำเร็จ: ต้องเห็น 2 แถว active = true
select jobname, schedule, active from cron.job where jobname like 'social%' order by jobname;
