// ============================================================
// JJ Social — social-brain
// วิเคราะห์เสียงลูกค้าด้วย Claude API + สรุปรายวัน + ดึงรีวิว Google + ส่งคำตอบ
// deploy: supabase functions deploy social-brain
// เรียกด้วย POST body: {action: analyze|summary|poll_google|chat_test|send_chat|send_reply|cron, ...}
// ============================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_TOKEN") ?? "";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const sb = createClient(SB_URL, SB_SERVICE);
const anthropic = new Anthropic();

// ===== ระบบ AI 3 ชั้น: Claude (ถ้ามีเครดิต) → Gemini (โควต้าฟรี) → กติกาเบื้องต้น (ฟรีเสมอ) =====
let claudeDownUntil = 0; // เจอปัญหาเครดิต/คีย์ → พัก Claude 10 นาที ไม่ยิงซ้ำทุกรายการ
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geminiJson(system: string, user: string, maxTokens = 2500): Promise<any | null> {
  if (!GEMINI_KEY) return null;
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens, temperature: 0.4 },
          }),
        });
        if (r.status === 429) { await sleep(16000); continue; } // ชนโควต้าต่อนาที → พักแล้วลองอีกครั้ง
        if (!r.ok) { console.error("gemini", model, r.status, (await r.text()).slice(0, 180)); break; }
        const d = await r.json();
        const t = (d.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
        try { return JSON.parse(t); } catch { break; }
      } catch (e) { console.error("gemini", e); break; }
    }
  }
  return null;
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
function markClaudeDown(e: unknown) {
  const msg = String((e as any)?.message ?? e);
  if (/credit|billing|api.?key|authentication|401|invalid_request_error/i.test(msg)) claudeDownUntil = Date.now() + 10 * 60000;
  console.error("claude", msg.slice(0, 160));
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
async function analyzeMentions(ids?: number[], limit = 8) {
  let q = sb.from("social_mentions")
    .select("id,channel,kind,branch,author_name,text,rating,posted_at")
    .is("analyzed_at", null).order("id", { ascending: true }).limit(limit);
  if (ids?.length) q = sb.from("social_mentions")
    .select("id,channel,kind,branch,author_name,text,rating,posted_at").in("id", ids);
  const { data: rows, error } = await q;
  if (error) throw error;
  if (!rows?.length) return { analyzed: 0 };

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

  let n = 0;
  const errs: string[] = [];
  const prov = { claude: 0, gemini: 0, rules: 0 };
  const branchCodes = branches.map((b) => b.code);
  for (const r of rows) {
    const user = `ช่องทาง: ${r.channel} (${r.kind})${r.rating != null ? ` · ให้ดาว ${r.rating}/5` : ""}${r.branch ? ` · สาขาที่ระบบระบุ: ${r.branch}` : ""}
โพสต์เมื่อ: ${r.posted_at}
ผู้เขียน: ${r.author_name ?? "ไม่ระบุ"}
ข้อความ:
"""${(r.text ?? "").slice(0, 4000)}"""`;
    // ชั้น 1: Claude (ข้ามถ้าเพิ่งเจอปัญหาเครดิต/คีย์)
    let a: z.infer<typeof Analysis> | null = null;
    let used: "claude" | "gemini" | "rules" = "rules";
    if (Date.now() > claudeDownUntil) {
      try {
        const res = await anthropic.messages.parse({
          model: "claude-opus-5",
          max_tokens: 3000,
          output_config: { effort: "low", format: zodOutputFormat(Analysis) },
          system, messages: [{ role: "user", content: user }],
        });
        if (res.stop_reason !== "refusal") a = parsedOf<z.infer<typeof Analysis>>(res);
        if (a) used = "claude";
      } catch (e) { markClaudeDown(e); }
    }
    // ชั้น 2: Gemini (โควต้าฟรี)
    if (!a && GEMINI_KEY) {
      a = normAnalysis(await geminiJson(system + GEMINI_SCHEMA_ANALYSIS, user, 2500));
      if (a) { used = "gemini"; await sleep(6500); } // เว้นจังหวะไม่ให้ชนโควต้าฟรีต่อนาที
    }
    // ชั้น 3: กติกาเบื้องต้น (ฟรีเสมอ)
    if (!a) { a = ruleAnalyze(r, staff); used = "rules"; }
    prov[used]++;
    try {
      await sb.from("social_mentions").update({
        sentiment: a.sentiment,
        ai_score: Math.max(0, Math.min(100, a.ai_score)),
        topics: a.topics, issues: a.issues, praises: a.praises, staff: a.staff,
        visit_slot: a.visit_slot,
        branch: r.branch ?? (branchCodes.includes(a.branch) ? a.branch : null),
        ai_summary: a.summary, ai_reply: a.reply,
        analyzed_at: new Date().toISOString(),
      }).eq("id", r.id);
      n++;
    } catch (e) {
      console.error("analyze", r.id, e);
      errs.push(`#${r.id}: ${String((e as any)?.message ?? e).slice(0, 180)}`);
    }
  }
  return { analyzed: n, total: rows.length, providers: prov, errors: errs.length ? errs.slice(0, 3) : undefined };
}

// ---------- สรุปรายวัน/รายสัปดาห์ ----------
async function makeSummary(dateStr?: string, span: "daily" | "weekly" = "daily") {
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
    if (Date.now() > claudeDownUntil) {
      try {
        const res = await anthropic.messages.parse({
          model: "claude-opus-5",
          max_tokens: 6000,
          output_config: { effort: "medium", format: zodOutputFormat(Digest) },
          system: digSystem,
          messages: [{ role: "user", content: digUser }],
        });
        d = parsedOf<z.infer<typeof Digest>>(res);
      } catch (e) { markClaudeDown(e); }
    }
    if (!d && GEMINI_KEY) {
      const s = Digest.safeParse(await geminiJson(digSystem + GEMINI_SCHEMA_DIGEST, digUser, 4000));
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
  return { ok: true, date: dKey, branches: Object.keys(results) };
}
function avg(a: number[]) { return a.length ? Math.round(a.reduce((s, x) => s + Number(x), 0) / a.length * 100) / 100 : null; }

// ---------- ดึงรีวิว Google (Places API) ----------
// placesIn: ส่งรายการ place มากับคำสั่งได้เลย (ปุ่มในแอป) — ฟังก์ชันจะบันทึกลง settings ให้เอง
async function pollGoogle(placesIn?: { place_id: string; branch: string }[]) {
  if (!GOOGLE_KEY) return { ok: false, reason: "ยังไม่ได้ตั้ง secret GOOGLE_API_KEY (หรือ GOOGLE_MAPS_API_KEY)" };
  const settings = await getSettings();
  const places: { place_id: string; branch: string }[] =
    (placesIn?.length ? placesIn : settings.channels?.google_places) ?? [];
  if (!places.length) return { ok: false, reason: "ยังไม่ได้ใส่ place_id ในหน้าเชื่อมต่อ" };
  settings.channels = { ...(settings.channels ?? {}), google_places: places };
  let added = 0;
  const errors: string[] = [];
  const diag: any[] = []; // รายงานละเอียดต่อสาขา ให้หน้าแอปโชว์ตอนแก้ปัญหา
  for (const p of places) {
    const r = await fetch(`https://places.googleapis.com/v1/places/${p.place_id}?languageCode=th`, {
      headers: { "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": "reviews,rating,userRatingCount" },
    });
    if (!r.ok) {
      const t = await r.text();
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
    let newestApi = 0;
    try {
      const lr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=reviews&reviews_sort=newest&language=th&key=${GOOGLE_KEY}`);
      const ld = lr.ok ? await lr.json() : null;
      if (ld?.status === "OK") {
        for (const rv of ld.result?.reviews ?? []) {
          revs.push({ epoch: rv.time ?? null, author: rv.author_name ?? "", text: rv.text ?? "", rating: rv.rating ?? null, raw: rv });
          newestApi++;
        }
      } else if (ld?.status) console.error("legacy places", p.place_id, ld.status);
    } catch (e) { console.error("legacy places", e); } // ไม่ได้เปิด Legacy Places API ก็ข้ามไป
    let inserted = 0, dup = 0, insErr = "";
    for (const rv of revs) {
      const { data, error } = await sb.from("social_mentions").upsert({
        channel: "google", kind: "review",
        external_id: `g_${p.place_id}_${rv.epoch ?? "x"}_${rv.author.slice(0, 40)}`,
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
      reviews_from_google: revs.length, newest_api: newestApi, inserted, duplicated: dup,
      insert_error: insErr || undefined,
    });
    // เก็บคะแนนรวมไว้โชว์ในหน้าเชื่อมต่อ
    settings.channels.google_stat = settings.channels.google_stat ?? {};
    settings.channels.google_stat[p.place_id] = {
      rating: d.rating ?? null, count: d.userRatingCount ?? null, at: new Date().toISOString(),
    };
  }
  await sb.from("social_settings").upsert({ id: "channels", val: settings.channels, updated_at: new Date().toISOString() });
  return { ok: true, added, diag, errors: errors.length ? errors : undefined };
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
  let out: z.infer<typeof ChatReply> | null = null;
  if (Date.now() > claudeDownUntil) {
    try {
      const res = await anthropic.messages.parse({
        model: "claude-opus-5", max_tokens: 1024,
        output_config: { effort: "low", format: zodOutputFormat(ChatReply) },
        system, messages,
      });
      if (res.stop_reason === "refusal") return { reply: "", needs_human: true, reason: "refusal" };
      out = parsedOf<z.infer<typeof ChatReply>>(res);
    } catch (e) { markClaudeDown(e); }
  }
  if (!out && GEMINI_KEY) {
    const hist = messages.map((m) => `${m.role === "user" ? "ลูกค้า" : "ร้าน"}: ${m.content}`).join("\n");
    const j = await geminiJson(system + `\n\nตอบเป็น JSON ล้วน: {"reply":"ข้อความตอบลูกค้า","needs_human":true/false,"reason":"เหตุผลสั้นๆ"}`, hist, 800);
    if (j && typeof j.reply === "string") out = { reply: j.reply, needs_human: !!j.needs_human, reason: String(j.reason ?? "") };
  }
  return out ?? { reply: bot.fallback_text ?? "", needs_human: true, reason: "ai-unavailable" };
}

// ---------- ส่งข้อความแชท (แอดมินกดส่งร่าง) ----------
async function sendChat(channel: string, threadId: string, text: string, by: string) {
  let ok = false;
  if (channel === "line") {
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: threadId, messages: [{ type: "text", text }] }),
    });
    ok = r.ok; if (!ok) console.error("line push", await r.text());
  } else if (channel === "facebook" || channel === "instagram") {
    const r = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: threadId }, messaging_type: "RESPONSE", message: { text } }),
    });
    ok = r.ok; if (!ok) console.error("fb send", await r.text());
  } else return { ok: false, reason: "ช่องทางนี้ยังส่งจากระบบไม่ได้" };
  if (ok) await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "out", author: by, text, meta: { manual: true },
  });
  return { ok };
}

// ---------- ตอบกลับรีวิว/คอมเมนต์ ----------
async function sendReply(id: number, text: string, by: string) {
  const { data: m } = await sb.from("social_mentions").select("*").eq("id", id).single();
  if (!m) return { ok: false, reason: "ไม่พบรายการ" };
  let ok = false, reason = "";
  if (m.channel === "facebook" && m.kind === "comment" && m.external_id) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${m.external_id}/comments?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    ok = r.ok; if (!ok) reason = await r.text();
  } else if (m.channel === "instagram" && m.kind === "comment" && m.external_id) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${m.external_id}/replies?access_token=${FB_PAGE_TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    ok = r.ok; if (!ok) reason = await r.text();
  } else {
    return { ok: false, reason: "ช่องทางนี้ต้องไปตอบที่แพลตฟอร์มโดยตรง (กดคัดลอกคำตอบ แล้วเปิดลิงก์ต้นทาง)" };
  }
  if (ok) await sb.from("social_mentions").update({
    reply_status: "sent", reply_text: text, replied_by: by, replied_at: new Date().toISOString(),
  }).eq("id", id);
  return { ok, reason };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("jjmk social-brain ok", { headers: CORS });
  try {
    const b = await req.json();
    let out: unknown;
    switch (b.action) {
      case "analyze":     out = await analyzeMentions(b.ids, b.limit ?? 8); break;
      case "summary":     out = await makeSummary(b.date, b.span ?? "daily"); break;
      case "poll_google": {
        const g: any = await pollGoogle(b.places);
        if (g.added) g.analyze = await analyzeMentions(undefined, 20); // วิเคราะห์ต่อทันที ไม่ต้องรอ cron
        out = g;
        break;
      }
      case "chat_test":   out = await chatTest(b.history ?? []); break;
      case "send_chat":   out = await sendChat(b.channel, b.thread_id, b.text, b.by ?? "admin"); break;
      case "send_reply":  out = await sendReply(b.id, b.text, b.by ?? "admin"); break;
      case "cron": {
        const g = await pollGoogle().catch((e) => ({ ok: false, reason: String(e) }));
        const a = await analyzeMentions(undefined, 20);
        out = { google: g, analyze: a };
        break;
      }
      default: return json({ error: "unknown action" }, 400);
    }
    return json(out);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
function json(x: unknown, status = 200) {
  return new Response(JSON.stringify(x), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
