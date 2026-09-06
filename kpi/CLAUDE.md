# JJ KPI — ระบบวัดความพึงพอใจลูกค้า จริงใจหมูกระทะ (JJMK)

## ภาพรวม
- แอปไฟล์เดียว `jjmk-kpi.html` (HTML+CSS+JS, ไม่มี build step) อยู่ที่ **root ของ repo นี้**
  เปิดที่ https://thananant.github.io/JJ-PnL/jjmk-kpi.html (GitHub Pages, branch `main`)
- **ย้ายมาจาก repo `thananant/JJ-KPI` เมื่อ 2026-09-06** — แท็บเล็ตที่เคย Add to Home Screen
  ด้วย URL เดิม (`…/JJ-KPI/jjmk-kpi.html`) จะไม่ได้อัพเดตจาก repo นี้ ต้องเปลี่ยนมาใช้ URL ใหม่
- Backend: Supabase project `aikyxvluaiubdidqxwnd` (ใช้ร่วมกับระบบ JJ อื่น ๆ: payroll, pnl, stockcheck)
  ตารางของระบบนี้ใช้ prefix `kpi_` ทั้งหมด — **ห้ามแตะตารางที่ไม่ใช่ `kpi_*`**
- Schema: `jjmk-kpi.sql` อยู่ที่ **branch `sql`** ของ repo นี้ (ตามกติกา repo — ห้ามมี `.sql` บน main)
  — idempotent รันซ้ำได้เสมอใน Supabase SQL Editor
- 2 โหมดจาก URL เดียว
  - ไม่มี param → แดชบอร์ดเจ้าของ (แท็บ รายวัน / รายเดือน / พนักงาน / ตั้งค่า)
  - `?kiosk=JJRD` หรือ `?kiosk=JJLP` → หน้าจอทัชสกรีนให้ลูกค้ากด (ค่าอื่น/ว่าง → หน้าเลือกสาขา)

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

FACES: 1😡แย่มาก 2🙁ไม่พอใจ 3😐เฉยๆ 4🙂พอใจ 5😍ประทับใจ

## Database (`jjmk-kpi.sql` — branch `sql`)
ตาราง
- `kpi_departments(id, name, icon, sort_order, active)` — ใช้ร่วมทุกสาขา; seed 4 แผนก (อาหาร🍖 บริการ🙋 ความสะอาด🧹 ต้อนรับ/แคชเชียร์🧾) เฉพาะตอนตารางว่าง
- `kpi_staff(id, branch, name, nickname, position, sort_order, active)` — ลูกค้าเห็น nickname (fallback name)
- `kpi_responses(id, branch, biz_date, staff_id, device, created_at)`
- `kpi_scores(response_id, department_id, score 1–5)`

Views (แดชบอร์ดอ่านจาก views เป็นหลัก ไม่โหลดดิบทั้งเดือน)
- `kpi_daily` (branch×biz_date×dept: n, avg_score, n1..n5)
- `kpi_daily_responses` (n_responses, n_with_staff)
- `kpi_staff_daily` (votes)
- `kpi_monthly` (ym rollup)

RPC `kpi_submit(p_branch, p_biz_date, p_staff_id, p_device, p_created_at, p_scores jsonb)`
security definer — insert response + scores ใน transaction เดียว

RLS: permissive สำหรับ anon (แบบเดียวกับระบบ JJ อื่น) — ตั้งใจ ไม่ต้อง "แก้"
ท้ายไฟล์มี `notify pgrst, 'reload schema'`
ปิดใช้ (active=false) แทนการลบ เพราะ responses อ้างถึง

## Kiosk flow
idle (แตะเพื่อเริ่ม, เข้าเต็มจอ) → ทีละแผนก 5 หน้ายิ้ม (ย้อนกลับ/ข้าม, progress dots)
→ เลือกพนักงาน 1 คนของสาขานั้น หรือ "ไม่ระบุ" (ข้ามขั้นนี้ถ้าสาขาไม่มีพนักงาน active)
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
`harness.js` = fake Supabase client + DB 45 วัน 2 สาขา, `smoke.js` = 6 กลุ่มเทส
(dashboard ทุกแท็บ, ตารางหาย→hint, kiosk full flow + idle/PIN/offline, สาขาไม่มีพนักงาน, chooser, helpers)
หมายเหตุ: fake DB สร้างวันจากเวลาเครื่อง ให้รันด้วย `TZ=Asia/Bangkok` (ใน npm test ใส่ไว้แล้ว)
ข้อความ jsdom "Not implemented: navigation" ตอนเทส PIN เป็นพฤติกรรมปกติของ jsdom

## Deploy
1. รัน `jjmk-kpi.sql` (branch `sql`) ใน Supabase SQL Editor (ครั้งแรก และทุกครั้งที่แก้ schema)
2. push `jjmk-kpi.html` ขึ้น branch `main` ของ repo นี้ (GitHub Pages เสิร์ฟจาก root)
3. แดชบอร์ด → ตั้งค่า → ใส่พนักงานแต่ละสาขา
4. แท็บเล็ตเปิด `?kiosk=JJRD` / `?kiosk=JJLP` → Add to Home Screen หรือ Fully Kiosk Browser

## ลิงก์
- แดชบอร์ด https://thananant.github.io/JJ-PnL/jjmk-kpi.html
- Kiosk รัชดา https://thananant.github.io/JJ-PnL/jjmk-kpi.html?kiosk=JJRD
- Kiosk ลาดพร้าว-วังหิน https://thananant.github.io/JJ-PnL/jjmk-kpi.html?kiosk=JJLP
