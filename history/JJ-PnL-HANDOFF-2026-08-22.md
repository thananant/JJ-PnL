# JJ P&L (jjmk-pnl.html) — เอกสารส่งต่อแชทใหม่ (Handoff ฉบับสมบูรณ์)
> อัปเดตล่าสุด: 22 ส.ค. 2026 · สถานะ: โค้ดเสร็จหมด ไม่มีงานค้างฝั่งพัฒนา — เหลือ user deploy 2 ไฟล์

## 0. วิธีใช้เอกสารนี้ในแชทใหม่
วางไฟล์นี้เป็นข้อความแรก แล้วบอกว่าอยากทำอะไรต่อ · Claude ดึงโค้ดล่าสุดได้เองจาก
`https://raw.githubusercontent.com/thananant/JJ-PnL/main/jjmk-pnl.html` (network sandbox อนุญาต raw.githubusercontent.com)
— **ระวัง**: ถ้า user ยังไม่ได้ push ไฟล์ล่าสุด ให้แนบไฟล์จากเครื่องแทน · Worker ดึงจาก repo ไม่ได้ (อยู่บน Cloudflare) ต้องแนบถ้าจะแก้

---

## 1. โปรเจกต์คืออะไร
ระบบบัญชีกำไร-ขาดทุน (P&L) ของร้าน **จริงใจหมูกระทะ** (บ. พากันรวย ฟู้ดส์ คอร์ปอเรชั่น จำกัด)
2 สาขา: **JJRD** (รัชดา) · **JJLP** (ลาดพร้าว-วังหิน) — โครงรองรับเพิ่มสาขา/กลุ่มได้
- Web app **ไฟล์เดียว** `jjmk-pnl.html` (~240KB) โฮสต์บน GitHub Pages
- ฐานข้อมูล Supabase (REST ตรง ไม่มี backend) · สแกนบิลผ่าน Cloudflare Worker + Gemini
- ผู้ใช้: Pattrick (เจ้าของ/dev) + พนักงานหน้าร้าน ใช้ผ่านมือถือเป็นหลัก สื่อสารภาษาไทย

## 2. ค่าคงที่ (ฝังในโค้ดแล้ว — ไว้อ้างอิง)
| อะไร | ค่า |
|---|---|
| Supabase URL | `https://aikyxvluaiubdidqxwnd.supabase.co` |
| Supabase key (publishable) | `sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm` |
| ตาราง prefix | `pnl_` |
| เว็บจริง | `https://thananant.github.io/JJ-PnL/jjmk-pnl.html` |
| Repo | `thananant/JJ-PnL` (แก้ผ่าน GitHub web editor วางทับ commit) |
| OCR Worker | Cloudflare ชื่อ `jjmk-pnl-ocr` → `https://jjmk-pnl-ocr.thananantpatt.workers.dev` |
| Worker Secret | `GEMINI_API_KEY` (จาก aistudio.google.com/apikey — key เดียวกับ StockCheck ได้) |
| Worker Variable (optional) | `MODEL` = override ชื่อโมเดลขึ้นหัวลิสต์ ไม่ต้องแก้โค้ด |
| โมเดล (ส.ค. 2026) | `gemini-3.7-flash` → `gemini-3.6-flash` → `gemini-flash-latest` (2.5/2.0 ตายถาวรแล้ว) |

**Deploy flow**: html → GitHub วางทับ commit · worker → Cloudflare Edit code วางทับ Deploy · SQL → Supabase SQL Editor รันครั้งเดียว (ทุกไฟล์ idempotent รันซ้ำได้)

## 3. โครงแอพ (แท็บทั้งหมด = RENDER.xxx)
`dash` แดชบอร์ด · `income` รายรับ · `exp` รายจ่าย · `detail` **บันทึกข้อมูลบิล** (หน้าหลักของงานช่วงนี้) · `usage` ข้อมูลการใช้ของ · `vatrep` รายงาน VAT · `sum` สรุป · `pv` เทียบช่วงเวลา · `etc` อื่นๆ · `set` ตั้งค่า
- เลือกสาขาบนหัว รวมโหมด **ALL (ทุกสาขา)** — income/exp เป็นตารางวัน×สาขา read-only, usage รวมทุกสาขา (modal มีคอลัมน์สาขา + pickBranch ตอน jump), detail/pv บังคับเลือกสาขาก่อน
- สถานะกลาง object `S` · fetch helper `sel/ins/upd/del` · cache `S.cache` · `show(tab)` จำตำแหน่ง

