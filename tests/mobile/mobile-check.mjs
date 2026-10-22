#!/usr/bin/env node
// jj-mobile-check — เปิดทุกแอปบนโทรศัพท์จำลอง (มีรอยบาก/Dynamic Island จริงผ่าน safe-area) แล้วตรวจตามกติกาหน้าจอมือถือใน CLAUDE.md
// ใช้:  node tests/mobile/mobile-check.mjs                 (5 รุ่นหลัก · ทุกแอป)
//       node tests/mobile/mobile-check.mjs --all           (ครบ 15 รุ่นตาม CLAUDE.md)
//       node tests/mobile/mobile-check.mjs --app=pnl,kpi   (เฉพาะบางแอป)  --dev=se1,fold  --shots (เก็บภาพหน้าจอ)
// ไม่แตะฐานข้อมูลจริง: ทุกคำขอไป Supabase ถูกตอบด้วยข้อมูลจำลอง (ผู้ใช้ทดสอบ 1 คน + ตารางว่าง)
// ✗ = ต้องแก้ · ⚠ = ควรดู · ผลเต็มเขียนที่ tests/mobile/out/report.txt (ไม่ commit)
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { payrollOrgFixture } from './fixtures-payroll-org.mjs';
import { payrollMoneyFixture } from './fixtures-payroll-money.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const req = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req('/opt/node22/lib/node_modules/playwright')); }

const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const ALL = process.argv.includes('--all'), SHOTS = process.argv.includes('--shots');

// ---------- โทรศัพท์ชุดที่ต้องผ่าน (CLAUDE.md "กติกาหน้าจอมือถือ") ----------
// t/b/l/r = safe-area inset (px) · core = ชุดที่รันเป็นค่าตั้งต้น
const DEVICES = [
  { id: 'se1', name: 'iPhone SE 1', w: 320, h: 568, t: 20, core: 1 },
  { id: 'se2', name: 'iPhone SE 2/3', w: 375, h: 667, t: 20 },
  { id: 'mini', name: 'iPhone 13 mini', w: 375, h: 812, t: 50, b: 34 },
  { id: 'xr', name: 'iPhone 11/XR', w: 414, h: 896, t: 48, b: 34 },
  { id: 'i14', name: 'iPhone 12–14', w: 390, h: 844, t: 47, b: 34 },
  { id: 'i16', name: 'iPhone 15/16', w: 393, h: 852, t: 59, b: 34 },
  { id: 'i16p', name: 'iPhone 16 Pro', w: 402, h: 874, t: 62, b: 34, core: 1 },
  { id: 'i16pm', name: 'iPhone 16 Pro Max', w: 440, h: 956, t: 62, b: 34 },
  { id: 'a360', name: 'Android 360×800', w: 360, h: 800, t: 0 },
  { id: 'a412', name: 'Android 412×915', w: 412, h: 915, t: 24, core: 1 },
  { id: 'fold', name: 'Galaxy Fold ปก', w: 280, h: 653, t: 0, core: 1 },
  { id: 'zfold', name: 'Z Fold ปก', w: 344, h: 882, t: 24 },
  { id: 'land', name: 'iPhone แนวนอน', w: 852, h: 393, t: 0, b: 21, l: 59, r: 59, core: 1 },
  { id: 'aland', name: 'Android แนวนอน', w: 800, h: 360, t: 0 },
  { id: 'ipad', name: 'iPad mini', w: 744, h: 1133, t: 24, b: 20, tablet: 1 },
];

