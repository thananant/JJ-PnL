// เทส 🔒 ปิดงวดเงินเดือน (เจ้าของสั่ง 2026-10-21) กับโค้ดจริงใน jjmk-payroll.html (jsdom + ฐานข้อมูลจำลอง + นาฬิกาจำลอง · loadAll จริง)
// ปิด ส.ค./ก.ย./ต.ค. → แก้ค่าแรง/ตั้งค่า/กะ/ลาออก/ย้ายสาขา/สปส./ค่าตั้งต้นเงินประกัน-MOU-เงินยืม-สำรองฯ/สแกนหลุดหน้าต่าง/ทิป/วันหยุด
// → สลิป/สรุป/Excel/K BIZ/ใบสรุปบัญชี/📚/หน้ารายคน/🛡️/🐷/สปส. ของงวดที่ปิดไม่เปลี่ยนทุกบาททุกไบต์ · งวดที่เปิดเปลี่ยนตาม · ยอดยกถูก
// + ยังไม่รัน SQL = แบบเดิม · ปิดต้องเรียงงวด (ตั้งแต่ ต.ค.) · ปิดย้อนหลัง ส.ค./ก.ย. = เจ้าของ + เหตุผล · สิทธิ์ · บล็อกรายการรายงวด · ปิดด้วยยอดที่โอนจริง · เปิดงวดใหม่ · realtime · สองเครื่อง · 🔒 อัตโนมัติวันจ่ายไม่ทำงาน
// + รอบตรวจ 1: ค่าตั้งต้นที่แก้หลังปิด (เก็บมาก่อน/ผ่อนมาแล้ว/ยกมา — ข้อมูลเจ้าของ 12 คน) = งวดเปิดเท่าสูตรเดิม · สัญญาใหม่หลังปิด · อ่านฉบับปิดไม่ได้/ดัชนีค้าง = ไม่บันทึก (fail closed)
//   · ช่อง jjmk-close หลุด/ต่อใหม่ · งวดเปิดที่เก่ากว่างวดปิด = บล็อก · ออฟฟิศปิดได้หลังวันจ่าย · สแกนอ่านใหม่ก่อนปิด · K BIZ หลายไฟล์ · สาขา ณ วันปิดทุกหน้า
// + หน้าจอ (ขั้น 2): แถบเตือนจ่ายแล้วยังไม่ปิด · ปุ่ม/สิทธิ์ _close · หน้าต่างพรีวิว (เทียบไฟล์ K BIZ · เลือกยอดที่โอนจริง/ระบบ + เหตุผล · ติ๊กออก · ยอดเปลี่ยนหลังเปิดหน้าต่าง) · หน้ารายคนอ่านอย่างเดียว · ป้ายทุกจอ · หน้าต่างเปิดงวดใหม่
const { boot, wait } = require('./fakedb');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(!c) fail++; };
const NOW = '2026-11-06T12:00:00+07:00';
const PDS = ['2026-08', '2026-09', '2026-10'];
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function seed(T){
  T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:1.5, late_fine:0, single_fine:200, cut_day:25, pay_day:5, adv_day:15, month_divisor:30,
    must_work_days:'5,6,0', sso_rate:5, sso_min:1650, sso_max:15000, dep_start:'2026-08' }];
  T.shifts = [{ id:1, name:'กะเช้า', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1 }];
  T.devices = [{ sn:'S1', branch:'JJLP', name:'ลพ' }, { sn:'S2', branch:'JJRD', name:'รช' }];
  const base = { dept:'หน้าร้าน', position:'พนักงาน', wage_type:'monthly', rate:12000, work_mode:'shift', shift_id:1, target_hours:10, active:true, off_count:0, off_weekdays:'',
    holiday_pay:true, hourly_window:true, must_work_exempt:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true, deposit_target_v1:null, deposit_monthly_v1:null,
    birth_date:'1995-01-01', phone:'0800000000', bank_name:'กสิกรไทย', start_date:'2026-01-01', end_date:null, sso_on:false, sso_id:'', kbiz_added:true, photo_url:null };
  T.employees = [
    { ...base, id:1, code:'A', nick:'เอ', full_name:'เอ ทดสอบ', branch:'JJLP', sso_on:true, sso_id:'1234567890123', deposit_target_v1:5000, deposit_monthly_v1:500, bank_account:'1111111111' },
    { ...base, id:2, code:'B', nick:'บี', full_name:'บี ทดสอบ', branch:'JJLP', wage_type:'daily', rate:500, bank_account:'2222222222' },
    { ...base, id:3, code:'C', nick:'ซี', full_name:'ซี ทดสอบ', branch:'JJRD', rate:15000, bank_account:'3333333333' },
    { ...base, id:4, code:'D', nick:'ดี', full_name:'ดี ออฟฟิศ', branch:'OFFICE', dept:'ออฟฟิศ', rate:20000, deposit_on:false, bank_account:'4444444444' },
    { ...base, id:5, code:'E', nick:'อี', full_name:'อี MOU', branch:'JJLP', bank_account:'5555555555' },
    { ...base, id:6, code:'F', nick:'เอฟ', full_name:'เอฟ ยืมเงิน', branch:'JJLP', wage_type:'daily', rate:450, bank_account:'6666666666' },
    { ...base, id:7, code:'G', nick:'จี', full_name:'จี สำรองฯ', branch:'JJLP', rate:13000, bank_account:'7777777777' },
    { ...base, id:8, code:'H', nick:'เอช', full_name:'เอช ลาออก', branch:'JJLP', active:false, end_date:'2026-09-30', bank_account:'8888888888' },
  ];
  const pun = []; let pid = 1;
  for(let d = new Date(2026, 6, 26, 12); d <= new Date(2026, 10, 5, 12); d.setDate(d.getDate() + 1)){
    const k = ymd(d), wd = d.getDay();
    for(const e of T.employees){
      if(e.end_date && k > e.end_date) continue;
      if(e.branch === 'OFFICE' ? (wd === 0 || wd === 6) : wd === 1) continue;
      const late = (d.getDate() + e.id) % 9 === 0 ? '09:20:00' : '08:58:00';
      const sn = e.branch === 'JJRD' ? 'S2' : 'S1';
      if((d.getDate() * e.id) % 23 === 5){ pun.push({ id:pid++, emp_code:e.code, punch_date:k, punch_time:late, device_sn:sn }); continue; }   // ลืมตอก
      pun.push({ id:pid++, emp_code:e.code, punch_date:k, punch_time:late, device_sn:sn }, { id:pid++, emp_code:e.code, punch_date:k, punch_time:'18:05:00', device_sn:sn });
    }
  }
  T.punches = pun;
  T.adjustments = [ { id:1, employee_id:1, kind:'add', reason:'โบนัส', amount:500, period:'2026-09' }, { id:2, employee_id:2, kind:'deduct', reason:'ไม่ใส่เสื้อพนักงาน', amount:200, period:'2026-10' },
                    { id:3, employee_id:3, kind:'add', reason:'OT 10 ต.ค. (2 ชม.)', amount:125, period:'2026-10' } ];
  T.advances = [ { id:1, employee_id:1, period:'2026-10', amount:2000, taken_date:'2026-10-15', note:'' }, { id:2, employee_id:6, period:'2026-09', amount:1500, taken_date:'2026-09-15', note:'' } ];
  T.holidays = [ { id:1, day:'2026-08-12', name:'วันแม่', multiplier:2, scope:'all', cal_id:null } ];
  T.fine_entries = []; T.sso_entries = []; T.loan_entries = []; T.mou_entries = []; T.doc_borrows = []; T.org_positions = [];
  T.mou_loans = [ { id:1, employee_id:5, amount:15000, monthly:2000, final_max:3000, start_period:'2026-08', opening:0, doc_passport:true, doc_pink:false, doc_complete:false, note:'' } ];
  T.loans = [ { id:1, employee_id:6, amount:5000, monthly:1000, deduct_on:'payroll', start_period:'2026-08', opening:0, note:'' } ];
  T.tips = [ { id:1, period:'2026-10', branch:'JJLP', amount:12345, member_ids:'' } ];
  T.deposit_entries = [];
  T.pvd_members = [ { id:1, employee_id:7, emp_mode:'fixed', emp_value:500, er_mode:'match', er_value:50, start_period:'2026-08', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' } ];
  T.pvd_entries = []; T.pvd_payouts = [];
  T.payroll_audit = []; T.pay_slips = []; T.pay_batches = [];
}
const strip = h => String(h).replace(/<div class="co" style="color:#1971c2;font-weight:600">🔒 ฉบับปิดงวด · พิมพ์ซ้ำ [^<]*<\/div>/g, '').replace(/<div style="margin-top:6px;font-size:9px;color:#8a8076;text-align:center">🔒 ฉบับปิดงวด[^<]*<\/div>/g, '');
// ทุกจอที่ออกเงินของงวด p (สลิป · สรุปทุกสาขา/รายสาขา · Excel · ใบสรุปบัญชี · K BIZ · พิมพ์สลิปทั้งหมด · หน้ารายคน · 📚 · 🛡️ · 🐷 · สปส. · สปส. 1-10)
async function snap(A, p){
  const { E, io } = A;
  const o = {};
  o.pay = E(`JSON.stringify(employees.map(e=>[e.id, payIn(e,'${p}') ? payOf(e,'${p}').net : null]))`);
  o.slips = E(`employees.filter(e=>payIn(e,'${p}')).map(e=>buildSlip(empAt(e,'${p}'),'${p}',true)+buildSlip(empAt(e,'${p}'),'${p}',false)).join('\\n')`);
  for(const br of ['', 'JJLP', 'JJRD']){
    o['sum' + br] = E(`go('payroll'); document.getElementById('payBranch').value='${br}'; document.getElementById('periodSel').value='${p}'; renderPayroll();
      document.getElementById('payTable').innerHTML + '|' + document.getElementById('payStats').innerHTML`);
  }
  E(`document.getElementById('payBranch').value='';`);
  io.files.length = 0; E(`exportPayrollXlsxGo()`); o.xl = JSON.stringify(io.files.map(f => [f.f, f.aoa]));
  E(`document.getElementById('slipBody').innerHTML=''; openTransferSummaryGo();`); o.ts = E(`document.getElementById('slipBody').innerHTML`);
  E(`document.getElementById('slipBody').innerHTML=''; printAllSlipsGo();`); await wait(80); o.print = E(`document.getElementById('slipBody').innerHTML`);
  io.files.length = 0; io.alerts.length = 0; await E(`exportKbizPay('')`); await wait(30); o.kbiz = JSON.stringify(io.files.map(f => [f.f, f.aoa])); o.kbizMsg = io.alerts.join('\n');
  o.detail = E(`(()=>{ const out=[]; for(const e of employees){ detailEmpId=e.id; detailTab='money'; go('detail'); document.getElementById('detailPeriodSel').value='${p}'; renderDetail(true);
      const t=document.querySelector('#detailContent .dt-pay table'); out.push(t ? t.outerHTML : ''); } detailEmpId=null; return out.join('\\n'); })()`);
  o.hist = E(`employees.map(e=>{ const d=document.createElement('div'); d.innerHTML=buildPayHistory(e,'2026-11'); return [...d.querySelectorAll('tbody tr')].map(r=>r.outerHTML).filter(x=>x.includes(periodLabel('${p}'))).join(''); }).join('\\n')`);
  o.dep = E(`go('dep'); (s=>{ if(![...s.options].some(x=>x.value==='${p}')) s.add(new Option('${p}','${p}')); s.value='${p}'; })(document.getElementById('depPeriodSel')); document.getElementById('depActive').value=''; renderDeposit();
    [...document.querySelectorAll('#depTable tbody tr')].map(r=>r.querySelector('td b').textContent+'|'+[...r.querySelectorAll('td')].filter(td=>/สะสมก่อน|หักงวดนี้|สะสมแล้ว/.test(td.dataset.l||'')).map(td=>td.textContent.trim()).join('·')).sort().join('\\n')`);   // ค่ารายคน (ลำดับแถวตามสาขา/สถานะปัจจุบัน — หน้าจัดการ)
  o.pvd = E(`go('pvd'); (s=>{ if(![...s.options].some(x=>x.value==='${p}')) s.add(new Option('${p}','${p}')); s.value='${p}'; })(document.getElementById('pvdPeriodSel')); renderPvd();
    JSON.stringify(pvdRowsFor('${p}').map(x=>[x.e.id, x.p.pvd.ded, x.p.pvd.er, x.p.pvd.balance]))`);
  o.sso = E(`go('sso'); document.getElementById('ssoPeriodSel').value='${p}'; renderSso(); [...document.querySelectorAll('#ssoTable tbody tr')].map(r=>r.querySelector('td b').textContent+'|'+[...r.querySelectorAll('td.num')].map(td=>td.textContent.trim()+(td.querySelector('input')?td.querySelector('input').value:'')).join('·')).sort().join('\\n')`);
  io.files.length = 0; io.alerts.length = 0; E(`document.getElementById('ssoPeriodSel').value='${p}'; exportSso()`); o.ssoX = JSON.stringify(io.files.map(f => f.aoa));
  E(`go('payroll'); closeModal('slipBg'); closeModal('kbizResBg');`);
  return o;
}
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
// 🔒 เงินประกันงวดที่จ่ายแล้วก่อนงวด p ด้วยยอดที่ระบบคิด (แทนเจ้าของกด 🔒 ที่หน้า 🛡️) — ปิดงวด p ได้ต้อง 🔒 งวดก่อนหน้าครบ (รอบตรวจ 2)
const LOCKPRE = p => `(async()=>{ const it = depScope(()=>employees.flatMap(e=>depLockDue(e,{ before:'${p}' }))); if(it.length){ const r = await depLockWrite(it, CLOSE_PG, true); if(r.error) throw r.error; } await depRefresh(); return it.length; })()`;
const at = (a, b) => { let i = 0; while(i < a.length && a[i] === b[i]) i++; return a.slice(Math.max(0, i - 80), i + 80) + '  ⟶  ' + b.slice(Math.max(0, i - 80), i + 80); };

(async () => {
  // ============ 1) ยังไม่รัน jj_pay_close.sql = แอปเหมือนเดิมทุกอย่าง ============
  { const A = boot({ now:NOW }); const { E, T, db, io } = A; await wait(300);
    console.log('[1 ยังไม่รัน jj_pay_close.sql — แอปแบบเดิมทุกอย่าง (payOf = calcPay · ไม่มีช่อง jjmk-close · 🔒 อัตโนมัติวันจ่ายยังทำงาน)]');
    seed(T); delete T.pay_slips; delete T.pay_batches;
    E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH); payLockAuto=false;`);
    await E(`loadAll()`);
    ok(E(`closeReady`) === false && E(`closeLoadErr`) === '' && !E(`moneyBlocked()`), 'ไม่มีตาราง pay_slips/pay_batches → closeReady false · ไม่บล็อกการออกเงิน');
    ok(E(`employees.every(e=>['2026-08','2026-09','2026-10','2026-11'].every(p=>JSON.stringify(payOf(e,p))===JSON.stringify(calcPay(e,p))))`), 'payOf = calcPay ทุกคนทุกงวด');
    ok(E(`employees.every(e=>['2026-09','2026-10'].every(p=>buildSlip(e,p,true)===slipHtml(slipModel(e,p,calcPay(e,p)),true,e,null)))`), 'สลิป = slipHtml(slipModel) (ไม่มีป้ายปิดงวด)');
    ok(!db.chans['jjmk-close'] || !Object.keys(db.chans['jjmk-close']).length, 'ไม่เปิดช่อง realtime jjmk-close');
    // ขั้น 2: ไม่มีปุ่ม/แถบเตือน/ป้าย (หน้าจอเหมือน main)
    E(`go('payroll'); document.getElementById('periodSel').value='2026-09'; renderPayroll(); renderAll();`);
    ok(E(`['closeBtn','reopenBtn','closeDueBar'].every(id=>document.getElementById(id).hidden) && document.getElementById('closeBadge').style.display==='none' && document.getElementById('payClose').innerHTML===''`),
       'ไม่มีปุ่ม 🔒 ปิดงวด/🔓 เปิดงวดใหม่ · ไม่มีแถบเตือน/ตัวเลขบนเมนู/สถานะงวด');
    E(`go('dep'); renderDeposit();`);
    ok(E(`/ระบบปิดยอดให้เองในวันจ่าย/.test(document.getElementById('depInfo').innerHTML) && !/ปิดงวด/.test(document.getElementById('depInfo').innerHTML)`), '🛡️ ข้อความเดิม (🔒 อัตโนมัติวันจ่าย) · ไม่มีป้ายปิดงวด');
    E(`detailEmpId=1; detailTab='money'; go('detail'); document.getElementById('detailPeriodSel').value='2026-09'; renderDetail(true);`);
    ok(E(`/onclick="openAdj\\(1,'add','2026-09'\\)"/.test(document.getElementById('detailContent').innerHTML) && !/ปิดงวด/.test(document.getElementById('detailContent').innerHTML)`), 'หน้ารายคน: ปุ่มเดิมครบ · ไม่มีป้ายปิดงวด');
    E(`detailEmpId=null;`);
    E(`go('audit'); renderAudit(); go('payroll');`);
    ok(!E(`[...document.querySelectorAll('#audAct option')].some(o=>o.value==='close'||o.value==='reopen')`), '🕘 ไม่มีตัวกรอง "ปิดงวด/เปิดงวดใหม่" (หน้าจอเท่า main)');
    const r = await E(`closeRun({ period:'2026-08' })`);
    ok(r && r.ok === false && /jj_pay_close\.sql/.test(r.msg) && !(T.pay_slips || []).length && !(T.pay_batches || []).length, 'closeRun = บอกให้รัน SQL · ไม่เขียนอะไร');
    E(`payLockAuto=true; payLockReady=true;`);
    ok(E(`(payDayLock('load'), true)`) && E(`closeReady===false`), '🔒 อัตโนมัติวันจ่าย ยังเรียกได้แบบเดิม (ไม่ถูกปิดเพราะยังไม่รัน SQL)');
    A.w.close();
  }

  // ============ 2) ปิดงวด ส.ค. → ก.ย. → ต.ค. แล้วแก้ทุกอย่าง — งวดที่ปิดไม่เปลี่ยนทุกไบต์ · งวดที่เปิดเปลี่ยนตาม · ยอดยกถูก ============
  const A = boot({ now:NOW }); const { E, T, db, io, setNow } = A; await wait(300);
  seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
  E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`);
  await E(`loadAll()`);
  console.log('[2 โหลด · realtime · ตัวกลาง]');
  ok(E(`closeReady`) === true && E(`closeLoadErr`) === '' && E(`!moneyBlocked()`), 'มีตาราง (ว่าง) → closeReady true');
  ok(db.chans['jjmk-close'] && db.chans['jjmk-close'].pay_slips && db.chans['jjmk-close'].pay_batches && !(db.chans['jjmk-live'] || {}).pay_slips, 'realtime ช่องแยก jjmk-close (ไม่อยู่ใน jjmk-live)');
  ok(E(`employees.every(e=>PDS.concat(['2026-11']).every(p=>JSON.stringify(payOf(e,p))===JSON.stringify(calcPay(e,p))))`.replace('PDS', JSON.stringify(PDS))), 'ยังไม่มีงวดปิด → payOf = calcPay');
  ok(E(`payDayLock('load')`) && true, '(เรียก payDayLock ได้)');
  ok(await E(`payDayLock('load')`) === null && !T.deposit_entries.length, 'รัน SQL แล้ว = 🔒 อัตโนมัติวันจ่ายไม่ทำงาน (เจ้าของสั่ง: ให้พนักงานปิดงวดเอง)');

  console.log('[3 สิทธิ์ · ปิดย้อนหลัง ส.ค./ก.ย. = เจ้าของ/แอดมิน + เหตุผล · ต.ค. ปิดได้เลย · งวดยังไม่จบ]');
  E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'vae',detail:'v'}}}; applyUser(AUTH);`);
  let r = await E(`closeRun({ period:'2026-08' })`);
  ok(r.ok === false && /ไม่มีสิทธิ์ปิดงวด/.test(r.msg) && !T.pay_slips.length, 'ไม่มีสิทธิ์ "ปิดงวด" (apps.payroll._close) = ปิดไม่ได้ (fail closed)');
  E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'v',_close:'1'}}}; applyUser(AUTH);`);
  ok(E(`closeCan()`) === true && E(`closeCanReopen()`) === false, 'ติ๊กสิทธิ์ปิดงวด → ปิดได้ (หน้า payroll ดูอย่างเดียวก็ได้) · เปิดงวดใหม่ไม่ได้');
  r = await E(`closeRun({ period:'2026-08', reason:'ปิดย้อนหลังด้วยยอดที่ระบบคิด' })`);
  ok(r.ok === false && /เฉพาะเจ้าของ\/แอดมิน/.test(r.msg) && !T.pay_slips.length && !T.deposit_entries.length, 'ปิดย้อนหลัง ส.ค. (จ่ายก่อนมีระบบ) ด้วยบัญชีที่ไม่ใช่เจ้าของ = ไม่ได้ · ไม่เขียนอะไร');
  r = await E(`closeRun({ period:'2026-09', dry:true })`);
  ok(r.ok === false && /เฉพาะเจ้าของ\/แอดมิน/.test(r.msg), 'พรีวิวปิดย้อนหลัง ก.ย. (ไม่ใช่เจ้าของ) = ไม่ได้');
  r = await E(`closeRun({ period:'2026-10', dry:true })`);
  ok(r.ok === true && !r.retro && !r.prevNeed.length && r.hold.length === 8 && !r.plan.length && r.hold.every(x => x.ps.length && x.ps.every(p => p < '2026-10')),
     'ต.ค.: ส.ค./ก.ย. ยังไม่ 🔒 เงินประกัน (ยอดสะสมยังไม่ได้ตรวจ) = ยังปิดไม่ได้ทุกคน · บอกงวดที่ต้อง 🔒 (รอบตรวจ 2)');
  r = await E(`closeRun({ period:'2026-10' })`);
  ok(r.ok === false && /ยังไม่ 🔒 เงินประกันงวดก่อนหน้า 8 คน/.test(r.msg) && /หน้า 🛡️/.test(r.msg) && !T.pay_slips.length && !T.deposit_entries.length, 'ปิดจริง = ไม่ได้ · ไม่เขียนอะไร · บอกให้ 🔒 ที่หน้า 🛡️');
  ok(await E(LOCKPRE('2026-10')) > 0, '🔒 เงินประกัน ส.ค./ก.ย. (แทนเจ้าของกดที่หน้า 🛡️)');
  r = await E(`closeRun({ period:'2026-10', dry:true })`);
  ok(r.ok === true && !r.retro && !r.prevNeed.length && !r.hold.length && r.plan.length === 8, 'ต.ค. (งวดแรกหลังมีระบบ) ปิดได้โดยไม่ต้องรอปิด ส.ค./ก.ย. (ไม่บังคับเรียงงวดย้อนหลัง · เจ้าของตอบ ③)');
  r = await E(`closeRun({ period:'2026-11' })`);
  ok(r.ok === false && /ยังไม่ถึงวันจ่าย|เรียงงวด/.test(r.msg), 'งวดที่ยังไม่ถึงวันจ่าย = ปิดไม่ได้');
  r = await E(`closeRun({ period:'2026-07' })`);
  ok(r.ok === false && /ตั้งแต่/.test(r.msg), 'ก่อน CLOSE_START (ส.ค. 69) = ปิดไม่ได้');

  console.log('[4 ปิด ส.ค. / ก.ย. (ด้วยบัญชีที่มีสิทธิ์ปิดงวด) — 🔒 เงินประกัน/สำรองฯ ถูกเขียนให้ตรงฉบับปิด]');
  const before = {};   // สลิป/ผลคิดเงินตอนยังเปิด (วันเดียวกับวันปิด) — ฉบับปิดต้องเหมือนทุกตัวอักษร
  const nov0 = E(`employees.map(e=>JSON.stringify(calcPay(e,'2026-11')))`);   // งวดที่เปิด ก่อนมีการปิด
  for(const p of PDS) before[p] = { slips:E(`employees.map(e=>buildSlip(e,'${p}',true)+buildSlip(e,'${p}',false))`), pay:E(`employees.map(e=>JSON.stringify(calcPay(e,'${p}')))`) };
  // ไฟล์ K BIZ ต.ค. ที่สร้างก่อนปิด (หลักฐานยอดที่โอน) — สร้างด้วยบัญชีเจ้าของ
  E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH); kbizLockDue = () => [];`);
  io.files.length = 0; io.promptAns = ['10/11/2026'];
  E(`document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value='';`);
  await E(`exportKbizPay('')`); await wait(50);
  const kb0 = io.files.pop();
  const kbB = T.pay_batches.filter(b => b.kind === 'kbiz');
  ok(kb0 && kbB.length === 1 && kbB[0].meta.rows.length >= 5 && kbB[0].meta.eff === '10/11/2026' && kbB[0].period === '2026-10', 'สร้างไฟล์ K BIZ ต.ค. → จด batch kbiz พร้อมยอดรายคนในไฟล์ + วันเงินเข้า');
  r = await E(`closeRun({ period:'2026-08' })`);
  ok(r.ok === false && /เหตุผล/.test(r.msg) && !T.pay_slips.length, 'เจ้าของปิดย้อนหลังโดยไม่ใส่เหตุผล = ไม่ได้');
  r = await E(`closeRun({ period:'2026-08', reason:'สั้นไป' })`);
  ok(r.ok === false && /10 ตัวอักษร/.test(r.msg) && !T.pay_slips.length, 'เหตุผลสั้นกว่า 10 ตัวอักษร = ไม่ได้');
  r = await E(`closeRun({ period:'2026-08', reason:'ปิดย้อนหลัง ตรวจกับสลิปที่แจกแล้ว' })`);
  ok(r.ok === true && r.n === 8 && T.pay_batches.some(b => b.kind === 'close' && b.period === '2026-08' && b.username === 'owner' && b.src === 'calc' && /ตรวจกับสลิป/.test(b.reason)),
     'เจ้าของปิดย้อนหลัง ส.ค. 8 คน (รวมคนที่ลาออกทีหลัง) · batch close: คนปิด · src calc (ยอดที่ระบบคิด) · เหตุผล');
  r = await E(`closeRun({ period:'2026-09', reason:'ปิดย้อนหลัง ตรวจกับสลิปที่แจกแล้ว' })`);
  ok(r.ok === true && r.n === 8, 'ปิด ก.ย. 8 คน');
  const s8 = T.pay_slips.filter(x => x.period === '2026-08');
  ok(s8.every(x => x.kind === 'close' && x.ver === 1 && x.pay && x.slip && x.sha && x.carry && x.cycle && x.src === 'calc'), 'แถวรายคน: รุ่น 1 · pay + slip + sha + carry + รอบ');
  ok(s8.every(x => !('sso_id' in x.pay._emp) && !('photo' in x.pay._emp) && !('address' in x.pay._emp)), 'ไม่เก็บเลขบัตร/รูป/ที่อยู่ในฉบับปิด');
  ok(E(`paySlips.every(c=>closeSha(c.pay, closeSlipBody.get(c.id))===c.sha)`), 'sha ของ pay+slip (เรียงคีย์) ตรงกับที่เก็บ');
  const dl = p => T.deposit_entries.filter(x => x.period === p);
  ok(dl('2026-08').length === 8 && dl('2026-08').every(x => /^lock/.test(x.note)) && dl('2026-09').length === 8 && dl('2026-09').every(x => /^lock/.test(x.note)), '🔒 เงินประกัน ส.ค./ก.ย. ถูกเขียนให้ทุกคนที่ปิด (ตารางเดิม · คนที่ไม่หัก = 🔒 0)');
  ok(E(`employees.every(e=>['2026-08','2026-09'].every(p=>{ const c=closedOf(e,p), r=depRowOf(e.id,p); return !c || !depReady || (r && DEP_FIXED(r.note) && Math.max(0,r.amount)===payOf(e,p).dep.ded); }))`), 'ยอด 🔒 เงินประกัน = ยอดในฉบับปิด');
  ok(T.pvd_entries.filter(x => x.employee_id === 7 && x.note === 'lock').length === 2 && E(`['2026-08','2026-09'].every(p=>{ const r=pvdRowOf(7,p), v=payOf(employees.find(e=>e.id===7),p).pvd; return r.empAmt===v.ded && r.erAmt===v.er; })`), '🔒 สำรองฯ ส.ค./ก.ย. = ยอดในฉบับปิด');
  ok(T.payroll_audit.filter(a => a.action === 'close').length === 2 && T.payroll_audit.some(a => a.action === 'close' && /\[p:2026-08\]/.test(a.detail) && /8 คน/.test(a.detail) && /ปิดย้อนหลัง/.test(a.detail)) &&
     !T.payroll_audit.some(a => a.tbl === 'pay_slips' && a.action === 'insert') && !T.payroll_audit.some(a => a.tbl === 'deposit_entries'), 'ประวัติ 1 บรรทัดต่อการปิด (ตัวดักไม่จดรายแถว)');

  console.log('[5 ปิด ต.ค. — คนหนึ่งยอดที่โอนจริงไม่ตรงระบบ (ปิดด้วยยอดที่โอนจริง · บรรทัดปรับในสลิปงวดนั้นเอง · ไม่ยกไปงวดถัดไป)]');
  const netB = E(`Math.round(calcPay(employees.find(e=>e.id===2),'2026-10').net*100)/100`);
  const adj0 = T.adjustments.length;
  E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'v',_close:'1'}}}; applyUser(AUTH);`);   // ต.ค. = ผู้มีสิทธิ์ปิดงวด (ไม่ใช่เจ้าของ) ปิดได้
  r = await E(`closeRun({ period:'2026-10', paid:{ 2:${netB + 123.45} }, why:{ 2:'โอนตามไฟล์เดิมก่อนแก้หัก' } })`);
  ok(r.ok === true && r.n === 8, 'ปิด ต.ค. 8 คน (เอชลาออก 30 ก.ย. มีวันทำงาน 26–30 ก.ย. ในงวด ต.ค. หน้าร้าน)');
  const sB = T.pay_slips.find(x => x.employee_id === 2 && x.period === '2026-10');
  ok(sB.src === 'paid' && Math.abs(sB.paid - (netB + 123.45)) < 0.001 && Math.abs(sB.net - (netB + 123.45)) < 0.001 && /ยอดที่โอนจริง/.test(sB.note) && /โอนตามไฟล์เดิม/.test(sB.note),
     'บี: ปิดด้วยยอดที่โอนจริง (src paid · paid = net = ยอดโอน · เหตุผลรายคน)');
  ok(sB.slip.otRest.includes('ปรับให้ตรงยอดที่โอนจริง') && sB.slip.net === E(`THB2(${netB + 123.45})`), 'สลิปของงวดนั้นมีบรรทัด "ปรับให้ตรงยอดที่โอนจริง" · สุทธิ = ยอดโอน');
  ok(T.adjustments.length === adj0 && E(`payOf(employees.find(e=>e.id===2),'2026-11').adds.every(a=>!/ปรับให้ตรง/.test(a.reason))`), 'ไม่สร้างรายการในงวดถัดไป (เจ้าของสั่ง: ไม่ยก)');
  ok(T.payroll_audit.some(a => a.action === 'close' && /ปิดตามยอดที่โอนจริง 1 คน: บี/.test(a.detail)), 'ประวัติบอกคนที่ปิดด้วยยอดที่โอนจริง + ยอดระบบ');
  ok(JSON.stringify(E(`employees.map(e=>JSON.stringify(payOf(e,'2026-11')))`)) === JSON.stringify(nov0), 'ปิด ส.ค.–ต.ค. แล้ว (ข้อมูลไม่เปลี่ยน) → งวดที่เปิด (พ.ย.) ได้ผลคิดเงินเท่าก่อนปิดทุกช่อง (ยอดยกต่อเนื่อง)');
  ok(E(`(()=>{ const c=closeCarryOf({ dep:{ded:0,refund:0,xfer:0,collected:0,target:0}, mou:{loan:{id:9},ded:1000,collected:3000,target:15000,done:false}, eloan:{loan:{id:8},ded:500,dedMid:0,dedPay:500,collected:1500,target:5000,done:false}, pvd:{on:false}, sso:{on:false,ded:0,wageBase:0}, tip:{share:0,pool:0,n:0}, advSum:0, days:0 }, 0);
      return c.mou.collected===2000 && c.loan.collected===1000; })()`), 'ยอดยก MOU/เงินยืม: ✎ ของงวดที่ไม่มีวันทำงานไม่นับเข้ายอดสะสมงวดหลัง (สูตรเดิม)');
  r = await E(`closeRun({ period:'2026-10' })`);
  ok(r.ok === false && /ไม่มีใครต้องปิด/.test(r.msg) && T.pay_slips.filter(x => x.period === '2026-10').length === 8, 'กดปิดซ้ำ = ไม่มีใครต้องปิด (ไม่เขียนซ้ำ)');

  console.log('[6 ฉบับปิด = เหมือนวันปิดทุกตัวอักษร (+ ป้ายพิมพ์ซ้ำ) · round-trip ผลคิดเงิน]');
  for(const p of PDS){
    const now = E(`employees.map(e=>buildSlip(e,'${p}',true)+buildSlip(e,'${p}',false))`), ids = E(`employees.map(e=>e.id)`);
    const same = now.every((h, i) => { const id = ids[i]; if(id === 2 && p === '2026-10') return true; const c = E(`!!closedOf(employees[${i}],'${p}')`); return c ? strip(h) === before[p].slips[i] : h === before[p].slips[i]; });
    ok(same, 'สลิป ' + p + ': ฉบับปิด (ตัดป้ายปิดงวด) = สลิปตอนยังเปิดวันเดียวกันทุกไบต์ (ทั้งครึ่งหน้า/เต็มหน้า)');
    const rt = E(`employees.map(e=>{ const c=closedOf(e,'${p}'); if(!c) return false; const j=JSON.parse(JSON.stringify(payThaw(c))); for(const k of ['closed','_emp','_ns','_v','_set','netAdj','netSys']) delete j[k];
        return c.src==='paid' || JSON.stringify(j)===JSON.stringify(calcPay(e,'${p}')); })`);
    ok(rt.every(Boolean), 'ผลคิดเงิน ' + p + ': payThaw(ฉบับปิด) = calcPay ตอนปิด (หลังเขียน 🔒) ทุกช่อง');
  }
  ok(E(`buildSlip(employees.find(e=>e.id===1),'2026-10',true).includes('🔒 ฉบับปิดงวด · พิมพ์ซ้ำ')`) && E(`/รุ่น 1 · ปิด .* โดย ผจก/.test(buildSlip(employees.find(e=>e.id===1),'2026-10',false))`), 'สลิปฉบับปิดมีป้าย "ฉบับปิดงวด · พิมพ์ซ้ำ" + รุ่น/วันปิด/คนปิด');

  console.log('[7 จับภาพทุกจอที่ออกเงินของงวดที่ปิด แล้วแก้ข้อมูลทุกแบบ]');
  io.promptAns = []; io.confirmAns = null;
  const snap0 = {}; for(const p of PDS) snap0[p] = await snap(A, p);
  const kbOrig = JSON.parse(snap0['2026-10'].kbiz);
  ok(kbOrig.length === 1 && JSON.stringify(kbOrig[0][1]) === JSON.stringify(kb0.aoa) && T.pay_batches.filter(b => b.kind === 'kbiz' && b.period === '2026-10').length === 1,
     'K BIZ ต.ค. หลังปิด = ไฟล์ฉบับเดิมทุกแถว (บัญชี/ยอด/วันเงินเข้าเดิม) · ไม่จด batch ใหม่');
  ok(/ฉบับเดิม/.test(snap0['2026-10'].kbizMsg) && /ห้ามสร้างไฟล์ใหม่/.test(snap0['2026-10'].kbizMsg), 'บอกว่าเป็นไฟล์ฉบับเดิม ห้ามสร้างจากตัวเลขใหม่');
  const n11 = E(`JSON.stringify(employees.map(e=>[e.id, calcPay(e,'2026-11').net]))`);
  const carry = (id, p) => T.pay_slips.find(x => x.employee_id === id && x.period === p).carry;
  // แก้ทุกอย่างในฐานข้อมูล (เหมือนแก้จากเครื่องอื่น/แอปรุ่นเก่า) แล้วโหลดใหม่
  const emp = id => T.employees.find(e => e.id === id);
  emp(1).rate = 15000; emp(1).sso_on = false; emp(1).deposit_opening = 1000;            // ค่าแรง · สปส. · เงินประกันเก็บมาก่อน
  emp(3).active = false; emp(3).end_date = '2026-11-03';                                 // ลาออก
  emp(2).branch = 'JJRD';                                                                // ย้ายสาขา
  emp(4).deposit_on = true; emp(4).wage_type = 'daily'; emp(4).rate = 700;              // ออฟฟิศ: เปลี่ยนเป็นรายวัน
  T.payroll_settings[0].min_fine = 5; T.payroll_settings[0].single_fine = 500; T.payroll_settings[0].sso_rate = 6;   // ตั้งค่า
  T.shifts[0].start_time = '08:30';                                                      // กะ
  T.mou_loans[0].monthly = 3000; T.mou_loans[0].opening = 2000;                          // MOU
  T.loans[0].opening = 500; T.loans[0].monthly = 2000;                                   // เงินยืม
  T.pvd_members[0].opening_emp = 1000; T.pvd_members[0].emp_value = 800;                 // สำรองฯ
  T.tips[0].amount = 99999;                                                              // ทิป (แอปรุ่นเก่า)
  T.holidays.push({ id:2, day:'2026-10-20', name:'วันพิเศษ', multiplier:3, scope:'all', cal_id:null });   // วันหยุด
  T.punches = T.punches.filter(x => x.punch_date >= '2026-08-26');                       // สแกน ส.ค. หลุดหน้าต่าง
  await E(`loadAll()`);
  ok(E(`closeReady && !closeLoadErr && paySlips.length===24`), 'โหลดใหม่ → ฉบับปิด 24 แถวครบ');
  ok(E(`allPeriods().includes('2026-08')`), 'สแกน ส.ค. หลุดหน้าต่าง → งวด ส.ค. (ปิดแล้ว) ยังเลือกดูได้');
  // ส.ค./ก.ย. ไม่มีไฟล์ที่จดไว้ → ครั้งแรก (snap0) สร้างจากยอดฉบับปิด + จด batch kbiz (รอบตรวจ 3) → ครั้งต่อไป = ไฟล์ฉบับเดิม (ไฟล์เท่ากันทุกแถว · ข้อความต่าง)
  ok(['2026-08', '2026-09'].every(p => T.pay_batches.filter(b => b.kind === 'kbiz' && b.period === p).length === 1 && !snap0[p].kbizMsg && JSON.parse(snap0[p].kbiz).length === 1),
     'ส.ค./ก.ย. (ไม่มีไฟล์ที่จด): สร้างไฟล์จากยอดฉบับปิดหลังถามยืนยัน + จด batch kbiz');
  for(const p of PDS){
    const s1 = await snap(A, p);
    if(p < '2026-10' && /ฉบับเดิม/.test(s1.kbizMsg) && s1.kbiz === snap0[p].kbiz) s1.kbizMsg = snap0[p].kbizMsg;   // ครั้งที่สอง = ไฟล์ฉบับเดิม (ไฟล์เดียวกันทุกไบต์)
    const d = diff(snap0[p], s1);
    ok(!d.length, 'งวด ' + p + ' (ปิดแล้ว) ไม่เปลี่ยนทุกไบต์: สลิป · สรุป(ทุกสาขา/ลพ./รช.) · Excel · ใบสรุปบัญชี · พิมพ์ทั้งหมด · K BIZ · รายคน · 📚 · 🛡️ · 🐷 · สปส. · สปส.1-10' +
       (d.length ? ' — ต่าง: ' + d.join(',') + ' ' + at(snap0[p][d[0]], s1[d[0]]) : ''));
  }
  ok(E(`[...document.querySelectorAll('#payTable tbody tr')].length`) >= 0 && /บี/.test(snap0['2026-10'].sumJJLP) && !/บี/.test(snap0['2026-10'].sumJJRD), 'ย้ายสาขาหลังปิด: งวดที่ปิดยังอยู่สาขาเดิม (ณ วันปิด)');

  console.log('[8 งวดที่ยังเปิด (พ.ย.) เปลี่ยนตามค่าที่แก้ · ยอดยกเริ่มจากฉบับปิด ต.ค.]');
  const p11 = id => E(`JSON.parse(JSON.stringify(payOf(employees.find(e=>e.id===${id}),'2026-11')))`);
  ok(E(`JSON.stringify(employees.map(e=>[e.id, calcPay(e,'2026-11').net]))`) !== n11, 'งวด พ.ย. (ยังเปิด) เปลี่ยนตาม');
  const a11 = p11(1);
  ok(a11.base === 15000 && !a11.sso.ded, 'เอ พ.ย.: ค่าแรงใหม่ 15,000 · ปิด สปส. แล้วไม่หัก');
  // ค่าตั้งต้นที่แก้หลังปิด (เก็บมาก่อน 0→1,000 · MOU ผ่อนมาแล้ว 0→2,000 · เงินยืม 0→500 · สำรองฯ ยกมา 0→1,000) = งวดที่เปิดบวกส่วนต่าง (ผลตรวจรอบ 1 — เดิมไม่มีผลเลย)
  const mainP = (id, p) => E(`(()=>{ closeReady=false; try{ return JSON.parse(JSON.stringify(calcPay(employees.find(e=>e.id===${id}),'${p}'))); } finally { closeReady=true; } })()`);   // สูตรเดิม (main) บนข้อมูลเดียวกัน
  const ca1 = carry(1, '2026-10').dep, m1 = mainP(1, '2026-11');
  ok(ca1.open === 0 && a11.dep.before === ca1.collected + 1000 && a11.dep.before === m1.dep.before && a11.dep.ded === m1.dep.ded && a11.dep.collected === m1.dep.collected,
     'เอ เงินประกัน พ.ย.: สะสมก่อนงวด = ยอดยกจากฉบับปิด ต.ค. ' + ca1.collected + ' + "เก็บมาก่อน" ที่แก้หลังปิด 1,000 = ' + a11.dep.before + ' (เท่าสูตรเดิม)');
  const e11 = p11(5), cm = carry(5, '2026-10').mou;
  ok(cm && cm.open === 0 && e11.mou.collected === cm.collected + 2000 + e11.mou.ded && e11.mou.ded === Math.min(3000, 15000 - cm.collected - 2000),
     'อี MOU พ.ย. = ผ่อนแล้วจากฉบับปิด ' + cm.collected + ' + ผ่อนมาแล้วที่แก้ +2,000 + งวดนี้ ' + e11.mou.ded + ' (ผ่อนใหม่ 3,000 · ไม่นับซ้ำ/ไม่หายตามสแกน ส.ค. ที่หลุด)');
  const f11 = p11(6), cl = carry(6, '2026-10').loan;
  ok(cl && cl.open === 0 && f11.eloan.collected === cl.collected + 500 + f11.eloan.ded && f11.eloan.ded === Math.min(2000, 5000 - cl.collected - 500),
     'เอฟ เงินยืม พ.ย. = ผ่อนแล้วจากฉบับปิด ' + cl.collected + ' + ผ่อนมาแล้วที่แก้ +500 + งวดนี้ ' + f11.eloan.ded);
  const g11 = p11(7), cp = carry(7, '2026-10').pvd, m7 = mainP(7, '2026-11');
  ok(cp && cp.openEmp === 0 && g11.pvd.empSum === cp.empSum + 1000 + g11.pvd.ded && g11.pvd.ded === 800 && g11.pvd.empSum === m7.pvd.empSum && g11.pvd.balance === m7.pvd.balance,
     'จี สำรองฯ พ.ย. = สะสมจากฉบับปิด ' + cp.empSum + ' + ยกมาที่แก้ +1,000 + หัก 800 (เท่าสูตรเดิม)');
  ok(E(`payIn(employees.find(e=>e.id===3),'2026-10') && payOf(employees.find(e=>e.id===3),'2026-10').closed && !employees.find(e=>e.id===3).active`), 'ซี ลาออกหลังปิด: ยังอยู่ในรายชื่อ ต.ค. (ฉบับปิด) ครบ');
  ok(E(`empAt(employees.find(e=>e.id===2),'2026-10').branch==='JJLP' && empAt(employees.find(e=>e.id===2),'2026-11').branch==='JJRD'`), 'ข้อมูลพนักงานของงวด: ปิดแล้ว = ณ วันปิด · ยังเปิด = ปัจจุบัน');

  console.log('[9 รายการรายงวดของงวดที่ปิด = บล็อก · ค่าที่ไม่มีงวด = แก้ได้]');
  E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`);
  const tl = () => E(`document.getElementById('toast').textContent`);
  const nFine = T.fine_entries.length;
  await E(`setFineOverride(1,'2026-10','miss','0')`);
  ok(T.fine_entries.length === nFine && /ปิดงวดแล้ว/.test(tl()) && /ต\.ค\./.test(tl()) && /เอ/.test(tl()), '✎ ค่าปรับ ต.ค. ของคนที่ปิดแล้ว = บล็อก + บอกงวด/ชื่อ/วันปิด');
  await E(`setSsoOverride(1,'2026-10','0')`); ok(!T.sso_entries.length && /ปิดงวดแล้ว/.test(tl()), '✎ สปส. งวดที่ปิด = บล็อก');
  await E(`setMouOverride(5,'2026-09','0')`); ok(!T.mou_entries.length && /ปิดงวดแล้ว/.test(tl()), '✎ หัก MOU งวดที่ปิด = บล็อก');
  await E(`setLoanOverride(6,'2026-09','0')`); ok(!T.loan_entries.length && /ปิดงวดแล้ว/.test(tl()), '✎ ผ่อนเงินยืมงวดที่ปิด = บล็อก');
  const nDep = T.deposit_entries.length;
  await E(`setDepOverride(2,'2026-10','0')`); ok(T.deposit_entries.length === nDep && /ปิดงวดแล้ว/.test(tl()), '✎ เงินประกันงวดที่ปิด = บล็อก');
  await E(`editDeposit(1,'2026-10')`); ok(/ปิดงวดแล้ว/.test(tl()), '✎ แถว 🔒 เงินประกันงวดที่ปิด = ต้องเปิดงวดใหม่ก่อน');
  const nAdj = T.adjustments.length, nAdv = T.advances.length;
  let q = await E(`db.from('adjustments').insert({ employee_id:1, kind:'add', reason:'x', amount:1, period:'2026-10' })`);
  ok(q.error && q.error.code === 'JJ_CLOSED' && T.adjustments.length === nAdj, 'ชั้นที่สอง (ตัวดัก db.from): insert เพิ่ม/หักเงินของคน·งวดที่ปิด = JJ_CLOSED');
  q = await E(`db.from('advances').insert({ employee_id:1, period:'2026-09', amount:100, taken_date:'2026-09-15', note:'' })`);
  ok(q.error && T.advances.length === nAdv, 'insert เบิกของงวดที่ปิด = บล็อก');
  q = await E(`db.from('tips').upsert({ period:'2026-10', branch:'JJLP', amount:1, member_ids:'' }, { onConflict:'period,branch' })`);
  ok(q.error && T.tips[0].amount === 99999, 'บันทึกทิปของสาขา·งวดที่ปิด = บล็อก');
  q = await E(`db.from('pvd_payouts').insert({ employee_id:7, pay_date:'2026-11-06', period:'2026-10', amount:100, via:'cash', note:'' })`);
  ok(!q.error && T.pvd_payouts.length === 1, 'ถอนสำรองฯ เป็นเงินสด (นอกสลิป) งวดที่ปิด = ทำได้');
  q = await E(`db.from('pvd_payouts').insert({ employee_id:7, pay_date:'2026-11-06', period:'2026-10', amount:100, via:'slip', note:'' })`);
  ok(q.error && T.pvd_payouts.length === 1, 'จ่ายคืนสำรองฯ ในสลิปของงวดที่ปิด = บล็อก');
  q = await E(`db.from('adjustments').insert({ employee_id:1, kind:'add', reason:'ปรับยอดงวด ต.ค.', amount:100, period:'2026-11' })`);
  ok(!q.error && T.adjustments.length === nAdj + 1, 'ลงรายการในงวดที่ยังเปิด (พ.ย.) = ทำได้');
  await E(`saveSetting('single_fine', 600)`); await wait(50);
  ok(T.payroll_settings[0].single_fine === 600 && !/ปิดงวดแล้ว/.test(tl()), 'แก้ตั้งค่า (ไม่มีงวด) = ทำได้ · งวดที่ปิดไม่เปลี่ยน');
  ok(E(`calPreview && true`), '(ปฏิทิน: พรีวิวใช้ payOf — งวดที่ปิด = ไม่มีผล)');
  ok(E(`depLockDue(employees.find(e=>e.id===1),{}).every(x=>!['2026-08','2026-09','2026-10'].includes(x.p))`), 'ตัวกันเดิม (depLockDue) ข้ามงวดที่ปิดแล้ว');

  console.log('[10 เปิดงวดใหม่ (เจ้าของ/แอดมิน + เหตุผล · ย้อนจากงวดล่าสุด) → แก้ → ปิดซ้ำ = รุ่น 2]');
  E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'vae',_close:'1'}}}; applyUser(AUTH);`);
  r = await E(`closeReopen({ period:'2026-10', ids:[1], reason:'แก้ค่าแรงเอที่ผิดจากสัญญาจ้าง' })`);
  ok(r.ok === false && /เจ้าของ\/แอดมิน/.test(r.msg) && !T.pay_slips.some(x => x.kind === 'reopen'), 'ผู้มีสิทธิ์ปิดงวด (ไม่ใช่เจ้าของ) เปิดงวดใหม่ไม่ได้');
  E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`);
  r = await E(`closeReopen({ period:'2026-10', ids:[1], reason:'สั้น' })`);
  ok(r.ok === false && /10 ตัวอักษร/.test(r.msg), 'เหตุผลสั้นกว่า 10 ตัวอักษร = ไม่ได้');
  r = await E(`closeReopen({ period:'2026-09', ids:[1], reason:'แก้ค่าแรงเอที่ผิดจากสัญญาจ้าง' })`);
  ok(r.ok === false && /งวดล่าสุด/.test(r.msg) && /ต\.ค\./.test(r.msg), 'เปิด ก.ย. ขณะ ต.ค. ยังปิด = ไม่ได้ (ต้องย้อนจากงวดล่าสุด)');
  const a10 = E(`payOf(employees.find(e=>e.id===1),'2026-10').net`);
  r = await E(`closeReopen({ period:'2026-10', ids:[1], reason:'แก้ค่าแรงเอที่ผิดจากสัญญาจ้าง' })`);
  const ro = T.pay_slips.find(x => x.employee_id === 1 && x.period === '2026-10' && x.kind === 'reopen');
  ok(r.ok === true && ro && ro.ver === 2 && !ro.pay && T.pay_batches.some(b => b.kind === 'reopen' && b.reason === 'แก้ค่าแรงเอที่ผิดจากสัญญาจ้าง') && T.payroll_audit.some(a => a.action === 'reopen'),
     'เปิด ต.ค. ของเอใหม่: แถว reopen รุ่น 2 (ฉบับเดิมยังอยู่) · batch + เหตุผล + ประวัติ');
  ok(E(`!closedOf(employees.find(e=>e.id===1),'2026-10') && !!closedOf(employees.find(e=>e.id===5),'2026-10')`), 'เอ ต.ค. = ยังเปิด · คนอื่นยังปิด');
  ok(E(`payOf(employees.find(e=>e.id===1),'2026-10').base`) === 15000 && a10 !== E(`payOf(employees.find(e=>e.id===1),'2026-10').net`), 'งวดที่เปิดใหม่คิดสดด้วยค่าปัจจุบัน');
  ok(T.deposit_entries.some(x => x.employee_id === 1 && x.period === '2026-10' && /^lock/.test(x.note)), 'แถว 🔒 เงินประกันของงวดนั้นยังอยู่ (แก้ด้วย ✎ แถว 🔒 ตามวิธีเดิม)');
  r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
  const v2 = T.pay_slips.filter(x => x.employee_id === 1 && x.period === '2026-10').sort((a, b) => b.ver - a.ver)[0];
  ok(r.ok === true && v2.kind === 'close' && v2.ver === 3 && E(`closedOf(employees.find(e=>e.id===1),'2026-10').ver`) === 3, 'ปิดซ้ำ = รุ่นใหม่ (3) · สถานะ = รุ่นสูงสุด');

  console.log('[11 realtime + สองเครื่อง]');
  const B = boot({ now:NOW, db }); await wait(300);
  B.E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`);
  await B.E(`loadAll()`);
  ok(B.E(`closeReady && paySlips.length`) === T.pay_slips.length && B.E(`!!closedOf(employees.find(e=>e.id===5),'2026-10')`), 'เครื่องที่สองโหลดฉบับปิดครบ');
  // เครื่อง A เปิด ต.ค. ของอี — เครื่อง B ได้ realtime
  r = await E(`closeReopen({ period:'2026-10', ids:[5], reason:'ทดสอบเครื่องที่สองเห็นทันที' })`);
  const last = T.pay_slips[T.pay_slips.length - 1];
  db.chans['jjmk-close'].pay_slips({ new:last, table:'pay_slips' });
  await wait(800);
  ok(B.E(`!closedOf(employees.find(e=>e.id===5),'2026-10')`), 'realtime jjmk-close: อีกเครื่องเปิดงวดใหม่ → เครื่องนี้เห็นทันที');
  // สองเครื่องปิดพร้อมกัน: แถวซ้ำ (unique คน+งวด+รุ่น) = นับว่าอีกเครื่องปิดแล้ว
  const [ra, rb] = await Promise.all([E(`closeRun({ period:'2026-10', ids:[5] })`), B.E(`closeRun({ period:'2026-10', ids:[5] })`)]);
  const c5 = T.pay_slips.filter(x => x.employee_id === 5 && x.period === '2026-10' && x.kind === 'close');
  ok(c5.filter(x => x.ver === 3).length === 1 && (ra.ok || rb.ok), 'สองเครื่องปิดพร้อมกัน = แถวเดียว (ซ้ำโดน unique · อีกเครื่องนับว่าปิดแล้ว)');
  // ดัชนีค้าง (ผลตรวจรอบ 1): A เปิดใหม่ (B ได้ realtime) แล้วปิดอีกครั้ง — B ไม่ได้รับ realtime ของการปิด → B ยังคิดว่าเปิดอยู่
  await B.E(`closeRefresh(true)`);
  r = await E(`closeReopen({ period:'2026-10', ids:[5], reason:'ทดสอบดัชนีค้างของอีกเครื่อง' })`);
  await B.E(`closeRefresh(true)`);
  r = await E(`closeRun({ period:'2026-10', ids:[5] })`);
  ok(r.ok && !B.E(`closedOf(employees.find(e=>e.id===5),'2026-10')`), 'B พลาด realtime: ดัชนีในเครื่อง B ยังบอกว่า ต.ค. ของอีเปิดอยู่');
  await wait(2100);   // เกินช่วงที่ไม่อ่านซ้ำ (2 วินาที)
  const nAdjB = T.adjustments.length;
  q = await B.E(`db.from('adjustments').insert({ employee_id:5, kind:'add', reason:'เพิ่มจากเครื่องที่ดัชนีค้าง', amount:1500, period:'2026-10' })`);
  ok(q.error && q.error.code === 'JJ_CLOSED' && T.adjustments.length === nAdjB && B.E(`!!closedOf(employees.find(e=>e.id===5),'2026-10')`),
     'B เพิ่มเงิน ต.ค. ของอี = ตัวดัก db.from อ่านดัชนีใหม่ก่อนเขียน → บล็อก (ไม่มีเงินหายเงียบ ๆ)');
  // ช่อง jjmk-close หลุดแล้วต่อใหม่ = อ่านใหม่ทั้งชุด (แบบ jjmk-adj)
  db.chanSt['jjmk-close']('CHANNEL_ERROR');
  r = await E(`closeReopen({ period:'2026-10', ids:[5], reason:'ทดสอบช่อง realtime หลุดแล้วต่อใหม่' })`);
  ok(B.E(`!!closedOf(employees.find(e=>e.id===5),'2026-10')`), '(ช่องหลุด: B ยังไม่เห็นการเปิดใหม่)');
  db.chanSt['jjmk-close']('SUBSCRIBED'); await wait(900);
  ok(!B.E(`closedOf(employees.find(e=>e.id===5),'2026-10')`), 'ช่อง jjmk-close ต่อใหม่ → อ่านฉบับปิดใหม่เอง (เห็นการเปิดงวดใหม่ที่พลาดไป)');
  r = await E(`closeRun({ period:'2026-10', ids:[5] })`);
  ok(r.ok, '(ปิด ต.ค. ของอีอีกครั้ง)');
  B.w.close();

  console.log('[12 อ่านฉบับปิดไม่ได้ = บล็อกการออกตัวเลขเงิน + ไม่บันทึกรายการรายงวด + ไม่ล็อกเอง (fail closed)]');
  E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`);
  db.fail.pay_slips = { code:'57014', message:'canceling statement due to statement timeout' };
  await E(`loadAll()`);
  ok(E(`closeLoadErr`) && E(`moneyBlocked()`) === true, 'loadAll อ่าน pay_slips ไม่ได้ → closeLoadErr → moneyBlocked (สลิป/Excel/K BIZ ไม่ออก)');
  const nA12 = T.adjustments.length;
  q = await E(`db.from('adjustments').insert({ employee_id:1, kind:'add', reason:'x', amount:1000, period:'2026-09' })`);
  ok(q.error && q.error.code === 'JJ_CLOSED' && /อ่านฉบับปิดงวดไม่ได้/.test(q.error.message) && T.adjustments.length === nA12, 'เพิ่มเงินงวด ก.ย. (ไม่รู้ว่าปิดหรือยัง) = ไม่บันทึก');
  await E(`setMouOverride(5,'2026-11','100')`);
  ok(!T.mou_entries.some(x => x.period === '2026-11') && /อ่านฉบับปิดงวดไม่ได้/.test(tl()), '✎ รายงวดผ่านหน้าจอ = ไม่บันทึกจนอ่านฉบับปิดได้');
  io.files.length = 0; E(`go('sso'); document.getElementById('ssoPeriodSel').value='2026-09'; renderSso(); exportSso();`);
  ok(!io.files.length && /ฉบับปิดงวด/.test(tl()) && /ออกไฟล์ สปส\. 1-10 ไม่ได้/.test(E(`document.getElementById('ssoInfo').innerHTML`)), 'สปส. 1-10 = ไม่ออกไฟล์จากค่าปัจจุบัน · หน้า สปส. บอกเหตุ');
  E(`payLockAuto=true; payLockReady=true; payLockRetryAt=0;`); const nd12 = T.deposit_entries.length;
  ok(await E(`payDayLock('tab')`) === null && T.deposit_entries.length === nd12, '🔒 อัตโนมัติวันจ่ายไม่ทำงาน (อ่าน pay_slips ไม่ได้ = ถือว่ามีตารางปิดงวด)');
  E(`payLockAuto=false;`);
  delete db.fail.pay_slips;
  await E(`setMouOverride(5,'2026-11','100')`);
  ok(T.mou_entries.some(x => x.period === '2026-11' && x.amount === 100) && !E(`closeLoadErr`), 'อ่านได้แล้ว: จุดบันทึกอ่านดัชนีใหม่เอง → งวดที่ยังเปิดบันทึกได้');
  await E(`setMouOverride(5,'2026-11','')`);
  await E(`loadAll()`);
  ok(!E(`closeLoadErr`) && E(`moneyBlocked()`) === false, 'อ่านได้แล้ว → กลับมาใช้ได้');

  console.log('[13 ลบพนักงานที่มีงวดปิด = ไม่ได้ (ตั้งพ้นสภาพแทน)]');
  io.alerts.length = 0;
  await E(`delEmp(8)`);
  ok(T.employees.some(e => e.id === 8) && /มีงวดเงินเดือนที่ปิดแล้ว/.test(io.alerts.join('\n')), 'เอช (ลาออก มีงวดปิด) ลบไม่ได้ + บอกให้ใช้พ้นสภาพ');

  console.log('[14 ฉบับปิดถูกแก้นอกแอป (sha ไม่ตรง) → สลิปขึ้นเตือน]');
  ok(!/ถูกแก้นอกแอป/.test(E(`buildSlip(employees.find(e=>e.id===5),'2026-09',false)`)), 'ปกติ = ไม่เตือน');
  ok(E(`(()=>{ const c=closedOf(employees.find(e=>e.id===5),'2026-09'); c.pay.net += 1; return /ถูกแก้นอกแอป/.test(buildSlip(employees.find(e=>e.id===5),'2026-09',false)); })()`), 'แก้ pay ของฉบับปิด (เช่น ปลดตัวกันใน SQL Editor) → ท้ายสลิปขึ้น ⚠️ ฉบับปิดงวดถูกแก้นอกแอป');

  if(A.errs.length) console.log('jsdom errors:', A.errs.slice(0, 5));
  ok(!A.errs.length, 'ไม่มี JS error');
  A.w.close();
  // ============ 3) หน้าจอปิดงวด (ขั้น 2): แถบเตือน · ปุ่ม/สิทธิ์ · หน้าต่างพรีวิว · เทียบไฟล์ K BIZ · เลือกยอด + เหตุผล · ยอดเปลี่ยนหลังเปิดหน้าต่าง · หน้ารายคนอ่านอย่างเดียว · ป้ายทุกจอ · เปิดงวดใหม่ ============
  { const C = boot({ now:NOW }); const { E, T, db, io } = C; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(`AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH); kbizLockDue = () => [];`);
    await E(`loadAll()`);
    const $ = id => E(`(()=>{ const el=document.getElementById('${id}'); return el ? { hidden:el.hidden, html:el.innerHTML, show:el.classList.contains('show'), disp:el.style.display, text:el.textContent, dis:!!el.disabled } : null; })()`);
    const toastT = () => E(`document.getElementById('toast').textContent`);
    const MGR = `AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'v',_close:'1'}}}; applyUser(AUTH);`;
    const OWNER = `AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH);`;

    console.log('[15 แถบเตือน "จ่ายแล้วแต่ยังไม่ปิดงวด" · ปุ่ม · สิทธิ์ · งวดย้อนหลัง (ส.ค./ก.ย.) เห็นเฉพาะเจ้าของ]');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll(); renderAll();`);
    let bar = $('closeDueBar'), bd = $('closeBadge');
    ok(!bar.hidden && /ต\.ค\. \d+ \(\d+ คน\)/.test(bar.text) && /closeDueGo/.test(bar.html) && /ปิดต\.ค\./.test(bar.text) && bd.text === '1' && bd.disp === '',
       'แถบเตือนทุกหน้า: ต.ค. จ่ายแล้วยังไม่ปิด + ปุ่ม 🔒 ปิด ต.ค. · ตัวเลขบนเมนู 💰 = 1 งวด (งวดย้อนหลังไม่นับ)');
    ok(/ปิดย้อนหลัง/.test(bar.text) && /ส\.ค\./.test(bar.text) && /ก\.ย\./.test(bar.text) && !/ปิดส\.ค\./.test(bar.text), 'เจ้าของ: ส.ค./ก.ย. = บรรทัด "ปิดย้อนหลัง (รอเทียบไฟล์)" ไม่มีปุ่ม');
    ok(!$('closeBtn').hidden && $('reopenBtn').hidden, 'เจ้าของ: ปุ่ม 🔒 ปิดงวด แสดง · 🔓 เปิดงวดใหม่ ซ่อน (ยังไม่มีงวดปิด)');
    ok(/จ่ายแล้ว ยังไม่ปิดงวด/.test($('payClose').html), 'สถานะงวดในหน้าสรุป: ⚠️ จ่ายแล้ว ยังไม่ปิดงวด');
    E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'vae'}}}; applyUser(AUTH); renderAll();`);
    ok($('closeBtn').hidden && !/closeDueGo/.test($('closeDueBar').html) && /แจ้งผู้มีสิทธิ์ปิดงวด/.test($('closeDueBar').text) && !/ปิดย้อนหลัง/.test($('closeDueBar').text),
       'ไม่มีสิทธิ์ปิดงวด: ไม่มีปุ่ม (แถบเตือนยังขึ้น + บอกให้แจ้งผู้มีสิทธิ์) · ไม่เห็นงวดย้อนหลัง');
    await E(`closeOpen('2026-10','')`);
    ok(!$('closeBg').show && /ไม่มีสิทธิ์ปิดงวด/.test(toastT()), 'ไม่มีสิทธิ์ = เปิดหน้าต่างปิดงวดไม่ได้');
    E(MGR + ` renderAll();`);
    ok(!$('closeBtn').hidden && $('reopenBtn').hidden && /closeDueGo/.test($('closeDueBar').html) && !/ปิดย้อนหลัง/.test($('closeDueBar').text),
       'ติ๊ก "🔒 ปิดงวดได้" (apps.payroll._close) → ปุ่มปิด ต.ค. แสดง · ไม่มีปุ่ม/บรรทัดปิดย้อนหลัง · เปิดงวดใหม่ไม่แสดง');
    E(`document.getElementById('periodSel').value='2026-08'; renderPayroll();`);
    ok($('closeBtn').hidden && /เฉพาะเจ้าของ\/แอดมิน/.test($('payClose').html), 'ส.ค. (ย้อนหลัง): ผู้มีสิทธิ์ปิดงวดไม่เห็นปุ่ม · บอกว่าเฉพาะเจ้าของ/แอดมิน');
    await E(`closeOpen('2026-08','')`);
    ok(!$('closeBg').show && /เฉพาะเจ้าของ\/แอดมิน/.test(toastT()) && !T.pay_slips.length, 'เปิดหน้าต่างปิด ส.ค. (ไม่ใช่เจ้าของ) = ไม่ได้');
    E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{today:'v',_close:'1'}}}; applyUser(AUTH);`);
    ok(E(`closeCan()`) === false, 'มี _close แต่ไม่เห็นหน้าสรุปเงินเดือน = ปิดไม่ได้');
    E(MGR);

    console.log('[16 หน้าต่างปิดงวดย้อนหลัง (ส.ค. · เจ้าของ): คำเตือนยอดระบบ · ต้องใส่เหตุผล · ติ๊กออก]');
    E(OWNER);
    await E(`closeOpen('2026-08','')`);
    ok($('closeBg').show && /ปิดย้อนหลังด้วยยอดที่ระบบคิด/.test($('closeBody').text) && /อาจไม่ตรงที่จ่ายจริง/.test($('closeBody').text) && /จำเป็น/.test($('closeBody').text),
       'เจ้าของเปิด ส.ค.: แถบแดง "ปิดย้อนหลังด้วยยอดที่ระบบคิด — อาจไม่ตรงที่จ่ายจริง" + ช่องเหตุผลจำเป็น');
    ok(E(`closeUi.items.length`) === 8 && E(`closeUi.items.every(x=>x.st==='none' && x.ch==='sys' && x.on)`) && /ยังไม่มีไฟล์ K BIZ/.test($('closeBody').text),
       'ปิด ส.ค.: 8 คน · ไม่มีไฟล์ K BIZ ในระบบ = ยอดที่ระบบคิด');
    ok(E(`document.querySelectorAll('#closeBody table.mcard tbody tr').length`) === 8 && E(`[...document.querySelectorAll('#closeBody tbody td')].every(td=>td.dataset.l)`),
       'ตาราง = การ์ดบนมือถือ (table.mcard + data-l ทุกช่อง)');
    E(`(()=>{ const i=closeUi.items.findIndex(x=>x.e.id===8); const el=document.querySelector('#closeBody input[type=checkbox][data-i="'+i+'"]'); el.checked=false; el.onchange(); })()`);
    ok(/^7 คน/.test($('closeSum').text), 'ติ๊กออก 1 คน → สรุป 7 คน');
    io.confirms.length = 0;
    await E(`closeGo()`); await wait(30);
    ok(!io.confirms.length && !T.pay_slips.length && /เหตุผลอย่างน้อย 10/.test(toastT()), 'ไม่ใส่เหตุผลปิดย้อนหลัง = ปิดไม่ได้');
    const setReason = v => E(`(()=>{ const el=document.getElementById('closeReason'); el.value='${v}'; el.onchange(); })()`);
    setReason('ปิดย้อนหลัง ยอดตรงกับสลิปที่แจกแล้ว');
    await E(`closeGo()`); await wait(50);
    ok(io.confirms.length === 1 && /ปิดย้อนหลังด้วยยอดที่ระบบคิด/.test(io.confirms[0]) && /7 คน/.test(io.confirms[0]) &&
       T.pay_slips.filter(x => x.period === '2026-08' && x.kind === 'close').length === 7 && !T.pay_slips.some(x => x.employee_id === 8 && x.period === '2026-08') &&
       T.pay_batches.some(b => b.kind === 'close' && b.period === '2026-08' && b.src === 'calc' && /ยอดตรงกับสลิป/.test(b.reason)),
       'ยืนยัน (บอกว่าปิดย้อนหลัง) → ปิด ส.ค. 7 คน (คนที่ติ๊กออกยังไม่ปิด) · batch src calc + เหตุผล');
    ok(!$('closeBg').show && /ส\.ค\. \d+ \(1 คน\)/.test($('closeDueBar').text), 'ปิดหน้าต่าง · บรรทัดปิดย้อนหลังยังมี ส.ค. (เหลือ 1 คน)');
    await E(`closeOpen('2026-08','')`);
    ok(E(`closeUi.items.length`) === 1 && /ปิดแล้ว 7 คน/.test($('closeBody').text), 'เปิดอีกครั้ง = เหลือคนที่ยังไม่ปิด 1 คน · บอกว่าปิดแล้ว 7 คน');
    setReason('ปิดย้อนหลัง คนที่เหลือ ตรวจแล้ว');
    io.confirmAns = () => false;
    await E(`closeGo()`); await wait(30);
    ok(T.pay_slips.filter(x => x.period === '2026-08').length === 7 && $('closeBg').show, 'กดยกเลิกที่หน้าต่างยืนยัน = ไม่ปิด');
    io.confirmAns = null;
    await E(`closeGo()`); await wait(50);
    ok(T.pay_slips.filter(x => x.period === '2026-08').length === 8 && !/ส\.ค\./.test($('closeDueBar').text) && $('closeBadge').text === '1', 'ปิดครบ 8 คน → ส.ค. หายจากแถบเตือน · ตัวเลขบนเมนู = 1 (ต.ค.)');

    console.log('[17 ต.ค. (ผู้มีสิทธิ์ปิดงวด) เทียบไฟล์ K BIZ: ตรง / ไม่ตรง (ต้องเลือก + เหตุผล · ส่วนต่างบอกทิศ) / ไม่อยู่ในไฟล์แต่มียอด (ส้ม · บนสุด)]');
    E(OWNER + ` kbizLockDue = () => [];`);
    await E(LOCKPRE('2026-10'));   // ก.ย. ยังไม่ปิด → 🔒 เงินประกัน ก.ย. ก่อน (ปิด ต.ค. ได้)
    T.adjustments.push({ id:70, employee_id:7, kind:'deduct', reason:'หักชั่วคราว', amount:99999, period:'2026-10' });   // ตอนสร้างไฟล์ จีสุทธิติดลบ = ไม่อยู่ในไฟล์
    await E(`loadAll()`);
    io.promptAns = ['10/11/2026'];   // วันเงินเข้าต้องเป็นวันอนาคต
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    await E(`exportKbizPay('')`); await wait(50);
    const kb10 = T.pay_batches.find(b => b.kind === 'kbiz' && b.period === '2026-10');
    ok(kb10 && kb10.meta.rows.length >= 5 && !kb10.meta.rows.some(r => r.emp_id === 7), 'สร้างไฟล์ K BIZ ต.ค. → จดยอดรายคน (จีไม่อยู่ในไฟล์)');
    const amt = id => (kb10.meta.rows.find(r => r.emp_id === id) || {}).amount;
    // หลังสร้างไฟล์มีคนแก้ยอด (เพิ่มเงินเอ 300 · หักบี 50 · เอารายการหักของจีออก) → ยอดที่ระบบคิดไม่ตรงไฟล์
    T.adjustments = T.adjustments.filter(a => a.id !== 70);
    T.adjustments.push({ id:50, employee_id:1, kind:'add', reason:'โบนัสที่ลืม', amount:300, period:'2026-10' }, { id:51, employee_id:2, kind:'deduct', reason:'ปรับย้อน', amount:50, period:'2026-10' });
    await E(`loadAll()`);
    E(MGR);
    await E(`closeOpen('2026-10','')`);
    const it = id => E(`(()=>{ const x=closeUi.items.find(y=>y.e.id===${id}); return x ? { st:x.st, ch:x.ch, file:x.file, sys:x.sys, i:closeUi.items.indexOf(x) } : null; })()`);
    const a1 = it(1), b2 = it(2), c3 = it(3), g7 = it(7);
    ok(a1.st === 'diff' && a1.ch === '' && Math.abs(a1.file - amt(1)) < 0.001 && Math.abs(a1.sys - a1.file - 300) < 0.001 && b2.st === 'diff' && Math.abs(b2.file - b2.sys - 50) < 0.001 && c3.st === 'ok',
       'เทียบไฟล์: เอ (+300) / บี (−50) ไม่ตรงไฟล์ = ต้องเลือก · ซี ตรงไฟล์');
    ok(E(`closeUi.items[0].st`) === 'diff' && E(`closeUi.items[1].st`) === 'diff' && g7.st === 'out' && g7.i === 2 && /ไม่อยู่ในไฟล์โอน — ตกหล่น\?/.test($('closeBody').text),
       'ลำดับ: ไม่ตรงไฟล์บนสุด → จี "ไม่อยู่ในไฟล์โอน — ตกหล่น?" (ชิปส้ม · บัญชีกสิกร · ระบบคิดยอดโอน > 0) → ที่เหลือ');
    ok(/ไฟล์ − ระบบ/.test($('closeBody').text) && /−300\.00.*โอนน้อยกว่าระบบ/.test($('closeBody').text) && /\+50\.00.*โอนมากกว่าระบบ/.test($('closeBody').text),
       'ส่วนต่าง = ไฟล์ − ระบบ + บอกทิศ (เอ −300 โอนน้อยกว่าระบบ · บี +50 โอนมากกว่าระบบ)');
    ok(!E(`[...document.querySelector('#closeBody select[data-i="${a1.i}"]').options].some(o=>o.value==='man')`), 'ผู้มีสิทธิ์ปิดงวด (ไม่ใช่เจ้าของ) ใส่ยอดเองไม่ได้ (เลือกไฟล์/ระบบ)');
    const n10 = T.pay_slips.length;
    await E(`closeGo()`);
    ok(T.pay_slips.length === n10 && /เลือก "ยอดที่โอนจริง" หรือ "ยอดที่ระบบคิด"/.test(toastT()), 'ยังไม่เลือกยอดของคนที่ไม่ตรงไฟล์ = ปิดไม่ได้');
    const setSel = (i, v) => E(`(()=>{ const el=document.querySelector('#closeBody select[data-i="${i}"]'); el.value='${v}'; el.onchange(); })()`);
    const setWhy = (i, v) => E(`(()=>{ const el=document.querySelector('#closeBody input.close-why[data-i="${i}"]'); el.value='${v}'; el.onchange(); })()`);
    setWhy(a1.i, 'โอนตามไฟล์ โบนัสจ่ายงวดหน้า');
    setSel(a1.i, 'paid');
    ok(E(`closeUi.items[${a1.i}].why`) === 'โอนตามไฟล์ โบนัสจ่ายงวดหน้า', 'เปลี่ยนตัวเลือกแล้วเหตุผลที่พิมพ์ไว้ไม่หาย');
    setSel(b2.i, 'sys');
    await E(`closeGo()`);
    ok(T.pay_slips.length === n10 && /ใส่เหตุผล/.test(toastT()) && /บี/.test(toastT()), 'ไม่ใส่เหตุผลของคนที่ไม่ตรงไฟล์ = ปิดไม่ได้ (บอกชื่อ)');
    setWhy(b2.i, 'โอนส่วนต่างแยกแล้ว');
    io.confirms.length = 0;
    await E(`closeGo()`); await wait(50);
    const sl = id => T.pay_slips.find(x => x.employee_id === id && x.period === '2026-10');
    const s1 = sl(1), s2 = sl(2), s3 = sl(3);
    ok(/ปิดด้วยยอดที่โอนจริง 1 คน/.test(io.confirms[0] || '') && /ไม่อยู่ในไฟล์โอน K BIZ 1 คน \(จี\)/.test(io.confirms[0] || '') && !/ปิดย้อนหลัง/.test(io.confirms[0] || ''),
       'หน้าต่างยืนยันบอกจำนวนคนที่ปิดด้วยยอดที่โอนจริง + คนที่ไม่อยู่ในไฟล์โอน');
    ok(s1 && s1.src === 'paid' && Math.abs(s1.net - amt(1)) < 0.001 && Math.abs(s1.paid - amt(1)) < 0.001 && /โบนัสจ่ายงวดหน้า/.test(s1.note) && JSON.stringify(s1.slip).includes('ปรับให้ตรงยอดที่โอนจริง'),
       'เอ: ปิดด้วยยอดที่โอนจริง (ไฟล์) · บรรทัดปรับในสลิปงวดนี้ · เหตุผลเก็บไว้');
    ok(s2 && s2.src === 'calc' && Math.abs(s2.paid - amt(2)) < 0.001 && Math.abs(s2.net - b2.sys) < 0.001 && /ปิดด้วยยอดที่ระบบคิด/.test(s2.note) && /โอนส่วนต่างแยก/.test(s2.note),
       'บี: ปิดด้วยยอดที่ระบบคิด · ยอดในไฟล์เก็บเป็นหลักฐาน (paid) · เหตุผลเก็บไว้');
    ok(s3 && s3.src === 'calc' && Math.abs(s3.paid - s3.net) < 0.001 && !s3.note, 'ซี: ตรงไฟล์ → ยอดที่ระบบคิด · paid = ยอดในไฟล์');
    ok(T.payroll_audit.some(a => a.action === 'close' && /\[p:2026-10\]/.test(a.detail) && /เหตุผลรายคน/.test(a.detail) && /โอนส่วนต่างแยก/.test(a.detail) && /ปิดตามยอดที่โอนจริง 1 คน: เอ/.test(a.detail)),
       'ประวัติจดคนที่ปิดด้วยยอดที่โอนจริง + เหตุผลรายคน');
    ok(!T.adjustments.some(a => a.period !== '2026-10' && /ปรับ/.test(a.reason)), 'ไม่สร้างรายการปรับในงวดถัดไป (เจ้าของสั่ง: ไม่ยก)');

    console.log('[18 ก.ย. ย้อนหลัง (เจ้าของ): ยอดเปลี่ยนหลังเปิดหน้าต่าง = ไม่ปิดคนนั้น · ใส่ยอดที่โอนจริงเอง]');
    E(OWNER);
    await E(`closeOpen('2026-09','')`);
    const d4 = it(4);
    setSel(d4.i, 'man');
    ok(E(`!!document.querySelector('#closeBody input[type=number][data-i="${d4.i}"]')`), 'เจ้าของเลือก "✎ ใส่ยอดที่โอนจริงเอง" → มีช่องใส่ยอด');
    E(`(()=>{ const el=document.querySelector('#closeBody input[type=number][data-i="${d4.i}"]'); el.value='${(d4.sys + 10).toFixed(2)}'; el.onchange(); })()`);
    setReason('ปิดย้อนหลัง ก.ย. ยอดตรงสลิปที่แจก');
    await E(`closeGo()`);
    ok(/ใส่เหตุผล/.test(toastT()), 'ใส่ยอดเองต่างจากระบบ = ต้องมีเหตุผล');
    setWhy(d4.i, 'โอนเพิ่มค่าเดินทาง 10 บาท');
    T.adjustments.push({ id:60, employee_id:3, kind:'add', reason:'เพิ่มหลังเปิดหน้าต่าง', amount:77, period:'2026-09' });   // อีกเครื่องแก้ระหว่างเปิดหน้าต่าง (closeRun อ่านใหม่ก่อนปิด)
    io.alerts.length = 0;
    await E(`closeGo()`); await wait(50);
    const s4 = T.pay_slips.find(x => x.employee_id === 4 && x.period === '2026-09');
    ok(!T.pay_slips.some(x => x.employee_id === 3 && x.period === '2026-09') && T.pay_slips.some(x => x.employee_id === 1 && x.period === '2026-09') && /ยอดเปลี่ยนหลังเปิดหน้าต่าง/.test(io.alerts.join('\n')),
       'ซี: ยอดเปลี่ยนหลังเปิดหน้าต่าง → ไม่ปิด (แจ้งให้เปิดใหม่) · คนอื่นปิด (ก.ย. ปิดย้อนหลังได้แม้ ต.ค. ปิดแล้ว)');
    ok(s4 && s4.src === 'paid' && Math.abs(s4.net - (d4.sys + 10)) < 0.001 && /ค่าเดินทาง/.test(s4.note), 'ดี: ปิดด้วยยอดที่เจ้าของใส่เอง + เหตุผล');
    await E(`closeOpen('2026-09','')`);
    ok(E(`closeUi.items.length`) === 1 && E(`closeUi.items[0].e.id`) === 3, 'เปิดหน้าต่างใหม่ = เหลือซีคนเดียว (ยอดใหม่)');
    setReason('ปิดย้อนหลัง ก.ย. คนที่เหลือ');
    await E(`closeGo()`); await wait(50);
    ok(T.pay_slips.some(x => x.employee_id === 3 && x.period === '2026-09') && $('closeDueBar').hidden && $('closeBadge').disp === 'none', 'ปิดครบทุกงวดที่จ่ายแล้ว → แถบเตือน/ตัวเลขบนเมนูหายไป');

    console.log('[19 หน้ารายคนของงวดที่ปิด = อ่านอย่างเดียว · ปุ่มลงรายการในงวดที่ยังเปิด]');
    const dt = (id, p, tab) => E(`(()=>{ detailEmpId=${id}; detailTab='${tab}'; go('detail'); document.getElementById('detailPeriodSel').value='${p}'; renderDetail(true); return document.getElementById('detailContent').innerHTML; })()`);
    let h = dt(1, '2026-09', 'money');
    ok(/🔒 ปิดงวดแล้ว/.test(h) && !/onclick="(editFine|delAdj|delAdv|editMou|editLoan|editSso|editDeposit|editPvd|openAdj)\(/.test(h) && /closeAdjOpen\(1,'add','2026-09'\)/.test(h) && /พ\.ย\./.test(h),
       'แท็บเงินเดือนงวดที่ปิด: ไม่มีปุ่ม ✎/✕/＋ · มีปุ่มลงรายการในงวดที่ยังเปิด (พ.ย.)');
    E(`closeAdjOpen(1,'deduct','2026-09')`);
    ok(E(`document.getElementById('adjBg').classList.contains('show') && document.getElementById('adjPeriod').value==='2026-11' && /^ปรับยอดงวด ก\\.ย\\./.test(document.getElementById('adjReason').value)`), 'ปุ่มลงรายการ → ฟอร์มหักเงินงวด พ.ย. + เหตุผลขึ้นต้น "ปรับยอดงวด ก.ย."');
    E(`closeModal('adjBg')`);
    h = dt(1, '2026-11', 'money');
    ok(/onclick="openAdj\(1,'add','2026-11'\)"/.test(h) && !/ปิดงวดแล้ว/.test(h), 'งวดที่ยังเปิด = ปุ่มเดิมครบ');
    h = dt(1, '2026-09', 'time');
    ok(/แก้เวลาสแกนได้ แต่/.test(h) && !/stepOT\(/.test(h) && E(`[...document.querySelectorAll('#detailContent input[onchange^="setOTHours("]')].every(i=>i.disabled)`), 'แท็บเข้างานงวดที่ปิด: OT แก้ไม่ได้ + บอกว่าแก้สแกนไม่มีผลกับยอดที่จ่าย');
    h = dt(1, '2026-09', 'debt');
    ok(!/✎ แก้งวดนี้/.test(h) && /🔒 ปิดงวดแล้ว/.test(h), 'กล่องยอดสะสม (ประกัน/สำรองฯ/MOU/ยืม/สปส.) งวดที่ปิด: ไม่มีปุ่ม ✎ แก้งวดนี้');
    h = dt(1, '2026-09', 'over');
    ok(/สุทธิที่จ่าย \(🔒 ฉบับปิดงวด\)/.test(h), 'ภาพรวม: "สุทธิที่จ่าย (ฉบับปิดงวด)" แทน "คาดว่าจะได้รับ"');
    E(`detailEmpId=null; go('detail'); document.getElementById('detailPeriodSel').value='2026-09'; renderDetail(true);`);
    ok(/🔒/.test(E(`document.getElementById('detailContent').innerHTML`)), 'การ์ดรายคน: 🔒 หน้ายอดของงวดที่ปิด');

    console.log('[20 ป้ายงวดปิดในทุกจอ]');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-09'; document.getElementById('payBranch').value=''; renderPayroll();`);
    ok(/🔒 ปิดงวดแล้ว/.test($('payClose').html) && /ปิดล่าสุด/.test($('payClose').html) && !$('reopenBtn').hidden, 'หน้าสรุป: สถานะงวด 🔒 ปิดงวดแล้ว + ปิดล่าสุด · เจ้าของเห็นปุ่ม 🔓 เปิดงวดใหม่');
    const pg = (page, sel, fn) => E(`(()=>{ go('${page}'); const s=document.getElementById('${sel}'); if(![...s.options].some(x=>x.value==='2026-09')) s.add(new Option('x','2026-09')); s.value='2026-09'; ${fn}(); })()`);
    pg('dep', 'depPeriodSel', 'renderDeposit');
    ok(/🔒 ปิดงวดแล้ว/.test($('depInfo').html) && /กด 🔒 ปิดงวด ที่หน้าสรุปเงินเดือน/.test($('depInfo').html) && !/ระบบปิดยอดให้เองในวันจ่าย/.test($('depInfo').html) && !/depEditBtn\(this\)/.test($('depTable').html) && /🔒 ปิดงวด</.test($('depTable').html),
       '🛡️: ป้ายงวด · ข้อความ "กด 🔒 ปิดงวด" แทน 🔒 อัตโนมัติวันจ่าย · แถวที่ปิด = ป้าย 🔒 ปิดงวด ไม่มี ✎');
    pg('sso', 'ssoPeriodSel', 'renderSso');
    ok(/🔒 ปิดงวดแล้ว/.test($('ssoInfo').html) && E(`[...document.querySelectorAll('#ssoTable input[onchange^="setSsoOverride"]')].every(i=>i.disabled)`), 'สปส.: ป้ายงวด · ช่องแก้ยอดของงวดที่ปิด = แก้ไม่ได้');
    pg('pvd', 'pvdPeriodSel', 'renderPvd');  ok(/🔒 ปิดงวดแล้ว/.test($('pvdInfo').html), '🐷: ป้ายงวด');
    pg('mou', 'mouPeriodSel', 'renderMou');  ok(/🔒 ปิดงวดแล้ว/.test($('mouInfo').html), 'MOU: ป้ายงวด');
    pg('loan', 'loanPeriodSel', 'renderLoan'); ok(/🔒 ปิดงวดแล้ว/.test($('loanInfo').html), 'เงินยืม: ป้ายงวด');
    pg('adv', 'advPeriodSel', 'renderAdv');  ok(/🔒 ปิดงวดแล้ว/.test($('advInfo').html), 'เบิก: ป้ายงวด');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-11'; renderPayroll();`);
    ok($('payClose').html === '' || !/ปิด/.test($('payClose').html), 'งวดที่ยังไม่ถึงวันจ่าย (พ.ย.) = ไม่มีป้าย');
    E(`go('audit'); renderAudit();`);
    ok(E(`[...document.querySelectorAll('#audAct option')].some(o=>o.value==='close') && [...document.querySelectorAll('#audAct option')].some(o=>o.value==='reopen')`), '🕘 ตัวกรอง "ปิดงวด/เปิดงวดใหม่" (หลังรัน SQL)');
    E(`go('payroll');`);

    console.log('[21 หน้าต่างเปิดงวดใหม่ (เจ้าของ/แอดมิน · เหตุผล ≥ 10 · ย้อนจากงวดล่าสุด)]');
    E(MGR);
    E(`reopenOpen('2026-10','')`);
    ok(!$('reopenBg').show && /เฉพาะเจ้าของ/.test(toastT()), 'ผู้มีสิทธิ์ปิดงวด (ไม่ใช่เจ้าของ) เปิดหน้าต่างเปิดงวดใหม่ไม่ได้');
    E(OWNER);
    E(`reopenOpen('2026-09','')`);
    ok($('reopenBg').show && E(`reopenUi.items.every(x=>x.later.length)`) && E(`[...document.querySelectorAll('#reopenBody input[type=checkbox]')].every(i=>i.disabled)`) && /เปิดงวดนั้นก่อน/.test($('reopenBody').text),
       'ก.ย. ขณะ ต.ค. ยังปิด = ติ๊กไม่ได้ (ต้องเปิดจากงวดล่าสุด)');
    E(`closeModal('reopenBg')`);
    E(`reopenOpen('2026-10','')`);
    const ri = E(`reopenUi.items.findIndex(x=>x.e.id===2)`);
    E(`(()=>{ const el=document.querySelector('#reopenBody input[type=checkbox][data-i="${ri}"]'); el.checked=true; el.onchange(); })()`);
    E(`(()=>{ const t=document.getElementById('reopenReason'); t.value='สั้น'; t.oninput(); })()`);
    ok($('reopenGo').dis && /10 ตัวอักษร/.test($('reopenSum').text), 'เหตุผลสั้นกว่า 10 ตัวอักษร = ปุ่มยืนยันกดไม่ได้');
    E(`(()=>{ const t=document.getElementById('reopenReason'); t.value='สแกนวันที่ 20 ยังไม่เข้า ต้องคิดใหม่'; t.oninput(); })()`);
    ok(!$('reopenGo').dis && /^1 คน$/.test($('reopenSum').text), 'ใส่เหตุผลครบ → กดได้ (1 คน)');
    await E(`reopenGo()`); await wait(50);
    const rr = T.pay_slips.find(x => x.employee_id === 2 && x.period === '2026-10' && x.kind === 'reopen');
    ok(rr && T.pay_batches.some(b => b.kind === 'reopen' && /สแกนวันที่ 20/.test(b.reason)) && T.payroll_audit.some(a => a.action === 'reopen' && /บี/.test(a.detail)) && !$('reopenBg').show &&
       !E(`closedOf(employees.find(e=>e.id===2),'2026-10')`) && E(`!!closedOf(employees.find(e=>e.id===1),'2026-10')`), 'เปิด ต.ค. ของบีใหม่ (รุ่นใหม่ · เหตุผล · ประวัติ) · คนอื่นยังปิด');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; renderPayroll(); renderAll();`);
    ok(/ปิดแล้ว \d+\/\d+ คน/.test($('payClose').html) && /ต\.ค\./.test($('closeDueBar').text), 'หลังเปิดใหม่: สถานะ "ปิดแล้วบางคน" · แถบเตือน ต.ค. กลับมา (บีจ่ายแล้วยังไม่ปิด)');
    ok(!C.errs.length, 'ไม่มี JS error (หน้าจอปิดงวด)' + (C.errs.length ? ' — ' + C.errs.slice(0, 3).join(' | ') : ''));
    C.w.close();
  }


  // ============ 4) รอบตรวจ 1 (2026-10-21) ============
  const OWNER_ = `AUTH={username:'owner',display_name:'เจ้าของ',role:'owner'}; applyUser(AUTH); payLockAuto=false; kbizLockDue = () => [];`;
  // รายชื่อที่เจ้าของส่งมา (id · ชื่อเล่น · สาขา · สปส. · หักเงินประกัน · เก็บมาก่อน)
  const OWN = [ [7,'การ์ตูน','JJLP',1,1,3000], [25,'อั้ม','JJLP',1,1,5000], [30,'น้อย','JJLP',0,1,0], [55,'คิ','OFFICE',1,1,0], [108,'ใบหม่อน','JJLP',1,1,500], [158,'นาย','JJLP',1,1,0],
                [172,'เจน','JJLP',1,1,0], [178,'หอม','JJLP',1,1,0], [183,'ดรีม','JJLP',1,1,0], [325,'จอม','JJLP',1,1,0], [351,'เน','OFFICE',0,0,0], [356,'มิ้น','OFFICE',0,0,0] ];
  function seedOwn(T){
    seed(T);
    const b = T.employees[0];
    T.employees = OWN.map(([id, nick, br, sso, dep], i) => ({ ...b, id, code:'U' + id, nick, full_name:nick + ' ทดสอบ', branch:br, dept: br === 'OFFICE' ? 'ออฟฟิศ' : 'หน้าร้าน',
      wage_type: br !== 'OFFICE' && i % 3 === 0 ? 'daily' : 'monthly', rate: br === 'OFFICE' ? 18000 : i % 3 === 0 ? 450 : 12000, sso_on:!!sso, deposit_on:!!dep, deposit_opening:0,
      deposit_target_v1:5000, deposit_monthly_v1:500, sso_id:'1234567890123', bank_account:String(1000000000 + id), active:true, end_date:null }));
    const pun = []; let pid = 1;
    for(let d = new Date(2026, 6, 26, 12); d <= new Date(2026, 10, 5, 12); d.setDate(d.getDate() + 1)){
      const k = ymd(d), wd = d.getDay();
      for(const e of T.employees){
        if(e.branch === 'OFFICE' ? (wd === 0 || wd === 6) : wd === 1) continue;
        const sn = 'S1', late = (d.getDate() + e.id) % 9 === 0 ? '09:20:00' : '08:58:00';
        pun.push({ id:pid++, emp_code:e.code, punch_date:k, punch_time:late, device_sn:sn }, { id:pid++, emp_code:e.code, punch_date:k, punch_time:'18:05:00', device_sn:sn });
      }
    }
    T.punches = pun;
    T.adjustments = []; T.advances = []; T.tips = []; T.holidays = [];
    T.mou_loans = [{ id:11, employee_id:158, amount:15000, monthly:2000, final_max:3000, start_period:'2026-08', opening:0, doc_passport:true, doc_pink:true, doc_complete:false, note:'' }];
    T.loans = [{ id:12, employee_id:172, amount:5000, monthly:1000, deduct_on:'payroll', start_period:'2026-08', opening:0, note:'' }];
    T.pvd_members = [{ id:13, employee_id:178, emp_mode:'fixed', emp_value:500, er_mode:'match', er_value:50, start_period:'2026-08', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' }];
  }
  { const D = boot({ now:NOW }); const { E, T, db, io } = D; await wait(300);
    seedOwn(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`);
    const tl = () => E(`document.getElementById('toast').textContent`);
    console.log('[22 ข้อมูลเจ้าของ 12 คน: ใส่/แก้ "เก็บมาก่อน" (การ์ตูน 3,000 · อั้ม 5,000 · ใบหม่อน 500) หลังปิด ส.ค.–ต.ค. → งวดที่เปิด (พ.ย.) = สูตรเดิมทุกบาท]');
    let r;
    for(const p of ['2026-08', '2026-09']) r = await E(`closeRun({ period:'${p}', reason:'ปิดย้อนหลังด้วยยอดที่ระบบคิด (เทส)' })`);
    r = await E(`closeRun({ period:'2026-10' })`);
    ok(r.ok && T.pay_slips.filter(x => x.kind === 'close').length === 36, 'ปิด ส.ค./ก.ย./ต.ค. ครบ 12 คน × 3 งวด');
    const shutSnap = () => E(`JSON.stringify(['2026-08','2026-09','2026-10'].map(p=>employees.map(e=>{ const x=payOf(e,p); return [e.id, x.net, x.dep.ded, x.dep.collected, x.mou.collected, x.eloan.collected, x.pvd.empSum]; })))`);
    const shut0 = shutSnap();
    const FIELDS = `[e.id, x.dep.before, x.dep.ded, x.dep.collected, x.dep.over, x.mou.ded, x.mou.collected, x.eloan.ded, x.eloan.collected, x.pvd.ded, x.pvd.empSum, x.pvd.balance, x.net]`;
    const nov = () => JSON.parse(E(`JSON.stringify(employees.map(e=>{ const x=payOf(e,'2026-11'); return ${FIELDS}; }))`));
    const novMain = () => JSON.parse(E(`(()=>{ closeReady=false; try{ return JSON.stringify(employees.map(e=>{ const x=calcPay(e,'2026-11'); return ${FIELDS}; })); } finally { closeReady=true; } })()`));   // สูตรเดิม (main) บนข้อมูลเดียวกัน
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const diffIds = (a, b) => a.filter((x, i) => JSON.stringify(x) !== JSON.stringify(b[i])).map(x => x[0]).join(',');
    let n = nov(), m = novMain();
    ok(same(n, m), 'ก่อนแก้: พ.ย. ทุกคน = สูตรเดิม (เงินประกัน · MOU · เงินยืม · สำรองฯ · สุทธิ)' + (same(n, m) ? '' : ' — ต่าง: ' + diffIds(n, m)));
    for(const [id, , , , , open] of OWN) T.employees.find(e => e.id === id).deposit_opening = open;
    await E(`loadAll()`);
    n = nov(); m = novMain();
    const row = id => n.find(x => x[0] === id);
    ok(same(n, m), 'ใส่ "เก็บมาก่อน" ตามรายชื่อเจ้าของหลังปิด → พ.ย. = สูตรเดิมทุกคน' + (same(n, m) ? '' : ' — ต่าง: ' + diffIds(n, m)));
    ok(row(7)[2] === 0 && row(7)[4] > 0 && row(25)[2] === 0 && row(25)[4] > 0 && row(108)[1] === T.pay_slips.find(x => x.employee_id === 108 && x.period === '2026-10').carry.dep.collected + 500,
       'การ์ตูน/อั้ม: ครบเป้าแล้ว พ.ย. ไม่หัก + ขึ้นเกินเป้า (เสนอ 💸 ได้) · ใบหม่อน: สะสม +500');
    ok(shutSnap() === shut0, 'งวดที่ปิด (ส.ค.–ต.ค.) ไม่เปลี่ยน');
    io.confirms.length = 0;
    await E(`go('dep'); updDepField(25,'deposit_opening',0)`); await wait(30);
    n = nov(); m = novMain();
    ok(T.employees.find(e => e.id === 25).deposit_opening === 0 && /มีผลตั้งแต่ งวด พ\.ย\./.test(io.confirms.join('\n')) && /มีผลตั้งแต่ งวด พ\.ย\./.test(tl()) && same(n, m) && row(25)[2] > 0 && row(25)[4] === 0,
       'อั้ม 5,000 → 0 ผ่านหน้า 🛡️: ข้อความ "มีผลตั้งแต่ งวด พ.ย." ถูก · พ.ย. กลับมาหัก ไม่ขึ้นเกินเป้า (ไม่เสนอคืนเงินที่ไม่เคยเก็บ) = สูตรเดิม');
    await E(`updMouField(11,'opening',4000)`);
    await E(`updLoanField(12,'opening',1000)`);
    T.pvd_members[0].opening_emp = 1000; T.pvd_members[0].opening_er = 200;
    await E(`loadAll()`);
    n = nov(); m = novMain();
    ok(same(n, m) && row(158)[6] === 6000 + 4000 + row(158)[5] && row(172)[8] === 3000 + 1000 + row(172)[7] && row(178)[10] === 1500 + 1000 + row(178)[9],
       'แก้ "ผ่อนมาแล้ว" MOU (0→4,000) · เงินยืม (0→1,000) · ยกมาสำรองฯ (0→1,000/200) หลังปิด → พ.ย. บวกส่วนต่าง = สูตรเดิม' + (same(n, m) ? '' : ' — ต่าง: ' + diffIds(n, m)));
    ok(shutSnap() === shut0, 'งวดที่ปิดยังไม่เปลี่ยน');

    console.log('[23 สัญญา MOU/เงินยืมใหม่หลังปิด ที่เลือกเริ่มงวดที่ปิดแล้ว = ไม่นับงวดที่ปิด (ไม่ได้หักจริง)]');
    E(`openMouForm(); mouEmpPick=183; document.getElementById('mouAmount').value=15000; (s=>{ if(![...s.options].some(o=>o.value==='2026-08')) s.add(new Option('x','2026-08')); s.value='2026-08'; })(document.getElementById('mouStart'));`);
    io.confirms.length = 0;
    await E(`saveMouLoan()`); await wait(30);
    const ml = T.mou_loans.find(x => x.employee_id === 183);
    ok(ml && ml.start_period === '2026-11' && /ปิดงวดถึง ต\.ค\./.test(io.confirms.join('\n')), 'ฟอร์ม MOU เลือกเริ่ม ส.ค. (ปิดแล้ว) → ถามแล้วเลื่อนเป็น พ.ย.');
    ok(E(`(()=>{ const x=payOf(employees.find(e=>e.id===183),'2026-11').mou; return x.ded===2000 && x.collected===2000; })()`), 'ดรีม พ.ย.: หัก 2,000 · ผ่อนแล้ว 2,000 (ไม่นับ ส.ค.–ต.ค. ที่ไม่ได้หักจริง)');
    E(`openLoanForm(); loanEmpPick=325; document.getElementById('loanAmount').value=5000; document.getElementById('loanMonthly').value=1000; (s=>{ if(![...s.options].some(o=>o.value==='2026-09')) s.add(new Option('x','2026-09')); s.value='2026-09'; })(document.getElementById('loanStart'));`);
    io.confirmAns = () => false;
    await E(`saveLoan()`); await wait(30);
    io.confirmAns = null;
    ok(!T.loans.some(x => x.employee_id === 325), 'ไม่ยอมเลื่อนงวดเริ่ม = ไม่บันทึก');
    T.loans.push({ id:14, employee_id:325, amount:5000, monthly:1000, deduct_on:'payroll', start_period:'2026-09', opening:0, note:'' });   // แอปรุ่นเก่า/SQL บันทึกเริ่ม ก.ย. ตรง ๆ
    await E(`loadAll()`);
    ok(E(`(()=>{ const e=employees.find(x=>x.id===325), x=payOf(e,'2026-11').eloan; return x.ded===1000 && x.collected===1000 && ['2026-09','2026-10'].every(p=>payOf(e,p).eloan.ded===0); })()`),
       'เงินยืมจอมเริ่ม ก.ย. (บันทึกหลังปิด): พ.ย. ผ่อนแล้ว 1,000 (ไม่ใช่ 3,000) · ก.ย./ต.ค. ที่ปิดไม่ได้หักจริง');

    console.log('[24 ย้ายสาขาหลังปิด: หน้า 🛡️/สปส./🐷/MOU/เงินยืม ของงวดที่ปิด = สาขา ณ วันปิด]');
    const pg = (page, fn) => E(`(()=>{ go('${page}'); const s=document.getElementById('${page}PeriodSel'); if(![...s.options].some(x=>x.value==='2026-09')) s.add(new Option('x','2026-09')); s.value='2026-09';
      document.getElementById('${page}Branch').value='JJLP'; ${page === 'dep' ? `document.getElementById('depActive').value='';` : ''} ${fn}();
      return document.getElementById('${page}Stats').innerHTML + '|' + [...document.querySelectorAll('#${page}Table tbody tr')].map(r=>r.textContent.replace(/\\s+/g,' ')).join('\\n'); })()`);
    const PG = [['dep', 'renderDeposit'], ['sso', 'renderSso'], ['pvd', 'renderPvd'], ['mou', 'renderMou'], ['loan', 'renderLoan']];
    const pg0 = PG.map(([a, f]) => pg(a, f));
    for(const id of [158, 172, 178]) T.employees.find(e => e.id === id).branch = 'JJRD';
    await E(`loadAll()`);
    const pg1 = PG.map(([a, f]) => pg(a, f));
    ok(PG.every((x, i) => pg0[i] === pg1[i]) && /นาย/.test(pg1[3]) && /เจน/.test(pg1[4]) && /หอม/.test(pg1[2]),
       'ก.ย. (ปิดแล้ว) สาขาลาดพร้าว: ยอดรวม/รายชื่อ 🛡️ · สปส. · 🐷 · MOU · เงินยืม ไม่เปลี่ยน (ยังมีนาย/เจน/หอม)' + (PG.every((x, i) => pg0[i] === pg1[i]) ? '' : ' — ต่าง: ' + PG.filter((x, i) => pg0[i] !== pg1[i]).map(x => x[0]).join(',')));
    ok(!/นาย/.test(E(`(()=>{ go('mou'); document.getElementById('mouPeriodSel').value='2026-11'; document.getElementById('mouBranch').value='JJLP'; renderMou(); return document.getElementById('mouTable').textContent; })()`)),
       'งวดที่เปิด (พ.ย.) = สาขาปัจจุบัน (นายย้ายไปรัชดาแล้ว)');

    console.log('[25 ช่อง "ผ่อน/หักงวดนี้" MOU/เงินยืมของงวดที่ปิด = แก้ไม่ได้ · บล็อกแล้ววาดใหม่ (ค่าที่พิมพ์ไม่ค้าง)]');
    E(`go('loan'); document.getElementById('loanPeriodSel').value='2026-09'; document.getElementById('loanBranch').value=''; renderLoan();`);
    ok(E(`document.querySelector('#loanTable input[onchange^="setLoanOverride(172,"]').disabled`) === true, 'เงินยืม ก.ย. (ปิดแล้ว): ช่องผ่อนงวดนี้ disabled');
    E(`(()=>{ const i=document.querySelector('#loanTable input[onchange^="setLoanOverride(172,"]'); i.value='0'; })()`);
    await E(`setLoanOverride(172,'2026-09','0')`);
    ok(!T.loan_entries.length && E(`document.querySelector('#loanTable input[onchange^="setLoanOverride(172,"]').value`) !== '0', 'บล็อกแล้ววาดใหม่ — ช่องกลับเป็นยอดในฉบับปิด');
    E(`go('mou'); document.getElementById('mouPeriodSel').value='2026-09'; document.getElementById('mouBranch').value=''; renderMou();`);
    ok(E(`document.querySelector('#mouTable input[onchange^="setMouOverride(158,"]').disabled`) === true, 'MOU ก.ย. (ปิดแล้ว): ช่องหักงวดนี้ disabled');
    E(`document.getElementById('mouPeriodSel').value='2026-11'; renderMou();`);
    ok(E(`document.querySelector('#mouTable input[onchange^="setMouOverride(158,"]').disabled`) === false, 'งวดที่เปิด = แก้ได้ตามเดิม');

    console.log('[26 ข้อความหลังรัน jj_pay_close.sql: ไม่บอกว่า "ระบบปิดยอดให้เอง" (ไม่มีอัตโนมัติแล้ว)]');
    const w = E(`depWarnAuto([{ p:'2026-11', n:3, office:1, v1:1 }, { p:'2026-09', n:2 }])`);
    ok(/🔒 ปิดงวด/.test(w) && !/ปิดยอดให้เอง|ถึงจะปิดยอด/.test(w), 'คำเตือน 🛡️/หน้าสรุป: คำสั่งเดียว "กด 🔒 ปิดงวด" (ไม่ซ้อนกับ "ระบบปิดยอดให้เองเมื่อถึงวันจ่าย")');
    ok(!D.errs.length, 'ไม่มี JS error' + (D.errs.length ? ' — ' + D.errs.slice(0, 3).join(' | ') : ''));
    D.w.close();
  }

  { const F = boot({ now:NOW }); const { E, T, db, io, setNow } = F; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`);
    const tl = () => E(`document.getElementById('toast').textContent`);
    let r, q;
    console.log('[27 ปิด ต.ค. ก่อน ส.ค./ก.ย. → รายการรายงวดของงวดที่เปิดซึ่งเก่ากว่างวดที่ปิด = บล็อก · ปิดย้อนหลังทีหลังได้]');
    await E(LOCKPRE('2026-10'));   // 🔒 เงินประกัน ส.ค./ก.ย. ก่อน (ยังไม่ปิดงวด)
    r = await E(`closeRun({ period:'2026-10', ids:[5] })`);
    ok(r.ok && r.n === 1, 'ปิด ต.ค. ของอี (ส.ค./ก.ย. 🔒 เงินประกันแล้ว แต่ยังไม่ปิดงวด)');
    await E(`setMouOverride(5,'2026-08','3000')`);
    ok(!T.mou_entries.length && /ยังไม่ได้ปิด แต่ปิดต\.ค\./.test(tl()), '✎ หัก MOU ส.ค. (ยังเปิด แต่ ต.ค. ปิดแล้ว) = บล็อก — ยอดยกเริ่มจากฉบับปิด ต.ค. แก้ ส.ค. ไม่มีผลต่อ');
    q = await E(`db.from('adjustments').insert({ employee_id:5, kind:'add', reason:'x', amount:100, period:'2026-09' })`);
    ok(q.error && q.error.code === 'JJ_CLOSED' && /ยังไม่ได้ปิด/.test(q.error.message), 'ชั้นที่สอง (ตัวดัก db.from) บล็อกแบบเดียวกัน');
    q = await E(`db.from('adjustments').insert({ employee_id:5, kind:'add', reason:'ปรับยอดงวด ส.ค.', amount:100, period:'2026-11' })`);
    ok(!q.error, 'ลงในงวดที่เปิดหลังงวดที่ปิด (พ.ย.) = ทำได้');
    const nov5 = E(`JSON.stringify(payOf(employees.find(e=>e.id===5),'2026-11').mou)`);
    r = await E(`closeRun({ period:'2026-08', ids:[5], reason:'ปิดย้อนหลังด้วยยอดที่ระบบคิด (เทส)' })`);
    ok(r.ok && T.deposit_entries.some(x => x.employee_id === 5 && x.period === '2026-08' && /^lock/.test(x.note)) && E(`JSON.stringify(payOf(employees.find(e=>e.id===5),'2026-11').mou)`) === nov5,
       'เจ้าของปิดย้อนหลัง ส.ค. ทีหลังได้ (🔒 เงินประกัน ส.ค. ตรงฉบับปิด) · ยอดยกของงวดที่เปิดไม่เปลี่ยน');

    console.log('[28 ออฟฟิศ: วันจ่าย = วันสุดท้ายของงวด (ยังทำงาน) → ปิดได้ตั้งแต่วันถัดไป]');
    setNow('2026-10-31T14:00:00+07:00');
    ok(!E(`closeDue().some(x=>x.p==='2026-10' && x.people.some(e=>e.id===4))`), '31 ต.ค. บ่าย: แถบเตือนยังไม่นับออฟฟิศ ต.ค.');
    r = await E(`closeRun({ period:'2026-10', cycle:'office' })`);
    ok(!r.ok && /ยังไม่ถึงวันจ่าย 31 ต\.ค\. \(ปิดได้ตั้งแต่ 1 พ\.ย\.\)/.test(r.msg) && !T.pay_slips.some(x => x.employee_id === 4), 'ปิดออฟฟิศ ต.ค. ในวันจ่าย = ไม่ได้ (ไม่แช่ "ลืมตอก" ของวันที่ยังทำงานอยู่)');
    setNow('2026-11-01T07:00:00+07:00');
    ok(E(`closeDue().some(x=>x.p==='2026-10' && x.people.some(e=>e.id===4))`), '1 พ.ย. = ขึ้นแถบเตือน');
    r = await E(`closeRun({ period:'2026-10', cycle:'office' })`);
    ok(r.ok && r.n === 1 && T.pay_slips.some(x => x.employee_id === 4 && x.period === '2026-10'), '1 พ.ย. ปิดออฟฟิศ ต.ค. ได้');
    setNow(NOW);

    console.log('[29 ปิดงวด = อ่านสแกนของงวดนั้นใหม่จากฐานข้อมูลก่อน (เครื่องอื่นเติมสแกน)]');
    const d0 = E(`calcPay(employees.find(e=>e.id===2),'2026-10').days`);
    ['2026-09-28', '2026-10-05', '2026-10-12'].forEach((d, i) => T.punches.push({ id:900000 + i * 2, emp_code:'B', punch_date:d, punch_time:'08:58:00', device_sn:'S1' }, { id:900001 + i * 2, emp_code:'B', punch_date:d, punch_time:'18:05:00', device_sn:'S1' }));
    r = await E(`closeRun({ period:'2026-10', ids:[2] })`);
    const c2 = E(`(()=>{ const x=payOf(employees.find(e=>e.id===2),'2026-10'); return { days:x.days, net:x.net, closed:!!x.closed }; })()`);
    ok(r.ok && c2.closed && c2.days === d0 + 3 && c2.net === E(`(()=>{ closeReady=false; try{ return calcPay(employees.find(e=>e.id===2),'2026-10').net; } finally { closeReady=true; } })()`),
       'บี: ฉบับปิด ต.ค. นับสแกน 3 วันที่เครื่องอื่นเติม (' + d0 + ' → ' + c2.days + ' วัน)');

    console.log('[30 ปิดต้องเรียงงวดตั้งแต่ ต.ค. · คนใหม่ที่งวดก่อนไม่มีวันทำงาน/ยอด = ไม่ต้องรอ]');
    T.employees.push({ ...T.employees[0], id:9, code:'N', nick:'เอ็น', full_name:'เอ็น ใหม่', start_date:'2026-10-27', sso_on:false, deposit_target_v1:null, deposit_monthly_v1:null, bank_account:'9999999999' });
    for(const d of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-11-03']) T.punches.push({ id:910000 + T.punches.length, emp_code:'N', punch_date:d, punch_time:'08:58:00', device_sn:'S1' }, { id:910001 + T.punches.length, emp_code:'N', punch_date:d, punch_time:'18:05:00', device_sn:'S1' });
    setNow('2026-12-06T12:00:00+07:00');
    await E(`loadAll()`);
    r = await E(`closeRun({ period:'2026-11', ids:[1] })`);
    ok(!r.ok && /เรียงงวด/.test(r.msg) && /ต\.ค\./.test(r.msg) && !T.pay_slips.some(x => x.employee_id === 1 && x.period === '2026-11'), 'เอยังไม่ปิด ต.ค. → ปิด พ.ย. ไม่ได้ (บอกงวด)');
    r = await E(`closeRun({ period:'2026-11', ids:[9], dry:true })`);
    ok(r.ok && !r.prevNeed.length && r.plan.some(x => x.e.id === 9), 'เอ็น (เริ่ม 27 ต.ค. · ต.ค. ไม่มีวันทำงาน/ยอด) ปิด พ.ย. ได้เลย');
    r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
    r = await E(`closeRun({ period:'2026-11', ids:[1] })`);
    ok(r.ok && T.pay_slips.some(x => x.employee_id === 1 && x.period === '2026-11' && x.kind === 'close'), 'ปิด ต.ค. ของเอแล้ว → ปิด พ.ย. ได้');
    setNow(NOW);
    ok(!F.errs.length, 'ไม่มี JS error' + (F.errs.length ? ' — ' + F.errs.slice(0, 3).join(' | ') : ''));
    F.w.close();
  }

  { const H = boot({ now:NOW }); const { E, T, db, io } = H; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`);
    console.log('[31 K BIZ สร้างหลายไฟล์ (ทั้งงวด → ปิดบางคน → ไฟล์คนที่เหลือ → ปิดครบ) = ไฟล์ฉบับเดิมรวมทุกไฟล์]');
    await E(LOCKPRE('2026-10'));
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    io.promptAns = ['10/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f1 = io.files.pop(), b1 = T.pay_batches.filter(b => b.kind === 'kbiz');
    const rows1 = b1[0].meta.rows.map(x => x.emp_id), rest = rows1.filter(id => id !== 1);
    let r = await E(`closeRun({ period:'2026-10', ids:${JSON.stringify(E(`employees.map(e=>e.id)`).filter(id => id !== 1))} })`);
    ok(r.ok && b1.length === 1 && rows1.includes(1), 'ไฟล์ 1 (ทั้งงวด) → ปิดทุกคนยกเว้นเอ');
    io.promptAns = ['ไฟล์แรกยังไม่ได้โอนให้เอ (อัปโหลดไม่ผ่าน)', '10/11/2026']; io.files.length = 0;   // เอ อยู่ในไฟล์ 1 แล้ว → ต้องพิมพ์เหตุผลถึงจะรวม (รอบตรวจ 2)
    await E(`exportKbizPay('')`); await wait(50);
    const b2 = T.pay_batches.filter(b => b.kind === 'kbiz');
    ok(b2.length === 2 && b2[1].meta.rows.length === 1 && b2[1].meta.rows[0].emp_id === 1, 'ไฟล์ 2 = เฉพาะคนที่ยังเปิด (เอ)');
    r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
    io.files.length = 0; io.alerts.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f3 = io.files.pop(), msg = io.alerts.join('\n');
    const body = f => JSON.stringify((f ? f.aoa : []).filter(x => x && x[0] === '004').map(x => x.join('|')).sort());
    ok(f3 && body(f3) === body(f1) && /รวม 2 ไฟล์/.test(msg) && !/จ่ายนอกไฟล์/.test(msg) && T.pay_batches.filter(b => b.kind === 'kbiz').length === 2,
       'ดาวน์โหลดไฟล์ฉบับเดิม = ทุกคนครบตามไฟล์ที่โอนจริง (รวม 2 ไฟล์) · ไม่ขึ้นว่าคนในไฟล์แรก "จ่ายนอกไฟล์" · ไม่จดไฟล์ใหม่');
    ok(!H.errs.length, 'ไม่มี JS error' + (H.errs.length ? ' — ' + H.errs.slice(0, 3).join(' | ') : ''));
    H.w.close();
  }

  // ============ 5) รอบตรวจ 2 (2026-10-21) ============
  // ---- 32–33: งวดก่อนหน้ายังไม่ 🔒 เงินประกัน = ปิดไม่ได้ · ปิด ต.ค. แล้วแก้ค่าที่ไม่มีงวด (ค่าแรง/ตั้งค่า/กะ/วันหยุด) ของสมาชิกสำรองฯ ที่เริ่ม ส.ค. ได้ ----
  { const G = boot({ now:NOW }); const { E, T, db, io } = G; await wait(300);
    seedOwn(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    T.pvd_members.push({ id:14, employee_id:55, emp_mode:'fixed', emp_value:300, er_mode:'none', er_value:0, start_period:'2026-08', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' });   // คิ (ออฟฟิศ) สำรองฯ เริ่ม ส.ค.
    E(OWNER_); await E(`loadAll()`);
    const tl = () => E(`document.getElementById('toast').textContent`);
    console.log('[32 ปิดงวด: งวดก่อนหน้าที่จ่ายแล้วยังไม่ 🔒 เงินประกัน (ส.ค./ก.ย.) = ไม่ปิดคนนั้น — ทุกบัญชีรวมเจ้าของ · บอกให้ 🔒 ที่หน้า 🛡️ ก่อน]');
    E(`AUTH={username:'mgr',display_name:'ผจก',role:'user',apps:{payroll:{payroll:'v',_close:'1'}}}; applyUser(AUTH);`);
    let r = await E(`closeRun({ period:'2026-10' })`);
    ok(!r.ok && /ยังไม่ 🔒 เงินประกันงวดก่อนหน้า 12 คน/.test(r.msg) && !T.pay_slips.length && !T.deposit_entries.length, 'ผู้มีสิทธิ์ปิดงวด (ไม่ใช่เจ้าของ): ส.ค./ก.ย. ยังไม่ 🔒 → ปิด ต.ค. ไม่ได้ · ไม่เขียนอะไร');
    E(OWNER_);
    r = await E(`closeRun({ period:'2026-10' })`);
    ok(!r.ok && /ยังไม่ 🔒 เงินประกันงวดก่อนหน้า/.test(r.msg) && !T.pay_slips.length, 'เจ้าของก็ปิดไม่ได้ (ยอดสะสม ส.ค./ก.ย. ยังไม่ได้ตรวจ — กติกาเดียวกับ 🔒 อัตโนมัติเดิม)');
    await E(`closeOpen('2026-10','')`);
    ok(/ยังไม่ 🔒 เงินประกันงวดก่อนหน้า 12 คน/.test(E(`document.getElementById('closeBody').textContent`)) && /ยังปิดใครไม่ได้ — 🔒 เงินประกันงวดก่อนหน้าก่อน/.test(E(`document.getElementById('closeBody').textContent`)) &&
       /go\('dep'\)/.test(E(`document.getElementById('closeBody').innerHTML`)), 'หน้าต่างปิดงวด: แถบแดงบอกคน/งวดที่ต้อง 🔒 + ปุ่มไปหน้า 🛡️');
    E(`closeModal('closeBg')`);
    // เจ้าของ 🔒 ส.ค. ของอั้มด้วยยอดจากไฟล์ที่จ่ายจริง (0 — ไม่ได้หัก) ก่อนปิด ต.ค. = ทำได้ (ยังไม่มีงวดหลังที่ปิด)
    r = await E(`(async()=>{ const e=employees.find(x=>x.id===25); const it=depLockDue(e,{ before:'2026-09' }).map(x=>Object.assign(x,{ amount:0 })); return depLockWrite(it, 'dep'); })()`);
    ok(!r.error && T.deposit_entries.some(x => x.employee_id === 25 && x.period === '2026-08' && x.note === 'lock' && x.amount === 0), '🔒 ส.ค. ของอั้มด้วยยอดจากไฟล์ (0) ได้ — ก่อนปิด ต.ค.');
    await E(LOCKPRE('2026-10'));
    r = await E(`closeRun({ period:'2026-10' })`);
    const c25 = T.pay_slips.find(x => x.employee_id === 25 && x.period === '2026-10');
    ok(r.ok && r.n === 12 && c25 && c25.carry.dep.collected === E(`depositCalc(employees.find(e=>e.id===25),'2026-10').collected`), '🔒 ส.ค./ก.ย. ครบ → ปิด ต.ค. 12 คน · ยอดสะสมของอั้มนับ ส.ค. = 0 ตามที่ 🔒');

    console.log('[33 ปิด ต.ค. แล้ว ส.ค./ก.ย. ยังเปิด: แก้ค่าแรง/ตั้งค่า/กะ/วันหยุด ของสมาชิกสำรองฯ ที่เริ่ม ส.ค. ได้ (ไม่ต้อง 🔒 สำรองฯ งวดที่เก่ากว่างวดที่ปิด)]');
    const ki = () => E(`employees.find(e=>e.id===55)`);
    ok(E(`pvdLockDue(employees.find(e=>e.id===55)).length`) === 0 && E(`depLockDue(employees.find(e=>e.id===55)).length`) === 0 &&
       E(`!pvdRowOf(55,'2026-08') && !pvdRowOf(55,'2026-09') && !!closeLaterOf(employees.find(e=>e.id===55),'2026-08')`), 'คิ: ส.ค./ก.ย. (ยังเปิด · ไม่มี 🔒 สำรองฯ) อยู่ก่อนงวดที่ปิด → ไม่อยู่ในรายการต้อง 🔒');
    const net55 = E(`payOf(employees.find(e=>e.id===55),'2026-10').net`);
    E(`go('emp'); openEmpForm(55); document.getElementById('fRate').value='18500';`); await E(`saveEmpForm()`); await wait(50);
    ok(T.employees.find(e => e.id === 55).rate === 18500 && !/บันทึก ไม่ได้/.test(tl()), 'แก้ค่าแรงของคิ = บันทึกได้ (เดิมโดนบล็อก "ยังไม่ได้ปิด แต่ปิดต.ค. แล้ว")');
    await E(`saveSetting('late_fine', 30)`); await wait(50);
    ok(T.payroll_settings[0].late_fine === 30, 'แก้ตั้งค่าเงินเดือน (ค่าปรับสาย) = บันทึกได้ (เดิมบล็อกทั้งร้าน)');
    await E(`updShift(0, 'start', '08:45')`); await wait(50);
    ok(T.shifts[0].start_time === '08:45', 'แก้กะ = บันทึกได้');
    E(`go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-09-10'; document.getElementById('hName').value='วันพิเศษ'; document.getElementById('hMult').value='2';`);
    await E(`saveHoli()`); await wait(50);
    ok(T.holidays.some(h => h.day === '2026-09-10'), 'เพิ่มวันหยุดใน ก.ย. (งวดที่เปิดซึ่งเก่ากว่างวดที่ปิด) = บันทึกได้');
    await E(`loadAll()`);
    ok(E(`payOf(employees.find(e=>e.id===55),'2026-10').net`) === net55 && !T.pvd_entries.some(x => x.employee_id === 55 && x.period < '2026-10'), 'ฉบับปิด ต.ค. ของคิไม่เปลี่ยน · ไม่มีแถว 🔒 สำรองฯ ส.ค./ก.ย. ถูกเขียน');
    ok(!G.errs.length, 'ไม่มี JS error' + (G.errs.length ? ' — ' + G.errs.slice(0, 3).join(' | ') : ''));
    G.w.close();
  }

  // ---- 34–36: สองเครื่องพร้อมกัน — ทิป · ดัชนีค้าง · รายการเข้ามาระหว่างปิด ----
  { const X = boot({ now:NOW }); const { E, T, db, io } = X; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`);
    await E(LOCKPRE('2026-10'));
    const B = boot({ now:NOW, db }); await wait(300);
    B.E(OWNER_); await B.E(`loadAll()`);
    const tlB = () => B.E(`document.getElementById('toast').textContent`);
    console.log('[34 ทิป: เครื่องที่ดัชนีค้าง (ไม่ได้ realtime) ลบทิปของสาขา·งวดที่อีกเครื่องเพิ่งปิด = ไม่ได้ (อ่านดัชนีใหม่ก่อนเช็ค)]');
    let r = await E(`closeRun({ period:'2026-10', ids:[5,6] })`);
    ok(r.ok && r.n === 2 && !B.E(`closeTipHit('2026-10','JJLP')`), 'A ปิด ต.ค. ของอี/เอฟ (ลาดพร้าว) · B ยังไม่รู้ (ดัชนีในเครื่อง)');
    await wait(2100);
    B.E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; openTips(); document.getElementById('tip_JJLP').value='0';`);
    await B.E(`saveTips()`); await wait(50);
    ok(T.tips.some(t => t.period === '2026-10' && t.branch === 'JJLP' && t.amount === 12345) && /ปิดงวดแล้ว/.test(tlB()), 'B ใส่ทิปลาดพร้าว ต.ค. = 0 (ลบ) → บล็อก · แถวทิปยังอยู่ (ส่วนแบ่งในฉบับปิดไม่ลอย)');

    console.log('[35 ดัชนีค้างไม่เกิน 2 วินาที: B อ่านดัชนี → A ปิด → B บันทึกทันที = บล็อก (ตัวดักอ่านใหม่ทุกครั้ง)]');
    await B.E(`closeFresh()`);
    r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
    let q = await B.E(`db.from('adjustments').insert({ employee_id:1, kind:'deduct', reason:'หักทันทีหลังอ่านดัชนี', amount:500, period:'2026-10' })`);
    ok(r.ok && q.error && q.error.code === 'JJ_CLOSED' && !T.adjustments.some(a => a.reason === 'หักทันทีหลังอ่านดัชนี'), 'บล็อก · ไม่มีรายการตกลงงวดที่ปิด');

    console.log('[36 รายการที่อีกเครื่องบันทึกระหว่างปิด: เครื่องที่ปิดตรวจยอดซ้ำหลังเขียนแถวปิด · เครื่องที่บันทึกตรวจหลังเขียน — ไม่มีเงินหายเงียบ]');
    // (ก) B บันทึกหลังจาก A อ่านยอด แต่ก่อนแถวปิดเข้า (หน่วงคำตอบ 🔒 เงินประกันของ A) → A เห็นตอนตรวจซ้ำ
    db.latency = (t, op) => t === 'deposit_entries' && op === 'upsert' ? 900 : 0;
    io.alerts.length = 0;
    const pA = E(`closeRun({ period:'2026-10', ids:[2] })`);
    for(let i = 0; i < 100 && !T.deposit_entries.some(x => x.employee_id === 2 && x.period === '2026-10'); i++) await wait(20);
    q = await B.E(`db.from('adjustments').insert({ employee_id:2, kind:'add', reason:'เพิ่มระหว่างปิด', amount:1000, period:'2026-10' })`);
    const rA = await pA; db.latency = null;
    ok(!q.error && rA.ok && rA.late && rA.late.length === 1 && rA.late[0].e.id === 2 && Math.abs(rA.late[0].now - rA.late[0].was - 1000) < 0.001,
       '(ก) A: ยอดที่ระบบคิดหลังปิดต่างจากฉบับปิด 1,000 (บี) → รายงาน');
    ok(io.alerts.some(m => /เปลี่ยนระหว่างปิด/.test(m) && /บี/.test(m) && /เปิดงวดใหม่/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && /\[p:2026-10\]/.test(a.detail) && /เปลี่ยนระหว่างปิด/.test(a.detail) && /บี/.test(a.detail)), '(ก) แจ้งเตือน + จดในประวัติการปิด');
    // (ข) B อ่านดัชนีก่อนแถวปิดเข้า แต่คำขอเขียนถึงฐานข้อมูลหลังเครื่อง A ตรวจซ้ำแล้ว → B เห็นเองหลังเขียน
    let slow = false;
    db.latency = (t, op) => slow && t === 'pay_slips' && op === 'select' ? 1200 : 0;
    slow = true; const pB = B.E(`db.from('adjustments').insert({ employee_id:3, kind:'add', reason:'เพิ่มช้า', amount:700, period:'2026-10' }).then(r=>r)`);
    await new Promise(res => setTimeout(res, 0)); slow = false;   // คำขออ่านดัชนีของ B ออกไปแล้ว (หน่วงคำตอบ) · ของ A ไม่หน่วง
    B.io.alerts.length = 0;
    const rA2 = await E(`closeRun({ period:'2026-10', ids:[3] })`);
    const qB = await pB; await wait(400); db.latency = null;
    ok(rA2.ok && !(rA2.late || []).length && !qB.error && T.adjustments.some(a => a.reason === 'เพิ่มช้า'), '(ข) A ปิดซีก่อนคำขอของ B ถึงฐานข้อมูล (A ตรวจซ้ำไม่เห็น)');
    ok(B.io.alerts.some(m => /เพิ่งถูกปิดงวดระหว่างบันทึก/.test(m) && /ซี/.test(m) && /ไม่อยู่ในสลิปที่ปิดแล้ว/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && a.tbl === 'adjustments' && /บันทึกเข้างวดที่เพิ่งปิดระหว่างบันทึก/.test(a.detail)), '(ข) B: แจ้งทันทีหลังบันทึก + จดประวัติ (รายการนี้ไม่ถูกนับ)');
    ok(!X.errs.length && !B.errs.length, 'ไม่มี JS error' + (X.errs.length || B.errs.length ? ' — ' + [...X.errs, ...B.errs].slice(0, 3).join(' | ') : ''));
    B.w.close(); X.w.close();
  }

  // ---- 37: 💵 เบิกเงินประกันคืน (deposit_payouts) + ปิดงวด ----
  { const P = boot({ now:NOW }); const { E, T, db, io } = P; await wait(300);   // หลังวันจ่ายหน้าร้าน (ปิดหลังโอนเงินแล้วเท่านั้น · รอบตรวจ 3)
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    T.deposit_payouts = [{ id:1, employee_id:1, period:'2026-10', amount:300, pay_date:'2026-11-01', via:'cash', note:'เบิกบางส่วน', created_at:'' }];
    E(OWNER_); await E(`loadAll()`);
    await E(LOCKPRE('2026-10'));
    console.log('[37 💵 เบิกคืนนอกสลิป: ฉบับปิดเก็บยอดสะสมหลังเบิก · งวดที่เปิดเริ่มจากยอดนั้น (เท่าไม่มีการปิด) · บันทึก/แก้/ยกเลิก 💵 ของงวดที่ปิด = บล็อก]');
    const open = E(`(()=>{ const e=employees.find(x=>x.id===1); return { oct:depositCalc(e,'2026-10'), nov:depositCalc(e,'2026-11') }; })()`);
    ok(E(`depPoReady`) && open.oct.po === 300, '(ก่อนปิด) ต.ค. ของเอ: เบิกคืน 300');
    let r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
    const c1 = T.pay_slips.find(x => x.employee_id === 1 && x.period === '2026-10');
    const after = E(`(()=>{ const e=employees.find(x=>x.id===1); return { oct:payOf(e,'2026-10').dep, nov:depositCalc(e,'2026-11') }; })()`);
    ok(r.ok && c1.carry.dep.po === 300 && c1.carry.dep.collected === open.oct.collected && after.oct.po === 300 && after.oct.collected === open.oct.collected,
       'ฉบับปิด ต.ค.: dep.po 300 · ยอดยก collected = สะสมหลังเบิก (' + c1.carry.dep.collected + ')');
    ok(after.nov.before === open.nov.before && after.nov.ded === open.nov.ded && after.nov.collected === open.nov.collected, 'งวด พ.ย. (เปิด) = เท่าไม่มีการปิดทุกบาท (ไม่นับเบิกซ้ำ/ไม่หาย)');
    ok(/ปิดงวดแล้ว/.test(E(`depPoBlock(employees.find(e=>e.id===1),'2026-10')`)) && /ปิดงวดแล้ว/.test(E(`depPoEditBlock(employees.find(e=>e.id===1),'2026-10')`)) &&
       E(`depPoBlock(employees.find(e=>e.id===1),'2026-11')`) === '', 'บันทึก/แก้ 💵 ต.ค. (ปิดแล้ว) = ไม่ได้ · พ.ย. บันทึกได้แล้ว (งวดก่อนปิด = ยอดหักแช่แข็ง)');
    let q = await E(`db.from('deposit_payouts').insert({ employee_id:1, period:'2026-10', amount:100, pay_date:'2026-11-03', via:'cash', note:'' })`);
    ok(q.error && q.error.code === 'JJ_CLOSED' && T.deposit_payouts.length === 1, 'ตัวดัก db.from: deposit_payouts ของงวดที่ปิด = บล็อก');
    E(`depPoSt = { empId:1, period:'2026-10', editId:null };`);
    await E(`depPoDelBtn({ dataset:{ id:'1' } })`); await wait(30);
    ok(T.deposit_payouts.length === 1, 'ยกเลิก 💵 ของงวดที่ปิด = ไม่ได้ (แถวยังอยู่)');
    ok(!P.errs.length, 'ไม่มี JS error' + (P.errs.length ? ' — ' + P.errs.slice(0, 3).join(' | ') : ''));
    P.w.close();
  }

  // ---- 38: K BIZ กันจ่ายซ้ำ (ข้อมูลเจ้าของ 12 คน) ----
  { const K = boot({ now:NOW }); const { E, T, db, io } = K; await wait(300);
    seedOwn(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[38 K BIZ หลังปิดบางคน/เปิดงวดใหม่: คนที่อยู่ในไฟล์เดิมแล้ว/เคยปิด (จ่ายแล้ว) ไม่ถูกใส่ในไฟล์ใหม่เป็นค่าตั้งต้น]');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    io.promptAns = ['10/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f1 = T.pay_batches.find(b => b.kind === 'kbiz');
    f1.at = '2026-11-03T03:00:00.000Z';
    const jen1 = (f1.meta.rows.find(x => x.emp_id === 172) || {}).amount;
    ok(f1.meta.rows.length === 12 && jen1 > 0, 'ไฟล์ 1: 12 คน (เจน ' + jen1 + ')');
    T.adjustments.push({ id:900, employee_id:172, kind:'add', reason:'โบนัสหลังสร้างไฟล์', amount:500, period:'2026-10' });
    await E(`loadAll()`);
    const ids11 = OWN.map(x => x[0]).filter(id => id !== 172);
    let r = await E(`closeRun({ period:'2026-10', ids:${JSON.stringify(ids11)} })`);
    T.pay_slips.forEach(x => { x.created_at = '2026-11-10T03:00:00.000Z'; });
    await E(`loadAll()`);
    ok(r.ok && r.n === 11, 'ปิด 11 คน (เจน ⚠️ ไม่ตรงไฟล์ — ติ๊กออก)');
    io.promptAns = ['']; io.prompts.length = 0; io.files.length = 0; io.alerts.length = 0;
    const nB = T.pay_batches.filter(b => b.kind === 'kbiz').length;
    await E(`exportKbizPay('')`); await wait(50);
    const pr = io.prompts[0] || '';
    ok(/เจน/.test(pr) && /ห้ามโอนซ้ำ/.test(pr) && /ไฟล์ที่สร้าง/.test(pr) && /เว้นว่าง/.test(pr) && !/โอนไปแล้ว\)/.test(pr), 'ถามก่อน: เจนอยู่ในไฟล์ที่สร้างแล้ว (วันสร้าง · ยอด) ห้ามโอนซ้ำ · ข้อความไม่บอก "(โอนไปแล้ว)" กับคนที่ปิด');
    ok(T.pay_batches.filter(b => b.kind === 'kbiz').length === nB && !io.files.some(f => f.aoa.some(row => Array.isArray(row) && row.some(c => String(c).includes(String(1000000000 + 172))) && Math.abs(Number(row[3]) - jen1 - 500) < 0.01)),
       'เว้นว่าง = ไม่ใส่เจน · ไม่สร้าง/ไม่จดไฟล์ใหม่ (ได้ไฟล์ฉบับเดิมของคนที่ปิดแทน)');
    io.promptAns = ['ไฟล์แรกอัปโหลดไม่ผ่าน ยังไม่ได้โอนเจน', '10/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f2 = T.pay_batches.filter(b => b.kind === 'kbiz')[nB];
    ok(f2 && f2.meta.rows.length === 1 && f2.meta.rows[0].emp_id === 172 && Math.abs(f2.meta.rows[0].amount - jen1 - 500) < 0.01 &&
       T.payroll_audit.some(a => a.action === 'kbiz' && /รวมคนที่อยู่ในไฟล์เดิม/.test(a.detail) && /อัปโหลดไม่ผ่าน/.test(a.detail)), 'พิมพ์เหตุผล = รวมเจนในไฟล์ใหม่ได้ (ยอดตอนนี้) · จดเหตุผลในประวัติ');
    f2.at = '2026-11-11T03:00:00.000Z';
    r = await E(`closeReopen({ period:'2026-10', ids:[7], reason:'ทดสอบเปิดงวดใหม่ของการ์ตูน' })`);
    io.promptAns = ['']; io.prompts.length = 0; io.confirms.length = 0; io.files.length = 0; io.alerts.length = 0;
    const nB2 = T.pay_batches.filter(b => b.kind === 'kbiz').length;
    await E(`exportKbizPay('')`); await wait(50);
    const msg = [...io.prompts, ...io.confirms, ...io.alerts].join('\n');
    ok(r.ok && /เปิดงวดใหม่หลังปิด/.test(msg) && /การ์ตูน/.test(msg) && /ตรวจก่อนว่าโอนงวดนี้ไปแล้วหรือยัง/.test(msg) && /พิมพ์เหตุผล/.test(msg) && T.pay_batches.filter(b => b.kind === 'kbiz').length === nB2 &&
       !io.files.some(f => f.aoa.some(row => Array.isArray(row) && row.some(c => String(c).includes(String(1000000000 + 7))))), 'การ์ตูน (เปิดงวดใหม่หลังปิด) อยู่ในกลุ่มถาม · เว้นว่าง = ไม่อยู่ในไฟล์ใหม่ (รอบตรวจ 3: พิมพ์เหตุผลแล้วใส่ได้)');
    r = await E(`closeRun({ period:'2026-10', ids:[7,172] })`);
    io.files.length = 0; io.alerts.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const orig = io.files.pop(), jenRow = orig ? orig.aoa.find(row => Array.isArray(row) && row.some(c => String(c).includes(String(1000000000 + 172)))) : null;
    ok(r.ok && orig && jenRow && jenRow.some(c => Math.abs(Number(c) - f2.meta.rows[0].amount) < 0.01) && /รวม 2 ไฟล์/.test(io.alerts.join('\n')), 'ปิดครบ → ไฟล์ฉบับเดิม: เจน = ยอดในไฟล์ที่สร้างก่อนปิดครั้งแรก (ไฟล์ 2) · รวม 2 ไฟล์');
    ok(!K.errs.length, 'ไม่มี JS error' + (K.errs.length ? ' — ' + K.errs.slice(0, 3).join(' | ') : ''));
    K.w.close();
  }

  // ---- 39–41: หน้าจอ/ข้อความของงวดที่ปิด · ลบ MOU/เงินยืม · สาขาของ batch (_br) · ปุ่ม/ป้าย ----
  { const L = boot({ now:NOW }); const { E, T, db, io, setNow } = L; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    T.loans[0].deduct_on = 'mid'; T.loans[0].monthly = 1500;                                        // เอฟ ผ่อนตอนเบิก (ชิปหน้าเบิก)
    Object.assign(T.employees.find(e => e.id === 3), { sso_on:true, sso_id:'3333333333333' });     // สปส. 2 คน (เอ ลพ. · ซี รช.)
    T.mou_entries = [{ id:1, employee_id:5, period:'2026-09', amount:1500 }, { id:2, employee_id:5, period:'2026-11', amount:1000 }];
    T.loan_entries = [{ id:1, employee_id:6, period:'2026-09', amount:800 }];
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    for(const p of ['2026-08', '2026-09']) await E(`closeRun({ period:'${p}', reason:'ปิดย้อนหลัง ตรวจกับสลิปแล้ว (เทส)' })`);
    let r = await E(`closeRun({ period:'2026-10' })`);
    ok(r.ok && T.pay_slips.filter(x => x.kind === 'close').length === 24, '(ปิด ส.ค.–ต.ค. ทุกคน)');
    console.log('[39 งวดที่ปิดแล้ว: ข้อความเงินในหน้ารายคน (🛡️/🐷/ค่าปรับ) · หน้าเบิก (ผ่อนยืม) · สปส. (เข้า/ไม่เข้า · ลำดับไฟล์ 1-10) ใช้ค่า ณ วันปิด]');
    const cap = () => {
      const o = {};
      o.debt = E(`(()=>{ const out=[]; for(const id of [1,6,7]){ detailEmpId=id; detailTab='debt'; go('detail'); document.getElementById('detailPeriodSel').value='2026-10'; renderDetail(true);
          out.push([...document.querySelectorAll('#detailContent .dt-bal, #detailContent .card .section-title')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()).join('|')); } detailEmpId=null; return out.join('\\n'); })()`);
      o.money = E(`(()=>{ detailEmpId=1; detailTab='money'; go('detail'); document.getElementById('detailPeriodSel').value='2026-10'; renderDetail(true); const t=document.querySelector('#detailContent .dt-pay'); detailEmpId=null; return t ? t.textContent.replace(/\\s+/g,' ') : ''; })()`);
      o.adv = E(`go('adv'); (s=>{ if(![...s.options].some(x=>x.value==='2026-10')) s.add(new Option('2026-10','2026-10')); s.value='2026-10'; })(document.getElementById('advPeriodSel')); renderAdv();
        [...document.querySelectorAll('#advTable tbody tr')].map(r=>r.querySelector('td b').textContent+'|'+[...r.querySelectorAll('.chip')].filter(c=>/ผ่อนยืม/.test(c.textContent)).map(c=>c.textContent).join('')).sort().join('\\n')`);   // ผ่อนยืมรายคน (ลำดับแถวตามสาขาปัจจุบัน — หน้าจัดการ)
      o.sso = E(`go('sso'); document.getElementById('ssoPeriodSel').value='2026-10'; renderSso(); [...document.querySelectorAll('#ssoTable tbody tr')].map(r=>r.getAttribute('style')+'|'+r.querySelector('.chip').textContent+'|'+r.textContent.replace(/\\s+/g,' ')).join('\\n')`);
      io.files.length = 0; E(`exportSsoGo()`); o.ssoX = JSON.stringify((io.files.pop() || {}).aoa || null);
      return o;
    };
    const s0 = cap();
    ok(/ผ่อนยืม/.test(s0.adv) && /1,500/.test(s0.adv) && /หักสาย\/ออกก่อน/.test(s0.money) && JSON.parse(s0.ssoX).filter(x => Array.isArray(x) && typeof x[0] === 'number').map(x => x[2]).join(',') === 'เอ ทดสอบ,ซี ทดสอบ',
       '(ก่อนแก้) หน้าเบิก: ผ่อนยืม 1,500 · ค่าปรับ "สาย/ออกก่อน" · สปส. 1-10 ลำดับ เอ (ลพ.) → ซี (รช.)');
    const emp = id => T.employees.find(e => e.id === id);
    Object.assign(emp(1), { deposit_on:false, work_mode:'hours', sso_on:false, branch:'OFFICE', deposit_opening:700 });   // ปิดหัก · เปลี่ยนเป็นนับชั่วโมง · ไม่เข้า สปส. · ย้ายไปออฟฟิศ · เก็บมาก่อน
    T.loans[0].monthly = 2000;                                                                                            // ผ่อนยืม 1,500 → 2,000
    T.pvd_members[0].emp_value = 800;                                                                                     // สำรองฯ หัก 500 → 800
    await E(`loadAll()`);
    const s1 = cap();
    const dd = diff(s0, s1);
    ok(!dd.length, 'งวด ต.ค. (ปิดแล้ว) ไม่เปลี่ยน: หน้ารายคน (การ์ด/หัวประวัติ 🛡️ 🐷) · บรรทัดค่าปรับ · หน้าเบิก · สปส. (ชิป/ความจาง) · สปส. 1-10 (ลำดับ)' + (dd.length ? ' — ต่าง: ' + dd.join(',') + ' ' + at(s0[dd[0]], s1[dd[0]]) : ''));
    E(`go('adv'); document.getElementById('advPeriodSel').value='2026-11'; renderAdv();`);
    ok(/2,000/.test(E(`document.getElementById('advTable').innerHTML`)), 'งวด พ.ย. (เปิด) หน้าเบิก = ผ่อนยืม 2,000 (ค่าใหม่)');

    console.log('[40 ลบ MOU/เงินยืม: ✎ รายงวดของงวดที่ปิดแล้วเก็บไว้ · งวดที่เปิดลบตามเดิม]');
    io.confirms.length = 0;
    await E(`delMouLoan(1)`); await wait(30);
    ok(T.mou_entries.length === 1 && T.mou_entries[0].period === '2026-09' && !T.mou_loans.length && /เก็บไว้/.test(io.confirms[0] || '') && E(`mouEntries.length===1 && mouEntries[0].period==='2026-09'`),
       'ลบ MOU ของอี: ✎ ก.ย. (ปิดแล้ว) เก็บไว้ · ✎ พ.ย. (เปิด) ลบ · ถามบอกว่าเก็บของงวดที่ปิด');
    await E(`delLoan(1)`); await wait(30);
    ok(T.loan_entries.length === 1 && !T.loans.length, 'ลบเงินยืมของเอฟ: ✎ ก.ย. (ปิดแล้ว) เก็บไว้');

    console.log('[41 _br กดปิดจาก "ทุกสาขา" = จดสาขาที่ปิดจริง · ปุ่มปิดงวดซ่อนในงวดที่ยังไม่จบ · 🕘/เตือนซ้ำ]');
    setNow('2026-12-06T12:00:00+07:00'); await E(`loadAll()`);
    E(`AUTH={username:'mgrrd',display_name:'ผจก รช',role:'user',apps:{payroll:{payroll:'v',_close:'1',_br:'JJRD'}}}; applyUser(AUTH);`);
    await E(`loadAll()`);
    r = await E(`closeRun({ period:'2026-11' })`);
    const bR = T.pay_batches.filter(b => b.kind === 'close' && b.period === '2026-11').pop();
    ok(r.ok && bR && bR.branch === 'JJRD' && T.payroll_audit.some(a => a.action === 'close' && /\[p:2026-11\]/.test(a.detail) && /รัชดา/.test(a.detail) && !/ทุกสาขา/.test(a.detail)),
       'ผจก. รช. (_br) ปิด พ.ย. จาก "ทุกสาขา" → batch.branch = JJRD · ประวัติบอกสาขารัชดา (ไม่ใช่ "ทุกสาขา")');
    E(OWNER_); await E(`loadAll()`);
    E(`go('payroll'); document.getElementById('periodSel').value='2026-11'; document.getElementById('payBranch').value='JJLP'; renderPayroll();`);
    ok(!/ผจก รช/.test(E(`document.getElementById('payClose').innerHTML`)), 'เจ้าของดูลาดพร้าว: ไม่ขึ้น "ปิดล่าสุด โดย ผจก รช" (ลาดพร้าวยังไม่ได้ปิด)');
    E(`document.getElementById('payBranch').value=''; (s=>{ if(![...s.options].some(o=>o.value==='2026-12')) s.add(new Option('2026-12','2026-12')); s.value='2026-12'; })(document.getElementById('periodSel')); renderPayroll();`);
    ok(E(`document.getElementById('closeBtn').hidden`), 'งวดปัจจุบันที่ยังไม่จบ (ธ.ค.) = ไม่มีปุ่ม 🔒 ปิดงวด');
    await E(`closeOpen('2026-12','')`);
    ok(E(`document.getElementById('closeBg').classList.contains('show')`) && /ยังไม่ถึงวันจ่าย/.test(E(`document.getElementById('closeBody').textContent`)) &&
       /ปิดหลังโอนเงินเดือนแล้วเท่านั้น/.test(E(`document.getElementById('closeBody').textContent`)) && E(`closeUi.items.length > 0 && closeUi.items.every(x => x.st === 'wait' && !x.on)`) &&
       E(`[...document.querySelectorAll('#closeBody tbody input[type=checkbox]')].every(c => c.disabled)`) && E(`document.getElementById('closeGo').disabled`),
       'เปิดหน้าต่างงวดที่ยังไม่ถึงวันจ่าย = แถวเทา "ยังไม่ถึงวันจ่าย" ติ๊กไม่ได้ · ปุ่มปิดกดไม่ได้ · บอก "ปิดหลังโอนเงินเดือนแล้วเท่านั้น" (รอบตรวจ 3)');
    E(`closeModal('closeBg'); document.getElementById('periodSel').value='2026-11'; renderPayroll(); renderAll();`);
    ok(!/ไปที่หน้า 🛡️ เงินประกัน/.test(E(`document.getElementById('payWarn').innerHTML`)) || !/พ\.ย\./.test(E(`document.getElementById('payWarn').textContent`)),
       'หน้าสรุป: งวดที่แถบ "จ่ายแล้วยังไม่ปิดงวด" บอกอยู่แล้ว ไม่ขึ้นเตือน 🛡️ ซ้ำ');
    // สลิปงวดที่ปิด: ข้อความจากฉบับปิด escape (งวดที่เปิดเท่าเดิม)
    const c = T.pay_slips.find(x => x.employee_id === 2 && x.period === '2026-10' && x.kind === 'close');
    E(`closeSlipBody.set(${c.id}, Object.assign({}, closeSlipBody.get(${c.id}) || closeSlipOf(paySlips.find(x=>x.id===${c.id})), { nick:'<img src=x onerror=alert(1)>' }))`);
    const sl = E(`buildSlip(employees.find(e=>e.id===2),'2026-10',false)`);
    ok(!/<img src=x onerror/.test(sl) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(sl), 'สลิปงวดที่ปิด: ข้อความจาก pay_slips ถูก escape' + (/<img src=x onerror/.test(sl) ? ' — ' + sl.slice(Math.max(0, sl.search(/<img src=x onerror/) - 200), sl.search(/<img src=x onerror/) + 80) : ''));
    ok(!L.errs.length, 'ไม่มี JS error' + (L.errs.length ? ' — ' + L.errs.slice(0, 3).join(' | ') : ''));
    L.w.close();
  }

  // ==================== รอบตรวจ 3 ====================
  // ---- 42: ปิดหลังโอนเงินแล้วเท่านั้น ----
  { const Q = boot({ now:'2026-11-01T12:00:00+07:00' }); const { E, T, db, io, setNow } = Q; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[42 ปิดหลังโอนเงินแล้วเท่านั้น: หน้าร้านยังไม่ถึงวันจ่าย (5 พ.ย.) ปิดไม่ได้ทุกทาง · ออฟฟิศ (จ่าย 31 ต.ค.) ปิดได้ · ปุ่มบนแถบเปิดเฉพาะกลุ่มที่นับ]');
    let r = await E(`closeRun({ period:'2026-10', branch:'JJLP' })`);
    ok(!r.ok && /ยังไม่ถึงวันจ่าย 5 พ\.ย\./.test(r.msg) && !T.pay_slips.length && !T.pay_batches.length, '1 พ.ย. closeRun ลาดพร้าว = ไม่ได้ ("ยังไม่ถึงวันจ่าย 5 พ.ย.") · ไม่เขียนอะไร');
    r = await E(`closeRun({ period:'2026-10', ids:[1] })`);
    ok(!r.ok && !T.pay_slips.length, 'ส่ง ids ตรง ๆ (ข้ามหน้าจอ) = ไม่ได้เหมือนกัน (ตรวจใน closeRunIn)');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value='JJLP'; renderPayroll();`);
    const hidJ = E(`document.getElementById('closeBtn').hidden`);
    E(`document.getElementById('payBranch').value=''; renderPayroll();`);
    ok(hidJ && !E(`document.getElementById('closeBtn').hidden`), 'ปุ่ม 🔒 ปิดงวด: ลาดพร้าว (ยังไม่มีใครถึงวันจ่าย) ซ่อน · ทุกสาขา (ออฟฟิศถึงวันจ่ายแล้ว) แสดง');
    E(`go('today'); renderAll();`);
    const dd = E(`JSON.stringify(closeDue().filter(x=>!x.retro).map(x=>[x.p, x.people.map(e=>e.id)]))`);
    E(`closeDueGo()`); await wait(400);
    ok(dd === '[["2026-10",[4]]]' && E(`closeUi && closeUi.ids && closeUi.ids.join()`) === '4' && E(`closeUi.items.map(x=>x.e.id+':'+x.on).join()`) === '4:true' &&
       /ถึงวันจ่ายแล้ว 1 คน/.test(E(`document.getElementById('closeTitle').textContent`)), 'ปุ่มบนแถบ (ต.ค. 1 คน) เปิดหน้าต่างเฉพาะคนที่แถบนับ (ดี ออฟฟิศ) — ไม่ติ๊กหน้าร้านให้');
    E(`closeModal('closeBg')`);
    await E(`closeOpen('2026-10','')`);
    const wt = E(`JSON.stringify(closeUi.items.filter(x=>x.st==='wait').map(x=>x.e.id).sort((a,b)=>a-b))`), body = E(`document.getElementById('closeBody').textContent`);
    ok(wt === '[1,2,3,5,6,7,8]' && E(`closeUi.items.filter(x=>x.st!=='wait').map(x=>x.e.id).join()`) === '4' && /ยังไม่ถึงวันจ่าย 5 พ\.ย\./.test(body) && /ปิดหลังโอนเงินเดือนแล้วเท่านั้น/.test(body) &&
       E(`(()=>{ const i=closeUi.items.findIndex(x=>x.st==='wait'); return document.querySelectorAll('#closeBody tbody tr')[i].querySelector('input[type=checkbox]').disabled; })()`),
       'หน้าต่างทุกสาขา: หน้าร้าน = แถวเทา "ยังไม่ถึงวันจ่าย 5 พ.ย." ติ๊กไม่ได้ · ออฟฟิศติ๊กได้ · บอก "ปิดหลังโอนเงินเดือนแล้วเท่านั้น"');
    E(`(()=>{ const i=closeUi.items.findIndex(x=>x.st==='wait'); const c=document.querySelectorAll('#closeBody tbody tr')[i].querySelector('input[type=checkbox]'); c.disabled=false; c.checked=true; closeUiSet(c,'on'); })()`);
    ok(E(`closeUi.items.filter(x=>x.st==='wait').every(x=>!x.on)`), 'แถวเทาติ๊กไม่ได้แม้ปลด disabled (closeUiSet)');
    io.confirms.length = 0;
    await E(`closeGo()`); await wait(200);
    ok(T.pay_slips.filter(x => x.kind === 'close').map(x => x.employee_id).join() === '4' && /ยังไม่ถึงวันจ่าย 7 คน — ไม่ปิด/.test(io.confirms[0] || '') && /ปิดหลังโอนเงินเดือนแล้วเท่านั้น/.test(io.confirms[0] || ''),
       'กดปิด = ปิดเฉพาะออฟฟิศ · คำถามยืนยันบอก "ยังไม่ถึงวันจ่าย 7 คน — ไม่ปิด" + "ปิดหลังโอนเงินเดือนแล้วเท่านั้น"');
    setNow('2026-11-05T07:00:00+07:00');
    r = await E(`closeRun({ period:'2026-10', branch:'JJLP' })`);
    ok(r.ok && r.n === 6, '5 พ.ย. (วันจ่ายหน้าร้าน) ปิดลาดพร้าวได้');
    ok(!Q.errs.length, 'ไม่มี JS error' + (Q.errs.length ? ' — ' + Q.errs.slice(0, 3).join(' | ') : ''));
    Q.w.close();
  }

  // ---- 43: K BIZ — "จ่ายแล้ว" = อยู่ในไฟล์ K BIZ ที่จดไว้เท่านั้น ----
  { const K = boot({ now:NOW }); const { E, T, db, io } = K; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    T.employees.find(e => e.id === 6).bank_name = 'เงินสด';
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[43 K BIZ: จ่ายแล้ว = อยู่ในไฟล์ที่จดไว้ · ปิดแล้วแต่ไม่อยู่ในไฟล์ = ใส่ด้วยยอดฉบับปิดหลังถาม · เปิดงวดใหม่ = ถามเหตุผล · เงินสด = ชิปเทา · ไฟล์สำรองจดด้วย]');
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    io.promptAns = ['10/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('JJRD')`); await wait(50);
    let r = await E(`closeRun({ period:'2026-10' })`);
    ok(r.ok && r.n === 8 && T.pay_batches.filter(b => b.kind === 'kbiz').length === 1, 'ปิด ต.ค. ทุกคน (ไฟล์ที่จดไว้มีแค่ซี · รัชดา)');
    io.confirmAns = m => !/ไม่อยู่ในไฟล์ K BIZ ที่สร้างไว้ในระบบ/.test(m); io.confirms.length = 0; io.alerts.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const c1 = io.confirms.find(m => /ไม่อยู่ในไฟล์ K BIZ ที่สร้างไว้ในระบบ/.test(m)) || '', al1 = io.alerts.join('\n');
    ok(/• เอ /.test(c1) && /ยอดฉบับปิด/.test(c1) && !/เอฟ/.test(c1) && !/• ซี/.test(c1) && T.pay_batches.filter(b => b.kind === 'kbiz').length === 1 &&
       /ฉบับเดิม/.test(al1) && /ไม่อยู่ในไฟล์โอน 6 คน/.test(al1) && !/จ่ายนอกไฟล์/.test(al1),
       'ปิดแล้วแต่ไม่อยู่ในไฟล์ที่จด: ถามก่อนใส่ (ไม่ถามเงินสด/คนในไฟล์) · ยกเลิก = ไม่สร้างไฟล์ · บอก "ไม่อยู่ในไฟล์โอน 6 คน" (ไม่ใช่ "จ่ายนอกไฟล์")');
    io.confirmAns = null; io.confirms.length = 0; io.alerts.length = 0; io.files.length = 0; io.promptAns = ['10/11/2026'];
    await E(`exportKbizPay('')`); await wait(50);
    const kb2 = T.pay_batches.filter(b => b.kind === 'kbiz')[1], rb = E(`document.getElementById('kbizResBody').textContent`);
    const exp = E(`JSON.stringify(employees.filter(e=>[1,2,4,5,7,8].includes(e.id)).map(e=>[e.id, Math.round(payOf(e,'2026-10').net*100)/100]).sort((a,b)=>a[0]-b[0]))`);
    ok(kb2 && JSON.stringify(kb2.meta.rows.map(x => [x.emp_id, x.amount]).sort((a, b) => a[0] - b[0])) === exp && /ซี/.test(rb) && /จ่ายแล้ว ไม่อยู่ในไฟล์นี้/.test(rb) &&
       T.payroll_audit.some(a => a.action === 'kbiz' && /ใส่คนที่ปิดงวดแล้วแต่ไม่อยู่ในไฟล์ที่จดไว้ 6 คน/.test(a.detail)),
       'ตกลง = ไฟล์ใหม่ของคนที่ปิดแล้วแต่ไม่อยู่ในไฟล์ (ยอดฉบับปิด · ไม่รวมซี/เงินสด) + จด batch kbiz + ประวัติ · หน้าผลบอกซี "จ่ายแล้ว ไม่อยู่ในไฟล์นี้"');
    io.alerts.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const al3 = io.alerts.join('\n'), f3 = io.files.pop();
    ok(/รวม 2 ไฟล์/.test(al3) && !/ไม่อยู่ในไฟล์โอน/.test(al3) && f3 && f3.aoa.filter(x => Array.isArray(x) && /^\d{10}$/.test(String(x[1]))).length === 7 && T.pay_batches.filter(b => b.kind === 'kbiz').length === 2,
       'ทุกคนอยู่ในไฟล์ที่จดแล้ว = ไฟล์ฉบับเดิม (รวมไฟล์รายสาขา + ทุกสาขา 7 แถว) · ไม่จดซ้ำ');
    r = await E(`closeReopen({ period:'2026-10', ids:[3,6], reason:'ทดสอบเปิดงวดใหม่ก่อนโอนซี' })`);
    io.prompts.length = 0; io.promptAns = ['']; io.files.length = 0; io.alerts.length = 0;
    await E(`exportKbizPay('JJRD')`); await wait(50);
    const pr = io.prompts[0] || '';
    ok(r.ok && /เปิดงวดใหม่หลังปิด/.test(pr) && /ซี/.test(pr) && /พิมพ์เหตุผล/.test(pr) && !io.files.length, 'เปิดงวดใหม่ (ซี · เคยอยู่ในไฟล์) = อยู่กลุ่มถาม · เว้นว่าง = ไม่ใส่');
    io.prompts.length = 0; io.promptAns = ['เปิดงวดใหม่เพื่อแก้ยอดก่อนโอน', '10/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('JJRD')`); await wait(50);
    const kb4 = T.pay_batches.filter(b => b.kind === 'kbiz').pop();
    ok(kb4 && kb4.branch === 'JJRD' && kb4.meta.rows.length === 1 && kb4.meta.rows[0].emp_id === 3 &&
       T.payroll_audit.some(a => a.action === 'kbiz' && /รวมคนที่เปิดงวดใหม่หลังปิด 1 คน: ซี/.test(a.detail) && /แก้ยอดก่อนโอน/.test(a.detail)), 'พิมพ์เหตุผล = ใส่ซีในไฟล์ได้ + จดเหตุผลในประวัติ');
    await E(`closeOpen('2026-10','JJLP')`);
    const f6 = E(`(()=>{ const x=closeUi.items.find(y=>y.e.id===6); const i=closeUi.items.indexOf(x); return { st:x.st, nb:x.nb, out:closeOut(x), i, chip:document.querySelectorAll('#closeBody tbody tr')[i].querySelector('td[data-l="ไฟล์ K BIZ"]').textContent.trim() }; })()`);
    ok(f6.st === 'out' && f6.nb && !f6.out && /เงินสด\/ธนาคารอื่น/.test(f6.chip) && !/ตกหล่น/.test(f6.chip), 'หน้าต่างปิดงวด: เอฟ (เงินสด) ไม่อยู่ในไฟล์ = ชิปเทา "เงินสด/ธนาคารอื่น" (ไม่ใช่ส้ม "ตกหล่น?")');
    E(`closeModal('closeBg')`);
    r = await E(`closeRun({ period:'2026-09', ids:[4], reason:'ปิดย้อนหลังทดสอบไฟล์สำรอง' })`);
    io.promptAns = ['10/11/2026']; io.files.length = 0; io.confirmAns = null;
    await E(`closeKbizOriginal('', '2026-09', [employees.find(e=>e.id===4)], '')`); await wait(50);
    const kb9 = T.pay_batches.filter(b => b.kind === 'kbiz' && b.period === '2026-09');
    ok(r.ok && io.files.length === 1 && kb9.length === 1 && kb9[0].meta.rows.length === 1 && kb9[0].meta.rows[0].emp_id === 4 &&
       Math.abs(kb9[0].meta.rows[0].amount - E(`payOf(employees.find(e=>e.id===4),'2026-09').net`)) < 0.005, 'ไฟล์สำรองจากยอดฉบับปิด (ไม่มีไฟล์ที่จด) = จดด้วย closeKbizLog (ยอดฉบับปิด)');
    ok(!K.errs.length, 'ไม่มี JS error' + (K.errs.length ? ' — ' + K.errs.slice(0, 3).join(' | ') : ''));
    K.w.close();
  }

  // ---- 44: สร้างไฟล์ "ทุกสาขา" ซ้ำก่อนวันจ่าย (ออฟฟิศปิดแล้ว) = แบบเดิม ไม่ต้องพิมพ์อะไร ----
  { const D = boot({ now:'2026-11-01T12:00:00+07:00' }); const { E, T, db, io, setNow } = D; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[44 ออฟฟิศปิด ต.ค. แล้ว → สร้างไฟล์ทุกสาขา 3 พ.ย. → แก้ OT → สร้างใหม่ 4 พ.ย. (ก่อนวันจ่าย) = ไฟล์หน้าร้านเหมือนไม่มีการปิด ไม่ต้องพิมพ์เหตุผล]');
    let r = await E(`closeRun({ period:'2026-10', branch:'OFFICE' })`);
    setNow('2026-11-03T12:00:00+07:00'); await E(`loadAll()`);
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    io.confirmAns = m => !/ไม่อยู่ในไฟล์ K BIZ ที่สร้างไว้ในระบบ/.test(m);   // ดี โอนแล้ว 31 ต.ค. นอกระบบ — ไม่ใส่
    io.promptAns = ['05/11/2026']; io.prompts.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f1 = io.files.pop(), p1 = io.prompts.slice();
    setNow('2026-11-04T12:00:00+07:00');
    T.adjustments.push({ id:801, employee_id:2, kind:'add', reason:'OT 24 ต.ค. (2 ชม.)', amount:125, period:'2026-10' });
    await E(`loadAll()`);
    io.promptAns = ['05/11/2026']; io.prompts.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f2 = io.files.pop(), p2 = io.prompts.slice();
    E(`closeReady = false; closeIndex();`);   // เทียบ: ไม่มีการปิด (แบบ main)
    io.promptAns = ['05/11/2026']; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(50);
    const f3 = io.files.pop(); await E(`loadAll()`);
    const rows = f => f ? f.aoa.filter(x => Array.isArray(x) && /^\d{10}$/.test(String(x[1]))).map(x => x.join('|')) : null;
    ok(r.ok && f1 && f2 && p1.length === 1 && p2.length === 1 && /วันที่ให้เงินเข้าบัญชี/.test(p2[0]) &&
       JSON.stringify(rows(f2)) === JSON.stringify(rows(f3).filter(x => !x.includes('4444444444'))) && rows(f2).length === rows(f1).length,
       'สร้างซ้ำก่อนวันจ่าย = ถามแค่วันเงินเข้า (ไม่ต้องพิมพ์เหตุผล) · ไฟล์ = แบบไม่มีการปิดทุกแถว (ยกเว้นดีที่ปิดแล้ว)');
    ok(!D.errs.length, 'ไม่มี JS error' + (D.errs.length ? ' — ' + D.errs.slice(0, 3).join(' | ') : ''));
    D.w.close();
  }

  // ---- 45–46: แก้/ลบด้วย id ลงงวดที่เพิ่งปิด ----
  { const C = boot({ now:NOW }); const { E, T, db } = C; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    const W = boot({ now:NOW, db }); await wait(300);
    W.E(`AUTH={username:'mgr',display_name:'ผจก',role:'admin'}; applyUser(AUTH); payLockAuto=false;`); await W.E(`loadAll()`);
    const tW = () => W.E(`document.getElementById('toast').textContent`);
    console.log('[45 แก้/ลบด้วย id ลงงวดที่เพิ่งปิด (เครื่อง W ดัชนีค้าง): ตัวดักอ่านแถวเป้าหมายจาก DB ก่อนเขียน → บล็อกทุกตาราง · งวดที่เปิด/ถอนเงินสดได้ · อ่านไม่ได้ = ไม่เขียน]');
    W.E(`go('adv'); openAdvForm(1,'2026-10'); document.getElementById('advEA_1').value='2500';`);
    await W.E(`closeRefresh(true)`);
    let r = await E(`closeRun({ period:'2026-10', branch:'JJLP' })`);
    await W.E(`updateAdv(1)`); await wait(50);
    ok(r.ok && T.advances.find(a => a.id === 1).amount === 2000 && /ปิดงวดแล้ว/.test(tW()), 'แก้เบิก (updateAdv) ทันทีหลังอีกเครื่องปิด = บล็อก (จุดบันทึกอ่านดัชนีใหม่ ไม่ใช้แคช 2 วินาที)');
    T.fine_entries.push({ id:11, employee_id:1, period:'2026-10', kind:'miss', amount:50, note:'' });
    T.sso_entries.push({ id:12, employee_id:1, period:'2026-10', amount:0 });
    T.mou_entries.push({ id:13, employee_id:5, period:'2026-10', amount:1000 });
    T.loan_entries.push({ id:14, employee_id:6, period:'2026-10', amount:800 });
    T.deposit_payouts = [{ id:15, employee_id:2, period:'2026-10', amount:100, pay_date:'2026-11-01', via:'cash', note:'' }];
    T.pvd_payouts.push({ id:16, employee_id:7, period:'2026-10', amount:200, pay_date:'2026-10-20', via:'cash', note:'' }, { id:17, employee_id:7, period:'2026-10', amount:100, pay_date:'2026-10-20', via:'slip', note:'' });
    T.advances.push({ id:9, employee_id:1, period:'2026-11', amount:500, taken_date:'2026-11-03', note:'' });
    const q = s => W.E(s + `.then(r=>({ e:r.error ? r.error.code : '' }))`);
    const res = {
      advUpd: await q(`db.from('advances').update({ amount:2600 }).eq('id', 1)`), advDel: await q(`db.from('advances').delete().eq('id', 1)`),
      otUpd: await q(`db.from('adjustments').update({ amount:999 }).eq('id', 2)`), fineDel: await q(`db.from('fine_entries').delete().eq('id', 11)`),
      ssoDel: await q(`db.from('sso_entries').delete().eq('id', 12)`), mouDel: await q(`db.from('mou_entries').delete().eq('id', 13)`),
      loanUpd: await q(`db.from('loan_entries').update({ amount:1 }).eq('id', 14)`), poUpd: await q(`db.from('deposit_payouts').update({ amount:50 }).eq('id', 15)`),
      tipDel: await q(`db.from('tips').delete().eq('id', 1)`), pvdSlipDel: await q(`db.from('pvd_payouts').delete().eq('id', 17)`),
      depUpd: await q(`db.from('deposit_entries').update({ amount:1 }).eq('employee_id', 1).eq('period', '2026-10')`),
    };
    const pass = Object.keys(res).filter(k => res[k].e !== 'JJ_CLOSED');
    ok(!pass.length && T.advances.some(a => a.id === 1 && a.amount === 2000) && T.adjustments.find(a => a.id === 2).amount === 200 && T.fine_entries.length === 1 && T.sso_entries.length === 1 &&
       T.mou_entries.length === 1 && T.loan_entries[0].amount === 800 && T.deposit_payouts[0].amount === 100 && T.tips.length === 1 && T.pvd_payouts.length === 2,
       'แก้/ลบด้วย id ทุกตาราง (เบิก · OT · ค่าปรับ · สปส. · MOU · เงินยืม · 💵 · ทิป · ถอนสำรองฯ ในสลิป · ✎ เงินประกัน) = บล็อก ไม่มีแถวเปลี่ยน' + (pass.length ? ' — ผ่าน: ' + pass.join(',') : ''));
    const ok2 = { cash: await q(`db.from('pvd_payouts').delete().eq('id', 16)`), nov: await q(`db.from('advances').update({ amount:600 }).eq('id', 9)`) };
    ok(!ok2.cash.e && !ok2.nov.e && !T.pvd_payouts.some(x => x.id === 16) && T.advances.find(a => a.id === 9).amount === 600, 'ถอนสำรองฯ เงินสด (นอกสลิป) ของงวดที่ปิด · แก้เบิก พ.ย. (งวดที่เปิด) = ทำได้');
    db.fail.advances = { message:'timeout' };
    const rf = await q(`db.from('advances').update({ amount:700 }).eq('id', 9)`);
    delete db.fail.advances;
    ok(rf.e === 'JJ_CLOSED' && T.advances.find(a => a.id === 9).amount === 600 && /อ่านรายการที่จะแก้จากฐานข้อมูลไม่สำเร็จ/.test(tW()), 'อ่านแถวเป้าหมายไม่ได้ = ไม่เขียน (fail closed)');

    console.log('[46 แก้/ลบชนจังหวะปิด (เครื่องที่แก้อ่านดัชนีก่อนแถวปิดเข้า): เตือนเด่น ๆ + จดประวัติ ⚠️ (เดิมเงียบ)]');
    T.adjustments.push({ id:40, employee_id:4, kind:'deduct', reason:'ลบชนจังหวะ', amount:40, period:'2026-10' });
    await E(`loadAll()`);
    let slow = false;
    db.latency = (t, op) => slow && t === 'pay_slips' && op === 'select' ? 1200 : 0;
    W.io.alerts.length = 0;
    slow = true; const pU = W.E(`db.from('adjustments').update({ amount:300 }).eq('id', 3).then(r=>r)`);
    await new Promise(res2 => setTimeout(res2, 0)); slow = false;
    const rU = await E(`closeRun({ period:'2026-10', ids:[3] })`);
    const qU = await pU; await wait(300);
    ok(rU.ok && !(rU.late || []).length && !qU.error && T.adjustments.find(a => a.id === 3).amount === 300 &&
       W.io.alerts.some(m => /เพิ่งแก้/.test(m) && /ซี/.test(m) && /ฉบับปิดใช้ยอดก่อนแก้/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && a.tbl === 'adjustments' && /แก้เข้างวดที่เพิ่งปิดระหว่างแก้/.test(a.detail)), 'แก้ด้วย id ชนจังหวะ: เครื่องที่แก้เตือน + จดประวัติ ⚠️');
    W.io.alerts.length = 0;
    slow = true; const pD = W.E(`db.from('adjustments').delete().eq('id', 40).then(r=>r)`);
    await new Promise(res2 => setTimeout(res2, 0)); slow = false;
    const rD = await E(`closeRun({ period:'2026-10', ids:[4] })`);
    const qD = await pD; await wait(300); db.latency = null;
    ok(rD.ok && !qD.error && !T.adjustments.some(a => a.id === 40) && W.io.alerts.some(m => /เพิ่งลบ/.test(m) && /ดี/.test(m) && /ฉบับปิดยังนับรายการที่ลบ/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && /ลบเข้างวดที่เพิ่งปิดระหว่างลบ/.test(a.detail)), 'ลบด้วย id ชนจังหวะ: เครื่องที่ลบเตือน + จดประวัติ ⚠️');
    ok(!C.errs.length && !W.errs.length, 'ไม่มี JS error' + (C.errs.length || W.errs.length ? ' — ' + [...C.errs, ...W.errs].slice(0, 3).join(' | ') : ''));
    C.w.close(); W.w.close();
  }

  // ---- 47: 💵 ชนตอนปิด — ตรวจซ้ำหลังปิดเทียบยอดยกด้วย ----
  { const C = boot({ now:NOW }); const { E, T, db } = C; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches; T.deposit_payouts = [];
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    const W = boot({ now:NOW, db }); await wait(300);
    W.E(`AUTH={username:'mgr',display_name:'ผจก',role:'admin'}; applyUser(AUTH); payLockAuto=false;`); await W.E(`loadAll()`);
    console.log('[47 💵 เบิกเงินประกันคืนชนจังหวะปิด (สุทธิไม่เปลี่ยน แต่ยอดสะสมเปลี่ยน): เครื่องที่ปิดเทียบยอดยกด้วย → เตือน + ประวัติ ⚠️ ให้เปิดงวดใหม่แล้วปิดซ้ำ]');
    const nb0 = T.pay_batches.length;
    db.latency = (t, op) => (t === 'pay_batches' && op === 'insert') ? 1500 : 0;
    C.io.alerts.length = 0;
    const pC = E(`closeRun({ period:'2026-10', ids:[2] })`);
    for(let i = 0; i < 200 && T.pay_batches.length === nb0; i++) await wait(10);
    const w = await W.E(`db.from('deposit_payouts').insert({ employee_id:2, period:'2026-10', amount:600, pay_date:'2026-11-03', via:'cash', note:'ชนจังหวะ' }).then(r=>r)`);
    const res = await pC; db.latency = null; await wait(100);
    ok(!w.error && res.ok && res.late && res.late.length === 1 && res.late[0].now === res.late[0].was && /เงินประกันสะสม/.test(res.late[0].carry) && /💵 เบิกเงินประกันคืน 0\.00 → 600\.00/.test(res.late[0].carry),
       'เครื่องที่ปิด: สุทธิเท่าเดิม แต่ยอดยกไม่ตรง (เงินประกันสะสม · 💵 0 → 600) → รายงาน (เดิมเทียบแค่สุทธิ = เงียบ)');
    ok(C.io.alerts.some(m => /ยอดยกไปงวดถัดไปไม่ตรง/.test(m) && /เปิดงวดใหม่แล้วปิดซ้ำเท่านั้น/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && /⚠️ ยอดที่ระบบคิดเปลี่ยนระหว่างปิด/.test(a.detail) && /ยอดยกไปงวดถัดไปไม่ตรง/.test(a.detail)), 'เตือนเด่น ๆ + จดประวัติ ⚠️ · บอกให้เปิดงวดใหม่แล้วปิดซ้ำ (ห้ามแก้ฉบับปิดเอง)');
    ok(!C.errs.length && !W.errs.length, 'ไม่มี JS error');
    C.w.close(); W.w.close();
  }

  // ---- 48: เปิดงวดก่อนหน้าใหม่ชนกับปิดงวดถัดไป ----
  { const C = boot({ now:'2026-12-07T12:00:00+07:00' }); const { E, T, db } = C; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    let pid = 900000;
    for(let d = 6; d <= 25; d++){ const k = '2026-11-' + pad(d); if(new Date(k + 'T12:00:00').getDay() === 1) continue;
      T.punches.push({ id:pid++, emp_code:'B', punch_date:k, punch_time:'08:58:00', device_sn:'S1' }, { id:pid++, emp_code:'B', punch_date:k, punch_time:'18:05:00', device_sn:'S1' }); }
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    const r0 = await E(`closeRun({ period:'2026-10', ids:[2] })`);
    const B = boot({ now:'2026-12-07T12:00:00+07:00', db }); await wait(300);
    B.E(`AUTH={username:'mgr',display_name:'ผจก',role:'admin'}; applyUser(AUTH); payLockAuto=false;`); await B.E(`loadAll()`);
    console.log('[48 เปิด ต.ค. ใหม่ (เจ้าของ) พร้อมกับปิด พ.ย. (อีกเครื่อง) ของคนเดียวกัน: ฝั่งที่เห็นหลังเขียนเปิด พ.ย. คืนอัตโนมัติ + ประวัติ + เตือน]');
    db.latency = (t, op) => (op === 'insert' && t === 'pay_batches') ? 400 : 0;
    const [ra, rb] = await Promise.all([E(`closeReopen({ period:'2026-10', ids:[2], reason:'ทดสอบเปิดใหม่พร้อมกับปิดงวดถัดไป' })`), B.E(`closeRun({ period:'2026-11', ids:[2] })`)]);
    db.latency = null; await wait(200);
    await E(`loadAll()`);
    const e2 = `employees.find(e=>e.id===2)`;
    ok(r0.ok && ra.ok && rb.ok && rb.n === 1 && !E(`closedOf(${e2},'2026-10')`) && !E(`closedOf(${e2},'2026-11')`) && !E(`closeLaterOf(${e2},'2026-10')`),
       'เปิด ต.ค. ใหม่ + ปิด พ.ย. พร้อมกัน → พ.ย. ถูกเปิดคืนอัตโนมัติ (ไม่ค้าง "ต.ค. เปิด แต่ พ.ย. ปิด")');
    ok(T.pay_batches.some(b => b.kind === 'reopen' && b.period === '2026-11' && /^อัตโนมัติ:/.test(b.reason)) && T.payroll_audit.some(a => a.action === 'reopen' && /เปิดงวดใหม่อัตโนมัติ \(ลำดับงวดชนกัน\)/.test(a.detail)) &&
       [...C.io.alerts, ...B.io.alerts].some(m => /อีกเครื่อง/.test(m) && /เรียงงวด/.test(m)), 'จด batch reopen อัตโนมัติ + ประวัติ + เตือนว่าต้องทำอะไรต่อ');
    ok(!E(`closeBlock(${e2},'2026-10','บันทึกเพิ่มเงิน')`), 'แก้ ต.ค. (ที่เพิ่งเปิดใหม่) ได้ทันที');
    const r3 = await E(`closeRun({ period:'2026-10', ids:[2] })`), r4 = await E(`closeRun({ period:'2026-11', ids:[2] })`);
    ok(r3.ok && r4.ok && !r4.undo && E(`!!closedOf(${e2},'2026-11')`), 'ปิดเรียงงวดใหม่ (ต.ค. → พ.ย.) ได้ตามปกติ ไม่ถูกเปิดคืน');
    ok(!C.errs.length && !B.errs.length, 'ไม่มี JS error');
    C.w.close(); B.w.close();
  }

  // ---- 49: แก้วันตัดรอบ / ย้ายข้ามรอบหลังปิดงวด ----
  { const F = boot({ now:NOW }); const { E, T, db, io } = F; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[49 แก้วันตัดรอบ/ย้ายข้ามรอบ (ออฟฟิศ↔หน้าร้าน) หลังปิดงวด: บอกวันที่ทับ/หาย + ถามยืนยัน (เจ้าของ/แอดมินเท่านั้น) + จดประวัติ · สูตรคิดงวดไม่เปลี่ยน]');
    io.confirms.length = 0;
    E(`go('settings')`); await E(`saveSetting('cut_day', 20)`);
    ok(!io.confirms.some(m => /หลังปิดงวดแล้ว/.test(m)) && E(`settings.cutDay`) === 20, 'ยังไม่มีงวดปิด = แก้ได้แบบเดิม (ไม่ถามเพิ่ม)');
    await E(`saveSetting('cut_day', 25)`);
    let r = await E(`closeRun({ period:'2026-10' })`);
    io.confirms.length = 0; io.confirmAns = m => !/หลังปิดงวดแล้ว/.test(m);
    await E(`saveSetting('cut_day', 20)`);
    const c1 = io.confirms.find(m => /หลังปิดงวดแล้ว/.test(m)) || '';
    ok(r.ok && /แก้วันตัดรอบ 25 → 20/.test(c1) && /นับ 21 ต\.ค\.–25 ต\.ค\. ซ้ำ/.test(c1) && /• เอ:/.test(c1) && !/• ดี:/.test(c1) && E(`settings.cutDay`) === 25 && T.payroll_settings[0].cut_day === 25,
       'แก้วันตัดรอบ 25 → 20 หลังปิด ต.ค.: บอกว่า 21–25 ต.ค. นับซ้ำ (หน้าร้าน · ออฟฟิศไม่กระทบ) · ยกเลิก = ไม่บันทึก');
    io.confirmAns = null; io.confirms.length = 0;
    await E(`saveSetting('cut_day', 27)`);
    ok(T.payroll_settings[0].cut_day === 27 && io.confirms.some(m => /26 ต\.ค\.–27 ต\.ค\. ไม่อยู่ในงวดไหน/.test(m)) &&
       T.payroll_audit.some(a => a.action === 'close' && a.tbl === 'payroll_settings' && /แก้วันตัดรอบ 25 → 27 หลังปิดงวด \(ยืนยันแล้ว\)/.test(a.detail)), 'ยืนยัน = บันทึก + จดประวัติ (วันที่หาย 26–27 ต.ค.)');
    io.confirms.length = 0;
    await E(`saveSetting('cut_day', 25)`);
    ok(T.payroll_settings[0].cut_day === 25 && !io.confirms.some(m => /หลังปิดงวดแล้ว/.test(m)), 'กลับเป็นค่าที่ต่อกับฉบับปิด = ไม่ถาม');
    E(`AUTH={username:'hr',display_name:'HR',role:'user',apps:{payroll:{settings:'vae',emp:'vae',payroll:'v'}}}; applyUser(AUTH);`);
    io.alerts.length = 0;
    await E(`saveSetting('cut_day', 20)`);
    ok(T.payroll_settings[0].cut_day === 25 && io.alerts.some(m => /ให้เจ้าของ\/แอดมินทำ/.test(m)), 'ไม่ใช่เจ้าของ/แอดมิน = แก้วันตัดรอบที่กระทบงวดที่ปิดไม่ได้');
    E(OWNER_);
    io.confirms.length = 0; io.confirmAns = m => !/หลังปิดงวดแล้ว/.test(m);
    E(`go('emp'); openEmpForm(4); document.getElementById('fBranch').value='JJLP';`); await E(`saveEmpForm()`); await wait(50);
    const c2 = io.confirms.find(m => /หลังปิดงวดแล้ว/.test(m)) || '';
    ok(/ย้าย ดี ไปรอบหน้าร้าน/.test(c2) && /นับ 26 ต\.ค\.–31 ต\.ค\. ซ้ำ/.test(c2) && T.employees.find(e => e.id === 4).branch === 'OFFICE', 'ย้ายดี (ออฟฟิศ ปิด ต.ค.) ไปหน้าร้าน: บอกว่า 26–31 ต.ค. นับซ้ำ · ยกเลิก = ไม่บันทึก');
    E(`closeModal('formBg')`);
    io.confirms.length = 0; io.confirmAns = null;
    E(`go('emp'); openEmpForm(1); document.getElementById('fBranch').value='OFFICE';`); await E(`saveEmpForm()`); await wait(50);
    ok(io.confirms.some(m => /ย้าย เอ ไปรอบออฟฟิศ/.test(m) && /26 ต\.ค\.–31 ต\.ค\. ไม่อยู่ในงวดไหน/.test(m)) && T.employees.find(e => e.id === 1).branch === 'OFFICE' &&
       T.payroll_audit.some(a => a.action === 'close' && a.tbl === 'employees' && /ย้าย เอ ไปรอบออฟฟิศ/.test(a.detail)), 'ย้ายเอ (หน้าร้าน) ไปออฟฟิศ: บอกว่า 26–31 ต.ค. หาย · ยืนยัน = บันทึก + จดประวัติ');
    ok(!F.errs.length, 'ไม่มี JS error' + (F.errs.length ? ' — ' + F.errs.slice(0, 3).join(' | ') : ''));
    F.w.close();
  }

  // ---- 50: พนักงานใหม่ที่ไม่มีอะไรเลยในงวดที่ปิดแล้ว ----
  { const G = boot({ now:NOW }); const { E, T, db } = G; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    E(OWNER_); await E(`loadAll()`); await E(LOCKPRE('2026-10'));
    console.log('[50 พนักงานใหม่ (ไม่ใส่วันเริ่มงาน · ไม่มีงาน/รายการ) ในงวดที่ปิดแล้ว: ไม่ขึ้นในสรุป/Excel/K BIZ · ไม่นับในแถบเตือน · คนที่มีรายการเงินจริงยังนับ]');
    let r = await E(`closeRun({ period:'2026-10' })`);
    const sum0 = E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll(); document.getElementById('payStats').textContent`);
    T.employees.push({ ...T.employees[1], id:901, code:'N901', nick:'ใหม่ไม่มีวันเริ่ม', full_name:'ใหม่ ข', start_date:null, bank_account:'9000000901' },
                     { ...T.employees[1], id:902, code:'N902', nick:'ใหม่มีรายการ', full_name:'ใหม่ ค', start_date:null, bank_account:'9000000902' });
    T.adjustments.push({ id:902, employee_id:902, kind:'add', reason:'ค่าเดินทางสัมภาษณ์', amount:300, period:'2026-10' });
    await E(`loadAll()`);
    const pin = E(`[901,902].map(id=>payIn(employees.find(e=>e.id===id),'2026-10')).join()+'|'+payIn(employees.find(e=>e.id===901),'2026-11')`);
    const due = E(`JSON.stringify(closeDue().filter(x=>x.p==='2026-10').map(x=>x.people.map(e=>e.id)))`);
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; document.getElementById('payBranch').value=''; renderPayroll();`);
    const tbl = E(`document.getElementById('payTable').textContent`), tag = E(`closeTag('2026-10','')`);
    ok(r.ok && pin === 'false,true|true' && due === '[[902]]' && !/ใหม่ไม่มีวันเริ่ม/.test(tbl) && /ใหม่มีรายการ/.test(tbl) && /8\/9 คน/.test(tag),
       'ต.ค. (ปิดแล้ว): คนใหม่ที่ไม่มีอะไรเลยไม่อยู่ในรายชื่อ/แถบเตือน/ป้าย · คนใหม่ที่มีรายการเงินจริงยังนับ (ต้องปิด) · พ.ย. (เปิด) ยังอยู่ในรายชื่อ');
    T.adjustments = T.adjustments.filter(a => a.id !== 902); await E(`loadAll()`);
    E(`go('payroll'); document.getElementById('periodSel').value='2026-10'; renderPayroll();`);
    ok(E(`document.getElementById('payStats').textContent`) === sum0 && /🔒 ปิดงวดแล้ว/.test(E(`closeTag('2026-10','')`)) && !E(`closeDue().some(x=>x.p==='2026-10')`),
       'ไม่มีรายการแล้ว = หน้าสรุป ต.ค. (รวม N คน/ยอด) เท่าตอนปิดทุกตัวอักษร · ป้าย "ปิดงวดแล้ว" · ไม่ค้างในแถบเตือน');
    ok(!G.errs.length, 'ไม่มี JS error' + (G.errs.length ? ' — ' + G.errs.slice(0, 3).join(' | ') : ''));
    G.w.close();
  }


  // ---- 51: งวดเริ่มหักรายคน (#179) × ปิดงวด — งวดที่ปิดแล้วอ่านฉบับปิด: ตั้งงวดเริ่ม/เอาติ๊ก สปส. ไม่ถาม/ไม่เขียนลงงวดที่ปิด ----
  { const G = boot({ now:NOW }); const { E, T, db } = G; await wait(300);
    seed(T); delete db.fail.pay_slips; delete db.fail.pay_batches;
    T.employees.forEach(e => { e.deposit_start = ''; e.sso_start = ''; });   // รัน jj_emp_start.sql แล้ว (ค่าเริ่ม '')
    E(OWNER_); await E(`loadAll()`); E(`window.E1 = () => employees.find(e=>e.id===1); window.E2 = () => employees.find(e=>e.id===2);`);
    console.log('[51 งวดเริ่มหักรายคน × ปิดงวด: ปิด ส.ค.–ต.ค. แล้วตั้ง "เริ่มหักงวด" พ.ย. / เอาติ๊ก สปส. ออก = ไม่ถามข้อยกเว้น · ไม่เขียน 🔒/✎ ลงงวดที่ปิด · ฉบับปิดไม่เปลี่ยน]');
    const r8 = await E(`closeRun({ period:'2026-08', reason:'ปิดย้อนหลังด้วยยอดที่ระบบคิด' })`);
    const r9 = await E(`closeRun({ period:'2026-09', reason:'ปิดย้อนหลังด้วยยอดที่ระบบคิด' })`);
    const r10 = await E(`closeRun({ period:'2026-10' })`);
    const sso0 = E(`JSON.stringify(['2026-08','2026-09','2026-10'].map(p=>payOf(E1(),p).sso.ded))`);
    const dep0 = E(`JSON.stringify(['2026-08','2026-09','2026-10','2026-11'].map(p=>payOf(E2(),p).dep.ded))`);
    ok(E('startReady') === true && r8.ok && r9.ok && r10.ok && E(`['2026-08','2026-09','2026-10'].every(p=>!!closedOf(E1(),p) && !!closedOf(E2(),p))`) && sso0 === '[600,600,600]',
       'ตั้งต้น: รัน jj_emp_start.sql แล้ว · ปิด ส.ค./ก.ย. (ย้อนหลัง) + ต.ค. ครบ · เอ หัก สปส. 600 ทุกงวด ' + sso0);
    const ent0 = T.sso_entries.length, dep0n = T.deposit_entries.length;
    G.io.confirms.length = 0; G.io.alerts.length = 0; G.io.prompts.length = 0;
    await E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', '2026-11'); })()`); await wait(50);
    ok(T.employees[0].sso_start === '2026-11' && !G.io.alerts.length && !G.io.prompts.length && !G.io.confirms.some(m => /สลิปที่จ่ายจริงไม่ได้หัก|ส\.ค\. 2569: หัก|ต\.ค\. 2569: หัก/.test(m)) &&
       E(`JSON.stringify(['2026-08','2026-09','2026-10'].map(p=>payOf(E1(),p).sso.ded))`) === sso0 && T.sso_entries.length === ent0,
       'สปส. เอ เริ่ม พ.ย.: งวดที่ปิดแล้ว (ส.ค.–ต.ค.) ไม่นับเป็นงวดที่ยอดจะเปลี่ยน → ไม่มีข้อยกเว้น/เหตุผล · ฉบับปิดยัง 600 · ไม่มี ✎ ' + JSON.stringify(G.io.confirms.map(m => m.split('\n')[0])));
    G.io.confirms.length = 0;
    await E(`(async()=>{ go('sso'); await updSsoField(1, 'sso_on', false); })()`); await wait(50);
    ok(T.employees[0].sso_on === false && !G.io.confirms.some(m => /สลิปงวดเหล่านี้หัก สปส\. จริงไหม/.test(m)) && T.sso_entries.length === ent0 &&
       E(`JSON.stringify(['2026-08','2026-09','2026-10'].map(p=>payOf(E1(),p).sso.ded))`) === sso0,
       'เอาติ๊ก สปส. ออก: งวดที่จ่ายแล้วปิดงวดครบ = ไม่ถาม "สลิปหักจริงไหม" · ไม่จด ✎ · ฉบับปิดยัง 600');
    G.io.confirms.length = 0; G.io.alerts.length = 0; G.io.prompts.length = 0;
    await E(`(async()=>{ go('dep'); await empStartSet(2, 'dep', '2026-11'); })()`); await wait(50);
    ok(T.employees[1].deposit_start === '2026-11' && !G.io.alerts.length && !G.io.prompts.length && T.deposit_entries.length === dep0n &&
       E(`JSON.stringify(['2026-08','2026-09','2026-10'].map(p=>payOf(E2(),p).dep.ded))`) === JSON.stringify(JSON.parse(dep0).slice(0, 3)),
       'เงินประกัน บี เริ่ม พ.ย.: งวดที่ปิดแล้วไม่ถาม/ไม่เขียน 🔒 · ฉบับปิด ส.ค.–ต.ค. เท่าเดิม ' + dep0);
    ok(!G.errs.length, 'ไม่มี JS error' + (G.errs.length ? ' — ' + G.errs.slice(0, 3).join(' | ') : ''));
    G.w.close();
  }

  console.log(fail ? '\n✗ FAILED ' + fail : '\nALL PASSED');
  process.exit(fail ? 1 : 0);
})();
