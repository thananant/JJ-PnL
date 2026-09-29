-- ============================================================
-- JJ Social — แก้สิทธิ์ฐานข้อมูล (permission denied for table social_mentions)
-- รันครั้งเดียวใน Supabase → SQL Editor
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  social_mentions, social_chat_log, social_settings, social_staff, social_daily
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- ตรวจผล: ลอง insert + ลบทิ้ง ถ้าไม่ฟ้อง error = สิทธิ์ครบแล้ว
insert into social_mentions(channel, kind, external_id, text)
  values ('other', 'review', 'grant_test', 'ทดสอบสิทธิ์');
delete from social_mentions where channel='other' and external_id='grant_test';
select 'สิทธิ์ครบแล้ว ✓' as result;
