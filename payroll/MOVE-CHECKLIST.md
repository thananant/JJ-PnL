# ย้าย JJ-Payroll ไปรวมกับ JJ-PnL — เช็กลิสต์ครบชุด

> ✅ **ย้ายเสร็จแล้ว 2026-09-06 แบบ B** — โค้ดอยู่ `payroll/` ใน repo JJ-PnL · SQL อยู่ branch `sql` โฟลเดอร์ `payroll/` · ไฟล์นี้เก็บไว้เป็นบันทึกว่าบัญชี/secret ภายนอก (Supabase, Cloudflare, LINE, เครื่องสแกน) อยู่ที่ไหนบ้าง

แพ็กนี้ = ไฟล์ทั้งหมดจาก repo `thananant/JJ-Payroll` (main ล่าสุด 2026-09-06) + เอกสารสรุป

## 1. ไฟล์ในแพ็ก

| ไฟล์ | คืออะไร | ต้องเอาไปไหม |
|---|---|---|
| `index.html` | **แอปทั้งหมด** (source of truth) | ✅ จำเป็น |
| `worker.js` | Cloudflare Worker รับเครื่องสแกน + รายงาน LINE | ✅ จำเป็น (deploy ผ่าน CF dashboard ไม่ใช่ GitHub) |
| `logo.png` | โลโก้ร้าน ใช้บนแอป/สลิป/ไอคอน iPhone | ✅ ต้องอยู่ข้าง index.html |
| `sql/*.sql` | migration ทุกไฟล์ที่เคยรันใน Supabase (รันซ้ำได้) | ✅ เก็บไว้เป็นประวัติ/รันซ้ำเวลาสร้างโปรเจกต์ใหม่ |
| `tools/split.py` `build.py` `check.sh` | เครื่องมือแก้โค้ด (แยก JS → แก้ → ประกอบ → ตรวจ) | ✅ |
| `CLAUDE.md` | บริบท+กฎทั้งหมดสำหรับ Claude Code | ✅ **สำคัญที่สุด** — เอาไปไว้ในโปรเจกต์ใหม่ (ดูข้อ 4) |
| `docs/JJ-Payroll-Summary.md` | สรุประบบฉบับเดียว + จุดเชื่อม PnL | ✅ |
| `docs/JJMK_Payroll_Manual.pdf` | คู่มือใช้งาน 32 หน้า | ตามสะดวก |
| `docs/JJMK_Payroll_Presentation.pptx` | สไลด์นำเสนอ (นำเข้า Google Slides ได้) | ตามสะดวก |
| `payroll.html` | ไฟล์เก่าก่อนจัดโครง — **ไม่ได้ใช้แล้ว** | ❌ ลบได้ |
| `MOVE-CHECKLIST.md` | ไฟล์นี้ | — |

## 2. ของที่ **ไม่ได้อยู่ในไฟล์** — ต้องจดจากบัญชี/ระบบภายนอก

| รายการ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| Supabase โปรเจกต์ | `aikyxvluaiubdidqxwnd` · URL `https://aikyxvluaiubdidqxwnd.supabase.co` | **ฐานข้อมูลจริงอยู่ที่นี่** ไม่ต้องย้าย — โปรเจกต์ใหม่ชี้มาที่เดิมได้เลย |
| Supabase publishable key | `sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm` (ฝังใน index.html แล้ว) | ใช้ใน frontend ได้ · ถ้า PnL จะอ่านตารางเดียวกันใช้ key นี้ได้ |
| Supabase service key / รหัสผ่าน DB | Supabase dashboard → Settings → API | **ห้ามฝังใน frontend** · Worker ใช้ตัวนี้ |
| Cloudflare Worker | `steep-hill-7d52.thananantpatt.workers.dev` | โค้ด = worker.js · Cron `1 4,8,11 * * *` และ `0 14 * * *` (UTC) |
| Worker secrets (4 ตัว) | CF dashboard → Worker → Settings → Variables | `SUPABASE_URL` `SUPABASE_KEY` `LINE_TOKEN` `LINE_GROUP_ID` — ค่าไม่ได้อยู่ในไฟล์ไหน ต้องดูจาก dashboard |
| LINE Messaging API | LINE Developers console | Channel access token + Group ID ของกลุ่มร้าน |
| เครื่องสแกน ZKTeco / Hikvision | ตั้งค่าในตัวเครื่องที่สาขา | ชี้ server มาที่ URL ของ Worker (`/iclock/*`, `/hik`) — **ถ้า Worker ย้าย URL ต้องไปตั้งใหม่ที่เครื่องทุกตัว** |
| GitHub Pages | repo JJ-Payroll → Settings → Pages (branch main, root) | URL แอปที่พนักงาน/ผู้จัดการเปิดอยู่ตอนนี้ — ถ้าย้าย repo URL จะเปลี่ยน |
| เทมเพลท K BIZ กสิกร | ไฟล์ Excel ที่ธนาคารให้ (เคยส่งให้ Claude ไม่ได้เก็บใน repo) | ฟอร์แมตฝังใน index.html แล้ว (exportKbizAccounts / exportKbizAdv) ไม่ต้องใช้เทมเพลทอีก |
| รายชื่อ 28 บัญชีที่แอด K BIZ แล้ว | บันทึกใน Supabase `employees.kbiz_added` แล้ว | ไม่ต้องทำอะไร |

