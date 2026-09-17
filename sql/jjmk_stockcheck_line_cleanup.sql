-- ============================================================
-- JJ เช็คสต๊อก · ยกเลิกตารางไลน์ที่สร้างเกิน + ตรวจของเดิมที่มีอยู่แล้ว (17 ก.ย. 2569)
--   เหตุผล: ระบบเดิม (แอพนับสต๊อก jjmk-stock) มีของพวกนี้ครบแล้ว
--     · กลุ่มไลน์ของซัพ = คอลัมน์ suppliers.line_group_id
--     · รายชื่อกลุ่มที่บอทอยู่ = ตาราง line_groups
--     · การส่งจริง = Supabase Edge Function 'line-order' (โทเคนบอทอยู่ฝั่งเซิร์ฟเวอร์)
--   แอพเช็คสต๊อกตัวใหม่เปลี่ยนไปใช้ของเดิมทั้งหมดแล้ว → 2 ตารางนี้ไม่ได้ใช้
--   *** ไฟล์นี้ลบเฉพาะตารางที่ผมสร้างเกินไว้ ไม่แตะตารางของระบบเดิมแม้แต่ตารางเดียว ***
-- ============================================================

-- 1) ดูก่อนลบ: ที่สร้างไปมีข้อมูลที่กรอกเองไว้หรือยัง (ถ้ามี group_id ที่กรอกเอง อย่าเพิ่งลบ ส่งผลนี้ให้ผมก่อน)
select 'sc_line_groups' as ตาราง, count(*) as แถว, count(group_id) as ที่กรอก_group_id
from sc_line_groups
union all
select 'sc_config', count(*), count(v) from sc_config;

-- 2) ของเดิมที่ใช้จริง — ผูกกลุ่มไลน์ไว้แล้วกี่ซัพ
select count(*) as ซัพทั้งหมด,
       count(line_group_id) as ผูกกลุ่มไลน์แล้ว,
       count(*) - count(line_group_id) as ยังไม่ผูก
from suppliers;

select name as ซัพ,
       coalesce((select g.name from line_groups g where g.group_id = s.line_group_id),
                case when s.line_group_id is null then '(ยังไม่ผูก)' else s.line_group_id end) as กลุ่มไลน์
from suppliers s order by (s.line_group_id is null), name;

-- 3) ลบตารางที่สร้างเกิน (คอมเมนต์ทิ้งไว้ก่อน — เอาเครื่องหมาย -- ออกเมื่อยืนยันผลข้อ 1 แล้ว)
-- drop table if exists sc_line_groups;
-- drop table if exists sc_config;

-- ---------- ตรวจผล ----------
-- คาด: ข้อ 2 บอกว่ามีซัพผูกกลุ่มไลน์ไว้แล้วกี่ราย (ตัวเลขนี้คือของที่แอพใหม่จะใช้ได้ทันที)
--      ข้อ 1 ถ้า ที่กรอก_group_id = 0 แปลว่ายังไม่ได้กรอกอะไรลงตารางใหม่ → ลบได้ปลอดภัย
