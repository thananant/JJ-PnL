// ============================================================
// JJ Social — social-webhook
// จุดรับข้อมูลจากทุกช่องทาง: LINE OA / Facebook / Instagram / generic
// deploy: supabase functions deploy social-webhook --no-verify-jwt
// (ตรวจลายเซ็นของแต่ละแพลตฟอร์มเองในโค้ดนี้)
// ============================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";

// เวอร์ชันโค้ด — แอปใช้เทียบว่าที่ deploy ใน Supabase เป็นตัวล่าสุดหรือยัง (แก้โค้ดแล้วเลื่อนวันที่ด้วย)
const VERSION = "2026-10-06.2";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// ใช้ชื่อเฉพาะของ JJ Social — อย่าสับสนกับ LINE_SECRET/LINE_TOKEN ซึ่งเป็นของ OA ระบบอื่น
const LINE_SECRET = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET") ?? "";
const FB_VERIFY = Deno.env.get("FB_VERIFY_TOKEN") ?? "jjmk-social";
const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_TOKEN") ?? "";
const GENERIC_KEY = Deno.env.get("WEBHOOK_SHARED_KEY") ?? "";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const CLAUDE_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const CLAUDE_MODEL = "claude-opus-5-5";
const sb = createClient(SB_URL, SB_SERVICE);
let _anthropic: Anthropic | null = null; // สร้างเมื่อใช้จริงเท่านั้น (โหมดฟรีไม่ต้องมีคีย์)
const anthropic = () => (_anthropic ??= new Anthropic({ apiKey: CLAUDE_KEY, timeout: 60000, maxRetries: 1 }));

