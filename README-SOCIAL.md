# JJ Social — ระบบฟังเสียงลูกค้า + แชทบอท (คู่มือติดตั้ง)

> ไฟล์นี้ + `jjmk_social_*.sql` + โฟลเดอร์ `supabase/` เก็บที่ **branch งาน** เท่านั้น
> (SQL ชุดเดียวกันเก็บที่ branch `sql` ด้วย) · ตอน merge เข้า main เอาเข้าเฉพาะ `jjmk-social.html`
> โค้ด Edge Functions ล่าสุดมีปุ่ม **📋 คัดลอกโค้ด** ในแอป → หน้า "ตั้งค่า" (เห็นเฉพาะ admin/owner) ไม่ต้องหาจากที่นี่

## ระบบทำอะไรได้

- **ฟีดเสียงลูกค้าเรียลไทม์**: LINE OA, Facebook (แชท+คอมเมนต์), Instagram, Google Maps และช่องทางอื่น (Wongnai/Grab/LINE MAN/TikTok — เพิ่มเองหรือยิงผ่าน Generic Webhook)
- **AI วิเคราะห์ทุกรีวิวอัตโนมัติ**: อารมณ์ ชม/ตำหนิ, คะแนน 0-100, แยกประเด็น, จับชื่อพนักงาน, ช่วงเวลาที่มา, ร่างคำตอบ
- **สรุปอัตโนมัติรายวัน 06:10**: มีปัญหาอะไร ใครทำดี ช่วงเวลาไหนดี ควรทำอะไรต่อ
- **แชทบอท** LINE / Messenger / IG DM — ต่อช่องทาง: ปิด / ร่างให้คนตรวจ / ตอบเองเฉพาะคำถามพบบ่อย (FAQ) / ตอบเองทั้งหมด
  ระบบเรียนรู้คำถามที่ลูกค้าถามซ้ำแล้วเสนอเป็น FAQ ให้กดอนุมัติ · ถ้าโควต้า AI หมด บอทยังตอบคำถามที่ตรง FAQ ได้ (เทียบคำแบบไม่ใช้ AI)
- ล็อกอินด้วยบัญชี `pnl_users` เดียวกับ P&L (เข้าจากหน้ารวมระบบได้เลย)

## ค่าใช้จ่าย — ทำได้ 0 บาท

| ส่วน | ค่าใช้จ่าย | หมายเหตุ |
|---|---|---|
| Supabase (ฐานข้อมูล + Edge Functions + cron) | **ฟรี** | แพ็กเกจฟรีเหลือเฟือ (Edge Functions 500,000 ครั้ง/เดือน — ระบบนี้ใช้ราว 5,000) |
| AI วิเคราะห์ + บอท: **Gemini (โหมดฟรี — ค่าเริ่มต้น)** | **ฟรี** | รุ่น Flash-Lite ราว 500 ครั้ง/วัน/รุ่น · หมดแล้วใช้วิเคราะห์เบื้องต้นไปก่อน แล้วค่อยอัพเกรดด้วย AI ให้เองเมื่อโควต้ากลับมา |
| AI: Claude (โหมดคุณภาพสูงสุด — เลือกเองในหน้า "แชทบอท") | เสียเงินตามใช้ | ราว 0.5 บาท/รีวิว · ไม่เลือกก็ไม่เสีย ไม่ต้องตั้ง `ANTHROPIC_API_KEY` |
| Google Business Profile API (รีวิวครบ + ตอบรีวิวจากแอป) | **ฟรี** | ต้องยื่นขอสิทธิ์ รออนุมัติ 2–6 สัปดาห์ |
| Google Places API (ระหว่างรออนุมัติ GBP) | **ฟรีถ้าไม่เกินโควต้า** | ต้องผูกบัตร · ระบบดึงแค่ทุก 3 ชม. (~480 ครั้ง/เดือน < ฟรี 1,000) · กดดึงเองได้ทุก 10 นาที · ตั้งเพดานรายวันไว้กันพลาด (ข้อ 6) |
| LINE Messaging API | **ฟรี** สำหรับ reply | บอทตอบอัตโนมัติใช้ reply = ไม่นับโควต้า · แอดมินตอบจากแอป = push (แพ็กเกจฟรีไทย 300 ข้อความ/เดือน) |
| Facebook / Instagram (Meta) | **ฟรี** | ต้องเปิดแอปเป็น Live และอาจต้องผ่าน App Review |
| TikTok / Wongnai / Grab | ฟรี | ไม่มี API รีวิวสาธารณะ — เพิ่มเองหรือยิง Generic Webhook |

หน้า **ตั้งค่า → 🩺 สถานะระบบ & ค่าใช้จ่าย** ในแอปตรวจทุกอย่างสด ๆ และบอกว่าตรงไหนเสียเงิน/ตรงไหนพัง

