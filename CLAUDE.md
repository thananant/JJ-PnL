# JJ-PnL — จริงใจหมูกระทะ (บริษัท พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)

รวมแอปหลังบ้านของร้านหมูกระทะ 4 สาขา (JJLP ลาดพร้าว · JJRD รัชดา · JJCK ครัวกลาง · OFFICE)
ทุกแอปเป็น HTML ไฟล์เดียว รันจาก branch `main` ผ่าน GitHub Pages: https://thananant.github.io/JJ-PnL/
รายชื่อแอปทั้งหมดดู `README.md` · ผู้ใช้สื่อสารภาษาไทย — UI/คำตอบเป็นไทย

## กติกา repo

- **ห้ามเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน** — SQL ทั้งหมดอยู่ branch `sql` เท่านั้น (ไม่รวมเข้า main และไม่ merge กับใคร) · SQL ของระบบเงินเดือนอยู่ในโฟลเดอร์ `jjmk-payroll/` ของ branch นั้น · SQL ระบบ KPI คือ `jjmk-kpi.sql` ที่ root ของ branch นั้น
- กติกาเจ้าของ (2026-08-04): แก้เสร็จ+ตรวจผ่านแล้ว → เปิด PR + merge เข้า main อัตโนมัติ ไม่ต้องถามยืนยัน (ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — ถามก่อน)
- กติกาเจ้าของ (2026-09-17 — แทนที่กติกาก่อนหน้าทั้งหมดเรื่องวิธีส่ง SQL): SQL ที่ต้องรันใน Supabase → **แปะเนื้อหาลงในแชทเป็นบล็อกโค้ด** ให้เจ้าของกดคัดลอกไปวางใน SQL Editor ได้ทันที · **ห้ามส่งเป็นการ์ดไฟล์ (`SendUserFile`) เด็ดขาด** — กดแล้วเด้งหน้าต่างเซฟลงเครื่อง เจ้าของไม่ต้องการดาวน์โหลด · เขียนไฟล์ลง `sql/` ไว้ด้วย (อยู่ใน `.gitignore`) แล้วบอก path ท้ายข้อความเผื่ออยากเปิดในแผงขวา — ยัง push เก็บที่ branch `sql` ตามกติกาข้อแรกทุกครั้ง · งานที่ขึ้น GitHub ให้ push/merge เองเลย ไม่ต้องส่งไฟล์มาในแชท

## ระบบวัดความพึงพอใจลูกค้า (JJ KPI)

- แอปคือ `jjmk-kpi.html` ที่ root (ย้ายมาจาก repo `thananant/JJ-KPI` เมื่อ 2026-09-06) — **อ่าน `kpi/CLAUDE.md` ก่อนแก้ทุกครั้ง**
- ลูกค้ากดหน้าร้านผ่านแท็บเล็ต (`?kiosk=JJRD` / `?kiosk=JJLP`) · ไม่มี param = แดชบอร์ดเจ้าของ
- ตาราง Supabase ใช้ prefix `kpi_` ทั้งหมด (โปรเจกต์เดียวกับระบบอื่น) — **ห้ามแตะตารางที่ไม่ใช่ `kpi_*`**
- รายชื่อพนักงานให้ลูกค้าชม ซิงก์อัตโนมัติจากตาราง `employees` ของ payroll + โชว์เฉพาะคนกำลังเข้างานตามสแกน `punches` (RPC `kpi_sync_staff` / `kpi_on_duty` — อ่านอย่างเดียว)
- เทสอยู่ `kpi/test/` (`npm run check` + `npm test` ต้อง ALL PASSED ก่อนส่ง)
- แท็บเล็ตที่ยังชี้ URL เดิมของ repo JJ-KPI จะไม่ได้อัพเดตจาก repo นี้ — ต้องเปลี่ยนมาใช้ URL ใหม่

## ระบบเงินเดือน (JJ-Payroll)

- แอปคือ `jjmk-payroll.html` ที่ root เหมือนแอปอื่น (ย้ายมาจาก repo `thananant/JJ-Payroll` 2026-09-06) · ไฟล์ประกอบ (worker/tools/docs/logo) อยู่โฟลเดอร์ `jjmk-payroll/` — **อ่าน `jjmk-payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง** (กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม)
- แอปเปิดที่ https://thananant.github.io/JJ-PnL/jjmk-payroll.html — **ต้องล็อกอิน** (บัญชี `pnl_users` ชุดเดียวกับ P&L/Social) · ทุกการแก้ข้อมูลถูกจดใน `payroll_audit` ดูที่หน้า "🕘 ประวัติการทำรายการ"
- ฐานข้อมูล Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd` (ตาราง employees/punches/adjustments/advances/... ดู `jjmk-payroll/docs/JJ-Payroll-Summary.md`)
- **งวดเงินเดือน = 26 เดือนก่อน → 25 เดือนนี้ (ไม่ตรงเดือนปฏิทิน)** — เวลาเอาค่าแรงเข้า PnL ต้องตกลงวิธีแบ่งก่อน · จุดเชื่อม Payroll↔PnL ดูข้อ 8 ใน `jjmk-payroll/docs/JJ-Payroll-Summary.md`
- `jjmk-payroll/worker.js` deploy ผ่าน Cloudflare dashboard (ไม่ใช่ GitHub) — เครื่องสแกน/รายงาน LINE ชี้ที่ Worker เดิม ไม่เกี่ยวกับการย้าย repo

