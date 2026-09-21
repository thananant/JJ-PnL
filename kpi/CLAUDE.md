# JJ KPI — ระบบวัดความพึงพอใจลูกค้า จริงใจหมูกระทะ (JJMK)

## ภาพรวม
- แอปไฟล์เดียว `jjmk-kpi.html` (HTML+CSS+JS, ไม่มี build step) อยู่ที่ **root ของ repo นี้**
  เปิดที่ https://thananant.github.io/JJ-PnL/jjmk-kpi.html (GitHub Pages, branch `main`)
- **ย้ายมาจาก repo `thananant/JJ-KPI` เมื่อ 2026-09-06** — แท็บเล็ตที่เคย Add to Home Screen
  ด้วย URL เดิม (`…/JJ-KPI/jjmk-kpi.html`) จะไม่ได้อัพเดตจาก repo นี้ ต้องเปลี่ยนมาใช้ URL ใหม่
- Backend: Supabase project `aikyxvluaiubdidqxwnd` (ใช้ร่วมกับระบบ JJ อื่น ๆ: payroll, pnl, stockcheck)
  ตารางของระบบนี้ใช้ prefix `kpi_` ทั้งหมด — **ห้ามแตะตารางที่ไม่ใช่ `kpi_*`**
  (ยกเว้นเดียว: RPC `kpi_sync_staff` / `kpi_on_duty` **อ่าน** ตาราง `employees` / `punches` ของ payroll — ห้ามเขียน/แก้เด็ดขาด)
- Schema: `jjmk-kpi.sql` อยู่ที่ **branch `sql`** ของ repo นี้ (ตามกติกา repo — ห้ามมี `.sql` บน main)
  — idempotent รันซ้ำได้เสมอใน Supabase SQL Editor
- **ลากหน้าลง = รีเฟรช (2026-09-21)**: มีสคริปต์ pull-to-refresh ท้ายไฟล์ (ทุกแอปใน repo มี) —
  **ปิดอัตโนมัติในโหมด kiosk** (`body.kiosk` / `?kiosk=`) เพราะจอลูกค้าอยู่ยอดสุดเสมอ
  ถ้ารีเฟรชคะแนนที่กดค้างไว้จะหาย — ห้ามตัดเงื่อนไขนี้ออก
- **รีเฟรชแล้วต้องอยู่หน้าเดิม (กติกา 2026-09-18 ใช้ทั้ง repo)**: ลากลง/กดรีเฟรชแล้วห้ามเด้งกลับหน้าแรก —
  เก็บแท็บที่เปิดอยู่ลง `localStorage` (`kpi_tab`) แล้วอ่านกลับมาใช้ตอนเปิดแอป (validate ค่าก่อนใช้เสมอ)
- **วิธีส่ง SQL ให้เจ้าของ (กติกา 2026-09-17 — ใช้กับทุกระบบใน repo นี้)**: **แปะเนื้อหา SQL
  ลงในแชทเป็นบล็อกโค้ด** ให้กดคัดลอกไปวางใน Supabase SQL Editor ได้ทันที
  · ❌ **ห้ามส่งเป็นการ์ดไฟล์ (`SendUserFile`)** — กดแล้วเด้งหน้าต่างเซฟลงเครื่อง เจ้าของไม่ต้องการโหลด
  · เขียนไฟล์ลง `sql/` ไว้ด้วย (อยู่ใน `.gitignore`) แล้วบอก path ท้ายข้อความเผื่ออยากเปิดดูในแผงขวา
  · ยังต้อง push เก็บที่ branch `sql` ตามกติกาเดิมทุกครั้ง
- 2 โหมดจาก URL เดียว
  - ไม่มี param → แดชบอร์ดเจ้าของ (แท็บ รายวัน / รายเดือน / พนักงาน / ตั้งค่า)
  - `?kiosk=JJRD` หรือ `?kiosk=JJLP` → หน้าจอทัชสกรีนให้ลูกค้ากด (ค่าอื่น/ว่าง → หน้าเลือกสาขา)

## ล็อกอิน (เจ้าของสั่ง 2026-09-21 — กันคนได้ลิงก์ไปแล้วเปิดดูได้)

ใช้ **มาตรฐานใบผ่าน `jjsso_ticket` ชุดเดียวกับ JJ Social / ซ่อมบำรุง** (อย่าคิดกลไกใหม่)