## 4. ฐานข้อมูล — ตารางหลัก + SQL ที่ "รันแล้ว" ทั้งหมด
ตารางที่ใช้งานจริง (ยืนยันจากโค้ด): `pnl_users` (login/role/legacy) · `pnl_branches` · `pnl_suppliers` (vat_type) · `pnl_bill_items` · `pnl_sup_items` (แคตตาล็อกต่อซัพ) · `pnl_item_alias` · `pnl_ocr_stats` · `pnl_cash_paid` · ตารางรายรับ/fix cost/สลิป ตามชุด setup เดิม
- `pnl_bill_items` คอลัมน์สำคัญ: `branch, d, supplier_id, item, unit, qty, price, discount, sort, bill_no, vat_mode, bill_discount, ship_fee, other_fee`
- `pnl_item_alias`: `supplier_id, alias (unique/sup), item, unit, bill_unit, factor` — สมองของระบบ "ผูกชื่อครั้งเดียวจำตลอด"
- `pnl_ocr_stats`: `ts, branch, model, ok, ms` + RLS allow_all

SQL ที่ user **รันแล้วครบ**: setup, users, billitems, supitems, units, history, lock, billvat, billno, billdisc, **billfees** (ship_fee/other_fee), **alias**, **ocrstats**, expchecked, groups_branches, migrate_shift, paidslip, billlog — ไม่มี SQL ค้างรอรัน

## 5. ฟีเจอร์หน้า "บันทึกข้อมูลบิล" (detail) — สถานะล่าสุด
### 5.1 หลายบิล/วัน แบบ mode-driven (ผู้ใช้ไม่เห็นคำว่า "บิลที่" เลย)
- ปุ่มโหมด VAT (**ไม่มี / +7% / รวม**) = ตัวสลับบิลของวัน · เลขบิล `bill_no` เป็น plumbing ภายในล้วน
- `dtLoad`: group DB ตาม bill_no → map โหมด→บิลแรกของโหมด (`S._dtModeBn`) · เลือกบิลตาม `S._dtForceBn` ?? โหมด · default โหมด: forced-bill > `_dtModeIntent` > บิลเลขต่ำสุดของวัน > ประวัติ vat_mode ล่าสุด > `dtVatDefault()`
- สลับโหมดที่มีของค้าง → confirm ก่อน reload · template ซัพ multiMode รวมสินค้าทุกโหมด (date-aware)
- แถบ "วันนี้: [ไม่มี VAT · ฿x] [+7% · ฿y]" (dtBillTabsRender) เฉพาะวันมีบิล · dtSave scoped ตาม bn + daySum
- dtMonthList / vatrep แสดง **ป้ายโหมด** แทนเลขบิล · dtJump / vrOpen / **modal ประวัติ usage** ตั้ง `_dtForceBn` เปิดตรงใบจริง (hist เก็บ `bn` แล้ว — บั๊ก "ลบบิลแล้วยังอยู่" แก้จบ: เดิม jump ไปบิลเลขต่ำสุดเสมอ ผู้ใช้เลยลบผิดใบ)
- **ค่าส่ง (dtShip) + ค่าธรรมเนียมอื่นๆ (dtOther)**: ช่องข้างส่วนลดท้ายบิล ไม่จำค่า บวก**หลัง** VAT เก็บซ้ำทุกแถวของบิล รวมใน dtBillNet/vatrep/daySum/diff