// ===== ระบบ AI 3 ชั้น: Claude (โหมดคุณภาพสูงสุด) → Gemini (โควต้าฟรี) → กติกาเบื้องต้น (ฟรีเสมอ) =====
let claudeDownUntil = 0; // เจอปัญหาเครดิต/คีย์ → พัก Claude 10 นาที ไม่ยิงซ้ำทุกรายการ
// โหมด AI: 'free' = ใช้ Gemini (โควต้าฟรี) → กติกาเบื้องต้น · 'best' = ลอง Claude ก่อน (มีค่าใช้จ่าย)
let AI_MODE: "free" | "best" = "free";
const useClaude = () => AI_MODE === "best" && !!CLAUDE_KEY && Date.now() > claudeDownUntil;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ----- กันค่าลับหลุด: ข้อความผิดพลาดทุกอันที่จะเก็บลงฐานข้อมูลหรือส่งกลับหน้าแอป ต้องผ่าน scrub() ก่อน -----
// (social_settings อ่านได้ด้วยคีย์สาธารณะ และ error ของ fetch มี URL เต็มติดมา — ห้ามมีคีย์/โทเคนหลุดไป)
// โค้ดตั้งแต่บรรทัดนี้ถึง faqReply() เหมือนกันทั้ง social-brain และ social-webhook — แก้ต้องแก้ทั้ง 2 ไฟล์
const SECRET_VALUES = ["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GOOGLE_MAPS_API_KEY",
  "LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET", "FB_PAGE_TOKEN", "FB_APP_SECRET",
  "GBP_CLIENT_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "WEBHOOK_SHARED_KEY", "APIFY_TOKEN"]
  .map((k) => Deno.env.get(k) ?? "").filter((v) => v.length >= 8);
function scrub(s: unknown): string {
  let t = String((s as any)?.message ?? s ?? "");
  for (const v of SECRET_VALUES) t = t.split(v).join("***");
  return t.replace(/([?&](?:key|token|access_token|client_secret|refresh_token)=)[^&\s)"']+/gi, "$1***");
}

// ----- สุขภาพ AI: เก็บลง social_settings id='ai_health' ให้หน้าสถานะเห็นข้ามรอบ/ข้ามฟังก์ชัน -----
// Gemini รุ่นฟรีที่ยังเปิดให้โปรเจกต์ใหม่ (Google ปิด 2.0 แล้ว และ 2.5 ให้เฉพาะโปรเจกต์ที่เคยใช้)
// แต่ละรุ่นมีโควต้าฟรีรายวันของตัวเอง → หมดรุ่นแรกก็ไปใช้รุ่นถัดไป
const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
const GEM_GAP_MS = 6500; // เว้นจังหวะระหว่างคำขอ ไม่ให้ชนโควต้าฟรีต่อนาที
async function sha8(s: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...h.slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// ลายนิ้วมือของคีย์ (ไม่ใช่ตัวคีย์) — เปลี่ยนคีย์ใหม่แล้วลืมสถานะ "ใช้ไม่ได้/โควต้าหมด" ของคีย์เก่าทันที
const GEM_FP = GEMINI_KEY ? await sha8(GEMINI_KEY) : "";
let gemLastCall = 0;
let gemUsedDelta = 0;    // จำนวนคำขอ Gemini ที่ยังไม่ได้บันทึกลงฐานข้อมูล
let aihDirty = false;
// ทำไมคำขอล่าสุดไม่ได้ผล: 'content' = Gemini ตอบแต่ใช้ไม่ได้ (บล็อก/ไม่ครบ — ส่งซ้ำก็ไม่ผ่าน)
// 'transient' = ล่ม/ช้า/เน็ตหลุด/ชนโควต้าต่อนาที (ลองใหม่ทีหลังได้) · ใช้ตัดสินว่าจะติดป้าย "AI ไม่ผ่าน" หรือแค่รอรอบหน้า
let gemLastFail: "" | "content" | "transient" = "";
let gemKeyCleared = false; // เจ้าของแก้คีย์/เปิด API แล้วกดตรวจใหม่ → ล้างสถานะ "คีย์ใช้ไม่ได้" ทั้งในเครื่องและในฐานข้อมูล
const AIH: { gemini: any; claude: any } = { gemini: {}, claude: {} };
function laParts(t: number) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  return p;
}
// โควต้ารายวันของ Gemini รีเซ็ตเที่ยงคืนเวลาแปซิฟิก (ราว 14:00–15:00 เวลาไทย)
const pacificDay = (t = Date.now()) => { const p = laParts(t); return `${p.year}-${p.month}-${p.day}`; };
function msToPacificMidnight(t = Date.now()) {
  const p = laParts(t);
  const el = ((Number(p.hour) % 24) * 3600 + Number(p.minute) * 60 + Number(p.second)) * 1000;
  return 86400000 - el + 120000; // +2 นาทีเผื่อ
}
function gemState() {
  const g = AIH.gemini;
  const today = pacificDay();
  if (g.day !== today) { g.day = today; g.used = 0; }
  g.down = Object.fromEntries(Object.entries(g.down ?? {}).filter(([, u]) => Number(u) > Date.now()));
  g.why = Object.fromEntries(Object.entries(g.why ?? {}).filter(([m]) => m in g.down)); // quota | unsupported | key
  return g;
}
function gemDown(model: string, ms: number, why: "quota" | "unsupported" | "key") {
  const g = gemState();
  g.down[model] = Date.now() + ms; g.why[model] = why; aihDirty = true;
}
const gemUsedToday = () => (gemState().used ?? 0) + gemUsedDelta;
const gemAvailable = () => !!GEMINI_KEY && GEMINI_MODELS.some((m) => !(Number(gemState().down[m] ?? 0) > Date.now()));
function newer(a: any, b: any) { return String(a?.at ?? "") >= String(b?.at ?? "") ? a : b; }
// ค่าเวลาในอนาคต (มีคนแก้ตารางเอง) ไม่นับ — กันค่าปลอมค้างถาวร
const notFuture = (x: any) => (x && String(x.at ?? "") > new Date(Date.now() + 600000).toISOString() ? null : x);
const sameKey = (sg: any) => !sg?.fp || sg.fp === GEM_FP;
// รวมสถานะที่อ่านจากฐานข้อมูลเข้ากับของในหน่วยความจำ (ค่าที่ใหม่กว่า/พักนานกว่าชนะ)
function absorbAiHealth(stored: any) {
  const g = gemState();
  const sg = sameKey(stored?.gemini) ? (stored?.gemini ?? {}) : {}; // คีย์เปลี่ยน = เริ่มนับใหม่
  if (sg.day && sg.day === g.day) g.used = Math.max(g.used ?? 0, Number(sg.used) || 0);
  for (const [m, u] of Object.entries(sg.down ?? {})) {
    if (Number(u) > Number(g.down[m] ?? 0) && Number(u) < Date.now() + 86400000 * 2) { g.down[m] = Number(u); g.why[m] = sg.why?.[m] ?? "quota"; }
  }
  const sl = notFuture(sg.last);
  if (sl) g.last = g.last ? newer(g.last, sl) : sl;
  if (sg.ok_at && String(sg.ok_at) > String(g.ok_at ?? "") && notFuture({ at: sg.ok_at })) g.ok_at = sg.ok_at;
  const sc = notFuture(stored?.claude) ?? {};
  if (String(sc.at ?? "") > String(AIH.claude.at ?? "")) AIH.claude = { ...sc };
  const du = Number(sc.down_until ?? 0);
  if (du > claudeDownUntil && du < Date.now() + 3600000) claudeDownUntil = du;
}
async function flushAiHealth() {
  if (!aihDirty && !gemUsedDelta) return;
  try {
    const { data, error } = await sb.from("social_settings").select("val").eq("id", "ai_health").maybeSingle();
    if (error) throw error; // อ่านไม่ได้ = ไม่เขียนทับ (รอบหน้าค่อยบันทึก)
    const delta = gemUsedDelta;
    gemUsedDelta = 0; aihDirty = false;
    const cur = data?.val ?? {};
    const g = gemState();
    const cg = sameKey(cur.gemini) ? (cur.gemini ?? {}) : {};
    const used = (cg.day === g.day ? (Number(cg.used) || 0) : 0) + delta;
    g.used = Math.max(g.used ?? 0, used);
    const down: Record<string, number> = {}, why: Record<string, string> = {};
    for (const src of [cg, g]) for (const [m, u] of Object.entries(src.down ?? {})) {
      if (src === cg && gemKeyCleared && (cg.why?.[m] ?? "quota") === "key" && !(g.down?.[m] > Date.now())) continue;
      if (Number(u) > Date.now() && Number(u) > (down[m] ?? 0)) { down[m] = Number(u); why[m] = src.why?.[m] ?? "quota"; }
    }
    gemKeyCleared = false;
    const cl = notFuture(cg.last);
    const cc = notFuture(cur.claude);
    const val = {
      gemini: { day: g.day, used, fp: GEM_FP, down, why,
        last: cl ? (g.last ? newer(g.last, cl) : cl) : g.last ?? null,
        ok_at: [g.ok_at, notFuture({ at: cg.ok_at })?.at].filter(Boolean).sort().pop() ?? null },
      claude: cc && String(cc.at ?? "") > String(AIH.claude.at ?? "") ? cc : AIH.claude,
    };
    const { error: ue } = await sb.from("social_settings").upsert({ id: "ai_health", val, updated_at: new Date().toISOString() });
    if (ue) throw ue;
  } catch (e) { console.error("ai_health", scrub(e)); }
}
function noteGem(model: string, status: number, err: string) {
  const g = gemState();
  const at = new Date().toISOString();
  g.last = { model, status: Number(status) || 0, error: scrub(err).slice(0, 220), at };
  if (status === 200 && !err) g.ok_at = at;
  aihDirty = true;
}
// ข้อมูลส่วนตัวลูกค้า (เบอร์/อีเมล/ไอดีไลน์) ไม่ส่งไป Gemini ฟรี — Google เอาข้อมูลฝั่งฟรีไปใช้ปรับปรุงบริการได้
function maskPII(s: string): string {
  return String(s ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[อีเมล]")
    .replace(/(?<!\d)(?:\+?66|0)(?:[\s.-]?\d){8,9}(?!\d)/g, "[เบอร์โทร]")
    .replace(/(line\s*id|ไลน์\s*(?:id|ไอดี)|ไอดี\s*(?:line|ไลน์)|line\s*ไอดี)\s*[:：]?\s*@?[A-Za-z0-9._-]{3,}/gi, "$1 [ไอดี]")
    .replace(/(ไลน์|line)\s*(?:[:：]\s*@?|@)[A-Za-z0-9._-]{3,}/gi, "$1 [ไอดี]");
}
function looseJson(t: string): any | null {
  try { return JSON.parse(t); } catch { /* ลองตัดส่วนเกิน */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* */ } }
  return null;
}
// ล้างสถานะ "คีย์ใช้ไม่ได้" (ใช้ตอนกดตรวจสถานะ) — ถ้าคีย์ยังเสียจริง คำขอถัดไปจะติดสถานะกลับมาเอง
function gemClearKeyDown() {
  const g = gemState();
  for (const m of Object.keys(g.down)) if (g.why[m] === "key") { delete g.down[m]; delete g.why[m]; gemKeyCleared = true; aihDirty = true; }
}
async function geminiJson(system: string, user: string, maxTokens = 2500): Promise<any | null> {
  gemLastFail = "transient";
  if (!GEMINI_KEY) return null;
  let sawContent = false, sawTransient = false;
  const done = () => { gemLastFail = sawContent && !sawTransient ? "content" : "transient"; return null; };
  for (const model of GEMINI_MODELS) {
    if (Number(gemState().down[model] ?? 0) > Date.now()) continue; // รุ่นนี้หมดโควต้าวันนี้/ใช้ไม่ได้
    for (let attempt = 0; attempt < 2; attempt++) {
      // จองคิวก่อนรอ — หลายงานในเครื่องเดียวกันจะเรียงคิวกัน ไม่ยิงพร้อมกันจนชนโควต้าต่อนาที
      const slot = Math.max(Date.now(), gemLastCall + GEM_GAP_MS);
      gemLastCall = slot;
      if (slot > Date.now()) await sleep(slot - Date.now());
      let r: Response;
      try {
        // คีย์ส่งทาง header เท่านั้น (ไม่ใส่ใน URL — error ของ fetch จะมี URL เต็มติดมา)
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
          signal: AbortSignal.timeout(40000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              responseMimeType: "application/json", maxOutputTokens: maxTokens, temperature: 0.4,
              // ปิดโหมดคิดนาน — เร็วกว่า และไม่กินโทเคนคำตอบจนตัดกลางคัน
              thinkingConfig: model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "minimal" },
            },
          }),
        });
      } catch (e) { sawTransient = true; noteGem(model, 0, "เชื่อมต่อไม่ได้: " + scrub(e)); break; }
      if (r.ok) {
        gemUsedDelta++;
        const d = await r.json().catch(() => null);
        const t = (d?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
        const j = looseJson(t);
        if (j) { noteGem(model, 200, ""); gemLastFail = ""; return j; }
        sawContent = true;
        noteGem(model, 200, "ตอบไม่เป็น JSON (" + (d?.candidates?.[0]?.finishReason ?? d?.promptFeedback?.blockReason ?? "ว่าง") + ")");
        break; // ลองรุ่นถัดไป
      }
      const txt = await r.text().catch(() => "");
      if (r.status === 429) {
        const retry = Number(/"retryDelay":\s*"(\d+)/.exec(txt)?.[1] ?? 0);
        if (/PerDay|per.?day/i.test(txt) || retry > 60) {
          // โควต้าฟรีรายวันของรุ่นนี้หมด → พักรุ่นนี้ถึงเที่ยงคืนแปซิฟิก ไม่เสียเวลารอ
          gemDown(model, msToPacificMidnight(), "quota");
          noteGem(model, 429, "โควต้าฟรีรายวันของรุ่นนี้หมดแล้ว (รีเซ็ตราว 14:00–15:00 เวลาไทย)");
          break;
        }
        noteGem(model, 429, "ชนโควต้าต่อนาที");
        if (attempt === 0) { await sleep(Math.min(Math.max(retry, 5), 20) * 1000); continue; }
        sawTransient = true;
        break;
      }
      if (r.status === 400 && /API key not valid|API_KEY_INVALID/i.test(txt)) {
        for (const m of GEMINI_MODELS) gemDown(m, 3600000, "key");
        noteGem(model, 400, "GEMINI_API_KEY ไม่ถูกต้อง — สร้างคีย์ใหม่ที่ aistudio.google.com/apikey");
        sawTransient = true; return done();
      }
      if (r.status === 403) {
        for (const m of GEMINI_MODELS) gemDown(m, 3600000, "key");
        noteGem(model, 403, "คีย์ไม่มีสิทธิ์ใช้ Gemini API (ถูกจำกัด API หรือยังไม่เปิด Generative Language API): " + txt.slice(0, 140));
        sawTransient = true; return done();
      }
      if (r.status === 404 || (r.status === 400 && /not found|not supported|no longer|unavailable/i.test(txt))) {
        gemDown(model, 6 * 3600000, "unsupported"); // โปรเจกต์นี้ใช้รุ่นนี้ไม่ได้ → ข้ามไปรุ่นถัดไป
        noteGem(model, r.status, "รุ่นนี้ใช้ไม่ได้กับคีย์นี้: " + txt.slice(0, 140));
        break;
      }
      if (r.status === 400) sawContent = true; else sawTransient = true; // 400 = ข้อความนี้เอง · 5xx ฯลฯ = ชั่วคราว
      noteGem(model, r.status, txt.slice(0, 180)); // ลองรุ่นถัดไป
      break;
    }
  }
  return done();
}
// ทำไม Gemini ใช้ไม่ได้ตอนนี้: 'quota' = โควต้าวันนี้หมด (รอรีเซ็ต) · 'key' = คีย์ผิด/ไม่มีสิทธิ์ · 'unsupported' = ไม่มีรุ่นที่ใช้ได้
function gemWhy(): "ok" | "no_key" | "quota" | "key" | "unsupported" {
  if (!GEMINI_KEY) return "no_key";
  if (gemAvailable()) return "ok";
  const w = Object.values(gemState().why ?? {});
  return w.includes("quota") ? "quota" : w.includes("key") ? "key" : "unsupported";
}
function markClaudeDown(e: unknown) {
  const msg = scrub(e);
  console.error("claude", msg.slice(0, 200));
  // พักเฉพาะปัญหาที่ยิงซ้ำก็ไม่หาย: เครดิตหมด/คีย์ผิด/ไม่มีสิทธิ์/ไม่มีรุ่นนี้ — คำขอผิดรูปแบบครั้งเดียวไม่นับ
  if (/credit balance|billing|authentication|x-api-key|api.?key|permission|not_found_error|\b40[123]\b/i.test(msg)) {
    claudeDownUntil = Date.now() + 10 * 60000;
    AIH.claude = { down_until: claudeDownUntil, error: msg.slice(0, 220), at: new Date().toISOString(), ok_at: AIH.claude.ok_at ?? null };
    aihDirty = true;
  }
}
function noteClaudeOk() {
  const at = new Date().toISOString();
  // บันทึกลงฐานข้อมูลเฉพาะตอนหายจากข้อผิดพลาด หรือทุก 30 นาที (ไม่เขียนทุกรายการ)
  if (AIH.claude.error || !AIH.claude.ok_at || Date.parse(at) - Date.parse(AIH.claude.ok_at) > 1800000) aihDirty = true;
  AIH.claude = { ok_at: at, at };
}

