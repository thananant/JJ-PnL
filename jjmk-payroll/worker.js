/**
 * =============================================================
 *  JJ-Payroll — ตัวรับข้อมูลเครื่องสแกนใบหน้า (รับได้ 2 ยี่ห้อ)
 *  + ระบบส่งรายงานเข้ากลุ่ม LINE อัตโนมัติ (Cron Triggers)
 *  รันบน Cloudflare Workers (ฟรี 100,000 req/วัน)
 * =============================================================
 *  รองรับพร้อมกัน:
 *    • ZKTeco  (SmartAC1 / EFace10)  -> protocol iclock/ADMS
 *        path: /iclock/*   (เครื่องล็อกไว้ แก้ไม่ได้)
 *    • Hikvision (DS-K1T342 ฯลฯ)     -> ISAPI HTTP Listening
 *        path: /hik        (ตั้งเองได้ที่เครื่อง)
 *
 *  ---------- ระบบรายงาน LINE ----------
 *  1) รายงานรายกะ  : เวลาตายตัว (เวลาไทย)
 *       11:01 กะเช้า (รวมกะเช้าล้างจาน) · 15:01 กะกลาง · 18:01 กะเย็น+Part-Time
 *       แยกส่ง 1 ข้อความ/สาขา · นับเข้างานแยกตามตำแหน่ง
 *       + แจ้งคนที่ "ปกติอยู่กะนี้" แต่ยังไม่มา (เรียนรู้จากประวัติ 14 วัน)
 *  2) สรุปประจำวัน : 21:00 น. แยก 1 ข้อความ/สาขา นับหัวต่อกะ + สาย + คนไม่มา
 *
 *  Cron Triggers ที่ต้องตั้ง (Settings → Triggers → Cron Triggers) — เวลา UTC:
 *      1 4,8,11 * * *    <- รายงานรายกะ (= 11:01 / 15:01 / 18:01 เวลาไทย)
 *      0 14 * * *        <- สรุปประจำวัน (= 21:00 เวลาไทย)
 *
 *  Secret ที่ต้องตั้งใน Worker (Settings → Variables and Secrets):
 *    SUPABASE_URL   = https://aikyxvluaiubdidqxwnd.supabase.co
 *    SUPABASE_KEY   = sb_publishable_xxxxx
 *    LINE_TOKEN     = Channel access token (LINE Developers → Messaging API)
 *    LINE_GROUP_ID  = Cxxxxxxxx... (พิมพ์ "groupid" ในกลุ่มหลังเชิญบอทเพื่อดู)
 *    LATE_GRACE_MIN = 5            (ไม่บังคับ — เกินกี่นาทีถึงนับว่าสาย)
 *    BRANCH_MAP     = (ไม่บังคับ) แมพเครื่องสแกน -> สาขา กรณี dept ว่าง
 *                     รูปแบบ:  SN1=ลาดพร้าว,SN2=รัชดา
 *                     เช่น:    GG1207018=ลาดพร้าว,GG9999999=รัชดา
 *                     (ดูรายชื่อเครื่องที่เคยส่งข้อมูลได้ที่ /report/check)
 *
 *  ตั้ง Webhook URL ใน LINE Developers:
 *    https://<worker>/line-webhook   (เปิด Use webhook)
 * =============================================================
 */

const DEVICE_OPTIONS = (sn) => [
  `GET OPTION FROM: ${sn}`,
  'Stamp=9999', 'OpStamp=9999', 'ErrorDelay=30', 'Delay=30',
  'TransTimes=00:00;14:05', 'TransInterval=1', 'TransFlag=1111000000',
  'TimeZone=7', 'Realtime=1', 'Encrypt=0',
].join('\n');

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const snQ = url.searchParams.get('SN') || '';

    // อ่าน body ครั้งเดียว (Hikvision อาจแนบรูปมาด้วย -> อ่านแค่ 64KB แรกพอ)
    let raw = '';
    if (method === 'POST') {
      try {
        const buf = await request.arrayBuffer();
        raw = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 65536));
      } catch (_) { raw = ''; }
    }

    // เก็บ log ดิบทุก request (ไว้ดูของจริงตอนเครื่องมาถึง)
    ctx.waitUntil(logRaw(env, { sn: snQ, method, path, query: url.search, body: raw }));

    const t = (s) => new Response(s, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    try {
      /* ============ HIKVISION : ISAPI HTTP Listening ============ */
      if (path.startsWith('/hik')) {
        const n = await saveHikEvent(env, raw);
        return new Response(JSON.stringify({ status: 'ok', saved: n }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }

      /* ============ ZKTECO : iclock / ADMS ============ */
      if (method === 'GET' && path.includes('/cdata')) {
        ctx.waitUntil(touchDevice(env, snQ));
        return t(DEVICE_OPTIONS(snQ));
      }
      if (method === 'POST' && path.includes('/cdata')) {
        const table = (url.searchParams.get('table') || '').toUpperCase();
        ctx.waitUntil(touchDevice(env, snQ));
        if (table === 'ATTLOG') return t(`OK: ${await saveAttlog(env, snQ, raw)}`);
        return t('OK');
      }
      if (method === 'GET' && path.includes('/getrequest')) {
        ctx.waitUntil(touchDevice(env, snQ));
        return t('OK');
      }
      if (method === 'POST' && path.includes('/devicecmd')) return t('OK');

      /* ============ LINE Webhook (ไว้ดู Group ID) ============ */
      if (path === '/line-webhook') {
        ctx.waitUntil(handleLineWebhook(env, raw));
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }

      /* ============ ทดสอบรายงาน (พรีวิว/ยิงจริง) ============ */
      // เปิดในเบราว์เซอร์เพื่อดูข้อความก่อน  ->  /report/daily
      // เติม ?send=1 เพื่อส่งเข้ากลุ่มจริง   ->  /report/daily?send=1
      if (path === '/report/daily') {
        const texts = await buildDailySummary(env);
        if (url.searchParams.get('send') === '1') {
          await linePush(env, texts);
          return t('✅ ส่งสรุปประจำวันเข้ากลุ่มแล้ว\n\n' + texts.join('\n\n---\n\n'));
        }
        return t('[พรีวิว — ยังไม่ได้ส่ง ให้เติม ?send=1 เพื่อส่งจริง]\n\n' + texts.join('\n\n---\n\n'));
      }
      // หน้าตรวจข้อมูลดิบ: กะที่พบ / dept ของพนักงาน / เครื่องสแกนวันนี้ / ผลแยกสาขา
      if (path === '/report/check') return t(await runReportCheck(env));

      if (path === '/report/shift') {
        const reports = await buildShiftReports(env, { force: true });
        const texts = reports.map((r) => r.text);
        if (!texts.length) return t('ไม่พบกะในตาราง shifts หรือยังไม่มีเวลาเริ่มกะ');
        if (url.searchParams.get('send') === '1') {
          await linePush(env, texts);
          return t('✅ ส่งรายงานรายกะเข้ากลุ่มแล้ว\n\n' + texts.join('\n\n---\n\n'));
        }
        return t('[พรีวิว — ยังไม่ได้ส่ง ให้เติม ?send=1 เพื่อส่งจริง]\n\n' + texts.join('\n\n---\n\n'));
      }

      /* ============ หน้าตรวจสอบระบบ ============ */
      if (path === '/debug') return t(await runDebug(env));

      if (path === '/' || path === '/health') {
        return t(
          'JJ-Payroll — ตัวรับข้อมูลเครื่องสแกน พร้อมทำงาน\n' +
          '\n[ ZKTeco SmartAC1 / EFace10 ]\n' +
          '  COMM. > Cloud Server Setting\n' +
          `  Server Address = ${url.hostname}\n` +
          '  Server Port    = 443   (เปิด Enable Domain Name)\n' +
          '\n[ Hikvision DS-K1T342 ]\n' +
          '  Network > HTTP Listening  (หรือ Event > Basic Event > HTTP Listening)\n' +
          `  IP / Domain = ${url.hostname}\n` +
          '  Port        = 443\n' +
          '  URL         = /hik\n' +
          '  Protocol    = HTTPS   (ถ้าไม่มีให้เลือก HTTP -> ดูแผนสำรองในคู่มือ)\n' +
          '\n[ รายงาน LINE ]\n' +
          `  พรีวิวสรุปประจำวัน : https://${url.hostname}/report/daily\n` +
          `  พรีวิวรายงานรายกะ  : https://${url.hostname}/report/shift\n` +
          '  (เติม ?send=1 ท้าย URL เพื่อส่งเข้ากลุ่มจริง)\n' +
          '\n[ ตรวจสอบระบบ ]\n' +
          `  https://${url.hostname}/debug\n`
        );
      }
      return t('OK');
    } catch (err) {
      // ห้ามตอบ error กลับไปหาเครื่องเด็ดขาด ไม่งั้นเครื่องจะคิดว่า server ล่มแล้วหยุดส่ง
      ctx.waitUntil(logRaw(env, { sn: snQ, method, path, query: 'ERROR', body: String(err) }));
      return t('OK');
    }
  },

  /* ============ Cron Triggers ============ */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled(event, env));
  },
};

