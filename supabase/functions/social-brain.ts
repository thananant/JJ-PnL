// ============================================================
// JJ Social — social-brain
// วิเคราะห์เสียงลูกค้า (Gemini ฟรี / Claude ถ้าเลือกโหมดคุณภาพสูงสุด / กติกาเบื้องต้น) + สรุปรายวัน
// + ดึงรีวิว Google (Business Profile ฟรี → Places ทุก 3 ชม.) + ดึงทุกแอพผ่าน Apify (เครดิตฟรี $5/เดือน) + ส่งคำตอบ
// deploy: วางโค้ดใน Supabase Dashboard → Edge Functions → social-brain (เปิด Verify JWT ไว้)
// เรียกด้วย POST body: {action: analyze|upgrade_rules|summary|learn_faq|poll_google|chat_test|send_chat|send_reply|
//                       gbp_auth_url|gbp_sync|apify_connect|apify_disconnect|apify_run|apify_more|apify_full|apify_restat|
//                       news|news_cfg|content_ai|status|cron, ...}
// cron/summary ที่ pg_cron เรียก: ตอบกลับทันทีแล้วทำงานเบื้องหลัง (ผลดูที่ social_settings id='cron')
// ============================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";

// เวอร์ชันโค้ด — แอปใช้เทียบว่าที่ deploy ใน Supabase เป็นตัวล่าสุดหรือยัง (แก้โค้ดแล้วเลื่อนวันที่ด้วย)
const VERSION = "2026-10-08.1";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? ""; // ของ OA หน้าร้าน (คนละตัวกับ LINE_TOKEN เดิม)
const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_TOKEN") ?? "";

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
// parts = ส่วนเสริมต่อท้ายข้อความ (เช่น รูปปก {inline_data:{mime_type,data}}) — ไม่ส่ง = ข้อความล้วนแบบเดิม
async function geminiJson(system: string, user: string, maxTokens = 2500, parts?: any[]): Promise<any | null> {
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
            contents: [{ role: "user", parts: [{ text: user }, ...(Array.isArray(parts) ? parts : [])] }],
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

// ---------- วิเคราะห์เบื้องต้นตามคำสำคัญ (ไม่ใช้ AI — ฟรี ไม่จำกัด) ----------
const LEX = {
  pos: ["อร่อย", "นุ่ม", "สด", "คุ้ม", "ดี", "เยี่ยม", "ประทับใจ", "ชอบ", "แนะนำ", "ไว", "เร็ว", "สะอาด", "น่ารัก", "สุภาพ", "ครบ", "เด็ด", "ฟิน", "กลับมา", "ถูกใจ", "เพลิน"],
  neg: ["แย่", "ช้า", "นาน", "สกปรก", "เหม็น", "แพง", "ไม่สะอาด", "ไม่อร่อย", "เค็ม", "จืด", "เหนียว", "แข็ง", "หมด", "ไม่เติม", "ผิดหวัง", "แมลง", "ท้องเสีย", "ปวดท้อง", "คราบ", "ไม่โอเค", "ติดกระทะ", "แฉะ", "ไม่คุ้ม", "รอคิวนาน", "ไม่มีพนักงาน", "เศษ"],
};
const DANGER = ["ท้องเสีย", "อาหารเป็นพิษ", "แมลง", "หนอน", "ปวดท้อง", "อ้วก", "อาเจียน", "เส้นผม"];
const TOPIC_KW: Record<string, string[]> = {
  "รสชาติอาหาร": ["อร่อย", "รสชาติ", "เค็ม", "หวาน", "จืด", "เผ็ด", "น้ำจิ้ม", "แจ่ว", "นุ่ม", "เหนียว", "แข็ง", "ติดกระทะ"],
  "คุณภาพวัตถุดิบ": ["สด", "ไม่สด", "วัตถุดิบ", "เนื้อ", "หมู", "ผัก", "เศษ", "คุณภาพ", "แฮม", "กุ้ง"],
  "ความหลากหลายของอาหาร": ["หลากหลาย", "เมนู", "ของครบ", "ตัวเลือก", "บาร์", "ของเยอะ"],
  "บริการพนักงาน": ["พนักงาน", "บริการ", "เสิร์ฟ", "พูดจา", "ยิ้ม", "สุภาพ", "เรียก", "ใส่ใจ", "ดูแล", "เช็ด", "เก็บโต๊ะ"],
  "ความรวดเร็ว/การรอคิว": ["รอ", "คิว", "ช้า", "นาน", "ไว", "เติมของ", "หมดเร็ว", "เติมช้า"],
  "ความสะอาด": ["สะอาด", "สกปรก", "คราบ", "เหม็น", "แมลง", "เลอะ", "เปื้อน"],
  "ราคา/ความคุ้มค่า": ["ราคา", "คุ้ม", "แพง", "ถูก", "บาท", "vat", "net", "ค่าบริการ"],
  "บรรยากาศ/สถานที่": ["บรรยากาศ", "ร้อน", "แอร์", "เพลง", "ที่นั่ง", "โต๊ะ", "แน่น", "คับแคบ", "ควัน"],
  "ที่จอดรถ": ["จอดรถ", "ที่จอด"],
  "โปรโมชั่น": ["โปรโมชั่น", "ส่วนลด", "โปร ", "ฟรี"],
};
function splitSegs(t: string): string[] {
  const s = t.split(/\n+|\s{2,}/).map((x) => x.trim()).filter((x) => x.length > 3);
  return s.length ? s : [t];
}
function ruleAnalyze(r: any, staff: any[]): z.infer<typeof Analysis> {
  const text = String(r.text ?? "");
  const segs = splitSegs(text);
  const issues: any[] = [], praises: any[] = [], topicsSet = new Set<string>(), staffOut: any[] = [];
  let posN = 0, negN = 0;
  for (const seg of segs) {
    const p = LEX.pos.filter((w) => seg.includes(w)).length;
    const ng = LEX.neg.filter((w) => seg.includes(w)).length;
    posN += p; negN += ng;
    const segTopics = Object.entries(TOPIC_KW).filter(([, kws]) => kws.some((w) => seg.includes(w))).map(([t]) => t);
    segTopics.forEach((t) => topicsSet.add(t));
    const detail = seg.slice(0, 140);
    if (ng > p) for (const t of (segTopics.length ? segTopics : ["อื่นๆ"])) issues.push({ topic: t, detail, severity: DANGER.some((w) => seg.includes(w)) ? 3 : 2 });
    else if (p > 0) for (const t of segTopics) praises.push({ topic: t, detail });
    for (const st of staff) {
      const names = [st.name, ...(st.aliases ?? [])].filter(Boolean);
      if (names.some((nm: string) => nm.length > 1 && seg.includes(nm)) && !staffOut.find((x) => x.name === st.name))
        staffOut.push({ name: st.name, sentiment: ng > p ? "neg" : p > 0 ? "pos" : "neu", detail });
    }
  }
  const seenI = new Set(), seenP = new Set();
  const issues2 = issues.filter((i) => !seenI.has(i.topic) && seenI.add(i.topic)).slice(0, 6);
  const praises2 = praises.filter((p) => !seenP.has(p.topic) && seenP.add(p.topic)).slice(0, 6);
  let score = r.rating != null ? Number(r.rating) * 20 : 50;
  score += 4 * posN - 6 * negN;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const sentiment: "pos" | "neu" | "neg" = r.rating != null
    ? (Number(r.rating) >= 4 && negN <= posN ? "pos" : Number(r.rating) <= 2 ? "neg" : score >= 60 ? "pos" : score <= 45 ? "neg" : "neu")
    : (score >= 62 ? "pos" : score <= 45 ? "neg" : "neu");
  let slot = "unknown";
  if (/ดึก|ตี\s?[1-5]|เที่ยงคืน|[3-5]\s?ทุ่ม|2[2-3]:|เกือบปิด/.test(text)) slot = "late";
  else if (/เย็น|ค่ำ|[1-2]\s?ทุ่ม|1[89]:|20:|มื้อค่ำ/.test(text)) slot = "dinner";
  else if (/บ่าย|1[5-7]:/.test(text)) slot = "afternoon";
  else if (/เที่ยง|กลางวัน|1[12]:/.test(text)) slot = "lunch";
  const issueTopics = issues2.map((i) => i.topic), praiseTopics = praises2.map((p) => p.topic);
  const summary = `[เบื้องต้น] ${sentiment === "pos" ? "ลูกค้าพอใจ" : sentiment === "neg" ? "ลูกค้าไม่พอใจ" : "ความเห็นกลางๆ"}${praiseTopics.length ? " · ชม: " + praiseTopics.join(", ") : ""}${issueTopics.length ? " · ติ: " + issueTopics.join(", ") : ""}`;
  const reply = sentiment === "neg"
    ? `ขออภัยอย่างยิ่งสำหรับประสบการณ์ครั้งนี้ครับ ทางร้านขอน้อมรับ${issueTopics.length ? "เรื่อง" + issueTopics.join("และ") : "ทุกคำติชม"}ไปปรับปรุงโดยเร็วที่สุด และขอโอกาสดูแลให้ดีขึ้นในครั้งหน้านะครับ 🙏`
    : sentiment === "pos"
      ? "ขอบคุณมากๆ เลยครับ 🙏 ทีมงานดีใจสุดๆ แล้วมาให้เราดูแลอีกนะครับ"
      : "ขอบคุณสำหรับคำติชมครับ ทางร้านจะนำไปพัฒนาให้ดียิ่งขึ้นครับ 🙏";
  return { sentiment, ai_score: score, topics: [...topicsSet], issues: issues2, praises: praises2, staff: staffOut, visit_slot: slot as any, branch: r.branch ?? "unknown", summary, reply };
}
function normAnalysis(j: any): z.infer<typeof Analysis> | null {
  if (!j || typeof j !== "object") return null;
  try {
    return {
      sentiment: ["pos", "neu", "neg"].includes(j.sentiment) ? j.sentiment : "neu",
      ai_score: Math.max(0, Math.min(100, Number(j.ai_score ?? j.score ?? 50) || 50)),
      topics: Array.isArray(j.topics) ? j.topics.map(String) : [],
      issues: Array.isArray(j.issues) ? j.issues.map((i: any) => ({ topic: String(i?.topic ?? "อื่นๆ"), detail: String(i?.detail ?? ""), severity: Number(i?.severity) || 1 })) : [],
      praises: Array.isArray(j.praises) ? j.praises.map((p: any) => ({ topic: String(p?.topic ?? "อื่นๆ"), detail: String(p?.detail ?? "") })) : [],
      staff: Array.isArray(j.staff) ? j.staff.map((s: any) => ({ name: String(s?.name ?? ""), sentiment: ["pos", "neu", "neg"].includes(s?.sentiment) ? s.sentiment : "neu", detail: String(s?.detail ?? "") })).filter((s: any) => s.name) : [],
      visit_slot: ["lunch", "afternoon", "dinner", "late", "unknown"].includes(j.visit_slot) ? j.visit_slot : "unknown",
      branch: String(j.branch ?? "unknown"),
      summary: String(j.summary ?? ""),
      reply: String(j.reply ?? ""),
    };
  } catch { return null; }
}
const GEMINI_SCHEMA_ANALYSIS = `\n\nตอบเป็น JSON ล้วนตามโครงสร้างนี้เท่านั้น (ห้ามมีข้อความอื่น):
{"sentiment":"pos|neu|neg","ai_score":0-100,"topics":["หัวข้อ"],"issues":[{"topic":"หัวข้อ","detail":"รายละเอียด","severity":1-3}],"praises":[{"topic":"หัวข้อ","detail":"รายละเอียด"}],"staff":[{"name":"ชื่อ","sentiment":"pos|neu|neg","detail":"รายละเอียด"}],"visit_slot":"lunch|afternoon|dinner|late|unknown","branch":"รหัสสาขาหรือ unknown","summary":"สรุป 1 บรรทัด","reply":"ร่างคำตอบ"}`;
// วิเคราะห์ทีละหลายรายการในคำขอเดียว (ประหยัดโควต้าฟรีของ Gemini ~8 เท่า — งานดึงย้อนหลังทั้งหมดมีคอมเมนต์เป็นพัน)
const AN_BATCH = 8;
const AN_BATCH_MAXLEN = 700;   // ข้อความยาวกว่านี้วิเคราะห์ทีละรายการเหมือนเดิม
const GEMINI_SCHEMA_BATCH = `\n\nตอบเป็น JSON ล้วนเท่านั้น: {"items":[ ... ]} มีครบทุกรายการตามลำดับ แต่ละรายการคือ
{"i":เลขรายการ,"sentiment":"pos|neu|neg","ai_score":0-100,"topics":["หัวข้อ"],"issues":[{"topic":"หัวข้อ","detail":"รายละเอียด","severity":1-3}],"praises":[{"topic":"หัวข้อ","detail":"รายละเอียด"}],"staff":[{"name":"ชื่อ","sentiment":"pos|neu|neg","detail":"รายละเอียด"}],"visit_slot":"lunch|afternoon|dinner|late|unknown","branch":"รหัสสาขาหรือ unknown","summary":"สรุป 1 บรรทัด","reply":"ร่างคำตอบ"}
วิเคราะห์แต่ละรายการแยกกัน ห้ามเอาเนื้อหาข้ามรายการ`;
const GEMINI_SCHEMA_DIGEST = `\n\nตอบเป็น JSON ล้วนตามโครงสร้างนี้เท่านั้น:
{"headline":"...","problems":[{"topic":"...","detail":"...","count":1,"severity":1-3,"action":"..."}],"praises":[{"topic":"...","detail":"...","count":1}],"staff_good":[{"name":"...","detail":"..."}],"staff_fix":[{"name":"...","detail":"..."}],"time_slots":[{"slot":"lunch|afternoon|dinner|late","verdict":"..."}],"actions":["..."]}`;
function ruleDigest(set: any[]): z.infer<typeof Digest> {
  const ic: Record<string, { n: number; sev: number; ex: string }> = {}, pc: Record<string, { n: number; ex: string }> = {};
  const sg: Record<string, number> = {}, sbad: Record<string, number> = {};
  const slots: Record<string, { n: number; sum: number }> = {};
  let pos = 0, neg = 0;
  for (const r of set) {
    if (r.sentiment === "pos") pos++; if (r.sentiment === "neg") neg++;
    (r.issues ?? []).forEach((i: any) => { const k = i?.topic ?? "อื่นๆ"; ic[k] = ic[k] ?? { n: 0, sev: 1, ex: i?.detail ?? "" }; ic[k].n++; ic[k].sev = Math.max(ic[k].sev, Number(i?.severity) || 1); });
    (r.praises ?? []).forEach((p: any) => { const k = p?.topic ?? "อื่นๆ"; pc[k] = pc[k] ?? { n: 0, ex: p?.detail ?? "" }; pc[k].n++; });
    (r.staff ?? []).forEach((s: any) => { if (s?.sentiment === "neg") sbad[s.name] = (sbad[s.name] ?? 0) + 1; else if (s?.sentiment === "pos") sg[s.name] = (sg[s.name] ?? 0) + 1; });
    const sl = r.visit_slot ?? "unknown";
    if (sl !== "unknown") { slots[sl] = slots[sl] ?? { n: 0, sum: 0 }; slots[sl].n++; slots[sl].sum += Number(r.ai_score) || 0; }
  }
  const probs = Object.entries(ic).sort((a, b) => b[1].n - a[1].n).slice(0, 5)
    .map(([t, v]) => ({ topic: t, detail: `ถูกพูดถึง ${v.n} ครั้ง เช่น "${v.ex.slice(0, 80)}"`, count: v.n, severity: v.sev, action: `ตรวจสอบและปรับปรุงเรื่อง "${t}" กับทีมหน้าร้าน` }));
  return {
    headline: `สรุปเบื้องต้น (โหมดฟรี): ${set.length} รายการ · ชม ${pos} · ตำหนิ ${neg}${probs[0] ? ` · เรื่องที่ถูกตำหนิบ่อยสุด: ${probs[0].topic}` : ""}`,
    problems: probs,
    praises: Object.entries(pc).sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([t, v]) => ({ topic: t, detail: v.ex.slice(0, 100), count: v.n })),
    staff_good: Object.entries(sg).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => ({ name: n, detail: `ถูกชม ${c} ครั้ง` })),
    staff_fix: Object.entries(sbad).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => ({ name: n, detail: `ถูกตำหนิ ${c} ครั้ง` })),
    time_slots: Object.entries(slots).map(([sl, v]) => ({ slot: sl, verdict: `พึงพอใจเฉลี่ย ${Math.round(v.sum / v.n)}/100 จาก ${v.n} รีวิว` })),
    actions: probs.slice(0, 3).map((p) => p.action),
  };
}

// ===== Google Business Profile — รีวิวครบทุกอัน + ตอบกลับจากระบบ =====
const GBP_CLIENT_ID = Deno.env.get("GBP_CLIENT_ID") ?? "";
const GBP_CLIENT_SECRET = Deno.env.get("GBP_CLIENT_SECRET") ?? "";
// refresh token เก็บแบบเข้ารหัส AES-GCM (กุญแจมาจาก service key) — คนที่มีแค่ anon key อ่านไม่ได้
async function aesKey() {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SB_SERVICE));
  return crypto.subtle.importKey("raw", h, "AES-GCM", false, ["encrypt", "decrypt"]);
}
// aad = ผูกค่าที่เข้ารหัสกับจุดใช้งาน (เอา refresh token ของ Google ไปวางแทน token Apify แล้วถอดได้ไม่ได้)
async function encryptRT(rt: string, aad?: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, ...(aad ? { additionalData: new TextEncoder().encode(aad) } : {}) }, await aesKey(), new TextEncoder().encode(rt)));
  return btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...ct));
}
async function decryptRT(enc: string, aad?: string): Promise<string | null> {
  try {
    const [ivb, ctb] = enc.split(".");
    const iv = Uint8Array.from(atob(ivb), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctb), (c) => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv, ...(aad ? { additionalData: new TextEncoder().encode(aad) } : {}) }, await aesKey(), ct);
    return new TextDecoder().decode(pt);
  } catch { return null; }
}
async function gbpAccessToken(): Promise<{ token?: string; reason?: string }> {
  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET) return { reason: "ยังไม่ได้ตั้ง secrets GBP_CLIENT_ID / GBP_CLIENT_SECRET" };
  const settings = await getSettings();
  const enc = settings.channels?.gbp?.rt_enc;
  if (!enc) return { reason: "ยังไม่ได้เชื่อมต่อบัญชี Google ของร้าน — กดปุ่มเชื่อมต่อในหน้าเชื่อมต่อช่องทาง" };
  const rt = await decryptRT(enc);
  if (!rt) return { reason: "อ่าน token ไม่ได้ — กดเชื่อมต่อบัญชีใหม่อีกครั้ง" };
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GBP_CLIENT_ID, client_secret: GBP_CLIENT_SECRET, refresh_token: rt, grant_type: "refresh_token" }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    if (d.error === "invalid_grant") return { reason: "invalid_grant: สิทธิ์เข้าถึงบัญชี Google หมดอายุหรือถูกยกเลิก — กด \"เชื่อมต่อบัญชี Google\" ใหม่ · ถ้าหมดทุก 7 วัน ให้กด Publish app ในหน้า OAuth consent screen ของ Google Cloud" };
    return { reason: "ขอสิทธิ์เข้าถึงไม่ได้: " + JSON.stringify(d).slice(0, 180) };
  }
  return { token: d.access_token };
}
const STAR: Record<string, number | null> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

async function saveChannels(patch: (ch: Record<string, any>) => void) {
  // อ่านค่าล่าสุดก่อนแก้ทุกครั้ง กันทับของที่ฟังก์ชัน/แอปอื่นเพิ่งบันทึก
  // อ่านไม่ได้ = ห้ามเขียน (ไม่งั้นเขียนทับทั้งแถวด้วยของว่าง → token Google / Place ID หายหมด)
  const { data, error } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
  if (error) throw new Error("อ่าน channels ไม่ได้: " + error.message);
  const ch = { ...(data?.val ?? {}) };
  patch(ch);
  const { error: ue } = await sb.from("social_settings").upsert({ id: "channels", val: ch, updated_at: new Date().toISOString() });
  if (ue) throw new Error("บันทึก channels ไม่ได้: " + ue.message);
  return ch;
}
// บันทึกผลซิงค์ (สำเร็จ/ล้มเหลว) ให้หน้าสถานะระบบเห็น — ไม่งั้นซิงค์พังแล้วหน้าจอยังเขียวอยู่
async function gbpSync(full = false, resume = false) {
  const res: any = await gbpSyncInner(full, resume).catch((e) => ({ ok: false, reason: scrub(e) }));
  if (res.reason) res.reason = scrub(res.reason);
  await saveChannels((ch) => {
    const g = { ...(ch.gbp ?? {}) };
    g.last_attempt = new Date().toISOString();
    if (res.ok) { delete g.last_error; delete g.last_error_at; }
    else { g.last_error = String(res.reason ?? "").slice(0, 300); g.last_error_at = g.last_attempt; }
    if (Array.isArray(res.unmapped)) g.unmapped = res.unmapped; // ให้หน้าสถานะบอกว่า "ยังไม่เลือกสาขา" ไม่ใช่ "รออนุมัติ"
    ch.gbp = g;
  }).catch((e) => console.error("gbp state", scrub(e)));
  return res;
}
// หาทุกบัญชีธุรกิจ (บัญชีส่วนตัว + กลุ่มธุรกิจ) แล้วรวมสาขาทั้งหมด + จับคู่สาขาอัตโนมัติจากชื่อ
async function gbpDiscover(H: Record<string, string>) {
  const ar = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20", { headers: H });
  const ad = await ar.json().catch(() => ({}));
  if (!ar.ok || !ad.accounts?.length) return { reason: "หาบัญชีธุรกิจไม่เจอ: " + JSON.stringify(ad).slice(0, 200) + " — ถ้าเพิ่งขอสิทธิ์ Business Profile API อาจยังไม่ได้รับอนุมัติ (โควต้ายังเป็น 0)" };
  const branchesArr = await getBranches();
  const locs: any[] = [];
  let lastErr = "";
  for (const acc of ad.accounts) {
    const lr = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title&pageSize=100`, { headers: H });
    const ld = await lr.json().catch(() => ({}));
    if (!lr.ok) { lastErr = JSON.stringify(ld).slice(0, 200); continue; }
    for (const l of ld.locations ?? []) {
      const hit = branchesArr.find((b) => l.title?.includes(String(b.name).replace("สาขา", "")) || l.title?.includes(b.name));
      locs.push({ id: l.name, title: l.title, account: acc.name, branch: hit?.code ?? null }); // id = locations/456
    }
  }
  if (!locs.length) return { reason: "หาสาขาไม่เจอในทุกบัญชี (" + ad.accounts.length + " บัญชี)" + (lastErr ? ": " + lastErr : "") };
  return { locs };
}
// สาขาที่เจ้าของเลือกไว้ตอนนี้ (อ่านสดทุกหน้า — ระหว่างซิงค์ยาว ๆ เจ้าของอาจเปลี่ยนเป็น "ไม่ดึง")
// อ่านไม่ได้ (เน็ต/ฐานข้อมูลสะดุด) = คืน "error" → ดึงต่อด้วยสาขาเดิม (ห้ามตีความว่าเจ้าของเลิกดึง)
async function liveBranch(locId: string): Promise<string | null | "error"> {
  const { data, error } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
  if (error || !data) return "error";
  return (data.val?.gbp?.locations ?? []).find((l: any) => l.id === locId)?.branch ?? null;
}
async function gbpSyncInner(full: boolean, resume = false) {
  const t0 = Date.now();
  const at = await gbpAccessToken();
  if (!at.token) return { ok: false, reason: at.reason };
  const H = { Authorization: `Bearer ${at.token}` };
  const settings = await getSettings();
  const startRt = settings.channels?.gbp?.rt_enc;
  const gbp = settings.channels?.gbp ?? {};
  // ครั้งแรก หรือเพิ่งเชื่อมบัญชีใหม่: หาโปรไฟล์ใหม่ แล้วคงการจับคู่สาขาเดิม (รวม "ไม่ดึง") ของโปรไฟล์ที่ id ตรงกัน
  if (!gbp.locations?.length || gbp.rediscover) {
    const d: any = await gbpDiscover(H);
    if (!d.locs) return { ok: false, reason: d.reason };
    gbp.account = d.locs[0].account;
    gbp.locations = d.locs;
    await saveChannels((ch) => {
      const cur = ch.gbp ?? {};
      if (cur.rt_enc !== startRt) return; // ระหว่างนี้มีการเชื่อมบัญชีใหม่อีกรอบ → ไม่ทับ
      const saved = new Map((cur.locations ?? []).map((l: any) => [l.id, l.branch]));
      gbp.locations = d.locs.map((l: any) => saved.has(l.id) ? { ...l, branch: saved.get(l.id) ?? l.branch } : l);
      ch.gbp = { ...cur, account: gbp.account, locations: gbp.locations, rediscover: false };
    });
  }
  // ซิงค์ย้อนหลังทั้งหมดทำต่อจากจุดเดิมได้ (หน้า Google ของแต่ละโปรไฟล์) — รอบเดียวไม่ทันใน 150 วิ แอปวนต่อให้ (resume)
  // กดซิงค์ทั้งหมดใหม่เอง หรือค้างเกิน 2 ชม. = เริ่มใหม่ทุกโปรไฟล์ (ของที่มีแล้วข้ามเร็ว) ไม่ใช้จุดค้างเก่า
  const fp = gbp.full_progress;
  const useSaved = full && resume && fp?.locs && Date.now() - (Date.parse(fp.at ?? "") || 0) < 2 * 3600000;
  const prog: Record<string, { token?: string; done?: boolean; fails?: number; error?: string }> = useSaved ? { ...fp.locs } : {};
  // โปรไฟล์ที่ประวัติย้อนหลังยังดึงไม่ครบ (พังกลางทาง/เพิ่งเลือกสาขา) — เคลียร์เมื่อซิงค์ทั้งหมดดึงโปรไฟล์นั้นได้จนจบ
  const gaps: Record<string, { title: string; reason: string; at: string }> = { ...(gbp.history_gaps ?? {}) };
  let added = 0, upgraded = 0, seen = 0, marked = 0, partial = false, okLocs = 0;
  const locErr: Record<string, { error: string; at: string }> = {};
  const unmapped: string[] = [], failedBranches = new Set<string>();
  for (const loc of gbp.locations) {
    if (loc.branch === "skip") continue; // เจ้าของเลือก "ไม่ดึง" (โปรไฟล์ซ้ำ/ไม่ใช่ของร้าน)
    // ยังไม่ได้เลือกสาขา = ยังไม่ดึง (กันรีวิวของโปรไฟล์ที่ไม่ใช่ของร้านไหลเข้าระบบก่อนเจ้าของได้เลือก)
    if (!loc.branch) { unmapped.push(loc.title ?? loc.id); continue; }
    if (full && prog[loc.id]?.done) {
      // เสร็จแล้วในรอบก่อน — ถ้าเสร็จแบบพัง ไม่นับเป็น "ดึงสำเร็จ" และยังรายงานข้อผิดพลาดต่อ
      if (prog[loc.id].error) { locErr[loc.id] = { error: prog[loc.id].error!, at: new Date().toISOString() }; failedBranches.add(loc.branch); }
      else okLocs++;
      continue;
    }
    if (partial) continue; // หมดเวลารอบนี้แล้ว — โปรไฟล์ที่เหลือทำรอบหน้า
    const locPath = `${loc.account ?? gbp.account}/${loc.id}`;
    let pageToken = full ? (prog[loc.id]?.token ?? "") : "", failed = false, dropped = false;
    for (let page = 0; full || page < 1; page++) {
      if (Date.now() - t0 > 100000) { partial = true; break; } // ใกล้ 150 วิ → พอก่อน จุดที่ค้างถูกจำไว้
      if (page > 0 || full) { // ซิงค์ทั้งหมดเช็คตั้งแต่หน้าแรก (รอบยาว เจ้าของอาจเปลี่ยนใจระหว่างรอ)
        const lb = await liveBranch(loc.id);
        if (lb !== "error") {
          if (!lb || lb === "skip") { dropped = true; break; } // เจ้าของเพิ่งเปลี่ยนเป็นไม่ดึง/ไม่ระบุ → หยุดดึงโปรไฟล์นี้
          loc.branch = lb;
        }
      }
      const rr = await fetch(`https://mybusiness.googleapis.com/v4/${locPath}/reviews?pageSize=50${pageToken ? "&pageToken=" + pageToken : ""}`, { headers: H });
      const rd = await rr.json().catch(() => ({}));
      // จุดที่จำไว้หมดอายุ (Google ตอบ 400) → เริ่มโปรไฟล์นี้ใหม่ (ของที่มีแล้วข้ามเร็ว) · 429/5xx = ชั่วคราว ลองหน้าเดิมรอบหน้า
      if (!rr.ok && rr.status === 400 && full && page === 0 && pageToken) { pageToken = ""; page = -1; continue; }
      if (!rr.ok) {
        // โปรไฟล์เดียวพัง (ยังไม่ยืนยัน/ถูกระงับ) ไม่ให้ทุกสาขาหยุดไปด้วย — สาขานั้นไปใช้ Place ID แทน (runCron)
        const err = scrub(JSON.stringify(rd)).slice(0, 200);
        locErr[loc.id] = { error: err, at: new Date().toISOString() };
        failedBranches.add(loc.branch);
        failed = true;
        if (full) {
          // 403/404 = ใช้ไม่ได้ถาวร · อื่น ๆ (429/5xx) = ชั่วคราว → จำหน้าที่ค้างไว้ ลองใหม่รอบหน้า (สูงสุด 3 ครั้ง)
          const fails = (prog[loc.id]?.fails ?? 0) + 1;
          const permanent = rr.status === 403 || rr.status === 404 || fails >= 3;
          prog[loc.id] = permanent ? { done: true, error: err } : { token: pageToken, fails, error: err };
          if (permanent) gaps[loc.id] = { title: loc.title ?? loc.id, reason: err, at: new Date().toISOString() };
        }
        break;
      }
      const reviews = rd.reviews ?? [];
      seen += reviews.length;
      // รีวิวที่มีในระบบแล้ว (ดึงทีเดียวทั้งหน้า)
      const exts = reviews.map((rv: any) => "gbp_" + rv.reviewId);
      const { data: have } = exts.length
        ? await sb.from("social_mentions").select("id,external_id,reply_status").eq("channel", "google").in("external_id", exts)
        : { data: [] as any[] };
      const haveMap = new Map((have ?? []).map((h: any) => [h.external_id, h]));
      for (const rv of reviews) {
        const ext = "gbp_" + rv.reviewId;
        const author = rv.reviewer?.displayName ?? "";
        const epoch = rv.createTime ? Math.floor(Date.parse(rv.createTime) / 1000) : null;
        const rating = STAR[rv.starRating ?? ""] ?? null;
        const ex: any = haveMap.get(ext);
        if (ex) {
          // มีแล้ว — ถ้าร้านไปตอบใน Google Maps เอง ให้ขึ้นว่า "ตอบแล้ว" ในระบบด้วย
          if (rv.reviewReply?.comment && ex.reply_status !== "sent" && ex.reply_status !== "auto_sent") {
            await sb.from("social_mentions").update({ reply_status: "sent", reply_text: rv.reviewReply.comment, replied_by: "ร้าน (ตอบใน Google)", replied_at: rv.reviewReply.updateTime ?? new Date().toISOString() }).eq("id", ex.id);
            marked++;
          }
          continue;
        }
        // รวมกับแถวเดิมที่เคยดึงผ่าน Places (กันซ้ำข้ามแหล่ง — เก็บผลวิเคราะห์/การตอบเดิมไว้)
        // ต้องตรงทั้งชื่อ ± 12 ชม. + ดาว + สาขา (ชื่อเล่นซ้ำกันได้ อย่าจับคนละรีวิวมารวมกัน)
        let old: any = null;
        if (epoch && author) {
          let q = sb.from("social_mentions").select("id")
            .eq("channel", "google").like("external_id", "g\\_%")
            .eq("author_name", author).eq("branch", loc.branch)
            .gte("posted_at", new Date((epoch - 43200) * 1000).toISOString())
            .lte("posted_at", new Date((epoch + 43200) * 1000).toISOString());
          if (rating != null) q = q.eq("rating", rating);
          const { data } = await q.limit(1);
          old = data?.[0] ?? null;
        }
        if (old) {
          const { error } = await sb.from("social_mentions").update({ external_id: ext, raw: { gbp: locPath, review: rv } }).eq("id", old.id);
          if (!error) upgraded++;
        } else {
          const ins: any = {
            channel: "google", kind: "review", external_id: ext,
            branch: loc.branch, author_name: author || null,
            text: rv.comment ?? "", rating,
            posted_at: rv.createTime ?? new Date().toISOString(),
            raw: { gbp: locPath, review: rv },
          };
          if (rv.reviewReply?.comment) { ins.reply_status = "sent"; ins.reply_text = rv.reviewReply.comment; ins.replied_by = "ร้าน (เคยตอบไว้แล้ว)"; }
          const { data, error } = await sb.from("social_mentions")
            .upsert(ins, { onConflict: "channel,external_id", ignoreDuplicates: true }).select("id");
          if (error) return { ok: false, reason: "บันทึกไม่ได้: " + error.message };
          added += (data ?? []).length;
        }
      }
      pageToken = rd.nextPageToken ?? "";
      if (full) prog[loc.id] = { token: pageToken };
      if (!pageToken) break;
    }
    // โปรไฟล์ที่ดึงจนหน้าสุดท้าย = ประวัติครบ · เจ้าของเปลี่ยนเป็นไม่ดึงระหว่างทาง = จบ (ไม่ถือว่าขาด)
    if (full && !failed && (dropped || (!partial && !prog[loc.id]?.token))) {
      prog[loc.id] = { done: true };
      delete gaps[loc.id];
    }
    if (!failed) okLocs++;
  }
  const errList = Object.entries(locErr);
  if (!okLocs && !errList.length && unmapped.length)
    return { ok: false, reason: "ยังไม่ได้เลือกสาขาให้โปรไฟล์ Google (" + unmapped.join(", ") + ") → หน้าเชื่อมต่อช่องทาง เลือกสาขาหรือ \"ไม่ดึง\" แล้วกด 💾 บันทึกสาขา", unmapped };
  const allDone = full && gbp.locations.every((l: any) => l.branch === "skip" || !l.branch || prog[l.id]?.done);
  // ซิงค์ทั้งหมด: ยังมีโปรไฟล์ที่พังแบบชั่วคราวและยังลองใหม่ได้ → ให้แอปวนต่อ (ไม่ใช่ "ล้มเหลว")
  const retryable = full && gbp.locations.some((l: any) => l.branch && l.branch !== "skip" && !prog[l.id]?.done && prog[l.id]?.fails);
  for (const id of Object.keys(gaps)) { // โปรไฟล์ที่เจ้าของเปลี่ยนเป็นไม่ดึง/ไม่ระบุแล้ว ไม่ต้องเตือนว่าขาด
    const l = gbp.locations.find((x: any) => x.id === id);
    if (!l || !l.branch || l.branch === "skip") delete gaps[id];
  }
  const now = new Date().toISOString();
  const roundStart = new Date(t0).toISOString();
  let lateGap = false;
  // บันทึกเสมอ (แม้ทุกโปรไฟล์พัง) — จุดที่ค้าง/ช่องโหว่ของประวัติต้องไม่หาย
  await saveChannels((ch) => {
    const cur = ch.gbp ?? {};
    if (cur.rt_enc !== startRt) return; // ระหว่างซิงค์มีการเชื่อมบัญชีใหม่ → ไม่เอาข้อมูลของบัญชีเก่าไปทับ
    const next: any = { ...cur, loc_errors: locErr, unmapped };
    if (okLocs) { next.connected = true; next.last_sync = now; }
    if (full) {
      const mapped = (id: string) => { const l = (cur.locations ?? []).find((x: any) => x.id === id); return !!l?.branch && l.branch !== "skip"; };
      // ช่องโหว่ที่เจ้าของเพิ่งเพิ่มระหว่างรอบนี้ (เพิ่งเลือกสาขา) → เก็บไว้ + ให้โปรไฟล์นั้นถูกดึงใหม่รอบหน้า
      const late = Object.entries(cur.history_gaps ?? {}).filter(([id, gp]: any) => mapped(id) && String(gp?.at ?? "") > roundStart);
      for (const [id] of late) { delete prog[id]; lateGap = true; }
      next.full_progress = allDone && !lateGap ? null : { at: now, locs: prog };
      next.history_gaps = Object.fromEntries([
        ...Object.entries(cur.history_gaps ?? {}).filter(([id]) => mapped(id) && !(prog[id]?.done && !gaps[id])),
        ...Object.entries(gaps).filter(([id]) => mapped(id)),
        ...late,
      ]);
    }
    ch.gbp = next; // รายชื่อโปรไฟล์/การจับคู่: ใช้ของล่าสุดในฐานข้อมูลเสมอ (เจ้าของอาจกดบันทึกสาขาระหว่างซิงค์)
  });
  const gapList = full && Object.keys(gaps).length ? Object.values(gaps).map((g) => g.title) : undefined;
  if (!okLocs && errList.length && !retryable) {
    const names = errList.map(([id]) => gbp.locations.find((l: any) => l.id === id)?.title ?? id);
    return { ok: false, reason: "ดึงรีวิวไม่ได้ทุกสาขา (" + names.join(", ") + "): " + errList[0][1].error, failed_branches: [...failedBranches], history_gaps: gapList };
  }
  return { ok: true, added, upgraded, seen, marked, partial: full && (!allDone || lateGap),
    history_gaps: gapList,
    loc_errors: errList.length ? locErr : undefined, failed_branches: [...failedBranches],
    unmapped: unmapped.length ? unmapped : undefined, locations: gbp.locations };
}

const TOPICS = ["รสชาติอาหาร", "คุณภาพวัตถุดิบ", "ความหลากหลายของอาหาร", "บริการพนักงาน",
  "ความรวดเร็ว/การรอคิว", "ความสะอาด", "ราคา/ความคุ้มค่า", "บรรยากาศ/สถานที่",
  "ที่จอดรถ", "โปรโมชั่น", "อื่นๆ"];

