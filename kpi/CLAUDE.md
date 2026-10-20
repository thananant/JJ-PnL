# JJ KPI — ระบบวัดความพึงพอใจลูกค้า จริงใจหมูกระทะ

อ่านก่อนแก้ทุกครั้ง · เก็บเฉพาะกติกาที่ยังใช้ · ประวัติ/เหตุผล/รายละเอียดหน้าจอและเทสทั้งหมด: `kpi/docs/claude-detail.md` (ฉบับเต็มก่อนย่อ 2026-10-20)

## ภาพรวม

- แอปไฟล์เดียว `jjmk-kpi.html` ที่ root (ไม่มี build) · Supabase `aikyxvluaiubdidqxwnd` ร่วมกับระบบอื่น · Schema `jjmk-kpi.sql` (branch `sql` · idempotent · Ctrl+A ก่อน Run)
- **ตาราง `kpi_*` เท่านั้น ห้ามแตะตารางอื่น** — ยกเว้นอ่านอย่างเดียว: `employees`/`punches` (ผ่าน RPC `kpi_sync_staff`/`kpi_on_duty`) · `line_groups` · `pnl_users` · `pnl_branches`
- 2 โหมด: ไม่มี param = แดชบอร์ด (แท็บ รายวัน/รายเดือน/พนักงาน/ตั้งค่า · จำแท็บ `kpi_tab`) · `?kiosk=<สาขา>` = จอลูกค้า (ค่าอื่น/ว่าง → หน้าเลือกสาขา)
- ลากหน้าลง = รีเฟรช **ปิดในโหมด kiosk (`body.kiosk`/`?kiosk=`) ห้ามตัด** — คะแนนที่ลูกค้ากดค้างจะหาย
- CONFIG บนสุดของ `<script>`: `BRANCHES` (สาขาเดิม JJRD/JJLP · สาขาใหม่มาจาก `pnl_branches` เองด้วย `brSync`) · `CUTOFF_HOUR` 5 (วันทำการตัด 05:00) · `TARGET` 4.5 · `KIOSK_PIN` · `KIOSK_HIDE_POS` (ค่าตั้งต้น — บันทึกในตั้งค่าแล้วใช้ `kpi_settings.kiosk_hide_pos` แบบตรงตัว)
- **หน้ายิ้ม 4 ระดับ** (1/2/4/5 · 3😐 `hide:true` คงไว้ให้ข้อมูลเก่า) · สเกลเก็บ/ค่าเฉลี่ย/TARGET คิดบน 1–5 **ห้ามรีสเกลเป็น 1–4**

## ล็อกอิน/สิทธิ์ (มาตรฐานใบผ่าน `jjsso_ticket` เดียวกับ Social/ซ่อมบำรุง — อย่าคิดกลไกใหม่)

- แดชบอร์ดต้องล็อกอิน `pnl_users` (hash `…|JJPNL` **ห้ามเปลี่ยน**) · ใบผ่านอายุ 2 นาที ใช้ครั้งเดียว แล้วตรวจกับ `pnl_users` อีกชั้น · เปิดลิงก์ตรง = กรอกรหัสเอง
- session ประจำแท็บ `sessionStorage.kpi_auth` (รีเฟรชอยู่ต่อ · ตรวจกับฐานข้อมูลซ้ำทุกครั้ง) · **เน็ตล่มตอนรีเฟรช = ใช้ของเดิมต่อ ห้ามตัด**
- `canUseKpi()` = กติกาเดียวกับ `canOpen()` ของหน้าแรก · `permOf`/`can(screen,flag)` หน้าจอ `dash`/`kiosk` (dash ไม่มี `e` = ซ่อนแท็บตั้งค่า + ฟังก์ชันบันทึกปฏิเสธอีกชั้น)
- `_br` (`SCOPE`/`myBranches()`/`branchOk()` · `ME` ตั้งผ่าน `setMe()` เสมอ) — คำขอแดชบอร์ดผ่าน `bf()` · การ์ดแผนก/ตำแหน่ง/ไลน์ (ค่ากลาง) ดูได้แก้ไม่ได้ · fail closed
  · ⚠️ **`kpi_sync_staff` ต้องได้ทุกสาขาใน `CONFIG.BRANCHES` เสมอ ห้ามส่งรายการที่กรองตามสิทธิ์** (RPC ปิดพนักงานที่ไม่อยู่ในรายการ)
- **`?kiosk=` ไม่ต้องล็อกอิน ห้ามใส่ประตู** (แท็บเล็ตจะใช้ไม่ได้)

## ฐานข้อมูล (`jjmk-kpi.sql`)

