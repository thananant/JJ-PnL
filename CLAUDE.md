# JJ-PnL — จริงใจหมูกระทะ (บริษัท พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)

รวมแอปหลังบ้านของร้านหมูกระทะ 4 สาขา (JJLP ลาดพร้าว · JJRD รัชดา · JJCK ครัวกลาง · OFFICE)
ทุกแอปเป็น HTML ไฟล์เดียว รันจาก branch `main` ผ่าน GitHub Pages: https://thananant.github.io/JJ-PnL/
รายชื่อแอปทั้งหมดดู `README.md` · ผู้ใช้สื่อสารภาษาไทย — UI/คำตอบเป็นไทย

## กติกา repo

- **ห้ามเพิ่มไฟล์ `.sql` ลง main หรือ branch งาน** — SQL ทั้งหมดอยู่ branch `sql` เท่านั้น (ไม่รวมเข้า main และไม่ merge กับใคร) · SQL ของระบบเงินเดือนอยู่ในโฟลเดอร์ `jjmk-payroll/` ของ branch นั้น · SQL ระบบ KPI คือ `jjmk-kpi.sql` ที่ root ของ branch นั้น
- กติกาเจ้าของ (2026-08-04): แก้เสร็จ+ตรวจผ่านแล้ว → เปิด PR + merge เข้า main อัตโนมัติ ไม่ต้องถามยืนยัน (ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — ถามก่อน)
- กติกาเจ้าของ (2026-09-17 — แทนที่กติกาก่อนหน้าทั้งหมดเรื่องวิธีส่ง SQL): SQL ที่ต้องรันใน Supabase → **แปะเนื้อหาลงในแชทเป็นบล็อกโค้ด** ให้เจ้าของกดคัดลอกไปวางใน SQL Editor ได้ทันที · **ห้ามส่งเป็นการ์ดไฟล์ (`SendUserFile`) เด็ดขาด** — กดแล้วเด้งหน้าต่างเซฟลงเครื่อง เจ้าของไม่ต้องการดาวน์โหลด · เขียนไฟล์ลง `sql/` ไว้ด้วย (อยู่ใน `.gitignore`) แล้วบอก path ท้ายข้อความเผื่ออยากเปิดในแผงขวา — ยัง push เก็บที่ branch `sql` ตามกติกาข้อแรกทุกครั้ง · งานที่ขึ้น GitHub ให้ push/merge เองเลย ไม่ต้องส่งไฟล์มาในแชท

- **กติกาเอกสาร (2026-10-17 — เจ้าของสั่งย่อ CLAUDE.md เพราะกิน token ทุกเทิร์น)**: ไฟล์นี้เก็บเฉพาะกติกาสั้น ๆ + ตัวชี้ · รายละเอียด/ประวัติ/ผลตรวจอิสระของแต่ละระบบอยู่ `docs/<ระบบ>.md` (คัดลอกตรงตัวจาก CLAUDE.md เดิม ไม่ตัดกติกา) — **แก้ระบบไหนให้อ่าน docs ของระบบนั้นก่อน** · งานใหม่: จดรายละเอียดลง `docs/<ระบบ>.md` แล้วเพิ่มใน CLAUDE.md แค่ 1–2 บรรทัดที่เป็นกติกา "ห้าม/ต้อง" · CLAUDE.md ต้องไม่เกิน ~40 KB

## ระบบวัดความพึงพอใจลูกค้า (JJ KPI)