## ขั้นตอนติดตั้ง (ทำครั้งเดียว)

### 1) ฐานข้อมูล
รัน `jjmk_social_setup.sql` แล้วตามด้วย `jjmk_social_fix_grants.sql` ใน Supabase → SQL Editor

### 2) Edge Functions (2 ตัว) — ทำผ่านเว็บ
Supabase Dashboard → **Edge Functions → Deploy a new function (via Editor)**
- ชื่อ `social-brain` → วางโค้ด (ปุ่ม 📋 ในแอป หรือไฟล์ `supabase/functions/social-brain.ts`) → Deploy
- ชื่อ `social-webhook` → วางโค้ด `social-webhook.ts` → Deploy → เข้า Details → **ปิด Verify JWT** (จำเป็น — LINE/Facebook/Google ยิงเข้ามาตรง ๆ)
- แก้โค้ดครั้งถัดไป: เปิดฟังก์ชันเดิม → วางทับ → Deploy (การ์ดสถานะในแอปจะบอกถ้าเวอร์ชันยังเก่า)

### 3) Secrets — Edge Functions → Secrets
| ชื่อ | จำเป็นไหม | ได้จากไหน |
|---|---|---|
| `GEMINI_API_KEY` | **แนะนำ** (AI ฟรี) | aistudio.google.com/apikey — **สร้างในโปรเจกต์ใหม่ที่ไม่ผูกบัตร** (ถ้าโปรเจกต์ผูกบัตร Google จะคิดเงินทุกครั้ง ไม่ได้โควต้าฟรี) |
| `GOOGLE_API_KEY` (หรือ `GOOGLE_MAPS_API_KEY`) | ถ้าใช้ Places | Google Cloud โปรเจกต์ที่ผูกบัตร (ข้อ 6) |
| `GBP_CLIENT_ID` / `GBP_CLIENT_SECRET` | ถ้าใช้ Business Profile | ข้อ 7 |
| `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` | ถ้าใช้ LINE | LINE Developers → OA หน้าร้าน → Messaging API (**คนละตัวกับ `LINE_SECRET`/`LINE_TOKEN` ของระบบอื่น**) |
| `FB_APP_SECRET` / `FB_PAGE_TOKEN` / `FB_VERIFY_TOKEN` | ถ้าใช้ FB/IG | ข้อ 8 |
| `WEBHOOK_SHARED_KEY` | ถ้าใช้ Generic Webhook | ตั้งเอง |
| `ANTHROPIC_API_KEY` | ไม่จำเป็น | ใช้เฉพาะโหมดคุณภาพสูงสุด (เสียเงิน) |

**เรื่องข้อมูลลูกค้ากับ Gemini ฟรี**: Google อาจนำข้อมูลที่ส่งผ่านโควต้าฟรีไปปรับปรุงบริการ ระบบจึง**ตัดเบอร์โทร อีเมล ไอดีไลน์ และชื่อผู้รีวิวออกก่อนส่งทุกครั้ง** (ส่งแค่เนื้อหารีวิว/แชท + รายชื่อพนักงานสำหรับจับชื่อ) — ถ้าไม่ต้องการแม้แต่นี้ ให้ไม่ใส่ `GEMINI_API_KEY` ระบบจะใช้การวิเคราะห์เบื้องต้นแทน

### 4) งานอัตโนมัติ (pg_cron) — **สำคัญ ไม่ทำ = ไม่ดึง/ไม่วิเคราะห์/ไม่สรุปเอง**
รัน `jjmk_social_cron.sql` ใน SQL Editor — **ไม่ต้องแก้อะไร** (ใช้คีย์สาธารณะชุดเดียวกับแอป ไม่ใช่คีย์ลับ)
- ทุก 15 นาที: ซิงค์รีวิว Google + วิเคราะห์รายการใหม่ + ค่อย ๆ อัพเกรดรายการ `[เบื้องต้น]` ด้วย AI
- ทุกวัน 06:10: สรุปเมื่อวาน + เรียนรู้คำถามซ้ำ
- ตรวจว่าทำงาน: การ์ดสถานะในแอปมีแถว "งานอัตโนมัติ (cron)" บอกเวลารันล่าสุด

### 5) เชื่อมแต่ละช่องทาง
แอป → หน้า **เชื่อมต่อช่องทาง** มี Webhook URL + ปุ่มคัดลอก:
- **LINE OA**: LINE Developers → Messaging API → วาง Webhook URL (`?ch=line`) → เปิด Use webhook → ปิดข้อความตอบกลับอัตโนมัติเดิมใน LINE OA Manager
- **Facebook/Instagram**: ข้อ 8
- **Google Maps**: ใส่ Place ID ของแต่ละสาขา → กด "ดึงรีวิวตอนนี้" ทดสอบ (ระหว่างรอ GBP)
- **ช่องทางอื่น**: ปุ่ม "เพิ่มรีวิวเอง" หรือ Generic Webhook (`?ch=generic` + header `x-webhook-key`)

