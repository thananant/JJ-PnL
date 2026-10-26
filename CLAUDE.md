# JJ-PnL — จริงใจหมูกระทะ (บริษัท พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)

แอปหลังบ้านร้านหมูกระทะ (JJLP · JJRD · JJCK ครัวกลาง · OFFICE + สาขาใหม่) · HTML ไฟล์เดียวต่อแอป รันจาก `main` ผ่าน GitHub Pages · รายชื่อแอป `README.md` · **ผู้ใช้สื่อสารภาษาไทย — UI/คำตอบเป็นไทย**

ไฟล์นี้เก็บเฉพาะกติกา "ห้าม/ต้อง" (≤ ~13 KB) · **แก้ระบบไหนอ่าน docs ของระบบนั้นก่อน** · ฉบับเต็มก่อนย่อ: `docs/claude-md-detail.md` · งานใหม่: รายละเอียดลง docs เพิ่มที่นี่ไม่เกิน 1–2 บรรทัด

## วิธีทำงาน (เจ้าของสั่ง 2026-10-20)

- **งานเล็ก (ปุ่ม/ข้อความ/หน้าจอ/เอกสาร) ทำเองคนเดียว ไม่ตั้งทีมตรวจ/workflow** — ทีมตรวจเฉพาะงานที่แตะเงิน (เงินเดือน · บิล/ใบกำกับ · ต้นทุน/ราคา · บัญชี)
- เจ้าของรวมคำสั่งเล็ก ๆ ส่งทีเดียว · ไม่รายงานความคืบหน้าถ้าไม่จำเป็น · ตอบสั้น
- แก้เสร็จ+ตรวจผ่าน → เปิด PR + merge เองเลย **ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — ถามก่อน**

## กติกา repo + ตรวจก่อนส่ง

- **ห้ามมี `.sql` บน main/branch งาน** — อยู่ branch `sql` เท่านั้น (payroll ใน `jjmk-payroll/` · KPI `jjmk-kpi.sql`) · SQL ให้เจ้าของรัน → **แปะในแชทเป็นบล็อกโค้ด ห้าม `SendUserFile`** · เขียนลง `sql/` (gitignored) + push branch `sql` ด้วยทุกครั้ง
- **SQL ที่สร้างตาราง/วิวใหม่ต้องมี `grant` ให้ anon/authenticated/service_role เอง** (Supabase เลิกเปิดให้อัตโนมัติ 2026-10-30) — ใช้บล็อก `JJ-GRANTS` ท้ายไฟล์ · precheck ตรวจให้
- โค้ด Edge Function/Apps Script/Worker → ปุ่ม 📋 ในแอปหรือแปะในแชท **ไม่ปนกับ SQL** · `.ts` วางที่ Edge Functions เท่านั้น
- **ห้ามเขียนไฟล์โค้ดที่มีแบ็กสแลชด้วย bash heredoc** (ใช้ python/Write แล้ว `od -c`) · ไฟล์ข้อมูลลูกค้า/สูตรลับ **ห้าม commit** (repo public)
- ก่อน commit: `git fetch` + rebase `origin/main` (JJ Login เคยหายจากการเขียนทับ 5 ครั้ง · กู้ `git diff 2266081^ 2266081 -- <ไฟล์> | git apply --3way`) + **`node tests/precheck.mjs` ห้ามมี ✗** (ก่อน PR `--remote`)
- แก้สูตร → `node tests/unit/run.mjs` · แก้หน้าจอ → `node tests/mobile/mobile-check.mjs` · เทสใหม่ลง `tests/unit/` **ไม่ใช่ `/tmp`** · ดู skill `jj-precheck` `jj-tests` `jj-mobile-check`

## UX ทุกแอป — `docs/ux-mobile.md`

- รีเฟรช/ลากลง = อยู่หน้าเดิม (`jj<ระบบ>_tab` + validate) · meta no-cache · ลากหน้าลง = รีเฟรช (**kiosk KPI ปิดไว้ ห้ามตัด**) · ฟอร์มยาวเก็บร่าง
- บล็อก **JJ-DRAGCLICK** (ลากไฮไลต์ออกนอกกรอบแล้วหน้าต่างไม่เด้งปิด) ทุกหน้าแอป เหมือนกันทุกไบต์ · แอปใหม่ต้องใส่ก่อน `</head>`
- มือถือ: ช่องกรอก ≥16px · ปุ่ม ≥44px · ไม่เลื่อนข้าง (วัด `documentElement.clientWidth`) · แถบติดจอ `calc(เดิม + env(safe-area-inset-*))` · ตารางเป็นการ์ดที่ ≤560px