- แอปคือ `jjmk-kpi.html` ที่ root (ย้ายมาจาก repo `thananant/JJ-KPI` เมื่อ 2026-09-06) — **อ่าน `kpi/CLAUDE.md` ก่อนแก้ทุกครั้ง**
- ลูกค้ากดหน้าร้านผ่านแท็บเล็ต (`?kiosk=JJRD` / `?kiosk=JJLP`) · ไม่มี param = แดชบอร์ดเจ้าของ
- ตาราง Supabase ใช้ prefix `kpi_` ทั้งหมด (โปรเจกต์เดียวกับระบบอื่น) — **ห้ามแตะตารางที่ไม่ใช่ `kpi_*`**
- รายชื่อพนักงานให้ลูกค้าชม ซิงก์อัตโนมัติจากตาราง `employees` ของ payroll + โชว์เฉพาะคนกำลังเข้างานตามสแกน `punches` (RPC `kpi_sync_staff` / `kpi_on_duty` — อ่านอย่างเดียว)
- **จอลูกค้าโชว์เฉพาะคนที่สแกนเข้างานอยู่จริงเท่านั้น (เจ้าของสั่ง 2026-09-21)** — เช็คไม่ได้ว่าใครอยู่ (ยังไม่รัน SQL/RPC ล้ม/ไม่ได้ผูก payroll) = **ข้ามคำถามชมพนักงาน** ห้ามโชว์ทั้งร้าน · ดูสาเหตุได้ที่การ์ด "ใครเข้างานตอนนี้" ในหน้าตั้งค่าของแอป
- **สรุปเข้ากลุ่มไลน์แยกสาขา (เจ้าของสั่ง 2026-10-15)**: ต้องรัน `jjmk_kpi_line.sql` (branch `sql`) · ฐานข้อมูลส่งเอง (`pg_cron` → `kpi_line_tick()` ทุก 10 นาที → Edge Function `line-order` ตัวเดียวกับนับสต๊อก/ครัวกลาง)
  · รายวัน 09:00 (วันทำการเมื่อวาน) · รอบ 1–15 ส่งวันที่ 16 และรอบ 16–สิ้นเดือน ส่งวันที่ 1 เวลา 09:10 · เนื้อหา = คะแนนเฉลี่ย + แยกตามหัวข้อ + ชมพนักงานรายคน (**ไม่ถูกชมเลย = ไม่ขึ้นชื่อ**)
  · เลือกกลุ่มของแต่ละสาขาในหน้าตั้งค่าของแอป (`kpi_settings.line_cfg` · รายชื่อกลุ่มอ่านจาก `line_groups` **อ่านอย่างเดียว**) · กันส่งซ้ำด้วยตาราง `kpi_line_log` — ดู `kpi/CLAUDE.md`
- เทสอยู่ `kpi/test/` (`npm run check` + `npm test` ต้อง ALL PASSED ก่อนส่ง)
- แท็บเล็ตที่ยังชี้ URL เดิมของ repo JJ-KPI จะไม่ได้อัพเดตจาก repo นี้ — ต้องเปลี่ยนมาใช้ URL ใหม่

## ระบบเงินเดือน (JJ-Payroll)