// ---------- แอปที่ตรวจ ----------
// login: เปิดมาเจอหน้าล็อกอิน → ใส่ผู้ใช้ทดสอบแล้วตรวจหน้าหลักต่อ
const APPS = [
  { id: 'hub', file: 'index.html', login: 1 },
  { id: 'pnl', file: 'jjmk-pnl.html', login: 1 },
  { id: 'owner', file: 'jjmk-owner.html', login: 1 },
  { id: 'admin', file: 'jjmk-admin.html', login: 1 },
  { id: 'payroll', file: 'jjmk-payroll.html', login: 1 },
  { id: 'payroll-org', file: 'jjmk-payroll.html#org', login: 1, fx: payrollOrgFixture, steps: [
    { label: 'ดูย้อนหลัง (◀ เมื่อวาน)', js: "document.querySelector('.og-day [data-dd=\"-1\"]').click()" } ] },   // 🧑‍🤝‍🧑 แผนผังพนักงาน + ข้อมูลจำลองที่สมจริง (~130 คน)
  // 🛡️ เงินประกัน / 🐷 เงินสำรองเลี้ยงชีพ (2026-10-20) — ข้อมูลจำลอง + เปิดหน้าต่างพรีวิว 🔒 / 💸 / เพิ่มสมาชิก / ถอน ระหว่างตรวจ (steps)
  { id: 'payroll-dep', file: 'jjmk-payroll.html#dep', login: 1, fx: payrollMoneyFixture, steps: [
    { label: 'หน้าต่าง 🔒 ปิดยอดงวดก่อน', js: "(async()=>{ const s=document.getElementById('depPeriodSel'); s.value=s.options[Math.min(1,s.options.length-1)].value; await depLockOpen(); })()", close: 'depLockBg' },
    { label: 'หน้าต่าง 💸 คืนส่วนเกิน', js: "(async()=>{ const s=document.getElementById('depPeriodSel'); s.value=s.options[0].value; renderDeposit(); await depRefundOpen(); })()", close: 'depRefBg' },
    // 💵 เบิกเงินประกันคืน (2026-10-21): เปิดหน้าต่างของคนที่มีรายการแล้ว (ตารางรายการ + ฟอร์ม) แล้วกด ✎ แก้ (หัวฟอร์ม/ปุ่ม "รายการใหม่แทน")
    { label: 'หน้าต่าง 💵 เบิกเงินประกันคืน', js: "(async()=>{ const s=document.getElementById('depPeriodSel'); s.value=s.options[0].value; renderDeposit(); const b=document.querySelector('#depTable button[onclick=\"depPoOpen(this)\"][data-emp=\"4\"]')||document.querySelector('#depTable button[onclick=\"depPoOpen(this)\"]'); if(!b) throw new Error('ไม่มีปุ่ม 💵'); await depPoOpen(b); const x=document.querySelector('#depPoList button[onclick=\"depPoEditBtn(this)\"]'); if(x) x.click(); document.getElementById('depPoAmt').value='100'; depPoHint(); })()", close: 'depPoBg' },
    // รอบ 10: 📚 ประวัติเงินเดือน (การ์ดที่ ≤560px) · 🛡️ ประวัติเงินประกันรายคน · 🕘 ค้น "ประกัน"
    { label: '🪪 แท็บเงินเดือน (📚 ประวัติเงินเดือน)', js: "(()=>{ if(!document.querySelector('#detailContent')) throw new Error('no detail'); detailEmpId = employees[0].id; detailTab = 'money'; go('detail'); renderDetail(true); if(!/ประวัติเงินเดือนย้อนหลัง/.test(document.getElementById('detailContent').textContent)) throw new Error('ไม่มีตาราง 📚'); })()" },
    { label: '🪪 แท็บ เบิก·ยืม·ประกัน (🛡️ ประวัติเงินประกัน)', js: "(()=>{ detailTab = 'debt'; renderDetail(true); if(!/ประวัติเงินประกัน/.test(document.getElementById('detailContent').textContent)) throw new Error('ไม่มีการ์ด 🛡️'); })()" },
    { label: '🕘 ค้น "ประกัน"', js: "(async()=>{ go('audit'); document.getElementById('audQ').value='ประกัน'; await renderAudit(); })()" },
    // 🔒 ปิดงวด (2026-10-21): แถบเตือนจ่ายแล้วยังไม่ปิด · หน้าต่างปิดงวด (เทียบไฟล์ K BIZ · ไม่ตรงไฟล์ = เลือกยอด) · เปิดงวดใหม่ · หน้ารายคนงวดที่ปิด (อ่านอย่างเดียว)
    { label: 'หน้าต่าง 🔒 ปิดงวด (เทียบไฟล์ K BIZ)', js: "(async()=>{ const p=payBatches.find(b=>b.kind==='kbiz').period; go('payroll'); const s=document.getElementById('periodSel'); if(![...s.options].some(o=>o.value===p)) s.add(new Option(p,p)); s.value=p; renderPayroll(); if(document.getElementById('closeDueBar').hidden) throw new Error('ไม่มีแถบเตือนจ่ายแล้วยังไม่ปิด'); await closeOpen(p,''); if(!closeUi || !closeUi.items.some(x=>x.st==='diff')) throw new Error('ไม่มีแถวยอดไม่ตรงไฟล์'); })()", close: 'closeBg' },
    { label: 'หน้าต่าง 🔓 เปิดงวดใหม่', js: "reopenOpen(paySlips[0].period,'')", close: 'reopenBg' },
    { label: '🪪 แท็บเงินเดือนงวดที่ปิด (อ่านอย่างเดียว)', js: "(()=>{ detailEmpId = paySlips[0].empId; detailTab = 'money'; go('detail'); const s=document.getElementById('detailPeriodSel'); s.value=paySlips[0].period; renderDetail(true); if(!/ปิดงวดแล้ว/.test(document.getElementById('detailContent').textContent)) throw new Error('ไม่มีป้ายปิดงวด'); })()" },
    // งวดเริ่มหักรายคน (2026-10-21): ช่อง "เริ่มหักงวด" ในตาราง 🛡️ (การ์ด ≤560px) + หน้า 🧾 สปส.
    { label: '🛡️ ช่องเริ่มหักงวด (งวดก่อน)', js: "(()=>{ go('dep'); const s=document.getElementById('depPeriodSel'); s.value=s.options[Math.min(1,s.options.length-1)].value; renderDeposit(); const x=document.querySelector('#depTable select.emp-st'); if(!x) throw new Error('ไม่มีช่องเริ่มหักงวด'); x.scrollIntoView({block:'center'}); })()" },
    { label: '🧾 สปส. ช่องเริ่มหักงวด', js: "(()=>{ go('sso'); renderSso(); const x=document.querySelector('#ssoTable select.emp-st'); if(!x) throw new Error('ไม่มีช่องเริ่มหักงวด'); x.scrollIntoView({block:'center',inline:'center'}); })()" } ] },
  { id: 'payroll-pvd', file: 'jjmk-payroll.html#pvd', login: 1, fx: payrollMoneyFixture, steps: [
    { label: 'หน้าต่าง ＋ เพิ่มสมาชิก', js: "openPvdForm()", close: 'pvdBg' },
    { label: 'หน้าต่าง 💸 ถอน/จ่ายคืน', js: "openPvdOut()", close: 'pvdOutBg' },
    { label: 'หน้าต่าง 🔒 ปิดยอดเงินสำรองฯ', js: "(async()=>{ const s=document.getElementById('pvdPeriodSel'); s.value=s.options[Math.min(1,s.options.length-1)].value; await pvdLockOpen(); })()", close: 'depLockBg' } ] },
  { id: 'calendar', file: 'jjmk-calendar.html', login: 1 },
  { id: 'invoice', file: 'jjmk-invoice.html', login: 1 },
  { id: 'social', file: 'jjmk-social.html', login: 1 },
  { id: 'maint', file: 'jjmk-maint.html', login: 1 },
  { id: 'kpi', file: 'jjmk-kpi.html', login: 1 },
  { id: 'kiosk', file: 'jjmk-kpi.html?kiosk=JJRD' },
  { id: 'stock', file: 'jjmk-stockcheck.html', login: 1 },
  { id: 'kitchen', file: 'jjmk-kitchen.html', login: 1 },
  { id: 'kitchen2', file: 'jjmk-kitchen-new.html', login: 1, optional: 1 },
  { id: 'order', file: 'jjmk-order.html', login: 1, pass: '1234' },   // แอปนี้ใช้ PIN พนักงาน (ค่าตั้งต้น 1234) ไม่ใช่บัญชีกลาง
  { id: 'office', file: 'jjmk-office.html', login: 1 },
  { id: 'allergy', file: 'jjmk-allergy.html', login: 1 },
  { id: 'menu', file: 'jjmk-menu.html?b=JJRD&t=1' },
  { id: 'privacy', file: 'privacy.html' },
];
// ของเดิมที่รู้อยู่แล้วและรอเจ้าของตัดสิน (CLAUDE.md) — ขึ้นเป็น ⚠ ไม่ใช่ ✗
const KNOWN = [
  { app: 'office', re: /ทับกัน/, why: 'ปุ่มวงภารกิจลอยทับปลายการ์ดผู้ใช้ (CLAUDE.md: รอเจ้าของตัดสิน)' },
];

