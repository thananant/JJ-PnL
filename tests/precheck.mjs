#!/usr/bin/env node
// jj-precheck — ตรวจของที่ "ต้องเหมือนกันทุกไฟล์ / ห้ามหาย" ก่อน commit ทุกครั้ง
// ใช้:  node tests/precheck.mjs            (ตรวจไฟล์ในเครื่อง)
//       node tests/precheck.mjs --remote   (+ เทียบกับ origin/main และโค้ด Edge Function บน branch อื่น)
// ผล:   ✗ = ต้องแก้ก่อนส่ง (exit 1) · ⚠ = ควรดู แต่ไม่ขวาง · ✓ = ผ่าน
// กติกาทั้งหมดมาจาก CLAUDE.md — แก้กติกาที่นั่นแล้วต้องแก้ที่นี่ด้วย
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REMOTE = process.argv.includes('--remote');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const has = f => fs.existsSync(path.join(ROOT, f));
const md5 = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);

let nFail = 0, nWarn = 0;
const out = [];
const sec = t => out.push('\n■ ' + t);
const pass = m => out.push('  ✓ ' + m);
const fail = m => { nFail++; out.push('  ✗ ' + m); };
const warn = m => { nWarn++; out.push('  ⚠ ' + m); };

// ---------- รายชื่อไฟล์ (ตาม CLAUDE.md) ----------
const LOGIN_FILES = ['index.html', 'jjmk-pnl.html', 'jjmk-owner.html', 'jjmk-admin.html', 'jjmk-payroll.html',
  'jjmk-calendar.html', 'jjmk-invoice.html', 'jjmk-social.html', 'jjmk-maint.html', 'jjmk-kpi.html',
  'jjmk-stockcheck.html', 'jjmk-kitchen.html', 'jjmk-order.html', 'jjmk-office.html', 'jjmk-allergy.html'];
const GATE_FILES = ['index.html', 'jjmk-pnl.html', 'jjmk-owner.html', 'jjmk-admin.html', 'jjmk-payroll.html',
  'jjmk-calendar.html', 'jjmk-invoice.html', 'jjmk-office.html', 'jjmk-allergy.html'];
const JJBR_FILES = [...LOGIN_FILES, 'jjmk-menu.html'];
const SPD_FILES = ['jjmk-kitchen.html', 'jjmk-stockcheck.html'];
// แอปที่ต้องมีลากหน้าลง = รีเฟรช · ไม่ต้องมี: เมนู QR หน้าลูกค้า (ไม่ใช่แอปพนักงาน) · QR สั่งอาหาร = รอเจ้าของตัดสิน (CLAUDE.md)
const PTR_SKIP = { 'jjmk-menu.html': 'หน้าลูกค้า', 'jjmk-order.html': 'รอเจ้าของตัดสิน (CLAUDE.md กติกาหน้าจอมือถือ)', 'privacy.html': 'หน้าสาธารณะ' };
// ไฟล์ทดลองที่ build จาก src (มีบล็อกร่วมเหมือนกัน — ตรวจด้วย)
const EXTRA = fs.readdirSync(ROOT).filter(f => /^jjmk-.*-new\.html$/.test(f));
const ALL_HTML = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

// ตัดบล็อกตั้งแต่ a ถึง b (รวมทั้งคู่) · ไม่เจอ = null
function cut(src, a, b, from = 0) {
  const i = src.indexOf(a, from); if (i < 0) return null;
  const j = src.indexOf(b, i + a.length); if (j < 0) return null;
  return src.slice(i, j + b.length);
}
// เทียบบล็อกหลายไฟล์: กลุ่มที่มีมากสุด = ต้นแบบ · ไฟล์อื่นที่ต่าง = ✗
function same(label, blocks) {
  const groups = {};
  for (const [f, b] of Object.entries(blocks)) {
    if (b == null) { fail(`${label}: ไม่เจอบล็อกใน ${f}`); continue; }
    (groups[md5(b)] ||= []).push(f);
  }
  const keys = Object.keys(groups).sort((x, y) => groups[y].length - groups[x].length);
  if (!keys.length) return;
  if (keys.length === 1) { pass(`${label}: เหมือนกันทุกไบต์ ${groups[keys[0]].length} ไฟล์`); return; }
  const base = groups[keys[0]];
  for (const k of keys.slice(1)) {
    const f = groups[k][0];
    fail(`${label}: ${groups[k].join(', ')} ต่างจาก ${base.length} ไฟล์ที่เหลือ (${diffHint(blocks[base[0]], blocks[f])}) — แก้ที่ไฟล์ต้นแบบแล้ว sync ด้วยสคริปต์`);
  }
}
function diffHint(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) {
    const s = (B[i] ?? '(ไม่มีบรรทัดนี้)').trim();
    return `บรรทัดที่ ${i + 1} ของบล็อก: "${s.length > 70 ? s.slice(0, 70) + '…' : s}"`;
  }
  return 'ต่างที่ช่องว่างท้ายบล็อก';
}

