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
const VERSION = "2026-09-29.2";
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

// ----- สุขภาพ AI: เก็บลง social_settings id='ai_health' ให้หน้าสถานะเห็นข้ามรอบ/ข้ามฟังก์ชัน -----
// (โค้ดส่วนนี้เหมือนกันทั้ง social-brain และ social-webhook — แก้ต้องแก้ทั้ง 2 ไฟล์)
// Gemini รุ่นฟรีที่ยังเปิดให้โปรเจกต์ใหม่ (Google ปิด 2.0 แล้ว และ 2.5 ให้เฉพาะโปรเจกต์ที่เคยใช้)
// แต่ละรุ่นมีโควต้าฟรีรายวันของตัวเอง → หมดรุ่นแรกก็ไปใช้รุ่นถัดไป
const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
const GEM_GAP_MS = 6500; // เว้นจังหวะระหว่างคำขอ ไม่ให้ชนโควต้าฟรีต่อนาที
let gemLastCall = 0;
let gemUsedDelta = 0;    // จำนวนคำขอ Gemini ที่ยังไม่ได้บันทึกลงฐานข้อมูล
let aihDirty = false;
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
  return g;
}
const gemUsedToday = () => (gemState().used ?? 0) + gemUsedDelta;
const gemAvailable = () => !!GEMINI_KEY && GEMINI_MODELS.some((m) => !(Number(gemState().down[m] ?? 0) > Date.now()));
function newer(a: any, b: any) { return String(a?.at ?? "") >= String(b?.at ?? "") ? a : b; }
// รวมสถานะที่อ่านจากฐานข้อมูลเข้ากับของในหน่วยความจำ (ค่าที่ใหม่กว่า/พักนานกว่าชนะ)
function absorbAiHealth(stored: any) {
  const sg = stored?.gemini ?? {}, g = AIH.gemini;
  if (sg.day && sg.day === pacificDay()) { g.day = sg.day; g.used = Math.max(g.day === sg.day ? (g.used ?? 0) : 0, sg.used ?? 0); }
  g.down = { ...(g.down ?? {}) };
  for (const [m, u] of Object.entries(sg.down ?? {})) g.down[m] = Math.max(Number(g.down[m] ?? 0), Number(u));
  if (sg.last) g.last = g.last ? newer(g.last, sg.last) : sg.last;
  if (sg.ok_at && String(sg.ok_at) > String(g.ok_at ?? "")) g.ok_at = sg.ok_at;
  const sc = stored?.claude ?? {};
  if (String(sc.at ?? "") > String(AIH.claude.at ?? "")) AIH.claude = { ...sc };
  if (Number(sc.down_until ?? 0) > claudeDownUntil) claudeDownUntil = Number(sc.down_until);
}
async function flushAiHealth() {
  if (!aihDirty && !gemUsedDelta) return;
  try {
    const { data } = await sb.from("social_settings").select("val").eq("id", "ai_health").maybeSingle();
    const delta = gemUsedDelta;
    gemUsedDelta = 0; aihDirty = false;
    const cur = data?.val ?? {};
    const g = gemState(), cg = cur.gemini ?? {};
    const today = pacificDay();
    const used = (cg.day === today ? (cg.used ?? 0) : 0) + delta;
    g.used = Math.max(g.used ?? 0, used);
    const down: Record<string, number> = { ...(cg.down ?? {}) };
    for (const [m, u] of Object.entries(g.down ?? {})) down[m] = Math.max(Number(down[m] ?? 0), Number(u));
    const val = {
      gemini: { day: today, used, down: Object.fromEntries(Object.entries(down).filter(([, u]) => Number(u) > Date.now())),
        last: cg.last ? (g.last ? newer(g.last, cg.last) : cg.last) : g.last ?? null,
        ok_at: [g.ok_at, cg.ok_at].filter(Boolean).sort().pop() ?? null },
      claude: String(cur.claude?.at ?? "") > String(AIH.claude.at ?? "") ? cur.claude : AIH.claude,
    };
    await sb.from("social_settings").upsert({ id: "ai_health", val, updated_at: new Date().toISOString() });
  } catch (e) { console.error("ai_health", e); }
}
function noteGem(model: string, status: number, err: string) {
  const g = gemState();
  const at = new Date().toISOString();
  g.last = { model, status, error: err.slice(0, 220), at };
  if (status === 200 && !err) g.ok_at = at;
  aihDirty = true;
}
// ข้อมูลส่วนตัวลูกค้า (เบอร์/อีเมล/ไอดีไลน์) ไม่ส่งไป Gemini ฟรี — Google เอาข้อมูลฝั่งฟรีไปใช้ปรับปรุงบริการได้
function maskPII(s: string): string {
  return String(s ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[อีเมล]")
    .replace(/(?<!\d)(?:\+?66|0)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}(?!\d)/g, "[เบอร์โทร]")
    .replace(/(line\s*id|ไลน์ไอดี|ไอดีไลน์|ไอดี\s*line)\s*[:：]?\s*@?[A-Za-z0-9._-]{3,}/gi, "$1 [ไอดี]")
    .replace(/(ไลน์|line)\s*(?:[:：]\s*@?|@)[A-Za-z0-9._-]{3,}/gi, "$1 [ไอดี]");
}
function looseJson(t: string): any | null {
  try { return JSON.parse(t); } catch { /* ลองตัดส่วนเกิน */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* */ } }
  return null;
}
async function geminiJson(system: string, user: string, maxTokens = 2500): Promise<any | null> {
  if (!GEMINI_KEY) return null;
  for (const model of GEMINI_MODELS) {
    if (Number(gemState().down[model] ?? 0) > Date.now()) continue; // รุ่นนี้หมดโควต้าวันนี้/ใช้ไม่ได้
    for (let attempt = 0; attempt < 2; attempt++) {
      const wait = gemLastCall + GEM_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      gemLastCall = Date.now();
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
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
      } catch (e) { noteGem(model, 0, "เชื่อมต่อไม่ได้: " + String(e)); break; }
      if (r.ok) {
        gemUsedDelta++;
        const d = await r.json().catch(() => null);
        const t = (d?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
        const j = looseJson(t);
        if (j) { noteGem(model, 200, ""); return j; }
        noteGem(model, 200, "ตอบไม่เป็น JSON (" + (d?.candidates?.[0]?.finishReason ?? "ว่าง") + ")");
        break; // ลองรุ่นถัดไป
      }
      const txt = await r.text().catch(() => "");
      if (r.status === 429) {
        const retry = Number(/"retryDelay":\s*"(\d+)/.exec(txt)?.[1] ?? 0);
        if (/PerDay|per.?day/i.test(txt) || retry > 60) {
          // โควต้าฟรีรายวันของรุ่นนี้หมด → พักรุ่นนี้ถึงเที่ยงคืนแปซิฟิก ไม่เสียเวลารอ
          gemState().down[model] = Date.now() + msToPacificMidnight();
          noteGem(model, 429, "โควต้าฟรีรายวันของรุ่นนี้หมดแล้ว (รีเซ็ตราว 14:00–15:00 เวลาไทย)");
          break;
        }
        noteGem(model, 429, "ชนโควต้าต่อนาที");
        if (attempt === 0) { await sleep(Math.min(Math.max(retry, 5), 20) * 1000); continue; }
        break;
      }
      if (r.status === 400 && /API key not valid|API_KEY_INVALID/i.test(txt)) {
        for (const m of GEMINI_MODELS) gemState().down[m] = Date.now() + 3600000;
        noteGem(model, 400, "GEMINI_API_KEY ไม่ถูกต้อง — สร้างคีย์ใหม่ที่ aistudio.google.com/apikey");
        return null;
      }
      if (r.status === 403) {
        for (const m of GEMINI_MODELS) gemState().down[m] = Date.now() + 3600000;
        noteGem(model, 403, "คีย์ไม่มีสิทธิ์ใช้ Gemini API (ถูกจำกัด API หรือยังไม่เปิด Generative Language API): " + txt.slice(0, 140));
        return null;
      }
      if (r.status === 404 || (r.status === 400 && /not found|not supported|no longer|unavailable/i.test(txt))) {
        gemState().down[model] = Date.now() + 6 * 3600000; // โปรเจกต์นี้ใช้รุ่นนี้ไม่ได้ → ข้ามไปรุ่นถัดไป
        noteGem(model, r.status, "รุ่นนี้ใช้ไม่ได้กับคีย์นี้: " + txt.slice(0, 140));
        break;
      }
      noteGem(model, r.status, txt.slice(0, 180)); // 5xx ฯลฯ → ลองรุ่นถัดไป
      break;
    }
  }
  return null;
}
function markClaudeDown(e: unknown) {
  const msg = String((e as any)?.message ?? e);
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

// จับคู่คำถามลูกค้ากับ FAQ แบบไม่ใช้ AI (ฟรี) — ใช้ตอนโควต้า AI หมด บอทยังตอบคำถามซ้ำ ๆ ได้
function bigrams(t: string) {
  const s = String(t ?? "").toLowerCase().replace(/[\s\p{P}\p{S}ๆ]+/gu, "")
    .replace(/(ครับ|คับ|ค่ะ|คะ|นะ|จ้า|จ้ะ|ป่ะ|มั้ย|ไหม|หรอ|เหรอ|บ้าง|หน่อย)/g, "");
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); out.set(k, (out.get(k) ?? 0) + 1); }
  return out;
}
function faqMatch(text: string, faq: { q: string; a: string }[]): { q: string; a: string; score: number } | null {
  const A = bigrams(text);
  const na = [...A.values()].reduce((x, y) => x + y, 0);
  if (na < 2) return null;
  let best: { q: string; a: string; score: number } | null = null;
  for (const f of faq ?? []) {
    if (!f?.q || !f?.a) continue;
    const B = bigrams(f.q);
    const nb = [...B.values()].reduce((x, y) => x + y, 0);
    let inter = 0;
    for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
    const score = nb ? (2 * inter) / (na + nb) : 0; // Dice coefficient
    if (!best || score > best.score) best = { q: f.q, a: f.a, score };
  }
  return best && best.score >= 0.6 ? best : null;
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
      return gbpPage(false, "Google ตอบกลับ: " + JSON.stringify(d).slice(0, 280) + "<br>ลองกดเชื่อมต่อจากแอปใหม่อีกครั้ง");
    const enc = await encryptRT(d.refresh_token);
    const { data: cur } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
    const val = { ...(cur?.val ?? {}), gbp: { ...((cur?.val ?? {}).gbp ?? {}), rt_enc: enc, connected: true, connected_at: new Date().toISOString(), account: null, locations: null } };
    await sb.from("social_settings").upsert({ id: "channels", val, updated_at: new Date().toISOString() });
    return gbpPage(true, "ปิดหน้านี้ได้เลย แล้วกลับไปที่แอป JJ Social → หน้า \"เชื่อมต่อช่องทาง\" → กด \"⟳ ซิงค์รีวิวทั้งหมด\"");
  } catch (e) {
    return gbpPage(false, String(e).slice(0, 300));
  }
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
    // AI ใช้ไม่ได้ (โควต้าหมด/ยังไม่ตั้งคีย์) → เทียบกับ FAQ แบบไม่ใช้ AI ถ้าตรงพอก็ตอบได้เลย
    const lastQ = String(messages[messages.length - 1].content);
    const hit = kw.some((k) => k && lastQ.includes(k)) ? null : faqMatch(lastQ, shop.faq ?? []);
    if (hit) out = { reply: hit.a, needs_human: false, reason: `faq-match ${hit.score.toFixed(2)}: ${hit.q}` };
  }
  // AI ใช้ไม่ได้และไม่ตรง FAQ → ส่งต่อให้คน (โหมดร่าง/ออโต้จะใช้ข้อความสำรองเอง)
  return out ?? { reply: "", needs_human: true, reason: "ai-unavailable" };
}

