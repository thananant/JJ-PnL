-- jj_holiday_scope.sql — วันหยุดพิเศษ (ตาราง holidays) แยกหน้าร้าน/ออฟฟิศ (เจ้าของสั่ง 2026-09-30)
-- รันใน Supabase -> SQL Editor (รันซ้ำได้) · ไฟล์ jjmk-calendar-days.sql ทำส่วนนี้ให้ด้วยแล้ว รันอันใดอันหนึ่งก็พอ
--   all    = ทุกคน (แบบเดิม — แถวเดิมทั้งหมดเป็นค่านี้ คิดเงินเหมือนเดิมทุกบาท)
--   store  = หน้าร้านอย่างเดียว : หน้าร้านได้ ×N + เป็นวันห้ามหยุด · ออฟฟิศทำงานปกติ          (ปฏิทิน 💰 ค่าแรง ×2)
--   office = ออฟฟิศอย่างเดียว   : ออฟฟิศได้หยุด นับเป็นวันทำงาน · หน้าร้านทำงานปกติ ไม่ได้ ×N ไม่ใช่วันห้ามหยุด (ปฏิทิน 🏢 ออฟฟิศหยุด)
--   "ออฟฟิศ" = พนักงานสาขา OFFICE (เจ้าของเลือก) · ได้ ×N หรือได้หยุด ยังตามสวิตช์ "ได้เบี้ยวันหยุดพิเศษ" ของแต่ละคนเหมือนเดิม
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

select 'วันหยุดพิเศษแยกหน้าร้าน/ออฟฟิศ (holidays.scope + cal_id) ✅' as result;
