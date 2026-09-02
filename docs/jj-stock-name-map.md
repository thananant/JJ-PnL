# คำสั่งงานสำหรับแอพ jj-stock (JJ StockCheck): โชว์ "ชื่อบิล" ของ P&L ข้างชื่อนับ

> ไฟล์นี้เขียนให้คน/Claude ที่แก้แอพนับสต๊อก `thananant/jjmk-stock` อ่านแล้วทำได้เลย โดยไม่ต้องรู้บริบทของ P&L
> ภาษาไทย · ทำเสร็จแล้วส่งไฟล์แอพ jj-stock กลับให้ Pattrick วางทับ · **อย่าแก้ตาราง ฝั่ง P&L ทั้งหมด (อ่านอย่างเดียว)**

## 1. เป้าหมาย (สั่งอะไร)
ทุกที่ที่แอพนับแสดงชื่อสินค้า (`products.name`) ให้เพิ่ม **ป้ายตัวเล็กสีเทา `🧾 <ชื่อบิล>`** ต่อท้าย เมื่อสินค้านั้นถูกผูกกับชื่อบิลของ P&L และสะกดไม่เหมือนกัน
ตัวอย่างที่ต้องได้:

| ชื่อนับ (ของ jj-stock) | โชว์เป็น |
|---|---|
| นม 1ถุง = 2กิโล | **นม 1ถุง = 2กิโล** 🧾 ไอศกรีม วนิลา |
| ช็อกโกแลต 1ถุง = 2กิโล | **ช็อกโกแลต 1ถุง = 2กิโล** 🧾 ไอศกรีม ช็อคโกแลต |
| เห็ด (ชื่อบิลก็ "เห็ด") | **เห็ด** (ไม่มีป้าย — สะกดเหมือนกัน) |
| ของที่ยังไม่ผูก | **ชื่อเดิม** (ไม่มีป้าย) |

P&L ทำด้านกลับกันแล้ว (ชื่อบิลเป็นหลัก + 📦 ชื่อนับ ตัวเล็ก) — สองแอพจะรู้จักทั้งสองชื่อครบ

## 2. แหล่งข้อมูล (อ่านจากไหน) — **ห้ามเทียบด้วยชื่อ ให้จับคู่ด้วย `product_id`**
- Supabase **โปรเจกต์เดียวกัน** กับ jj-stock (`https://aikyxvluaiubdidqxwnd.supabase.co`) ใช้ `SUPABASE_URL` + anon key **ตัวเดิมของ jj-stock** ได้เลย ไม่ต้องขอ key ใหม่
- อ่าน **view `pnl_stock_names`** (P&L สร้างไว้ให้ = ตารางผูกชื่อ join กับ `products` สด ๆ เพราะฉะนั้นชื่อนับใน view ตรงกับ `products.name` ปัจจุบันเสมอ)

| คอลัมน์ | ความหมาย |
|---|---|
| `product_id` | = `products.id` ของ jj-stock → **คีย์จับคู่** |
| `branch` | `JJRD` รัชดา / `JJLP` ลาดพร้าว (ผูกรายสาขา สินค้าชื่อเดียวกันสองสาขาเป็นคนละ `product_id`) |
| `stock_name` | ชื่อนับ (สดจาก `products.name`) |
| `stock_unit` | หน่วยนับ |
| `bill_name` | **ชื่อบิล (P&L) ← ตัวที่เอาไปโชว์** |
| `bill_unit` | หน่วยในบิล (อาจว่าง) |
| `factor` | 1 หน่วยบิล = กี่หน่วยนับ (บิลลัง นับกก. → 9) |
| `same_name` | `true` = สะกดเหมือนกันอยู่แล้ว → ไม่ต้องโชว์ป้าย |

view กรองให้แล้ว: มีเฉพาะคู่ที่ผูกใช้งานอยู่และสินค้ายังไม่ถูกลบ · ไม่มีแถว "ข้ามไว้" / "ไม่มีในระบบนับ" → **ใช้ทุกแถวได้เลย ไม่ต้องกรองเพิ่ม**

