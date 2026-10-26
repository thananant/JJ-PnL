// ใบกำกับภาษี · 🖨 พิมพ์บิล (เจ้าของสั่ง 2026-10-26): ปุ่ม 👁 ดู แยกจาก 🖨 พิมพ์ · พิมพ์เลือกได้ มี/ไม่มีลายเซ็น
// เปิดแอปจริงใน Chromium + Supabase จำลอง (ไม่แตะฐานข้อมูลจริง) · window.print ถูกแทนด้วยตัวจดว่าตอนสั่งพิมพ์หน้าตาเป็นอย่างไร
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { createRequire } from 'module';
import { ROOT, suite } from './lib.mjs';

const require = createRequire(path.join(ROOT, 'tests', 'package.json'));
const { chromium } = require('playwright');
const NM = path.join(ROOT, 'tests', 'node_modules');
const CDN = [
  [/@supabase\/supabase-js@2/, '@supabase/supabase-js/dist/umd/supabase.js'],
  [/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/, 'jspdf/dist/jspdf.umd.min.js'],
  [/html2canvas\/1\.4\.1\/html2canvas\.min\.js/, 'html2canvas/dist/html2canvas.min.js'],
];
const U = 'jjtest', P = 'jjtest-pass';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const USER = { id: 1, username: U, pass_hash: sha(U + '|' + P + '|JJPNL'), name: 'ผู้ทดสอบ', display_name: 'ผู้ทดสอบ', role: 'admin', unit: 'ALL', active: true, status: 'active', apps: {} };
const BILL = { id: 7, bill_no: 'JJRD1291', branch_prefix: 'JJRD', customer_name: 'บริษัท ทดสอบ จำกัด', tax_id: '0107555000376', phone: '0925169397',
  email: 'a@example.com', address: 'กรุงเทพ', items: [{ name: 'อาหารและเครื่องดื่ม', qty: 1, price: 3736.44 }], gross: 3736.44, discount: 0, net: 3492, vat: 244.44,
  grand_total: 3736.44, payment_method: 'เงินสด', status: 'ออกแล้ว', status_detail: '', created_by: U, updated_by: U, nas_path: 'JJRD/102026/JJRD1291.pdf',
  issued_at: '2026-10-23T05:23:00.000Z', created_at: '2026-10-23T05:23:00.000Z', updated_at: '2026-10-23T05:23:00.000Z', email_status: 'ส่งถึงแล้ว' };

const server = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(s);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port + '/';

function settingsRows(sig) {
  const rows = [{ key: 'pdf_with_copy', value: sig.copy ? '1' : '0' }];
  if (sig.url) rows.push({ key: 'signature', value: sig.url }, { key: 'signature_at', value: '2026-10-20T03:00:00.000Z' }, { key: 'signature_by', value: 'เจ้าของ' });
  return rows;
}
function keyFilter(rows, q) {
  const k = q.get('key'); if (!k) return rows;
  if (k.startsWith('eq.')) return rows.filter(r => r.key === k.slice(3));
  if (k.startsWith('neq.')) return rows.filter(r => r.key !== k.slice(4));
  if (k.startsWith('in.(')) { const set = k.slice(4, -1).split(',').map(x => x.replace(/^"|"$/g, '')); return rows.filter(r => set.includes(r.key)); }
  return rows;
}
async function open(browser, sig, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await ctx.route(/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/, r => {
    const hit = CDN.find(([re]) => re.test(r.request().url()));
    return hit ? r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(NM, hit[1])) }) : r.abort();
  });
  await ctx.route(/\.supabase\.co\//, r => {
    const req = r.request(), u = new URL(req.url()), tbl = (u.pathname.match(/\/rest\/v1\/([^/?]+)/) || [])[1] || '';
    const one = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
    let body = [];
    if (tbl === 'pnl_users') body = [USER];
    if (tbl === 'inv_settings' && req.method() === 'GET') body = keyFilter(settingsRows(sig), u.searchParams);
    if (tbl === 'inv_invoices' && req.method() === 'GET') body = [BILL];
    if (/\/rest\/v1\/rpc\//.test(u.pathname)) body = [];
    if (/\/functions\/v1\//.test(u.pathname)) return r.fulfill({ status: 404, body: 'mock' });
    if (one) { body = body[0] || null; if (!body) return r.fulfill({ status: 406, contentType: 'application/json', body: '{"code":"PGRST116"}' }); }
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/' + (Array.isArray(body) ? body.length : 1), 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(body) });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.addInitScript(() => {
    window.__prints = [];
    window.print = function () {   // จดสภาพหน้าตอนสั่งพิมพ์ (แทนหน้าต่างพิมพ์จริง)
      const st = document.getElementById('printStage');
      const vis = Array.from(st.children).filter(n => n.style.display !== 'none');
      window.__prints.push({ printing: document.body.classList.contains('printing'), n: vis.length,
        sig: vis.map(n => !!n.querySelector('.iv-sigwrap img')), labels: vis.map(n => (n.querySelector('.iv-orig') || {}).textContent || '') });
    };
  });
  await page.goto(BASE + 'jjmk-invoice.html');
  await page.waitForSelector('#liUser', { state: 'visible' });
  await page.fill('#liUser', U); await page.fill('#liPass', P); await page.click('#liBtn');
  await page.waitForFunction(() => window.currentUser && document.getElementById('loginWrap').style.display === 'none');
  await page.click('.tab[data-tab="sent"]');          // บิลส่งถึงแล้ว = แท็บ ✅ ส่งสำเร็จ
  await page.waitForSelector('#tab-sent .a-print, .a-print:visible');
  await page.waitForFunction(() => window.sigMeta && window.sigMeta.loaded);
  return { ctx, page, errors };
}

