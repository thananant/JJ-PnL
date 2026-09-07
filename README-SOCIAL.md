# JJ Social — ระบบฟังเสียงลูกค้า + แชทบอท (คู่มือติดตั้ง)

> ไฟล์นี้ + `jjmk_social_setup.sql` + โฟลเดอร์ `supabase/` เก็บที่ **branch งาน** เท่านั้น
> ตอน merge เข้า main ให้เอาเข้าเฉพาะ `jjmk-social.html` (ตามกติกาเดียวกับไฟล์ .sql ใน README หลัก)

## ระบบทำอะไรได้

- **ฟีดเสียงลูกค้าเรียลไทม์** จากทุกช่องทาง: LINE OA, Facebook (แชท+คอมเมนต์+รีวิวเพจ), Instagram, Google Maps, และช่องทางอื่น (Wongnai/Grab/LINE MAN/TikTok — เพิ่มเองหรือยิงผ่าน Generic Webhook)
- **AI วิเคราะห์ทุกรีวิวอัตโนมัติ** (Claude): อารมณ์ ชม/ตำหนิ, คะแนนพึงพอใจ 0-100, แยกประเด็น (รสชาติ/บริการ/ความสะอาด/ราคา ฯลฯ), จับชื่อพนักงานที่ถูกเอ่ยถึง, ระบุช่วงเวลาที่ลูกค้ามาใช้บริการ, ร่างคำตอบให้
- **สรุปอัตโนมัติรายวัน/รายสัปดาห์**: มีปัญหาอะไรต้องแก้ ใครทำดี พนักงาน/ช่วงเวลาไหนดี ควรทำอะไรต่อ
- **แชทบอทตอบลูกค้า** ทาง LINE OA / Messenger / IG DM — เลือกได้ 3 โหมดต่อช่องทาง: ปิด / ร่างให้คนตรวจก่อนส่ง / ตอบอัตโนมัติ (เรื่องร้องเรียนรุนแรงบอทจะส่งต่อให้คนเสมอ)
- ใช้บัญชีผู้ใช้เดียวกับระบบ P&L (`pnl_users`) — admin เห็นหน้าตั้งค่า, พนักงานเห็นหน้าดู/ตอบ

## ขั้นตอนติดตั้ง (ทำครั้งเดียว)

### 1) ฐานข้อมูล
รัน `jjmk_social_setup.sql` ใน Supabase → SQL Editor

### 2) Edge Functions (2 ตัว)
วิธีที่ใช้อยู่: **Supabase Dashboard → Edge Functions → Deploy a new function (via Editor)**
- สร้างฟังก์ชันชื่อ `social-brain` → วางโค้ดจากไฟล์ `supabase/functions/social-brain.ts` → Deploy
- สร้างฟังก์ชันชื่อ `social-webhook` → วางโค้ดจาก `supabase/functions/social-webhook.ts` → Deploy
  แล้วเข้า Details ของตัวนี้ → **ปิด Verify JWT** (จำเป็น — LINE/Facebook/Google ยิงเข้ามาตรงๆ)

(ทางเลือก CLI: คัดลอกไฟล์ไปไว้เป็น `supabase/functions/<ชื่อ>/index.ts` แล้ว
`supabase functions deploy social-webhook --no-verify-jwt && supabase functions deploy social-brain`)