## ล็อกอิน/สิทธิ์/สาขา — `docs/access.md` · `docs/branches.md`

- ล็อกอินที่ `index.html` → `spreadSession`/`clearSession` (**แอปใหม่ต้องเพิ่มคีย์**) · ติ๊กแอปไหนเห็นแอปนั้น · `apps` ว่าง/เช็คไม่ได้ = เห็นทุกแอป · ล้าง `jjhub_skip` **ห้ามเอาออก**
- `pnl_users` ชุดเดียว (`pwHash` salt `JJPNL`) · `isBoss(u)` **ห้ามเช็ค `role==='admin'` ตรง ๆ** · `userReady(u)` **ห้ามตัด** · ลาออก = `active=false` ไม่ลบ · โค้ดแก้ `pnl_users` ต้องส่ง snap
- บล็อก **JJ Login** (15) · **JJ Gate** (9) · **JJBR** (16 ไฟล์) เหมือนกันทุกไบต์ **sync ด้วยสคริปต์ ห้ามแก้มือ** · URL ตรง = ใส่รหัสใหม่ · สำเร็จต้อง `JJGate.grant()` · เช็คบัญชีไม่ได้ = ไม่ปล่อยเข้า
- `_br` เห็นเฉพาะสาขา **fail closed** · admin/owner ทุกสาขา · ไล่ `apps.<แอป>` ข้ามคีย์ `_` · สาขาเดิมชื่อ/สี/สูตรห้ามเปลี่ยน แอปเติมเฉพาะ `JJBR.extra` · ห้ามรอทะเบียนจนล็อกอินช้า
- ลืมรหัส (`signup-notify`): **ห้ามเก็บ token ใน `pnl_settings`** · `RQ_MIN`=`RESET_MIN` · เขียนแบบ CAS · ห้ามแปลงชื่อผู้ใช้เป็นตัวเล็ก

## รายระบบ (อ่าน docs ก่อนแก้)

- **KPI** `kpi/CLAUDE.md`: ตาราง `kpi_*` เท่านั้น · **จอลูกค้าโชว์เฉพาะคนสแกนเข้างานอยู่ — เช็คไม่ได้ = ข้ามคำถามชมพนักงาน** · พนักงาน/สแกนอ่านอย่างเดียว · เทส `kpi/test`
- **เงินเดือน** `jjmk-payroll/CLAUDE.md`: **กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม** · งวด 26→25 · `worker.js` deploy ที่ Cloudflare · เครื่องสแกน `jjmk-payroll/docs/add-scanner.md` · realtime ตารางใหม่ห้ามใส่ `jjmk-live` · `#org` กะ = `detectShift` สแกนจริง 14 วัน ห้ามใช้ `shiftId` · เงินประกัน 3,000/300 ตั้งแต่ 2026-10 (งวดก่อนใช้ `_v1`) · งวดที่จ่ายแล้วต้อง 🔒 ปิดยอด (≥ ต.ค. ระบบ 🔒 เองวันจ่ายเฉพาะหน้าร้าน + คนที่งวดก่อน ต.ค. 🔒 ครบ `payDayLock` · ออฟฟิศกด 🔒/K BIZ งวดถัดไป · ห้าม upsert ทับแถว 🔒/💸/🏦 `lock*`/`refund`/`xfer:*` · โค้ดที่แก้ยอดงวดที่จ่ายแล้วเรียก `depPaidGuard`) · เงินสำรองเลี้ยงชีพ `pvd_*` realtime ช่องแยก · ห้ามหักย้อนงวดที่จ่ายแล้ว · ห้ามเรียก `depPeriods()`/`allPeriods()` ในลูปต่อคน
  · **🔒 ปิดงวด** (`jj_pay_close.sql`): จอที่ออก/แสดงเงินของงวดใช้ `payOf`/`payIn`/`empAt` (ห้าม `calcPay` ตรง) · ฉบับปิดแก้/ลบไม่ได้ · ไม่ปิดอัตโนมัติ (รัน SQL แล้ว `payDayLock` ไม่ทำงาน) · ปิดได้หลังวันจ่ายเท่านั้น · สิทธิ์ `apps.payroll._close` (JJ Access `APP_XF` ต้องตรงกับแอป)