### 6) Google Places (ใช้ระหว่างรออนุมัติ GBP) — ให้ฟรีแน่นอน
1. โปรเจกต์ Google Cloud ต้อง**ผูก billing account** (ไม่ผูก = Google ปฏิเสธทุกคำขอ แม้อยู่ในโควต้าฟรี)
2. เปิด **Places API (New)** และ **Places API (Legacy)** — ตัว Legacy ค้นหาไม่เจอให้เปิดจากลิงก์ตรง
   `https://console.cloud.google.com/apis/library/places-backend.googleapis.com` (ไม่เปิด = ได้แค่ 5 รีวิวเด่นซ้ำ ๆ ไม่ได้รีวิวใหม่)
3. จำกัด API key ให้ใช้ได้แค่ 2 API นี้
4. **ตั้งเพดาน**: APIs & Services → Places API (ทั้ง 2 ตัว) → Quotas → จำกัด **ไม่เกิน 30 ครั้ง/วัน** ต่อ API
   (30 × 31 วัน = 930 < ฟรี 1,000 · ถ้าหน้า Quotas มีแต่แบบรายนาที ให้ตั้งรายนาทีต่ำสุดเท่าที่ได้)
   แล้วตั้ง Billing → Budgets & alerts → งบ US$1 — **งบนี้แค่ส่งอีเมลเตือน ไม่ได้ตัดการใช้งาน** ตัวที่กันเกินจริงคือเพดานรายวัน

### 7) Google Business Profile — รีวิวครบทุกอัน + ตอบรีวิวจากแอป (ฟรี)
1. **ยื่นขอสิทธิ์ API**: https://support.google.com/business/contact/api_default → "Application for Basic API Access"
   ส่งจากอีเมลเจ้าของ/ผู้จัดการ Business Profile + ใส่ Project number ของ Cloud · โปรไฟล์ต้องยืนยันแล้วและเปิดมา 60 วันขึ้นไป + มีเว็บไซต์
   รออนุมัติ **2–6 สัปดาห์** · ตรวจผล: Cloud Console → Quotas ของ 3 API ข้อ 2 ต้องขึ้น 300 ต่อนาที (ยังเป็น 0 = ยังไม่อนุมัติ)
2. เปิด API 3 ตัว: `Google My Business API` · `My Business Account Management API` · `My Business Business Information API`
3. **OAuth consent screen** (Google Auth Platform): External → **Audience → กด "Publish app"** (In production)
   — ถ้าค้างไว้แบบ Testing, Google ตัดสิทธิ์ทุก 7 วันและต้องกดเชื่อมต่อใหม่ทุกสัปดาห์ · บัญชีของร้านเองไม่ต้องผ่าน verification แค่กดผ่านหน้าเตือน "unverified app"
4. Credentials → OAuth client ID (Web application) → Authorized redirect URI:
   `https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-webhook`
5. ตั้ง secrets `GBP_CLIENT_ID` / `GBP_CLIENT_SECRET`
6. แอป → เชื่อมต่อช่องทาง → **เชื่อมต่อบัญชี Google Business ของร้าน** (เฉพาะบัญชีระดับผู้ดูแล/เจ้าของ · ลิงก์ใช้ได้ 15 นาที) → ยินยอม → กด **⟳ ซิงค์รีวิวทั้งหมด**
7. จับคู่สาขาใต้ปุ่มเชื่อมต่อ → **💾 บันทึกสาขา** (รีวิวที่ดึงมาแล้วถูกย้ายสาขาตามให้ด้วย) · โปรไฟล์ที่ไม่ใช่ของร้าน/ซ้ำ เลือก **"ไม่ดึง"**

ได้อะไร: รีวิวย้อนหลังทุกอันของทุกสาขา (รวมทุกบัญชีธุรกิจที่ล็อกอินเห็น), คำตอบที่เคยตอบใน Google Maps ขึ้นว่า "ตอบแล้ว" ให้เอง,
ปุ่ม "ส่งตอบกลับ" บนรีวิว Google ใช้งานได้จริง · token เก็บแบบเข้ารหัส (AES-GCM)
เชื่อม GBP แล้ว cron จะใช้ GBP ก่อน (ฟรี) — Places ใช้เฉพาะตอน GBP ยังไม่พร้อม และกันรีวิวซ้ำข้ามสองแหล่งให้แล้ว