// ตอบด้วย reply token ก่อน (ฟรี ไม่นับโควต้า) — ใช้ไม่ได้ค่อยถอยไป push (นับโควต้ารายเดือน)
let lastLineVia = "";
async function sendLine(replyToken: string | null, userId: string, text: string) {
  const msg = { messages: [{ type: "text", text }] };
  lastLineVia = "";
  if (replyToken) {
    const r = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ replyToken, ...msg }),
    });
    if (r.ok) { lastLineVia = "reply"; return true; }
    console.error("line reply", r.status, (await r.text()).slice(0, 200));
  }
  const r2 = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, ...msg }),
  });
  if (!r2.ok) console.error("line push", r2.status, (await r2.text()).slice(0, 200));
  lastLineVia = r2.ok ? "push" : "failed";
  return r2.ok;
}
async function sendMessenger(userId: string, text: string) {
  const r = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${FB_PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: userId }, messaging_type: "RESPONSE", message: { text } }),
  });
  return r.ok;
}

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
    // โหมดร่าง หรือบอทขอส่งต่อคน: เก็บร่างไว้ให้แอดมินกดส่งในแอป
    await sb.from("social_chat_log").insert({
      channel, thread_id: threadId, direction: "out", author: "bot",
      text: out.reply || (settings.bot?.fallback_text ?? ""),
      meta: { draft: true, needs_human: out.needs_human, reason: out.reason },
    });
    if (autoLike && out.needs_human && settings.bot?.fallback_text) {
      // โหมดออโต้แต่ต้องส่งต่อคน: ตอบขอเวลาไว้ก่อน
      const ok = channel === "line"
        ? await sendLine(opts.replyToken ?? null, threadId, settings.bot.fallback_text)
        : await sendMessenger(threadId, settings.bot.fallback_text);
      if (ok) await sb.from("social_chat_log").insert({
        channel, thread_id: threadId, direction: "out", author: "bot",
        text: settings.bot.fallback_text, meta: { auto: true, fallback: true, via: channel === "line" ? lastLineVia : undefined },
      });
    }
    return;
  }
  // โหมด auto / faq: ส่งเอง
  const ok = channel === "line"
    ? await sendLine(opts.replyToken ?? null, threadId, out.reply)
    : await sendMessenger(threadId, out.reply);
  await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "out", author: "bot",
    text: out.reply, meta: { auto: true, sent: ok, via: channel === "line" ? lastLineVia : undefined },
  });
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
    });
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
      });
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

  if (req.method === "GET") {
    // ปลายทาง OAuth ของ Google Business Profile (กดยกเลิก/Google ปฏิเสธ → เด้งกลับแอปพร้อมเหตุผล)
    if (u.searchParams.get("state") === "jjgbp") {
      if (!u.searchParams.get("code"))
        return gbpPage(false, "ยังไม่ได้เชื่อมต่อ — " + (u.searchParams.get("error") === "access_denied" ? "กดยกเลิกหรือไม่ได้ติ๊กอนุญาต" : "Google ตอบ: " + (u.searchParams.get("error") ?? "ไม่ได้รับรหัส")));
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
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