// ===================================================================
sec('1. JJ Login — ต้องมีครบ 15 ไฟล์ และเหมือนกันทุกไฟล์ (ต่างแค่ var APP=)');
{
  const blocks = {};
  for (const f of [...LOGIN_FILES, ...EXTRA]) {
    if (!has(f)) { fail(`ไม่มีไฟล์ ${f}`); continue; }
    const s = rd(f);
    const def = (s.match(/window\.JJLogin=JJLogin/g) || []).length;
    const use = (s.match(/JJLogin\.(mount|wrap)/g) || []).length;
    if (def !== 1) fail(`${f}: def=${def} (ต้อง 1) — บล็อก JJ Login ${def ? 'ซ้ำ' : 'หายไปทั้งก้อน'} · วิธีกู้: git diff 2266081^ 2266081 -- ${f} | git apply --3way`);
    else if (use < 1) fail(`${f}: use=0 — หน้าล็อกอินไม่ถูกเรียกใช้`);
    const start = s.indexOf('<!-- ===== JJ Login');
    const b = start < 0 ? null : cut(s, '<!-- ===== JJ Login', 'window.JJLogin=JJLogin;\n})();\n</script>', start);
    blocks[f] = b && b.replace(/var APP='[^']*';/, "var APP='*';");
  }
  if (!nFail) pass(`JJ Login def=1 use≥1 ครบ ${LOGIN_FILES.length + EXTRA.length} ไฟล์`);
  same('บล็อก JJ Login', blocks);
  // ทะเบียนไอคอนแอป A ต้องมีทุก data-app ของหน้าแรก
  const hub = rd('index.html');
  const apps = [...new Set([...hub.matchAll(/data-app="([a-z0-9_-]+)"/g)].map(m => m[1]))];
  const lg = blocks['index.html'] || '';
  const miss = apps.filter(a => !new RegExp('[{,\\s]' + a + '\\s*:\\s*\\{').test(lg));
  if (miss.length) warn(`ทะเบียนแอป A ใน JJ Login ไม่มี: ${miss.join(', ')} (ไอคอนหน้าล็อกอินจะไม่ตรงหน้าแรก)`);
  else pass(`ทะเบียนแอป A ครบทุกไอคอนในหน้าแรก (${apps.length} แอป)`);
}