## 3. โค้ด (วางได้เลย)
```js
// ---- โหลดครั้งเดียวตอนเปิดแอพ (แถวทั้งหมด ~200 ไม่ต้องแบ่งหน้า) ----
async function loadBillNames(){
  const r = await fetch(`${SUPABASE_URL}/rest/v1/pnl_stock_names?select=product_id,bill_name,same_name&order=product_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!r.ok) { window.BILL_NAME = {}; return; }      // view ยังไม่ถูกสร้าง/อ่านไม่ได้ -> แอพทำงานต่อตามปกติ ไม่มีป้าย
  window.BILL_NAME = {};                             // product_id -> ชื่อบิล
  (await r.json()).forEach(m => { if (!m.same_name && m.bill_name) window.BILL_NAME[m.product_id] = m.bill_name; });
}

// ---- ตอนวาดชื่อสินค้า p (ทุกจุด: รายการนับ, ร่างสั่งของ, ตั้งค่า safety/max ฯลฯ) ----
function nameHtml(p){
  const bn = (window.BILL_NAME || {})[p.id];
  return `<b>${esc(p.name)}</b>${bn ? ` <span class="billnm" title="ชื่อในบิล (P&L)">🧾 ${esc(bn)}</span>` : ''}`;
}
```
```css
.billnm{font-size:11px;color:#8a8a8a;font-weight:400;margin-left:4px;white-space:nowrap}
```
- ถ้าแอพนับมี Supabase Realtime อยู่แล้ว: subscribe ตาราง `pnl_stock_map` (view subscribe ไม่ได้) → เมื่อมี event ให้เรียก `loadBillNames()` ซ้ำ · ถ้าไม่มี realtime โหลดตอนเปิดแอพครั้งเดียวก็พอ (P&L ผูกชื่อใหม่นาน ๆ ครั้ง)
- `esc()` = ฟังก์ชัน escape HTML ของแอพนับเอง ใช้ตัวที่มีอยู่

## 4. ข้อห้าม / กติกาที่เจ้าของเคาะแล้ว
1. **อ่านอย่างเดียว** — ห้าม insert/update/delete `pnl_stock_map` หรือ view · การผูก/แก้ชื่อทำที่หน้า "ใช้จริง" ของแอพ P&L ที่เดียว
2. **ห้ามเปลี่ยนชื่อสินค้าใน jj-stock ให้ไปตรงกับชื่อบิล** — สองระบบตั้งใจให้ใช้ชื่อคนละชุด (พนักงานหน้าร้านเรียกแบบหนึ่ง ซัพเขียนบิลอีกแบบ) เชื่อมด้วยตารางผูกแทน
3. **ห้ามจับคู่ด้วยข้อความชื่อ** ใช้ `product_id` เท่านั้น (ชื่อบิลกับชื่อนับต่างกันได้เยอะ เช่น "นม 1ถุง = 2กิโล" ↔ "ไอศกรีม วนิลา")
4. ไม่ต้องทำไฟล์ CSV/Excel มาเทียบอีก — ข้อมูลสดอยู่ใน view แล้ว

## 5. เช็คว่าทำถูก
- เปิดแอพนับสาขารัชดา: ไอศกรีม 3 ตัวของเดสทินี (นม/ช็อกโกแลต/มัทฉะ 1ถุง = 2กิโล) ต้องมีป้าย 🧾 ไอศกรีม วนิลา / ช็อคโกแลต / ชาเขียว
- สินค้าที่ชื่อเหมือนกันสองระบบ (เช่น Coke, ส้ม) ต้อง**ไม่มี**ป้าย
- ปิด network ของ view (หรือ view ยังไม่สร้าง) แอพต้องยังใช้งานได้ปกติ แค่ไม่มีป้าย
- ทดสอบใน DevTools: `fetch(SUPABASE_URL+'/rest/v1/pnl_stock_names?select=*&limit=3',{headers:{apikey:KEY}}).then(r=>r.json()).then(console.log)` ต้องได้ 3 แถว

## 6. ถ้าอ่านไม่ได้ (error 42501 / 404)
- 404 `relation "pnl_stock_names" does not exist` → ฝั่ง P&L ยังไม่ได้รัน `sql/jjmk_pnl_stocknames_view.sql` ใน Supabase SQL Editor (บอก Pattrick)
- 42501 permission denied → ยังไม่ได้รัน `jjmk_pnl_stockread.sql` (grant anon อ่าน `products`) — ฝั่ง P&L เช่นกัน
