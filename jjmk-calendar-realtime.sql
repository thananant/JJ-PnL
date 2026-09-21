-- ============================================================
-- jjmk-calendar-realtime.sql — เปิดเรียลไทม์ให้ระบบปฏิทิน (JJ Calendar)
-- รันครั้งเดียวใน Supabase → SQL Editor (รันซ้ำได้ ไม่พัง)
-- ผลลัพธ์: พอมีคนเพิ่ม/แก้/ยกเลิกนัด เครื่องคนอื่นที่เปิดแอปค้างไว้จะเห็นทันที
--          (เดิมรอรอบอัพเดตทุก 5 นาที)
-- ============================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.cal_events;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.cal_attendees;
  exception when duplicate_object then null; end;
end $$;

select 'เปิดเรียลไทม์ให้ cal_events + cal_attendees เรียบร้อย ✅' as result;
