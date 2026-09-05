// ============================================================
// JJ P&L · Bill OCR Worker v3 (Cloudflare Worker + Gemini)
// อัปเดต: วางโค้ดนี้ทับของเดิมทั้งไฟล์ใน worker "jjmk-pnl-ocr" แล้วกด Deploy
// Secret ที่ต้องมี: GEMINI_API_KEY
// v3: ส่งสถานะกลับแบบเรียลไทม์ (streaming) — ตอนนี้ ๆ กำลังลองโมเดลไหนอยู่ ฝั่งแอพเห็นสด ๆ
//     ไม่ใช่รอเงียบ ๆ จนจบแล้วค่อยรู้ผลเหมือนเวอร์ชันก่อน
// v2: ลองหลายโมเดลอัตโนมัติ + retry ทันทีถ้า error ชั่วคราว · โชว์ error จริงจาก Gemini
//     · แกะ JSON ทนขึ้น · prompt ฉลาดขึ้นกับบิลลายมือ/ดอทเมทริกซ์จาง/รูปเอียง
// ============================================================
// อัปเดตชื่อโมเดลได้ 2 ทาง: แก้บรรทัดนี้ หรือเพิ่ม Variable ชื่อ MODEL ใน Settings (ไม่ต้องแก้โค้ด)
// อัปเดตล่าสุด (ส.ค. 2026): 3.7-flash คือรุ่นล่าสุดของ Google (GA 13 ส.ค. 2026), 3.6-flash เป็นรุ่นก่อนหน้ายังใช้งานได้
// ตัด gemini-2.5-flash / gemini-2.0-flash ออก เพราะ Google เลิกให้ใช้แล้ว (ยิงไปมีแต่ error เสียเวลาเปล่า)
const MODELS_DEFAULT = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: 'ยังไม่ได้ตั้ง Secret GEMINI_API_KEY ใน Worker (Settings → Variables)' }, 500);
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const { image, mime, knownItems = [], aliases = [] } = body || {};
    if (!image) return json({ error: 'no image' }, 400);

    const known = knownItems.slice(0, 120).map(k => `- ${k.item}${k.unit ? ` (หน่วย: ${k.unit})` : ''}`).join('\n');
    const known2 = aliases.slice(0, 120).map(a => `- "${a.alias}" คือสินค้า "${a.item}"`).join('\n');

    const prompt = `คุณเป็นระบบอ่านบิล/ใบส่งของ/ใบกำกับภาษีของร้านอาหารไทย อ่านรูปแล้วตอบเป็น JSON ล้วน ๆ เท่านั้น

โครงสร้างที่ต้องตอบ:
{"rows":[{"name":"ชื่อสินค้าตามบิล","matched_item":"ชื่อในระบบถ้าจับคู่ได้ ไม่งั้น null","qty":ตัวเลข,"unit":"หน่วยบนบิล เช่น กก./แพ็ค/ลัง (ไม่มีให้ใส่ ชิ้น)","price":ราคาต่อหน่วย,"line_discount":ส่วนลดบรรทัด(บาท ไม่มี=0)}],"bill_discount":0,"ship_fee":0,"other_fee":0,"vat_mode":"none|ex|inc","total_on_bill":ยอดสุทธิบนบิลหรือ null,"supplier_name":"ชื่อร้านบนหัวบิลถ้าอ่านได้","warning":"ใส่เฉพาะถ้าเจอปัญหาตามข้อ 10 ด้านล่าง ไม่งั้นใส่ null"}

วิธีอ่านให้ถูก (สำคัญมาก):
1. รูปอาจเอียง หมุน กลับหัว หรือแสงไม่ดี — หมุน/ปรับในใจแล้วอ่านให้ได้ บิลสำเนาสีน้ำเงินจาง ๆ (dot matrix) ให้ตั้งใจอ่านเป็นพิเศษ อย่าตอบว่าอ่านไม่ได้ถ้ายังพออ่านออก
2. ระวังลำดับคอลัมน์: บางบิลเรียง [ราคา/หน่วย, น้ำหนัก/จำนวน, จำนวนเงิน] คือราคามาก่อนจำนวน! ใช้สมการ ราคา × จำนวน ≈ จำนวนเงิน เป็นตัวตัดสินว่าคอลัมน์ไหนคือราคา คอลัมน์ไหนคือจำนวน ถ้าคูณแล้วไม่ตรง ให้สลับแล้วเช็คใหม่
3. ถ้าคอลัมน์ Price/ราคาขาย ดูเป็น "ยอดรวมของบรรทัด" (คูณจำนวนแล้วเกินยอดรวมบิล) ให้คิด price = ยอดบรรทัด ÷ qty
4. คอลัมน์ชื่อ "น้ำหนัก" = จำนวน (qty) หน่วยมักเป็น กก.
5. ข้ามแถวว่าง แถวที่มีแต่ขีด "-" บรรทัดเซ็นชื่อ ที่อยู่ ผู้รับ/สาขา — ไม่ใช่สินค้า
6. รหัสสินค้า (เช่น OHPFR0017) ไม่ใช่ชื่อ — เอาคำอธิบายภาษาไทยเป็น name · ช่อง Packing เช่น "10*500G." ใส่เป็น unit ได้
7. vat_mode: หัวบิลมีคำว่า ใบกำกับภาษี/TAX INVOICE หรือมีบรรทัดภาษีมูลค่าเพิ่ม 7% แยกบวก = "ex" · เขียนว่าราคารวม VAT แล้ว = "inc" · บิลส่งของธรรมดาไม่มีเรื่องภาษี = "none"
8. total_on_bill = ตัวเลขบรรทัด รวมเงิน/จำนวนเงินรวม/ยอดสุทธิ ที่พิมพ์บนบิล
9. ตัวเลขไทย/มีจุลภาค แปลงเป็นเลขปกติ · ห้ามแต่งรายการที่ไม่มีในบิลเพิ่มเอง
10. สำคัญมาก — เช็คว่ารูปตัดขอบตารางหรือเปล่า: ถ้าเห็นหัวคอลัมน์ (เช่น "จำนวน/Quantity", "ราคาขาย/Price", "ส่วนลด/Disc.") แต่แถวข้อมูลใต้หัวคอลัมน์นั้นว่างเปล่า/มองไม่เห็น/ถูกตัดขอบภาพไป หรือมีตัวเลขลอยอยู่แต่ไม่แน่ใจว่าอยู่คอลัมน์ไหนกันแน่เพราะไม่เห็นทั้งแถว ห้ามเดาตัวเลขมั่ว ๆ ให้ครบทุกครั้งแบบไม่บอกใคร — ให้ใส่ข้อความสั้น ๆ ใน field "warning" อธิบายปัญหา (เช่น "รูปตัดขอบขวาของตาราง มองไม่เห็นคอลัมน์จำนวน/ราคาเต็มแถว ตัวเลขที่กรอกอาจไม่ตรง แนะนำถ่ายใหม่ให้เห็นทั้งตาราง") แล้วค่อยกรอก rows ไปตามที่พอเดาได้ดีที่สุด (ดีกว่าไม่กรอกเลย แต่ต้องมี warning เตือนไว้เสมอเมื่อไม่มั่นใจแบบนี้)

การจับคู่ matched_item: เทียบชื่อบนบิลกับรายชื่อในระบบด้านล่าง สื่อถึงของเดียวกัน (สะกดต่าง/มีคำขยาย เช่น "หมูสามชั้นสไลด์ 2มม." = "หมูสามชั้น") ให้ใส่ชื่อระบบ ไม่แน่ใจใส่ null

รายชื่อสินค้าในระบบของซัพนี้:
${known || '(ยังไม่มี)'}

ชื่อบนบิลที่เคยจับคู่แล้ว (ใช้ตามนี้เลย):
${known2 || '(ยังไม่มี)'}`;

    const payload = {
      contents: [{ parts: [
        { inline_data: { mime_type: mime || 'image/jpeg', data: image } },
        { text: prompt },
      ]}],
      generationConfig: { temperature: 0, response_mime_type: 'application/json', maxOutputTokens: 4096 },
    };

    // สตรีมกลับทีละบรรทัด (NDJSON) เพื่อให้ฝั่งแอพเห็นสถานะสด ๆ ว่ากำลังลองโมเดลไหนอยู่
    // แทนที่จะรอเงียบ ๆ จนจบทีเดียวเหมือนเดิม
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();
    const send = (obj) => writer.write(enc.encode(JSON.stringify(obj) + '\n')).catch(() => {});

    // โควตาฟรีของ Gemini (เช่น 20 ครั้ง/นาที) นับแยกต่างหากจาก "high demand" —
    // ลองซ้ำโมเดลเดิมทันทีไม่มีทางช่วยเมื่อโควตาหมด มีแต่จะยิ่งเปลืองโควตาที่เหลือเปล่า ๆ
    const QUOTA_RE = /quota|rate.?limit|resource_exhausted|429|exceeded your current/i;
    const TRANSIENT_RE = /overloaded|high demand|unavailable|try again/i; // เฉพาะเซิร์ฟเวอร์แน่นชั่วคราว ไม่ใช่โควตา

    const work = (async () => {
      const tried = [];
      const MODELS = [env.MODEL, ...MODELS_DEFAULT].filter(Boolean);
      let result = null;
      let quotaHit = null; // {model, retryAfter, reason} ของตัวล่าสุดที่เจอโควตาหมด
      let retried = false; // ทั้งการทำงานนี้ ลองซ้ำโมเดลเดิมได้แค่ครั้งเดียวรวม (กันเปลืองโควตา ไม่ใช่ต่อโมเดล)
      let i = 0;
      while (i < MODELS.length) {
        const model = MODELS[i];
        await send({ status: 'trying', model });
        try {
          // กันโมเดลค้าง (เช่น high demand): เกิน 25 วิ ตัดไปตัวถัดไป
          const ctl = new AbortController();
          const tm = setTimeout(() => ctl.abort('timeout'), 25000);
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal },
          ).finally(() => clearTimeout(tm));
          const g = await r.json();
          if (g.error) {
            const msg = g.error.message || g.error.status || '';
            if (QUOTA_RE.test(msg)) {
              // โควตาหมด: ไม่ retry โมเดลนี้ซ้ำเด็ดขาด แต่ยังลองโมเดลถัดไปได้ (โควตาฟรีมักแยกตามโมเดล)
              const rm = msg.match(/retry in\s*([\d.]+)\s*s/i);
              quotaHit = { model, retryAfter: rm ? Math.ceil(parseFloat(rm[1])) : null, reason: msg };
              tried.push(`${model}: ${msg}`);
              i++;
              continue;
            }
            const transient = TRANSIENT_RE.test(msg);
            if (transient && !retried) {
              retried = true;
              await send({ status: 'retry', model, reason: msg });
              continue; // ไม่ขยับ i -> ลองโมเดลเดิมซ้ำอีกครั้งเดียว (ทั้ง run รวมกัน ไม่ใช่ต่อโมเดล)
            }
            tried.push(`${model}: ${msg}`);
            i++;
            continue;
          }
          const txt = g?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
          const parsed = extractJson(txt);
          if (parsed) { parsed._model = model; result = parsed; break; }
          tried.push(`${model}: ตอบมาไม่ใช่ JSON (${txt.slice(0, 120)})`);
          i++;
        } catch (e) {
          tried.push(`${model}: ${String(e).slice(0, 120)}`); // timeout/เน็ตสะดุด — ไปโมเดลถัดไปตรง ๆ ไม่ retry ซ้ำ
          i++;
        }
      }
      if (result) { await send({ status: 'done', ...result }); await writer.close(); return; }
      if (quotaHit && tried.every(t => QUOTA_RE.test(t))) {
        // ทุกโมเดลที่ลองพังเพราะโควตาล้วน ๆ (ไม่ใช่เหตุอื่นปน) — บอกเวลาที่ต้องรอให้ชัด
        await send({ status: 'quota', model: quotaHit.model, retryAfter: quotaHit.retryAfter, reason: quotaHit.reason });
        await writer.close();
        return;
      }
      await send({ status: 'error', error: 'Gemini อ่านไม่สำเร็จ — ' + tried.join(' | ') });
      await writer.close();
    })();

    if (ctx && ctx.waitUntil) ctx.waitUntil(work); // กันเวิร์กเกอร์ถูกตัดตอนก่อนสตรีมจบ

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS },
    });
  },
};

function extractJson(txt) {
  if (!txt) return null;
  let t = txt.replace(/```json|```/g, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
  }
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
