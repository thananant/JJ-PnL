---
name: jj-mobile-check
description: เปิดทุกแอปของ JJ-PnL บนโทรศัพท์จำลอง 15 รุ่น (iPhone SE ถึง Pro Max, Android, Fold, iPad, แนวนอน — มีรอยบาก/Dynamic Island จริง) แล้วตรวจกติกาหน้าจอมือถือ: ปุ่มโดนแถบสถานะ/แถบโฮม/รอยบากบัง, หน้าเลื่อนข้าง, ช่องกรอกเล็กกว่า 16px, ปุ่มทับกัน, JS error. ใช้หลังแก้ CSS/หน้าจอ/หัวแอป/แถบแท็บ/หน้าต่างเต็มจอ ของแอปไหนก็ตาม, ตอนเขียนแอปใหม่, หรือเมื่อผู้ใช้บอกว่า "ในโทรศัพท์กดไม่ได้/ติดลำโพง/ขนาดแปลก"
---

# jj-mobile-check — ตรวจหน้าจอโทรศัพท์

ทำตาม "กติกาหน้าจอมือถือ ทุกแอป" ใน CLAUDE.md แบบอัตโนมัติ — เปิดแอปจริงใน Chromium (Playwright) พร้อม safe-area inset ของแต่ละรุ่น
ไม่แตะฐานข้อมูลจริง: คำขอไป Supabase ถูกตอบด้วยข้อมูลจำลอง (ผู้ใช้ทดสอบ `jjtest` ระดับ admin + ตารางว่าง) แล้วล็อกอินเข้าไปตรวจหน้าหลักให้ด้วย

## วิธีรัน

```bash
node tests/mobile/mobile-check.mjs                    # 5 รุ่นหลัก (SE 1 · 16 Pro · Android 412 · Fold ปก · แนวนอน) ~2 นาที
node tests/mobile/mobile-check.mjs --app=kitchen      # เฉพาะแอปที่แก้ (id: hub pnl owner admin payroll calendar invoice social maint kpi kiosk stock kitchen kitchen2 order office menu privacy)
node tests/mobile/mobile-check.mjs --all              # ครบ 15 รุ่น ~8 นาที (ก่อนส่งงานที่แก้หน้าจอหลายแอป)
node tests/mobile/mobile-check.mjs --dev=se1,land --shots   # เก็บภาพหน้าจอที่ tests/mobile/out/shots/ (เปิดดูด้วย Read)
```

ต้องติดตั้งก่อน (session hook ทำให้แล้ว): `cd tests && npm install` — มีสำเนาไลบรารีที่แอปโหลดจาก CDN (supabase-js · Chart.js · three · xlsx · jspdf · html2canvas) เพราะ session ทดสอบออกเน็ตไป CDN ไม่ได้

## อ่านผล

- `✗ ปุ่มอยู่ใต้แถบสถานะ/รอยบาก` → หัวแอป/แถบที่ติดบนขาด `padding-top: calc(เดิม + env(safe-area-inset-top))`
- `✗ ปุ่มที่ติดจอลงไปในแถบโฮม` → แถบล่างที่ `position:fixed` ขาด `env(safe-area-inset-bottom)`
- `✗ ปุ่มอยู่ใต้รอยบากด้านข้าง` (แนวนอน) → ซ้ายขวาใช้ `max(เดิม, env(safe-area-inset-left/right))`
- `✗ ช่องกรอกตัวเล็กกว่า 16px` → iPhone ซูมหน้าเองตอนแตะ — ตั้ง `font-size:16px` ที่จอ ≤700px (รวม `<select>` และ `<input type=date>`)
- `✗ หน้าเลื่อนข้างได้` → มีของกว้างเกินจอ
- `⚠ ปุ่มทับกัน` / `⚠ JS error` → ดูเองว่าจริงไหม
- `⚠ ล็อกอินด้วยผู้ใช้ทดสอบไม่ผ่าน (แอปตอบ: …)` → ตรวจได้แค่หน้าล็อกอิน — ถ้าแอปต้องการข้อมูลจำลองเพิ่ม ใส่ใน `fakeSupabase()`

กติกาสำคัญ: **ทุกค่าที่เพิ่มต้องเขียนแบบ `calc(เดิม + env())` หรือ `max(เดิม, env())`** — ไม่มี inset (คอม/เบราว์เซอร์) หน้าตาต้องเหมือนเดิมทุกพิกเซล

## แก้ตัวตรวจ

- ของเดิมที่เจ้าของรู้แล้วและยังไม่ให้แก้ → ใส่ใน `KNOWN` (ลดเป็น ⚠ พร้อมเหตุผล) อย่าลบการตรวจทิ้ง
- แอปใหม่ → เพิ่มใน `APPS` (`login:1` ถ้าใช้บัญชีกลาง · `pass` ถ้าใช้ PIN)
- วัดการเลื่อนข้างจาก `scrollWidth - ความกว้างจอที่ตั้ง` (ไม่ใช่ `innerWidth` — Chromium ขยายตามเนื้อหาตอน `isMobile`)