- **แดชบอร์ดต้องล็อกอิน** ด้วยบัญชีกลาง `pnl_users` · hash `sha256hex(user+'|'+pass+'|JJPNL')` — **ห้ามเปลี่ยน**
- **เข้าจากหน้าศูนย์รวมแอพ** → หน้าแรกออกใบผ่าน `jjsso_ticket` (localStorage · **อายุ 2 นาที ใช้ครั้งเดียว** · มี `app` กำกับ)
  แอปอ่านแล้วทิ้งทันที (`ticketTake`) แล้วเอา `u`+`h` ไป**ตรวจกับ `pnl_users` จริงอีกชั้น**ก่อนพาเข้า
- **เปิดลิงก์ตรง (ไม่มีใบผ่าน) = ต้องกรอกรหัสเองเสมอ** — คนที่ได้ลิงก์ไปเข้าไม่ได้
- **ใบอนุญาตของแท็บอยู่ใน `sessionStorage` (`kpi_auth`)** → **ลากหน้าลง/รีเฟรชบนมือถือยังอยู่หน้าเดิม** · ปิดแท็บ = หลุดเอง ต้องล็อกอินใหม่
  · ทุกครั้งที่รีเฟรชจะตรวจกับฐานข้อมูลซ้ำ (บัญชีถูกปิด/เปลี่ยนรหัส/สิทธิ์ถูกถอน = เด้งออกทันที)
  · **เน็ต/ฐานข้อมูลล่มตอนรีเฟรช → ใช้ของเดิมในแท็บต่อ** (อย่าตัดออก — กันเตะคนทำงานออกกลางคัน)
- **ทางเผื่อ (1.5)**: หน้าแรกเวอร์ชันเก่าที่ยังไม่ออกใบผ่าน — ถ้า `document.referrer` เป็นหน้าแรกของเราเองจริง + `jjpnl_auth` ตรงกับฐานข้อมูล ก็ให้ผ่าน
- **สิทธิ์รายแอป**: `canUseKpi()` กติกาเดียวกับ `canOpen()` ของ hub — admin/owner ผ่านเสมอ · `apps` ว่าง = ไม่ล็อกใคร · นอกนั้นต้องมี `apps.kpi.<หน้าจอ>` ที่มี `v` (หน้าจอในระบบสิทธิ์: `dash` แดชบอร์ด · `kiosk` หน้าจอลูกค้า)
  · ไม่มีสิทธิ์ → หน้า "ยังไม่ได้รับสิทธิ์" ไม่เห็นข้อมูลลูกค้าเลย
- **สิทธิ์รายหน้าจอ** (2026-09-21 — ต่อยอดจาก `canUseKpi`): `permOf(screen)` / `can(screen, flag)` อ่านแฟล็ก v/a/e/d จาก `apps.kpi`
  · `dash` ไม่มี `e` → **ซ่อนแท็บตั้งค่า** (`visTabs`) + `renderTab` กันบังคับเปิด + `saveDepts`/`saveStaff`/`saveHidePos` ปฏิเสธอีกชั้น
  · `kiosk` ไม่มี `v` → ซ่อนปุ่ม 🖥 หน้าจอลูกค้า บนหัว และการ์ดลิงก์ kiosk ในหน้าตั้งค่า
  · admin/owner = `vaed` เสมอ · `apps` ว่าง = `vaed` (ไม่ล็อกใคร) — กติกาเดียวกับ `canUseKpi`
- **`?kiosk=` ไม่ต้องล็อกอิน** — จอให้ลูกค้าหน้าร้านกด (ใส่ประตูตรงนี้แท็บเล็ตจะใช้ไม่ได้)
- ออกจากระบบ = ล้าง session ของแท็บ + ใบผ่าน แล้วกลับหน้าศูนย์รวมแอพ