/* =============================================================
 *  CRON — เลือกงานตามตาราง cron ที่ตั้งไว้
 *    '0 14 * * *'  -> สรุปประจำวัน 21:00 ไทย
 *    อื่นๆ (*​/30)  -> เช็คว่ามีกะไหนถึงเวลารายงานหรือยัง
 * ============================================================= */
async function runScheduled(event, env) {
  try {
    const cron = String(event.cron || '').trim();
    if (cron === '0 14 * * *') {
      await linePush(env, await buildDailySummary(env));
    } else {
      const reports = await buildShiftReports(env, { force: false });
      if (reports.length) await linePush(env, reports.map((r) => r.text));
    }
  } catch (e) {
    await logRaw(env, { sn: 'CRON', method: 'CRON', path: String(event.cron || ''), query: 'ERROR', body: String(e) });
  }
}

/* =============================================================
 *  เอนจินรายงาน — พอร์ตตรรกะชุดเดียวกับหน้า index (Today Dashboard)
 *  · สาขา: employees.branch (JJLP/JJRD/OFFICE) · เครื่องสแกน: devices.branch
 *  · จุดตัดวัน cutoff_hour (ตอกก่อนตี 6 = กะของเมื่อวาน)
 *  · จับกะจากเวลาออก (ตอกออกใกล้เวลาเลิกกะไหนสุด = กะนั้น) + กะล็อกรายคน + dept_only
 *  · อนุโลมเข้า/ออก ตาม in_grace / out_grace ของแต่ละกะ
 *  · Parttime = work_mode 'hourly' · ออฟฟิศสแกนที่ลาดพร้าว = ไม่ใช่ข้ามสาขา
 * ============================================================= */
const BRT = { JJLP: 'ลาดพร้าว', JJRD: 'รัชดา', JJCK: 'ครัวกลาง', OFFICE: 'ออฟฟิศ' };
const brName = (b) => BRT[b] || (b || 'ไม่ระบุสาขา');

/* ---------- โหลดข้อมูลของ 1 วันทำงาน (business day) ---------- */
async function loadDay(env, day) {
  const d2 = nextDayStr(day);
  const [st, defsRaw, empRows, devRows, holiRows, pRows] = await Promise.all([
    safeJson(await sb(env, 'payroll_settings?select=cutoff_hour&id=eq.1', { method: 'GET' })),
    safeJson(await sb(env, 'shifts?select=*&order=sort_order', { method: 'GET' })),
    safeJson(await sb(env, 'employees?select=*&active=eq.true&limit=2000', { method: 'GET' })),
    safeJson(await sb(env, 'devices?select=sn,branch', { method: 'GET' })),
    safeJson(await sb(env, `holidays?select=*&day=eq.${day}`, { method: 'GET' })),
    safeJson(await sb(env, `punches?select=emp_code,punch_date,punch_time,device_sn&punch_date=in.(${day},${d2})&order=punch_date,punch_time&limit=8000`, { method: 'GET' })),
  ]);
  const cutoff = (st[0] && st[0].cutoff_hour != null) ? +st[0].cutoff_hour : 6;

  // เวลาเริ่ม/เลิกกะ เป็นนาที (กะข้ามคืน endMin +1440)
  const defs = defsRaw.map((s) => {
    const a = toMin(s.start_time), b0 = toMin(s.end_time);
    if (a == null || b0 == null) return null;
    return { id: s.id, name: s.name, startMin: a, endMin: b0 <= a ? b0 + 1440 : b0,
             inGrace: +(s.in_grace || 0), outGrace: +(s.out_grace || 0),
             deptOnly: String(s.dept_only || '').trim(), sort: +(s.sort_order || 0) };
  }).filter(Boolean);

  const emps = new Map(empRows.map((e) => [e.code, e]));

  // เครื่อง -> สาขา: จากตาราง devices ก่อน แล้วทับด้วย BRANCH_MAP (ถ้าตั้ง)
  const devBranch = {};
  for (const d of devRows) if (d.branch) devBranch[d.sn] = d.branch;
  for (const pair of String(env.BRANCH_MAP || '').split(',')) {
    const [sn, br] = pair.split('=').map((x) => (x || '').trim());
    if (sn && br) devBranch[sn] = br;
  }

  // การตอกของ "วันทำงาน" นี้: วันเดียวกันตั้งแต่ cutoff เป็นต้นไป + วันถัดไปก่อน cutoff (+1440)
  const byEmp = new Map(); // code -> [{m, sn}]
  const cm = cutoff * 60;
  for (const p of pRows) {
    let m = toMin(p.punch_time);
    if (m == null) continue;
    if (p.punch_date === day) { if (m < cm) continue; }
    else { if (m >= cm) continue; m += 1440; }
    if (!byEmp.has(p.emp_code)) byEmp.set(p.emp_code, []);
    byEmp.get(p.emp_code).push({ m, sn: p.device_sn || '' });
  }
  for (const ts of byEmp.values()) ts.sort((a, b) => a.m - b.m);

  return { day, cutoff, defs, emps, devBranch, holi: holiRows[0] || null, byEmp };
}

