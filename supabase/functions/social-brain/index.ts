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

const sb = createClient(SB_URL, SB_SERVICE);
const anthropic = new Anthropic();

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
  for (const r of rows) {
    const user = `ช่องทาง: ${r.channel} (${r.kind})${r.rating != null ? ` · ให้ดาว ${r.rating}/5` : ""}${r.branch ? ` · สาขาที่ระบบระบุ: ${r.branch}` : ""}
โพสต์เมื่อ: ${r.posted_at}
ผู้เขียน: ${r.author_name ?? "ไม่ระบุ"}
ข้อความ:
"""${(r.text ?? "").slice(0, 4000)}"""`;
    try {
      const res = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 3000,
        output_config: { effort: "low", format: zodOutputFormat(Analysis) },
        system, messages: [{ role: "user", content: user }],
      });
      if (res.stop_reason === "refusal") { continue; }
      const a = (res as any).parsed_output as z.infer<typeof Analysis> | null;
      if (!a) continue;
      const branchCodes = branches.map((b) => b.code);
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
    } catch (e) { console.error("analyze", r.id, e); }
  }
  return { analyzed: n, total: rows.length };
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
    const res = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 6000,
      output_config: { effort: "medium", format: zodOutputFormat(Digest) },
      system: `คุณคือผู้ช่วยผู้บริหารร้านหมูกระทะ สรุปเสียงลูกค้า${span === "weekly" ? "รอบ 7 วัน" : "รายวัน"}เป็นภาษาไทย ให้เจ้าของร้านอ่านแล้วรู้ทันทีว่า มีปัญหาอะไร ใครทำดี ช่วงเวลาไหนดี/มีปัญหา และควรทำอะไรต่อ อ้างอิงเฉพาะข้อมูลที่ให้ อย่าแต่งเพิ่ม นับ count จากจำนวนรีวิวที่พูดถึงเรื่องนั้นจริง`,
      messages: [{ role: "user", content: `ข้อมูล ${set.length} รายการ (${br === "ALL" ? "ทุกสาขา" : "สาขา " + br}):\n` + lines.join("\n") }],
    });
    const d = (res as any).parsed_output as z.infer<typeof Digest> | null;
    if (!d) continue;
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
  const res = await anthropic.messages.create({
    model: "claude-opus-5", max_tokens: 1024,
    output_config: { effort: "low", format: zodOutputFormat(ChatReply) },
    system, messages,
  });
  if (res.stop_reason === "refusal") return { reply: "", needs_human: true, reason: "refusal" };
  return (res as any).parsed_output;
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
