// เทสประกันสังคม (สปส.) กับโค้ดจริงใน jjmk-payroll.html — งวดเริ่มหักรายคน employees.sso_start (เจ้าของสั่ง 2026-10-21)
// "อยากให้เพิ่มเงื่อนไข การหักเงินประกัน กับ ประกันสังคม ว่าเริ่มเดือนไหน เพราะมีพนักงานบางคนที่เพิ่งเริ่มหัก และหักมานานแล้ว"
// ค่าเริ่ม '' = หักทุกงวดที่ติ๊กเข้า สปส. แบบเดิมทุกบาท · ก่อนงวดเริ่ม = ไม่หักอัตโนมัติ · ✎ รายงวดยังมีผล
// เปลี่ยนงวดเริ่มที่ทำให้ยอด สปส. ของงวดที่จ่ายแล้วเปลี่ยน = บล็อก (ใส่ ✎ ตามสลิปก่อน) · ยกเว้นยอดลดลง + เจ้าของ/แอดมินยืนยันว่าสลิปจริงไม่ได้หัก + เหตุผล
const { boot, makeDB, SEED, wait } = require('./fakedb');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(!c) fail++; };
const ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const punRows = (code, from, to) => { const out = [];
  for(let d = new Date(from+'T12:00:00'); ymd(d) <= to; d.setDate(d.getDate()+1)){ const k = ymd(d);
    out.push({ emp_code:code, punch_date:k, punch_time:'08:58:00', device_sn:'' }, { emp_code:code, punch_date:k, punch_time:'18:02:00', device_sn:'' }); }
  return out; };
let pid = 1; const withId = rows => rows.map(r => Object.assign({ id: pid++ }, r));
const EMP = o => Object.assign({ full_name:(o.nick||'x')+' ทดสอบ', dept:'หน้าร้าน', position:'พนักงาน', branch:'JJLP', wage_type:'monthly', rate:12000, work_mode:'shift',
  shift_id:1, target_hours:10, active:true, must_work_exempt:true, off_count:0, off_weekdays:'', holiday_pay:true, deposit_on:true, deposit_target:3000, deposit_monthly:300,
  deposit_opening:0, deposit_target_v1:5000, deposit_monthly_v1:500, start_date:'2026-01-01', end_date:null, bank_name:'กสิกรไทย', bank_account:'1000000000',
  sso_on:true, sso_id:'1234567890123', birth_date:null, kbiz_added:true, nationality:'', deposit_start:'', sso_start:'' }, o);
const seed = (T, emps) => {
  T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:0, late_fine:0, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08', single_fine:200, month_divisor:30,
    must_work_days:'5,6,0', must_work_fine:400, sso_rate:5, sso_min:1650, sso_max:15000, sso_account:'' }];
  T.shifts = [{ id:1, name:'กะ', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1 }];
  for(const k of ['devices','deposit_entries','pvd_members','pvd_entries','pvd_payouts','adjustments','advances','holidays','payroll_audit','tips','mou_loans','mou_entries','doc_borrows','loans','loan_entries','fine_entries','sso_entries'])
    T[k] = T[k] || [];
  T.employees = emps;
  T.punches = withId(emps.flatMap(e => punRows(e.code, '2026-07-26', '2026-11-25')));
  // เงินประกัน ส.ค./ก.ย. 🔒 แล้วทุกคน (ไม่ให้เรื่องเงินประกันงวดก่อน ต.ค. ปน)
  T.deposit_entries = emps.flatMap(e => ['2026-08','2026-09'].map((p, i) => ({ id:e.id*10+i, employee_id:e.id, period:p, amount:500, note:'lock' })));
};
const dev = async (now, db, who) => { const A = boot({ now, db }); await wait(300); A.E(`AUTH=${JSON.stringify(who || { username:'o', role:'owner' })}; applyUser(AUTH); payLockAuto=false;`); await A.E(`loadAll()`); return A; };
const S = (X, id, p) => JSON.parse(X.E(`JSON.stringify((s=>({ded:s.ded,auto:s.auto,on:s.on,pre:s.pre||'',formula:s.formula??null,ov:!!s.override,wageBase:s.wageBase}))(calcPay(employees.find(e=>e.id===${id}),'${p}').sso))`));
const PS = ['2026-08','2026-09','2026-10','2026-11'];