### 5.2 สแกนบิล OCR (ฟีเจอร์ใหญ่สุด)
**Flow**: ปุ่ม 📷 → `dtOcrPick` → `dtOcrShrink` (ย่อ 2000px q0.9, แคชไว้ `S._lastOcrImg`) → `dtOcrRun` → `dtOcrSend` (XHR อ่าน **NDJSON stream สด**) → `dtOcrApply`
- **หลอดความคืบหน้า**: อัปโหลด = % จริงจาก XHR · ช่วง AI = เวลาเฉลี่ย EMA (`LS jj_ocr_ms`, 0.55/0.45) → % + "เหลือประมาณ N วิ" · เกินเวลา 95→99 กระดึ๊บ · ปุ่มยกเลิก abort จริง
- **สถานะสดจาก worker**: `ocrStatusTick` — "🤖 กำลังอ่านด้วย Gemini 3.7 Flash..." / "🔁 ไม่ว่าง กำลังลองใหม่..." ไล่ตามโมเดลจริง (label map `OCR_MLBL`)
- **สแกนก่อนเลือกซัพได้**: ไม่มีซัพ → `S._ocrPending` → modal เดาซัพจากหัวบิล (`supGuess` คะแนนความคล้าย ตัวเต็ง ⭐) หรือปิดไว้ → banner ค้างเหนือรายการ + hook ท้าย `dtPickSup` เทให้อัตโนมัติ · ปุ่มทิ้งผลสแกน
- **dtOcrApply จับคู่ 3 ชั้น**: alias (แปลง qty×factor, price÷factor) → exact/matched_item จาก pool → ตัวใหม่ = แถวเหลือง `_unm` + **แถบผูกฝังใต้แถวตัวเอง** (`ocrInlineHTML` — เลิกใช้กล่องลอยรวมแล้ว เพราะ user งง) · `l._billName` แช่แข็งชื่อดิบ — **alias ผูกกับชื่อดิบเสมอ** แม้ user พิมพ์แก้ชื่อในตารางก่อนกดผูก
- เช็คยอดรวม vs `total_on_bill` ต่าง >1 บาท → เตือนแดง · `j.warning` (AI ตรวจรูปตัดขอบตาราง — กฎข้อ 10 ใน prompt) → **กล่องส้ม** บนสุด + toast · โน้ตบอกโมเดลที่อ่าน
- **ปุ่ม 🔁 สแกนรูปเดิมอีกครั้ง** ข้างปุ่มสแกน (ใช้รูปแคช ไม่ต้องเลือกไฟล์ใหม่) — อยู่ถาวรข้ามการ render
- **โควตา Google (ฟรี 20 req/นาที/โมเดล)**: worker ตอบ `status:'quota'` + `retryAfter` → toast "⏳ รอ N วิ" + **ปุ่ม retry ล็อกนับถอยหลัง** (`S._ocrQuotaUntil`, interval 1 วิ ครบแล้วปลดเอง สแกนสำเร็จก็เคลียร์)
- **สถิติ**: ทุกสแกน `ins pnl_ocr_stats` (ไม่บล็อก) → การ์ดตั้งค่า **"📷 สถิติการสแกนบิล"** (`ocrStatsLoad` 1000 ล่าสุด, 🏆 อันดับหนึ่ง แท่งเขียว/ฟ้า + แท่งแดงล้มเหลว, %, fallback บอกรัน ocrstats.sql)

### 5.3 อื่น ๆ ในแอพ
- **กราฟยอดขาย**: เส้นเหลือง Fix/วัน = fixT÷วันปฏิทิน · เส้นน้ำตาล **คุ้มทุน/วัน = Fix/วัน + (VC เดือน ÷ วันที่มีรายรับ)** · แท่ง ≥ คุ้มทุน = เขียว (เข้ม ศ-ส-อา / อ่อน จ-พฤ) ต่ำกว่า = แดง/ชมพูเดิม · tooltip ✅/ต่ำกว่า · chips ชี้ค้างเห็นสูตร
- **Auth**: login เทียบ `pnl_users` · session LS `jjpnl_auth {u,h,t}` · **idle 30 นาที** (touchAuth throttle 30s, idleCheck 60s → reload) · กัน autofill (new-password, ชื่อฟิลด์สุ่ม, readonly-onfocus)
- **Pull-to-refresh มือถือ**: ลากลงจากบนสุด ≥70px → ล้าง cache + loadCore + วาดหน้าเดิมซ้ำ · ไม่แย่ง gesture ใน modal/กล่องเลื่อนใน
- หน้า set: หน่วยสินค้า, ซัพ, ผู้ใช้ (admin), ประวัติการใช้งาน (admin), สถิติ OCR