## ระบบฟังเสียงลูกค้า (JJ Social)

- แอปคือ `jjmk-social.html` ที่ root · ไฟล์ติดตั้ง (SQL + `supabase/functions/social-brain.ts`, `social-webhook.ts` + `README-SOCIAL.md`) อยู่ branch `claude/social-listening-system-342kax`
- ตาราง Supabase ใช้ prefix `social_` · ล็อกอินใช้ `pnl_users` ร่วมกับ P&L · สาขาอ่านจาก `pnl_branches`
- Edge Functions deploy โดยวางโค้ดใน Dashboard (ชื่อฟังก์ชัน `social-brain` / `social-webhook` — ตัวหลังปิด Verify JWT)
- secrets ฝั่ง LINE ของระบบนี้คือ `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` (OA หน้าร้าน) — **คนละตัวกับ `LINE_SECRET`/`LINE_TOKEN` ซึ่งเป็นของระบบอื่น ห้ามใช้ปน**

## ระบบปฏิทินองค์กร (JJ Calendar)

- แอปคือ `jjmk-calendar.html` ที่ root (สร้าง 2026-09-10) — ปฏิทินนัดหมายภายในองค์กร: สร้างนัด ระบุผู้สร้าง/ผู้เข้าร่วม มุมมองเดือน+รายการนัด
- ตาราง Supabase ใช้ prefix `cal_` (`cal_events`/`cal_attendees`/`cal_settings`) · ล็อกอินใช้ `pnl_users` ร่วมกับ P&L · สาขาอ่านจาก `pnl_branches` (+ JJCK/OFFICE เพิ่มในแอป)
- SQL ติดตั้งคือ `jjmk-calendar.sql` ที่ root ของ branch `sql`
- เพิ่มนัดลงมือถือได้ 2 ทาง: ดาวน์โหลด `.ics` ต่อนัด (มี VALARM เตือนตาม `reminder_min`) / subscribe ฟีดทั้งปฏิทินผ่าน Edge Function **`cal-feed`** (deploy ผ่าน Dashboard · **ปิด Verify JWT** · URL ต้องมี `?token=` ตรงกับ `cal_settings` id=`feed` · `&user=` = กรองเฉพาะนัดของคนนั้น)
- นัดทั้งวันเก็บ `start_at`/`end_at` เป็น 00:00 เวลาไทยของวันแรก/วันสุดท้าย (นับรวม) — ฝั่ง ICS แปลง DTEND เป็น exclusive (+1 วัน) ให้แล้ว
- ยกเลิกนัด = `cancelled=true` (soft delete) → หายจากแอปและฟีดมือถือตอนรีเฟรช

## ระบบล็อกอินกลาง (SSO) — หน้าศูนย์รวมแอป (เจ้าของสั่ง 2026-09-18)

- **พนักงานล็อกอินที่หน้าแรก (`index.html`) ที่เดียว** แล้วเห็นเฉพาะแอปที่ตัวเองได้รับสิทธิ์ (อ่านจาก `pnl_users.apps` ที่ admin ตั้งในหน้า JJ Access)
- ล็อกอินสำเร็จ → หน้าแรก**แจกใบผ่านให้ทุกแอปที่ใช้บัญชี `pnl_users`** ผ่าน localStorage (ฟังก์ชัน `spreadSession`) จึงเข้าแอปต่อได้เลยไม่ต้องกรอกซ้ำ:
  `jjpnl_auth` (P&L · Owner · Access) · `jjpay_sess` (Payroll) · `jjsocial_sess` · `jjcal_sess` · `jjmk_inv_sess`
  — **เพิ่มแอปใหม่ที่ใช้ `pnl_users` ต้องเพิ่มคีย์ใน `spreadSession` และ `clearSession` ด้วย** ไม่งั้นต้องล็อกอินซ้ำ
- แอปที่ยังใช้บัญชีคนละชุด (นับสต๊อก `sc_users` · ครัวกลาง+ซ่อมบำรุง `app_users`/Supabase Auth) และ KPI (ไม่มีล็อกอิน) อยู่ในรายการ `ALWAYS` = **แสดงเสมอ** ล็อกอินกลางยังคุมไม่ถึง ต้องล็อกอินในแอปนั้นเอง
- **กันล็อกคนใช้งานโดยไม่ตั้งใจ** (สำคัญ — อย่าตัดออก):
  - `apps` ว่าง (ยังไม่เคยตั้งสิทธิ์) = แสดงทุกแอปตามเดิม ไม่ซ่อนอะไร
  - เน็ตล่ม/เช็คสิทธิ์ไม่ได้ = แสดงทุกแอปไว้ก่อน
  - ปุ่ม "ดูแอปทั้งหมด" ในหน้าล็อกอิน สำหรับคนที่ใช้บัญชีของระบบนับสต๊อก/ครัวกลาง (เก็บ flag `jjhub_skip`)
