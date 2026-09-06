# JJ-Payroll — ระบบเงินเดือน จริงใจหมูกระทะ

คู่มือบริบทสำหรับ Claude Code — อ่านไฟล์นี้ก่อนแก้อะไรทุกครั้ง

> **ย้ายบ้านแล้ว (2026-09-06)**: โค้ดทั้งหมดย้ายจาก repo `thananant/JJ-Payroll` มาอยู่ที่ `payroll/` ใน repo `thananant/JJ-PnL` · ไฟล์ SQL อยู่ที่ **branch `sql` โฟลเดอร์ `payroll/`** (กติกา JJ-PnL: ห้ามมี `.sql` บน main) · ฐานข้อมูล Supabase / Cloudflare Worker / เครื่องสแกน ใช้ของเดิมทั้งหมด ไม่ต้องย้าย

## ภาพรวมระบบ

- **แอปหลัก**: `payroll/index.html` ไฟล์เดียวจบ (HTML + CSS + JS inline ~380KB) — deploy บน **GitHub Pages** ของ repo `JJ-PnL`: `https://thananant.github.io/JJ-PnL/payroll/` (URL เดิม `thananant.github.io/JJ-Payroll` ยังใช้ได้จนกว่าเจ้าของจะปิด repo เก่า — ถ้าปิดต้องแจ้งผู้จัดการเปลี่ยน bookmark/ไอคอนหน้าจอ)
- **ฐานข้อมูล**: Supabase โปรเจกต์ `aikyxvluaiubdidqxwnd`
  - URL: `https://aikyxvluaiubdidqxwnd.supabase.co`
  - Publishable key (ฝังใน frontend ได้): `sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm`
- **Cloudflare Worker**: `steep-hill-7d52.thananantpatt.workers.dev` (โค้ดคือ `worker.js`)
  - รับข้อมูลเครื่องสแกนหน้า ZKTeco (`/iclock/*`) + Hikvision (`/hik`)
  - ส่งรายงาน LINE: Cron `1 4,8,11 * * *` (รายกะ 11:01/15:01/18:01 ไทย) + `0 14 * * *` (สรุป 21:00 ไทย)
  - ทดสอบมือ: `GET /report/daily?send=1`
  - Secrets อยู่ใน CF dashboard: SUPABASE_URL, SUPABASE_KEY, LINE_TOKEN, LINE_GROUP_ID
- **ผู้ใช้**: เจ้าของร้าน + ผู้จัดการ เปิดจากคอมและ iPhone — ทุกฟีเจอร์ต้องรองรับมือถือ

## ธุรกิจ / กฎเงินเดือน (สำคัญมาก — อย่าเปลี่ยนโดยไม่ถาม)

- **สาขา**: JJLP ลาดพร้าว · JJRD รัชดา · JJCK ครัวกลาง (แยกจากลาดพร้าว 2026-08-12 — ใช้เครื่องสแกนลาดพร้าว ไม่นับข้ามสาขา เหมือน OFFICE) · OFFICE ส่วนกลาง
- **งวดเงินเดือน**: วันที่ 26 เดือนก่อน → 25 เดือนนี้ = "งวดเดือนนี้" · จ่ายวันที่ 5 เดือนถัดไป
  - `periodOf(day)`: วันที่ ≤ 25 อยู่งวดเดือนนั้น, ≥ 26 อยู่งวดเดือนถัดไป