// จับคู่คำถามลูกค้ากับ FAQ แบบไม่ใช้ AI (ฟรี) — ใช้ตอน AI ไม่ว่าง
// ทำข้อความให้เทียบกันได้: ตัวเล็ก ตัดช่องว่าง/เครื่องหมาย และคำลงท้าย (เฉพาะท้ายประโยค)
const faqNorm = (t: string) => String(t ?? "").toLowerCase().replace(/[\s\p{P}\p{S}ๆ]+/gu, "")
  .replace(/(ครับ|คับ|ค่ะ|คะ|นะ|จ้า|จ้ะ|ป่ะ|มั้ย|ไหม|หรอ|เหรอ|บ้าง|หน่อย)+$/, "");
function bigrams(t: string) {
  const s = faqNorm(t);
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); out.set(k, (out.get(k) ?? 0) + 1); }
  return out;
}
function faqMatch(text: string, faq: { q: string; a: string }[]): { q: string; a: string; score: number; cover: number } | null {
  const A = bigrams(text);
  const na = [...A.values()].reduce((x, y) => x + y, 0);
  if (na < 2) return null;
  let best: { q: string; a: string; score: number; cover: number } | null = null;
  for (const f of faq ?? []) {
    if (!f?.q || !f?.a) continue;
    const B = bigrams(f.q);
    const nb = [...B.values()].reduce((x, y) => x + y, 0);
    if (!nb) continue;
    let inter = 0;
    for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
    const score = (2 * inter) / (na + nb); // Dice coefficient
    const cover = inter / nb;               // คำถามใน FAQ อยู่ในข้อความลูกค้าครบแค่ไหน
    if (!best || score > best.score) best = { q: f.q, a: f.a, score, cover };
  }
  return best && best.score >= 0.6 ? best : null;
}
// คำที่ทำให้ความหมายกลับ/เป็นเรื่องร้องเรียน — ถ้าลูกค้าพูดแต่คำถามใน FAQ ไม่มี ห้ามตอบเอง
const FAQ_NEG = ["ไม่", "ยกเลิก", "แย่", "ทำไม", "ช้า", "ผิด", "เสีย", "หาย", "โกง", "คืนเงิน", "ร้องเรียน", "แพง"];
// ตรงเป๊ะ (ข้อความเหมือนคำถามใน FAQ หลังตัดช่องว่าง/คำลงท้าย) = ตอบเองได้ · คล้าย ๆ = เก็บเป็นร่างให้คนกดส่ง
// (เทียบแบบคล้ายอย่างเดียวไม่พอ — "เปิดกี่โมง" มีคำว่า "ปิดกี่โมง" อยู่ข้างในทั้งก้อน)
function faqReply(text: string, faq: { q: string; a: string }[], escalate: string[]) {
  if ((escalate ?? []).some((k) => k && text.includes(k))) return null;
  const hit = faqMatch(text, faq);
  if (!hit) return null;
  const negExtra = FAQ_NEG.some((w) => text.includes(w) && !hit.q.includes(w));
  const sure = faqNorm(text) === faqNorm(hit.q) && !negExtra;
  return { reply: hit.a, needs_human: !sure, reason: `${sure ? "faq-match" : "faq-match-uncertain"} ${hit.score.toFixed(2)}: ${hit.q}` };
}