## 6. OCR Worker (`jjmk-pnl-ocr-worker.js`) — เวอร์ชันล่าสุด
- **Streaming NDJSON** ผ่าน TransformStream + `ctx.waitUntil` · HTTP 200 เสมอเมื่อสตรีมเปิด ผลจริงอยู่บรรทัดสุดท้าย
- Ticks: `{status:'trying',model}` · `{status:'retry',model,reason}` · `{status:'done',...parsed,_model}` · `{status:'quota',model,retryAfter,reason}` · `{status:'error',error}`
- **ตรรกะลูป (while i)**: `QUOTA_RE=/quota|rate.?limit|resource_exhausted|429|exceeded your current/i` → **ไม่ retry เด็ดขาด** แค่ i++ (โควตาแยกต่อโมเดล) จับ "retry in Ns" เป็น retryAfter · `TRANSIENT_RE=/overloaded|high demand|unavailable|try again/i` → retry โมเดลเดิมได้ **1 ครั้งรวมทั้ง run** · timeout 25s/คอล → ข้าม · **สูงสุด 4 คอล/สแกน** (เดิม 6 + retry ตอนโควตา = บั๊ก "ห่วยกว่าเดิม" ที่แก้จบแล้ว)
- `status:'quota'` เฉพาะเมื่อ tried **ทุกตัว**เป็นโควตาล้วน ไม่งั้น error รวมรายละเอียดทุกโมเดล
- error ก่อนสตรีม (no image / bad json / ไม่มี secret) = JSON ปกติ status code จริง
- **Prompt**: JSON schema `rows{name,matched_item,qty,unit,price,line_discount} + bill_discount/ship_fee/other_fee/vat_mode/total_on_bill/supplier_name/warning` · กฎ 10 ข้อ: หมุนรูปเอียง, ดอทเมทริกซ์จาง, **คอลัมน์สลับ** (ใช้ ราคา×จำนวน≈จำนวนเงิน ตัดสิน), Price เป็นยอดรวมบรรทัด→หาร qty, น้ำหนัก=qty, ข้ามแถวว่าง/รหัสสินค้า, vat จาก TAX INVOICE, **ข้อ 10 รูปตัดขอบตาราง → ห้ามเดาเงียบ ใส่ warning เสมอ** · แนบ knownItems (≤120) + aliases (≤120)
- `extractJson`: ตัด fence + slice {..}

## 7. การทดสอบ (สำคัญ — ทำต่อแบบเดียวกัน)
สภาพแวดล้อม: jsdom (`npm i jsdom`), mock fetch ตาม URL Supabase, mock XHR ตอบ NDJSON, polyfill สำหรับ OCR: `URL.createObjectURL`, canvas `getContext/toDataURL`, `HTMLImageElement.src` setter ยิง onload
- `wtest.js` = worker offline 15 เคส (fallback/fence/slice, โควตาล้วน→quota เรียก 3 คอลไม่ retry, โควตา+timeout ปน→error, retry รวม 1 = 4 คอล, ลำดับโมเดล, warning ส่งต่อ, no-secret, no-image)
- smoke เด่นล่าสุด: **55** alias/factor · **57** หลอด/ETA/ยกเลิก · **58** สแกนก่อนเลือกซัพ 4 เคส · **59** jump จาก usage ตรง bill_no · **60** แถบผูกใต้แถว + _billName แช่แข็ง · **61** ปุ่ม retry + สถานะสดไล่โมเดล (mock XHR pump ทีละบรรทัด) · **62** log สถิติ + การ์ดตั้งค่า · **63** กล่องส้ม warning · **64** quota flow ครบ (toast 41 วิ, ปุ่มล็อกนับถอยหลัง, ปลดเอง, สำเร็จเคลียร์)
- regression ชุดหลักที่รันทุกรอบ: 2 33 37 40 42 44 45 47 51 (+ ที่แตะฟีเจอร์นั้น) — เช็คบรรทัด `errors: []`
- **บทเรียนเทสต์**: ระวัง `'\n'` vs `'\\n'` ใน heredoc · operator precedence `'x: '+a&&b` ต้องใส่วงเล็บ · `"1 ส.ค"`.includes ชน "21 ส.ค" ให้เทียบ td แรกกับ `thDate()` ตรง ๆ

