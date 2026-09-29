// signup-notify — แจ้ง LINE เมื่อมีคนสมัครใหม่ + รีเซ็ตรหัสผ่านด้วยรหัส 6 หลักที่ส่งเข้ากลุ่ม
// วางที่ Supabase -> Edge Functions -> New function ชื่อ "signup-notify"
// ⚠️ ต้อง "ปิด Verify JWT" ของฟังก์ชันนี้ (Settings ของฟังก์ชัน) ไม่งั้นจะโดนปัดตกตั้งแต่ด่านหน้า
//
// Secret ที่ต้องตั้ง (Edge Functions -> Secrets) — มีตัวเดียว:
//   LINE_TOKEN = Channel access token ของ LINE OA ที่ใช้ส่งรายงานอยู่แล้ว
//                (ค่าเดียวกับที่ตั้งใน Cloudflare Worker ของระบบเงินเดือน)
//   ตั้ง secret หลัง deploy = ต้องกด Deploy ซ้ำอีกรอบ ฟังก์ชันถึงจะเห็นค่าใหม่
//
// ส่วน "จะส่งเข้ากลุ่มไหน" เลือกได้จากในแอพเลย: JJ Access -> แท็บรออนุมัติ -> การ์ดแจ้งเตือน LINE
//   (เก็บที่ pnl_settings.line_group_id) · ถ้าไม่ได้ตั้งในแอพ จะใช้ secret LINE_GROUP_ID แทน
// ไม่ตั้งอะไรเลย = ฟังก์ชันตอบ ok เฉย ๆ (การสมัครยังทำงานปกติ แค่ไม่มีแจ้งเตือน)
//
// ทำอะไรได้บ้าง (ดูที่ช่อง action ใน body)
//   (ไม่ใส่ action)   = แจ้งกลุ่มว่ามีคนสมัครใหม่            -> ตอบเป็นข้อความสั้น ๆ
//   action=reset_request = ขอรหัส 6 หลักไปตั้งรหัสผ่านใหม่   -> ตอบ JSON {ok}
//   action=reset_confirm = ใส่รหัส 6 หลัก + รหัสผ่านใหม่      -> ตอบ JSON {ok}
//
// เรื่องความปลอดภัยของรหัส 6 หลัก
//   - รหัสถูกส่งเข้า "กลุ่ม LINE ของร้าน" เท่านั้น (ไม่ได้ส่งให้ผู้ขอโดยตรง) — หัวหน้าเป็นคนบอกต่อ
//   - ที่เก็บไว้ใน pnl_settings เป็น HMAC ของรหัส (กุญแจอยู่ในฟังก์ชัน) ไม่ใช่ตัวรหัส
//     -> ใครอ่านตารางได้ก็ย้อนกลับเป็นรหัสไม่ได้ · **ห้ามเอารหัสจริงมาเก็บที่นี่เด็ดขาด**
//   - ใส่ผิดเกิน 5 ครั้ง / เกิน 10 นาที = ต้องขอใหม่ · ขอถี่กว่า 60 วินาทีไม่ได้
//     (ใส่ผิดครบ = เก็บเวลาที่ขอไว้ ไม่ลบแถว — ไม่งั้นขอรหัสใหม่ได้ทันที ข้ามช่วงรอ 60 วินาที)
//   - เบราว์เซอร์คิด pass_hash เองแล้วส่งมา รหัสผ่านตัวจริงจึงไม่เคยออกจากเครื่องผู้ใช้
//   - ชื่อผู้ใช้ต้องตรงกับที่ใช้ล็อกอินเป๊ะ (ตัวพิมพ์เล็ก/ใหญ่ด้วย เพราะ pwHash ผูกกับชื่อ)
//     พิมพ์ตัวพิมพ์ไม่ตรง = หาแบบไม่สนตัวพิมพ์แล้วตอบชื่อจริงกลับไป ให้แอพคิด pass_hash ใหม่ด้วยชื่อจริง
//
// ธง pnl_settings.reset_ready = เวอร์ชันของโค้ดนี้ — หน้าศูนย์รวมแอพจะโชว์ปุ่ม "ลืมรหัสผ่าน" เมื่อธงถึงรุ่นที่ต้องการ
//   (ฟังก์ชันรุ่นเก่าไม่รู้จัก action แล้วจะส่ง "มีคนสมัครใหม่" ปลอมเข้ากลุ่ม ถึงต้องซ่อนปุ่มไว้จนกว่าจะ deploy รุ่นนี้)
//   ธงถูกตั้งตอนกด 🔎 ทดสอบ ใน JJ Access (ฟังก์ชันส่งข้อความทดสอบสำเร็จ)

