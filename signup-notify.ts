// signup-notify — แจ้ง LINE เมื่อมีพนักงานใหม่สมัครเข้ามาที่หน้าศูนย์รวมแอพ
// วางที่ Supabase -> Edge Functions -> New function ชื่อ "signup-notify"
// ⚠️ ต้อง "ปิด Verify JWT" ของฟังก์ชันนี้ (Settings ของฟังก์ชัน) ไม่งั้นจะโดนปัดตกตั้งแต่ด่านหน้า
//
// Secret ที่ต้องตั้ง (Edge Functions -> Secrets) — มีตัวเดียว:
//   LINE_TOKEN = Channel access token ของ LINE OA ที่ใช้ส่งรายงานอยู่แล้ว
//                (ค่าเดียวกับที่ตั้งใน Cloudflare Worker ของระบบเงินเดือน)
//
// ส่วน "จะส่งเข้ากลุ่มไหน" เลือกได้จากในแอพเลย: JJ Access -> แท็บรออนุมัติ -> การ์ดแจ้งเตือน LINE
//   (เก็บที่ pnl_settings.line_group_id) · ถ้าไม่ได้ตั้งในแอพ จะใช้ secret LINE_GROUP_ID แทน
// ไม่ตั้งอะไรเลย = ฟังก์ชันตอบ ok เฉย ๆ (การสมัครยังทำงานปกติ แค่ไม่มีแจ้งเตือน)

const UNIT: Record<string, string> = {
  JJLP: "สาขาลาดพร้าว", JJRD: "สาขารัชดา", JJCK: "ครัวกลาง", OFFICE: "ออฟฟิศ", ALL: "ส่วนกลาง",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// กลุ่มที่จะส่ง — เอาจากที่ตั้งไว้ในแอพก่อน (pnl_settings) ไม่มีค่อยใช้ secret
async function groupId(): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (url && key) {
    try {
      const r = await fetch(url + "/rest/v1/pnl_settings?select=val&id=eq.line_group_id", {
        headers: { apikey: key, Authorization: "Bearer " + key },
      });
      if (r.ok) {
        const rows = await r.json();
        const v = rows && rows[0] ? String(rows[0].val || "").trim() : "";
        if (v) return v;
      }
    } catch (_) { /* อ่านไม่ได้ก็ตกไปใช้ secret */ }
  }
  return (Deno.env.get("LINE_GROUP_ID") || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const b = await req.json().catch(() => ({} as Record<string, string>));
    const token = Deno.env.get("LINE_TOKEN");
    if (!token) return new Response("skip: ยังไม่ได้ตั้ง secret LINE_TOKEN", { headers: CORS });
    const to = await groupId();
    if (!to) return new Response("skip: ยังไม่ได้เลือกกลุ่ม LINE", { headers: CORS });

    const parts = [
      "🧑‍💼 มีคนสมัครเป็นพนักงานใหม่",
      "",
      "ชื่อ: " + (b.name || "-") + (b.nickname ? " (" + b.nickname + ")" : ""),
      "ชื่อผู้ใช้ที่ขอ: " + (b.username || "-"),
      b.unit ? "อยากทำที่: " + (UNIT[b.unit] || b.unit) : "",
      "",
      "อนุมัติที่ 🔑 JJ Access → แท็บ ⏳ รออนุมัติ",
      "https://thananant.github.io/JJ-PnL/jjmk-admin.html",
    ].filter((x) => x !== "");

    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ to, messages: [{ type: "text", text: parts.join("\n") }] }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response("LINE ตอบกลับ " + r.status + ": " + t.slice(0, 300), { status: 200, headers: CORS });
    }
    return new Response("sent", { headers: CORS });
  } catch (e) {
    return new Response("error: " + String((e as Error)?.message || e), { status: 200, headers: CORS });
  }
});