const ChatReply = z.object({
  reply: z.string(),        // ข้อความตอบลูกค้า (ภาษาเดียวกับลูกค้า)
  needs_human: z.boolean(), // true = เรื่องร้องเรียนรุนแรง/ขอเงินคืน/เกินขอบเขตบอท
  reason: z.string(),
});

// อ่านผลลัพธ์ structured output: ใช้ parsed_output ก่อน ถ้าไม่มีให้ parse จาก text block
function parsedOf<T>(res: any): T | null {
  if (res?.parsed_output) return res.parsed_output as T;
  try {
    const t = (res?.content ?? []).find((b: any) => b.type === "text");
    return t?.text ? JSON.parse(t.text) as T : null;
  } catch { return null; }
}

// ===== Google Business Profile OAuth (ปุ่มเชื่อมต่อบัญชีร้าน) =====
const GBP_CLIENT_ID = Deno.env.get("GBP_CLIENT_ID") ?? "";
const GBP_CLIENT_SECRET = Deno.env.get("GBP_CLIENT_SECRET") ?? "";
async function aesKey() {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SB_SERVICE));
  return crypto.subtle.importKey("raw", h, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptRT(rt: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(rt)));
  return btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...ct));
}
const APP_URL = "https://thananant.github.io/JJ-PnL/jjmk-social.html";
function gbpPage(ok: boolean, msg: string): Response {
  // เด้งกลับเข้าแอปพร้อมผลลัพธ์ — แอปจะโชว์ข้อความแจ้งเอง
  const clean = msg.replace(/<[^>]*>/g, " ").slice(0, 160);
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}#gbp=${ok ? "ok" : "err:" + encodeURIComponent(clean)}` },
  });
}
async function gbpOauth(u: URL): Promise<Response> {
  try {
    const code = u.searchParams.get("code") ?? "";
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GBP_CLIENT_ID, client_secret: GBP_CLIENT_SECRET,
        redirect_uri: `${SB_URL}/functions/v1/social-webhook`, grant_type: "authorization_code",
      }),
    });
    const d = await r.json();
    if (!r.ok || !d.refresh_token)
      return gbpPage(false, "Google ตอบกลับ: " + scrub(JSON.stringify(d)).slice(0, 280) + " — ลองกดเชื่อมต่อจากแอปใหม่อีกครั้ง");
    const enc = await encryptRT(d.refresh_token);
    const { data: cur, error: re } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
    if (re) return gbpPage(false, "บันทึกการเชื่อมต่อไม่ได้ (อ่านการตั้งค่าไม่ได้) — ลองกดเชื่อมต่อใหม่อีกครั้ง");
    const old = (cur?.val ?? {}).gbp ?? {};
    // เชื่อมใหม่: ล้างผลซิงค์/ข้อผิดพลาดเดิม แต่คงรายการโปรไฟล์ + การจับคู่สาขา ("ไม่ดึง" ด้วย) ไว้
    // ซิงค์รอบหน้าจะหาโปรไฟล์ใหม่ (rediscover) แล้วใช้การจับคู่เดิมกับโปรไฟล์ที่ id ตรงกัน
    const { last_error: _e, last_error_at: _ea, loc_errors: _le, last_sync: _ls, full_progress: _fp, unmapped: _um, ...keep } = old;
    const val = { ...(cur?.val ?? {}), gbp: { ...keep, rt_enc: enc, connected: true, connected_at: new Date().toISOString(), rediscover: true } };
    const { error: ue } = await sb.from("social_settings").upsert({ id: "channels", val, updated_at: new Date().toISOString() });
    if (ue) return gbpPage(false, "บันทึกการเชื่อมต่อไม่ได้: " + scrub(ue.message));
    return gbpPage(true, "ปิดหน้านี้ได้เลย แล้วกลับไปที่แอป JJ Social → หน้า \"เชื่อมต่อช่องทาง\" → กด \"⟳ ซิงค์รีวิวทั้งหมด\"");
  } catch (e) {
    return gbpPage(false, scrub(e).slice(0, 300));
  }
}

