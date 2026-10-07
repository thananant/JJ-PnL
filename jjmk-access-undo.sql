-- ============================================================
-- JJ Access: ปุ่ม ↩️ ย้อนกลับ ในแท็บ "ประวัติการแก้สิทธิ์" (2026-10-07)
-- เก็บค่าก่อน/หลังของทุกการแก้บัญชี ไว้กดย้อนกลับเวลากดผิด
-- รันครั้งเดียว · รันซ้ำได้ · ไม่แก้/ไม่ลบข้อมูลเดิม (เพิ่มคอลัมน์อย่างเดียว)
-- ============================================================

-- ค่าก่อน/หลังของช่องที่แก้ {"b":{...ค่าเดิม},"a":{...ค่าใหม่}} — ไม่มีรหัสผ่าน
alter table pnl_access_log add column if not exists snap jsonb;

-- รายการนี้คือการย้อนรายการ id ไหน (ไว้ขึ้นป้าย "ย้อนแล้ว" ที่รายการเดิม)
alter table pnl_access_log add column if not exists undo_of bigint;

create index if not exists pnl_access_log_undo_of_idx
  on pnl_access_log (undo_of) where undo_of is not null;

-- ให้ API เห็นคอลัมน์ใหม่ทันที
notify pgrst, 'reload schema';