## CONFIG (อยู่บนสุดของ `<script>` ใน jjmk-kpi.html — ฝังตรง ไม่มี placeholder)
| key | ค่า | ความหมาย |
|---|---|---|
| SUPABASE_URL | https://aikyxvluaiubdidqxwnd.supabase.co | |
| SUPABASE_KEY | sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm | publishable (anon) key |
| BRANCHES | JJRD=รัชดา, JJLP=ลาดพร้าว-วังหิน | เพิ่มสาขาที่นี่ที่เดียว |
| CUTOFF_HOUR | 5 | วันทำการตัด 05:00 เวลาไทย (ก่อนตี 5 = วันก่อนหน้า) |
| OPEN_HOUR | 11 | ชั่วโมงแรกในกราฟช่วงเวลา (11:00 → 04:00 = 18 คอลัมน์) |
| TARGET | 4.5 | เป้าคะแนนเฉลี่ย (เกจ/เส้นเป้า/สี good≥4.5, ok≥4.0, bad) |
| KIOSK_PIN | 2468 | ออกจาก kiosk: กดค้างชื่อสาขามุมซ้ายบน 2.5 วิ → PIN |
| KIOSK_IDLE_SEC | 25 | ไม่แตะกลางทาง → ส่งคะแนนที่กดแล้ว (ถ้ามี) แล้วรีเซ็ต |
| KIOSK_DONE_SEC | 3 | หน้าขอบคุณค้างกี่วิ |
| KIOSK_HIDE_POS | ['สไลด์','ล้างจาน','ครัว'] | **ค่าเริ่มต้น**ตำแหน่งหลังร้านที่ซ่อนจากหน้าชมพนักงาน (เทียบแบบมีคำนี้) — พอเจ้าของกดบันทึกในหน้าตั้งค่า จะใช้รายการจาก `kpi_settings` (เทียบตรงตัว) แทน |

FACES: **4 ระดับตั้งแต่ 2026-09-07** — 1😡แย่มาก 2🙁ไม่พอใจ 4🙂พอใจ 5😍ประทับใจ
(3😐เฉยๆ ติด `hide:true` ไม่โชว์บนหน้าจอลูกค้า แต่คงไว้ใน FACES ให้แดชบอร์ดแสดงคะแนน 3 ของข้อมูลเก่า
· `KFACES` = ตัวเลือกที่ลูกค้าเห็น · สเกลเก็บจริง/ค่าเฉลี่ย/เป้า TARGET ยังคิดบน 1–5 เหมือนเดิม — ห้ามรีสเกลเป็น 1–4)

## Database (`jjmk-kpi.sql` — branch `sql`)
ตาราง
- `kpi_departments(id, name, icon, sort_order, active)` — ใช้ร่วมทุกสาขา; seed 4 แผนก (อาหาร🍖 บริการ🙋 ความสะอาด🧹 ต้อนรับ/แคชเชียร์🧾) เฉพาะตอนตารางว่าง
- `kpi_staff(id, branch, name, nickname, position, sort_order, active, employee_id)` — ลูกค้าเห็น nickname (fallback name)
  · `employee_id` ผูกกับ `employees.id` ของ payroll (unique เมื่อไม่ null) — null = แถวกรอกมือ
- `kpi_responses(id, branch, biz_date, staff_id, device, created_at)`
- `kpi_scores(response_id, department_id, score 1–5)`
- `kpi_settings(key primary key, value jsonb, updated_at)` — ตั้งค่าระบบ · ตอนนี้ใช้ key เดียว
  `kiosk_hide_pos` = array ชื่อตำแหน่ง (ตรงตัว) ที่ซ่อนจากหน้าชมพนักงาน เจ้าของติ๊กในหน้าตั้งค่า
  (ไม่มีแถว/ตารางยังไม่ถูกสร้าง → แอป fallback ใช้ CONFIG.KIOSK_HIDE_POS แบบ substring)

Views (แดชบอร์ดอ่านจาก views เป็นหลัก ไม่โหลดดิบทั้งเดือน)
- `kpi_daily` (branch×biz_date×dept: n, avg_score, n1..n5)
- `kpi_daily_responses` (n_responses, n_with_staff)
- `kpi_staff_daily` (votes)
- `kpi_monthly` (ym rollup)

RPC `kpi_submit(p_branch, p_biz_date, p_staff_id, p_device, p_created_at, p_scores jsonb)`
security definer — insert response + scores ใน transaction เดียว

