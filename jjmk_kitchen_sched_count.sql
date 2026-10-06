-- jjmk_kitchen_sched_count.sql — ครัวกลาง: วันสั่งของของแต่ละร้าน + หน่วยนับสต๊อกของวัตถุดิบ
-- รันซ้ำได้ · เพิ่มคอลัมน์อย่างเดียว ไม่แตะข้อมูลเดิม
alter table ck_sups add column if not exists order_days smallint[];  -- วันที่สั่งได้ 0=อาทิตย์ … 6=เสาร์ (ว่าง = สั่งได้ทุกวัน)
alter table ck_items add column if not exists count_unit text;       -- นับสต๊อกเป็นหน่วยไหน เช่น ขวด (ว่าง = ระบบเลือกให้)
notify pgrst, 'reload schema';
select 'ck_sups.order_days' as "คอลัมน์",
       exists(select 1 from information_schema.columns where table_schema='public' and table_name='ck_sups' and column_name='order_days') as "มีแล้ว"
union all
select 'ck_items.count_unit',
       exists(select 1 from information_schema.columns where table_schema='public' and table_name='ck_items' and column_name='count_unit');