/* ---------- ตรรกะกะ (พอร์ตจาก index) ---------- */
const shiftsForEmp = (emp, defs) => {
  // เทียบเงื่อนไข "เฉพาะแผนก" กับทั้ง แผนก และ ตำแหน่ง ของพนักงาน
  // (ในระบบจริง "ล้างจาน" เป็นตำแหน่งใต้แผนก Kitchen ไม่ใช่ชื่อแผนก)
  const hay = emp ? `${emp.dept || ''} ${emp.position || ''}` : '';
  let list = defs.filter((sh) => !sh.deptOnly || hay.includes(sh.deptOnly));
  if (!list.length) list = defs;
  // กะเฉพาะกลุ่ม "ทับ" กะหลักชื่อเดียวกัน:
  // คนล้างจานมีสิทธิ์ "กะเช้า (ล้างจาน)" -> ตัด "กะเช้า" ปกติออกจากตัวเลือกอัตโนมัติ
  const owned = list.filter((sh) => sh.deptOnly && hay.includes(sh.deptOnly));
  if (owned.length) {
    list = list.filter((sh) => sh.deptOnly || !owned.some((o) => o.name.startsWith(sh.name)));
  }
  return list.length ? list : defs;
};
function chooseShift(ts, emp, defs) {
  // ตอกครบเข้า-ออก: ให้คะแนนจาก "ทั้งสองด้าน" = |เข้า-เริ่มกะ| + 2×|ออก-เลิกกะ|
  //   (ถ่วงน้ำหนักเวลาออก ×2 เพราะเวลาออกแยกกะได้ชัดกว่า เช่น เข้า 17:30 เป็นได้ทั้งกลาง/เย็น)
  //   ทำให้เคสอย่างล้างจาน 11:00-20:00 vs กะเช้า 10:00-19:00 แยกออกอัตโนมัติ:
  //   เข้า 11:10 ออก 19:25 -> ล้างจาน (10+70=80) ชนะ กะเช้า (70+50=120) แม้เวลาออกใกล้ 19:00 กว่า
  // ตอกครั้งเดียว: เทียบทั้งเวลาเริ่มและเลิก เอาที่ใกล้สุด (ลืมเข้าหรือลืมออกก็จับถูก)
  const cands = shiftsForEmp(emp, defs);
  const first = ts[0].m, last = ts[ts.length - 1].m;
  let best = cands[0], bd = Infinity;
  for (const sh of cands) {
    const d = ts.length > 1
      ? Math.abs(first - sh.startMin) + 2 * Math.abs(last - sh.endMin)
      : Math.min(Math.abs(first - sh.startMin), Math.abs(first - sh.endMin));
    if (d < bd) { bd = d; best = sh; }
  }
  return best;
}
function estLate(firstMin, emp, defs) {
  // ระหว่างวัน (ยังไม่ตอกออก) ประเมินสายจากกะที่เวลาเริ่มใกล้ที่สุด — เหมือน lateOf ในหน้า index
  let best = null, bd = Infinity;
  for (const sh of shiftsForEmp(emp, defs)) {
    const d = Math.abs(firstMin - sh.startMin);
    if (d < bd) { bd = d; best = sh; }
  }
  return best ? Math.max(0, firstMin - best.startMin - (best.inGrace || 0)) : 0;
}
const closestM = (ts, target) => ts.reduce((a, b) => Math.abs(b.m - target) < Math.abs(a.m - target) ? b : a);

/* ---------- คำนวณ record ของทุกคนใน 1 วัน ----------
 * nowBizMin: เวลาปัจจุบันแบบ business-day (หลังเที่ยงคืน +1440) · null = วันจบแล้ว */
function computeRecs(data, nowBizMin) {
  const recs = new Map();
  for (const [code, ts] of data.byEmp) {
    const e = data.emps.get(code);
    // สาขาที่สแกนวันนั้น = เครื่องที่ตอกบ่อยสุด
    const cnt = {};
    for (const t of ts) { const b = data.devBranch[t.sn]; if (b) cnt[b] = (cnt[b] || 0) + 1; }
    let wb = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '';
    if (e && e.branch === 'OFFICE' && wb === 'JJLP') wb = 'OFFICE';
    if (e && e.branch === 'JJCK' && wb === 'JJLP') wb = 'JJCK';   // ครัวกลางใช้เครื่องสแกนลาดพร้าว ไม่ใช่ข้ามสาขา

    const mode = e ? (e.work_mode || 'shift') : 'shift';
    const rec = { code, wb, mode, inM: ts[0].m, outM: ts[ts.length - 1].m,
                  single: ts.length === 1, working: false, lateMin: 0, shiftName: '', sh: null };

    if (mode === 'hourly') {
      rec.shiftName = 'Parttime';
    } else if (mode === 'hours') {
      rec.shiftName = 'นับชั่วโมง';
    } else {
      const locked = e && e.shift_id ? data.defs.find((x) => x.id === e.shift_id) : null;
      const sh = locked || chooseShift(ts, e, data.defs);
      rec.sh = sh; rec.shiftName = sh ? sh.name : '–';
      if (sh) {
        const pin = closestM(ts, sh.startMin), pout = closestM(ts, sh.endMin);
        const single = ts.length === 1 || pin.m === pout.m || pout.m <= pin.m;
        if (single) {
          rec.single = true;
          // ยังไม่ถึงเวลาเลิกกะ = กำลังทำงาน (ไม่ใช่ลืมตอก) — ประเมินสายจากเวลาเข้า
          rec.working = nowBizMin != null && nowBizMin < sh.endMin + (sh.outGrace || 0);
          rec.lateMin = estLate(ts[0].m, e, data.defs);
        } else {
          rec.single = false;
          rec.inM = pin.m; rec.outM = pout.m;
          rec.lateMin  = Math.max(0, rec.inM - sh.startMin - (sh.inGrace || 0));
          rec.earlyMin = Math.max(0, sh.endMin - rec.outM - (sh.outGrace || 0));
        }
      }
    }
    recs.set(code, rec);
  }
  return recs;
}

