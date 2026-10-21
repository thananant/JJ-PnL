// ฐานข้อมูลจำลอง + นาฬิกาจำลอง สำหรับเทสเงินประกัน/เงินสำรองฯ ที่รันโค้ดจริงใน jjmk-payroll.html (jsdom)
// - เก็บแถวจริงต่อตาราง · select ตัดที่ 1,000 แถวแบบ PostgREST · count/head · order/range · eq/neq/gte/lte/lt/gt/in/is(null)
// - upsert(onConflict, ignoreDuplicates) = INSERT … ON CONFLICT DO NOTHING (ไม่ทับ) · update/delete กรองตามเงื่อนไขจริง · คืนแถวที่เขียนได้
// - fail[table] = error ตอนอ่าน (เช่น {code:'PGRST205'} ยังไม่มีตาราง / {code:'42501'} ไม่มีสิทธิ์ / {message:'timeout'}) · countLie[table] = count ปลอม (null = ไม่ได้ count)
//   คำขอ HEAD (count) ทำแบบ postgrest-js จริง: ไม่มี body → ตารางไม่มี (404) = {error:null, count:null, status:204} · error อื่น = error ข้อความว่าง (ต้องยิง GET ถึงเห็นสาเหตุ)
// - latency(table, op) = หน่วงคำตอบ (ms) ไว้จำลองคำตอบสลับลำดับ · log = ทุกการเขียน · wfail(table, op, rows) = error ของคำขอเขียน (ไม่ตั้ง = เขียนได้)
// - rangeCut[table] = n → คำขอแบบ range (อ่านทีละหน้า) ได้แถวขาดไป n แถว (จำลองหน้าที่อ่านไม่ครบ)
// - cols[table] = รายชื่อคอลัมน์ที่มีจริง (ไม่ตั้ง = ไม่เช็ค) → select คอลัมน์ที่ไม่มี = error 42703 แบบ PostgREST (เช่น ยังไม่รัน jj_deposit_v2.sql = ไม่มี deposit_target_v1)
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