- แอปคือ `jjmk-payroll.html` ที่ root เหมือนแอปอื่น (ย้ายมาจาก repo `thananant/JJ-Payroll` 2026-09-06) · ไฟล์ประกอบ (worker/tools/docs/logo) อยู่โฟลเดอร์ `jjmk-payroll/` — **อ่าน `jjmk-payroll/CLAUDE.md` ก่อนแก้ทุกครั้ง** (กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม)
- แอปเปิดที่ https://thananant.github.io/JJ-PnL/jjmk-payroll.html — **ต้องล็อกอิน** (บัญชี `pnl_users` ชุดเดียวกับ P&L/Social) · ทุกการแก้ข้อมูลถูกจดใน `payroll_audit` ดูที่หน้า "🕘 ประวัติการทำรายการ"
- ฐานข้อมูล Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd` (ตาราง employees/punches/adjustments/advances/... ดู `jjmk-payroll/docs/JJ-Payroll-Summary.md`)
- **งวดเงินเดือน = 26 เดือนก่อน → 25 เดือนนี้ (ไม่ตรงเดือนปฏิทิน)** — เวลาเอาค่าแรงเข้า PnL ต้องตกลงวิธีแบ่งก่อน · จุดเชื่อม Payroll↔PnL ดูข้อ 8 ใน `jjmk-payroll/docs/JJ-Payroll-Summary.md`
- `jjmk-payroll/worker.js` deploy ผ่าน Cloudflare dashboard (ไม่ใช่ GitHub) — เครื่องสแกน/รายงาน LINE ชี้ที่ Worker เดิม ไม่เกี่ยวกับการย้าย repo
- **🎂 แจ้งวันเกิดเข้ากลุ่มไลน์ daily report (เจ้าของสั่ง 2026-10-15)**: วันที่ 1 ทุกเดือน ส่งว่าเดือนนั้นใครเกิดบ้าง กี่คน วันไหน (+ เช้าวันเกิด เปิดเองได้) ·
  ฐานข้อมูลส่งเอง (`pg_cron` → `payroll_line_tick()` → `line-order` · บอทเดียวกับรายงานเข้างาน) · **ต้องรัน `jjmk-payroll/jj_birthday_line.sql` (branch `sql`)** ·
  เลือกกลุ่ม/เวลาที่แอปเงินเดือน → ⚙️ ตั้งค่า → การ์ด 🎂 · realtime ของ log ต้องอยู่**ช่องแยก** (`jjmk-bday`) ห้ามใส่ใน `jjmk-live` — ดู `jjmk-payroll/CLAUDE.md` หัวข้อ 🎂

## ระบบฟังเสียงลูกค้า (JJ Social) — **อ่าน `docs/social.md` ก่อนแก้ทุกครั้ง**

- แอป `jjmk-social.html` · ตาราง prefix `social_` · ล็อกอิน `pnl_users` · Edge Functions `social-brain`/`social-webhook` วางใน Dashboard (webhook ปิด Verify JWT) · โค้ดฝังในแอป (`#fnBrain`/`#fnWebhook`) **แก้ .ts ต้องเลื่อน `VERSION` + ฝังใหม่ทุกครั้ง**
- secrets LINE ของระบบนี้ = `LINE_CHANNEL_SECRET`/`LINE_CHANNEL_ACCESS_TOKEN` — **คนละตัวกับ `LINE_TOKEN` ของระบบอื่น ห้ามใช้ปน**
- กติกาห้ามเปลี่ยน: โหมดฟรี `ai_mode='free'` ไม่เรียก Claude · Places ดึงได้ทุก 3 ชม. · `maskPII` ก่อนส่ง Gemini · โค้ด AI ต้องเหมือนกันทั้ง 2 ไฟล์ .ts · สถานะที่คนนอกห้ามปลอมเก็บ `social_sys` เท่านั้น · Apify กันเงินเกิน (`maxTotalChargeUsd`/งบ/เพดานนับจากบัญชี Apify) ห้ามตัด · ห้ามเก็บ token จริงในตาราง/localStorage · LINE ส่งผ่าน `line-order` เท่านั้น · ทุกท่อนข้อความ LINE ผ่าน `lineTxt()` · ปุ่มใช้ `data-pv`/`data-pk` ห้าม `data-v` · ลิงก์ผ่าน `safeUrl()`
- `privacy.html` = นโยบายสาธารณะสำหรับ Google Auth Platform **ห้ามย้ายไปหลังหน้าล็อกอิน**

## ระบบปฏิทินองค์กร (JJ Calendar) + 🎌 วันพิเศษกลาง — **อ่าน `docs/calendar.md` ก่อนแก้**

- แอป `jjmk-calendar.html` · ตาราง `cal_*` (SQL `jjmk-calendar.sql`, `jjmk-calendar-realtime.sql`, `jjmk-calendar-days.sql` branch `sql`) · ฟีดมือถือ Edge Function `cal-feed` (ปิด Verify JWT · โค้ดฝังในแอป `#feedCode` ต้องตรงกับ `cal-feed.ts` ใน branch `sql`) · `fold()` พับตามไบต์ 74 ด้วย `for...of`
- ⚠️ **ห้ามเขียนไฟล์โค้ดที่มีแบ็กสแลชด้วย bash heredoc** (สภาพแวดล้อมกลืน `\\;`) — ใช้ python/Write แล้วตรวจด้วย `od -c`
- 🎌 วันพิเศษ = `cal_special_days` 3 ปฏิทิน (`kind` office/pay/order · 1 แถว = 1 ปฏิทิน) · วันที่เป็นคอลัมน์ `date` ห้ามแปลงผ่าน `new Date(str)` ใช้ `sdAdd()` · 🏢/💰 มีผลกับเงินเดือนเมื่อกด ✅ ยืนยันในระบบเงินเดือนเท่านั้น (`pay_status`) · แก้แล้วกลับเป็น `pending` · ลง/แก้ได้เฉพาะ `isBoss()` · ปุ่มในฟอร์มใช้ `data-sv` ห้าม `data-v` · fail-soft ถ้ายังไม่รัน SQL

## 🏪 ทะเบียนสาขากลาง + ปุ่มเปิดสาขาใหม่ทุกระบบ (2026-10-15) — **อ่าน `docs/branches.md` ก่อนแก้**