const isOffWd = (e, day) => {
  const s = String(e.off_weekdays || '');
  if (!s) return false;
  const wd = new Date(day + 'T12:00:00Z').getUTCDay();
  return s.split(',').includes(String(wd));
};

/* ---------- วันทำงานปัจจุบัน (คิด cutoff แล้ว) ---------- */
function bizNow(cutoff) {
  const th = thaiNow();
  if (th.min < cutoff * 60) {
    const y = new Date(new Date(th.date + 'T12:00:00Z').getTime() - 86400000);
    return { day: y.toISOString().slice(0, 10), nowBizMin: th.min + 1440, th };
  }
  return { day: th.date, nowBizMin: th.min, th };
}

/* =============================================================
 *  ตัวช่วยดึงข้อมูลแบบแบ่งหน้า (PostgREST คืนสูงสุด ~1000 แถว/ครั้ง)
 * ============================================================= */
async function fetchAll(env, pathQuery, pageSize = 1000, maxRows = 20000) {
  const out = [];
  for (let off = 0; off < maxRows; off += pageSize) {
    const sep = pathQuery.includes('?') ? '&' : '?';
    const rows = await safeJson(await sb(env, `${pathQuery}${sep}limit=${pageSize}&offset=${off}`, { method: 'GET' }));
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
function addDays(dateStr, n) {
  const d = new Date(new Date(dateStr + 'T12:00:00Z').getTime() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ---------- เรียนรู้ "กะประจำ" ของแต่ละคนจากประวัติ 14 วัน ----------
 * ใครถูกจับเข้ากะไหนบ่อยสุดใน 2 สัปดาห์ = กะประจำของคนนั้น
 * (กะที่ล็อกไว้ในหน้าพนักงานชนะเสมอ) — ใช้บอกว่า "ใครควรเข้ากะนี้แต่ยังไม่มา" */
async function usualShifts(env, data) {
  const since = addDays(data.day, -14);
  const rows = await fetchAll(env,
    `punches?select=emp_code,punch_date,punch_time&punch_date=gte.${since}&punch_date=lt.${data.day}&order=punch_date,punch_time`);
  const cm = data.cutoff * 60;
  const byEmpDay = new Map(); // code|day -> [m,...]
  for (const p of rows) {
    let m = toMin(p.punch_time);
    if (m == null) continue;
    let d = p.punch_date;
    if (m < cm) { d = addDays(d, -1); m += 1440; }
    const k = p.emp_code + '|' + d;
    if (!byEmpDay.has(k)) byEmpDay.set(k, []);
    byEmpDay.get(k).push(m);
  }
  const tally = new Map(); // code -> Map(shiftName -> count)
  for (const [k, arr] of byEmpDay) {
    const code = k.split('|')[0];
    const e = data.emps.get(code);
    if (!e || (e.work_mode || 'shift') !== 'shift') continue;
    arr.sort((a, b) => a - b);
    const ts = arr.map((m) => ({ m }));
    const locked = e.shift_id ? data.defs.find((x) => x.id === e.shift_id) : null;
    const sh = locked || chooseShift(ts, e, data.defs);
    if (!sh) continue;
    if (!tally.has(code)) tally.set(code, new Map());
    const t = tally.get(code);
    t.set(sh.name, (t.get(sh.name) || 0) + 1);
  }
  const usual = new Map(); // code -> shiftName
  for (const e of data.emps.values()) {
    if ((e.work_mode || 'shift') !== 'shift') continue;
    const locked = e.shift_id ? data.defs.find((x) => x.id === e.shift_id) : null;
    if (locked) { usual.set(e.code, locked.name); continue; }
    const t = tally.get(e.code);
    if (!t) continue;
    let best = '', bn = 0;
    for (const [n, c] of t) if (c > bn) { best = n; bn = c; }
    if (best) usual.set(e.code, best);
  }
  return usual;
}

/* ---------- ลำดับสาขา: หลัก 3 สาขาก่อน แล้วตามด้วยสาขาใหม่ในอนาคต ---------- */
function branchList(data, recs) {
  const set = new Set();
  for (const e of data.emps.values()) if (e.branch) set.add(e.branch);
  for (const r of recs.values()) if (r.wb) set.add(r.wb);
  const main = ['JJLP', 'JJRD', 'JJCK', 'OFFICE'];
  const rest = [...set].filter((b) => !main.includes(b)).sort();
  return [...main.filter((b) => set.has(b)), ...rest];
}

/* =============================================================
 *  รายงานรายกะ — เวลาตายตัวหลังกะเริ่ม (cron: 1 4,8,11 * * * UTC)
 *    11:01 กะเช้า (รวมกะเช้าล้างจาน) · 15:01 กะกลาง · 18:01 กะเย็น (+Part-Time)
 *  แยกส่ง 1 ข้อความ / สาขา · นับเข้างานแยกตามตำแหน่ง · แจ้งคนที่ควรเข้ากะนี้แต่ยังไม่มา
 * ============================================================= */
async function buildShiftReports(env, { force }) {
  const th = thaiNow();
  const pre = await loadDay(env, th.date);
  const { day, nowBizMin } = bizNow(pre.cutoff);
  const data = day === pre.day ? pre : await loadDay(env, day);

  // กะที่ "เพิ่งเริ่ม" ในรอบ 70 นาทีที่ผ่านมา — 11:01 จะเก็บทั้งกะเช้า 10:00 และล้างจาน 11:00
  const due = force ? data.defs
    : data.defs.filter((sh) => {
        const s = sh.startMin % 1440;
        return th.min >= s && th.min - s < 70;
      });
  if (!due.length) return [];
  const dueNames = new Set(due.map((s) => s.name));

  const recs = computeRecs(data, nowBizMin);
  const usual = await usualShifts(env, data);
  const texts = [];
  const title = `รายงานกะ ${due.map((s) => s.name).join(' + ')}`;
  const emoji = shEmoji(due[0].name);

  for (const b of branchList(data, recs)) {
    // เข้าแล้ว = คนโหมดกะที่ถูกจับเข้ากะในชุดนี้ และสแกนที่สาขานี้
    const came = [];
    for (const r of recs.values()) {
      if (r.mode !== 'shift' || !dueNames.has(r.shiftName)) continue;
      const e = data.emps.get(r.code);
      const wb = r.wb || (e && e.branch) || '';
      if (wb === b) came.push({ r, e });
    }
    // ควรเข้ากะนี้แต่ยังไม่มา = กะประจำอยู่ในชุดนี้ + สังกัดสาขานี้ + วันนี้ยังไม่สแกนเลย + ไม่ติดวันหยุดประจำ
    const expectedAbsent = [...data.emps.values()].filter((e) =>
      e.branch === b && (e.work_mode || 'shift') === 'shift' &&
      dueNames.has(usual.get(e.code)) && !recs.has(e.code) && !isOffWd(e, day));

    if (!came.length && !expectedAbsent.length) continue;

    const late = came.filter((x) => x.r.lateMin > 0);
    const lines = [`${emoji} ${title}`, `🏢 ${brName(b)} · ${thDateLabel(day)} ${minToHM(th.min)}${data.holi ? ` · 🎌 ${data.holi.name}` : ''}`, '━━━━━━━━━━━━'];
    lines.push(`✅ เข้างานแล้ว ${came.length} คน${late.length ? ` (สาย ${late.length})` : ''}`);

    // นับแยกตามตำแหน่ง
    if (came.length) {
      const pos = new Map();
      for (const { e } of came) {
        const p = (e && (e.position || e.dept)) || 'ไม่ระบุ';
        pos.set(p, (pos.get(p) || 0) + 1);
      }
      lines.push('• ' + [...pos.entries()].sort((a, b2) => b2[1] - a[1])
        .map(([p, n]) => `${p} ${n}`).join(' · '));
    }
    if (late.length) {
      lines.push(`⏰ มาสาย ${late.length} คน`);
      for (const { r } of late.sort((a, b2) => b2.r.lateMin - a.r.lateMin))
        lines.push(`• ${empNick(data.emps, r.code)} สาย ${r.lateMin} น. (เข้า ${minToHM(r.inM % 1440)})`);
    }
    if (expectedAbsent.length) {
      lines.push(`❌ ยังไม่เข้างาน ${expectedAbsent.length} คน (ปกติอยู่กะนี้)`);
      for (const e of expectedAbsent) lines.push(`• ${e.nick || e.code}${e.position ? ` (${e.position})` : ''}`);
    }
    texts.push({ shift: title + ' · ' + brName(b), text: lines.join('\n') });
  }
  return texts;
}

/* =============================================================
 *  สรุปประจำวัน 21:00 — แยก 1 ข้อความ / สาขา
 *  นับหัวต่อกะ + สาย + คนไม่มา · ปิดท้ายด้วยยอดรวมทุกสาขา
 * ============================================================= */
async function buildDailySummary(env) {
  const pre = await loadDay(env, thaiNow().date);
  const { day, nowBizMin } = bizNow(pre.cutoff);
  const data = day === pre.day ? pre : await loadDay(env, day);
  const recs = computeRecs(data, nowBizMin);

  const shOrder = data.defs.map((s) => s.name);
  const texts = [];
  let tIn = 0, tLate = 0, tOff = 0;

  for (const b of branchList(data, recs)) {
    const staff = [...data.emps.values()].filter((e) => e.branch === b);
    const came = [];
    for (const r of recs.values()) {
      const e = data.emps.get(r.code);
      const wb = r.wb || (e && e.branch) || '';
      if (wb === b) came.push({ r, e });
    }
    if (!staff.length && !came.length) continue;

    const absent = staff.filter((e) => !recs.has(e.code));
    const offWd = absent.filter((e) => isOffWd(e, day));
    const noShow = absent.filter((e) => !isOffWd(e, day));
    const late = came.filter((x) => x.r.lateMin > 0);
    tIn += came.length; tLate += late.length; tOff += noShow.length;

    const lines = [`📋 สรุปวันนี้ · ${brName(b)}`,
                   `📅 ${thDateLabel(day)}${data.holi ? ` · 🎌 ${data.holi.name} ×${data.holi.multiplier}` : ''}`, '━━━━━━━━━━━━'];

    // นับหัวต่อกะ (เรียงตามลำดับกะ) + Parttime + นับชั่วโมง
    const bySh = new Map();
    for (const x of came) {
      const k = x.r.mode === 'hourly' ? 'Parttime' : x.r.shiftName;
      if (!bySh.has(k)) bySh.set(k, []);
      bySh.get(k).push(x);
    }
    const keys = [...bySh.keys()].sort((a, b2) => {
      const ia = shOrder.indexOf(a), ib = shOrder.indexOf(b2);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b2, 'th');
    });
    for (const k of keys) {
      const g = bySh.get(k);
      const gl = g.filter((x) => x.r.lateMin > 0).length;
      lines.push(`${shEmoji(k)} ${k} : ${g.length} คน${gl ? ` (สาย ${gl})` : ''}`);
    }
    lines.push('━━━━━━━━━━━━', `👥 เข้างานรวม ${came.length} คน · สาย ${late.length} คน · ไม่มา ${noShow.length} คน`);

    if (late.length) {
      lines.push(`⏰ มาสาย:`);
      for (const { r } of late.sort((a, b2) => b2.r.lateMin - a.r.lateMin))
        lines.push(`• ${empNick(data.emps, r.code)} +${r.lateMin} น. (เข้า ${minToHM(r.inM % 1440)})`);
    }
    if (noShow.length) {
      lines.push(`❌ ไม่มา: ${noShow.map((e) => e.nick || e.code).join(', ')}`);
    }
    if (offWd.length) lines.push(`🛌 วันหยุดประจำ: ${offWd.map((e) => e.nick || e.code).join(', ')}`);
    texts.push(lines.join('\n'));
  }

  texts.push(`👥 รวมทุกสาขา · ${thDateLabel(day)}\nเข้างาน ${tIn} คน · สาย ${tLate} คน · ไม่มา ${tOff} คน\n(กะเย็นที่ยังไม่เลิกงานนับเป็นเข้างานแล้ว · ยังไม่หักวันลา)`);
  return texts.flatMap((t) => chunkText(t));
}
/* =============================================================
 *  /report/check — ตรวจว่าระบบมองเห็นอะไร
 * ============================================================= */
async function runReportCheck(env) {
  const pre = await loadDay(env, thaiNow().date);
  const { day, nowBizMin } = bizNow(pre.cutoff);
  const data = day === pre.day ? pre : await loadDay(env, day);
  const recs = computeRecs(data, nowBizMin);
  const o = [`=== ตรวจข้อมูลรายงาน (วันทำงาน ${thDateLabel(day)}) ===`, `จุดตัดวัน (cutoff): ${String(data.cutoff).padStart(2, '0')}:00`];

  o.push('', '[ กะในตาราง shifts ]');
  for (const s of data.defs)
    o.push(`  • ${s.name}  ${minToHM(s.startMin % 1440)}–${minToHM(s.endMin % 1440)}  อนุโลมเข้า ${s.inGrace} น. / ออก ${s.outGrace} น.${s.deptOnly ? `  (เฉพาะแผนก: ${s.deptOnly})` : ''}`);

  o.push('', '[ สาขาของพนักงาน (employees.branch) ]');
  const bc = new Map();
  for (const e of data.emps.values()) { const k = e.branch || '(ว่าง)'; bc.set(k, (bc.get(k) || 0) + 1); }
  for (const [k, n] of bc) o.push(`  • ${k === '(ว่าง)' ? k : brName(k)} : ${n} คน`);
  if (bc.has('(ว่าง)')) o.push('  👉 มีคน branch ว่าง — ตั้งได้ในหน้าพนักงานของแอป (คนพวกนี้ถ้าไม่สแกนจะขึ้น "ไม่ระบุสาขา")');

  o.push('', '[ work_mode ]');
  const wm = new Map();
  for (const e of data.emps.values()) { const k = e.work_mode || '(ว่าง)'; wm.set(k, (wm.get(k) || 0) + 1); }
  o.push('  ' + [...wm].map(([k, n]) => `${k}=${n}คน`).join(' · ') + '   (hourly = Parttime)');

  o.push('', '[ เครื่องสแกน -> สาขา (devices.branch) ]');
  const seen = new Map();
  for (const ts of data.byEmp.values()) for (const t of ts) if (t.sn) seen.set(t.sn, (seen.get(t.sn) || 0) + 1);
  if (!seen.size) o.push('  (วันนี้ยังไม่มีสแกน)');
  for (const [sn, n] of seen)
    o.push(`  • ${sn} : ${n} ครั้ง  ->  ${data.devBranch[sn] ? brName(data.devBranch[sn]) : '⚠️ ยังไม่ผูกสาขา! ไปที่ตาราง devices ใส่คอลัมน์ branch = JJLP หรือ JJRD (หรือตั้ง BRANCH_MAP)'}`);

  o.push('', '[ ผลคำนวณวันนี้ ]');
  const cnt = { JJLP: 0, JJRD: 0, OFFICE: 0, other: 0 };
  let lateN = 0, ptN = 0, workingN = 0;
  for (const r of recs.values()) {
    const e = data.emps.get(r.code);
    const wb = r.wb || (e && e.branch) || '';
    if (cnt[wb] != null) cnt[wb]++; else cnt.other++;
    if (r.lateMin > 0) lateN++;
    if (r.mode === 'hourly') ptN++;
    if (r.working) workingN++;
  }
  o.push(`  เข้างาน: ลาดพร้าว ${cnt.JJLP} · รัชดา ${cnt.JJRD} · ออฟฟิศ ${cnt.OFFICE}${cnt.other ? ` · ไม่ระบุ ${cnt.other}` : ''}`);
  o.push(`  สาย ${lateN} คน · Parttime ${ptN} คน · กำลังทำงานอยู่ (ยังไม่ตอกออก) ${workingN} คน`);

  o.push('', 'พรีวิวข้อความจริง: /report/daily และ /report/shift (เติม ?send=1 เพื่อส่งเข้ากลุ่ม)');
  return o.join('\n');
}

/* ============ ตัวช่วยเล็กๆ ============ */
function empNick(emps, code) { const e = emps.get(code); return e ? (e.nick || e.full_name || code) : code; }
function shEmoji(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('part') || n.includes('พาร์ท') || n.includes('ชั่วโมง')) return '🧢';
  if (n.includes('เช้า')) return '🌅';
  if (n.includes('กลาง') || n.includes('บ่าย')) return '🌤';
  if (n.includes('เย็น') || n.includes('ดึก') || n.includes('ค่ำ')) return '🌙';
  return '🕐';
}
function thaiNow() {
  const d = new Date(Date.now() + 7 * 3600000);
  return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function thDateLabel(dateStr) {
  const [y, mo, da] = dateStr.split('-');
  return `${da}/${mo}/${parseInt(y, 10) + 543}`;
}
function nextDayStr(dateStr) {
  const d = new Date(new Date(dateStr + 'T12:00:00Z').getTime() + 86400000);
  return d.toISOString().slice(0, 10);
}
function toMin(t) {
  if (t == null) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function minToHM(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function chunkText(text, size = 4500) {
  if (text.length <= size) return [text];
  const out = [];
  let cur = '';
  for (const l of text.split('\n')) {
    if ((cur + '\n' + l).length > size) { out.push(cur); cur = l; }
    else cur = cur ? cur + '\n' + l : l;
  }
  if (cur) out.push(cur);
  return out;
}
/* =============================================================
 *  LINE Messaging API
 * ============================================================= */
async function linePush(env, texts) {
  if (!env.LINE_TOKEN || !env.LINE_GROUP_ID) {
    throw new Error('ยังไม่ได้ตั้ง Secret: LINE_TOKEN / LINE_GROUP_ID');
  }
  const msgs = texts.filter(Boolean);
  for (let i = 0; i < msgs.length; i += 5) {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.LINE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: env.LINE_GROUP_ID,
        messages: msgs.slice(i, i + 5).map((t) => ({ type: 'text', text: t.slice(0, 4999) })),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      await logRaw(env, { sn: 'LINE', method: 'PUSH', path: '/push', query: `HTTP ${res.status}`, body: err });
      throw new Error(`LINE push ล้มเหลว HTTP ${res.status}: ${err.slice(0, 300)}`);
    }
  }
}

// Webhook: เชิญบอทเข้ากลุ่มแล้วพิมพ์ "groupid" -> บอทตอบ Group ID กลับมา
async function handleLineWebhook(env, raw) {
  let j; try { j = JSON.parse(raw); } catch (_) { return; }
  for (const ev of j.events || []) {
    const gid = ev.source && (ev.source.groupId || ev.source.roomId);
    if (!gid) continue;
    // จด Group ID ไว้ใน log เสมอ (ดูได้ที่ตาราง device_log, sn = LINE)
    await logRaw(env, { sn: 'LINE', method: 'WEBHOOK', path: '/line-webhook', query: ev.type || '', body: `groupId = ${gid}` });
    // ตอบกลับเมื่อพิมพ์คำว่า groupid เท่านั้น (จะได้ไม่รบกวนแชทปกติ)
    const text = ev.message && ev.message.type === 'text' ? String(ev.message.text || '').toLowerCase() : '';
    if (ev.replyToken && (text.includes('groupid') || text.trim() === 'id')) {
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.LINE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: `📌 Group ID ของกลุ่มนี้:\n${gid}\n\nนำไปตั้งเป็น Secret ชื่อ LINE_GROUP_ID ใน Cloudflare Worker แล้วกด Deploy` }],
        }),
      });
    }
  }
}