// ตรวจ state ที่ social-brain ออกให้ (ต้องตรงกับ gbpState() ใน social-brain.ts)
async function hmacB64(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function gbpStateOk(state: string) {
  const [p, exp, nonce, sig] = state.split(".");
  if (p !== "jjgbp" || !exp || !nonce || !sig || !(Number(exp) > Date.now())) return false;
  return safeEq(sig, await hmacB64(SB_SERVICE, `jjgbp.${exp}.${nonce}`));
}

function bg(p: Promise<unknown>) {
  // @ts-ignore: EdgeRuntime มีเฉพาะบน Supabase Edge Runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p.catch((e) => console.error(e)));
  else p.catch((e) => console.error(e));
}

async function hmacSha256(key: string, body: string, out: "base64" | "hex") {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  if (out === "base64") return btoa(String.fromCharCode(...sig));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function getSettings() {
  const { data } = await sb.from("social_settings").select("id,val");
  const m: Record<string, any> = {};
  (data ?? []).forEach((r: any) => (m[r.id] = r.val || {}));
  AI_MODE = m.bot?.ai_mode === "best" ? "best" : "free";   // ตั้งต้น = โหมดฟรี
  absorbAiHealth(m.ai_health);  // รู้ว่าโควต้า Gemini รุ่นไหนหมด/Claude พักอยู่ ไม่ยิงซ้ำให้เสียเวลา
  return m;
}

// เก็บ mention (รีวิว/คอมเมนต์) + ส่งไปวิเคราะห์ต่อเบื้องหลัง
async function saveMention(row: Record<string, unknown>) {
  const { data, error } = await sb.from("social_mentions")
    .upsert(row, { onConflict: "channel,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) { console.error("saveMention", error); return; }
  const ids = (data ?? []).map((r: any) => r.id);
  if (ids.length) {
    bg(fetch(`${SB_URL}/functions/v1/social-brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SB_SERVICE}` },
      body: JSON.stringify({ action: "analyze", ids }),
    }));
  }
}

// ---------- แชทบอท ----------
// strictFaq = โหมด "ตอบออโต้เฉพาะคำถามพบบ่อย": ตอบเองเฉพาะที่มีคำตอบใน FAQ/ข้อมูลร้าน นอกนั้นส่งให้คน
async function botAnswer(channel: string, threadId: string, settings: Record<string, any>, strictFaq = false) {
  const bot = settings.bot ?? {}, shop = settings.shop ?? {};
  const { data: hist } = await sb.from("social_chat_log")
    .select("direction,text,meta").eq("channel", channel).eq("thread_id", threadId)
    .order("created_at", { ascending: false }).limit(14);
  const turns = (hist ?? []).reverse().filter((t: any) => !t.meta?.draft); // ร่างที่ยังไม่ส่ง ไม่นับเป็นบทสนทนา
  const messages: Anthropic.MessageParam[] = [];
  for (const t of turns) {
    const role = t.direction === "in" ? "user" as const : "assistant" as const;
    if (!messages.length && role !== "user") continue; // ข้อความแรกต้องเป็นฝั่งลูกค้า
    messages.push({ role, content: t.text });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;

  const kw: string[] = bot.escalate_keywords ?? [];
  const faq = (shop.faq ?? []).map((f: any) => `ถาม: ${f.q}\nตอบ: ${f.a}`).join("\n\n");
  const system = `${bot.persona ?? "คุณคือแอดมินร้านอาหาร ตอบสุภาพ"}

ข้อมูลร้าน:
- ชื่อร้าน: ${shop.name ?? "จริงใจหมูกระทะ"}
- ${shop.info ?? ""}
- เวลาเปิด-ปิด: ${shop.hours ?? ""}
${faq ? "\nคำถามที่พบบ่อย:\n" + faq : ""}

กติกา:
- ตอบเฉพาะเรื่องของร้านเท่านั้น ไม่ตอบเรื่องอื่น
- ห้ามแต่งข้อมูลที่ไม่รู้ (ราคา/โปรโมชั่น/วันหยุด) ถ้าไม่มีในข้อมูลร้าน ให้บอกว่าเดี๋ยวแอดมินมายืนยันอีกที และตั้ง needs_human = true
- ถ้าลูกค้าร้องเรียนรุนแรง เจ็บป่วย ขอเงินคืน หรือพูดถึงคำเหล่านี้: ${kw.join(", ")} ให้ตั้ง needs_human = true${strictFaq ? `
- โหมดเข้มงวด: ตอบอัตโนมัติเฉพาะคำถามที่ตรงหรือใกล้เคียงกับ "คำถามที่พบบ่อย" หรือข้อมูลร้านข้างต้นเท่านั้น — คำถามอื่นทุกกรณี (รวมถึงจอง/สั่งอาหาร/เรื่องเฉพาะบุคคล) ให้ตั้ง needs_human = true` : ""}`;

  let out: z.infer<typeof ChatReply> | null = null;
  if (useClaude()) {
    try {
      const res = await anthropic().messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(ChatReply) },
        system,
        messages,
      });
      if (res.stop_reason === "refusal") return { reply: "", needs_human: true, reason: "refusal" };
      out = parsedOf<z.infer<typeof ChatReply>>(res);
      if (out) noteClaudeOk();
    } catch (e) { markClaudeDown(e); }
  }
  if (!out && gemAvailable()) {
    // ตัดเบอร์โทร/อีเมล/ไอดีไลน์ของลูกค้าออกก่อนส่งให้ Gemini ฟรี
    const hist = messages.map((m) => `${m.role === "user" ? "ลูกค้า" : "ร้าน"}: ${maskPII(String(m.content))}`).join("\n");
    const j = await geminiJson(system + `\n\nตอบเป็น JSON ล้วน: {"reply":"ข้อความตอบลูกค้า","needs_human":true/false,"reason":"เหตุผลสั้นๆ"}`, hist, 800);
    if (j && typeof j.reply === "string") out = { reply: j.reply, needs_human: !!j.needs_human, reason: String(j.reason ?? "") };
  }
  if (!out) {
    // AI ใช้ไม่ได้ (โควต้าหมด/ยังไม่ตั้งคีย์) → เทียบกับ FAQ แบบไม่ใช้ AI
    // ตรงเป๊ะ = ตอบเอง · คล้าย ๆ = เก็บคำตอบ FAQ เป็นร่างให้คนกดส่ง (ไม่ส่งมั่วให้ลูกค้า)
    out = faqReply(String(messages[messages.length - 1].content), shop.faq ?? [], kw);
  }
  // AI ใช้ไม่ได้และไม่ตรง FAQ → ส่งต่อให้คน (โหมดร่าง/ออโต้จะใช้ข้อความสำรองเอง)
  return out ?? { reply: "", needs_human: true, reason: "ai-unavailable" };
}

