-- jj_holiday_scope.sql — วันหยุดพิเศษ (ตาราง holidays) เลือกได้ว่าใช้กับใคร (เจ้าของสั่ง 2026-09-30)
-- รันใน Supabase -> SQL Editor (รันซ้ำได้) · ไฟล์ jjmk-calendar-days.sql ทำส่วนนี้ให้ด้วยแล้ว รันอันใดอันหนึ่งก็พอ
--   all    = ทุกคน (แบบเดิม — แถวเดิมทั้งหมดเป็นค่านี้ คิดเงินเหมือนเดิมทุกบาท)
--   store  = หน้าร้านอย่างเดียว : หน้าร้านได้ ×N + เป็นวันห้ามหยุด · ออฟฟิศทำงานปกติ
--   office = ออฟฟิศอย่างเดียว   : ออฟฟิศได้หยุด นับเป็นวันทำงาน · หน้าร้านทำงานปกติ ไม่ได้ ×N ไม่ใช่วันห้ามหยุด
--   "ออฟฟิศ" = พนักงานสาขา OFFICE (เจ้าของเลือก) · ได้ ×N หรือได้หยุด ยังตามสวิตช์ "ได้เบี้ยวันหยุดพิเศษ" ของแต่ละคนเหมือนเดิม
do $$ begin
  if to_regclass('public.holidays') is not null then
    alter table public.holidays add column if not exists scope text not null default 'all';
    alter table public.holidays drop constraint if exists holidays_scope;
    alter table public.holidays add constraint holidays_scope check (scope in ('all','store','office'));
  end if;
end $$;

select 'วันหยุดพิเศษเลือกได้ว่าใช้กับใคร (holidays.scope) ✅' as result;
