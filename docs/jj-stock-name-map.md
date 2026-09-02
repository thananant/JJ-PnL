# ให้ jj-stock (แอพนับสต๊อก) รู้จัก "ชื่อบิล" ของ P&L

> สำหรับคนแก้แอพ JJ StockCheck (`thananant/jjmk-stock`) — โชว์ชื่อบิลตัวเล็กข้างชื่อนับ เหมือนที่ P&L โชว์ชื่อนับข้างชื่อบิล

## ข้อมูลอยู่ที่ไหน
- ตาราง **`pnl_stock_map`** ใน Supabase **โปรเจกต์เดียวกัน** กับ jj-stock (`aikyxvluaiubdidqxwnd`) — อ่านด้วย anon key ตัวเดิมของแอพนับได้เลย (RLS เปิด policy อ่านให้ anon แล้ว)
- 1 แถว = 1 สินค้าในแอพนับ (unique ที่ `product_id`) จับคู่ด้วย **`product_id` = `products.id`** ไม่ต้องเทียบชื่อ

| คอลัมน์ | ความหมาย |
|---|---|
| `product_id` | `products.id` ของ jj-stock (คีย์จับคู่) |
| `branch` | `JJRD` รัชดา / `JJLP` ลาดพร้าว |
| `product_name` | ชื่อนับ ณ ตอนผูก (สำเนาไว้ดู — ชื่อจริงใช้จาก `products.name`) |
| `pnl_item` | **ชื่อบิล (P&L)** ← ตัวที่จะเอาไปโชว์ |
| `bill_unit` / `stock_unit` | หน่วยบิล / หน่วยนับ (ไว้โชว์) |
| `factor` | 1 หน่วยบิล = กี่หน่วยนับ (บิลลัง นับกก. → 9) |
| `active` | `true` = ผูกใช้งาน · `false` = ข้ามไว้ / ไม่มีในบิล → **ไม่ต้องโชว์** |

กฎกรอง: เอาเฉพาะ `active = true` และ `product_id` ที่**ไม่**ขึ้นต้นด้วย `none:` (แถว `none:*` = จำว่าไม่มีในระบบนับ) และ `pnl_item <> '-'`
ถ้า `pnl_item` สะกดเหมือน `products.name` อยู่แล้ว ไม่ต้องโชว์ซ้ำ (P&L ก็ทำแบบนี้)

## อ่านสดผ่าน PostgREST (แนะนำ — อัปเดตทันทีเมื่อ P&L ผูกชื่อใหม่)
```js
// ใช้ SUPABASE_URL / anon key ตัวเดิมของ jj-stock
const r = await fetch(`${SUPABASE_URL}/rest/v1/pnl_stock_map?select=product_id,pnl_item,factor,bill_unit&active=eq.true&product_id=not.like.none:*&order=id`,
  { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
const billName = {};                       // product_id -> ชื่อบิล
(await r.json()).forEach(m => { if (m.pnl_item && m.pnl_item !== '-') billName[m.product_id] = m.pnl_item; });

// ตอนวาดรายการสินค้า
const bn = billName[p.id];
html += `<b>${p.name}</b>${bn && bn.trim().toLowerCase() !== p.name.trim().toLowerCase()
  ? ` <span class="xs mut" title="ชื่อในบิล (P&L)">🧾 ${bn}</span>` : ''}`;
```
- แถวทั้งตาราง ~200 แถว โหลดครั้งเดียวตอนเปิดแอพพอ · ถ้าอยากสดจริง ตาราง `pnl_stock_map` อยู่ใน publication `supabase_realtime` แล้ว subscribe ได้
- **อ่านอย่างเดียวพอ** — การผูก/แก้ชื่อทำที่หน้า "ใช้จริง" ของ P&L ที่เดียว จะได้ไม่ชนกัน

## สำเนาคงที่ (CSV)
รัน `sql/jjmk_stockmap_export.sql` ใน Supabase SQL Editor แล้วกด Download CSV — ได้ทุกสินค้าทั้งสองสาขา พร้อมสถานะ ผูกแล้ว/ยังไม่ผูก/ข้ามไว้