// ตอบด้วย reply token ก่อน (ฟรี ไม่นับโควต้า) — ใช้ไม่ได้ค่อยถอยไป push (นับโควต้ารายเดือน)
type Sent = { ok: boolean; via?: string; err?: string };
async function sendLine(replyToken: string | null, userId: string, text: string): Promise<Sent> {
  const msg = { messages: [{ type: "text", text }] };
  try {
    if (replyToken) {
      const r = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
        body: JSON.stringify({ replyToken, ...msg }),
      });
      if (r.ok) return { ok: true, via: "reply" };
      console.error("line reply", r.status, scrub(await r.text()).slice(0, 200));
    }
    const r2 = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: userId, ...msg }),
    });
    if (r2.ok) return { ok: true, via: "push" };
    const t = scrub(await r2.text()).slice(0, 160);
    console.error("line push", r2.status, t);
    return { ok: false, err: `LINE ${r2.status}${r2.status === 429 ? " (โควต้า push เดือนนี้หมด)" : ""}: ${t}` };
  } catch (e) { return { ok: false, err: "เชื่อมต่อ LINE ไม่ได้: " + scrub(e).slice(0, 120) }; }
}
async function sendMessenger(userId: string, text: string): Promise<Sent> {
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: userId }, messaging_type: "RESPONSE", message: { text } }),
    });
    if (r.ok) return { ok: true };
    return { ok: false, err: `Facebook ${r.status}: ${scrub(await r.text()).slice(0, 160)}` };
  } catch (e) { return { ok: false, err: "เชื่อมต่อ Facebook ไม่ได้: " + scrub(e).slice(0, 120) }; }
}
const sendOut = (channel: string, replyToken: string | null, userId: string, text: string) =>
  channel === "line" ? sendLine(replyToken, userId, text) : sendMessenger(userId, text);