### 8) Facebook / Instagram (Meta — ฟรี)
1. Meta for Developers → Webhooks → Page: URL `?ch=facebook` + Verify token ให้ตรง `FB_VERIFY_TOKEN` → subscribe **`messages`, `feed`**
   Instagram: URL `?ch=instagram` → subscribe **`messages`, `comments`**
   (รีวิวเพจ/`ratings` — Meta ปิดไปแล้วตั้งแต่ปี 2025 ใช้ไม่ได้อีก)
2. `FB_PAGE_TOKEN` ต้องเป็น **Page token แบบไม่หมดอายุ**: เอา user token แบบ long-lived ไปขอ Page token (หรือใช้ System User token)
   — token จาก Graph API Explorer หมดอายุในไม่กี่ชั่วโมง (การ์ดสถานะจะเตือนถ้าหมดอายุ)
3. เปลี่ยนแอป Meta เป็น **Live** แล้วทดสอบทักแชท/คอมเมนต์ด้วยบัญชีที่**ไม่มีบทบาทในแอป**
   ถ้าไม่เข้า: ทำ Business Verification + App Review สิทธิ์ `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_manage_engagement`, `instagram_manage_messages`, `instagram_manage_comments`
4. Messenger ส่งหาลูกค้าได้ภายใน 24 ชม. หลังข้อความล่าสุดของลูกค้าเท่านั้น (ระบบแจ้งเหตุผลให้ถ้าส่งไม่ได้)

## สถาปัตยกรรม

```
LINE / FB / IG  ──webhook──►  social-webhook ──► social_mentions / social_chat_log ──Realtime──► แอป
Google (GBP/Places) ◄─pg_cron ทุก 15 นาที─ social-brain ──► วิเคราะห์ / สรุป / เรียนรู้ FAQ
                                   │
                                   └── AI: Gemini ฟรี (3.5 Flash-Lite → 3.1 Flash-Lite → 2.5 Flash)
                                           → Claude (เฉพาะโหมดคุณภาพสูงสุด) → กติกาเบื้องต้น (ฟรีเสมอ)
jjmk-social.html (GitHub Pages) ◄── Supabase REST + Realtime · เรียก social-brain ตอนกดปุ่ม
```

สถานะที่ระบบจดไว้ใน `social_settings` (ไม่มีค่าลับ): `ai_health` (โควต้า/ข้อผิดพลาด AI) · `cron` (รันล่าสุด) ·
`channels.gbp.last_error` / `channels.google_last_result` (ผลดึงรีวิวรอบล่าสุด)

## ข้อจำกัดที่ควรรู้

- **Google Places** ให้รีวิวรอบละ 5 เด่น + 5 ล่าสุดต่อสาขา (ระบบสะสมเพิ่มเรื่อย ๆ) และตอบรีวิวไม่ได้ — ได้ครบ+ตอบได้ต้องใช้ GBP
- **Gemini ฟรี** หมดโควต้ารายวันได้ (รีเซ็ตราว 14:00–15:00 เวลาไทย) — ระหว่างนั้นรีวิวใหม่ได้ผล `[เบื้องต้น]` ก่อน แล้ว cron อัพเกรดให้เองทีละน้อยด้วย Gemini ฟรีเท่านั้น (สูงสุด ~300 รายการ/วัน เผื่อโควต้าให้แชทบอท · รายการที่ AI อ่านไม่ผ่านจะติดป้าย `[เบื้องต้น·AI ไม่ผ่าน]` ไม่วนกลับมาขวางคิว)
- **บอทตอน AI ไม่ว่าง**: ตอบเองเฉพาะคำถามที่ตรงกับ FAQ เป๊ะ · ถ้าแค่คล้าย หรือมีคำปฏิเสธ/ร้องเรียน (ไม่, ยกเลิก, แย่ ฯลฯ) จะเก็บคำตอบ FAQ เป็นร่างให้คนกดส่งแทน
- **ความปลอดภัย**: ตาราง `social_*` เปิดให้คีย์สาธารณะของแอปอ่าน/เขียนได้ (แบบเดียวกับทุกแอปในระบบ) — ระบบจึงไม่เก็บค่าลับใด ๆ ในตาราง และลบคีย์/โทเคนออกจากข้อความผิดพลาดทุกอันก่อนบันทึก
- **ตอบจากแอปได้จริง**: แชท LINE/Messenger/IG DM + คอมเมนต์ FB/IG + รีวิว Google (เมื่อเชื่อม GBP) · ช่องทางอื่นใช้ปุ่มคัดลอกคำตอบ
- TikTok/Wongnai/Grab ไม่มี API รีวิวสาธารณะ — รับผ่าน Generic Webhook หรือเพิ่มเอง