const Analysis = z.object({
  sentiment: z.enum(["pos", "neu", "neg"]),
  ai_score: z.number(),                      // 0-100 ความพึงพอใจ
  topics: z.array(z.string()),
  issues: z.array(z.object({ topic: z.string(), detail: z.string(), severity: z.number() })), // severity 1-3
  praises: z.array(z.object({ topic: z.string(), detail: z.string() })),
  staff: z.array(z.object({ name: z.string(), sentiment: z.enum(["pos", "neu", "neg"]), detail: z.string() })),
  visit_slot: z.enum(["lunch", "afternoon", "dinner", "late", "unknown"]),
  branch: z.string(),                        // รหัสสาขา หรือ "unknown"
  summary: z.string(),                       // สรุป 1 บรรทัด ภาษาไทย
  reply: z.string(),                         // ร่างคำตอบสำหรับตอบรีวิว/คอมเมนต์นี้
});

const Digest = z.object({
  headline: z.string(),                      // สรุปภาพรวม 1-2 ประโยค
  problems: z.array(z.object({ topic: z.string(), detail: z.string(), count: z.number(), severity: z.number(), action: z.string() })),
  praises: z.array(z.object({ topic: z.string(), detail: z.string(), count: z.number() })),
  staff_good: z.array(z.object({ name: z.string(), detail: z.string() })),
  staff_fix: z.array(z.object({ name: z.string(), detail: z.string() })),
  time_slots: z.array(z.object({ slot: z.string(), verdict: z.string() })),
  actions: z.array(z.string()),              // สิ่งที่ควรทำ เรียงตามความสำคัญ
});