- **จุดตัดวัน (cutoff) = 06:00** — สแกนก่อนตี 6 นับเป็นกะของ "เมื่อวาน" (กะเย็นข้ามคืน)
- **จับกะอัตโนมัติ**: detectShift ถ่วงน้ำหนัก |เข้า-เวลาเริ่ม| + 2×|ออก-เวลาเลิก|
- **กะพิเศษล้างจาน** 11:00-20:00: shiftsFor เทียบ deptOnly กับทั้งแผนกและตำแหน่ง
- **สาย/ออกก่อน**: หักนาทีละ ×1.5 บาท (เกิน grace 5 นาที)
- **ลืมตอกบัตร** (สแกนขาเดียว): ปรับครั้งละ 200
- **กฎห้ามหยุด ศ-ส-อา + วันหยุดพิเศษ**: หยุดโดนหักวันละ **2 เท่าของค่าแรงวัน** (mustPerDay — เจ้าของสั่ง 2026-08-12 เช่น ฐาน 400 → หัก 800 · รายเดือนคิดฐาน ÷30 × 2) · **×2 เริ่ม 2026-07-26 = งวด ส.ค. 2569** (`MUST_X2_START`) ก่อนหน้านั้น ×1 ตามเดิม
  - ยกเว้นอัตโนมัติ (autoMustExempt): สาขา OFFICE, ตำแหน่ง/แผนกมีคำว่า manager|ผู้จัดการ, แผนกมีคำว่า ออฟฟิศ, คนมีวันหยุดประจำสัปดาห์, รายชั่วโมง
