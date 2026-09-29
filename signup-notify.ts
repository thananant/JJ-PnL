// signup-notify — แจ้ง LINE เมื่อมีพนักงานใหม่สมัครเข้ามาที่หน้าศูนย์รวมแอพ
// วางที่ Supabase -> Edge Functions -> New function ชื่อ "signup-notify"
// ⚠️ ต้อง "ปิด Verify JWT" ของฟังก์ชันนี้ (Settings ของฟังก์ชัน) ไม่งั้นจะโดนปัดตกตั้งแต่ด่านหน้า
//
// Secrets ที่ต้องตั้ง (Edge Functions -> Secrets) — ใช้ค่าเดียวกับที่ตั้งไว้ใน Cloudflare Worker ของระบบเงินเดือน:
//   LINE_TOKEN     = Channel access token ของ LINE OA ที่ใช้ส่งรายงานอยู่แล้ว
//   LINE_GROUP_ID  = Cxxxxxxxx... กลุ่ม LINE ที่จะให้แจ้งเตือน
// ไม่ตั้ง 2 ตัวนี้ = ฟังก์ชันตอบ ok เฉย ๆ (การสมัครยังทำงานปกติ แค่ไม่มีแจ้งเตือน)

const UNIT: Record<string, string> = {
  JJLP: "สาขาลาดพร้าว", JJRD: "สาขารัชดา", JJCK: "ครัวกลาง", OFFICE: "ออฟฟิศ", ALL: "ส่วนกลาง",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const b = await req.json().catch(() => ({} as Record<string, string>));
    const token = Deno.env.get("LINE_TOKEN");
    const to = Deno.env.get("LINE_GROUP_ID");
    if (!token || !to) {
      return new Response("skip: ยังไม่ได้ตั้ง LINE_TOKEN / LINE_GROUP_ID", { headers: CORS });
    }

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