const ChatReply = z.object({
  reply: z.string(),
  needs_human: z.boolean(),
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

async function getSettings() {
  const { data } = await sb.from("social_settings").select("id,val");
  const m: Record<string, any> = {};
  (data ?? []).forEach((r: any) => (m[r.id] = r.val || {}));
  AI_MODE = m.bot?.ai_mode === "best" ? "best" : "free";   // ตั้งต้น = โหมดฟรี
  return m;
}
async function getBranches(): Promise<{ code: string; name: string }[]> {
  try {
    const { data } = await sb.from("pnl_branches").select("*");
    const rows = (data ?? []).map((r: any) => ({
      code: r.code ?? r.id ?? "", name: r.name ?? r.display_name ?? r.code ?? "",
    })).filter((r: any) => r.code);
    if (rows.length) return rows;
  } catch { /* ไม่มีตารางก็ใช้ค่าตั้งต้น */ }
  return [{ code: "JJRD", name: "สาขารัชดา" }, { code: "JJLP", name: "สาขาลาดพร้าว" }];
}
async function getStaff() {
  const { data } = await sb.from("social_staff").select("name,aliases,branch,shift").eq("active", true);
  return data ?? [];
}

// ---------- วิเคราะห์รายชิ้น ----------
// mode 'pending' = รายการที่ยังไม่วิเคราะห์ (ใหม่สุดก่อน) · AI ใช้ไม่ได้ → ใช้กติกาเบื้องต้นไปก่อน
// mode 'upgrade' = รายการที่เคยได้แค่ "[เบื้องต้น]" → ให้ AI วิเคราะห์ใหม่ (ถ้า AI ไม่ว่างก็ปล่อยไว้ ไม่แตะ)
// budgetMs = เวลาสูงสุดที่ใช้ได้ (ฟังก์ชันถูกตัดที่ 150 วิ) — เกินแล้วหยุดรับรายการใหม่ ที่เหลือรอรอบหน้า
const UPGRADE_DAILY_CAP = 300; // ใช้โควต้า Gemini อัพเกรดของเก่าได้ไม่เกินนี้ต่อวัน เผื่อไว้ให้แชทบอท/รีวิวใหม่/สรุป
async function analyzeMentions(ids?: number[], limit = 8, budgetMs = 90000, mode: "pending" | "upgrade" = "pending") {
  const t0 = Date.now();
  const cols = "id,channel,kind,branch,author_name,text,rating,posted_at,ai_summary";
  let q = mode === "upgrade"
    ? sb.from("social_mentions").select(cols).like("ai_summary", "[เบื้องต้น]%").order("posted_at", { ascending: false }).limit(limit)
    : sb.from("social_mentions").select(cols).is("analyzed_at", null).order("posted_at", { ascending: false }).limit(limit);
  if (ids?.length) q = sb.from("social_mentions").select(cols).in("id", ids);
  const { data: rows, error } = await q;
  if (error) throw error;
  if (!rows?.length) return { analyzed: 0, total: 0, reason: "empty" };

  const [settings, branches, staff] = await Promise.all([getSettings(), getBranches(), getStaff()]);
  const shop = settings.shop ?? {};
  const staffTxt = staff.map((s: any) =>
    `- ${s.name}${s.aliases?.length ? ` (ชื่ออื่น: ${s.aliases.join(", ")})` : ""}${s.branch ? ` สาขา ${s.branch}` : ""}${s.shift && s.shift !== "all" ? ` กะ${s.shift === "am" ? "เช้า" : "เย็น"}` : ""}`).join("\n");

  const system = `คุณคือนักวิเคราะห์เสียงลูกค้า (social listening) ของร้าน "${shop.name ?? "จริงใจหมูกระทะ"}"
${shop.info ?? ""}

สาขาที่มี (ใช้รหัสในช่อง branch): ${branches.map((b) => `${b.code}=${b.name}`).join(", ")} · ถ้าไม่แน่ใจให้ตอบ "unknown"
${staffTxt ? "รายชื่อพนักงานที่รู้จัก (ช่วยจับชื่อในรีวิว):\n" + staffTxt : ""}

หัวข้อ (topics) ให้เลือกจากรายการนี้เป็นหลัก: ${TOPICS.join(", ")}
visit_slot = ช่วงเวลาที่ลูกค้าน่าจะมาใช้บริการ (จากเนื้อหา): lunch(ก่อน 15:00) / afternoon(15:00-18:00) / dinner(18:00-21:00) / late(หลัง 21:00) / unknown
ai_score: 0-100 (0=แย่มาก 100=ประทับใจมาก) ให้สอดคล้องกับดาวถ้ามี
issues.severity: 1=เล็กน้อย 2=ควรแก้ 3=เร่งด่วน (เช่น ความปลอดภัยอาหาร/ท้องเสีย = 3 เสมอ)
staff: ใส่เฉพาะที่มีการเอ่ยถึงพนักงานจริง ๆ (ชื่อหรือคำบรรยายที่ระบุตัวได้ เช่น "พี่ผู้ชายเก็บโต๊ะ")
reply: ร่างคำตอบภาษาไทยสุภาพในนามร้าน ขอบคุณ/ขอโทษตามเนื้อหา ไม่แก้ตัว ไม่สัญญาสิ่งที่ไม่แน่ใจ ถ้าเป็นรีวิวลบให้เชิญติดต่อร้านโดยตรง`;

  let n = 0, deferred = 0, skipped = 0, reason = "";
  const errs: string[] = [];
  const prov = { claude: 0, gemini: 0, rules: 0 };
  const branchCodes = branches.map((b) => b.code);
  // Gemini แบบหลายรายการต่อคำขอ (ข้อความสั้น) — ได้ผลรายการไหนใช้เลย · รายการที่ไม่ได้ผลค่อยวิเคราะห์ทีละรายการตามเดิมด้านล่าง
  const pre = new Map<number, z.infer<typeof Analysis>>();
  if (GEMINI_KEY && !(mode === "pending" && useClaude())) {
    const cand = rows.filter((r: any) => String(r.text ?? "").length <= AN_BATCH_MAXLEN);
    for (let i = 0; i + 1 < cand.length; i += AN_BATCH) {
      if (Date.now() - t0 > budgetMs - 20000 || !gemAvailable()) break;
      if (mode === "upgrade" && gemUsedToday() >= UPGRADE_DAILY_CAP) break;
      const part = cand.slice(i, i + AN_BATCH);
      const userB = `วิเคราะห์ ${part.length} รายการต่อไปนี้ แยกกันทีละรายการ:\n\n` + part.map((r: any, j: number) =>
        `#${j + 1} ช่องทาง: ${r.channel} (${r.kind})${r.rating != null ? ` · ให้ดาว ${r.rating}/5` : ""}${r.branch ? ` · สาขาที่ระบบระบุ: ${r.branch}` : ""}\nข้อความ:\n"""${maskPII(String(r.text ?? "").slice(0, AN_BATCH_MAXLEN))}"""`).join("\n\n");
      const j = await geminiJson(system + GEMINI_SCHEMA_BATCH, userB, 650 * part.length + 600);
      const arr: any[] = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      for (const x of arr) {
        const k = Number(x?.i) - 1, a = normAnalysis(x);
        if (a && k >= 0 && k < part.length && !pre.has(part[k].id)) pre.set(part[k].id, a);
      }
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const r: any = rows[i];
    if (Date.now() - t0 > budgetMs) { deferred = rows.length - i; break; } // ใกล้หมดเวลา → ที่เหลือทำรอบหน้า
    const head = `ช่องทาง: ${r.channel} (${r.kind})${r.rating != null ? ` · ให้ดาว ${r.rating}/5` : ""}${r.branch ? ` · สาขาที่ระบบระบุ: ${r.branch}` : ""}
โพสต์เมื่อ: ${r.posted_at}`;
    const body = (r.text ?? "").slice(0, 4000);
    const user = `${head}
ผู้เขียน: ${r.author_name ?? "ไม่ระบุ"}
ข้อความ:
"""${body}"""`;
    // ชั้น 1: Claude (เฉพาะโหมดคุณภาพสูงสุด · ข้ามถ้าเพิ่งเจอปัญหาเครดิต/คีย์)
    // งานอัพเกรดของเก่าใช้ Gemini ฟรีเท่านั้น — ไม่เอางานค้างย้อนหลังไปจ่ายเงิน Claude
    let a: z.infer<typeof Analysis> | null = null;
    let used: "claude" | "gemini" | "rules" = "rules";
    if (mode === "pending" && useClaude()) {
      try {
        const res = await anthropic().messages.parse({
          model: CLAUDE_MODEL,
          max_tokens: 3000,
          output_config: { effort: "low", format: zodOutputFormat(Analysis) },
          system, messages: [{ role: "user", content: user }],
        });
        if (res.stop_reason !== "refusal") a = parsedOf<z.infer<typeof Analysis>>(res);
        if (a) { used = "claude"; noteClaudeOk(); }
      } catch (e) { markClaudeDown(e); }
    }
    // ชั้น 2: Gemini (โควต้าฟรี) — ตัดเบอร์โทร/อีเมล/ชื่อผู้เขียนออกก่อนส่ง · ได้ผลจากชุดหลายรายการแล้ว = ใช้เลย
    if (!a && pre.has(r.id)) { a = pre.get(r.id)!; used = "gemini"; }
    if (!a && gemAvailable() && (mode === "pending" || gemUsedToday() < UPGRADE_DAILY_CAP)) {
      const userG = `${head}\nข้อความ:\n"""${maskPII(body)}"""`;
      const gj = await geminiJson(system + GEMINI_SCHEMA_ANALYSIS, userG, 2500);
      a = normAnalysis(gj);
      if (gj && !a) gemLastFail = "content";
      if (a) used = "gemini";
    }
    if (!a && mode === "upgrade") {
      if (!gemAvailable() || gemUsedToday() >= UPGRADE_DAILY_CAP) { // AI ไม่ว่าง → เก็บไว้อัพเกรดรอบหน้า
        deferred = rows.length - i;
        reason = !GEMINI_KEY ? "no_ai" : gemAvailable() ? "cap" : gemWhy();
        break;
      }
      // Gemini ล่ม/ช้า/เน็ตหลุด = ชั่วคราว → หยุดไว้ รอบหน้าค่อยลองใหม่ (ห้ามติดป้ายถาวร)
      if (gemLastFail !== "content") { deferred = rows.length - i; reason = "busy"; break; }
      // Gemini ตอบแต่ใช้ไม่ได้กับรายการนี้ (ถูกบล็อก/ตอบไม่ครบ) → ย้ายออกจากคิวอัพเกรด ไม่ให้ขวางรายการอื่นทุกรอบ
      await sb.from("social_mentions").update({ ai_summary: "[เบื้องต้น·AI ไม่ผ่าน]" + String(r.ai_summary ?? "").replace(/^\[เบื้องต้น\]/, "") }).eq("id", r.id);
      skipped++;
      continue;
    }
    // ชั้น 3: กติกาเบื้องต้น (ฟรีเสมอ)
    if (!a) { a = ruleAnalyze(r, staff); used = "rules"; }
    prov[used]++;
    try {
      const { error: ue } = await sb.from("social_mentions").update({
        sentiment: a.sentiment,
        ai_score: Math.max(0, Math.min(100, a.ai_score)),
        topics: a.topics, issues: a.issues, praises: a.praises, staff: a.staff,
        visit_slot: a.visit_slot,
        ai_summary: a.summary, ai_reply: a.reply,
        analyzed_at: new Date().toISOString(),
      }).eq("id", r.id);
      if (ue) throw ue;
      // สาขาที่ AI เดา: เติมเฉพาะแถวที่ยังไม่มีสาขาจริง ๆ (ระหว่างวิเคราะห์ เจ้าของอาจเพิ่งกำหนดสาขาให้แล้ว)
      if (!r.branch && branchCodes.includes(a.branch))
        await sb.from("social_mentions").update({ branch: a.branch }).eq("id", r.id).is("branch", null);
      n++;
    } catch (e) {
      console.error("analyze", r.id, e);
      errs.push(`#${r.id}: ${String((e as any)?.message ?? e).slice(0, 180)}`);
    }
  }
  return { analyzed: n, total: rows.length, deferred, skipped, reason: reason || undefined, providers: prov, errors: errs.length ? errs.slice(0, 3) : undefined };
}

// ---------- สรุปรายวัน/รายสัปดาห์ ----------
// opts.deadline (cron เท่านั้น): เลยเวลานี้แล้ว สาขาที่เหลือใช้สรุปแบบกติกา (ไม่เรียก AI) — ให้ 📰 ส่งเข้า LINE ทันเวลา
// คืน digest = สรุปของแถว ALL ที่เพิ่งทำในรอบนี้ (ในหน่วยความจำ — 📰 ใช้ส่ง LINE แทนการอ่านจากตารางที่คีย์สาธารณะแก้ได้)
async function makeSummary(dateStr?: string, span: "daily" | "weekly" = "daily", opts: { deadline?: number } = {}) {
  // ไม่ระบุวัน = สรุป "เมื่อวาน" ตามเวลาไทย (cron รันตอน 06:10)
  const dKey = dateStr ??
    new Date(Date.now() + 7 * 3600000 - 86400000).toISOString().slice(0, 10);
  const end = new Date(dKey + "T23:59:59.999+07:00");
  const days = span === "weekly" ? 7 : 1;
  const start = new Date(new Date(dKey + "T00:00:00+07:00").getTime() - (days - 1) * 86400000);

  const { data: rows } = await sb.from("social_mentions")
    .select("channel,kind,branch,author_name,text,rating,sentiment,ai_score,topics,issues,praises,staff,visit_slot,ai_summary,posted_at")
    .gte("posted_at", start.toISOString()).lte("posted_at", end.toISOString())
    .not("analyzed_at", "is", null).order("posted_at");
  if (!rows?.length) return { ok: false, reason: "ไม่มีข้อมูลช่วงนี้" };

  const branches: string[] = ["ALL", ...new Set<string>(rows.map((r: any) => String(r.branch ?? "")).filter((x: string) => !!x))];
  const results: Record<string, unknown> = {};
  for (const br of branches) {
    const set = br === "ALL" ? rows : rows.filter((r: any) => r.branch === br);
    if (!set.length) continue;
    const lines = set.map((r: any) =>
      `[${r.channel}${r.branch ? "/" + r.branch : ""}${r.rating != null ? ` ${r.rating}★` : ""} ${r.sentiment ?? ""} slot=${r.visit_slot ?? "?"}] ${r.ai_summary ?? (r.text ?? "").slice(0, 160)}${r.staff?.length ? " · พนักงาน: " + r.staff.map((s: any) => `${s.name}(${s.sentiment})`).join(",") : ""}${r.issues?.length ? " · ปัญหา: " + r.issues.map((i: any) => i.topic + (i.severity >= 3 ? "!!" : "")).join(",") : ""}`);
    const digSystem = `คุณคือผู้ช่วยผู้บริหารร้านหมูกระทะ สรุปเสียงลูกค้า${span === "weekly" ? "รอบ 7 วัน" : "รายวัน"}เป็นภาษาไทย ให้เจ้าของร้านอ่านแล้วรู้ทันทีว่า มีปัญหาอะไร ใครทำดี ช่วงเวลาไหนดี/มีปัญหา และควรทำอะไรต่อ อ้างอิงเฉพาะข้อมูลที่ให้ อย่าแต่งเพิ่ม นับ count จากจำนวนรีวิวที่พูดถึงเรื่องนั้นจริง`;
    const digUser = `ข้อมูล ${set.length} รายการ (${br === "ALL" ? "ทุกสาขา" : "สาขา " + br}):\n` + lines.join("\n");
    let d: z.infer<typeof Digest> | null = null;
    // cron: เลยกำหนดแล้ว = ไม่เรียก AI (สรุปแบบกติกา) · เหลือเวลาน้อย = Claude รอไม่เกินเวลาที่เหลือ ไม่ลองซ้ำ
    const left = opts.deadline != null ? opts.deadline - Date.now() : Infinity;
    const late = left <= 0;
    if (!late && useClaude() && left > 15000) {
      try {
        const res = await anthropic().messages.parse({
          model: CLAUDE_MODEL,
          max_tokens: 6000,
          output_config: { effort: "medium", format: zodOutputFormat(Digest) },
          system: digSystem,
          messages: [{ role: "user", content: digUser }],
        }, Number.isFinite(left) ? { timeout: Math.min(60000, left), maxRetries: 0 } : undefined);
        d = parsedOf<z.infer<typeof Digest>>(res);
        if (d) noteClaudeOk();
      } catch (e) { markClaudeDown(e); }
    }
    if (!d && !late && gemAvailable()) {
      const s = Digest.safeParse(await geminiJson(digSystem + GEMINI_SCHEMA_DIGEST, maskPII(digUser), 4000));
      if (s.success) d = s.data;
    }
    if (!d) d = ruleDigest(set); // โหมดฟรี ไม่ใช้ AI
    const stat = {
      count: set.length,
      avg_rating: avg(set.map((r: any) => r.rating).filter((x: any) => x != null)),
      avg_score: avg(set.map((r: any) => r.ai_score).filter((x: any) => x != null)),
      pos: set.filter((r: any) => r.sentiment === "pos").length,
      neg: set.filter((r: any) => r.sentiment === "neg").length,
    };
    await sb.from("social_daily").upsert({
      d: dKey, branch: br, kind: span, data: { ...d, stat },
      created_at: new Date().toISOString(),
    });
    results[br] = d;
  }
  return { ok: true, date: dKey, branches: Object.keys(results), digest: (results.ALL ?? null) as z.infer<typeof Digest> | null };
}
function avg(a: number[]) { return a.length ? Math.round(a.reduce((s, x) => s + Number(x), 0) / a.length * 100) / 100 : null; }

// ---------- ดึงรีวิว Google (Places API) ----------
// placesIn: ส่งรายการ place มากับคำสั่งได้เลย (ปุ่มในแอป) — ฟังก์ชันจะบันทึกลง settings ให้เอง
// throttleH = ดึงอัตโนมัติได้ทุกกี่ชั่วโมง (กดปุ่มในแอป = 0 คือดึงทันที)
// Google คิดเงิน Place Details ที่ขอ field "reviews" ที่ SKU แพงสุด (ฟรีแค่ 1,000 ครั้ง/เดือน)
// ทุก 3 ชม. × 2 สาขา = ~480 ครั้ง/เดือน → อยู่ในโควต้าฟรี
async function pollGoogle(placesIn?: { place_id: string; branch: string }[], throttleH = 0, manual = false, onlyBranches?: string[]) {
  if (!GOOGLE_KEY) return { ok: false, reason: "ยังไม่ได้ตั้ง secret GOOGLE_API_KEY (หรือ GOOGLE_MAPS_API_KEY)" };
  const settings = await getSettings();
  if (throttleH > 0) {
    const last = Date.parse(settings.channels?.google_last_poll ?? "") || 0;
    const waitMs = throttleH * 3600000 - (Date.now() - last);
    if (waitMs > 0) {
      const reason = `ประหยัดโควต้าฟรีของ Google — เพิ่งดึงไปเมื่อ ${Math.round((Date.now() - last) / 60000)} นาทีที่แล้ว รออีก ${Math.ceil(waitMs / 60000)} นาที`;
      return manual ? { ok: false, reason } : { ok: true, added: 0, skipped: true, reason };
    }
  }
  const saved: { place_id: string; branch: string }[] = Array.isArray(settings.channels?.google_places) ? settings.channels.google_places : [];
  let places: { place_id: string; branch: string }[] = placesIn?.length ? placesIn : saved;
  if (onlyBranches) {
    places = places.filter((p) => onlyBranches.includes(p.branch));
    if (!places.length) return { ok: true, added: 0, skipped: true, reason: "ไม่มี Place ID ของสาขาที่ Business Profile ดึงไม่ได้" };
  }
  if (!places.length) return { ok: false, reason: "ยังไม่ได้ใส่ place_id ในหน้าเชื่อมต่อ" };
  const stats: Record<string, unknown> = {};
  let added = 0;
  const errors: string[] = [];
  const diag: any[] = []; // รายงานละเอียดต่อสาขา ให้หน้าแอปโชว์ตอนแก้ปัญหา
  try {
    for (const p of places) {
      try {
        const r = await fetch(`https://places.googleapis.com/v1/places/${p.place_id}?languageCode=th`, {
          signal: AbortSignal.timeout(20000),
          headers: { "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": "reviews,rating,userRatingCount" },
        });
        if (!r.ok) {
          const t = scrub(await r.text());
          console.error("places", p.place_id, r.status, t);
          errors.push(`${p.branch}: Google ตอบ ${r.status} — ${t.slice(0, 220)}`);
          diag.push({ branch: p.branch, http: r.status, error: t.slice(0, 220) });
          continue;
        }
        const d = await r.json();
        // รวมรีวิวจาก 2 แหล่ง: (New) = 5 อันเด่น + Legacy sort=newest = 5 อันล่าสุด
        // external_id สร้างจาก เวลา+ชื่อผู้เขียน เพื่อกันซ้ำข้ามทั้งสองแหล่ง
        const revs: { epoch: number | null; author: string; text: string; rating: number | null; raw: unknown }[] =
          (d.reviews ?? []).map((rv: any) => ({
            epoch: rv.publishTime ? Math.floor(Date.parse(rv.publishTime) / 1000) : null,
            author: rv.authorAttribution?.displayName ?? "",
            text: rv.text?.text ?? rv.originalText?.text ?? "",
            rating: rv.rating ?? null, raw: rv,
          }));
        let newestApi = 0, legacy = "";
        try {
          const lr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=reviews&reviews_sort=newest&language=th&key=${GOOGLE_KEY}`, { signal: AbortSignal.timeout(20000) });
          const ld = lr.ok ? await lr.json() : null;
          legacy = String(ld?.status ?? `HTTP ${lr.status}`).slice(0, 40);
          if (ld?.status === "OK") {
            for (const rv of ld.result?.reviews ?? []) {
              revs.push({ epoch: rv.time ?? null, author: rv.author_name ?? "", text: rv.text ?? "", rating: rv.rating ?? null, raw: rv });
              newestApi++;
            }
          } else if (ld?.status) console.error("legacy places", p.place_id, ld.status, scrub(ld.error_message ?? ""));
        } catch (e) { legacy = "ERROR"; console.error("legacy places", scrub(e)); } // ไม่ได้เปิด Legacy Places API ก็ข้ามไป
        let inserted = 0, dup = 0, insErr = "";
        for (const rv of revs) {
          const ext = `g_${p.place_id}_${rv.epoch ?? "x"}_${rv.author.slice(0, 40)}`;
          // มีรีวิวนี้แล้ว (จาก Business Profile หรือจาก Places อีกแหล่ง) → ไม่เพิ่มซ้ำ
          // ต้องตรงทั้งชื่อ ± 12 ชม. + ดาว + สาขา — ชื่อเล่นซ้ำกันได้ อย่าทิ้งรีวิวของคนอื่น
          if (rv.epoch && rv.author) {
            let q = sb.from("social_mentions").select("id")
              .eq("channel", "google").eq("author_name", rv.author)
              .gte("posted_at", new Date((rv.epoch - 43200) * 1000).toISOString())
              .lte("posted_at", new Date((rv.epoch + 43200) * 1000).toISOString());
            if (rv.rating != null) q = q.eq("rating", rv.rating);
            if (p.branch) q = q.or(`branch.eq.${p.branch},branch.is.null`);
            const { data: ex } = await q.limit(1);
            if (ex?.length) { dup++; continue; }
          }
          const { data, error } = await sb.from("social_mentions").upsert({
            channel: "google", kind: "review",
            external_id: ext,
            branch: p.branch || null,
            author_name: rv.author || null,
            text: rv.text,
            rating: rv.rating,
            url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
            posted_at: rv.epoch ? new Date(rv.epoch * 1000).toISOString() : new Date().toISOString(),
            raw: rv.raw,
          }, { onConflict: "channel,external_id", ignoreDuplicates: true }).select("id");
          if (error) { insErr = error.message; console.error("insert", error); }
          else if ((data ?? []).length) inserted++;
          else dup++;
        }
        added += inserted;
        diag.push({
          branch: p.branch, http: 200,
          place_rating: d.rating ?? null, place_review_count: d.userRatingCount ?? null,
          reviews_from_google: revs.length, newest_api: newestApi, legacy, inserted, duplicated: dup,
          insert_error: insErr || undefined,
        });
        // เก็บคะแนนรวมไว้โชว์ในหน้าเชื่อมต่อ
        stats[p.place_id] = { rating: d.rating ?? null, count: d.userRatingCount ?? null, at: new Date().toISOString() };
      } catch (e) {
        // หมดเวลา/ตอบไม่ใช่ JSON — บันทึกไว้แล้วไปสาขาถัดไป (ห้ามโยนออกไป ไม่งั้นเวลาดึงล่าสุดไม่ถูกบันทึก แล้ว cron ดึงซ้ำทุก 15 นาที)
        const m = scrub(e).slice(0, 200);
        errors.push(`${p.branch}: ${m}`);
        diag.push({ branch: p.branch, http: 0, error: m });
      }
    }
  } finally {
    const now = new Date().toISOString();
    await saveChannels((ch) => {
      if (placesIn?.length) ch.google_places = places; // เขียนรายการ Place ID เฉพาะตอนกดจากแอป (ไม่เอาของเก่าไปทับ)
      ch.google_stat = { ...(ch.google_stat ?? {}), ...stats };
      ch.google_last_poll = now;
      // ผลรอบล่าสุด ให้หน้าสถานะระบบบอกได้ว่าดึงสำเร็จจริงไหม / ได้รีวิว "ล่าสุด" ไหม
      ch.google_last_result = { at: now, ok: !errors.length, diag: diag.map((x) => ({
        branch: x.branch, http: Number(x.http) || 0, error: x.error ? String(x.error).slice(0, 160) : undefined,
        newest_api: x.newest_api ?? 0, legacy: x.legacy ?? "", inserted: x.inserted ?? 0, from_google: x.reviews_from_google ?? 0 })) };
    }).catch((e) => console.error("places state", scrub(e)));
  }
  return { ok: true, added, diag, errors: errors.length ? errors : undefined };
}

// ===== Apify: ดึงรีวิว/คอมเมนต์จากทุกแอพด้วยบริการภายนอกตัวเดียว (แผนฟรีได้เครดิต $5/เดือน) =====
// เจ้าของวาง API token ในแอปครั้งเดียว (เก็บแบบเข้ารหัสเหมือน refresh token ของ Google) แล้ววางลิงก์ร้านของแต่ละแอพ
// cron ทุก 15 นาที: ①เก็บผลรอบที่เสร็จแล้ว ②เริ่มรอบใหม่ของแหล่งที่ถึงเวลา — ไม่รอให้เสร็จ (ฟังก์ชันถูกตัดที่ 150 วิ)
// กันค่าใช้จ่ายบานปลาย 3 ชั้น: จำนวนรายการต่อรอบ (maxItems) · เงินต่อรอบ (maxTotalChargeUsd) · ยอดใช้ทั้งเดือน (อ่านจาก Apify เอง)
// ⚠️ social_settings เขียนได้ด้วยคีย์สาธารณะ → ค่าทุกตัวที่อ่านจากตารางต้องถูกบีบให้อยู่ในกรอบก่อนใช้ (apSources) ห้ามเชื่อตรง ๆ
const APIFY = "https://api.apify.com/v2";
const APIFY_ENV = Deno.env.get("APIFY_TOKEN") ?? "";
// งบต่อเดือน: ตั้งได้ทาง secret เท่านั้น (คีย์สาธารณะแก้ไม่ได้) · ตั้งต้น $4.5 = หยุดก่อนเครดิตฟรี $5 หมด
const AP_BUDGET = Math.max(0.5, Math.min(500, Number(Deno.env.get("APIFY_BUDGET_USD")) || 4.5));
const AP_RUN_USD = 0.1;            // เพดานเงินต่อรอบ (actor แบบคิดเงินตามเหตุการณ์)
const AP_TIMEOUT_S = 300;          // รอบหนึ่งทำงานได้ไม่เกิน 5 นาที
const AP_STALE_MS = 45 * 60000;    // รอบที่ค้างนานกว่านี้ = ยกเลิก
const AP_MAX_SOURCES = 14;
const AP_MIN_H = 12;               // ดึงถี่สุดทุก 12 ชม.
const AP_MANUAL_GAP_MS = 30 * 60000; // กด "ดึงตอนนี้" ซ้ำแหล่งเดิมได้ทุก 30 นาที
const AP_MAX_RUNNING = 3;          // รันบน Apify พร้อมกันไม่เกินนี้ (นับจากบัญชี Apify เอง)
const AP_MAX_PER_HOUR = 8;         // เริ่มรอบใหม่ได้ไม่เกินนี้ต่อชั่วโมง (นับจากบัญชี Apify เอง — กันคนลบสถานะในตารางแล้วเรียก cron รัว ๆ)
const AP_CALL_MS = 15000;          // เวลารอต่อคำขอ Apify
const AP_START_PER_TICK = 2;       // เริ่มรอบใหม่ไม่เกินนี้ต่อครั้ง ที่เหลือรอบหน้า (แผนฟรีรันพร้อมกันได้จำกัดตามหน่วยความจำ)
// ขั้นแรกของชนิด 2 ขั้น อ่านโพสต์ล่าสุดกี่โพสต์ — ดึงคอมเมนต์เฉพาะโพสต์ใหม่ ≤4 เหมือนเดิม แต่จำข้อมูล/รูปปกของทุกโพสต์ที่เห็น
// ไว้เติมให้คอมเมนต์ที่เก็บไว้ก่อนหน้า (apBackfill — เจ้าของถาม 2026-10-07 "ทำไมไม่มีรูปเบื้องต้นเลย")
const AP_META_MAX = 8;
// รายการโพสต์/คลิปทั้งหมดที่เคยเห็น (แอปโชว์เป็นช่องครบทุกคลิป แม้ยังไม่ได้ดึงคอมเมนต์ — เจ้าของถาม 2026-10-07 "วิดีโอมีเยอะกว่านี้ ทำไมมีแค่ 4 อัน")
// เก็บที่ social_settings id "ap_posts" = { facebook: ApPost[], instagram: [...], tiktok: [...] } · ≤AP_CAT_MAX ต่อช่องทาง เรียงใหม่ก่อน
// ⚠️ คีย์สาธารณะแก้แถวนี้ได้ → อ่านกลับมาต้องผ่าน apPostsClean ทุกครั้ง (แอปก็กรองซ้ำ)
const AP_CAT_MAX = 100;
const AP_CAT_N = [30, 60];          // ปุ่ม "ดึงโพสต์/คลิปย้อนหลัง" เลือกได้เท่านี้
const AP_CAT_USD = 0.5;             // เพดานเงินของรอบดึงย้อนหลัง (TikTok ขั้นต่ำ $0.50 อยู่แล้ว)
const AP_CAT_INPUT: Record<string, (n: number) => Record<string, unknown>> = {
  fb_comments: (n) => ({ resultsLimit: n }),
  ig_comments: (n) => ({ resultsLimit: n, onlyPostsNewerThan: "365 days" }),
  tt_comments: (n) => ({ resultsPerPage: n }),
};
// ปุ่ม "💬 ดึงคอมเมนต์ทุกโพสต์/คลิปที่ยังไม่ได้ดึง" — หลายโพสต์ในรอบเดียว (เจ้าของถาม 2026-10-07 "กดดึงคลิปเก่า 15 คลิปแล้ว ไม่ดึงคอมเมนต์มาด้วย")
// แยกทีละโพสต์ไม่ได้: 15 รอบเกินเพดานเริ่มรอบ AP_MAX_PER_HOUR · เพดานเงินต่อครั้งเท่ารอบดึงย้อนหลัง (AP_CAT_USD) · ต้องตรงกับ AP_CM_BULK ในแอป
const AP_CM_BULK = 20;              // โพสต์ต่อรอบ (ใหม่ก่อน — ที่เหลือกดอีกครั้ง)
const AP_CM_MAX = 300;              // คอมเมนต์รวมทั้งรอบไม่เกินนี้ (maxItems · บันทึกทีละแถวต้องเสร็จในเวลาของฟังก์ชัน)
const AP_CM_PER: Record<string, { def: number; input: (k: number) => Record<string, unknown> }> = {   // คอมเมนต์ต่อโพสต์ (ไม่เกินค่าปกติของขั้นสอง)
  fb_comments: { def: 25, input: (k) => ({ resultsLimit: k }) },
  ig_comments: { def: 20, input: (k) => ({ resultsLimit: k }) },
  tt_comments: { def: 20, input: (k) => ({ commentsPerPost: k }) },
};
const apSrcIdOf = (k: string) => k.split("~")[0];   // คีย์รอบพิเศษ: <แหล่ง>~cat (ดึงย้อนหลัง) · <แหล่ง>~cm (คอมเมนต์รายโพสต์)
// 🚀 ดึงทั้งหมด (เจ้าของสั่ง 2026-10-07 "ไปโหลดคลิปหรือโพสต์ย้อนหลังมาทั้งหมด และดึงคอมเมนต์มาด้วย และวิเคราะห์เลย ย้ำนะว่าทั้งหมด")
// งานยาวทำทีละรอบใน cron: ① รายการโพสต์ทั้งหมดของแต่ละแหล่ง (<แหล่ง>~all) → ตาราง social_posts ② คอมเมนต์ทุกโพสต์ ใหม่ก่อน ครั้งละ AP_FULL_BATCH โพสต์ (<แหล่ง>~fc)
// โพสต์ที่แพลตฟอร์มบอกว่าไม่มีคอมเมนต์ = ข้าม (ไม่เสียเงิน) · ชนงบเดือน = พักเอง แล้วทำต่อเมื่อขึ้นรอบเดือนใหม่ · สถานะอยู่ apify.full
const AP_FULL_POSTS = 2000;         // รายการโพสต์สูงสุดต่อแหล่ง
const AP_FULL_PAGE = 300;           // อ่านผลรายการโพสต์ทีละหน้า
const AP_FULL_BATCH = 8;            // โพสต์ต่อรอบดึงคอมเมนต์
const AP_FULL_CM_PER = 300;         // คอมเมนต์สูงสุดต่อโพสต์
const AP_FULL_LIST_USD = 2;         // เพดานเงินรอบอ่านรายการโพสต์
const AP_FULL_CM_USD = 1;           // เพดานเงินรอบดึงคอมเมนต์
// รายการโพสต์ "ทั้งหมด" จริง: IG ไม่จำกัดวัน (ปกติ 30 วัน · ดึงย้อนหลัง 365 วัน) · TikTok เอาคลิปปักหมุดด้วย (มักเป็นคลิปเก่าที่คนดูเยอะ)
const AP_FULL_LIST_INPUT: Record<string, (n: number) => Record<string, unknown>> = {
  fb_comments: (n) => ({ resultsLimit: n }),
  ig_comments: (n) => ({ resultsLimit: n, onlyPostsNewerThan: "20 years" }),
  tt_comments: (n) => ({ resultsPerPage: n, excludePinnedPosts: false }),
};
const AP_FULL_CM_INPUT: Record<string, (n: number) => Record<string, unknown>> = {
  fb_comments: (n) => ({ resultsLimit: n }),
  ig_comments: (n) => ({ resultsLimit: n }),
  tt_comments: (n) => ({ commentsPerPost: n }),
};

// sh = แชร์ · sv = บันทึก/เซฟ · du = ความยาวคลิป (วินาที) · tg = แฮชแท็ก (ตัวเล็ก ไม่มี #) · ty = ประเภทโพสต์ — ไม่รู้ = null (📈 วิเคราะห์โพสต์/คลิป)
type ApPost = { u: string; t: string; at: string | null; lk: number | null; cm: number | null; vw: number | null; img?: string | null; vid?: boolean | null; pid?: string | null;
  sh?: number | null; sv?: number | null; du?: number | null; tg?: string[] | null; ty?: string | null };
type ApSrc = { id: string; kind: string; url: string; branch: string | null; on: boolean; every_h: number; owner?: string; posts?: ApPost[] };
type ApRow = { channel: string; kind: string; external_id: string; branch: string | null; author_name: string | null;
  text: string; rating: number | null; url: string | null; posted_at: string; raw: Record<string, unknown>; reply_text?: string | null };
// usd = เพดานเงินต่อรอบของตัวดึงนี้ (บางตัวบังคับขั้นต่ำ เช่น TikTok ของ clockworks ไม่รับต่ำกว่า $0.50 — เป็นแค่เพดาน จ่ายจริงตามจำนวนที่ได้)
type ApStep = { actor: string; max: number; usd?: number; input: (s: ApSrc, urls: string[], since: string | null) => Record<string, unknown>;
  urls?: (items: any[], s: ApSrc) => string[] };

const apGet = (o: any, ...paths: string[]): any => {
  for (const p of paths) {
    const v = p.split(".").reduce((a: any, k) => (a == null ? a : a[k]), o);
    if (v != null && v !== "") return v;
  }
  return null;
};
const apIso = (v: any): string | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : (/^\d{9,13}$/.test(String(v)) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : Date.parse(String(v)));
  return Number.isFinite(n) && n > 946684800000 && n < Date.now() + 86400000 ? new Date(n).toISOString() : null;
};
const apNum = (v: any): number | null => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? n : null; };
const apStr = (v: any, n = 4000) => (v == null ? "" : String(v)).slice(0, n);
const apRecent = (v: any, days: number) => { const t = Date.parse(apIso(v) ?? ""); return !t || Date.now() - t <= days * 86400000; };
// ชื่อบัญชีจากลิงก์หรือ @ชื่อ (IG/TikTok)
const apUser = (s: string) => {
  const t = s.trim();
  const m = /(?:instagram\.com|tiktok\.com)\/@?([A-Za-z0-9._]+)/i.exec(t);
  return (m ? m[1] : t.replace(/^@/, "")).replace(/[^A-Za-z0-9._]/g, "").slice(0, 40);
};
const apFb = (s: string) => {
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return t.replace(/^http:/i, "https:");
  return "https://www.facebook.com/" + t.replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "");
};
// ตัวระบุเพจ/โปรไฟล์จากลิงก์: /ชื่อเพจ · profile.php?id=… · /people/ชื่อ/<ไอดี> · /pages/ชื่อ/<ไอดี>
const apFbKey = (s: string) => {
  try {
    const u = new URL(apFb(s));
    const parts = u.pathname.split("/").filter(Boolean).map((x) => x.toLowerCase());
    if (parts[0] === "profile.php") return u.searchParams.get("id") ?? "";
    if (parts[0] === "people" || parts[0] === "pages") return parts.find((x) => /^\d{5,}$/.test(x)) ?? "";
    return parts[0] ?? "";
  } catch { return ""; }
};
// ไอดีคอมเมนต์ Facebook จากการดึงหน้าเว็บเป็น base64 ของ "comment:<โพสต์>_<คอมเมนต์>" → แปลงให้ตรงกับที่ webhook เก็บ (กันซ้ำ)
const apFbCid = (id: string) => {
  try { const m = /^comment:(\d+_\d+)$/.exec(atob(id)); if (m) return m[1]; } catch { /* ไม่ใช่ base64 */ }
  return "fbc_" + id;
};
const TT_NO_DL = { shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false,
  shouldDownloadSlideshowImages: false, shouldDownloadAvatars: false, shouldDownloadMusicCovers: false };

// ชนิดแหล่งข้อมูล → actor บน Apify + วิธีแปลงผลเป็นแถว social_mentions
// ชนิดที่มี 2 ขั้น: ขั้นแรกหาโพสต์ล่าสุดของร้าน → ขั้นที่สองดึงคอมเมนต์ใต้โพสต์เหล่านั้น
// shop = รายการนี้ร้านเขียนเอง (ไม่ใช่เสียงลูกค้า แต่ใช้บอกว่าร้านตอบคอมเมนต์ไหนแล้ว) · ext = แปลงไอดีเป็น external_id
const apS = (o: any, ...paths: string[]) => {
  for (const p of paths) { const v = apGet(o, p); if (typeof v === "string" || typeof v === "number") return String(v); }
  return "";
};
const AP_KINDS: Record<string, { label: string; channel: string; mkind: string; every: number; ok: (u: string) => boolean;
  steps: ApStep[]; map: (it: any, s: ApSrc) => ApRow | null; shop?: (it: any, s: ApSrc) => boolean; ext?: (id: string) => string }> = {
  gmaps: {
    label: "รีวิว Google Maps", channel: "google", mkind: "review", every: 24,
    ok: (u) => /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page)\//i.test(u),
    steps: [{ actor: "compass~google-maps-reviews-scraper", max: 40,
      input: (s, _u, since) => ({ startUrls: [{ url: s.url }], maxReviews: since ? 30 : 40, reviewsSort: "newest",
        language: "th", personalData: true, ...(since ? { reviewsStartDate: since.slice(0, 10) } : {}) }) }],
    map: (it, s) => {
      const rid = apS(it, "reviewId", "id"); const at = apIso(apGet(it, "publishedAtDate", "publishAt"));
      if (!rid || !at) return null;
      return { channel: "google", kind: "review", external_id: "g_ap_" + rid.slice(0, 120), branch: s.branch,
        author_name: apS(it, "name", "reviewerName", "author").slice(0, 120) || null,
        text: apStr(apS(it, "text", "textTranslated")), rating: apNum(apGet(it, "stars", "rating")),
        url: apS(it, "reviewUrl", "url") || null, posted_at: at, raw: { via: "apify" },
        reply_text: apS(it, "responseFromOwnerText") || null };
    },
  },
  wongnai: {
    label: "รีวิว Wongnai", channel: "wongnai", mkind: "review", every: 72,
    ok: (u) => /^https:\/\/(www\.)?wongnai\.com\//i.test(u),
    // ตัวดึงของชุมชน ชื่อช่องแต่ละตัวไม่เหมือนกัน → ส่งชื่อที่พบบ่อยไปพร้อมกัน (ช่องที่ไม่รู้จักถูกข้าม)
    steps: [{ actor: "gravityzer0~wongnai-scraper", max: 25,
      input: (s) => ({ startUrls: [{ url: s.url }], urls: [s.url], scrapeReviews: true, maxReviews: 20, maxReviewsPerListing: 20 }) }],
    map: (it, s) => {
      const text = apStr(apS(it, "text", "description", "content", "comment", "body", "reviewText", "review"));
      const at = apIso(apGet(it, "date", "createdTime", "createdAt", "reviewedTime", "publishedAt", "time", "reviewDate", "created"));
      const author = apS(it, "author.name", "user.name", "reviewer.name", "authorName", "userName", "reviewerName", "author").slice(0, 120);
      if (!text || !at) return null;
      const id = apS(it, "reviewId", "reviewID", "id") || (author + "_" + at);
      return { channel: "wongnai", kind: "review", external_id: "wn_" + id.slice(0, 120), branch: s.branch,
        author_name: author || null, text, rating: apNum(apGet(it, "rating", "stars", "score", "rate")),
        url: apS(it, "reviewUrl", "url") || s.url, posted_at: at, raw: { via: "apify" } };
    },
  },
  fb_reviews: {
    label: "รีวิวเพจ Facebook", channel: "facebook", mkind: "review", every: 72,
    ok: (u) => /^(https:\/\/(www\.|m\.)?(facebook|fb)\.com\/.+|@?[A-Za-z0-9._-]{3,})$/i.test(u),
    steps: [{ actor: "apify~facebook-reviews-scraper", max: 15,
      input: (s) => ({ startUrls: [{ url: apFb(s.url) }], resultsLimit: 15 }) }],
    map: (it, s) => {
      const id = apS(it, "id", "reviewId"); const at = apIso(apGet(it, "date", "time", "createdAt"));
      if (!id || !at) return null;
      const rec = apGet(it, "isRecommended", "recommended");
      const body = apStr(apS(it, "text", "reviewText"));
      return { channel: "facebook", kind: "review", external_id: "fbr_" + id.slice(0, 160), branch: s.branch,
        author_name: apS(it, "user.name", "reviewerName", "author.name", "name").slice(0, 120) || null,
        text: (rec === true ? "[แนะนำร้านนี้] " : rec === false ? "[ไม่แนะนำร้านนี้] " : "") + body,
        rating: apNum(apGet(it, "rating")), url: apS(it, "url") || null, posted_at: at, raw: { via: "apify", recommended: rec } };
    },
  },
  fb_comments: {
    label: "คอมเมนต์โพสต์ Facebook", channel: "facebook", mkind: "comment", every: 72,
    ok: (u) => /^(https:\/\/(www\.|m\.)?(facebook|fb)\.com\/.+|@?[A-Za-z0-9._-]{3,})$/i.test(u),
    steps: [
      { actor: "apify~facebook-posts-scraper", max: AP_META_MAX, input: (s) => ({ startUrls: [{ url: apFb(s.url) }], resultsLimit: AP_META_MAX }),
        urls: (items) => items.filter((it) => apRecent(apGet(it, "time", "date", "timestamp"), 7))
          .map((it) => apS(it, "url", "postUrl", "topLevelUrl")).filter((u) => /^https:\/\//.test(u)) },
      // เอาคำตอบใต้คอมเมนต์มาด้วย → รู้ว่าเพจร้านตอบคอมเมนต์ไหนแล้ว (อัตราการตอบรายโพสต์)
      { actor: "apify~facebook-comments-scraper", max: 80,
        input: (_s, urls) => ({ startUrls: urls.map((url) => ({ url })), resultsLimit: 25, includeNestedComments: true, viewOption: "RECENT_ACTIVITY" }) },
    ],
    // คำตอบของเพจร้าน: ลิงก์โปรไฟล์ตรงกับลิงก์เพจ หรือชื่อตรงกับชื่อเพจที่ได้จากขั้นแรก
    shop: (it, s) => {
      const k = apFbKey(s.url), pk = apS(it, "profileUrl") ? apFbKey(apS(it, "profileUrl")) : "";
      const nm = apS(it, "profileName").trim().toLowerCase();
      return !!((k && pk && k === pk) || (s.owner && nm && nm === s.owner.trim().toLowerCase()));
    },
    ext: (id) => apFbCid(id),
    map: (it, s) => {
      const id = apS(it, "id", "commentId"); const at = apIso(apGet(it, "date", "createdTime", "time"));
      const text = apStr(apS(it, "text"));
      if (!id || !at || !text) return null;
      const post = apS(it, "postUrl", "facebookUrl", "inputUrl") || null;
      return { channel: "facebook", kind: "comment", external_id: apFbCid(id.slice(0, 200)), branch: s.branch,
        author_name: apS(it, "profileName", "author.name", "name").slice(0, 120) || null, text, rating: null,
        url: apS(it, "commentUrl", "url") || post, posted_at: at, raw: { via: "apify", post_id: post } };
    },
  },
  ig_comments: {
    label: "คอมเมนต์ Instagram", channel: "instagram", mkind: "comment", every: 72,
    ok: (u) => apUser(u).length >= 2,
    steps: [
      { actor: "apify~instagram-post-scraper", max: AP_META_MAX,
        input: (s) => ({ username: [apUser(s.url)], resultsLimit: AP_META_MAX, onlyPostsNewerThan: "30 days" }),
        urls: (items) => items.filter((it) => apRecent(apGet(it, "timestamp", "takenAt"), 7))
          .map((it) => apS(it, "url")).filter((u) => /^https:\/\//.test(u)) },
      { actor: "apify~instagram-comment-scraper", max: 80, input: (_s, urls) => ({ directUrls: urls, resultsLimit: 20 }) },
    ],
    shop: (it, s) => apS(it, "ownerUsername", "owner.username").toLowerCase() === apUser(s.url).toLowerCase(),
    ext: (id) => (/^\d+$/.test(id) ? id : "igc_" + id),
    map: (it, s) => {
      const id = apS(it, "id"); const at = apIso(apGet(it, "timestamp", "createdAt"));
      const text = apStr(apS(it, "text"));
      if (!id || !at || !text) return null;
      const post = apS(it, "postUrl") || null;
      return { channel: "instagram", kind: "comment", external_id: /^\d+$/.test(id) ? id.slice(0, 120) : "igc_" + id.slice(0, 120), branch: s.branch,
        author_name: apS(it, "ownerUsername", "owner.username").slice(0, 120) || null, text, rating: null, url: post, posted_at: at,
        raw: { via: "apify", post_id: post } };
    },
  },
  tt_comments: {
    label: "คอมเมนต์คลิป TikTok ของร้าน", channel: "tiktok", mkind: "comment", every: 72,
    ok: (u) => apUser(u).length >= 2,
    steps: [
      { actor: "clockworks~tiktok-scraper", max: AP_META_MAX, usd: 0.5,
        input: (s) => ({ profiles: [apUser(s.url)], resultsPerPage: AP_META_MAX, profileSorting: "latest", profileScrapeSections: ["videos"],
          excludePinnedPosts: true, ...TT_NO_DL }),
        urls: (items) => items.filter((it) => apRecent(apGet(it, "createTimeISO", "createTime"), 10))
          .map((it) => apS(it, "webVideoUrl")).filter((u) => /^https:\/\//.test(u)) },
      { actor: "clockworks~tiktok-comments-scraper", max: 80, usd: 0.5, input: (_s, urls) => ({ postURLs: urls, commentsPerPost: 20 }) },
    ],
    shop: (it, s) => apS(it, "uniqueId", "user.uniqueId").toLowerCase() === apUser(s.url).toLowerCase(),
    ext: (id) => "ttc_" + id,
    map: (it, s) => {
      const id = apS(it, "cid", "id"); const at = apIso(apGet(it, "createTimeISO", "createTime"));
      const text = apStr(apS(it, "text"));
      if (!id || !at || !text) return null;
      const post = apS(it, "videoWebUrl", "webVideoUrl") || null;
      return { channel: "tiktok", kind: "comment", external_id: "ttc_" + id.slice(0, 120), branch: s.branch,
        author_name: apS(it, "uniqueId", "user.uniqueId").slice(0, 120) || null, text, rating: null, url: post, posted_at: at,
        raw: { via: "apify", post_id: post } };
    },
  },
  tt_search: {
    label: "คลิป TikTok ที่พูดถึงร้าน", channel: "tiktok", mkind: "mention", every: 168,
    ok: (u) => u.trim().length >= 3,
    steps: [{ actor: "clockworks~tiktok-scraper", max: 10, usd: 0.5,
      input: (s) => ({ searchQueries: [s.url.trim().slice(0, 80)], resultsPerPage: 10, ...TT_NO_DL }) }],
    map: (it, s) => {
      const id = apS(it, "id"); const url = apS(it, "webVideoUrl"); const at = apIso(apGet(it, "createTimeISO", "createTime"));
      if (!id || !url || !at) return null;
      return { channel: "tiktok", kind: "mention", external_id: "ttv_" + id.slice(0, 120), branch: s.branch,
        author_name: apS(it, "authorMeta.name", "authorMeta.nickName", "author.uniqueId").slice(0, 120) || null,
        text: apStr(apS(it, "text", "desc")), rating: null, url, posted_at: at,
        raw: { via: "apify", query: s.url.slice(0, 80), nick: apS(it, "authorMeta.nickName").slice(0, 80) || null,
          video: { vw: apNum(apGet(it, "playCount")), lk: apNum(apGet(it, "diggCount")), cm: apNum(apGet(it, "commentCount")), sh: apNum(apGet(it, "shareCount")),
            sv: apCntOf(it, "collectCount"), img: apImgOf(it) } } };
    },
  },
};
// โพสต์/คลิปต้นทางของคอมเมนต์ (ข้อความ · วันที่ · ไลก์/คอมเมนต์/วิว) — เก็บไว้กับคอมเมนต์ให้แอปบอกได้ว่ามาจากโพสต์ไหน
// ลิงก์แบบ permalink.php?story_fbid=… / watch?v=… → path เหมือนกันทุกโพสต์ ต้องเอาเลขโพสต์ใน query มาด้วย (แอปใช้สูตรเดียวกัน: postKey)
const apUrlKey = (u: string) => {
  try {
    const x = new URL(u); const p = x.pathname.replace(/\/+$/, "");
    const q = /\.php$|\/watch$/i.test(p) ? ["story_fbid", "fbid", "id", "v"].map((k) => x.searchParams.get(k) ?? "").join("|") : "";
    return (x.host.replace(/^(www|m|web)\./, "") + p + (q ? "?" + q : "")).toLowerCase();
  } catch { return ""; }
};
// รูปปกโพสต์/คลิป (แอปโชว์เป็นช่อง ๆ แบบหน้าโปรไฟล์ IG — เจ้าของสั่ง 2026-10-07)
// ลิงก์รูปของ IG/FB/TikTok หมดอายุในไม่กี่วัน และ IG/FB ไม่ให้เว็บอื่นแสดงรูปตรง ๆ → คัดลอกเก็บใน Storage bucket สาธารณะ
// "social-media" (ฟังก์ชันสร้าง bucket ให้เองครั้งแรก) · เก็บไม่ได้ = ใช้ลิงก์เดิมไปก่อน (แอปขึ้นช่องตัวหนังสือแทนถ้ารูปไม่ขึ้น)
// ⚠️ ดึงรูปเฉพาะโดเมน CDN ของ 3 แพลตฟอร์มนี้ (AP_IMG_HOST) — ลิงก์มาจากผลของตัวดึง/แถว runs ที่คีย์สาธารณะแก้ได้ ห้ามดึงโดเมนอื่น
const AP_BUCKET = "social-media";
const AP_IMG_MAX = 1_500_000;
const AP_THUMB_MS = 18000;         // เหลือเวลาน้อยกว่านี้ = ข้ามการเก็บรูปปกรอบนี้ (ใช้ลิงก์เดิมไปก่อน · cron ให้เวลาทั้งรอบ ≤35 วิ)
const AP_IMG_HOST = /(^|\.)(fbcdn\.net|fbsbx\.com|cdninstagram\.com|tiktokcdn(-[a-z0-9]+)?\.com|ibyteimg\.com|byteimg\.com)$/i;
const AP_IMG_PUB = `${SB_URL}/storage/v1/object/public/${AP_BUCKET}/`;
const AP_IMG_PATHS = ["videoMeta.coverUrl", "videoMeta.originalCoverUrl", "covers.0", "covers.default", "displayUrl", "thumbnailUrl", "images.0",
  "media.0.thumbnail", "media.0.photo_image.uri", "media.0.image.uri", "full_picture", "thumbnail", "picture", "image"];
function apImgOk(s: unknown): string | null {
  const t = typeof s === "string" ? s.trim() : "";
  if (!t || t.length > 1500) return null;
  if (t.startsWith(AP_IMG_PUB) && !/[\s"'<>]/.test(t)) return t;
  try { const x = new URL(t); return x.protocol === "https:" && AP_IMG_HOST.test(x.hostname) ? t : null; } catch { return null; }
}
function apImgOf(it: any): string | null {
  for (const p of AP_IMG_PATHS) { const v = apGet(it, p); const ok = typeof v === "string" && !AP_NOT_IMG.test(v) ? apImgOk(v) : null; if (ok) return ok; }
  return apImgDeep(it);
}
// ชื่อช่องของตัวดึงไม่ตรงที่คาด (เจ้าของเจอ 2026-10-07: โพสต์ FB ขึ้นข้อความแต่ไม่มีรูป) → ไล่หาลิงก์รูปในช่องที่ชื่อบอกว่าเป็นรูป/สื่อ
// ข้ามรูปโปรไฟล์/โลโก้เพจ (โดเมนเดียวกัน แต่ไม่ใช่รูปของโพสต์) และไฟล์วิดีโอ
const AP_IMG_KEY = /media|image|photo|thumb|cover|picture|display|preview|attachment|full_?picture/i;
const AP_IMG_SKIP = /profile|avatar|user|author|owner|logo|icon|video_?url|playable|^(hd|sd)_?src$/i;
const AP_NOT_IMG = /\.(mp4|m3u8|webm|mov)(\?|$)/i;
function apImgDeep(o: any, depth = 0, keyOk = false): string | null {
  if (o == null || depth > 6) return null;
  if (typeof o === "string") return keyOk && !AP_NOT_IMG.test(o) ? apImgOk(o) : null;
  if (Array.isArray(o)) { for (const x of o.slice(0, 8)) { const r = apImgDeep(x, depth + 1, keyOk); if (r) return r; } return null; }
  if (typeof o !== "object") return null;
  for (const [k, v] of Object.entries(o)) {
    if (AP_IMG_SKIP.test(k)) continue;
    const r = apImgDeep(v, depth + 1, keyOk || AP_IMG_KEY.test(k));
    if (r) return r;
  }
  return null;
}
const apVidOf = (it: any, u: string) =>
  /tiktok\.com\/.+\/video\/|\/reels?\/|\/videos\/|\/watch\b/i.test(u) || it?.isVideo === true ||
  /video|clips|igtv|reel/i.test(String(apGet(it, "type", "productType", "media.0.__typename") ?? "")) || !!apGet(it, "videoUrl");
// ----- ยอดแชร์/เซฟ · ความยาวคลิป · แฮชแท็ก · ประเภทโพสต์ (ชื่อช่องอ้างจากเอกสารสาธารณะของตัวดึง — ลองหลายชื่อ) -----
const AP_TYPES = ["video", "photo", "carousel", "text"];
// จำนวน (≥0 · จำนวนเต็ม) จากช่องแรกที่เป็นตัวเลขจริง — ช่องที่เป็นออบเจกต์ (เช่น FB shares:{count}) ข้ามไปลองชื่อถัดไป
const apCntOf = (it: any, ...paths: string[]): number | null => {
  for (const p of paths) { const n = apNum(apGet(it, p)); if (n != null && n >= 0 && typeof apGet(it, p) !== "boolean") return Math.round(n); }
  return null;
};
// ความยาวคลิป (วินาที) — ไม่เกิน 4 ชม. · 0/ติดลบ = ไม่รู้
const apDur = (v: unknown): number | null => { const n = apNum(v); return n != null && n > 0 && n <= 14400 ? Math.round(n * 10) / 10 : null; };
function apDurOf(it: any): number | null {
  for (const p of ["videoMeta.duration", "videoDuration", "video.duration", "duration", "media.0.duration"]) { const d = apDur(apGet(it, p)); if (d != null) return d; }
  // ช่องหน่วยมิลลิวินาที (เช่น playable_duration_in_ms) — ชื่อที่บอกว่าเป็นความยาวก่อน แล้วค่อยช่องอื่นที่ลงท้าย _ms (ค่าเวลาแบบ timestamp เกิน 4 ชม. ถูกทิ้งเอง)
  const objs = [it, it?.video, it?.videoMeta, Array.isArray(it?.media) ? it.media[0] : null].filter((o) => o && typeof o === "object" && !Array.isArray(o));
  for (const pass of [/dur|length/i, /./])
    for (const o of objs) for (const [k, v] of Object.entries(o)) {
      if (!/_ms$/i.test(k) || !pass.test(k)) continue;
      const n = apNum(v); const d = n != null ? apDur(n / 1000) : null;
      if (d != null) return d;
    }
  return null;
}
// แฮชแท็ก: ตัวเล็ก ไม่มี # ไม่ซ้ำ ≤15 อัน ≤40 ตัวอักษร (ตัวอักษรไทยได้) — รับทั้ง ["a"] และ [{name:"a"}]
function apTags(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v.slice(0, 60)) {
    const s = String(x && typeof x === "object" ? ((x as any).name ?? (x as any).title ?? "") : x ?? "").trim().replace(/^#+/, "").toLowerCase().slice(0, 40);
    if (s && /^[\p{L}\p{N}\p{M}_]+$/u.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= 15) break;
  }
  return out;
}
const apTagsOfText = (t: string): string[] => apTags([...String(t ?? "").matchAll(/#([\p{L}\p{N}\p{M}_]+)/gu)].map((m) => m[1])) ?? [];
function apTypeOf(it: any, u: string, vid: boolean): string | null {
  let h = "";
  try { h = new URL(u).hostname.replace(/^(www|m|web|vm|vt)\./, "").toLowerCase(); } catch { h = ""; }
  const len = (a: any) => (Array.isArray(a) ? a.length : null);
  if (/(^|\.)tiktok\.com$/.test(h) || it?.webVideoUrl || it?.diggCount != null) {
    const sl = it?.isSlideshow === true || !!it?.imagePost || !!it?.slideshow || !!len(it?.slideshowImageLinks);
    if (!sl) return "video";
    return (len(it?.imagePost?.images) ?? len(it?.slideshowImageLinks) ?? len(it?.slideshow)) === 1 ? "photo" : "carousel";
  }
  if (/(^|\.)instagram\.com$/.test(h) || it?.shortCode || it?.ownerUsername) {
    if (/clips|reels?|igtv/i.test(String(it?.productType ?? ""))) return "video";
    const t = String(it?.type ?? "").toLowerCase();
    if (t === "video") return "video";
    if (t === "image") return "photo";
    if (t === "sidecar") return "carousel";
  } else if (/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/.test(h) || it?.facebookUrl || it?.topLevelUrl || it?.pageName) {
    const media = Array.isArray(it?.media) ? it.media : [];
    if (media.length > 1) return "carousel";
    const tn = String(media[0]?.__typename ?? "");
    if (/video/i.test(tn)) return "video";
    if (/photo|image/i.test(tn)) return "photo";
    if (!media.length) return vid ? "video" : "text";
  }
  return vid ? "video" : null;
}
function apPostMeta(it: any, u: string): ApPost {
  const full = apS(it, "text", "caption", "message", "desc", "postText");
  const vid = apVidOf(it, u);
  const tg0 = apTags(it?.hashtags);
  return { u: u.slice(0, 500), t: full.replace(/\s+/g, " ").trim().slice(0, 160),
    at: apIso(apGet(it, "time", "timestamp", "takenAt", "createTimeISO", "date", "createTime")),
    lk: apNum(apGet(it, "likes", "likesCount", "diggCount", "reactionsCount", "topReactionsCount")),
    cm: apNum(apGet(it, "comments", "commentsCount", "commentCount")),
    vw: apNum(apGet(it, "playCount", "videoPlayCount", "videoViewCount", "views", "viewsCount")),
    img: apImgOf(it), vid, pid: apPid(apS(it, "postId", "post_id")),
    sh: apCntOf(it, "shareCount", "shares", "sharesCount", "shares.count"),
    sv: apCntOf(it, "collectCount", "savesCount", "saveCount"),
    du: apDurOf(it),
    // แฮชแท็กจากช่องของตัวดึงก่อน · ไม่มี = หาจากข้อความเต็ม (ก่อนตัด 160 ตัวอักษร) · ไม่มีข้อความเลย = ไม่รู้
    tg: tg0?.length ? tg0 : full ? apTagsOfText(full) : tg0,
    ty: apTypeOf(it, u, vid) };
}
// เลขโพสต์ Facebook (ตัวเลขล้วน) — ลิงก์โพสต์มี 2 แบบ (pfbid… กับเลขโพสต์) ใช้เลขนี้จับคู่แทนได้
const apPid = (s: unknown) => { const t = String(s ?? ""); return /^\d{5,25}$/.test(t) ? t : null; };
const apPidOfUrl = (u: string) => {
  try { const x = new URL(u); return apPid(x.searchParams.get("story_fbid") ?? x.searchParams.get("fbid") ?? /\/(\d{5,25})\/?$/.exec(x.pathname)?.[1]); }
  catch { return null; }
};
// ข้อมูลทุกโพสต์ที่ขั้นแรกเห็น (โพสต์ที่จะดึงคอมเมนต์มาก่อน · ≤AP_META_MAX)
function apMetasOf(items: any[], urls: string[], max = AP_META_MAX): ApPost[] {
  const out: ApPost[] = []; const seen = new Set<string>();
  const add = (it: any, u: string) => {
    const k = apUrlKey(u);
    if (!k || seen.has(k) || out.length >= max) return;
    seen.add(k);
    out.push(it ? apPostMeta(it, u) : { u, t: "", at: null, lk: null, cm: null, vw: null, img: null, vid: null, pid: null, sh: null, sv: null, du: null, tg: null, ty: null });
  };
  for (const u of urls) add(items.find((x) => [apS(x, "url"), apS(x, "postUrl"), apS(x, "topLevelUrl"), apS(x, "webVideoUrl")].includes(u)), u);
  for (const it of items) { const u = apS(it, "url", "postUrl", "webVideoUrl", "topLevelUrl"); if (/^https:\/\//.test(u)) add(it, u); }
  return out;
}
let apThumbErr = "";
// รวมเหตุผลที่เก็บรูปไม่ได้ (หลายรูปทำพร้อมกัน — ไม่ให้ข้อความหลังทับข้อความแรก)
const apThumbNote = (m: string) => { if (!apThumbErr.includes(m)) apThumbErr = (apThumbErr ? apThumbErr + " · " : "") + m; };
// ตัวดึงไม่ส่งรูปมาเลยสักโพสต์ → จดชื่อช่องที่ได้มา (ชื่อช่องเท่านั้น ไม่มีค่า) ไว้ให้ผู้ดูแลแก้ชื่อช่องในโค้ดได้ถูก
function apNoImgNote(L: any, metas: ApPost[], items: any[]) {
  if (!metas.length || metas.some((p) => p.img)) return;
  const it = items.find((x) => x && typeof x === "object") ?? {};
  const keys = Object.keys(it).slice(0, 30).map((k) => {
    const v = it[k];
    if (Array.isArray(v) && v[0] && typeof v[0] === "object") return `${k}[${Object.keys(v[0]).slice(0, 8).join("/")}]`;
    return k;
  }).join(", ");
  L.th_err = scrub("ตัวดึงไม่ได้ส่งลิงก์รูปปกมา — ช่องที่ได้: " + keys).slice(0, 300);
}
async function apReadCap(r: Response, max: number): Promise<Uint8Array | null> {
  const rd = r.body?.getReader(); if (!rd) return null;
  const parts: Uint8Array[] = []; let n = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    n += value.length;
    if (n > max) { await rd.cancel().catch(() => {}); return null; }
    parts.push(value);
  }
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const apWithin = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("หมดเวลา")), ms))]);
// คืนลิงก์รูปใน Storage ของเรา · เก็บไม่ได้ = คืนลิงก์เดิม (ผ่าน apImgOk แล้ว) · ลิงก์ใช้ไม่ได้ = null
async function apThumb(src: unknown, key: string): Promise<string | null> {
  const ok = apImgOk(src);
  if (!ok || ok.startsWith(AP_IMG_PUB)) return ok;
  try {
    const r = await fetch(ok, { redirect: "error", signal: AbortSignal.timeout(6000) });
    const ct = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[ct];
    if (!r.ok || !ext || Number(r.headers.get("content-length") ?? 0) > AP_IMG_MAX) {
      await r.body?.cancel().catch(() => {});
      apThumbNote(!r.ok ? `ดึงรูปปกจาก ${new URL(ok).hostname} ไม่ได้ (HTTP ${r.status})`
        : !ext ? `ลิงก์รูปปกไม่ใช่ไฟล์รูป (${ct.slice(0, 40) || "ไม่ระบุชนิด"})` : "รูปปกใหญ่เกิน 1.5MB");
      return ok;
    }
    const buf = await apReadCap(r, AP_IMG_MAX);
    if (!buf?.length) return ok;
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key || ok)));
    const path = "p/" + [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("") + "." + ext;
    const up = () => apWithin(sb.storage.from(AP_BUCKET).upload(path, buf, { contentType: ct, upsert: true, cacheControl: "604800" }), 6000);
    let { error } = await up();
    if (error && /not.?found|does not exist/i.test(error.message)) {
      const c = await apWithin(sb.storage.createBucket(AP_BUCKET, { public: true, fileSizeLimit: AP_IMG_MAX,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] }), 6000);
      if (!c.error || /exist/i.test(c.error.message)) ({ error } = await up());
      else error = c.error;
    }
    if (error) { apThumbNote("เก็บรูปปกลง Storage ไม่ได้: " + scrub(error.message).slice(0, 140)); return ok; }
    const pub = sb.storage.from(AP_BUCKET).getPublicUrl(path).data.publicUrl;
    return apImgOk(pub) ? pub + "?v=" + Date.now().toString(36) : ok;
  } catch (e) { apThumbNote("เก็บรูปปกไม่ได้: " + scrub(e).slice(0, 140)); return ok; }
}
// pid = เลขโพสต์ (คอมเมนต์ FB ไอดี "เลขโพสต์_เลขคอมเมนต์") · cands = ลิงก์ที่อาจเป็นโพสต์ต้นทาง
function apPostOf(posts: ApPost[] | undefined, pid: string | null, ...cands: string[]): ApPost | null {
  if (!posts?.length) return null;
  for (const c of cands) {
    const k = c ? apUrlKey(c) : "";
    const p = k ? posts.find((x) => apUrlKey(x.u) === k) : null;
    if (p) return p;
  }
  for (const n of [pid, ...cands.map((c) => (c ? apPidOfUrl(c) : null))]) {
    const p = n ? posts.find((x) => x.pid === n || apPidOfUrl(x.u) === n) : null;
    if (p) return p;
  }
  return null;
}
// เติมข้อมูลโพสต์/รูปปกให้คอมเมนต์ที่เก็บไว้ก่อนหน้า (เฉพาะแถวที่มาจาก Apify · ไม่แตะแถวของ webhook) · คืนจำนวนแถวที่เติม
async function apBackfill(channel: string, metas: ApPost[], deadline: number): Promise<number> {
  if (!metas.length) return 0;
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const { data, error } = await sb.from("social_mentions").select("id,external_id,raw").eq("channel", channel).eq("kind", "comment")
    .gte("posted_at", since).order("posted_at", { ascending: false }).limit(500);
  if (error || !Array.isArray(data)) return 0;
  let n = 0;
  for (const r of data as any[]) {
    if (Date.now() > deadline) break;
    const raw = r.raw && typeof r.raw === "object" ? r.raw : {};
    if (raw.via !== "apify") continue;
    const pid = /^(\d{5,25})_\d+$/.exec(String(r.external_id ?? ""))?.[1] ?? null;
    const p = apPostOf(metas, channel === "facebook" ? pid : null, String(raw.post_id ?? ""));
    if (!p) continue;
    const post = { t: p.t, at: p.at, lk: p.lk, cm: p.cm, vw: p.vw, img: p.img ?? null, vid: p.vid ?? null, sh: p.sh ?? null, sv: p.sv ?? null };
    // เหมือนเดิม (ต่างแค่ ?v= ของรูปที่คัดลอกซ้ำ) = ไม่เขียน — ไม่ให้แอปที่เปิดอยู่รีเฟรชเปล่า ๆ ทุกรอบ
    const norm = (x: any) => JSON.stringify(x ? { ...x, img: String(x.img ?? "").split("?")[0] } : null);
    if (raw.post_id === p.u && norm(raw.post) === norm(post)) continue;
    const { error: ue } = await sb.from("social_mentions").update({ raw: { ...raw, post_id: p.u, post } }).eq("id", r.id);
    if (!ue) n++;
  }
  return n;
}
// ยอดแชร์/เซฟ/ความยาว/แฮชแท็ก/ประเภท จากแถวที่คีย์สาธารณะแก้ได้ → บีบให้อยู่ในกรอบ (ใส่เฉพาะช่องที่รู้ค่า)
function apStatClean(p: any): Partial<ApPost> {
  const o: Partial<ApPost> = {};
  const n = (x: unknown) => { const v = apNum(x); return v != null && v >= 0 && v < 1e12 ? Math.round(v) : null; };
  const sh = n(p?.sh), sv = n(p?.sv), du = apDur(p?.du), tg = apTags(p?.tg);
  if (sh != null) o.sh = sh;
  if (sv != null) o.sv = sv;
  if (du != null) o.du = du;
  if (tg) o.tg = tg;
  if (AP_TYPES.includes(p?.ty)) o.ty = p.ty;
  return o;
}
// ค่าจากแถว runs (คีย์สาธารณะแก้ได้) → บีบให้เป็นข้อมูลสั้น ๆ ที่ปลอดภัยก่อนเก็บลงรีวิว
function apPostsClean(a: unknown, max = AP_META_MAX): ApPost[] {
  if (!Array.isArray(a)) return [];
  return a.slice(0, max).filter((p: any) => typeof p?.u === "string" && /^https:\/\//.test(p.u)).map((p: any) => ({
    u: String(p.u).slice(0, 500), t: String(p.t ?? "").slice(0, 160), at: apIso(p.at),
    lk: apNum(p.lk), cm: apNum(p.cm), vw: apNum(p.vw), img: apImgOk(p.img), vid: p.vid === true, pid: apPid(p.pid),
    ...apStatClean(p),
    ...(Number(p.thf) > 0 ? { thf: Math.min(9, Number(p.thf) | 0) } : {}) }));
}
// เพิ่ม/อัปเดตโพสต์ลงรายการ (ข้อมูลใหม่ทับของเดิม · รูปที่เก็บใน Storage แล้วไม่ถูกลิงก์ CDN ชั่วคราวทับ)
async function apCatMerge(channel: string, metas: ApPost[]) {
  if (!metas.length || !["facebook", "instagram", "tiktok"].includes(channel)) return;
  await stSave("ap_posts", (v) => {
    const map = new Map(apPostsClean(v[channel], AP_CAT_MAX).map((p) => [apUrlKey(p.u), p] as [string, any]));
    for (const m of metas) {
      const k = apUrlKey(m.u); if (!k) continue;
      const o = map.get(k);
      const fresh = Object.fromEntries(Object.entries(m).filter(([, x]) => x != null && x !== ""));
      const img = m.img?.startsWith(AP_IMG_PUB) ? m.img : o?.img?.startsWith(AP_IMG_PUB) ? o.img : (m.img ?? o?.img ?? null);
      map.set(k, { ...(o ?? {}), ...fresh, img, ...(img?.startsWith(AP_IMG_PUB) ? { thf: 0 } : {}) });
    }
    v[channel] = [...map.values()].sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? ""))).slice(0, AP_CAT_MAX);
    v.at = new Date().toISOString();
  });
}
// ตาราง social_posts (ต้องรัน jjmk_social_posts.sql) · ยังไม่มีตาราง = เก็บในแถว ap_posts เหมือนเดิม
let postsTbl = false;
async function hasPostsTbl() {
  if (postsTbl) return true;   // จำเฉพาะ "มีแล้ว" — เจ้าของรัน SQL ทีหลังก็ใช้ได้ทันที
  const { error } = await sb.from("social_posts").select("id").limit(1);
  postsTbl = !error;
  return postsTbl;
}
const POST_COLS = "pkey,url,pid,caption,posted_at,likes,comments,views,img,is_video";
// คอลัมน์ยอดแชร์/เซฟ/ความยาว/แฮชแท็ก/ประเภท (jjmk_social_posts.sql รุ่น 2026-10-08) — ยังไม่รัน SQL รุ่นนั้น = ตารางไม่มีคอลัมน์
// → ฐานข้อมูลปฏิเสธ (PGRST204 / 42703) → จำไว้ในอินสแตนซ์นี้ (statCols=false) แล้วอ่าน/เขียนแบบเดิม ไม่ให้งานดึงโพสต์พัง
const POST_STAT = ["shares", "saves", "duration", "hashtags", "ptype"];
let statCols = true;
const postCols = () => (statCols ? POST_COLS + "," + POST_STAT.join(",") : POST_COLS);
const statColErr = (e: any) => !!e && (["PGRST204", "42703"].includes(String(e.code ?? "")) ||
  (/column/i.test(String(e.message ?? "")) && POST_STAT.some((c) => String(e.message ?? "").includes(c))));
// อ่าน social_posts ด้วยคอลัมน์ชุดเต็ม → ไม่มีคอลัมน์ใหม่ = อ่านซ้ำด้วยชุดเดิม (mk รับรายชื่อคอลัมน์ คืนคำขอ)
async function selPosts(mk: (cols: string) => any): Promise<{ data: any[] | null; error: any }> {
  let r = await mk(postCols());
  if (r.error && statCols && statColErr(r.error)) { statCols = false; r = await mk(postCols()); }
  return r;
}
const rowToPost = (r: any): ApPost => ({ u: r.url, t: r.caption ?? "", at: r.posted_at ?? null, lk: r.likes ?? null, cm: r.comments ?? null,
  vw: r.views ?? null, img: apImgOk(r.img), vid: r.is_video === true, pid: apPid(r.pid),
  ...apStatClean({ sh: r.shares, sv: r.saves, du: r.duration, tg: r.hashtags, ty: r.ptype }) });
async function apPostsSave(channel: string, srcId: string, metas: ApPost[]) {
  if (!metas.length || !["facebook", "instagram", "tiktok"].includes(channel)) return 0;
  if (!(await hasPostsTbl())) { await apCatMerge(channel, metas); return metas.length; }
  let n = 0;
  for (let i = 0; i < metas.length; i += 50) {
    const part = metas.slice(i, i + 50).filter((m) => apUrlKey(m.u));
    const keys = [...new Set(part.map((m) => apUrlKey(m.u)))];
    const { data: old, error: oe } = await selPosts((c) => sb.from("social_posts").select(c).eq("channel", channel).in("pkey", keys));
    if (oe) throw new Error("อ่านตาราง social_posts ไม่ได้: " + oe.message);
    const prev = new Map((old ?? []).map((r: any) => [r.pkey, r]));
    const byKey = new Map<string, any>();
    for (const m of part) {
      const k = apUrlKey(m.u), o: any = prev.get(k) ?? {};
      const img = m.img?.startsWith(AP_IMG_PUB) ? m.img : o.img?.startsWith?.(AP_IMG_PUB) ? o.img : (m.img ?? o.img ?? null);
      const int = (x: number | null | undefined, y: any) => (x != null ? Math.round(x) : y ?? null);
      // ทุกแถวต้องมีช่องครบชุดเดียวกัน (PostgREST) — ค่าที่ไม่มีใช้ของเดิม · cm_pulled_at/cm_got/cm_err ไม่ส่ง = ไม่ถูกทับ
      byKey.set(k, { channel, pkey: k, url: m.u || o.url, src_id: srcId, pid: m.pid ?? o.pid ?? null, caption: m.t || o.caption || null,
        posted_at: m.at ?? o.posted_at ?? null, likes: int(m.lk, o.likes), comments: int(m.cm, o.comments), views: int(m.vw, o.views),
        img, is_video: !!(m.vid || o.is_video), updated_at: new Date().toISOString(), ...(img?.startsWith(AP_IMG_PUB) ? { img_fail: 0 } : { img_fail: o.img_fail ?? 0 }),
        // ยอดแชร์/เซฟ/ความยาว/แฮชแท็ก/ประเภท — ค่าที่ไม่มีในรอบนี้ใช้ของเดิม (แบบเดียวกับไลก์/วิว)
        shares: int(m.sh, o.shares), saves: int(m.sv, o.saves), duration: m.du ?? o.duration ?? null,
        hashtags: m.tg ?? (Array.isArray(o.hashtags) ? o.hashtags : null), ptype: m.ty ?? o.ptype ?? null });
    }
    const rows = [...byKey.values()].map(({ img_fail, ...r }) => r);
    const noStat = (rs: any[]) => rs.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !POST_STAT.includes(k))));
    let { error } = await sb.from("social_posts").upsert(statCols ? rows : noStat(rows), { onConflict: "channel,pkey" });
    // ยังไม่ได้รัน SQL รุ่นที่เพิ่มคอลัมน์ → บันทึกซ้ำแบบไม่มี 5 คอลัมน์ใหม่ (จำไว้ ไม่ลองซ้ำทุกชุด)
    if (error && statCols && statColErr(error)) { statCols = false; ({ error } = await sb.from("social_posts").upsert(noStat(rows), { onConflict: "channel,pkey" })); }
    if (error) throw new Error("บันทึกตาราง social_posts ไม่ได้: " + error.message);
    n += rows.length;
  }
  return n;
}
// รูปปกในรายการที่ยังเป็นลิงก์ CDN (เช่น ได้มาจากรอบดึงย้อนหลังที่เวลาไม่พอ) → ทยอยเก็บลง Storage รอบละ ≤8 รูป · พลาด 2 ครั้ง = เลิกลอง
async function apCatThumbs(deadline: number) {
  if (await hasPostsTbl()) {
    const { data: rows } = await sb.from("social_posts").select("id,url,img,img_fail").not("img", "is", null)
      .not("img", "like", AP_IMG_PUB + "%").lt("img_fail", 2).order("posted_at", { ascending: false }).limit(8);
    if (!rows?.length || Date.now() > deadline) return 0;
    let ok = 0;
    await Promise.all(rows.map(async (r: any) => {
      const img = await apThumb(r.img, apUrlKey(r.url));
      const good = !!img?.startsWith(AP_IMG_PUB);
      if (good) ok++;
      await sb.from("social_posts").update(good ? { img, img_fail: 0 } : { img_fail: (Number(r.img_fail) || 0) + 1 }).eq("id", r.id);
    }));
    return ok;
  }
  const { data } = await sb.from("social_settings").select("val").eq("id", "ap_posts").maybeSingle();
  const todo: { ch: string; p: ApPost & { thf?: number } }[] = [];
  for (const ch of ["tiktok", "instagram", "facebook"])
    for (const p of apPostsClean(data?.val?.[ch], AP_CAT_MAX) as (ApPost & { thf?: number })[])
      if (p.img && !p.img.startsWith(AP_IMG_PUB) && (p.thf ?? 0) < 2 && todo.length < 8) todo.push({ ch, p });
  if (!todo.length || Date.now() > deadline) return 0;
  const done = await Promise.all(todo.map(async ({ ch, p }) => ({ ch, k: apUrlKey(p.u), img: await apThumb(p.img, apUrlKey(p.u)) })));
  await stSave("ap_posts", (v) => {
    for (const d of done) {
      const arr = apPostsClean(v[d.ch], AP_CAT_MAX) as any[];
      const p = arr.find((x) => apUrlKey(x.u) === d.k); if (!p) continue;
      if (d.img?.startsWith(AP_IMG_PUB)) { p.img = d.img; p.thf = 0; } else p.thf = (p.thf ?? 0) + 1;
      v[d.ch] = arr;
    }
  }).catch(() => null);
  return done.filter((d) => d.img?.startsWith(AP_IMG_PUB)).length;
}
// แปลงผลทั้งชุดเป็นแถว + หาว่าร้านตอบคอมเมนต์ไหนแล้ว (คำตอบของร้านเป็นแถวลูก หรืออยู่ใน replies ของคอมเมนต์)
function apRows(def: (typeof AP_KINDS)[string], items: any[], src: ApSrc): ApRow[] {
  const rows: ApRow[] = []; const idx = new Map<string, ApRow>();
  const replied = new Map<string, string>();
  for (const it of items) {
    if (def.shop?.(it, src)) {
      const pid = apS(it, "replyToCommentId", "parentComment.id", "parentCommentId", "replyToId", "repliesToId", "parentId");
      if (pid) replied.set(pid, apStr(apS(it, "text"), 1000) || "(ร้านตอบในแอพแล้ว)");
      continue;
    }
    let row: ApRow | null = null;
    try { row = def.map(it, src); } catch { row = null; }
    if (!row) continue;
    if (row.kind === "comment") {
      const pm = apPostOf(src.posts, /^(\d{5,25})_\d+$/.exec(row.external_id)?.[1] ?? null,
        apS(it, "inputUrl"), apS(it, "postUrl", "videoWebUrl", "webVideoUrl", "facebookUrl"), String(row.raw.post_id ?? ""));
      if (pm) row.raw = { ...row.raw, post_id: pm.u, post: { t: pm.t, at: pm.at, lk: pm.lk, cm: pm.cm, vw: pm.vw, img: pm.img ?? null, vid: pm.vid ?? null, sh: pm.sh ?? null, sv: pm.sv ?? null } };
    }
    rows.push(row);
    idx.set(apS(it, "id", "commentId", "cid"), row);
    const reps = [it?.replies, it?.replyComments, it?.childComments].find((x) => Array.isArray(x)) ?? [];
    const own = def.shop ? reps.find((x: any) => def.shop!(x, src)) : null;
    if (own && !row.reply_text) row.reply_text = apStr(apS(own, "text"), 1000) || "(ร้านตอบในแอพแล้ว)";
  }
  for (const [pid, txt] of replied) {
    const row = idx.get(pid) ?? rows.find((r) => def.ext && r.external_id === def.ext(pid));
    if (row && !row.reply_text) row.reply_text = txt;
  }
  return rows;
}
// อ่านรายการแหล่งจาก channels.apify_sources แล้วบีบให้อยู่ในกรอบ (คีย์สาธารณะแก้ตารางนี้ได้)
function apSources(arr: unknown): ApSrc[] {
  if (!Array.isArray(arr)) return [];
  const out: ApSrc[] = []; const seen = new Set<string>();
  for (const s of arr.slice(0, AP_MAX_SOURCES) as any[]) {
    const kind = String(s?.kind ?? "");
    if (!AP_KINDS[kind]) continue;
    const url = String(s?.url ?? "").trim().slice(0, 300);
    if (!url) continue;
    let id = String(s?.id ?? "").replace(/[^\w-]/g, "").slice(0, 24) || kind + "_" + out.length;
    const base = id.slice(0, 20); let n = 0;
    while (seen.has(id)) id = base + "_" + (++n);
    seen.add(id);
    const br = /^[A-Z0-9_]{2,12}$/.test(String(s?.branch ?? "")) ? String(s.branch) : null;
    const every = Math.max(AP_MIN_H, Math.min(24 * 14, Number(s?.every_h) || AP_KINDS[kind].every));
    out.push({ id, kind, url, branch: br, on: s?.on !== false, every_h: every });
  }
  return out;
}
let apTok = "";
// อ่านจากตารางทุกครั้ง (ไม่จำข้ามคำขอ) — ยกเลิกการเชื่อมแล้วอินสแตนซ์อื่นของฟังก์ชันต้องหยุดใช้ token เดิมทันที
async function apToken(): Promise<string> {
  if (APIFY_ENV) return APIFY_ENV;
  const { data, error } = await sb.from("social_settings").select("val").eq("id", "apify").maybeSingle();
  if (error) throw new Error("อ่านสถานะ Apify ไม่ได้: " + error.message);
  const enc = data?.val?.tok_enc;
  const raw = enc ? (await decryptRT(String(enc), "apify")) ?? "" : "";
  const t = /^apify_api_[A-Za-z0-9]{20,80}$/.test(raw) ? raw : "";   // ถอดได้แต่ไม่ใช่ token Apify = ไม่ใช้ (ไม่ส่งค่าลับอื่นออกไป)
  if (t && !SECRET_VALUES.includes(t)) SECRET_VALUES.push(t);
  apTok = t;
  return t;
}
function apErr(status: number, d: any, t: string) {
  const m = scrub(d?.error?.message ?? t).slice(0, 200);
  const type = String(d?.error?.type ?? "");
  if (status === 401) return "Apify ไม่รับ token (ถูกลบ/พิมพ์ผิด) — วาง token ใหม่ในหน้าเชื่อมต่อช่องทาง";
  if (/memory|concurren/i.test(type + " " + m)) return "แผนฟรีของ Apify รันพร้อมกันได้จำกัด — รอบหน้า (15 นาที) จะเริ่มให้เอง";
  if (status === 402 || /usage|limit-exceeded|credit|insufficient|not-enough/i.test(type)) return "เครดิต Apify เดือนนี้หมดแล้ว — ระบบจะดึงต่อเองเมื่อขึ้นรอบเดือนใหม่";
  if (status === 404) return "ไม่พบตัวดึงข้อมูลนี้บน Apify: " + m;
  if (status === 400) return "ข้อมูลที่ส่งให้ตัวดึงไม่ถูกต้อง: " + m;
  if (status === 429) return "Apify ให้รอสักครู่ (เรียกถี่เกิน) — รอบหน้าจะลองใหม่";
  return `Apify ตอบ ${status}: ${m}`;
}
async function apCall(tok: string, path: string, opt: { method?: string; body?: unknown; q?: Record<string, string | number> } = {}) {
  const qs = opt.q ? "?" + new URLSearchParams(Object.entries(opt.q).map(([k, v]) => [k, String(v)])).toString() : "";
  const r = await fetch(APIFY + path + qs, {
    method: opt.method ?? "GET",
    headers: { Authorization: `Bearer ${tok}`, ...(opt.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
    signal: AbortSignal.timeout(AP_CALL_MS),
  });
  const t = await r.text();
  let d: any = null;
  try { d = JSON.parse(t); } catch { /* ไม่ใช่ JSON */ }
  if (!r.ok) { const e: any = new Error(apErr(r.status, d, t)); e.status = r.status; throw e; }
  return d;
}
async function apUsage(tok: string) {
  const d = (await apCall(tok, "/users/me/limits"))?.data ?? {};
  const used = Number(d.current?.monthlyUsageUsd ?? NaN), limit = Number(d.limits?.maxMonthlyUsageUsd ?? NaN);
  if (!Number.isFinite(used)) throw new Error("อ่านยอดใช้ของ Apify ไม่ได้");
  const lim = Number.isFinite(limit) && limit > 0 ? limit : 5;
  return { used: Math.round(used * 1000) / 1000, limit: lim, budget: Math.min(AP_BUDGET, lim * 0.95),
    end: d.monthlyUsageCycle?.endAt ?? null, at: new Date().toISOString() };
}
// แก้แถว social_settings id='apify' แบบเทียบเวลาแก้ล่าสุดก่อนเขียน (cron กับปุ่มในแอปทำงานพร้อมกันได้)
// แก้แถว social_settings แบบเทียบ updated_at (ใช้กับแถวที่ฟังก์ชันเขียน: apify · ap_posts)
async function stSave(id: string, mut: (v: any) => void) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await sb.from("social_settings").select("val,updated_at").eq("id", id).maybeSingle();
    if (error) throw new Error(`อ่าน ${id} ไม่ได้: ` + error.message);
    const v = JSON.parse(JSON.stringify(data?.val ?? {}));
    mut(v);
    const now = new Date().toISOString();
    if (!data) {
      const { error: ie } = await sb.from("social_settings").insert({ id, val: v, updated_at: now });
      if (!ie) return v;
      continue; // อีกงานเพิ่งสร้างแถว → อ่านใหม่
    }
    const { data: up, error: ue } = await sb.from("social_settings").update({ val: v, updated_at: now })
      .eq("id", id).eq("updated_at", data.updated_at).select("id");
    if (ue) throw new Error(`บันทึก ${id} ไม่ได้: ` + ue.message);
    if (up?.length) return v;
    await sleep(150 + Math.random() * 300);
  }
  throw new Error(`บันทึก ${id} ไม่ได้ (มีงานอื่นแก้พร้อมกัน)`);
}
const apSave = (mut: (v: any) => void) => stSave("apify", mut);
// บันทึกแถวลง social_mentions (รีวิว Google กันซ้ำกับที่ได้จาก Business Profile/Places แบบเดียวกับ pollGoogle)
async function apSaveRows(rows: ApRow[]) {
  let added = 0, dup = 0, err = "";
  // แถวใหม่ที่ไม่ใช่ Google (มีไอดีตรงตัว) บันทึกทีละ 100 แถวในคำขอเดียว — 🚀 ดึงทั้งหมดได้คอมเมนต์ทีละหลายร้อย บันทึกทีละแถวไม่ทันเวลาของฟังก์ชัน
  // แถวที่มีอยู่แล้ว/ซ้ำในชุด/บันทึกทั้งชุดไม่ได้ → ไปทางเดิมด้านล่างทีละแถว (ร้านเพิ่งตอบ · เติมข้อมูลโพสต์ · กันซ้ำรีวิว Google)
  const slow: ApRow[] = [], byCh = new Map<string, ApRow[]>();
  for (const r of rows) {
    if (r.channel === "google" || !r.external_id) { slow.push(r); continue; }
    const a = byCh.get(r.channel) ?? []; a.push(r); byCh.set(r.channel, a);
  }
  for (const [ch, list] of byCh) for (let i = 0; i < list.length; i += 100) {
    const part = list.slice(i, i + 100);
    const { data: ex, error: e1 } = await sb.from("social_mentions").select("external_id").eq("channel", ch).in("external_id", [...new Set(part.map((r) => r.external_id))]);
    if (e1) { slow.push(...part); continue; }
    const have = new Set((ex ?? []).map((x: any) => String(x.external_id))), fresh: ApRow[] = [];
    for (const r of part) { if (have.has(r.external_id)) slow.push(r); else { have.add(r.external_id); fresh.push(r); } }
    if (!fresh.length) continue;
    const { data, error } = await sb.from("social_mentions").upsert(fresh.map((r) => ({ channel: r.channel, kind: r.kind, external_id: r.external_id,
      branch: r.branch ?? null, author_name: r.author_name ?? null, text: r.text, rating: r.rating ?? null,
      url: typeof r.url === "string" ? r.url.slice(0, 500) : null, posted_at: r.posted_at, raw: r.raw,
      reply_status: r.reply_text ? "sent" : "pending", reply_text: r.reply_text ? apStr(r.reply_text) : null, replied_by: r.reply_text ? "ร้าน (ตอบไว้แล้ว)" : null })),
      { onConflict: "channel,external_id", ignoreDuplicates: true }).select("id");
    if (error) { slow.push(...fresh); continue; }
    added += (data ?? []).length; dup += fresh.length - (data ?? []).length;
  }
  for (const r of slow) {
    if (r.channel === "google" && r.author_name) {
      const ep = Date.parse(r.posted_at);
      // เทียบแบบคล้าย (ชื่อ ±12 ชม.) เฉพาะแถวจาก Business Profile/Places — แถวจาก Apify มีไอดีรีวิวตรงตัวอยู่แล้ว
      // (ไม่งั้นคนชื่อเดียวกันให้ดาวเท่ากันในวันเดียวกัน รีวิวคนที่สองจะหาย)
      let q = sb.from("social_mentions").select("id,reply_status").eq("channel", "google").eq("author_name", r.author_name)
        .not("external_id", "like", "g\\_ap\\_%")
        .gte("posted_at", new Date(ep - 43200000).toISOString()).lte("posted_at", new Date(ep + 43200000).toISOString());
      if (r.rating != null) q = q.eq("rating", r.rating);
      if (r.branch) q = q.or(`branch.eq.${r.branch},branch.is.null`);
      const { data: ex } = await q.limit(1);
      if (ex?.length) {
        dup++;
        if (r.reply_text && !["sent", "auto_sent"].includes(ex[0].reply_status))
          await sb.from("social_mentions").update({ reply_status: "sent", reply_text: apStr(r.reply_text), replied_by: "ร้าน (ตอบใน Google)" }).eq("id", ex[0].id);
        continue;
      }
    }
    const row: Record<string, unknown> = { channel: r.channel, kind: r.kind, external_id: r.external_id, branch: r.branch,
      author_name: r.author_name, text: r.text, rating: r.rating, url: typeof r.url === "string" ? r.url.slice(0, 500) : null,
      posted_at: r.posted_at, raw: r.raw };
    if (r.reply_text) { row.reply_status = "sent"; row.reply_text = apStr(r.reply_text); row.replied_by = "ร้าน (ตอบไว้แล้ว)"; }
    const { data, error } = await sb.from("social_mentions").upsert(row, { onConflict: "channel,external_id", ignoreDuplicates: true }).select("id");
    if (error) { err = error.message; continue; }
    if ((data ?? []).length) { added++; continue; }
    dup++;
    // มีอยู่แล้ว — ร้านเพิ่งไปตอบในแอพนั้นเอง → ขึ้นว่าตอบแล้ว (อัตราการตอบรายโพสต์ไม่ค้างเป็น "ยังไม่ตอบ")
    // + เติม/อัพเดตข้อมูลโพสต์ต้นทาง (ยอดไลก์/วิวเปลี่ยนทุกรอบ) เฉพาะแถวที่ Apify สร้าง — แถวจาก webhook ไม่แตะ raw
    const pr: any = r.raw;
    if (r.reply_text || pr?.post || pr?.video) {
      const { data: ex } = await sb.from("social_mentions").select("id,reply_status,raw").eq("channel", r.channel).eq("external_id", r.external_id).limit(1);
      const e0: any = ex?.[0];
      if (e0) {
        const patch: Record<string, unknown> = {};
        if (r.reply_text && !["sent", "auto_sent"].includes(e0.reply_status))
          Object.assign(patch, { reply_status: "sent", reply_text: apStr(r.reply_text), replied_by: "ร้าน (ตอบในแอพนั้นแล้ว)" });
        if ((pr?.post || pr?.video) && e0.raw?.via === "apify") patch.raw = { ...e0.raw, ...pr };
        if (Object.keys(patch).length) await sb.from("social_mentions").update(patch).eq("id", e0.id);
      }
    }
  }
  return { added, dup, err };
}
// room = งบที่ยังเหลือให้รอบนี้ — ตัวดึงบอกว่าเพดานต่ำกว่าขั้นต่ำ ("allowed minimum of $X") ลองใหม่ด้วย X ได้ครั้งเดียว ถ้า X ≤ $1 และไม่เกินงบที่เหลือ
async function apStart(tok: string, src: ApSrc, step: number, urls: string[], since: string | null, room = Infinity,
  over?: { max: number; input: Record<string, unknown>; usd: number; timeout?: number }) {
  const st = AP_KINDS[src.kind].steps[step];
  const go = (cap: number) => apCall(tok, `/acts/${st.actor}/runs`, { method: "POST", body: { ...st.input(src, urls, since), ...(over?.input ?? {}) },
    q: { timeout: over?.timeout ?? AP_TIMEOUT_S, maxItems: over?.max ?? st.max, maxTotalChargeUsd: cap } });
  let cap = over?.usd ?? st.usd ?? AP_RUN_USD, d: any;
  try { d = await go(cap); }
  catch (e) {
    const m = /allowed minimum of\s*\$?\s*([\d.]+)/i.exec(String((e as any)?.message ?? ""));
    const min = m ? Number(m[1]) : NaN;
    if ((e as any)?.status !== 400 || !(min > cap) || min > Math.min(1, room)) throw e;
    cap = min;
    d = await go(cap);
  }
  const id = d?.data?.id;
  if (!id) throw new Error("Apify ไม่ส่งรหัสรอบกลับมา");
  return { id: String(id), usd: cap };
}
// รอบล่าสุดจากบัญชี Apify เอง — ใช้นับเพดาน (ตาราง social_settings ใครถือคีย์สาธารณะก็แก้/ลบได้ ห้ามใช้นับ)
async function apRunStats(tok: string) {
  const d = await apCall(tok, "/actor-runs", { q: { desc: 1, limit: 50 } });
  const items = d?.data?.items;
  if (!Array.isArray(items)) throw new Error("อ่านรายการรอบของ Apify ไม่ได้");
  const now = Date.now();
  return {
    running: items.filter((r: any) => ["READY", "RUNNING"].includes(String(r?.status))).length,
    hour: items.filter((r: any) => now - (Date.parse(r?.startedAt) || 0) < 3600000).length,
  };
}
const apKey = (s: ApSrc) => s.kind + "|" + s.url;
// งานหลัก: เก็บผลรอบที่เสร็จ → ต่อขั้นที่ 2 → เริ่มรอบใหม่ของแหล่งที่ถึงเวลา
// manual=true (กดในแอป): แหล่งที่ไม่ได้ดึงมา 30 นาทีเริ่มได้เลยไม่ต้องรอถึงรอบ · start=false = เก็บผลอย่างเดียว
async function apifyTick(manual = false, budgetMs = 40000, start = true, only?: string) {
  const t0 = Date.now();
  const left = () => budgetMs - (Date.now() - t0);
  const tok = await apToken();
  if (!tok) return { ok: false, reason: "ยังไม่ได้เชื่อม Apify — วาง API token ในหน้าเชื่อมต่อช่องทาง" };
  // อ่านรายการแหล่งแบบเช็ค error — อ่านพลาดแล้วได้รายการว่าง = ระบบจะยกเลิกรอบที่กำลังทำ + ลบประวัติทิ้งหมด
  const { data: chRow, error: chErr } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
  if (chErr) return { ok: false, reason: "อ่านรายการแหล่งข้อมูลไม่ได้: " + scrub(chErr.message).slice(0, 120) };
  const sources = apSources(chRow?.val?.apify_sources);
  const lockId = crypto.randomUUID();
  const lockUntil = () => new Date(Date.now() + Math.max(0, left()) + 90000).toISOString();
  let S0: any;
  try {
    S0 = await apSave((v) => {
      if (v.lock && Date.parse(v.lock.until) > Date.now()) throw new Error("APLOCK");
      v.lock = { id: lockId, until: lockUntil() };
    });
  } catch (e) {
    if (String((e as any)?.message ?? e).includes("APLOCK")) return { ok: true, skipped: true, reason: "มีรอบดึงข้อมูลกำลังทำงานอยู่ — ลองใหม่อีกสักครู่" };
    throw e;
  }
  const runs: Record<string, any> = {}; const last: Record<string, any> = {};
  const dropRuns = new Set<string>();
  const report: any[] = [];
  let usage: any = null, usageErr = "", gate: { running: number; hour: number } | null = null, gateErr = "";
  let added = 0, started = 0, chained = 0, freshUsd = 0;
  const L = (sid: string) => (last[sid] ??= { ...(S0.last?.[sid] ?? {}) });
  // 🚀 ดึงทั้งหมด: สถานะต่อแหล่ง (เขียนกลับตอนจบรอบ — ไม่ทับคำสั่งหยุดที่เจ้าของกดระหว่างรอบ)
  const fullSrc: Record<string, any> = {}; let fullFlag: { paused?: string | null; done?: boolean } = {};
  const FS = (sid: string) => (fullSrc[sid] ??= { ...(S0.full?.src?.[sid] ?? {}) });
  const now = () => new Date().toISOString();
  // บันทึกรอบที่เพิ่งสั่งเริ่มทันที — ฟังก์ชันถูกตัดกลางทางก็ยังตามเก็บผลได้ ไม่เริ่มซ้ำ (เงินเสียไปแล้ว)
  const commitRun = (sid: string, entry: any) => apSave((v) => {
    v.runs = { ...(v.runs ?? {}), [sid]: entry };
    v.last = { ...(v.last ?? {}), [sid]: { ...(v.last?.[sid] ?? {}), ...L(sid) } };
    if (v.lock?.id === lockId) v.lock.until = lockUntil();
  }).catch((e) => console.error("apify commit", scrub(e)));
  // ก่อนเริ่มรอบใหม่ทุกครั้ง: งบเดือนนี้ (รวมรอบที่กำลังทำ) + รันพร้อมกัน + จำนวนต่อชั่วโมง — นับจาก Apify เอง
  // cap = เพดานเงินของรอบที่จะเริ่ม · freshUsd = เพดานของรอบที่เพิ่งเริ่มในครั้งนี้ (ยังไม่ขึ้นยอดใน Apify)
  const room = () => (usage && gate ? usage.budget - usage.used - gate.running * AP_RUN_USD - freshUsd : 0);
  const blocked = (cap = AP_RUN_USD): { msg: string; hard: boolean } | null => {
    if (!usage) return { msg: "ยังไม่เริ่ม — อ่านยอดใช้เครดิตของ Apify ไม่ได้ (" + usageErr + ")", hard: false };
    if (!gate) return { msg: "ยังไม่เริ่ม — อ่านรายการรอบของ Apify ไม่ได้ (" + gateErr + ")", hard: false };
    const fresh = started + chained;
    if (cap > room())
      return { msg: `หยุดก่อน — ใช้เครดิตเดือนนี้ไป $${usage.used.toFixed(2)} (รวมงานที่กำลังทำ) ถึงงบ $${usage.budget.toFixed(2)} แล้ว`, hard: true };
    if (gate.running + fresh >= AP_MAX_RUNNING) return { msg: "รอรอบที่กำลังทำเสร็จก่อน — รอบหน้าเริ่มให้เอง", hard: false };
    if (gate.hour + fresh >= AP_MAX_PER_HOUR) return { msg: "ชั่วโมงนี้เริ่มครบโควต้าแล้ว — รอบหน้าเริ่มให้เอง", hard: false };
    return null;
  };
  try {
    try { usage = await apUsage(tok); } catch (e) { usageErr = scrub(e).slice(0, 160); }
    try { gate = await apRunStats(tok); } catch (e) { gateErr = scrub(e).slice(0, 160); }
    // ① เก็บผลรอบที่เปิดค้างไว้
    for (const [sid, r] of Object.entries(S0.runs ?? {}) as [string, any][]) {
      if (left() < AP_CALL_MS * 2) break;
      const src0 = sources.find((s) => s.id === apSrcIdOf(sid));
      try {
        // แหล่งถูกลบ/ปิด/เปลี่ยนลิงก์หลังสั่งรอบนี้ → ผลเป็นของลิงก์เดิม ทิ้งไป
        if (!src0 || !src0.on || !AP_KINDS[src0.kind]?.steps[r.step ?? 0] || (r.key && r.key !== apKey(src0))) {
          await apCall(tok, `/actor-runs/${encodeURIComponent(r.id)}/abort`, { method: "POST" }).catch(() => null);
          dropRuns.add(sid); continue;
        }
        const src: ApSrc = { ...src0, owner: typeof r.owner === "string" ? r.owner.slice(0, 120) : undefined, posts: apPostsClean(r.posts, r.cm ? AP_CM_BULK : AP_META_MAX) };
        const run = (await apCall(tok, `/actor-runs/${encodeURIComponent(r.id)}`))?.data ?? {};
        const status = String(run.status ?? "");
        if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(status)) {
          if (Date.now() - (Date.parse(r.at) || 0) > (r.full === "posts" ? 80 * 60000 : AP_STALE_MS)) {
            await apCall(tok, `/actor-runs/${encodeURIComponent(r.id)}/abort`, { method: "POST" }).catch(() => null);
            Object.assign(L(sid), { ok: false, err: "ใช้เวลานานเกิน 45 นาที — ยกเลิกรอบนี้ รอบหน้าลองใหม่", done: now() });
            dropRuns.add(sid);
          }
          continue;
        }
        const step = Number(r.step) || 0;
        const def = AP_KINDS[src.kind];
        const stepDef = def.steps[step];
        if (r.full === "posts") {
          // รายการโพสต์ทั้งหมด: อ่านผลทีละหน้า (อาจหลายพันโพสต์) บันทึกลง social_posts · อ่านไม่หมดในรอบนี้ = จำตำแหน่งไว้อ่านต่อรอบหน้า
          // restat = ปุ่ม 🔄 อัปเดตยอดทุกโพสต์ (<แหล่ง>~st) — ใช้ทางเดียวกัน แต่ห้ามแตะสถานะงาน 🚀 (full.src) · บอกผลที่ last[<แหล่ง>~st] อย่างเดียว
          const fsr: any = r.restat ? null : FS(src.id);
          if (!run.defaultDatasetId || !["SUCCEEDED", "TIMED-OUT", "ABORTED"].includes(status)) {
            if (fsr) {
              fsr.pf = (Number(fsr.pf) || 0) + 1;
              if (fsr.pf >= 2) Object.assign(fsr, { posts: "done", posts_err: "อ่านรายการโพสต์ไม่สำเร็จ 2 ครั้ง — ข้ามไปดึงคอมเมนต์ของโพสต์ที่มีอยู่" });
            }
            Object.assign(L(sid), { ok: false, done: now(), err: (r.restat ? "อัปเดตยอดโพสต์ไม่สำเร็จ: " : "อ่านรายการโพสต์ทั้งหมดไม่สำเร็จ: ") + scrub(run.statusMessage ?? status).slice(0, 140) });
            dropRuns.add(sid); continue;
          }
          let off = Number(r.off) || 0, end = false;
          while (left() > AP_CALL_MS * 2) {
            const page = await apCall(tok, `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items`,
              { q: { clean: "true", format: "json", limit: AP_FULL_PAGE, offset: off } });
            const its = Array.isArray(page) ? page : [];
            // ชื่อเพจ/บัญชีร้าน → ชุดคอมเมนต์ใช้แยกคำตอบของร้านออกจากเสียงลูกค้า (แบบขั้นแรกของรอบปกติ)
            if (fsr && !fsr.owner && its.length) { const ow = apS(its[0], "pageName", "user.name", "author.name", "ownerFullName").slice(0, 120); if (ow) fsr.owner = ow; }
            await apPostsSave(def.channel, src.id, apMetasOf(its, [], AP_FULL_PAGE));
            off += its.length;
            if (its.length < AP_FULL_PAGE) { end = true; break; }
          }
          if (!end) { runs[sid] = { ...r, off }; await commitRun(sid, runs[sid]); continue; }
          if (fsr) Object.assign(fsr, { posts: "done", n: off, posts_err: null, posts_at: now() });
          Object.assign(L(sid), { ok: true, err: null, n: off, added: 0, done: now(), ok_at: now(),
            note: (r.restat ? `อัปเดตยอด ${off} โพสต์` : `รายการโพสต์ทั้งหมด ${off} โพสต์`) + (status !== "SUCCEEDED" ? " (บางส่วน — หมดเวลา)" : "") });
          dropRuns.add(sid); continue;
        }
        if (r.full === "cm") {
          // 🚀 คอมเมนต์ชุดละ AP_FULL_BATCH โพสต์ (อาจหลายพันแถว) — อ่านผลทีละหน้า บันทึก แล้วจำตำแหน่ง (อ่านไม่หมดในรอบนี้ = รอบหน้าอ่านต่อ)
          // ติ๊กโพสต์ว่าดึงแล้วเมื่ออ่านครบทุกหน้าเท่านั้น (ไม่งั้นคอมเมนต์ที่ยังไม่ได้อ่านหายถาวร)
          if (!run.defaultDatasetId || !["SUCCEEDED", "TIMED-OUT", "ABORTED"].includes(status)) {
            await apFullMark(def.channel, r.keys, null).catch(() => null);
            Object.assign(L(sid), { ok: false, done: now(), err: "ดึงคอมเมนต์ชุดนี้ไม่สำเร็จ: " + scrub(run.statusMessage ?? status).slice(0, 140) });
            dropRuns.add(sid); continue;
          }
          let off = Number(r.off) || 0, end = false, bad = "", addN = Number(r.added) || 0;
          const got: Record<string, number> = { ...(r.got && typeof r.got === "object" ? r.got : {}) };
          while (left() > AP_CALL_MS * 2) {
            const page = await apCall(tok, `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items`,
              { q: { clean: "true", format: "json", limit: AP_FULL_PAGE, offset: off } });
            const its = Array.isArray(page) ? page : [];
            const rows = apRows(def, its, src);
            const sv = await apSaveRows(rows);
            if (sv.err) { bad = sv.err; break; }   // หน้านี้ยังไม่นับ — รอบหน้าอ่านหน้าเดิมซ้ำ (แถวที่บันทึกแล้วถูกข้ามเอง)
            for (const row of rows) { const k = apUrlKey(String(row.raw?.post_id ?? "")); if (k) got[k] = (got[k] ?? 0) + 1; }
            addN += sv.added; added += sv.added; off += its.length;
            if (its.length < AP_FULL_PAGE) { end = true; break; }
          }
          if (bad) {
            const sf = (Number(r.sf) || 0) + 1;
            Object.assign(L(sid), { ok: false, err: "บันทึกคอมเมนต์ไม่ได้: " + scrub(bad).slice(0, 160), done: now() });
            if (sf >= 3) { await apFullMark(def.channel, r.keys, null).catch(() => null); dropRuns.add(sid); continue; }
            runs[sid] = { ...r, off, got, added: addN, sf }; await commitRun(sid, runs[sid]); continue;
          }
          if (!end) { runs[sid] = { ...r, off, got, added: addN }; await commitRun(sid, runs[sid]); continue; }
          await apFullMark(def.channel, r.keys, got).catch((e) => console.error("full mark", scrub(e)));
          Object.assign(L(sid), { ok: true, err: null, n: off, added: addN, done: now(),
            note: `คอมเมนต์ ${(Array.isArray(r.keys) ? r.keys : []).length} โพสต์ · ได้ ${off} รายการ (ใหม่ ${addN})${status !== "SUCCEEDED" ? " — บางส่วน (หมดเวลา)" : ""}` });
          report.push({ id: sid, kind: src.kind, n: off, added: addN });
          dropRuns.add(sid); continue;
        }
        let items: any[] = [];
        if (run.defaultDatasetId && ["SUCCEEDED", "TIMED-OUT", "ABORTED"].includes(status)) {
          if (left() < AP_CALL_MS) break;
          const d = await apCall(tok, `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items`,
            { q: { clean: "true", format: "json", limit: r.cm && Number(r.max) > stepDef.max
              ? Math.min(AP_CM_MAX, Number(r.max) | 0) * 2 : Math.min(200, stepDef.max * 2) } });
          // บางตัวดึงส่งเป็น "ร้าน 1 แถว + รีวิวเป็นรายการข้างใน" → แตกเป็นรีวิวทีละแถว
          items = (Array.isArray(d) ? d : []).flatMap((it: any) => {
            const inner = [it?.reviews, it?.latestReviews, it?.userReviews].find((x) => Array.isArray(x) && x.length && typeof x[0] === "object");
            return inner ? inner.slice(0, 100) : [it];
          });
        }
        if (status !== "SUCCEEDED" && !items.length) {
          Object.assign(L(sid), { ok: false, done: now(),
            err: status === "FAILED" ? "ตัวดึงข้อมูลทำงานไม่สำเร็จ: " + scrub(run.statusMessage ?? "").slice(0, 160)
              : status === "TIMED-OUT" ? "ดึงไม่ทันเวลา 5 นาที — รอบหน้าลองใหม่" : "รอบถูกยกเลิก" });
          dropRuns.add(sid); continue;
        }
        if (step < def.steps.length - 1) {
          // ขั้นแรก (หาโพสต์ล่าสุด) เสร็จ → เริ่มขั้นดึงคอมเมนต์ต่อ
          const urls = r.cat ? [] : [...new Set((stepDef.urls?.(items, src) ?? []).map(String))].slice(0, 4);
          // ข้อมูล + รูปปกของทุกโพสต์ที่เห็น (≤8 · รอบดึงย้อนหลัง ≤AP_CAT_MAX) → จับคู่คอมเมนต์รอบนี้ + เติมให้คอมเมนต์เก่า + ลงรายการโพสต์
          const metas = apMetasOf(items, urls, r.cat ? AP_CAT_MAX : AP_META_MAX);
          const thumbs = async () => {
            const some = metas.slice(0, 12);   // ที่เหลือ apCatThumbs ทยอยเก็บรอบต่อ ๆ ไป
            if (left() > AP_THUMB_MS && some.some((p) => p.img)) {
              apThumbErr = "";
              await Promise.all(some.map(async (p) => { if (p.img) p.img = await apThumb(p.img, apUrlKey(p.u)); }));
              L(sid).th_err = apThumbErr || null;
            }
          };
          const backfill = async () => {
            await apPostsSave(def.channel, src.id, metas).catch((e) => { L(sid).th_err = scrub(e).slice(0, 200); });
            if (left() > 8000) L(sid).bf = await apBackfill(def.channel, metas, Date.now() + Math.min(left() - 4000, 10000)).catch(() => 0);
          };
          if (r.cat) {   // รอบดึงย้อนหลัง: เก็บรายการโพสต์อย่างเดียว ไม่ดึงคอมเมนต์ (กันค่าใช้จ่าย)
            await thumbs(); apNoImgNote(L(sid), metas, items); await backfill();
            Object.assign(L(sid), { ok: true, err: null, n: metas.length, added: 0, done: now(), ok_at: now(),
              note: status !== "SUCCEEDED" ? `ได้ ${metas.length} โพสต์ (บางส่วน)` : `ได้ ${metas.length} โพสต์` });
            dropRuns.add(sid); continue;
          }
          if (!urls.length) {
            await thumbs(); apNoImgNote(L(sid), metas, items); await backfill();
            Object.assign(L(sid), { ok: true, err: null, n: 0, added: 0, done: now(), note: "ไม่มีโพสต์ใหม่ในช่วงนี้" });
            dropRuns.add(sid); continue;
          }
          const b = blocked(def.steps[step + 1].usd ?? AP_RUN_USD);
          if (b) {
            // งบหมด = จบรอบนี้ · ติดชั่วคราว (อ่านยอดไม่ได้/รันพร้อมกันเต็ม) = เก็บรอบไว้ รอบหน้าลองต่อขั้นสองใหม่
            Object.assign(L(sid), b.hard ? { ok: false, err: b.msg, done: now() } : { wait: b.msg });
            if (b.hard) dropRuns.add(sid);
            continue;
          }
          if (left() < AP_CALL_MS) break;
          // ชื่อเพจ/บัญชีร้านจากขั้นแรก → ใช้แยกคำตอบของร้านออกจากเสียงลูกค้าในขั้นสอง
          const owner = apS(items[0], "pageName", "user.name", "author.name", "ownerFullName").slice(0, 120);
          // รูปปกโพสต์ → เก็บลง Storage (พร้อมกัน · มีเวลาเหลือเท่านั้น · ไม่ได้ = ใช้ลิงก์เดิม)
          await thumbs();
          apNoImgNote(L(sid), metas, items);
          const nr = await apStart(tok, src, step + 1, urls, null, room());
          chained++; freshUsd += nr.usd;
          runs[sid] = { id: nr.id, step: step + 1, at: now(), key: apKey(src), ...(owner ? { owner } : {}), posts: metas };
          L(sid).wait = null;
          await commitRun(sid, runs[sid]);
          await backfill();
          continue;
        }
        const rows = apRows(def, items, src);
        // คลิปที่พูดถึงร้าน: เก็บรูปปกคลิปด้วย (≤12 รูป)
        if (src.kind === "tt_search" && left() > AP_THUMB_MS) {
          apThumbErr = "";
          await Promise.all(rows.slice(0, 12).map(async (row) => {
            const v = row.raw?.video as { img?: string | null } | undefined;
            if (v?.img) v.img = await apThumb(v.img, apUrlKey(row.url ?? "") || row.external_id);
          }));
          L(sid).th_err = apThumbErr || null;
        }
        const sv = await apSaveRows(rows);
        added += sv.added;
        // รอบที่สำเร็จครบเท่านั้นที่เลื่อน ok_at (Google Maps ใช้เป็นจุดเริ่มรอบหน้า — เลื่อนพลาด = รีวิวหายถาวร)
        const full = !sv.err && status === "SUCCEEDED";
        Object.assign(L(sid), { ok: !sv.err, err: sv.err ? "บันทึกไม่ได้: " + scrub(sv.err).slice(0, 160) : null,
          n: items.length, rows: rows.length, added: sv.added, done: now(), ...(full ? { ok_at: now() } : {}),
          note: status !== "SUCCEEDED" ? "ได้ข้อมูลบางส่วน (หมดเวลา)" : (items.length && !rows.length ? "ได้ข้อมูลแต่อ่านไม่ออก — แจ้งผู้ดูแล" : null) });
        report.push({ id: sid, kind: src.kind, n: items.length, added: sv.added });
        dropRuns.add(sid);
      } catch (e) {
        const st2 = (e as any)?.status;
        Object.assign(L(sid), { ok: false, err: scrub(e).slice(0, 200), done: now() });
        if (st2 === 404 || st2 === 400) dropRuns.add(sid); // รอบหาย/ใช้ไม่ได้ → ไม่ต้องตามต่อ
        if (st2 === 401) break;
      }
    }
    // ② เริ่มรอบใหม่
    if (start) {
      const busy = (sid: string) => (runs[sid] || (S0.runs?.[sid] && !dropRuns.has(sid)));
      for (const src of sources) {
        if (started >= AP_START_PER_TICK || left() < AP_CALL_MS + 2000) break;
        if (!src.on || busy(src.id) || (only && src.id !== only)) continue;
        const prev = L(src.id);
        // เปลี่ยนลิงก์/ประเภทของแหล่งนี้ → เริ่มนับใหม่ (ไม่งั้น Google Maps ดึงจากวันที่ของลิงก์เดิม รีวิวเก่าของร้านใหม่หาย)
        if (prev.key && prev.key !== apKey(src))
          for (const k of ["ok_at", "start", "n", "rows", "added", "note", "err", "ok", "done"]) delete prev[k];
        const since = Date.parse(prev.start ?? "") || 0;
        // กดดึงตอนนี้: แหล่งที่รอบล่าสุดพัง ลองใหม่ได้ทันที (แก้ลิงก์/อัพเดตโค้ดแล้วไม่ต้องรอ 30 นาที)
        const due = manual ? (prev.ok === false || Date.now() - since >= AP_MANUAL_GAP_MS) : Date.now() - since >= src.every_h * 3600000;
        if (!due) continue;
        const def = AP_KINDS[src.kind];
        if (!def.ok(src.url)) {
          Object.assign(prev, { ok: false, err: `ลิงก์/ชื่อไม่ถูกรูปแบบของ "${def.label}"`, start: now(), key: apKey(src) });
          continue;
        }
        const b = blocked(def.steps[0].usd ?? AP_RUN_USD);
        if (b) { if (b.hard) { prev.err = b.msg; continue; } prev.wait = b.msg; break; }
        try {
          // Google Maps: ดึงเฉพาะรีวิวตั้งแต่รอบที่สำเร็จล่าสุด (เผื่อ 3 วัน) → จ่ายเฉพาะรีวิวใหม่
          const okAt = Date.parse(prev.ok_at ?? "") || 0;
          const sinceIso = src.kind === "gmaps" && okAt ? new Date(okAt - 3 * 86400000).toISOString() : null;
          const r0 = await apStart(tok, src, 0, [], sinceIso, room());
          started++; freshUsd += r0.usd;
          runs[src.id] = { id: r0.id, step: 0, at: now(), key: apKey(src) };
          Object.assign(prev, { start: now(), err: null, wait: null, key: apKey(src) });
          await commitRun(src.id, runs[src.id]);
        } catch (e) {
          // เริ่มไม่ได้เพราะข้อมูลผิด/ไม่มีสิทธิ์ = รอรอบปกติ · ติดชั่วคราว (เครดิต/หน่วยความจำ/ถี่เกิน/เน็ต) = ลองใหม่รอบหน้า
          const s2 = Number((e as any)?.status) || 0;
          Object.assign(prev, { ok: false, err: scrub(e).slice(0, 200), key: apKey(src), ...([400, 403, 404].includes(s2) ? { start: now() } : {}) });
          if (s2 === 401 || s2 === 402 || s2 === 429 || s2 === 0 || s2 >= 500) break;
        }
      }
    }
    // ③ 🚀 ดึงทั้งหมด (เจ้าของกดเริ่มในการ์ด ⚡) — เริ่มขั้นถัดไปของแต่ละแหล่ง ภายใต้งบ/เพดานรันพร้อมกันเดียวกับงานปกติ
    if (start && S0.full?.on && !only) {
      const busyK = (k: string) => runs[k] || (S0.runs?.[k] && !dropRuns.has(k));
      const fullSources = sources.filter((s) => s.on && AP_FULL_CM_INPUT[s.kind] && AP_KINDS[s.kind].ok(s.url));
      let paused: string | null = null;
      for (const src of fullSources) {
        if (left() < AP_CALL_MS + 3000) break;
        const def = AP_KINDS[src.kind], fsr = FS(src.id);
        const kA = src.id + "~all", kC = src.id + "~fc";
        if (fsr.posts !== "done") {
          if (busyK(kA)) continue;
          // 🔄 อัปเดตยอดทุกโพสต์ (<แหล่ง>~st) กำลังอ่านรายการชุดเดียวกันอยู่ → รอให้เสร็จก่อน ไม่จ่ายค่าอ่านรายการซ้ำพร้อมกัน
          if (busyK(src.id + "~st")) { L(kA).wait = "รอรอบอัปเดตยอดให้เสร็จก่อน"; continue; }
          if (last[kA]?.wait || S0.last?.[kA]?.wait) L(kA).wait = null;   // รอบอัปเดตยอดจบแล้ว — ไม่ค้างข้อความรอ (ถูกบล็อกงบ/เพดานต่อ = การ์ดบอกเหตุผลอื่น)
          const b = blocked(Math.max(def.steps[0].usd ?? AP_RUN_USD, AP_RUN_USD));
          if (b) { if (b.hard) paused = b.msg; continue; }
          try {
            const r0 = await apStart(tok, src, 0, [], null, room(), { max: AP_FULL_POSTS, input: AP_FULL_LIST_INPUT[src.kind](AP_FULL_POSTS),
              usd: Math.min(AP_FULL_LIST_USD, room()), timeout: 3600 });
            started++; freshUsd += r0.usd;
            runs[kA] = { id: r0.id, step: 0, at: now(), key: apKey(src), full: "posts", off: 0 };
            Object.assign(L(kA), { start: now(), err: null, wait: null, key: apKey(src) });
            await commitRun(kA, runs[kA]);
          } catch (e) { Object.assign(L(kA), { ok: false, err: scrub(e).slice(0, 200), done: now() }); }
          continue;   // คอมเมนต์เริ่มหลังได้รายการโพสต์ครบ
        }
        if (fsr.cm === "done" || busyK(kC)) continue;
        const need = def.steps[1].usd ?? AP_RUN_USD;
        const b = blocked(need);
        if (b) { if (b.hard) paused = b.msg; continue; }
        try {
          const todo = await apFullTodo(def.channel, src.id);
          if (!todo.length) { fsr.cm = "done"; continue; }
          const r1 = await apStart(tok, src, 1, todo.map((p) => p.u), null, room(), { max: AP_FULL_BATCH * AP_FULL_CM_PER,
            input: AP_FULL_CM_INPUT[src.kind](AP_FULL_CM_PER), usd: Math.min(AP_FULL_CM_USD, room()), timeout: 1200 });
          started++; freshUsd += r1.usd;
          runs[kC] = { id: r1.id, step: 1, at: now(), key: apKey(src), full: "cm", keys: todo.map((p) => apUrlKey(p.u)), posts: todo,
            ...(typeof fsr.owner === "string" && fsr.owner ? { owner: fsr.owner.slice(0, 120) } : {}) };
          Object.assign(L(kC), { start: now(), err: null, key: apKey(src) });
          await commitRun(kC, runs[kC]);
        } catch (e) { Object.assign(L(kC), { ok: false, err: scrub(e).slice(0, 200), done: now() }); }
      }
      fullFlag.paused = paused;
      const pending = (k: string) => runs[k] || (S0.runs?.[k] && !dropRuns.has(k));
      if (fullSources.length && fullSources.every((s) => FS(s.id).posts === "done" && FS(s.id).cm === "done" && !pending(s.id + "~all") && !pending(s.id + "~fc")))
        fullFlag.done = true;
    }
    if (left() > AP_THUMB_MS) await apCatThumbs(Date.now() + left() - 8000).catch((e) => console.error("ap thumbs", scrub(e)));
  } finally {
    await apSave((v) => {
      v.runs = { ...(v.runs ?? {}) };
      for (const sid of dropRuns) if (v.runs[sid]?.id === S0.runs?.[sid]?.id) delete v.runs[sid];
      Object.assign(v.runs, runs);
      // แหล่งที่ถูกลบออกจากรายการแล้ว ไม่ต้องเก็บประวัติ
      v.last = { ...(v.last ?? {}), ...last };
      for (const k of Object.keys(v.last)) if (!sources.some((s) => s.id === apSrcIdOf(k))) delete v.last[k];
      if (Object.keys(fullSrc).length || "paused" in fullFlag || fullFlag.done) {
        const f = { ...(v.full ?? {}) };
        f.src = { ...(f.src ?? {}), ...fullSrc };
        if ("paused" in fullFlag) f.paused = fullFlag.paused;
        if (fullFlag.done && f.on) { f.on = false; f.done_at = now(); f.paused = null; }
        v.full = f;
      }
      if (usage) v.usage = usage;
      v.usage_err = usageErr || null;
      v.env = !!APIFY_ENV;
      v.tick_at = now();
      if (v.lock?.id === lockId) delete v.lock;
    }).catch((e) => console.error("apify state", scrub(e)));
  }
  return { ok: true, added, started: started + chained, collected: report, usage, usage_err: usageErr || undefined,
    running: Object.keys({ ...Object.fromEntries(Object.entries(S0.runs ?? {}).filter(([k]) => !dropRuns.has(k))), ...runs }).length };
}
// ตรวจว่าเป็นผู้ดูแลระบบ/เจ้าของ (ใช้กับคำสั่งที่มีผลกับบัญชีภายนอก/ค่าใช้จ่าย)
// คีย์สาธารณะชุดเดียวกับหน้าแอป/SQL cron (ไม่ใช่ความลับ) — ใช้อ่าน pnl_users เมื่อคีย์ฝั่งเซิร์ฟเวอร์อ่านไม่ได้
const SB_PUBLISHABLE = "sb_publishable_Bn6BMtcjasoPT3RZ_ekyOg_SLWWp-nm";
async function readPnlUser(u: string): Promise<{ usr: any; err: string }> {
  let err = "";
  try {
    const { data, error } = await sb.from("pnl_users").select("*").eq("username", u).limit(1);
    if (!error && data?.length) return { usr: data[0], err: "" };
    if (error) err = error.message;
  } catch (e) { err = scrub(e); }
  // service role อ่านไม่ได้ (ตารางไม่ได้ให้สิทธิ์ service_role / คีย์ legacy ถูกปิด) → อ่านแบบเดียวกับแอป (ตาราง pnl_users เปิดให้คีย์สาธารณะอ่าน)
  for (const k of [Deno.env.get("SUPABASE_ANON_KEY") ?? "", SB_PUBLISHABLE]) {
    if (!k) continue;
    try {
      const r = await fetch(`${SB_URL}/rest/v1/pnl_users?select=*&username=eq.${encodeURIComponent(u)}&limit=1`,
        { headers: { apikey: k, Authorization: `Bearer ${k}` }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        if (Array.isArray(d)) return { usr: d[0] ?? null, err: d[0] ? "" : err };
      } else err = err || `HTTP ${r.status}`;
    } catch (e) { err = err || scrub(e); }
  }
  return { usr: null, err };
}
// ตรวจว่าเป็นผู้ดูแลระบบ/เจ้าของ — คืน "" = ผ่าน · ไม่ผ่าน = เหตุผลจริง (บอกให้แก้ถูกจุด แทนข้อความกลาง ๆ)
async function bossCheck(u: unknown, h: unknown): Promise<string> {
  const un = String(u ?? "").trim();
  if (!un) return "แอปไม่ได้ส่งชื่อผู้ใช้มา — ออกจากระบบแล้วล็อกอินใหม่";
  if (!h) return "แอปไม่ได้ส่งรหัสยืนยันตัวตนมา — ออกจากระบบแล้วล็อกอินใหม่";
  const { usr, err } = await readPnlUser(String(u));
  if (!usr) return err ? "เซิร์ฟเวอร์อ่านตารางผู้ใช้ไม่ได้: " + scrub(err).slice(0, 140) : `ไม่พบบัญชี "${un.slice(0, 40)}" ในตารางผู้ใช้`;
  if (usr.pass_hash !== h) return "รหัสผ่านของบัญชีนี้ถูกเปลี่ยนไปแล้ว — ออกจากระบบแล้วล็อกอินใหม่";
  if (usr.active === false) return "บัญชีนี้ถูกปิดใช้งาน";
  if (!["admin", "owner"].includes(String(usr.role))) return `บัญชีนี้เป็นระดับ "${String(usr.role ?? "").slice(0, 20)}" — ต้องเป็นผู้ดูแลระบบหรือเจ้าของ`;
  return "";
}
async function bossOk(u: unknown, h: unknown) { return !(await bossCheck(u, h)); }
// 🚀 โพสต์ถัดไปที่ต้องดึงคอมเมนต์ (ใหม่ก่อน) — โพสต์ที่แพลตฟอร์มบอกว่าไม่มีคอมเมนต์ติ๊กว่าเสร็จเลย ไม่เสียเงิน
async function apFullTodo(channel: string, srcId: string): Promise<ApPost[]> {
  await sb.from("social_posts").update({ cm_pulled_at: new Date().toISOString(), cm_got: 0 })
    .eq("channel", channel).eq("src_id", srcId).is("cm_pulled_at", null).eq("comments", 0);
  const { data, error } = await selPosts((c) => sb.from("social_posts").select(c).eq("channel", channel).eq("src_id", srcId)
    .is("cm_pulled_at", null).lt("cm_err", 2).order("posted_at", { ascending: false, nullsFirst: false }).limit(AP_FULL_BATCH));
  if (error) throw new Error("อ่านตาราง social_posts ไม่ได้: " + error.message);
  return (data ?? []).map(rowToPost).filter((p) => /^https:\/\//.test(p.u));
}
// got = จำนวนคอมเมนต์ที่ได้ต่อโพสต์ (สำเร็จ) · null = รอบนี้พัง (นับครั้งพลาด ครบ 2 = ข้ามโพสต์นั้น)
async function apFullMark(channel: string, keys: unknown, got: Record<string, number> | null) {
  const ks = (Array.isArray(keys) ? keys : []).map(String).filter(Boolean).slice(0, 50);
  if (!ks.length) return;
  if (got) {
    for (const k of ks)
      await sb.from("social_posts").update({ cm_pulled_at: new Date().toISOString(), cm_got: got[k] ?? 0 }).eq("channel", channel).eq("pkey", k);
    return;
  }
  const { data } = await sb.from("social_posts").select("id,cm_err").eq("channel", channel).in("pkey", ks);
  for (const r of data ?? []) await sb.from("social_posts").update({ cm_err: (Number((r as any).cm_err) || 0) + 1 }).eq("id", (r as any).id);
}
async function apifyFull(on: boolean, by: string) {
  if (on && !(await hasPostsTbl())) return { ok: false, reason: "ต้องรัน SQL jjmk_social_posts.sql ใน Supabase ก่อน (สร้างตารางเก็บโพสต์ทั้งหมด)" };
  const now = new Date().toISOString();
  await apSave((v) => {
    // เริ่มใหม่ภายใน 30 วัน = ใช้รายการโพสต์ที่อ่านครบแล้วต่อ (ไม่จ่ายค่าอ่านรายการซ้ำ) · ขั้นคอมเมนต์ดูจากตาราง social_posts ว่าโพสต์ไหนยังไม่ได้ดึง
    const keep: Record<string, unknown> = {};
    for (const [sid, x] of Object.entries((v.full?.src ?? {}) as Record<string, any>))
      if (x?.posts === "done" && !x.posts_err && Date.now() - (Date.parse(x.posts_at) || 0) < 30 * 864e5)
        keep[sid] = { posts: "done", n: x.n, posts_at: x.posts_at, ...(typeof x.owner === "string" ? { owner: x.owner.slice(0, 120) } : {}) };
    v.full = on ? { on: true, at: now, by: String(by).slice(0, 60), src: keep, paused: null }
      : { ...(v.full ?? {}), on: false, stopped_at: now };
  });
  return { ok: true };
}
// ปุ่มในหน้าแพลตฟอร์ม (ผู้ดูแล/เจ้าของ): n = ดึงรายการโพสต์/คลิปย้อนหลัง 30/60 (ไม่ดึงคอมเมนต์) · url = ดึงคอมเมนต์ของโพสต์นี้ตอนนี้
// urls = ดึงคอมเมนต์หลายโพสต์ในรอบเดียว (≤AP_CM_BULK · แอปส่ง url ตัวแรกมาด้วย → ฟังก์ชันรุ่นเก่าดึงได้อย่างน้อย 1 โพสต์)
async function apifyMore(sid: string, n: number, url: string, urls: unknown[] = []) {
  const tok = await apToken();
  if (!tok) return { ok: false, reason: "ยังไม่ได้เชื่อม Apify" };
  const { data: chRow, error } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
  if (error) return { ok: false, reason: "อ่านรายการแหล่งข้อมูลไม่ได้ — ลองใหม่อีกครั้ง" };
  const src = apSources(chRow?.val?.apify_sources).find((s) => s.id === sid);
  if (!src || !src.on) return { ok: false, reason: "ไม่พบแหล่งข้อมูลนี้ หรือปิดอยู่ — ตั้งในการ์ด ⚡ หน้าเชื่อมต่อช่องทาง" };
  const def = AP_KINDS[src.kind];
  if (def.steps.length < 2 || !AP_CAT_INPUT[src.kind]) return { ok: false, reason: "แหล่งชนิดนี้ใช้ปุ่มนี้ไม่ได้" };
  if (!def.ok(src.url)) return { ok: false, reason: "ลิงก์ของแหล่งนี้ไม่ถูกรูปแบบ" };
  let usage: any, gate: any;
  try { usage = await apUsage(tok); gate = await apRunStats(tok); }
  catch (e) { return { ok: false, reason: "อ่านยอดเครดิต/รอบของ Apify ไม่ได้: " + scrub(e).slice(0, 120) }; }
  if (gate.running >= AP_MAX_RUNNING || gate.hour >= AP_MAX_PER_HOUR) return { ok: false, reason: "Apify กำลังทำงานเต็มโควต้า — รอสักครู่แล้วลองใหม่" };
  const room = usage.budget - usage.used - gate.running * AP_RUN_USD;
  const S0 = (await sb.from("social_settings").select("val").eq("id", "apify").maybeSingle()).data?.val ?? {};
  const busy = (k: string) => S0.runs?.[k] && Date.now() - (Date.parse(S0.runs[k].at) || 0) < AP_STALE_MS;
  const now = new Date().toISOString();
  let key: string, entry: any, nPosts = 0;
  // ลิงก์โพสต์ต้องเป็นของแพลตฟอร์มเดียวกับแหล่ง (https · ≤500 ตัวอักษร)
  const want = def.channel === "facebook" ? /^(facebook\.com|fb\.watch)$/ : def.channel === "instagram" ? /^instagram\.com$/ : /^tiktok\.com$/;
  const postOk = (u: string) => {
    let host = "";
    try { const x = new URL(u); host = x.protocol === "https:" ? x.hostname.replace(/^(www|m|web)\./, "") : ""; } catch { host = ""; }
    return want.test(host) && u.length <= 500;
  };
  const metaOf = async (list: string[]) => {
    // ข้อมูลโพสต์ (ข้อความ/รูปปก) จากตาราง social_posts ก่อน · ยังไม่รัน SQL = รายการเดิมใน ap_posts
    let cat: ApPost[] = [];
    if (await hasPostsTbl()) {
      const { data: pr } = await selPosts((c) => sb.from("social_posts").select(c).eq("channel", def.channel).in("pkey", list.map(apUrlKey)));
      cat = (pr ?? []).map(rowToPost);
    } else cat = apPostsClean((await sb.from("social_settings").select("val").eq("id", "ap_posts").maybeSingle()).data?.val?.[def.channel], AP_CAT_MAX);
    return list.map((u) => cat.find((p) => apUrlKey(p.u) === apUrlKey(u)) ?? { u, t: "", at: null, lk: null, cm: null, vw: null, img: null, vid: null, pid: null });
  };
  try {
    const many = Array.isArray(urls) && urls.length > 0;
    if (many || url) {
      // หลายโพสต์: ตัดลิงก์ที่ไม่ใช่ของแพลตฟอร์มนี้/ซ้ำทิ้ง · ≤AP_CM_BULK
      const list: string[] = [], seen = new Set<string>();
      for (const x of many ? urls.slice(0, AP_CM_BULK * 3) : [url]) {
        const u = String(x ?? "").trim(), k = apUrlKey(u);
        if (!postOk(u) || !k || seen.has(k)) continue;
        seen.add(k); list.push(u);
        if (list.length >= AP_CM_BULK) break;
      }
      if (!list.length) return { ok: false, reason: "ลิงก์โพสต์ไม่ใช่ของ " + def.label };
      key = sid + "~cm";
      if (busy(key)) return { ok: false, reason: "กำลังดึงคอมเมนต์อยู่อีกรอบ — รอให้เสร็จก่อน (1–5 นาที)" };
      const st = def.steps[1];
      const metas = await metaOf(list);
      if (list.length === 1) {
        if ((st.usd ?? AP_RUN_USD) > room) return { ok: false, reason: `งบ Apify เดือนนี้เหลือไม่พอ (ใช้ไป $${usage.used.toFixed(2)})` };
        const r = await apStart(tok, src, 1, list, null, room);
        entry = { id: r.id, step: 1, at: now, key: apKey(src), posts: metas, cm: true };
      } else {
        // คอมเมนต์ต่อโพสต์ลดลงตามจำนวนโพสต์ ให้รวมทั้งรอบไม่เกิน AP_CM_MAX · เพดานเงินเท่ารอบดึงย้อนหลัง
        const pp = AP_CM_PER[src.kind];
        const per = Math.max(5, Math.min(pp?.def ?? 20, Math.floor(AP_CM_MAX / list.length)));
        const max = Math.min(AP_CM_MAX, list.length * per * (src.kind === "fb_comments" ? 2 : 1));   // FB นับคำตอบใต้คอมเมนต์ด้วย
        const cap = Math.min(AP_CAT_USD, room);
        if (cap < (st.usd ?? AP_RUN_USD)) return { ok: false, reason: `งบ Apify เดือนนี้เหลือไม่พอ (ใช้ไป $${usage.used.toFixed(2)})` };
        const r = await apStart(tok, src, 1, list, null, room, { max, input: pp ? pp.input(per) : {}, usd: cap });
        entry = { id: r.id, step: 1, at: now, key: apKey(src), posts: metas, cm: true, max };
      }
      nPosts = list.length;
    } else {
      const nn = AP_CAT_N.includes(n) ? n : AP_CAT_N[0];
      key = sid + "~cat";
      if (busy(key)) return { ok: false, reason: "กำลังดึงรายการย้อนหลังอยู่ — รอให้เสร็จก่อน (2–5 นาที)" };
      const cap = Math.min(AP_CAT_USD, room);
      if (cap < (def.steps[0].usd ?? AP_RUN_USD)) return { ok: false, reason: `งบ Apify เดือนนี้เหลือไม่พอ (ใช้ไป $${usage.used.toFixed(2)})` };
      const r = await apStart(tok, src, 0, [], null, room, { max: nn, input: AP_CAT_INPUT[src.kind](nn), usd: cap });
      entry = { id: r.id, step: 0, at: now, key: apKey(src), cat: nn };
      nPosts = nn;
    }
  } catch (e) { return { ok: false, reason: scrub(e).slice(0, 200) }; }
  await apSave((v) => {
    v.runs = { ...(v.runs ?? {}), [key]: entry };
    v.last = { ...(v.last ?? {}), [key]: { ...(v.last?.[key] ?? {}), start: now, err: null, ok: null, note: null, key: apKey(src) } };
  });
  return { ok: true, key, n: nPosts };
}
// 🔄 อัปเดตยอดทุกโพสต์ (ปุ่มในหน้า 📈 วิเคราะห์โพสต์/คลิป · ผู้ดูแล/เจ้าของ) — อ่านรายการโพสต์ทั้งหมดใหม่ของทุกแหล่ง FB/IG/TikTok
// แบบเดียวกับขั้นแรกของ 🚀 (AP_FULL_LIST_INPUT · ≤AP_FULL_POSTS · หมดเวลา 1 ชม.) คีย์รอบ <แหล่ง>~st · ผลเก็บด้วยทางเดียวกับ r.full==="posts" (ไม่แตะงาน 🚀)
// ใช้งบ/เพดานเดียวกับทุกงาน: เพดานเงินต่อรอบ ≤ min(AP_FULL_LIST_USD, งบที่เหลือ) · รันพร้อมกัน/ต่อชั่วโมงนับจากบัญชี Apify เอง
async function apifyRestat() {
  if (!(await hasPostsTbl())) return { ok: false, started: 0, reason: "ต้องรัน SQL jjmk_social_posts.sql ใน Supabase ก่อน (ตารางเก็บโพสต์ทั้งหมด)" };
  const tok = await apToken();
  if (!tok) return { ok: false, started: 0, reason: "ยังไม่ได้เชื่อม Apify — วาง API token ในหน้าเชื่อมต่อช่องทาง" };
  const { data: chRow, error } = await sb.from("social_settings").select("val").eq("id", "channels").maybeSingle();
  if (error) return { ok: false, started: 0, reason: "อ่านรายการแหล่งข้อมูลไม่ได้ — ลองใหม่อีกครั้ง" };
  const srcs = apSources(chRow?.val?.apify_sources).filter((s) => s.on && AP_FULL_LIST_INPUT[s.kind] && AP_KINDS[s.kind].ok(s.url));
  if (!srcs.length) return { ok: false, started: 0, reason: "ยังไม่มีแหล่งคอมเมนต์ Facebook/Instagram/TikTok ที่เปิดอยู่ — ตั้งในการ์ด ⚡ หน้าเชื่อมต่อช่องทาง" };
  let usage: any, gate: any;
  try { usage = await apUsage(tok); gate = await apRunStats(tok); }
  catch (e) { return { ok: false, started: 0, reason: "อ่านยอดเครดิต/รอบของ Apify ไม่ได้: " + scrub(e).slice(0, 120) }; }
  let room = usage.budget - usage.used - gate.running * AP_RUN_USD;
  const S0 = (await sb.from("social_settings").select("val").eq("id", "apify").maybeSingle()).data?.val ?? {};
  const busy = (k: string) => S0.runs?.[k] && Date.now() - (Date.parse(S0.runs[k].at) || 0) < 80 * 60000;
  const reasons: string[] = [], made: Record<string, any> = {};
  let started = 0;
  for (const [i, src] of srcs.entries()) {
    const def = AP_KINDS[src.kind], key = src.id + "~st", name = def.label;
    if (busy(key)) { reasons.push(`${name}: กำลังอัปเดตยอดอยู่แล้ว`); continue; }
    if (busy(src.id + "~all")) { reasons.push(`${name}: งาน 🚀 กำลังอ่านรายการโพสต์อยู่ (ยอดจะอัปเดตจากงานนั้น)`); continue; }
    if (gate.running + started >= AP_MAX_RUNNING || gate.hour + started >= AP_MAX_PER_HOUR) { reasons.push(`${name}: Apify ทำงานเต็มโควต้า — ลองใหม่ภายหลัง`); continue; }
    // แบ่งงบที่เหลือให้ทุกแหล่งที่ยังไม่ได้เริ่ม (กดครั้งเดียวได้ครบทุกช่องทาง) · ส่วนแบ่งไม่ถึงขั้นต่ำของตัวดึง = ให้แหล่งนี้ใช้ที่เหลือทั้งหมด
    const need = Math.max(def.steps[0].usd ?? AP_RUN_USD, AP_RUN_USD);
    const share = room / Math.max(1, srcs.length - i);
    const cap = Math.min(AP_FULL_LIST_USD, share >= need ? share : room);
    if (cap < need) {
      reasons.push(started ? `${name}: งบที่เหลือกันไว้ให้รอบที่เพิ่งเริ่มแล้ว — กดอีกครั้งหลังรอบนั้นเสร็จ`
        : `${name}: งบ Apify เดือนนี้เหลือไม่พอ (ใช้ไป $${Number(usage.used).toFixed(2)})`);
      continue;
    }
    try {
      const r = await apStart(tok, src, 0, [], null, room, { max: AP_FULL_POSTS, input: AP_FULL_LIST_INPUT[src.kind](AP_FULL_POSTS), usd: cap, timeout: 3600 });
      room -= r.usd; started++;
      made[key] = { id: r.id, step: 0, at: new Date().toISOString(), key: apKey(src), full: "posts", restat: true, off: 0 };
    } catch (e) { reasons.push(`${name}: ${scrub(e).slice(0, 160)}`); }
  }
  if (started) await apSave((v) => {
    const now = new Date().toISOString();
    v.runs = { ...(v.runs ?? {}), ...made };
    v.last = { ...(v.last ?? {}) };
    for (const [k, e] of Object.entries(made)) v.last[k] = { ...(v.last[k] ?? {}), start: now, err: null, ok: null, note: null, key: e.key };
  });
  return { ok: started > 0, started, ...(reasons.length ? { reason: reasons.join(" · ") } : {}) };
}
async function apifyConnect(token: string) {
  if (APIFY_ENV) return { ok: false, reason: "มี secret APIFY_TOKEN ใน Supabase อยู่แล้ว ระบบใช้ตัวนั้น — ถ้าจะเปลี่ยนบัญชีให้ลบ secret ก่อน" };
  const t = String(token ?? "").trim();
  if (!/^apify_api_[A-Za-z0-9]{20,80}$/.test(t)) return { ok: false, reason: "token ต้องขึ้นต้นด้วย apify_api_ — คัดลอกจาก Apify → Settings → API & Integrations" };
  let me: any;
  try { me = (await apCall(t, "/users/me"))?.data ?? {}; }
  catch (e) { return { ok: false, reason: scrub(String((e as any)?.message ?? e).split(t).join("***")) }; }
  const usage = await apUsage(t).catch(() => null);
  const enc = await encryptRT(t, "apify");
  await apSave((v) => {
    v.tok_enc = enc;
    v.user = { name: apStr(me.username, 60), plan: apStr(me.plan?.id ?? me.plan?.name ?? "", 30), at: new Date().toISOString() };
    if (usage) v.usage = usage;
  });
  apTok = t; if (!SECRET_VALUES.includes(t)) SECRET_VALUES.push(t);
  return { ok: true, user: apStr(me.username, 60), usage };
}
// ===== /Apify =====

// ===== 📰 สรุปประจำวัน "มีอะไรใหม่" + 📈 วิเคราะห์โพสต์/คลิป (เจ้าของสั่ง 2026-10-08) =====
// เจ้าของ: "อยากให้มีสรุปทุกวันว่ามีอะไรใหม่บ้าง รีวิวใหม่ คอมเมนต์ใหม่ … และอยากรู้ว่าทำไมคลิปแต่ละตัวถึงมียอดดู คนกดไลค์ คนแชร์ไม่เท่ากัน"
// 📰 news: social_daily kind='news' (ALL + รายสาขา) · ส่งเข้ากลุ่ม LINE ผ่าน line-order (บอทตัวเดียวกับนับสต๊อก/ครัวกลาง) เฉพาะกลุ่มที่ลงลายเซ็นแล้ว
// 📈 content: social_daily kind='content' branch=<ช่องทาง> · AI อธิบายว่าทำไมแต่ละโพสต์ได้ยอดต่างกัน + ไอเดียคลิป/เมนูใหม่
const thDay = (t = Date.now()) => new Date(t + 7 * 3600000).toISOString().slice(0, 10);
const thStart = (d: string) => Date.parse(d + "T00:00:00+07:00");
const TH_WD = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TH_MO = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const CH_TH: Record<string, string> = { google: "Google", facebook: "FB", instagram: "IG", tiktok: "TikTok", wongnai: "Wongnai", line: "LINE",
  grab: "Grab", lineman: "LINE MAN", other: "อื่น ๆ" };
const NEWS_URL = "https://thananant.github.io/JJ-PnL/jjmk-social.html";
const NEWS_GROUP_RE = /^[CRU][0-9a-f]{32}$/;
const NEWS_MAX = 4500;
// คีย์ apikey ของคำขอที่กำลังทำ (ใช้เรียก line-order ผ่าน gateway เดียวกัน) — จำไว้ในหน่วยความจำเท่านั้น ห้าม log/เก็บลงตาราง
let reqApiKey = "";
// ข้อความที่ใส่ในสรุป/ส่งเข้า LINE: ตัดเบอร์/อีเมล/ไอดีไลน์ + @ชื่อบัญชี · ยุบช่องว่าง · ไม่มีชื่อผู้เขียน (ไม่ select author_name เลย)
// ตัดความยาวก่อน maskPII เสมอ (regex อีเมลใน maskPII ช้าแบบกำลังสองกับข้อความยาว ๆ ที่คีย์สาธารณะแทรกได้ — 50,000 ตัวอักษร = หลายวินาที) · เผื่อ 400 ตัวให้เบอร์/อีเมลที่คร่อมจุดตัดยังถูกตัด
const newsTxt = (s: unknown, n: number) => maskPII(String(s ?? "").slice(0, n + 400)).replace(/@[A-Za-z0-9._]{2,30}/g, "@…").replace(/\s+/g, " ").trim().slice(0, n);
// ข้อความที่ส่งเข้า LINE: ทุกข้อความที่มาจากตาราง (คีย์สาธารณะเขียน social_mentions/social_daily/pnl_branches ได้) ตัดลิงก์/ชื่อโดเมนทิ้ง
// กันคนแปะลิงก์หลอก (phishing) ให้บอทร้านส่งเข้ากลุ่มหัวหน้า — ลิงก์เดียวในข้อความคือ NEWS_URL ท้ายข้อความ
// ตัดหลัง maskPII (อีเมลกลายเป็น [อีเมล] ก่อน ไม่เหลือชื่อหน้า @) · ไม่แตะทศนิยม (4.5★) และภาษาไทย — เฉพาะโดเมนที่ลงท้ายด้วยตัวอักษร
// โดเมนภาษาอื่น/หน้าตาเหมือน (ผลตรวจรอบ 2 — "จริงใจหมูกระทะ.com" · "jjmoo.онлайн" · "evil。com" · "ｅｖｉｌ．ｃｏｍ" · "evil<ZWSP>.com"):
//   ① ลบอักขระควบคุมที่มองไม่เห็น (\p{Cf}: zero-width · soft hyphen · word joiner · BOM · ทิศทางข้อความ) ② แปลงตัวอักษรเต็มความกว้าง (U+FF01–FF5E) เป็น ASCII
//   ③ จุดแบบอื่น (。｡․﹒) เป็น "." — **ไม่ใช้ NFKC กับทั้งข้อความ** (สระอำ ำ จะถูกแยกเป็น ํ+า ข้อความไทยเปลี่ยน)
//   ④ ลิงก์ที่มี scheme/www · ⑤ ชื่อโดเมนทุกภาษา (label = ตัวอักษร/ตัวเลขภาษาใดก็ได้) ลงท้ายด้วย xn-- / a-z ≥2 ตัว / ไทย / คอม / ตัวอักษรภาษาอื่นที่ไม่ใช่ไทย ≥2 ตัว
//      (ท้ายเป็นอักษรไทยอื่น = ไม่ใช่โดเมน → ม.ค. · ก.ย. · อ.เมือง · ธ.ไทยพาณิชย์ ไม่ถูกตัด) · ⑥ IP ⑦ คำที่ NFKC แล้วกลายเป็นลิงก์ (ⓔⓥⓘⓛ.ⓒⓞⓜ) = ตัดทั้งคำ
//   เริ่มจับเฉพาะต้นคำ (lookbehind) — ข้อความไทยยาวไม่มีจุดไม่ต้องไล่ทุกตำแหน่ง
const NL_URL = /(?:\b[a-z][a-z0-9+.-]{1,15}:\/\/|www\.)\S+/gi;
const NL_DOM = /(?<![\p{L}\p{M}\p{N}_-])[\p{L}\p{M}\p{N}_-]+(?:\.[\p{L}\p{M}\p{N}_-]+)*\.(?:xn--[a-z0-9-]+|[a-z]{2,}|(?:ไทย|คอม)(?![\u0E00-\u0E7F])|(?![\u0E00-\u0E7F])(?:\p{L}\p{M}*){2,})(?:\/\S*)?/giu;
const NL_IP = /\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/\S*)?/g;
const NL_ANY = new RegExp(`${NL_URL.source}|${NL_DOM.source}|${NL_IP.source}`, "iu");
// ①–③ (ใช้ซ้ำกับรูป NFKC ในขั้น ⑦ — "evil︒com" NFKC แล้วได้ "。" ต้องแปลงเป็นจุดอีกรอบ)
const nlPre = (s: string) => s
  .replace(/\p{Cf}/gu, "")
  .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/[\u3002\uFF61\u2024\uFE52\uFE12]/g, ".");
const noLinks = (s: string) => nlPre(s)
  .replace(NL_URL, "[ลิงก์]")
  .replace(NL_DOM, "[ลิงก์]")
  .replace(NL_IP, "[ลิงก์]")
  .replace(/\S+/g, (w) => { const k = nlPre(w.normalize("NFKC")); return k !== w && NL_ANY.test(k) ? "[ลิงก์]" : w; });
// ตัดลิงก์จากข้อความยาว n+200 (โดเมนที่คร่อมจุดตัดยังถูกจับ) แล้วค่อยตัดเหลือ n — ไม่ต้องไล่ข้อความทั้งก้อน
const lineTxt = (s: unknown, n: number) => noLinks(newsTxt(s, n + 200)).slice(0, n);
const nz =(x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const r2 = (x: number) => Math.round(x * 100) / 100;
// 1,234 · 12.3K · 1.2M
function fmtK(x: unknown): string {
  const n = nz(x), a = Math.abs(n);
  if (a >= 999950) return String(Math.round(n / 1e5) / 10) + "M";   // 999,999 → 1M (ไม่ใช่ 1000K)
  if (a >= 1e4) return String(Math.round(n / 100) / 10) + "K";
  return Math.round(n).toLocaleString("en-US");
}
function thDateLabel(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  return `วัน${TH_WD[wd]} ${dd} ${TH_MO[m - 1] ?? ""}`;
}
// อ่านทีละ 1,000 แถว (เพดานของ PostgREST) สูงสุด max แถว
async function pageAll(mk: (from: number, to: number) => any, max = 5000): Promise<{ rows: any[]; error: any }> {
  const rows: any[] = [];
  for (let off = 0; off < max; off += 1000) {
    const { data, error } = await mk(off, Math.min(off + 999, max - 1));
    if (error) return { rows, error };
    const d = Array.isArray(data) ? data : [];
    rows.push(...d);
    if (d.length < 1000) break;
  }
  return { rows, error: null };
}
const postBrief = (ch: string, p: ApPost) => ({ ch, k: apUrlKey(p.u), u: p.u, t: newsTxt(p.t, 80), at: p.at ?? null,
  vw: p.vw ?? null, lk: p.lk ?? null, cm: p.cm ?? null, sh: p.sh ?? null, img: apImgOk(p.img) });

// ---------- 📰 สร้างสรุปของวัน d (เวลาไทย) — ไม่ระบุ = เมื่อวาน · "today" = วันนี้ถึงตอนนี้ ----------
// opts.digest = สรุป AI แถว ALL ที่ makeSummary เพิ่งทำในรอบเดียวกัน (opts.date = วันของสรุปนั้น) → data.digest_src "run"
// ไม่มี = อ่านจาก social_daily kind='daily' (คีย์สาธารณะแก้ได้) → digest_src "db" — โชว์ในแอปได้ แต่ไม่ส่งเข้า LINE
const NEWS_PEND_DAYS = 7;   // รอตอบ = เฉพาะที่โพสต์ใน 7 วันที่จบที่วันของสรุป (หลังดึงย้อนหลัง 🚀 ของค้างทั้งหมดมีเป็นพัน ไม่มีประโยชน์ในสรุปรายวัน)
async function makeNews(dIn?: string, opts: { digest?: any; date?: string } = {}) {
  const today = thDay();
  let d = thDay(Date.now() - 86400000);
  if (dIn === "today") d = today;
  else if (dIn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dIn) || !Number.isFinite(thStart(dIn)) || dIn > today) return { ok: false, reason: "วันที่ไม่ถูกต้อง" };
    d = dIn;
  }
  const fromT = thStart(d), toT = d === today ? Math.min(Date.now(), fromT + 86400000) : fromT + 86400000;
  const from = new Date(fromT).toISOString(), to = new Date(toT).toISOString();
  // รายการที่โพสต์ในวันนั้น (รีวิว/คอมเมนต์/คลิปที่พูดถึงร้าน/ข้อความ) — vw = ยอดวิวของคลิปที่พูดถึงร้าน
  const men = await pageAll((a, b) => sb.from("social_mentions")
    .select("id,channel,kind,branch,text,rating,sentiment,issues,topics,url,posted_at,analyzed_at,vw:raw->video->>vw")
    .gte("posted_at", from).lt("posted_at", to).order("posted_at", { ascending: false }).range(a, b));
  if (men.error) return { ok: false, reason: "อ่านรายการไม่ได้: " + scrub(men.error.message).slice(0, 140) };
  const rows = men.rows;
  // รอตอบ (โพสต์ใน 7 วันที่จบที่วันนี้ของสรุป) · ดึงย้อนหลังที่เข้ามาในวันนั้น · แชทลูกค้าในวันนั้น — อ่านไม่ได้ = นับ 0 (ไม่ให้ทั้งสรุปพัง)
  const pendFrom = new Date(toT - NEWS_PEND_DAYS * 86400000).toISOString();
  const pend = await pageAll((a, b) => sb.from("social_mentions").select("channel,branch")
    .eq("reply_status", "pending").neq("kind", "message").gte("posted_at", pendFrom).lt("posted_at", to)
    .order("id", { ascending: false }).range(a, b));
  const back = await pageAll((a, b) => sb.from("social_mentions").select("branch")
    .gte("created_at", from).lt("created_at", to).lt("posted_at", from).neq("kind", "message").order("id", { ascending: false }).range(a, b));
  let chatIn = 0;
  try {
    const { count, error } = await sb.from("social_chat_log").select("id", { count: "exact", head: true })
      .eq("direction", "in").gte("created_at", from).lt("created_at", to);
    if (!error) chatIn = nz(count);
  } catch { /* ไม่มีตาราง = 0 */ }
  // สรุป AI ของวันเดียวกัน (social_daily kind='daily') → หัวข้อ + สิ่งที่ควรทำ
  const dig: Record<string, any> = {};
  try {
    const { data } = await sb.from("social_daily").select("branch,data").eq("kind", "daily").eq("d", d);
    for (const x of data ?? []) if (x?.data && typeof x.data === "object") dig[String(x.branch)] = x.data;
  } catch { /* ไม่มี = null */ }
  // โพสต์ใหม่ของร้าน + เด่นสัปดาห์นี้ (ทั้งร้านเท่านั้น — FB/IG/TikTok มีบัญชีเดียว)
  let shopPosts: any[] = [], topWeek: any[] = [];
  if (await hasPostsTbl()) {
    const weekFrom = new Date(toT - 7 * 86400000).toISOString();
    const { data: wk } = await selPosts((c) => sb.from("social_posts").select("channel," + c)
      .gte("posted_at", weekFrom).lt("posted_at", to).order("posted_at", { ascending: false }).limit(300));
    const list = (wk ?? []).map((r: any) => ({ ch: String(r.channel ?? ""), p: rowToPost(r) })).filter((x: any) => x.p.u && x.ch);
    shopPosts = list.filter((x: any) => String(x.p.at ?? "") >= from).slice(0, 6).map((x: any) => postBrief(x.ch, x.p));
    const best: Record<string, any> = {};
    for (const x of list) {
      const s = (p: ApPost) => [nz(p.vw), nz(p.lk)];
      const o = best[x.ch];
      if (!o || s(x.p)[0] > s(o.p)[0] || (s(x.p)[0] === s(o.p)[0] && s(x.p)[1] > s(o.p)[1])) best[x.ch] = x;
    }
    topWeek = Object.values(best).filter((x: any) => nz(x.p.vw) > 0 || nz(x.p.lk) > 0)
      .sort((a: any, b: any) => nz(b.p.vw) - nz(a.p.vw) || nz(b.p.lk) - nz(a.p.lk)).slice(0, 3).map((x: any) => postBrief(x.ch, x.p));
  }
  const isUrgent = (r: any) => (Array.isArray(r.issues) && r.issues.some((i: any) => nz(i?.severity) >= 3)) ||
    (r.rating != null && nz(r.rating) <= 2) || (r.sentiment === "neg" && (r.kind === "review" || r.kind === "comment"));
  const topicOf = (r: any) => {
    const is = Array.isArray(r.issues) ? r.issues : [];
    const t = is.find((i: any) => nz(i?.severity) >= 3)?.topic ?? is[0]?.topic ?? (Array.isArray(r.topics) ? r.topics[0] : null);
    return t ? newsTxt(t, 40) : null;
  };
  const build = (br: string) => {
    const mine = (r: any) => br === "ALL" || r.branch === br;
    const set = rows.filter(mine);
    const items = set.filter((r: any) => r.kind !== "message");
    const by: Record<string, any> = {};
    for (const r of items) {
      const c = String(r.channel || "other").slice(0, 20);
      const x = by[c] ??= { n: 0, reviews: 0, comments: 0, mentions: 0, avg: null, pos: 0, neu: 0, neg: 0, _s: 0, _k: 0 };
      x.n++;
      if (r.kind === "review") x.reviews++; else if (r.kind === "comment") x.comments++; else if (r.kind === "mention") x.mentions++;
      if (r.rating != null && Number.isFinite(Number(r.rating))) { x._s += Number(r.rating); x._k++; }
      if (r.sentiment === "pos") x.pos++; else if (r.sentiment === "neu") x.neu++; else if (r.sentiment === "neg") x.neg++;
    }
    for (const x of Object.values(by)) { x.avg = x._k ? r2(x._s / x._k) : null; delete x._s; delete x._k; }
    const revs = items.filter((r: any) => r.kind === "review");
    const rated = revs.filter((r: any) => r.rating != null && Number.isFinite(Number(r.rating)));
    const stars: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const r of rated) stars[String(Math.min(5, Math.max(1, Math.round(Number(r.rating)))))]++;
    const cms = items.filter((r: any) => r.kind === "comment");
    const mts = items.filter((r: any) => r.kind === "mention");
    const pRows = pend.rows.filter(mine), pBy: Record<string, number> = {};
    for (const r of pRows) { const c = String(r.channel || "other").slice(0, 20); pBy[c] = (pBy[c] ?? 0) + 1; }
    // แถว ALL: ใช้สรุป AI ที่เพิ่งทำในรอบนี้ (ถ้ามี) — ไม่งั้นอ่านจากตาราง
    const run = br === "ALL" && opts.digest && typeof opts.digest === "object" && opts.date === d ? opts.digest : null;
    const dg = run ?? dig[br];
    const digest = dg && (dg.headline || Array.isArray(dg.actions)) ? { headline: newsTxt(dg.headline, 300),
      actions: (Array.isArray(dg.actions) ? dg.actions : []).slice(0, 3).map((a: unknown) => newsTxt(a, 200)).filter(Boolean) } : null;
    return {
      v: 1, d, branch: br, from, to, at: new Date().toISOString(),
      total: items.length,
      by_ch: by,
      reviews: { n: revs.length, avg: rated.length ? r2(rated.reduce((s: number, r: any) => s + Number(r.rating), 0) / rated.length) : null, stars,
        low: rated.filter((r: any) => Number(r.rating) <= 2).slice(0, 5).map((r: any) => ({ id: r.id, ch: r.channel, br: r.branch ?? null,
          rating: Number(r.rating), text: newsTxt(r.text, 140), url: typeof r.url === "string" ? r.url.slice(0, 500) : null })) },
      comments: { n: cms.length, pos: cms.filter((r: any) => r.sentiment === "pos").length, neu: cms.filter((r: any) => r.sentiment === "neu").length,
        neg: cms.filter((r: any) => r.sentiment === "neg").length },
      mentions: { n: mts.length, top: mts.map((r: any) => ({ r, vw: apNum(r.vw ?? r.raw?.video?.vw) })).sort((a: any, b: any) => nz(b.vw) - nz(a.vw)).slice(0, 3)
        .map(({ r, vw }: any) => ({ id: r.id, text: newsTxt(r.text, 100), url: typeof r.url === "string" ? r.url.slice(0, 500) : null, vw })) },
      messages: set.filter((r: any) => r.kind === "message").length + (br === "ALL" ? chatIn : 0),
      urgent: items.filter(isUrgent).slice(0, 6).map((r: any) => ({ id: r.id, ch: r.channel, br: r.branch ?? null, kind: r.kind,
        text: newsTxt(r.text, 140), topic: topicOf(r), url: typeof r.url === "string" ? r.url.slice(0, 500) : null })),
      pending: { n: pRows.length, by_ch: pBy, days: NEWS_PEND_DAYS },
      backfill: back.rows.filter(mine).length,
      shop_posts: br === "ALL" ? shopPosts : [],
      top_week: br === "ALL" ? topWeek : [],
      analyzed: { done: items.filter((r: any) => r.analyzed_at).length, total: items.length },
      digest,
      digest_src: digest ? (run ? "run" : "db") : null,
    };
  };
  const brs = ["ALL", ...new Set(rows.map((r: any) => String(r.branch ?? "")).filter((b: string) => /^[A-Z0-9_]{2,12}$/.test(b) && b !== "ALL"))];
  const list = brs.map((br) => ({ d, branch: br, kind: "news", data: build(br), created_at: new Date().toISOString() }));
  const { error } = await sb.from("social_daily").upsert(list);
  if (error) return { ok: false, reason: "บันทึกสรุปไม่ได้: " + scrub(error.message).slice(0, 140) };
  return { ok: true, d, rows: list.length, data: list[0].data };
}

// ---------- 📰 ข้อความ LINE (ข้อความล้วน ≤4,500 ตัวอักษร · ไม่มีชื่อผู้เขียน · ไม่มีลิงก์จากข้อมูล) ----------
// ทุกข้อความที่มาจากตารางผ่าน lineTxt (ตัดลิงก์/โดเมน) · หัวข้อ/สิ่งที่ควรทำของสรุป AI ใส่เฉพาะที่ทำในรอบเดียวกันในหน่วยความจำ
// (digest_src "run" — cron) · ส่งจากปุ่ม (digest อ่านจากตาราง = "db") ไม่ใส่ เพราะแถว social_daily คีย์สาธารณะแก้ได้
const own = (o: Record<string, string>, k: unknown) => typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
function newsText(data: any, brNames: Record<string, string> = {}): string {
  const x = data ?? {};
  const dg = x.digest_src === "run" && x.digest && typeof x.digest === "object" ? x.digest : null;
  const L: string[] = [`📰 สรุปโซเชียลประจำวัน · ${/^\d{4}-\d{2}-\d{2}$/.test(String(x.d ?? "")) ? thDateLabel(x.d) : "-"}`];
  const head = dg ? lineTxt(dg.headline, 300) : "";
  if (head) L.push(`✨ ${head}`);
  L.push(`📥 เข้ามาใหม่ ${fmtK(x.total)} รายการ${nz(x.total) ? "" : " — ไม่มีอะไรใหม่"}`);
  const by = x.by_ch && typeof x.by_ch === "object" ? x.by_ch : {};
  const chName = (c: unknown) => (own(CH_TH, c) ? CH_TH[c as string] : lineTxt(c, 20) || "อื่น ๆ");
  if (nz(x.reviews?.n)) {
    const chs = Object.entries(by).filter(([, v]: any) => nz(v?.reviews)).map(([c, v]: any) => `${chName(c)} ${fmtK(v.reviews)}`).join(" · ");
    L.push(`• ⭐ รีวิว ${fmtK(x.reviews.n)}${x.reviews.avg != null ? ` · เฉลี่ย ${nz(x.reviews.avg).toFixed(1)}★` : ""}${chs ? ` (${chs})` : ""}`);
  }
  if (nz(x.comments?.n)) L.push(`• 💬 คอมเมนต์ ${fmtK(x.comments.n)} · 😊 ${fmtK(x.comments.pos)} · 😠 ${fmtK(x.comments.neg)}`);
  if (nz(x.mentions?.n)) L.push(`• 🔎 คลิปที่พูดถึงร้าน ${fmtK(x.mentions.n)}`);
  if (nz(x.messages)) L.push(`• 💌 แชท ${fmtK(x.messages)}`);
  const urg = Array.isArray(x.urgent) ? x.urgent.slice(0, 5) : [];
  if (urg.length) {
    L.push("⚠️ ต้องดูด่วน");
    for (const u of urg) {
      const br = u?.br ? lineTxt(own(brNames, u.br) ? brNames[u.br] : u.br, 40) : "";
      L.push(`• ${chName(u?.ch)}${br ? " " + br : ""} — "${lineTxt(u?.text, 90)}"`);
    }
  }
  if (nz(x.pending?.n)) {
    const pb = Object.entries(x.pending.by_ch ?? {}).filter(([, n]) => nz(n)).sort((a, b) => nz(b[1]) - nz(a[1])).map(([c, n]) => `${chName(c)} ${fmtK(n)}`).join(" · ");
    const pd = nz(x.pending.days);
    L.push(`⏳ รอตอบ ${fmtK(x.pending.n)} รายการ${pd > 0 && pd <= 60 ? ` ใน ${Math.round(pd)} วันล่าสุด` : ""}${pb ? ` (${pb})` : ""}`);
  }
  const stat = (p: any) => [p.vw != null ? `👁 ${fmtK(p.vw)}` : "", p.lk != null ? `❤ ${fmtK(p.lk)}` : "", p.cm != null ? `💬 ${fmtK(p.cm)}` : "",
    p.sh != null ? `↗ ${fmtK(p.sh)}` : ""].filter(Boolean).join(" ");
  const sp = Array.isArray(x.shop_posts) ? x.shop_posts : [];
  if (sp.length) {
    L.push("🎬 โพสต์ใหม่ของร้าน");
    for (const p of sp) { const s = stat(p ?? {}); L.push(`• ${chName(p?.ch)} "${lineTxt(p?.t, 50) || "(ไม่มีข้อความ)"}"${s ? " — " + s : ""}`); }
  }
  const tw = Array.isArray(x.top_week) ? x.top_week[0] : null;
  if (tw) L.push(`🏆 เด่นสัปดาห์นี้: ${chName(tw.ch)} "${lineTxt(tw.t, 50) || "(ไม่มีข้อความ)"}"${tw.vw != null ? ` 👁 ${fmtK(tw.vw)}` : tw.lk != null ? ` ❤ ${fmtK(tw.lk)}` : ""}`);
  const acts = dg && Array.isArray(dg.actions) ? dg.actions.slice(0, 3).map((a: unknown) => lineTxt(a, 160)).filter(Boolean) : [];
  if (acts.length) L.push("👉 ควรทำ: " + acts.map((a: string, i: number) => `${i + 1}) ${a}`).join(" "));
  if (x.analyzed && nz(x.analyzed.done) < nz(x.analyzed.total)) L.push(`(วิเคราะห์แล้ว ${fmtK(x.analyzed.done)}/${fmtK(x.analyzed.total)})`);
  const foot = `เปิดดู: ${NEWS_URL}`;
  let body = L.join("\n");
  if (body.length + foot.length + 1 > NEWS_MAX) body = body.slice(0, NEWS_MAX - foot.length - 2) + "…";
  return body + "\n" + foot;
}

// ---------- social_sys: สถานะที่คีย์สาธารณะแก้ไม่ได้ (RLS: anon อ่านอย่างเดียว · ฟังก์ชันเขียนด้วย service role) ----------
// news_cfg = กลุ่ม LINE ที่ส่งสรุป · news_last = ผลส่งล่าสุด · news_push:<วันที่> / content_run:<วันที่> = จองงานของวัน (กันส่ง/วิเคราะห์ซ้ำ)
// ไม่มีตาราง (ยังไม่รัน SQL) = ไม่ส่ง/ไม่วิเคราะห์อัตโนมัติ (ปิดไว้ก่อน ไม่เดา)
const SYS_MISSING = "ต้องรัน SQL jjmk_social_posts.sql ล่าสุดใน Supabase ก่อน (ตาราง social_sys)";
const sysNoTbl = (e: any) => !!e && (["PGRST205", "42P01"].includes(String(e.code ?? "")) ||
  (/social_sys/.test(String(e.message ?? "")) && /does not exist|could not find/i.test(String(e.message ?? ""))));
type SysRes = { ok: boolean; val?: any; dup?: boolean; missing?: boolean; error?: string };
const sysErr = (e: any): SysRes => (sysNoTbl(e) ? { ok: false, missing: true } : { ok: false, error: scrub(e?.message ?? e).slice(0, 140) });
async function sysGet(id: string): Promise<SysRes> {
  try {
    const { data, error } = await sb.from("social_sys").select("val").eq("id", id).maybeSingle();
    return error ? sysErr(error) : { ok: true, val: data?.val ?? null };
  } catch (e) { return sysErr(e); }
}
async function sysPut(id: string, val: unknown): Promise<SysRes> {
  try {
    const { error } = await sb.from("social_sys").upsert({ id, val, updated_at: new Date().toISOString() });
    return error ? sysErr(error) : { ok: true };
  } catch (e) { return sysErr(e); }
}
// จองงานของวัน: insert ธรรมดา (ไม่ upsert) — ซ้ำ (23505 / 409) = มีคำขออื่นจองไปแล้ว → ไม่ทำซ้ำ · คำขอพร้อมกันกี่ครั้งก็ได้ทำครั้งเดียว
async function sysClaim(id: string, val: unknown): Promise<SysRes> {
  try {
    const { error } = await sb.from("social_sys").insert({ id, val, updated_at: new Date().toISOString() });
    if (!error) return { ok: true };
    if (String(error.code ?? "") === "23505" || /duplicate key/i.test(String(error.message ?? ""))) return { ok: false, dup: true };
    return sysErr(error);
  } catch (e) { return sysErr(e); }
}
// โควต้ารายวัน: จอง <prefix>:<วันไทย>:<n> ทีละช่อง n=1..max (insert ธรรมดา) — ครบทุกช่อง = full · คำขอพร้อมกันได้ช่องคนละช่องเสมอ (ไม่เกิน max)
// ใช้กับงานที่ต้องผ่าน bossCheck (ค่าแฮชใน pnl_users คีย์สาธารณะอ่านได้ — ข้อจำกัดของทั้งระบบ) → จำกัดความเสียหายด้วยสถานะที่คีย์สาธารณะเขียนไม่ได้
async function sysClaimN(prefix: string, max: number, val: unknown): Promise<SysRes & { id?: string; full?: boolean }> {
  const day = thDay();
  for (let n = 1; n <= max; n++) {
    const id = `${prefix}:${day}:${n}`;
    const r = await sysClaim(id, val);
    if (r.ok) return { ok: true, id };
    if (!r.dup) return r;
  }
  return { ok: false, full: true };
}
const NEWS_MANUAL_MAX = 5, CONTENT_AI_MAX = 6, NEWS_MANUAL_DAYS = 7, NEWS_CFG_NOTE_MAX = 3;
const NEWS_MANUAL_FULL = `ส่งเองได้วันละไม่เกิน ${NEWS_MANUAL_MAX} ครั้ง — พรุ่งนี้ส่งได้อีก`;
const NEWS_MANUAL_OLD = `ส่งเข้า LINE ได้เฉพาะสรุป ${NEWS_MANUAL_DAYS} วันล่าสุด`;
const CONTENT_AI_FULL = `สั่งวิเคราะห์ได้วันละไม่เกิน ${CONTENT_AI_MAX} ครั้ง (กันค่าใช้จ่าย) — พรุ่งนี้กดได้อีก`;
// ส่งอัตโนมัติ (cron) เฉพาะ 06:00–07:59 เวลาไทย — summary เรียกได้ด้วยคีย์สาธารณะ ห้ามให้คนอื่นเลือกเวลาส่ง/จองวันไปก่อน (pg_cron = 06:10)
const NEWS_AUTO_H0 = 6, NEWS_AUTO_H1 = 8;
const NEWS_AUTO_OUT = "นอกช่วงเวลาส่งอัตโนมัติ (06:00–08:00)";
const thHour = (t = Date.now()) => new Date(t + 7 * 3600000).getUTCHours();
const thHM = (t = Date.now()) => new Date(t + 7 * 3600000).toISOString().slice(11, 16);

// ---------- 📰 ตั้งค่า/ส่งเข้ากลุ่ม LINE ----------
// การตั้งค่าอยู่ที่ social_sys แถว news_cfg เท่านั้น (คีย์สาธารณะแก้ไม่ได้ — ไม่ต้องลงลายเซ็น) · ปิดส่ง/เปลี่ยนกลุ่ม = มีผลทันที
// เปลี่ยน/ล้างกลุ่ม (เดิมตั้งกลุ่มไว้แล้ว) → แจ้งกลุ่มเดิมสั้น ๆ ว่าใครเปลี่ยน — คนที่ได้ค่าแฮชไปแอบย้ายกลุ่ม กลุ่มหัวหน้าจะรู้ (ส่งไม่ได้ = ยังบันทึกได้)
async function newsCfg(by: string, on: boolean, group: unknown) {
  const g = String(group ?? "").trim();
  if ((g || on) && !NEWS_GROUP_RE.test(g)) return { ok: false, reason: "ไอดีกลุ่ม LINE ไม่ถูกต้อง (ต้องขึ้นต้นด้วย C ตามด้วยตัวอักษร 0-9a-f 32 ตัว) — เลือกจากรายการกลุ่ม" };
  const old = await sysGet("news_cfg");
  if (old.missing) return { ok: false, reason: SYS_MISSING };
  const r = await sysPut("news_cfg", { on: !!on && !!g, group: g || null, by: String(by ?? "").slice(0, 60), at: new Date().toISOString() });
  if (r.missing) return { ok: false, reason: SYS_MISSING };
  if (!r.ok) return { ok: false, reason: "บันทึกการตั้งค่าไม่ได้: " + r.error };
  const gOld = old.ok ? String(old.val?.group ?? "") : "";
  if (!NEWS_GROUP_RE.test(gOld) || gOld === g) return { ok: true };
  // แจ้งกลุ่มเดิมได้วันละ ≤3 ครั้ง (social_sys news_cfg_note:<วัน>:<n>) — สลับกลุ่มไปมาไม่ทำให้บอทส่งข้อความได้ไม่จำกัด · เกิน = บันทึกได้แต่ไม่แจ้ง
  const nc = await sysClaimN("news_cfg_note", NEWS_CFG_NOTE_MAX, { at: new Date().toISOString(), by: String(by ?? "").slice(0, 60) });
  if (!nc.ok) return { ok: true, old_notified: false };
  const who = lineTxt(by, 40) || "ไม่ทราบชื่อ";
  const sent = await linePost(gOld, `🔔 JJ Social: เปลี่ยนกลุ่มที่รับสรุปรายวันแล้ว โดย ${who} (${thHM()}) — ถ้าไม่ได้สั่งเอง แจ้งผู้ดูแลระบบ`)
    .catch((e) => ({ ok: false, reason: scrub(e) }));
  if (!sent.ok) console.error("news cfg notice", sent.reason);
  return { ok: true, old_notified: sent.ok };
}
// ส่งข้อความเข้ากลุ่มผ่าน line-order ของโปรเจกต์นี้เสมอ — ไม่อ่าน sc_config.line_endpoint (คีย์สาธารณะแก้ได้ เคยใช้เปลี่ยนที่ส่งให้ "ส่งสำเร็จ" ทั้งที่ไม่ถึงกลุ่ม)
// คีย์ที่ gateway ของ Supabase รับ: anon (ถ้ามี) → คีย์ของคำขอนี้ → คีย์สาธารณะของแอป · ถูกปัดตก (401/403) ค่อยลองตัวถัดไป · ห้าม log/ส่งคีย์กลับ
const LINE_ORDER_PATH = "/functions/v1/line-order";
async function linePost(group: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const ep = SB_URL + LINE_ORDER_PATH;
  const keys = [...new Set([Deno.env.get("SUPABASE_ANON_KEY") ?? "", reqApiKey, SB_PUBLISHABLE].filter((k) => k && k.length >= 8))];
  let st = 0, body: any = null, err = "";
  for (let i = 0; i < keys.length; i++) {
    try {
      const r = await fetch(ep, { method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", apikey: keys[i], Authorization: `Bearer ${keys[i]}` },
        body: JSON.stringify({ to: group, text }) });
      st = r.status;
      const t = await r.text().catch(() => "");
      try { body = JSON.parse(t); } catch { body = t ? { message: t.slice(0, 200) } : null; }
      err = "";
      if ((st === 401 || st === 403) && i < keys.length - 1) continue;
    } catch (e) { st = 0; err = "เชื่อมต่อ line-order ไม่ได้: " + scrub(e).slice(0, 120); }
    break;
  }
  if (st >= 200 && st < 300 && !(body && typeof body === "object" && body.ok === false)) return { ok: true };
  const why = err || (st === 404 ? "ไม่พบ Edge Function line-order (บอทของระบบนับสต๊อก)"
    : `line-order ตอบ ${st}${body?.error || body?.message ? ": " + String(body.error ?? body.message).slice(0, 160) : ""}`);
  return { ok: false, reason: scrub(why) };
}
// ผลส่งล่าสุด (cron/ปุ่ม) → social_sys news_last (แอปอ่านแถวนี้มาโชว์)
async function newsLast(ok: boolean, d: unknown, err: string | null, how: "cron" | "manual") {
  const r = await sysPut("news_last", { at: new Date().toISOString(), d: String(d ?? "").slice(0, 10), ok, err: err ? scrub(err).slice(0, 300) : null, how });
  if (!r.ok && !r.missing) console.error("news last", r.error);
}
// ส่ง data (ออบเจกต์ในหน่วยความจำจาก makeNews ของคำขอนี้) เข้ากลุ่มใน news_cfg · cfgIn = การตั้งค่าที่อ่านมาแล้ว (cron)
async function newsPush(data: any, how: "cron" | "manual", cfgIn?: any): Promise<{ ok: boolean; reason?: string }> {
  let cfg = cfgIn;
  if (cfg === undefined) {
    const c = await sysGet("news_cfg");
    if (c.missing) return { ok: false, reason: SYS_MISSING };
    if (!c.ok) return { ok: false, reason: "อ่านการตั้งค่าส่ง LINE ไม่ได้: " + c.error };
    cfg = c.val;
  }
  const fail = async (m: string) => { await newsLast(false, data?.d, m, how); return { ok: false, reason: m }; };
  const group = String(cfg?.group ?? "");
  if (!group) return await fail("ยังไม่ได้เลือกกลุ่ม LINE — ตั้งในหน้าตั้งค่า");
  if (!NEWS_GROUP_RE.test(group)) return await fail("ไอดีกลุ่ม LINE ไม่ถูกต้อง — ตั้งใหม่ในหน้าตั้งค่า");
  const names: Record<string, string> = {};
  for (const b of await getBranches().catch(() => [])) if (typeof b?.code === "string") names[b.code] = String(b.name ?? "");
  const res = await linePost(group, newsText(data, names));
  if (res.ok) { await newsLast(true, data?.d, null, how); return { ok: true }; }
  return await fail(res.reason ?? "ส่งไม่สำเร็จ");
}
// cron 06:10: สรุปเมื่อวาน (+สรุป AI ของรอบนี้ในหน่วยความจำ) → ส่งเข้า LINE ถ้าเปิดไว้
// จองวัน (social_sys news_push:<วันที่>) ก่อนส่งเสมอ — summary เรียกได้ด้วยคีย์สาธารณะ ห้ามส่งซ้ำ · จองไม่ได้/ไม่มีตาราง = ไม่ส่ง
// ส่ง/จองเฉพาะ 06:00–07:59 เวลาไทย (นอกช่วง = ยังทำสรุปเก็บไว้ แต่ไม่จองวัน ไม่ส่ง — คนอื่นเรียกตอนเที่ยงคืนเพื่อแย่งจองวันไม่ได้)
async function newsDaily(sum: { digest?: any; date?: string } = {}) {
  const r: any = await makeNews(undefined, sum);
  if (!r.ok) return { ok: false, reason: r.reason };
  const base = { ok: true, d: r.d, rows: r.rows, total: r.data.total };
  const c = await sysGet("news_cfg");
  if (c.missing) return { ...base, push: { ok: false, skipped: true, reason: SYS_MISSING } };
  if (!c.ok) return { ...base, push: { ok: false, skipped: true, reason: "อ่านการตั้งค่าส่ง LINE ไม่ได้: " + c.error } };
  if (c.val?.on !== true) return { ...base, push: null };
  const h = thHour();
  if (h < NEWS_AUTO_H0 || h >= NEWS_AUTO_H1) return { ...base, push: { ok: false, skipped: true, reason: NEWS_AUTO_OUT } };
  const key = "news_push:" + r.d;
  const cl = await sysClaim(key, { at: new Date().toISOString(), ok: null, err: null });
  if (cl.dup) return { ...base, push: { ok: false, skipped: true, reason: "ส่งแล้ววันนี้" } };
  if (!cl.ok) return { ...base, push: { ok: false, skipped: true, reason: cl.missing ? SYS_MISSING : "จองการส่งไม่ได้: " + cl.error } };
  const push = await newsPush(r.data, "cron", c.val);
  await sysPut(key, { at: new Date().toISOString(), ok: push.ok, err: push.ok ? null : scrub(push.reason ?? "").slice(0, 300) });
  return { ...base, push };
}

// ---------- 📈 วิเคราะห์โพสต์/คลิป ----------
const CT_CH = ["tiktok", "facebook", "instagram"];
const CT_DAYS = [30, 90, 0];
const CT_HOURS: [string, number, number][] = [["06-11", 6, 11], ["11-14", 11, 14], ["14-17", 14, 17], ["17-20", 17, 20], ["20-24", 20, 24], ["00-06", 0, 6]];
const CT_DUR: [string, number, number][] = [["≤15 วิ", 0, 15], ["15-30 วิ", 15, 30], ["30-60 วิ", 30, 60], ["60 วิขึ้นไป", 60, 1e9]];
const CT_TY: Record<string, string> = { video: "คลิป/วิดีโอ", photo: "รูปเดี่ยว", carousel: "หลายรูป", text: "ข้อความล้วน" };
const CT_CHN: Record<string, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram" };
const CT_IMG_MAX = 600_000, CT_IMG_TOTAL = 4 * 1024 * 1024;
const CT_GEM_MS = 45000;     // เริ่มเรียก Gemini ได้เมื่อเหลือเวลาถึงกำหนดอย่างน้อยเท่านี้
const CT_NEXT_MS = 60000;    // งานรายสัปดาห์: ช่องทางแรกไม่ผ่านเร็ว ๆ + เหลือเวลาเท่านี้ = ลองช่องทางถัดไป
const median = (a: (number | null | undefined)[]): number | null => {
  const v = a.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const ContentAI = z.object({
  headline: z.string(),
  winners: z.array(z.object({ id: z.string(), why: z.string() })),
  losers: z.array(z.object({ id: z.string(), why: z.string() })),
  patterns: z.array(z.object({ factor: z.string(), finding: z.string(), evidence: z.string() })),
  do_more: z.array(z.string()),
  avoid: z.array(z.string()),
  clip_ideas: z.array(z.object({ title: z.string(), hook: z.string(), why: z.string() })),
  menu_ideas: z.array(z.object({ idea: z.string(), evidence: z.string() })),
  best_time: z.string(),
  caveats: z.string(),
});
type ContentOut = z.infer<typeof ContentAI>;
const GEMINI_SCHEMA_CONTENT = `\n\nตอบเป็น JSON ล้วนตามโครงสร้างนี้เท่านั้น (ห้ามมีข้อความอื่น):
{"headline":"สรุป 1-2 ประโยค","winners":[{"id":"P3","why":"ทำไมโพสต์นี้ได้ยอดดี"}],"losers":[{"id":"P9","why":"ทำไมโพสต์นี้ยอดต่ำ"}],"patterns":[{"factor":"เวลาโพสต์|วันในสัปดาห์|ความยาวคลิป|ปก/ฮุคช่วงแรก|เมนูที่โชว์|แฮชแท็ก|คำบรรยาย|ประเภทโพสต์","finding":"สิ่งที่เจอ","evidence":"ตัวเลข/หลักฐาน"}],"do_more":["..."],"avoid":["..."],"clip_ideas":[{"title":"...","hook":"ประโยค/ภาพเปิด 3 วิแรก","why":"..."}],"menu_ideas":[{"idea":"...","evidence":"คอมเมนต์ที่เป็นหลักฐาน"}],"best_time":"...","caveats":"..."}`;
// ตรวจ/บีบผลของ AI: รหัสโพสต์ต้องเป็น P-id ที่ให้ไปเท่านั้น · จำกัดจำนวน/ความยาว · ไม่มีเนื้อหาเลย = ใช้ไม่ได้
function normContent(j: any, ids: Set<string>): ContentOut | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const s = (x: unknown, n = 400) => (typeof x === "string" || typeof x === "number" ? String(x) : "").replace(/\s+/g, " ").trim().slice(0, n);
  const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);
  const pid = (x: unknown) => { const m = /^#?P0*(\d{1,4})$/i.exec(s(x, 12)); return m ? "P" + m[1] : ""; };
  const used = new Set<string>();
  const pick = (x: unknown) => arr(x).map((o) => ({ id: pid(o?.id), why: s(o?.why ?? o?.reason) }))
    .filter((o) => ids.has(o.id) && !used.has(o.id) && used.add(o.id)).slice(0, 5);
  const winners = pick(j.winners), losers = pick(j.losers);
  const out = {
    headline: s(j.headline, 300), winners, losers,
    patterns: arr(j.patterns).map((o) => ({ factor: s(o?.factor, 60), finding: s(o?.finding), evidence: s(o?.evidence) })).filter((o) => o.finding).slice(0, 8),
    do_more: arr(j.do_more).map((x) => s(x, 300)).filter(Boolean).slice(0, 6),
    avoid: arr(j.avoid).map((x) => s(x, 300)).filter(Boolean).slice(0, 5),
    clip_ideas: arr(j.clip_ideas).map((o) => ({ title: s(o?.title, 120), hook: s(o?.hook, 200), why: s(o?.why, 300) })).filter((o) => o.title).slice(0, 6),
    menu_ideas: arr(j.menu_ideas).map((o) => ({ idea: s(o?.idea, 160), evidence: s(o?.evidence, 300) })).filter((o) => o.idea).slice(0, 5),
    best_time: s(j.best_time, 200), caveats: s(j.caveats, 500),
  };
  const r = ContentAI.safeParse(out);
  if (!r.success || (!r.data.headline && !r.data.winners.length && !r.data.patterns.length)) return null;
  return r.data;
}
type CtPost = ApPost & { id: string; k: string; er: number | null; x: number | null; m: number | null; dt: string; wd: number | null; hr: number | null; mi: number | null;
  cn: number; cpos: number; cneg: number; ctop: string[]; texts: string[] };
type CtBucket = { factor: string; label: string; n: number; med: number | null };
function ctBuckets(ps: CtPost[], mOf: (p: CtPost) => number | null) {
  const grp = (factor: string, keyOf: (p: CtPost) => string | null, order: string[]) => {
    const g = new Map<string, number[]>();
    for (const p of ps) { const k = keyOf(p); const v = mOf(p); if (k == null || v == null) continue; (g.get(k) ?? g.set(k, []).get(k)!).push(v); }
    return order.filter((k) => g.has(k)).map((k) => ({ factor, label: k, n: g.get(k)!.length, med: median(g.get(k)!) })) as CtBucket[];
  };
  const tagN = new Map<string, number>();
  for (const p of ps) for (const t of p.tg ?? []) tagN.set(t, (tagN.get(t) ?? 0) + 1);
  const tags = [...tagN.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => "#" + t);
  return {
    wd: grp("วันในสัปดาห์", (p) => (p.wd == null ? null : "วัน" + TH_WD[p.wd]), TH_WD.map((w) => "วัน" + w)),
    hr: grp("เวลาโพสต์", (p) => (p.hr == null ? null : (CT_HOURS.find(([, a, b]) => p.hr! >= a && p.hr! < b)?.[0] ?? null)), CT_HOURS.map((h) => h[0])),
    du: grp("ความยาวคลิป", (p) => (p.du == null ? null : (CT_DUR.find(([, a, b]) => p.du! > a && p.du! <= b)?.[0] ?? null)), CT_DUR.map((d) => d[0])),
    ty: grp("ประเภทโพสต์", (p) => (p.ty ? CT_TY[p.ty] ?? null : null), Object.values(CT_TY)),
    tag: tags.map((t): CtBucket => {
      const v = ps.filter((p) => (p.tg ?? []).includes(t.slice(1))).map(mOf);
      return { factor: "แฮชแท็ก", label: t, n: v.filter((x) => x != null).length, med: median(v) };
    }).filter((b) => b.n >= 2),
    cap: grp("คำบรรยาย", (p) => (p.t.length <= 40 ? "สั้น ≤40 ตัวอักษร" : p.t.length <= 120 ? "กลาง ≤120" : "ยาว"), ["สั้น ≤40 ตัวอักษร", "กลาง ≤120", "ยาว"]),
  };
}
// กติกาล้วน (ไม่มี AI): โพสต์เด่น/ไม่ปังจาก ×ค่ากลาง + รูปแบบจากกลุ่มที่ต่างจากค่ากลาง ≥30% (กลุ่มละ ≥3 โพสต์)
function ruleContent(ps: CtPost[], B: ReturnType<typeof ctBuckets>, medM: number | null, mName: string): ContentOut {
  const hm = (p: CtPost) => (p.hr == null ? "" : ` ${String(p.hr).padStart(2, "0")}:${String(p.mi ?? 0).padStart(2, "0")}`);
  const desc = (p: CtPost) => [p.wd != null ? `ลงวัน${TH_WD[p.wd]}${hm(p)}` : "", p.du ? `คลิป ${p.du} วิ` : p.ty ? CT_TY[p.ty] ?? "" : "",
    p.x != null ? `${mName} ×${p.x.toFixed(1)} ของค่ากลาง` : "", p.er != null ? `ER ${p.er.toFixed(1)}%` : "", p.cn ? `คอมเมนต์ ${p.cn}` : ""].filter(Boolean).join(" · ");
  const ranked = ps.filter((p) => p.x != null).sort((a, b) => b.x! - a.x!);
  const winners = ranked.filter((p) => p.x! > 1).slice(0, 5);
  const losers = ranked.filter((p) => p.x! < 1 && !winners.includes(p)).reverse().slice(0, 5);
  const pats: { factor: string; finding: string; evidence: string; diff: number; label: string }[] = [];
  if (medM) for (const g of [...B.wd, ...B.hr, ...B.du, ...B.ty, ...B.tag, ...B.cap]) {
    if (g.n < 3 || g.med == null) continue;
    const diff = g.med / medM - 1;
    if (Math.abs(diff) < 0.3) continue;
    pats.push({ factor: g.factor, label: g.label, diff, finding: `${g.label} ได้${mName}${diff > 0 ? "สูง" : "ต่ำ"}กว่าค่ากลาง ${Math.round(Math.abs(diff) * 100)}%`,
      evidence: `ค่ากลาง ${fmtK(g.med)} จาก ${g.n} โพสต์ (ทุกโพสต์ ${fmtK(medM)})` });
  }
  pats.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const goodT = [...B.wd, ...B.hr].filter((g) => g.n >= 3 && g.med != null).sort((a, b) => b.med! - a.med!);
  const bw = goodT.find((g) => g.factor === "วันในสัปดาห์"), bh = goodT.find((g) => g.factor === "เวลาโพสต์");
  return {
    headline: winners[0] ? `โพสต์ที่ดีที่สุดได้${mName} ×${winners[0].x!.toFixed(1)} ของค่ากลาง${pats[0] ? " · " + pats[0].finding : ""}`
      : `วิเคราะห์ ${ps.length} โพสต์ — ยอดใกล้เคียงกัน ยังไม่เห็นโพสต์ที่โดดเด่นชัดเจน`,
    winners: winners.map((p) => ({ id: p.id, why: desc(p) })),
    losers: losers.map((p) => ({ id: p.id, why: desc(p) })),
    patterns: pats.slice(0, 8).map(({ factor, finding, evidence }) => ({ factor, finding, evidence })),
    do_more: pats.filter((p) => p.diff > 0).slice(0, 6).map((p) => `ทำแบบ "${p.label}" (${p.factor}) ให้บ่อยขึ้น — ${p.finding}`),
    avoid: pats.filter((p) => p.diff < 0).slice(0, 5).map((p) => `ลดแบบ "${p.label}" (${p.factor}) — ${p.finding}`),
    clip_ideas: winners.slice(0, 3).map((p) => ({ title: `ทำคลิปแนวเดียวกับ "${newsTxt(p.t, 40) || p.id}"`,
      hook: newsTxt(p.t, 60) || "เปิดด้วยภาพเมนูเด่นบนกระทะในวินาทีแรก", why: `โพสต์ ${p.id} ได้${mName} ×${p.x!.toFixed(1)} ของค่ากลาง` })),
    menu_ideas: [],
    best_time: bw || bh ? [bw?.label, bh ? `ช่วง ${bh.label} น.` : ""].filter(Boolean).join(" ") + " (ค่ากลางสูงสุดจากกลุ่มที่มี ≥3 โพสต์)" : "ข้อมูลยังน้อยเกินจะสรุปช่วงเวลา",
    caveats: "วิเคราะห์ด้วยสถิติล้วน (AI ไม่พร้อมใช้งานตอนนี้) — บอกได้แค่ว่าอะไรมาคู่กับยอดสูง/ต่ำ ยังไม่ได้ดูรูปปก/เนื้อหาคลิป และยังไม่มีไอเดียเมนูใหม่จากคอมเมนต์ (ต้องใช้ AI)",
  };
}
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
// รูปปกที่เก็บใน Storage ของเราเท่านั้น (ไม่ดึงโดเมนอื่น) · ≤600KB ต่อรูป · รวม ≤4MB
async function ctCovers(list: CtPost[]): Promise<{ id: string; mime: string; data: string }[]> {
  const ok = list.filter((p) => typeof p.img === "string" && p.img.startsWith(AP_IMG_PUB) && !/\.\.|%2e/i.test(p.img.slice(AP_IMG_PUB.length)));
  const got = await Promise.all(ok.map(async (p) => {
    try {
      const r = await fetch(p.img!, { redirect: "error", signal: AbortSignal.timeout(6000) });
      const ct = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = /\.(jpe?g|png|webp)(\?|$)/i.exec(p.img!)?.[1]?.toLowerCase();
      const mime = ["image/jpeg", "image/png", "image/webp"].includes(ct) ? ct : ext ? (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg") : "";
      if (!r.ok || !mime || Number(r.headers.get("content-length") ?? 0) > CT_IMG_MAX) { await r.body?.cancel().catch(() => {}); return null; }
      const buf = await apReadCap(r, CT_IMG_MAX);
      return buf?.length ? { id: p.id, mime, data: b64(buf) } : null;
    } catch { return null; }
  }));
  const out: { id: string; mime: string; data: string }[] = [];
  let total = 0;
  for (const g of got) { if (!g || total + g.data.length > CT_IMG_TOTAL) continue; total += g.data.length; out.push(g); }
  return out;
}
async function contentAnalyze(ch: string, daysIn: number, deadline = Date.now() + 90000) {
  if (!CT_CH.includes(ch)) return { ok: false, reason: "ช่องทางต้องเป็น tiktok / facebook / instagram" };
  const days = CT_DAYS.includes(daysIn) ? daysIn : 90;
  if (!(await hasPostsTbl())) return { ok: false, reason: "ต้องรัน SQL jjmk_social_posts.sql ก่อน" };
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  const { data: prow, error } = await selPosts((c) => {
    let q = sb.from("social_posts").select(c).eq("channel", ch);
    if (since) q = q.gte("posted_at", since);
    return q.order("posted_at", { ascending: false, nullsFirst: false }).limit(300);
  });
  if (error) return { ok: false, reason: "อ่านตาราง social_posts ไม่ได้: " + scrub(error.message).slice(0, 120) };
  const base = (prow ?? []).map(rowToPost).filter((p: ApPost) => p.u && (nz(p.vw) > 0 || nz(p.lk) > 0));
  if (base.length < 5) return { ok: false, reason: "มีโพสต์ที่มียอดวิว/ไลก์ไม่ถึง 5 โพสต์ — กด 🚀 ดึงทั้งหมด หรือ 📥 ดึงย้อนหลังก่อน" };
  base.sort((a: ApPost, b: ApPost) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  // ตัววัดหลัก: ยอดวิว (ถ้าโพสต์ส่วนใหญ่มีวิว) ไม่งั้นไลก์ — ×ค่ากลาง = ยอด ÷ ค่ากลางของทุกโพสต์
  const mk: "vw" | "lk" = base.filter((p: ApPost) => nz(p.vw) > 0).length >= base.length / 2 ? "vw" : "lk";
  const mName = mk === "vw" ? "วิว" : "ไลก์";
  const ps: CtPost[] = base.map((p: ApPost, i: number) => {
    const t = Date.parse(p.at ?? "");
    const th = Number.isFinite(t) ? new Date(t + 7 * 3600000) : null;
    const vw = nz(p.vw);
    return { ...p, id: "P" + (i + 1), k: apUrlKey(p.u),
      er: vw > 0 ? Math.round((nz(p.lk) + nz(p.cm) + nz(p.sh) + nz(p.sv)) / vw * 1000) / 10 : null,
      x: null, m: (p as any)[mk] != null && Number.isFinite(Number((p as any)[mk])) ? Number((p as any)[mk]) : null,
      dt: th ? th.toISOString().slice(0, 10) : "", wd: th ? th.getUTCDay() : null, hr: th ? th.getUTCHours() : null, mi: th ? th.getUTCMinutes() : null,
      cn: 0, cpos: 0, cneg: 0, ctop: [], texts: [] };
  });
  const medM = median(ps.map((p) => p.m));
  for (const p of ps) p.x = p.m != null && medM ? Math.round(p.m / medM * 100) / 100 : null;
  // คอมเมนต์ของแต่ละโพสต์ (จับคู่ด้วยลิงก์โพสต์ · Facebook จับด้วยเลขโพสต์หน้าไอดีคอมเมนต์ได้ด้วย)
  const byK = new Map(ps.map((p) => [p.k, p]));
  const byPid = new Map<string, CtPost>();
  for (const p of ps) { const n = p.pid ?? apPidOfUrl(p.u); if (n) byPid.set(n, p); }
  const tops = new Map<CtPost, Map<string, number>>();
  let cmTotal = 0;
  if (Date.now() < deadline - 40000) {
    const cm = await pageAll((a, b) => sb.from("social_mentions").select("sentiment,topics,text,external_id,post_id:raw->>post_id")
      .eq("channel", ch).eq("kind", "comment").order("posted_at", { ascending: false }).range(a, b));
    for (const c of cm.rows) {
      const k = apUrlKey(String(c.post_id ?? c.raw?.post_id ?? ""));
      let p = k ? byK.get(k) : undefined;
      if (!p && ch === "facebook") { const n = /^(\d{5,25})_\d+$/.exec(String(c.external_id ?? ""))?.[1]; if (n) p = byPid.get(n); }
      if (!p) continue;
      cmTotal++; p.cn++;
      if (c.sentiment === "pos") p.cpos++; else if (c.sentiment === "neg") p.cneg++;
      const tm = tops.get(p) ?? tops.set(p, new Map()).get(p)!;
      for (const t of Array.isArray(c.topics) ? c.topics.slice(0, 5) : []) if (typeof t === "string" && t) tm.set(t, (tm.get(t) ?? 0) + 1);
      if (p.texts.length < 30 && typeof c.text === "string" && c.text.trim().length >= 4) p.texts.push(c.text);
    }
  }
  for (const [p, tm] of tops) p.ctop = [...tm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t.slice(0, 30));
  const ranked = ps.filter((p) => p.x != null).sort((a, b) => b.x! - a.x!);
  const top8 = ranked.slice(0, 8), bot8 = ranked.slice(-8).filter((p) => !top8.includes(p));
  const B = ctBuckets(ps, (p) => p.m);
  // ข้อความให้ AI (ตัดเบอร์/อีเมล/ไอดีก่อนส่งทุกครั้ง · ไม่มีชื่อผู้คอมเมนต์)
  const fmtB = (bs: CtBucket[]) => bs.map((g) => `${g.label}: ค่ากลาง ${g.med == null ? "-" : fmtK(g.med)} (n=${g.n}${g.n < 3 ? " ข้อมูลน้อย" : ""})`).join(" · ") || "-";
  const sample = (p: CtPost) => [...new Set(p.texts.map((t) => newsTxt(t, 80)))].sort((a, b) => b.length - a.length).slice(0, 2);
  const line = (p: CtPost) => {
    const hm = p.hr == null ? "" : `${String(p.hr).padStart(2, "0")}:${String(p.mi ?? 0).padStart(2, "0")}`;
    const full = top8.includes(p) || bot8.includes(p);
    const st = [`วิว ${p.vw ?? "-"}`, `ไลก์ ${p.lk ?? "-"}`, `คอมเมนต์ ${p.cm ?? "-"}`, `แชร์ ${p.sh ?? "-"}`, `เซฟ ${p.sv ?? "-"}`,
      p.er != null ? `ER ${p.er}%` : "", p.x != null ? `×ค่ากลาง ${p.x}` : ""].filter(Boolean).join(" ");
    const cmt = p.cn ? ` | คอมเมนต์ในระบบ ${p.cn} (บวก ${Math.round(p.cpos / p.cn * 100)}% ลบ ${Math.round(p.cneg / p.cn * 100)}%${p.ctop.length ? " เรื่อง: " + p.ctop.join(", ") : ""})` : "";
    const smp = full && p.texts.length ? ` | ตัวอย่างคอมเมนต์: ${sample(p).map((t) => `"${t}"`).join(" / ")}` : "";
    return `${p.id} ${p.wd != null ? "วัน" + TH_WD[p.wd] + " " : ""}${p.dt ? p.dt + " " : ""}${hm} | ${p.ty ? CT_TY[p.ty] ?? p.ty : "ไม่ทราบประเภท"}${p.du ? ` ${p.du} วิ` : ""} | ${st}` +
      `${p.tg?.length ? " | " + p.tg.slice(0, 8).map((t) => "#" + t).join(" ") : ""} | คำบรรยาย: "${newsTxt(p.t, full ? 200 : 100)}"${cmt}${smp}`;
  };
  const medians = { vw: median(ps.map((p) => p.vw)), lk: median(ps.map((p) => p.lk)), cm: median(ps.map((p) => p.cm)), sh: median(ps.map((p) => p.sh)),
    er: median(ps.map((p) => p.er)) };
  for (const k of Object.keys(medians) as (keyof typeof medians)[]) if (medians[k] != null) medians[k] = Math.round(medians[k]! * 10) / 10;
  const covers = Date.now() < deadline - 45000 ? await ctCovers([...ranked.slice(0, 6), ...ranked.slice(-6).filter((p) => !ranked.slice(0, 6).includes(p))]) : [];
  const shop = (await sb.from("social_settings").select("val").eq("id", "shop").maybeSingle().then((r: any) => r.data?.val, () => null)) ?? {};
  const system = `คุณคือนักวางกลยุทธ์คอนเทนต์ (content strategist) ของร้านหมูกระทะ "${shop.name ?? "จริงใจหมูกระทะ"}" ในกรุงเทพฯ
หน้าที่: อธิบายว่าทำไมโพสต์/คลิปแต่ละอันของร้านบน ${CT_CHN[ch]} ได้ยอดวิว ไลก์ คอมเมนต์ แชร์ ไม่เท่ากัน แล้วบอกสิ่งที่ทีมร้านควรทำต่อ เพื่อพัฒนาการทำคลิปและเมนู
กติกา:
- ใช้เฉพาะข้อมูลที่ให้ ห้ามแต่งตัวเลขหรือเหตุการณ์เพิ่ม ถ้าข้อมูลน้อยหรือสรุปไม่ได้ให้บอกใน caveats
- คุณดูคลิปไม่ได้ เห็นเฉพาะ คำบรรยาย รูปปก (บางโพสต์) เวลาโพสต์ ความยาวคลิป ประเภทโพสต์ แฮชแท็ก ยอดต่าง ๆ และคอมเมนต์ของลูกค้า
- เรื่องรูปแบบ (วัน/เวลา/ความยาว/ประเภท/แฮชแท็ก/คำบรรยาย) ให้อิงตัวเลขค่ากลางใน "สถิติแยกกลุ่ม" ที่คำนวณไว้แล้วเป็นหลัก กลุ่มที่มีไม่ถึง 3 โพสต์ถือว่าข้อมูลน้อย ห้ามสรุปจากกลุ่มนั้นอย่างเดียว
- ×ค่ากลาง = ${mName}ของโพสต์ ÷ ค่ากลางของทุกโพสต์ (มากกว่า 1 = ดีกว่าปกติ) · ER = (ไลก์+คอมเมนต์+แชร์+เซฟ) ÷ วิว × 100
- winners = โพสต์ที่ดีกว่าปกติชัดเจน (สูงสุด 5) · losers = โพสต์ที่ต่ำกว่าปกติชัดเจน (สูงสุด 5) · ใช้รหัส P ตามที่ให้เท่านั้น
- why / finding / do_more / avoid ต้องเจาะจงและนำไปทำได้จริงสำหรับพนักงานร้าน (เช่น "เปิดคลิปด้วยภาพหมูสามชั้นบนกระทะร้อน 2 วิแรก")
- clip_ideas = ไอเดียคลิปถัดไป (title, hook = ประโยค/ภาพเปิด 3 วิแรก, why) · best_time = วัน/ช่วงเวลาที่ควรโพสต์จากข้อมูล
- menu_ideas = ไอเดียเมนู/โปรใหม่จากสิ่งที่ลูกค้าถามหาหรือชมในคอมเมนต์ (ใส่หลักฐานจากคอมเมนต์ใน evidence · ไม่มีหลักฐาน = รายการว่าง)
- ตอบเป็นภาษาไทยทั้งหมด`;
  const user = maskPII(`ช่องทาง: ${CT_CHN[ch]} · ช่วง: ${days ? days + " วันล่าสุด" : "ทั้งหมด"} · ${ps.length} โพสต์ · ตัววัดหลัก: ${mName}
ค่ากลางทุกโพสต์: วิว ${medians.vw ?? "-"} · ไลก์ ${medians.lk ?? "-"} · คอมเมนต์ ${medians.cm ?? "-"} · แชร์ ${medians.sh ?? "-"} · ER ${medians.er ?? "-"}%

สถิติแยกกลุ่ม (ค่ากลาง${mName}ของแต่ละกลุ่ม · n = จำนวนโพสต์):
- วันในสัปดาห์: ${fmtB(B.wd)}
- ช่วงเวลาโพสต์ (เวลาไทย): ${fmtB(B.hr)}
- ความยาวคลิป: ${fmtB(B.du)}
- ประเภทโพสต์: ${fmtB(B.ty)}
- แฮชแท็กที่ใช้ ≥2 ครั้ง: ${fmtB(B.tag)}
- ความยาวคำบรรยาย: ${fmtB(B.cap)}

รายการโพสต์ (ใหม่ → เก่า):
${ps.map(line).join("\n")}
${covers.length ? `\nแนบรูปปก ${covers.length} รูป (ของโพสต์ที่ยอดสูงสุดและต่ำสุด) ระบุว่าเป็นปกของโพสต์ไหนก่อนแต่ละรูป` : ""}`);
  const ids = new Set(ps.map((p) => p.id));
  let ai: ContentOut | null = null, provider: "claude" | "gemini" | "rule" = "rule";
  if (useClaude() && Date.now() < deadline - 35000) {
    try {
      const content: any[] = [{ type: "text", text: user }];
      for (const c of covers) content.push({ type: "text", text: `ปกของ ${c.id}` }, { type: "image", source: { type: "base64", media_type: c.mime, data: c.data } });
      const res = await anthropic().messages.parse({
        model: CLAUDE_MODEL, max_tokens: 8000,
        output_config: { effort: "medium", format: zodOutputFormat(ContentAI) },
        system, messages: [{ role: "user", content }],
      } as any, { timeout: Math.max(20000, Math.min(60000, deadline - Date.now() - 25000)), maxRetries: 0 });
      if ((res as any).stop_reason !== "refusal") ai = normContent(parsedOf<ContentOut>(res), ids);
      if (ai) { provider = "claude"; noteClaudeOk(); }
    } catch (e) { markClaudeDown(e); }
  }
  // Gemini (รวมรอบลองใหม่แบบข้อความล้วน) เริ่มเฉพาะเมื่อเหลือเวลา ≥45 วิ (แต่ละรุ่นรอได้ถึง 40 วิ) — ไม่พอ = สถิติล้วน
  const gemRoom = () => deadline - Date.now() >= CT_GEM_MS;
  if (!ai && GEMINI_KEY && gemRoom()) {
    const parts = covers.flatMap((c) => [{ text: `ปกของ ${c.id}` }, { inline_data: { mime_type: c.mime, data: c.data } }]);
    let j = await geminiJson(system + GEMINI_SCHEMA_CONTENT, user, 6000, parts.length ? parts : undefined);
    // ส่งพร้อมรูปไม่ผ่าน → ลองแบบข้อความล้วนอีกครั้ง
    if (j == null && parts.length && gemRoom()) j = await geminiJson(system + GEMINI_SCHEMA_CONTENT, user, 6000);
    ai = normContent(j, ids);
    if (ai) provider = "gemini";
  }
  if (!ai) ai = ruleContent(ps, B, medM, mName);
  const refs = new Set([...ai.winners, ...ai.losers].map((w) => w.id));
  const posts: Record<string, unknown> = {};
  for (const p of ps) if (refs.has(p.id)) posts[p.id] = { k: p.k, u: p.u, t: newsTxt(p.t, 160), at: p.at ?? null, vw: p.vw ?? null, lk: p.lk ?? null,
    cm: p.cm ?? null, sh: p.sh ?? null, sv: p.sv ?? null, du: p.du ?? null, ty: p.ty ?? null, img: apImgOk(p.img) };
  const data = { v: 1, ch, days, at: new Date().toISOString(), provider, n: ps.length, medians, posts, ai,
    saw: { covers: covers.length, comments: cmTotal, posts: ps.length } };
  const { error: ue } = await sb.from("social_daily").upsert({ d: thDay(), branch: ch, kind: "content", data, created_at: new Date().toISOString() });
  return { ok: true, data, ...(ue ? { warn: "บันทึกผลไม่ได้: " + scrub(ue.message).slice(0, 140) } : {}) };
}
// cron 06:10: วิเคราะห์ให้เองสัปดาห์ละครั้งต่อช่องทาง — วันละไม่เกิน 1 ช่องทาง (ช่องทางที่วิเคราะห์ล่าสุดนานที่สุด · ข้ามช่องทางที่เพิ่งวิเคราะห์ใน 7 วัน)
// จองวัน (social_sys content_run:<วันนี้>) ก่อนวิเคราะห์ — summary เรียกได้ด้วยคีย์สาธารณะ และแถว social_daily ใครก็ลบได้ → วันละครั้งเสมอ
// (ไม่ดูว่า "วันนี้มีแถว content แล้ว" — social_daily คีย์สาธารณะเพิ่มแถวได้ เคยทำให้ข้ามทุกวัน · ช่องทางที่วิเคราะห์วันนี้แล้วแค่ยังไม่ถึงรอบ)
// ช่องทางที่มีสิทธิ์ = มีโพสต์ที่มียอดวิว/ไลก์ ≥5 ใน 90 วัน (ช่วงเดียวกับที่วิเคราะห์จริง) · ช่องทางแรกไม่ผ่านเร็ว ๆ + เหลือเวลา ≥60 วิ = ลองช่องทางถัดไป
// (ไม่เก็บแถว "ข้าม" ใน social_daily — แอปโชว์แถว content ล่าสุดของช่องทาง แถวข้ามจะบังผลวิเคราะห์จริงอันก่อน)
async function contentWeekly(deadline: number) {
  if (!(await hasPostsTbl())) return { skipped: "no_table" };
  const today = thDay();
  // วิเคราะห์ล่าสุดของแต่ละช่องทาง = การจองใน social_sys ที่วิเคราะห์สำเร็จ (content_run:<วัน> ของ cron · content_ai:<วัน>:<n> ของปุ่ม)
  // ไม่อ่าน social_daily — คีย์สาธารณะแทรกแถว content ปลอมครบ 3 ช่องทางได้ (เคยทำให้งานรายสัปดาห์ "ยังไม่ถึงรอบ" ไปตลอด)
  const latest: Record<string, string> = {};
  for (const pre of ["content_run:", "content_ai:"]) {
    const { data: rows, error } = await sb.from("social_sys").select("id,val").like("id", pre + "%").order("id", { ascending: false }).limit(300);
    if (error) { const e = sysErr(error); return e.missing ? { skipped: "no_sys", reason: SYS_MISSING } : { skipped: "read_error" }; }
    for (const r of rows ?? []) {
      const d = String(r?.id ?? "").slice(pre.length, pre.length + 10), ch = String(r?.val?.ch ?? "");
      if (r?.val?.ok !== true || !CT_CH.includes(ch) || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today) continue;
      if (!latest[ch] || d > latest[ch]) latest[ch] = d;
    }
  }
  const cutoff = thDay(Date.now() - 7 * 86400000);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const cands: { ch: string; l: string }[] = [];
  for (const ch of CT_CH) {
    const l = latest[ch] ?? "";
    if (l && l > cutoff) continue;
    const { count, error: ce } = await sb.from("social_posts").select("id", { count: "exact", head: true }).eq("channel", ch)
      .gte("posted_at", since).or("views.gt.0,likes.gt.0");
    if (ce || nz(count) < 5) continue;
    cands.push({ ch, l });
  }
  if (!cands.length) return { skipped: "none_due" };
  cands.sort((a, b) => a.l.localeCompare(b.l));
  const key = "content_run:" + today;
  const cl = await sysClaim(key, { ch: cands[0].ch, at: new Date().toISOString(), ok: null });
  if (cl.dup) return { skipped: "claimed" };
  if (!cl.ok) return cl.missing ? { skipped: "no_sys", reason: SYS_MISSING } : { skipped: "claim_error", reason: cl.error };
  const tried: { ch: string; ok: boolean; reason?: string }[] = [];
  let res: { ch: string; ok: true; provider: string | null } | null = null;
  for (const c of cands) {
    if (tried.length && deadline - Date.now() < CT_NEXT_MS) break;
    const r: any = await contentAnalyze(c.ch, 90, deadline);
    tried.push({ ch: c.ch, ok: !!r.ok, ...(r.ok ? {} : { reason: String(r.reason ?? "").slice(0, 80) }) });
    if (r.ok) { res = { ch: c.ch, ok: true, provider: r.data?.provider ?? null }; break; }
  }
  const lastT = tried[tried.length - 1];
  await sysPut(key, { ch: lastT.ch, at: new Date().toISOString(), ok: !!res });
  const more = tried.length > 1 ? { tried: tried.map((t) => t.ch + (t.ok ? ":ok" : ":x")) } : {};
  return res ? { ...res, ...more } : { ch: lastT.ch, ok: false, reason: lastT.reason, ...more };
}
// ===== /📰 📈 =====

// ---------- เรียนรู้คำถามที่ลูกค้าถามซ้ำ → เสนอเป็น FAQ ให้คนอนุมัติ ----------
const LearnFaq = z.object({
  items: z.array(z.object({ q: z.string(), a: z.string(), count: z.number() })),
});
async function learnFaq() {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: rows } = await sb.from("social_chat_log")
    .select("channel,thread_id,direction,text,meta,created_at")
    .gte("created_at", since).order("created_at").limit(1500);
  if (!rows?.length) return { ok: false, reason: "ยังไม่มีบทสนทนาให้เรียนรู้" };
  const settings = await getSettings();
  const faq = settings.shop?.faq ?? [];
  // จับคู่ คำถามลูกค้า + คำตอบจริงของร้าน (ถ้ามี)
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r: any = rows[i];
    if (r.direction !== "in") continue;
    const nxt: any = rows.slice(i + 1, i + 5).find((x: any) =>
      x.thread_id === r.thread_id && x.direction === "out" && !x.meta?.draft);
    lines.push(`ถาม: ${String(r.text).slice(0, 150)}${nxt ? `\nตอบ(โดยร้าน): ${String(nxt.text).slice(0, 200)}` : ""}`);
  }
  if (!lines.length) return { ok: false, reason: "ยังไม่มีคำถามจากลูกค้า" };
  const sys = `คุณคือผู้ช่วยจัดคลังคำถามที่พบบ่อย (FAQ) ของร้านอาหาร
วิเคราะห์บทสนทนา แล้วจับกลุ่มคำถามที่ถูกถามซ้ำๆ (ความหมายเดียวกันนับรวมเป็นข้อเดียว) เสนอเป็น FAQ ใหม่ พร้อมร่างคำตอบ
- อิงคำตอบที่ร้านเคยตอบจริงเป็นหลัก ถ้าไม่เคยตอบให้ใส่ a = "(ร้านยังไม่เคยตอบ — เติมคำตอบก่อนใช้)"
- เรียงตามความถี่ count มาก→น้อย เอาเฉพาะที่ถูกถามอย่างน้อย 2 ครั้ง สูงสุด 12 ข้อ
- อย่าเสนอซ้ำกับ FAQ ที่มีอยู่แล้ว: ${faq.map((f: any) => f.q).join(" | ") || "—"}`;
  const userTxt = lines.slice(-400).join("\n---\n");
  let items: { q: string; a: string; count: number }[] | null = null;
  if (useClaude()) {
    try {
      const res = await anthropic().messages.parse({
        model: CLAUDE_MODEL, max_tokens: 4000,
        output_config: { effort: "low", format: zodOutputFormat(LearnFaq) },
        system: sys, messages: [{ role: "user", content: userTxt }],
      });
      const p = parsedOf<z.infer<typeof LearnFaq>>(res);
      if (p) { items = p.items; noteClaudeOk(); }
    } catch (e) { markClaudeDown(e); }
  }
  if (!items && gemAvailable()) {
    const j = await geminiJson(sys + `\n\nตอบเป็น JSON ล้วน: {"items":[{"q":"...","a":"...","count":2}]}`, maskPII(userTxt), 3000);
    if (j?.items && Array.isArray(j.items))
      items = j.items.map((x: any) => ({ q: String(x?.q ?? ""), a: String(x?.a ?? ""), count: Number(x?.count) || 1 })).filter((x: any) => x.q);
  }
  if (!items) return { ok: false, reason: "AI ไม่พร้อมใช้งานตอนนี้ — ลองใหม่ภายหลัง" };
  await sb.from("social_settings").upsert({
    id: "faq_candidates", val: { items, updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  return { ok: true, count: items.length };
}

// ---------- ทดสอบแชทบอทจากหน้าแอป ----------
async function chatTest(history: { role: string; text: string }[]) {
  const settings = await getSettings();
  const bot = settings.bot ?? {}, shop = settings.shop ?? {};
  const faq = (shop.faq ?? []).map((f: any) => `ถาม: ${f.q}\nตอบ: ${f.a}`).join("\n\n");
  const system = `${bot.persona ?? "คุณคือแอดมินร้านอาหาร ตอบสุภาพ"}

ข้อมูลร้าน:
- ชื่อร้าน: ${shop.name ?? ""}
- ${shop.info ?? ""}
- เวลาเปิด-ปิด: ${shop.hours ?? ""}
${faq ? "\nคำถามที่พบบ่อย:\n" + faq : ""}

กติกา:
- ตอบเฉพาะเรื่องของร้านเท่านั้น
- ห้ามแต่งข้อมูลที่ไม่รู้ ถ้าไม่มีในข้อมูลร้านให้บอกว่าเดี๋ยวแอดมินมายืนยัน และตั้ง needs_human = true
- เรื่องร้องเรียนรุนแรง/ขอเงินคืน/คำเหล่านี้: ${(bot.escalate_keywords ?? []).join(", ")} → needs_human = true`;
  const messages: Anthropic.MessageParam[] = history.slice(-12).map((h) => ({
    role: h.role === "user" ? "user" as const : "assistant" as const, content: h.text,
  }));
  while (messages.length && messages[0].role !== "user") messages.shift(); // ข้อความแรกต้องเป็นฝั่งลูกค้า
  if (!messages.length) return { reply: "", needs_human: true, reason: "no-user-message" };
  let out: z.infer<typeof ChatReply> | null = null;
  if (useClaude()) {
    try {
      const res = await anthropic().messages.parse({
        model: CLAUDE_MODEL, max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(ChatReply) },
        system, messages,
      });
      if (res.stop_reason === "refusal") return { reply: "", needs_human: true, reason: "refusal" };
      out = parsedOf<z.infer<typeof ChatReply>>(res);
      if (out) noteClaudeOk();
    } catch (e) { markClaudeDown(e); }
  }
  if (!out && gemAvailable()) {
    const hist = messages.map((m) => `${m.role === "user" ? "ลูกค้า" : "ร้าน"}: ${maskPII(String(m.content))}`).join("\n");
    const j = await geminiJson(system + `\n\nตอบเป็น JSON ล้วน: {"reply":"ข้อความตอบลูกค้า","needs_human":true/false,"reason":"เหตุผลสั้นๆ"}`, hist, 800);
    if (j && typeof j.reply === "string") out = { reply: j.reply, needs_human: !!j.needs_human, reason: String(j.reason ?? "") };
  }
  if (!out) {
    // AI ใช้ไม่ได้ → เทียบ FAQ แบบไม่ใช้ AI (กติกาเดียวกับบอทจริงใน social-webhook)
    out = faqReply(String(messages[messages.length - 1].content), shop.faq ?? [], bot.escalate_keywords ?? []);
  }
  return out ?? { reply: bot.fallback_text ?? "", needs_human: true, reason: "ai-unavailable" };
}

// ---------- ส่งข้อความแชท (แอดมินกดส่งร่าง) ----------
// แปลข้อผิดพลาดจากแพลตฟอร์มเป็นภาษาคน — เดิมขึ้นแค่ "ตรวจ token" ทั้งที่จริงอาจเป็นโควต้าหมด/เกิน 24 ชม.
function lineErr(status: number, txt: string) {
  if (status === 429 || /monthly limit/i.test(txt)) return "โควต้าข้อความ push ของ LINE OA เดือนนี้หมดแล้ว (แพ็กเกจฟรีส่งได้ 300 ข้อความ/เดือน) — ตอบในแอป LINE Official Account แทนได้ หรือเปิดบอทโหมดออโต้/FAQ ซึ่งตอบผ่าน reply ฟรี";
  if (status === 401) return "LINE_CHANNEL_ACCESS_TOKEN ไม่ถูกต้องหรือหมดอายุ — ออก token ใหม่ใน LINE Developers แล้วใส่ใน Supabase secrets";
  if (status === 403) return "LINE ไม่อนุญาตให้ส่ง (แพ็กเกจ/สิทธิ์ของ OA): " + txt.slice(0, 140);
  if (status === 400 && /block|not found|invalid.*to/i.test(txt)) return "ส่งไม่ถึงลูกค้าคนนี้ (อาจบล็อก OA ไปแล้ว): " + txt.slice(0, 120);
  return `LINE ตอบ ${status}: ${txt.slice(0, 160)}`;
}
function fbErr(status: number, txt: string) {
  if (/2018278|outside of allowed window|24.?hour/i.test(txt)) return "เกิน 24 ชม. หลังข้อความล่าสุดของลูกค้า — Facebook ไม่ให้เพจทักไปก่อน (ส่งได้อีกเมื่อลูกค้าทักมาใหม่)";
  if (/"code":\s*190|OAuthException|expired|Session has/i.test(txt)) return "FB_PAGE_TOKEN หมดอายุหรือไม่ถูกต้อง — สร้าง Page token แบบไม่หมดอายุแล้วใส่ใน Supabase secrets ใหม่";
  if (/"code":\s*(10|200)\b/.test(txt)) return "Facebook ยังไม่ให้สิทธิ์ส่งข้อความ (แอป Meta ต้องเป็น Live + ผ่าน App Review สิทธิ์ pages_messaging): " + txt.slice(0, 120);
  return `Facebook ตอบ ${status}: ${txt.slice(0, 160)}`;
}
async function sendChat(channel: string, threadId: string, text: string, by: string) {
  let ok = false, reason = "";
  if (channel === "line") {
    if (!LINE_TOKEN) return { ok: false, reason: "ยังไม่ได้ตั้ง secret LINE_CHANNEL_ACCESS_TOKEN" };
    // ข้อความที่แอดมินส่งจากแอป = push (นับโควต้ารายเดือนของ LINE OA)
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: threadId, messages: [{ type: "text", text }] }),
    });
    ok = r.ok; if (!ok) { const t = await r.text(); console.error("line push", t); reason = lineErr(r.status, t); }
  } else if (channel === "facebook" || channel === "instagram") {
    if (!FB_PAGE_TOKEN) return { ok: false, reason: "ยังไม่ได้ตั้ง secret FB_PAGE_TOKEN" };
    const r = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: threadId }, messaging_type: "RESPONSE", message: { text } }),
    });
    ok = r.ok; if (!ok) { const t = await r.text(); console.error("fb send", t); reason = fbErr(r.status, t); }
  } else return { ok: false, reason: "ช่องทางนี้ยังส่งจากระบบไม่ได้" };
  if (ok) await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "out", author: by, text, meta: { manual: true, push: channel === "line" },
  });
  return { ok, reason: scrub(reason) };
}

// ---------- ตอบกลับรีวิว/คอมเมนต์ ----------
async function sendReply(id: number, text: string, by: string) {
  const { data: m } = await sb.from("social_mentions").select("*").eq("id", id).single();
  if (!m) return { ok: false, reason: "ไม่พบรายการ" };
  let ok = false, reason = "";
  if ((m.channel === "facebook" || m.channel === "instagram") && m.kind === "comment" && !FB_PAGE_TOKEN)
    return { ok: false, reason: "ยังไม่ได้เชื่อม Meta (ไม่มี secret FB_PAGE_TOKEN) จึงตอบจากแอปไม่ได้ — กด ⧉ คัดลอกคำตอบ แล้วกด 🔗 เปิดต้นทางไปตอบในแอป" + (m.channel === "facebook" ? " Facebook" : " Instagram") };
  if (m.channel === "facebook" && m.kind === "comment" && m.external_id) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${m.external_id}/comments?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    ok = r.ok; if (!ok) reason = fbErr(r.status, await r.text());
  } else if (m.channel === "instagram" && m.kind === "comment" && m.external_id) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${m.external_id}/replies?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    ok = r.ok; if (!ok) reason = fbErr(r.status, await r.text());
  } else if (m.channel === "google" && String(m.external_id ?? "").startsWith("gbp_")) {
    // ตอบรีวิว Google ผ่าน Business Profile API
    const at = await gbpAccessToken();
    if (!at.token) return { ok: false, reason: at.reason };
    const locPath = m.raw?.gbp;
    if (!locPath) return { ok: false, reason: "ไม่พบข้อมูลสาขาของรีวิวนี้ — กด 'ซิงค์รีวิวทั้งหมด' อีกครั้งก่อน" };
    const rid = String(m.external_id).slice(4);
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${locPath}/reviews/${rid}/reply`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${at.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comment: text }),
    });
    ok = r.ok; if (!ok) reason = await r.text();
  } else {
    return { ok: false, reason: "ช่องทางนี้ต้องไปตอบที่แพลตฟอร์มโดยตรง (กดคัดลอกคำตอบ แล้วเปิดลิงก์ต้นทาง)" };
  }
  if (ok) await sb.from("social_mentions").update({
    reply_status: "sent", reply_text: text, replied_by: by, replied_at: new Date().toISOString(),
  }).eq("id", id);
  return { ok, reason: scrub(reason) };
}

// state ของ OAuth = "jjgbp.<หมดอายุ>.<สุ่ม>.<ลายเซ็น>" ลงลายเซ็นด้วย service key (คนนอกปลอมไม่ได้)
// ต้องตรงกับ gbpStateOk() ใน social-webhook.ts
async function hmacB64(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function gbpState() {
  const exp = Date.now() + 15 * 60000;
  const nonce = [...crypto.getRandomValues(new Uint8Array(9))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `jjgbp.${exp}.${nonce}.${await hmacB64(SB_SERVICE, "jjgbp." + exp + "." + nonce)}`;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bg(p: Promise<unknown>) {
  // งานหนักทำเบื้องหลัง ตอบกลับทันที — pg_cron/pg_net ไม่ต้องรอ (ค่าเริ่มต้นรอแค่ 2 วิ)
  // @ts-ignore: EdgeRuntime มีเฉพาะบน Supabase Edge Runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p.catch((e) => console.error(e)));
  else p.catch((e) => console.error(e));
}
// บันทึกว่า cron รันล่าสุดเมื่อไหร่ + ผลเป็นอย่างไร (หน้าสถานะใช้บอกว่าตั้ง cron แล้วและยังทำงานอยู่)
async function heartbeat(kind: "cron" | "summary", ok: boolean, note: unknown) {
  try {
    const { data, error } = await sb.from("social_settings").select("val").eq("id", "cron").maybeSingle();
    if (error) throw error;
    const val = { ...(data?.val ?? {}) };
    val[kind + "_at"] = new Date().toISOString();
    val[kind + "_ok"] = ok;
    val[kind + "_note"] = scrub(JSON.stringify(note ?? null)).slice(0, 400);
    // แอปใช้ซ่อนปุ่ม "ตอบในนามเพจ/IG ร้าน" เมื่อยังไม่ได้เชื่อม Meta (บอกแค่มี/ไม่มี — ไม่ใช่ค่าลับ)
    if (kind === "cron") val.can = { fb: !!FB_PAGE_TOKEN };
    await sb.from("social_settings").upsert({ id: "cron", val, updated_at: new Date().toISOString() });
  } catch (e) { console.error("heartbeat", scrub(e)); }
}
async function runCron() {
  const t0 = Date.now();
  let out: any = {};
  try {
    const st = await getSettings();
    // 1) Google Business Profile (ฟรี ได้รีวิวครบ) — ถ้ายังไม่ได้รับอนุมัติ/ยังไม่เชื่อม/ซิงค์พัง
    // 2) ถอยไป Places API แบบประหยัด (ทุก 3 ชม.) ให้อยู่ในโควต้าฟรี · Places กันรีวิวซ้ำกับของ GBP ให้แล้ว
    let g: any = st.channels?.gbp?.rt_enc
      ? await gbpSync(false).catch((e) => ({ ok: false, reason: String(e) }))
      : { ok: false, reason: "ยังไม่ได้เชื่อมบัญชี Google Business" };
    if (!g.ok) {
      const p = await pollGoogle(undefined, 3).catch((e) => ({ ok: false, reason: scrub(e) }));
      g = { gbp: g.reason, places: p };
    } else if (g.failed_branches?.length) {
      // บางโปรไฟล์ดึงไม่ได้ → สาขานั้นใช้ Place ID แทน (ประหยัดโควต้าเหมือนเดิม: ทุก 3 ชม.)
      g.places = await pollGoogle(undefined, 3, false, g.failed_branches).catch((e) => ({ ok: false, reason: scrub(e) }));
    }
    const left = () => 120000 - (Date.now() - t0); // ฟังก์ชันถูกตัดที่ 150 วิ เผื่อไว้
    // 3) Apify (ทุกแอพ) — เก็บผลรอบที่เสร็จ + เริ่มรอบใหม่ที่ถึงเวลา (ไม่รอให้เสร็จ)
    let ap: any = null;
    if (!!APIFY_ENV !== !!st.apify?.env) await apSave((v) => { v.env = !!APIFY_ENV; }).catch(() => null); // แอปรู้ว่าเชื่อมผ่าน secret
    if (Array.isArray(st.channels?.apify_sources) && st.channels.apify_sources.length && (APIFY_ENV || st.apify?.tok_enc) && left() > 50000)
      ap = await apifyTick(false, Math.min(35000, left() - 45000)).catch((e) => ({ ok: false, reason: scrub(e) }));
    const a = await analyzeMentions(undefined, 48, Math.max(10000, left() - 15000));   // วิเคราะห์ทีละ 8 รายการต่อคำขอ → รอบละ ~48
    // ไม่มีของค้างแล้ว + Gemini ยังว่าง → ค่อย ๆ อัพเกรดรายการ "[เบื้องต้น]" เป็นผลวิเคราะห์ AI
    let up: any = null;
    if (!a.deferred && (a.total ?? 0) < 48 && gemAvailable() && gemUsedToday() < UPGRADE_DAILY_CAP && left() > 30000)
      up = await analyzeMentions(undefined, 24, left() - 15000, "upgrade");
    out = { google: g, apify: ap, analyze: a, upgrade: up };
    await heartbeat("cron", true, { google: g.ok ?? g.places?.ok ?? false, apify: ap ? { ok: ap.ok, added: ap.added ?? 0, started: ap.started ?? 0, reason: ap.reason } : null,
      analyzed: a.analyzed, deferred: a.deferred, upgraded: up?.analyzed ?? 0, providers: a.providers });
  } catch (e) {
    out = { error: scrub(e) };
    await heartbeat("cron", false, scrub(e));
  }
  await flushAiHealth();
  return out;
}
// cron=true (pg_cron 06:10 — เรียกด้วยคีย์สาธารณะ แยกจากคนอื่นไม่ได้ จึงไม่รับวันที่/ช่วงจากคำขอ: สรุป "เมื่อวาน" เสมอ):
//   สรุป AI (เลย t0+60 วิ = สาขาที่เหลือใช้สรุปแบบกติกา) → 📰 สรุปเมื่อวาน + ส่ง LINE (จองวันก่อนส่ง) → heartbeat
//   → เรียนรู้ FAQ (ถ้าเหลือเวลา >30 วิ) → 📈 วิเคราะห์คลิปรายสัปดาห์ (จองวัน · ถึง t0+115 วิ) → heartbeat
// กดสรุปจากแอป (wait:true) = สรุป AI + เรียนรู้ FAQ เหมือนเดิม (ไม่ส่ง LINE · ไม่เสียเวลา/เงินกับงานวิเคราะห์คลิป)
const CRON_SUM_MS = 60000, CRON_END_MS = 115000;
async function runSummary(date?: string, span: "daily" | "weekly" = "daily", cron = false) {
  const t0 = Date.now();
  if (cron) { date = undefined; span = "daily"; }
  let out: any, ok = true, sum: { digest?: any; date?: string } = {};
  try {
    const r: any = await makeSummary(date, span, cron ? { deadline: t0 + CRON_SUM_MS } : {});
    const { digest, ...rest } = r ?? {};
    out = rest;
    if (r?.ok && digest) sum = { digest, date: r.date };
  } catch (e) { out = { ok: false, reason: scrub(e) }; ok = false; }
  if (!cron) {
    const f = await learnFaq().catch((e) => ({ ok: false, reason: scrub(e) })); // อัพเดตคลังคำถามซ้ำไปพร้อมสรุปรายวัน
    await heartbeat("summary", ok, ok ? { summary: out, faq: f } : { error: out.reason });
    await flushAiHealth();
    return out;
  }
  const END = t0 + CRON_END_MS, left = () => END - Date.now();
  let content: any = null, f: any;
  const news: any = await newsDaily(sum).catch((e) => ({ ok: false, reason: scrub(e) }));
  const nb = { ok: news.ok, rows: news.rows, total: news.total,
    push: news.push ? (news.push.ok ? "ok" : String(news.push.reason ?? "").slice(0, 100)) : null,
    reason: news.reason ? String(news.reason).slice(0, 80) : undefined };
  const beat = () => heartbeat("summary", ok, ok ? { news: nb, content: content ?? undefined, summary: out, faq: f }
    : { error: out.reason, news: nb, content: content ?? undefined });
  // จด heartbeat ก่อนงาน AI ที่ไม่เกี่ยวกับสรุป (ถ้าฟังก์ชันถูกตัดกลางทาง หน้าสถานะยังรู้ว่าสรุป/ส่ง LINE ทำแล้ว)
  await beat();
  f = left() > 30000 ? await learnFaq().catch((e) => ({ ok: false, reason: scrub(e) })) : { skipped: "time" };
  // เหลือเวลาไม่ถึง 50 วิ = ข้ามวันนี้ (ยังไม่จองวัน — พรุ่งนี้ลองใหม่) · ฟังก์ชันถูกตัดที่ 150 วิ
  content = left() < 50000 ? { skipped: "time" } : await contentWeekly(END).catch((e) => ({ ok: false, reason: scrub(e) }));
  await beat();
  await flushAiHealth();
  return { ...out, news: nb, content };
}
// ตรวจโควต้า LINE (ฟรี ไม่นับข้อความ) — บอกว่าเดือนนี้ใช้ push ไปเท่าไหร่แล้ว
async function lineStatus() {
  if (!LINE_TOKEN) return null;
  try {
    const H = { Authorization: `Bearer ${LINE_TOKEN}` };
    const [q, c] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", { headers: H, signal: AbortSignal.timeout(8000) }),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers: H, signal: AbortSignal.timeout(8000) }),
    ]);
    if (!q.ok) return { ok: false, error: scrub(lineErr(q.status, await q.text())) };
    const qd = await q.json(), cd = c.ok ? await c.json() : {};
    return { ok: true, type: qd.type ?? null, limit: qd.value ?? null, used: cd.totalUsage ?? null };
  } catch (e) { return { ok: false, error: "เชื่อมต่อ LINE ไม่ได้: " + scrub(e).slice(0, 100) }; }
}
// ตรวจ Page token ของ Facebook ว่ายังใช้ได้ (ไม่ส่งค่า token ออกไป)
async function fbStatus() {
  if (!FB_PAGE_TOKEN) return null;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${FB_PAGE_TOKEN}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: scrub(fbErr(r.status, JSON.stringify(d))) };
    return { ok: true, page: d.name ?? null };
  } catch (e) { return { ok: false, error: "เชื่อมต่อ Facebook ไม่ได้: " + scrub(e).slice(0, 100) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("jjmk social-brain ok v" + VERSION, { headers: CORS });
  try {
    reqApiKey = req.headers.get("apikey") ?? "";   // ใช้เรียก line-order ผ่าน gateway (เฉพาะในหน่วยความจำ)
    const b = await req.json();
    // อ่านโหมด AI (ฟรี/คุณภาพสูงสุด) + สถานะโควต้า AI ล่าสุดก่อนทุกครั้ง
    const m0 = await getSettings().catch(() => null);
    if (m0) absorbAiHealth(m0.ai_health);
    let out: unknown;
    switch (b.action) {
      case "analyze":     out = await analyzeMentions(b.ids, Math.min(b.limit ?? 8, 20), 95000); break;
      case "upgrade_rules": out = await analyzeMentions(undefined, Math.min(b.limit ?? 8, 20), 95000, "upgrade"); break;
      case "reset_ai_failed": {   // ให้ AI ลองรายการที่เคยอ่านไม่ผ่านอีกครั้ง
        const TAG = "[เบื้องต้น·AI ไม่ผ่าน]";
        const { data } = await sb.from("social_mentions").select("id,ai_summary").like("ai_summary", TAG + "%").limit(500);
        let n = 0;
        for (const r of data ?? []) {
          const { error } = await sb.from("social_mentions").update({ ai_summary: "[เบื้องต้น]" + String(r.ai_summary).slice(TAG.length) }).eq("id", r.id);
          if (!error) n++;
        }
        out = { ok: true, reset: n };
        break;
      }
      case "summary": {
        // cron เรียกแบบไม่ส่ง wait → ทำเบื้องหลังแล้วตอบทันที (+ 📰 สรุปมีอะไรใหม่ + 📈 วิเคราะห์คลิปรายสัปดาห์) · กดจากแอป (wait:true) → รอผล
        // ทางไม่รอผล = ทางของ cron ใช้คีย์สาธารณะเรียกได้ → ไม่รับ date/span จากคำขอ (สรุปเมื่อวานเสมอ) · ส่ง LINE/วิเคราะห์คลิปจองวันก่อนทำ
        if (b.wait) out = await runSummary(b.date, b.span ?? "daily");
        else { bg(runSummary(undefined, "daily", true)); out = { ok: true, queued: true }; }
        break;
      }
      case "news": {   // 📰 สรุปมีอะไรใหม่ของวัน (date ไม่ส่ง = เมื่อวาน · "today" = วันนี้ถึงตอนนี้) · send = ส่งเข้ากลุ่ม LINE ตอนนี้ (ผู้ดูแล/เจ้าของ)
        const send = b.send === true;
        const dIn = typeof b.date === "string" && b.date ? b.date : undefined;
        // ส่งจากปุ่ม: ผู้ดูแล/เจ้าของ → เฉพาะสรุป 7 วันล่าสุด → อ่านกลุ่ม (ยังไม่ได้ตั้ง = ไม่เสียโควต้า) → จองโควต้าวันละ 5 ครั้ง (social_sys news_manual:<วันนี้>:<n>)
        // ค่าแฮชใน pnl_users คีย์สาธารณะอ่านได้ (ข้อจำกัดของทั้งระบบ) → จำกัดความเสียหายด้วยสถานะที่คีย์สาธารณะเขียนไม่ได้ · ส่งไม่สำเร็จก็นับโควต้า
        let cfg: any = undefined, pre: { ok: false; reason: string } | null = null, claimId = "";
        if (send) {
          const bc = await bossCheck(b.u, b.h);
          if (bc) { out = { ok: false, reason: "ส่งเข้า LINE ได้เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
          const today = thDay(), dd = dIn === "today" ? today : dIn ?? thDay(Date.now() - 86400000);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dd) || !Number.isFinite(thStart(dd))) { out = { ok: false, reason: "วันที่ไม่ถูกต้อง" }; break; }
          if (dd > today || dd < thDay(Date.now() - NEWS_MANUAL_DAYS * 86400000)) { out = { ok: false, reason: NEWS_MANUAL_OLD }; break; }
          const c = await sysGet("news_cfg");
          if (c.missing) pre = { ok: false, reason: SYS_MISSING };
          else if (!c.ok) pre = { ok: false, reason: "อ่านการตั้งค่าส่ง LINE ไม่ได้: " + c.error };
          else {
            cfg = c.val ?? null;
            if (NEWS_GROUP_RE.test(String(cfg?.group ?? ""))) {
              const cl = await sysClaimN("news_manual", NEWS_MANUAL_MAX, { at: new Date().toISOString(), by: String(b.u ?? "").slice(0, 60), d: dd, ok: null });
              if (cl.full) { out = { ok: false, reason: NEWS_MANUAL_FULL }; break; }
              if (!cl.ok) pre = { ok: false, reason: cl.missing ? SYS_MISSING : "จองการส่งไม่ได้: " + cl.error };
              else claimId = cl.id!;
            }
          }
        }
        const job = (async () => {
          const r: any = await makeNews(dIn);
          // ปุ่มทดสอบ: ส่งแม้ยังไม่ได้เปิดส่งอัตโนมัติ (กลุ่มจาก social_sys news_cfg) · สรุป AI ที่อ่านจากตารางไม่ใส่ในข้อความ LINE
          if (r.ok && send) {
            r.push = pre ?? await newsPush(r.data, "manual", cfg);
            if (claimId) await sysPut(claimId, { at: new Date().toISOString(), by: String(b.u ?? "").slice(0, 60), d: r.d, ok: r.push.ok,
              err: r.push.ok ? null : scrub(r.push.reason ?? "").slice(0, 200) });
          }
          return r;
        })();
        if (b.wait === false) { bg(job); out = { ok: true, queued: true }; } else out = await job;
        break;
      }
      case "news_cfg": {   // ตั้งกลุ่ม LINE ที่จะส่งสรุปทุกเช้า (ผู้ดูแล/เจ้าของ) — เก็บที่ social_sys (คีย์สาธารณะแก้ไม่ได้)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "ตั้งการส่งเข้า LINE ได้เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        out = await newsCfg(String(b.u ?? ""), b.on === true, b.group);
        break;
      }
      case "content_ai": {   // 📈 ให้ AI วิเคราะห์ว่าทำไมแต่ละโพสต์/คลิปได้ยอดต่างกัน (โหมดคุณภาพสูงสุดใช้ Claude มีค่าใช้จ่าย → ผู้ดูแล/เจ้าของ)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "สั่งวิเคราะห์ได้เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        const ch = String(b.ch ?? "");
        if (!CT_CH.includes(ch)) { out = { ok: false, reason: "ช่องทางต้องเป็น tiktok / facebook / instagram" }; break; }
        // โควต้าวันละ 6 ครั้ง (social_sys content_ai:<วันนี้>:<n> — คีย์สาธารณะเขียนไม่ได้) กันค่าใช้จ่าย Claude · งานรายสัปดาห์ของ cron (content_run) ไม่นับ
        const cl = await sysClaimN("content_ai", CONTENT_AI_MAX, { at: new Date().toISOString(), by: String(b.u ?? "").slice(0, 60), ch });
        if (cl.full) { out = { ok: false, reason: CONTENT_AI_FULL }; break; }
        if (!cl.ok) { out = { ok: false, reason: cl.missing ? SYS_MISSING : "จองโควต้าวิเคราะห์ไม่ได้: " + cl.error }; break; }
        const days = Number(b.days);
        out = await contentAnalyze(ch, CT_DAYS.includes(days) ? days : 90, Date.now() + 95000);
        if (cl.id) await sysPut(cl.id, { at: new Date().toISOString(), by: String(b.u ?? "").slice(0, 60), ch, ok: (out as any)?.ok === true });   // งานรายสัปดาห์ดูว่าช่องทางนี้เพิ่งวิเคราะห์
        break;
      }
      case "apify_restat": {   // 🔄 อัปเดตยอดทุกโพสต์ (อ่านรายการโพสต์ทั้งหมดใหม่ · มีค่าใช้จ่าย Apify → ผู้ดูแล/เจ้าของ)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, started: 0, reason: "เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        out = await apifyRestat();
        break;
      }
      case "learn_faq":   out = await learnFaq(); break;
      case "poll_google": {
        // กดจากแอป: ดึงได้ทุก 10 นาที (กันคนยิงซ้ำด้วยคีย์สาธารณะจนเกินโควต้าฟรีของ Google)
        const g: any = await pollGoogle(b.places, 10 / 60, true);
        if (g.added) g.analyze = await analyzeMentions(undefined, 8, 45000); // วิเคราะห์ต่อทันทีบางส่วน ที่เหลือ cron ทำต่อ
        out = g;
        break;
      }
      case "chat_test":   out = await chatTest(b.history ?? []); break;
      case "send_chat":   out = await sendChat(b.channel, b.thread_id, b.text, b.by ?? "admin"); break;
      case "send_reply":  out = await sendReply(b.id, b.text, b.by ?? "admin"); break;
      case "gbp_auth_url": {
        if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET) {
          out = { ok: false, reason: "ต้องตั้ง secrets GBP_CLIENT_ID และ GBP_CLIENT_SECRET ก่อน (ดูขั้นตอนใน README-SOCIAL.md)" };
          break;
        }
        // เฉพาะผู้ดูแล (admin/owner) — ตรวจบัญชีกับ pnl_users ฝั่งเซิร์ฟเวอร์ แล้วออก state แบบลงลายเซ็น อายุ 15 นาที
        // (ปลายทางใน social-webhook ตรวจลายเซ็นก่อนรับ token — กันคนอื่นเอาบัญชี Google ของตัวเองมาเชื่อมแทนร้าน)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "เชื่อมบัญชี Google ได้เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        out = { ok: true, url: "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
          client_id: GBP_CLIENT_ID,
          redirect_uri: `${SB_URL}/functions/v1/social-webhook`,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/business.manage",
          access_type: "offline", prompt: "consent", state: await gbpState(),
        }).toString() };
        break;
      }
      case "gbp_sync": out = await gbpSync(!!b.full, !!b.resume); break;
      case "apify_connect": {   // วาง API token ของ Apify (เฉพาะผู้ดูแล/เจ้าของ) → ตรวจกับ Apify แล้วเก็บแบบเข้ารหัส
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "เชื่อม Apify ได้เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        out = await apifyConnect(b.token);
        break;
      }
      case "apify_more": {   // ดึงโพสต์/คลิปย้อนหลัง หรือคอมเมนต์ของโพสต์เดียว/หลายโพสต์ (มีค่าใช้จ่าย → เฉพาะผู้ดูแล/เจ้าของ)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        out = await apifyMore(String(b.id ?? "").slice(0, 40), Number(b.n) || 0, typeof b.url === "string" ? b.url : "",
          Array.isArray(b.urls) ? b.urls : []);
        break;
      }
      case "apify_full": {   // 🚀 เริ่ม/หยุด ดึงย้อนหลังทั้งหมด + คอมเมนต์ (มีค่าใช้จ่าย → เฉพาะผู้ดูแล/เจ้าของ)
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        const fr: any = await apifyFull(b.on === true, String(b.u ?? ""));
        if (fr.ok && b.on === true) {   // เริ่มขั้นแรกให้เลย ไม่ต้องรอ cron
          const r: any = await apifyTick(false, 45000, true).catch((e) => ({ ok: false, reason: scrub(e) }));
          Object.assign(fr, { started: r.started ?? 0, reason: r.ok === false ? r.reason : undefined });
        }
        out = fr;
        break;
      }
      case "apify_disconnect": {
        const bc = await bossCheck(b.u, b.h);
        if (bc) { out = { ok: false, reason: "เฉพาะผู้ดูแลระบบ/เจ้าของ — " + bc }; break; }
        const tok = await apToken().catch(() => "");
        const cur = await sb.from("social_settings").select("val").eq("id", "apify").maybeSingle();
        for (const r of Object.values(cur.data?.val?.runs ?? {}) as any[]) // หยุดรอบที่ค้างอยู่ก่อน ไม่งั้นเครดิตยังเดินต่อ
          if (tok && r?.id) await apCall(tok, `/actor-runs/${encodeURIComponent(r.id)}/abort`, { method: "POST" }).catch(() => null);
        await apSave((v) => { delete v.tok_enc; delete v.user; delete v.runs; delete v.usage; delete v.lock; });
        apTok = "";
        out = { ok: true, env: !!APIFY_ENV };
        break;
      }
      case "apify_run": {
        // start=false = เก็บผลรอบที่เสร็จแล้วอย่างเดียว (ไม่มีค่าใช้จ่ายเพิ่ม) · เริ่มรอบใหม่ทันทีได้เฉพาะผู้ดูแล/เจ้าของ
        const startNow = b.start !== false;
        const bc = startNow ? await bossCheck(b.u, b.h) : "";
        if (bc) { out = { ok: false, reason: "สั่งดึงทันทีได้เฉพาะผู้ดูแลระบบ/เจ้าของ (ระบบดึงให้เองตามรอบอยู่แล้ว) — " + bc }; break; }
        const r: any = await apifyTick(startNow, 60000, startNow, typeof b.only === "string" ? b.only : undefined);
        if (r.added) r.analyze = await analyzeMentions(undefined, 8, 30000);
        out = r;
        break;
      }
      case "status": {   // หน้า "สถานะระบบ" ในแอป — บอกแค่ว่าตั้งค่าแล้วหรือยัง/ใช้งานได้ไหม ไม่ส่งค่าลับออกไป
        const st = m0 ?? await getSettings();
        const ch = st.channels ?? {};
        // ยังไม่เคยเรียก Gemini ใน 6 ชม. → ลองยิงสั้น ๆ 1 ครั้ง ให้รู้ว่าคีย์/รุ่นใช้ได้จริง
        // กดตรวจใหม่หลังแก้คีย์/เปิด API → ลองใหม่ทันที ไม่ต้องรอ 1 ชม.
        if (GEMINI_KEY && gemWhy() === "key") gemClearKeyDown();
        const gl = AIH.gemini.last;
        if (GEMINI_KEY && gemAvailable() && (!gl || [400, 403].includes(Number(gl.status)) || Date.now() - Date.parse(gl.at) > 6 * 3600000))
          await geminiJson("ตอบเป็น JSON เท่านั้น", 'ตอบกลับ {"ok":true}', 50);
        const [cnt, lastA, rulesN, line, fb, failN] = await Promise.all([
          sb.from("social_mentions").select("id", { count: "exact", head: true }).is("analyzed_at", null),
          sb.from("social_mentions").select("analyzed_at").not("analyzed_at", "is", null).order("analyzed_at", { ascending: false }).limit(1),
          sb.from("social_mentions").select("id", { count: "exact", head: true }).like("ai_summary", "[เบื้องต้น]%"),
          lineStatus(), fbStatus(),
          sb.from("social_mentions").select("id", { count: "exact", head: true }).like("ai_summary", "[เบื้องต้น·AI ไม่ผ่าน]%"),
        ]);
        const g = gemState();
        out = {
          ok: true, version: VERSION, ai_mode: AI_MODE,
          secrets: {
            anthropic: !!CLAUDE_KEY, gemini: !!GEMINI_KEY,
            google_places: !!GOOGLE_KEY, gbp_oauth: !!(GBP_CLIENT_ID && GBP_CLIENT_SECRET),
            line_token: !!LINE_TOKEN, fb_page_token: !!FB_PAGE_TOKEN, apify: !!APIFY_ENV,
          },
          claude_paused_min: claudeDownUntil > Date.now() ? Math.ceil((claudeDownUntil - Date.now()) / 60000) : 0,
          claude: { model: CLAUDE_MODEL, error: AIH.claude.error ? scrub(AIH.claude.error) : null, error_at: AIH.claude.error ? AIH.claude.at : null, ok_at: AIH.claude.ok_at ?? null },
          gemini: {
            models: GEMINI_MODELS, used_today: gemUsedToday(), day: g.day,
            down: Object.fromEntries(Object.entries(g.down ?? {}).map(([k, u]) => [k, new Date(Number(u)).toISOString()])),
            available: gemAvailable(), why: gemWhy(), down_why: g.why ?? {},
            last: g.last ? { ...g.last, status: Number(g.last.status) || 0, error: scrub(g.last.error) } : null, ok_at: g.ok_at ?? null,
          },
          google: {
            gbp_connected: !!ch.gbp?.rt_enc, gbp_last_sync: ch.gbp?.last_sync ?? null,
            gbp_last_error: ch.gbp?.last_error ? scrub(ch.gbp.last_error) : null, gbp_last_error_at: ch.gbp?.last_error_at ?? null,
            gbp_reconnect: /invalid_grant/.test(String(ch.gbp?.last_error ?? "")),
            places: Array.isArray(ch.google_places) ? ch.google_places.length : 0, places_last_poll: ch.google_last_poll ?? null,
            gbp_full_pending: !!ch.gbp?.full_progress, gbp_unmapped: Array.isArray(ch.gbp?.unmapped) ? ch.gbp.unmapped.length : 0,
            gbp_history_gaps: Object.values(ch.gbp?.history_gaps ?? {}).map((g: any) => String(g?.title ?? "").slice(0, 80)),
            // สาขาที่โปรไฟล์ GBP ดึงไม่ได้ + มี Place ID สำรองไหม
            gbp_failed_branches: [...new Set(Object.keys(ch.gbp?.loc_errors ?? {})
              .map((id) => (ch.gbp?.locations ?? []).find((l: any) => l.id === id)?.branch)
              .filter((b: any) => b && b !== "skip"))].map((b: any) => ({ branch: String(b).slice(0, 12),
                place: Array.isArray(ch.google_places) && ch.google_places.some((p: any) => p?.branch === b) })),
            places_last_result: ch.google_last_result ? { ...ch.google_last_result,
              diag: (ch.google_last_result.diag ?? []).map((d: any) => ({ ...d, http: Number(d.http) || 0, newest_api: Number(d.newest_api) || 0 })) } : null,
            gbp_loc_errors: ch.gbp?.loc_errors ?? null,
          },
          apify: (() => {
            const ap = st.apify ?? {}; const srcs = apSources(ch.apify_sources);
            const errs = srcs.filter((s) => s.on && ap.last?.[s.id]?.ok === false).length;
            const u = ap.usage ?? null;
            return { connected: !!(APIFY_ENV || ap.tok_enc), env: !!APIFY_ENV, user: ap.user?.name ? String(ap.user.name).slice(0, 60) : null,
              sources: srcs.length, on: srcs.filter((s) => s.on).length, errors: errs, tick_at: ap.tick_at ?? null,
              usage: u ? { used: Number(u.used) || 0, limit: Number(u.limit) || 0, budget: Math.min(AP_BUDGET, (Number(u.limit) || 5) * 0.95), end: u.end ?? null, at: u.at ?? null } : null,
              usage_err: ap.usage_err ? scrub(ap.usage_err).slice(0, 160) : null, budget: AP_BUDGET };
          })(),
          cron: st.cron ?? null,
          // 📰 ส่งสรุปเข้า LINE (อ่านจาก social_sys): บอกแค่เปิดไหม/ตั้งกลุ่มแล้วไหม + ผลส่งล่าสุด (ไม่ส่งไอดีกลุ่มออกไป) · ยังไม่มีตาราง = sys_missing
          news: await (async () => {
            const [c, l] = await Promise.all([sysGet("news_cfg"), sysGet("news_last")]);
            if (c.missing) return { on: false, group_set: false, last: null, sys_missing: true };
            const la = l.ok ? l.val : null;
            const last = la && typeof la === "object" ? { at: typeof la.at === "string" ? la.at.slice(0, 40) : null, ok: la.ok === true,
              d: typeof la.d === "string" ? la.d.slice(0, 10) : null, err: la.err ? scrub(la.err).slice(0, 300) : null, how: la.how === "cron" ? "cron" : "manual" } : null;
            // อ่านการตั้งค่าไม่ได้ (ไม่ใช่เพราะไม่มีตาราง) — บอกข้อผิดพลาด ไม่แกล้งตอบว่า "ปิดอยู่"
            if (!c.ok) return { on: false, group_set: false, last, err: scrub(c.error ?? "อ่านการตั้งค่าไม่ได้").slice(0, 160) };
            const g = NEWS_GROUP_RE.test(String(c.val?.group ?? ""));
            return { on: g && c.val?.on === true, group_set: g, last };
          })(),
          line, facebook: fb,
          pending_analysis: cnt.count ?? 0, rules_only: rulesN.count ?? 0, ai_failed: failN.count ?? 0,
          last_analyzed: lastA.data?.[0]?.analyzed_at ?? null,
        };
        break;
      }
      case "cron": {
        if (b.wait) out = await runCron();
        else { bg(runCron()); out = { ok: true, queued: true }; }
        break;
      }
      default: return json({ error: "unknown action" }, 400);
    }
    await flushAiHealth();
    return json(out);
  } catch (e) {
    console.error(e);
    await flushAiHealth();
    return json({ error: scrub(e) }, 500);
  }
});
function json(x: unknown, status = 200) {
  return new Response(JSON.stringify(x), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
