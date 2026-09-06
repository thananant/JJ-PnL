-- เพิ่มการตั้งค่า "เริ่มหักเงินประกันตั้งแต่งวด" (รันครั้งเดียว รันซ้ำได้)
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS dep_start text NOT NULL DEFAULT '';
COMMENT ON COLUMN payroll_settings.dep_start IS 'เริ่มหักเงินประกันตั้งแต่งวด YYYY-MM (ว่าง = คิดย้อนหลังทุกงวด)';