- **เบี้ยไม่หยุด**: ไม่ใช้สิทธิ์วันหยุด ได้วันละ 400 · **เบี้ยวันหยุดพิเศษ**: มาทำงานวันหยุดพิเศษได้ตัวคูณ (ต้องไม่สาย/ไม่ออกก่อน/ไม่ลืมตอก)
- **ทิปประจำงวด** (เจ้าของสั่ง 2026-09-01): ปุ่ม 💰 หน้าสรุปเงินเดือน → modal `tipBg` ใส่ยอดทิปรวมต่อสาขาต่องวด (ตาราง `tips`, flag `tipReady`) · หารเท่ากันให้**ทุกคนในสาขาที่มีวันทำงานในงวดและยังทำงานอยู่** — คนพ้นสภาพไม่ได้และไม่นับเป็นตัวหาร (tipCalc/tipHeads — memo `tipMemo` ล้างใน recomputeAll) · **เลือกคนเองได้ต่อสาขา**: ปุ่ม 👥 ในmodal ติ๊กรายคน (tipRenderPick/tipCheckedIds) เก็บใน `tips.member_ids` (csv ของ employee_id · ว่าง = อัตโนมัติ — saveTips เก็บว่างถ้าติ๊กตรงรายชื่ออัตโนมัติพอดี เพื่อให้ตามคนทำงานจริงเสมอ) · โหมดเลือกเองไม่บังคับมีวันทำงาน แต่ยังตัดคนพ้นสภาพ**และคนที่ย้ายสาขาไปแล้ว**ออกจากตัวหาร · isAuto เทียบกับชุดอัตโนมัติ "ตอนเปิด modal" (`tipPick_X.dataset.auto`) กัน realtime เปลี่ยนระหว่างเปิดแล้วล็อกรายชื่อโดยไม่ตั้งใจ · สาขาที่ใส่ยอดแต่ไม่มีใครให้เลือกเลย (พ้นสภาพหมด) = ข้ามสาขานั้นพร้อม toast ไม่บล็อกสาขาอื่น · **เตือนคนพ้นสภาพ** (tipInactiveOf): คนพ้นสภาพที่มีวันทำงานในงวดหรือเคยถูกเลือก โผล่ในรายชื่อเป็นแถวแดง 🚫 ติ๊กไม่ได้ (`data-tipgone`) + แบนเนอร์ในลิสต์ + ท้ายบรรทัด preview/ปุ่ม 👥 + toast ตอน openTips · **เศษสตางค์ปัดลง** Math.floor(pool/n) เศษไม่แจก · บวกเข้ารายรับในสลิป/หน้ารายคน/คอลัมน์เพิ่มอัตโนมัติ · เว้นว่างหรือ 0 = ลบแถว (saveTips)
- **เบิกกลางเดือน**: มีเพดานต่อคน เกินได้แต่ toast เตือน + confirm · **Manager (แผนก/ตำแหน่ง manager|ผู้จัดการ) เพดาน 5,000** คนอื่นตาม adv_max (3,000) · **เงินยืมโหมด mid กันยอดผ่อนงวดนี้ออกจากสิทธิ์เบิก** (advQuota: loanHold — เช่น เพดาน 5,000 ผ่อน 2,000 → เบิกได้ 3,000)
- **ประกันสังคม (สปส.)**: หน้า #sso · ติ๊กรายคน `employees.sso_on` + เลขบัตร `sso_id` (13 หลัก) flag `ssoReady` · เงินสมทบ = ฐานค่าจ้าง clamp [sso_min 1,650, sso_max 15,000] × sso_rate 5% ปัดเศษ ≥50 สต. ขึ้น (ssoCalc — ฐานใช้ p.base ของงวด, base 0 = ไม่หัก) · นายจ้างสมทบเท่ากัน · override รายงวด `sso_entries` (0 = งดหัก, editSso) · ปุ่ม 📤 exportSso = Excel แนว สปส. 1-10 (หัวไฟล์ใช้ sso_account จากตั้งค่า) · ตั้งค่า sso_rate/sso_min/sso_max/sso_account ในหน้าตั้งค่า
- **เงินประกัน**: เป้า 5,000 หักเดือนละ 500 · **เริ่มหักจริงงวด 2026-08 (ส.ค. 2569)** ผ่าน `payroll_settings.dep_start` — ห้ามคิดย้อนหลัง · override รายงวดในตาราง `deposit_entries` · ครบแล้วหยุดเอง
- **พนักงานยืมเงิน (เงินยืมทั่วไป)**: หน้า #loan ตาราง `loans` (unique ต่อคน) + `loan_entries` (override รายงวด) flag `loanReady` · เลือกผ่อน/งวด + จุดหัก `deduct_on`: **mid** = หักจากยอดโอนตอนเบิกกลางเดือน (loanCalc คืน dedMid=min(ผ่อน,ยอดเบิก) — ไฟล์โอน K BIZ โอนสุทธิ = เบิก−ผ่อน · ส่วนที่เบิกไม่พอ dedPay ไปหักในสลิปให้เอง) / **payroll** = หักในสลิปทั้งงวด (dedPay) · calcPay ใช้ p.eloan · ✎ แก้รายงวดเหมือน MOU (editLoan)
- **เงินยืม MOU**: ปกติ 15,000 หักเดือนละ 2,000 พอเหลือ ≤ 3,000 หักหมดงวดสุดท้าย (= 2,000×6 + 3,000) · บริษัทเก็บ Passport+บัตรชมพู คืนเมื่อหักครบเท่านั้น · มีสมุดยืม-คืนเอกสาร (doc_borrows)
- **รายการหักสำเร็จรูป** (ADJ_PRESETS): แต่งตัวผิดระเบียบ 50 · ไม่ใส่เสื้อพนักงาน 200 · เล่นโทรศัพท์ 100 · ไม่เก็บโทรศัพท์ 100 · อื่นๆ บังคับใส่เหตุผล
- **พนักงานใหม่**: default รายเดือน 12,000 ทุกช่องทาง (ฟอร์ม/import/worker — เจ้าของสั่ง 2026-08-12) · worker จดวันเริ่มงาน = วันสแกนแรก (fallback ไม่มีคอลัมน์ก็สร้างได้)
- **วันเริ่มงาน/วันสิ้นสุด** (`employees.start_date/end_date`): รายเดือนที่เริ่มงานหลังเปิดงวด หรือออกก่อนตัดรอบ → งวดนั้นคิดเป็นรายวัน (วันทำงาน × เงินเดือน÷30) · ไม่ได้กรอกวันเริ่มงานใช้วันสแกนแรกแทน (effStart ใน calcPay) · กฎห้ามหยุด+วันหยุดพิเศษนับเฉพาะช่วงที่ยังทำงานอยู่ · flag `workDateReady`
- **OT รายวัน**: ตัวนับ **[−] ช่องชั่วโมง [＋]** ในตารางเข้างานหน้าข้อมูลพนักงาน (stepOT/setOTHours — ปุ่มละ 1 ชม. พิมพ์ทศนิยมได้) · อัตราอัตโนมัติรายคน = **ค่าแรงวัน ÷ (ชั่วโมงกะ − 1 ชม.พัก)** (otRateOf/otWorkHours — ดูกะที่เข้าวันนั้น เช่น 12,000 กะ 9 ชม. → 400÷8 = 50 · 18,000 กะ 12 ชม. → 600÷11 = 54.55 · รายชั่วโมงใช้เรตตัวเอง · นับชั่วโมงใช้ target_hours) · เก็บเป็น adjustments kind add, reason `OT <วัน> (X ชม.)` · 0 = ลบ · คอลัมน์ `payroll_settings.ot_rate` เลิกใช้แล้ว
- **แก้รายการหักอัตโนมัติ** (ตาราง `fine_entries`, flag `fineReady`): หักผิดแก้ยอดรายงวดได้ 4 ชนิด — kind: miss(สาย/ออกก่อนตามนาที) late(ปรับมาสาย) single(ลืมตอก) must(หยุดวันห้ามหยุด) · ปุ่ม ✎ ในหน้าข้อมูลพนักงาน (editFine) · เว้นว่าง = กลับอัตโนมัติ, 0 = ไม่หัก
- **พิมพ์สลิปเลือกคนได้**: ปุ่ม 🖨️ เปิด modal `slipPickBg` ติ๊กเลือกคน (openSlipPicker → printAllSlips(ids)) · ใน modal กรอง สาขา/ตำแหน่ง/สถานะ ได้ (pickBranch/pickPos/pickActive) · เปลี่ยนตัวกรองแล้ว slipPickFilterChanged ติ๊กให้ใหม่ = เฉพาะรายชื่อที่แสดง (กันนับคนสาขาอื่นค้าง) · ปุ่มเลือก/ล้างทั้งหมดมีผลเฉพาะรายชื่อที่กรองแสดงอยู่ · บนสลิป OT รายวันถูกยุบเป็นบรรทัดเดียว "ค่า OT (รวม X ชม. · N วัน)" กันสลิปล้นครึ่งหน้า
- **หน้าสรุปเงินเดือน กรองสถานะได้**: dropdown `payActive` (ทุกสถานะ/ยังทำงานอยู่/พ้นสภาพ) · คนพ้นสภาพมี chip เทากำกับในตาราง
- **K BIZ (กสิกร)**: ปุ่ม 🏦 หน้าพนักงาน = ไฟล์แอดบัญชี (Beneficiary Upload) · ปุ่ม 🏦 หน้าเบิกกลางเดือน = ไฟล์โอนยอดเบิกรวมต่อคน (Transaction Upload) · กดแล้วเด้ง modal `kbizBg` เลือกสาขาก่อน (openKbizBranch → kbizGo) · ไฟล์แอดบัญชีใส่เฉพาะคนที่ยังไม่เคยเพิ่ม (`employees.kbiz_added`, flag `kbizReady`) — สร้างไฟล์เสร็จถามบันทึก "เพิ่มแล้ว" อัตโนมัติ + ติ๊กเองได้ในฟอร์มพนักงาน (fKbiz) · ฟอร์แมตตามเทมเพลทธนาคาร: กสิกรเท่านั้น (รหัส 004), เลขบัญชี 10 หลัก, ชื่อ ≤ 50 ตัวอักษร, วันที่เงินเข้าต้องเป็นวันอนาคต DD/MM/YYYY ค.ศ. · บัญชีร่วมรวมเป็นแถวเดียว · คนที่ใช้ไม่ได้ (เงินสด/ต่างธนาคาร/เลขไม่ครบ) แจ้งรายชื่อใน alert (exportKbizAccounts / exportKbizAdv)
- **หน้าวันนี้ จัดกลุ่มกะตามเวลาสแกนเข้า** (bucketOf ใน renderToday — เฉพาะการแสดงผล ไม่กระทบคิดเงิน/สาย): เข้าก่อน 14:00 = กะเช้า (รวมล้างจาน 11:00) · 14:00-16:59 = กะกลาง · 17:00 ขึ้นไป/หลังเที่ยงคืน = กะเย็น · Parttime/นับชั่วโมง แยกท้าย
- **ประวัติเงินเดือนย้อนหลัง**: แสดงตั้งแต่ `PAY_HIST_START = '2026-07'` เท่านั้น
- **แคชเวลาตอกบัตร (IndexedDB `jjmk-cache`/kv/'punches', `PCACHE_VER`)**: เปิดครั้งแรกโหลดเต็ม (fetchPunchRange นับ count แล้วยิงขนานทีละ 10 หน้า order by id) · ครั้งต่อไปใช้แคช + โหลดสดเฉพาะงวดปัจจุบัน (กันแก้/ลบเวลาที่เครื่องอื่น) · recomputeAll เรียก savePunchCacheSoon (debounce 3s) · ปุ่ม 🔄 = refreshAll ล้างแคชโหลดใหม่หมด · **ห้ามลืม: แก้เวลาย้อนหลังเกินงวดปัจจุบันจากเครื่องอื่น ต้องกด 🔄 ถึงจะเห็น**

