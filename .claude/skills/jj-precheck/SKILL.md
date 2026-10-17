---
name: jj-precheck
description: ตรวจกติกาของ repo JJ-PnL ก่อน commit/เปิด PR ทุกครั้ง — บล็อกที่ต้องเหมือนกันทุกไฟล์ (JJ Login · JJ Gate · JJBR · SPD), ล็อกอินไม่หาย, ไม่มีไฟล์ .sql, meta no-cache, syntax ของทุก <script>, ค่าที่ต้องตรงกันข้ามไฟล์ และโค้ด Edge Function ที่ฝังในแอป. ใช้ทุกครั้งที่แก้ไฟล์ .html ใน repo นี้ ก่อน commit, หลัง rebase/merge, หรือเมื่อผู้ใช้ถามว่า "ตรวจก่อนส่ง" / "เช็คว่าไม่มีอะไรหาย"
---

# jj-precheck — ตรวจก่อนส่งงาน

repo นี้เป็นแอป HTML ไฟล์เดียวหลายตัวที่ฝังบล็อกโค้ดร่วมกัน และเคยมี session ที่ทำงานขนานกันเขียนทับจนล็อกอินหายไปแล้ว 4 ครั้ง
ตัวตรวจนี้รวมทุกอย่างที่ CLAUDE.md บอกว่า "ต้องตรงกัน / ห้ามหาย" ไว้ในคำสั่งเดียว

## เมื่อไรต้องรัน

1. **ก่อน `git commit` ทุกครั้ง** ที่แตะไฟล์ `.html` / `jjmk-kitchen/src` / `jjmk-invoice/inv_nas_sync.py`
2. หลัง `git rebase origin/main` หรือ merge (ตรวจว่าไม่ได้ทับงานคนอื่น)
3. ก่อนเปิด PR ให้รันแบบ `--remote` (fetch main ล่าสุด + เทียบโค้ด Edge Function กับ branch `sql` และ branch ของ Social)

## วิธีรัน

```bash
git fetch origin main && git rebase origin/main     # ตามกติกา repo
node tests/precheck.mjs            # เร็ว ~2 วิ ไม่ต้องติดตั้งอะไร
node tests/precheck.mjs --remote   # ก่อนเปิด PR
```

ผล: `✗` = ต้องแก้ก่อน commit (exit 1) · `⚠` = ดูแล้วตัดสินใจ · `ALL PASSED` = ส่งได้

## ตรวจอะไรบ้าง

| หมวด | ตรวจ | ถ้าไม่ผ่าน |
|---|---|---|
| 1 JJ Login | 14 ไฟล์ `def=1 use≥1` · ทั้งบล็อกเหมือนกัน (ยกเว้น `var APP=`) · ทะเบียนไอคอน `A` ครบทุก `data-app` ของหน้าแรก | กู้ด้วย `git diff 2266081^ 2266081 -- <ไฟล์> \| git apply --3way` หรือคัดลอกบล็อกจากไฟล์ที่ถูก แล้วแก้แค่ `var APP=` |
| 2 JJ Gate | 8 ไฟล์เหมือนกัน · เรียก `JJGate.ok()` + `JJGate.grant()` | sync บล็อกจากไฟล์ที่ถูก |
| 3 JJBR | 15 ไฟล์ (+ ไฟล์ `*-new.html`) เหมือนกันทุกไบต์ | แก้ที่ไฟล์เดียว แล้ว sync ด้วยสคริปต์ (ห้ามแก้มือทีละไฟล์) |
| 4 SPD | ครัวกลาง ↔ นับสต๊อก เหมือนกันทุกไบต์ + `STK_BR` ตรงกัน | sync ด้วยสคริปต์ |
| 5 นับสต๊อก | salt `JJPNL` · `initAuth()` เรียก `showLogin()` · หน้าแรกล้าง `jjhub_skip` | เคยหายจาก commit `6c515b2` — ดู CLAUDE.md |
| 6 ทุกหน้า | meta no-cache · viewport · ลากหน้าลง = รีเฟรช · KPI kiosk ปิดลากลง | ก๊อปจากแอปอื่น |
| 7 Syntax | ทุก `<script>` ในทุกหน้าแปลได้ | ดูบรรทัดที่บอก |
| 8 ค่าข้ามไฟล์ | `RQ_MIN`=`RESET_MIN` · Social brain/webhook เวอร์ชันเดียวกัน + โค้ดส่วน AI เหมือนกัน + `AP_CM_BULK` · ใบกำกับ `SCRIPT_VER` ≥ `NAS_SIG_MIN`/`NAS_HEAD_VER` · ครัวกลาง v2 ตรงกับ `node jjmk-kitchen/src/build.mjs` | แก้คู่ให้ตรง / build ใหม่ |
| 9 git | ไม่มี `.sql` · ไม่มี `.env`/Excel/CSV/คีย์ลับ (repo public) · ไม่ตามหลัง `origin/main` | SQL ไป branch `sql` · rebase |
| 10 (`--remote`) | `#fnSignupNotify` = `sql:signup-notify.ts` · `#feedCode` = `sql:cal-feed.ts` · `#fnBrain`/`#fnWebhook` = branch Social | ฝังใหม่ + เลื่อน `VERSION` |

## เพิ่มกติกาใหม่

กติกาใหม่ใน CLAUDE.md ที่เป็นแบบ "ต้องเหมือนกัน/ห้ามหาย" → เพิ่มลง `tests/precheck.mjs` ในหมวดที่ใกล้ที่สุด (ใช้ `cut()` ตัดบล็อก + `same()` เทียบหลายไฟล์)
แล้วลองทำให้พังดูก่อนว่าจับได้จริง (แก้ไฟล์ชั่วคราว → รัน → `git checkout <ไฟล์>`)