// ---------- ผู้ใช้ทดสอบ + Supabase จำลอง ----------
const U = 'jjtest', P = 'jjtest-pass';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const TEST_USER = { id: 1, username: U, pass_hash: sha(U + '|' + P + '|JJPNL'), name: 'ผู้ทดสอบ', display_name: 'ผู้ทดสอบ', role: 'admin', unit: 'ALL', active: true, status: 'active', apps: {} };
// fx = ข้อมูลจำลองรายแอป {ตาราง: แถว[]} (เช่นแผนผังพนักงานต้องมีพนักงาน/กะ/เวลาสแกนถึงจะเห็นหน้าจริง)
function fakeSupabase(route, fx) {
  const r = route.request(), u = new URL(r.url()), accept = r.headers()['accept'] || '';
  const tbl = (u.pathname.match(/\/rest\/v1\/([^/?]+)/) || [])[1] || '';
  const one = /vnd\.pgrst\.object/.test(accept);
  let body = [];
  if (tbl === 'pnl_users') body = [TEST_USER];
  if (tbl === 'branches') body = [{ id: 1, name: 'สาขารัชดา', code: 'JJRD' }, { id: 2, name: 'สาขาลาดพร้าว', code: 'JJLP' }];   // ซ่อมบำรุงต้องมีสาขาก่อนเข้าได้
  if (fx && Array.isArray(fx[tbl])) {   // ข้อมูลจำลองรายแอป: ทำตาม .range()/.limit() (แอปโหลดเวลาสแกนทีละ 1,000 แถว)
    const off = +u.searchParams.get('offset') || 0, lim = u.searchParams.get('limit');
    body = fx[tbl].slice(off, lim != null ? off + +lim : undefined);
  }
  if (/\/rest\/v1\/rpc\//.test(u.pathname)) body = /count/.test(u.pathname) ? 0 : [];
  if (/\/auth\/v1\//.test(u.pathname)) body = {};
  if (/\/storage\/v1\//.test(u.pathname)) body = [];
  if (/\/functions\/v1\//.test(u.pathname)) return route.fulfill({ status: 404, body: 'not deployed (mock)' });
  if (one) body = Array.isArray(body) ? (body[0] || null) : body;
  if (one && body == null) return route.fulfill({ status: 406, contentType: 'application/json', body: '{"code":"PGRST116"}' });
  return route.fulfill({ status: r.method() === 'HEAD' ? 200 : 200, contentType: 'application/json',
    headers: { 'content-range': '*/' + (Array.isArray(body) ? body.length : 0), 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' },
    body: r.method() === 'HEAD' ? '' : JSON.stringify(body) });
}
// ไลบรารีจาก CDN: session ทดสอบออกเน็ตไป CDN ไม่ได้ → ใช้สำเนาจาก npm (tests/node_modules) รุ่นเดียวกับที่แอปเรียก
const NM = path.join(HERE, '..', 'node_modules');
const CDN_MAP = [
  [/@supabase\/supabase-js@2/, '@supabase/supabase-js/dist/umd/supabase.js'],
  [/Chart\.js\/4\.4\.1\/chart\.umd\.min\.js/, 'chart.js/dist/chart.umd.js'],
  [/three\.js\/r128\/three\.min\.js/, 'three/build/three.min.js'],
  [/xlsx\/0\.18\.5\/xlsx\.full\.min\.js/, 'xlsx/dist/xlsx.full.min.js'],
  [/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/, 'jspdf/dist/jspdf.umd.min.js'],
  [/html2canvas\/1\.4\.1\/html2canvas\.min\.js/, 'html2canvas/dist/html2canvas.min.js'],
];
const QR_STUB = 'window.QRCode={toCanvas:function(c,t,o,cb){(cb||o)&&typeof(cb||o)==="function"&&(cb||o)(null);return Promise.resolve()},toDataURL:function(){return Promise.resolve("data:image/png;base64,")},toString:function(){return Promise.resolve("<svg/>")}};';
async function cdn(route) {
  const url = route.request().url();
  if (/thailand-geography/.test(url)) return route.fulfill({ contentType: 'application/json', body: '[]' });   // รายชื่อจังหวัดของฟอร์มสมัคร
  if (/qrcode@/.test(url)) return route.fulfill({ contentType: 'text/javascript', body: QR_STUB });
  const hit = CDN_MAP.find(([re]) => re.test(url));
  const f = hit && path.join(NM, hit[1]);
  if (f && fs.existsSync(f)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) });
  missingCdn.add(url.replace(/^https?:\/\//, ''));
  return route.abort();
}
const missingCdn = new Set();

// ---------- เว็บเซิร์ฟเวอร์ของไฟล์ใน repo ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.py': 'text/plain' };
const server = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(s);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port + '/';

// ---------- ตรวจหน้าจอ (รันในหน้าเว็บ) ----------
function probe({ t, b, l, r, W, H }) {
  const res = { hscroll: 0, top: [], bottom: [], side: [], smallInput: [], overlap: [], tiny: 0 };
  const de = document.documentElement;
  res.hscroll = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0) - W;
  const lab = el => {
    const s = (el.getAttribute('aria-label') || el.title || el.innerText || el.value || el.placeholder || el.id || el.className || el.tagName) + '';
    return (el.tagName.toLowerCase() + ' "' + s.replace(/\s+/g, ' ').trim().slice(0, 28) + '"');
  };
  // ฉากหลังหน้าต่าง (modal backdrop) = fixed คลุมเกือบทั้งจอ + ชื่อคลาส/ไอดีบอกว่าเป็นหน้าต่าง (modal/backdrop/overlay/…Bg) + มีปุ่ม/ช่องกรอกอยู่ข้างใน
  // ใช้จำกัดข้อยกเว้น 2 ข้อด้านล่างให้เฉพาะหน้าต่าง — ปุ่ม/กล่องเลื่อนธรรมดาของแอปอื่นยังถูกตรวจเต็มเหมือนเดิม
  const bdMemo = new Map();
  const isBackdrop = el => {
    if (!el || el.nodeType !== 1) return false;
    if (bdMemo.has(el)) return bdMemo.get(el);
    let v = false;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') {
      const r = el.getBoundingClientRect();
      const name = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '');
      v = r.width >= W * 0.9 && r.height >= H * 0.9 && /modal|backdrop|overlay|bg\b/i.test(name) && !!el.querySelector('button,input,select,textarea,a[href]');
    }
    bdMemo.set(el, v);
    return v;
  };
  const inBackdrop = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (isBackdrop(a)) return true; return false; };
  const vis = el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || cs.pointerEvents === 'none') return null;
    let rc = el.getBoundingClientRect();
    if (rc.width < 2 || rc.height < 2 || rc.bottom <= 0 || rc.top >= H || rc.right <= 0 || rc.left >= W) return null;
    // เนื้อหาในหน้าต่าง (อยู่ใต้ฉากหลังหน้าต่าง) ส่วนที่ถูกกล่องเลื่อน/ตัดขอบ (overflow) ซ่อนไว้ มองไม่เห็นและกดไม่ได้ — วัดเฉพาะส่วนที่โผล่จริง
    // (เช่นเนื้อหาในหน้าต่างที่เลื่อนขึ้นไปเกินขอบบนของหน้าต่าง — หน้าต่างเริ่มใต้แถบสถานะอยู่แล้ว) · นอกหน้าต่าง = วัดเต็มกล่องแบบเดิม
    if (inBackdrop(el)) {
      let ct = rc.top, cb = rc.bottom, cl = rc.left, cr = rc.right;
      for (let a = el.parentElement; a && a !== document.documentElement && a !== document.body; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.overflowX === 'visible' && ac.overflowY === 'visible') continue;
        const ar = a.getBoundingClientRect();
        ct = Math.max(ct, ar.top); cb = Math.min(cb, ar.bottom); cl = Math.max(cl, ar.left); cr = Math.min(cr, ar.right);
      }
      if (cb - ct < 2 || cr - cl < 2) return null;
      if (ct !== rc.top || cb !== rc.bottom || cl !== rc.left || cr !== rc.right) rc = { top:ct, bottom:cb, left:cl, right:cr, width:cr - cl, height:cb - ct };
    }
    // บังด้วยของอื่น (เช่น หน้าล็อกอินคลุมทั้งจอ) = ไม่นับ
    const cx = Math.min(W - 1, Math.max(0, rc.left + rc.width / 2)), cy = Math.min(H - 1, Math.max(0, rc.top + rc.height / 2));
    const hit = document.elementFromPoint(cx, cy);
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) return null;
    return rc;
  };
  const clickable = [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[onclick],[role=button],[data-v],[data-tab]')];
  const rects = [];
  for (const el of clickable) {
    const rc = vis(el); if (!rc) continue;
    if (isBackdrop(el)) continue;   // ฉากหลังหน้าต่าง (เช่น .modal-bg ที่คลิกนอกหน้าต่างเพื่อปิด) ไม่ใช่ปุ่ม — ของเต็มจออื่นยังตรวจ
    // ติดจอจริง = มีบรรพบุรุษเป็น fixed/sticky และระหว่างทางไม่มีกล่องที่เลื่อนได้ (เนื้อหาในหน้าต่างที่เลื่อนได้ ผู้ใช้เลื่อนขึ้นมากดได้)
    const scrollsY = e => { const o = getComputedStyle(e).overflowY; return (o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 1; };
    const scrollsX = e => { const o = getComputedStyle(e).overflowX; return (o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth + 1; };
    let pinned = false, pinBot = false, inHScroll = false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e !== el && scrollsX(e)) inHScroll = true;
      if (e !== el && scrollsY(e)) break;
      const cs = getComputedStyle(e), p = cs.position;
      // sticky ที่ตั้งแค่ top (เช่นแถวปุ่มกะของแผนผังพนักงาน) ติดได้แค่ขอบบน — ตอนยังไม่ติดมันเลื่อนตามเนื้อหา ไม่ใช่ปุ่มที่ค้างล่างจอ
      if (p === 'fixed' || p === 'sticky') { pinned = !scrollsY(e); pinBot = pinned && (p === 'fixed' || cs.bottom !== 'auto'); break; }
    }
    rects.push([el, rc, pinned]);
    // เลื่อนหน้าลงแล้ว ของธรรมดาเลื่อนผ่านใต้แถบสถานะได้ตามปกติ — นับเฉพาะของที่ติดจอ (fixed/sticky)
    if (t > 0 && rc.top < t - 1 && rc.bottom > 1 && (window.scrollY < 1 || pinned)) res.top.push(lab(el) + ' y=' + Math.round(rc.top));
    if (b > 0 && rc.bottom > H - b + 1 && rc.top < H - 1) {
      if (pinBot) res.bottom.push(lab(el) + ' ล่าง=' + Math.round(H - rc.bottom));
    }
    // แถบที่เลื่อนข้างได้ (แท็บ/ชิป) ปุ่มปลายแถบเลยขอบจอได้ตามปกติ — ไม่นับ
    if (!inHScroll && ((l > 0 && rc.left < l - 1 && rc.right > 1) || (r > 0 && rc.right > W - r + 1 && rc.left < W - 1))) res.side.push(lab(el));
    if (W <= 700 && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/^(checkbox|radio|range|color|file|button|submit)$/.test(el.type)) {
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 16) res.smallInput.push(lab(el) + ' ' + fs + 'px');
    }
    if (rc.height < 28 && rc.width < 28 && !/^(INPUT)$/.test(el.tagName)) res.tiny++;
  }
  // ปุ่ม 2 อันทับกันเกินครึ่ง (ตัวที่อยู่ข้างบนบังตัวล่างจนกดไม่ได้)
  for (let i = 0; i < rects.length && res.overlap.length < 5; i++) for (let j = i + 1; j < rects.length; j++) {
    const [ea, a, pa] = rects[i], [eb, c, pb] = rects[j];
    if (ea.contains(eb) || eb.contains(ea) || pa !== pb) continue;   // แถบติดจอบังเนื้อหาที่เลื่อนผ่านใต้มัน = ปกติ
    const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    if (ix > 4 && iy > 4 && ix * iy > 0.5 * Math.min(a.width * a.height, c.width * c.height)) { res.overlap.push(lab(ea) + ' ทับกับ ' + lab(eb)); break; }
  }
  return res;
}