async function handleChat(opts: {
  channel: string; threadId: string; authorName?: string; text: string;
  replyToken?: string | null; externalId?: string; noBot?: boolean;
}) {
  const { channel, threadId, text } = opts;
  await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "in",
    author: opts.authorName ?? null, text, meta: opts.externalId ? { external_id: opts.externalId } : null,
  });
  // สติกเกอร์/รูป/ไฟล์: เก็บไว้ให้แอดมินเห็น แต่ไม่ให้บอทตอบ (ไม่เปลืองโควต้า AI และไม่ตอบมั่ว)
  if (opts.noBot) return;
  const settings = await getSettings();
  const mode = settings.bot?.mode?.[channel] ?? "off"; // off | draft | faq | auto
  if (mode === "off") return;
  const autoLike = mode === "auto" || mode === "faq";

  const out = await botAnswer(channel, threadId, settings, mode === "faq").catch((e) => {
    console.error("botAnswer", e); return null;
  });
  if (!out) return;

  if (mode === "draft" || out.needs_human || !out.reply) {
    if (autoLike && out.needs_human && settings.bot?.fallback_text) {
      // โหมดออโต้แต่ต้องส่งต่อคน: ตอบขอเวลาไว้ก่อน
      const s = await sendOut(channel, opts.replyToken ?? null, threadId, settings.bot.fallback_text);
      if (s.ok) await sb.from("social_chat_log").insert({
        channel, thread_id: threadId, direction: "out", author: "bot",
        text: settings.bot.fallback_text, meta: { auto: true, fallback: true, via: s.via },
      });
    }
    // เก็บร่างไว้ให้แอดมินกดส่งในแอป — ใส่ทีหลังข้อความขอเวลาเสมอ ร่างจะเป็นข้อความล่าสุด ห้องแชทจึงขึ้น "รอตอบ"
    await sb.from("social_chat_log").insert({
      channel, thread_id: threadId, direction: "out", author: "bot",
      text: out.reply || (settings.bot?.fallback_text ?? ""),
      meta: { draft: true, needs_human: out.needs_human, reason: out.reason },
    });
    return;
  }
  // โหมด auto / faq: ส่งเอง
  const s = await sendOut(channel, opts.replyToken ?? null, threadId, out.reply);
  if (s.ok) {
    await sb.from("social_chat_log").insert({
      channel, thread_id: threadId, direction: "out", author: "bot",
      text: out.reply, meta: { auto: true, sent: true, via: s.via },
    });
  } else {
    // ส่งไม่ถึงลูกค้า (token หมดอายุ/โควต้าหมด/เกิน 24 ชม.) → เก็บเป็นร่างรอคนส่ง ห้องแชทจะขึ้น "รอตอบ" ไม่หายเงียบ
    await sb.from("social_chat_log").insert({
      channel, thread_id: threadId, direction: "out", author: "bot",
      text: out.reply, meta: { draft: true, needs_human: true, reason: "ส่งอัตโนมัติไม่สำเร็จ — " + (s.err ?? "") },
    });
  }
}

// ---------- LINE ----------
async function handleLine(body: string) {
  const data = JSON.parse(body);
  for (const ev of data.events ?? []) {
    if (ev.type !== "message") continue;
    const threadId = ev.source?.userId ?? "unknown";
    const isText = ev.message?.type === "text";
    const text = isText ? (ev.message.text ?? "") : `[${ev.message?.type ?? "message"}]`;
    let authorName: string | undefined;
    try {
      const p = await fetch(`https://api.line.me/v2/bot/profile/${threadId}`, {
        headers: { Authorization: `Bearer ${LINE_TOKEN}` },
      });
      if (p.ok) authorName = (await p.json()).displayName;
    } catch { /* ไม่มีชื่อก็ไม่เป็นไร */ }
    await handleChat({
      channel: "line", threadId, authorName, text,
      replyToken: ev.replyToken ?? null, externalId: ev.message?.id, noBot: !isText,
    }).catch((e) => console.error("line event", scrub(e)));
  }
  await flushAiHealth();
}