const VERSION = "2026-09-29.3";

const UNIT: Record<string, string> = {
  JJLP: "สาขาลาดพร้าว", JJRD: "สาขารัชดา", JJCK: "ครัวกลาง", OFFICE: "ออฟฟิศ", ALL: "ส่วนกลาง",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_TTL_MIN = 10;     // รหัส 6 หลักมีอายุกี่นาที
const CODE_TRIES   = 5;      // ใส่ผิดได้กี่ครั้ง
const ASK_GAP_SEC  = 60;     // ขอรหัสใหม่ได้ทุกกี่วินาที

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function sbHead(extra?: Record<string, string>) {
  return { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", ...(extra || {}) };
}
async function sbGet(path: string): Promise<any[]> {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: sbHead() });
  if (!r.ok) throw new Error("อ่านฐานข้อมูลไม่ได้ (" + r.status + ")");
  return await r.json();
}
function jsonRes(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// กลุ่มที่จะส่ง — เอาจากที่ตั้งไว้ในแอพก่อน (pnl_settings) ไม่มีค่อยใช้ secret
// อ่านฐานข้อมูลไม่ได้ = จดไว้ใน GROUP_ERR (จะได้ไม่บอกผิดว่า "ยังไม่ได้ตั้งกลุ่ม")
let GROUP_ERR = "";
async function groupId(): Promise<string> {
  GROUP_ERR = "";
  if (SB_URL && SB_KEY) {
    try {
      const rows = await sbGet("pnl_settings?select=val&id=eq.line_group_id");
      const v = rows && rows[0] ? String(rows[0].val || "").trim() : "";
      if (v) return v;
    } catch (e) { GROUP_ERR = String((e as Error)?.message || e); }
  }
  return (Deno.env.get("LINE_GROUP_ID") || "").trim();
}

async function pushLine(token: string, to: string, text: string): Promise<string> {
  const r = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (r.ok) return "";
  const t = await r.text();
  return "LINE ตอบกลับ " + r.status + ": " + t.slice(0, 300);
}

/* ---------- รหัส 6 หลัก ---------- */

// กุญแจ HMAC เอาจาก secret ที่มีอยู่แล้วในฟังก์ชัน (ไม่ต้องตั้งเพิ่ม)
// service role key ของ Supabase ใส่มาให้เองทุกฟังก์ชัน · ไม่มีก็ใช้ LINE_TOKEN ซึ่งฟีเจอร์นี้ต้องมีอยู่แล้ว
function hmacSecret(): string {
  return (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "") + "|" + (Deno.env.get("LINE_TOKEN") || "");
}
async function codeHash(username: string, code: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(hmacSecret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username + "|" + code));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newCode(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, "0");
}
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// ชื่อผู้ใช้ที่ admin สร้างใน JJ Access มีได้ทั้งตัวพิมพ์ใหญ่และอักษรอื่น — ตรวจแค่ความยาวและตัวควบคุม
function okUser(u: string): boolean {
  return u.length >= 1 && u.length <= 64 && !/[\u0000-\u001f\u007f]/.test(u);
}
function likeEsc(u: string): string {
  return u.replace(/[\\%_]/g, (c) => "\\" + c);
}
function thTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit",
    }).format(new Date(ms));
  } catch (_) { return ""; }
}