/* =============================================================
 *  HIKVISION
 * -------------------------------------------------------------
 *  เครื่องส่ง POST มาเป็น multipart/form-data (JSON + รูป)
 *  หรือ application/json เฉยๆ ถ้าไม่ได้เปิดแนบรูป
 *  โครง JSON ที่สนใจ:
 *  {
 *    "dateTime": "2026-07-16T17:05:23+07:00",
 *    "macAddress": "..", "deviceID": "..", "ipAddress": "..",
 *    "AccessControllerEvent": {
 *       "employeeNoString": "1007",     <- รหัสพนักงาน (กุญแจ)
 *       "name": "ซิม",
 *       "currentVerifyMode": "face",
 *       "majorEventType": 5, "subEventType": 75,
 *       "attendanceStatus": "checkIn"
 *    }
 *  }
 * ============================================================= */
async function saveHikEvent(env, raw) {
  const j = extractJson(raw);
  if (!j) return 0;

  const ev = j.AccessControllerEvent || j.accessControllerEvent || {};
  const code = String(ev.employeeNoString ?? ev.employeeNo ?? '').trim();

  // ไม่มีรหัส = ไม่ใช่การสแกนสำเร็จ (heartbeat / สแกนไม่ผ่าน / คนแปลกหน้า) -> ทิ้ง
  if (!code || code === '0') return 0;

  const dt = hikDateTime(j.dateTime || ev.dateTime);
  if (!dt) return 0;

  const sn = String(j.deviceID || j.macAddress || j.ipAddress || 'HIK').trim();

  const row = {
    emp_code: code,
    punch_date: dt.d,
    punch_time: dt.t,                  // ระดับนาที = กันสแกนรัวซ้ำ
    verify_mode: hikVerifyMode(ev.currentVerifyMode),
    device_sn: sn,
    source: 'device',
  };

  await autoCreateEmployees(env, [row], ev.name);
  await sb(env, 'punches?on_conflict=emp_code,punch_date,punch_time', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify([row]),
  });
  await touchDevice(env, sn);
  return 1;
}

