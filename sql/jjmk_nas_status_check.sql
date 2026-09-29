-- ============================================================
-- อ่านอย่างเดียว · เช็คว่า NAS ยังเก็บไฟล์ให้อยู่ไหม (29 ก.ย. 2569) — รันใน Supabase SQL Editor แล้วส่งผลกลับมา
--   1) สคริปต์ inv_nas_sync.py บน Synology รายงานตัวล่าสุดเมื่อไร (ควรไม่เกิน 5–10 นาที)
--   2) ใบกำกับภาษีที่ NAS เก็บ PDF แล้ว / ที่ยังค้างคิว แยกสาขา-เดือน
-- ============================================================
select key, value,
       case when key='nas_sync_last' then now() - (value::timestamptz) end as "นานแค่ไหนแล้ว"
from inv_settings where key in ('nas_sync_last','nas_sync_info');

select branch, to_char(issued_at,'YYYY-MM') as เดือน,
       count(*) filter (where nas_path is not null) as "เก็บลง NAS แล้ว",
       count(*) filter (where nas_path is null)     as "รอ NAS เก็บ",
       count(*) filter (where status='cancelled')   as ยกเลิก
from inv_invoices group by 1,2 order by 1,2 desc;

select nas_path from inv_invoices where nas_path is not null order by updated_at desc limit 5; -- ตัวอย่างโฟลเดอร์ที่ใช้อยู่