## Supabase — ตารางทั้งหมด

- `employees` — ข้อมูลพนักงาน: nick, full_name, code (รหัสเครื่องสแกน), branch, dept, position, wage_type(daily/monthly/hourly/hours), rate, mode, photo, active, off_* (วันหยุด), deposit_target/deposit_monthly/deposit_opening/deposit_on, **birth_date, phone, bank_name, bank_account, bank_account_name, start_date, end_date**
- `punches` — เวลาสแกน: emp_code, punch_date, punch_time, source('manual' = แก้มือ), unique(emp_code,punch_date,punch_time)
- `adjustments` — เพิ่ม/หักเงินรายงวด: employee_id, kind(add/deduct), reason, amount, period
- `advances` — เบิกกลางเดือน: employee_id, amount, adv_date, period
- `holidays` — วันหยุดพิเศษ: day, name, multiplier
- `payroll_settings` — แถวเดียว: cutoff, cut_day, pay_day, late_rate, single_fine, grace, default_wage, month_div, no_off_bonus, hourly_*, must_work_days('5,6,0'), must_work_fine, **dep_start, ot_rate**
- `deposit_entries` — override เงินประกันรายงวด: unique(employee_id, period)
- `mou_loans` — unique ต่อคน: amount, monthly, final_max, start_period, opening, doc_passport, doc_pink, doc_complete, note, returned_at
- `mou_entries` — override หัก MOU รายงวด: unique(employee_id, period)
- `doc_borrows` — สมุดยืมเอกสาร: doc, borrow_date, return_date, note
- `fine_entries` — แก้ยอดรายการหักอัตโนมัติรายงวด: employee_id, period, kind(miss/late/single/must), amount, unique(employee_id, period, kind)
- `loans` — พนักงานยืมเงิน unique ต่อคน: amount, monthly, deduct_on(mid/payroll), start_period, opening, loan_date, note · `loan_entries` — override ผ่อนรายงวด unique(employee_id, period)
- `sso_entries` — ประกันสังคม override รายงวด: unique(employee_id, period) · employees เพิ่ม sso_on, sso_id · payroll_settings เพิ่ม sso_rate/sso_min/sso_max/sso_account
- `tips` — ทิปรวมต่อสาขาต่องวด: period, branch, amount, member_ids (csv เลือกคนเอง · ว่าง = อัตโนมัติ), unique(period, branch)
- ทุกตาราง RLS เปิดแบบ allow-all + อยู่ใน publication `supabase_realtime`