// ดึง JSON ก้อนแรกออกจาก body (ข้ามส่วน multipart boundary / รูปภาพ)
function extractJson(text) {
  const i = text.indexOf('{');
  if (i < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch (_) { return null; } }
    }
  }
  return null;
}

// "2026-07-16T17:05:23+07:00" -> {d:'2026-07-16', t:'17:05'}
function hikDateTime(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  if (/Z$/.test(s)) {                       // เครื่องส่งเป็น UTC -> แปลงเป็นเวลาไทย
    const th = new Date(new Date(s).getTime() + 7 * 3600000);
    return { d: th.toISOString().slice(0, 10), t: th.toISOString().slice(11, 16) };
  }
  return { d: m[1], t: m[2] + ':' + m[3] };  // มี timezone ติดมา = เวลาเครื่องอยู่แล้ว
}

// แปลงให้ตรงกับรหัสของ ZKTeco : 15=หน้า 1=นิ้ว 2=บัตร 0=รหัส
function hikVerifyMode(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('face')) return 15;
  if (s.includes('fp') || s.includes('finger')) return 1;
  if (s.includes('card')) return 2;
  if (s.includes('pwd') || s.includes('password')) return 0;
  return 15;
}

/* =============================================================
 *  ZKTECO
 *  PIN \t YYYY-MM-DD HH:MM:SS \t Status \t VerifyMode \t ...
 * ============================================================= */