async function checkPage(page, d, label) {
  const p = await page.evaluate(probe, { t: d.t || 0, b: d.b || 0, l: d.l || 0, r: d.r || 0, W: d.w, H: d.h });
  const issues = [];
  if (p.hscroll > 1) issues.push(['✗', `หน้าเลื่อนข้างได้ ${p.hscroll}px`]);
  if (p.top.length) issues.push(['✗', `ปุ่มอยู่ใต้แถบสถานะ/รอยบาก (บน ${d.t}px): ${p.top.slice(0, 3).join(' · ')}`]);
  if (p.bottom.length) issues.push(['✗', `ปุ่มที่ติดจอลงไปในแถบโฮม (ล่าง ${d.b}px): ${p.bottom.slice(0, 3).join(' · ')}`]);
  if (p.side.length) issues.push(['✗', `ปุ่มอยู่ใต้รอยบากด้านข้าง: ${p.side.slice(0, 3).join(' · ')}`]);
  if (p.smallInput.length) issues.push(['✗', `ช่องกรอกตัวเล็กกว่า 16px (iPhone ซูมเอง): ${p.smallInput.slice(0, 3).join(' · ')}`]);
  if (p.overlap.length) issues.push(['⚠', `ปุ่มทับกัน: ${p.overlap.slice(0, 2).join(' · ')}`]);
  return issues.map(([s, m]) => ({ s, m: label + ': ' + m }));
}