## 8. ข้อตกลงการทำงาน (ห้ามเปลี่ยน)
1. สื่อสาร**ภาษาไทย**ทั้งหมด (โค้ดคอมเมนต์ไทยได้)
2. แก้ไฟล์ด้วย **Python patch script + `assert s.count(old)==1`** ทุกจุด — ห้าม sed มั่ว
3. ทุกฟีเจอร์**ต้องมี smoke test** พิสูจน์ + รัน regression ก่อนส่งเสมอ · เช็ค syntax ด้วย `new Function(...)` ทุก script block
4. ส่งมอบ = copy ไป `/mnt/user-data/outputs/` + `present_files` + สรุปไทยว่าไฟล์ไหนต้องเอาไปวางไหน (repo / Cloudflare / Supabase)
5. แอพเป็น**ไฟล์เดียวเสมอ** ห้ามแตกไฟล์ · SQL ทุกไฟล์ idempotent
6. UI คิดแบบหน้าร้านมือถือ: ปุ่มใหญ่ ภาษาคน ไม่มีศัพท์เทคนิค (เช่น ไม่มีคำว่า "บิลที่ 2" ให้ผู้ใช้เห็น)

## 9. งานค้าง (ฝั่ง user เท่านั้น — โค้ดจบหมดแล้ว)
1. วาง **worker ล่าสุด** (มี quota-handling + streaming) ทับใน Cloudflare + **Deploy**
2. วาง **jjmk-pnl.html ล่าสุด** ทับใน repo
3. **บิลสุรพลไฟน์เนสท์** (dot-matrix น้ำเงินจาง): รูปเดิมตัดขอบขวาตาราง → อ่าน 100% ไม่ได้ ต้อง**ถ่ายใหม่แนวนอนเห็นทั้งตาราง** (ระบบ warning ข้อ 10 จับเคสนี้แจ้งกล่องส้มแล้ว)
4. ตัดสินใจ**ผูก billing Google** ถ้าโควตาฟรี (20/นาที/โมเดล) ติดบ่อย — Flash ถูกมาก ทั้งเดือนหลักสิบบาท (ยังไม่ตัดสินใจ)

## 10. Decision log (กันถามซ้ำ/ย้อนแก้)
- เลขบิล = plumbing ล้วน ผู้ใช้คิดเป็น "แบบบิล = โหมด VAT"
- ค่าส่ง/ค่าธรรมเนียม **บวกหลัง VAT** และไม่จำค่าเดิม
- คุ้มทุน = Fix/**วันปฏิทิน** + VC/**วันขาย** (ตามสั่งเป๊ะ อย่าเปลี่ยนสูตร)
- retry-on-quota คือ anti-pattern (แก้แล้ว: quota ไม่ retry, transient retry 1 ครั้งรวม, max 4 คอล)
- ชื่อดิบจากบิล (`_billName`) ศักดิ์สิทธิ์ — alias ต้องผูกกับมันเสมอ ไม่ใช่ชื่อที่ user แก้ทับ
- แถบผูกชื่อฝังใต้แถวตัวเอง (กล่องลอยรวม = UX งง เลิกใช้)
- โมเดล Gemini เช็คข้อเท็จจริงก่อนแก้เสมอ (web search) — เคยเดาชื่อผิดมาแล้ว

## 11. ประวัติ transcripts ในเครื่องเดิม (ใช้ไม่ได้ในแชทใหม่ — ไว้อ้างอิงว่าเคยทำอะไร)
`2026-08-09 system-build` → `08-19 features-nas-slips` → `08-21 allbranch-slips-detail` → `08-21 vat-login-usage-crosssup` → `08-21 multibill-matrix-idle` → `08-22 ocr-allbranch-fixes` → `08-22 quota-fix-stats` (ล่าสุด)