const rkey = (u: string) => "reset:" + u;

// อ่านแถวคำขอ -> { raw: ข้อความเดิมในช่อง val (ใช้เทียบตอนเขียน), st: ค่าที่แปลงแล้ว } · ไม่มีแถว = null
// อ่านฐานข้อมูลไม่ได้ = โยน error (ห้ามทำเหมือนไม่มีแถว ไม่งั้นช่วงรอ/จำนวนครั้งที่ลองหายไปเฉย ๆ)
async function readReset(u: string): Promise<{ raw: string; st: any } | null> {
  const rows = await sbGet("pnl_settings?select=val&id=eq." + encodeURIComponent(rkey(u)));
  if (!rows || !rows[0]) return null;
  const raw = String(rows[0].val ?? "");
  let st: any = null;
  try { st = JSON.parse(raw); } catch (_) { st = null; }
  return { raw, st: st && typeof st === "object" ? st : {} };
}
// เขียนแถวคำขอก็ต่อเมื่อค่าเดิมยังเป็นค่าที่เราอ่านมา (compare-and-swap ที่ฐานข้อมูล)
// กันกดพร้อมกันหลายครั้ง: ขอรหัสพร้อมกัน = ส่งรหัสแค่ครั้งเดียว · เดารหัสพร้อมกัน = ยังนับครบทุกครั้ง
// คืน true = เขียนได้ · false = มีคำขออื่นเปลี่ยนค่าไปก่อนแล้ว
async function casReset(u: string, prevRaw: string | null, next: unknown): Promise<boolean> {
  const val = JSON.stringify(next);
  const at = new Date().toISOString();
  if (prevRaw === null) {
    const r = await fetch(SB_URL + "/rest/v1/pnl_settings", {
      method: "POST", headers: sbHead({ Prefer: "return=minimal" }),
      body: JSON.stringify({ id: rkey(u), val, updated_at: at, updated_by: "reset" }),
    });
    if (r.ok) return true;
    if (r.status === 409) return false;          // มีแถวนี้แล้ว = อีกคำขอเขียนก่อน
    throw new Error("บันทึกคำขอไม่ได้ (" + r.status + ")");
  }
  const r = await fetch(SB_URL + "/rest/v1/pnl_settings?id=eq." + encodeURIComponent(rkey(u)) +
    "&val=eq." + encodeURIComponent(prevRaw), {
    method: "PATCH", headers: sbHead({ Prefer: "return=representation" }),
    body: JSON.stringify({ val, updated_at: at, updated_by: "reset" }),
  });
  if (!r.ok) throw new Error("บันทึกคำขอไม่ได้ (" + r.status + ")");
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) && rows.length === 1;
}
async function putSetting(id: string, val: string, by: string): Promise<void> {
  const r = await fetch(SB_URL + "/rest/v1/pnl_settings?on_conflict=id", {
    method: "POST",
    headers: sbHead({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ id, val, updated_at: new Date().toISOString(), updated_by: by }),
  });
  if (!r.ok) throw new Error("บันทึกไม่ได้ (" + r.status + ")");
}
async function writeReset(u: string, o: unknown): Promise<void> {
  await putSetting(rkey(u), JSON.stringify(o), "reset");
}
// ใส่ผิดครบ/ขอรหัสใหม่ไม่ได้ = เก็บแค่เวลาที่ขอไว้ (ไม่มีรหัสแล้ว) เพื่อให้ช่วงรอ 60 วินาทียังมีผล
async function lockReset(u: string, st: any): Promise<void> {
  try { await writeReset(u, { iat: Number(st && st.iat) || Date.now(), n: CODE_TRIES }); }
  catch (_) { await clearReset(u); }
}
async function clearReset(u: string): Promise<void> {
  try {
    await fetch(SB_URL + "/rest/v1/pnl_settings?id=eq." + encodeURIComponent(rkey(u)),
      { method: "DELETE", headers: sbHead() });
  } catch (_) { /* ไม่เป็นไร เดี๋ยวก็หมดอายุเอง */ }
}