- ทะเบียน = `pnl_branches` (+ ช่องจาก `jjmk-branches.sql`) · บล็อก `JJBR` (`<!-- JJBR-BEGIN … JJBR-END -->`) ใน 15 ไฟล์ **เหมือนกันทุกไบต์ — แก้ที่ต้นแบบแล้ว sync ด้วยสคริปต์ ห้ามแก้มือ**
- กติกาทุกแอป: สาขาเดิม (JJRD/JJLP/JJCK/OFFICE/JJOF) ชื่อ/สี/ลำดับ/สูตรเหมือนเดิม แอปเติมเฉพาะสาขาใหม่ (`JJBR.extra`) · ทะเบียนอ่านไม่ได้ = พฤติกรรมเดิม · `_br` fail closed · ห้ามรอทะเบียนจนล็อกอินช้า
- ปุ่มเดียว = JJ Access แท็บ 🏪 → RPC `jj_branch_open` (ยกเลิก `jj_branch_undo` เฉพาะยังไม่มีข้อมูลจริง)

## ระบบล็อกอินกลาง (SSO) · JJ Login · JJ Gate · สมัคร/ลืมรหัส/ออกงาน/ย้อนสิทธิ์ · ระดับ/สังกัด — **อ่าน `docs/access.md` ก่อนแก้**

- ล็อกอินที่ `index.html` ที่เดียว → `spreadSession`/`clearSession` แจกใบผ่านทุกคีย์ (**เพิ่มแอปใหม่ต้องเพิ่มคีย์**) · "ติ๊กแอปไหนให้ ก็เห็นแอปนั้น" ไม่มีข้อยกเว้น · `apps` ว่าง/เช็คสิทธิ์ไม่ได้ = เห็นทุกแอป · ไม่ล็อกอิน = หน้าล็อกอินเต็มจอ (ไม่มีปุ่ม "ดูแอพทั้งหมด" · `index.html` ล้าง `jjhub_skip` **ห้ามเอาออก**)
- ทุกแอปใช้ `pnl_users` ชุดเดียว (`pwHash` salt `JJPNL`) · `isBoss(u)` = admin หรือ owner **ห้ามเช็ค `role==='admin'` ตรง ๆ** · `userReady(u)` = `active!==false && (status==null||status==='active')` **ห้ามตัด** · ครัวกลาง/ซ่อมบำรุงต้องรัน SQL เปิดสิทธิ์ anon (`jjmk_kitchen_central.sql`/`jjmk_maint_access.sql`)
- **JJ Login** = บล็อก `window.JJLogin` ใน 14 ไฟล์ · **JJ Gate** = บล็อก `window.JJGate` ใน 8 ไฟล์ — เหมือนกันทุกไฟล์ต่างแค่ `var APP=` · **sync ด้วยสคริปต์ ห้ามแก้มือ** · เปิด URL ตรง = ใส่รหัสใหม่เสมอ · ล็อกอินสำเร็จต้อง `JJGate.grant()` · เช็คบัญชีกับ DB ไม่ได้ = ไม่ปล่อยเข้า · kiosk ของ KPI ไม่ต้องล็อกอิน
- ⚠️ **JJ Login เคยหายจากการเขียนทับไฟล์ 5 ครั้ง** → `git fetch`+rebase บน `origin/main` ก่อน commit และรัน `node tests/precheck.mjs` ทุกครั้ง (กู้: `git diff 2266081^ 2266081 -- <ไฟล์> | git apply --3way`)
- เห็นเฉพาะสาขา: `pnl_users.apps.<แอป>._br` (`BR_SCOPED` ใน jjmk-admin) · admin/owner ทุกสาขาเสมอ · fail closed · โค้ดที่ไล่ `apps.<แอป>` ข้ามคีย์ขึ้นต้น `_`
- สมัครพนักงาน (`jjmk-signup.sql` · อายุคิดจาก `birth_date`) · ลืมรหัส 6 หลักเข้ากลุ่ม LINE ผ่าน Edge Function `signup-notify` (secret `LINE_TOKEN` · ไอดีกลุ่ม `pnl_settings.line_group_id` · **ห้ามเก็บ token ใน `pnl_settings`** · `RQ_MIN`=`RESET_MIN` · เขียนคำขอแบบ CAS ห้ามอ่าน→ทับ · ห้ามแปลงชื่อผู้ใช้เป็นตัวเล็ก · โค้ด .ts วางใน Edge Functions เท่านั้น ชี้ไปปุ่ม 📋 ในแอป) · ลาออก = `active=false` ไม่ลบ (ใบสมัครห้ามมีปุ่มรับกลับ) · ย้อนสิทธิ์ (`jjmk-access-undo.sql` · โค้ดแก้ `pnl_users` ต้องส่ง snap)
- `role`/`unit` มี CHECK constraint · `.prow` ใน jjmk-admin ห้ามตั้งคลาสซ้ำ