## โครงหน้า (hash routing: #today #emp #detail #payroll #cal #adv #loan #dep #sso #mou #shifts #holi #settings)

วันนี้ · พนักงาน · ข้อมูลพนักงาน(รายคน+ประวัติเงินเดือน) · สรุปเงินเดือน · ปฏิทินเข้างาน · เบิกกลางเดือน · เงินประกัน · เอกสาร MOU(+สมุดยืมเอกสาร) · กะการทำงาน · วันหยุดพิเศษ(ปุ่ม＋เพิ่มปี) · ตั้งค่า
- หน้า cal/today/mou/dep เป็น full-width (`main:has(#page-X.active){max-width:none}` + ใน go())
- ปุ่ม ✎ พนักงาน: **กระพริบแดง** = ขาดวันเกิด/เบอร์/ธนาคาร/เลขบัญชี (missingInfo) · **กระพริบฟ้า** = รับเงินสด (ครบแล้ว)

## ระบบพิมพ์ (จูนกับเครื่อง Canon MF645C ขอบตาย 6mm แล้ว — อย่าแก้ตัวเลขโดยไม่ถาม)

- `@page{size:A4;margin:0}` — ขอบทั้งหมดอยู่ในเนื้อหา ผู้ใช้เลือก Margins None/Default ได้ผลเท่ากัน · **Scale ต้อง 100**
- สลิปเต็มหน้า: `.slip:not(.slip-sm){padding:6mm 6mm 0}`
- แบบครึ่งหน้า (สลิป 2 คน/แผ่น + ใบบัญชีร่วม 2 บัญชี/แผ่น):
  - `.slip-page{padding:6mm 6mm 0}` **ห้ามใส่ height ตายตัว** (เคยทำหน้าเปล่างอก)
  - `.slip-half{flex:0 0 141mm;height:141mm;overflow:hidden}` ทั้งบนและล่าง
  - เส้นปะ ✂ = 6+141+1.5 = **148.5mm กึ่งกลาง A4 พอดี**