// หาบัญชี: ชื่อตรงเป๊ะก่อน · ไม่เจอค่อยหาแบบไม่สนตัวพิมพ์ (ชื่อผู้ใช้ unique ตาม lower() อยู่แล้ว)
// ต้องได้ 1 แถวพอดีเท่านั้น · ชื่อที่มี * ไม่ลองแบบไม่สนตัวพิมพ์ (PostgREST ตีความ * เป็นตัวแทนทุกตัวอักษร)
async function findUser(u: string): Promise<any> {
  const q = "pnl_users?select=*&";
  let rows = await sbGet(q + "username=eq." + encodeURIComponent(u));
  if (rows && rows.length === 1) return rows[0];
  if ((!rows || !rows.length) && !u.includes("*")) {
    rows = await sbGet(q + "username=ilike." + encodeURIComponent(likeEsc(u)));
    if (rows && rows.length === 1) return rows[0];
  }
  return null;
}
function userBlocked(usr: any): string {
  if (usr.status === "pending") return "บัญชีนี้ยังรอผู้ดูแลอนุมัติอยู่";
  if (usr.status === "rejected") return "บัญชีนี้ไม่ได้รับอนุมัติ";
  if (usr.active === false) return "บัญชีนี้ถูกปิดใช้งาน — ติดต่อผู้ดูแลครับ";
  return "";
}
async function logReset(username: string, detail: string): Promise<void> {
  try {
    await fetch(SB_URL + "/rest/v1/pnl_access_log", {
      method: "POST", headers: sbHead({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        actor: username, target_user: username,
        action: "ตั้งรหัสผ่านใหม่ด้วยรหัส 6 หลัก", detail: detail.slice(0, 300),
      }),
    });
  } catch (_) { /* จดไม่ได้ก็ไม่ขวางการตั้งรหัส */ }
}

/* ---------- ขอรหัส ---------- */
async function resetRequest(b: Record<string, string>, token: string, to: string) {
  const raw = String(b.username || "").trim();
  if (!okUser(raw)) return jsonRes({ ok: false, reason: "ใส่ชื่อผู้ใช้ก่อนครับ" });

  const usr = await findUser(raw);
  if (!usr) return jsonRes({ ok: false, reason: "ไม่พบชื่อผู้ใช้นี้ในระบบ" });
  const u = String(usr.username);            // ชื่อจริงตามที่เก็บไว้ (ตัวพิมพ์ตรง)
  const name = usr.display_name || u;
  const bad = userBlocked(usr);
  if (bad) return jsonRes({ ok: false, reason: bad });

  const now = Date.now();
  const got = await readReset(u);
  const cur = got ? got.st : null;
  if (cur && cur.iat && now - cur.iat < ASK_GAP_SEC * 1000) {
    // เพิ่งส่งรหัสไปและรหัสนั้นยังใช้ได้ = ไม่ส่งซ้ำ ให้ไปหน้าใส่รหัสด้วยรหัสเดิม
    if (cur.h && cur.exp && now < cur.exp && Number(cur.n || 0) < CODE_TRIES) {
      return jsonRes({ ok: true, again: true, username: u, name,
        minutes: Math.max(1, Math.ceil((cur.exp - now) / 60000)) });
    }
    const wait = Math.ceil((ASK_GAP_SEC * 1000 - (now - cur.iat)) / 1000);
    return jsonRes({ ok: false, reason: "เพิ่งขอรหัสไปเมื่อสักครู่ — รออีก " + wait + " วินาที" });
  }

  const code = newCode();
  const exp = now + CODE_TTL_MIN * 60000;
  const h = await codeHash(u, code);
  // ขอพร้อมกันหลายครั้ง: ได้เขียนแค่คำขอเดียว คำขอนั้นเป็นคนส่ง LINE (กลุ่มได้รหัสเดียว ไม่มีรหัสตาย)
  if (!(await casReset(u, got ? got.raw : null, { h, exp, iat: now, n: 0 }))) {
    return jsonRes({ ok: true, again: true, username: u, name, minutes: CODE_TTL_MIN });
  }

  const msg = [
    "🔑 ขอตั้งรหัสผ่านใหม่",
    "",
    "ชื่อผู้ใช้: " + u,
    "ชื่อ: " + name,
    "",
    "รหัสยืนยัน: " + code,
    "ใช้ได้ถึง " + thTime(exp) + " น. (" + CODE_TTL_MIN + " นาที)",
    "",
    "⚠️ บอกรหัสนี้กับเจ้าตัวเท่านั้น",
    "ไม่มีใครขอ = ไม่ต้องบอกใคร เดี๋ยวหมดอายุเอง",
  ].join("\n");

  const err = await pushLine(token, to, msg);
  if (err) {
    await clearReset(u);
    return jsonRes({ ok: false, reason: "ส่งรหัสเข้ากลุ่ม LINE ไม่สำเร็จ · " + err });
  }
  return jsonRes({ ok: true, username: u, name, minutes: CODE_TTL_MIN });
}

