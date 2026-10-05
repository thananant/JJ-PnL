-- ============================================================
-- jj_employee_hr.sql — ข้อมูลพนักงานเพิ่ม (JJ-Payroll · เจ้าของสั่ง 2026-10-05)
-- เพศ · สัญชาติ · ที่อยู่ · ผู้ติดต่อฉุกเฉิน · วันหมดอายุเอกสาร (Passport/ใบอนุญาตทำงาน/บัตรชมพู)
-- เอกสารแจ้งเข้า/แจ้งออก/หนังสือยินยอมผู้ปกครอง · โรงพยาบาลประกันสังคม · สแกนหน้า
-- กลุ่ม (MOU/คนเถื่อน/ไม่มีใบอนุญาตทำงาน) · การทำเอกสาร (สถานะ/วันเริ่ม/วันเสร็จ/Agency)
-- เพิ่มคอลัมน์อย่างเดียว ไม่แก้/ไม่ลบข้อมูลเดิม · รันทั้งไฟล์ใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender             text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality        text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address            text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_name     text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_relation text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_phone    text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_exp       date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_permit_exp    date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pink_card_exp      date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_notify_in      boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_notify_out     boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_guardian       boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sso_hospital       text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_scan          boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS worker_group       text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_status         text NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_start          date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_done           date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_agency         text NOT NULL DEFAULT '';

COMMENT ON COLUMN employees.gender             IS 'เพศ: ชาย / หญิง / อื่นๆ';
COMMENT ON COLUMN employees.nationality        IS 'สัญชาติ: TH ไทย / LA ลาว / MM พม่า / SHAN คนไทยใหญ่ / NONE ไม่มีสัญชาติ';
COMMENT ON COLUMN employees.address            IS 'ที่อยู่ปัจจุบัน';
COMMENT ON COLUMN employees.emergency_name     IS 'ผู้ติดต่อฉุกเฉิน — ชื่อ';
COMMENT ON COLUMN employees.emergency_relation IS 'ผู้ติดต่อฉุกเฉิน — เกี่ยวข้องเป็น';
COMMENT ON COLUMN employees.emergency_phone    IS 'ผู้ติดต่อฉุกเฉิน — เบอร์โทร';
COMMENT ON COLUMN employees.passport_exp       IS 'Passport หมดอายุ (แอปเตือนก่อน 3 เดือน)';
COMMENT ON COLUMN employees.work_permit_exp    IS 'ใบอนุญาตทำงาน หมดอายุ';
COMMENT ON COLUMN employees.pink_card_exp      IS 'บัตรชมพู หมดอายุ';
COMMENT ON COLUMN employees.doc_notify_in      IS 'มีเอกสารแจ้งเข้าแล้ว';
COMMENT ON COLUMN employees.doc_notify_out     IS 'มีเอกสารแจ้งออกแล้ว';
COMMENT ON COLUMN employees.doc_guardian       IS 'มีหนังสือยินยอมผู้ปกครองแล้ว (อายุไม่ถึง 18)';
COMMENT ON COLUMN employees.sso_hospital       IS 'โรงพยาบาลที่เลือก (ประกันสังคม)';
COMMENT ON COLUMN employees.face_scan          IS 'เพิ่มหน้าในเครื่องสแกนแล้ว';
COMMENT ON COLUMN employees.worker_group       IS 'กลุ่ม: (ว่าง)=ทั่วไป / mou / illegal_nopass คนเถื่อน-พม่าไม่มี Passport / illegal_minor คนเถื่อน-อายุไม่ถึง 18 / no_permit ไม่มีใบอนุญาตทำงาน';
COMMENT ON COLUMN employees.doc_status         IS 'กำลังทำเอกสาร: (ว่าง)=ไม่มี / mou / passport / illegal / notify_in / notify_out';
COMMENT ON COLUMN employees.doc_start          IS 'การทำเอกสาร — วันที่เริ่มทำ';
COMMENT ON COLUMN employees.doc_done           IS 'การทำเอกสาร — วันที่เสร็จ';
COMMENT ON COLUMN employees.doc_agency         IS 'การทำเอกสาร — Agency';