- ซ่อนแอปตอนพิมพ์: `body > *:not(#slipBg){display:none!important}` (**ห้ามใช้ visibility:hidden** — กินพื้นที่ งอกหน้าเปล่า)
- `print-color-adjust:exact` ทุก element · media query มือถือเป็น `@media screen and (max-width:860px)` เท่านั้น (**ห้ามลืม screen** ไม่งั้นโหมดพิมพ์โดนกฎมือถือ ตารางยุบเป็นคอลัมน์เดียว)
- สลิปครึ่งหน้า ตารางเข้างาน 3 คอลัมน์ / เต็มหน้า 2 คอลัมน์ (`nCol = compact ? 3 : 2`)
- ปุ่ม 🖨️ พิมพ์สลิปทั้งหมด / 🏦 บัญชีรับเกิน 1 คน: auto `window.print()` หลัง 400-500ms

## กติกาการแก้โค้ด (สำคัญ)

1. **แก้เสร็จต้องตรวจ**: แยก `<script>` ออกมา `node --check` เสมอ (มี `tools/check.sh` ให้)
2. SQL ทุกไฟล์ตรวจด้วย `pglast` (`pip install pglast`) — Supabase SQL Editor ผู้ใช้ต้อง **Ctrl+A ก่อน Run** (editor รันเฉพาะส่วนที่ไฮไลต์) → เขียน SQL ให้แต่ละ statement ยืนเองได้ หรือยัด VALUES ใน CTE เป็นคำสั่งเดียว · **ไฟล์ SQL ของ payroll เก็บที่ branch `sql` โฟลเดอร์ `payroll/` เท่านั้น** (กติกา JJ-PnL: ห้ามเพิ่ม `.sql` ลง main หรือ branch งาน)
3. ตัวเลขจาก Supabase ห่อ `Number(x)||0` เสมอ
4. iOS: input font ≥16px กันซูม · ห้ามใช้ `<select size=N>` (แสดงเพี้ยน) ใช้ลิสต์ `.emp-pick` แตะเลือก · การ์ด grid ใช้ `minmax(min(420px,100%),1fr)`
5. เพิ่มตารางใหม่ต้องมี: RLS policy allow-all + ADD TABLE เข้า supabase_realtime + listener ใน startRealtime + flag `xxReady` กัน error ก่อนรัน SQL
6. ผู้ใช้สื่อสารภาษาไทย — UI/comment/คำตอบเป็นไทย · ส่งไฟล์สมบูรณ์พร้อม deploy ไม่ใช่แค่ diff
7. Deploy = merge เข้า `main` ของ repo JJ-PnL → GitHub Pages อัปเดต `payroll/index.html` เอง → Ctrl+Shift+R (cache ~5-10 นาที)
8. **เจ้าของสั่งไว้ (2026-08-04): แก้เสร็จ+ตรวจผ่านแล้ว ให้เปิด PR และ merge เข้า main อัตโนมัติเลย ไม่ต้องถามยืนยัน** (ยกเว้นงานที่เสี่ยงลบ/แก้ข้อมูลจริงใน Supabase — อันนั้นถามก่อน)