- ตาราง `kpi_departments` · `kpi_staff` (`employee_id` ผูก payroll · null = กรอกมือ) · `kpi_responses` · `kpi_scores` · `kpi_settings` · views `kpi_daily`/`kpi_daily_responses`/`kpi_staff_daily`/`kpi_monthly` (แดชบอร์ดอ่าน view เป็นหลัก)
- RPC `kpi_submit` (insert ใน transaction เดียว) · `kpi_sync_staff(p_branches)`: payroll เป็นต้นทางชื่อ/ตำแหน่ง/สาขา · พ้นสภาพ/ย้าย = active=false · **ไม่เปิด active กลับให้เอง** · แถวกรอกมือไม่ถูกแตะ
- `kpi_on_duty(p_branch)` = id คนที่สแกนจำนวนคี่ในวันทำการ (ตัด 06:00 แบบ payroll) · RLS permissive สำหรับ anon (ตั้งใจ) · ปิดใช้ (active=false) แทนการลบ
- เปลี่ยนโครง `employees`/`punches` หรือวิธีบันทึกเวลาในระบบเงินเดือน = ต้องแก้ SQL นี้ด้วย

## Kiosk

- แผนกทีละหน้า → คำถามชมพนักงาน (จัดกลุ่มตามตำแหน่ง) → ขอบคุณ → รีเซ็ต · ส่งไม่สำเร็จเข้าคิว `kpi_queue` flush ทุก 30 วิ · `kNext`/`kPickStaff` no-op ถ้า step เป็น done/idle
- **โชว์เฉพาะคนกำลังเข้างาน** (`kpi_on_duty` · โหลดตอน boot + ทุก 5 นาที + ทุกครั้งที่ลูกค้าแตะเริ่ม) · **ลิสต์ว่าง/RPC ล้ม → ข้ามคำถามชมพนักงาน ห้าม fallback เป็นโชว์ทั้งร้าน** · แถวไม่ผูก `employee_id` ไม่โชว์ · ซ่อนตำแหน่งหลังร้านตาม `kiosk_hide_pos` (มีผลเฉพาะจอลูกค้า)

## 📤 สรุปเข้ากลุ่มไลน์ (`jjmk_kpi_line.sql`)

- ฐานข้อมูลส่งเอง: `pg_cron` → `kpi_line_tick()` ทุก 10 นาที → `line-order` `{to,text}` · รายวัน 09:00 (วันทำการเมื่อวาน) · รอบ 1–15 ส่งวันที่ 16 / รอบ 16–สิ้นเดือน ส่งวันที่ 1 เวลา 09:10
- ข้อความจาก `kpi_line_text` (SQL) · **คนที่ไม่ถูกชมเลยไม่อยู่ในข้อความ — ห้ามเปลี่ยน** · ไม่มีใครกดทั้งวัน = ส่งข้อความเตือนเช็คแท็บเล็ต
- **ค่าเฉลี่ยของรอบ = กองรวมคะแนนทุกครั้งแล้วเฉลี่ยทีเดียว ห้ามเฉลี่ยของค่าเฉลี่ยรายวัน — ห้ามเปลี่ยน** · ชมพนักงาน = บวกสะสมทั้งรอบ
- ตั้งค่า `kpi_settings.line_cfg` · **`since` (และ `since_br` ของสาขาใหม่) ห้ามตัด** — กันย้อนส่งของเก่า · `line_groups` อ่านอย่างเดียว (ส่วนใหญ่เป็นกลุ่มซัพพลายเออร์)
- กันส่งซ้ำ `kpi_line_log` (จองแถวก่อนยิง · ok=true/null ไม่ส่งซ้ำ · false ลองใหม่รวม 3 ครั้ง · ย้อนหลัง 3 วัน · anon อ่านอย่างเดียว) · `kpi_line_tick`/`kpi_line_due` revoke จาก public
- ชื่อสาขาไทยและ TARGET ฝังใน `kpi_line_text` ด้วย — แก้ในแอปต้องแก้ SQL ให้ตรง

## กติกาโค้ด + เทส

- UI ไทย mobile-first · input ≥16px · escape ทุกค่าลง innerHTML ด้วย `esc()` · อ่านข้อมูลทีละ 1,000 แถวผ่าน `fetchAll` · วัน/เวลาเป็นเวลาไทยเสมอ (`bizDateOf`)
- แท็บรายวัน การ์ดรายการล่าสุด: จอแคบซ่อน `td.face-cell` / จอกว้างซ่อน `.rc-faces` **ห้ามลืมฝั่งใดฝั่งหนึ่ง** (อีโมจิขึ้นซ้ำ)
- SQL idempotent ตรวจด้วย `pglast` · `cd kpi/test && npm install && npm run check && npm test` ต้อง ALL PASSED (jsdom + Supabase จำลอง · `TZ=Asia/Bangkok` ใส่ใน npm test แล้ว · หน้าล็อกอินเช็คด้วย `#lgU`)
- Deploy: รัน SQL (ครั้งแรก/แก้ schema) → push `jjmk-kpi.html` ขึ้น main · แท็บเล็ตเปิด `?kiosk=JJRD` / `?kiosk=JJLP`