RPC `kpi_sync_staff(p_branches text[])` security definer — ซิงก์รายชื่อจาก `employees` (payroll) ลง `kpi_staff`
(แอปเรียกตอน loadMeta: เปิดแดชบอร์ด/kiosk + ทุก 5 นาทีตอน kiosk ว่าง · p_branches = Object.keys(BRANCHES))
กติกาซิงก์: ① แถวกรอกมือที่ชื่อ/ชื่อเล่นตรงกับพนักงาน payroll สาขาเดียวกัน → ผูก employee_id (กันแถวซ้ำ)
② พนักงาน active ที่ยังไม่มี → insert ③ แถวที่ผูกแล้ว payroll เป็นต้นทางของ ชื่อ/ชื่อเล่น/ตำแหน่ง/สาขา
④ พ้นสภาพ/ย้ายนอกสาขา kiosk → active=false อัตโนมัติ · **ไม่เปิด active กลับให้เอง** (เจ้าของปิดซ่อนใครไว้ ซิงก์ไม่เปิดทับ
— คนกลับเข้าทำงานใหม่ต้องไปติ๊ก "ใช้" เองในตั้งค่า) · แถวกรอกมือไม่ถูกแตะ · ซิงก์ล้ม (ยังไม่รัน SQL/เน็ตล่ม) → แอปใช้รายชื่อเดิม + เตือนในหน้าตั้งค่า
หน้าตั้งค่า: แถวที่ผูกแล้ว (class `synced`) ล็อกช่องชื่อ/ชื่อเล่น/ตำแหน่ง/สาขา — แก้ที่แอป Payroll · ติ๊ก "ใช้" กับลำดับยังแก้ได้

RPC `kpi_on_duty(p_branch text)` security definer → bigint[] — id พนักงานที่กำลังเข้างานของสาขานั้น
(อ่าน `punches` เทียบ `employees.code` — punch_date/punch_time เป็นวันเวลาไทยตามจริง · นับสแกนในวันทำการปัจจุบัน
ตัด 06:00 แบบ payroll · จำนวนคี่ = ยังอยู่ในร้าน) · kiosk เรียกตอน boot + ทุก 5 นาทีตอน idle เก็บใน `K.onDuty`

RLS: permissive สำหรับ anon (แบบเดียวกับระบบ JJ อื่น) — ตั้งใจ ไม่ต้อง "แก้"
ท้ายไฟล์มี `notify pgrst, 'reload schema'`
ปิดใช้ (active=false) แทนการลบ เพราะ responses อ้างถึง

## Kiosk flow
idle (แตะเพื่อเริ่ม, เข้าเต็มจอ) → ทีละแผนก 4 หน้ายิ้ม (คะแนน 1,2,4,5 ไม่มีเฉยๆ · ย้อนกลับ/ข้าม, progress dots)
→ คำถามสุดท้าย "ชมพนักงาน 💖 อยากชมพนักงานคนไหนเป็นพิเศษไหมคะ?" — เลือกพนักงาน 1 คนของสาขานั้น
  หรือ "ไม่ระบุ" (ข้ามขั้นนี้ถ้าสาขาไม่มีพนักงาน active) · รายชื่อซิงก์จาก payroll
  **จัดกลุ่มตามตำแหน่ง** (กลุ่มใหญ่ขึ้นก่อน) · **โชว์เฉพาะคนกำลังเข้างาน** (`kpi_on_duty` — นับสแกนวันทำการคี่=อยู่
  · โหลดตอน boot + ทุก 5 นาทีตอน idle + **ทุกครั้งที่ลูกค้าแตะเริ่ม (kStart ยิงแบบไม่ await)** = สดเสมอ
  · ลิสต์ว่าง/RPC ล้ม → โชว์ทั้งหมด กันเครื่องสแกนล่มแล้วจอว่าง · แถวกรอกมือไม่มีรหัสสแกน โชว์เสมอ)
  · **ซ่อนตำแหน่งหลังร้าน** — เจ้าของติ๊กเลือกในหน้าตั้งค่า การ์ด "ตำแหน่งที่โชว์ในหน้าชมพนักงาน"
  (เก็บใน kpi_settings ใช้ทุกสาขา · ยังไม่เคยบันทึกใช้ KIOSK_HIDE_POS) — ทั้งสามตัวกรองมีผลเฉพาะหน้าจอลูกค้า (kStaff)
  แดชบอร์ด/ตั้งค่า/อันดับ เห็นครบทุกคน
→ ขอบคุณ → รีเซ็ต
- ส่งไม่สำเร็จ → คิวใน localStorage `kpi_queue`, flush ทุก 30 วิ (offline-safe)
- device id ใน localStorage `kpi_device`; สาขาที่เลือกในแดชบอร์ด `kpi_branch`
- meta (แผนก/พนักงาน) reload ทุก 5 นาทีตอน idle
- guard ที่แก้แล้ว: `kNext`/`kPickStaff` no-op ถ้า step เป็น done/idle (กัน setTimeout ยิงหลัง finish)

