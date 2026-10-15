'use strict';
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(__dirname + '/../../jjmk-kpi.html', 'utf8')
  .replace(/<script src="[^"]+"><\/script>/, '') // drop supabase CDN tag
  .replace(/<link[^>]+>/g, '');                     // drop font links
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* บัญชีกลาง pnl_users (จำลอง) — สูตร hash เดียวกับแอป: sha256(user|pass|JJPNL) */
const crypto = require('crypto');
const pwHash = (u, p) => crypto.createHash('sha256').update(u + '|' + p + '|JJPNL').digest('hex');
const USERS = [
  { id: 1, username: 'boss', display_name: 'เจ้าของร้าน', role: 'owner', unit: 'ALL', active: true, pass_hash: pwHash('boss', 'kpi1234'), apps: {} },
  { id: 2, username: 'manager', display_name: 'ผู้จัดการ', role: 'manager', unit: 'JJRD', active: true, pass_hash: pwHash('manager', 'kpi1234'), apps: { kpi: { dash: 'v' }, pnl: { dash: 'v' } } },
  { id: 3, username: 'nokpi', display_name: 'พนักงานครัว', role: 'staff', unit: 'JJLP', active: true, pass_hash: pwHash('nokpi', 'kpi1234'), apps: { stock: { count: 'v' } } },
  { id: 4, username: 'ออก', display_name: 'พ้นสภาพ', role: 'staff', unit: 'ALL', active: false, pass_hash: pwHash('ออก', 'kpi1234'), apps: {} },
  { id: 5, username: 'kpimgr', display_name: 'หัวหน้า KPI', role: 'manager', unit: 'JJRD', active: true, pass_hash: pwHash('kpimgr', 'kpi1234'), apps: { kpi: { dash: 'vae', kiosk: 'v' } } },
  /* เห็นเฉพาะสาขา (apps.kpi._br) */
  { id: 6, username: 'rdmgr', display_name: 'ผจก.รัชดา', role: 'manager', unit: 'JJRD', active: true, pass_hash: pwHash('rdmgr', 'kpi1234'), apps: { kpi: { dash: 'vae', kiosk: 'v', _br: 'JJRD' } } },
  { id: 7, username: 'twobr', display_name: 'ผจก.เขต', role: 'manager', unit: 'ALL', active: true, pass_hash: pwHash('twobr', 'kpi1234'), apps: { kpi: { dash: 'v', _br: 'JJLP,JJRD' } } },
  { id: 8, username: 'ckonly', display_name: 'ครัวกลาง', role: 'staff', unit: 'JJCK', active: true, pass_hash: pwHash('ckonly', 'kpi1234'), apps: { kpi: { dash: 'v', _br: 'JJCK' } } },
  { id: 9, username: 'ownbr', display_name: 'เจ้าของ (ติด _br)', role: 'owner', unit: 'ALL', active: true, pass_hash: pwHash('ownbr', 'kpi1234'), apps: { kpi: { dash: 'v', _br: 'JJLP' } } },
  /* สาขาใหม่จากทะเบียนสาขากลาง (JJBR) — bnmgr = เห็นแค่ JJBN · badbr = รหัสที่ไม่มีในระบบ (ต้องไม่เห็นอะไร) · mixbr = JJBN+JJRD */
  { id: 10, username: 'bnmgr', display_name: 'ผจก.บางนา', role: 'manager', unit: 'JJBN', active: true, pass_hash: pwHash('bnmgr', 'kpi1234'), apps: { kpi: { dash: 'vae', kiosk: 'v', _br: 'JJBN' } } },
  { id: 11, username: 'badbr', display_name: 'สาขาพิมพ์ผิด', role: 'manager', unit: 'ALL', active: true, pass_hash: pwHash('badbr', 'kpi1234'), apps: { kpi: { dash: 'v', _br: 'XXXX' } } },
  { id: 12, username: 'mixbr', display_name: 'ผจก.บางนา+รัชดา', role: 'manager', unit: 'ALL', active: true, pass_hash: pwHash('mixbr', 'kpi1234'), apps: { kpi: { dash: 'v', _br: 'JJBN,JJRD' } } }
];
const userOf = n => USERS.find(x => x.username === n) || {};
/* ใบผ่านจากหน้าศูนย์รวมแอพ (localStorage · ใช้ครั้งเดียว อายุ 2 นาที) */
const ticketFor = (username, ageMs, app) => JSON.stringify({ u: username, h: userOf(username).pass_hash, app: app || 'kpi', t: Date.now() - (ageMs || 0) });
/* ใบอนุญาตของแท็บ (sessionStorage · เหลือรอดตอนลากหน้าลง/รีเฟรช) */
const sessFor = username => { const u = userOf(username); return JSON.stringify({ username: u.username, display_name: u.display_name, role: u.role, unit: u.unit, apps: u.apps || null, h: u.pass_hash }); };
/* ทะเบียนสาขากลาง pnl_branches (JJBR) — ROWS_A = สาขาที่มีวันนี้ (รัน jjmk-branches.sql แล้ว) · ROWS_B = + สาขาใหม่ JJBN บางนา */
const ROWS_A = [
  { code: 'JJRD', name: 'สาขารัชดา', short: 'รัชดา', kind: 'store', sort: 1, stk_id: 'b19f0a17b4472', color: null, active: true, is_central: false },
  { code: 'JJLP', name: 'สาขาลาดพร้าว', short: 'ลาดพร้าว', kind: 'store', sort: 2, stk_id: 'b19f0a17b448212', color: null, active: true, is_central: false },
  { code: 'JJOF', name: 'ออฟฟิศ', short: 'ออฟฟิศ', kind: 'office', sort: 99, stk_id: null, color: null, active: true, is_central: true }
];
const ROWS_B = ROWS_A.concat([{ code: 'JJBN', name: 'สาขาบางนา', short: 'บางนา', kind: 'store', sort: 3, stk_id: 'JJBN', color: '#2E8B57', active: true, is_central: false }]);
let failures = 0;
function ok(cond, msg) { if (cond) console.log('  ✓ ' + msg); else { failures++; console.log('  ✗ ' + msg); } }