// ---------- Facebook / Instagram ----------
async function handleMeta(body: string) {
  const data = JSON.parse(body);
  const isIG = data.object === "instagram";
  const channel = isIG ? "instagram" : "facebook";
  for (const entry of data.entry ?? []) {
    // แชท Messenger / IG DM
    for (const m of entry.messaging ?? []) {
      if (!m.message || m.message.is_echo) continue;
      const text = m.message.text ?? "[แนบไฟล์/สติกเกอร์]";
      await handleChat({
        channel, threadId: m.sender.id, text, externalId: m.message.mid, noBot: !m.message.text,
      }).catch((e) => console.error("meta event", scrub(e)));
    }
    // คอมเมนต์ (รีวิวเพจ/ratings — Meta ปิดไปแล้วตั้งแต่ 2025 จึงไม่ได้รับอีก)
    for (const ch of entry.changes ?? []) {
      const v = ch.value ?? {};
      if (ch.field === "feed" && v.item === "comment" && v.verb === "add") {
        if (v.from?.id && String(v.from.id) === String(entry.id)) continue; // คอมเมนต์ของเพจเอง
        await saveMention({
          channel, kind: "comment", external_id: v.comment_id,
          thread_id: v.post_id ?? null, // เก็บ post id ไว้ทำสถิติอัตราตอบรายโพสต์
          author_name: v.from?.name ?? null, author_id: v.from?.id ?? null,
          text: v.message ?? "", url: v.permalink_url ?? null,
          posted_at: v.created_time ? new Date(v.created_time * 1000).toISOString() : new Date().toISOString(),
          raw: v,
        });
      }
      if (isIG && ch.field === "comments" && v.id) {
        await saveMention({
          channel: "instagram", kind: "comment", external_id: v.id,
          thread_id: v.media?.id ?? null,
          author_name: v.from?.username ?? null, author_id: v.from?.id ?? null,
          text: v.text ?? "", raw: v,
        });
      }
    }
  }
  await flushAiHealth();
}

// ---------- ช่องทางอื่น (Wongnai/Grab/LINE MAN/TikTok — ยิงเข้ามาเอง) ----------
async function handleGeneric(body: string) {
  const d = JSON.parse(body);
  const rows = Array.isArray(d) ? d : [d];
  for (const r of rows) {
    await saveMention({
      channel: r.channel ?? "other", kind: r.kind ?? "review",
      external_id: r.external_id ?? null, branch: r.branch ?? null,
      author_name: r.author_name ?? null, text: r.text ?? "",
      rating: r.rating ?? null, url: r.url ?? null,
      posted_at: r.posted_at ?? new Date().toISOString(), raw: r,
    });
  }
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const ch = u.searchParams.get("ch") ?? "";

  // preflight จากหน้าแอป (การ์ดสถานะระบบยิงแบบแนบกุญแจเพื่อแยกว่า Verify JWT ปิดหรือยัง)
  if (req.method === "OPTIONS") return new Response("ok", { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  } });
  if (req.method === "GET") {
    // ปลายทาง OAuth ของ Google Business Profile (กดยกเลิก/Google ปฏิเสธ → เด้งกลับแอปพร้อมเหตุผล)
    const st = u.searchParams.get("state") ?? "";
    if (st === "jjgbp" || st.startsWith("jjgbp.")) {
      if (!u.searchParams.get("code"))
        return gbpPage(false, "ยังไม่ได้เชื่อมต่อ — " + (u.searchParams.get("error") === "access_denied" ? "กดยกเลิกหรือไม่ได้ติ๊กอนุญาต" : "Google ตอบ: " + (u.searchParams.get("error") ?? "ไม่ได้รับรหัส")));
      // รับเฉพาะลิงก์ที่แอปออกให้ผู้ดูแล (ลงลายเซ็น อายุ 15 นาที) — กันคนอื่นเอาบัญชี Google ของตัวเองมาเชื่อมแทนร้าน
      if (!(await gbpStateOk(st)))
        return gbpPage(false, "ลิงก์เชื่อมต่อหมดอายุหรือไม่ถูกต้อง — กด \"เชื่อมต่อบัญชี Google Business\" จากแอปใหม่ (ลิงก์ใช้ได้ 15 นาที)");
      return gbpOauth(u);
    }
    // Meta webhook verification
    if (u.searchParams.get("hub.mode") === "subscribe") {
      if (u.searchParams.get("hub.verify_token") === FB_VERIFY)
        return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
      return new Response("bad verify token", { status: 403 });
    }
    // หน้า "สถานะระบบ" ในแอปเรียกดู — บอกแค่ว่าตั้งค่าครบหรือยัง (true/false) ไม่ส่งค่าลับออกไป
    return new Response(JSON.stringify({
      ok: true, app: "jjmk social-webhook", version: VERSION,
      line: !!(LINE_SECRET && LINE_TOKEN), facebook: !!(FB_APP_SECRET && FB_PAGE_TOKEN),
      generic: !!GENERIC_KEY, gbp_oauth: !!(GBP_CLIENT_ID && GBP_CLIENT_SECRET),
    }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const body = await req.text();
  try {
    if (ch === "line") {
      const sig = req.headers.get("x-line-signature") ?? "";
      const want = await hmacSha256(LINE_SECRET, body, "base64");
      if (!LINE_SECRET || !safeEq(sig, want)) return new Response("bad signature", { status: 401 });
      bg(handleLine(body));
      return new Response("ok"); // LINE ต้องได้ 200 เร็ว
    }
    if (ch === "facebook" || ch === "instagram") {
      const sig = req.headers.get("x-hub-signature-256") ?? "";
      const want = "sha256=" + await hmacSha256(FB_APP_SECRET, body, "hex");
      if (!FB_APP_SECRET || !safeEq(sig, want)) return new Response("bad signature", { status: 401 });
      bg(handleMeta(body));
      return new Response("ok");
    }
    if (ch === "generic") {
      if (!GENERIC_KEY || req.headers.get("x-webhook-key") !== GENERIC_KEY)
        return new Response("bad key", { status: 401 });
      await handleGeneric(body);
      return new Response("ok");
    }
    return new Response("unknown channel", { status: 400 });
  } catch (e) {
    console.error(scrub(e));
    return new Response("error", { status: 500 });
  }
});