async function saveAttlog(env, sn, body) {
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const f = line.split('\t');
    if (f.length < 2) continue;
    const code = (f[0] || '').trim();
    const [d, tm] = (f[1] || '').trim().split(' ');
    if (!code || !d || !tm) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    rows.push({
      emp_code: code, punch_date: d, punch_time: tm.slice(0, 5),
      verify_mode: parseInt(f[3] || '0', 10) || 0, device_sn: sn, source: 'device',
    });
  }
  if (!rows.length) return 0;
  await autoCreateEmployees(env, rows);
  await sb(env, 'punches?on_conflict=emp_code,punch_date,punch_time', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

/* ============ ใช้ร่วมกันทั้ง 2 ยี่ห้อ ============ */
async function autoCreateEmployees(env, rows, nameHint) {
  const codes = [...new Set(rows.map((r) => r.emp_code))];
  const res = await sb(env, `employees?select=code&code=in.(${codes.map((c) => `"${c}"`).join(',')})`, { method: 'GET' });
  const known = new Set((await safeJson(res)).map((e) => e.code));
  const missing = codes.filter((c) => !known.has(c));
  if (!missing.length) return;

  // เจ้าของสั่ง (2026-08-12): พนักงานเข้าใหม่ default รายเดือน 12,000
  // + จดวันเริ่มงาน = วันสแกนแรก (งวดแรกระบบจะคิดเป็นรายวันให้อัตโนมัติ)
  const firstDay = {};
  for (const r of rows) {
    if (!firstDay[r.emp_code] || r.punch_date < firstDay[r.emp_code]) firstDay[r.emp_code] = r.punch_date;
  }
  const mkRow = (c, withStart) => {
    // แยกชื่อจากเครื่อง: คำแรก = ชื่อเล่น, ที่เหลือ = ชื่อ-นามสกุล
    let nick = c, full = '';
    if (missing.length === 1 && nameHint) {
      const nm = String(nameHint).trim();
      const sp = nm.indexOf(' ');
      nick = sp > 0 ? nm.slice(0, sp) : nm;
      full = sp > 0 ? nm.slice(sp + 1).trim() : '';
    }
    const row = {
      code: c, nick, full_name: full, dept: '', wage_type: 'monthly', rate: 12000,
      work_mode: 'shift', active: true,
    };
    if (withStart && firstDay[c]) row.start_date = firstDay[c];
    return row;
  };
  const post = (body) => sb(env, 'employees?on_conflict=code', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  const r1 = await post(missing.map((c) => mkRow(c, true)));
  // ยังไม่ได้รัน jj_work_dates.sql (ไม่มีคอลัมน์ start_date) -> ลองใหม่แบบไม่ใส่วันเริ่มงาน
  if (!r1.ok) await post(missing.map((c) => mkRow(c, false)));
}

async function touchDevice(env, sn) {
  if (!sn) return;
  await sb(env, 'devices?on_conflict=sn', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ sn, last_seen: new Date().toISOString() }]),
  });
}