## ระบบออกใบกำกับภาษี (JJ Invoice) — **อ่าน `docs/invoice.md` ก่อนแก้**

- ไม่มีไฟล์ PDF ใน Supabase (ยกเว้นลายเซ็น 1 รูปใน `inv_settings`) · PDF เก็บโดย NAS ดึงเอง (`jjmk-invoice/inv_nas_sync.py` ทุก 5 นาที · `nas_path` ว่าง = คิว · PATCH มีเงื่อนไข `updated_at`) / โฟลเดอร์ผูกเครื่อง / ดาวน์โหลด · โครง `<สาขา>/<MMYYYY>/<BILLNO>.pdf` ยกเลิกอยู่ `ยกเลิก/` · 1 บิล = 1 ไฟล์ · สคริปต์รันเป็น root วางในโฟลเดอร์ที่เฉพาะ admin เขียนได้
- **ตัวเลขใน PDF ของ NAS ต้องตรงกับแอปทุกหลัก** (แก้สูตรเงิน/หน้าตาบิลในแอปต้องแก้สคริปต์ · `SHOP`=`CONFIG.SHOP`) · แก้สคริปต์ต้องเลื่อน `SCRIPT_VER` (แอปเทียบ `NAS_SIG_MIN`/`NAS_HEAD_VER` ด้วย `gasVerCmp` ห้ามเทียบสตริง)
- ลายเซ็นกลาง `inv_settings.signature/_at/_by` · ตรวจ `sigValid`+`sigDecodes` · `sigMeta.src==='unknown'` ห้ามโชว์ปุ่ม ⬆ · `sigEnsureFresh` ก่อนสร้าง PDF ทุกครั้ง · เทียบลายเซ็นด้วย `sigSameLook` ห้ามเฉลี่ยทั้งภาพ
- เลขบิล: `syncCounterWithBills` **ห้ามตัด** · แก้บิลย้ายสาขาไม่ได้ · ทุกการเขียน `inv_invoices` ผ่าน `freshInv()`+`invRow()` (**`.eq('bill_no',…)` อย่างเดียว = บั๊ก**) · `withNote()` ห้ามทับทั้งช่อง · เลขชนแก้ด้วย 🔧 เท่านั้น ห้ามแนะนำให้ยกเลิกบิล · ไฟล์นำเข้ามีข้อมูลลูกค้า **ห้าม commit**
- แท็บ: 1 บิล = 1 แท็บ · บิลระบบเดิมส่งไม่สำเร็จ = `isLegacyClosed` (เหมือนกันใน office `invLegacy`) · ป้าย 📬 เฉพาะ "ส่งไม่สำเร็จ" · อีเมล Apps Script: แก้โค้ดเลื่อน `var VERSION` · `gasSend` ลองซ้ำ 3 ครั้ง **ห้ามฟันธงว่า URL ผิด** · "กำลังส่ง→ส่งถึง" ทำโดย trigger `checkBounces`

## 🆕 ครัวกลาง v2 (`jjmk-kitchen.html` · รื้อใหม่ 2026-10-16/17) — **อ่าน `docs/kitchen-v2.md` + `jjmk-kitchen/src/SPEC.md` + `CONTRACT.md` ก่อนแก้**