## 3. ทางเลือกในการ "รวม" — แนะนำแบบ A

**A. ไม่ย้าย repo แต่ให้ Claude Code เห็นทั้ง 2 repo ในเซสชันเดียว (ง่ายสุด ไม่กระทบ URL ที่ใช้อยู่)**
- ในเซสชัน JJ-PnL พิมพ์ว่า "เพิ่ม repo thananant/JJ-Payroll เข้ามาด้วย" → Claude จะ add_repo ให้ อ่าน CLAUDE.md ของ Payroll ได้เลย
- GitHub Pages / Worker / เครื่องสแกน ไม่ต้องแตะอะไร
- ถ้าจะให้ PnL ดึงตัวเลขค่าแรง: อ่าน Supabase โปรเจกต์เดิมได้ทันที (key ข้างบน)

**B. ย้ายเป็นโฟลเดอร์ย่อยใน repo JJ-PnL (เช่น `payroll/`)**
- แตกไฟล์ในแพ็กนี้ลง `JJ-PnL/payroll/` · เอา `CLAUDE.md` ไปเป็น `payroll/CLAUDE.md` แล้วใน `CLAUDE.md` หลักของ PnL เพิ่มบรรทัด "ระบบเงินเดือนอยู่ที่ payroll/ อ่าน payroll/CLAUDE.md ก่อนแก้"
- ต้องตั้ง GitHub Pages ของ JJ-PnL ให้ serve ได้ และ URL แอปจะเปลี่ยนเป็น `thananant.github.io/JJ-PnL/payroll/` → แจ้งผู้จัดการทุกคนเปลี่ยน bookmark/ไอคอนหน้าจอ
- Worker ไม่ต้องย้าย (อยู่ Cloudflare คนละที่)
- tools/split.py, build.py, check.sh อ้าง `index.html` ในโฟลเดอร์เดียวกัน — รันจากใน `payroll/` ได้เลย

## 4. หลังย้าย ให้ Claude ในโปรเจกต์ใหม่รู้อะไรบ้าง (วางใน CLAUDE.md หลัก)

```
## ระบบเงินเดือน (JJ-Payroll)
- โค้ดอยู่ที่ <ที่เก็บ> — อ่าน CLAUDE.md ของ Payroll ก่อนแก้ทุกครั้ง (กฎเงินเดือนห้ามเปลี่ยนโดยไม่ถาม)
- ฐานข้อมูล Supabase aikyxvluaiubdidqxwnd (ตาราง employees/punches/adjustments/advances/... ดู docs/JJ-Payroll-Summary.md)
- งวดเงินเดือน = 26 เดือนก่อน → 25 เดือนนี้ (ไม่ตรงเดือนปฏิทิน) — เวลาเอาค่าแรงเข้า PnL ต้องตกลงวิธีแบ่ง
- แก้เสร็จ+ตรวจผ่าน → เปิด PR + merge อัตโนมัติ (กติกาเจ้าของ 2026-08-04)
```

## 5. งานค้างที่ต้องพกไปด้วย

1. รัน `sql/jj_tips.sql` เวอร์ชันล่าสุดใน Supabase (ถ้ายังไม่ได้รัน) — Ctrl+A ก่อน Run
2. จอซิน สแกนติดกัน 2 ครั้ง — รอเจ้าของยืนยันวิธีแก้ (≤ 30 นาที นับครั้งเดียว)
3. รหัสเครื่องสแกน 17 คนใน `sql/jj_info_fix.sql` ส่วน 4
4. วันเกิด 4 คนรอแก้ต้นทาง · เช็ควันเกิดปี 2010–2011
