// ============================================================
// cal-feed — ฟีดปฏิทิน ICS ของระบบ JJ Calendar (จริงใจหมูกระทะ)
//
// วิธี deploy (ทำครั้งเดียว):
//   1. Supabase Dashboard → Edge Functions → Deploy a new function
//   2. ตั้งชื่อฟังก์ชันว่า  cal-feed  แล้ววางโค้ดไฟล์นี้ทั้งไฟล์ → Deploy
//   3. เข้าไปที่ฟังก์ชัน cal-feed → Settings → **ปิด "Verify JWT"** → Save
//      (ต้องปิด เพราะแอปปฏิทินบนมือถือแนบ Authorization header ไม่ได้
//       ถ้าไม่ปิด Supabase จะตอบ 401 ตั้งแต่ยังไม่ถึงโค้ดนี้)
//
// วิธีใช้ (แอป jjmk-calendar.html แท็บ "📲 เชื่อมมือถือ" สร้าง URL ให้อัตโนมัติ):
//   https://<project>.supabase.co/functions/v1/cal-feed?token=XXXX            → นัดทั้งองค์กร
//   https://<project>.supabase.co/functions/v1/cal-feed?token=XXXX&user=somchai → เฉพาะนัดที่ somchai ต้องเข้า
//   token ดูได้จากผลลัพธ์ตอนรัน jjmk-calendar.sql หรือ: select val->>'token' from cal_settings where id='feed';
//
// รหัสตอบกลับ (ใช้แยกอาการตอนกดปุ่ม "ทดสอบว่าฟีดใช้งานได้" ในแอป):
//   200 = ปกติ · 403 = token ไม่ตรง · 401 = ยังไม่ได้ปิด Verify JWT หรือยังไม่ได้ deploy
// ============================================================

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
// เวลาแบบระบุเวลา → UTC (Z)
function utc(d: string | Date) {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;
}
// นัดทั้งวัน → วันที่ตามเวลาไทย (UTC+7 คงที่ ไทยไม่มี DST)
function bkkDate(d: string | Date, addDays = 0) {
  const x = new Date(new Date(d).getTime() + (7 * 3600 + addDays * 86400) * 1000);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}`;
}
function esc(s: unknown) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
// RFC 5545: บรรทัดยาวเกิน 75 ไบต์ต้องพับ (fold) ต่อบรรทัดขึ้นต้นด้วยช่องว่าง
// นับเป็น "ไบต์" ไม่ใช่จำนวนตัวอักษร — ภาษาไทย 1 ตัว = 3 ไบต์ และเดินทีละตัวอักษรจริง
// ด้วย for...of เพื่อไม่ให้หั่นกลางอีโมจิ (ของเดิมหั่นทีละ 73 ตัว ทำให้อีโมจิพังและบรรทัดยาวเกินมาตรฐาน)
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 74) { out.push(cur); cur = ' '; bytes = 1; }   // บรรทัดต่อเริ่มด้วยช่องว่าง 1 ไบต์
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

type Attendee = { username: string; display_name?: string };

// อ่านข้อมูลจาก Supabase — ลองคีย์ service role ก่อน ถ้าใช้ไม่ได้ค่อยลอง anon
// (ตาราง cal_* เปิดสิทธิ์อ่านให้ anon อยู่แล้วตาม jjmk-calendar.sql จึงทำงานได้ทั้งสองแบบ)
async function sbGet(path: string) {
  const SB = Deno.env.get('SUPABASE_URL') || '';
  const keys = [
    ['service_role', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')],
    ['anon', Deno.env.get('SUPABASE_ANON_KEY')],
  ].filter(([, k]) => !!k) as [string, string][];
  if (!keys.length) throw new Error('Edge Function ไม่มีคีย์ของโปรเจกต์ (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)');
  let last = '';
  for (const [name, k] of keys) {
    const r = await fetch(SB + path, { headers: { apikey: k, Authorization: 'Bearer ' + k } });
    if (r.ok) return await r.json();
    last = `คีย์ ${name} อ่านไม่ได้ (HTTP ${r.status}: ${(await r.text()).slice(0, 160)})`;
  }
  throw new Error(last);
}

async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const user = (url.searchParams.get('user') || '').trim();

  const SB = Deno.env.get('SUPABASE_URL') || '';
  if (!SB) throw new Error('ไม่พบ SUPABASE_URL ใน Edge Function');

  // ตรวจ token กับ cal_settings (id='feed') — ไม่ตรงตอบ 403 เพื่อให้แยกจาก 401 ของ Verify JWT ได้
  const st = await sbGet('/rest/v1/cal_settings?id=eq.feed&select=val');
  const good = st?.[0]?.val?.token;
  if (!good) {
    throw new Error('ตาราง cal_settings ไม่มีแถว id=feed — รัน jjmk-calendar.sql ใน SQL Editor ก่อน');
  }
  if (token !== good) {
    return new Response('token ไม่ถูกต้อง — คัดลอก URL จากแท็บ "เชื่อมมือถือ" ในแอปใหม่อีกครั้ง', { status: 403, headers: CORS });
  }

  // ดึงนัดย้อนหลัง 60 วัน + อนาคตทั้งหมด (ที่ไม่ถูกยกเลิก)
  const since = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
  const evs = await sbGet(
    `/rest/v1/cal_events?select=*,cal_attendees(username,display_name)` +
    `&cancelled=eq.false&start_at=gte.${encodeURIComponent(since)}&order=start_at.asc&limit=2000`,
  );
  if (!Array.isArray(evs)) throw new Error('อ่านตาราง cal_events ไม่ได้ (ผลลัพธ์ไม่ใช่รายการ)');

  const list = user
    ? evs.filter((e) => e.created_by === user || (e.cal_attendees || []).some((a: Attendee) => a.username === user))
    : evs;

  const calName = user ? `นัด ${user} · จริงใจหมูกระทะ` : 'นัดองค์กร · จริงใจหมูกระทะ';
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JJ-PnL//JJ Calendar//TH',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    fold('X-WR-CALNAME:' + esc(calName)),
    'X-WR-TIMEZONE:Asia/Bangkok',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of list) {
    L.push('BEGIN:VEVENT', 'UID:' + e.id + '@jj-pnl', 'DTSTAMP:' + utc(e.updated_at || e.created_at));
    if (e.all_day) {
      // DTEND ของนัดทั้งวันเป็นแบบ exclusive → +1 วันจากวันสุดท้าย
      L.push('DTSTART;VALUE=DATE:' + bkkDate(e.start_at), 'DTEND;VALUE=DATE:' + bkkDate(e.end_at, 1));
    } else {
      L.push('DTSTART:' + utc(e.start_at), 'DTEND:' + utc(e.end_at));
    }
    L.push(fold('SUMMARY:' + esc(e.title)));
    const loc = [e.branch === 'ALL' ? '' : e.branch, e.location].filter(Boolean).join(' · ');
    if (loc) L.push(fold('LOCATION:' + esc(loc)));
    const who = (e.cal_attendees || []).map((a: Attendee) => a.display_name || a.username).join(', ');
    const desc = [e.detail, who ? 'ผู้เข้าร่วม: ' + who : '', 'สร้างโดย ' + (e.created_name || e.created_by)]
      .filter(Boolean).join('\n');
    L.push(fold('DESCRIPTION:' + esc(desc)));
    if (e.reminder_min > 0) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold('DESCRIPTION:' + esc(e.title)), `TRIGGER:-PT${e.reminder_min}M`, 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');

  return new Response(L.join('\r\n') + '\r\n', {
    headers: {
      ...CORS,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="jj-calendar.ics"',
      'Cache-Control': 'public, max-age=900',
    },
  });
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    // ตอบสาเหตุจริงกลับไปเป็นข้อความ เพื่อให้ปุ่มทดสอบในแอปบอกได้ว่าติดตรงไหน
    const msg = err instanceof Error ? err.message : String(err);
    return new Response('cal-feed ผิดพลาด: ' + msg, { status: 500, headers: CORS });
  }
});