- ต้นฉบับ `jjmk-kitchen/src/shell.html` + `mod_<แท็บ>.js` (15 แท็บ · 📦 สต๊อกสินค้า `pstock` อ่านอย่างเดียว · 📏 หน่วย `units` = ที่เดียวที่จัดการหน่วยเพิ่มเติม `cfg.units` — ⚙️ ตั้งค่าห้ามเขียน units · 2026-10-18) → `node jjmk-kitchen/src/build.mjs` **ห้ามแก้ไฟล์ที่ build** · บล็อก JJ Login/JJBR ใน shell byte-identical กับแอปอื่น (PTR ของครัวกลางต่างได้ — จงใจ) · SQL `jjmk_kitchen2.sql` (branch `sql` · รุ่นล่าสุดมี `ck_recipes.max_qty`) · ตารางงาน `kc_*` · ทุกการเปลี่ยนยอดผ่าน `pushMoves` · `ck_add_qty` ปัด 4 ตำแหน่ง
- **ต้นทุนจริง = กติกาเจ้าของ**: รับของ → `last_price`/`avg_cost` · ผลิต = Σ(ใช้จริง+เศษทิ้ง)×avg_cost + ค่าแฝง + extra_cost · ราคาบิลสาขา = avg_cost×(1+markup%) · เศษ = ของเสีย · ค่าแฝงใส่รายเดือนในบัญชี
- ออเดอร์สาขา = `stock_receipts` ที่แอพนับเขียน (**ไม่มีคอลัมน์ `id`**) · ตัวคิดเดียว `sdCalcGroups()` ใช้ร่วม ☀️/🍳/🚚 **ห้ามเขียนสูตรซ้ำ** · อ่านข้อมูลได้ครึ่งเดียว = ห้ามคิด/ห้ามเขียน · ไม่มีราคา = ส่งไม่ได้ · เช็คสต๊อกสดก่อน/หลังยืนยัน · 🍳 ต้อง select `note` ของ `kc_deliveries` · **ออเดอร์ครัวกลาง = ชื่อซัพ "มีคำ" ใน `ck_sup_names` (ของจริง = "จริงใจครัวกลาง") หรือชื่อสินค้าตรงเมนู (`sdIsKitchenRow` · 2026-10-18)** · ไม่มีการ์ด = `sdWhyEmpty` บอกสาเหตุ (แอพนับบันทึกออเดอร์เฉพาะตอน 📤 ส่งผ่านบอทสำเร็จ) · **ออเดอร์ที่ผ่านไปแล้วไม่ขึ้น: `order_lookback_days` เพดาน 1 วัน** (เมื่อวาน=ส่งวันนี้ + วันนี้ · 2026-10-18) · ผูกชื่อสินค้าสาขา↔เมนูทั้งหมด = 🚚 ปุ่ม 🔗 ผูกเมนู (`sdLinksOpen` · อ่าน `products` อย่างเดียว · เขียนแค่ `kc_links`)
- 2026-10-17 (PR #146): 📥 รับของแบบแตะรูป (ไม่มีช่องเลขบิล · `bill_no` null) · 📝 วิธีทำแบบขั้นตอน (`methodSteps` สูตรระบบเดิม) · 🎯 Safety/Max รายสินค้า (`mnTargetCalc` สูตรเดียว · fail-soft `S.kcMax`) · 🚚 ➕ ส่งเพิ่ม (note 'สาขาเรียกของเพิ่ม' · ไม่หักออเดอร์แอพนับ · ส่งไม่ครบ = ค้างในการ์ด ✋) · ☀️ การ์ด 📥 · 📜 ชิปเปลี่ยนสี · ชิปทุกหน้าใช้ `pillReveal` · picker ที่เปิดทับฟอร์มต้องตั้ง `MODAL_BACK` · onclick ที่มี id จาก DB ใช้ `data-id` · ยังไม่ตัดสิน: ลำดับการ์ด 📥 ในหน้าวันนี้ · ร่างเรียกเพิ่มข้ามวัน
- แอปอื่นอ่านครัวกลาง: P&L `RENDER.ck` · Office `chkKitchen` (fail-soft) · เทส Playwright อยู่ `scratchpad/k2` ของ session (รันด้วย `K2_BUILT=<ไฟล์ที่ build>` · `sbstub2.js` ตัดคอลัมน์ตาม select)
- ครัวกลาง↔นับสต๊อก: v2 ไม่พอร์ตสูตร `orderPlan` แล้ว (บล็อก `SPD`/`brRow` เหลือเฉพาะแอพนับ) · สูตรสั่งของ/ซัพ "สั่งทุก N วัน"/`order_ahead`/`prepay` ดู docs
- **ครัวกลางรุ่นเก่า** (ก่อน v2): ประวัติ + กติกาเจ้าของที่ยังใช้ (คำง่ายบนจอ · 6 ขั้นหน้าวันนี้ · หน้าตาแบบแอพนับ · ของหวาน SQL ลับไม่ push · วิธีทำ `#`/`*` · แผนก/หน่วยนับ/ไม่ใช้แล้ว) อยู่ `docs/kitchen-v1-history.md`

## นับสต๊อกใหม่ (`jjmk-stockcheck.html`) แทนแอพนับเดิม (2026-10-15) — **อ่าน `docs/stockcheck.md` ก่อนแก้**

- ใช้ตาราง `products/suppliers/stock_counts/stock_receipts` ชุดเดียวกับแอพเดิม · รอบสั่งซัพโหมด "สั่งทุก N วัน" · ➕ เพิ่มสินค้า/ถังขยะ · คำแปลมือ `products.i18n` ชนะกูเกิล **ห้ามเขียนลง `sc_i18n`** · บัญชี `sc_users` ไม่ย้าย
- ถ้าจะเลิกแอพเดิม ห้ามลบ: โปรเจกต์ Supabase · แถว `branches` (cascade) · LINE token/webhook · Edge Functions/cron · bucket · สคริปต์สำรอง NAS

## ออฟฟิศ AI (JJ Office · `jjmk-office.html`) — **อ่าน `docs/office.md` ก่อนแก้**

- ฉาก 3 มิติ Three.js r128 (ตกไป 2 มิติถ้าไม่มี WebGL) · 9 ห้อง = 9 agent อ่านข้อมูลจริง**อ่านอย่างเดียว** (`chkPnl` … `chkCalendar`) **ห้ามเขียนตารางของระบบอื่น** · fail-soft ต่อห้อง · ห้องเห็นตามสิทธิ์ของแอปนั้น + `_br`
- สูตรลอกจากแอปต้นทาง (แก้ต้นทางต้องเช็คที่นี่): `hasIncData` · `isStuck`/`nasSyncActive` · `recomputeAll` · `waiting` · `maintStat` · `SD_PRESET` · `invLegacy` · `chkKitchen` อ่าน `kc_*`

## กติกา UX ทุกแอป — รีเฟรชอยู่หน้าเดิม · หน้าจอมือถือ — **อ่าน `docs/ux-mobile.md` ก่อนแก้หน้าจอ**

- รีเฟรช/ลากลง = กลับหน้าเดิม (จำแท็บใน `localStorage` `jj<ระบบ>_tab` และ validate) · meta no-cache ทุกแอป · ลากหน้าลง = รีเฟรช ทุกแอป (ค้น `ลากหน้าลง = รีเฟรช` · kiosk KPI ปิดไว้ **ห้ามตัด** · ฟอร์มยาวต้องเก็บร่างใน localStorage)
- มือถือ: หัวแอป/แถบติดจอเว้น `env(safe-area-inset-*)` แบบ `calc(เดิม + env())` · ช่องกรอก ≥16px · ปุ่ม ≥44px · ไม่เลื่อนข้าง (วัดเทียบ `documentElement.clientWidth` ไม่ใช่ `innerWidth`) · ตารางเป็นการ์ดที่ ≤560px (`class="mc"`) · `overscroll-behavior-y:contain` · PDF บนมือถือให้ดาวน์โหลด
- ชุดโทรศัพท์ที่ต้องผ่าน 15 รุ่น + วิธีจำลอง safe-area ใน Playwright อยู่ใน docs และ `node tests/mobile/mobile-check.mjs --all`

## 🧪 ตัวตรวจกลาง + เทสใน repo (เจ้าของสั่ง 2026-10-17 — ทำ skill A1–A3)

- **ก่อน commit ทุกครั้ง: `node tests/precheck.mjs`** (ก่อนเปิด PR ใช้ `--remote`) — ตรวจทุกอย่างที่ CLAUDE.md บอกว่า "ต้องเหมือนกัน/ห้ามหาย": JJ Login 14 ไฟล์ · JJ Gate · JJBR · SPD · ล็อกอินนับสต๊อก · ไม่มี `.sql` · no-cache · syntax ทุก `<script>` · `RQ_MIN`/`RESET_MIN` · Social brain=webhook · `SCRIPT_VER` NAS · ครัวกลาง v2 ตรงกับ src · โค้ด Edge Function ที่ฝัง = branch `sql`/Social
  (แทนคำสั่ง `for f in … grep -c` ด้านล่าง — ยังใช้ได้แต่ตรวจน้อยกว่า) · **ห้าม commit ถ้ามี ✗**
- **แก้สูตร → `node tests/unit/run.mjs`** — เทสดึงฟังก์ชันจริงจาก HTML (`tests/unit/lib.mjs` `load()`): ใบกำกับ (รวม**แอป↔`inv_nas_sync.py` ตรงกันทุกหลัก**) · **`orderPlan` นับสต๊อก = `brRow` ครัวกลาง 4,000 สถานการณ์** · สิทธิ์หน้าแรก · KPI · เงินเดือน
  · **เทสใหม่เขียนลง `tests/unit/<ระบบ>.test.mjs` ใน repo — ไม่ใช่ `/tmp`** (ของใน `/tmp` หายเมื่อปิด session)
- **แก้หน้าจอ → `node tests/mobile/mobile-check.mjs`** (`--all` = 15 รุ่นตามกติกาหน้าจอมือถือ · `--app=` · `--shots`) — Playwright + safe-area จริง + Supabase จำลอง (ล็อกอินผู้ใช้ทดสอบเข้าหน้าหลักให้)
  · ผลรอบแรก 2026-10-17: ช่องกรอก/เลือกเล็กกว่า 16px บนโทรศัพท์ (iPhone ซูมเอง) ที่ P&L (เดือน) · เงินเดือน (วันที่) · Social (ช่วงเวลา) · ซ่อมบำรุง (สาขา) · นับสต๊อก (วันที่/ชื่อผู้นับ) — **แก้แล้ว 2026-10-17** (`<style>` ท้าย `<head>` ของแต่ละแอป: `@media (max-width:700px){#id{font-size:16px!important}}` · ผ่านครบ 15 รุ่น)
- วิธีใช้ละเอียดอยู่ใน skill ของ repo: `.claude/skills/jj-precheck` · `jj-mobile-check` · `jj-tests` · session บนคลาวด์ติดตั้งของให้เอง (`.claude/hooks/session-start.sh`)

## กติกาการส่งงาน — ใช้กับ **ทุกระบบ** ใน repo นี้ (P&L · Owner · KPI · Payroll · นับสต๊อก · ซ่อมบำรุง · Kitchen · Social · Invoice · Calendar · Access)

- ไฟล์ที่ต้องรัน/วางบน **Supabase** (SQL, โค้ด Edge Functions) → **แปะเนื้อหาลงในแชทเป็นบล็อกโค้ดเลย** (เจ้าของสั่ง 2026-09-17 หลังลองมาแล้ว 2 แบบ):
  - เจ้าของกดคัดลอกจากบล็อกโค้ดในแชทไปวางใน Supabase SQL Editor ได้ทันที **ไม่ต้องดาวน์โหลด ไม่ต้องกดเปิดไฟล์**
  - ❌ **ห้ามส่งเป็นการ์ดไฟล์ (`SendUserFile`)** — กดแล้วเด้งหน้าต่างเซฟลงเครื่อง เสียเวลา
  - ยังเขียนไฟล์ลงโฟลเดอร์ `sql/` ไว้ด้วย (อยู่ใน `.gitignore`) แล้วบอก path สั้น ๆ ไว้ท้ายข้อความ เผื่อเจ้าของอยากเปิดดูในแผงขวา — แต่**เนื้อหาต้องอยู่ในแชทเสมอ**
  - **ยังต้อง push เก็บที่ branch `sql` ทุกครั้ง** ตามกติกา repo ข้อแรก (ของ payroll ไปโฟลเดอร์ `jjmk-payroll/` ของ branch นั้น)
  - ถ้าไฟล์ยาวมากจนแปะทั้งก้อนไม่ไหว ให้แบ่งเป็นส่วน ๆ แล้วแปะต่อกันในข้อความเดียว — ห้ามให้เจ้าของไปตามหาเอง
  - โค้ดยาว ๆ ที่เจ้าของต้องเอาไปวางที่อื่น (Apps Script, Cloudflare Worker) ใช้หลักเดียวกัน — แปะในแชท หรือทำปุ่มคัดลอกในแอป
- ไฟล์ที่ขึ้น **GitHub** (แอป HTML ฯลฯ) → **push ขึ้น main ให้เองเลย** ไม่ต้องส่งในแชท ไม่ต้องถามยืนยัน