async function runOne(browser, d, app) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: !d.tablet || true, hasTouch: true, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  // Playwright เช็ค route ที่ลงทะเบียนทีหลังก่อน → ตัวกันออกเน็ตต้องลงก่อนสุด
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());   // ห้ามออกเน็ตจริง (Google/LINE/Apify …)
  const fx = app.fx ? app.fx() : null;
  await ctx.route(/\.supabase\.co\//, r => fakeSupabase(r, fx));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)/, cdn);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0]));
  const cdp = await ctx.newCDPSession(page);
  try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: d.t || 0, bottom: d.b || 0, left: d.l || 0, right: d.r || 0 } }); } catch {}
  const issues = [];
  try {
    await page.goto(BASE + app.file, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);
    issues.push(...await checkPage(page, d, 'หน้าแรกที่เปิด'));
    if (app.login) {
      const pw = page.locator('input[type=password]:visible').first();
      if (await pw.count()) {
        await page.evaluate(([u, p]) => {
          const pw = [...document.querySelectorAll('input[type=password]')].find(e => e.offsetParent);
          let box = pw.parentElement, user = null;
          while (box && !user) {
            const ins = [...box.querySelectorAll('input')].filter(e => e.offsetParent && /^(text|email|tel|search|)$/.test(e.type) && e !== pw);
            user = ins.filter(e => e.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING).pop() || null;
            box = box.parentElement;
          }
          const set = (el, v) => { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
          if (user) set(user, u); set(pw, p);
        }, [U, app.pass || P]);
        await pw.press('Enter');
        await page.waitForTimeout(2500);
        if (await page.locator('input[type=password]:visible').count()) {
          const why = await page.evaluate(() => [...document.querySelectorAll('[id*=msg i],[id*=err i],[class*=msg i]')].map(e => e.offsetParent ? e.innerText.trim() : '').filter(Boolean).join(' / ').slice(0, 90));
          issues.push({ s: '⚠', m: 'ล็อกอินด้วยผู้ใช้ทดสอบไม่ผ่าน — ตรวจได้แค่หน้าล็อกอิน' + (why ? ' (แอปตอบ: ' + why + ')' : '') });
        }
        else {
          issues.push(...await checkPage(page, d, 'หน้าหลักหลังล็อกอิน'));
          await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(300);
          issues.push(...await checkPage(page, d, 'หลังเลื่อนลง'));
          // steps = เปิดหน้าต่าง/สถานะเพิ่มระหว่างตรวจ (เช่นพรีวิว 🔒/💸) แล้วตรวจกติกาเดียวกัน · ไม่เปิด = เตือน
          for (const st of app.steps || []) {
            await page.evaluate(() => window.scrollTo(0, 0));
            try { await page.evaluate(js => Promise.resolve(eval(js)), st.js); } catch (e) { issues.push({ s: '⚠', m: st.label + ': เปิดไม่ได้ — ' + String(e.message).split('\n')[0] }); continue; }
            await page.waitForTimeout(700);
            const shown = st.close ? await page.evaluate(id => !!document.getElementById(id) && document.getElementById(id).classList.contains('show'), st.close) : true;
            if (!shown) { issues.push({ s: '⚠', m: st.label + ': หน้าต่างไม่เปิด' }); continue; }
            issues.push(...await checkPage(page, d, st.label));
            if (SHOTS) { fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true }); await page.screenshot({ path: path.join(OUT, 'shots', `${app.id}-${d.id}-${(app.steps.indexOf(st) + 1)}.png`) }); }
            await page.evaluate(id => { const m = document.getElementById(id); if (m) m.scrollTop = m.scrollHeight; }, st.close);
            await page.waitForTimeout(200);
            issues.push(...await checkPage(page, d, st.label + ' (เลื่อนลงสุด)'));
            if (st.close) await page.evaluate(id => closeModal(id), st.close);
          }
        }
      }
    }
    if (SHOTS) { fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true }); await page.screenshot({ path: path.join(OUT, 'shots', `${app.id}-${d.id}.png`) }); }
  } catch (e) { issues.push({ s: '✗', m: 'เปิดหน้าไม่ได้: ' + String(e.message).split('\n')[0] }); }
  for (const e of [...new Set(errors)].slice(0, 3)) issues.push({ s: '⚠', m: 'JS error: ' + e.slice(0, 140) });
  await ctx.close();
  // ปัญหาเดียวกันที่เจอทั้งก่อน/หลังเลื่อน = รายงานครั้งเดียว
  const seen = new Set();
  for (let k = issues.length - 1; k >= 0; k--) issues[k]._k = issues[k].m.replace(/^[^:]*: /, '').replace(/y=-?\d+|ล่าง=-?\d+/g, '');
  const uniq = issues.filter(i => !seen.has(i._k) && seen.add(i._k));
  issues.length = 0; issues.push(...uniq);
  for (const i of issues) { const k = KNOWN.find(k => k.app === app.id && k.re.test(i.m)); if (k && i.s === '✗') { i.s = '⚠'; i.m += ' — ' + k.why; } }
  return issues;
}