## Conventions (ใช้กับทุกโปรเจกต์ JJ)
- ตอบ Pattrick เป็นภาษาไทย กระชับ
- ส่งมอบ **เฉพาะไฟล์แอป/SQL** — smoke test อยู่ฝั่ง dev ไม่ส่งให้ user
- UI ไทย, mobile-first, input ≥16px, ธีมแดง+ทองบนพื้นเข้ม (CI จริงใจหมูกระทะ)
- SQL idempotent, ตรวจด้วย parser ก่อนส่ง (`pip install pglast` → `pglast.parse_sql`)
- JS ตรวจ `node --check` (สกัด inline script ออกมา — ดู `npm run check`)
- escape ทุกค่าที่ลง innerHTML ด้วย `esc()`; อ่านข้อมูล paginate 1000 แถวผ่าน `fetchAll`
- คำนวณวัน/เวลาเป็นเวลาไทยเสมอ (`bizDateOf`) ไม่พึ่ง timezone เครื่อง

## ทดสอบ (`kpi/test/`)
```bash
cd kpi/test && npm install
npm run check   # syntax ของ inline JS (อ่านแอปจาก ../../jjmk-kpi.html)
npm test        # jsdom smoke test (จำลอง Supabase) — ต้อง ALL PASSED
```
`harness.js` = fake Supabase client + DB 45 วัน 2 สาขา (+ตาราง employees/pnl_users จำลอง), `smoke.js` = 9 กลุ่มเทส
(dashboard ทุกแท็บ, ตารางหาย→hint, kiosk full flow + idle/PIN/offline, สาขาไม่มีพนักงาน, chooser,
payroll sync, settings แถวซิงก์/ซิงก์ล้ม, helpers, **ล็อกอิน/สิทธิ์**, **สิทธิ์รายหน้าจอ**)
- harness จำลองว่ากดเข้ามาจากหน้าศูนย์รวมแอพ (ออกใบผ่านให้) — ตัวเลือกใน `boot(url, db, extra)`:
  `noAuth:true` = เปิดลิงก์ตรง ไม่มีใบผ่าน · `as:'manager'` = ใบผ่านของคนอื่น · `authAge:ms` = ใบผ่านเก่า
  · `ticketApp:'payroll'` = ใบผ่านของแอปอื่น · **`sess:'boss'` = แท็บที่ล็อกอินค้างอยู่ (จำลองลากหน้าลง/รีเฟรช)**
  · บัญชีจำลองอยู่ใน `USERS` (boss=owner, manager=ดูอย่างเดียว `dash:'v'`, nokpi=ไม่มีสิทธิ์, kpimgr=`dash:'vae'`+`kiosk:'v'`) รหัสทุกคน `kpi1234`
- jsdom ไม่มี `TextEncoder` (เบราว์เซอร์จริงมี) — harness shim ให้แล้วใน `beforeParse`
หมายเหตุ: fake DB สร้างวันจากเวลาเครื่อง ให้รันด้วย `TZ=Asia/Bangkok` (ใน npm test ใส่ไว้แล้ว)
ข้อความ jsdom "Not implemented: navigation" ตอนเทส PIN เป็นพฤติกรรมปกติของ jsdom

## Deploy
1. รัน `jjmk-kpi.sql` (branch `sql`) ใน Supabase SQL Editor (ครั้งแรก และทุกครั้งที่แก้ schema — **Ctrl+A ก่อน Run**)
2. push `jjmk-kpi.html` ขึ้น branch `main` ของ repo นี้ (GitHub Pages เสิร์ฟจาก root)
3. รายชื่อพนักงานซิงก์จาก payroll อัตโนมัติ — เข้าตั้งค่าเฉพาะถ้าจะซ่อนบางคน/เพิ่มคนที่ไม่อยู่ใน payroll
4. แท็บเล็ตเปิด `?kiosk=JJRD` / `?kiosk=JJLP` → Add to Home Screen หรือ Fully Kiosk Browser

## ลิงก์
- แดชบอร์ด https://thananant.github.io/JJ-PnL/jjmk-kpi.html
- Kiosk รัชดา https://thananant.github.io/JJ-PnL/jjmk-kpi.html?kiosk=JJRD
- Kiosk ลาดพร้าว-วังหิน https://thananant.github.io/JJ-PnL/jjmk-kpi.html?kiosk=JJLP
