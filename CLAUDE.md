# CLAUDE.md — JJ P&L (จริงใจหมูกระทะ)

อ่าน `HANDOFF-2026-09-01.md` ก่อนเริ่มงานทุกครั้ง (บริบทเต็ม ตาราง ฟีเจอร์ งานค้าง) — ไฟล์นี้คือกติกาปฏิบัติ

## ภาษาและผู้ใช้
- คุยกับ Pattrick เป็น**ภาษาไทย** กระชับ ไม่ต้องอธิบายศัพท์เทคนิคเกินจำเป็น
- deliverable ที่ user ต้องการ = **ไฟล์แอพ `jjmk-pnl.html` + ไฟล์ SQL** เท่านั้น · ไฟล์เทสต์อยู่ฝั่งเรา ไม่ต้องส่งเว้นแต่ถูกขอ
- ทุกอย่างที่ user ต้องรัน (SQL) ต้อง **idempotent รันซ้ำได้** และมี "ตรวจผล" ท้ายไฟล์ · ถ้า user ถามผลจากฐานข้อมูล เราเข้าถึง Supabase ไม่ได้ — ให้ SQL อ่านอย่างเดียวไปรัน แล้วขอผล/CSV กลับมา

## โครงโค้ด (ไฟล์เดียว ~435KB)
- `jjmk-pnl.html` = HTML+CSS+JS ทั้งหมด 6 script blocks · state กลาง `S` · API helpers `api/sel/selQ/selAll/selAllQ/ins/upd/del/ups(t,rows,conflict)` (PostgREST) · แท็บ = `RENDER.xxx` เรียกผ่าน `show(tab)`
- Supabase URL/key ฝังในไฟล์ (โปรเจกต์ `aikyxvluaiubdidqxwnd` ใช้ร่วมกับแอพนับสต๊อก JJ StockCheck) · โฮสต์ GitHub Pages repo `thananant/JJ-PnL` — user วางไฟล์ทับเอง
- **ห้ามใช้ `sel()` กวาดทั้งเดือน** — PostgREST ตัด 1,000 แถว ใช้ `selAll/selAllQ` (แบ่งหน้า) เสมอสำหรับช่วงวันที่
- ค่าคงที่ระบบนับ: `STK_MIN='2026-07-31'` (ตัดข้อมูลนับก่อนหน้านี้ทิ้ง) · `STK_BR={JJRD:'b19f0a17b4472',JJLP:'b19f0a17b448212'}` · **ห้าม**ใช้ตาราง `branches` (ของเงินเดือน id คนละชุด) ให้จับสาขาจาก `branch_name` ในแถวนับ + fallback STK_BR

## วิธีแก้ไฟล์ (บังคับ)
1. แพตช์ด้วย Python: `assert s.count(old)==1` ทุก anchor · ถ้าซ้ำให้ขยาย context · anchor ที่มี backslash/escape ให้ **slice จากไฟล์จริง** แทนการพิมพ์ (ดูตัวอย่างใน HANDOFF §6)
2. หลังแพตช์รัน `npm run check` (parse ทุก script block) ต้อง `bad: 0`
3. ฟีเจอร์ใหม่ = เพิ่ม `tests/smokeNN.js` (jsdom + mock fetch) ที่เช็คตัวเลขกับที่คำนวณมือ แล้วเพิ่มเลขเข้า `run-tests.sh`
4. **ก่อนส่งทุกครั้ง** `npm test` ต้อง `FAIL=0` ครบทุกไฟล์ (51 ชุด ณ 2 ก.ย. 2569)
5. สำรอง `cp jjmk-pnl.html jjmk-pnl.html.bakNN` ก่อนแพตช์ใหญ่

## กับดักเทสต์ที่เคยเจอ
- mock ต้องเช็ค `'pnl_branches'` ก่อน `'branches'` และ `'pnl_stock_map'` ก่อน `'products'` · ทุก fixture ต้อง `localStorage jjpnl_m='2026-08'` (ไม่งั้นขึ้นกับเดือนจริง) · `w.confirm` ต้อง mock · modal wrapper id = `modalWrap` (เนื้อ `modalBox`) · `fq()` ตัดทศนิยมศูนย์ (`2` ไม่ใช่ `2.00`) · `RENDER.dash` สร้าง Chart 2 อัน · ตัวเลขใน stock_counts ใช้คอลัมน์ `qty`
- แผงผูกชื่อพับเป็นค่าตั้งต้น: เทสต์ที่แตะ `.bindrow` ต้องตั้ง `jj_stkbind_open=true`

## หลักการที่ user เคาะแล้ว (ห้ามย้อน)
- ระบบนับสต๊อกกับ P&L **ใช้ชื่อสินค้าคนละชุดได้** เชื่อมกันด้วย `pnl_stock_map` — ไม่ทำ unify ชื่อข้ามระบบ · แต่ภายในโปรแกรมเดียวกัน สองสาขาต้องเรียกเหมือนกัน
- บิลลงตามหน่วยที่ซัพส่งจริง (ลัง/โล ปน) → ระบบแปลงตอนคำนวณด้วย `pnl_unit_conv` ห้ามบังคับหน่วยเดียวตอนลง
- สั่งของอัตโนมัติ = **ใช้โฟลว์เดิมของแอพนับ** (นับ→safety/max→ร่างสั่ง→LINE) เราแค่ทำให้ตัวเลข safety/max ตั้งเอง (โหมด 🤖 β) · ทุกอย่างที่เขียนกลับต้องมีคนกดยืนยันจนกว่าจะสั่งเปิดอัตโนมัติ
- ห้ามแตะ OCR Worker (`jjmk-pnl-ocr-worker.js` อยู่บน Cloudflare) เว้นแต่ถูกขอ

## แอพสั่งของ (jjmk-order.html) — คนละโปรแกรมกับ P&L
- ไฟล์เดียวแยกต่างหาก · ตารางชุด `ord_*` (ห้ามปนกับ `pnl_*`) · คู่มือ/สูตร `docs/ORDER-README.md` · เครื่องคำนวณเป็น pure function (`orderPlan/calcOrder/roundQty/learnRates`) มีเทสต์ `tests/ord01.js` เช็คตัวเลขคำนวณมือ · UI `tests/ord02.js`
- seed สินค้า/ซัพ: `python3 scripts/mk_order_seed.py <xlsx>` → `sql/jjmk_order_seed.sql` (idempotent) · `npm run check` เช็ค syntax ทั้งสองไฟล์
- state บน `window.S` · เทสต์ต้องตั้ง `S.D` (วันนี้) เองแล้ว `reload()` · mock fetch ต้องตัด prefix `/rest/v1/`

## SQL
- อยู่ใน `sql/` ทุกไฟล์ idempotent · จำลองก่อนส่งด้วย PostgreSQL local (`sql/local_test_schema.sql` = สคีมาที่ใช้ทดสอบ; `pnl_suppliers.id` เป็น identity ต้อง `overriding system value` ตอน seed)
- ตารางใหม่ต้องมี RLS + policy + grant ตามแบบ `sql/jjmk_pnl_unitconv.sql`

## ตอบ user
- สรุปสั้น: ทำอะไร · ใช้ยังไง · ต้องรันไฟล์ไหน · เทสต์ผ่านกี่ชุด · แล้วถามสิ่งที่ค้างเคาะทีละข้อ ไม่ยัดเยียด