- **Social** `docs/social.md`: แก้ .ts เลื่อน `VERSION` + ฝังใหม่ · `LINE_CHANNEL_*` ห้ามปน `LINE_TOKEN` · `ai_mode='free'` ไม่เรียก Claude · `maskPII` ก่อน Gemini · สถานะห้ามปลอมเก็บ `social_sys` · Apify กันเงินเกินห้ามตัด · Places ถี่สุดทุก 3 ชม. · ห้ามเก็บ token จริงในตาราง/localStorage · LINE ผ่าน `line-order`+`lineTxt()` · ปุ่มห้าม `data-v` · `privacy.html` ห้ามอยู่หลังล็อกอิน
- **ปฏิทิน** `docs/calendar.md`: `#feedCode` = `cal-feed.ts` (branch `sql`) · `fold()` ตามไบต์ · วันพิเศษ `date` ห้าม `new Date(str)` ใช้ `sdAdd()` · มีผลกับเงินเดือนเมื่อกด ✅ ที่เงินเดือนเท่านั้น · ปุ่มฟอร์ม `data-sv`
- **ใบกำกับ** `docs/invoice.md`: **PDF ของ NAS ต้องตรงแอปทุกหลัก** (แก้สูตร/หน้าตาต้องแก้ `inv_nas_sync.py` + `SCRIPT_VER`) · `syncCounterWithBills` ห้ามตัด · เขียนผ่าน `freshInv()`+`invRow()` (**`.eq('bill_no')` อย่างเดียว = บั๊ก**) · `withNote()` ห้ามทับทั้งช่อง · เลขชนแก้ด้วย 🔧 ห้ามแนะนำยกเลิกบิล · `gasSend` ห้ามฟันธงว่า URL ผิด · 🖨 พิมพ์ = หน้าบิล HTML ตัวเดียวกับ PDF (`buildSheetNode` `{noSig}`) เรียก `print()` ในการกดเลือกทันที
- **ครัวกลาง v2** `docs/kitchen-v2.md` + `jjmk-kitchen/src/SPEC.md`/`CONTRACT.md`: แก้ที่ `src/` แล้ว `build.mjs` **ห้ามแก้ไฟล์ที่ build** · ยอดผ่าน `pushMoves` · ต้นทุนตามกติกาเจ้าของใน docs · `stock_receipts` ไม่มี `id` · ตัวคิดเดียว `sdCalcGroups()` ห้ามเขียนสูตรซ้ำ · ข้อมูลไม่ครบ = ห้ามคิด/เขียน · กติการุ่นเก่าที่ยังใช้ `docs/kitchen-v1-history.md`
- **นับสต๊อก** `docs/stockcheck.md`: คำแปลมือ `products.i18n` **ห้ามเขียนลง `sc_i18n`** · `supSave` ห้ามส่งค่าตั้งต้นทับของที่ไม่ได้อ่าน · เลิกแอพเดิมห้ามลบโปรเจกต์/แถว `branches`/LINE/Edge Functions/สคริปต์ NAS
- **แพ้อาหาร** `docs/allergy.md`: ตาราง `alg_*` · **✅ ทานได้ เฉพาะเมื่อทุกสิ่งที่เลือก "ยืนยันไม่มี" (`none`) หรือยืนยันทั้งรายการ — มี ? = ❔** · ตัวตัดสินเดียว `algClassify()` (เทส `tests/unit/allergy.test.mjs`) · สินค้านับสต๊อก/ครัวกลาง/เมนู QR อ่านอย่างเดียว (นำเข้าชื่อ) · CSV นำกลับ: ค่าอ่านไม่ออก = ข้ามแถว · แก้ล่าสุดไม่ตรง = ไม่ทับ · ไม่ลบแถวที่หายจากไฟล์
- **ออฟฟิศ AI** `docs/office.md`: อ่านระบบอื่น**อย่างเดียว ห้ามเขียนตารางระบบอื่น** · fail-soft ต่อห้อง · สูตรลอกจากต้นทาง (แก้ต้นทางต้องเช็คที่นี่)