/* ---------- ใส่รหัส + ตั้งรหัสผ่านใหม่ ---------- */
async function resetConfirm(b: Record<string, string>, token: string, to: string) {
  const raw = String(b.username || "").trim();
  const code = String(b.code || "").replace(/\D/g, "");
  const ph = String(b.pass_hash || "").trim().toLowerCase();
  if (!okUser(raw)) return jsonRes({ ok: false, reason: "ใส่ชื่อผู้ใช้ก่อนครับ" });
  if (code.length !== 6) return jsonRes({ ok: false, reason: "ใส่รหัส 6 หลักให้ครบก่อนครับ" });
  if (!/^[0-9a-f]{64}$/.test(ph)) return jsonRes({ ok: false, reason: "รหัสผ่านใหม่ไม่ถูกต้อง" });

  const usr = await findUser(raw);
  if (!usr) return jsonRes({ ok: false, reason: "ไม่พบชื่อผู้ใช้นี้ในระบบ" });
  const u = String(usr.username);
  // pass_hash ผูกกับชื่อผู้ใช้แบบตัวพิมพ์ตรง — พิมพ์มาไม่ตรง ให้แอพคิดใหม่ด้วยชื่อจริงแล้วส่งมาอีกรอบ
  // (เช็คก่อนดูรหัส 6 หลัก จึงไม่เสียสิทธิ์ลองรหัส)
  if (u !== raw) return jsonRes({ ok: false, retry: true, username: u, reason: "ชื่อผู้ใช้จริงคือ " + u });
  const bad = userBlocked(usr);
  if (bad) return jsonRes({ ok: false, reason: bad });

  // จองสิทธิ์ลอง 1 ครั้งก่อนเทียบรหัส (เพิ่ม n แบบเทียบแล้วค่อยเขียน) — เดารหัสพร้อมกันหลายคำขอ
  // ก็ยังนับครบทุกครั้ง ไม่มีทางได้ลองเกิน CODE_TRIES
  let st: any = null, tries = 0, mine = "";
  for (let i = 0; i < 6 && !mine; i++) {
    const got = await readReset(u);
    st = got ? got.st : null;
    if (!st || !st.h) return jsonRes({ ok: false, reason: "ยังไม่มีรหัสที่ใช้ได้ (ยังไม่ได้ขอ · หมดอายุ · หรือใส่ผิดครบแล้ว) — กดขอรหัสใหม่ครับ" });
    if (!st.exp || Date.now() > st.exp) {
      await clearReset(u);            // หมดอายุแล้ว = เวลาที่ขอเก่ากว่า 60 วินาทีแน่นอน ลบทิ้งได้
      return jsonRes({ ok: false, reason: "รหัสหมดอายุแล้ว — กดขอรหัสใหม่ครับ" });
    }
    tries = Number(st.n || 0);
    if (tries >= CODE_TRIES) {
      await lockReset(u, st);
      return jsonRes({ ok: false, reason: "ใส่รหัสผิดหลายครั้งเกินไป — กดขอรหัสใหม่ครับ" });
    }
    const next = { ...st, n: tries + 1 };
    if (await casReset(u, got!.raw, next)) mine = JSON.stringify(next);
  }
  if (!mine) return jsonRes({ ok: false, reason: "มีการใส่รหัสพร้อมกันหลายครั้ง — รอสักครู่แล้วลองใหม่ครับ" });

  if (!sameHex(st.h, await codeHash(u, code))) {
    const left = CODE_TRIES - tries - 1;
    if (left <= 0) { await lockReset(u, st); return jsonRes({ ok: false, reason: "รหัสไม่ถูกต้อง — ใส่ผิดครบแล้ว กดขอรหัสใหม่ครับ" }); }
    return jsonRes({ ok: false, reason: "รหัสไม่ถูกต้อง (ลองได้อีก " + left + " ครั้ง)" });
  }

  // รหัสถูก: ปิดรหัสนี้ทิ้งก่อนเปลี่ยนรหัสผ่าน (ใช้ได้ครั้งเดียวจริง ๆ แม้ส่งรหัสถูกพร้อมกัน 2 คำขอ)
  let used = false;
  for (let i = 0; i < 6 && !used; i++) {
    const cur = i === 0 ? { raw: mine, st: JSON.parse(mine) } : await readReset(u);
    if (!cur || !cur.st || cur.st.h !== st.h) {
      return jsonRes({ ok: false, reason: "รหัสนี้ถูกใช้ไปแล้ว — ถ้าไม่ใช่คุณ ให้แจ้งหัวหน้าทันที" });
    }
    used = await casReset(u, cur.raw, { iat: Number(st.iat) || Date.now(), n: CODE_TRIES, used: true });
  }
  if (!used) return jsonRes({ ok: false, reason: "มีการใส่รหัสพร้อมกันหลายครั้ง — รอสักครู่แล้วลองใหม่ครับ" });

  // แก้เฉพาะช่อง pass_hash · ขอแถวที่แก้กลับมา — ไม่มีแถวไหนถูกแก้ = ถือว่าไม่สำเร็จ (อย่าบอกว่าเปลี่ยนแล้ว)
  const r = await fetch(SB_URL + "/rest/v1/pnl_users?username=eq." + encodeURIComponent(u), {
    method: "PATCH", headers: sbHead({ Prefer: "return=representation" }),
    body: JSON.stringify({ pass_hash: ph }),
  });
  if (!r.ok) return jsonRes({ ok: false, reason: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ (" + r.status + ")" });
  const changed = await r.json().catch(() => []);
  if (!Array.isArray(changed) || changed.length !== 1) {
    return jsonRes({ ok: false, reason: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ — ไม่พบบัญชีที่จะแก้" });
  }

  await clearReset(u);
  await logReset(u, "ขอรหัสผ่านกลุ่ม LINE แล้วตั้งรหัสใหม่เอง");
  if (to) {
    await pushLine(token, to,
      "✅ " + (usr.display_name || u) + " (" + u + ") ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว\n" +
      "ถ้าไม่ใช่เจ้าตัว ให้รีบเข้า 🔑 JJ Access ไปเปลี่ยนรหัส/ปิดบัญชีทันที");
  }
  return jsonRes({ ok: true, username: u });
}

/* ---------- แจ้งกลุ่มว่ามีคนสมัครใหม่ (ของเดิม) ---------- */
function signupText(b: Record<string, string>): string {
  return [
    "🧑‍💼 มีคนสมัครเป็นพนักงานใหม่",
    "",
    "ชื่อ: " + (b.name || "-") + (b.nickname ? " (" + b.nickname + ")" : ""),
    "ชื่อผู้ใช้ที่ขอ: " + (b.username || "-"),
    b.unit ? "อยากทำที่: " + (UNIT[b.unit] || b.unit) : "",
    "",
    "อนุมัติที่ 🔑 JJ Access → แท็บ ⏳ รออนุมัติ",
    "https://thananant.github.io/JJ-PnL/jjmk-admin.html",
  ].filter((x) => x !== "").join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let isReset = false;                 // ประกาศนอก try — ข้อผิดพลาดของงานรีเซ็ตต้องตอบเป็น JSON เสมอ
  try {
    const b = await req.json().catch(() => ({} as Record<string, string>));
    const action = String(b.action || "");
    isReset = action === "reset_request" || action === "reset_confirm";
    // action ที่ไม่รู้จัก = ไม่ส่งอะไรเข้ากลุ่ม (กันแอพรุ่นใหม่กว่าส่งงานที่โค้ดนี้ไม่รู้จัก แล้วกลายเป็น "มีคนสมัครใหม่" ปลอม)
    if (action && !isReset) return new Response("skip: ไม่รู้จัก action " + action.slice(0, 40) + " | v" + VERSION, { headers: CORS });

    const token = (Deno.env.get("LINE_TOKEN") || "").trim();
    if (!token) {
      // บอกให้รู้ว่าฟังก์ชันนี้ "เห็น" secret ชื่ออะไรบ้าง (ชื่ออย่างเดียว ไม่ส่งค่าออกไป)
      // ตั้ง secret ไว้แล้วแต่ยังไม่เห็น = ต้องกด Deploy ฟังก์ชันใหม่อีกรอบ
      const seen = ["LINE_TOKEN", "LINE_GROUP_ID", "LINE_CHANNEL_ACCESS_TOKEN", "LINE_SECRET", "LINE_CHANNEL_SECRET"]
        .filter((k) => (Deno.env.get(k) || "").trim() !== "");
      const why = "skip: อ่าน LINE_TOKEN ไม่เจอ | เห็น: " + (seen.join(", ") || "-") + " | v" + VERSION;
      return isReset
        ? jsonRes({ ok: false, reason: "ระบบส่ง LINE ยังไม่พร้อม — แจ้งผู้ดูแลระบบครับ" })
        : new Response(why, { headers: CORS });
    }

    const to = await groupId();
    if (!to && GROUP_ERR) {
      return isReset
        ? jsonRes({ ok: false, error: true, reason: "ระบบขัดข้องชั่วคราว (" + GROUP_ERR.slice(0, 120) + ") ลองใหม่อีกครั้งครับ" })
        : new Response("error: " + GROUP_ERR + " | v" + VERSION, { headers: CORS });
    }
    if (!to) {
      return isReset
        ? jsonRes({ ok: false, reason: "ยังไม่ได้ตั้งกลุ่ม LINE — แจ้งผู้ดูแลระบบครับ" })
        : new Response("skip: ยังไม่ได้เลือกกลุ่ม LINE | v" + VERSION, { headers: CORS });
    }

    if (action === "reset_request") return await resetRequest(b, token, to);
    if (action === "reset_confirm") return await resetConfirm(b, token, to);

    const err = await pushLine(token, to, signupText(b));
    if (err) return new Response(err, { status: 200, headers: CORS });
    // ส่งได้จริง = โค้ดรุ่นนี้พร้อมใช้ → ตั้งธงให้หน้าศูนย์รวมแอพโชว์ปุ่ม "ลืมรหัสผ่าน"
    try { await putSetting("reset_ready", VERSION, "signup-notify"); } catch (_) { /* แอพ JJ Access ตั้งซ้ำให้อีกชั้น */ }
    return new Response("sent | v" + VERSION, { headers: CORS });
  } catch (e) {
    const m = String((e as Error)?.message || e);
    return isReset
      ? jsonRes({ ok: false, error: true, reason: "ระบบขัดข้องชั่วคราว (" + m.slice(0, 120) + ") ลองใหม่อีกครั้งครับ" })
      : new Response("error: " + m, { status: 200, headers: CORS });
  }
});