function makeDB(){
  const T = {}, log = [], fail = {}, countLie = {}, chans = {}, cols = {}, rangeCut = {};
  const UNIQ = { deposit_entries:['employee_id','period'], pvd_entries:['employee_id','period'], pvd_members:['employee_id'] };
  const DEF = { deposit_entries:{ note:'', amount:0 }, pvd_entries:{ note:'', emp_amount:null, er_amount:null },
                pvd_members:{ emp_mode:'fixed', emp_value:0, er_mode:'none', er_value:0, start_period:'', stop_period:'', opening_emp:0, opening_er:0, consent:false, note:'' },
                pvd_payouts:{ via:'cash', note:'' } };
  let nextId = 100000;
  const db = { T, log, fail, countLie, chans, cols, rangeCut, latency:null };
  const same = (a, b) => String(a) === String(b);
  function exec(st){
    const rows = T[st.table] = T[st.table] || [];
    const hit = r => st.filters.every(f => f(r));
    const copy = r => JSON.parse(JSON.stringify(r));
    if(st.op === 'select'){
      if(fail[st.table]){
        const fe = fail[st.table], noTbl = fe.code === 'PGRST205' || fe.code === '42P01';
        const status = fe.status || (noTbl ? 404 : fe.code === '42501' ? 401 : 500);
        if(st.head) return noTbl ? { data:null, error:null, count:null, status:204 } : { data:null, error:{ message:'', details:'', hint:'', code:'' }, count:null, status };
        return { data:null, error:fe, count:null, status };
      }
      if(cols[st.table] && st.sel){
        const bad = String(st.sel).split(',').map(c=>c.trim()).filter(c=>c && c !== '*' && !cols[st.table].includes(c));
        if(bad.length) return { data:null, error:{ code:'42703', message:'column '+st.table+'.'+bad[0]+' does not exist', details:null, hint:null }, count:null, status:400 };
      }
      let out = rows.filter(hit);
      if(st.head) return { data:null, error:null, count: st.table in countLie ? countLie[st.table] : out.length };
      if(st.orderBy) out = out.slice().sort((a,b)=> (a[st.orderBy] > b[st.orderBy] ? 1 : a[st.orderBy] < b[st.orderBy] ? -1 : 0) * (st.asc ? 1 : -1));
      if(st.range) out = out.slice(st.range[0], st.range[1] + 1);
      if(st.range && rangeCut[st.table]) out = out.slice(0, Math.max(0, out.length - rangeCut[st.table]));   // หน้าที่ได้ไม่ครบ (ลบระหว่างอ่านหลายหน้า)
      if(st.lim != null) out = out.slice(0, st.lim);
      out = out.slice(0, 1000).map(copy);
      if(st.single) return out.length ? { data:out[0], error:null } : (st.maybe ? { data:null, error:null } : { data:null, error:{ code:'PGRST116', message:'no rows' } });
      return { data:out, error:null, count: st.count ? rows.filter(hit).length : null };
    }
    let got = [];
    const list = st.payload == null ? [] : Array.isArray(st.payload) ? st.payload : [st.payload];
    if(db.wfail){ const we = db.wfail(st.table, st.op, list); if(we) return { data:null, error:we }; }   // เขียนล้มทั้งคำขอ (เช่น FK ของพนักงานที่ถูกลบ / เน็ตหลุด)
    if(st.op === 'insert' || st.op === 'upsert'){
      const key = st.opts && st.opts.onConflict ? st.opts.onConflict.split(',') : (UNIQ[st.table] || null);
      for(const p of list){
        const ex = key ? rows.find(r => key.every(k => same(r[k], p[k]))) : null;
        if(ex){
          if(st.op === 'insert') return { data:null, error:{ code:'23505', message:'duplicate key value violates unique constraint' } };
          if(st.opts && st.opts.ignoreDuplicates) continue;
          Object.assign(ex, p); got.push(ex);
        } else {
          const r = Object.assign({ id: ++nextId }, DEF[st.table] || {}, p);
          rows.push(r); got.push(r);
        }
      }
    } else if(st.op === 'update'){
      for(const r of rows.filter(hit)){ Object.assign(r, st.payload); got.push(r); }
    } else if(st.op === 'delete'){
      got = rows.filter(hit);
      T[st.table] = rows.filter(r => !hit(r));
    }
    log.push({ table:st.table, op:st.op, payload:st.payload, n:got.length });
    got = got.map(copy);
    if(st.single) return { data: got[0] || null, error: got[0] ? null : { code:'PGRST116', message:'no rows' } };
    return { data: st.ret ? got : null, error:null };
  }
  function q(table){
    const st = { table, op:'select', filters:[], ret:false };
    const b = {};
    b.select = (cs, o) => { if(st.op === 'select'){ st.sel = cs; if(o && o.head) st.head = true; if(o && o.count) st.count = o.count; } else st.ret = true; return b; };
    b.eq = (k, v) => { st.filters.push(r => same(r[k], v)); return b; };
    b.neq = (k, v) => { st.filters.push(r => !same(r[k], v)); return b; };
    b.gte = (k, v) => { st.filters.push(r => r[k] >= v); return b; };
    b.lte = (k, v) => { st.filters.push(r => r[k] <= v); return b; };
    b.gt = (k, v) => { st.filters.push(r => r[k] > v); return b; };
    b.lt = (k, v) => { st.filters.push(r => r[k] < v); return b; };
    b.in = (k, vs) => { st.filters.push(r => vs.some(v => same(r[k], v))); return b; };
    b.is = (k, v) => { st.filters.push(r => v === null ? r[k] == null : r[k] === v); return b; };   // .is(col, null) = IS NULL
    b.not = () => b; b.or = () => b;
    b.order = (k, o) => { if(!st.orderBy){ st.orderBy = k; st.asc = !(o && o.ascending === false); } return b; };
    b.limit = n => { st.lim = n; return b; };
    b.range = (a, z) => { st.range = [a, z]; return b; };
    b.single = () => { st.single = true; return b; };
    b.maybeSingle = () => { st.single = true; st.maybe = true; return b; };
    b.insert = p => { st.op = 'insert'; st.payload = p; return b; };
    b.upsert = (p, o) => { st.op = 'upsert'; st.payload = p; st.opts = o || {}; return b; };
    b.update = p => { st.op = 'update'; st.payload = p; return b; };
    b.delete = () => { st.op = 'delete'; return b; };
    b.then = (ok, er) => {   // ฐานข้อมูลทำงานตอนส่งคำขอ (เก็บผลไว้) แล้วค่อยส่งคำตอบตามเวลาหน่วง = คำตอบเก่ามาถึงทีหลังได้
      const ms = db.latency ? db.latency(table, st.op) : 0;
      let res; try{ res = exec(st); }catch(e){ return Promise.reject(e).then(ok, er); }
      return (ms ? new Promise(r => setTimeout(() => r(res), ms)) : Promise.resolve(res)).then(ok, er);
    };
    return b;
  }
  function channel(name){
    const c = { name, on:(ev, f, fn) => { (chans[name] = chans[name] || {})[f.table] = fn; return c; }, subscribe:() => c };
    chans[name] = chans[name] || {};
    return c;
  }
  db.client = { from:q, channel, rpc:() => q('rpc'), removeChannel(){}, storage:{ from:() => ({ upload:async()=>({}), getPublicUrl:()=>({ data:{ publicUrl:'' } }) }) } };
  return db;
}

