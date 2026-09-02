-- ============================================================
-- ลบตารางชุด ord_* ของแอพสั่งของที่ยกเลิกไป (รันเฉพาะถ้าเคยรัน jjmk_order_setup.sql) · รันซ้ำได้ · ไม่แตะตารางอื่น
-- ============================================================
drop table if exists ord_order_items, ord_orders, ord_counts, ord_holidays, ord_products, ord_suppliers, ord_settings cascade;
select 'ลบ ord_* แล้ว' as ok, count(*) as "ตาราง ord_* ที่เหลือ" from pg_tables where schemaname='public' and tablename like 'ord\_%';