// ---------- รัน ----------
const devSel = arg('dev') ? arg('dev').split(',') : null, appSel = arg('app') ? arg('app').split(',') : null;
const devs = DEVICES.filter(d => devSel ? devSel.includes(d.id) : (ALL || d.core));
const apps = APPS.filter(a => (appSel ? appSel.includes(a.id) : true) && fs.existsSync(path.join(ROOT, a.file.split(/[?#]/)[0])));
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
const jobs = []; for (const a of apps) for (const d of devs) jobs.push([a, d]);
const results = new Map();
let done = 0;
const CONC = Number(arg('conc') || 4);
await Promise.all(Array.from({ length: CONC }, async () => {
  while (jobs.length) {
    const [a, d] = jobs.shift();
    const r = await runOne(browser, d, a);
    results.set(a.id + '|' + d.id, r);
    process.stderr.write(`\r${++done}/${apps.length * devs.length} ${a.id} @ ${d.name}            `);
  }
}));
process.stderr.write('\n');
await browser.close(); server.close();

let nF = 0, nW = 0; const lines = [];
lines.push(`jj-mobile-check · ${apps.length} แอป × ${devs.length} รุ่น (${devs.map(d => d.name).join(', ')})`);
for (const a of apps) {
  const per = devs.map(d => [d, results.get(a.id + '|' + d.id) || []]);
  const bad = per.filter(([, r]) => r.length);
  if (!bad.length) { lines.push(`  ✓ ${a.id.padEnd(9)} ผ่านทุกรุ่น`); continue; }
  // รวมปัญหาเดียวกันหลายรุ่นเป็นบรรทัดเดียว
  const by = new Map();
  for (const [d, r] of bad) for (const i of r) { const k = i.s + ' ' + i.m.replace(/y=-?\d+|ล่าง=-?\d+|\d+px/g, '…'); (by.get(k) || by.set(k, { i, ds: [] }).get(k)).ds.push(d.id); }
  for (const { i, ds } of by.values()) { lines.push(`  ${i.s} ${a.id.padEnd(9)} [${ds.join(',')}] ${i.m}`); i.s === '✗' ? nF++ : nW++; }
}
if (missingCdn.size) lines.push('  ⚠ ไลบรารี CDN ที่ไม่มีสำเนาในเครื่อง (หน้าอาจทำงานไม่ครบ): ' + [...missingCdn].join(', '));
lines.push(`\n${nF ? '✗ ' + nF + ' FAILED' : 'ALL PASSED'}${nW ? ' · ⚠ ' + nW + ' warning' : ''}`);
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'report.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(nF ? 1 : 0);