### 3) Secrets (token ทั้งหมดเก็บที่นี่ ไม่อยู่ในหน้าเว็บ)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # จำเป็น — ใช้วิเคราะห์+บอท (console.anthropic.com)
supabase secrets set LINE_CHANNEL_SECRET=...             # LINE Developers → Messaging API
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=...
supabase secrets set FB_APP_SECRET=...                   # Meta for Developers → App settings
supabase secrets set FB_VERIFY_TOKEN=jjmk-social         # ตั้งเองให้ตรงกับที่กรอกใน Meta Webhooks
supabase secrets set FB_PAGE_TOKEN=...                   # Page access token (สิทธิ์ pages_messaging, pages_read_engagement, pages_manage_engagement)
supabase secrets set GOOGLE_API_KEY=...                  # Google Cloud → เปิด Places API (New) — ใช้ชื่อ GOOGLE_MAPS_API_KEY แทนก็ได้
supabase secrets set GEMINI_API_KEY=...                  # (ทางเลือก) โควต้าฟรีรายวัน — ใช้เมื่อไม่มีเครดิต Anthropic
supabase secrets set GBP_CLIENT_ID=...                   # (ทางเลือก) Google Business Profile — ดูหัวข้อด้านล่าง
supabase secrets set GBP_CLIENT_SECRET=...
supabase secrets set WEBHOOK_SHARED_KEY=...              # รหัสลับสำหรับ Generic Webhook (ตั้งเอง)
```

โหมด AI เลือกเองอัตโนมัติ: **Claude** (ถ้ามีเครดิต) → **Gemini** (โควต้าฟรี ~250 ครั้ง/วัน) →
**วิเคราะห์เบื้องต้นจากคำสำคัญไทย** (ฟรี ไม่จำกัด — ผลติดป้าย `[เบื้องต้น]`)

ตั้งเฉพาะช่องทางที่ใช้ก็ได้ — ช่องทางที่ไม่ตั้ง secret จะยังใช้งานส่วนอื่นได้ปกติ

### 4) เชื่อมแต่ละช่องทาง
เปิดแอป `jjmk-social.html` → หน้า **เชื่อมต่อช่องทาง** มี Webhook URL พร้อมปุ่มคัดลอก + วิธีทำของแต่ละช่องทาง:

- **LINE OA**: LINE Developers → Messaging API → วาง Webhook URL (`?ch=line`) → เปิด Use webhook, ปิด auto-reply เดิม
- **Facebook/Instagram**: Meta for Developers → Webhooks → วาง URL (`?ch=facebook` / `?ch=instagram`) + Verify token → subscribe `messages, feed, ratings` (FB) / `messages, comments` (IG)
- **Google Maps**: ใส่ Place ID ของแต่ละสาขาในหน้าเชื่อมต่อ → กด "ดึงรีวิวตอนนี้" ทดสอบ
- **Wongnai/Grab/อื่นๆ**: ใช้ปุ่ม "เพิ่มรีวิวเอง" ในหน้าเสียงลูกค้า หรือยิง Generic Webhook (`?ch=generic` + header `x-webhook-key`)

### 5) งานอัตโนมัติ (แนะนำ)
รัน `jjmk_social_cron.sql` ใน SQL Editor (แก้ `<SERVICE_ROLE_KEY>` ก่อน —
คัดลอกจาก Project Settings → API Keys → `service_role`):
- ทุก 15 นาที: ดึงรีวิว Google + วิเคราะห์รายการค้าง
- ทุกวัน 06:10: AI สรุปเมื่อวาน (ปัญหา/คนทำดี/ช่วงเวลา) ไว้ที่หน้า "สรุป & ประเด็น"

### ทางลัดไม่ใช้ CLI (ทำผ่านเว็บทั้งหมด)
ข้อ 2-3 ทำผ่าน Supabase Dashboard แทนได้:
- **Edge Functions → Deploy a new function (via Editor)** — สร้าง `social-brain` และ
  `social-webhook` (ชื่อต้องตรงเป๊ะ) วางโค้ดจาก `supabase/functions/*/index.ts`
  แล้วกด Deploy · ที่ `social-webhook` ให้ **ปิด Verify JWT** ในหน้า Details
- **Edge Functions → Secrets** — ใส่คีย์ต่างๆ แทนคำสั่ง `supabase secrets set`

## สถาปัตยกรรม

```
LINE / FB / IG  ──webhook──►  social-webhook ──► ตาราง social_mentions / social_chat_log
Google Maps     ──pg_cron──►  social-brain  ──► (Realtime ─► เด้งเข้าแอปทันที)
                                   │
                                   └── Claude API: วิเคราะห์ / ร่างตอบ / บอทแชท / สรุปรายวัน
jjmk-social.html (GitHub Pages) ◄── Supabase REST + Realtime · เรียก social-brain ตอนกดปุ่ม
```

## Google Business Profile — รีวิวครบทุกอัน + ตอบกลับจากระบบ (ฟรี, ทางการ)

ต้องเป็นเจ้าของ listing ที่ยืนยันแล้วใน business.google.com (ทำครั้งเดียว):

1. **ขอสิทธิ์ใช้ API**: ทำตาม https://developers.google.com/my-business/content/prereqs
   → กรอกแบบฟอร์มขอ access โดยใช้บัญชี Google เดียวกับที่ดูแล Business Profile
   และเลือกโปรเจกต์ Cloud เดียวกับที่มี API key อยู่ · รออนุมัติ (มักไม่เกิน 2 สัปดาห์)
2. **เปิด API 3 ตัว** ในโปรเจกต์นั้น (APIs & Services → Library):
   `Google My Business API` · `My Business Account Management API` · `My Business Business Information API`
3. **OAuth consent screen**: ประเภท External → เพิ่มบัญชีตัวเองเป็น Test user
4. **สร้าง OAuth Client** (Credentials → Create credentials → OAuth client ID → Web application)
   → Authorized redirect URI ใส่: `https://aikyxvluaiubdidqxwnd.supabase.co/functions/v1/social-webhook`
5. ตั้ง secrets `GBP_CLIENT_ID` / `GBP_CLIENT_SECRET` แล้ว Deploy ฟังก์ชันเวอร์ชันล่าสุดทั้ง 2 ตัว
6. ในแอป → หน้า **เชื่อมต่อช่องทาง** → กด **"เชื่อมต่อบัญชี Google Business ของร้าน"**
   → ล็อกอิน/กดยินยอม → กลับมากด **"⟳ ซิงค์รีวิวทั้งหมด"**

ได้อะไร: รีวิวย้อนหลังทุกอันของทุกสาขา (รวมคำตอบเดิมที่เคยตอบไว้), cron ซิงค์รีวิวใหม่ทุก 15 นาที,
และปุ่ม "ส่งตอบกลับ" บนรีวิว Google ใช้งานได้จริง · token ถูกเก็บแบบเข้ารหัส (AES-GCM ด้วย service key)

## ข้อจำกัดที่ควรรู้

- **Google**: Places API ให้รีวิวล่าสุด ~5 รายการ/สาขา/รอบ (ระบบสะสมเพิ่มเรื่อยๆ) และ **ตอบรีวิว Google จากระบบไม่ได้** — ใช้ปุ่ม "คัดลอกคำตอบ + เปิดต้นทาง" ไปวางตอบ (ถ้าอยากได้ครบ+ตอบได้ ต้องสมัคร Google Business Profile API เพิ่มภายหลัง)
- **ตอบกลับจากระบบได้จริง**: แชท LINE/Messenger/IG DM + คอมเมนต์ Facebook/Instagram · ช่องทางอื่นใช้วิธีคัดลอกคำตอบ
- TikTok/Wongnai/Grab ไม่มี API รีวิวสาธารณะ — รับผ่าน Generic Webhook หรือเพิ่มเอง