sec('2. JJ Gate — 9 ไฟล์ เหมือนกันทุกไฟล์ (ต่างแค่ var APP=)');
{
  const blocks = {};
  for (const f of GATE_FILES) {
    const s = rd(f);
    const b = cut(s, 'window.JJGate=(function(){', '\n})();');
    blocks[f] = b && b.replace(/var APP='[^']*';/, "var APP='*';");
  }
  same('บล็อก JJ Gate', blocks);
  for (const f of GATE_FILES.filter(f => f !== 'index.html')) {
    const s = rd(f);
    if (!/JJGate\.ok\(/.test(s)) fail(`${f}: ไม่เรียก JJGate.ok() — session ค้างในเครื่องจะเข้าได้โดยไม่ถามรหัส`);
    if (!/JJGate\.grant\(/.test(s)) fail(`${f}: ไม่เรียก JJGate.grant() — รีเฟรชแล้วจะถามรหัสซ้ำ`);
  }
}

sec('3. ทะเบียนสาขากลาง (JJBR) — 16 ไฟล์ เหมือนกันทุกไบต์');
{
  const blocks = {};
  for (const f of [...JJBR_FILES, ...EXTRA]) blocks[f] = cut(rd(f), '<!-- JJBR-BEGIN', '<!-- JJBR-END -->');
  same('บล็อก JJBR', blocks);
}

sec('4. วันขายดีจากปฏิทิน (SPD) — ทุกไฟล์ที่มีบล็อกต้องเหมือนกันทุกไบต์');
{
  // ครัวกลาง v2 (2026-10-17) ไม่คิดสูตรสั่งของเองแล้ว (อ่านออเดอร์ที่แอปนับสต๊อกเขียนลง stock_receipts) → บล็อก SPD/STK_BR เหลือเฉพาะแอปนับ
  const withSpd = SPD_FILES.filter(f => has(f) && rd(f).includes('SPD-BEGIN'));
  if (!withSpd.includes('jjmk-stockcheck.html')) fail('jjmk-stockcheck.html: บล็อก SPD หายไป');
  if (withSpd.length < 2) pass(`บล็อก SPD มีเฉพาะ ${withSpd.join(', ')} (ครัวกลาง v2 อ่านออเดอร์จาก stock_receipts ไม่พอร์ตสูตร)`);
  else {
    const blocks = {};
    for (const f of withSpd) { const s = rd(f); const i = s.indexOf('SPD-BEGIN'), j = s.indexOf('SPD-END'); blocks[f] = i < 0 || j < 0 ? null : s.slice(i, j); }
    same('บล็อก SPD', blocks);
    const stk = {};
    for (const f of withSpd) { const m = rd(f).match(/const STK_BR\s*=\s*([^;]+);/); stk[f] = m ? m[1].replace(/\s+/g, '') : null; }
    same('ค่า STK_BR (รหัสสาขาของแอปนับ)', stk);
  }
}

sec('5. ล็อกอินของนับสต๊อก (เคยหายจากการเขียนทับ 2026-09-24)');
{
  const s = rd('jjmk-stockcheck.html');
  if (!/JJPNL/.test(s)) fail('jjmk-stockcheck.html: pwHash ไม่ใช้ salt JJPNL — บัญชีกลางจะล็อกอินไม่ได้');
  else if (/['"]JJSC['"]/.test(s) || /\|JJSC/.test(s)) fail('jjmk-stockcheck.html: ยังมี salt JJSC ของระบบเก่า');
  else pass('pwHash ใช้ salt JJPNL');
  const ia = cut(s, 'function initAuth', '\n}');
  if (!ia || !/showLogin\(/.test(ia)) fail('jjmk-stockcheck.html: initAuth() ไม่เรียก showLogin() — อาจกลับไปเป็นโหมดเปิดที่ไม่ต้องล็อกอิน');
  else pass('initAuth() ยังเรียก showLogin()');
  for (const f of ALL_HTML) if (/sc_users/.test(rd(f)) && /from\(['"]sc_users|\/sc_users\?/.test(rd(f))) warn(`${f}: ยังอ่านตาราง sc_users (บัญชีเก่าของนับสต๊อก)`);
  if (!/localStorage\.removeItem\(['"]jjhub_skip['"]\)/.test(rd('index.html'))) fail('index.html: ไม่ล้าง jjhub_skip ตอนเปิดหน้า — มือถือที่เคยกดปุ่มเดิมจะเห็นไอคอนแอปโดยไม่ล็อกอิน');
  else pass('index.html ยังล้าง jjhub_skip');
}

sec('6. ทุกหน้า: meta no-cache · viewport · ลากหน้าลง = รีเฟรช');
{
  for (const f of ALL_HTML) {
    const s = rd(f);
    const head = s.slice(0, s.indexOf('</head>') + 1 || 4000);
    if (!/http-equiv=["']Cache-Control["']/i.test(head)) fail(`${f}: ไม่มี meta no-cache ใน <head> (ดึงหน้าลงแล้วได้ไฟล์เก่าค้าง)`);
    if (!/name=["']viewport["']/i.test(head)) fail(`${f}: ไม่มี meta viewport`);
    const ptr = /ลากหน้าลง = รีเฟรช|PTR-BEGIN|ดึงหน้าลงเพื่อโหลดใหม่|ลากลงเพื่อรีเฟรช/.test(s) && /touchstart/.test(s);
    if (!ptr) { if (PTR_SKIP[f]) out.push(`  · ${f}: ไม่มีลากลงรีเฟรช — ${PTR_SKIP[f]}`); else fail(`${f}: ไม่มีลากหน้าลง = รีเฟรช`); }
    if (/apple-mobile-web-app-capable/.test(head) && !/safe-area-inset-top/.test(s)) warn(`${f}: เปิดจากหน้าจอโฮมได้แต่ไม่มี safe-area-inset-top (หัวแอปโดนแถบสถานะ iPhone ทับ)`);
  }
  pass(`ตรวจ ${ALL_HTML.length} หน้า`);
  const ksk = rd('jjmk-kpi.html');
  if (!/kiosk/.test(cut(ksk, 'ลากหน้าลง = รีเฟรช', '})();') || '')) fail('jjmk-kpi.html: ลากลงรีเฟรชไม่เช็คโหมด kiosk — คะแนนที่ลูกค้ากดค้างจะหาย');
  else pass('KPI ปิดลากลงรีเฟรชในโหมด kiosk');
}

sec('7. Syntax ของ <script> ทุกก้อนในทุกหน้า');
{
  let n = 0;
  for (const f of ALL_HTML) {
    const s = rd(f), re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(s))) {
      const a = m[1] || '';
      if (/\bsrc=/.test(a) || /type=["'](?!text\/javascript|module)[^"']*["']/i.test(a)) continue;
      n++;
      try { new vm.Script(m[2], { filename: f }); }
      catch (e) {
        if (/type=["']module/.test(a)) continue;   // module ตรวจด้วย vm.Script ไม่ได้
        const line = s.slice(0, m.index).split('\n').length;
        fail(`${f}: <script> ที่บรรทัด ${line} — ${e.message}`);
      }
    }
  }
  pass(`${n} ก้อนแปลได้ (ไม่มี syntax error)`);
}

sec('8. ค่าที่ต้องตรงกันข้ามไฟล์');
{
  const g = (f, re) => { const m = rd(f).match(re); return m ? m[1] : null; };
  const rq = g('jjmk-admin.html', /const RQ_MIN='([^']+)'/), rs = g('index.html', /var RESET_MIN='([^']+)'/);
  rq && rq === rs ? pass(`RQ_MIN (JJ Access) = RESET_MIN (หน้าแรก) = ${rq}`) : fail(`RQ_MIN=${rq} ไม่ตรงกับ RESET_MIN=${rs}`);
  const fnv = g('jjmk-admin.html', /id="fnSignupNotify"[\s\S]*?const VERSION = "([^"]+)"/);
  if (fnv && rs && verCmp(fnv, rs) < 0) fail(`โค้ด signup-notify ที่ฝัง (${fnv}) เก่ากว่า RESET_MIN (${rs}) — ปุ่มลืมรหัสผ่านจะไม่มีวันโผล่`);
  const soc = rd('jjmk-social.html');
  const br = cut(soc, '<script type="text/plain" id="fnBrain"', '</script>'), wh = cut(soc, '<script type="text/plain" id="fnWebhook"', '</script>');
  const vb = br && (br.match(/const VERSION = "([^"]+)"/) || [])[1], vw = wh && (wh.match(/const VERSION = "([^"]+)"/) || [])[1];
  vb && vb === vw ? pass(`Social: social-brain กับ social-webhook ที่ฝังเวอร์ชันเดียวกัน (${vb})`) : warn(`Social: เวอร์ชันโค้ดฝัง brain=${vb} webhook=${vw} ไม่ตรงกัน`);
  const ai = s => cut(s || '', 'const GEMINI_MODELS', 'function faqMatch') ;
  const aiB = ai(br), aiW = ai(wh);
  if (!aiB || !aiW) warn('Social: หาโค้ดส่วน AI (GEMINI_MODELS … faqMatch) ในโค้ดฝังไม่เจอ');
  else if (aiB !== aiW) fail(`Social: โค้ดส่วน AI ของ brain กับ webhook ไม่เหมือนกัน (${diffHint(aiB, aiW)}) — ต้องแก้คู่`);
  else pass('Social: โค้ดส่วน AI ของ brain = webhook ทุกตัวอักษร');
  const bulkApp = g('jjmk-social.html', /const AP_CM_BULK=(\d+);/), bulkFn = br && (br.match(/const AP_CM_BULK\s*=\s*(\d+)/) || [])[1];
  bulkApp && bulkApp === bulkFn ? pass(`Social: AP_CM_BULK แอป = ฟังก์ชัน = ${bulkApp}`) : fail(`Social: AP_CM_BULK แอป=${bulkApp} ฟังก์ชัน=${bulkFn}`);
  const sigMin = g('jjmk-invoice.html', /var NAS_SIG_MIN='([^']+)'/), headV = g('jjmk-invoice.html', /var NAS_HEAD_VER='([^']+)'/);
  const sv = has('jjmk-invoice/inv_nas_sync.py') ? (rd('jjmk-invoice/inv_nas_sync.py').match(/^SCRIPT_VER = '([^']+)'/m) || [])[1] : null;
  if (!sv) warn('ใบกำกับ: หา SCRIPT_VER ใน inv_nas_sync.py ไม่เจอ');
  else {
    verCmp(sv, sigMin) >= 0 ? pass(`ใบกำกับ: สคริปต์ NAS ${sv} ≥ NAS_SIG_MIN ${sigMin}`) : fail(`ใบกำกับ: สคริปต์ NAS ${sv} เก่ากว่า NAS_SIG_MIN ${sigMin} — ทุกเครื่องจะเตือนให้อัปเดต NAS`);
    verCmp(sv, headV) >= 0 ? pass(`ใบกำกับ: สคริปต์ NAS ≥ NAS_HEAD_VER ${headV}`) : fail(`ใบกำกับ: สคริปต์ NAS ${sv} เก่ากว่า NAS_HEAD_VER ${headV}`);
  }
  const gas = g('jjmk-invoice.html', /var VERSION = '([^']+)';/);
  gas ? pass(`ใบกำกับ: โค้ด Apps Script ที่ฝังมีเวอร์ชัน ${gas}`) : fail('ใบกำกับ: โค้ด Apps Script (#gasCodeSrc) ไม่มี var VERSION');
  // บล็อกในครัวกลาง v2 ต้องไม่ใช่ไฟล์ที่แก้มือ — build ใหม่แล้วต้องได้เหมือนเดิม (ยกเว้นเวลา build)
  // ครัวกลาง v2: jjmk-kitchen.html คือไฟล์ที่ build จาก jjmk-kitchen/src — build ใหม่แล้วต้องได้เหมือนเดิม (ยกเว้นตราเวลาใน APP_VER)
  for (const built of ['jjmk-kitchen.html', ...EXTRA.filter(f => /^jjmk-kitchen-.*\.html$/.test(f))]) {
    if (!has('jjmk-kitchen/src/build.mjs') || !has(built)) continue;
    const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'jjpc-')), 'k.html');
    try {
      fs.copyFileSync(path.join(ROOT, built), tmp);   // ให้ build เอา SQL ที่ฝังไว้เดิม (#kcSql) มาใช้ — ไฟล์ .sql ไม่อยู่ใน main
      execFileSync(process.execPath, [path.join(ROOT, 'jjmk-kitchen/src/build.mjs'), tmp], { stdio: 'pipe' });
      const norm = s => s.replace(/const APP_VER='KC 2\.0[^']*';/, '');
      norm(fs.readFileSync(tmp, 'utf8')) === norm(rd(built))
        ? pass(`ครัวกลาง v2: ${built} ตรงกับ build จาก jjmk-kitchen/src`)
        : fail(`ครัวกลาง v2: ${built} ไม่ตรงกับ src — แก้ไฟล์ที่ build แล้วตรง ๆ หรือลืม \`node jjmk-kitchen/src/build.mjs\``);
    } catch (e) { fail('ครัวกลาง v2: build ไม่ผ่าน — ' + String(e.stderr || e.message).trim().split('\n').pop()); }
  }
}
function verCmp(a, b) {
  const p = s => String(s || '').split(/[-.]/).map(Number);
  const A = p(a), B = p(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d; }
  return 0;
}

sec('9. git — ไฟล์ .sql · ไฟล์ลับ · ฐาน main ล่าสุด');
{
  const git = c => execSync('git ' + c, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let tracked = [];
  try { tracked = git('ls-files').split('\n'); } catch { warn('อ่าน git ไม่ได้ — ข้ามหมวดนี้'); }
  if (tracked.length) {
    let staged = [];
    try { staged = git('diff --cached --name-only --diff-filter=A').split('\n').filter(Boolean); } catch {}
    const sql = [...new Set([...tracked, ...staged])].filter(f => /\.sql$/i.test(f));
    sql.length ? fail(`มีไฟล์ .sql ใน branch นี้: ${sql.join(', ')} — SQL อยู่ branch sql เท่านั้น`) : pass('ไม่มีไฟล์ .sql');
    const bad = [...tracked, ...staged].filter(f => /(^|\/)\.env|\.pem$|\.key$|service[_-]?role|\.xlsx?$|\.csv$/i.test(f));
    bad.length ? warn(`ไฟล์ที่อาจเป็นข้อมูลลับ/ข้อมูลลูกค้า (repo นี้ public): ${bad.join(', ')}`) : pass('ไม่มีไฟล์ .env/.pem/Excel/CSV');
    // คีย์ลับที่ห้ามอยู่ในไฟล์ (คีย์สาธารณะ sb_publishable_ ใช้ได้)
    for (const f of ALL_HTML) {
      const s = rd(f);
      if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(s)) fail(`${f}: มีคีย์ลับ sb_secret_ ของ Supabase`);
      if (/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*/.test(s)) fail(`${f}: มี service_role JWT`);
      if (/apify_api_[A-Za-z0-9]{20,}/.test(s)) fail(`${f}: มี token ของ Apify`);
      if (/AIza[0-9A-Za-z_-]{35}/.test(s)) warn(`${f}: มีคีย์ Google (AIza…) — เช็คว่าเป็นคีย์ที่จำกัดโดเมนแล้ว`);
    }
    if (REMOTE) {
      try { git('fetch -q origin main'); } catch { warn('fetch origin main ไม่ได้'); }
    }
    try {
      const behind = Number(git('rev-list --count HEAD..origin/main'));
      if (behind > 0) {
        const touched = git('diff --name-only HEAD...origin/main').split('\n').filter(Boolean);
        const mine = git('diff --name-only origin/main...HEAD').split('\n').filter(Boolean);
        const clash = mine.filter(f => touched.includes(f));
        (clash.length ? fail : warn)(`branch นี้ตามหลัง origin/main ${behind} commit${clash.length ? ' และ main แก้ไฟล์เดียวกับเรา: ' + clash.join(', ') + ' — rebase ก่อน ไม่งั้นทับงานคนอื่น' : ' — rebase ก่อน commit'}`);
      } else pass('อยู่บน origin/main ล่าสุด' + (REMOTE ? '' : ' (ใช้ --remote เพื่อ fetch ก่อนเทียบ)'));
    } catch { warn('ไม่มี origin/main ให้เทียบ'); }
  }
}

if (REMOTE) {
  sec('10. โค้ด Edge Function ที่ฝังในแอป ↔ ไฟล์ต้นฉบับบน branch อื่น');
  const pairs = [
    ['jjmk-admin.html', 'fnSignupNotify', 'sql', 'signup-notify.ts'],
    ['jjmk-calendar.html', 'feedCode', 'sql', 'cal-feed.ts'],
    ['jjmk-social.html', 'fnBrain', 'claude/social-listening-system-342kax', 'supabase/functions/social-brain.ts'],
    ['jjmk-social.html', 'fnWebhook', 'claude/social-listening-system-342kax', 'supabase/functions/social-webhook.ts'],
  ];
  for (const [f, id, branch, file] of pairs) {
    try {
      execSync(`git fetch -q origin ${branch}`, { cwd: ROOT, stdio: 'ignore' });   // FETCH_HEAD = branch นี้
      const ts = execSync(`git show FETCH_HEAD:${file}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const m = rd(f).match(new RegExp(`<script type="text/plain" id="${id}"[^>]*>([\\s\\S]*?)</script>`));
      const emb = m ? m[1] : null;
      if (!emb) { fail(`${f}: ไม่มีบล็อก #${id}`); continue; }
      emb.trim() === ts.trim() ? pass(`${f} #${id} = ${branch}:${file}`)
        : fail(`${f} #${id} ไม่ตรงกับ ${branch}:${file} (${diffHint(ts.trim(), emb.trim())}) — ฝังใหม่ + เลื่อน VERSION`);
    } catch { warn(`อ่าน ${branch}:${file} ไม่ได้ (branch/ไฟล์ไม่มี หรือ fetch ไม่ได้)`); }
  }
}

console.log('jj-precheck · ' + ROOT + out.join('\n'));
console.log(`\n${nFail ? '✗ ' + nFail + ' FAILED' : 'ALL PASSED'}${nWarn ? ' · ⚠ ' + nWarn + ' warning' : ''}`);
process.exit(nFail ? 1 : 0);