/* ---------- fake database ---------- */
function makeDb(opts) {
  opts = opts || {};
  const db = { departments: [], staff: [], responses: [], scores: [], employees: opts.employees || [], punches: opts.punches || [], settings: opts.settings || [], users: opts.users || USERS.map(u => Object.assign({}, u)), nextId: 1,
    /* pnl_branches (อ่านผ่าน fetch ของบล็อก JJBR) — branchesFail = ตอบ HTTP 500 */
    branches: opts.branches || ROWS_A, branchesFail: !!opts.branchesFail,
    /* ตาราง line_groups = ของระบบนับสต๊อก (บอทจดกลุ่มที่ตัวเองอยู่) — KPI อ่านอย่างเดียว · kpi_line_log = ประวัติการส่งสรุป */
    lineGroups: opts.lineGroups || [
      { group_id: 'C00000000000000000000000000000001', name: 'หัวหน้า JJ (แจ้งใบสมัคร)' },
      { group_id: 'C00000000000000000000000000000002', name: 'ซัพผัก เจ๊หมวย' }
    ],
    lineLog: opts.lineLog || [] };
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
    /* สาขาใหม่จากทะเบียน (opts.extraBr = 'JJBN') — มีพนักงาน 1 คน + ข้อมูลคะแนน */
    if (opts.extraBr) db.staff.push({ id: 6, branch: opts.extraBr, name: 'สมศรี บางนา', nickname: 'ศรี', position: 'เสิร์ฟ', sort_order: 1, active: true });
    /* พนักงานชุดเดียวกันในระบบเงินเดือน (แอปจะ sync ผูก employee_id ให้เองตอน loadMeta)
       + สแกนเข้างานวันนี้คนละ 1 ครั้ง (คี่ = ยังอยู่ในร้าน) → จอลูกค้าจึงมีชื่อให้กด */
    if (!opts.employees) db.employees = [
      { id: 201, code: 'S201', branch: 'JJRD', nick: 'ชาย', full_name: 'สมชาย ใจดี', position: 'เสิร์ฟ', active: true },
      { id: 202, code: 'S202', branch: 'JJRD', nick: 'หญิง', full_name: 'สมหญิง', position: 'แคชเชียร์', active: true },
      { id: 204, code: 'S204', branch: 'JJLP', nick: 'นี', full_name: 'มานี', position: 'เสิร์ฟ', active: true },
      { id: 205, code: 'S205', branch: 'JJLP', nick: null, full_name: 'มานะ', position: 'ครัว', active: true }
    ].concat(opts.extraBr ? [{ id: 206, code: 'S206', branch: opts.extraBr, nick: 'ศรี', full_name: 'สมศรี บางนา', position: 'เสิร์ฟ', active: true }] : []);
    if (!opts.employees && !opts.punches) {
      const now = new Date(); const bz = new Date(now); if (now.getHours() < 6) bz.setDate(bz.getDate() - 1);
      const at = (hh, mm) => new Date(bz.getFullYear(), bz.getMonth(), bz.getDate(), hh, mm);
      db.punches = db.employees.map(e => ({ emp_code: e.code, ts: at(11, 0) }));
    }
    // 45 days of data, both branches
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const today = new Date(); today.setHours(12, 0, 0, 0);
    for (let back = 0; back < 45; back++) {
      const d = new Date(today); d.setDate(d.getDate() - back);
      const biz = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      for (const br of ['JJRD', 'JJLP'].concat(opts.extraBr ? [opts.extraBr] : [])) {
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
    if (opts.missing && t !== 'pnl_users') throw new Error('relation "public.' + t + '" does not exist');
    switch (t) {
      case 'pnl_users': { if (opts.usersMissing) throw new Error('relation "public.pnl_users" does not exist'); return db.users; }
      case 'kpi_departments': return db.departments;
      case 'kpi_staff': return db.staff;
      case 'kpi_settings': { if (opts.noSettingsTable) throw new Error("Could not find the table 'public.kpi_settings' in the schema cache"); return db.settings; }
      case 'line_groups': { if (opts.noLineGroups) throw new Error('relation "public.line_groups" does not exist'); return db.lineGroups; }
      case 'kpi_line_log': { if (opts.noLineSql) throw new Error("Could not find the table 'public.kpi_line_log' in the schema cache"); if (opts.lineLogDown) throw new Error('TypeError: Failed to fetch'); return db.lineLog; }
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
    if (name === 'kpi_sync_staff') {
      if (opts.syncFail) return { data: null, error: { message: 'function kpi_sync_staff does not exist' } };
      // จำลอง SQL: link ตามชื่อ → insert ใหม่ → update ชื่อ → ปิดใช้คนพ้นสภาพ/นอกสาขา
      const brs = args.p_branches || [];
      const act = db.employees.filter(e => e.active && brs.includes(e.branch));
      for (const e of act) {
        if (db.staff.some(k => k.employee_id === e.id)) continue;
        const k = db.staff.find(x => !x.employee_id && x.branch === e.branch && (x.name === e.full_name || x.name === e.nick || x.nickname === e.nick));
        if (k) k.employee_id = e.id;
      }
      for (const e of act) if (!db.staff.some(k => k.employee_id === e.id))
        db.staff.push({ id: db.nextId++, branch: e.branch, name: e.full_name || e.nick, nickname: e.nick || null, position: e.position || null, sort_order: 0, active: true, employee_id: e.id });
      for (const k of db.staff) {
        if (!k.employee_id) continue;
        const e = act.find(x => x.id === k.employee_id);
        if (e) { k.branch = e.branch; k.name = e.full_name || e.nick; k.nickname = e.nick || null; k.position = e.position || null; }
        else k.active = false;
      }
      return { data: { linked: 0 }, error: null };
    }
    if (name === 'kpi_on_duty') {
      if (opts.dutyFail) return { data: null, error: { message: 'Could not find the function public.kpi_on_duty(p_branch) in the schema cache' } };
      // จำลอง SQL: นับสแกนวันทำการปัจจุบัน (ตัด 06:00) — จำนวนคี่ = กำลังเข้างาน (รัน TZ=Asia/Bangkok)
      const now = new Date(); const biz = new Date(now); if (now.getHours() < 6) biz.setDate(biz.getDate() - 1);
      const start = new Date(biz.getFullYear(), biz.getMonth(), biz.getDate(), 6);
      const end = new Date(start.getTime() + 24 * 3600000);
      const ids = db.employees
        .filter(e => e.active && e.branch === args.p_branch)
        .filter(e => db.punches.filter(p => p.emp_code === e.code && p.ts >= start && p.ts < end).length % 2 === 1)
        .map(e => e.id);
      return { data: ids, error: null };
    }
    if (name === 'kpi_line_text') {
      if (opts.noLineSql) return { data: null, error: { message: 'Could not find the function public.kpi_line_text(p_branch, p_from, p_to) in the schema cache' } };
      const rows = db.responses.filter(r => r.branch === args.p_branch && r.biz_date >= args.p_from && r.biz_date <= args.p_to);
      const votes = {}; for (const r of rows) if (r.staff_id) votes[r.staff_id] = (votes[r.staff_id] || 0) + 1;
      const names = Object.keys(votes).sort((a, b) => votes[b] - votes[a])
        .map(id => { const st = db.staff.find(x => x.id === Number(id)); return (st ? (st.nickname || st.name) : '?') + ' ' + votes[id] + ' ครั้ง'; });
      return { data: '📊 สรุปความพึงพอใจลูกค้า · ' + args.p_branch + '\n' + args.p_from + (args.p_to === args.p_from ? '' : '–' + args.p_to) +
        '\n\n🙋 ลูกค้ากดให้คะแนน ' + rows.length + ' ครั้ง\n\n💖 ลูกค้าชมพนักงาน\n' + names.join('\n'), error: null };
    }
    if (name !== 'kpi_submit') return { data: null, error: { message: 'no fn' } };
    const id = db.nextId++;
    db.responses.push({ id, branch: args.p_branch, biz_date: args.p_biz_date, staff_id: args.p_staff_id, device: args.p_device, created_at: args.p_created_at });
    for (const s of args.p_scores) db.scores.push({ response_id: id, department_id: s.department_id, score: s.score });
    return { data: id, error: null };
  };
  db.tableOf = t => ({ kpi_departments: db.departments, kpi_staff: db.staff, kpi_settings: db.settings }[t]);
  return db;
}
function makeClient(db) {
  const calls = [];
  function from(table) {
    const st = { table, filters: [], order: [], range: null, op: 'select', payload: null };
    const b = {
      select() { return b; }, insert(rows) { st.op = 'insert'; st.payload = rows; return b; }, upsert(rows) { st.op = 'upsert'; st.payload = rows; return b; },
      eq(k, v) { st.filters.push(r => r[k] === v); return b; }, gte(k, v) { st.filters.push(r => r[k] >= v); return b; }, lte(k, v) { st.filters.push(r => r[k] <= v); return b; },
      in(k, arr) { st.inF = (st.inF || []).concat([[k, arr.slice()]]); st.filters.push(r => arr.includes(r[k])); return b; },
      order(k) { st.order.push(k); return b; }, range(a, z) { st.range = [a, z]; return b; },
      then(res, rej) { return new Promise(r => setTimeout(r, 2)).then(exec).then(res, rej); }
    };
    function exec() {
      calls.push({ table, op: st.op, payload: st.payload, inF: st.inF || null });
      try {
        if (st.op === 'select') {
          let rows = db.view(table).filter(r => st.filters.every(f => f(r)));
          for (const k of st.order.slice().reverse()) rows.sort((a, c) => a[k] < c[k] ? -1 : a[k] > c[k] ? 1 : 0);
          if (st.range) rows = rows.slice(st.range[0], st.range[1] + 1);
          return { data: rows, error: null };
        }
        const arr = db.tableOf(table); if (!arr) throw new Error('write to ' + table);
        const keyF = table === 'kpi_settings' ? 'key' : 'id'; // kpi_settings ใช้ key เป็น primary key
        for (const row of st.payload) {
          if (st.op === 'upsert' && row[keyF] != null) { const i = arr.findIndex(x => x[keyF] === row[keyF]); if (i >= 0) arr[i] = Object.assign({}, arr[i], row); else arr.push(row); }
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
      w.TextEncoder = require('util').TextEncoder;   // เบราว์เซอร์จริงมีให้อยู่แล้ว (ใช้ตอน hash รหัสผ่าน) — jsdom ไม่มี
      /* ส่งเข้ากลุ่มไลน์ผ่าน Edge Function line-order — จำลองไว้ดูว่าแอปยิงอะไรไปบ้าง */
      w._posts = []; w._brGets = [];
      w.fetch = (url, o) => {
        /* ทะเบียนสาขากลาง (บล็อก JJBR อ่าน pnl_branches ด้วย fetch ตรง) — แยกจาก _posts ของไลน์ */
        if (/\/rest\/v1\/pnl_branches/.test(String(url))) {
          w._brGets.push(String(url)); const bad = db.branchesFail;
          return Promise.resolve({ ok: !bad, status: bad ? 500 : 200, json: () => Promise.resolve(bad ? { message: 'boom' } : JSON.parse(JSON.stringify(db.branches))) });
        }
        w._posts.push({ url: url, body: JSON.parse((o && o.body) || '{}'), headers: (o && o.headers) || {} });
        return Promise.resolve({ ok: !(extra && extra.lineFail), status: (extra && extra.lineFail) ? 500 : 200, json: () => Promise.resolve((extra && extra.lineFail) ? { error: 'บอทไม่อยู่ในกลุ่มนี้' } : { ok: true }) }); };
      w.confirm = () => !(extra && extra.sayNo);   // jsdom ไม่มี confirm จริง — ตั้งต้นคือกด "ตกลง"
      w.HTMLElement.prototype.requestFullscreen = () => Promise.resolve();
      w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () { w._download = this.download; };
      /* ค่าเริ่มต้น: จำลองว่ากดเข้ามาจากหน้าศูนย์รวมแอพ (มีใบผ่าน)
         · noAuth = เปิด URL ตรง ๆ ไม่มีใบผ่าน · sess = แท็บที่ล็อกอินค้างอยู่ (จำลองการรีเฟรช/ลากหน้าลง) */
      try {
        if (extra && extra.sess) w.sessionStorage.setItem('kpi_auth', sessFor(extra.sess));
        if (!(extra && (extra.noAuth || extra.sess))) w.localStorage.setItem('jjsso_ticket', ticketFor((extra && extra.as) || 'boss', extra && extra.authAge, extra && extra.ticketApp));
      } catch (e) {}
      if (extra && extra.before) extra.before(w);
    }
  });
  return { dom, w: dom.window, d: dom.window.document, client, errors };
}
const txt = (d, sel) => { const el = d.querySelector(sel); return el ? el.textContent : null; };
const noErr = d => !d.querySelector('#app').textContent.includes('เกิดข้อผิดพลาด');
async function click(w, d, sel) { const el = d.querySelector(sel); if (!el) throw new Error('no element ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(40); }
async function change(w, d, sel, value) { const el = d.querySelector(sel); el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(40); }


module.exports = { makeDb, makeClient, boot, sleep, ok, txt, noErr, click, change, pwHash, USERS, ticketFor, sessFor, ROWS_A, ROWS_B, failures: () => failures };