/* เปิดแอปจริงใน jsdom + นาฬิกาจำลอง (new Date() ไม่มีอาร์กิวเมนต์ = เวลาที่ตั้ง) */
function boot(opts){
  opts = opts || {};
  const db = opts.db || makeDB();   // opts.db = ใช้ฐานข้อมูลจำลองร่วมกับอีกเครื่อง (เทสสองเครื่องพร้อมกัน)
  const html = fs.readFileSync(__dirname + '/../../jjmk-payroll.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, '');
  const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(e.message));
  const io = { prompts:[], confirms:[], alerts:[], toasts:[], files:[], promptAns:[], confirmAns:null };
  let NOW = Date.parse(opts.now || '2026-10-20T12:00:00+07:00');
  const dom = new JSDOM(html, { url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html' + (opts.hash || ''), runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      const RD = w.Date;
      class FD extends RD { constructor(...a){ if(a.length === 0) super(NOW); else super(...a); } static now(){ return NOW; } }
      w.Date = FD;
      // แต่ละเครื่องได้ client ของตัวเอง (ข้อมูล T ใช้ร่วมกัน) — แอปห่อ db.from (ตัวกันสิทธิ์/ตัวจด audit) ทับลงบน client
      // เดิมใช้อ็อบเจกต์เดียวกันทุกเครื่อง = คำขอของเครื่องแรกวิ่งผ่านตัวห่อของเครื่องที่เปิดทีหลัง (สิทธิ์/AUTH ของเครื่องนั้น) · รอบ 9
      const client = Object.assign({}, db.client);
      w.supabase = { createClient:() => client };
      w.TextEncoder = require('util').TextEncoder;
      w.alert = m => io.alerts.push(String(m));
      w.confirm = m => { io.confirms.push(String(m)); return io.confirmAns ? io.confirmAns(String(m)) : true; };
      w.prompt = (m, d) => { io.prompts.push(String(m)); const a = io.promptAns.length ? io.promptAns.shift() : undefined; return a === undefined ? (d == null ? '' : String(d)) : a; };
      w.indexedDB = undefined; w.scrollTo = () => {}; w.print = () => {};
      w.XLSX = { utils:{ aoa_to_sheet:aoa => ({ aoa }), encode_cell:() => 'X', book_new:() => ({}), book_append_sheet:(wb, ws, n) => { wb.ws = ws; wb.n = n; } },
                 writeFile:(wb, f) => io.files.push({ f, n:wb.n, aoa:wb.ws.aoa }) };
    } });
  const w = dom.window;
  const E = s => w.eval(s);
  // จับ toast ไว้ตรวจ
  const setNow = iso => { NOW = Date.parse(iso); };
  return { db, dom, w, d:w.document, E, io, errs, setNow, T:db.T };
}
/* ค่าตั้งต้นของแอป + กะ 09:00–18:00 + สร้างวันทำงานรายวัน (เหมือน proto) */
const SEED = `settings.cutDay=25; settings.payDay=5; settings.advDay=15; settings.monthDiv=30; settings.cutoff=6; settings.loadMonths=8;
  settings.depStart='2026-08'; depReady=true; depLoadErr=''; ssoReady=false; tipReady=false; pvdReady=false; pvdLoadErr=''; workDateReady=true;
  holidays={}; adjustments=[]; advances=[]; loans=[]; loanEntries=[]; mouLoans=[]; mouEntries=[]; fineEntries=[]; tips=[];
  moneyTblSig={adjustments:'[]',advances:'[]',holidays:'[]',shifts:'[]',payroll_settings:'null',fine_entries:'[]',mou_loans:'[]',mou_entries:'[]',loans:'[]',loan_entries:'[]',sso_entries:'[]',tips:'[]'};
  shiftDefs=[fromDbShift({id:1,name:'กะ',start_time:'09:00',end_time:'18:00',in_grace:5,out_grace:0,sort_order:1})];
  var mk = function(from,to,skip){ const a=[]; for(let d=new Date(from+'T12:00:00'); localYMD(d)<=to; d.setDate(d.getDate()+1)){ const k=localYMD(d); if(skip&&skip(k)) continue;
      a.push({day:k,in:new Date(k+'T09:00:00'),out:new Date(k+'T18:00:00'),hours:9,fullHours:8,single:false,lateMin:0,earlyMin:0,shortMin:0,missMin:0,shiftName:'กะ',workBranch:''}); } return a; };
  var emp = function(o){ return fromDbEmp(Object.assign({full_name:(o.nick||'x')+' ทดสอบ',dept:'หน้าร้าน',position:'พนักงาน',branch:'JJLP',wage_type:'monthly',rate:12000,work_mode:'shift',
      shift_id:1,target_hours:10,active:true,must_work_exempt:true,off_count:0,off_weekdays:'',holiday_pay:true,deposit_on:true,deposit_target:3000,deposit_monthly:300,deposit_opening:0}, o)); };`;
const wait = ms => new Promise(r => setTimeout(r, ms));
module.exports = { makeDB, boot, SEED, wait };