const t = suite('ใบกำกับ · 🖨 พิมพ์บิล มี/ไม่มีลายเซ็น');
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox'] });
try {
  const fac = await browser.newPage();
  const SIG = await fac.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 200; const g = c.getContext('2d');
    g.strokeStyle = '#1c3570'; g.lineWidth = 8; g.beginPath(); g.moveTo(30, 150); g.bezierCurveTo(150, 10, 300, 190, 570, 60); g.stroke(); return c.toDataURL('image/png'); });
  await fac.close();

  // ---- มีลายเซ็นในระบบ ----
  let { ctx, page, errors } = await open(browser, { url: SIG });
  const btns = await page.evaluate(() => { const card = [...document.querySelectorAll('.a-print')].find(b=>b.offsetParent).closest('.inv');
    return { view: card.querySelector('.a-pdf').textContent, print: card.querySelector('.a-print').textContent }; });
  t.eq(btns, { view: '👁 ดู', print: '🖨 พิมพ์' }, 'การ์ดบิลมีปุ่ม 👁 ดู แยกจาก 🖨 พิมพ์');
  t.ok(await page.evaluate(() => !!sigDataUrl), 'โหลดลายเซ็นกลางได้');

  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  let st = await page.evaluate(() => ({ bill: document.getElementById('prBill').textContent,
    sheets: Array.from(document.getElementById('printStage').children).map(n => n.getAttribute('data-sig') + ':' + !!n.querySelector('.iv-sigwrap img')) }));
  t.ok(st.bill.includes('JJRD1291'), 'หน้าต่างเลือกบอกเลขบิล');
  t.eq(st.sheets, ['1:true', '0:false'], 'เตรียมไว้ 2 แบบ: มีลายเซ็น / ไม่มีลายเซ็น');
  await page.click('#prWith');
  let pr = await page.evaluate(() => window.__prints.slice(-1)[0]);
  t.eq(pr, { printing: true, n: 1, sig: [true], labels: ['ต้นฉบับ'] }, 'กด "มีลายเซ็น" = สั่งพิมพ์ทันที หน้าเดียว มีลายเซ็น');

  // ระหว่างพิมพ์ เห็นแค่ใบบิล (CSS @media print)
  await page.emulateMedia({ media: 'print' });
  const vis = await page.evaluate(() => ({ header: getComputedStyle(document.querySelector('header')).display, wrap: getComputedStyle(document.querySelector('body > .wrap')).display,
    stage: getComputedStyle(document.getElementById('printStage')).display, toast: getComputedStyle(document.getElementById('toast')).display }));
  t.eq(vis, { header: 'none', wrap: 'none', stage: 'block', toast: 'none' }, 'หน้าพิมพ์เห็นแค่ใบบิล ไม่มีหัวแอป/รายการ/ข้อความแจ้ง');
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  t.eq((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 1, 'ใบบิลพอดี A4 หน้าเดียว');
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  st = await page.evaluate(() => ({ printing: document.body.classList.contains('printing'), n: document.getElementById('printStage').children.length }));
  t.eq(st, { printing: false, n: 0 }, 'พิมพ์เสร็จ (afterprint) = ล้างหน้าพิมพ์');

  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  t.ok(await page.evaluate(() => document.getElementById('prWith').classList.contains('btn-primary')), 'ครั้งก่อนเลือกมีลายเซ็น → ปุ่มมีลายเซ็นเป็นปุ่มหลัก');
  await page.click('#prWithout');
  pr = await page.evaluate(() => window.__prints.slice(-1)[0]);
  t.eq(pr, { printing: true, n: 1, sig: [false], labels: ['ต้นฉบับ'] }, 'กด "ไม่มีลายเซ็น" = พิมพ์แบบเว้นช่องผู้รับเงินว่าง');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  t.ok(await page.evaluate(() => document.getElementById('prWithout').classList.contains('btn-primary')), 'จำแบบที่เลือกล่าสุด (ไม่มีลายเซ็น)');
  const n0 = await page.evaluate(() => window.__prints.length);
  await page.keyboard.press('Escape');
  st = await page.evaluate(() => ({ hidden: document.getElementById('prChoice').hidden, n: document.getElementById('printStage').children.length, p: window.__prints.length }));
  t.eq(st, { hidden: true, n: 0, p: n0 }, 'Esc = ยกเลิก ไม่พิมพ์ ล้างหน้าพิมพ์');
  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  await page.click('#prCancel');
  t.eq(await page.evaluate(() => window.__prints.length), n0, 'ปุ่มยกเลิก = ไม่พิมพ์');

  // 👁 ดู ยังเปิด PDF แบบเดิม (มีลายเซ็น)
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return {}; }; });
  await page.locator('.a-pdf:visible').first().click();
  await page.waitForFunction(() => window.__opened.length > 0, null, { timeout: 30000 });
  t.ok(await page.evaluate(() => /^blob:/.test(window.__opened[0])), '👁 ดู เปิดไฟล์ PDF ในแท็บใหม่เหมือนเดิม');
  t.eq(errors, [], 'ไม่มี JS error');
  await ctx.close();

  // ---- เปิดหน้าสำเนาไว้ = พิมพ์ 2 หน้า ----
  ({ ctx, page, errors } = await open(browser, { url: SIG, copy: true }));
  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  await page.click('#prWith');
  pr = await page.evaluate(() => window.__prints.slice(-1)[0]);
  t.eq(pr, { printing: true, n: 2, sig: [true, true], labels: ['ต้นฉบับ', 'สำเนา'] }, 'ตั้งแนบหน้าสำเนา = พิมพ์ต้นฉบับ + สำเนา');
  await page.emulateMedia({ media: 'print' });
  const pdf2 = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  t.eq((pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 2, 'ต้นฉบับ/สำเนา คนละหน้า');
  await ctx.close();

  // ---- ยังไม่มีลายเซ็นในระบบ = ไม่ถาม พิมพ์แบบเว้นช่องเลย ----
  ({ ctx, page, errors } = await open(browser, {}));
  await page.locator('.a-print:visible').first().click();
  await page.waitForFunction(() => window.__prints.length > 0);
  st = await page.evaluate(() => ({ asked: !document.getElementById('prChoice').hidden, pr: window.__prints[0], toast: document.getElementById('toast').textContent }));
  t.eq(st.asked, false, 'ไม่มีลายเซ็นในระบบ = ไม่ต้องเลือก');
  t.eq(st.pr.sig, [false], 'พิมพ์แบบเว้นช่องให้เซ็นเอง');
  t.ok(/ยังไม่มีลายเซ็น/.test(st.toast), 'บอกว่ายังไม่มีลายเซ็นในระบบ');
  await ctx.close();

  // ---- มือถือ: หน้าต่างเลือกพอดีจอ ปุ่มใหญ่พอ ----
  ({ ctx, page, errors } = await open(browser, { url: SIG }, { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }));
  await page.evaluate(() => [...document.querySelectorAll('.a-print')].find(b=>b.offsetParent).scrollIntoView({ block: 'center' }));
  await page.locator('.a-print:visible').first().tap();
  await page.waitForFunction(() => !document.getElementById('prChoice').hidden);
  const lay = await page.evaluate(() => ['prWith', 'prWithout', 'prCancel'].map(id => { const b = document.getElementById(id).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.height)]; }));
  t.ok(lay.every(([l, r, h]) => l >= 0 && r <= 320 && h >= 44), 'มือถือ 320px: ปุ่มอยู่ในจอ สูง ≥44px — ' + JSON.stringify(lay));
  await page.tap('#prWithout');
  t.eq((await page.evaluate(() => window.__prints.slice(-1)[0])).sig, [false], 'มือถือพิมพ์ได้เหมือนกัน');
  t.eq(errors, [], 'มือถือไม่มี JS error');
  await ctx.close();
} finally {
  await browser.close(); server.close();
}
process.exitCode = t.done() ? 1 : 0;