async function logRaw(env, { sn, method, path, query, body }) {
  try {
    await sb(env, 'device_log', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ sn, method, path, query, body: (body || '').slice(0, 4000) }]),
    });
  } catch (_) { /* log พังห้ามทำให้ระบบพัง */ }
}

/* ============ หน้าตรวจสอบระบบ ============ */
async function runDebug(env) {
  const o = [];
  const { SUPABASE_URL: u, SUPABASE_KEY: k } = env;
  o.push('=== 1) ตรวจ Secret ===');
  o.push(`SUPABASE_URL : ${u ? '✅ ' + u : '❌ ไม่พบ — ตั้งชื่อ Secret ว่า SUPABASE_URL เป๊ะๆ'}`);
  o.push(`SUPABASE_KEY : ${k ? '✅ ' + k.slice(0, 14) + '…(' + k.length + ' ตัวอักษร)' : '❌ ไม่พบ — ตั้งชื่อ Secret ว่า SUPABASE_KEY เป๊ะๆ'}`);
  o.push(`LINE_TOKEN   : ${env.LINE_TOKEN ? '✅ มีแล้ว (' + env.LINE_TOKEN.length + ' ตัวอักษร)' : '⚠️ ยังไม่ตั้ง — รายงาน LINE จะยังส่งไม่ได้'}`);
  o.push(`LINE_GROUP_ID: ${env.LINE_GROUP_ID ? '✅ ' + env.LINE_GROUP_ID.slice(0, 8) + '…' : '⚠️ ยังไม่ตั้ง — เชิญบอทเข้ากลุ่มแล้วพิมพ์ groupid เพื่อดู'}`);
  if (!u || !k) { o.push('', '👉 Settings → Variables and secrets → Add แล้วกด Deploy ใหม่'); return o.join('\n'); }
  if (u.endsWith('/')) o.push('⚠️ SUPABASE_URL มี / ท้าย — ให้ลบออก');

  o.push('', '=== 2) ทดสอบอ่านตาราง shifts ===');
  try {
    const r = await sb(env, 'shifts?select=id,name&limit=5', { method: 'GET' });
    o.push(`HTTP ${r.status}`); o.push((await r.text()).slice(0, 400));
    if (r.status === 401) o.push('👉 คีย์ผิด');
    if (r.status === 404) o.push('👉 ยังไม่ได้รัน payroll_phase1.sql');
  } catch (e) { o.push('❌ ' + e); }

  o.push('', '=== 3) ทดสอบเขียนตาราง devices ===');
  try {
    const r = await sb(env, 'devices?on_conflict=sn', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ sn: 'DEBUG-TEST', name: 'ทดสอบจากหน้า /debug', last_seen: new Date().toISOString() }]),
    });
    o.push(`HTTP ${r.status}`); o.push((await r.text()).slice(0, 400));
    if (r.ok) o.push('✅ เขียนได้!');
    if (r.status === 401 || r.status === 403) o.push('👉 ยังไม่ได้รัน payroll_phase2_grants.sql');
  } catch (e) { o.push('❌ ' + e); }

  o.push('', '=== 4) ทดสอบตัวแปลงข้อมูล Hikvision ===');
  const demo = JSON.stringify({
    dateTime: '2026-07-16T17:05:23+07:00', macAddress: 'aa:bb:cc:dd:ee:ff',
    AccessControllerEvent: { employeeNoString: '1007', name: 'ทดสอบ', currentVerifyMode: 'face' },
  });
  const j = extractJson('--boundary\r\nContent-Disposition: form-data; name="event_log"\r\n\r\n' + demo + '\r\n--boundary--');
  const ev = j?.AccessControllerEvent || {};
  o.push(j ? `✅ อ่าน JSON ในกล่อง multipart ได้ → รหัส ${ev.employeeNoString} · ${JSON.stringify(hikDateTime(j.dateTime))} · verify ${hikVerifyMode(ev.currentVerifyMode)}`
           : '❌ แปลงไม่ได้');

  o.push('', '=== 5) ทดสอบรายงาน LINE ===');
  try {
    const data = await loadDay(env, thaiNow().date);
    o.push(data.defs.length
      ? `✅ พบ ${data.defs.length} กะ: ${data.defs.map((s) => `${s.name} (${minToHM(s.startMin % 1440)})`).join(', ')}`
      : '⚠️ ไม่พบเวลาเริ่มกะในตาราง shifts — รายงานรายกะจะไม่ทำงาน');
    o.push(`จุดตัดวัน (cutoff): ${String(data.cutoff).padStart(2, '0')}:00 · อนุโลมสายตาม in_grace ของแต่ละกะ`);
    o.push('ตรวจข้อมูลละเอียด: /report/check · พรีวิวรายงาน: /report/daily และ /report/shift');
  } catch (e) { o.push('❌ ' + e); }
  return o.join('\n');
}

/* ============ ตัวช่วยเรียก Supabase REST ============ */
function sb(env, pathAndQuery, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}`,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  });
}
async function safeJson(res) {
  try { const j = await res.json(); return Array.isArray(j) ? j : []; } catch (_) { return []; }
}