- ไอคอน 🔑 JJ Access เห็นเฉพาะ `role='admin'` (ยังไม่ล็อกอิน+ไม่เคยล็อกอินค้าง = ซ่อน)
- ออกจากระบบที่หน้าแรก = ล้างใบผ่านทุกคีย์พร้อมกัน (`clearSession`)

## กติกา UX ทุกแอป — รีเฟรชแล้วต้องอยู่หน้าเดิม (เจ้าของสั่ง 2026-09-18)

- **ลากลง (pull-to-refresh) หรือกดรีเฟรช = ต้องกลับมาที่หน้า/แท็บเดิมที่เปิดค้างไว้** ห้ามเด้งกลับหน้าแรก
- วิธีทำ: ตอนสลับแท็บให้เก็บลง `localStorage` (คีย์ `jj<ระบบ>_tab` เช่น `jjcal_tab`, `jjsocial_tab`)
  แล้วตอนเปิดแอปอ่านค่ากลับมาใช้เป็นแท็บเริ่มต้น (ต้อง validate ว่าเป็นแท็บที่มีอยู่จริง กันค่าเสียจาก version เก่า)
- หน้าที่ไม่มีแท็บ ให้จำ "มุมมองที่ดูค้างไว้" แทน เช่น JJ Owner จำปี+สาขา (`jjowner_view`)
- เขียนแอปใหม่ต้องมีตั้งแต่แรก · สถานะปัจจุบัน (2026-09-18) ทำครบทุกแอปแล้ว:
  P&L `jjpnl_view` · Kitchen `jjck_tab` · นับสต๊อก `jjsc_tab` · Payroll (hash routing) ·
  Social `jjsocial_tab` · Calendar `jjcal_tab` · KPI `kpi_tab` · Invoice `jjinv_tab` ·
  Access `jjacc_tab` · Owner `jjowner_view` · ซ่อมบำรุงเป็นหน้าเดียวจึงไม่ต้องจำ
- หน้าศูนย์รวมแอป (`index.html`) ใส่ meta no-cache + ปุ่ม 🔄 โหลดใหม่ (ข้ามแคชด้วย `?v=`) กันมือถือ/PWA แคชหน้าเก่าค้าง

## กติกาการส่งงาน — ใช้กับ **ทุกระบบ** ใน repo นี้ (P&L · Owner · KPI · Payroll · นับสต๊อก · ซ่อมบำรุง · Kitchen · Social · Invoice · Calendar · Access)

- ไฟล์ที่ต้องรัน/วางบน **Supabase** (SQL, โค้ด Edge Functions) → **แปะเนื้อหาลงในแชทเป็นบล็อกโค้ดเลย** (เจ้าของสั่ง 2026-09-17 หลังลองมาแล้ว 2 แบบ):
  - เจ้าของกดคัดลอกจากบล็อกโค้ดในแชทไปวางใน Supabase SQL Editor ได้ทันที **ไม่ต้องดาวน์โหลด ไม่ต้องกดเปิดไฟล์**
  - ❌ **ห้ามส่งเป็นการ์ดไฟล์ (`SendUserFile`)** — กดแล้วเด้งหน้าต่างเซฟลงเครื่อง เสียเวลา
  - ยังเขียนไฟล์ลงโฟลเดอร์ `sql/` ไว้ด้วย (อยู่ใน `.gitignore`) แล้วบอก path สั้น ๆ ไว้ท้ายข้อความ เผื่อเจ้าของอยากเปิดดูในแผงขวา — แต่**เนื้อหาต้องอยู่ในแชทเสมอ**
  - **ยังต้อง push เก็บที่ branch `sql` ทุกครั้ง** ตามกติกา repo ข้อแรก (ของ payroll ไปโฟลเดอร์ `jjmk-payroll/` ของ branch นั้น)
  - ถ้าไฟล์ยาวมากจนแปะทั้งก้อนไม่ไหว ให้แบ่งเป็นส่วน ๆ แล้วแปะต่อกันในข้อความเดียว — ห้ามให้เจ้าของไปตามหาเอง
  - โค้ดยาว ๆ ที่เจ้าของต้องเอาไปวางที่อื่น (Apps Script, Cloudflare Worker) ใช้หลักเดียวกัน — แปะในแชท หรือทำปุ่มคัดลอกในแอป
- ไฟล์ที่ขึ้น **GitHub** (แอป HTML ฯลฯ) → **push ขึ้น main ให้เองเลย** ไม่ต้องส่งในแชท ไม่ต้องถามยืนยัน