(async () => {
  try{
  console.log('[1 ssoCalc: sso_start "" = เท่าเดิมทุกบาท (สุ่ม) · ก่อนงวดเริ่ม = ไม่หักอัตโนมัติ · ✎ ยังมีผล · ไม่มีช่อง pre/formula เมื่อไม่ได้ตั้ง]');
  { const A = boot({ now:'2027-01-20T12:00:00+07:00' }); const { E } = A; await wait(300); E(SEED);
    E(`ssoReady=true; settings.ssoRate=5; settings.ssoMin=1650; settings.ssoMax=15000;
       var OLD = function(emp, period, base){ const zero = { on: !!emp.ssoOn, ded:0, auto:0, employer:0, wageBase:0, override:null };
         if(!ssoReady || !emp.ssoOn || !(base > 0)) return zero;
         const ov = ssoEntries.find(x=>x.empId===emp.id && x.period===period) || null;
         const wageBase = Math.min(+(settings.ssoMax||15000), Math.max(+(settings.ssoMin||1650), base));
         const raw = wageBase * (+(settings.ssoRate||5)) / 100; const auto = Math.floor(raw) + ((raw - Math.floor(raw)) >= 0.5 ? 1 : 0);
         const ded = ov ? Math.max(0, +ov.amount) : auto; return { on:true, ded, auto, employer: ded, wageBase, override: ov }; };`);
    let n = 0, bad = 0, badPre = 0;
    for(let i = 0; i < 400; i++){
      const base = [0, 900, 1650, 9999, 12345, 15000, 22000, 7010][i % 8], on = i % 5 !== 0, ov = i % 3 === 0 ? [0, 250, 750][i % 9 % 3] : null;
      E(`var e1 = emp({ id:${i+1}, code:'S${i}', nick:'s${i}', sso_on:${on}, sso_start:'' }); ssoEntries = ${ov == null ? '[]' : `[{ id:1, empId:${i+1}, period:'2026-10', amount:${ov} }]`};`);
      for(const p of ['2026-09','2026-10','2026-11']){
        n++;
        if(E(`JSON.stringify(ssoCalc(e1,'${p}',${base}))`) !== E(`JSON.stringify(OLD(e1,'${p}',${base}))`)) bad++;
        // งวดเริ่ม = งวดนี้หรือก่อนหน้า → เท่าเดิม · หลังงวดนี้ → ไม่หักอัตโนมัติ (✎ ยังมีผล)
        const pre = JSON.parse(E(`e1.ssoStart='2026-11'; const r=JSON.stringify(ssoCalc(e1,'${p}',${base})); e1.ssoStart=''; r`));
        const old = JSON.parse(E(`JSON.stringify(OLD(e1,'${p}',${base}))`));
        const want = p >= '2026-11' || !old.on ? old.ded : (old.override ? old.ded : 0);
        if(pre.ded !== want || pre.employer !== want || (p < '2026-11' && old.on && base > 0 && (pre.pre !== '2026-11' || pre.formula !== old.auto || pre.auto !== 0))) { badPre++; if(badPre < 3) console.log('   PRE', i, p, JSON.stringify(pre), JSON.stringify(old)); }
      }
    }
    ok(bad === 0, `สุ่ม ${n} เคส (ฐาน 0/900/1,650/…/22,000 · ปิด/เปิด สปส. · ✎ 0/250/750) sso_start "" ต่างจากสูตรเดิม ${bad} เคส`);
    ok(badPre === 0, `ตั้งเริ่ม พ.ย.: ก.ย./ต.ค. ไม่หักอัตโนมัติ (✎ ยังมีผล · pre/formula บอกยอดตามสูตร) · พ.ย. เท่าเดิม — ผิด ${badPre} เคส`);
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  console.log('[2 "เอส" เข้า สปส. แต่เพิ่งเริ่มหัก ต.ค. (แอปคิด ส.ค./ก.ย. 600) — ผจก. บล็อก · เจ้าของยืนยัน "สลิปจริงไม่ได้หัก" + เหตุผล → ส.ค./ก.ย. 0 · ต.ค. 600 · จด 🕘 · ไฟล์ สปส. ก.ย. ไม่มีเอส]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'S1', nick:'เอส' }), EMP({ id:2, code:'L1', nick:'ลิด' })]);
    const M = await dev('2026-10-21T10:00:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'v', payroll:'v' } } });
    const b = PS.map(p => S(M, 1, p).ded);
    await M.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', '2026-10'); })()`); await wait(30);
    const al = M.io.alerts[0] || '';
    ok(M.E('startReady && ssoReady') === true && b.join() === '600,600,600,600' && T.employees[0].sso_start === '' &&
       /งวด ส\.ค\. 2569: หัก 600 → 0/.test(al) && /งวด ก\.ย\. 2569: หัก 600 → 0/.test(al) && /ใส่ยอดตามสลิปในช่อง "สมทบพนักงาน" \(✎\)/.test(al) && /ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al),
       'ผจก. (🧾 vae): ส.ค.–พ.ย. 600 → ตั้งเริ่ม ต.ค. = บล็อก + บอก "ใส่ยอดตามสลิปในช่อง สมทบพนักงาน (✎) ก่อน" ' + JSON.stringify(al.split('\n').slice(2, 5)));
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    A.io.promptAns = ['เพิ่งเริ่มหัก สปส. ต.ค.'];
    await A.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', '2026-10'); })()`); await wait(30);
    const c = A.io.confirms.find(m => /สลิปที่จ่ายจริงไม่ได้หัก/.test(m)) || '';
    const a = PS.map(p => S(A, 1, p));
    ok(/งวด ส\.ค\. 2569: หัก 600 → 0/.test(c) && /งวด ก\.ย\. 2569: หัก 600 → 0/.test(c) && T.employees[0].sso_start === '2026-10' &&
       a[0].ded === 0 && a[1].ded === 0 && a[1].pre === '2026-10' && a[1].formula === 600 && a[2].ded === 600 && a[3].ded === 600 && S(A, 2, '2026-08').ded === 600,
       'เจ้าของยืนยัน → DB sso_start 2026-10 · เอส ส.ค./ก.ย. 0 (ตามสูตร 600) · ต.ค./พ.ย. 600 · ลิดยัง 600 ' + JSON.stringify(a.map(x => x.ded)));
    const au = T.payroll_audit.filter(x => /ข้อยกเว้น สลิปจริงไม่ได้หัก: ส\.ค\. 69 600→0, ก\.ย\. 69 600→0 · เหตุผล: เพิ่งเริ่มหัก สปส\. ต\.ค\./.test(String(x.detail||'')));
    ok(au.length === 1 && /งวดเริ่มหัก สปส\. ของ เอส: ทุกงวด → ต\.ค\. 69/.test(au[0].detail), '🕘 จดข้อยกเว้น (เว้นวรรค "สปส. ของ" · R2): ' + (au[0] || {}).detail);
    // หน้า 🧾: คอลัมน์ "เริ่มหักงวด" + ป้าย "ยังไม่เริ่มหัก" (ดู ก.ย.) · ไฟล์ สปส. 1-10 ก.ย. มีแต่ลิด
    A.E(`go('sso'); refreshPeriodSelectors(); document.getElementById('ssoPeriodSel').value='2026-09'; renderSso();`);
    const sel = A.d.querySelector('#ssoTable select.emp-st[data-emp="1"]'), tr = sel && sel.closest('tr');
    ok(!!sel && sel.value === '2026-10' && sel.options[0].textContent === 'ทุกงวด' && /ยังไม่เริ่มหัก · เริ่ม ต\.ค\. 69/.test(tr.textContent) && /เริ่มหักงวด/.test(A.d.querySelector('#ssoTable thead').textContent),
       'หน้า 🧾 ก.ย.: ช่อง "เริ่มหักงวด" = ต.ค. 69 (ตัวเลือกแรก "ทุกงวด") · ป้าย "ยังไม่เริ่มหัก · เริ่ม ต.ค. 69"');
    A.io.files.length = 0; A.E(`exportSso()`);
    const f = A.io.files[0];
    ok(!!f && f.aoa.some(r => r[2] === 'ลิด ทดสอบ') && !f.aoa.some(r => r[2] === 'เอส ทดสอบ'), 'ไฟล์ สปส. 1-10 ก.ย.: มีลิด · ไม่มีเอส (ยังไม่เริ่มหัก)');
    // ✎ ก่อนงวดเริ่มยังมีผล + หน้าต่าง ✎ บอกว่าเป็นงวดก่อนเริ่มหัก
    A.io.promptAns = [null]; A.E(`editSso(1,'2026-09')`);
    ok(/ก่อนงวดเริ่มหักของคนนี้ \(ต\.ค\. 69\) — อัตโนมัติไม่หัก · ตามสูตร 600 บาท/.test(A.io.prompts[A.io.prompts.length - 1] || ''), 'หน้าต่าง ✎ ก.ย.: "ก่อนงวดเริ่มหักของคนนี้ (ต.ค. 69) — อัตโนมัติไม่หัก · ตามสูตร 600 บาท"');
    const bal = A.E(`(e=>dtBalances(e, calcPay(e,'2026-09'), '2026-09'))(employees.find(e=>e.id===1))`), info = A.E(`dtInfo(employees.find(e=>e.id===1))`);
    ok(/ยังไม่เริ่มหัก/.test(bal) && /เริ่มหักงวด ต\.ค\. 2569/.test(bal) && /เริ่มหักเงินสมทบ/.test(info) && /งวด ต\.ค\. 2569/.test(info), 'หน้ารายคน: กล่อง 🏥 "ยังไม่เริ่มหัก · เริ่มหักงวด ต.ค. 2569" · แท็บข้อมูลส่วนตัว "เริ่มหักเงินสมทบ งวด ต.ค. 2569"');
    ok(!M.errs.length && !A.errs.length, 'ไม่มี JS error (' + M.errs.concat(A.errs).slice(0,2).join(' | ') + ')');

    console.log('[3 เลื่อนงวดเริ่ม สปส. ย้อน = หักย้อนงวดที่จ่ายแล้ว → บล็อกแม้เป็นเจ้าของ · ใส่ ✎ ตามสลิปก่อนแล้วเปลี่ยนได้]');
    A.io.alerts.length = 0; A.io.confirms.length = 0;
    await A.E(`empStartSet(1, 'sso', '')`); await wait(30);
    const al2 = A.io.alerts[0] || '';
    ok(T.employees[0].sso_start === '2026-10' && /งวด ส\.ค\. 2569: หัก 0 → 600/.test(al2) && !/ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al2) && !A.io.confirms.length,
       'เอสเปลี่ยนกลับเป็น "ทุกงวด" = ส.ค./ก.ย. 0 → 600 → บล็อก (ไม่มีข้อยกเว้น) ' + JSON.stringify(al2.split('\n').slice(2, 4)));
    T.sso_entries.push({ id:501, employee_id:1, period:'2026-08', amount:0 }, { id:502, employee_id:1, period:'2026-09', amount:0 });   // ✎ งดหักตามสลิปจริง
    A.io.alerts.length = 0;
    await A.E(`empStartSet(1, 'sso', '')`); await wait(30);
    ok(T.employees[0].sso_start === '' && !A.io.alerts.length && S(A, 1, '2026-08').ded === 0 && S(A, 1, '2026-08').ov && S(A, 1, '2026-10').ded === 600 && A.io.confirms.length === 1,
       'ใส่ ✎ ส.ค./ก.ย. 0 ตามสลิปก่อน → เปลี่ยนกลับเป็น "ทุกงวด" ได้ · ส.ค. ยัง 0 (✎) · ต.ค. 600');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  console.log('[4 สปส. งวดที่จ่ายแล้ว ≥ ต.ค. เปลี่ยน (ข้อยกเว้นเจ้าของ) → สุทธิเปลี่ยน → 🔒 เงินประกัน ต.ค. ด้วยยอดเดิมก่อน (depPaidGuard)]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'S2', nick:'เอสสอง' })]);
    T.advances = [{ id:701, employee_id:1, period:'2026-10', amount:11200, taken_date:'2026-10-15', note:'' }];   // สุทธิตึง: เงินประกัน ต.ค. หักได้บางส่วน
    const A = await dev('2026-11-10T10:00:00+07:00', db);
    const p0 = JSON.parse(A.E(`JSON.stringify((x=>({net:x.net,dep:x.dep.ded,cap:x.dep.cap,sso:x.sso.ded}))(calcPay(employees[0],'2026-10')))`));
    A.io.promptAns = ['สลิป ต.ค. ไม่ได้หัก สปส.'];
    await A.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', '2026-11'); })()`); await wait(30);
    const r = (T.deposit_entries || []).find(x => x.employee_id === 1 && x.period === '2026-10');
    const p1 = JSON.parse(A.E(`JSON.stringify((x=>({net:x.net,dep:x.dep.ded,sso:x.sso.ded}))(calcPay(employees[0],'2026-10')))`));
    const c = A.io.confirms.join('\n---\n');
    ok(p0.sso === 600 && p0.dep === 200 && p0.cap === 'short' && T.employees[0].sso_start === '2026-11' && r && r.amount === 200 && /^lock/.test(r.note) && p1.sso === 0 && p1.dep === 200 &&
       /งวด ต\.ค\. 2569: หัก 600 → 0/.test(c) && /จะปิดยอดงวดที่จ่ายแล้วก่อน/.test(c),
       'ต.ค. เดิม: สปส. 600 · เงินประกันได้ 200 (สุทธิไม่พอ) → ยืนยันข้อยกเว้น → 🔒 เงินประกัน ต.ค. 200 ก่อน → หลังเปลี่ยน สปส. ต.ค. 0 แต่เงินประกัน ต.ค. ยัง 200 (ไม่เพิ่มย้อนหลัง) ' + JSON.stringify([p0, p1, r]));
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  console.log('[5 ยังไม่รัน jj_emp_start.sql: หน้า 🧾 ไม่มีคอลัมน์ · ตั้งค่าไม่ได้ · ยอดเท่าเดิม]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'S1', nick:'เอส' })]);
    for(const e of T.employees){ delete e.deposit_start; delete e.sso_start; }
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    A.E(`go('sso'); renderSso();`);
    await A.E(`empStartSet(1, 'sso', '2026-10')`);
    ok(A.E('startReady') === false && !A.d.querySelector('#ssoTable select.emp-st') && !/เริ่มหักงวด/.test(A.d.getElementById('ssoTable').innerHTML) && !('sso_start' in T.employees[0]) && S(A, 1, '2026-09').ded === 600 &&
       !/เริ่มหักเงินสมทบ/.test(A.E(`dtInfo(employees[0])`)),
       'ไม่มีช่อง sso_start: ไม่มีคอลัมน์/ช่องเลือก · ตั้งค่าไม่ได้ (บอกให้รัน SQL) · ก.ย. หัก 600 เท่าเดิม · แท็บข้อมูลไม่ขึ้นแถวงวดเริ่ม');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  // ===== ผลตรวจ R1 (2026-10-21) =====
  console.log('[6 (medium) ติ๊กเข้า สปส. (ผจก. 🧾) ให้คนที่สแกนตั้งแต่ ส.ค. → เสนอ "เริ่มหักงวด" = งวดแรกที่ยังไม่จ่าย ไปพร้อมกัน · ส.ค./ก.ย. ที่จ่ายแล้วไม่หักย้อน · R2: ไม่เอา = ผจก. ไม่บันทึก · เจ้าของคิดย้อนได้ + 🕘 งวด/ยอด]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'Q1', nick:'คิว', sso_on:false }), EMP({ id:2, code:'R1', nick:'อาร์', sso_on:false }), EMP({ id:3, code:'T1', nick:'ที', sso_on:false })]);
    const M = await dev('2026-10-21T10:00:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'v', payroll:'v' } } });
    const net9 = M.E(`calcPay(employees.find(e=>e.id===1),'2026-09').net`);
    const tick = async (X, id) => { X.E(`go('sso'); renderSso();`); const cb = X.d.querySelector('#ssoTable input[type=checkbox][onchange*="updSsoField(' + id + ',"]'); cb.checked = true; cb.dispatchEvent(new X.w.Event('change')); await wait(250); X.E(`renderSso()`); };
    await tick(M, 1);
    const c = M.io.confirms[0] || '', q = T.employees.find(e => e.id === 1);
    const s = ['2026-08','2026-09','2026-10'].map(p => S(M, 1, p).ded);
    ok(q.sso_on === true && q.sso_start === '2026-10' && /งวดที่จ่ายแล้ว \(ไม่มี ✎\) จะกลายเป็นหัก สปส\. ย้อนหลัง: ส\.ค\. 69 0 → 600 · ก\.ย\. 69 0 → 600/.test(c) && /ตั้ง "เริ่มหักงวด" ต\.ค\. 69 ไปพร้อมกัน/.test(c) &&
       /ยกเลิก = ไม่บันทึก · คนนี้หัก สปส\. มาตลอด \(เคยเอาติ๊กออก\) = กดยกเลิก แล้วให้เจ้าของ\/แอดมินติ๊กแบบคิดย้อน/.test(c) &&
       s.join() === '0,0,600' && M.E(`calcPay(employees.find(e=>e.id===1),'2026-09').net`) === net9 && !M.io.alerts.length &&
       T.payroll_audit.some(a => /เข้า สปส\. \+ งวดเริ่มหัก สปส\. ของ คิว: ทุกงวด → ต\.ค\. 69/.test(a.detail || '')),
       'ติ๊ก → ถามครั้งเดียว (บอก ส.ค./ก.ย. 0 → 600 · "ต.ค. 69") → sso_on + sso_start ต.ค. ใน update เดียว · สปส. ส.ค./ก.ย./ต.ค. = 0/0/600 · สลิป ก.ย. สุทธิเท่าเดิม ' + net9 + ' · จด 🕘 ' + JSON.stringify(s));
    // R2: ผจก. ไม่เอา "เริ่มหักงวด" = ไม่บันทึก (คิดย้อนงวดที่จ่ายแล้ว = เจ้าของ/แอดมินเท่านั้น · เดิมกดยืนยันคิดย้อนได้ + 🕘 จดแค่ sso_on)
    M.io.confirms.length = 0; M.io.confirmAns = () => false;
    await tick(M, 2);
    ok(T.employees.find(e => e.id === 2).sso_on === false && M.io.confirms.length === 1 && S(M, 2, '2026-08').ded === 0,
       'ผจก. ยกเลิกข้อเสนอ = ไม่บันทึก · ไม่มีหน้าต่าง "คิดย้อน" (ถาม 1 ครั้ง)');
    M.io.confirmAns = null;
    // เจ้าของ: ไม่เอา → ถาม "คิดย้อนในงวดที่จ่ายแล้วด้วย?" → ตกลง = แบบเดิม + 🕘 งวด/ยอดที่เปลี่ยน
    const O = await dev('2026-10-21T10:00:00+07:00', db);
    O.io.confirmAns = m => !/ตกลง = ตั้ง "เริ่มหักงวด"/.test(m);
    await tick(O, 2);
    const r = T.employees.find(e => e.id === 2), au = T.payroll_audit.filter(a => /แบบคิดย้อนงวดที่จ่ายแล้ว/.test(a.detail || ''));
    ok(r.sso_on === true && r.sso_start === '' && O.io.confirms.length === 2 && /ยกเลิก = ถามต่อ: คิดย้อนแบบเดิม/.test(O.io.confirms[0]) && /แบบคิดย้อนในงวดที่จ่ายแล้วด้วย/.test(O.io.confirms[1]) && S(O, 2, '2026-08').ded === 600 &&
       au.length === 1 && /เข้า สปส\. ของ อาร์ แบบคิดย้อนงวดที่จ่ายแล้ว \(เจ้าของ\/แอดมินยืนยันว่าสลิปหักจริง\): ส\.ค\. 69 0→600, ก\.ย\. 69 0→600/.test(au[0].detail),
       'เจ้าของ ยกเลิกข้อเสนอ → "คิดย้อน?" ตกลง = แบบเดิม (sso_start ว่าง · ส.ค. 600) + 🕘 ' + ((au[0] || {}).detail || ''));
    // เจ้าของยกเลิกทั้งสองหน้าต่าง = ไม่บันทึก
    O.io.confirms.length = 0; O.io.confirmAns = () => false;
    await tick(O, 3);
    ok(T.employees.find(e => e.id === 3).sso_on === false && O.io.confirms.length === 2, 'เจ้าของยกเลิกทั้งสองหน้าต่าง = ไม่บันทึก (ยังไม่เข้า สปส.)');
    O.io.confirmAns = null;
    ok(!M.errs.length && !O.errs.length, 'ไม่มี JS error (' + M.errs.concat(O.errs).slice(0,2).join(' | ') + ')');
  }

  console.log('[7 (high) 28 พ.ค. 70 (loadMonths 8): สแกนในเครื่องไม่ครบงวดที่จ่ายแล้วในช่วงที่เปลี่ยน แต่เครื่องที่เปิดใหม่โหลดถึง (มีงวดเงินประกันที่ยังไม่ 🔒) → บล็อก + บอก 🔄 · มี ✎ / โหลดครบแล้ว = ไม่ติด]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'S1', nick:'เอส' }), EMP({ id:2, code:'L1', nick:'ลิด', sso_on:false })]);
    T.punches = withId(['S1', 'L1'].flatMap(c => punRows(c, '2026-07-26', '2027-05-27')));
    T.deposit_entries = T.deposit_entries.filter(r => r.employee_id !== 2);   // ลิด: ส.ค./ก.ย. ยังไม่ 🔒 → เครื่องที่เปิดใหม่ย้อนหน้าต่างสแกนถึง ส.ค.
    const A = await dev('2027-05-28T10:00:00+07:00', db);
    const need = A.E(`punchSinceDate(null)`), own = A.E('punchSince');
    A.E(`punchSince = '2026-09-28'`);   // จำลองเครื่องที่หน้าต่างสแกนเริ่ม 28 ก.ย. (วันนี้ − 8 เดือน · แคช/รอบก่อนตัดสินว่าไม่ต้องย้อน)
    await A.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', '2027-05'); })()`); await wait(30);
    const al = A.io.alerts[0] || '';
    ok(need === '2026-07-26' && own === '2026-07-26' && T.employees[0].sso_start === '' && !A.io.confirms.length && /ที่ไม่มี ✎: ส\.ค\. 69, ก\.ย\. 69, ต\.ค\. 69\n/.test(al) &&
       /สแกนของงวดนี้ไม่อยู่ในเครื่องนี้ครบ/.test(al) && /กด 🔄/.test(al) && /ใส่ ✎ สปส\. งวดนั้นตามสลิปก่อน/.test(al),
       'เครื่องใหม่ย้อนถึง ' + need + ' · เครื่องนี้เริ่ม 28 ก.ย. → บล็อก ส.ค./ก.ย./ต.ค. (ต.ค. ได้สแกนไม่ครบงวด · ไม่มี ✎) + 🔄 · ไม่บันทึก ' + JSON.stringify(al.split('\n').slice(1, 3)));
    // ✎ ตามสลิปแล้ว = ยอดตายตัว → ไม่ติดตัวนี้
    T.sso_entries.push(...['2026-08','2026-09','2026-10'].map((p, i) => ({ id:71 + i, employee_id:1, period:p, amount:0 })));
    await A.E(`moneyFresh()`);
    ok(A.E(`empStartGap(employees.find(e=>e.id===1), 'sso', '', '2027-05').length`) === 0, 'มี ✎ ส.ค./ก.ย./ต.ค. แล้ว = ไม่ติด (ยอดไม่ขึ้นกับสแกน)');
    A.E(`punchSince = '2026-07-26'`);
    ok(A.E(`empStartGap(employees.find(e=>e.id===2), 'sso', '', '2027-05').length`) === 0, 'เครื่องที่สแกนครอบแล้ว (= เครื่องใหม่) = ไม่ติด (ตัดสินตามยอดก่อน/หลังแบบเดิม)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  // ===== ผลตรวจ R2 (2026-10-21) =====
  console.log('[8 (medium) ติ๊ก "เข้าประกันสังคม" ทางแท็บ 🪪 ข้อมูลส่วนตัว (saveInfo) = ถามงวดเริ่มแบบเดียวกับหน้า 🧾 (ssoTickAsk) · HR ยกเลิก = ไม่บันทึก · เจ้าของคิดย้อน = 🕘 งวด/ยอด]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'P1', nick:'พีไอ', sso_on:false }), EMP({ id:2, code:'P2', nick:'พีสอง', sso_on:false }), EMP({ id:3, code:'P3', nick:'พีสาม', sso_on:false })]);
    const piTick = async (X, id) => { await X.E(`(async()=>{ go('detail'); openDetailInfo(${id},'sso'); })()`); await wait(80);
      const cb = X.d.querySelector('#dtEditForm [data-pi="ssoOn"]'); if(!cb) return false; cb.checked = true; await X.E(`saveInfo()`); await wait(80); return true; };
    const H = await dev('2026-10-21T10:00:00+07:00', db, { username:'h', role:'staff', apps:{ payroll:{ detail:'ve', emp:'v' } } });
    const okCb = await piTick(H, 1);
    const p1 = T.employees.find(e => e.id === 1), c = H.io.confirms[0] || '';
    ok(okCb && p1.sso_on === true && p1.sso_start === '2026-10' && H.io.confirms.length === 1 && /ส\.ค\. 69 0 → 600 · ก\.ย\. 69 0 → 600/.test(c) && /ตั้ง "เริ่มหักงวด" ต\.ค\. 69 ไปพร้อมกัน/.test(c) &&
       ['2026-08','2026-09','2026-10'].map(p => S(H, 1, p).ded).join() === '0,0,600' && H.E(`employees.find(e=>e.id===1).ssoStart`) === '2026-10' &&
       T.payroll_audit.some(a => /เข้า สปส\. \+ งวดเริ่มหัก สปส\. ของ พีไอ: ทุกงวด → ต\.ค\. 69/.test(a.detail || '')),
       'HR (🪪 detail:ve) ติ๊ก "เข้าประกันสังคม" → ถาม 1 ครั้ง → sso_on + sso_start ต.ค. (update เดียว) · ส.ค./ก.ย./ต.ค. 0/0/600 · จด 🕘 (เดิม 600/600/600 เงียบ ๆ)');
    H.io.confirms.length = 0; H.io.confirmAns = () => false;
    await piTick(H, 2);
    ok(T.employees.find(e => e.id === 2).sso_on === false && H.io.confirms.length === 1 && /ยกเลิก = ไม่บันทึก/.test(H.io.confirms[0] || ''), 'HR ยกเลิก = ไม่บันทึก (ไม่มีทางคิดย้อน)');
    H.io.confirmAns = null;
    const O = await dev('2026-10-21T10:00:00+07:00', db);
    O.io.confirmAns = m => !/ตกลง = ตั้ง "เริ่มหักงวด"/.test(m);
    await piTick(O, 3);
    const p3 = T.employees.find(e => e.id === 3);
    ok(p3.sso_on === true && p3.sso_start === '' && O.io.confirms.length === 2 && S(O, 3, '2026-08').ded === 600 &&
       T.payroll_audit.some(a => /เข้า สปส\. ของ พีสาม แบบคิดย้อนงวดที่จ่ายแล้ว .*: ส\.ค\. 69 0→600, ก\.ย\. 69 0→600/.test(a.detail || '')),
       'เจ้าของ (🪪) ไม่เอางวดเริ่ม → คิดย้อน → ส.ค. 600 + 🕘 "แบบคิดย้อนงวดที่จ่ายแล้ว … ส.ค. 69 0→600, ก.ย. 69 0→600"');
    O.io.confirmAns = null;
    ok(!H.errs.length && !O.errs.length, 'ไม่มี JS error (' + H.errs.concat(O.errs).slice(0,2).join(' | ') + ')');
  }

  console.log('[9 (low) 6 พ.ย. ออฟฟิศเข้าใหม่ 1 ต.ค. (ต.ค. จ่ายแล้วยังไม่ 🔒) · บัญชี 🧾 อย่างเดียว: ติ๊ก → ตั้งเริ่ม พ.ย. = งวดที่จ่ายแล้วไม่เปลี่ยน → ไม่ติด 🔒 (เดิม depPaidGuard null บล็อก) · วันจ่ายออฟฟิศ 31 ต.ค. เสนอ พ.ย.]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'O1', nick:'ออฟใหม่', branch:'OFFICE', dept:'ออฟฟิศ', start_date:'2026-10-01', deposit_target_v1:null, deposit_monthly_v1:null, sso_on:false })]);
    T.punches = withId(punRows('O1', '2026-10-01', '2026-11-05')); T.deposit_entries = [];
    const U = await dev('2026-11-06T10:00:00+07:00', db, { username:'hr', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'v', payroll:'v' } } });
    const dep10 = U.E(`calcPay(employees[0],'2026-10').dep.ded`);
    await U.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',true); })()`); await wait(50);
    const o = T.employees[0];
    ok(U.E(`pdPaid(employees[0],'2026-10',bizToday())`) === true && o.sso_on === true && o.sso_start === '2026-11' && /ต\.ค\. 69 0 → 600/.test(U.io.confirms[0] || '') && /ตั้ง "เริ่มหักงวด" พ\.ย\. 69/.test(U.io.confirms[0] || '') &&
       !T.deposit_entries.length && S(U, 1, '2026-10').ded === 0 && S(U, 1, '2026-11').ded === 600 && U.E(`calcPay(employees[0],'2026-10').dep.ded`) === dep10,
       'บัญชี 🧾: ตั้งเริ่ม พ.ย. → บันทึกได้ (ไม่ต้อง 🔒 ต.ค. — ยอด ต.ค. ไม่เปลี่ยน) · สปส. ต.ค. 0 · พ.ย. 600 · ' + JSON.stringify([o.sso_on, o.sso_start, U.io.toasts.slice(-1)]));
    // วันจ่ายออฟฟิศ (31 ต.ค. 20:00): ต.ค. กำลังจ่าย → เสนองวดถัดไป (เดิมเสนอ ต.ค. = สปส. เข้าสลิปที่กำลังจ่ายวันนี้)
    const db2 = makeDB(), T2 = db2.T; seed(T2, [EMP({ id:1, code:'O1', nick:'ออฟใหม่', branch:'OFFICE', dept:'ออฟฟิศ', start_date:'2026-09-01', deposit_target_v1:null, deposit_monthly_v1:null, sso_on:false })]);
    T2.punches = withId(punRows('O1', '2026-09-01', '2026-10-31')); T2.deposit_entries = [];
    const V = await dev('2026-10-31T20:00:00+07:00', db2);
    ok(V.E(`empFirstOpen(employees[0])`) === '2026-11' && V.E(`pdPaid(employees[0],'2026-10',bizToday())`) === false, 'วันจ่ายออฟฟิศ 31 ต.ค.: empFirstOpen = พ.ย. (ต.ค. กำลังจ่าย · เกณฑ์เดียวกับ depStartFwd)');
    await V.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',true); })()`); await wait(50);
    ok(T2.employees[0].sso_start === '2026-11' && /ต\.ค\. 69 0 → 600/.test(V.io.confirms[0] || '') && S(V, 1, '2026-10').ded === 0, 'วันจ่ายออฟฟิศ: ติ๊ก → หน้าต่างนับ ต.ค. เป็นงวดที่จ่ายแล้ว + เสนอ พ.ย. → ต.ค. 0');
    // empStartSet สปส. วันจ่ายออฟฟิศ: ยอด ต.ค. (กำลังจ่าย) จะเปลี่ยน = บล็อก
    V.io.alerts.length = 0;
    await V.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', ''); })()`); await wait(30);
    ok(T2.employees[0].sso_start === '2026-11' && /วันนี้วันจ่ายเงินเดือนงวด ต\.ค\. 2569 \(หัก 0 → 600\)/.test(V.io.alerts[0] || ''), 'วันจ่ายออฟฟิศ: เปลี่ยนงวดเริ่ม สปส. ที่ทำให้ ต.ค. เปลี่ยน = บล็อก "วันนี้วันจ่ายเงินเดือน"');
    ok(!U.errs.length && !V.errs.length, 'ไม่มี JS error (' + U.errs.concat(V.errs).slice(0,2).join(' | ') + ')');
  }
  // ===== ผลตรวจ R3 (2026-10-21) =====
  console.log('[10 (high) เอาติ๊ก สปส. ออกแล้วติ๊กกลับ (ผจก. 🧾 / HR 🪪): ถาม "สลิปงวดเหล่านี้หัก สปส. จริงไหม" (R4) → ตกลง = ✎ ยอดเดิม → ติ๊กกลับ 600/600/600 เท่า main · ไม่ถามหักย้อน · ไม่ตั้งงวดเริ่ม · 🕘 ✎ กลับมานับ]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'U1', nick:'ยู' }), EMP({ id:2, code:'U2', nick:'ยูสอง' })]);
    const MP = { username:'m', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'v', payroll:'v' } } };
    const M = await dev('2026-10-21T10:00:00+07:00', db, MP);
    const net9 = M.E(`calcPay(employees.find(e=>e.id===1),'2026-09').net`), b = ['2026-08','2026-09','2026-10'].map(p => S(M, 1, p).ded);
    await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    const off = ['2026-08','2026-09','2026-10'].map(p => S(M, 1, p).ded), ov = T.sso_entries.filter(r => r.employee_id === 1).map(r => r.period + ':' + r.amount).sort();
    const q1 = M.io.confirms.filter(m => /สลิปงวดเหล่านี้หัก สปส\. จริงไหม/.test(m));
    ok(b.join() === '600,600,600' && off.join() === '0,0,0' && T.employees[0].sso_on === false && ov.join() === '2026-08:600,2026-09:600' &&
       q1.length === 1 && /ส\.ค\. 69 600 · ก\.ย\. 69 600/.test(q1[0]) && /ตกลง = หักจริง → จด ✎ ยอดนี้ไว้/.test(q1[0]) && /ยกเลิก = ไม่ได้หัก \/ ติ๊กผิดคน \/ ไม่แน่ใจ → ถามต่อ/.test(q1[0]) &&
       T.payroll_audit.some(a => /เอาติ๊ก สปส\. ออก ยู · ยืนยันว่าสลิปงวดที่จ่ายแล้วหักจริง → ✎ ส\.ค\. 69 600, ก\.ย\. 69 600/.test(a.detail || '')),
       'เอาติ๊กออก → ถาม 1 ครั้ง (ส.ค./ก.ย. 600 · ตกลง = จด ✎) → ✎ ส.ค./ก.ย. 600 (ต.ค. ยังไม่จ่าย = ไม่เขียน) · ระหว่างไม่ติ๊ก 0/0/0 เท่า main · 🕘 ' + JSON.stringify(ov));
    M.io.confirms.length = 0;
    await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',true); })()`); await wait(50);
    const on = ['2026-08','2026-09','2026-10'].map(p => S(M, 1, p).ded);
    ok(T.employees[0].sso_on === true && T.employees[0].sso_start === '' && on.join() === '600,600,600' && M.E(`calcPay(employees.find(e=>e.id===1),'2026-09').net`) === net9 &&
       !M.io.confirms.some(m => /จะกลายเป็นหัก สปส\. ย้อนหลัง/.test(m)) && !T.payroll_audit.some(a => /งวดที่จ่ายแล้วไม่หักย้อน/.test(a.detail || '')) &&
       T.payroll_audit.some(a => /เข้า สปส\. ของ ยู · งวดที่จ่ายแล้วที่ยอดเปลี่ยน: ส\.ค\. 69 0→600 \(✎\), ก\.ย\. 69 0→600 \(✎\)/.test(a.detail || '')),
       'ติ๊กกลับ: ไม่ถาม "หักย้อน" · sso_start ว่าง · 600/600/600 · สุทธิ ก.ย. เท่าเดิม ' + net9 + ' · 🕘 "งวดที่จ่ายแล้วที่ยอดเปลี่ยน: ส.ค. 69 0→600 (✎) …" ' + JSON.stringify(on));
    // เอาออก 21 ต.ค. แล้วติ๊กกลับ 10 ธ.ค.: ต.ค./พ.ย. จ่ายตอนไม่ได้เข้า (สลิปไม่หัก) → ถามเฉพาะ ต.ค./พ.ย. · ตกลง = เริ่ม ธ.ค. · ส.ค./ก.ย. ยัง 600 (✎)
    await M.E(`(async()=>{ go('sso'); await updSsoField(2,'sso_on',false); })()`); await wait(50);
    T.punches.push(...withId(punRows('U2', '2026-11-26', '2026-12-09')));
    const L = await dev('2026-12-10T10:00:00+07:00', db, MP);
    await L.E(`(async()=>{ go('sso'); await updSsoField(2,'sso_on',true); })()`); await wait(50);
    const c = L.io.confirms.find(m => /ย้อนหลัง/.test(m)) || '', z = ['2026-08','2026-09','2026-10','2026-11','2026-12'].map(p => S(L, 2, p).ded);
    const auS = T.payroll_audit.map(a => a.detail || '').find(d => /เข้า สปส\. \+ งวดเริ่มหัก สปส\. ของ ยูสอง/.test(d)) || '';
    ok(T.employees[1].sso_on === true && T.employees[1].sso_start === '2026-12' && /ย้อนหลัง: ต\.ค\. 69 0 → 600 · พ\.ย\. 69 0 → 600\n✎ ที่จดไว้ \(ยอดตามสลิป\) จะกลับมานับ: ส\.ค\. 69 0 → 600 · ก\.ย\. 69 0 → 600/.test(c) && z.join() === '600,600,0,0,600' &&
       /คนนี้หัก สปส\. มาตลอด \(เคยเอาติ๊กออก\) = กดยกเลิก แล้วให้เจ้าของ\/แอดมินติ๊กแบบคิดย้อน/.test(c) &&
       /ทุกงวด → ธ\.ค\. 69 · งวดที่จ่ายแล้วที่ยอดเปลี่ยน: ส\.ค\. 69 0→600 \(✎\), ก\.ย\. 69 0→600 \(✎\)/.test(auS) && !/ไม่หักย้อน/.test(auS),
       'ติ๊กกลับ 10 ธ.ค.: หักย้อน ต.ค./พ.ย. (ไม่มี ✎) + บอก ✎ ส.ค./ก.ย. ที่จะกลับมานับ (R4) → เริ่ม ธ.ค. · 600/600/0/0/600 · 🕘 จดงวดที่จ่ายแล้วที่ยอดเปลี่ยน (ไม่เขียน "ไม่หักย้อน") ' + JSON.stringify(z));
    // ทาง 🪪 (HR detail:ve · saveInfo)
    const db2 = makeDB(), T2 = db2.T; seed(T2, [EMP({ id:1, code:'H1', nick:'เอช' })]);
    const H = await dev('2026-10-21T10:00:00+07:00', db2, { username:'h', role:'staff', apps:{ payroll:{ detail:'ve', emp:'v' } } });
    const pi = async v => { await H.E(`(async()=>{ go('detail'); openDetailInfo(1,'sso'); })()`); await wait(80);
      const cb = H.d.querySelector('#dtEditForm [data-pi="ssoOn"]'); cb.checked = v; await H.E(`saveInfo()`); await wait(80); };
    await pi(false);
    const ov2 = T2.sso_entries.map(r => r.period + ':' + r.amount).sort();
    await pi(true);
    ok(ov2.join() === '2026-08:600,2026-09:600' && T2.employees[0].sso_on === true && T2.employees[0].sso_start === '' && ['2026-08','2026-09','2026-10'].map(p => S(H, 1, p).ded).join() === '600,600,600' &&
       !H.io.confirms.some(m => /ย้อนหลัง/.test(m)) && H.io.confirms.filter(m => /สลิปงวดเหล่านี้หัก สปส\. จริงไหม/.test(m)).length === 1,
       'HR (🪪): เอาออก → ถามแบบเดียวกับ 🧾 → ✎ ส.ค./ก.ย. 600 → ติ๊กกลับ 600/600/600 · ไม่ถามหักย้อน ' + JSON.stringify(ov2));
    ok(!M.errs.length && !L.errs.length && !H.errs.length, 'ไม่มี JS error (' + M.errs.concat(L.errs, H.errs).slice(0,2).join(' | ') + ')');
  }

  console.log('[11 (high) ยังไม่รัน jj_emp_start.sql: เอาติ๊กออกไม่ถาม/ไม่เขียน ✎ (เท่า main) · R4: ✎ ที่เครื่องนี้ยังไม่เห็น = อ่านใหม่ก่อน (ไม่ชน) · อ่าน/เขียนไม่ได้ = ไม่เอาติ๊กออก + "ลากหน้าลงแล้วลองใหม่"]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'W1', nick:'ดับบลิว' })]);
    for(const e of T.employees){ delete e.deposit_start; delete e.sso_start; }
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    await A.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    ok(A.E('startReady') === false && T.employees[0].sso_on === false && !T.sso_entries.length && !A.io.confirms.some(m => /สปส/.test(m)), 'ยังไม่รัน SQL: เอาติ๊กออก = แบบเดิม (ไม่ถาม · ไม่มี ✎)');
    const db2 = makeDB(), T2 = db2.T; seed(T2, [EMP({ id:1, code:'W2', nick:'ดับบลิวสอง' })]);
    T2.sso_entries = [{ id:9, employee_id:1, period:'2026-09', amount:600 }];
    const B = await dev('2026-10-21T10:00:00+07:00', db2);
    db2.T.sso_entries.push({ id:10, employee_id:1, period:'2026-08', amount:0 });   // อีกเครื่องใส่ ✎ ส.ค. 0 ระหว่างนั้น (เครื่องนี้ยังไม่เห็น — realtime หลุด)
    await B.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    ok(T2.employees[0].sso_on === false && T2.sso_entries.map(r => r.period + ':' + r.amount).sort().join() === '2026-08:0,2026-09:600' && !B.io.confirms.some(m => /จริงไหม/.test(m)) &&
       B.E(`ssoEntries.filter(x=>x.empId===1).length`) === 2,
       'อ่าน ✎ ของคนนี้ใหม่ก่อน (เห็น ✎ ส.ค. 0 ของอีกเครื่อง) → ไม่มีงวดต้องถาม → เอาติ๊กออกได้ · ✎ เดิมไม่ถูกทับ (เดิมชน duplicate key ทุกครั้ง) ' + JSON.stringify(T2.sso_entries.map(r => r.period + ':' + r.amount)));
    const db3 = makeDB(), T3 = db3.T; seed(T3, [EMP({ id:1, code:'W3', nick:'ดับบลิวสาม' })]);
    const C = await dev('2026-10-21T10:00:00+07:00', db3), tst = () => C.d.getElementById('toast').textContent;
    db3.wfail = (t, op) => t === 'sso_entries' ? { message:'network error' } : null;
    await C.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    const t1 = tst();
    db3.wfail = null; db3.fail.sso_entries = { message:'timeout' };
    await C.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    const t2 = tst(); delete db3.fail.sso_entries;
    ok(T3.employees[0].sso_on === true && !T3.sso_entries.length && /ลากหน้าลงแล้วลองใหม่ \(ยังไม่ได้เอาติ๊กออก\)/.test(t1) && /^❌ จด ✎ สปส\./.test(t1) &&
       /^❌ อ่าน ✎ สปส\. ของ ดับบลิวสาม ไม่ได้ — ลากหน้าลงแล้วลองใหม่/.test(t2),
       'เขียน ✎ ไม่ได้ / อ่าน ✎ ไม่ได้ = ไม่เอาติ๊กออก (sso_on ยัง true) + ข้อความไทย "ลากหน้าลงแล้วลองใหม่" ' + JSON.stringify([t1.split('\n')[0], t2]));
    ok(!A.errs.length && !B.errs.length && !C.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs, C.errs).slice(0,2).join(' | ') + ')');
  }

  console.log('[12 (low) หน้า 🧾 งวดก่อนงวดเริ่มรายคน: สรุป "เข้า"/ฐานรวม ไม่นับคนที่ยังไม่เริ่มหัก (ตรงไฟล์ 1-10) + สถิติ "ยังไม่เริ่มหัก" · ชิปไม่ขึ้นเมื่อมี ✎ · ช่องเลือกอยู่ใต้ชื่อ (ไม่เพิ่มคอลัมน์) คลิกแล้วไม่เปิดหน้าพนักงาน]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'S1', nick:'เอส', sso_start:'2026-10' }), EMP({ id:2, code:'L1', nick:'ลิด' }), EMP({ id:3, code:'V1', nick:'วี', sso_start:'2026-10' })]);
    T.sso_entries = [{ id:5, employee_id:3, period:'2026-09', amount:750 }];
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    A.E(`go('sso'); refreshPeriodSelectors(); document.getElementById('ssoPeriodSel').value='2026-09'; renderSso();`);
    const st = [...A.d.querySelectorAll('#ssoStats .stat')].map(x => x.querySelector('.v').textContent + '|' + x.querySelector('.l').textContent);
    A.io.files.length = 0; A.E(`exportSso()`);
    const f = A.io.files[0], tot = f && f.aoa.find(r => /^รวม \d+ คน$/.test(String(r[2] || '')));
    ok(st[0] === '2|เข้าประกันสังคม' && st[1] === '0|ไม่เข้า' && st[2] === '1|ยังไม่เริ่มหัก (งวดนี้)' && st[3] === '24,000 ฿|ฐานค่าจ้างรวม' && tot && tot[2] === 'รวม 2 คน' && tot[4] === 24000,
       'ก.ย.: เข้า 2 (ลิด + วี ✎ 750) · ยังไม่เริ่มหัก 1 (เอส) · ฐานรวม 24,000 = ไฟล์ 1-10 "รวม 2 คน · 24,000" ' + JSON.stringify([st.slice(0, 4), tot]));
    const tr = id => A.d.querySelector('#ssoTable select.emp-st[data-emp="' + id + '"]').closest('tr');
    ok(/ยังไม่เริ่มหัก · เริ่ม ต\.ค\. 69/.test(tr(1).textContent) && !/ยังไม่เริ่มหัก/.test(tr(3).textContent) && /✎/.test(tr(3).textContent),
       'ชิป "ยังไม่เริ่มหัก" ขึ้นที่เอส · วีมี ✎ 750 (หักจริง) = ไม่ขึ้นชิป');
    const ths = A.d.querySelectorAll('#ssoTable thead th').length, sel = A.d.querySelector('#ssoTable select.emp-st[data-emp="1"]');
    ok(ths === 9 && !!sel.closest('td.mc-name') && /เริ่มหักงวด/.test(A.d.querySelector('#ssoTable thead th').textContent), 'ช่องเลือกอยู่ใต้ชื่อพนักงาน · หัวตาราง 9 คอลัมน์ (เท่าเดิม) · หัวคอลัมน์ชื่อ "พนักงาน · เริ่มหักงวด"');
    sel.dispatchEvent(new A.w.MouseEvent('click', { bubbles:true }));
    ok(A.E('curPage()') === 'sso', 'คลิกช่องเลือกไม่เปิดหน้าพนักงาน (อยู่หน้า 🧾)');
    A.E(`document.getElementById('ssoPeriodSel').value='2026-10'; renderSso();`);
    ok(![...A.d.querySelectorAll('#ssoStats .l')].some(x => /ยังไม่เริ่มหัก/.test(x.textContent)), 'ต.ค. (ไม่มีคนก่อนงวดเริ่ม) = ไม่มีสถิติ "ยังไม่เริ่มหัก" (หน้าตาเดิม)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }

  console.log('[13 (low) ข้อความ: เลื่อนงวดเริ่ม สปส. ย้อน (0 → 600) ไม่บอกว่า "ตามยอดเดิม" · เจ้าของติ๊กเข้า: "ยกเลิก = ถามต่อ: คิดย้อนแบบเดิม"]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'G1', nick:'เก่า', sso_start:'2026-10' }), EMP({ id:2, code:'G2', nick:'ใหม่', sso_on:false })]);
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    await A.E(`(async()=>{ go('sso'); await empStartSet(1, 'sso', ''); })()`); await wait(30);
    const al = A.io.alerts[0] || '';
    ok(T.employees[0].sso_start === '2026-10' && /หัก 0 → 600/.test(al) && !/ตามยอดเดิม/.test(al) && /สลิปจริงหักงวดนั้น \(ยอดใหม่\)/.test(al) && /สลิปจริงไม่ได้หัก = เลือกงวดเริ่มที่ยังไม่จ่าย/.test(al),
       'บล็อกเลื่อนย้อน: "สลิปจริงหักงวดนั้น (ยอดใหม่)" + "ไม่ได้หัก = เลือกงวดเริ่มที่ยังไม่จ่าย" (ไม่ใช่ "ตามยอดเดิม") ' + JSON.stringify(al.split('\n').slice(4)));
    A.io.confirmAns = () => false;
    await A.E(`(async()=>{ go('sso'); await updSsoField(2,'sso_on',true); })()`); await wait(50);
    ok(/ยกเลิก = ถามต่อ: คิดย้อนแบบเดิม \(สลิปงวดนั้นหัก สปส\. จริง/.test(A.io.confirms[0] || '') && T.employees[1].sso_on === false, 'เจ้าของ: "ยกเลิก = ถามต่อ: คิดย้อนแบบเดิม (สลิปงวดนั้นหัก สปส. จริง …)"');
    A.io.confirmAns = null;
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  console.log('[14 (high · R4) เคสจริง 9 คนที่ถูกติ๊กก่อนอัปเดต (sso_start ว่าง · แอปคิด ส.ค./ก.ย. 600 ทั้งที่สลิปไม่ได้หัก): เอาติ๊กออก "ไม่ได้หัก" = ไม่จด ✎ → ติ๊กกลับเสนอเริ่ม ต.ค. → 0/0/600 · ยกเลิกทั้งหมด = ไม่บันทึก · "หักจริง" แล้วเจ้าของตั้งเริ่ม = หน้าต่างบอก ✎ ที่ยังนับ]');
  { const MP = { username:'m', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'v', payroll:'v' } } };
    const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'N1', nick:'นิว' })]);
    const M = await dev('2026-10-21T10:00:00+07:00', db, MP);
    // ยกเลิกทั้งสองหน้าต่าง = ไม่บันทึกอะไร
    M.io.confirmAns = () => false;
    await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    const cx = M.io.confirms.slice();
    ok(T.employees[0].sso_on === true && !T.sso_entries.length && cx.length === 2 && /สลิปงวดเหล่านี้หัก สปส\. จริงไหม/.test(cx[0]) &&
       /เอาติ๊ก สปส\. ออกจาก นิว โดยไม่จด ✎\?/.test(cx[1]) && /ยกเลิก = ไม่บันทึกอะไร \(ยังติ๊กอยู่\)/.test(cx[1]) && !T.payroll_audit.some(a => /เอาติ๊ก สปส/.test(a.detail || '')),
       'ยกเลิก → ถามต่อ "เอาติ๊กออกโดยไม่จด ✎?" → ยกเลิก = ไม่บันทึกอะไร (ยังติ๊กอยู่ · ไม่มี ✎)');
    // ไม่ได้หัก (หน้าต่างแรกยกเลิก · หน้าต่างสองตกลง) = เอาติ๊กออกไม่จด ✎
    M.io.confirms.length = 0; M.io.confirmAns = m => !/จริงไหม/.test(m);
    await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    const tO = M.d.getElementById('toast').textContent;
    ok(T.employees[0].sso_on === false && !T.sso_entries.length && /ไม่จด ✎ — งวดที่จ่ายแล้ว ส\.ค\. 69, ก\.ย\. 69 เป็น 0/.test(tO) &&
       T.payroll_audit.some(a => /เอาติ๊ก สปส\. ออก นิว · สลิปไม่ได้หัก\/ติ๊กผิดคน — ไม่จด ✎: ส\.ค\. 69 600→0, ก\.ย\. 69 600→0/.test(a.detail || '')),
       'ไม่ได้หัก → เอาติ๊กออกโดยไม่จด ✎ · toast + 🕘 "สลิปไม่ได้หัก/ติ๊กผิดคน — ไม่จด ✎: ส.ค. 69 600→0, ก.ย. 69 600→0"');
    // ติ๊กกลับ = ระบบเสนอเริ่ม ต.ค. (ไม่มี ✎ ค้าง) → 0/0/600 เท่าเจ้าของตั้งตรง ๆ
    M.io.confirms.length = 0; M.io.confirmAns = null;
    await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',true); })()`); await wait(50);
    const z = PS.slice(0, 3).map(p => S(M, 1, p).ded);
    ok(T.employees[0].sso_on === true && T.employees[0].sso_start === '2026-10' && z.join() === '0,0,600' && /ส\.ค\. 69 0 → 600 · ก\.ย\. 69 0 → 600/.test(M.io.confirms[0] || '') &&
       !/จะกลับมานับ/.test(M.io.confirms[0] || '') && M.E(`calcPay(employees.find(e=>e.id===1),'2026-09').net`) === 11500 &&
       T.payroll_audit.some(a => /เข้า สปส\. \+ งวดเริ่มหัก สปส\. ของ นิว: ทุกงวด → ต\.ค\. 69 \(งวดที่จ่ายแล้วไม่หักย้อน\)/.test(a.detail || '')),
       'ติ๊กกลับ → เสนอเริ่ม ต.ค. → ส.ค./ก.ย./ต.ค. 0/0/600 · สุทธิ ก.ย. 11500 (เท่าเจ้าของตั้งเริ่มตรง ๆ — เดิม ✎ 600 ค้างถาวร) ' + JSON.stringify(z));
    // "หักจริง" แล้วเจ้าของตั้งเริ่ม ต.ค. = หน้าต่างบอก ✎ ที่ยังนับ (แทน "ยอดไม่เปลี่ยน")
    const db2 = makeDB(), T2 = db2.T; seed(T2, [EMP({ id:1, code:'N2', nick:'นิวสอง' })]);
    const M2 = await dev('2026-10-21T10:00:00+07:00', db2, MP);
    await M2.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',false); })()`); await wait(50);
    await M2.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',true); })()`); await wait(50);
    const O = await dev('2026-10-21T10:05:00+07:00', db2);
    await O.E(`(async()=>{ go('sso'); await empStartSet(1,'sso','2026-10'); })()`); await wait(50);
    const c = O.io.confirms.find(m => /งวดเริ่มหัก สปส\. ของ นิวสอง/.test(m)) || '';
    ok(T2.sso_entries.length === 2 && T2.employees[0].sso_start === '2026-10' && /ℹ️ ✎ ส\.ค\. 69 600 · ก\.ย\. 69 600 \(ยอดตามสลิป\) ยังนับแม้อยู่ก่อนงวดเริ่ม/.test(c) &&
       /สลิปไม่ได้หัก = แก้ ✎ เป็น 0 ที่หน้า 🧾/.test(c) && !/ยอดของงวดที่มีข้อมูลตอนนี้ไม่เปลี่ยน/.test(c) && !/\n\n/.test(c.split('⚠️ ทุกเครื่อง')[0]),
       'จด ✎ (หักจริง) แล้วเจ้าของตั้งเริ่ม ต.ค. → หน้าต่างบอก "✎ ส.ค./ก.ย. 600 ยังนับแม้อยู่ก่อนงวดเริ่ม · สลิปไม่ได้หัก = แก้ ✎ เป็น 0 ที่หน้า 🧾" (ไม่ขึ้น "ยอดไม่เปลี่ยน") ' + JSON.stringify(c.split('\n').slice(0, 3)));
    ok(!M.errs.length && !M2.errs.length && !O.errs.length, 'ไม่มี JS error (' + M.errs.concat(M2.errs, O.errs).slice(0,2).join(' | ') + ')');
  }

  console.log('[15 (medium · R4) คนที่หักมานาน สแกนในฐานข้อมูลเก่ากว่าช่วงโหลด (punchSince กลางงวด ก.พ.): เอาติ๊กออก (หักจริง) → ติ๊กกลับเอง (ผจก.) ไม่ถามหักย้อน · ไม่ตั้งงวดเริ่ม · ทุกงวดเท่าเดิม (🧾 + 🪪)]');
  { const MP = { username:'m', role:'staff', apps:{ payroll:{ sso:'vae', emp:'v', detail:'ve', payroll:'v' } } };
    for(const via of ['sso', 'detail']){
      const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'L1', nick:'แอล' })]);
      T.punches.push(...withId(punRows('L1', '2026-01-01', '2026-07-25')));
      const M = await dev('2026-10-21T10:00:00+07:00', db, MP);
      const ps = JSON.parse(M.E(`JSON.stringify(allPeriods().filter(p => p <= '2026-10').sort())`)), since = M.E('punchSince');
      const b = ps.map(p => S(M, 1, p).ded);
      const tick = async v => { if(via === 'sso'){ await M.E(`(async()=>{ go('sso'); await updSsoField(1,'sso_on',${v}); })()`); await wait(50); return; }
        await M.E(`(async()=>{ go('detail'); openDetailInfo(1,'sso'); })()`); await wait(80);
        const cb = M.d.querySelector('#dtEditForm [data-pi="ssoOn"]'); cb.checked = v; await M.E(`saveInfo()`); await wait(80); };
      await tick(false);
      const ov = T.sso_entries.map(r => r.period).sort();
      M.io.confirms.length = 0;
      await tick(true);
      const a = ps.map(p => S(M, 1, p).ded);
      ok(since > '2026-01-26' && ps[0] === '2026-02' && !ov.includes('2026-02') && ov.includes('2026-03') && T.employees[0].sso_on === true && T.employees[0].sso_start === '' &&
         !M.io.confirms.some(m => /ย้อนหลัง/.test(m)) && a.join() === b.join(),
         `[${via}] punchSince ${since} · ✎ ${ov[0]}…${ov[ov.length-1]} (ก.พ. สแกนไม่ครบงวด = ไม่จด) · ติ๊กกลับไม่ถาม (ก.พ. ไม่นับเป็นหักย้อน — เกณฑ์เดียวกัน) · sso_start ว่าง · ทุกงวดเท่าเดิม ` + JSON.stringify(a));
      ok(!M.errs.length, 'ไม่มี JS error (' + M.errs.slice(0,2).join(' | ') + ')');
    }
  }

  console.log('[16 (low · R4) หน้า 🧾 มือถือ (การ์ด): ป้ายติ๊ก "เข้า สปส." เป็น .dep-sw (≥44px · ช่องติ๊ก 22px) · คนไม่เข้า สปส. ซ่อนช่อง "–" (mc-na) · ยังไม่รัน SQL = ตารางเดิม]');
  { const db = makeDB(), T = db.T; seed(T, [EMP({ id:1, code:'I1', nick:'อิน' }), EMP({ id:2, code:'O1', nick:'เอาท์', sso_on:false })]);
    const A = await dev('2026-10-21T10:00:00+07:00', db);
    A.E(`go('sso'); renderSso();`);
    const tr2 = [...A.d.querySelectorAll('#ssoTable tbody tr')].find(r => /เอาท์/.test(r.textContent)), tr1 = [...A.d.querySelectorAll('#ssoTable tbody tr')].find(r => /อิน/.test(r.textContent));
    ok(!!tr1 && !!tr2 && tr1.querySelector('label.dep-sw input[type=checkbox]') && tr2.querySelectorAll('td.mc-na').length === 4 && !tr1.querySelector('td.mc-na') &&
       [...tr2.querySelectorAll('td.mc-na')].every(td => td.textContent.trim() === '–'),
       'การ์ด: ช่องติ๊กอยู่ใน label.dep-sw · เอาท์ (ไม่เข้า) ซ่อน 4 ช่อง "–" · อิน (เข้า) ไม่ซ่อน');
    const db2 = makeDB(), T2 = db2.T; seed(T2, [EMP({ id:1, code:'I2', nick:'อินสอง', sso_on:false })]);
    for(const e of T2.employees){ delete e.deposit_start; delete e.sso_start; }
    const B = await dev('2026-10-21T10:00:00+07:00', db2);
    B.E(`go('sso'); renderSso();`);
    ok(!B.d.querySelector('#ssoTable .dep-sw') && !B.d.querySelector('#ssoTable .mc-na'), 'ยังไม่รัน jj_emp_start.sql: ไม่มี .dep-sw / mc-na (ตารางเดิมทุกตัวอักษร)');
    ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
  }
  }catch(e){ console.log('CRASH', e.stack); fail++; }
  console.log(fail ? fail+' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