## งานค้าง (ทำต่อได้เลย)

1. **เติมรหัส 17 คนใน `payroll/jj_info_fix.sql` (branch `sql`) ส่วน 4** (นำเข้าข้อมูลจาก Excel เสร็จ 128/145 คน):
   ลิลลี่ แถว23 (น่าจะ = KESONE SINAPHA code 4119126353 JJLP) · ลิลลี่ แถว85 (NAN LIN LIN KHAING = อีกคนที่ JJRD) · น้ำฝน แถว42,59 · เล็ก แถว50 · เมา แถว57 · พะแสง แถว60 · หนุ่ม แถว69 · ฟ้า แถว84 · วี แถว93 · ต้น แถว95 · Savana แถว99 · หอม แถว100 · น้อย แถว102 (NANG PUT ซ้ำ 3) · โซ แถว114 · แตงโม แถว140 · วิน แถว144
   → รัน "ส่วน 1" ของไฟล์เพื่อดูผู้สมัคร+รหัส แล้วเติมใน "ส่วน 4"
2. **วันเกิดรอแก้ต้นทาง 4 คน** (ตอนนี้เว้น NULL ไว้): โน๊ต 3537777921 (ไฟล์เขียน 1452) · เอ 3341077509 (1461) · จอม 4235352505 (2026) · เลย์ 2147833848 (2026)
3. เช็ควันเกิดปี 2010-2011 หลายคน (อายุ 14-15) ว่าถูกจริงไหม: เจน, น้ำเพชร, ขวัญ, ดา, ฟู, ต้น
4. ~~worker.js สร้างพนักงานใหม่รายวัน 400~~ → **แก้แล้ว 2026-08-12 เป็นรายเดือน 12,000 + จดวันเริ่มงาน — รอเจ้าของ deploy worker.js ใหม่ใน CF dashboard**

## โครงไฟล์ (ใน repo JJ-PnL)

```
payroll/index.html        <- แอปทั้งหมด (source of truth)
payroll/worker.js         <- Cloudflare Worker (deploy ผ่าน CF dashboard ไม่ใช่ GitHub)
payroll/logo.png          <- โลโก้ร้าน (แอป/สลิป/ไอคอน iPhone — ต้องอยู่ข้าง index.html)
payroll/tools/split.py    <- แยก JS ออกจาก index.html -> app.js (ไว้แก้สะดวก)
payroll/tools/build.py    <- ประกอบ app.js กลับเข้า index.html + ตรวจ syntax
payroll/tools/check.sh    <- node --check เร็วๆ กับ script ใน index.html
payroll/docs/             <- สรุประบบ + คู่มือ PDF + สไลด์นำเสนอ
payroll/CLAUDE.md         <- ไฟล์นี้
payroll/MOVE-CHECKLIST.md <- เช็กลิสต์ตอนย้าย repo (บัญชี/secret ภายนอกอยู่ที่ไหนบ้าง)

branch `sql` → payroll/*.sql  <- migration ทุกไฟล์ที่เคยรันใน Supabase (รันซ้ำได้)
```

tools ทั้งสามตัวอ้าง path จากโฟลเดอร์ตัวเอง — รันจากที่ไหนก็ได้ เช่น `python3 payroll/tools/split.py`
