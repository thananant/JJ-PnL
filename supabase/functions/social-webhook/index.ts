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

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINE_SECRET = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET") ?? "";
const FB_VERIFY = Deno.env.get("FB_VERIFY_TOKEN") ?? "jjmk-social";
const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_TOKEN") ?? "";
const GENERIC_KEY = Deno.env.get("WEBHOOK_SHARED_KEY") ?? "";

const sb = createClient(SB_URL, SB_SERVICE);
const anthropic = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก secrets

const ChatReply = z.object({
  reply: z.string(),        // ข้อความตอบลูกค้า (ภาษาเดียวกับลูกค้า)
  needs_human: z.boolean(), // true = เรื่องร้องเรียนรุนแรง/ขอเงินคืน/เกินขอบเขตบอท
  reason: z.string(),
});

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
async function botAnswer(channel: string, threadId: string, settings: Record<string, any>) {
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
- ถ้าลูกค้าร้องเรียนรุนแรง เจ็บป่วย ขอเงินคืน หรือพูดถึงคำเหล่านี้: ${kw.join(", ")} ให้ตั้ง needs_human = true`;

  const res = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low", format: zodOutputFormat(ChatReply) },
    system,
    messages,
  });
  if (res.stop_reason === "refusal") return { reply: "", needs_human: true, reason: "refusal" };
  return (res as any).parsed_output as z.infer<typeof ChatReply> | null;
}

async function sendLine(replyToken: string | null, userId: string, text: string) {
  const msg = { messages: [{ type: "text", text }] };
  if (replyToken) {
    const r = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ replyToken, ...msg }),
    });
    if (r.ok) return true;
  }
  const r2 = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, ...msg }),
  });
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
  replyToken?: string | null; externalId?: string;
}) {
  const { channel, threadId, text } = opts;
  await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "in",
    author: opts.authorName ?? null, text, meta: opts.externalId ? { external_id: opts.externalId } : null,
  });
  const settings = await getSettings();
  const mode = settings.bot?.mode?.[channel] ?? "off";
  if (mode === "off") return;

  const out = await botAnswer(channel, threadId, settings).catch((e) => {
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
    if (mode === "auto" && out.needs_human && settings.bot?.fallback_text) {
      // โหมดออโต้แต่ต้องส่งต่อคน: ตอบขอเวลาไว้ก่อน
      const ok = channel === "line"
        ? await sendLine(opts.replyToken ?? null, threadId, settings.bot.fallback_text)
        : await sendMessenger(threadId, settings.bot.fallback_text);
      if (ok) await sb.from("social_chat_log").insert({
        channel, thread_id: threadId, direction: "out", author: "bot",
        text: settings.bot.fallback_text, meta: { auto: true, fallback: true },
      });
    }
    return;
  }
  // mode === 'auto'
  const ok = channel === "line"
    ? await sendLine(opts.replyToken ?? null, threadId, out.reply)
    : await sendMessenger(threadId, out.reply);
  await sb.from("social_chat_log").insert({
    channel, thread_id: threadId, direction: "out", author: "bot",
    text: out.reply, meta: { auto: true, sent: ok },
  });
}

// ---------- LINE ----------
async function handleLine(body: string) {
  const data = JSON.parse(body);
  for (const ev of data.events ?? []) {
    if (ev.type !== "message") continue;
    const threadId = ev.source?.userId ?? "unknown";
    const text = ev.message?.type === "text" ? (ev.message.text ?? "")
      : `[${ev.message?.type ?? "message"}]`;
    let authorName: string | undefined;
    try {
      const p = await fetch(`https://api.line.me/v2/bot/profile/${threadId}`, {
        headers: { Authorization: `Bearer ${LINE_TOKEN}` },
      });
      if (p.ok) authorName = (await p.json()).displayName;
    } catch { /* ไม่มีชื่อก็ไม่เป็นไร */ }
    await handleChat({
      channel: "line", threadId, authorName, text,
      replyToken: ev.replyToken ?? null, externalId: ev.message?.id,
    });
  }
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
        channel, threadId: m.sender.id, text, externalId: m.message.mid,
      });
    }
    // คอมเมนต์ / รีวิวเพจ
    for (const ch of entry.changes ?? []) {
      const v = ch.value ?? {};
      if (ch.field === "feed" && v.item === "comment" && v.verb === "add") {
        if (v.from?.id && String(v.from.id) === String(entry.id)) continue; // คอมเมนต์ของเพจเอง
        await saveMention({
          channel, kind: "comment", external_id: v.comment_id,
          author_name: v.from?.name ?? null, author_id: v.from?.id ?? null,
          text: v.message ?? "", url: v.permalink_url ?? null,
          posted_at: v.created_time ? new Date(v.created_time * 1000).toISOString() : new Date().toISOString(),
          raw: v,
        });
      }
      if (ch.field === "ratings") {
        await saveMention({
          channel: "facebook", kind: "review",
          external_id: `rating_${v.review_id ?? v.created_time ?? crypto.randomUUID()}`,
          author_name: v.reviewer_name ?? null,
          text: v.review_text ?? (v.recommendation_type ? `แนะนำ: ${v.recommendation_type}` : ""),
          rating: v.rating ?? (v.recommendation_type === "positive" ? 5 : v.recommendation_type === "negative" ? 1 : null),
          posted_at: v.created_time ? new Date(v.created_time * 1000).toISOString() : new Date().toISOString(),
          raw: v,
        });
      }
      if (isIG && ch.field === "comments" && v.id) {
        await saveMention({
          channel: "instagram", kind: "comment", external_id: v.id,
          author_name: v.from?.username ?? null, author_id: v.from?.id ?? null,
          text: v.text ?? "", raw: v,
        });
      }
    }
  }
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
    // Meta webhook verification
    if (u.searchParams.get("hub.mode") === "subscribe") {
      if (u.searchParams.get("hub.verify_token") === FB_VERIFY)
        return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
      return new Response("bad verify token", { status: 403 });
    }
    return new Response("jjmk social-webhook ok", { status: 200 });
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
