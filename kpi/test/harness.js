'use strict';
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(__dirname + '/../../jjmk-kpi.html', 'utf8')
  .replace(/<script src="[^"]+"><\/script>/, '') // drop supabase CDN tag
  .replace(/<link[^>]+>/g, '');                     // drop font links
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
function ok(cond, msg) { if (cond) console.log('  ✓ ' + msg); else { failures++; console.log('  ✗ ' + msg); } }

/* ---------- fake database ---------- */
function makeDb(opts) {
  opts = opts || {};
  const db = { departments: [], staff: [], responses: [], scores: [], nextId: 1 };
  if (!opts.empty) {
    db.departments = [
      { id: 1, name: 'อาหาร', icon: '🍖', sort_order: 1, active: true },
      { id: 2, name: 'บริการ', icon: '🙋', sort_order: 2, active: true },
      { id: 3, name: 'ความสะอาด', icon: '🧹', sort_order: 3, active: true },
      { id: 4, name: 'เก่า', icon: '📦', sort_order: 4, active: false }
    ];
    db.staff = [
      { id: 1, branch: 'JJRD', name: 'สมชาย ใจดี', nickname: 'ชาย', position: 'เสิร์ฟ', sort_order: 1, active: true },
      { id: 2, branch: 'JJRD', name: 'สมหญิง', nickname: 'หญิง', position: 'แคชเชียร์', sort_order: 2, active: true },
      { id: 3, branch: 'JJRD', name: 'ลาออก', nickname: 'ออก', position: null, sort_order: 3, active: false },
      { id: 4, branch: 'JJLP', name: 'มานี', nickname: 'นี', position: 'เสิร์ฟ', sort_order: 1, active: true },
      { id: 5, branch: 'JJLP', name: 'มานะ', nickname: null, position: 'ครัว', sort_order: 2, active: true }
    ];
    // 45 days of data, both branches
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const today = new Date(); today.setHours(12, 0, 0, 0);
    for (let back = 0; back < 45; back++) {
      const d = new Date(today); d.setDate(d.getDate() - back);
      const biz = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      for (const br of ['JJRD', 'JJLP']) {
        const n = 10 + Math.floor(rnd() * 30);
        for (let i = 0; i < n; i++) {
          const hour = [11, 12, 13, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2][Math.floor(rnd() * 13)];
          const t = new Date(d); if (hour < 5) t.setDate(t.getDate() + 1); t.setHours(hour, Math.floor(rnd() * 60), 0, 0);
          const id = db.nextId++;
          const staffPool = db.staff.filter(s => s.branch === br && s.active);
          db.responses.push({ id, branch: br, biz_date: biz, created_at: t.toISOString(), device: br + '-x', staff_id: rnd() < 0.5 ? staffPool[Math.floor(rnd() * staffPool.length)].id : null });
          for (const dep of [1, 2, 3]) { if (rnd() < 0.1) continue; const r = rnd(); db.scores.push({ response_id: id, department_id: dep, score: r < 0.55 ? 5 : r < 0.85 ? 4 : r < 0.95 ? 3 : r < 0.98 ? 2 : 1 }); }
        }
      }
    }
  }
  const group = (rows, keyFn, init, add) => { const m = {}; for (const r of rows) { const k = keyFn(r); if (!m[k]) m[k] = init(r); add(m[k], r); } return Object.values(m); };
  db.view = t => {
    if (opts.missing) throw new Error('relation "public.' + t + '" does not exist');
    switch (t) {
      case 'kpi_departments': return db.departments;
      case 'kpi_staff': return db.staff;
      case 'kpi_responses': return db.responses.map(r => Object.assign({}, r, { kpi_scores: db.scores.filter(s => s.response_id === r.id).map(s => ({ department_id: s.department_id, score: s.score })) }));
      case 'kpi_daily': {
        const joined = db.scores.map(s => { const r = db.responses.find(x => x.id === s.response_id); return { branch: r.branch, biz_date: r.biz_date, department_id: s.department_id, score: s.score }; });
        return group(joined, r => r.branch + '|' + r.biz_date + '|' + r.department_id, r => ({ branch: r.branch, biz_date: r.biz_date, department_id: r.department_id, n: 0, sum: 0, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 }), (o, r) => { o.n++; o.sum += r.score; o['n' + r.score]++; o.avg_score = Math.round(o.sum / o.n * 1000) / 1000; });
      }
      case 'kpi_daily_responses': return group(db.responses, r => r.branch + '|' + r.biz_date, r => ({ branch: r.branch, biz_date: r.biz_date, n_responses: 0, n_with_staff: 0 }), (o, r) => { o.n_responses++; if (r.staff_id) o.n_with_staff++; });
      case 'kpi_staff_daily': return group(db.responses.filter(r => r.staff_id), r => r.branch + '|' + r.biz_date + '|' + r.staff_id, r => ({ branch: r.branch, biz_date: r.biz_date, staff_id: r.staff_id, votes: 0 }), (o) => { o.votes++; });
      case 'kpi_monthly': return group(db.view('kpi_daily'), r => r.branch + '|' + r.biz_date.slice(0, 7) + '|' + r.department_id, r => ({ branch: r.branch, ym: r.biz_date.slice(0, 7), department_id: r.department_id, n: 0, sum: 0, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 }), (o, r) => { o.n += r.n; o.sum += r.avg_score * r.n; for (let s = 1; s <= 5; s++) o['n' + s] += r['n' + s]; o.avg_score = Math.round(o.sum / o.n * 1000) / 1000; });
    }
    throw new Error('unknown table ' + t);
  };
  db.rpc = (name, args) => {
    if (opts.rpcFail) return { data: null, error: { message: 'network down' } };
    if (name !== 'kpi_submit') return { data: null, error: { message: 'no fn' } };
    const id = db.nextId++;
    db.responses.push({ id, branch: args.p_branch, biz_date: args.p_biz_date, staff_id: args.p_staff_id, device: args.p_device, created_at: args.p_created_at });
    for (const s of args.p_scores) db.scores.push({ response_id: id, department_id: s.department_id, score: s.score });
    return { data: id, error: null };
  };
  db.tableOf = t => ({ kpi_departments: db.departments, kpi_staff: db.staff }[t]);
  return db;
}
function makeClient(db) {
  const calls = [];
  function from(table) {
    const st = { table, filters: [], order: [], range: null, op: 'select', payload: null };
    const b = {
      select() { return b; }, insert(rows) { st.op = 'insert'; st.payload = rows; return b; }, upsert(rows) { st.op = 'upsert'; st.payload = rows; return b; },
      eq(k, v) { st.filters.push(r => r[k] === v); return b; }, gte(k, v) { st.filters.push(r => r[k] >= v); return b; }, lte(k, v) { st.filters.push(r => r[k] <= v); return b; },
      order(k) { st.order.push(k); return b; }, range(a, z) { st.range = [a, z]; return b; },
      then(res, rej) { return new Promise(r => setTimeout(r, 2)).then(exec).then(res, rej); }
    };
    function exec() {
      calls.push({ table, op: st.op, payload: st.payload });
      try {
        if (st.op === 'select') {
          let rows = db.view(table).filter(r => st.filters.every(f => f(r)));
          for (const k of st.order.slice().reverse()) rows.sort((a, c) => a[k] < c[k] ? -1 : a[k] > c[k] ? 1 : 0);
          if (st.range) rows = rows.slice(st.range[0], st.range[1] + 1);
          return { data: rows, error: null };
        }
        const arr = db.tableOf(table); if (!arr) throw new Error('write to ' + table);
        for (const row of st.payload) {
          if (st.op === 'upsert' && row.id) { const i = arr.findIndex(x => x.id === row.id); if (i >= 0) arr[i] = Object.assign({}, arr[i], row); else arr.push(row); }
          else arr.push(Object.assign({ id: db.nextId++ }, row));
        }
        return { data: null, error: null };
      } catch (e) { return { data: null, error: { message: e.message } }; }
    }
    return b;
  }
  return { from, rpc(name, args) { calls.push({ op: 'rpc', name, args }); return new Promise(r => setTimeout(r, 2)).then(() => db.rpc(name, args)); }, _calls: calls };
}

/* ---------- boot helper ---------- */
function boot(url, db, extra) {
  const errors = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message || String(e))); vc.on('error', m => errors.push(String(m)));
  const client = makeClient(db);
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.supabase = { createClient: () => client };
      w.prompt = () => (extra && extra.pin) || null; w.alert = () => {}; w.open = u => { w._opened = u; };
      w.HTMLElement.prototype.requestFullscreen = () => Promise.resolve();
      w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () { w._download = this.download; };
      if (extra && extra.before) extra.before(w);
    }
  });
  return { dom, w: dom.window, d: dom.window.document, client, errors };
}
const txt = (d, sel) => { const el = d.querySelector(sel); return el ? el.textContent : null; };
const noErr = d => !d.querySelector('#app').textContent.includes('เกิดข้อผิดพลาด');
async function click(w, d, sel) { const el = d.querySelector(sel); if (!el) throw new Error('no element ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(40); }
async function change(w, d, sel, value) { const el = d.querySelector(sel); el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(40); }


module.exports = { makeDb, makeClient, boot, sleep, ok, txt, noErr, click, change, failures: () => failures };
