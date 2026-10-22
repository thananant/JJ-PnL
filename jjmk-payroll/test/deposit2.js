// เทสเงินประกันกติกาใหม่ (เจ้าของสั่ง 2026-10-20) กับโค้ดจริงใน jjmk-payroll.html (jsdom + ฐานข้อมูลจำลอง + นาฬิกาจำลอง)
// เป้า 3,000 หัก 300 ตั้งแต่งวด 2026-10 ต่อจากยอดสะสม · งวดก่อนใช้ _v1 · 🔒 ปิดยอด · 💸 คืนส่วนเกิน · ล็อกก่อนแก้ · โหลดเกิน 1,000 แถว · เขียนไม่ทับ
const { boot, SEED, wait } = require('./fakedb');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(!c) fail++; };
const OLD = `function depositCalcOld(emp, period){
  const target = +(emp.depTarget||0);
  const base = { target, override:null };
  if(!target || emp.depOn===false)
    return { ...base, ded:0, collected:+(emp.depOpen||0),
             remain:Math.max(0, target-(+(emp.depOpen||0))), done: !target || (+(emp.depOpen||0))>=target };
  const pds = [...new Set((shifts[emp.code]||[]).map(x=>periodOfE(emp, x.day)))].sort();
  if(period && !pds.includes(period)) pds.push(period);
  pds.sort();
  let collected = +(emp.depOpen||0), ded = 0, override = null;
  for(const pd of pds){
    if(period && pd > period) break;
    if(settings.depStart && pd < settings.depStart) continue;
    const ov = depositEntries.find(x=>x.empId===emp.id && x.period===pd);
    const hasWork = (shifts[emp.code]||[]).some(x=>periodOfE(emp, x.day)===pd);
    let d = ov ? Math.max(0, +ov.amount)
               : hasWork ? Math.min(+(emp.depMonthly||0), Math.max(0, target - collected)) : 0;
    if(pd === period){ ded = d; override = ov||null; }
    collected += d;
  }
  return { target, ded, override, collected, remain: Math.max(0, target - collected), done: collected >= target };
}`;
const XL_ORIG = ['ชื่อเล่น','ชื่อ-นามสกุล','สาขา','แผนก','ตำแหน่ง','รูปแบบ','ประเภท','อัตรา','วันทำงาน','ชั่วโมง','สาย(ครั้ง)','สาย(นาที)','ออกก่อน(นาที)','ชม.ขาด(นาที)','ชม.เต็ม(รายชั่วโมง)','ไม่หยุด(วัน)','เบี้ยไม่หยุด','วันหยุดพิเศษ(ได้)','เบี้ยวันหยุด','ข้ามสาขา(วัน)','สาขาที่ทำงาน','ลืมตอก(ครั้ง)','ลืมตอก(วันที่)','หยุดวันห้ามหยุด','เบิกกลางเดือน','ประกันงวดนี้','ประกันสะสม','ประกันคงเหลือ','MOU งวดนี้','MOU คงเหลือ','ค่าแรง','เพิ่ม','หัก','สุทธิ','เบอร์โทร','ธนาคาร','เลขบัญชี','ชื่อบัญชี'];   // หัวไฟล์ Excel ของแอปเดิม (HEAD 135fcdb)
const PS = ['2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08'];
const txt = (E, js) => E(`(()=>{const d=document.createElement('div'); d.innerHTML=${js}; return d.textContent.replace(/\\s+/g,' ');})()`);
// รอบ 10: 🔒 อัตโนมัติ (วันจ่าย/K BIZ) ทำเฉพาะคนที่งวดก่อน ต.ค. 🔒 ครบ → เทสที่ทดสอบการล็อก ต.ค. ปิดยอด ส.ค./ก.ย. ไว้ก่อน (= เจ้าของกด 🔒 ด้วยยอดที่ระบบคิด)
//   V1ROWS(E, ids?) = แถว DB 🔒 งวดก่อน DEP_V2_START ที่ปุ่ม 🔒 จะล็อก (depLockDue before) · V1LOCK(A, ids?) = ใส่ลงฐานข้อมูลจำลอง + depositEntries ในเครื่อง
const V1ROWS = (E, ids) => JSON.parse(E(`JSON.stringify(depScope(() => employees.filter(e => ${ids ? JSON.stringify(ids) + '.includes(e.id)' : 'true'})
  .flatMap(e => depLockDue(e, { before:DEP_V2_START }).map(x => ({ employee_id:e.id, period:x.p, amount:x.amount, note:'lock' })))))`)).map(r => Object.assign({ id: ++V1ID }, r));
let V1ID = 80000;
const V1LOCK = (A, ids) => { const rows = V1ROWS(A.E, ids); A.T.deposit_entries = (A.T.deposit_entries || []).concat(rows);
  A.E(`depositEntries = depositEntries.concat(${JSON.stringify(rows)}.map(fromDbDep))`); return rows.length; };

(async () => {
  try{
  // ============ 1) ยังไม่รัน SQL: ตัวใหม่เท่าตัวเดิมทุกบาท ============
  { const A = boot(); const { E } = A; await wait(300);
    console.log('[1 ยังไม่รัน jj_deposit_v2.sql (_v1 = null) — ตัวใหม่เท่าตัวเดิมทุกบาท]');
    E(SEED); E(OLD);
    let n = 0, diff = 0;
    for(let i=0; i<420; i++){
      const tgt=[0,3000,5000,6000][i%4], mon=[300,500,700][i%3], op=[0,500,1800,2500,4000,5000][i%6], on=(i%7)!==0, br=(i%5===0)?'OFFICE':'JJLP';
      const gap = i%3===0 ? "k=>k>='2026-10-26'&&k<='2026-11-25'" : 'null';
      E(`var e1=emp({id:${i+1},code:'C${i}',nick:'n${i}',branch:'${br}',deposit_target:${tgt},deposit_monthly:${mon},deposit_opening:${op},deposit_on:${on}});
         employees=[e1]; shifts={C${i}:mk('2026-07-20','2026-12-25',${gap})};
         depositEntries = ${i%4===1} ? [{id:1,empId:${i+1},period:'2026-09',amount:${(i*37)%900},note:''}] : [];`);
      for(const p of ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']){
        n++;
        const o = JSON.parse(E(`JSON.stringify(depositCalcOld(e1,'${p}'))`)), m = JSON.parse(E(`JSON.stringify(depositCalc(e1,'${p}'))`));
        if(o.ded!==m.ded || o.collected!==m.collected || o.remain!==m.remain || o.done!==m.done){ diff++; if(diff<4) console.log('   DIFF', i, p, JSON.stringify(o), JSON.stringify(m)); }
      }
    }
    ok(diff === 0, `สุ่มเทียบ ${n} เคส (420 คน × 6 งวด · เป้า 0/3,000/5,000/6,000 · หัก 300/500/700 · เก็บมาก่อน · ปิดหัก · ออฟฟิศ · งวดไม่มีสแกน · ✎) ต่างกัน ${diff} เคส`);
    ok(E(`DEP_DEF.target===3000 && DEP_DEF.monthly===300 && DEP_V2_START==='2026-10'`), 'ค่าตั้งต้นคนใหม่ 3,000/300 · เริ่มกติกาใหม่งวด 2026-10');
    ok(E(`fromDbEmp({id:1,code:'x',nick:'x'}).depTarget===3000 && fromDbEmp({id:1,code:'x',nick:'x'}).depMonthly===300 && fromDbEmp({id:1,code:'x',nick:'x'}).depTargetV1===null`), 'fromDbEmp: ไม่มีค่า = 3,000/300 · _v1 null (ห้ามกลายเป็น 0)');
    ok(E(`fromDbEmp({id:1,code:'x',nick:'x',deposit_target_v1:0,deposit_monthly_v1:0}).depTargetV1===0`), 'fromDbEmp: _v1 = 0 ยังเป็น 0 (ไม่ใช่ null)');
    ok(!('deposit_target_v1' in JSON.parse(E(`depReady=true; JSON.stringify(toDbEmp(fromDbEmp({id:1,code:'x',nick:'x',deposit_target_v1:5000})))`))), 'toDbEmp ไม่ส่ง deposit_target_v1 (แอปไม่เคยเขียน)');

    // ============ 2) ตาราง A.6 เป็นบาทจริง ============
    console.log('[2 ตาราง A.6 — หน้าร้านรายเดือน 12,000 · depStart 2026-08 · ก่อน ต.ค. 5,000/500 · ตั้งแต่ ต.ค. 3,000/300]');
    const row = (set, rows) => {
      E(`var eX=emp({id:900,code:'X',nick:'x',branch:'${set.br||'JJLP'}',deposit_target:${set.t??3000},deposit_monthly:${set.m??300},deposit_opening:${set.op||0},deposit_on:${set.on!==false},
           deposit_target_v1:${set.newbie?'null':5000},deposit_monthly_v1:${set.newbie?'null':500}});
         employees=[eX]; shifts={X:mk('${set.from||'2026-07-26'}','2027-08-25')}; settings.depStart='${set.ds||'2026-08'}';
         depositEntries=${JSON.stringify(rows||[])}.map((r,i)=>({id:i+1,empId:900,...r}));`);
      return PS.map(p=>{ const d = JSON.parse(E(`JSON.stringify(depositCalc(eX,'${p}'))`)); return (d.refund ? '+'+d.refund : d.ded) + '>' + d.collected; });
    };
    const exp = (got, want, m) => ok(want.every((w,i)=>w==null || got[i]===w), m + ' → ' + got.slice(0, want.length).join(' '));
    exp(row({ newbie:1, from:'2026-09-26' }), [null,null,'300>300','300>600','300>900','300>1200','300>1500','300>1800','300>2100','300>2400','300>2700','300>3000','0>3000'], 'เคส 1 พนักงานใหม่เริ่ม ต.ค.: 300 ทุกงวด ครบ 3,000 ก.ค. 70 (10 งวด)');
    exp(row({ op:500 }), ['500>1000','500>1500','300>1800','300>2100','300>2400','300>2700','300>3000','0>3000'], 'เคส 2 เก็บมาก่อน 500 → ส.ค./ก.ย. 500 (สะสม 1,500) → ต.ค. 300 … ก.พ. 70 ครบ 3,000');
    exp(row({ op:1800 }), ['500>2300','500>2800','200>3000','0>3000'], 'เคส 3 สะสม 2,800 → ต.ค. หักแค่ 200 ครบ 3,000');
    exp(row({ op:2000 }), ['500>2500','500>3000','0>3000','0>3000'], 'เคส 4 สะสมพอดี 3,000 → ต.ค. ไม่หัก ไม่คืน');
    exp(row({ op:2500 }, [{period:'2026-10',amount:-500,note:'refund'}]), ['500>3000','500>3500','+500>3000','0>3000','0>3000'], 'เคส 5 สะสม 3,500 → ต.ค. คืน 500 → 3,000');
    exp(row({ op:5000 }, [{period:'2026-10',amount:-2000,note:'refund'}]), ['0>5000','0>5000','+2000>3000','0>3000'], 'เคส 6 ครบเป้าเดิม 5,000 → ต.ค. คืน 2,000 → 3,000');
    exp(row({ op:5000 }), ['0>5000','0>5000','0>5000','0>5000'], 'เคส 6b ยังไม่กด 💸 → ต.ค. หัก 0 สะสม 5,000');
    ok(E(`depositCalc(eX,'2026-10').over`)===2000, 'เคส 6b ป้าย "เกินเป้า 2,000 · ยังไม่คืน" (over = 2,000)');
    exp(row({ op:1200 }), ['500>1700','500>2200','300>2500','300>2800','200>3000','0>3000'], 'เคส 7 เก็บมาก่อน 1,200 → ธ.ค. หัก 200 ครบ');
    exp(row({ on:false }, [{period:'2026-08',amount:500,note:'lock'},{period:'2026-09',amount:500,note:'lock'}]), ['500>500','500>1000','0>1000','0>1000'], 'เคส 8 ปิดหักตั้งแต่ ต.ค. (ส.ค./ก.ย. 🔒) → ประวัติ 500/500 ยังอยู่');
    exp(row({ br:'OFFICE' }), ['500>500','500>1000','300>1300','300>1600','300>1900','300>2200','300>2500','300>2800','200>3000'], 'เคส 9 ออฟฟิศ: ส.ค./ก.ย.(36 วัน) 500 · ต.ค. (1–31) 300 → 1,300 · เม.ย. 70 หัก 200 ครบ');
    exp(row({ t:4000, m:500 }), ['500>500','500>1000','500>1500','500>2000','500>2500','500>3000','500>3500','500>4000','0>4000'], 'เคส 10 ปรับรายคน เป้า 4,000 หัก 500 → มี.ค. 70 ครบ 4,000');
    exp(row({ ds:'2026-10' }, [{period:'2026-08',amount:500,note:'lock'},{period:'2026-09',amount:500,note:'lock'}]), ['500>500','500>1000','300>1300'], 'เคส 11 เลื่อนเริ่มหักเป็น ต.ค. หลัง 🔒 ส.ค./ก.ย. → ยังนับ 500/500 · ต.ค. 300 → 1,300');
    exp(row({ ds:'2026-10' }), ['0>0','0>0','300>300'], 'เคส 11x ไม่มี 🔒 + เลื่อนเริ่มหัก → ส.ค./ก.ย. หายเป็น 0 (บั๊กเดิม — ต้องกันด้วย 🔒/ล็อกก่อนแก้)');
    ok(E(`depositCalc(eX,'2026-09').v1 && depositCalc(eX,'2026-09').target===5000 && depositCalc(eX,'2026-10').target===3000`), 'งวด ก.ย. ใช้กติกาเดิม (v1 · เป้า 5,000) · ต.ค. ใช้ 3,000');

    // ============ 3–4) 🔒 แล้วแก้ค่า/สแกนหลุด → งวดที่ล็อกไม่เปลี่ยน ============
    console.log('[3–4 หลัง 🔒 ส.ค./ก.ย.: แก้เป้า/หัก/เก็บมาก่อน/ปิดหัก/เลื่อนงวดเริ่ม/ลบสแกน/เปลี่ยนรหัส → ประวัติไม่เปลี่ยน]');
    row({}, [{period:'2026-08',amount:500,note:'lock'},{period:'2026-09',amount:500,note:'lock'}]);
    E(`eX.depTarget=2000; eX.depMonthly=100;`);
    ok(E(`depositCalc(eX,'2026-08').ded===500 && depositCalc(eX,'2026-09').ded===500 && depositCalc(eX,'2026-10').ded===100 && depositCalc(eX,'2026-10').collected===1100`), 'เปลี่ยนเป้า 2,000 หัก 100 → ส.ค./ก.ย. ยัง 500/500 · ต.ค. = 100');
    E(`eX.depTarget=3000; eX.depMonthly=300; eX.depOpen=5000;`); ok(E(`depositCalc(eX,'2026-09').collected`)===6000 && E(`depositCalc(eX,'2026-08').ded`)===500, 'ใส่เก็บมาก่อน 5,000 → ส.ค. ยังหัก 500 (ไม่กลายเป็น 0)');
    E(`eX.depOpen=0; eX.depOn=false;`); ok(E(`depositCalc(eX,'2026-09').collected`)===1000, 'ปิดหัก → ส.ค./ก.ย. ยังอยู่ สะสม 1,000');
    E(`eX.depOn=true; settings.depStart='2026-10';`); ok(E(`depositCalc(eX,'2026-09').collected`)===1000, 'เลื่อนเริ่มหักเป็น ต.ค. → ส.ค./ก.ย. ยังนับ');
    E(`settings.depStart='2026-08'; shifts.X = shifts.X.filter(s=>periodOfE(eX,s.day)!=='2026-08');`); ok(E(`depositCalc(eX,'2026-10').before`)===1000, 'ลบสแกน ส.ค. ทั้งงวด (หลุดหน้าต่าง 8 เดือน) → สะสมก่อน ต.ค. ยัง 1,000 ไม่หักซ้ำ');
    E(`eX.code='X2'; shifts.X2=shifts.X; delete shifts.X;`); ok(E(`depositCalc(eX,'2026-10').before`)===1000 && E(`depositCalc(eX,'2026-09').ded`)===500, 'เปลี่ยนรหัสสแกน → ส.ค./ก.ย. ยังอยู่');
    // 6) ยกเลิกคืน
    row({ op:5000 }); ok(E(`depositCalc(eX,'2026-10').refund`)===0 && E(`depositCalc(eX,'2026-10').collected`)===5000 && E(`depositCalc(eX,'2026-10').over`)===2000, 'ไม่มีแถวคืน (ยกเลิกคืน) → refund 0 · สะสม 5,000 · เกินเป้า 2,000');
    // 24) งวด ก.ย. ของคนที่มี _v1 — ช่องเป้า/หักอ่านอย่างเดียว
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); go('dep');`);
    E(`document.getElementById('depPeriodSel').innerHTML='<option>2026-09</option><option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-09'; document.getElementById('depActive').value=''; renderDeposit();`);
    const tr = () => A.d.querySelector('#depTable tbody tr');
    ok(tr() && /กติกาเดิม/.test(tr().textContent) && /5,000/.test(tr().textContent) && !tr().querySelector('input[data-f=deposit_target]') && !tr().querySelector('input[data-f=deposit_monthly]'), 'ดูงวด ก.ย. คนที่มี _v1 → เป้า/หัก 5,000/500 อ่านอย่างเดียว + ชิป "กติกาเดิม"');
    E(`document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    ok(tr().querySelector('input[data-f=deposit_target]') && tr().querySelector('input[data-f=deposit_target]').value==='3000', 'งวด ต.ค. ช่องเป้าแก้ได้ = 3,000');
    ok(E(`depEffFrom(eX,'deposit_target')`)==='2026-10', 'แก้เป้าของคนที่มี _v1 → "มีผลตั้งแต่งวด ต.ค. 69" (งวดก่อนใช้ _v1)');
    ok(/รุ่นแอป/.test(A.d.getElementById('page-dep').textContent) && A.d.getElementById('depVer').textContent.includes('เงินประกัน v2'), 'หัวหน้า 🛡️ มีป้ายรุ่น APP_VER');
  }

  // ============ 5, 9) คืนส่วนเกิน — ตรงกันทุกจอ (สลิป · สรุป · Excel · K BIZ) ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[5/9 💸 คืนส่วนเกิน 2,000 (สะสม 5,000) — ยอดตรงกันทุกจอ]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'แพร',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1234567890'});
      var b=emp({id:2,code:'B',nick:'บี',deposit_opening:2500,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'2222222222'});
      var c=emp({id:3,code:'C',nick:'ซี',deposit_opening:1900,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'3333333333'});
      employees=[a,b,c]; shifts={A:mk('2026-07-26','2026-12-25'),B:mk('2026-07-26','2026-12-25'),C:mk('2026-07-26','2026-12-25')}; depositEntries=[];`);
    const net0 = E(`calcPay(a,'2026-10').net`);
    // คืนผ่านปุ่มจริง: เปิดพรีวิว → ยืนยัน
    E(`go('dep'); renderDeposit(); document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value='';`);
    await E(`depRefundOpen()`);
    const st = JSON.parse(E(`JSON.stringify(depRefState.items.map(x=>({n:x.e.nick,amount:x.amount,on:x.on,prior:x.prior.map(y=>y.p+':'+y.amount),warn:x.warn.length})))`));
    const pa = st.find(x=>x.n==='แพร'), pb = st.find(x=>x.n==='บี'), pc = st.find(x=>x.n==='ซี');
    ok(pa && pa.amount===2000 && pb && pb.amount===500 && !pc && E(`depositCalc(c,'2026-10').ded`)===100, 'พรีวิว 💸: สะสม 5,000 → คืน 2,000 · 3,500 → 500 · 2,900 → ไม่อยู่ในรายการ (ต.ค. หัก 100 ไม่คืน)');
    ok(pa.prior.join()==='2026-08:0,2026-09:0' && pb.prior.join()==='2026-08:500,2026-09:500', 'พรีวิวโชว์งวดก่อนหน้าที่จะล็อกพร้อมกัน (ส.ค./ก.ย. ยอดที่ระบบคิด)');
    ok(!pa.on && pa.warn, 'เก็บมาก่อน > 0 → ไม่ติ๊กให้เอง + ป้ายส้ม "ตรวจว่าเก็บจริง"');
    E(`depRefState.items.forEach(x=>x.on=true);`);
    await E(`depRefundSave()`);
    const dbr = (id,p)=> (T.deposit_entries||[]).find(r=>r.employee_id===id && r.period===p);
    ok(dbr(1,'2026-10') && dbr(1,'2026-10').amount===-2000 && dbr(1,'2026-10').note==='refund' && dbr(2,'2026-10').amount===-500, 'บันทึกแถว refund: แพร −2,000 · บี −500 (amount ติดลบ note refund)');
    ok(dbr(2,'2026-08').note==='lock' && dbr(2,'2026-08').amount===500 && dbr(2,'2026-09').amount===500, 'บันทึกพร้อมล็อก ส.ค./ก.ย. ของบี 500/500 ด้วยตัวเลขชุดเดียวกับพรีวิว');
    const p = JSON.parse(E(`JSON.stringify((({dep,net,addSum,deduSum})=>({ded:dep.ded,refund:dep.refund,col:dep.collected,net,addSum,deduSum}))(calcPay(a,'2026-10')))`));
    ok(p.refund===2000 && p.ded===0 && p.col===3000 && p.net===net0+2000, `calcPay ต.ค.: คืน 2,000 · หัก 0 · สะสม 3,000 · สุทธิ ${net0} + 2,000 = ${p.net}`);
    ok(E(`calcPay(a,'2026-11').dep.refund`)===0 && E(`calcPay(a,'2026-11').dep.ded`)===0 && E(`depositCalc(a,'2026-11').collected`)===3000, 'พ.ย. ไม่คืนซ้ำ ไม่หัก สะสม 3,000');
    const nBefore = T.deposit_entries.length; await E(`depRefundOpen()`); E(`depRefState.items.forEach(x=>x.on=true)`); await E(`depRefundSave()`);
    ok(T.deposit_entries.length===nBefore, 'กด 💸 ซ้ำ → ไม่สร้างแถวเพิ่ม');
    // 9) ทุกจอ
    const slip = txt(E, `buildSlip(a,'2026-10',true)`);
    ok(slip.includes('คืนเงินประกันส่วนเกิน') && slip.includes('2,000.00') && slip.includes('สะสม 5,000 → 3,000'), 'สลิป: บรรทัดรายรับ "คืนเงินประกันส่วนเกิน (สะสม 5,000 → 3,000 / เป้า 3,000) 2,000.00"');
    ok(slip.includes(E(`THB2(calcPay(a,'2026-10').net)`)), 'สลิป: ยอดสุทธิ = calcPay().net');
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; renderPayroll();`);
    const prow = [...A.d.querySelectorAll('#payTable tbody tr')].find(r=>r.textContent.includes('แพร'));
    ok(prow && prow.textContent.includes('+2,000') && prow.textContent.includes('คืน') && prow.textContent.includes(E(`THB(calcPay(a,'2026-10').net)`)), 'หน้าสรุปเงินเดือน: คอลัมน์ประกัน +2,000 คืน · สุทธิตรง');
    A.d.getElementById('payFlag').value='dep'; E(`renderPayroll()`);
    ok([...A.d.querySelectorAll('#payTable tbody tr')].some(r=>r.textContent.includes('แพร')), 'ตัวกรอง "เงินประกัน" รวมคนที่ได้คืนอย่างเดียว (หัก 0)');
    ok(E(`slipFilterList('2026-10').some(x=>x.e.nick==='แพร')`), 'หน้าต่างเลือกพิมพ์สลิป (ตัวกรองเดียวกัน) มีคนที่ได้คืน');
    A.d.getElementById('payFlag').value=''; E(`renderPayroll()`);
    io.files.length = 0; await E(`exportPayrollXlsx()`);
    const xf = io.files.pop(); const hd = xf.aoa[0], xr = xf.aoa.find(r=>r[0]==='แพร');
    ok(xr && xr[hd.indexOf('คืนเงินประกัน')]===2000 && xr[hd.indexOf('เพิ่ม')]===E(`calcPay(a,'2026-10').addSum`) && xr[hd.indexOf('สุทธิ')]===E(`calcPay(a,'2026-10').net`) && hd.indexOf('คืนเงินประกัน')===hd.indexOf('ชื่อบัญชี')+1 && hd.slice(0, 38).join()===XL_ORIG.join(), 'Excel: คอลัมน์ "คืนเงินประกัน" ต่อท้าย (หลัง "ชื่อบัญชี") = 2,000 · คอลัมน์เดิม 38 ช่องอยู่ตำแหน่งเดิม · "เพิ่ม"/"สุทธิ" ตรง');
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    const kf = io.files.pop(); const kr = kf && kf.aoa.slice(3).find(r=>r[1]==='1234567890');
    ok(kr && Math.abs(kr[3] - E(`Math.round(calcPay(a,'2026-10').net*100)/100`)) < 0.005, 'ไฟล์ K BIZ: ยอดโอน = calcPay().net (รวมยอดคืน 2,000)');
    // ประวัติ + หน้ารายคน
    E(`detailEmpId=1; detailTab='debt'; document.getElementById('detailPeriodSel').value='2026-10'; go('detail');`);
    const dt = A.d.getElementById('detailContent').textContent;
    ok(/ประวัติเงินประกัน/.test(dt) && /💸 คืน/.test(dt) && /🔒 ปิดยอด/.test(dt), 'หน้ารายคน แท็บ "เบิก · ยืม · ประกัน": มีการ์ด 🛡️ ประวัติเงินประกันรายงวด (คืน/ปิดยอด)');
    E(`setDetailTab('money')`);
    ok(/คืนเงินประกันส่วนเกิน/.test(A.d.getElementById('detailContent').textContent) && /\+2,000 คืน/.test(A.d.getElementById('detailContent').textContent), 'แท็บเงินเดือน: บรรทัด ＋ คืนเงินประกันส่วนเกิน · ประวัติเงินเดือน "+2,000 คืน"');
    // 20) editDeposit แถวคืน + หน้า 🛡️ ไม่มีช่องกรอก
    io.prompts.length = 0; E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    io.promptAns = [null]; await E(`editDeposit(1,'2026-10')`);
    ok(/สะสมก่อนงวดนี้ 5,000/.test(io.prompts[0]||''), 'editDeposit แถวคืน: ข้อความ "สะสมก่อนงวดนี้ 5,000" (ไม่ใช่ 3,000)');
    const trA = [...A.d.querySelectorAll('#depTable tbody tr')].find(r=>r.textContent.includes('แพร'));
    ok(trA && !trA.querySelector('input[data-p]') && /💸 คืน 2,000/.test(trA.textContent), 'หน้า 🛡️ แถว 💸: ป้าย "💸 คืน 2,000" ไม่มีช่องกรอก "หักงวดนี้"');
    const w0 = T.deposit_entries.map(r=>r.amount).join();
    await E(`setDepOverride(1,'2026-10','0')`);
    ok(T.deposit_entries.map(r=>r.amount).join()===w0, 'setDepOverride บนแถว 💸 → ไม่เขียน (ยอดคืนไม่ถูกทับด้วย 0)');
    // 6) ยกเลิกคืนผ่าน editDeposit (เจ้าของในหน้า 🛡️)
    io.promptAns = ['']; await E(`editDeposit(1,'2026-10')`);
    ok(!dbr(1,'2026-10') && E(`depositCalc(a,'2026-10').collected`)===5000 && E(`depositCalc(a,'2026-10').over`)===2000, 'ยกเลิกคืน (เว้นว่าง) → ลบแถว · สะสม 5,000 · เกินเป้า 2,000');
  }

  // ============ 7, 12, 17) ออฟฟิศ · ปุ่ม 🔒 · ล็อกก่อนแก้ ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T, setNow } = A; await wait(300);
    console.log('[12 ปุ่ม 🔒 ปิดยอดงวด · 17 ล็อกก่อนแก้ · 7 ออฟฟิศ]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var s1=emp({id:1,code:'S1',nick:'ร้าน1',deposit_target_v1:5000,deposit_monthly_v1:500});
      var s2=emp({id:2,code:'S2',nick:'ร้าน2',deposit_target_v1:5000,deposit_monthly_v1:500});
      var o1=emp({id:3,code:'O1',nick:'ออฟ1',branch:'OFFICE',deposit_target_v1:5000,deposit_monthly_v1:500});
      var z0=emp({id:4,code:'Z0',nick:'ไม่มีเป้า',deposit_target:0,deposit_target_v1:0,deposit_monthly_v1:0});
      employees=[s1,s2,o1,z0]; shifts={S1:mk('2026-07-20','2026-12-25'),S2:mk('2026-07-26','2026-12-25'),O1:mk('2026-07-26','2026-12-31'),Z0:mk('2026-07-26','2026-12-25')}; depositEntries=[];
      go('dep'); renderDeposit();`);
    ok(E(`depositCalc(o1,'2026-08').ded`)===500 && E(`depositCalc(o1,'2026-09').ded`)===500 && E(`depositCalc(o1,'2026-10').ded`)===300 && E(`depositCalc(o1,'2026-10').collected`)===1300, 'ออฟฟิศ: ส.ค. 500 · ก.ย. (26 ส.ค.–30 ก.ย.) 500 · ต.ค. (1–31 ต.ค.) 300 → 1,300');
    // ปุ่ม 🔒 งวด ต.ค. วันที่ 20 ต.ค. = ยังไม่ถึงวันจ่ายทั้งหน้าร้าน/ออฟฟิศ
    A.d.getElementById('depPeriodSel').innerHTML = ['2026-07','2026-08','2026-09','2026-10'].map(p=>`<option>${p}</option>`).join('');
    A.d.getElementById('depPeriodSel').value='2026-10'; await E(`depLockOpen()`);
    ok(E(`depLockState.items.length`)===0 && /ข้าม 3 คนที่ยังไม่ถึงวันจ่าย/.test(A.d.getElementById('depLockBody').textContent), '🔒 ต.ค. วันที่ 20 ต.ค. → ข้าม 3 คนที่ยังไม่ถึงวันจ่าย (ออฟฟิศ 31 ต.ค. · หน้าร้าน 5 พ.ย.) · ข้ามคนเป้า 0 + สะสม 0');
    A.d.getElementById('depPeriodSel').value='2026-09'; await E(`depLockOpen()`);
    ok(E(`depLockState.items.map(x=>x.e.nick+':'+x.amount).join()`)==='ร้าน1:500,ร้าน2:500,ออฟ1:500', '🔒 ก.ย.: พรีวิว 3 คน ยอดที่ระบบคิด 500 (ข้ามคนเป้า 0 + สะสม 0)');
    await E(`depLockSave()`);
    ok(T.deposit_entries.filter(r=>r.period==='2026-09' && r.note==='lock' && r.amount===500).length===3, 'บันทึก note lock ก.ย. 3 แถว (500)');
    ok(E(`document.getElementById('depLockBtn').disabled`)===false, 'ปุ่ม 🔒 ใช้ได้กับงวด ≥ depStart');
    A.d.getElementById('depPeriodSel').value='2026-07'; E(`renderDeposit()`);
    ok(E(`document.getElementById('depLockBtn').disabled`)===true, 'ปุ่ม 🔒 ปิดสำหรับงวด < depStart (ก.ค. — ห้ามคิดย้อนหลัง)');
    // 17) ล็อกก่อนแก้: 20 ต.ค. ส.ค. ยังไม่ล็อก (ก.ย. ล็อกแล้ว) → ปิดหักร้าน1
    //     ผลตรวจรอบสุดท้าย M1: งวดก่อน ต.ค. 69 ที่ยังไม่เคย 🔒 ไม่ล็อกให้อัตโนมัติ (ยอดตอนนี้อาจผิด) → confirm บอกว่าจะคิดใหม่ + ลำดับ (ถูก = ยกเลิกไป 🔒 ก่อน)
    io.confirms.length = 0; io.confirmAns = () => false; const nC = A.db.log.length;
    await E(`updDepField(1,'deposit_on',false)`);
    ok(/งวดก่อน ต\.ค\. 69 ที่ยังไม่ 🔒 ระบบไม่ปิดยอดให้/.test(io.confirms[0]||'') && /ส\.ค\. 69 ตอนนี้ 500/.test(io.confirms[0]||'') && /ยอดตอนนี้ถูกแล้ว.*กดยกเลิก ไป 🔒/.test(io.confirms[0]||'') && /มีผลตั้งแต่ งวด ส\.ค\. 2569/.test(io.confirms[0]||''),
       'confirm: "งวดก่อน ต.ค. 69 ที่ยังไม่ 🔒 ระบบไม่ปิดยอดให้ … ส.ค. 69 ตอนนี้ 500" + ลำดับ (ถูกแล้ว = ยกเลิก ไป 🔒 ก่อน) + "มีผลตั้งแต่ งวด ส.ค. 2569"');
    ok(A.db.log.length===nC && E(`s1.depOn`)!==false, 'ตอบยกเลิก → ไม่ล็อก ไม่แก้ค่า');
    io.confirmAns = null;
    // ทำตามลำดับ: ยอดตอนนี้ถูก → 🔒 ส.ค. ที่หน้า 🛡️ ก่อน (พรีวิว) แล้วค่อยปิดหัก
    E(`renderDeposit()`); A.d.getElementById('depPeriodSel').value='2026-08'; await E(`depLockOpen()`);
    ok(E(`depLockState.items.map(x=>x.e.nick+':'+x.amount).join()`)==='ร้าน1:500,ร้าน2:500,ออฟ1:500', '🔒 ส.ค. (ปุ่ม · พรีวิว): ร้าน1/ร้าน2/ออฟ1 500');
    // ล็อกเฉพาะร้าน1 (ช่องค้นหา) — ร้าน2/ออฟ1 ไว้ทดสอบต่อ
    A.d.getElementById('depSearch').value='ร้าน1'; await E(`depLockOpen()`); await E(`depLockSave()`); A.d.getElementById('depSearch').value='';
    io.confirms.length = 0;
    await E(`updDepField(1,'deposit_on',false)`);
    ok(!/งวดก่อน ต\.ค\. 69 ที่ยังไม่ 🔒/.test(io.confirms[0]||'') && /มีผลตั้งแต่ งวด ต\.ค\. 2569/.test(io.confirms[0]||''), 'หลัง 🔒 ส.ค. แล้ว: ไม่มีคำเตือนงวดก่อน ต.ค. · "มีผลตั้งแต่ งวด ต.ค. 2569"');
    ok(T.deposit_entries.some(r=>r.employee_id===1 && r.period==='2026-08' && r.note==='lock' && r.amount===500) && !T.deposit_entries.some(r=>r.employee_id===1 && r.period==='2026-10'), 'ปิดหัก 20 ต.ค. → ส.ค. 🔒 500 (จากปุ่ม) · ต.ค. ยังไม่ถึงวันจ่าย ไม่ล็อก');
    ok(E(`depositCalc(s1,'2026-08').ded`)===500 && E(`depositCalc(s1,'2026-09').ded`)===500 && E(`depositCalc(s1,'2026-10').ded`)===0 && E(`depositCalc(s1,'2026-10').collected`)===1000, 'หลังปิดหัก: ส.ค./ก.ย. ยัง 500/500 · ต.ค. 0 · สะสม 1,000 (เดิมหายทั้งหมด)');
    // ยกเลิก confirm = ไม่เขียนอะไรเลย
    const n0 = A.db.log.length; io.confirmAns = () => false;
    await E(`updDepField(2,'deposit_target',2000)`);
    ok(A.db.log.length===n0 && E(`s2.depTarget`)===3000, 'กดยกเลิก confirm → ไม่ล็อก ไม่แก้ค่า');
    io.confirmAns = null;
    // 6 พ.ย.: แก้เก็บมาก่อนของร้าน2 → ล็อก ต.ค. (≥ ต.ค. 69 จ่ายแล้ว) · ส.ค. (ก่อน ต.ค. 69 ยังไม่ 🔒) ไม่ล็อกให้ — คิดใหม่ตามค่าที่แก้ · ก.ย. ล็อกแล้ว
    setNow('2026-11-06T12:00:00+07:00');
    await E(`updDepField(2,'deposit_opening',1000)`);
    ok(['2026-09','2026-10'].every(p=>T.deposit_entries.some(r=>r.employee_id===2 && r.period===p && r.note==='lock')) && !T.deposit_entries.some(r=>r.employee_id===2 && r.period==='2026-08'),
       'วันที่ 6 พ.ย. แก้เก็บมาก่อน → ต.ค. ถูกล็อกก่อนแก้ · ส.ค. (ก่อน ต.ค. 69) ไม่ล็อกอัตโนมัติ');
    ok(E(`depositCalc(s2,'2026-10').ded`)===300 && E(`depositCalc(s2,'2026-10').collected`)===2300, 'ยอดที่ล็อกไว้ไม่เปลี่ยนตามเก็บมาก่อนที่แก้ (ต.ค. 300) · สะสม 1,000+500(ส.ค. คิดสด)+500+300 = 2,300');
    // เปลี่ยน "เริ่มหักตั้งแต่งวด" → ก.ย.: ร้าน2/ออฟ1 ส.ค. (จ่ายแล้ว · หัก 500) ยังไม่ 🔒 → ห้าม (2026-10-19: เดิมแค่ confirm เตือน กดตกลงแล้ว ส.ค. หาย) → 🔒 ส.ค. ด้วยปุ่มก่อน → เลื่อน → ส.ค. ยังนับ 500
    E(`var __stSel = () => Object.assign(document.createElement('select'),{innerHTML:'<option value="2026-09">x</option>',value:'2026-09'});`);
    io.confirms.length = 0; io.alerts.length = 0; const nS = A.db.log.length;
    await E(`depStartChange(__stSel())`);
    ok(E(`settings.depStart`)==='2026-08' && !io.confirms.length && A.db.log.length===nS && /ห้ามเลื่อน "เริ่มหักตั้งแต่งวด" งวด ส\.ค\. 2569 → งวด ก\.ย\. 2569/.test(io.alerts.join()) && /ส\.ค\. 69 \(2 คน\)/.test(io.alerts.join()),
       'เลื่อนงวดเริ่ม ส.ค. → ก.ย. ทั้งที่ ส.ค. จ่ายแล้วยังไม่ 🔒 → บล็อก "ส.ค. 69 (2 คน)" ก่อนถาม · ไม่เขียนอะไร · ไม่เปลี่ยน');
    E(`renderDeposit()`); A.d.getElementById('depPeriodSel').value='2026-08'; await E(`depLockOpen()`); await E(`depLockSave()`);
    // ออฟฟิศ ต.ค. จ่าย 31 ต.ค. → 6 พ.ย. ล็อกได้
    await E(`depStartChange(__stSel())`);
    ok(T.deposit_entries.some(r=>r.employee_id===3 && r.period==='2026-10' && r.note==='lock' && r.amount===300), 'เปลี่ยน "เริ่มหักตั้งแต่งวด" (เจ้าของ) → ล็อกทุกคนก่อน รวมออฟฟิศ ต.ค. 300');
    ok(E(`settings.depStart`)==='2026-09' && E(`depositCalc(o1,'2026-08').ded`)===500, 'หลังเลื่อนงวดเริ่มเป็น ก.ย. → ส.ค. ที่ 🔒 (ปุ่ม) แล้วยังนับ 500');
    // 16) เครื่องข้อมูลค้าง + 2 เครื่องพร้อมกัน
    console.log('[16 เครื่องข้อมูลค้าง · เขียนไม่ทับ]');
    A.T.deposit_entries.push({ id:9001, employee_id:1, period:'2026-11', amount:-2000, note:'refund' });   // อีกเครื่องคืนไว้แล้ว (เครื่องนี้ยังไม่รู้)
    let r = JSON.parse(await E(`depLockWrite([{e:s1,p:'2026-11',amount:300,row:null}]).then(r=>JSON.stringify(r))`));
    ok(r.skip===1 && T.deposit_entries.find(x=>x.employee_id===1 && x.period==='2026-11').amount===-2000, 'ไม่มีแถวคืนในเครื่อง แต่ DB มี −2,000 → 🔒 ขั้น 1 ไม่ทับ (ข้าม) แถวคืนยังอยู่');
    A.T.deposit_entries.push({ id:9002, employee_id:2, period:'2026-11', amount:300, note:'lock' });
    r = JSON.parse(await E(`depLockWrite([{e:s2,p:'2026-11',amount:999,row:{id:9002,empId:2,period:'2026-11',amount:300,note:''}}]).then(r=>JSON.stringify(r))`));
    ok(r.skip===1 && T.deposit_entries.find(x=>x.id===9002).amount===300, 'ในเครื่องเห็นเป็น ✎ แต่ DB เป็น 🔒 → ขั้น 2 ไม่เขียน (ยอดเดิม 300)');
    const [r1, r2] = await Promise.all([E(`depLockWrite([{e:o1,p:'2026-11',amount:300,row:null}])`), E(`depLockWrite([{e:o1,p:'2026-11',amount:777,row:null}])`)]);
    ok(T.deposit_entries.filter(x=>x.employee_id===3 && x.period==='2026-11').length===1 && T.deposit_entries.find(x=>x.employee_id===3 && x.period==='2026-11').amount===300 && r1.rows.length+r2.rows.length===1, '🔒 พร้อมกัน 2 เครื่อง → แถวเดียว ยอดไม่ถูกทับ');
  }

  // ============ 18, 19) 💸 ล็อกงวดก่อน · ตรวจยอดคืน · ติ๊กไม่ได้ ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[18–19 💸 ล็อกงวดก่อนพร้อมกัน · ตรวจยอดคืน · ติ๊กไม่ได้]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var k5=emp({id:1,code:'K5',nick:'ห้า',deposit_opening:2500,deposit_target_v1:5000,deposit_monthly_v1:500});
      var k6=emp({id:2,code:'K6',nick:'หก',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500});
      var gone=emp({id:3,code:'GN',nick:'ลาออก',active:false,deposit_opening:4000,deposit_target_v1:5000,deposit_monthly_v1:500});
      var off=emp({id:4,code:'OF',nick:'ออฟ',branch:'OFFICE',deposit_opening:4000,deposit_target_v1:5000,deposit_monthly_v1:500});
      var man=emp({id:5,code:'MN',nick:'แก้เอง',deposit_opening:4000,deposit_target_v1:5000,deposit_monthly_v1:500});
      employees=[k5,k6,gone,off,man]; shifts={K5:mk('2026-07-26','2026-12-25'),K6:mk('2026-07-26','2026-12-25'),GN:mk('2026-07-26','2026-09-10'),OF:mk('2026-07-26','2026-12-31'),MN:mk('2026-07-26','2026-12-25')};
      depositEntries=[]; go('dep'); renderDeposit(); document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value='';`);
    A.T.deposit_entries = [{ id:1, employee_id:5, period:'2026-10', amount:100, note:'' }];
    A.setNow('2026-10-30T12:00:00+07:00');
    await E(`depRefundOpen()`);
    const it = n => JSON.parse(E(`JSON.stringify((x=>x&&{block:x.block,on:x.on,amount:x.amount,warn:x.warn,xf:x.xf})(depRefState.items.find(x=>x.e.nick==='${n}')))`));
    // เจ้าของสั่ง 2026-10-20 (รอบ 2): คนพ้นสภาพ = 🏦 โอนคืนนอกสลิป (เดิมติ๊กไม่ได้ "ไม่มีสลิป") — อยู่ในหน้าต่าง 💸 ไม่ติ๊กให้เอง (ติ๊ก "โอนแล้ว" หลังโอนจริง)
    ok(it('ลาออก').xf && !it('ลาออก').block && !it('ลาออก').on && it('ลาออก').amount===2000, 'คนพ้นสภาพ (สะสม 5,000) → กลุ่ม 🏦 โอนคืนนอกสลิป ยอดที่ต้องโอน 2,000 · ไม่ติ๊กให้เอง');
    ok(/เลยกำหนดสร้างไฟล์โอน/.test(it('ออฟ').block), 'ติ๊กไม่ได้: ออฟฟิศวันที่ 30 ต.ค. (วันจ่าย 31 ต.ค. ≤ พรุ่งนี้)');
    ok(/ลบ ✎ ก่อน/.test(it('แก้เอง').block), 'ติ๊กไม่ได้: มีแถว ✎ งวดนี้อยู่แล้ว');
    ok(!it('ห้า').block && !it('ห้า').on && it('ห้า').warn.length, 'เก็บมาก่อน > 0 → ไม่ติ๊กให้เอง (ติ๊กเองได้)');
    // ยอดคืนเกินส่วนเกิน → ปฏิเสธ
    E(`depRefState.items.forEach(x=>{ if(!x.block) x.on = x.e.nick==='ห้า'; }); depRefState.items.find(x=>x.e.nick==='ห้า').amount = 600;`);
    const n0 = A.db.log.length; await E(`depRefundSave()`);
    ok(A.db.log.length===n0, 'ยอดคืน 600 > สะสมก่อนงวด − เป้า (500) → ปฏิเสธ ไม่เขียน');
    // ติ๊ก "คืนเกินส่วนเกิน (ลาออก)" → คืน 3,500 ได้ + ปิดหัก
    E(`(x=>{ x.quit=true; x.amount=3500; })(depRefState.items.find(x=>x.e.nick==='ห้า'))`);
    await E(`depRefundSave()`);
    ok(T.deposit_entries.some(r=>r.employee_id===1 && r.period==='2026-10' && r.amount===-3500 && r.note==='refund') && E(`k5.depOn`)===false && A.db.log.some(l=>l.table==='employees' && l.op==='update' && l.payload.deposit_on===false), 'ติ๊ก "คืนเกินส่วนเกิน (ลาออก/เลิกเก็บ)" → คืน 3,500 ผ่าน + บันทึก deposit_on=false');
    ok(['2026-08','2026-09'].every(p=>T.deposit_entries.some(r=>r.employee_id===1 && r.period===p && r.note==='lock' && r.amount===500)), '💸 ล็อก ส.ค./ก.ย. ของคนนั้นพร้อมกัน 500/500');
    E(`shifts.K5 = shifts.K5.filter(s=>periodOfE(k5,s.day)!=='2026-08')`);
    ok(E(`depositCalc(k5,'2026-10').before`)===3500, 'ลบสแกน ส.ค. ทั้งงวดหลังคืน → สะสมก่อน ต.ค. ยัง 3,500 (ไม่หักซ้ำ)');
    // มีคนล็อก ส.ค. ด้วยยอดอื่นไปก่อน → ข้ามการคืน
    await E(`depRefundOpen()`);
    E(`depRefState.items.forEach(x=>x.on = x.e.nick==='หก')`);
    A.T.deposit_entries.push({ id:7777, employee_id:2, period:'2026-08', amount:123, note:'lock' });   // อีกเครื่องล็อก ส.ค. ของ "หก" ด้วยยอดอื่น
    io.alerts.length = 0; await E(`depRefundSave()`);
    ok(!T.deposit_entries.some(r=>r.employee_id===2 && r.period==='2026-10') && /ข้าม 1 คน/.test(io.alerts.join()), 'มีคนล็อก ส.ค. ด้วยยอดต่างจากพรีวิวไปก่อน → ข้ามการคืนคนนั้น + บอกให้เปิดพรีวิวใหม่');
  }

  // ============ 10, 11) ฟอร์มพนักงาน · ลบพนักงาน ============
  { const A = boot(); const { E, T } = A; await wait(300);
    console.log('[10 ฟอร์มพนักงาน · 11 ลบพนักงาน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var f1=emp({id:1,code:'F1',nick:'ฟอร์ม',deposit_target:5000,deposit_monthly:500}); employees=[f1]; shifts={}; punches=[]; depositEntries=[];`);
    E(`openEmpForm(); document.getElementById('fNick').value='ใหม่'; document.getElementById('fCode').value='N1';`);
    await E(`saveEmpForm()`);
    const ins = A.db.log.find(l=>l.table==='employees' && l.op==='insert');
    ok(ins && ins.payload.deposit_target===3000 && ins.payload.deposit_monthly===300, 'คนใหม่: insert deposit_target 3,000 · deposit_monthly 300');
    E(`openEmpForm(1); document.getElementById('fFull').value='แก้ชื่อ';`);
    await E(`saveEmpForm()`);
    const upd = A.db.log.filter(l=>l.table==='employees' && l.op==='update').pop();
    ok(upd && !Object.keys(upd.payload).some(k=>/^deposit_/.test(k)), 'แก้ไขพนักงาน: payload ไม่มี deposit_* (เครื่องข้อมูลค้างเขียน 5,000/500 ทับไม่ได้)');
    // อีกเครื่องเพิ่งปิดยอด (เครื่องนี้ยังไม่เห็น) → delEmp อ่านใหม่ก่อนเช็ค
    E(`depositEntries=[]; f1.depOpen=0;`); A.T.deposit_entries = [{id:5,employee_id:1,period:'2026-09',amount:500,note:'lock'}];
    A.db.log.length = 0; await E(`delEmp(1)`);
    ok(!A.db.log.some(l=>l.table==='punches' && l.op==='delete') && !A.db.log.some(l=>l.table==='employees' && l.op==='delete'), 'ลบพนักงานที่มีประวัติเงินประกัน → ไม่ลบสแกน/ไม่ลบคน (ใช้ "พ้นสภาพ")');
  }

  // ============ 14, 15) โหลดเกิน 1,000 แถว · โหลดล้ม ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[14 เกิน 1,000 แถว · 15 โหลดล้ม = fail closed]');
    E(SEED);
    const rows = []; let id = 1;
    for(let e=1; e<=145; e++) for(let k=0; k<18; k++){ const d = new Date(2026, 7 + k, 1); rows.push({ id:id++, employee_id:e, period:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), amount:300, note:'lock', created_at:'' }); }
    A.T.deposit_entries = rows.slice(0, 2600);
    A.T.employees = Array.from({length:145}, (_,i)=>({ id:i+1, code:'E'+(i+1), nick:'n'+(i+1), branch:'JJLP', wage_type:'monthly', rate:12000, active:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true, deposit_target_v1:5000, deposit_monthly_v1:500 }));
    A.T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:0, late_fine:0, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08' }];
    await E(`loadAll()`);
    ok(E(`depositEntries.length`)===2600 && E(`depReady && !depLoadErr`), 'loadAll: deposit_entries 2,600 แถว (145 คน × 18 งวด) ได้ครบ (แบ่งหน้า 1,000)');
    ok(E(`depositCalc(employees.find(e=>e.id===145),'2027-12').collected`)===E(`depositEntries.filter(x=>x.empId===145&&x.period<='2027-12').length*300`), 'ยอดสะสมของคนสุดท้าย (แถวอยู่หน้า 3) ถูก');
    E(`startRealtime()`);
    A.T.deposit_entries.push({ id:99999, employee_id:1, period:'2028-02', amount:300, note:'lock' });
    A.db.chans['jjmk-live'].deposit_entries(); await wait(1100);
    ok(E(`depositEntries.length`)===2601, 'realtime: โหลดใหม่แบบแบ่งหน้าได้ครบ 2,601 แถว');
    // คำตอบสลับลำดับ → ใช้คำตอบล่าสุด
    let phase = 1; A.db.latency = (t, op) => t==='deposit_entries' ? (phase===1 ? 900 : 5) : 0;
    A.db.chans['jjmk-live'].deposit_entries(); await wait(850);           // คำขอที่ 1 เริ่ม (ช้า)
    A.T.deposit_entries = A.T.deposit_entries.slice(0, 2000); phase = 2;
    A.db.chans['jjmk-live'].deposit_entries(); await wait(2600);          // คำขอที่ 2 (เร็ว) ตอบก่อน · คำขอที่ 1 ตอบทีหลังด้วยข้อมูลเก่า
    ok(E(`depositEntries.length`)===2000 && !E(`depLoadErr`), 'realtime ตอบสลับลำดับ → ใช้คำตอบของคำขอล่าสุด (2,000) ทิ้งคำตอบเก่า (ไม่ตั้ง depLoadErr จากคำตอบเก่า)');
    A.db.latency = null;
    A.db.countLie.deposit_entries = 2500;   // count ไม่ตรงจำนวนที่ได้ = โหลดไม่ครบ
    await E(`loadAll()`);
    ok(/ไม่ครบ/.test(E(`depLoadErr`)), 'count ≠ จำนวนแถวที่ได้ → depLoadErr (ถือว่าโหลดไม่ครบ)');
    delete A.db.countLie.deposit_entries;
    A.db.fail.deposit_entries = { message:'timeout', code:'57014' };
    await E(`loadAll()`);
    ok(E(`depLoadErr`) && E(`depositEntries.length`)===2000, 'โหลดล้ม (timeout) → depLoadErr · เก็บข้อมูลชุดเดิมไว้ ไม่ล้าง');
    E(`refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    io.files.length = 0; A.db.log.length = 0;
    await E(`Promise.all([exportPayrollXlsx(), exportKbizPay(''), openTransferSummary(), openSlip(1,'2026-10'), printAllSlips()])`); await wait(50);
    await E(`depLockOpen()`); await E(`depRefundOpen()`);
    ok(io.files.length===0 && !A.d.getElementById('slipBg').classList.contains('show') && !A.d.getElementById('depLockBg').classList.contains('show') && !A.d.getElementById('depRefBg').classList.contains('show') && !A.db.log.length,
       'depLoadErr → Excel / K BIZ / ใบสรุปบัญชี / สลิป / 🔒 / 💸 ไม่ทำงาน (ไม่มีไฟล์ ไม่มีการเขียน)');
    E(`go('dep')`); ok(/โหลดเงินประกันไม่ครบ/.test(A.d.getElementById('depWarn').textContent), 'หน้า 🛡️ ขึ้นแถบแดง "โหลดเงินประกันไม่ครบ"');
    A.db.fail.deposit_entries = { code:'42P01', message:'relation "deposit_entries" does not exist' };
    await E(`loadAll()`);
    ok(E(`depReady`)===false && E(`depLoadErr`)==='', 'error 42P01 (ยังไม่มีตาราง) → depReady=false ทำงานแบบเดิม (ไม่บล็อก)');
  }

  // ============ 21, 22, 23, 25) สิทธิ์ · ใบสรุปบัญชี · ตัวเลือกงวด/แถบเตือน · K BIZ ล็อกอัตโนมัติ ============
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[21 สิทธิ์ · 22 ใบสรุปบัญชี · 23 งวด/แถบเตือน · 25 K BIZ]');
    E(SEED); E(`AUTH={username:'m',role:'manager',apps:{payroll:{dep:'vae',payroll:'vae'}}}; applyUser(AUTH);
      var p1=emp({id:1,code:'P1',nick:'หนึ่ง',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      var p2=emp({id:2,code:'P2',nick:'สอง',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      employees=[p1,p2]; shifts={P1:mk('2026-07-26','2026-11-05'),P2:mk('2026-07-26','2026-11-05')}; depositEntries=[];
      go('dep'); renderDeposit();`);
    A.d.getElementById('depPeriodSel').value='2026-09'; await E(`depLockOpen()`);
    ok(E(`depLockState.items.length`)===2 && [...A.d.querySelectorAll('#depLockBody input[data-i]')].every(i=>i.readOnly), 'บัญชี dep:vae (ไม่ใช่เจ้าของ) → 🔒 ได้ แต่ช่องยอดอ่านอย่างเดียว');
    io.toasts = []; await E(`depRefundOpen()`);
    ok(!A.d.getElementById('depRefBg').classList.contains('show'), 'ไม่ใช่เจ้าของ/แอดมิน → 💸 ไม่เปิด');
    A.T.deposit_entries = [{ id:50, employee_id:1, period:'2026-09', amount:0, note:'lock' }]; await E(`depRefresh()`);
    io.prompts.length = 0; await E(`editDeposit(1,'2026-09')`);
    ok(!io.prompts.length, 'แถว 🔒: ไม่ใช่เจ้าของ → ✎ แสดงอย่างเดียว (ไม่ถามยอด)');
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); go('payroll');`);
    io.prompts.length = 0; await E(`editDeposit(1,'2026-09')`);
    ok(!io.prompts.length, 'แถว 🔒 เปิดจากหน้าสรุปเงินเดือน (แม้เป็นเจ้าของ) → แสดงอย่างเดียว "แก้ที่หน้า 🛡️"');
    // 23 depPeriods/แถบเตือน
    ok(E(`depPeriods().includes('2026-08') && depPeriods().includes('2026-11')`), 'depPeriods() มี ส.ค. ถึงงวดปัจจุบัน (ไม่อิงสแกนอย่างเดียว)');
    E(`shifts.P1 = shifts.P1.filter(s=>periodOfE(p1,s.day)!=='2026-08')`);
    ok(E(`depPeriods().includes('2026-08')`), 'สแกน ส.ค. หลุดจากเครื่อง → ยังมีงวด ส.ค. ให้เลือก');
    const ul = JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`));
    ok(ul.some(x=>x.p==='2026-08') && ul.some(x=>x.p==='2026-10' && x.n===2), 'แถบเตือน: งวดที่จ่ายแล้วแต่ยังไม่ปิดยอด ส.ค. / ต.ค. (2 คน)');
    E(`refreshPeriodSelectors(); renderPayroll()`); ok(/ยังไม่ปิดยอดเงินประกัน/.test(A.d.getElementById('payWarn').textContent), 'หน้าสรุปเงินเดือนขึ้นแถบเตือนงวดที่ยังไม่ปิดยอด');
    A.setNow('2027-04-10T12:00:00+07:00');
    ok(JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)).find(x=>x.p==='2026-08').red, 'งวด ส.ค. 69 ใกล้ขอบหน้าต่างสแกน (เม.ย. 70 − 8 เดือน) < 45 วัน → แถบแดง');
    A.setNow('2027-05-10T12:00:00+07:00');
    ok(E(`punchSinceDate()`)==='2026-07-26', 'loadPunches: ช่วงโหลดสแกนย้อนถึงวันเปิดงวด ส.ค. ที่ยังไม่ปิดยอด (ไม่เก่ากว่า depStart)');
    A.setNow('2026-11-06T12:00:00+07:00');
    // 22 ใบสรุปบัญชีร่วม: สองไม่มีวันทำงานงวด พ.ย. แต่ได้คืน → อยู่ทั้งใบสรุปและ K BIZ
    E(`p2.depOpen=5000; shifts.P2 = shifts.P2.filter(s=>periodOfE(p2,s.day)<'2026-11'); shifts.P1 = mk('2026-07-26','2026-11-05');`);
    A.T.deposit_entries = [{ id:61, employee_id:1, period:'2026-11', amount:-2000, note:'refund' }, { id:62, employee_id:2, period:'2026-11', amount:-2000, note:'refund' }]; await E(`depRefresh()`);
    E(`refreshPeriodSelectors(); document.getElementById('periodSel').innerHTML+='<option>2026-11</option>'; document.getElementById('periodSel').value='2026-11';`);
    await E(`openTransferSummary()`);
    const ts = A.d.getElementById('slipBody').textContent;
    ok(/หนึ่ง/.test(ts) && /สอง/.test(ts) && ts.includes(E(`THB2(calcPay(p1,'2026-11').net + calcPay(p2,'2026-11').net)`)), 'ใบสรุปบัญชีร่วม: รวมคนที่ทำงานอยู่ไม่มีวันทำงานแต่ได้คืน → ยอดใบสรุป = ยอดในไฟล์ K BIZ');
    // 25 K BIZ: ต.ค. ยังมีคนเกินเป้าไม่คืน → confirm · พ.ย. → ล็อก ต.ค. อัตโนมัติ (ไม่ล็อก พ.ย.)
    E(`p2.depOpen=0; document.getElementById('periodSel').value='2026-10';`);
    A.T.deposit_entries = []; await E(`depRefresh()`); A.T.deposit_entries = V1ROWS(E); await E(`depRefresh()`);   // รอบ 10: ส.ค./ก.ย. 🔒 แล้ว (K BIZ ปิดยอด ต.ค. ให้เฉพาะคนที่งวดก่อน ต.ค. 🔒 ครบ)
    io.confirms.length = 0; io.confirmAns = m => !/ยังไม่ได้คืนเงินประกันส่วนเกิน/.test(m); io.files.length = 0;
    await E(`Promise.resolve(exportKbizPay(''))`); await wait(50);
    ok(io.confirms.some(m=>/ยังไม่ได้คืนเงินประกันส่วนเกิน 1 คน/.test(m)) && !io.files.length, 'K BIZ ต.ค. ยังมีคนเกินเป้าไม่คืน → ถามก่อน (ตอบไม่ = ไม่สร้างไฟล์)');
    io.confirmAns = null;
    E(`document.getElementById('periodSel').value='2026-11';`);
    await E(`Promise.resolve(exportKbizPay(''))`); await wait(50);
    ok(T.deposit_entries.some(r=>r.period==='2026-10' && r.note==='lock') && !T.deposit_entries.some(r=>r.period==='2026-11'), 'K BIZ พ.ย. → ล็อก ต.ค. (และงวดก่อน) อัตโนมัติ · ไม่ล็อก พ.ย. เอง');
    ok(/ปิดยอดงวด .*อัตโนมัติ/.test(A.d.getElementById('kbizResBody').textContent), 'หน้าต่างผลไฟล์บอก "🔒 ปิดยอดงวด … อัตโนมัติ N แถว"');
    const nW = A.db.log.filter(l=>l.op!=='select').length; await E(`Promise.resolve(exportKbizPay(''))`); await wait(50);
    ok(A.db.log.filter(l=>l.op!=='select').length===nW, 'สร้างไฟล์ซ้ำ → ไม่เขียนเพิ่ม');
    E(`AUTH={username:'x',role:'staff',apps:{payroll:{payroll:'vae'}}}; applyUser(AUTH); go('payroll'); document.getElementById('periodSel').value='2026-11';`);
    A.T.deposit_entries = []; await E(`depRefresh()`); A.T.deposit_entries = V1ROWS(E); await E(`depRefresh()`); A.db.log.length = 0;
    await E(`Promise.resolve(exportKbizPay(''))`); await wait(50);
    ok(!A.db.log.some(l=>l.table==='deposit_entries') && /ให้ผู้มีสิทธิ์หน้า/.test(A.d.getElementById('kbizResBody').textContent), 'K BIZ โดยคนไม่มีสิทธิ์หน้า 🛡️ → ไม่ล็อก แต่เตือนในหน้าต่างผล');
  }

  // ============ 26) K BIZ: ยกเลิก = ไม่เขียน · ล็อกถามพร้อมสรุป · ข้อมูลค้าง · ยังไม่รัน v2 ============
  { const A = boot({ now:'2026-11-03T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[26 K BIZ ยกเลิก/สรุปก่อนล็อก · อ่านใหม่ก่อนออกไฟล์ · เตือนยังไม่รัน v2 · สลิปคนได้คืนอย่างเดียว · ช่วงโหลดสแกน · ค่าตั้งต้น 🔒 · ฟอร์มพนักงาน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'เอ',deposit_target_v1:5000,deposit_monthly_v1:500,deposit_opening:4500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      var b=emp({id:2,code:'B',nick:'บี',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'2222222222'});
      employees=[a,b]; shifts={A:mk('2026-07-26','2026-11-02'),B:mk('2026-07-26','2026-11-02')}; depositEntries=[];
      go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    T.deposit_entries = []; await E(`depRefresh()`);
    const nW = () => A.db.log.filter(l=>l.op!=='select').length;
    // ยกเลิกตอนถามวันเงินเข้า
    io.files.length = 0; A.db.log.length = 0; io.promptAns = [null];
    await E(`exportKbizPay('')`); await wait(20);
    ok(!io.files.length && !nW() && !T.deposit_entries.length, 'K BIZ ต.ค.: กดยกเลิกตอนถามวันเงินเข้า → ไม่มีไฟล์ · ไม่เขียนแถว 🔒 เลย');
    // ตอบ "ไม่" ตอนถามคืนส่วนเกิน
    io.confirmAns = m => !/ยังไม่ได้คืนเงินประกันส่วนเกิน/.test(m); io.confirms.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    ok(!io.files.length && !nW() && io.confirms.some(m=>/ยังไม่ได้คืนเงินประกันส่วนเกิน 1 คน/.test(m)), 'ตอบ "ไม่" ตอนถาม "ยังไม่ได้คืนส่วนเกิน" → ไม่มีไฟล์ · ไม่เขียน');
    // ผลตรวจรอบสุดท้าย M1: ส.ค./ก.ย. (ก่อน ต.ค. 69 · ยังไม่เคย 🔒) ไม่ล็อกอัตโนมัติ → ไม่ถาม "จะปิดยอด" · ไม่เขียน · สร้างไฟล์ · แถบเตือนยังบอก
    io.confirmAns = null; io.confirms.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && !io.confirms.some(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) && !T.deposit_entries.length && !nW(),
       'K BIZ ต.ค. (3 พ.ย.): ส.ค./ก.ย. ก่อน ต.ค. 69 ไม่ล็อกอัตโนมัติ (ไม่ถาม · ไม่เขียนแถว 🔒) → สร้างไฟล์');
    ok(JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)).map(x=>x.p+':'+x.n).join()==='2026-08:2,2026-09:2', 'แถบเตือนยังบอก ส.ค./ก.ย. 2 คนยังไม่ปิดยอด (เจ้าของตรวจแล้ว 🔒 เอง)');
    // อีกเครื่องกด 💸 คืนส่วนเกิน (เครื่องนี้พลาด realtime) → ไฟล์ต้องมียอดคืน
    const netA0 = E(`calcPay(a,'2026-10').net`);
    T.deposit_entries.push({ id:7001, employee_id:1, period:'2026-10', amount:-2000, note:'refund' });
    ok(E(`calcPay(a,'2026-10').net`)===netA0, '(ข้อมูลในเครื่องยังค้าง: ยังไม่เห็นยอดคืน)');
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    const kr = io.files.length && io.files[0].aoa.slice(3).find(r=>r[1]==='1111111111');
    ok(kr && kr[3]===netA0 + 2000, `K BIZ อ่านสมุดเงินประกันใหม่ก่อนออกไฟล์ → ยอดเอ = ${netA0} + คืน 2,000 (ได้ ${kr && kr[3]})`);
    T.deposit_entries = T.deposit_entries.filter(r=>r.id!==7001); await E(`depRefresh()`);
    io.files.length = 0; T.deposit_entries.push({ id:7002, employee_id:1, period:'2026-10', amount:-2000, note:'refund' });
    await E(`exportPayrollXlsx()`);
    const xr = io.files.length && io.files[0].aoa.find(r=>r[0]==='เอ');
    ok(xr && xr[io.files[0].aoa[0].indexOf('คืนเงินประกัน')]===2000, 'Excel อ่านใหม่ก่อนออกไฟล์ → คอลัมน์ "คืนเงินประกัน" 2,000');
    // สลิป: คนที่ยังทำงานอยู่ ไม่มีวันทำงานงวดนี้ แต่ได้ยอดคืน → มีสลิป · คนไม่มีวันทำงานและยอด 0 → ไม่มี
    E(`var c=emp({id:3,code:'C',nick:'ซี',deposit_target_v1:5000,deposit_monthly_v1:500,deposit_opening:5000}); var d=emp({id:4,code:'D',nick:'ดี'}); employees.push(c,d); shifts.C=[]; shifts.D=[];`);
    T.deposit_entries.push({ id:7003, employee_id:3, period:'2026-10', amount:-2000, note:'refund' }); await E(`depRefresh()`);
    const sl = E(`slipFilterList('2026-10').map(x=>x.e.nick).join()`);
    ok(/ซี/.test(sl) && !/ดี/.test(sl), 'เลือกพิมพ์สลิป: คนไม่มีวันทำงานแต่ได้คืน 2,000 อยู่ในรายชื่อ · คนไม่มีวันทำงานยอด 0 ไม่อยู่ (ได้ '+sl+')');
    // ยังไม่รัน jj_deposit_v2.sql → เตือนทุกจุดที่ออกเงินงวด ≥ ต.ค.
    // ฐานข้อมูลไม่มีคอลัมน์ _v1 (ยังไม่รัน v2 จริง) — moneyFresh อ่านใหม่ได้ 42703 → อ่านซ้ำโดยไม่ใส่ _v1 · depV2Col = false
    A.db.cols.employees = ['id','code','nick','deposit_target','deposit_monthly','deposit_opening','deposit_on'];
    E(`employees.forEach(e=>{e.depTargetV1=null; e.depMonthlyV1=null;}); depV2Col=false; renderPayroll();`);
    ok(/ยังไม่ได้รัน jj_deposit_v2\.sql/.test(A.d.getElementById('payWarn').textContent), 'หน้าสรุปเงินเดือนงวด ต.ค.: แถบแดง "ยังไม่ได้รัน jj_deposit_v2.sql"');
    io.files.length = 0; io.confirms.length = 0; io.confirmAns = m => !/jj_deposit_v2\.sql/.test(m);
    await E(`exportKbizPay('')`); await E(`exportPayrollXlsx()`); await E(`openSlip(1,'2026-10')`); await wait(20);
    ok(!io.files.length && io.confirms.filter(m=>/jj_deposit_v2\.sql/.test(m)).length===3 && !A.d.getElementById('slipBg').classList.contains('show'), 'K BIZ / Excel / สลิป งวด ต.ค. ถาม "ยังไม่ได้รัน jj_deposit_v2.sql" ก่อน (ตอบไม่ = ไม่ออก)');
    E(`document.getElementById('periodSel').value='2026-09'`); io.confirms.length = 0;
    await E(`exportPayrollXlsx()`);
    ok(io.files.length===1 && !io.confirms.some(m=>/jj_deposit_v2/.test(m)), 'งวด ก.ย. (ก่อนกติกาใหม่) ไม่ถาม');
    io.confirmAns = null; delete A.db.cols.employees;
    // ค่าตั้งต้น "ยอดที่จะล็อก" = ยอดที่ระบบคิด เมื่อ ✎ ไม่ถูกนับ (ปิดหัก)
    E(`var f=emp({id:5,code:'F',nick:'เอฟ',deposit_on:false}); employees.push(f); shifts.F=mk('2026-07-26','2026-11-02'); go('dep');`);
    T.deposit_entries.push({ id:7004, employee_id:5, period:'2026-09', amount:400, note:'' }); await E(`depRefresh()`);
    E(`renderDeposit(); document.getElementById('depPeriodSel').value='2026-09';`); await E(`depLockOpen()`);
    const fx = JSON.parse(E(`JSON.stringify((depLockState.items.find(x=>x.e.id===5))||null)`) || 'null');
    ok(fx && fx.sys===0 && fx.man===400 && fx.amount===0, '🔒 พรีวิว: ✎ 400 แต่ปิดหักอยู่ (สลิปหัก 0) → ค่าตั้งต้น "ยอดที่จะล็อก" = 0 (ยอดที่ระบบคิด)');
    E(`closeModal('depLockBg')`);
    // ฟอร์มพนักงาน: เปลี่ยนฐานเงินเดือนคนที่ไม่มีงวดให้ล็อก → ไม่ถามเพิ่ม
    E(`var g=emp({id:6,code:'G',nick:'จี',deposit_on:false}); employees.push(g); shifts.G=[];`);
    io.confirms.length = 0;
    E(`go('emp'); openEmpForm(6); document.getElementById('fRate').value='15000';`); await E(`saveEmpForm()`);
    ok(!io.confirms.length && E(`employees.find(e=>e.id===6).rate`)===15000, 'ฟอร์มพนักงาน: เปลี่ยนฐานเงินเดือนคนที่ไม่มีงวดให้ปิดยอด → บันทึกเลย ไม่ถามเพิ่ม');
    // ช่วงโหลดสแกน (M2: "ยังไม่ปิดยอด" = เงื่อนไขเดียวกับที่ 🔒 ล็อกได้ = มีวันทำงาน/มีแถว ✎): คนลาออก/คนใหม่ที่ไม่มีวันทำงานในงวดเก่า ไม่ดึงหน้าต่างค้าง
    A.setNow('2027-05-10T12:00:00+07:00');
    E(`employees=[a,b]; a.depTargetV1=5000; a.depMonthlyV1=500; b.depTargetV1=5000; b.depMonthlyV1=500;`);
    T.deposit_entries = [{id:8001,employee_id:1,period:'2026-08',amount:500,note:'lock'},{id:8002,employee_id:1,period:'2026-09',amount:0,note:'lock'},
                         {id:8003,employee_id:2,period:'2026-08',amount:500,note:'lock'},{id:8004,employee_id:2,period:'2026-09',amount:500,note:'lock'}];
    await E(`depRefresh()`);
    ok(E(`punchSinceDate()`)==='2026-09-10', 'ส.ค./ก.ย. ปิดยอดครบ → ช่วงโหลดสแกนปกติ (วันนี้ − 8 เดือน = 10 ก.ย. 69)');
    E(`var q=emp({id:9,code:'Q',nick:'ลาออก',active:false,deposit_target_v1:5000,deposit_monthly_v1:500}); employees.push(q);`);
    ok(E(`punchSinceDate()`)==='2026-09-10', 'คนลาออก (active=false) ไม่ใส่วันสิ้นสุด และไม่มีแถว → ไม่ดึงช่วงโหลดย้อนไป ส.ค. ตลอดไป');
    E(`q.active=true;`);
    ok(E(`punchSinceDate()`)==='2026-09-10', 'คนที่ยังทำงานอยู่แต่ไม่มีวันทำงาน ส.ค. (คนใหม่ไม่ได้กรอกวันเริ่มงาน — 🔒 ล็อกไม่ได้) → ไม่ดึงหน้าต่าง (เดิมยืดค้าง)');
    E(`shifts.Q=mk('2026-07-26','2026-08-25');`);
    ok(E(`punchSinceDate()`)==='2026-07-26' && E(`depLockDue(q,{}).some(x=>x.p==='2026-08')`), 'มีวันทำงาน ส.ค. และยังไม่ปิดยอด (🔒 ล็อกได้) → ย้อนถึง 26 ก.ค. 69');
    A.setNow('2028-12-10T12:00:00+07:00');
    ok(E(`punchSinceDate()`) > '2027-01-01' && /เก่าเกินช่วงโหลดสแกน/.test(E(`punchCapNote`)), 'ย้อนเกิน 12 เดือนจากหน้าต่างปกติ → ไม่ย้อนให้ + แถบเตือน punchCapNote');
  }

  // ============ 27) ความเร็ว: 145 คน × สแกน 8 เดือน — หน้าเดิมต้องไม่ช้าลงจากเงินประกัน/สำรองฯ ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E } = A; await wait(300);
    console.log('[27 ความเร็ว 145 คน × 8 เดือน (ส.ค./ก.ย. ยังไม่ปิดยอด)]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; pvdMembers=[]; pvdEntries=[]; pvdPayouts=[]; employees=[]; shifts={};
      for(let i=0;i<145;i++){ const e=emp({id:i+1,code:'C'+i,nick:'n'+i,branch:['JJLP','JJRD','OFFICE','JJCK'][i%4],deposit_target_v1:5000,deposit_monthly_v1:500}); employees.push(e); shifts[e.code]=mk('2026-02-20','2026-10-19'); }
      for(let i=0;i<20;i++) pvdMembers.push(fromDbPvdM({id:i+1,employee_id:i+1,emp_mode:'pct',emp_value:3,er_mode:'match',er_value:50,start_period:'2026-10'}));
      depositEntries=[]; go('payroll'); refreshPeriodSelectors(); renderAll();`);
    const T0 = js => { const t = Date.now(); E(js); return Date.now() - t; };
    const tNew = Math.min(T0('renderAll()'), T0('renderAll()')), tDu = T0('depUnlockedPeriods()');
    E(`depReady=false; pvdReady=false;`);
    const tOld = Math.min(T0('renderAll()'), T0('renderAll()'));
    E(`depReady=true; pvdReady=true;`);
    ok(tDu < 300, `depUnlockedPeriods() ${tDu} ms (< 300 ms · เดิม ~7,000 ms)`);
    ok(tNew <= tOld * 1.5 + 300, `renderAll มีเงินประกัน/สำรองฯ ${tNew} ms ≤ ไม่มี ${tOld} ms × 1.5 + 300`);
  }

  // ============ 28) เครื่องเปิดค้างตอนรัน jj_deposit_v2.sql · ตรวจ v2 จากคอลัมน์ · อ่านพนักงานไม่ได้ = หยุด ============
  { const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[28 เครื่องค้างหลังรัน v2 (พลาด realtime employees) · depV2Col · fail closed · กดซ้ำ]');
    E(SEED);
    const row = { id:1, code:'A', nick:'เอ', full_name:'เอ ทดสอบ', branch:'JJLP', wage_type:'monthly', rate:12000, work_mode:'shift', shift_id:1, active:true, must_work_exempt:true,
                  deposit_target:5000, deposit_monthly:500, deposit_opening:0, deposit_on:true, bank_name:'กสิกรไทย', bank_account:'1111111111' };
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); employees=[emp(${JSON.stringify(row)})]; var a=employees[0]; shifts={A:mk('2026-07-26','2026-10-27')};
       depositEntries=[]; depV2Col=false; go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; renderPayroll();`);
    T.deposit_entries = [{id:1,employee_id:1,period:'2026-08',amount:500,note:'lock'},{id:2,employee_id:1,period:'2026-09',amount:500,note:'lock'}];
    T.employees = [{ ...row }];
    await E(`depRefresh()`);
    ok(E(`depV2On()`)===false && E(`calcPay(a,'2026-10').dep.ded`)===500, '(โหลดก่อนรัน SQL: ต.ค. หัก 500 · depV2On false)');
    // เจ้าของรัน jj_deposit_v2.sql — เครื่องนี้พลาด UPDATE ของ employees
    T.employees[0] = { ...row, deposit_target:3000, deposit_monthly:300, deposit_target_v1:5000, deposit_monthly_v1:500 };
    const netStale = E(`calcPay(a,'2026-10').net`);
    io.files.length = 0; io.confirms.length = 0;
    await E(`exportKbizPay('')`); await wait(30);
    const kr = io.files.length && io.files[0].aoa.slice(3).find(r=>r[1]==='1111111111');
    ok(E(`depV2On() && depV2Col`) && E(`a.depTarget`)===3000 && E(`a.depMonthly`)===300 && E(`a.depTargetV1`)===5000 && E(`calcPay(a,'2026-10').dep.ded`)===300,
       'ก่อนสร้าง K BIZ อ่านค่าเงินประกันของพนักงานใหม่ → 3,000/300 + _v1 5,000/500 · ต.ค. หัก 300 (ไม่ใช่ 500)');
    ok(kr && kr[3]===netStale + 200 && !io.confirms.some(m=>/jj_deposit_v2/.test(m)), `ไฟล์ K BIZ ใช้ยอดหัก 300 (สุทธิ ${netStale} + 200 = ${kr && kr[3]}) · ไม่ขึ้น "ยังไม่ได้รัน jj_deposit_v2.sql" ผิด ๆ`);
    // สาขาใหม่ (บัญชี _br) จ้างทุกคนหลังรัน v2 → _v1 null ทุกคน แต่มีคอลัมน์ = ไม่เตือน
    E(`a.depTargetV1=null; a.depMonthlyV1=null; depV2Col=true; renderPayroll();`);
    ok(!/jj_deposit_v2/.test(A.d.getElementById('payWarn').textContent) && E(`depV2Missing('2026-10')`)===false, 'มีคอลัมน์ _v1 แล้ว แต่พนักงานที่เห็นเป็นคนใหม่ทั้งหมด (_v1 null) → ไม่ขึ้นแถบแดง "ยังไม่ได้รัน v2"');
    // loadAll: ตั้ง depV2Col จากคอลัมน์ของแถวแรก
    T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:0, late_fine:0, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08' }];
    T.employees = [{ ...row, deposit_target:3000, deposit_monthly:300, deposit_target_v1:null, deposit_monthly_v1:null }];
    await E(`loadAll()`);
    ok(E(`depV2Col`)===true && E(`depV2On()`)===true, 'loadAll: มีช่อง deposit_target_v1 (ค่า null) → depV2Col true');
    E(`a=employees[0]; shifts={A:mk('2026-07-26','2026-10-27')}; go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    // อ่านพนักงานไม่ได้ = ไม่ออกตัวเลขเงิน (fail closed)
    A.db.fail.employees = { message:'timeout' }; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(30);
    ok(!io.files.length && /อ่านค่าเงินประกันของพนักงานใหม่ไม่สำเร็จ/.test(A.d.getElementById('toast').textContent), 'อ่าน employees ใหม่ไม่ได้ → ไม่สร้างไฟล์ K BIZ + แจ้ง');
    delete A.db.fail.employees;
    // กดซ้ำระหว่างอ่านยอดล่าสุด → ไฟล์เดียว
    io.files.length = 0; A.db.latency = () => 30;
    E(`exportPayrollXlsx(); exportPayrollXlsx();`); await wait(600);
    A.db.latency = null;
    ok(io.files.length===1, `กด Excel ซ้ำระหว่างอ่านยอดล่าสุด → ได้ไฟล์เดียว (ได้ ${io.files.length})`);
    // depRefresh: คำตอบ realtime ที่ยิงไปก่อน (ข้อมูลเก่า) มาถึงทีหลัง → ไม่ทับข้อมูลสด
    E(`startRealtime()`);
    let ph = 1; A.db.latency = (t, op) => t==='deposit_entries' ? (ph===1 ? 900 : 5) : 0;
    A.db.chans['jjmk-live'].deposit_entries(); await wait(850);          // realtime เริ่มอ่าน (ช้า) ตอนยังมี 2 แถว
    ph = 2; T.deposit_entries.push({ id:3, employee_id:1, period:'2026-10', amount:-200, note:'refund' });
    await E(`depRefresh()`);                                               // อ่านสด 3 แถว
    await wait(1200);                                                      // คำตอบ realtime (2 แถว) มาถึงทีหลัง
    A.db.latency = null;
    ok(E(`depositEntries.length`)===3, 'depRefresh เลื่อนเลขลำดับคำขอ → คำตอบ realtime เก่าที่มาถึงทีหลังไม่ทับข้อมูลสด (ยังเห็น 💸 ที่อีกเครื่องเพิ่งบันทึก)');
  }

  // ============ 29) 💸 งวดที่โอนแล้ว · เป้า 0 · เลื่อนงวดเริ่มย้อนหลัง · สุทธิหลังคืนติดลบ · ✎ งวดไม่มีวันทำงาน · ลบพนักงาน · ประวัติเงินเดือน · ปุ่มเปิดหน้ารวม ============
  { const A = boot({ now:'2026-12-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[29 แก้ 💸 หลังโอน · เป้า 0 · งวดเริ่มย้อนหลัง · คืนแล้วสุทธิติดลบ · ✎ ไม่มีวันทำงาน · ลบพนักงาน · ประวัติเงินเดือน · สิทธิ์ปุ่ม]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'เอ',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500});
      var z=emp({id:2,code:'Z',nick:'ศูนย์',deposit_target:0,deposit_monthly:500,deposit_target_v1:5000,deposit_monthly_v1:500});
      employees=[a,z]; shifts={A:mk('2026-07-26','2026-12-10'), Z:mk('2026-07-26','2026-12-10')}; go('dep');`);
    T.deposit_entries = [{id:1,employee_id:1,period:'2026-08',amount:0,note:'lock'},{id:2,employee_id:1,period:'2026-09',amount:0,note:'lock'},{id:3,employee_id:1,period:'2026-10',amount:-2000,note:'refund'},
                         {id:4,employee_id:2,period:'2026-08',amount:500,note:'lock'},{id:5,employee_id:2,period:'2026-09',amount:500,note:'lock'}];
    await E(`depRefresh()`);
    const net10 = E(`calcPay(a,'2026-10').net`);
    io.promptAns = ['']; io.alerts.length = 0; A.db.log.length = 0;
    await E(`editDeposit(1,'2026-10')`);
    ok(!A.db.log.some(l=>l.op!=='select') && T.deposit_entries.some(r=>r.id===3) && E(`calcPay(a,'2026-10').net`)===net10 && /เลยกำหนดสร้างไฟล์โอนแล้ว/.test(io.alerts.join()) && !io.prompts.length,
       `💸 งวด ต.ค. (จ่าย 5 พ.ย.) วันที่ 10 ธ.ค. → แก้/ยกเลิกยอดคืนไม่ได้ (ไม่ถามยอด · แถวอยู่ครบ · สุทธิ ต.ค. ยัง ${net10})`);
    io.promptAns = [];
    // เป้า 0: ไม่ขึ้น "เกินเป้า" · ไม่ถามตอนสร้างไฟล์ · 💸 ไม่มีรายชื่อ
    const dz = JSON.parse(E(`JSON.stringify(depositCalc(z,'2026-12'))`));
    ok(dz.target===0 && dz.collected===1000 && dz.over===0, 'เป้า 0 (หยุดหัก) ล็อก ส.ค./ก.ย. 500/500 → สะสม 1,000 · over 0 (ไม่ขึ้น "เกินเป้า ยังไม่คืน")');
    io.confirms.length = 0;
    ok(E(`depOverAsk(employees.map(e=>({e,p:calcPay(e,'2026-12')})),'2026-12')`)===true && !io.confirms.length, 'depOverAsk งวด ธ.ค. ไม่ถามเรื่องคนเป้า 0 (💸 คืนให้คนเป้า 0 ไม่ได้ — เงื่อนไขเดียวกัน)');
    ok(E(`depositCalc(Object.assign({}, a, {depTargetV1:3000, depMonthlyV1:500}),'2026-09').over`)===0, 'งวดก่อน 2026-10 ไม่ขึ้นชิป "เกิน X" (ยังไม่มีการคืน)');
    E(`document.getElementById('depPeriodSel').value='2026-12'; renderDeposit();`);
    await E(`depRefundOpen()`);
    ok(E(`depRefState.items.length`)===0, '💸 ธ.ค.: ไม่มีรายชื่อ (เอคืนแล้ว · ศูนย์เป้า 0)');
    E(`closeModal('depRefBg')`);
    // เลื่อน "เริ่มหักตั้งแต่งวด" ย้อนไปงวดที่จ่ายแล้ว / ทุกงวด = ห้าม
    E(`renderDeposit();`);
    const opt = v => E(`(o=>o?o.disabled:null)([...document.getElementById('depStartSel').options].find(o=>o.value==='${v}'))`);
    ok(opt('')===true && opt('2026-08')===false, 'ตัวเลือก "ทุกงวด (คิดย้อนหลัง)" ถูกปิด · งวดเริ่มปัจจุบัน (ส.ค.) เลือกได้');
    E(`[...document.getElementById('depStartSel').options].forEach(o=>o.disabled=false); document.getElementById('depStartSel').innerHTML += '<option value="2026-07">ก.ค.</option>';`);
    A.db.log.length = 0; io.alerts.length = 0;
    E(`document.getElementById('depStartSel').value='2026-07'`); await E(`depStartChange(document.getElementById('depStartSel'))`);
    E(`document.getElementById('depStartSel').value=''`); await E(`depStartChange(document.getElementById('depStartSel'))`);
    ok(E(`settings.depStart`)==='2026-08' && !A.db.log.some(l=>l.op!=='select') && io.alerts.filter(m=>/ห้ามเลื่อน/.test(m)).length===2,
       'เลือก ก.ค. 69 (จ่ายแล้ว) หรือ "ทุกงวด" → บล็อก "ห้ามเลื่อน…ย้อนไป" · depStart ยังเป็น ส.ค. · ไม่เขียนอะไร (ไม่หัก 500 ย้อนหลัง)');
    ok(E(`depStartBack('2026-08','2026-07')`)===true && E(`depStartBack('2026-12','2026-11')`)===true && E(`depStartBack('2027-03','2027-02')`)===false && E(`depStartBack('2026-08','2026-09')`)===false && E(`depStartBack('','2026-08')`)===false,
       'depStartBack: ย้อนไปงวดที่จ่ายแล้ว = ห้าม · ย้อนไปงวดที่ยังไม่จ่าย/เลื่อนไปข้างหน้า/ตั้งครั้งแรก = ได้');
    // 💸 พรีวิว: สุทธิหลังคืนยังติดลบ → เตือน + ไม่ติ๊ก
    E(`var n=emp({id:3,code:'N',nick:'ติดลบ',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500}); employees.push(n); shifts.N=mk('2026-12-01','2026-12-02');`);
    T.deposit_entries.push({id:6,employee_id:3,period:'2026-08',amount:0,note:'lock'},{id:7,employee_id:3,period:'2026-09',amount:0,note:'lock'});
    E(`advances=[{id:1,empId:3,period:'2027-01',amount:5000,date:'2026-12-05',note:''}];`);
    await E(`depRefresh()`);
    E(`document.getElementById('depPeriodSel').innerHTML += '<option value="2027-01">ม.ค. 70</option>'; document.getElementById('depPeriodSel').value='2027-01';`);
    await E(`depRefundOpen()`);
    const it = JSON.parse(E(`JSON.stringify((depRefState.items.find(x=>x.e.id===3))||null)`) || 'null');
    const netN = E(`calcPay(n,'2027-01').net`);
    ok(it && netN + it.amount < 0 && it.on===false && it.warn.some(w=>/สุทธิหลังคืนยังติดลบ/.test(w)) && /K BIZ ไม่โอน/.test(A.d.getElementById('depRefBody').textContent),
       `💸 สุทธิ ม.ค. ${netN} + คืน ${it && it.amount} ยังติดลบ → เตือน "สุทธิหลังคืนยังติดลบ — K BIZ ไม่โอน" · ไม่ติ๊กให้เอง`);
    E(`closeModal('depRefBg'); advances=[];`);
    // 🔒 พรีวิว: ✎ ในงวดที่ไม่มีวันทำงาน → ขึ้นธง
    E(`var w=emp({id:4,code:'W',nick:'ไม่มีสแกน',deposit_target_v1:5000,deposit_monthly_v1:500}); employees.push(w); shifts.W=mk('2026-07-26','2026-08-25');`);
    T.deposit_entries.push({id:8,employee_id:4,period:'2026-09',amount:500,note:''});
    await E(`depRefresh()`);
    E(`document.getElementById('depPeriodSel').value='2026-09';`);
    await E(`depLockOpen()`);
    const lw = JSON.parse(E(`JSON.stringify((depLockState.items.find(x=>x.e.id===4))||null)`) || 'null');
    ok(lw && lw.amount===500 && lw.flags.some(f=>/✎ ในงวดที่ไม่มีวันทำงาน/.test(f)), '🔒 พรีวิว ก.ย.: ✎ 500 ในงวดที่ไม่มีวันทำงาน → ธง "✎ ในงวดที่ไม่มีวันทำงาน — เช็คว่าหักจริง" (ยอดเท่าเดิม)');
    E(`closeModal('depLockBg')`);
    // 📚 ประวัติเงินเดือน: ไม่มียอดคืน = หน้าตาเดิม (500 ไม่มีเครื่องหมาย)
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);`);
    const hz = txt(E, `buildPayHistory(z,'2026-12')`);
    ok(/-500\.00 500 🔒/.test(hz) && !/-500\.00 -500/.test(hz) && /-1,000\.00 1,000 –/.test(hz), '📚 ประวัติเงินเดือน (ไม่มียอดคืน): ช่อง "เงินประกันงวดนี้" = "500" / รวม "1,000" ไม่มีเครื่องหมายลบ แบบเดิม');
    const ha = txt(E, `buildPayHistory(a,'2026-12')`);
    ok(/\+2,000 คืน/.test(ha), '📚 ประวัติเงินเดือน (มียอดคืน): "+2,000 คืน"');
    // ปุ่ม "เปิดหน้ารวม →" ซ่อนเมื่อไม่มีสิทธิ์ดูหน้านั้น
    E(`AUTH={username:'v',role:'staff',apps:{payroll:{detail:'v'}}}; applyUser(AUTH);`);
    const bz = E(`dtDebt(a, calcPay(a,'2026-12'), '2026-12')`);
    ok(!/go\('dep'\)/.test(bz) && !/go\('adv'\)/.test(bz), 'ไม่มีสิทธิ์ดู 🛡️/เบิก → ไม่มีปุ่ม "เปิดหน้ารวม/เปิดหน้าเงินประกัน/เปิดหน้าเบิก →"');
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);`);
    ok(/go\('dep'\)/.test(E(`dtDebt(a, calcPay(a,'2026-12'), '2026-12')`)), 'มีสิทธิ์ → มีปุ่มเปิดหน้าเงินประกัน');
    // ลบพนักงาน: มีแค่ยอดที่ระบบหักอัตโนมัติ (แถวซ้ำ) → เจ้าของพิมพ์ชื่อยืนยันได้ · พิมพ์ผิด = ไม่ลบ · ลบแถวพนักงานก่อนสแกน
    E(`var d=emp({id:5,code:'D',nick:'ซ้ำ',deposit_target_v1:5000,deposit_monthly_v1:500}); employees.push(d); shifts.D=mk('2026-11-26','2026-12-10'); go('emp');`);
    T.employees = [{ id:5, code:'D', nick:'ซ้ำ' }]; T.punches = [{ id:1, emp_code:'D', punch_date:'2026-12-01', punch_time:'09:00:00' }];
    io.promptAns = ['ผิด']; A.db.log.length = 0;
    await E(`delEmp(5)`);
    ok(!A.db.log.some(l=>l.op==='delete') && /ชื่อไม่ตรง/.test(A.d.getElementById('toast').textContent), 'ลบ "ซ้ำ" (มีเงินประกันจากสแกน ยังไม่ปิดยอด): พิมพ์ชื่อผิด → ไม่ลบ');
    ok(/มีเงินประกันสะสมในระบบ 300 บาท/.test(io.prompts[io.prompts.length-1]||''), 'ข้อความยืนยันบอกยอดที่จะหาย (300 บาท)');
    io.promptAns = ['ซ้ำ']; A.db.log.length = 0;
    await E(`delEmp(5)`);
    const dl = A.db.log.filter(l=>l.op==='delete').map(l=>l.table);
    ok(dl.join()==='employees,punches' && !E(`employees.some(e=>e.id===5)`), 'พิมพ์ชื่อถูก → ลบแถวพนักงานก่อน แล้วค่อยลบสแกน (FK ล้ม = สแกนยังอยู่)');
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{emp:'vaed',dep:'v'}}}; applyUser(AUTH); go('emp');`);
    io.alerts.length = 0; io.prompts.length = 0; A.db.log.length = 0;
    await E(`delEmp(2)`);
    ok(!A.db.log.some(l=>l.op==='delete') && /ใช้ "พ้นสภาพ" แทน/.test(io.alerts.join()) && !io.prompts.length, 'คนที่มีแถว 🔒 → ลบไม่ได้แม้เป็นผู้จัดการที่มีสิทธิ์ลบ (บอกให้ใช้ "พ้นสภาพ")');
    E(`depLoadErr='x';`); io.alerts.length = 0;
    await E(`delEmp(1)`);
    ok(/ยังลบพนักงานไม่ได้ \(เช็คประวัติเงินไม่ได้\)/.test(io.alerts.join()), 'โหลดเงินประกันไม่ครบ → ข้อความของการลบเอง (ไม่ใช่ข้อความเรื่องสลิป/Excel)');
    E(`depLoadErr='';`);
  }
  // ============ 30) ผลตรวจรอบสุดท้าย: H1 ✎ งวดไม่มีวันทำงาน = แบบแอปเดิม · M1 ไม่ล็อกงวดก่อน ต.ค. 69 อัตโนมัติ · L1 สลิป · L7 สำรอง · L10 ถามคืนส่วนเกิน ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[30 H1 ✎ งวดไม่มีวันทำงาน (ก่อน ต.ค. 69 = แบบแอปเดิม) · M1 แก้ค่าที่ผิด · L1 · L7 · L10]');
    E(SEED); E(OLD); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);`);
    // H1-a ยังไม่รัน v2 (_v1 null): ✎ ในงวดที่ไม่มีวันทำงาน (ส.ค./ก.ย./พ.ย.) + ✎ ต.ค. → เท่าแอปเดิมทุกงวด (ยกเว้น ✎ พ.ย. ที่สุทธิ 0 = ไม่หัก ตามกติกาใหม่)
    let n = 0, diff = 0, nCap = 0, capBad = 0;
    for(let i=0; i<300; i++){
      const tgt=[0,3000,5000,6000][i%4], mon=[300,500,700][i%3], op=[0,500,1800,2500,4000][i%5], on=(i%7)!==0, br=(i%5===0)?'OFFICE':'JJLP';
      const gapP = ['2026-08','2026-09','2026-11'][i%3];
      E(`var e1=emp({id:${i+1},code:'C${i}',nick:'n${i}',branch:'${br}',deposit_target:${tgt},deposit_monthly:${mon},deposit_opening:${op},deposit_on:${on}});
         employees=[e1]; shifts={C${i}:mk('2026-07-20','2027-01-25',k=>periodOfE(e1,k)==='${gapP}')}; depV2Col=false;
         depositEntries=[{id:1,empId:${i+1},period:'${gapP}',amount:${[200,500,1000][i%3]},note:''}${i%2 ? `,{id:2,empId:${i+1},period:'2026-10',amount:${(i*37)%900},note:''}` : ''}];`);
      for(const p of ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01']){
        const o = JSON.parse(E(`JSON.stringify(depositCalcOld(e1,'${p}'))`)), m = JSON.parse(E(`JSON.stringify(depositCalc(e1,'${p}'))`));
        // เจ้าของสั่ง 2026-10-20 (รอบ 2): งวด ≥ ต.ค. 69 หักไม่เกินสุทธิ — ✎ พ.ย. ในงวดไม่มีวันทำงาน (สุทธิ 0) = ไม่หัก (cap neg) → พ.ย. เป็นต้นไปต่างจากแอปเดิมโดยตั้งใจ
        if(gapP === '2026-11' && p >= '2026-11'){ if(p === '2026-11'){ nCap++; if(o.ded > 0 && !(m.ded === 0 && m.cap === 'neg' && m.want === o.ded)) capBad++; } continue; }
        n++;
        if(o.ded!==m.ded || o.collected!==m.collected || o.remain!==m.remain || o.done!==m.done){ diff++; if(diff<4) console.log('   DIFF', i, p, JSON.stringify(o), JSON.stringify(m)); }
      }
    }
    ok(diff === 0, `ยังไม่รัน v2: ✎ ในงวดที่ไม่มีวันทำงาน (ส.ค./ก.ย. + ต.ค. ทุกงวด) สุ่มเทียบแอปเดิม ${n} เคส ต่างกัน ${diff} เคส`);
    ok(capBad === 0 && nCap > 0, `✎ พ.ย. 69 ในงวดไม่มีวันทำงาน (สุทธิ 0): ไม่หัก + เหตุผล "สุทธิติดลบ" (cap neg · want = ยอด ✎) ${nCap} คน ผิด ${capBad}`);
    // H1-b หลังรัน v2 (_v1 = ค่าเดิม): งวดก่อน ต.ค. เท่าแอปเดิม (ที่ใช้ค่าเดิมเป็นเป้า/หัก) ทุกบาท
    n = 0; diff = 0;
    for(let i=0; i<300; i++){
      const tgt=[0,3000,5000,6000][i%4], mon=[300,500,700][i%3], op=[0,500,1800,2500,4000][i%5], on=(i%7)!==0, br=(i%5===0)?'OFFICE':'JJLP';
      const gapP = ['2026-08','2026-09'][i%2];
      E(`var e1=emp({id:${i+1},code:'C${i}',nick:'n${i}',branch:'${br}',deposit_target:3000,deposit_monthly:300,deposit_target_v1:${tgt},deposit_monthly_v1:${mon},deposit_opening:${op},deposit_on:${on}});
         var eo=Object.assign({}, e1, {depTarget:${tgt}, depMonthly:${mon}});
         employees=[e1]; shifts={C${i}:mk('2026-07-20','2026-12-25',k=>periodOfE(e1,k)==='${gapP}')}; depV2Col=true;
         depositEntries=[{id:1,empId:${i+1},period:'${gapP}',amount:${[200,500,1000][i%3]},note:''}${i%3===0 ? `,{id:2,empId:${i+1},period:'${gapP==='2026-08'?'2026-09':'2026-08'}',amount:${(i*37)%900},note:''}` : ''}];`);
      for(const p of ['2026-07','2026-08','2026-09']){
        n++;
        const o = JSON.parse(E(`JSON.stringify(depositCalcOld(eo,'${p}'))`)), m = JSON.parse(E(`JSON.stringify(depositCalc(e1,'${p}'))`));
        if(o.ded!==m.ded || o.collected!==m.collected || o.remain!==m.remain || o.done!==m.done){ diff++; if(diff<4) console.log('   DIFF', i, p, JSON.stringify(o), JSON.stringify(m)); }
      }
    }
    ok(diff === 0, `หลังรัน v2: งวดก่อน ต.ค. (✎ งวดไม่มีวันทำงาน) สุ่มเทียบแอปเดิม ${n} เคส ต่างกัน ${diff} เคส`);

    // H1-c เคสผู้ตรวจ: เก็บมาก่อน 2,500 + ✎ ส.ค. 500 ทั้งที่ ส.ค. ไม่มีสแกน
    E(`var a=emp({id:1,code:'A',nick:'เอ',deposit_target:3000,deposit_monthly:300,deposit_target_v1:5000,deposit_monthly_v1:500,deposit_opening:2500,bank_name:'กสิกรไทย',bank_account:'1234567890'});
       var b=emp({id:2,code:'B',nick:'บี',deposit_target:3000,deposit_monthly:300,deposit_target_v1:5000,deposit_monthly_v1:500,deposit_opening:3000,bank_name:'กสิกรไทย',bank_account:'2234567890'});
       employees=[a,b]; shifts={A:mk('2026-08-26','2026-10-19'),B:mk('2026-08-26','2026-10-19')}; depV2Col=true; go('dep');`);
    T.deposit_entries = [{id:1,employee_id:1,period:'2026-08',amount:500,note:''},{id:2,employee_id:2,period:'2026-08',amount:500,note:''}];
    await E(`depRefresh()`);
    const dc = p => JSON.parse(E(`JSON.stringify(depositCalc(a,'${p}'))`));
    const aug = dc('2026-08'), sep = dc('2026-09'), oct = dc('2026-10');
    ok(aug.ded===500 && aug.soloV1 && sep.before===2500 && sep.ded===500 && sep.collected===3000 && oct.before===3000 && oct.ded===0 && oct.over===0,
       `เก็บมาก่อน 2,500 + ✎ ส.ค. 500 (ส.ค. ไม่มีสแกน) → ส.ค. หัก 500 (สลิป ส.ค. แบบเดิม) · ก.ย. สะสมก่อน 2,500 หัก 500 รวม 3,000 · ต.ค. ไม่เกินเป้า (ได้ ${aug.ded}/${sep.before}/${sep.collected}/${oct.over})`);
    E(`renderDeposit(); document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value='';`);
    await E(`depRefundOpen()`);
    const its = JSON.parse(E(`JSON.stringify(depRefState.items.map(x=>({id:x.e.id,amount:x.amount,on:x.on,warn:x.warn})))`));
    ok(!its.some(x=>x.id===1), '💸 ต.ค.: ไม่เสนอคืนเอ (สะสม 3,000 = เป้า)');
    const bi = its.find(x=>x.id===2);
    ok(bi && bi.amount===500 && bi.on===false && bi.warn.some(w=>/✎ ในงวดที่ไม่มีวันทำงาน: ส\.ค\. 69 500 \(ไม่นับเข้ายอดสะสม\)/.test(w)),
       '💸 บี (เก็บมาก่อน 3,000 + ก.ย. 500 = เกิน 500): เตือน "✎ ในงวดที่ไม่มีวันทำงาน: ส.ค. 69 500 (ไม่นับเข้ายอดสะสม)" · ไม่ติ๊กให้เอง');
    const rb = A.d.getElementById('depRefBody').textContent;
    ok(/มี ✎ ในงวดที่ไม่มีวันทำงาน/.test(rb) && /เอ ส\.ค\. 69 500/.test(rb), 'พรีวิว 💸: แบนเนอร์เตือนคนที่ไม่อยู่ในรายการคืนแต่มี ✎ งวดไม่มีวันทำงาน ("เอ ส.ค. 69 500")');
    E(`closeModal('depRefBg')`);
    ok(/ไม่มีวันทำงาน · ไม่เข้ายอดสะสม/.test(txt(E, `dtDepHistory(a,'2026-10')`)), 'หน้ารายคน ประวัติเงินประกัน: ส.ค. ป้าย "ไม่มีวันทำงาน · ไม่เข้ายอดสะสม"');
    E(`document.getElementById('depPeriodSel').value='2026-08';`); await E(`depLockOpen()`);
    const la = JSON.parse(E(`JSON.stringify(depLockState.items.find(x=>x.e.id===1)||null)`));
    ok(la && la.amount===500 && la.flags.some(f=>/ล็อกแล้วจะนับ/.test(f)), '🔒 พรีวิว ส.ค.: ✎ 500 ไม่มีวันทำงาน → ธง "ตอนนี้ไม่นับเข้ายอดสะสมงวดถัดไป — ล็อกแล้วจะนับ"');
    E(`closeModal('depLockBg')`);
    // M1: K BIZ ต.ค. ไม่ล็อก ส.ค./ก.ย. อัตโนมัติ (✎ ส.ค. ไม่ถูกล็อกเป็น 500 โดยไม่ได้ตรวจ)
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    io.files.length = 0; io.confirms.length = 0; A.db.log.length = 0;
    await E(`exportKbizPay('')`); await wait(30);
    ok(io.files.length===1 && !A.db.log.some(l=>l.table==='deposit_entries') && !io.confirms.some(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)),
       'K BIZ ต.ค.: ส.ค./ก.ย. (ก่อน ต.ค. 69) ไม่ล็อกอัตโนมัติ → ไม่ถาม · ไม่เขียนแถว 🔒 · ได้ไฟล์');
    // L10 พิมพ์สลิปทั้งหมด (หลังรัน v2) ถามแบบเดียวกับ Excel/K BIZ · ตอบไม่ = ไม่พิมพ์
    io.confirms.length = 0; io.confirmAns = m => !/ยังไม่ได้คืนเงินประกันส่วนเกิน/.test(m);
    await E(`printAllSlips()`); await wait(80);
    ok(io.confirms.some(m=>/ยังไม่ได้คืนเงินประกันส่วนเกิน 1 คน/.test(m)) && !A.d.getElementById('slipBg').classList.contains('show'),
       'พิมพ์สลิปทั้งหมด ต.ค. (หลังรัน v2): ถาม "ยังไม่ได้คืนเงินประกันส่วนเกิน 1 คน" · ตอบไม่ = ไม่พิมพ์');
    io.confirmAns = null;
    // L1 มีสลิป: ไม่มีวันทำงาน + สุทธิติดลบ (เบิก) ไม่มียอดคืน = ไม่มีสลิป · ไม่มีวันทำงาน + ได้เงิน (ปรับเพิ่ม) = มีสลิป
    E(`var n1=emp({id:7,code:'N1',nick:'ติดลบไม่มีสแกน',deposit_on:false}); var n2=emp({id:8,code:'N2',nick:'ได้เงินไม่มีสแกน',deposit_on:false}); employees.push(n1,n2); shifts.N1=[]; shifts.N2=[];
       advances=[{id:1,empId:7,period:'2026-10',amount:1000,date:'2026-10-15',note:''}];
       adjustments=[{id:1,empId:8,period:'2026-10',kind:'add',amount:700,reason:'โบนัส'}];`);
    const sl = E(`slipFilterList('2026-10').map(x=>x.e.nick+':'+x.p.net).join()`);
    ok(E(`calcPay(n1,'2026-10').net`) < 0 && !/ติดลบไม่มีสแกน/.test(sl) && /ได้เงินไม่มีสแกน:700/.test(sl),
       'เลือกพิมพ์สลิป: ไม่มีวันทำงาน สุทธิติดลบ ไม่มียอดคืน → ไม่มีสลิป · ไม่มีวันทำงานแต่ได้ 700 → มีสลิป (ได้ ' + sl + ')');
    E(`employees=[a,b]; advances=[]; adjustments=[];`);
    // L10 ยังไม่รัน v2 (มีคนเกินเป้า): ถามเรื่อง v2 อย่างเดียว ไม่ถาม "ยังไม่ได้คืนส่วนเกิน" (ปุ่ม 💸 ยังซ่อน)
    A.db.cols.employees = ['id','code','nick','deposit_target','deposit_monthly','deposit_opening','deposit_on'];
    E(`employees.forEach(e=>{e.depTargetV1=null; e.depMonthlyV1=null;}); b.depOpen=4000; depV2Col=false;`);
    ok(!E(`depV2On()`) && E(`calcPay(b,'2026-10').dep.over`) > 0, '(ยังไม่รัน v2 · บีสะสมเกินเป้า)');
    io.confirms.length = 0; io.files.length = 0;
    E(`document.getElementById('periodSel').value='2026-10';`);
    await E(`exportPayrollXlsx()`); await wait(30);
    ok(io.files.length===1 && io.confirms.some(m=>/jj_deposit_v2\.sql/.test(m)) && !io.confirms.some(m=>/ยังไม่ได้คืนเงินประกันส่วนเกิน/.test(m)),
       'ยังไม่รัน v2: Excel ถามเรื่อง v2 อย่างเดียว — ไม่ถาม "ยังไม่ได้คืนส่วนเกิน" (ปุ่ม 💸 ยังซ่อน)');
    delete A.db.cols.employees;
    // M1 (fixopen ของผู้ตรวจ): เคยใส่ "เก็บมาก่อน" 5,000 ให้ "ครบ" หลังจ่าย ส.ค./ก.ย. → แก้กลับเป็น 0 → ไม่ล็อกค่าที่ผิด (0) ไว้ถาวร
    E(`var f=emp({id:9,code:'F',nick:'ใส่ผิด',deposit_target:3000,deposit_monthly:300,deposit_target_v1:5000,deposit_monthly_v1:500,deposit_opening:5000});
       employees=[f]; shifts={F:mk('2026-07-26','2026-10-19')}; depV2Col=true; go('dep');`);
    T.deposit_entries = []; T.employees = [{ id:9, code:'F', nick:'ใส่ผิด', deposit_target:3000, deposit_monthly:300, deposit_opening:5000, deposit_on:true, deposit_target_v1:5000, deposit_monthly_v1:500 }];
    await E(`depRefresh()`);
    ok(E(`depositCalc(f,'2026-08').ded`)===0 && E(`depositCalc(f,'2026-09').ded`)===0, '(ก่อนแก้: ส.ค./ก.ย. กลายเป็น 0 เพราะเก็บมาก่อน 5,000)');
    io.confirms.length = 0;
    await E(`updDepField(9,'deposit_opening',0)`);
    ok(!T.deposit_entries.length && E(`depositCalc(f,'2026-08').ded`)===500 && E(`depositCalc(f,'2026-09').ded`)===500 && E(`depositCalc(f,'2026-10').before`)===1000 && E(`depositCalc(f,'2026-10').ded`)===300,
       'แก้เก็บมาก่อน 5,000 → 0: ไม่ล็อก ส.ค./ก.ย. ด้วย 0 (ค่าที่ผิด) · ส.ค./ก.ย. กลับเป็น 500/500 · ต.ค. สะสมก่อน 1,000 หัก 300');
    ok(/ส\.ค\. 69 ตอนนี้ 0 · ก\.ย\. 69 ตอนนี้ 0/.test(io.confirms[0]||'') && /ยอดตอนนี้ผิด → บันทึกการแก้ก่อน แล้วตรวจยอดใหม่ \+ กด 🔒/.test(io.confirms[0]||''),
       'confirm บอกงวดที่จะคิดใหม่ (ส.ค./ก.ย. ตอนนี้ 0) + ลำดับซ่อม (ยอดผิด → แก้ก่อน แล้วค่อย 🔒)');
    // L7 สำรองข้อมูล: อ่านตารางใหม่ไม่ได้ (timeout) → ข้ามตารางนั้นพร้อมบอก · ไฟล์ยังออก
    E(`URL.createObjectURL = () => 'blob:x'; window.__dl = []; window.__blob = null; HTMLAnchorElement.prototype.click = function(){ window.__dl.push(this.download); };`);
    A.db.fail.pvd_entries = { message:'timeout', code:'57014' };
    io.alerts.length = 0;
    await E(`saveJSON()`);
    ok(E(`window.__dl.length`)===1 && io.alerts.some(m=>/ไฟล์สำรองไม่มีตารางต่อไปนี้/.test(m) && /pvd_entries/.test(m)), 'สำรองข้อมูล: อ่าน pvd_entries ไม่ได้ → ได้ไฟล์ (ข้ามตารางนั้น) + แจ้งชื่อตาราง');
    delete A.db.fail.pvd_entries;
  }

  // ============ 30b) M1: K BIZ พ.ย. → ถามปิดยอด ต.ค. (≥ ต.ค. 69) พร้อมสรุป · ตอบไม่ = ไม่สร้างไฟล์ · ไม่ล็อก ส.ค./ก.ย. ============
  { const A = boot({ now:'2026-12-03T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[30b K BIZ พ.ย.: ล็อกอัตโนมัติเฉพาะงวด ≥ ต.ค. 69 (ถามพร้อมสรุป) · ส.ค./ก.ย. ไม่ล็อก · รอบ 10: ส.ค./ก.ย. ยังไม่ 🔒 = ไม่ปิดยอด ต.ค. ให้]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'เอ',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      var b=emp({id:2,code:'B',nick:'บี',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'2222222222'});
      employees=[a,b]; shifts={A:mk('2026-07-26','2026-12-02'),B:mk('2026-07-26','2026-12-02')}; depositEntries=[]; depV2Col=true;
      go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    T.deposit_entries = []; await E(`depRefresh()`);
    const nW = () => A.db.log.filter(l=>l.op!=='select').length;
    // รอบ 10: ส.ค./ก.ย. ยังไม่ 🔒 → ไม่ปิดยอด ต.ค. ให้ (ยอดสะสมยังไม่ได้ตรวจ) · ไฟล์ยังสร้างได้ · หน้าต่างผลบอก
    io.confirms.length = 0; io.files.length = 0; A.db.log.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && !io.confirms.some(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) && !nW() && /2 คนยังไม่ปิดยอดงวดก่อน ต\.ค\. 69/.test(A.d.getElementById('kbizResBody').textContent),
       'รอบ 10: ส.ค./ก.ย. ยังไม่ 🔒 → K BIZ พ.ย. ไม่ปิดยอด ต.ค. ให้ (ไม่ถาม · ไม่เขียน) · สร้างไฟล์ได้ · หน้าต่างผลบอก "2 คนยังไม่ปิดยอดงวดก่อน ต.ค. 69"');
    E(`go('dep'); renderDeposit();`);
    const wtx = A.d.getElementById('depWarn') ? A.d.getElementById('depWarn').textContent : A.d.getElementById('page-dep').textContent;
    ok(JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)).map(x=>x.p+':'+x.n+':'+(x.v1||0)).join()==='2026-08:2:0,2026-09:2:0,2026-10:2:2' && /ปิดยอด ส\.ค\. 69\/ก\.ย\. 69 ก่อน ระบบถึงจะปิดยอด ต\.ค\. 69 เองได้/.test(wtx),
       'แถบเตือน: ส.ค./ก.ย./ต.ค. ยังไม่ปิดยอด · "ปิดยอด ส.ค. 69/ก.ย. 69 ก่อน ระบบถึงจะปิดยอด ต.ค. 69 เองได้" (ต.ค. 2 คนรออยู่)');
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    // เจ้าของ 🔒 ส.ค./ก.ย. แล้ว → K BIZ ถามปิดยอด ต.ค. แบบเดิม
    T.deposit_entries = V1ROWS(E); await E(`depRefresh()`);
    io.confirmAns = m => !/ก่อนสร้างไฟล์ จะปิดยอด/.test(m); io.confirms.length = 0; io.files.length = 0; A.db.log.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    const lk = io.confirms.find(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) || '';
    ok(/ปิดยอดงวดที่จ่ายแล้ว ต\.ค\. 69 /.test(lk) && /เงินประกัน 2 คน รวม 600 บาท/.test(lk) && !io.files.length && !nW(),
       'หลัง 🔒 ส.ค./ก.ย.: K BIZ พ.ย. ถาม "ก่อนสร้างไฟล์ จะปิดยอด ต.ค. 69 · เงินประกัน 2 คน รวม 600 บาท" → ตอบไม่ = ไม่มีไฟล์ · ไม่เขียน');
    io.confirmAns = null;
    await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && T.deposit_entries.filter(r=>r.period>='2026-10').map(r=>r.employee_id+':'+r.period+':'+r.amount+':'+r.note).sort().join()==='1:2026-10:300:lock,2:2026-10:300:lock' &&
       T.deposit_entries.filter(r=>r.period<'2026-10').length===4,
       'ตอบใช่ → ล็อก ต.ค. 300 × 2 คน แล้วสร้างไฟล์ · แถว 🔒 ส.ค./ก.ย. เดิมไม่ถูกแตะ · ไม่ล็อก พ.ย. (งวดของไฟล์)');
    ok(!JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)).length, 'แถบเตือนหาย (ปิดยอดครบ)');
  }

  // ============ 30c) M2: ช่วงโหลดสแกน = เงื่อนไขเดียวกับที่ 🔒 ล็อกได้ · ไม่สลับยืด/หด · 🔄 = เผื่อไว้ก่อน ============
  { const A = boot({ now:'2027-05-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[30c M2 ช่วงโหลดสแกน (loadAll จริง): เครื่องใหม่เผื่อไว้ก่อน → หดตามวันทำงานจริง → คงที่ · ✎ ค้าง · 🔄]');
    E(SEED);
    T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:0, late_fine:0, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08' }];
    T.shifts = [{ id:1, name:'กะ', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1 }];
    T.employees = [{ id:1, code:'A', nick:'เอ', branch:'JJLP', wage_type:'monthly', rate:12000, work_mode:'shift', shift_id:1, active:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true, deposit_target_v1:5000, deposit_monthly_v1:500, start_date:'2026-01-01', end_date:null },
                   { id:2, code:'B', nick:'บีใหม่', branch:'JJLP', wage_type:'monthly', rate:12000, work_mode:'shift', shift_id:1, active:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true, deposit_target_v1:null, deposit_monthly_v1:null, start_date:null, end_date:null }];
    // สแกน: เอ ทุกวันตั้งแต่ 26 ก.ค. 69 · บี (Worker สร้าง ไม่ได้กรอกวันเริ่มงาน) เริ่มสแกน 1 มี.ค. 70
    const pun = []; let pid = 1;
    for(let d = new Date(2026, 6, 26, 12); d <= new Date(2027, 4, 19, 12); d.setDate(d.getDate()+1)){
      const k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      for(const [c, from] of [['A','2026-07-26'],['B','2027-03-01']]) if(k >= from){
        pun.push({ id:pid++, emp_code:c, punch_date:k, punch_time:'09:00:00', device_sn:'' }); pun.push({ id:pid++, emp_code:c, punch_date:k, punch_time:'18:00:00', device_sn:'' }); }
    }
    T.punches = pun;
    T.deposit_entries = []; let did = 1;   // เอ ปิดยอดแล้วถึง เม.ย. 70
    for(const p of ['2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04']) T.deposit_entries.push({ id:did++, employee_id:1, period:p, amount:300, note:'lock' });
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-07-26', 'โหลดครั้งแรก (ไม่มีสแกนในเครื่อง) → เผื่อไว้ก่อน: บี (ไม่มีวันเริ่มงาน) ทำให้ย้อนถึง 26 ก.ค. 69 (ได้ '+E(`punchSince`)+')');
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-09-20', 'รอบถัดไป (สแกนในเครื่องครอบงวดเก่า) → บีไม่มีวันทำงาน ส.ค./ก.ย. (🔒 ล็อกไม่ได้) → หน้าต่างปกติ 20 ก.ย. 69 (ได้ '+E(`punchSince`)+')');
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-09-20' && !E(`punchCapNote`), 'รอบที่ 3 → ยังหน้าต่างปกติ (ไม่สลับยืด/หด) · ไม่มีแถบเตือนค้าง');
    T.deposit_entries = T.deposit_entries.map(r=>r.period==='2026-08' ? { ...r, note:'' } : r);
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-07-26', 'เอ มีแถว ✎ ส.ค. 69 ที่ยังไม่ 🔒 (ปุ่ม 🔒 ล็อกได้) → ย้อนถึง 26 ก.ค. 69');
    T.deposit_entries = T.deposit_entries.map(r=>r.period==='2026-08' ? { ...r, note:'lock' } : r);
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-09-20', '🔒 ส.ค. แล้ว → กลับหน้าต่างปกติ');
    // แถว 🔒 ก.ย. ของเอถูกลบ หลังสแกน ก.ย. หลุดเครื่องไปแล้ว → รอบปกติไม่รู้ (ไม่มีสแกน) · 🔄 = เผื่อไว้ก่อน → กู้สแกนกลับ แล้วคงที่
    T.deposit_entries = T.deposit_entries.filter(r=>r.period!=='2026-09');
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-09-20', '(แถว 🔒 ก.ย. หายหลังสแกนหลุดเครื่อง → รอบปกติยังหน้าต่างปกติ)');
    await E(`refreshAll()`); await wait(400);
    ok(E(`punchSince`)==='2026-07-26', 'กด 🔄 → ตัดสินแบบเผื่อไว้ก่อน → ย้อนถึง 26 ก.ค. 69');
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-08-26' && E(`depLockDue(employees.find(e=>e.id===1),{}).some(x=>x.p==='2026-09')`), 'รอบถัดไป: เอ มีวันทำงาน ก.ย. ยังไม่ 🔒 → ย้อนถึง 26 ส.ค. 69 (คงที่) · ปุ่ม 🔒 ล็อก ก.ย. ได้');
    await E(`loadAll()`);
    ok(E(`punchSince`)==='2026-08-26', 'รอบที่ 2 หลัง 🔄 → ยัง 26 ส.ค. 69 (ไม่สลับ)');
  }
  // ============ 31) เจ้าของสั่ง 2026-10-20 (รอบ 2): งวด ≥ ต.ค. 69 หักไม่เกินสุทธิ (ติดลบ = ไม่หัก · ไม่พอ = หักเท่าที่เหลือ) + 🔒 จำเหตุผล ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T, setNow } = A; await wait(300);
    console.log('[31 หักเงินประกันไม่เกินสุทธิ (งวด ≥ ต.ค. 69) — บาทจริง · ลำดับ รายการอื่น → เงินประกัน → สำรองฯ · 🔒 จำเหตุผล]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; pvdEntries=[]; pvdPayouts=[];
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var n1=V({id:1,code:'N1',nick:'ติดลบ',bank_account:'1000000001'}), n2=V({id:2,code:'N2',nick:'ไม่พอ',bank_account:'1000000002'}),
          n3=V({id:3,code:'N3',nick:'ปกติ',bank_account:'1000000003'}), n5=V({id:5,code:'N5',nick:'สำรอง',bank_account:'1000000005'}),
          n6=V({id:6,code:'N6',nick:'กันยา',bank_account:'1000000006'}), n8=V({id:8,code:'N8',nick:'แก้เอง',bank_account:'1000000008'});
      employees=[n1,n2,n3,n5,n6,n8]; shifts={}; employees.forEach(e=>shifts[e.code]=mk('2026-07-26','2027-01-25'));
      advances=[{id:1,empId:1,period:'2026-10',amount:15000,date:'2026-10-15',note:''},{id:2,empId:2,period:'2026-10',amount:11880,date:'2026-10-15',note:''},
                {id:3,empId:5,period:'2026-10',amount:11500,date:'2026-10-15',note:''},{id:4,empId:6,period:'2026-09',amount:15000,date:'2026-09-15',note:''},
                {id:5,empId:8,period:'2026-10',amount:11800,date:'2026-10-15',note:''}];
      pvdMembers=[fromDbPvdM({id:1,employee_id:2,emp_mode:'fixed',emp_value:500,start_period:'2026-10'}), fromDbPvdM({id:2,employee_id:5,emp_mode:'fixed',emp_value:500,start_period:'2026-10'})];
      depositEntries=[{id:1,empId:8,period:'2026-10',amount:500,note:''}];`);
    T.deposit_entries = [{ id:1, employee_id:8, period:'2026-10', amount:500, note:'' }];   // ✎ อยู่ใน DB ด้วย (🔒 อ่านใหม่จาก DB)
    const P = (id, p) => JSON.parse(E(`JSON.stringify((x=>({base:x.base,net:x.net,ded:x.dep.ded,cap:x.dep.cap,want:x.dep.want,dnet:x.dep.net,col:x.dep.collected,pvd:x.pvd.ded,pvdWant:x.pvd.want,deduSum:x.deduSum}))(calcPay(employees.find(e=>e.id===${id}),'${p}')))`));
    const a1 = P(1,'2026-10'), a2 = P(2,'2026-10'), a3 = P(3,'2026-10'), a5 = P(5,'2026-10'), a8 = P(8,'2026-10');
    ok(a1.base===12000 && a1.ded===0 && a1.cap==='neg' && a1.want===300 && a1.dnet===-3000 && a1.net===-3000 && a1.col===1000,
       `ติดลบ: ค่าแรง 12,000 − เบิก 15,000 = −3,000 → เงินประกันไม่หัก (ปกติ 300) · สุทธิ −3,000 (เดิม −3,300) · สะสม 1,000 (ได้ ${JSON.stringify(a1)})`);
    ok(a2.ded===120 && a2.cap==='short' && a2.want===300 && a2.dnet===120 && a2.net===0 && a2.col===1120 && a2.pvd===0 && a2.pvdWant===500,
       `ไม่พอ: 12,000 − 11,880 = 120 → หักได้ 120 จาก 300 · สุทธิ 0 · สะสม 1,120 · สำรองฯ หักได้ 0 จาก 500 (ได้ ${JSON.stringify(a2)})`);
    ok(a3.ded===300 && !a3.cap && a3.net===11700 && a3.col===1300, 'ปกติ: หัก 300 · สุทธิ 11,700 · สะสม 1,300 (เท่าเดิม)');
    ok(a5.ded===300 && !a5.cap && a5.dnet===500 && a5.pvd===200 && a5.pvdWant===500 && a5.net===0,
       `ลำดับ: 12,000 − 11,500 = 500 → เงินประกัน 300 ก่อน → สำรองฯ ได้ 200 จาก 500 → สุทธิ 0 (ได้ ${JSON.stringify(a5)})`);
    ok(a8.ded===200 && a8.cap==='short' && a8.want===500, '✎ 500 ในงวดที่สุทธิเหลือ 200 → หักได้ 200 (✎ ถูกจำกัดด้วย แบบสำรองฯ)');
    const s6 = P(6,'2026-09');
    ok(s6.ded===500 && !s6.cap && s6.net===-3500, 'งวด ก.ย. 69 (ก่อนกติกาใหม่) สุทธิติดลบ → ยังหัก 500 · สุทธิ −3,500 เท่าเดิมทุกบาท');
    ok(P(1,'2026-11').ded===300 && P(1,'2026-11').col===1300 && P(2,'2026-11').col===1420, 'พ.ย.: หักต่อจากยอดที่หักได้จริง (ติดลบ 1,000 → 1,300 · ไม่พอ 1,120 → 1,420)');
    ok(E(`[1,2,3,5,8].every(id=>{const e=employees.find(x=>x.id===id); const a=depositCalc(e,'2026-10'), b=calcPay(e,'2026-10').dep; return a.ded===b.ded&&a.cap===b.cap&&a.want===b.want&&a.net===b.net&&a.collected===b.collected;})`),
       'depositCalc เรียกเดี่ยว (หน้า 🛡️/ประวัติ/🔒) = ค่าในสลิป (calcPay().dep) ทุกคน');
    // ทุกจอ
    const sl1 = txt(E, `buildSlip(n1,'2026-10',true)`), sl2 = txt(E, `buildSlip(n2,'2026-10',true)`);
    ok(/เงินประกัน — ไม่ได้หักงวดนี้ \(สุทธิติดลบ/.test(sl1) && sl1.includes('-3,000.00'), 'สลิปพิมพ์ (ติดลบ): บรรทัด "เงินประกัน — ไม่ได้หักงวดนี้ (สุทธิติดลบ …)" 0.00 · สุทธิ −3,000.00');
    ok(/เงินประกัน \(หักได้ 120 จาก 300 · สุทธิไม่พอ/.test(sl2) && sl2.includes('120.00'), 'สลิปพิมพ์ (ไม่พอ): "เงินประกัน (หักได้ 120 จาก 300 · สุทธิไม่พอ · …)" 120.00');
    E(`refreshPeriodSelectors(); detailEmpId=1; detailTab='money'; document.getElementById('detailPeriodSel').value='2026-10'; go('detail');`);
    ok(/ไม่ได้หักงวดนี้ \(ปกติ 300\) — สุทธิติดลบ -3,000\.00/.test(A.d.getElementById('detailContent').textContent), 'หน้ารายคน แท็บเงินเดือน: "ไม่ได้หักงวดนี้ (ปกติ 300) — สุทธิติดลบ -3,000.00"');
    E(`setDetailTab('debt')`);
    const h1 = A.d.getElementById('detailContent').textContent;
    ok(/ประวัติเงินประกัน/.test(h1) && /ไม่ได้หักงวดนี้ \(ปกติ 300\) — สุทธิติดลบ/.test(h1), 'ประวัติเงินประกันรายคน: งวด ต.ค. "ไม่ได้หักงวดนี้ (ปกติ 300) — สุทธิติดลบ"');
    E(`detailEmpId=2; renderDetail(true);`);
    ok(/หักได้ 120 จาก 300 — สุทธิไม่พอ/.test(A.d.getElementById('detailContent').textContent), 'ประวัติรายคน (ไม่พอ): "หักได้ 120 จาก 300 — สุทธิไม่พอ"');
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; renderPayroll();`);
    const r1 = [...A.d.querySelectorAll('#payTable tbody tr')].find(r=>r.textContent.includes('ติดลบ'));
    ok(r1 && /ไม่หัก · สุทธิติดลบ/.test(r1.textContent), 'หน้าสรุปเงินเดือน: ชิป "ไม่หัก · สุทธิติดลบ" (คำเดียวกับสลิป)');
    A.d.getElementById('payFlag').value='dep'; E(`renderPayroll()`);
    ok([...A.d.querySelectorAll('#payTable tbody tr')].some(r=>r.textContent.includes('ติดลบ')), 'ตัวกรอง "เงินประกัน" รวมคนที่ไม่ได้หักเพราะสุทธิติดลบ');
    A.d.getElementById('payFlag').value=''; E(`renderPayroll()`);
    io.files.length = 0; await E(`exportPayrollXlsx()`);
    const xf = io.files.pop(), hd = xf.aoa[0], xr = n => xf.aoa.find(r=>r[0]===n);
    ok(XL_ORIG.every((h,i)=>hd[i]===h) && hd[hd.length-1]==='หมายเหตุเงินประกัน', 'Excel: คอลัมน์เดิมตำแหน่งเดิม · "หมายเหตุเงินประกัน" ต่อท้ายสุด');
    ok(xr('ติดลบ')[hd.indexOf('ประกันงวดนี้')]==='' && /ไม่ได้หักงวดนี้/.test(xr('ติดลบ')[hd.length-1]) && xr('ไม่พอ')[hd.indexOf('ประกันงวดนี้')]===120 && /หักได้ 120 จาก 300/.test(xr('ไม่พอ')[hd.length-1]) && xr('ติดลบ')[hd.indexOf('สุทธิ')]===-3000,
       'Excel: ติดลบ ประกัน "" + หมายเหตุ "ไม่ได้หักงวดนี้…" สุทธิ −3,000 · ไม่พอ ประกัน 120 + "หักได้ 120 จาก 300…"');
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    const kf = io.files.pop(), kr = acc => kf && kf.aoa.slice(3).find(r=>r[1]===acc);
    ok(kf && !kr('1000000001') && !kr('1000000002') && kr('1000000003') && kr('1000000003')[3]===11700, 'ไฟล์ K BIZ ต.ค.: ติดลบ/สุทธิ 0 ไม่อยู่ในไฟล์ · ปกติ 11,700 (= สลิป)');
    // หน้า 🛡️
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const dr = n => [...A.d.querySelectorAll('#depTable tbody tr')].find(r=>{ const b = r.querySelector('.mc-name b'); return b && b.textContent===n; });
    ok(dr('ติดลบ') && /ไม่ได้หัก · สุทธิติดลบ/.test(dr('ติดลบ').textContent) && dr('ไม่พอ') && /ได้ 120 จาก 300 · ไม่พอ/.test(dr('ไม่พอ').textContent), 'หน้า 🛡️: ชิป "ไม่ได้หัก · สุทธิติดลบ" / "ได้ 120 จาก 300 · ไม่พอ"');
    ok(/หักไม่ได้\/ไม่เต็ม/.test(A.d.getElementById('depStats').textContent), 'หน้า 🛡️: ช่องสรุป "หักไม่ได้/ไม่เต็ม (สุทธิไม่พอ)"');
    // ✎ แก้ยอด → บอกว่าหักได้จริงเท่าไร
    io.toasts = []; E(`var __t=[]; var __toast=toast; toast=m=>__t.push(m);`);
    await E(`setDepOverride(1,'2026-10','300')`);
    ok(E(`__t.join()`).includes('ไม่ได้หักงวดนี้'), '✎ ใส่ 300 ในงวดที่สุทธิติดลบ → แจ้ง "ไม่ได้หักงวดนี้ …" (ยอดที่หักได้จริง)');
    await E(`setDepOverride(1,'2026-10','')`); E(`toast=__toast;`);
    // 🔒 ปิดยอดงวด ต.ค. หลังวันจ่าย (6 พ.ย.) → จำเหตุผล
    setNow('2026-11-06T12:00:00+07:00');
    E(`document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option><option>2026-11</option>'; document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depSearch').value=''; renderDeposit();`);
    await E(`depLockOpen()`);
    const li = JSON.parse(E(`JSON.stringify(depLockState.items.map(x=>({n:x.e.nick,amount:x.amount,note:x.note,f:x.flags.join('|')})))`));
    const L = n => li.find(x=>x.n===n) || {};
    ok(L('ติดลบ').amount===0 && L('ติดลบ').note==='lock:neg:300:-3000' && /ℹ️ ไม่ได้หักงวดนี้/.test(L('ติดลบ').f), `พรีวิว 🔒: ติดลบ ยอด 0 · note "lock:neg:300:-3000" · ธง ℹ️ (ได้ ${JSON.stringify(L('ติดลบ'))})`);
    ok(L('ไม่พอ').amount===120 && L('ไม่พอ').note==='lock:short:300:120' && L('ปกติ').note==='lock' && L('แก้เอง').amount===200 && L('แก้เอง').note==='lock:short:500:200',
       'พรีวิว 🔒: ไม่พอ 120 "lock:short:300:120" · ปกติ "lock" · ✎ 500 ที่หักได้ 200 → ล็อก 200 "lock:short:500:200" (ไม่ใช่ 500)');
    E(`depLockState.items.find(x=>x.e.nick==='สำรอง').amount = 250;`);   // เจ้าของแก้ยอดเอง → 🔒 ธรรมดา
    await E(`depLockSave()`);
    const dbr = (id,p) => T.deposit_entries.find(r=>r.employee_id===id && r.period===p);
    ok(dbr(1,'2026-10').note==='lock:neg:300:-3000' && dbr(1,'2026-10').amount===0 && dbr(2,'2026-10').note==='lock:short:300:120' && dbr(2,'2026-10').amount===120 && dbr(3,'2026-10').note==='lock' && dbr(5,'2026-10').note==='lock' && dbr(5,'2026-10').amount===250,
       'บันทึก 🔒: ติดลบ 0 "lock:neg:300:-3000" · ไม่พอ 120 "lock:short:300:120" · ปกติ "lock" · แก้ยอดเอง (250) = "lock" ธรรมดา');
    // หลังล็อก: ข้อมูลเปลี่ยน (ลบเบิก) → ยอด/เหตุผลไม่เปลี่ยน
    E(`advances = advances.filter(a=>a.empId!==1);`);
    const z = JSON.parse(E(`JSON.stringify((d=>({ded:d.ded,cap:d.cap,want:d.want,net:d.net,src:d.src,txt:depCapTxt(d)}))(depositCalc(n1,'2026-10')))`));
    ok(z.ded===0 && z.cap==='neg' && z.want===300 && z.net===-3000 && z.src==='lock' && /ไม่ได้หักงวดนี้ \(ปกติ 300\) — สุทธิติดลบ -3,000\.00/.test(z.txt) && E(`calcPay(n1,'2026-10').net`)===12000,
       'ล็อกแล้วลบเบิก (สุทธิกลายเป็น 12,000) → 🔒 ยังหัก 0 + ประวัติยังบอก "ไม่ได้หักงวดนี้ (ปกติ 300) — สุทธิติดลบ -3,000.00"');
    E(`detailEmpId=1; detailTab='debt'; document.getElementById('detailPeriodSel').value='2026-10'; go('detail');`);
    ok(/🔒 ปิดยอด/.test(A.d.getElementById('detailContent').textContent) && /ไม่ได้หักงวดนี้ \(ปกติ 300\)/.test(A.d.getElementById('detailContent').textContent), 'ประวัติรายคนหลังล็อก: "🔒 ปิดยอด" + "ไม่ได้หักงวดนี้ (ปกติ 300)"');
    ok(E(`(r=>r.note==='lock'&&r.why==='short'&&r.want===300&&r.net===120&&r.raw==='lock:short:300:120')(fromDbDep({id:1,employee_id:2,period:'2026-10',amount:120,note:'lock:short:300:120'}))`) &&
       E(`(r=>r.note==='lock'&&r.why===''&&r.want===null)(fromDbDep({id:1,employee_id:2,period:'2026-10',amount:120,note:'lock'}))`), 'fromDbDep: "lock:short:300:120" → 🔒 + เหตุผล · "lock" → 🔒 ไม่มีเหตุผล');
    // เจ้าของแก้ยอดที่ล็อก (หน้า 🛡️): ยอดเท่าเดิม = คงเหตุผล · ยอดใหม่ = 🔒 ธรรมดา (เขียนแบบมีเงื่อนไขด้วย note จริง)
    E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    io.promptAns = ['120']; await E(`editDeposit(2,'2026-10')`);
    ok(dbr(2,'2026-10').note==='lock:short:300:120', '✎ แถว 🔒 ยอดเท่าเดิม (120) → คงเหตุผล');
    io.promptAns = ['300']; await E(`editDeposit(2,'2026-10')`);
    ok(dbr(2,'2026-10').note==='lock' && dbr(2,'2026-10').amount===300 && !E(`depositCalc(n2,'2026-10').cap`), '✎ แถว 🔒 เปลี่ยนเป็น 300 → "lock" ธรรมดา (เหตุผลเดิมไม่ตรงแล้ว)');
    // K BIZ พ.ย. ล็อกงวดก่อนอัตโนมัติ → จำเหตุผลด้วย (คนที่ยังไม่ล็อก ต.ค.)
    E(`var n9=V({id:9,code:'N9',nick:'ล็อกเอง',bank_account:'1000000009'}); employees.push(n9); shifts.N9=mk('2026-07-26','2027-01-25'); advances.push({id:9,empId:9,period:'2026-10',amount:20000,date:'2026-10-15',note:''});`);
    ok(E(`kbizLockDue([n9],'2026-11').find(x=>x.k==='dep'&&x.p==='2026-10').note`)==='lock:neg:300:-8000', 'K BIZ พ.ย.: ล็อกอัตโนมัติ ต.ค. ของคนที่สุทธิติดลบ → note "lock:neg:300:-8000"');
    V1LOCK(A, [9]);   // รอบ 10: ส.ค./ก.ย. 🔒 แล้ว (K BIZ ปิดยอด ต.ค. ให้เฉพาะคนที่งวดก่อน ต.ค. 🔒 ครบ)
    const kr9 = await E(`kbizAutoLock([n9],'2026-11')`);
    ok(dbr(9,'2026-10') && dbr(9,'2026-10').note==='lock:neg:300:-8000' && dbr(9,'2026-10').amount===0 && /สุทธิไม่พอ 1 แถว/.test(io.confirms.join()), 'kbizAutoLock เขียน 🔒 0 พร้อมเหตุผล + confirm บอก "หักไม่ได้/ได้บางส่วนเพราะสุทธิไม่พอ 1 แถว"');
  }

  // ============ 32) เจ้าของสั่ง 2026-10-20 (รอบ 2): คนพ้นสภาพสะสมเกินเป้า = 🏦 โอนคืนนอกสลิป ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T, setNow } = A; await wait(300);
    console.log('[32 🏦 โอนคืนนอกสลิป (พ้นสภาพ) — ไม่เข้าสลิป/สุทธิ/K BIZ · ยอดสะสมลดเหลือเป้า · แก้/ยกเลิกกติกาเดียวกับรายการคืน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var g=emp({id:7,code:'GN',nick:'ลาออก',active:false,deposit_opening:4000,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'7777777777'});
      var w=emp({id:1,code:'W1',nick:'ทำงาน',deposit_opening:5000,deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      employees=[g,w]; shifts={GN:mk('2026-07-26','2026-09-10'),W1:mk('2026-07-26','2026-12-25')}; depositEntries=[];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-09</option><option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value=''; renderDeposit();`);
    ok(!A.d.getElementById('depRefBtn').hidden, 'ปุ่ม 💸 แสดง (มีคนเกินเป้า)');
    await E(`depRefundOpen()`);
    const st = JSON.parse(E(`JSON.stringify(depRefState.items.map(x=>({n:x.e.nick,xf:x.xf,on:x.on,amount:x.amount,block:x.block,date:x.date})))`));
    const gi = st.find(x=>x.n==='ลาออก'), wi = st.find(x=>x.n==='ทำงาน');
    ok(gi && gi.xf && !gi.on && gi.amount===2000 && !gi.block && gi.date==='2026-10-20' && wi && !wi.xf && wi.amount===2000, 'หน้าต่าง 💸: ลาออก (สะสม 5,000) อยู่กลุ่ม 🏦 ยอดที่ต้องโอน 2,000 วันที่ตั้งต้นวันนี้ ไม่ติ๊กให้เอง · ทำงาน = คืนในสลิปแบบเดิม');
    const body = A.d.getElementById('depRefBody').textContent;
    ok(/โอนคืนนอกสลิป \(พ้นสภาพ/.test(body) && /โอนแล้ว/.test(body) && /คืนในสลิปงวดนี้/.test(body), 'หน้าต่างแยก 2 กลุ่ม: "💸 คืนในสลิปงวดนี้" · "🏦 โอนคืนนอกสลิป (พ้นสภาพ · หรือโอนไปแล้ว)" (ติ๊ก "โอนแล้ว")');
    // วันที่อนาคต → ไม่บันทึก
    E(`depRefState.items.forEach(x=>x.on = x.xf); depRefState.items.find(x=>x.xf).date='2026-10-21';`);
    let n0 = A.db.log.length; await E(`depRefundSave()`);
    ok(A.db.log.length===n0, 'วันที่โอนเป็นวันอนาคต → ไม่บันทึก');
    E(`depRefState.items.find(x=>x.xf).date='2026-10-19';`);
    await E(`depRefundSave()`);
    const dbr = (id,p) => T.deposit_entries.find(r=>r.employee_id===id && r.period===p);
    ok(dbr(7,'2026-10') && dbr(7,'2026-10').amount===-2000 && dbr(7,'2026-10').note==='xfer:2026-10-19' && !dbr(1,'2026-10'), 'บันทึก: ลาออก แถว −2,000 note "xfer:2026-10-19" · คนทำงาน (ไม่ได้ติ๊ก) ไม่มีแถว');
    ok(dbr(7,'2026-08').note==='lock' && dbr(7,'2026-08').amount===500 && dbr(7,'2026-09').amount===500, 'ล็อก ส.ค./ก.ย. ของคนนั้นพร้อมกัน 500/500 (ชุดเดียวกับพรีวิว)');
    ok(/บันทึกว่าโอนคืนนอกสลิปแล้ว 1 คน รวม 2,000/.test(io.confirms.join()), 'confirm บอก "บันทึกว่าโอนคืนนอกสลิปแล้ว 1 คน รวม 2,000 บาท"');
    const d = JSON.parse(E(`JSON.stringify(depositCalc(g,'2026-10'))`)), p = JSON.parse(E(`JSON.stringify((x=>({add:x.addSum,net:x.net,ref:x.dep.refund,xf:x.dep.xfer}))(calcPay(g,'2026-10')))`));
    ok(d.xfer===2000 && d.refund===0 && d.collected===3000 && d.over===0 && d.xferDate==='2026-10-19' && d.src==='xfer', 'สมุด: โอนคืน 2,000 (19 ต.ค.) · สะสม 5,000 → 3,000 · ไม่เกินเป้าแล้ว');
    ok(p.add===0 && p.net===0 && p.ref===0 && p.xf===2000, 'ไม่เข้าสลิป: รายรับ 0 · สุทธิ 0 · คืนในสลิป 0');
    ok(!E(`slipFilterList('2026-10').some(x=>x.e.id===7)`), 'ไม่มีสลิป/ไม่อยู่ในรายการพิมพ์');
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    const kf = io.files.pop();
    ok(kf && !kf.aoa.slice(3).some(r=>r[1]==='7777777777'), 'ไฟล์ K BIZ: ไม่มีคนที่โอนคืนนอกสลิป (ไม่จ่ายซ้ำ)');
    E(`detailEmpId=7; detailTab='debt'; document.getElementById('detailPeriodSel').value='2026-10'; go('detail');`);
    const h = A.d.getElementById('detailContent').textContent;
    ok(/🏦 โอนคืนนอกสลิป/.test(h) && /\+2,000/.test(h) && /โอน 19 ต\.ค\./.test(h), 'ประวัติรายคน: "+2,000 โอน 19 ต.ค." ที่มา "🏦 โอนคืนนอกสลิป"');
    E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const tr = [...A.d.querySelectorAll('#depTable tbody tr')].find(r=>r.textContent.includes('ลาออก'));
    ok(tr && /🏦 โอนคืน 2,000 · 19 ต\.ค\./.test(tr.textContent) && !tr.querySelector('input[data-p]') && !A.d.getElementById('depRefBtn').hidden, 'หน้า 🛡️: ชิป "🏦 โอนคืน 2,000 · 19 ต.ค." ไม่มีช่องกรอก · ปุ่ม 💸 ยังเปิดดูรายการได้');
    await E(`depRefundOpen()`);
    ok(E(`depRefState.xdone.length`)===1 && /บันทึกโอนคืนแล้วงวดนี้/.test(A.d.getElementById('depRefBody').textContent) && /แก้\/ยกเลิก/.test(A.d.getElementById('depRefBody').textContent), 'หน้าต่าง 💸: ส่วน "✅ บันทึกโอนคืนแล้วงวดนี้" + ปุ่ม ✎ แก้/ยกเลิก');
    E(`closeModal('depRefBg')`);
    // แก้ (ยอด + วันที่) · เกินส่วนเกิน = ปฏิเสธ · ยกเลิก
    io.promptAns = ['2500']; n0 = A.db.log.length; await E(`editDeposit(7,'2026-10')`);
    ok(A.db.log.length===n0 && dbr(7,'2026-10').amount===-2000, '✎ ยอดโอนคืน 2,500 > ส่วนเกิน 2,000 → ปฏิเสธ');
    io.promptAns = ['1500', '2026-10-18']; await E(`editDeposit(7,'2026-10')`);
    ok(dbr(7,'2026-10').amount===-1500 && dbr(7,'2026-10').note==='xfer:2026-10-18' && E(`depositCalc(g,'2026-10').collected`)===3500, '✎ แก้เป็น 1,500 วันที่ 18 ต.ค. → แถว −1,500 "xfer:2026-10-18" · สะสม 3,500');
    io.promptAns = ['']; await E(`editDeposit(7,'2026-10')`);
    ok(!dbr(7,'2026-10') && E(`depositCalc(g,'2026-10').over`)===2000, '✎ เว้นว่าง → ยกเลิกบันทึกโอน (ลบแถว) · กลับไปเกินเป้า 2,000');
    // บันทึกใหม่ แล้วเลยวันจ่ายงวด (5 พ.ย.) → แก้/ยกเลิกไม่ได้ (กติกาเดียวกับ 💸)
    await E(`depRefundOpen()`); E(`depRefState.items.forEach(x=>x.on = x.xf)`); await E(`depRefundSave()`);
    ok(dbr(7,'2026-10') && dbr(7,'2026-10').note==='xfer:2026-10-20', 'บันทึกโอนคืนใหม่ (วันที่ตั้งต้น = วันนี้ 20 ต.ค.)');
    setNow('2026-11-05T12:00:00+07:00'); io.alerts.length = 0; io.promptAns = [''];
    await E(`editDeposit(7,'2026-10')`);
    ok(dbr(7,'2026-10') && /ถึงกำหนดจ่ายแล้ว.*แก้\/ยกเลิกได้ถึงวันก่อนวันจ่าย/.test(io.alerts.join()), 'เลยวันจ่ายงวด ต.ค. แล้ว → แก้/ยกเลิกบันทึกโอนคืนไม่ได้ (เหมือน 💸 · รอบ 6: ข้อความ 🏦 = "ถึงกำหนดจ่าย" ไม่ใช่ "ไฟล์โอน")');
    // ผู้จัดการ (ไม่ใช่เจ้าของ) → แก้ไม่ได้
    setNow('2026-10-20T12:00:00+07:00');
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{dep:'vae'}}}; applyUser(AUTH); go('dep');`); io.toasts.length = 0; n0 = A.db.log.length;
    await E(`editDeposit(7,'2026-10')`);
    ok(A.db.log.length===n0, 'ผู้จัดการ (ไม่ใช่เจ้าของ/แอดมิน) แก้บันทึกโอนคืนไม่ได้');
    ok(E(`(r=>r.note==='xfer'&&r.xferDate==='2026-10-19'&&r.raw==='xfer:2026-10-19'&&DEP_FIXED(r.note))(fromDbDep({id:1,employee_id:7,period:'2026-10',amount:-2000,note:'xfer:2026-10-19'}))`), 'fromDbDep: "xfer:2026-10-19" → 🏦 แถวตายตัว + วันที่โอน');
  }
  // ============ 33) ผลตรวจรอบ 2: ไม่คืน/โอนซ้ำข้ามงวด · ล็อกก่อนแก้รายการเงินของงวดที่จ่ายแล้ว · ชิป/สลิป/✎/แก้วันที่โอน ============
  { const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, io, T, setNow } = A; await wait(300);
    console.log('[33 ผลตรวจรอบ 2: ไม่โผล่ซ้ำข้ามงวด (26→5 เปิด 2 งวด) · 🔒 ก่อนแก้เบิก/เพิ่ม-หัก/ค่าปรับของงวดที่จ่ายแล้ว · ชิปตรงสลิป · ลำดับในสลิป · ✎ ไม่มีวันทำงาน · แก้วันที่โอน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var g=V({id:7,code:'GN',nick:'ลาออก',active:false,deposit_opening:4000,bank_account:'7777777777'});
      var w=V({id:1,code:'W1',nick:'ทำงาน',deposit_opening:5000,bank_account:'1111111111'});
      var w2=V({id:2,code:'W2',nick:'อีกเครื่อง',deposit_opening:5000,bank_account:'2222222222'});
      employees=[g,w,w2]; shifts={GN:mk('2026-07-26','2026-09-10'),W1:mk('2026-07-26','2026-12-25'),W2:mk('2026-07-26','2026-12-25')}; depositEntries=[];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option><option>2026-11</option>'; document.getElementById('depActive').value='';
      document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    // วันที่ 28 ต.ค.: เลือกงวด พ.ย. แล้วบันทึก 🏦 ลาออก 2,000 + 💸 ทำงาน 2,000
    await E(`depRefundOpen()`);
    E(`depRefState.items.forEach(x=>{ x.on = x.e.id===7 || x.e.id===1; if(x.xf) x.date='2026-10-28'; })`);
    await E(`depRefundSave()`);
    const dbr = (id,p) => T.deposit_entries.find(r=>r.employee_id===id && r.period===p);
    ok(dbr(7,'2026-11') && dbr(7,'2026-11').note==='xfer:2026-10-28' && dbr(1,'2026-11') && dbr(1,'2026-11').note==='refund', 'ตั้งต้น: งวด พ.ย. บันทึก 🏦 ลาออก (xfer:2026-10-28) + 💸 ทำงาน 2,000');
    // กลับมางวด ต.ค. (วันจ่าย 5 พ.ย. ยังเปิดอยู่)
    E(`document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const dg = JSON.parse(E(`JSON.stringify(depositCalc(g,'2026-10'))`)), dw = JSON.parse(E(`JSON.stringify(depositCalc(w,'2026-10'))`));
    ok(dg.over===0 && dg.laterRef && dg.laterRef.period==='2026-11' && dg.laterRef.note==='xfer' && dg.laterRef.amount===2000 && dw.over===0 && dw.laterRef.note==='refund',
       `งวด ต.ค.: over = 0 + laterRef (โอน/คืนในงวด พ.ย. แล้ว) ไม่ใช่ "เกินเป้า 2,000 ยังไม่คืน" (ได้ ${JSON.stringify({o:dg.over,l:dg.laterRef})})`);
    const trg = [...A.d.querySelectorAll('#depTable tbody tr')].find(r=>r.textContent.includes('ลาออก'));
    ok(trg && !/ยังไม่คืน/.test(trg.textContent) && /🏦 โอนคืน 2,000 แล้วในงวด พ\.ย\. 2569/.test(trg.textContent), 'ตาราง 🛡️ ต.ค.: ไม่ขึ้น "ยังไม่คืน" · ขึ้น "🏦 โอนคืน 2,000 แล้วในงวด พ.ย. 2569"');
    await E(`depRefundOpen()`);
    const it = n => JSON.parse(E(`JSON.stringify((x=>x&&{block:x.block,on:x.on})(depRefState.items.find(x=>x.e.nick==='${n}')))`));
    ok(it('ลาออก') && /ห้ามคืนซ้ำ/.test(it('ลาออก').block) && !it('ลาออก').on && it('ทำงาน') && /💸 คืน 2,000 แล้วในงวด พ\.ย\./.test(it('ทำงาน').block) && !it('ทำงาน').on,
       'หน้าต่าง 💸 งวด ต.ค.: ลาออก/ทำงาน ติ๊กไม่ได้ "…แล้วในงวด พ.ย. — ห้ามคืนซ้ำ" (ไม่เสนอยอดซ้ำ)');
    // อีกเครื่องบันทึกคืนในงวด พ.ย. ระหว่างเปิดหน้าต่าง ต.ค. → ตอนบันทึกอ่านใหม่แล้วข้าม
    E(`depRefState.items.forEach(x=>x.on = x.e.id===2)`);
    T.deposit_entries.push({ id:9901, employee_id:2, period:'2026-11', amount:-2000, note:'refund' });
    io.alerts.length = 0; await E(`depRefundSave()`);
    ok(!dbr(2,'2026-10') && /คืน\/โอนแล้วในงวดหลัง/.test(io.alerts.join()), 'อีกเครื่องคืนในงวด พ.ย. ระหว่างเปิดหน้าต่าง ต.ค. → บันทึกแล้วข้าม "คืน/โอนแล้วในงวดหลัง — ห้ามคืนซ้ำ" (ไม่มีแถว ต.ค.)');
    E(`renderDeposit()`);
    ok(A.d.getElementById('depRefBtn').hidden, 'ปุ่ม 💸 งวด ต.ค. ซ่อน (ทุกคนคืน/โอนในงวด พ.ย. แล้ว)');
    ok(E(`calcPay(w,'2026-10').dep.refund`)===0 && E(`calcPay(w,'2026-11').dep.refund`)===2000 && E(`depositCalc(w,'2026-11').collected`)===3000 && E(`depositCalc(g,'2026-11').collected`)===3000,
       'คืนครั้งเดียว: สลิป ต.ค. คืน 0 · พ.ย. คืน 2,000 · สะสมเหลือเป้า 3,000 (ไม่ต่ำกว่าเป้า)');
    io.confirms.length = 0;
    ok(E(`depOverAsk(employees.map(e=>({e, p:calcPay(e,'2026-10')})),'2026-10')`)===true && !io.confirms.some(m=>/ยังไม่ได้คืนเงินประกันส่วนเกิน/.test(m)), 'สร้างไฟล์งวด ต.ค.: ไม่ถาม "ยังไม่ได้คืนส่วนเกิน" (คืนในงวด พ.ย. แล้ว)');

    // ---- แก้รายการเงินของงวดที่จ่ายแล้ว (ยังไม่ 🔒) → 🔒 ก่อนด้วยยอดก่อนแก้ ----
    setNow('2026-11-06T12:00:00+07:00');
    E(`var s1=V({id:11,code:'S1',nick:'เบิกเยอะ',bank_account:'1100000001'}); employees.push(s1); shifts.S1=mk('2026-07-26','2027-01-25');
      var adv1={id:501,empId:11,period:'2026-10',amount:11900,date:'2026-10-15',note:''}; advances=[adv1];`);
    T.advances = [{ id:501, employee_id:11, period:'2026-10', amount:11900, taken_date:'2026-10-15', note:'' }];
    ok(E(`depositCalc(s1,'2026-10').ded`)===100 && E(`depositCalc(s1,'2026-10').cap`)==='short', 'ตั้งต้น: งวด ต.ค. (จ่ายแล้ว 5 พ.ย. · ยังไม่ 🔒) เบิก 11,900 → เงินประกันหักได้ 100 (short)');
    E(`go('adv')`);
    io.confirmAns = m => !/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m); io.confirms.length = 0;   // ตอบ "ไม่" ที่ถามล็อก
    await E(`delAdv(501)`);
    ok(E(`advances.length`)===1 && T.advances.length===1 && !dbr(11,'2026-10') && io.confirms.some(m=>/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m) && /ต\.ค\. 69 100 \(หักได้บางส่วน · สุทธิไม่พอ\)/.test(m)),
       'ลบเบิกงวด ต.ค. ที่จ่ายแล้ว → ถาม 🔒 ก่อน (ต.ค. 100 หักได้บางส่วน) · ตอบไม่ = ไม่ลบเบิก ไม่ล็อก');
    io.confirmAns = null;
    await E(`delAdv(501)`);
    ok(E(`advances.length`)===0 && dbr(11,'2026-10') && dbr(11,'2026-10').amount===100 && dbr(11,'2026-10').note==='lock:short:300:100' && E(`depositCalc(s1,'2026-10').ded`)===100 && E(`calcPay(s1,'2026-10').dep.ded`)===100,
       'ตอบตกลง → 🔒 ต.ค. 100 "lock:short:300:100" ก่อน แล้วค่อยลบเบิก → ยอดเงินประกัน ต.ค. ยัง 100 (= สลิปที่จ่ายจริง · ไม่กลายเป็น 300)');
    io.confirms.length = 0;
    E(`advances=[{id:502,empId:11,period:'2026-10',amount:500,date:'2026-10-15',note:''}]`); T.advances = [{ id:502, employee_id:11, period:'2026-10', amount:500, taken_date:'2026-10-15', note:'' }];
    await E(`delAdv(502)`);
    ok(E(`advances.length`)===0 && !io.confirms.some(m=>/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)), 'ล็อกแล้ว → ลบเบิกอีกได้เลย ไม่ถามล็อกซ้ำ');
    // งวดที่ยังไม่ถึงวันจ่าย (พ.ย. จ่าย 5 ธ.ค.) → ไม่ถาม/ไม่ล็อก · เพิ่ม/หักเงินงวดที่จ่ายแล้วของอีกคน → ล็อกก่อน
    const nLog = A.db.log.filter(l=>l.table==='deposit_entries').length;
    E(`document.getElementById('advQ_11') || (()=>{ const i=document.createElement('input'); i.id='advQ_11'; document.body.appendChild(i); })(); document.getElementById('advQ_11').value='1000';`);
    io.confirms.length = 0; await E(`quickAdv(11,'2026-11')`);
    ok(A.db.log.filter(l=>l.table==='deposit_entries').length===nLog && !io.confirms.some(m=>/ปิดยอด/.test(m)) && E(`advances.some(a=>a.period==='2026-11')`), 'เบิกงวด พ.ย. (ยังไม่ถึงวันจ่าย) → บันทึกเลย ไม่ถาม/ไม่ล็อก');
    E(`var s2=V({id:12,code:'S2',nick:'โดนหัก',bank_account:'1200000001'}); employees.push(s2); shifts.S2=mk('2026-07-26','2027-01-25');`);
    E(`go('detail'); document.getElementById('adjEmpId').value='12'; document.getElementById('adjKind').value='deduct'; document.getElementById('adjReason').value='ของเสียหาย';
       document.getElementById('adjAmount').value='11800'; document.getElementById('adjPeriod').innerHTML='<option>2026-10</option>'; document.getElementById('adjPeriod').value='2026-10';`);
    await E(`saveAdj()`);
    ok(dbr(12,'2026-10') && dbr(12,'2026-10').note==='lock' && dbr(12,'2026-10').amount===300 && E(`adjustments.some(a=>a.empId===12&&a.period==='2026-10')`) && E(`depositCalc(s2,'2026-10').ded`)===300,
       'หักเงิน 11,800 ในงวด ต.ค. ที่จ่ายแล้ว → 🔒 ต.ค. 300 (ยอดก่อนแก้) ก่อน → เงินประกัน ต.ค. ยัง 300 ไม่กลายเป็น "หักได้ 200"');
    E(`var s3=V({id:13,code:'S3',nick:'ปรับสาย',bank_account:'1300000001'}); employees.push(s3); shifts.S3=mk('2026-07-26','2027-01-25'); fineReady=true;`);
    await E(`setFineOverride(13,'2026-10','miss','11900')`);
    ok(dbr(13,'2026-10') && dbr(13,'2026-10').amount===300 && E(`depositCalc(s3,'2026-10').ded`)===300, 'แก้ยอดหักสาย (fine_entries) งวด ต.ค. ที่จ่ายแล้ว → 🔒 เงินประกัน ต.ค. 300 ก่อน');

    // ---- ชิปตรงคำในสลิป: สุทธิก่อนหักเงินประกัน = 0 พอดี → "สุทธิไม่พอ" (ไม่ใช่ "ติดลบ") · 🔒 0 มีชิป 🔒 ----
    setNow('2026-10-20T12:00:00+07:00');
    E(`var z0=V({id:14,code:'Z0',nick:'ศูนย์พอดี',bank_account:'1400000001'}); employees.push(z0); shifts.Z0=mk('2026-07-26','2027-01-25');
      advances.push({id:601,empId:14,period:'2026-10',amount:12000,date:'2026-10-15',note:''});`);
    ok(E(`(d=>d.cap==='neg'&&d.net===0&&d.ded===0)(calcPay(z0,'2026-10').dep)`), 'ศูนย์พอดี: ค่าแรง 12,000 − เบิก 12,000 = 0 → ไม่หัก (cap neg · สุทธิ 0)');
    const slz = txt(E, `buildSlip(z0,'2026-10',true)`);
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; document.getElementById('payActive').value=''; renderPayroll();`);
    const rz = [...A.d.querySelectorAll('#payTable tbody tr')].find(r=>r.textContent.includes('ศูนย์พอดี'));
    ok(/ไม่ได้หักงวดนี้ \(สุทธิไม่พอ/.test(slz) && rz && /ไม่หัก · สุทธิไม่พอ/.test(rz.textContent) && !/ติดลบ/.test(rz.textContent), 'สุทธิ 0 พอดี: สลิป "ไม่ได้หักงวดนี้ (สุทธิไม่พอ …)" = ชิปหน้าสรุป "ไม่หัก · สุทธิไม่พอ" (ไม่ขึ้น "ติดลบ")');
    E(`depositEntries.push(fromDbDep({id:8801,employee_id:14,period:'2026-10',amount:0,note:'lock:neg:300:0'})); renderPayroll();`);
    const rz2 = [...A.d.querySelectorAll('#payTable tbody tr')].find(r=>r.textContent.includes('ศูนย์พอดี'));
    ok(rz2 && /🔒/.test([...rz2.querySelectorAll('td')].find(td=>/^เงินประกัน/.test(td.title)).textContent) && /ไม่หัก · สุทธิไม่พอ/.test(rz2.textContent), 'แถว 🔒 ที่ล็อกไว้ 0 (ไม่ได้หัก) → หน้าสรุปมีชิป 🔒 + "ไม่หัก · สุทธิไม่พอ"');
    // ลำดับในสลิป/หน้ารายคน: รายการหักอื่นทั้งหมดก่อน → เงินประกัน → สำรองฯ (ลำดับที่คิดจริง)
    const slw = txt(E, `buildSlip(s2,'2026-10',false)`);
    ok(slw.indexOf('ของเสียหาย') >= 0 && slw.indexOf('เงินประกัน (') > slw.indexOf('ของเสียหาย') && slz.indexOf('เงินประกัน — ไม่ได้หัก') > slz.indexOf('เบิกล่วงหน้า'),
       'สลิป: บรรทัดเงินประกันอยู่หลังรายการหักอื่น (หักเพิ่ม/เบิก) ตามลำดับที่คิดจริง');
    E(`detailEmpId=12; detailTab='money'; refreshPeriodSelectors(); document.getElementById('detailPeriodSel').value='2026-10'; go('detail'); renderDetail(true);`);
    const dtx = A.d.getElementById('detailContent').textContent;
    ok(dtx.indexOf('ของเสียหาย') >= 0 && dtx.indexOf('－ เงินประกัน') > dtx.indexOf('ของเสียหาย'), 'หน้ารายคน แท็บเงินเดือน: เงินประกันอยู่หลังรายการหักอื่น (ลำดับเดียวกับสลิป)');
  }

  // ============ 33b) ✎ งวดไม่มีวันทำงาน ≥ ต.ค. (หลังรัน v2) แสดงยอดที่นับจริง · 🏦 แถว "คืนเกินส่วนเกิน" แก้แค่วันที่โอนได้ ============
  { const A = boot({ now:'2026-12-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[33b ✎ งวดไม่มีวันทำงาน (≥ ต.ค.) = ยอดที่นับจริง · แก้วันที่โอนของแถว 🏦 ที่คืนเกินส่วนเกิน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var h=V({id:1,code:'H1',nick:'หยุดพ.ย.',deposit_opening:5000,bank_account:'1000000001'});
      employees=[h]; shifts={H1:mk('2026-07-26','2026-12-09', d=>d>='2026-10-26'&&d<='2026-11-25')};
      depositEntries=[{id:1,empId:1,period:'2026-11',amount:300,note:''}];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-12</option>'; document.getElementById('depPeriodSel').value='2026-12'; renderDeposit();`);
    T.deposit_entries = [{ id:1, employee_id:1, period:'2026-11', amount:300, note:'' }];
    ok(E(`(d=>d.ded===0&&d.cap==='neg')(depositCalc(h,'2026-11'))`), '✎ 300 ในงวด พ.ย. ที่ไม่มีวันทำงาน (สุทธิ 0) → หักได้ 0 · ไม่เข้ายอดสะสม');
    await E(`depRefundOpen()`);
    const wn = E(`depRefState.items.find(x=>x.e.id===1).warn.join(' | ')`);
    ok(/พ\.ย\. 69 300 \(ไม่ได้หัก · สุทธิไม่พอ — ไม่นับ\)/.test(wn), `หน้าต่าง 💸: ✎ งวดไม่มีวันทำงานโชว์ "พ.ย. 300 (ไม่ได้หัก · สุทธิไม่พอ — ไม่นับ)" ไม่ใช่ยอดดิบ (ได้ "${wn}")`);
    E(`closeModal('depRefBg')`);
    // 🏦 คืนเกินส่วนเกิน (ถึงยอดสะสม) → แก้แค่วันที่โอน (ยอดเท่าเดิม) ต้องได้
    E(`var q=V({id:2,code:'Q1',nick:'ลาออกหมด',active:false,deposit_opening:5000,bank_account:'2000000002'}); employees.push(q); shifts.Q1=mk('2026-07-26','2026-09-10');`);
    T.deposit_entries.push({ id:2, employee_id:2, period:'2026-12', amount:-4200, note:'xfer:2026-12-08' });
    await E(`depRefresh()`); E(`renderDeposit()`);
    ok(E(`(d=>d.xfer===4200&&d.before===5000&&d.target===3000)(depositCalc(q,'2026-12'))`), 'ตั้งต้น: แถว 🏦 โอนคืน 4,200 (ติ๊กคืนเกินส่วนเกิน · สะสม 5,000 เป้า 3,000)');
    io.promptAns = ['4200', '2026-12-09']; io.toasts.length = 0;
    await E(`editDeposit(2,'2026-12')`);
    const rq = T.deposit_entries.find(r=>r.employee_id===2 && r.period==='2026-12');
    ok(rq && rq.amount===-4200 && rq.note==='xfer:2026-12-09', `✎ แถว 🏦 แก้แค่วันที่โอน (ยอดเดิม 4,200 > สะสม − เป้า 2,000) → บันทึกได้ "xfer:2026-12-09" (ได้ ${JSON.stringify(rq)})`);
    io.promptAns = ['4300'];
    await E(`editDeposit(2,'2026-12')`);
    ok(T.deposit_entries.find(r=>r.employee_id===2 && r.period==='2026-12').amount===-4200, '✎ แถว 🏦 เพิ่มยอดเกินยอดเดิม (4,300) → ปฏิเสธ');
    ok(/เงินประกัน v2\.[1-9]/.test(E(`DEP_VER_ASK`)) && E(`DEP_VER_ASK`).includes(E(`APP_VER`)), 'ข้อความเตือนรุ่นเครื่อง (🏦/🔒 จำเหตุผล) อ้างรุ่นปัจจุบัน (≥ "เงินประกัน v2.1" · 2026-10-21 = v2.3 งวดเริ่มหักรายคน)');
  }
  // ============ 34) ผลตรวจรอบ 3: ล็อกก่อนแก้งวดที่จ่ายแล้ว = สิทธิ์ 🛡️/🐷 ครบ · ทิป/วันหยุด/สแกน/เงินยืม/MOU ล็อกก่อน · K BIZ ล็อกคนพ้นสภาพ ============
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[34 ผลตรวจรอบ 3: บัญชีไม่มีสิทธิ์ 🛡️/🐷 แก้งวดที่จ่ายแล้ว = ไม่บันทึก · สำรองฯ งวดที่จ่ายแล้วไม่เปลี่ยน (บาทจริง)]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr='';
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var s=V({id:11,code:'S1',nick:'เบิกเยอะ',bank_account:'1100000001'});
      employees=[s]; shifts={S1:mk('2026-07-26','2027-01-25')};
      advances=[{id:501,empId:11,period:'2026-10',amount:11900,date:'2026-10-15',note:''}];
      pvdMembers=[fromDbPvdM({id:1,employee_id:11,emp_mode:'fixed',emp_value:500,er_mode:'none',er_value:0,start_period:'2026-10',stop_period:'',opening_emp:0,opening_er:0,consent:true,note:''})];
      pvdEntries=[]; pvdPayouts=[];`);
    T.advances = [{ id:501, employee_id:11, period:'2026-10', amount:11900, taken_date:'2026-10-15', note:'' }];
    T.pvd_members = [{ id:1, employee_id:11, emp_mode:'fixed', emp_value:500, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' }];
    T.pvd_entries = []; T.pvd_payouts = []; T.deposit_entries = [];
    const st = () => JSON.parse(E(`JSON.stringify((p=>({net:p.net,dep:p.dep.ded,cap:p.dep.cap,pvd:p.pvd.ded,short:p.pvd.short}))(calcPay(s,'2026-10')))`));
    const s0 = st();
    ok(s0.net===0 && s0.dep===100 && s0.cap==='short' && s0.pvd===0 && s0.short===500,
       `ตั้งต้น ต.ค. (จ่ายแล้ว 5 พ.ย. · ยังไม่ 🔒): ค่าแรง 12,000 − เบิก 11,900 → เงินประกันหักได้ 100 · สำรองฯ 0 (ไม่พอ 500) · สุทธิ 0 (ได้ ${JSON.stringify(s0)})`);
    const user = apps => E(`AUTH={username:'m',role:'staff',apps:{payroll:${JSON.stringify(apps)}}}; applyUser(AUTH); go('adv');`);
    const nW = () => A.db.log.filter(l=>l.op!=='select' && l.table!=='payroll_audit').length;
    // (1) สิทธิ์ 💵 เบิกอย่างเดียว → ต้องล็อกเงินประกัน ต.ค. แต่ไม่มีสิทธิ์ 🛡️ → ไม่บันทึกอะไรเลย
    user({ adv:'vaed' }); io.toasts.length = 0; A.db.log.length = 0;
    await E(`delAdv(501)`);
    ok(T.advances.length===1 && !nW() && /ไม่มีสิทธิ์หน้า 🛡️/.test(A.d.getElementById('toast').textContent),
       `บัญชีเบิกอย่างเดียว ลบเบิก ต.ค. (จ่ายแล้ว) → ไม่ลบ ไม่ล็อก + บอก "ไม่มีสิทธิ์หน้า 🛡️ — ให้ผู้มีสิทธิ์กด 🔒 ก่อน" (toast: ${A.d.getElementById('toast').textContent})`);
    // (2) เบิก + 🛡️ แต่ไม่มี 🐷 → สำรองฯ ต้องล็อก → ไม่บันทึก (ไม่เขียนแถว 🔒 เงินประกันค้างไว้ครึ่งทางด้วย)
    user({ adv:'vaed', dep:'vaed' }); io.toasts.length = 0; A.db.log.length = 0;
    await E(`delAdv(501)`);
    ok(T.advances.length===1 && !nW() && /ไม่มีสิทธิ์หน้า 🐷/.test(A.d.getElementById('toast').textContent),
       'บัญชีเบิก + 🛡️ (ไม่มี 🐷) → ไม่ลบเบิก · ไม่เขียนแถว 🔒 ใด ๆ · บอก "ไม่มีสิทธิ์หน้า 🐷" (เดิม: ข้ามสำรองฯ แล้วลบเบิก → สำรองฯ ต.ค. กลายเป็น 500)');
    // เพิ่มเบิก (ผลกลับกัน) ด้วยบัญชีเดียวกัน → ไม่บันทึก
    E(`document.getElementById('advQ_11') || (()=>{ const i=document.createElement('input'); i.id='advQ_11'; document.body.appendChild(i); })(); document.getElementById('advQ_11').value='50';`);
    A.db.log.length = 0; await E(`quickAdv(11,'2026-10')`);
    ok(T.advances.length===1 && !nW() && /ไม่มีสิทธิ์หน้า 🐷/.test(A.d.getElementById('toast').textContent), 'บัญชีเดียวกันเพิ่มเบิก ต.ค. 50 → ไม่บันทึก (เหตุผลเดียวกัน)');
    const s1 = st();
    ok(s1.pvd===0 && s1.dep===100, 'สลิป ต.ค. ยังเท่าที่จ่ายจริง: เงินประกัน 100 · สำรองฯ 0');
    // (3) สิทธิ์ครบ (เบิก + 🛡️ + 🐷) → 🔒 ทั้งสองก่อน แล้วลบเบิก → สำรองฯ/เงินประกัน ต.ค. ไม่เปลี่ยน แม้สุทธิตอนนี้ 11,900
    user({ adv:'vaed', dep:'vaed', pvd:'vaed' }); io.toasts.length = 0; io.confirms.length = 0;
    await E(`delAdv(501)`);
    const s2 = st();
    const dr = T.deposit_entries.find(r=>r.employee_id===11 && r.period==='2026-10'), pr = T.pvd_entries.find(r=>r.employee_id===11 && r.period==='2026-10');
    ok(T.advances.length===0 && dr && dr.note==='lock:short:300:100' && dr.amount===100 && pr && pr.note==='lock' && pr.emp_amount===0 && s2.dep===100 && s2.pvd===0 && s2.net===11900,
       `สิทธิ์ครบ → 🔒 เงินประกัน ต.ค. 100 (lock:short) + 🔒 สำรองฯ ต.ค. 0 ก่อน → ลบเบิก → ต.ค. เงินประกัน 100 · สำรองฯ 0 เท่าสลิปที่จ่าย · สุทธิตอนนี้ 11,900 (ได้ ${JSON.stringify(s2)})`);
    ok(E(`calcPay(s,'2026-11').pvd.empSum`)===500, 'ยอดสะสมสำรองฯ ถึง พ.ย. = 500 (ต.ค. 0 + พ.ย. 500 · ไม่เกินเงินที่เก็บจริง)');
    // ฟอร์มพนักงาน (สิทธิ์ 👥 ไม่มี 🐷) เปลี่ยนฐานเงินเดือนของสมาชิกสำรองฯ ที่งวดจ่ายแล้วยังไม่ 🔒 → ไม่บันทึก (pvdStrict)
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); var s9=V({id:19,code:'S9',nick:'ขึ้นเงินเดือน',bank_account:'1900000001'}); employees.push(s9); shifts.S9=mk('2026-07-26','2027-01-25');
       pvdMembers.push(fromDbPvdM({id:9,employee_id:19,emp_mode:'pct',emp_value:5,er_mode:'none',er_value:0,start_period:'2026-10',stop_period:'',opening_emp:0,opening_er:0,consent:true,note:''}));`);
    T.pvd_members.push({ id:9, employee_id:19, emp_mode:'pct', emp_value:5, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' });
    T.employees = [{ id:19, code:'S9', nick:'ขึ้นเงินเดือน', rate:12000 }];
    user({ emp:'vaed', dep:'vaed' }); E(`go('emp'); openEmpForm(19); document.getElementById('fRate').value='15000';`);
    A.db.log.length = 0; await E(`saveEmpForm()`);
    ok(E(`s9.rate`)===12000 && !nW() && /ไม่มีสิทธิ์หน้า 🐷/.test(A.d.getElementById('toast').textContent) && E(`calcPay(s9,'2026-10').pvd.ded`)===600,
       'ฟอร์มพนักงาน (ไม่มีสิทธิ์ 🐷) ขึ้นเงินเดือน 12,000 → 15,000 → ไม่บันทึก · สำรองฯ ต.ค. (5%) ยัง 600 เท่าสลิปที่จ่าย');
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[34b ทิป · วันหยุดพิเศษ · เงินยืม/MOU (ค่าหลัก) · แก้/ลบสแกน ของงวดที่จ่ายแล้ว → 🔒 ก่อน (ตอบไม่ = ไม่บันทึก)]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); tipReady=true; loanReady=true; mouReady=true;
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var t1=V({id:1,code:'T1',nick:'ลาดพร้าว',bank_account:'1000000001'});
      var t2=V({id:2,code:'T2',nick:'รัชดา',branch:'JJRD',bank_account:'1000000002'});
      employees=[t1,t2]; shifts={T1:mk('2026-07-26','2026-12-25'),T2:mk('2026-07-26','2026-12-25')};`);
    T.deposit_entries = []; T.tips = []; T.holidays = [];
    const lockOf = (id,p) => T.deposit_entries.find(r=>r.employee_id===id && r.period===p);
    const NO = m => !/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m);
    // ทิป ลาดพร้าว ต.ค. (จ่ายแล้ว)
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10'; openTips(); document.getElementById('tip_JJLP').value='1000';`);
    io.confirmAns = NO; io.confirms.length = 0;
    await E(`saveTips()`);
    ok(!T.tips.length && !lockOf(1,'2026-10') && io.confirms.some(m=>/บันทึกทิป ลาดพร้าว/.test(m) && /ต\.ค\. 69 300/.test(m)), 'ทิปลาดพร้าว ต.ค. (จ่ายแล้ว) → ถาม 🔒 ก่อน (ต.ค. 300) · ตอบไม่ = ไม่บันทึกทิป ไม่ล็อก');
    io.confirmAns = null; A.db.log.length = 0;
    E(`openTips(); document.getElementById('tip_JJLP').value='1000';`);
    await E(`saveTips()`);
    const iL = A.db.log.findIndex(l=>l.table==='deposit_entries' && l.n), iT = A.db.log.findIndex(l=>l.table==='tips');
    ok(T.tips.length===1 && lockOf(1,'2026-10') && lockOf(1,'2026-10').amount===300 && !lockOf(2,'2026-10') && iL >= 0 && iL < iT,
       'ตอบตกลง → 🔒 ต.ค. ของคนลาดพร้าว (300) ก่อน แล้วค่อยบันทึกทิป · รัชดา (ทิปไม่เปลี่ยน) ไม่ล็อก');
    io.confirms.length = 0; E(`openTips();`); await E(`saveTips()`);
    ok(!io.confirms.some(m=>/ปิดยอด/.test(m)), 'กดบันทึกทิปซ้ำ (ยอด/รายชื่อเท่าเดิม) → ไม่ถาม');
    // วันหยุดพิเศษ 13 ต.ค. (งวด ต.ค. จ่ายแล้ว) → ทุกคน
    E(`go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-10-13'; document.getElementById('hName').value='ทดสอบ'; document.getElementById('hMult').value='2';`);
    io.confirmAns = NO; io.confirms.length = 0;
    await E(`saveHoli()`);
    ok(!T.holidays.length && !lockOf(2,'2026-10') && io.confirms.some(m=>/บันทึกวันหยุดพิเศษ/.test(m)), 'เพิ่มวันหยุด 13 ต.ค. (งวดที่จ่ายแล้ว) → ถาม 🔒 ก่อน · ตอบไม่ = ไม่บันทึกวันหยุด');
    io.confirmAns = null;
    await E(`saveHoli()`);
    ok(T.holidays.length===1 && lockOf(2,'2026-10') && lockOf(2,'2026-10').amount===300, 'ตอบตกลง → 🔒 ต.ค. ของรัชดา (300) แล้วบันทึกวันหยุด');
    io.confirms.length = 0;
    E(`document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-12-10';`);
    await E(`saveHoli()`);
    ok(T.holidays.length===2 && !io.confirms.some(m=>/ปิดยอด/.test(m)), 'วันหยุด 10 ธ.ค. (งวดยังไม่จ่าย) → บันทึกเลย ไม่ถาม');
    // เงินยืม (ค่าหลัก) — เริ่มหัก ต.ค.
    E(`var t3=V({id:3,code:'T3',nick:'ยืมเงิน',branch:'JJCK',bank_account:'1000000003'}); employees.push(t3); shifts.T3=mk('2026-07-26','2026-12-25');
      loans=[fromDbLoan({id:1,employee_id:3,amount:10000,monthly:1000,deduct_on:'payroll',start_period:'2026-10',opening:0})];
      mouLoans=[fromDbMou({id:1,employee_id:3,amount:15000,monthly:2000,final_max:3000,start_period:'2026-11',opening:0})]; go('loan');`);
    T.loans = [{ id:1, employee_id:3, amount:10000, monthly:1000, deduct_on:'payroll', start_period:'2026-10', opening:0 }];
    T.mou_loans = [{ id:1, employee_id:3, amount:15000, monthly:2000, final_max:3000, start_period:'2026-11', opening:0 }];
    io.confirmAns = NO; io.confirms.length = 0;
    await E(`updLoanField(1,'monthly',2000)`);
    ok(T.loans[0].monthly===1000 && !lockOf(3,'2026-10') && io.confirms.some(m=>/แก้เงินยืม/.test(m)), 'แก้ยอดผ่อนเงินยืม (เริ่ม ต.ค. จ่ายแล้ว) → ถาม 🔒 ก่อน · ตอบไม่ = ไม่แก้');
    io.confirmAns = null; io.confirms.length = 0;
    await E(`updLoanField(1,'note','จดไว้')`);
    ok(T.loans[0].note==='จดไว้' && !io.confirms.some(m=>/ปิดยอด/.test(m)) && !lockOf(3,'2026-10'), 'แก้หมายเหตุเงินยืม → ไม่ถาม ไม่ล็อก');
    await E(`updLoanField(1,'monthly',2000)`);
    ok(T.loans[0].monthly===2000 && lockOf(3,'2026-10') && lockOf(3,'2026-10').amount===300 && E(`calcPay(t3,'2026-10').dep.ded`)===300, 'ตอบตกลง → 🔒 ต.ค. 300 แล้วแก้ผ่อนเป็น 2,000');
    T.deposit_entries = T.deposit_entries.filter(r=>r.employee_id!==3); await E(`depRefresh()`);
    io.confirms.length = 0; E(`go('mou')`);
    await E(`updMouField(1,'monthly',3000)`);
    ok(!io.confirms.some(m=>/ปิดยอด/.test(m)) && T.mou_loans[0].monthly===3000, 'MOU เริ่มหัก พ.ย. (ยังไม่จ่าย) แก้ยอดผ่อน → ไม่ถาม (ไม่กระทบงวดที่จ่ายแล้ว)');
    io.confirmAns = NO;
    await E(`updMouField(1,'start_period','2026-10')`);
    ok(T.mou_loans[0].start_period==='2026-11' && io.confirms.some(m=>/แก้เงินยืม MOU/.test(m)), 'เลื่อนงวดเริ่มหัก MOU ย้อนไป ต.ค. (จ่ายแล้ว) → ถาม 🔒 ก่อน · ตอบไม่ = ไม่แก้');
    // ลบเวลาสแกนวันที่ 10 ต.ค. (งวด ต.ค. จ่ายแล้ว)
    E(`var t4=V({id:4,code:'T4',nick:'แก้สแกน',bank_account:'1000000004'}); employees.push(t4); shifts.T4=mk('2026-07-26','2026-12-25');
       document.getElementById('pEmpId').value='4'; document.getElementById('pDay').value='2026-10-10';`);
    io.confirmAns = NO; io.confirms.length = 0; A.db.log.length = 0;
    await E(`delPunchDay()`);
    ok(!A.db.log.some(l=>l.table==='punches') && !lockOf(4,'2026-10') && io.confirms.some(m=>/ลบเวลาสแกน/.test(m) && /ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)), 'ลบเวลาสแกน 10 ต.ค. (งวดที่จ่ายแล้ว) → ถาม 🔒 ก่อน · ตอบไม่ = ไม่ลบสแกน');
    io.confirmAns = null; A.db.log.length = 0;
    await E(`delPunchDay()`);
    const iD = A.db.log.findIndex(l=>l.table==='deposit_entries' && l.n), iP = A.db.log.findIndex(l=>l.table==='punches');
    ok(lockOf(4,'2026-10') && lockOf(4,'2026-10').amount===300 && iD >= 0 && iD < iP, 'ตอบตกลง → 🔒 ต.ค. 300 ก่อน แล้วค่อยลบสแกน');
  }
  { const A = boot({ now:'2026-12-02T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[34c K BIZ พ.ย.: ล็อกงวด ต.ค. ของคนพ้นสภาพที่ไม่อยู่ในไฟล์ด้วย]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var w=V({id:1,code:'W1',nick:'ทำงาน',bank_account:'1111111111'});
      var g=V({id:2,code:'G1',nick:'ลาออก ต.ค.',active:false,bank_account:'2222222222'});
      employees=[w,g]; shifts={W1:mk('2026-07-26','2026-12-01'),G1:mk('2026-07-26','2026-10-10')}; depositEntries=[]; depV2Col=true;
      go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    T.deposit_entries = V1ROWS(E); await E(`depRefresh()`);   // รอบ 10: ส.ค./ก.ย. 🔒 แล้ว
    io.confirms.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    const lk = io.confirms.find(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) || '';
    ok(io.files.length===1 && /เงินประกัน 2 คน รวม 600 บาท/.test(lk) && T.deposit_entries.filter(r=>r.period>='2026-10').map(r=>r.employee_id+':'+r.period+':'+r.amount).sort().join()==='1:2026-10:300,2:2026-10:300' &&
       !io.files[0].aoa.some(r=>r[1]==='2222222222'),
       'K BIZ พ.ย. → 🔒 ต.ค. ของคนในไฟล์ + คนลาออก ต.ค. (ไม่อยู่ในไฟล์) "เงินประกัน 2 คน รวม 600 บาท" · คนลาออกไม่อยู่ในไฟล์โอน');
  }
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[34d 🏦 ห้ามงวดที่คนพ้นสภาพยังมีวันทำงาน · 💸 ของคนที่พ้นสภาพทีหลัง = เตือน · ชิปหลังโอน · ถามคืนไม่รวมพ้นสภาพ · K BIZ < 1 บาท · ลำดับสลิปงวดเก่า]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));
      var q=V({id:7,code:'Q1',nick:'ออกกลางงวด',active:false,deposit_opening:4000,bank_account:'7777777777',end_date:'2026-10-10'});
      var w=V({id:1,code:'W1',nick:'ทำงาน',deposit_opening:1000,bank_account:'1111111111'});
      var r=V({id:3,code:'R1',nick:'คืนแล้วลาออก',deposit_opening:5000,bank_account:'3333333333'});
      employees=[q,w,r]; shifts={Q1:mk('2026-07-26','2026-10-10'),W1:mk('2026-07-26','2026-10-27'),R1:mk('2026-07-26','2026-10-19')}; depositEntries=[]; depV2Col=true;
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option><option>2026-11</option>'; document.getElementById('depActive').value='';
      document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    T.deposit_entries = [];
    ok(E(`depositCalc(q,'2026-10').over`)===2000 && E(`empPeriodSet(q).has('2026-10')`), 'ตั้งต้น: ออกกลางงวด (พ้นสภาพ · มีวันทำงาน 26 ก.ย.–10 ต.ค.) สะสม 5,000 เกินเป้า 2,000');
    // depOverAsk: พ้นสภาพที่ยังอยู่ในไฟล์ (มีวันทำงาน ต.ค.) ไม่ถูกถามให้กด 💸
    io.confirms.length = 0;
    ok(E(`depOverAsk([q,w].map(e=>({e, p:calcPay(e,'2026-10')})),'2026-10')`)===true && !io.confirms.length, 'สร้างไฟล์ ต.ค.: ออกกลางงวด (พ้นสภาพ เกินเป้า 2,000) ไม่ถูกถาม "กด 💸 คืนส่วนเกิน" (โอนนอกสลิป ไม่กระทบไฟล์)');
    io.confirms.length = 0;
    ok(E(`depOverAsk([q,r].map(e=>({e, p:calcPay(e,'2026-10')})),'2026-10')`)===true && io.confirms.length===1 && /คืนแล้วลาออก เกิน 2,000/.test(io.confirms[0]) && !/• ออกกลางงวด/.test(io.confirms[0]) && /🏦 พ้นสภาพ 1 คน ยังไม่ได้บันทึกโอนคืนนอกสลิป — ไม่กระทบไฟล์นี้: ออกกลางงวด/.test(io.confirms[0]),
       'มีคนทำงานที่ยังไม่คืนด้วย → ถามเฉพาะคนทำงาน · คนพ้นสภาพแยกบรรทัด "🏦 … ไม่กระทบไฟล์นี้"');
    await E(`depRefundOpen()`);
    const iq = JSON.parse(E(`JSON.stringify((x=>x&&{xf:x.xf,on:x.on,block:x.block})(depRefState.items.find(x=>x.e.id===7)))`));
    ok(iq && iq.xf && !iq.on && /มีวันทำงานงวดนี้/.test(iq.block) && /บันทึก 🏦 ในงวด พ\.ย\. 2569 \(เลือกงวดนั้นที่หน้า 🛡️ ได้ตั้งแต่ 26 ต\.ค\.\)/.test(iq.block), `🏦 งวด ต.ค. (ยังมีวันทำงาน = อยู่ในสลิป/ไฟล์ K BIZ) → ติ๊กไม่ได้ "…บันทึก 🏦 ในงวด พ.ย. 2569 (เลือกงวดนั้นได้ตั้งแต่ 26 ต.ค.)" (รอบ 4: บอกวันที่เลือกได้จริง · ได้ ${iq && iq.block})`);
    E(`depRefState.items.find(x=>x.e.id===7).block=''; depRefState.items.find(x=>x.e.id===7).on=true; depRefState.items.find(x=>x.e.id===7).date='2026-10-20';`);
    io.alerts.length = 0; await E(`depRefundSave()`);
    ok(!T.deposit_entries.some(x=>x.employee_id===7) && /มีวันทำงานงวดนี้/.test(io.alerts.join()), 'ฝืนติ๊กแล้วกดบันทึก → เช็คซ้ำตอนบันทึก ข้าม "มีวันทำงานงวดนี้" (ไม่มีแถว 🏦 ต.ค.)');
    E(`closeModal('depRefBg'); document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    await E(`depRefundOpen()`);
    const iq2 = JSON.parse(E(`JSON.stringify((x=>x&&{xf:x.xf,block:x.block,amount:x.amount,dmin:x.dmin})(depRefState.items.find(x=>x.e.id===7)))`));
    const di = A.d.querySelector('#depRefBody input[type=date]');
    ok(iq2 && iq2.xf && !iq2.block && iq2.amount===2000 && di && /min-height:\s*44px/.test(di.getAttribute('style')) && di.getAttribute('min')==='2026-09-26',
       `งวด พ.ย. (ไม่มีวันทำงาน) → 🏦 ได้ · ยอดที่ต้องโอน 2,000 · ช่องวันที่สูง 44px + min 26 ก.ย. (ได้ ${JSON.stringify(iq2)} min=${di && di.getAttribute('min')})`);
    E(`(x=>{ x.on=true; x.amount=1500; x.date='2026-10-20'; })(depRefState.items.find(x=>x.e.id===7)); depRefState.items.filter(x=>x.e.id!==7).forEach(x=>x.on=false);`);
    await E(`depRefundSave()`);
    const xr = T.deposit_entries.find(x=>x.employee_id===7 && x.period==='2026-11');
    ok(xr && xr.amount===-1500 && xr.note==='xfer:2026-10-20', 'บันทึก 🏦 งวด พ.ย. โอนบางส่วน 1,500 (xfer:2026-10-20)');
    E(`renderDeposit()`);
    const trq = [...A.d.querySelectorAll('#depTable tbody tr')].find(t=>t.textContent.includes('ออกกลางงวด'));
    ok(trq && /เกินเป้า 500 \(หลังโอน\)/.test(trq.textContent) && !/ยังไม่คืน/.test(trq.textContent), 'ตาราง 🛡️ พ.ย.: "เกินเป้า 500 (หลังโอน)" ไม่ใช่ "ยังไม่คืน"');
    const stx = A.d.getElementById('depStats').textContent.replace(/\s+/g,'');
    ok(/1เกินเป้ายังไม่คืน/.test(stx), `ช่องสถิติ: "เกินเป้า ยังไม่คืน" = 1 (คืนแล้วลาออก) ไม่นับคนที่โอนบางส่วนแล้ว (ได้ ${stx.slice(-60)})`);
    // 💸 คืนในสลิปตอนยังทำงาน แล้วตั้งพ้นสภาพ (ไม่มีวันทำงาน พ.ย.) → ไม่อยู่ในสลิป/K BIZ → เตือน
    E(`depRefState.items.forEach(x=>x.on=false); closeModal('depRefBg');`);
    T.deposit_entries.push({ id:9001, employee_id:3, period:'2026-11', amount:-2000, note:'refund' }); await E(`depRefresh()`);
    E(`renderDeposit()`);
    ok(!/คืนในสลิปของคนที่ไม่อยู่ในสลิป/.test(A.d.getElementById('depWarn').textContent), 'คืนแล้วลาออก ยังทำงานอยู่ → ไม่เตือน');
    E(`r.active=false; renderDeposit();`);
    const wt = A.d.getElementById('depWarn').textContent;
    ok(/💸 คืนในสลิปของคนที่ตอนนี้ไม่อยู่ในรายชื่อเงินเดือน\/ไฟล์ K BIZ/.test(wt) && /คืนแล้วลาออก พ\.ย\. 69 2,000/.test(wt) && /เช็คก่อนว่าสร้างไฟล์ K BIZ งวดนั้นไปแล้วหรือยัง/.test(wt) && /มีชื่อ = จ่ายแล้ว ห้ามโอนซ้ำ/.test(wt) && /ยกเลิก 💸/.test(wt) && !/เงินจะไม่ถูกจ่าย/.test(wt),
       'ตั้งพ้นสภาพ (ไม่มีวันทำงาน พ.ย.) → แถบหน้า 🛡️ เตือน "💸 … คืนแล้วลาออก พ.ย. 69 2,000" + เช็คไฟล์ K BIZ ก่อน (มีชื่อ = จ่ายแล้ว ห้ามโอนซ้ำ) · ไม่ฟันธง "เงินจะไม่ถูกจ่าย" (รอบ 4)');
    await E(`depRefundOpen()`);
    ok(/คืนแล้วลาออก พ\.ย\. 69 2,000/.test(A.d.getElementById('depRefBody').textContent), 'หน้าต่าง 💸 พ.ย. เตือนคนเดียวกัน');
    E(`closeModal('depRefBg'); go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && /💸 คืนในสลิปของคนที่ไม่อยู่ในไฟล์นี้/.test(A.d.getElementById('kbizResBody').textContent) && !io.files[0].aoa.some(x=>x[1]==='3333333333'),
       'K BIZ พ.ย.: คนนี้ไม่อยู่ในไฟล์ + ผลสร้างไฟล์เตือน "💸 คืนในสลิปของคนที่ไม่อยู่ในไฟล์นี้"');
    // K BIZ ต.ค.: สุทธิ 0.50 บาท (หักเงินประกันเท่าที่เหลือ) → ไม่ใส่ในไฟล์ · หน้าต่างผลบอก "ต่ำกว่า 1 บาท"
    E(`var h=V({id:9,code:'H9',nick:'เหลือเศษ',bank_account:'9999999999'}); employees.push(h); shifts.H9=mk('2026-07-26','2026-10-19');
       adjustments=[{id:1,empId:9,period:'2026-10',kind:'deduct',amount:11999.5,reason:'ของเสียหาย'}];
       document.getElementById('periodSel').value='2026-10';`);
    const ph = JSON.parse(E(`JSON.stringify((p=>({net:p.net,dep:p.dep.ded,cap:p.dep.cap}))(calcPay(h,'2026-10')))`));
    ok(ph.net===0.5 && ph.dep===0 && ph.cap==='neg', `ตั้งต้น: สุทธิก่อนหักเงินประกัน 0.50 → ไม่หัก (neg) · สุทธิ 0.50 (ได้ ${JSON.stringify(ph)})`);
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    const rb = A.d.getElementById('kbizResBody').textContent.replace(/\s+/g,' ');
    ok(io.files.length===1 && !io.files[0].aoa.some(x=>x[1]==='9999999999') && /🪙 ต่ำกว่า 1 บาท — ไม่ใส่ในไฟล์ \(จ่ายเงินสด\) \(1 คน\)[^0-9]*0\.50/.test(rb) && /เหลือเศษ/.test(rb),
       'K BIZ ต.ค.: เหลือเศษ 0.50 บาท ไม่อยู่ในไฟล์ · หน้าต่างผล "🪙 ต่ำกว่า 1 บาท — ไม่ใส่ในไฟล์ (จ่ายเงินสด) (1 คน) 0.50" (กระทบยอดครบ)');
    // ลำดับบรรทัดในสลิป: ก.ย. (ก่อน ต.ค.) = ตำแหน่งเดิม (ต่อจากเบิก) · ต.ค. = ท้ายรายการหัก
    E(`advances=[{id:1,empId:1,period:'2026-09',amount:500,date:'2026-09-15',note:''},{id:2,empId:1,period:'2026-10',amount:500,date:'2026-10-15',note:''}];
       adjustments=[{id:2,empId:1,period:'2026-09',kind:'deduct',amount:100,reason:'ของเสียหาย'},{id:3,empId:1,period:'2026-10',kind:'deduct',amount:100,reason:'ของเสียหาย'}];`);
    const sp = txt(E, `buildSlip(w,'2026-09',false)`), so = txt(E, `buildSlip(w,'2026-10',false)`);
    const ix = (t, k) => t.indexOf(k);
    ok(ix(sp,'เบิกล่วงหน้า') >= 0 && ix(sp,'เบิกล่วงหน้า') < ix(sp,'เงินประกัน (') && ix(sp,'เงินประกัน (') < ix(sp,'ของเสียหาย') &&
       ix(so,'ของเสียหาย') >= 0 && ix(so,'ของเสียหาย') < ix(so,'เงินประกัน ('),
       'สลิป ก.ย. 69: เงินประกันอยู่ต่อจากเบิก (ตำแหน่งเดิม — พิมพ์ซ้ำเหมือนที่แจก) · ต.ค. 69: ท้ายรายการหัก (ลำดับที่คิดจริง)');
    E(`detailEmpId=1; detailTab='money'; refreshPeriodSelectors(); go('detail'); document.getElementById('detailPeriodSel').value='2026-09'; renderDetail(true);`);
    const d9 = A.d.getElementById('detailContent').textContent;
    E(`document.getElementById('detailPeriodSel').value='2026-10'; renderDetail(true);`);
    const d10 = A.d.getElementById('detailContent').textContent;
    ok(ix(d9,'－ เงินประกัน') > 0 && ix(d9,'－ เงินประกัน') < ix(d9,'ของเสียหาย') && ix(d10,'－ เงินประกัน') > ix(d10,'ของเสียหาย'),
       'หน้ารายคน แท็บเงินเดือน: ก.ย. เงินประกันตำแหน่งเดิม · ต.ค. ท้ายรายการหัก (ตรงสลิป)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  // ============ 35) ผลตรวจรอบ 4: ทุกทางที่เปลี่ยนสุทธิของงวดที่จ่ายแล้ว (≥ ต.ค.) = 🔒 ก่อน · ตอบไม่/ล็อกไม่ได้ = ไม่บันทึก (บาทจริง) ============
  const PUN = `var mkP = function(code, from, to, tin, tout, skip){ const a=[]; for(let d=new Date(from+'T12:00:00'); localYMD(d)<=to; d.setDate(d.getDate()+1)){ const k=localYMD(d);
      if(skip && skip(k)) continue; a.push({code, date:k, time:tin||'08:58', sn:''}); a.push({code, date:k, time:tout||'18:02', sn:''}); } return a; };`;
  const PVM = id => ({ id, employee_id:id, emp_mode:'fixed', emp_value:500, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' });
  const payOf = (E, v, p) => JSON.parse(E(`JSON.stringify((x=>({net:x.net,dep:x.dep.ded,cap:x.dep.cap||'',pvd:x.pvd?x.pvd.ded:0,tip:x.tip?x.tip.share:0,sso:x.sso?x.sso.ded:0,loan:x.eloan?x.eloan.dedPay:0,mou:x.mou?x.mou.ded:0}))(calcPay(${v},'${p}')))`));
  const NOASK = m => !/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m);
  const V5 = `var V = o => emp(Object.assign({deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย'}, o));`;
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35a ผลตรวจรอบ 4: เปิด/ปิด สปส. รายคน (หน้า 🧾 + แท็บข้อมูลส่วนตัว) หลังจ่าย ต.ค. → 🔒 ก่อน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ssoReady=true; hrReady=true; empInfoReady=true; pvdReady=true; pvdLoadErr=''; ssoEntries=[];
      settings.ssoRate=5; settings.ssoMin=1650; settings.ssoMax=15000; recomputeAll=function(){}; ${V5}
      var s=V({id:11,code:'S1',nick:'ปิดสปส',bank_account:'1100000001',sso_on:true}), u=V({id:12,code:'S2',nick:'เปิดสปส',bank_account:'1100000002',sso_on:false});
      employees=[s,u]; shifts={S1:mk('2026-07-26','2027-01-25'),S2:mk('2026-07-26','2027-01-25')};
      advances=[{id:501,empId:11,period:'2026-10',amount:11300,date:'2026-10-15',note:''},{id:502,empId:12,period:'2026-10',amount:11600,date:'2026-10-15',note:''}];
      pvdMembers=[fromDbPvdM(${JSON.stringify(PVM(11))})]; pvdEntries=[]; pvdPayouts=[];`);
    T.employees = [{ id:11, code:'S1', nick:'ปิดสปส', sso_on:true }, { id:12, code:'S2', nick:'เปิดสปส', sso_on:false }];
    T.pvd_members = [PVM(11)]; T.pvd_entries = []; T.pvd_payouts = []; T.deposit_entries = [];
    const s0 = payOf(E, 's', '2026-10');
    ok(s0.sso===600 && s0.dep===100 && s0.cap==='short' && s0.pvd===0, `ตั้งต้น ต.ค. (จ่ายแล้ว 5 พ.ย. · ยังไม่ 🔒): 12,000 − เบิก 11,300 − สปส. 600 → เงินประกันหักได้ 100 · สำรองฯ 0 (ได้ ${JSON.stringify(s0)})`);
    E(`go('sso')`); io.confirmAns = NOASK; io.confirms.length = 0;
    await E(`updSsoField(11,'sso_on',false)`);
    ok(T.employees[0].sso_on===true && E(`s.ssoOn`)===true && !T.deposit_entries.length && io.confirms.some(m=>/ปิดหัก สปส\. ของ ปิดสปส/.test(m) && /ต\.ค\. 69 100/.test(m)),
       'หน้า 🧾 เอาติ๊ก สปส. ออก → ถาม 🔒 ต.ค. 100 ก่อน · ตอบไม่ = ไม่บันทึก (ยังติ๊กอยู่) ไม่ล็อก');
    io.confirmAns = null;
    await E(`updSsoField(11,'sso_on',false)`);
    const s1 = payOf(E, 's', '2026-10'), dr = T.deposit_entries.find(r=>r.employee_id===11 && r.period==='2026-10'), pr = T.pvd_entries.find(r=>r.employee_id===11 && r.period==='2026-10');
    ok(T.employees[0].sso_on===false && dr && dr.amount===100 && dr.note==='lock:short:300:100' && pr && pr.note==='lock' && pr.emp_amount===0 && s1.sso===0 && s1.dep===100 && s1.pvd===0 && s1.net===600,
       `ตอบตกลง → 🔒 ต.ค. เงินประกัน 100 (lock:short) + สำรองฯ 0 ก่อน แล้วเอาติ๊กออก → ต.ค. ยัง 100/0 เท่าสลิปที่จ่าย (สุทธิตอนนี้ 600 · ได้ ${JSON.stringify(s1)})`);
    ok(E(`depositCalc(s,'2026-11').before`)===1100, 'สะสมก่อน พ.ย. = 1,100 (ส.ค./ก.ย. 500+500 + ต.ค. 100 ที่หักจริง · เดิมกลายเป็น 1,300)');
    const u0 = payOf(E, 'u', '2026-10');
    E(`openDetailInfo(12,'sso')`);
    const ck = A.d.querySelector('#dtEditForm [data-pi="ssoOn"]'); if(ck) ck.checked = true;
    io.confirms.length = 0; io.confirmAns = NOASK;
    await E(`saveInfo()`);
    ok(u0.dep===300 && T.employees[1].sso_on===false && !T.deposit_entries.some(r=>r.employee_id===12) && io.confirms.some(m=>/เปิดหัก สปส\. ของ เปิดสปส/.test(m)),
       'แท็บข้อมูลส่วนตัว ติ๊ก "เข้าประกันสังคม" (ต.ค. หักไป 300) → ถาม 🔒 ก่อน · ตอบไม่ = ไม่บันทึก');
    io.confirmAns = null;
    await E(`saveInfo()`);
    const u1 = payOf(E, 'u', '2026-10'), du = T.deposit_entries.find(r=>r.employee_id===12 && r.period==='2026-10');
    ok(T.employees[1].sso_on===true && du && du.amount===300 && du.note==='lock' && u1.dep===300 && u1.sso===600,
       `ตอบตกลง → 🔒 ต.ค. 300 แล้วบันทึก → ต.ค. ยังหัก 300 (ไม่กลายเป็น 0 'neg') · สปส. 600 (ได้ ${JSON.stringify(u1)})`);
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35b ฟอร์ม ⚙️: พ้นสภาพ (ทิปทั้งสาขา) · เบี้ยวันหยุด · ชื่อเล่น · กลับมาทำงานแต่ปิดหักค้าง]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); tipReady=true; recomputeAll=function(){}; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'}), c=V({id:3,code:'C1',nick:'ซี',branch:'JJRD',bank_account:'1000000003'});
      employees=[a,b,c]; shifts={A1:mk('2026-07-26','2026-12-25'),B1:mk('2026-07-26','2026-12-25'),C1:mk('2026-07-26','2026-12-25')};
      tips=[fromDbTip({id:1,period:'2026-10',branch:'JJLP',amount:2000,member_ids:''})];
      advances=[{id:501,empId:1,period:'2026-10',amount:12800,date:'2026-10-15',note:''}]; go('emp');`);
    T.employees = [{ id:1, code:'A1', nick:'เอ', active:true }, { id:2, code:'B1', nick:'บี', active:true, deposit_on:true }, { id:3, code:'C1', nick:'ซี', active:true }]; T.deposit_entries = [];
    const lk = id => T.deposit_entries.find(r=>r.employee_id===id && r.period==='2026-10');
    const a0 = payOf(E, 'a', '2026-10');
    ok(a0.tip===1000 && a0.dep===200 && a0.cap==='short', `ตั้งต้น ต.ค. (จ่ายแล้ว): ทิปลาดพร้าว 2,000 หาร 2 = 1,000 · เอ เบิก 12,800 → เงินประกันหักได้ 200 (ได้ ${JSON.stringify(a0)})`);
    E(`openEmpForm(2); document.getElementById('fNick').value='บีบี';`); io.confirms.length = 0;
    await E(`saveEmpForm()`);
    ok(E(`b.nick`)==='บีบี' && !io.confirms.length && !T.deposit_entries.length, 'แก้ชื่อเล่นอย่างเดียว → บันทึกเลย ไม่ถาม ไม่ล็อก');
    E(`openEmpForm(2); document.getElementById('fActive').value='0';`); io.confirms.length = 0; io.confirmAns = NOASK;
    await E(`saveEmpForm()`);
    const q1 = io.confirms.find(m=>/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)) || '';
    ok(!!E(`b.active`) && !T.deposit_entries.length && /สถานะ ของ บีบี/.test(q1) && /ทิปของคนในสาขาเปลี่ยนตาม/.test(q1) && /เงินประกัน 2 คน/.test(q1),
       `ตั้ง "พ้นสภาพ" → ถาม 🔒 ก่อน (เงินประกัน 2 คน · ทิปของคนในสาขาเปลี่ยนตาม) · ตอบไม่ = ไม่บันทึก (ถาม: ${q1.slice(0,120).replace(/\n/g,' | ')})`);
    io.confirmAns = null;
    await E(`saveEmpForm()`);
    E(`tipMemo={}`);   // recomputeAll ถูกปิดในเทสนี้ (สแกนจำลองใน shifts) — ล้างตัวจำทิปเอง
    const a1 = payOf(E, 'a', '2026-10');
    ok(!E(`b.active`) && lk(1) && lk(1).amount===200 && lk(1).note==='lock:short:300:200' && lk(2) && lk(2).amount===300 && !lk(3) && a1.tip===2000 && a1.dep===200,
       `ตอบตกลง → 🔒 ต.ค. เอ 200 (lock:short) + บี 300 ก่อน แล้วตั้งพ้นสภาพ → ทิปเอ ต.ค. 1,000→2,000 แต่เงินประกัน ต.ค. ยัง 200 · ซี (รัชดา) ไม่ล็อก (ได้ ${JSON.stringify(a1)})`);
    E(`openEmpForm(3); document.getElementById('fHoliPay').checked=false;`); io.confirms.length = 0;
    await E(`saveEmpForm()`);
    ok(E(`c.holidayPay`)===false && lk(3) && lk(3).amount===300 && io.confirms.some(m=>/เบี้ยวันหยุดพิเศษ ของ ซี/.test(m) && !/ทิปของคนในสาขา/.test(m)),
       'ซี (รัชดา ไม่มีทิป) เอาติ๊กเบี้ยวันหยุดพิเศษ → 🔒 ต.ค. 300 ของซีคนเดียวก่อน แล้วบันทึก');
    E(`b.depOn=false; depositEntries.push(fromDbDep({id:77,employee_id:2,period:'2026-11',amount:-2000,note:'xfer:2026-11-05'}));`);
    T.deposit_entries.push({ id:77, employee_id:2, period:'2026-11', amount:-2000, note:'xfer:2026-11-05' }); T.employees[1].deposit_on = false;
    E(`openEmpForm(2); document.getElementById('fActive').value='1';`); io.confirms.length = 0;
    await E(`saveEmpForm()`); await wait(20);
    ok(!!E(`b.active`) && io.confirms.some(m=>/กลับมาทำงาน แต่เงินประกันยังปิดหักอยู่/.test(m)) && T.employees[1].deposit_on===true && E(`b.depOn`)===true,
       'กลับมาทำงาน (พ้นสภาพ → ทำงานอยู่) ที่ยังปิดหักค้างจาก 🏦 คืนเกินส่วนเกิน → ถาม "เปิดหักเงินประกันอีกครั้งไหม" · ตกลง = เปิดหัก');
  }
  { const A = boot({ now:'2026-11-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35c ผ่อนเงินยืม/MOU รายงวด ก.ย. (ยอดสะสม) หลังจ่าย ต.ค. → 🔒 ต.ค. ก่อน]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); loanReady=true; mouReady=true; ${V5}
      var l=V({id:1,code:'L1',nick:'ยืม',bank_account:'1000000001'}), m=V({id:2,code:'M1',nick:'เอ็มโอยู',bank_account:'1000000002'});
      employees=[l,m]; shifts={L1:mk('2026-07-26','2026-12-25'),M1:mk('2026-07-26','2026-12-25')};
      loans=[fromDbLoan({id:1,employee_id:1,amount:3000,monthly:1000,deduct_on:'payroll',start_period:'2026-08',opening:0})]; loanEntries=[];
      mouLoans=[fromDbMou({id:1,employee_id:2,amount:8000,monthly:2000,final_max:3000,start_period:'2026-08',opening:0})]; mouEntries=[];
      advances=[{id:1,empId:1,period:'2026-10',amount:10850,date:'2026-10-15',note:''},{id:2,empId:2,period:'2026-10',amount:9800,date:'2026-10-15',note:''}]; go('loan');`);
    T.deposit_entries = []; T.loan_entries = []; T.mou_entries = [];
    const l0 = payOf(E, 'l', '2026-10'), m0 = payOf(E, 'm', '2026-10');
    ok(l0.loan===1000 && l0.dep===150 && l0.cap==='short' && m0.mou===2000 && m0.dep===200, `ตั้งต้น ต.ค. (จ่ายแล้ว): ยืม ผ่อน 1,000 → เงินประกัน 150 · MOU 2,000 → เงินประกัน 200 (ได้ ${JSON.stringify([l0,m0])})`);
    io.confirmAns = NOASK; io.confirms.length = 0;
    await E(`setLoanOverride(1,'2026-09','1500')`);
    ok(!T.loan_entries.length && !T.deposit_entries.length && io.confirms.some(m=>/แก้ยอดผ่อนเงินยืม งวด ก\.ย\./.test(m) && /ต\.ค\. 69 150/.test(m)),
       'แก้ผ่อนงวด ก.ย. (จ่ายแล้ว ก่อน ต.ค.) → ถาม 🔒 ต.ค. 150 ก่อน (ยอดผ่อน ต.ค. เปลี่ยนตาม) · ตอบไม่ = ไม่บันทึก');
    io.confirmAns = null;
    await E(`setLoanOverride(1,'2026-09','1500')`);
    const l1 = payOf(E, 'l', '2026-10');
    ok(T.loan_entries.length===1 && T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10').amount===150 && l1.loan===500 && l1.dep===150,
       `ตอบตกลง → 🔒 ต.ค. 150 แล้วบันทึก → ผ่อน ต.ค. 1,000→500 แต่เงินประกัน ต.ค. ยัง 150 (เดิมกลายเป็น 300 · ได้ ${JSON.stringify(l1)})`);
    E(`go('mou')`); io.confirms.length = 0;
    await E(`setMouOverride(2,'2026-09','3000')`);
    const m1 = payOf(E, 'm', '2026-10');
    ok(io.confirms.some(m=>/แก้ยอดหัก MOU งวด ก\.ย\./.test(m)) && T.deposit_entries.find(r=>r.employee_id===2 && r.period==='2026-10').amount===200 && m1.mou===3000 && m1.dep===200,
       `MOU แก้งวด ก.ย. เป็น 3,000 → 🔒 ต.ค. 200 ก่อน → MOU ต.ค. 2,000→3,000 แต่เงินประกัน ต.ค. ยัง 200 (เดิมกลายเป็น 0 · ได้ ${JSON.stringify(m1)})`);
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35d กะ · ตั้งค่า (สแกนจริง + recomputeAll) · บัญชี _br แก้วันหยุด/กะของงวดที่จ่ายแล้ว = ไม่บันทึก]');
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'กะ',bank_account:'1000000001'}), r=V({id:2,code:'R1',nick:'รัชดา',branch:'JJRD',bank_account:'1000000002'});
      employees=[a,r]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('R1','2026-07-26','2026-11-05')];
      advances=[{id:1,empId:1,period:'2026-10',amount:11700,date:'2026-10-15',note:''},{id:2,empId:2,period:'2026-10',amount:11700,date:'2026-10-15',note:''}];
      settings.lateFine=0; recomputeAll(); go('settings');`);
    T.deposit_entries = []; T.shifts = [{ id:1, name:'กะ', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1 }]; T.payroll_settings = [{ id:1, late_fine:0 }]; T.holidays = [];
    const a0 = payOf(E, 'a', '2026-10');
    ok(a0.dep===300 && a0.cap==='' && a0.net===0, `ตั้งต้น ต.ค. (สแกน 08:58–18:02 · เบิก 11,700): เงินประกัน 300 เต็ม (ได้ ${JSON.stringify(a0)})`);
    E(`document.getElementById('setLateFine').value='50'`); io.confirmAns = NOASK; io.confirms.length = 0;
    await E(`saveSetting('late_fine', 50)`);
    ok(E(`settings.lateFine`)===0 && T.payroll_settings[0].late_fine===0 && E(`document.getElementById('setLateFine').value`)==='0' && !T.deposit_entries.length && io.confirms.some(m=>/แก้ตั้งค่า "ปรับมาสาย"/.test(m) && /เงินประกัน 2 คน/.test(m)),
       'ตั้งค่าปรับมาสาย 0 → 50 → ถาม 🔒 ทุกคนก่อน · ตอบไม่ = ไม่บันทึก + ช่องกลับเป็นค่าเดิม');
    io.confirmAns = null;
    await E(`saveSetting('late_fine', 50)`);
    ok(E(`settings.lateFine`)===50 && T.payroll_settings[0].late_fine===50 && T.deposit_entries.filter(r=>r.period==='2026-10' && r.amount===300 && r.note==='lock').length===2, 'ตอบตกลง → 🔒 ต.ค. 300 ทั้ง 2 คน แล้วบันทึกค่าปรับ');
    io.confirms.length = 0; await E(`saveSetting('adv_max', 4000)`);
    ok(E(`settings.advMax`)===4000 && !io.confirms.length, 'ค่าที่ไม่กระทบยอด (เพดานเบิก) → บันทึกเลย ไม่ถาม');
    T.deposit_entries = []; await E(`depRefresh()`);
    E(`go('shift'); renderShifts();`); io.confirmAns = NOASK; io.confirms.length = 0;
    await E(`updShift(0,'start','08:30')`);
    ok(E(`shiftDefs[0].start`)==='09:00' && T.shifts[0].start_time==='09:00' && !T.deposit_entries.length && io.confirms.some(m=>/แก้กะ "กะ"/.test(m)), 'แก้เวลาเริ่มกะ 09:00 → 08:30 → ถาม 🔒 ก่อน · ตอบไม่ = ไม่บันทึก');
    io.confirmAns = null;
    await E(`updShift(0,'start','08:30')`);
    const a2 = payOf(E, 'a', '2026-10');
    ok(E(`shiftDefs[0].start`)==='08:30' && T.deposit_entries.filter(r=>r.period==='2026-10' && r.amount===300).length===2 && a2.dep===300 && a2.net < 0,
       `ตอบตกลง → 🔒 ต.ค. 300 ทั้ง 2 คน แล้วแก้กะ → สายทุกวัน สุทธิ ต.ค. ติดลบ แต่เงินประกัน ต.ค. ยัง 300 (เดิมกลายเป็น 0 'neg' · ได้ ${JSON.stringify(a2)})`);
    io.confirms.length = 0; await E(`updShift(0,'name','กะเช้า')`);
    ok(E(`shiftDefs[0].name`)==='กะเช้า' && !io.confirms.length, 'แก้ชื่อกะ → บันทึกเลย ไม่ถาม');
    // บัญชี _br ลาดพร้าว (สิทธิ์ครบ) — วันหยุด/กะมีผลทุกสาขา แต่เครื่องนี้มองไม่เห็นรัชดา → งวดที่จ่ายแล้วที่คนสาขาอื่นยังไม่ปิดยอด = ไม่บันทึก
    T.deposit_entries = []; await E(`depRefresh()`);
    T.employees = JSON.parse(E(`JSON.stringify(employees.map(e=>Object.assign(toDbEmp(e),{id:e.id,deposit_target_v1:e.depTargetV1,deposit_monthly_v1:e.depMonthlyV1})))`));
    E(`empCols = new Set(${JSON.stringify(Object.keys(T.employees[0]))})`);   // loadAll จำช่องของ employees ไว้ (depEmpFetch อ่านรหัส/สาขา/ค่าจ้างของทุกสาขา)
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{_br:'JJLP',holi:'vaed',shift:'vaed',settings:'vaed',dep:'vaed',pvd:'vaed'}}}; applyUser(AUTH); scopeEmployees();
       go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-10-13'; document.getElementById('hName').value='ทดสอบ'; document.getElementById('hMult').value='2';`);
    ok(E(`employees.length`)===1, 'เครื่อง ผจก. ลาดพร้าว เห็นเฉพาะคนลาดพร้าว (scopeEmployees)');
    io.confirms.length = 0; A.db.log.length = 0;
    await E(`saveHoli()`);
    ok(!T.holidays.length && !T.deposit_entries.length && /เห็นเฉพาะบางสาขา/.test(A.d.getElementById('toast').textContent) && !io.confirms.length,
       `บัญชี _br เพิ่มวันหยุด 13 ต.ค. (งวดที่จ่ายแล้ว) → ไม่บันทึก ไม่ล็อกครึ่งทาง + บอกให้เจ้าของ/แอดมินทำ (toast: ${A.d.getElementById('toast').textContent.slice(0,90)})`);
    E(`document.getElementById('hDay').value='2026-12-10';`); await E(`saveHoli()`);
    ok(T.holidays.length===1, 'บัญชี _br วันหยุด 10 ธ.ค. (งวดยังไม่จ่าย) → บันทึกได้ตามเดิม');
    E(`go('shift')`); await E(`updShift(0,'inGrace',10)`);
    ok(E(`shiftDefs[0].inGrace`)===5 && /เห็นเฉพาะบางสาขา/.test(A.d.getElementById('toast').textContent) && /พนักงานสาขาอื่น 1 คนยังไม่ปิดยอด/.test(A.d.getElementById('toast').textContent) &&
       /กด 🔒 ปิดยอดงวดนั้น/.test(A.d.getElementById('toast').textContent) && /ยังไม่ 🔒 ระบบไม่ปิดยอดให้เอง/.test(A.d.getElementById('toast').textContent), 'รอบ 10: บัญชี _br แก้อนุโลมกะ (ต.ค. จ่ายแล้ว · รัชดายังไม่ 🔒 ทั้ง ส.ค./ก.ย./ต.ค.) → ไม่บันทึก + บอกให้กด 🔒 (ระบบไม่ปิดยอดให้คนที่งวดก่อน ต.ค. ยังไม่ 🔒) · เดิม: บอกว่าเปิดแอปแล้วระบบปิดยอดให้เอง');
    T.deposit_entries = [{ id:911, employee_id:2, period:'2026-08', amount:500, note:'lock' }, { id:912, employee_id:2, period:'2026-09', amount:500, note:'lock' }];
    E(`go('shift')`); await E(`updShift(0,'inGrace',10)`);
    ok(E(`shiftDefs[0].inGrace`)===5 && /พนักงานสาขาอื่น 1 คนยังไม่ปิดยอด/.test(A.d.getElementById('toast').textContent) && /ระบบจะปิดยอดให้เอง/.test(A.d.getElementById('toast').textContent),
       'รัชดา 🔒 ส.ค./ก.ย. แล้ว (ต.ค. ยังไม่) → ไม่บันทึก + บอกว่าเปิดแอปแล้วระบบปิดยอดให้เอง');
    // รอบ 7: ทุกสาขาปิดยอด ต.ค. ครบแล้ว (🔒 อัตโนมัติวันจ่ายจากเครื่องเจ้าของ) → บัญชี _br แก้กะ/เพิ่มกะ/ตั้งค่า/วันหยุดงวดที่จ่ายแล้วได้ (เดิมบล็อกตลอดไป)
    T.deposit_entries = [{ id:901, employee_id:1, period:'2026-10', amount:300, note:'lock' }, { id:902, employee_id:2, period:'2026-10', amount:300, note:'lock' }];
    io.confirms.length = 0; await E(`updShift(0,'inGrace',10)`);
    ok(E(`shiftDefs[0].inGrace`)===10 && !io.confirms.length && T.deposit_entries.length===2, 'ทุกสาขา 🔒 ต.ค. ครบ → บัญชี _br แก้อนุโลมกะได้ ไม่ถาม ไม่เขียนแถว 🔒 เพิ่ม');
    const nSh = T.shifts.length; await E(`addShift()`);
    ok(T.shifts.length===nSh+1, 'บัญชี _br เพิ่มกะได้');
    E(`go('settings'); document.getElementById('setLateFine').value='60'`); await E(`saveSetting('late_fine', 60)`);
    ok(E(`settings.lateFine`)===60 && T.payroll_settings[0].late_fine===60, 'บัญชี _br แก้ตั้งค่าที่เป็นเงิน (ปรับมาสาย) ได้');
    E(`go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-10-13'; document.getElementById('hName').value='ทดสอบ'; document.getElementById('hMult').value='2';`);
    await E(`saveHoli()`);
    ok(T.holidays.some(h=>h.day==='2026-10-13'), 'บัญชี _br เพิ่มวันหยุด 13 ต.ค. (งวดที่จ่ายแล้ว · ทุกคน 🔒 แล้ว) ได้');
    E(`go('shift')`); A.db.fail.employees = { message:'timeout' }; await E(`updShift(0,'inGrace',15)`);
    ok(E(`shiftDefs[0].inGrace`)===10 && /อ่านยอดล่าสุดของพนักงานสาขาอื่นไม่ได้/.test(A.d.getElementById('toast').textContent), 'อ่านรายชื่อสาขาอื่นไม่ได้ → ไม่บันทึก (fail closed)');
    delete A.db.fail.employees;
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35e แก้/ลบสแกนเมื่อมีทิปอัตโนมัติ → 🔒 ทุกคนในสาขา · นำเข้าไฟล์สแกนที่มีวันในงวดที่จ่ายแล้ว → 🔒 ก่อน]');
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); tipReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002',deposit_on:false}), c=V({id:3,code:'C1',nick:'ซี',bank_account:'1000000003',deposit_on:false});
      employees=[a,b,c]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-10-10','2026-10-10'), ...mkP('B1','2026-10-26','2026-11-05'), ...mkP('C1','2026-10-26','2026-11-05')];
      tips=[fromDbTip({id:1,period:'2026-10',branch:'JJLP',amount:2000,member_ids:''})];
      advances=[{id:501,empId:1,period:'2026-10',amount:12800,date:'2026-10-15',note:''}]; recomputeAll(); go('detail');`);
    T.deposit_entries = []; T.punches = [{ emp_code:'B1', punch_date:'2026-10-10', punch_time:'08:58' }, { emp_code:'B1', punch_date:'2026-10-10', punch_time:'18:02' }];
    const lk = id => T.deposit_entries.find(r=>r.employee_id===id && r.period==='2026-10');
    const a0 = payOf(E, 'a', '2026-10');
    ok(a0.tip===1000 && a0.dep===200, `ตั้งต้น: ทิป ต.ค. 2,000 หาร 2 (บีมีสแกน 10 ต.ค. วันเดียว) → เอ 1,000 · เงินประกัน ต.ค. เอ 200 (ได้ ${JSON.stringify(a0)})`);
    E(`document.getElementById('pEmpId').value='2'; document.getElementById('pDay').value='2026-10-10';`); io.confirms.length = 0;
    await E(`delPunchDay()`);
    const a1 = payOf(E, 'a', '2026-10');
    ok(lk(1) && lk(1).amount===200 && a1.tip===2000 && a1.dep===200 && io.confirms.some(m=>/ลบเวลาสแกน บี/.test(m) && /กระทบ 3 คน/.test(m)),
       `ลบสแกน 10 ต.ค. ของบี (ทิปอัตโนมัติ) → 🔒 ต.ค. ของเอด้วย (200) ก่อน → ทิปเอ 1,000→2,000 แต่เงินประกัน ต.ค. ยัง 200 (ได้ ${JSON.stringify(a1)})`);
    T.deposit_entries = []; await E(`depRefresh()`);
    io.confirms.length = 0; E(`openPunchEdit(3,'2026-10-20'); document.getElementById('pIn').value='08:58'; document.getElementById('pOut').value='18:02';`);
    await E(`savePunchEdit()`);
    const a2 = payOf(E, 'a', '2026-10');
    ok(lk(1) && lk(1).amount===300 && a2.tip===1000 && a2.dep===300 && io.confirms.some(m=>/แก้เวลาสแกน ซี/.test(m)),
       `เพิ่มสแกน 20 ต.ค. ให้ซี (ไม่มีเงินประกันเอง) → ยังถาม + 🔒 ต.ค. ของเอด้วยยอดก่อนแก้ 300 (ตอนนั้นทิป 2,000) → ทิปเอ 2,000→1,000 แต่เงินประกัน ต.ค. ยัง 300 (ได้ ${JSON.stringify(a2)})`);
    // นำเข้าไฟล์สแกน 1–3 พ.ย. (งวด พ.ย. ยังไม่จ่าย) → ไม่ถาม · ไฟล์ที่มีวัน 12–14 ต.ค. (จ่ายแล้ว) → ถาม 🔒 · ตอบไม่ = ไม่เขียนอะไร
    const rowsOf = (days, ti, to) => [['First Name','Last Name','ID','Department','Date','Time'], ...days.flatMap(ds => [['ซี','--','C1','หน้าร้าน',ds,ti||'08:58'], ['ซี','--','C1','หน้าร้าน',ds,to||'18:02']])];
    A.w.XLSX.read = () => ({ SheetNames:['s'], Sheets:{ s:{} } });
    A.w.__T = T;
    E(`loadAll = async function(){ punches = (window.__T.punches||[]).filter(r=>!punches.some(p=>p.code===r.emp_code&&p.date===r.punch_date&&p.time===String(r.punch_time).slice(0,5))).map(r=>({code:r.emp_code,date:r.punch_date,time:String(r.punch_time).slice(0,5),sn:''})).concat(punches); recomputeAll(); }`);
    T.deposit_entries = []; await E(`depRefresh()`);
    A.w.XLSX.utils.sheet_to_json = () => rowsOf(['2026-10-27','2026-10-28'], '08:57', '18:03');
    io.confirms.length = 0; const nP = T.punches.length;
    await E(`handleFile({ arrayBuffer: async () => new ArrayBuffer(8) })`); await wait(20);
    ok(T.punches.length===nP+4 && !io.confirms.some(m=>/ปิดยอด/.test(m)), 'นำเข้าไฟล์สแกน 27–28 ต.ค. (งวด พ.ย. ยังไม่จ่าย) → บันทึกเลย ไม่ถาม');
    A.w.XLSX.utils.sheet_to_json = () => rowsOf(['2026-10-12','2026-10-13','2026-10-14']);
    io.confirmAns = NOASK; io.confirms.length = 0; const nP2 = T.punches.length;
    await E(`handleFile({ arrayBuffer: async () => new ArrayBuffer(8) })`); await wait(20);
    ok(T.punches.length===nP2 && !T.deposit_entries.length && io.confirms.some(m=>/นำเข้าไฟล์สแกน \(6 รายการใหม่\) — กระทบ 3 คน/.test(m)),
       'นำเข้าไฟล์ที่มีวัน 12–14 ต.ค. (งวดที่จ่ายแล้ว · ทิปอัตโนมัติ) → ถาม 🔒 ซี + ทุกคนในสาขา · ตอบไม่ = ไม่เขียนสแกน ไม่ล็อก');
    io.confirmAns = null;
    await E(`handleFile({ arrayBuffer: async () => new ArrayBuffer(8) })`); await wait(20);
    const a3 = payOf(E, 'a', '2026-10');
    ok(T.punches.length===nP2+6 && lk(1) && lk(1).amount===200 && a3.dep===200, `ตอบตกลง → 🔒 ต.ค. เอ 200 ก่อน แล้วเขียนสแกน 6 แถว → เงินประกัน ต.ค. เอ ยัง 200 (ได้ ${JSON.stringify(a3)})`);
    io.confirms.length = 0;
    await E(`handleFile({ arrayBuffer: async () => new ArrayBuffer(8) })`); await wait(20);
    ok(!io.confirms.some(m=>/ปิดยอด/.test(m)), 'นำเข้าไฟล์เดิมซ้ำ (ไม่มีแถวใหม่) → ไม่ถาม');
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35f ✎ เงินประกันงวดที่จ่ายแล้ว → 🔒 สำรองฯ ก่อน · ✎ 🔒 → 🔒 งวดหลัง · อีกเครื่องแทรก ✎ ระหว่างล็อก = ไม่บันทึก]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5}
      var s=V({id:11,code:'S1',nick:'ออม',bank_account:'1100000001',deposit_opening:3000});
      var t=V({id:12,code:'S2',nick:'แทรก',bank_account:'1100000002'});
      employees=[s,t]; shifts={S1:mk('2026-07-26','2027-01-25'),S2:mk('2026-07-26','2027-01-25')};
      advances=[{id:501,empId:11,period:'2026-10',amount:11400,date:'2026-10-15',note:''},{id:502,empId:12,period:'2026-10',amount:11900,date:'2026-10-15',note:''}];
      pvdMembers=[fromDbPvdM(${JSON.stringify(PVM(11))})]; pvdEntries=[]; pvdPayouts=[]; go('dep');`);
    T.deposit_entries = []; T.pvd_entries = []; T.pvd_payouts = []; T.pvd_members = [PVM(11)];
    T.advances = [{ id:501, employee_id:11, period:'2026-10', amount:11400, taken_date:'2026-10-15', note:'' }, { id:502, employee_id:12, period:'2026-10', amount:11900, taken_date:'2026-10-15', note:'' }];
    const s0 = payOf(E, 's', '2026-10');
    ok(s0.dep===0 && s0.pvd===500, `ตั้งต้น ต.ค.: สะสมครบเป้าแล้ว (หัก 0) · สำรองฯ หัก 500 (ได้ ${JSON.stringify(s0)})`);
    io.confirms.length = 0;
    await E(`setDepOverride(11,'2026-10','300')`);
    const s1 = payOf(E, 's', '2026-10'), pr = T.pvd_entries.find(r=>r.employee_id===11 && r.period==='2026-10');
    ok(pr && pr.note==='lock' && pr.emp_amount===500 && s1.pvd===500 && s1.dep===300 && io.confirms.some(m=>/✎ เงินประกัน งวด ต\.ค\./.test(m) && /🐷 สำรองฯ: ต\.ค\. 69 500/.test(m)),
       `✎ เงินประกัน ต.ค. (จ่ายแล้ว) 0 → 300 → 🔒 สำรองฯ ต.ค. 500 ก่อน → สำรองฯ ที่หักไปแล้วยัง 500 (เดิมกลายเป็น 0/300 · ได้ ${JSON.stringify(s1)})`);
    // อีกเครื่องใส่ ✎ ต.ค. ระหว่างผู้ใช้กดยืนยัน 🔒 → insert ถูกข้าม → ไม่ลบเบิก
    io.confirmAns = m => { if(/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m) && !T.deposit_entries.some(r=>r.employee_id===12)) T.deposit_entries.push({ id:7001, employee_id:12, period:'2026-10', amount:300, note:'' }); return true; };
    E(`go('adv')`);
    await E(`delAdv(502)`);
    ok(T.advances.some(a=>a.id===502) && /เครื่องอื่นระหว่างปิดยอด/.test(A.d.getElementById('toast').textContent),
       `อีกเครื่องแทรกแถว ✎ ต.ค. ระหว่างถาม 🔒 → ไม่ลบเบิก + บอกให้ลองใหม่ (เดิมลบเบิกต่อ · toast: ${A.d.getElementById('toast').textContent.slice(0,80)})`);
    io.confirmAns = null;
    await E(`delAdv(502)`);
    const r12 = T.deposit_entries.find(r=>r.employee_id===12 && r.period==='2026-10');
    ok(!T.advances.some(a=>a.id===502) && r12 && r12.note==='lock:short:300:100' && r12.amount===100,
       `กดใหม่ → 🔒 แถว ✎ นั้นด้วยยอดที่หักได้จริง 100 (✎ 300 · สุทธิไม่พอ) แล้วลบเบิก (ได้ ${JSON.stringify(r12)})`);
  }
  { const A = boot({ now:'2026-12-08T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35g ✎ แก้ยอด 🔒 ต.ค. หลังจ่าย พ.ย. → 🔒 พ.ย. ก่อน (หักต่อจากยอดสะสม) · K BIZ ล็อกแถว ✎ ของงวดที่จ่ายแล้วด้วย]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5}
      var s=V({id:1,code:'S1',nick:'ใกล้ครบ',bank_account:'1000000001',deposit_opening:1600});
      var k=V({id:2,code:'K1',nick:'แก้มือ',bank_account:'1000000002'});
      employees=[s,k]; shifts={S1:mk('2026-07-26','2027-01-25'),K1:mk('2026-07-26','2027-01-25')}; pvdMembers=[fromDbPvdM(${JSON.stringify(PVM(2))})]; pvdEntries=[]; pvdPayouts=[];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10';`);
    T.deposit_entries = [{ id:1, employee_id:1, period:'2026-08', amount:500, note:'lock' }, { id:2, employee_id:1, period:'2026-09', amount:500, note:'lock' }, { id:3, employee_id:1, period:'2026-10', amount:300, note:'lock' },
                         { id:4, employee_id:2, period:'2026-08', amount:500, note:'lock' }, { id:5, employee_id:2, period:'2026-09', amount:500, note:'lock' }, { id:6, employee_id:2, period:'2026-10', amount:300, note:'lock' }];
    T.pvd_members = [PVM(2)]; T.pvd_entries = [{ id:1, employee_id:2, period:'2026-10', emp_amount:500, er_amount:0, note:'lock' }]; T.pvd_payouts = [];
    await E(`depRefresh()`); await E(`pvdRefresh()`);
    ok(E(`depositCalc(s,'2026-11').ded`)===100, 'ตั้งต้น: สะสม 2,900 หลัง 🔒 ต.ค. 300 → พ.ย. (จ่ายแล้ว 5 ธ.ค. · ยังไม่ 🔒) หัก 100 ครบ 3,000');
    io.promptAns = ['100']; io.confirms.length = 0;
    await E(`editDeposit(1,'2026-10')`);
    const n1 = T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-11'), o1 = T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
    ok(n1 && n1.amount===100 && n1.note==='lock' && o1.amount===100 && E(`depositCalc(s,'2026-11').ded`)===100,
       `✎ แก้ 🔒 ต.ค. 300 → 100 → 🔒 พ.ย. 100 ก่อน (ไม่งั้น พ.ย. ที่จ่ายแล้วกลายเป็น 300) · ต.ค. = 100 (ได้ พ.ย. ${JSON.stringify(n1)})`);
    // K BIZ ธ.ค.: งวด พ.ย. (จ่ายแล้ว) ของ "แก้มือ" มีแถว ✎ เงินประกัน 250 + ✎ สำรองฯ 200 → ล็อกด้วย (เดิมข้ามแถว ✎)
    T.deposit_entries.push({ id:9, employee_id:2, period:'2026-11', amount:250, note:'' });
    T.pvd_entries.push({ id:9, employee_id:2, period:'2026-11', emp_amount:200, er_amount:null, note:'' });
    await E(`depRefresh()`); await E(`pvdRefresh()`);
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-12';`);
    io.confirms.length = 0; io.files.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    const kd = T.deposit_entries.find(r=>r.employee_id===2 && r.period==='2026-11'), kp = T.pvd_entries.find(r=>r.employee_id===2 && r.period==='2026-11');
    ok(io.files.length===1 && kd.note==='lock' && kd.amount===250 && kp.note==='lock' && kp.emp_amount===200,
       `K BIZ ธ.ค. → 🔒 แถว ✎ พ.ย. ด้วยยอดเดิม (เงินประกัน 250 · สำรองฯ 200) ไม่ข้าม (ได้ ${JSON.stringify([kd, kp])})`);
  }
  { const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35h K BIZ/ใบสรุปบัญชีร่วม < 1 บาท เฉพาะงวด ≥ ต.ค. · งวดเก่าเหมือนเดิม · ชื่อในหน้าต่างผล escape]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var p1=V({id:1,code:'P1',nick:'พี่',bank_account:'1111111111'}), p2=V({id:2,code:'P2',nick:'<img src=x id=pwn9>',bank_account:'1111111111'});
      employees=[p1,p2]; shifts={P1:mk('2026-07-26','2026-12-25'),P2:mk('2026-07-26','2026-12-25')};
      advances=[{id:2,empId:2,period:'2026-10',amount:11999.5,date:'2026-10-15',note:''},{id:3,empId:2,period:'2026-09',amount:11499.5,date:'2026-09-15',note:''}];
      go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    T.deposit_entries = [];
    ok(E(`calcPay(p2,'2026-10').net`)===0.5 && E(`calcPay(p2,'2026-09').net`)===0.5, 'ตั้งต้น: น้องสุทธิ 0.50 ทั้ง ก.ย. และ ต.ค. (บัญชีเดียวกับพี่)');
    await E(`openTransferSummary()`); await wait(20);
    ok(/ไม่มีบัญชีที่รับเงินเกิน 1 คน/.test(A.d.getElementById('toast').textContent), 'ใบสรุปบัญชีร่วม ต.ค.: น้อง 0.50 ไม่อยู่ในไฟล์ K BIZ → ไม่นับ (บัญชีเหลือคนเดียว = ไม่ใช่บัญชีร่วม)');
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && io.files[0].aoa.slice(3).length===1 && io.files[0].aoa[3][3]===11700 && !A.d.querySelector('#kbizResBody #pwn9') && /&lt;img|<img src=x id=pwn9>/.test(A.d.getElementById('kbizResBody').textContent),
       'K BIZ ต.ค.: แถวเดียว 11,700 (0.50 จ่ายเงินสด) · ชื่อ "<img …>" ในรายชื่อ 🪙 ไม่กลายเป็น element (escape)');
    E(`document.getElementById('periodSel').value='2026-09';`);
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && io.files[0].aoa.slice(3).length===1 && io.files[0].aoa[3][3]===11500.5, `K BIZ ก.ย. (ก่อนกติกาใหม่): เหมือนเดิม — 0.50 อยู่ในไฟล์ รวมบัญชีร่วม 11,500.50 (ได้ ${JSON.stringify(io.files[0] && io.files[0].aoa[3])})`);
    E(`p1.active=false; shifts.P1=[]; document.getElementById('periodSel').value='2026-10';`);
    io.alerts.length = 0; io.files.length = 0; await E(`exportKbizPay('')`); await wait(20);
    ok(!io.files.length && /ต่ำกว่า 1 บาท — จ่ายเงินสด/.test(io.alerts.join()), 'K BIZ ต.ค. มีแต่ยอด 0.50 → ไม่สร้างไฟล์ + บอกว่า "ต่ำกว่า 1 บาท — จ่ายเงินสด"');
  }
  { const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[35i ✎ แก้ 💸/🏦 งวดก่อน เมื่อคืนในงวดหลังแล้ว · ปุ่ม 💸 ไม่หายตามตัวกรอง · 🏦 ในงวดที่มีวันทำงาน = เตือน · 💸 ของคนที่พ้นสภาพทีหลัง + บันทึกไฟล์ K BIZ]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var g=V({id:7,code:'GN',nick:'ลาออก',active:false,deposit_opening:4000,bank_account:'7777777777'});
      var w=V({id:1,code:'W1',nick:'ทำงาน',deposit_opening:5000,bank_account:'1111111111'});
      employees=[g,w]; shifts={GN:mk('2026-07-26','2026-09-10'),W1:mk('2026-07-26','2026-12-25')}; depositEntries=[];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option><option>2026-11</option>'; document.getElementById('depActive').value='';
      document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    T.deposit_entries = []; T.payroll_audit = [];
    const dbr = (id,p) => T.deposit_entries.find(r=>r.employee_id===id && r.period===p);
    E(`document.getElementById('depActive').value='1'; renderDeposit();`);
    ok(E(`document.getElementById('depRefBtn').hidden`)===false, 'ตัวกรอง "ทำงานอยู่" → ปุ่ม 💸 ยังอยู่ (มีคนพ้นสภาพรอ 🏦)');
    E(`document.getElementById('depActive').value=''; renderDeposit();`);
    await E(`depRefundOpen()`);
    E(`depRefState.items.forEach(x=>{ x.on = true; x.amount = 1000; if(x.xf) x.date='2026-10-27'; })`);
    await E(`depRefundSave()`);
    E(`document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    await E(`depRefundOpen()`);
    E(`depRefState.items.forEach(x=>{ x.on = true; if(x.xf) x.date='2026-10-28'; })`);
    await E(`depRefundSave()`);
    ok(dbr(7,'2026-10').amount===-1000 && dbr(7,'2026-11').amount===-1000 && dbr(1,'2026-10').amount===-1000 && dbr(1,'2026-11').amount===-1000, 'ตั้งต้น: 🏦/💸 ต.ค. 1,000 + พ.ย. 1,000 (ส่วนเกิน 2,000 คืนครบ)');
    E(`document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    io.prompts.length = 0; io.promptAns = ['2000']; await E(`editDeposit(7,'2026-10')`);
    io.promptAns = ['2000']; await E(`editDeposit(1,'2026-10')`); io.promptAns = [];
    ok(dbr(7,'2026-10').amount===-1000 && dbr(1,'2026-10').amount===-1000 && /คืน\/โอนแล้วในงวดหลัง 1,000/.test(io.prompts[0]) && /คืนได้ไม่เกิน 1,000/.test(io.prompts[0]),
       `✎ แก้ยอด 🏦/💸 ต.ค. ขึ้นเป็น 2,000 ทั้งที่ พ.ย. คืนไปแล้ว 1,000 → ปฏิเสธ (คืนได้ไม่เกิน 1,000 · เดิมรับ = คืนรวม 3,000) (prompt: ${(io.prompts[0]||'').split('\n')[1]})`);
    io.promptAns = ['800', '2026-10-27']; await E(`editDeposit(7,'2026-10')`);
    ok(dbr(7,'2026-10').amount===-800 && dbr(7,'2026-10').note==='xfer:2026-10-27', '✎ ลดยอด 🏦 ต.ค. เป็น 800 → ทำได้');
    // 🏦 ในงวดที่ภายหลังมีวันทำงาน → เตือน (เครื่องรุ่นเก่าคืนซ้ำในสลิป)
    E(`shifts.GN = shifts.GN.concat(mk('2026-10-15','2026-10-20')); renderDeposit();`);
    ok(/🏦 โอนคืนนอกสลิปของคนที่อยู่ในรายชื่อเงินเดือนงวดนั้น/.test(A.d.getElementById('depWarn').textContent) && /ลาออก ต\.ค\. 69 800/.test(A.d.getElementById('depWarn').textContent) && !/✎ ยกเลิกแล้วบันทึก/.test(A.d.getElementById('depWarn').textContent),
       'สแกนส่งย้อนหลังใน ต.ค. ของคนที่บันทึก 🏦 ต.ค. แล้ว → แถบหน้า 🛡️ เตือน "🏦 … อยู่ในรายชื่อเงินเดือนงวดนั้น" (ไม่แนะนำให้ยกเลิก)');
    // 💸 คืนในสลิปแล้วสร้าง K BIZ ตอนยังทำงาน → จดในประวัติ [ref:id] → ตั้งพ้นสภาพทีหลัง = ถาม/เตือนว่าอยู่ในไฟล์แล้ว (ห้ามโอนซ้ำ)
    E(`var r=V({id:3,code:'R1',nick:'ลาทีหลัง',deposit_opening:5000,bank_account:'3333333333'}); employees.push(r); shifts.R1=mk('2026-07-26','2026-09-25');`);
    T.deposit_entries.push({ id:9100, employee_id:3, period:'2026-10', amount:-2000, note:'refund' }); T.employees = [{ id:3, code:'R1', nick:'ลาทีหลัง', active:true }];
    await E(`depRefresh()`);
    E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    io.files.length = 0; await E(`exportKbizPay('')`); await wait(30);
    const au = (T.payroll_audit||[]).find(x=>x.action==='kbiz') || {};
    const refIds = (((au.detail||'').match(/\[ref:([\d,]+)\]/)||[])[1]||'').split(',');
    ok(io.files.length===1 && io.files[0].aoa.some(x=>x[1]==='3333333333' && x[3]===2000) && /\[p:2026-10\]/.test(au.detail||'') && refIds.includes('3') && /ลาทีหลัง 2,000/.test(au.detail||''),
       `สร้าง K BIZ ต.ค. (ลาทีหลัง ยังทำงาน · 💸 2,000 ในไฟล์) → จดหน้า 📜 ประวัติ "สร้างไฟล์โอนเงินเดือน … 💸 คืนเงินประกันในไฟล์: ลาทีหลัง 2,000" (${(au.detail||'').slice(0,60)}…)`);
    E(`go('emp'); openEmpForm(3); document.getElementById('fActive').value='0';`); io.confirms.length = 0;
    await E(`saveEmpForm()`); await wait(20);
    ok(!E(`r.active`) && io.confirms.some(m=>/มี 💸 คืนเงินประกันในสลิป ต\.ค\. 69 2,000 บาท/.test(m) && /ไฟล์ K BIZ ต\.ค\. 69 ที่สร้างแล้วมียอดคืนนี้/.test(m)),
       'ตั้งพ้นสภาพคนที่มี 💸 ต.ค. (ไม่มีวันทำงาน) → ถามก่อนบันทึก + บอกว่าไฟล์ K BIZ ที่สร้างแล้วมียอดคืนนี้');
    E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const wt = A.d.getElementById('depWarn').textContent;
    ok(/ลาทีหลัง ต\.ค\. 69 2,000/.test(wt) && /มีชื่อ = จ่ายแล้ว ห้ามโอนซ้ำ/.test(wt) && !/เงินจะไม่ถูกจ่าย/.test(wt), 'แถบหน้า 🛡️: เตือนแบบไม่ฟันธง + ให้เช็คไฟล์ K BIZ ก่อน (มีชื่อ = จ่ายแล้ว ห้ามโอนซ้ำ)');
    await E(`depRefundOpen()`);
    ok(/ลาทีหลัง ต\.ค\. 69 2,000 \(ยอดคืนนี้อยู่ในไฟล์ K BIZ ที่สร้างแล้ว/.test(A.d.getElementById('depRefBody').textContent), 'หน้าต่าง 💸 ต.ค.: บอกว่ายอดคืนนี้อยู่ในไฟล์ K BIZ ที่สร้างแล้ว (อ่านจากประวัติ)');
    E(`closeModal('depRefBg')`); io.confirms.length = 0; io.confirmAns = () => false; io.promptAns = ['0'];
    await E(`editDeposit(3,'2026-10')`);
    io.confirmAns = null;
    ok(dbr(3,'2026-10') && dbr(3,'2026-10').amount===-2000 && io.confirms.some(m=>/ห้ามยกเลิกแล้วโอน 🏦 ซ้ำ/.test(m)), '✎ ยกเลิก 💸 ของคนนี้ → คำยืนยันเตือน "ถ้าสร้างไฟล์ K BIZ ไปแล้ว … ห้ามยกเลิกแล้วโอน 🏦 ซ้ำ" (ตอบไม่ = ยังอยู่)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { const A = boot({ now:'2026-10-28T12:00:00+07:00' }); await wait(300);
    const B = boot({ now:'2026-10-28T12:00:00+07:00', db:A.db }); await wait(300);
    console.log('[35j สองเครื่องกด 💸 คนเดียวกันคนละงวด (ต.ค./พ.ย.) พร้อมกัน → ไม่คืนซ้ำ]');
    const setup = `AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var w=V({id:1,code:'W1',nick:'ทำงาน',deposit_opening:5000,bank_account:'1111111111'});
      employees=[w]; shifts={W1:mk('2026-07-26','2026-12-25')}; depositEntries=[];
      go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option><option>2026-11</option>'; document.getElementById('depActive').value='';`;
    A.T.deposit_entries = [{ id:1, employee_id:1, period:'2026-08', amount:0, note:'lock' }, { id:2, employee_id:1, period:'2026-09', amount:0, note:'lock' }];
    for(const X of [A, B]){ X.E(SEED); X.E(setup); await X.E('depRefresh()'); }
    A.E(`document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    B.E(`document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    await A.E(`depRefundOpen()`); await B.E(`depRefundOpen()`);
    A.E(`depRefState.items.forEach(x=>x.on=true)`); B.E(`depRefState.items.forEach(x=>x.on=true)`);
    await Promise.all([A.E(`depRefundSave()`), B.E(`depRefundSave()`)]);
    const refs = A.T.deposit_entries.filter(r=>r.employee_id===1 && r.amount < 0);
    await A.E(`depRefresh()`);
    const tot = refs.reduce((a,r)=>a - r.amount, 0);
    ok(tot <= 2000 && A.E(`depositCalc(w,'2026-11').collected`) >= 3000 && /เครื่องอื่นพร้อมกัน/.test(A.io.alerts.concat(B.io.alerts).join()),
       `คืนรวม ${tot} บาท (ไม่เกินส่วนเกิน 2,000) · สะสมหลัง พ.ย. ${A.E(`depositCalc(w,'2026-11').collected`)} ≥ เป้า · เครื่องที่ชนบอก "มีการคืน/โอนจากเครื่องอื่นพร้อมกัน" (เดิมคืนทั้งสองงวด รวม 4,000)`);
  }
  // ============ 36) ผลตรวจรอบ 5 (บาทจริง) ============
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[36a ผลตรวจรอบ 5: ลบพนักงานที่เป็นตัวหารทิปงวดที่จ่ายแล้ว → 🔒 เพื่อนร่วมสาขาก่อน (ตอบไม่ = ไม่ลบ) · คนพ้นสภาพไม่ถาม]');
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); tipReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'});
      var c=V({id:3,code:'C1',nick:'ซี',bank_account:'1000000003',deposit_target:0,deposit_on:false}), d=V({id:4,code:'D1',nick:'ดี',active:false,deposit_target:0,deposit_on:false});
      employees=[a,b,c,d]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-07-26','2026-11-05'), ...mkP('C1','2026-09-26','2026-11-05'), ...mkP('D1','2026-09-26','2026-10-20')];
      tips=[fromDbTip({id:1,period:'2026-10',branch:'JJLP',amount:9000,member_ids:''})];
      advances=[{id:501,empId:1,period:'2026-10',amount:14880,date:'2026-10-15',note:''}]; recomputeAll(); go('emp');`);
    T.deposit_entries = [];
    const lk = id => T.deposit_entries.find(r=>r.employee_id===id && r.period==='2026-10');
    const a0 = payOf(E, 'a', '2026-10');
    ok(a0.tip===3000 && a0.dep===120 && a0.cap==='short', `ตั้งต้น: ทิป ต.ค. 9,000 ÷ 3 = 3,000 · เอเบิก 14,880 → สุทธิก่อนหักประกัน 120 → หักได้ 120 (short) (ได้ ${JSON.stringify(a0)})`);
    io.confirmAns = NOASK; io.confirms.length = 0;
    await E(`delEmp(3)`);
    ok(E(`employees.some(e=>e.id===3)`) && !T.deposit_entries.length && io.confirms.some(m=>/ลบพนักงาน "ซี" \(ส่วนแบ่งทิปของเพื่อนร่วมสาขาเปลี่ยน\)/.test(m)),
       'ลบ "ซี" (ทำงานอยู่ · มีวันทำงาน ต.ค. · ทิปอัตโนมัติ) → ถาม 🔒 เพื่อนร่วมสาขา · ตอบไม่ = ไม่ลบ ไม่ล็อก');
    io.confirmAns = null; io.confirms.length = 0;
    await E(`delEmp(3)`);
    const a1 = payOf(E, 'a', '2026-10');
    ok(!E(`employees.some(e=>e.id===3)`) && lk(1) && lk(1).amount===120 && lk(1).note==='lock:short:300:120' && lk(2) && lk(2).amount===300 && a1.tip===4500 && a1.dep===120,
       `ตอบตกลง → 🔒 ต.ค. เอ 120 (lock:short:300:120) · บี 300 ก่อน แล้วลบ → ทิปเอ 3,000→4,500 แต่เงินประกัน ต.ค. ยัง 120 (ได้ ${JSON.stringify(a1)} · แถว ${JSON.stringify(lk(1))})`);
    io.confirms.length = 0; const n0 = T.deposit_entries.length;
    await E(`delEmp(4)`);
    ok(!E(`employees.some(e=>e.id===4)`) && io.confirms.length===1 && T.deposit_entries.length===n0, 'ลบคนพ้นสภาพ (ไม่นับเป็นตัวหารทิป) → ถามลบอย่างเดียว ไม่ 🔒 ใคร');
  }
  { console.log('[36b แก้/ลบ/นำเข้าสแกนงวด ก.ย. (ก่อน ต.ค.) หลังจ่าย ต.ค. → 🔒 ต.ค. ก่อน (depPdFrom · ยอดสะสม _v1)]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001',deposit_opening:1900});
      employees=[a]; punches=[...mkP('A1','2026-07-26','2026-08-25'), ...mkP('A1','2026-09-10','2026-09-10'), ...mkP('A1','2026-09-26','2026-11-05')]; recomputeAll(); go('detail');`);
    T.deposit_entries = []; T.punches = [{ emp_code:'A1', punch_date:'2026-09-10', punch_time:'08:58' }, { emp_code:'A1', punch_date:'2026-09-10', punch_time:'18:02' }];
    const lk = () => T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
    const o0 = payOf(E, 'a', '2026-10');
    E(`document.getElementById('pEmpId').value='1'; document.getElementById('pDay').value='2026-09-10';`); io.confirms.length = 0;
    await E(`delPunchDay()`);
    const o1 = payOf(E, 'a', '2026-10');
    ok(o0.dep===100 && o1.dep===100 && lk() && lk().amount===100 && E(`empPeriodSet(a).has('2026-09')`)===false && io.confirms.some(m=>/ลบเวลาสแกน เอ/.test(m) && /ต\.ค\. 69 100/.test(m)),
       `ลบสแกน 10 ก.ย. (วันเดียวของ ก.ย.) → 🔒 ต.ค. 100 ก่อน → ต.ค. ยัง 100 (เดิมกลายเป็น 300 · ได้ ${o0.dep}→${o1.dep})`);
    T.deposit_entries = []; await E(`depRefresh()`);
    const o2 = payOf(E, 'a', '2026-10');
    E(`openPunchEdit(1,'2026-09-10'); document.getElementById('pIn').value='08:58'; document.getElementById('pOut').value='18:02';`); io.confirms.length = 0;
    await E(`savePunchEdit()`);
    const o3 = payOf(E, 'a', '2026-10');
    ok(o2.dep===300 && o3.dep===300 && lk() && lk().amount===300 && E(`empPeriodSet(a).has('2026-09')`)===true, `เพิ่มสแกน 10 ก.ย. → 🔒 ต.ค. 300 ก่อน → ต.ค. ยัง 300 (เดิมกลายเป็น 100 · ได้ ${o2.dep}→${o3.dep})`);
    // นำเข้าไฟล์ที่มี 10 ก.ย. (ลบออกจากเครื่องก่อน)
    E(`punches = punches.filter(p=>!(p.code==='A1' && p.date==='2026-09-10')); recomputeAll();`); T.punches = []; T.deposit_entries = []; await E(`depRefresh()`);
    A.w.XLSX.read = () => ({ SheetNames:['s'], Sheets:{ s:{} } });
    A.w.XLSX.utils.sheet_to_json = () => [['First Name','Last Name','ID','Department','Date','Time'], ['เอ','--','A1','หน้าร้าน','2026-09-10','08:58'], ['เอ','--','A1','หน้าร้าน','2026-09-10','18:02']];
    A.w.__T = T;
    E(`loadAll = async function(){ punches = punches.concat((window.__T.punches||[]).filter(r=>!punches.some(p=>p.code===r.emp_code&&p.date===r.punch_date&&p.time===String(r.punch_time).slice(0,5))).map(r=>({code:r.emp_code,date:r.punch_date,time:String(r.punch_time).slice(0,5),sn:''}))); recomputeAll(); }`);
    E(`go('settings')`); io.confirms.length = 0;
    const o4 = payOf(E, 'a', '2026-10');
    await E(`handleFile({ arrayBuffer: async () => new ArrayBuffer(8) })`); await wait(20);
    const o5 = payOf(E, 'a', '2026-10');
    ok(o4.dep===300 && o5.dep===300 && lk() && lk().amount===300 && T.punches.length===2 && io.confirms.some(m=>/นำเข้าไฟล์สแกน/.test(m)), `นำเข้าไฟล์ที่มี 10 ก.ย. → ถาม + 🔒 ต.ค. 300 ก่อน → ต.ค. ยัง 300 (ได้ ${o4.dep}→${o5.dep})`);
  }
  { console.log('[36c งวดที่จ่ายแล้วซึ่งไม่มีวันทำงาน (ไม่ได้หัก) แล้วเพิ่มสแกนทีหลัง → 🔒 0 / สำรองฯ 0/0 ก่อน · ไม่หักย้อนหลัง]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'});
      employees=[a]; punches=[...mkP('A1','2026-08-26','2026-09-25'), ...mkP('A1','2026-10-26','2026-11-05')]; recomputeAll();
      pvdMembers=[fromDbPvdM(${JSON.stringify(PVM(1))})]; pvdEntries=[]; pvdPayouts=[]; go('detail');`);
    T.deposit_entries = []; T.pvd_entries = []; T.pvd_payouts = []; T.pvd_members = [PVM(1)];
    const o0 = payOf(E, 'a', '2026-10');
    E(`openPunchEdit(1,'2026-10-10'); document.getElementById('pIn').value='08:58'; document.getElementById('pOut').value='18:02';`); io.confirms.length = 0;
    await E(`savePunchEdit()`);
    const o1 = payOf(E, 'a', '2026-10');
    const ld = T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10'), lp = T.pvd_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
    ok(o0.dep===0 && o0.pvd===0 && o1.dep===0 && o1.pvd===0 && o1.net > 0 && ld && ld.amount===0 && ld.note==='lock' && lp && lp.emp_amount===0 && lp.er_amount===0 && lp.note==='lock' &&
       io.confirms.some(m=>/ไม่มีวันทำงานตอนจ่าย — ไม่หักย้อนหลัง/.test(m)),
       `ต.ค. ไม่มีวันทำงาน (จ่าย 0) → เพิ่มสแกน 10 ต.ค. → 🔒 เงินประกัน 0 + สำรองฯ 0/0 ก่อน → ค่าแรงวันที่เพิ่มไม่ถูกหักเงินประกัน/สำรองฯ ย้อนหลัง (ได้ ${JSON.stringify(o0)} → ${JSON.stringify(o1)})`);
  }
  { console.log('[36d สองเครื่อง: เครื่องที่เปิดค้างไม่เห็นเพิ่ม/หักเงินจากอีกเครื่อง → 🔒 อ่านรายการเงินใหม่ก่อน · realtime ช่องแยก jjmk-adj]');
    const A = boot({ now:'2026-11-03T12:00:00+07:00' }); await wait(300);
    const B = boot({ now:'2026-11-04T12:00:00+07:00', db:A.db }); await wait(300);
    const setup = `AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-09-26','2026-11-05'); recomputeAll();`;
    for(const X of [A, B]){ X.E(SEED); X.E(PUN); X.E(setup); }
    A.T.deposit_entries = []; A.T.adjustments = [];
    const adj = (X, kind, amt) => X.E(`go('detail'); document.getElementById('adjEmpId').value='1'; document.getElementById('adjKind').value='${kind}'; document.getElementById('adjReason').value='ทดสอบ';
      document.getElementById('adjAmount').value='${amt}'; document.getElementById('adjPeriod').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('adjPeriod').value='2026-10';`);
    adj(B, 'deduct', 11800); await B.E(`saveAdj()`);
    const paid = payOf(B.E, 'a', '2026-10');
    A.setNow('2026-11-06T12:00:00+07:00');
    ok(A.E('adjustments.length')===0 && paid.dep===200 && paid.cap==='short', `ตั้งต้น: เครื่อง B หัก ต.ค. 11,800 (4 พ.ย. ก่อนจ่าย) → สลิป ต.ค. หักเงินประกันได้ 200 · เครื่อง A ยังไม่เห็น`);
    adj(A, 'add', 100); A.io.confirms.length = 0; await A.E(`saveAdj()`);
    const lk = A.T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
    ok(lk && lk.amount===200 && lk.note==='lock:short:300:200' && A.E('adjustments.length')===2 && A.io.confirms.some(m=>/ต\.ค\. 69 200/.test(m)),
       `เครื่อง A เพิ่มเงิน ต.ค. 100 (6 พ.ย.) → อ่านรายการเงินใหม่ก่อน → 🔒 ต.ค. 200 = ยอดที่จ่ายจริง (เดิมล็อก 300 จากข้อมูลค้าง · ได้ ${JSON.stringify(lk)})`);
    A.E(`adjRealtime(); adjRealtime();`);
    ok(A.db.chans['jjmk-adj'] && Object.keys(A.db.chans['jjmk-adj']).join()==='adjustments' && !('adjustments' in (A.db.chans['jjmk-live']||{})), 'realtime เพิ่ม/หักเงิน: ช่องแยก jjmk-adj (เรียกซ้ำ = ช่องเดียว · ไม่อยู่ใน jjmk-live)');
    A.T.adjustments.push({ id:9001, employee_id:1, kind:'add', reason:'โบนัสจากเครื่องอื่น', amount:50, period:'2026-11' });
    A.db.chans['jjmk-adj'].adjustments(); await wait(1000);
    ok(A.E('adjustments.length')===3 && A.E(`adjustments.some(x=>x.id===9001)`), 'เครื่องอื่นเพิ่มรายการ → realtime jjmk-adj อ่านใหม่ (รวมตาม id)');
    // อ่านไม่ได้ = ไม่บันทึก (fail closed)
    A.db.fail.adjustments = { message:'timeout' };
    adj(A, 'add', 10); const nA = A.T.adjustments.length; await A.E(`saveAdj()`);
    ok(A.T.adjustments.length===nA, 'อ่านรายการเงินใหม่ไม่ได้ (ก่อน 🔒) → ไม่บันทึก');
    delete A.db.fail.adjustments;
  }
  { console.log('[36e ออฟฟิศ: วันสุดท้ายของงวด (= วันจ่าย) ยังลงสแกน/OT ได้ตามปกติ · วันถัดไปถือว่าจ่ายแล้ว (🔒 ก่อน)]');
    const A = boot({ now:'2026-10-31T17:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`${V5} var o=V({id:2,code:'O1',nick:'ออฟ',branch:'OFFICE',dept:'ออฟฟิศ',bank_account:'2000000001'});
      employees=[o]; punches=mkP('O1','2026-10-01','2026-10-30'); recomputeAll();
      AUTH={username:'m',role:'staff',apps:{payroll:{today:'v',emp:'v',detail:'vaed',adv:'vaed',payroll:'v',_br:'JJLP,OFFICE'}}}; applyUser(AUTH); scopeEmployees(); go('detail');`);
    T.deposit_entries = []; T.adjustments = []; T.punches = [];
    const toasts = []; A.w.toast = m => toasts.push(String(m));
    E(`document.getElementById('pEmpId').value='2'; document.getElementById('pDay').value='2026-10-31'; document.getElementById('pIn').value='09:00'; document.getElementById('pOut').value='18:00';`);
    io.confirms.length = 0; await E(`savePunchEdit()`); await E(`setOTHours(2,'2026-10-31','2')`);
    ok(T.punches.length===2 && T.adjustments.length===1 && !io.confirms.length && !T.deposit_entries.length, `31 ต.ค. (วันจ่ายออฟฟิศ) ผจก. ไม่มีสิทธิ์ 🛡️ ลงสแกน + OT ของวันนี้ได้ ไม่ถาม (toast ${JSON.stringify(toasts.slice(-1))})`);
    A.setNow('2026-11-01T10:00:00+07:00');
    E(`document.getElementById('pEmpId').value='2'; document.getElementById('pDay').value='2026-10-30'; document.getElementById('pIn').value='09:00'; document.getElementById('pOut').value='17:00';`);
    toasts.length = 0; const nP = T.punches.length; await E(`savePunchEdit()`);
    ok(T.punches.length===nP && toasts.some(t=>/ยังไม่ได้บันทึก — ต\.ค\. 69 จ่ายแล้วแต่ยังไม่ปิดยอดเงินประกัน \(ออฟ\) และบัญชีนี้ไม่มีสิทธิ์หน้า 🛡️/.test(t)), '1 พ.ย. แก้สแกน 30 ต.ค. ของออฟฟิศ (งวดจบ+จ่ายแล้ว) → ต้อง 🔒 ก่อน · ไม่มีสิทธิ์ 🛡️ = ไม่บันทึก (รอบ 8: ข้อความสั้น + ชื่อคน)');
  }
  { console.log('[36f วันหยุดพิเศษดูกลุ่มที่ใช้ (หน้าร้าน/ออฟฟิศ) ตอนเช็คงวดที่จ่ายแล้ว]');
    const A = boot({ now:'2026-11-01T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`holiScopeReady=true; holiCalReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), o=V({id:2,code:'O1',nick:'ออฟ',branch:'OFFICE',dept:'ออฟฟิศ',bank_account:'2000000001'});
      employees=[a,o]; punches=[...mkP('A1','2026-09-26','2026-10-31'), ...mkP('O1','2026-10-01','2026-10-31')]; recomputeAll();
      AUTH={username:'m',role:'staff',apps:{payroll:{holi:'vaed',detail:'vae',_br:'JJLP'}}}; applyUser(AUTH); scopeEmployees();`);
    T.holidays = []; T.deposit_entries = [];
    T.employees = [{ id:1, code:'A1', nick:'เอ', branch:'JJLP', active:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true },
                   { id:2, code:'O1', nick:'ออฟ', branch:'OFFICE', active:true, deposit_target:3000, deposit_monthly:300, deposit_opening:0, deposit_on:true }];
    const toasts = []; A.w.toast = m => toasts.push(String(m));
    const holi = (day, sc) => E(`go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='${day}'; document.getElementById('hName').value='วันพิเศษ'; document.getElementById('hMult').value='2';
      (()=>{ const s=document.getElementById('hScope'); if(![...s.options].some(o=>o.value==='${sc}')){ const x=document.createElement('option'); x.value='${sc}'; s.appendChild(x);} s.value='${sc}'; })();`);
    holi('2026-10-28', 'store'); await E(`saveHoli()`);
    ok(T.holidays.length===1 && !toasts.some(t=>/มีผลกับงวดที่จ่ายแล้ว/.test(t)), 'บัญชีหน้าร้าน (_br JJLP) เพิ่มวันหยุด "หน้าร้าน" 28 ต.ค. (งวด พ.ย. ยังไม่จ่าย) ได้ — ไม่ดูรอบออฟฟิศ');
    holi('2026-10-29', 'all'); toasts.length = 0; await E(`saveHoli()`);
    ok(T.holidays.length===1 && toasts.some(t=>/มีผลกับงวดที่จ่ายแล้ว \(ต\.ค\. 69\)/.test(t) && /พนักงานสาขาอื่น 1 คนยังไม่ปิดยอด/.test(t)), 'วันหยุด "ทุกคน" 29 ต.ค. = ออฟฟิศงวด ต.ค. จ่ายแล้ว (ออฟยังไม่ 🔒) → บัญชี _br ไม่บันทึก');
  }
  { const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`holiScopeReady=true; holiCalReady=true; AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), o=V({id:2,code:'O1',nick:'ออฟ',branch:'OFFICE',dept:'ออฟฟิศ',bank_account:'2000000001'});
      employees=[a,o]; punches=[...mkP('A1','2026-09-26','2026-11-05'), ...mkP('O1','2026-10-01','2026-11-05')]; recomputeAll();
      go('holi'); document.getElementById('hId').value=''; document.getElementById('hDay').value='2026-10-20'; document.getElementById('hName').value='ออฟฟิศหยุด'; document.getElementById('hMult').value='2';
      (()=>{ const s=document.getElementById('hScope'); if(![...s.options].some(o=>o.value==='office')){ const x=document.createElement('option'); x.value='office'; s.appendChild(x);} s.value='office'; })();`);
    T.holidays = []; T.deposit_entries = []; io.confirms.length = 0;
    await E(`saveHoli()`);
    const rows = T.deposit_entries.filter(r=>r.period==='2026-10');
    ok(T.holidays.length===1 && rows.length===1 && rows[0].employee_id===2 && io.confirms.some(m=>/กระทบ ออฟ/.test(m)), `เจ้าของเพิ่มวันหยุด "ออฟฟิศ" 20 ต.ค. (6 พ.ย.) → 🔒 เฉพาะพนักงานออฟฟิศ ไม่ล็อกหน้าร้าน (ได้ ${JSON.stringify(rows.map(r=>r.employee_id))})`);
  }
  { console.log('[36g เงินยืม/MOU "เริ่มหักตั้งแต่งวด" ว่าง (= ทุกงวด) → เลื่อนเป็นงวดหลัง หลังจ่าย ต.ค. → 🔒 ต.ค. ก่อน · ตัวเลือก "ทุกงวด"]');
    for(const kind of ['mou', 'loan']){
      const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
      E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; mouReady=true; loanReady=true; ${V5}
        var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-07-26','2026-11-05'); recomputeAll();
        advances=[{id:501,empId:1,period:'2026-10',amount:9000,date:'2026-10-15',note:''}];
        ${kind==='mou' ? `mouLoans=[fromDbMou({id:7,employee_id:1,amount:15000,monthly:2000,final_max:3000,start_period:'',opening:0})];` : `loans=[fromDbLoan({id:8,employee_id:1,amount:15000,monthly:2000,deduct_on:'payroll',start_period:'',opening:0})];`}
        pvdMembers=[fromDbPvdM(${JSON.stringify({ ...PVM(1), emp_value:1000 })})]; pvdEntries=[]; pvdPayouts=[]; go('${kind}');`);
      T.deposit_entries = []; T.pvd_entries = []; T.pvd_payouts = []; T.pvd_members = [{ ...PVM(1), emp_value:1000 }];
      T.advances = [{ id:501, employee_id:1, period:'2026-10', amount:9000, taken_date:'2026-10-15', note:'' }];
      if(kind === 'mou') T.mou_loans = [{ id:7, employee_id:1, amount:15000, monthly:2000, final_max:3000, start_period:'', opening:0 }];
      else T.loans = [{ id:8, employee_id:1, amount:15000, monthly:2000, deduct_on:'payroll', start_period:'', opening:0 }];
      const allOpt = [...A.d.querySelectorAll(`select[onchange*="start_period"]`)].some(s => s.value === '' && s.options[s.selectedIndex].text === 'ทุกงวด');
      const o0 = payOf(E, 'a', '2026-10');
      io.confirms.length = 0;
      await E(kind === 'mou' ? `updMouField(7,'start_period','2026-12')` : `updLoanField(8,'start_period','2026-12')`);
      const o1 = payOf(E, 'a', '2026-10');
      const ld = T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10'), lp = T.pvd_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
      ok(allOpt && o0.dep===300 && o0.pvd===700 && o1.dep===300 && o1.pvd===700 && ld && ld.amount===300 && lp && lp.emp_amount===700 && io.confirms.some(m=>/ปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)),
         `${kind}: ช่องงวดเริ่มโชว์ "ทุกงวด" · เปลี่ยน '' → ธ.ค. → 🔒 ต.ค. เงินประกัน 300 + สำรองฯ 700 ก่อน (เดิมสำรองฯ ต.ค. กลายเป็น 1,000 · ได้ ${JSON.stringify(o0)} → ${JSON.stringify(o1)})`);
    }
  }
  { console.log('[36h ฟอร์ม ⚙️: ล็อกเพื่อนร่วมสาขาเฉพาะเมื่อ สถานะ/สาขา/รหัส เปลี่ยน (ทิปหารตามหัว) — HR ไม่มีสิทธิ์ 🐷 แก้เบี้ยวันหยุดได้]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`tipReady=true; pvdReady=true; pvdLoadErr=''; ${V5}
      var x=V({id:1,code:'X1',nick:'เอ็กซ์',bank_account:'1000000001'}), p=V({id:2,code:'P2',nick:'สมาชิก',bank_account:'1000000002'});
      employees=[x,p]; punches=[...mkP('X1','2026-09-26','2026-11-05'), ...mkP('P2','2026-09-26','2026-11-05')]; recomputeAll();
      tips=[fromDbTip({id:1,period:'2026-10',branch:'JJLP',amount:1000,member_ids:''})];
      pvdMembers=[fromDbPvdM(${JSON.stringify(PVM(2))})]; pvdEntries=[]; pvdPayouts=[];
      AUTH={username:'hr',role:'staff',apps:{payroll:{emp:'vaed',detail:'vae',dep:'vae'}}}; applyUser(AUTH);`);
    T.deposit_entries = []; T.pvd_entries = []; T.pvd_payouts = []; T.pvd_members = [PVM(2)];
    const toasts = []; A.w.toast = m => toasts.push(String(m));
    E(`go('emp'); openEmpForm(1); document.getElementById('fHoliPay').checked=false;`); io.confirms.length = 0;
    await E(`saveEmpForm()`);
    const lkX = T.deposit_entries.find(r=>r.employee_id===1 && r.period==='2026-10');
    ok(E(`employees.find(e=>e.id===1).holidayPay`)===false && lkX && lkX.amount===300 && !T.pvd_entries.length && !T.deposit_entries.some(r=>r.employee_id===2),
       `HR ปิดเบี้ยวันหยุดของเอ็กซ์ (ไม่ใช่สมาชิกสำรองฯ) → 🔒 เฉพาะเอ็กซ์ แล้วบันทึกได้ (เดิมบล็อกเพราะเพื่อนร่วมสาขาเป็นสมาชิก 🐷 · toast ${JSON.stringify(toasts.slice(-1))})`);
    E(`openEmpForm(1); document.getElementById('fActive').value='0';`); toasts.length = 0;
    await E(`saveEmpForm()`);
    ok(E(`!!employees.find(e=>e.id===1).active`)===true && toasts.some(t=>/ยังไม่ปิดยอดเงินสำรองฯ \(สมาชิก\) \(ทิปงวดนั้นของเพื่อนร่วมสาขาเปลี่ยนตาม\) และบัญชีนี้ไม่มีสิทธิ์หน้า 🐷/.test(t)),
       'HR ตั้งเอ็กซ์พ้นสภาพ (ทิปของสมาชิกสำรองฯ เปลี่ยน) → ต้อง 🔒 สำรองฯ ก่อน · ไม่มีสิทธิ์ 🐷 = ไม่บันทึก (แบบเดิม) · บอกเหตุ "ทิปงวดนั้นของเพื่อนร่วมสาขาเปลี่ยนตาม" (รอบ 9 · ' + JSON.stringify(toasts.slice(-1)) + ')');
  }
  { console.log('[36i สร้างไฟล์ K BIZ งวดนั้นแล้ว (ก่อนวันจ่าย) แล้วแก้รายการของงวดนั้น → เตือนให้สร้างไฟล์ใหม่ / ส่งธนาคารแล้ว = ยกเลิก]');
    const A = boot({ now:'2026-11-04T10:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-09-26','2026-11-03'); recomputeAll();
      advances=[{id:501,empId:1,period:'2026-10',amount:11000,date:'2026-10-15',note:''},{id:502,empId:1,period:'2026-10',amount:300,date:'2026-10-16',note:''},{id:503,empId:1,period:'2026-11',amount:100,date:'2026-11-02',note:''}];`);
    T.deposit_entries = []; T.payroll_audit = [];
    T.advances = [{id:501,employee_id:1,period:'2026-10',amount:11000,taken_date:'2026-10-15',note:''},{id:502,employee_id:1,period:'2026-10',amount:300,taken_date:'2026-10-16',note:''},{id:503,employee_id:1,period:'2026-11',amount:100,taken_date:'2026-11-02',note:''}];
    E(`document.getElementById('periodSel').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('periodSel').value='2026-10'; go('payroll')`);
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    const au = T.payroll_audit.find(r=>r.action==='kbiz');
    ok(au && /\[p:2026-10\] \[br:\]/.test(au.detail), 'สร้างไฟล์ K BIZ ต.ค. → ประวัติจด [p:2026-10] [br:]');
    E(`go('adv')`); io.confirmAns = m => !/ไฟล์ K BIZ เงินเดือน/.test(m); io.confirms.length = 0;
    await E(`delAdv(502)`);
    ok(T.advances.some(r=>r.id===502) && io.confirms.some(m=>/ไฟล์ K BIZ เงินเดือน ต\.ค\. 69 สร้างแล้ว/.test(m) && /สร้างไฟล์ K BIZ ใหม่/.test(m)), 'ลบเบิก ต.ค. หลังสร้างไฟล์ (4 พ.ย.) → เตือน "ไฟล์ K BIZ ต.ค. 69 สร้างแล้ว — ต้องสร้างไฟล์ใหม่" · ตอบไม่ = ไม่ลบ');
    io.confirms.length = 0; await E(`delAdv(503)`);
    ok(!T.advances.some(r=>r.id===503) && !io.confirms.some(m=>/ไฟล์ K BIZ เงินเดือน/.test(m)), 'ลบเบิกงวด พ.ย. (ยังไม่มีไฟล์) → ไม่เตือนเรื่องไฟล์');
    io.confirmAns = null; io.confirms.length = 0; await E(`delAdv(502)`);
    ok(!T.advances.some(r=>r.id===502) && io.confirms.some(m=>/ไฟล์ K BIZ เงินเดือน ต\.ค\. 69/.test(m)), 'ตอบตกลง → ลบได้ (ต้องสร้างไฟล์ใหม่ตามที่เตือน)');
    T.payroll_audit.push({ id:99, action:'kbiz', tbl:'kbiz_pay', detail:'สร้างไฟล์โอนเงินเดือน งวด ต.ค. 2569 · รัชดา [p:2026-10] [br:JJRD]' });
    T.payroll_audit = T.payroll_audit.filter(r=>r.id===99);
    io.confirms.length = 0; E(`advances.push({id:504,empId:1,period:'2026-10',amount:50,date:'2026-10-20',note:''})`); T.advances.push({id:504,employee_id:1,period:'2026-10',amount:50,taken_date:'2026-10-20',note:''});
    await E(`delAdv(504)`);
    ok(!io.confirms.some(m=>/ไฟล์ K BIZ เงินเดือน/.test(m)), 'ไฟล์ของสาขาอื่น ([br:JJRD]) → ไม่เตือนพนักงานลาดพร้าว');
  }
  { console.log('[36j 🏦 คนที่ทำงานอยู่: ติ๊ก "โอนไปแล้วนอกสลิป" ได้ (ไม่ติ๊กให้เอง) · ไม่คืนในสลิป/K BIZ · แถบเตือนไม่แนะนำให้ยกเลิก · ยกเลิกต้องเตือน · กลับมาทำงานเตือนรุ่นแอป]');
    const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    T.deposit_entries = [{id:1,employee_id:7,period:'2026-08',amount:2500,note:'lock'},{id:2,employee_id:7,period:'2026-09',amount:2500,note:'lock'},
                         {id:3,employee_id:8,period:'2026-08',amount:2500,note:'lock'},{id:4,employee_id:8,period:'2026-09',amount:2500,note:'lock'}];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var g=V({id:7,code:'GN',nick:'กลับมา',bank_account:'7777777777'}), h=V({id:8,code:'HN',nick:'ลาแล้ว',active:false,end_date:'2026-10-20',bank_account:'8888888888'});
      employees=[g,h]; shifts={GN:mk('2026-07-26','2026-10-27'),HN:mk('2026-07-26','2026-10-20')};`);
    await E(`depRefresh()`);
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value=''; renderDeposit();`);
    await E(`depRefundOpen()`);
    const it = () => JSON.parse(E(`JSON.stringify(depRefState.items.map(x=>({n:x.e.nick,xf:x.xf,act:x.act,on:x.on,block:x.block})))`));
    const s0 = it(), g0 = s0.find(x=>x.n==='กลับมา'), h0 = s0.find(x=>x.n==='ลาแล้ว');
    ok(g0 && g0.act && !g0.xf && g0.on && h0 && h0.xf && /ถ้ากลับมาทำงานก่อนบันทึก ให้ติ๊ก "🏦 โอนไปแล้วนอกสลิป"/.test(h0.block),
       'ทำงานอยู่ = คืนในสลิป (ติ๊กให้ตามกติกาเจ้าของ) · พ้นสภาพที่มีวันทำงานงวดนี้ = block "โอนได้เลย…" + บอกว่าถ้ากลับมาทำงานก่อนบันทึกให้ติ๊ก 🏦 โอนไปแล้ว');
    E(`(()=>{ const el=[...document.querySelectorAll('#depRefBody input[onchange^="depRefXf"]')][0]; el.checked=true; depRefXf(el); })()`);
    const g1 = it().find(x=>x.n==='กลับมา'), body = A.d.getElementById('depRefBody').textContent;
    ok(g1.xf && !g1.on && !g1.block && /ยังทำงานอยู่ \(อยู่ในสลิป\/ไฟล์ K BIZ งวดนี้\) — ติ๊ก "โอนแล้ว" เฉพาะเมื่อโอนไปแล้วจริง/.test(body),
       'ติ๊ก "🏦 โอนไปแล้วนอกสลิป" → ย้ายไปกลุ่ม 🏦 · ไม่ติ๊ก "โอนแล้ว" ให้เอง · เตือนรุ่นแอป');
    E(`depRefState.items.forEach(x=>{ if(x.e.id===7){ x.on=true; x.date='2026-10-27'; } else x.on=false; })`); io.confirms.length = 0;
    await E(`depRefundSave()`);
    const row = T.deposit_entries.find(r=>r.employee_id===7 && r.period==='2026-10');
    const p = JSON.parse(E(`JSON.stringify((x=>({net:x.net,refund:x.dep.refund,xfer:x.dep.xfer,col:x.dep.collected}))(calcPay(g,'2026-10')))`));
    ok(row && row.note==='xfer:2026-10-27' && row.amount===-2000 && p.refund===0 && p.xfer===2000 && p.col===3000 && p.net===12000 && io.confirms.some(m=>/กลับมา 2,000 .* — ทำงานอยู่/.test(m)),
       `บันทึก 🏦 2,000 ของคนที่ทำงานอยู่ → สลิป ต.ค. ไม่คืนซ้ำ (สุทธิ ${p.net} · คืน ${p.refund}) · สะสม 3,000`);
    E(`renderDeposit()`); const wt = A.d.getElementById('depWarn').textContent;
    ok(/อยู่ในรายชื่อเงินเดือนงวดนั้น/.test(wt) && /กลับมา ต\.ค\. 69 2,000/.test(wt) && /เก็บ 🏦 ไว้ \(โอนไปแล้ว ห้ามยกเลิก\)/.test(wt) && !/✎ ยกเลิกแล้วบันทึก/.test(wt),
       'แถบเตือน 🏦 ของคนที่ทำงานอยู่ (อยู่ในรายชื่อ K BIZ) → "เก็บ 🏦 ไว้ ห้ามยกเลิก" ไม่แนะนำให้ยกเลิก');
    io.promptAns = ['0']; io.confirmAns = () => false; io.confirms.length = 0;
    await E(`editDeposit(7,'2026-10')`); io.confirmAns = null;
    ok(T.deposit_entries.some(r=>r.employee_id===7 && r.period==='2026-10') && io.confirms.some(m=>/ยกเลิก = ยังไม่ได้โอนจริง — ถ้าโอนไปแล้ว ห้ามยกเลิก/.test(m) && /ยังทำงานอยู่ — หลังยกเลิก หน้าต่าง 💸 จะเสนอคืนในสลิป/.test(m) && !/งวด งวด/.test(m)),
       '✎ ยกเลิก 🏦 → เตือน "ยกเลิก = ยังไม่ได้โอนจริง" + "ยังทำงานอยู่ → 💸 จะเสนอคืนในสลิป = จ่ายซ้ำ" (ตอบไม่ = ยังอยู่)');
    // กลับมาทำงาน (ฟอร์ม ⚙️) ขณะมี 🏦 ในงวดที่ยังไม่จ่าย
    T.deposit_entries.push({ id:20, employee_id:8, period:'2026-11', amount:-2000, note:'xfer:2026-10-27' }); await E(`depRefresh()`);
    E(`go('emp'); openEmpForm(8); document.getElementById('fActive').value='1'; document.getElementById('fEnd').value='';`);
    io.confirmAns = m => !/กลับมาทำงาน — มี 🏦 โอนคืนนอกสลิป/.test(m); io.confirms.length = 0;
    await E(`saveEmpForm()`); io.confirmAns = null;
    ok(E(`employees.find(e=>e.id===8).active`)===false && io.confirms.some(m=>/ลาแล้ว กลับมาทำงาน — มี 🏦 โอนคืนนอกสลิป พ\.ย\. 69 2,000/.test(m) && /ทุกเครื่องต้องเป็นรุ่น/.test(m)),
       'ตั้ง "ลาแล้ว" กลับมาทำงานขณะมี 🏦 พ.ย. (ยังไม่จ่าย) → ถาม + เตือนรุ่นแอป · ตอบไม่ = ไม่บันทึก');
  }
  { console.log('[36k K BIZ คืนส่วนเกิน 120 คนในไฟล์เดียว → ประวัติยังมีแท็ก [p:] [ref:] ครบ (ตัดเฉพาะรายชื่อที่คนอ่าน)]');
    const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    const N = 120; T.deposit_entries = Array.from({ length:N }, (_, i) => ({ id:i+1, employee_id:i+1, period:'2026-10', amount:-1500, note:'refund' })); T.payroll_audit = [];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5} employees=[]; shifts={};
      for(let i=1;i<=${N};i++){ const c='E'+i; employees.push(V({id:i,code:c,nick:'พนักงานชื่อยาวพอสมควร'+i,deposit_opening:4500,bank_account:String(1000000000+i)})); shifts[c]=mk('2026-07-26','2026-10-19'); }`);
    await E(`depRefresh()`);
    E(`go('payroll'); document.getElementById('periodSel').innerHTML='<option>2026-10</option>'; document.getElementById('periodSel').value='2026-10';`);
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(100);
    const au = T.payroll_audit.filter(r=>r.action==='kbiz').pop(), n = await E(`depKbizRefIds('2026-10').then(s=>s.size)`);
    ok(au && au.detail.length <= 1500 && /\[p:2026-10\]/.test(au.detail) && /\[ref:[\d,]+\]$/.test(au.detail) && /…และอีก \d+ คน/.test(au.detail) && n===N,
       `ประวัติ ${au && au.detail.length} ตัวอักษร (≤ 1,500) · แท็กครบ · depKbizRefIds = ${n}/${N} (เดิม 0 เมื่อเกิน ~100 คน)`);
  }
  { console.log('[36l ✎ เงินประกันที่ถูกตัดที่สุทธิ: ค่าเดิมในช่อง/prompt = ยอด ✎ จริง · กดตกลงเฉย ๆ ไม่ทับ]');
    const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    T.deposit_entries = [{ id:1, employee_id:8, period:'2026-10', amount:500, note:'' }];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var m=V({id:8,code:'M8',nick:'แก้เอง',bank_account:'8000000008',deposit_opening:1000}); employees=[m]; shifts={M8:mk('2026-09-26','2026-10-19')};
      advances=[{id:501,empId:8,period:'2026-10',amount:11800,date:'2026-10-15',note:''}];`);
    await E(`depRefresh()`);
    const d0 = JSON.parse(E(`JSON.stringify((d=>({ded:d.ded,cap:d.cap,src:d.src}))(depositCalc(m,'2026-10')))`));
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10'; document.getElementById('depActive').value=''; renderDeposit();`);
    const inp = A.d.querySelector('#depTable input[data-emp="8"][data-p="2026-10"]');
    io.promptAns = [undefined]; const nW = A.db.log.length;
    await E(`editDeposit(8,'2026-10')`);
    const r = T.deposit_entries.find(x=>x.employee_id===8 && x.period==='2026-10');
    ok(d0.ded===200 && d0.cap==='short' && d0.src==='manual' && inp && inp.value==='500' && r.amount===500 && A.db.log.length===nW,
       `✎ 500 หักได้ 200 (short) → ช่องในตาราง 🛡️ = 500 · กดตกลงด้วยค่าเดิม = ไม่เขียน (✎ ยัง 500 · ได้ ${r.amount})`);
  }
  { console.log('[36m 📚 ประวัติเงินเดือนมีแถว 🏦 ของคนพ้นสภาพ (ไม่มีวันทำงาน · สุทธิ 0) · ที่มาในประวัติเงินประกัน escape]');
    const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    T.deposit_entries = [{ id:1, employee_id:5, period:'2026-08', amount:2500, note:'lock' }, { id:2, employee_id:5, period:'2026-09', amount:2500, note:'<img src=x class=pwn5>' },
                         { id:3, employee_id:5, period:'2026-10', amount:-2000, note:'xfer:2026-10-19' }];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var q=V({id:5,code:'Q5',nick:'ลาออก',active:false,bank_account:'5000000005'}), w=V({id:6,code:'W6',nick:'ทำงาน',bank_account:'6000000006'});
      employees=[q,w]; shifts={Q5:mk('2026-07-26','2026-09-25'),W6:mk('2026-07-26','2026-10-27')};`);
    await E(`depRefresh()`);
    const h = txt(E, `buildPayHistory(q,'2026-10')`);
    ok(/ต\.ค\./.test(h) && /โอนคืน 2,000/.test(h) && E(`depositCalc(q,'2026-10').collected`)===3000, '📚 ประวัติเงินเดือน: มีแถว ต.ค. "โอนคืน 2,000" (สะสมเหลือ 3,000)');
    ok(!/<img/i.test(E(`dtDepHistory(q,'2026-09')`)), 'ประวัติเงินประกันรายคน: ช่อง "ที่มา" จาก note แปลก ๆ ถูก escape (ไม่มีแท็ก <img>)');
  }
  { console.log('[36n ✎ ยกเลิก/แก้ยอด 💸 หลังสร้างไฟล์ K BIZ ที่มียอดคืนนี้ → เตือน (ทั้งคนที่ยังทำงานอยู่)]');
    const A = boot({ now:'2026-11-03T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    T.deposit_entries = [{id:1,employee_id:1,period:'2026-08',amount:2500,note:'lock'},{id:2,employee_id:1,period:'2026-09',amount:2500,note:'lock'},{id:3,employee_id:1,period:'2026-10',amount:-2000,note:'refund'}];
    T.payroll_audit = [];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var w=V({id:1,code:'W1',nick:'ทำงาน',bank_account:'1111111111'}); employees=[w]; shifts={W1:mk('2026-07-26','2026-11-02')};`);
    await E(`depRefresh()`);
    E(`go('payroll'); document.getElementById('periodSel').innerHTML='<option>2026-10</option>'; document.getElementById('periodSel').value='2026-10';`);
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option>2026-10</option>'; document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    A.setNow('2026-11-03T15:00:00+07:00');
    io.promptAns = ['0']; io.confirmAns = () => false; io.confirms.length = 0;
    await E(`editDeposit(1,'2026-10')`);
    ok(T.deposit_entries.some(r=>r.id===3) && io.confirms.some(m=>/ยอดคืนนี้อยู่ในไฟล์ K BIZ ที่สร้างแล้ว/.test(m) && !/งวด งวด/.test(m)), '✎ ยกเลิก 💸 ของคนที่ทำงานอยู่หลังสร้างไฟล์ K BIZ → เตือน "อยู่ในไฟล์ K BIZ แล้ว" (ข้อความไม่มี "งวด งวด")');
    io.promptAns = ['1500']; io.confirms.length = 0;
    await E(`editDeposit(1,'2026-10')`); io.confirmAns = null;
    ok(T.deposit_entries.find(r=>r.id===3).amount===-2000 && io.confirms.some(m=>/ต้องสร้างไฟล์ K BIZ ใหม่/.test(m)), '✎ ลดยอด 💸 หลังสร้างไฟล์ → เตือนให้สร้างไฟล์ใหม่ · ตอบไม่ = ไม่แก้');
  }
  // ============ 37) รอบ 6: 🔒 อัตโนมัติเมื่อถึงวันจ่าย (payDayLock) — บาทจริง ============
  // SYNC = คัดลอกข้อมูลในเครื่องลงฐานข้อมูลจำลอง (moneyFresh อ่านจากฐานข้อมูลก่อนล็อกเสมอ) · AUTO = เปิด 🔒 อัตโนมัติ (loadAll สำเร็จ + สแกนครบตั้งแต่ ก.ค.)
  const SYNC = async A => { const { E, T } = A; const j = s => JSON.parse(E(`JSON.stringify(${s})`));
    T.employees = j(`employees.map(toDbEmp).map((r,i)=>Object.assign(r,{id:employees[i].id,deposit_target_v1:employees[i].depTargetV1,deposit_monthly_v1:employees[i].depMonthlyV1}))`);
    T.advances = j(`advances.map(a=>({id:a.id,employee_id:a.empId,period:a.period,amount:a.amount,taken_date:a.date,note:a.note||''}))`);
    T.adjustments = j(`adjustments.map(a=>({id:a.id,employee_id:a.empId,period:a.period,kind:a.kind,reason:a.reason,amount:a.amount}))`);
    T.tips = j(`tips.map(t=>({id:t.id,period:t.period,branch:t.branch,amount:t.amount,member_ids:(t.members||[]).join(',')}))`);
    T.deposit_entries = j(`depositEntries.map(r=>({id:r.id,employee_id:r.empId,period:r.period,amount:r.amount,note:r.raw!=null?r.raw:r.note}))`);
    T.pvd_members = j(`pvdMembers.map(m=>({id:m.id,employee_id:m.empId,emp_mode:m.empMode,emp_value:m.empValue,er_mode:m.erMode,er_value:m.erValue,start_period:m.startPeriod,stop_period:m.stopPeriod,opening_emp:m.openEmp,opening_er:m.openEr,consent:m.consent,note:m.note}))`);
    T.pvd_entries = j(`pvdEntries.map(r=>({id:r.id,employee_id:r.empId,period:r.period,emp_amount:r.empAmt,er_amount:r.erAmt,note:r.note}))`);
    T.pvd_payouts = T.pvd_payouts || [];
    T.holidays = j(`Object.values(holidays).map(h=>({id:h.id,day:h.day,name:h.name,multiplier:h.mult,scope:h.scope,cal_id:h.calId}))`);
    T.shifts = j(`shiftDefs.map(s=>Object.assign(toDbShift(s),{id:s.id}))`);
    T.punches = j(`punches.map((p,i)=>({id:i+1,emp_code:p.code,punch_date:p.date,punch_time:p.time+':00',device_sn:p.sn||null}))`);   // รอบ 7: 🔒 อัตโนมัติอ่านสแกนช่วงงวดใหม่จากฐานข้อมูล
    return E(`(async()=>{ moneyTblSig={}; return await moneyTblRefresh(true); })()`); };
  const AUTO = `punchLoaded=true; punchSince='2026-07-01'; payLockReady=true; payLockAuto=true;`;
  const PV = (id, o) => JSON.stringify(Object.assign(PVM(id), o || {}));
  const rowT = (A, tbl, id, p) => (A.T[tbl] || []).find(r => r.employee_id === id && r.period === p) || null;
  const toastT = A => (A.d.getElementById('toast') || {}).textContent || '';
  const W6 = `var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'});`;
  const ADVB = `advances=[fromDbAdv({id:501,employee_id:2,period:'2026-10',amount:11900,taken_date:'2026-10-15',note:''})];`;
  { console.log('[37a รอบ 6: 🔒 อัตโนมัติวันจ่าย — เปิดแอป 6 พ.ย. (ต.ค. จ่ายแล้ว 5 พ.ย.) → ล็อกเงินประกัน+สำรองฯ ทุกคนด้วยยอดที่ระบบคิด · ไม่ถาม · ประวัติ 1 บรรทัด · ล็อกครบแล้วไม่ยิงเน็ต]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; pvdReady=true; pvdLoadErr=''; ${V5} ${W6}
      var c=V({id:3,code:'C1',nick:'ซี',active:false,end_date:'2026-10-20'}), d=V({id:4,code:'D1',nick:'ดี'});
      var n=V({id:5,code:'N1',nick:'นิว',start_date:'2026-11-01',deposit_target_v1:null,deposit_monthly_v1:null}), f=V({id:6,code:'F1',nick:'ออกนาน',active:false,end_date:'2026-08-10'});
      employees=[a,b,c,d,n,f];
      punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-07-26','2026-11-05'), ...mkP('C1','2026-07-26','2026-10-20'), ...mkP('D1','2026-07-26','2026-09-25'),
               ...mkP('N1','2026-11-01','2026-11-05'), ...mkP('F1','2026-07-26','2026-08-10')];
      recomputeAll(); ${ADVB}
      pvdMembers=[fromDbPvdM(${PV(1, { er_mode:'match', er_value:50 })})]; pvdEntries=[]; pvdPayouts=[]; depositEntries=[];`);
    const v1n = V1LOCK(A);   // รอบ 10: เจ้าของ 🔒 ส.ค./ก.ย. แล้ว (ระบบปิดยอด ต.ค. ให้เฉพาะคนที่งวดก่อน ต.ค. 🔒 ครบ)
    await SYNC(A); T.payroll_audit = []; E(AUTO);
    const s0 = ['a','b','d'].map(v => payOf(E, v, '2026-10'));
    let reads = 0; A.db.latency = () => { reads++; return 0; };
    io.confirms.length = 0;
    await E(`payDayLock('load')`);
    const L = id => rowT(A, 'deposit_entries', id, '2026-10');
    ok(L(1) && L(1).amount===300 && L(1).note==='lock' && L(2) && L(2).amount===100 && L(2).note==='lock:short:300:100' && L(3) && L(3).amount===300 && L(4) && L(4).amount===0 && L(4).note==='lock',
       `ต.ค. 🔒 อัตโนมัติ: เอ 300 · บี 100 (lock:short:300:100 — เบิก 11,900 สุทธิเหลือ 100) · ซี (พ้นสภาพ 20 ต.ค. มีวันทำงาน) 300 · ดี (ทำงานอยู่ ไม่มีวันทำงาน ต.ค.) 0 (ได้ ${JSON.stringify(T.deposit_entries.map(x=>[x.employee_id,x.amount,x.note]))})`);
    ok(!L(5) && !L(6) && v1n>0 && T.deposit_entries.filter(x=>x.period<'2026-10').length===v1n && T.deposit_entries.every(x=>x.period<='2026-10'), 'ไม่เขียนแถวให้ นิว (เริ่ม พ.ย.) · ออกนาน (ออก ส.ค.) · ไม่แตะงวดก่อน ต.ค. (ก.ย. จ่ายแล้วยังไม่ 🔒 = เจ้าของตรวจแล้ว 🔒 เอง)');
    const pv = rowT(A, 'pvd_entries', 1, '2026-10');
    ok(pv && pv.emp_amount===500 && pv.er_amount===250 && pv.note==='lock', `สำรองฯ เอ ต.ค. 🔒 500 + ร้านสมทบ 250 (ได้ ${JSON.stringify(pv)})`);
    const au = T.payroll_audit.filter(x=>x.action==='autolock');
    ok(!io.confirms.length && au.length===1 && /งวด ต\.ค\. 69 · 4 คน · เงินประกัน 4 แถว รวม 700 บาท \(สุทธิไม่พอ 1 แถว/.test(au[0].detail) && /ไม่มีวันทำงาน = 0 1 แถว/.test(au[0].detail) &&
       /สำรองฯ 1 แถว หัก 500 ร้าน 250/.test(au[0].detail) && /🔒 ปิดยอดงวด ต\.ค\. 69 อัตโนมัติ 4 คน/.test(toastT(A)),
       'ไม่ถาม · payroll_audit "ปิดยอดอัตโนมัติ" 1 บรรทัดสรุป (งวด · คน · ยอด · เหตุผล) · toast "🔒 ปิดยอดงวด ต.ค. 69 อัตโนมัติ 4 คน"');
    ok(JSON.stringify(['a','b','d'].map(v => payOf(E, v, '2026-10')))===JSON.stringify(s0), 'สลิป ต.ค. หลังล็อก = ก่อนล็อกทุกบาท (ปิดยอดตามที่จ่ายจริง ไม่ใช่การแก้ยอด)');
    reads = 0; const n0 = T.deposit_entries.length + T.pvd_entries.length;
    await E(`payDayLock('tab')`);
    ok(reads===0 && T.deposit_entries.length + T.pvd_entries.length===n0 && T.payroll_audit.filter(x=>x.action==='autolock').length===1,
       `ล็อกครบแล้ว → รอบถัดไปคิดในเครื่องอย่างเดียว (ยิงเน็ต ${reads} ครั้ง) · ไม่เขียน/ไม่จดประวัติซ้ำ`);
    E(`punches.push(...mkP('D1','2026-10-20','2026-10-25')); recomputeAll();`);
    const dO = payOf(E, 'd', '2026-10');
    ok(dO.dep===0 && E(`depositCalc(d,'2026-11').before`)===1000,
       `สแกน ต.ค. ของดีมาทีหลัง (Worker ส่งย้อนหลัง) → เงินประกัน ต.ค. ยัง 0 (🔒 0) · สะสมก่อน พ.ย. 1,000 = ส.ค.+ก.ย. (ไม่หักย้อนงวดที่จ่ายแล้ว · ได้ ${dO.dep})`);
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[37b รอบ 10: ออฟฟิศไม่ปิดยอดเองวันจ่าย (= วันสุดท้ายของงวด) → K BIZ งวดถัดไป/ปุ่ม 🔒 · หน้าร้าน ข้ามวันของร้าน (ตี 6) ขณะเปิดค้าง → ล็อกเมื่อถึงวันจ่าย]');
    const A = boot({ now:'2026-10-31T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5} ${W6}
      var o=V({id:7,code:'O1',nick:'ออฟ',branch:'OFFICE',bank_account:'1000000007'});
      employees=[a,o]; punches=[...mkP('A1','2026-07-26','2026-10-30'), ...mkP('O1','2026-07-26','2026-10-30')]; recomputeAll(); depositEntries=[];`);
    const v1n = V1LOCK(A); await SYNC(A); E(AUTO);
    A.setNow('2026-10-31T05:00:00+07:00');
    let reads = 0; A.db.latency = () => { reads++; return 0; };
    await E(`payDayLock('load')`);
    ok(T.deposit_entries.length===v1n && reads===0, `31 ต.ค. ตี 5 (วันของร้านยังเป็น 30 ต.ค.) → ยังไม่ล็อกใคร · ไม่ยิงเน็ต (${reads})`);
    A.setNow('2026-10-31T07:00:00+07:00'); E(`payLockTick()`); await wait(80);
    ok(!rowT(A,'deposit_entries',7,'2026-10') && !rowT(A,'deposit_entries',1,'2026-10') && reads===0,
       `31 ต.ค. หลังตี 6 (วันจ่ายออฟฟิศ · งวดยังไม่จบ) → รอบ 10: ไม่ปิดยอดออฟฟิศเอง · หน้าร้านยังไม่ถึงวันจ่าย · ไม่ยิงเน็ต (${reads})`);
    A.setNow('2026-11-01T07:00:00+07:00'); E(`payLockTick()`); await wait(80);
    E(`go('dep'); renderDeposit();`);
    const ul = JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)), wt = A.d.getElementById('depWarn').textContent;
    ok(!rowT(A,'deposit_entries',7,'2026-10') && ul.length===1 && ul[0].p==='2026-10' && ul[0].office===1 && /ออฟฟิศ 1 คน: ระบบไม่ปิดยอดเองวันจ่าย/.test(wt) && !/หน้าร้าน: ระบบปิดยอดให้เอง/.test(wt),
       '1 พ.ย. (งวดออฟฟิศจบแล้ว · จ่ายแล้ว) → ไม่ปิดยอดออฟฟิศเอง · แถบเตือน "ต.ค. (1 คน) · ออฟฟิศ 1 คน: ระบบไม่ปิดยอดเองวันจ่าย — กด 🔒 …"');
    A.setNow('2026-11-05T03:00:00+07:00'); E(`payLockTick()`); await wait(80);
    ok(!rowT(A,'deposit_entries',1,'2026-10'), '5 พ.ย. ตี 3 = วันของร้านยังเป็น 4 พ.ย. → หน้าร้านยังไม่ล็อก');
    A.setNow('2026-11-05T07:00:00+07:00'); E(`payLockTick()`); await wait(80);
    ok(rowT(A,'deposit_entries',1,'2026-10') && rowT(A,'deposit_entries',1,'2026-10').amount===300 && !rowT(A,'deposit_entries',7,'2026-10'), '5 พ.ย. หลังตี 6 → 🔒 หน้าร้าน ต.ค. 300 · ออฟฟิศยังไม่ล็อก');
    // ออฟฟิศ: สร้างไฟล์ K BIZ งวด พ.ย. (ก่อนวันจ่าย 30 พ.ย.) → ถามปิดยอด ต.ค. แบบเดิม (ยอด = calcPay ทั้งงวด ต.ค. ที่จบแล้ว = สลิป)
    A.setNow('2026-11-28T10:00:00+07:00');
    E(`punches.push(...mkP('O1','2026-11-01','2026-11-27')); recomputeAll(); go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    const oSlip = payOf(E, 'o', '2026-10');
    io.confirms.length = 0; io.files.length = 0;
    await E(`exportKbizPay('OFFICE')`); await wait(30);
    const lk = io.confirms.find(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) || '';
    ok(/ไฟล์โอนเงินเดือน/.test(A.d.getElementById('kbizResBody').textContent) && /ปิดยอดงวดที่จ่ายแล้ว ต\.ค\. 69/.test(lk) && rowT(A,'deposit_entries',7,'2026-10') &&
       rowT(A,'deposit_entries',7,'2026-10').amount===oSlip.dep && oSlip.dep===300,
       `K BIZ ออฟฟิศ พ.ย. → ถามแล้ว 🔒 ต.ค. ของออฟฟิศ = ยอดในสลิป ต.ค. (${oSlip.dep} · ได้ ${JSON.stringify(rowT(A,'deposit_entries',7,'2026-10'))})`);
  }
  { console.log('[37c สิทธิ์แยก: เงินประกัน = หน้า 🛡️ (a · แถว ✎ ต้อง e) · สำรองฯ = หน้า 🐷 · ไม่มีสิทธิ์ = ข้ามเงียบ ๆ (แถบเตือนยังขึ้น) · บัญชี _br ล็อกเฉพาะคนที่เห็น]');
    const run = async (apps, extra) => {
      const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
      E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5} ${W6}
        var r=V({id:9,code:'R1',nick:'อาร์',branch:'JJRD',bank_account:'1000000009'});
        employees=[a,b,r]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-07-26','2026-11-05'), ...mkP('R1','2026-07-26','2026-11-05')]; recomputeAll(); ${ADVB}
        pvdMembers=[fromDbPvdM(${PV(1)})]; pvdEntries=[]; pvdPayouts=[];
        depositEntries=[fromDbDep({id:61,employee_id:2,period:'2026-10',amount:500,note:''})];`);
      V1LOCK(A); await SYNC(A);
      E(`AUTH={username:'m',role:'staff',apps:{payroll:${JSON.stringify(apps)}}}; applyUser(AUTH); ${extra || ''} ${AUTO}`);
      let reads = 0; A.db.latency = () => { reads++; return 0; };
      await E(`payDayLock('load')`);
      return { A, reads, dep: JSON.stringify(T.deposit_entries.filter(x=>x.period>='2026-10').map(x=>[x.employee_id, x.amount, x.note]).sort((x,y)=>x[0]-y[0])), pvd: (T.pvd_entries||[]).length };
    };
    const r1 = await run({ dep:'vae' });
    ok(r1.dep===JSON.stringify([[1,300,'lock'],[2,100,'lock:short:500:100'],[9,300,'lock']]) && r1.pvd===0,
       `สิทธิ์หน้า 🛡️ (vae) ไม่มี 🐷 → 🔒 เงินประกันครบ (บี ✎ 500 → ล็อก 100 ที่หักได้จริง) · ไม่เขียนแถว 🔒 สำรองฯ (ได้ ${r1.dep} · pvd ${r1.pvd})`);
    const r2 = await run({ payroll:'vae', dep:'v', pvd:'v' });
    r2.A.E(`go('dep'); renderDeposit(); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    ok(r2.dep===JSON.stringify([[2,500,'']]) && r2.pvd===0 && r2.reads===0 && /ระบบปิดยอดให้เองเมื่อถึงวันจ่าย/.test(r2.A.d.getElementById('depWarn').textContent),
       'ดูได้อย่างเดียว (🛡️ v · 🐷 v) → ไม่เขียน/ไม่ยิงเน็ต · แถบ "จ่ายแล้วแต่ยังไม่ปิดยอด" ยังขึ้น พร้อมบอกว่าระบบปิดยอดให้เองเมื่อผู้มีสิทธิ์เปิดแอป');
    const r3 = await run({ dep:'ve', pvd:'vae' });
    ok(r3.dep===JSON.stringify([[2,100,'lock:short:500:100']]) && r3.pvd===1,
       `🛡️ แก้ได้แต่เพิ่มไม่ได้ (ve) → 🔒 แถว ✎ ของบี (update) · ไม่ insert แถวใหม่ · 🐷 vae → 🔒 สำรองฯ เอ (ได้ ${r3.dep} · pvd ${r3.pvd})`);
    const r4 = await run({ dep:'vae', _br:'JJRD' }, 'scopeEmployees();');
    ok(r4.dep===JSON.stringify([[2,500,''],[9,300,'lock']]), `บัญชี _br รัชดา → 🔒 เฉพาะคนที่เห็น (ได้ ${r4.dep})`);
  }
  { console.log('[37d ไม่ทับแถวที่มีอยู่ (🔒 ยอดที่เจ้าของแก้ · 💸 · 🏦) · ✎ ล็อกด้วยยอดที่หักได้จริง (update เฉพาะเมื่อยังเป็น ✎)]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); depV2Col=true; ${V5} ${W6}
      var c=V({id:3,code:'C1',nick:'ซี',bank_account:'1000000003',deposit_opening:5000}), x=V({id:4,code:'X1',nick:'เอ็กซ์',active:false,end_date:'2026-09-30',deposit_opening:5000});
      employees=[a,b,c,x]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-07-26','2026-11-05'), ...mkP('C1','2026-07-26','2026-11-05'), ...mkP('X1','2026-07-26','2026-09-25')]; recomputeAll(); ${ADVB}
      depositEntries=[fromDbDep({id:61,employee_id:1,period:'2026-10',amount:250,note:'lock'}), fromDbDep({id:62,employee_id:2,period:'2026-10',amount:500,note:''}),
                      fromDbDep({id:63,employee_id:3,period:'2026-10',amount:-2000,note:'refund'}), fromDbDep({id:64,employee_id:4,period:'2026-10',amount:-2000,note:'xfer:2026-10-30'})];`);
    V1LOCK(A); await SYNC(A); E(AUTO);
    await E(`payDayLock('load')`);
    const got = JSON.stringify(T.deposit_entries.filter(r=>r.period>='2026-10').map(r=>[r.id, r.employee_id, r.amount, r.note]).sort((p,q)=>p[0]-q[0]));
    ok(got===JSON.stringify([[61,1,250,'lock'],[62,2,100,'lock:short:500:100'],[63,3,-2000,'refund'],[64,4,-2000,'xfer:2026-10-30']]),
       `🔒 250 (เจ้าของแก้) · 💸 · 🏦 ไม่ถูกแตะ · ✎ 500 ของบี → 🔒 100 (หักได้จริง · สุทธิ 100) · ไม่มีแถวเพิ่ม (ได้ ${got})`);
  }
  { console.log('[37e สองเครื่องปิดยอดพร้อมกัน → แถวละหนึ่ง (unique คน+งวด · insert ignoreDuplicates · ✎ update .eq(note,"")) ยอดเดียวกัน]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); await wait(300);
    const B = boot({ now:'2026-11-06T12:00:00+07:00', db:A.db }); await wait(300);
    const SET = `AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5} ${W6} employees=[a,b]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('B1','2026-07-26','2026-11-05')]; recomputeAll(); ${ADVB}
      depositEntries=[fromDbDep({id:61,employee_id:2,period:'2026-10',amount:500,note:''})];`;
    for(const X of [A, B]){ X.E(SEED); X.E(PUN); X.E(SET); }
    const v1n = V1LOCK(A); await SYNC(A); B.E(`depositEntries = ${JSON.stringify(A.T.deposit_entries)}.map(fromDbDep)`); A.E(AUTO); B.E(AUTO);   // B โหลดสมุดชุดเดียวกัน (ส.ค./ก.ย. 🔒 แล้ว)
    await Promise.all([A.E(`payDayLock('load')`), B.E(`payDayLock('load')`)]);
    const rows = A.T.deposit_entries.filter(x=>x.period>='2026-10');
    ok(rows.length===2 && rows.filter(x=>x.employee_id===1).length===1 && rows.find(x=>x.employee_id===1).amount===300 && rows.find(x=>x.employee_id===2).amount===100 &&
       rows.find(x=>x.employee_id===2).note==='lock:short:500:100' && rows.find(x=>x.employee_id===2).id===61,
       `2 เครื่องพร้อมกัน → แถวละหนึ่ง: เอ 300 · บี ✎ (id 61) → 100 (ได้ ${JSON.stringify(rows.map(x=>[x.id,x.employee_id,x.amount,x.note]))})`);
    ok(A.E(`depositEntries.length`)===2+v1n && B.E(`depositEntries.length`)===2+v1n, `ทั้งสองเครื่องเห็นแถวครบ (เครื่องที่เขียนไม่ได้ อ่านใหม่เงียบ ๆ) (${A.E(`depositEntries.length`)}/${B.E(`depositEntries.length`)}/${2+v1n})`);
  }
  { console.log('[37f ล็อกด้วยข้อมูลสด (moneyFresh) — เครื่องที่ข้อมูลค้างไม่ล็อกยอดผิด · อ่านไม่ได้ = ไม่ล็อก (เงียบ · รอบหน้าลองใหม่)]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5} ${W6} employees=[b]; punches=mkP('B1','2026-07-26','2026-11-05'); recomputeAll(); ${ADVB} depositEntries=[];`);
    V1LOCK(A); await SYNC(A); E(AUTO);
    const stale = payOf(E, 'b', '2026-10');
    T.holidays = [{ id:7, day:'2026-10-23', name:'ปิยมหาราช', multiplier:2, scope:'all' }];   // อีกเครื่องเพิ่มก่อนวันจ่าย (holidays ไม่มี realtime)
    A.db.fail.holidays = { message:'timeout' };
    const r0 = await E(`payDayLock('load')`);
    ok(!T.deposit_entries.some(r=>r.period>='2026-10') && r0 && r0.fail && !/❌/.test(toastT(A)), `อ่านรายการเงินล่าสุดไม่ได้ → ไม่ล็อก · ไม่เด้งข้อความ error (ได้ ${JSON.stringify(r0)})`);
    delete A.db.fail.holidays;
    await E(`payDayLock('load')`);
    const L = rowT(A, 'deposit_entries', 2, '2026-10');
    ok(stale.dep===100 && stale.cap==='short' && L && L.amount===300 && L.note==='lock',
       `เครื่องค้างคิด ต.ค. 100 (short) แต่ฐานข้อมูลมีวันหยุด 23 ต.ค. ×2 → 🔒 300 ตามสลิป/ไฟล์ที่จ่ายจริง (ได้ ${JSON.stringify(L)})`);
  }
  { console.log('[37g ก่อนแก้ค่าที่เปลี่ยนสุทธิ (depPaidGuard → depLockBefore) → 🔒 อัตโนมัติวันจ่ายก่อน (ไม่ถาม "ปิดยอดก่อน") แล้วแก้ได้ · ตัวกันเดิมเป็นชั้นที่สอง]');
    const A = boot({ now:'2026-11-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5} ${W6} employees=[a,b]; punches=[...mkP('A1','2026-07-26','2026-11-09'), ...mkP('B1','2026-07-26','2026-11-09')]; recomputeAll(); ${ADVB}
      depositEntries=[]; go('adv');`);
    V1LOCK(A); await SYNC(A); E(AUTO);
    const b0 = payOf(E, 'b', '2026-10');
    io.confirms.length = 0;
    await E(`delAdv(501)`); await wait(30);
    const b1 = payOf(E, 'b', '2026-10');
    ok(!T.advances.length && b0.dep===100 && b1.dep===100 && b1.net===b0.net+11900 && io.confirms.length===1 && rowT(A,'deposit_entries',1,'2026-10').amount===300,
       `ลบเบิก ต.ค. ของบี (10 พ.ย.) → 🔒 ต.ค. ทุกคนให้ก่อนเงียบ ๆ (บี 100 · เอ 300) แล้วลบ · เงินประกัน ต.ค. ยัง 100 ไม่หักย้อนหลัง · ถามแค่ "ลบรายการเบิกนี้?" (ได้ ${b0.dep}→${b1.dep} · confirm ${io.confirms.length})`);
  }
  { console.log('[37h ไม่ล็อกงวดที่สแกนในเครื่องไม่ครอบทั้งงวด (punchSince) · 20 ต.ค. (ก.ย. จ่ายแล้วแต่ก่อน ต.ค.) = ไม่แตะ ไม่ยิงเน็ต]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5} ${W6}
      var o=V({id:7,code:'O1',nick:'ออฟ',branch:'OFFICE',bank_account:'1000000007'});
      employees=[a,o]; punches=[...mkP('A1','2026-07-26','2026-11-05'), ...mkP('O1','2026-07-26','2026-11-05')]; recomputeAll(); depositEntries=[];`);
    V1LOCK(A); await SYNC(A); E(AUTO); E(`punchSince='2026-10-01'; loadOkSeq=loadDoneSeq=loadSeq;`);   // รอบ 8: 'load' หลัง loadAll ที่อ่านครบ = ไม่โหลดซ้ำ (ใช้ punchSince ของรอบนั้น)
    await E(`payDayLock('load')`);
    ok(!rowT(A,'deposit_entries',1,'2026-10') && !rowT(A,'deposit_entries',7,'2026-10'),
       'สแกนในเครื่องเริ่ม 1 ต.ค. → หน้าร้าน ต.ค. (26 ก.ย.–25 ต.ค.) ไม่ครบ = ไม่ล็อก · ออฟฟิศไม่ปิดยอดเอง (รอบ 10)');
    E(`punchSince='2026-07-01'`); await E(`payDayLock('load')`);
    ok(rowT(A,'deposit_entries',1,'2026-10') && rowT(A,'deposit_entries',1,'2026-10').amount===300 && !rowT(A,'deposit_entries',7,'2026-10'), 'สแกนครบงวด → 🔒 หน้าร้าน ต.ค. 300 · ออฟฟิศยังไม่ล็อก');
    const B = boot({ now:'2026-10-20T12:00:00+07:00' }); await wait(300);
    B.E(SEED); B.E(PUN); B.E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5} ${W6} employees=[a]; punches=mkP('A1','2026-07-26','2026-10-19'); recomputeAll(); depositEntries=[];`);
    await SYNC(B); B.E(AUTO);
    let reads = 0; B.db.latency = () => { reads++; return 0; };
    await B.E(`payDayLock('load')`);
    ok(!B.T.deposit_entries.length && reads===0, `20 ต.ค.: ก.ย. จ่ายแล้วแต่ก่อน ต.ค. (เจ้าของ 🔒 เอง) · ต.ค. ยังไม่จ่าย → ไม่เขียน ไม่ยิงเน็ต (${reads})`);
  }
  // ============ 38) ผลตรวจรอบ 3 ของการตรวจรอบสุดท้าย (รอบ 6) — บาทจริง ============
  { console.log('[38a ปุ่ม 🔒 (🛡️/🐷) อ่านข้อมูลเงินสดก่อนพรีวิว — เครื่องค้างไม่ล็อกยอดผิด (วันหยุดที่อีกเครื่องเพิ่ม)]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5} ${W6} employees=[b]; punches=mkP('B1','2026-07-26','2026-11-05'); recomputeAll(); ${ADVB}
      depositEntries=[]; pvdMembers=[fromDbPvdM(${PV(2)})]; pvdEntries=[]; pvdPayouts=[];`);
    await SYNC(A);
    T.holidays = [{ id:7, day:'2026-10-23', name:'ปิยมหาราช', multiplier:2, scope:'all' }];
    const s = payOf(E, 'b', '2026-10');
    E(`go('dep'); renderDeposit(); document.getElementById('depPeriodSel').value='2026-10';`);
    await E(`depLockOpen()`); await E(`depLockSave()`); await wait(20);
    const L = rowT(A, 'deposit_entries', 2, '2026-10');
    ok(s.dep===100 && L && L.amount===300 && L.note==='lock', `🔒 เงินประกัน: เครื่องค้างคิด 100 → ล็อก 300 ตามข้อมูลสด (ได้ ${JSON.stringify(L)})`);
    E(`go('pvd'); renderPvd(); document.getElementById('pvdPeriodSel').value='2026-10';`);
    await E(`pvdLockOpen()`); await E(`depLockSave()`); await wait(20);
    const P = rowT(A, 'pvd_entries', 2, '2026-10');
    ok(s.pvd===0 && P && P.emp_amount===200 && P.note==='lock', `🔒 สำรองฯ: เครื่องค้างคิด 0 → ล็อก 200 (สุทธิ 500 − เงินประกัน 300) ตามข้อมูลสด (ได้ ${JSON.stringify(P)})`);
  }
  { console.log('[38b 🔒 ด้วยยอดที่ต่างจากที่นับในยอดสะสม (แก้ยอดในพรีวิว · ✎ งวดไม่มีวันทำงานแบบแอปเดิม) → 🔒 งวดหลังที่จ่ายแล้ว + สำรองฯ ก่อน]');
    const A = boot({ now:'2026-12-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001',deposit_opening:1700}); employees=[a]; punches=mkP('A1','2026-07-26','2026-12-09'); recomputeAll();
      advances=[fromDbAdv({id:501,employee_id:1,period:'2026-10',amount:11500,taken_date:'2026-10-15',note:''}),fromDbAdv({id:502,employee_id:1,period:'2026-11',amount:11700,taken_date:'2026-11-15',note:''})];
      pvdMembers=[fromDbPvdM(${PV(1, { er_mode:'match', er_value:50 })})]; pvdEntries=[]; pvdPayouts=[];
      depositEntries=[fromDbDep({id:91,employee_id:1,period:'2026-08',amount:500,note:'lock'}),fromDbDep({id:92,employee_id:1,period:'2026-09',amount:500,note:'lock'})];`);
    await SYNC(A);
    const o0 = payOf(E, 'a', '2026-10'), n0 = payOf(E, 'a', '2026-11');
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('depPeriodSel').value='2026-10';`);
    io.confirms.length = 0;
    await E(`depLockOpen()`);
    E(`(()=>{ const el=document.querySelector('#depLockBody input[data-i="0"]'); el.value='0'; depLockAmt(el); })()`);
    await E(`depLockSave()`); await wait(30);
    const o1 = payOf(E, 'a', '2026-10'), n1 = payOf(E, 'a', '2026-11');
    ok(o0.dep===300 && o0.pvd===200 && n0.dep===0 && n0.pvd===300 && o1.dep===0 && o1.pvd===200 && n1.dep===0 && n1.pvd===300 &&
       rowT(A,'deposit_entries',1,'2026-11') && rowT(A,'deposit_entries',1,'2026-11').amount===0 && rowT(A,'pvd_entries',1,'2026-10').emp_amount===200 &&
       io.confirms.some(m=>/ด้วยยอดที่ต่างจากที่นับในยอดสะสม/.test(m)),
       `พรีวิว 🔒 ต.ค. แก้ 300 → 0 (10 ธ.ค.) → 🔒 พ.ย. เงินประกัน 0 + สำรองฯ ต.ค. 200 / พ.ย. 300 ก่อน (ยอดก่อนแก้) · หลังบันทึก พ.ย. ไม่ถูกหักย้อนหลัง (ได้ ต.ค. ${JSON.stringify(o1)} · พ.ย. ${JSON.stringify(n1)})`);
    for(const who of ['owner', 'dep']){
      const B = boot({ now:'2026-12-10T12:00:00+07:00' }); await wait(300);
      B.E(SEED); B.E(PUN); B.E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
        var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001',deposit_opening:1900}); employees=[a]; punches=[...mkP('A1','2026-07-26','2026-08-25'),...mkP('A1','2026-09-26','2026-12-09')]; recomputeAll();
        depositEntries=[fromDbDep({id:91,employee_id:1,period:'2026-08',amount:500,note:'lock'}),fromDbDep({id:92,employee_id:1,period:'2026-09',amount:500,note:''})];`);
      await SYNC(B);
      if(who === 'dep') B.E(`AUTH={username:'m',role:'staff',apps:{payroll:{dep:'vae'}}}; applyUser(AUTH);`);
      const p0 = [payOf(B.E,'a','2026-10'), payOf(B.E,'a','2026-11')];
      B.E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option value="2026-09">ก.ย.</option>'; document.getElementById('depPeriodSel').value='2026-09';`);
      await B.E(`depLockOpen()`); await B.E(`depLockSave()`); await wait(30);
      const p1 = [payOf(B.E,'a','2026-10'), payOf(B.E,'a','2026-11')];
      ok(p0[0].dep===300 && p0[1].dep===300 && p1[0].dep===300 && p1[1].dep===300 && rowT(B,'deposit_entries',1,'2026-09').note==='lock' && rowT(B,'deposit_entries',1,'2026-09').amount===500 &&
         rowT(B,'deposit_entries',1,'2026-10').amount===300 && rowT(B,'deposit_entries',1,'2026-11').amount===300,
         `${who === 'owner' ? 'เจ้าของ' : 'สิทธิ์ 🛡️'}: 🔒 ก.ย. (✎ 500 ไม่มีวันทำงาน — ล็อกแล้วนับ) ตามยอดที่เสนอ → 🔒 ต.ค./พ.ย. 300/300 ก่อน · ไม่เปลี่ยนย้อนหลัง (ได้ ${p1.map(x=>x.dep).join('/')})`);
    }
  }
  { console.log('[38c ไฟล์ K BIZ งวดนั้นสร้างแล้ว → 💸 คืนในสลิป / ถอนสำรองฯ จ่ายในสลิป / เพิ่มสมาชิก / ✎ สำรองฯ / ฟอร์ม ⚙️ / 🛡️ หัก/เดือน เตือน (ตอบไม่ = ไม่บันทึก)]');
    const KB = /ไฟล์ K BIZ เงินเดือน ต\.ค\. 69 สร้างแล้ว/;
    const base = async () => {
      const A = boot({ now:'2026-11-03T10:00:00+07:00' }); const { E, io, T } = A; await wait(300);
      E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; auditReady=true; depV2Col=true; ${V5}
        var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001',deposit_opening:2500}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'});
        employees=[a,b]; punches=[...mkP('A1','2026-07-26','2026-11-02'),...mkP('B1','2026-09-26','2026-11-02')]; recomputeAll();
        pvdMembers=[fromDbPvdM(${PV(2, { opening_emp:2000 })})]; pvdEntries=[]; pvdPayouts=[]; depositEntries=[];`);
      T.payroll_audit = []; await SYNC(A);
      E(`document.getElementById('periodSel').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('periodSel').value='2026-10'; go('payroll')`);
      io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
      io.confirms.length = 0; io.confirmAns = m => !KB.test(m);
      return A;
    };
    { const A = await base(); const { E, io, T } = A;
      E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('depPeriodSel').value='2026-10';`);
      await E(`depRefundOpen()`); const dlg = E(`document.getElementById('depRefBg').textContent`);
      E(`depRefState.items.forEach(x=>{ if(!x.block) x.on=true; })`); await E(`depRefundSave()`); await wait(20);
      ok(KB.test(dlg) && io.confirms.some(m=>KB.test(m) && /คืนในงวดถัดไป หรือโอนคืนนอกสลิป/.test(m)) && !rowT(A,'deposit_entries',1,'2026-10'),
         '💸 คืนในสลิป ต.ค. หลังสร้างไฟล์ K BIZ ต.ค. → หน้าต่างมีแถบเตือน + ถามก่อนบันทึก (ส่งไฟล์แล้ว = คืนงวดถัดไป/🏦) · ตอบไม่ = ไม่บันทึก');
      E(`go('pvd'); openPvdOut(); pvdOutPick=2; fillPvdOutEmp(''); document.getElementById('pvdOutDate').value='2026-10-25'; pvdOutDateChg(); document.getElementById('pvdOutPeriod').value='2026-10'; document.getElementById('pvdOutAmt').value='1000'; document.getElementById('pvdOutVia').value='slip'; pvdOutHint();`);
      io.confirms.length = 0; await E(`savePvdPayout()`); await wait(20);
      ok(io.confirms.some(m=>KB.test(m)) && !(T.pvd_payouts||[]).length, 'ถอนสำรองฯ "จ่ายในสลิป" ต.ค. หลังสร้างไฟล์ → เตือน · ตอบไม่ = ไม่บันทึก');
      E(`document.getElementById('pvdOutVia').value='cash'; pvdOutHint();`); io.confirms.length = 0; await E(`savePvdPayout()`); await wait(20);
      ok(!io.confirms.some(m=>KB.test(m)) && (T.pvd_payouts||[]).length===1, 'ถอนเป็นเงินสด (ไม่ผ่านสลิป) → ไม่เตือนไฟล์ K BIZ · บันทึกได้');
    }
    { const A = await base(); const { E, io, T } = A;
      E(`go('pvd'); openPvdForm(); pvdEmpPick=1; fillPvdEmp(''); document.getElementById('pvdStart').value='2026-10';
         document.getElementById('pvdEmpVal').value='500'; document.getElementById('pvdErMode').value='match'; document.getElementById('pvdErVal').value='50'; document.getElementById('pvdConsent').checked=true;`);
      await E(`savePvdMember()`); await wait(20);
      ok(io.confirms.some(m=>KB.test(m)) && !(T.pvd_members||[]).some(r=>r.employee_id===1), 'เพิ่มสมาชิกสำรองฯ เริ่ม ต.ค. หลังสร้างไฟล์ ต.ค. → เตือน · ตอบไม่ = ไม่บันทึก');
      io.confirms.length = 0; io.promptAns = ['1000', ''];
      await E(`editPvd(2,'2026-10')`); await wait(20);
      ok(io.confirms.some(m=>KB.test(m)) && !rowT(A,'pvd_entries',2,'2026-10'), '✎ สำรองฯ ต.ค. หลังสร้างไฟล์ → เตือน · ตอบไม่ = ไม่บันทึก');
      E(`go('emp'); openEmpForm(1); document.getElementById('fRate').value='9000';`); io.confirms.length = 0;
      await E(`saveEmpForm()`); await wait(20);
      ok(io.confirms.some(m=>KB.test(m)) && E(`a.rate`)===12000, 'ฟอร์ม ⚙️ ฐานเงินเดือน 12,000 → 9,000 หลังสร้างไฟล์ ต.ค. → เตือน · ตอบไม่ = ไม่บันทึก');
      E(`go('dep')`); io.confirms.length = 0;
      await E(`updDepField(2,'deposit_monthly',1000)`); await wait(20);
      ok(io.confirms.some(m=>KB.test(m)) && E(`b.depMonthly`)===300, '🛡️ หัก/เดือน 300 → 1,000 หลังสร้างไฟล์ ต.ค. → เตือน · ตอบไม่ = ไม่บันทึก');
    }
  }
  { console.log('[38d แก้/เพิ่มสแกนงวด ก.ย. (ก่อน ต.ค. · จ่ายแล้ว 5 ต.ค.) → ไม่มีวันทำงาน = 🔒 0 ก่อน · มีวันทำงาน = เตือน "คิดใหม่" (ไม่ล็อกให้ — M1) แม้ ต.ค. ยังไม่จ่าย]');
    for(const now of ['2026-10-20T12:00:00+07:00', '2026-11-10T12:00:00+07:00']){
      const lbl = now.slice(5, 10);
      { const A = boot({ now }); const { E, io, T } = A; await wait(300);
        E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
          var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a];
          punches=[...mkP('A1','2026-07-26','2026-08-25'), ...mkP('A1','2026-09-10','2026-09-10'), ...mkP('A1','2026-09-26','${now.slice(0,10)}')]; recomputeAll(); depositEntries=[];`);
        await SYNC(A);
        const s0 = E(`depositCalc(a,'2026-09').ded`);
        E(`go('detail'); openPunchEdit(1,'2026-09-10')`); io.confirms.length = 0; io.confirmAns = m => !/คิดใหม่ตามค่าที่แก้/.test(m);
        await E(`delPunchDay()`); await wait(20);
        ok(s0===500 && E(`depositCalc(a,'2026-09').ded`)===500 && io.confirms.some(m=>/งวดก่อน ต\.ค\. 69 ที่ยังไม่ 🔒/.test(m) && /ก\.ย\. 69 ตอนนี้ 500/.test(m)),
           `${lbl}: ลบสแกนวันเดียวของ ก.ย. → เตือน "ก.ย. ตอนนี้ 500 จะคิดใหม่ — ยอดถูกแล้วให้ยกเลิกไป 🔒 ก่อน" · ตอบไม่ = ไม่ลบ (ก.ย. ยัง 500)`);
      }
      { const A = boot({ now }); const { E, io, T } = A; await wait(300);
        E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
          var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a];
          punches=[...mkP('A1','2026-07-26','2026-08-25'), ...mkP('A1','2026-09-26','${now.slice(0,10)}')]; recomputeAll(); depositEntries=[];`);
        await SYNC(A);
        const n0 = E(`depositCalc(a,'2026-10').before`);
        E(`go('detail'); openPunchEdit(1,'2026-09-10'); document.getElementById('pIn').value='09:00'; document.getElementById('pOut').value='18:00';`); io.confirms.length = 0;
        await E(`savePunchEdit()`); await wait(20);
        const L = rowT(A, 'deposit_entries', 1, '2026-09');
        ok(L && L.amount===0 && L.note==='lock' && E(`depositCalc(a,'2026-09').ded`)===0 && E(`depositCalc(a,'2026-10').before`)===n0 && E(`empPeriodSet(a).has('2026-09')`),
           `${lbl}: เพิ่มสแกน ก.ย. ให้คนที่ไม่มีวันทำงาน ก.ย. → 🔒 ก.ย. 0 ก่อน (ไม่ได้หักแน่นอน) · ยอดสะสมก่อน ต.ค. เท่าเดิม ${n0} (ไม่หักย้อนหลัง)`);
      }
    }
  }
  { console.log('[38e ฟอร์ม ⚙️: ดึงเพื่อนร่วมสาขามาล็อกเฉพาะงวดทิปที่คนนั้นเป็นตัวหารจริง (แบบ delEmp)]');
    const sc = async apps => {
      const A = boot({ now:'2026-11-10T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
      E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); tipReady=true; pvdReady=true; pvdLoadErr=''; ${V5}
        var m=V({id:1,code:'M1',nick:'เมย์',bank_account:'1000000001'}), n=V({id:2,code:'N1',nick:'นิว',bank_account:'1000000002',start_date:'2026-11-01'}), o=V({id:3,code:'O1',nick:'โอ',bank_account:'1000000003'});
        employees=[m,n,o]; punches=[...mkP('M1','2026-09-26','2026-11-09'), ...mkP('O1','2026-09-26','2026-11-09'), ...mkP('N1','2026-11-01','2026-11-09')]; recomputeAll();
        tips=[fromDbTip({id:71,period:'2026-10',branch:'JJLP',amount:1000,member_ids:''})];
        pvdMembers=[fromDbPvdM(${PV(1, { er_mode:'match', er_value:50 })})]; pvdEntries=[]; pvdPayouts=[]; depositEntries=[];`);
      await SYNC(A);
      if(apps) E(`AUTH={username:'h',role:'staff',apps:{payroll:${JSON.stringify(apps)}}}; applyUser(AUTH);`);
      E(`go('emp'); openEmpForm(2); document.getElementById('fActive').value='0';`); io.confirms.length = 0;
      await E(`saveEmpForm()`); await wait(20);
      return { A, saved: E(`!n.active`)===true, confirms: io.confirms.length, locks: (T.deposit_entries||[]).length + (T.pvd_entries||[]).length };
    };
    const h = await sc({ emp:'vaed' });
    ok(h.saved && !h.confirms && !h.locks, `HR (ไม่มีสิทธิ์ 🐷) ตั้งพนักงานใหม่ (เริ่ม พ.ย. ไม่มีวันทำงาน ต.ค.) พ้นสภาพ → บันทึกได้ ไม่ถาม/ไม่ล็อกเพื่อน (ตัวหารทิป ต.ค. ไม่เปลี่ยน)`);
    const w = await sc(null);
    ok(w.saved && !w.confirms && !w.locks, 'เจ้าของ: ไม่ถาม/ไม่เขียนแถว 🔒 ของเพื่อนร่วมสาขา');
    { const A = w.A, { E, io, T } = A;
      E(`openEmpForm(3); document.getElementById('fActive').value='0';`); io.confirms.length = 0;
      await E(`saveEmpForm()`); await wait(20);
      ok(E(`!o.active`)===true && io.confirms.length===1 && rowT(A,'deposit_entries',1,'2026-10') && rowT(A,'pvd_entries',1,'2026-10'),
         'ตั้ง "โอ" (มีวันทำงาน ต.ค. = ตัวหารทิป) พ้นสภาพ → ถาม + 🔒 ต.ค. ของเพื่อนร่วมสาขา (เมย์: เงินประกัน + สำรองฯ) ก่อน');
    }
  }
  { console.log('[38f K BIZ: สิทธิ์ 🛡️ ครบแต่ไม่มี 🐷 → ล็อกเงินประกันงวดก่อนได้ (สำรองฯ ข้าม + เตือน) · วันจ่ายเป็นค่าที่ต้อง 🔒 ก่อนแก้]');
    const A = boot({ now:'2026-12-03T10:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5} ${W6}
      employees=[a,b]; punches=[...mkP('A1','2026-09-26','2026-12-02'),...mkP('B1','2026-09-26','2026-12-02')]; recomputeAll();
      pvdMembers=[fromDbPvdM(${PV(2)})]; pvdEntries=[]; pvdPayouts=[]; depositEntries=[];`);
    await SYNC(A);
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{payroll:'vae',dep:'vaed'}}}; applyUser(AUTH);`);
    E(`document.getElementById('periodSel').innerHTML='<option value="2026-11">พ.ย.</option>'; document.getElementById('periodSel').value='2026-11'; go('payroll')`);
    io.promptAns = [undefined]; await E(`exportKbizPay('')`); await wait(50);
    const res = A.d.getElementById('kbizResBg').textContent;
    ok((T.deposit_entries||[]).filter(r=>r.period==='2026-10').length===2 && !(T.pvd_entries||[]).length && /ให้ผู้มีสิทธิ์หน้า 🐷 กด 🔒/.test(res),
       `สิทธิ์ 🛡️ (ไม่มี 🐷) สร้าง K BIZ พ.ย. → 🔒 เงินประกัน ต.ค. 2 คน · สำรองฯ ข้าม + เตือนในผล (ได้ ${(T.deposit_entries||[]).length} แถว)`);
    const B = boot({ now:'2026-11-10T12:00:00+07:00' }); await wait(300);
    B.E(SEED); B.E(PUN); B.E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=true; pvdLoadErr=''; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-09-26','2026-11-09'); recomputeAll();
      advances=[fromDbAdv({id:501,employee_id:1,period:'2026-10',amount:11500,taken_date:'2026-10-15',note:''})];
      pvdMembers=[fromDbPvdM(${PV(1)})]; pvdEntries=[]; pvdPayouts=[]; depositEntries=[];`);
    await SYNC(B);
    const p0 = payOf(B.E, 'a', '2026-10');
    B.E(`go('settings')`); B.io.confirms.length = 0;
    await B.E(`saveSetting('pay_day', 15)`); await wait(20);
    const c1 = B.io.confirms.some(m=>/แก้ตั้งค่า "วันจ่าย"/.test(m));
    B.E(`go('adv')`); await B.E(`delAdv(501)`); await wait(20);
    const p1 = payOf(B.E, 'a', '2026-10');
    ok(c1 && p0.dep===300 && p0.pvd===200 && p1.dep===300 && p1.pvd===200,
       `เลื่อนวันจ่าย 5 → 15 (10 พ.ย. · ต.ค. จ่ายแล้ว) → 🔒 ต.ค. ด้วยวันจ่ายเดิมก่อน · ลบเบิก ต.ค. ทีหลังไม่เปลี่ยนเงินประกัน/สำรองฯ (${p0.dep}/${p0.pvd} → ${p1.dep}/${p1.pvd})`);
  }
  { console.log('[38g 💸 เปิดหน้าต่างค้างจนเลยวันก่อนวันจ่าย → บันทึกไม่ได้ (เช็คซ้ำ) · 🏦 คนออกช่วงรอยต่องวด แนะนำงวดแรกที่ไม่มีวันทำงาน · ข้อความ "ถึงกำหนดจ่าย"]');
    const A = boot({ now:'2026-11-03T21:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    T.deposit_entries = [{id:1,employee_id:7,period:'2026-08',amount:2500,note:'lock'},{id:2,employee_id:7,period:'2026-09',amount:2500,note:'lock'},
                         {id:3,employee_id:8,period:'2026-08',amount:2500,note:'lock'},{id:4,employee_id:8,period:'2026-09',amount:2500,note:'lock'}];
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); depV2Col=true; ${V5}
      var a=V({id:7,code:'A1',nick:'เอ',bank_account:'1000000001'}), q=V({id:8,code:'Q1',nick:'ออก27',active:false,end_date:'2026-10-27'});
      employees=[a,q]; shifts={A1:mk('2026-07-26','2026-11-03'), Q1:mk('2026-07-26','2026-10-27')};`);
    await E(`depRefresh()`);
    E(`go('dep'); document.getElementById('depPeriodSel').innerHTML='<option value="2026-10">ต.ค.</option>'; document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await E(`depRefundOpen()`);
    const it = JSON.parse(E(`JSON.stringify(depRefState.items.map(x=>({n:x.e.nick,on:x.on,block:x.block})))`));
    const qb = (it.find(x=>x.n==='ออก27')||{}).block || '';
    ok(/บันทึก 🏦 ในงวด ธ\.ค\. 2569/.test(qb) && /โอนไปแล้ว: ห้ามโอนซ้ำ/.test(qb), `คนออก 27 ต.ค. (มีวันทำงานทั้ง ต.ค./พ.ย.) → แนะนำบันทึก 🏦 ใน ธ.ค. (งวดแรกที่ไม่มีวันทำงาน) + "โอนไปแล้ว: ห้ามโอนซ้ำ" (ได้ "${qb.slice(0, 120)}")`);
    A.setNow('2026-11-04T09:00:00+07:00'); io.alerts.length = 0;
    await E(`depRefundSave()`); await wait(20);
    ok(!T.deposit_entries.some(r=>r.employee_id===7 && r.period==='2026-10') && io.alerts.some(m=>/เลยกำหนดสร้างไฟล์โอนงวดนี้แล้ว/.test(m)),
       'เปิดหน้าต่าง 3 พ.ย. 21:00 แล้วกดยืนยัน 4 พ.ย. 09:00 (วันก่อนวันจ่าย) → ไม่บันทึก 💸 · แจ้ง "เลยกำหนดสร้างไฟล์โอนงวดนี้แล้ว"');
    ok(/ถึงกำหนดจ่ายงวดนี้แล้ว \(วันจ่าย 5 พ\.ย\./.test(E(`depRefBlock({ e:q, d:depositCalc(q,'2026-10'), xf:true, act:false, row:null }, '2026-10')`)),
       '🏦 วันก่อนวันจ่าย → เหตุผล "ถึงกำหนดจ่ายงวดนี้แล้ว (วันจ่าย …)" (ไม่ใช่ "เลยวันจ่าย")');
  }
  { console.log('[38h เหตุผล 🔒/สลิป: สุทธิก่อนหักเงินประกันปัดลง 2 ตำแหน่ง (ตรงกับที่หักได้ floor)]');
    const A = boot({ now:'2026-10-28T12:00:00+07:00' }); const { E } = A; await wait(300);
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1111111111'}); employees=[a]; shifts={A1:mk('2026-07-26','2026-10-25')};
      adjustments=[{id:1,empId:1,period:'2026-10',kind:'deduct',reason:'x',amount:11700.004}]; depositEntries=[];`);
    const d = JSON.parse(E(`JSON.stringify((d=>({ded:d.ded,cap:d.cap,txt:depCapTxt(d),note:depLockNote(d)}))(depositCalc(a,'2026-10')))`));
    ok(d.ded===299 && d.cap==='short' && /เหลือ 299\.99/.test(d.txt) && d.note==='lock:short:300:299.99', `สุทธิ 299.996 → หักได้ 299 · เหตุผล "เหลือ 299.99" · lock:short:300:299.99 (เดิม 300.00 · ได้ ${JSON.stringify(d)})`);
  }
  // ============ 39) รอบ 7: 🔒 อัตโนมัติวันจ่าย — วันจ่ายออฟฟิศ · สแกน/พนักงานค้าง · โหลดใหม่ระหว่างล็อก · ก้อนล้ม/ลองใหม่ · ประวัติบรรทัดเดียว — บาทจริง ============
  const ADJ = (id, amt) => `(()=>{ const s=document.getElementById('adjPeriod'); if(![...s.options].some(o=>o.value==='2026-10')){ const o=document.createElement('option'); o.value='2026-10'; o.textContent='2026-10'; s.appendChild(o); }
      document.getElementById('adjEmpId').value='${id}'; document.getElementById('adjKind').value='deduct'; document.getElementById('adjReason').value='ของเสียหาย';
      document.getElementById('adjAmount').value='${amt}'; s.value='2026-10'; })()`;
  { console.log('[39a รอบ 10: ออฟฟิศวันจ่าย (31 ต.ค. = วันสุดท้ายของงวด) ไม่ 🔒 อัตโนมัติ — แก้รายการ ต.ค. หลังสร้างไฟล์ K BIZ = เตือน · จบงวดแล้วกด 🔒 = ยอดในไฟล์ · หลัง 🔒 แก้ได้ไม่เปลี่ยนเงินประกัน]');
    const A = boot({ now:'2026-10-30T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var o=V({id:7,code:'O1',nick:'โอ',branch:'OFFICE',bank_account:'1000000007',rate:15000}); employees=[o]; punches=mkP('O1','2026-07-26','2026-10-30'); recomputeAll();
      depositEntries=[fromDbDep({id:81,employee_id:7,period:'2026-08',amount:500,note:'lock'}),fromDbDep({id:82,employee_id:7,period:'2026-09',amount:500,note:'lock'})];
      advances=[fromDbAdv({id:701,employee_id:7,period:'2026-10',amount:Math.round(calcPay(o,'2026-10',true)-200),taken_date:'2026-10-15',note:''})];`);
    await SYNC(A); T.payroll_audit = [{ id:1, action:'kbiz', tbl:'kbiz_pay', detail:'สร้างไฟล์โอนเงินเดือน ต.ค. 69 ออฟฟิศ [p:2026-10] [br:OFFICE]', username:'o' }];
    const k = payOf(E, 'o', '2026-10');
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{payroll:'vae',detail:'vaed'}}}; applyUser(AUTH); ${AUTO}`);
    io.confirmAns = () => false; io.confirms.length = 0;
    const g30 = await E(`depPaidGuard([o], '2026-10', 'ทดสอบ')`);
    A.setNow('2026-10-31T10:00:00+07:00'); io.confirms.length = 0;
    const g31 = await E(`depPaidGuard([o], '2026-10', 'หักเงิน 150')`);
    ok(k.dep===200 && k.cap==='short' && !g30 && !g31 && io.confirms.length===1 && /ไฟล์ K BIZ เงินเดือน ต\.ค\. 69 ออฟฟิศ สร้างแล้ว \(งวดยังไม่ปิด\)/.test(io.confirms[0]) && /ต้องสร้างไฟล์ K BIZ ใหม่/.test(io.confirms[0]) &&
       !T.deposit_entries.some(r=>r.period==='2026-10'),
       `ไฟล์ K BIZ ต.ค. ออฟฟิศ (30 ต.ค.) หัก 200 short · 31 ต.ค. (วันจ่าย · งวดยังไม่จบ) แก้ค่าของ ต.ค. → เตือน "ไฟล์ K BIZ … สร้างแล้ว (งวดยังไม่ปิด) — ต้องสร้างไฟล์ใหม่" · ตอบไม่ = ไม่บันทึก`);
    io.confirmAns = null;
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);`);
    A.setNow('2026-10-31T06:05:00+07:00'); await E(`payDayLock('load')`); E(`payLockTick()`); await wait(120);
    ok(!T.deposit_entries.some(r=>r.period==='2026-10'), '31 ต.ค. ตี 6 (วันจ่ายออฟฟิศ · เครื่องเจ้าของเปิดอยู่) → รอบ 10: ไม่ 🔒 อัตโนมัติ (งวดยังไม่จบ — ยอดยังเปลี่ยนตามสแกนวันนี้)');
    A.setNow('2026-11-01T07:00:00+07:00'); E(`payLockTick()`); await wait(120);
    ok(!T.deposit_entries.some(r=>r.period==='2026-10'), '1 พ.ย. (ข้ามวัน) → ออฟฟิศยังไม่ 🔒 เอง (กด 🔒 / ไฟล์ K BIZ งวดถัดไป)');
    E(`go('dep'); renderDeposit(); document.getElementById('depPeriodSel').value='2026-10';`);
    await E(`depLockOpen()`); await E(`depLockSave()`); await wait(30);
    const L = rowT(A, 'deposit_entries', 7, '2026-10');
    ok(L && L.amount===200 && L.note==='lock:short:300:200', `1 พ.ย. เจ้าของกด 🔒 ต.ค. → 200 (lock:short:300:200) = calcPay ทั้งงวดที่จบแล้ว = ยอดในไฟล์ K BIZ (ได้ ${JSON.stringify(L)})`);
    io.confirms.length = 0;
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{payroll:'vae',detail:'vaed'}}}; applyUser(AUTH); go('detail'); ` + ADJ(7, 150)); await E(`saveAdj()`); await wait(30);
    const a1 = payOf(E, 'o', '2026-10');
    ok(T.adjustments.some(r=>r.employee_id===7 && +r.amount===150) && !io.confirms.length && a1.dep===200 && Math.round(a1.net)===Math.round(k.net)-150,
       `หลัง 🔒: ผจก. หักเงิน 150 ของ ต.ค. → บันทึกได้ ไม่ถาม · เงินประกัน ต.ค. ยัง 200 (สุทธิ ${k.net} → ${a1.net})`);
  }
  { console.log('[39b สองเครื่อง: เครื่องที่เปิดค้างไม่รู้ว่าอีกเครื่องลบสแกน (realtime รับแค่ INSERT) / พลาด INSERT ตอนจอดับ → 🔒 อัตโนมัติอ่านสแกนช่วงงวดใหม่ก่อน = ยอดตามสลิปที่จ่ายจริง]');
    const A = boot({ now:'2026-11-03T12:00:00+07:00' }); await wait(300);
    const B = boot({ now:'2026-11-03T12:00:00+07:00', db:A.db }); await wait(300);
    const SET = (x, y) => `AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var x=V({id:2,code:'X1',nick:'เอ็กซ์',wage_type:'daily',rate:500,bank_account:'1000000002'}), y=V({id:3,code:'Y1',nick:'วาย',wage_type:'daily',rate:500,bank_account:'1000000003'});
      employees=[x,y]; punches=[...mkP('X1','2026-07-26','2026-11-02'${x}), ...mkP('Y1','2026-07-26','2026-11-02'${y})]; recomputeAll();
      depositEntries=[2,3].flatMap(i=>['2026-08','2026-09'].map((p,j)=>fromDbDep({id:i*10+j,employee_id:i,period:p,amount:500,note:'lock'})));
      advances=[fromDbAdv({id:801,employee_id:2,period:'2026-10',amount:14900,taken_date:'2026-10-15',note:''}),fromDbAdv({id:802,employee_id:3,period:'2026-10',amount:14700,taken_date:'2026-10-15',note:''})];`;
    for(const X of [A, B]) { X.E(SEED); X.E(PUN); }
    A.E(SET(``, `, null, null, k=>k==='2026-10-14'`));                    // A: วาย 14 ต.ค. ยังไม่มา (พลาด INSERT ตอนจอดับ) · เอ็กซ์ครบ
    B.E(SET(`, null, null, k=>k==='2026-10-15'`, ``));                    // B (= ฐานข้อมูล): ลบสแกนผิดของเอ็กซ์ 15 ต.ค. · วาย 14 ต.ค. มาแล้ว
    await SYNC(B); A.E(`moneyTblSig={}`); await A.E(`moneyTblRefresh(true)`);
    const bx = payOf(B.E, 'x', '2026-10'), by = payOf(B.E, 'y', '2026-10'), ax = payOf(A.E, 'x', '2026-10'), ay = payOf(A.E, 'y', '2026-10');
    A.E(AUTO); A.setNow('2026-11-05T07:00:00+07:00');
    await A.E(`payDayLock('day')`);
    const LX = rowT(A, 'deposit_entries', 2, '2026-10'), LY = rowT(A, 'deposit_entries', 3, '2026-10');
    ok(bx.dep===0 && bx.cap==='neg' && by.dep===300 && ax.dep===100 && ay.dep===0 && LX && LX.amount===0 && /^lock:neg:300:/.test(LX.note) && LY && LY.amount===300 && LY.note==='lock',
       `สลิปที่จ่าย (ฐานข้อมูล) เอ็กซ์ 0 neg · วาย 300 — เครื่องค้างคิด ${ax.dep}/${ay.dep} → 🔒 ${LX && LX.amount} (${LX && LX.note}) / ${LY && LY.amount} (${LY && LY.note}) ตามฐานข้อมูล`);
    const ax2 = payOf(A.E, 'x', '2026-10'), ay2 = payOf(A.E, 'y', '2026-10');
    ok(ax2.net===bx.net && ay2.net===by.net && A.E(`punches.filter(p=>p.code==='X1'&&p.date==='2026-10-15').length`)===0 && A.E(`punches.filter(p=>p.code==='Y1'&&p.date==='2026-10-14').length`)===2,
       'เครื่องที่ค้าง: สแกนช่วงงวดถูกแทนด้วยของในฐานข้อมูล → สลิป ต.ค. ตรงสลิปที่จ่าย (สุทธิ ' + ax2.net + '/' + ay2.net + ')');
    // เปิดแอปหลังวันจ่าย สแกนงวดที่จ่ายมาจากแคช (ค้าง) — เครื่องใหม่ C ใช้สแกนชุดเดียวกับ A ก่อนล็อก (เหมือนแคช) แต่ฐานข้อมูลเป็นของ B
    const C = boot({ now:'2026-11-06T12:00:00+07:00' }); await wait(300);
    C.E(SEED); C.E(PUN); C.E(SET(``, `, null, null, k=>k==='2026-10-14'`));
    C.T.punches = JSON.parse(JSON.stringify(A.T.punches)); C.T.employees = JSON.parse(JSON.stringify(A.T.employees)); C.T.advances = JSON.parse(JSON.stringify(A.T.advances));
    C.T.deposit_entries = A.T.deposit_entries.filter(r=>r.period!=='2026-10').map(r=>({...r})); C.T.shifts = JSON.parse(JSON.stringify(A.T.shifts));
    C.E(`moneyTblSig={}`); await C.E(`moneyTblRefresh(true)`); C.E(AUTO);
    await C.E(`payDayLock('load')`);
    ok(rowT(C,'deposit_entries',2,'2026-10').amount===0 && rowT(C,'deposit_entries',3,'2026-10').amount===300, 'เปิดแอปหลังวันจ่ายด้วยแคชค้าง → 🔒 ตามฐานข้อมูล (0 / 300)');
    A.db.fail.punches = { message:'timeout' }; A.T.deposit_entries = A.T.deposit_entries.filter(r=>r.period!=='2026-10'); await A.E(`depRefresh(true)`);
    const r0 = await A.E(`payDayLock('load')`);
    ok(r0 && r0.fail && !A.T.deposit_entries.some(r=>r.period==='2026-10') && A.E(`payLockRetryAt`) > 0, 'อ่านสแกนใหม่ไม่ได้ → ไม่ล็อก · ตั้งเวลาลองใหม่');
    delete A.db.fail.punches;
  }
  { console.log('[39c เครื่องที่พลาด realtime UPDATE ของ employees (ค่าแรงเปลี่ยน) → 🔒 อัตโนมัติอ่านค่าที่คิดเงินของพนักงานใหม่ก่อน · คนที่ถูกลบในฐานข้อมูลแล้ว = ไม่ล็อก (ไม่ชน FK)]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var q=V({id:3,code:'Q1',nick:'คิว',bank_account:'1000000003'}), z=V({id:9,code:'Z1',nick:'ซี',bank_account:'1000000009'});
      employees=[q,z]; punches=[...mkP('Q1','2026-07-26','2026-11-05'), ...mkP('Z1','2026-07-26','2026-11-05')]; recomputeAll();
      advances=[fromDbAdv({id:901,employee_id:3,period:'2026-10',amount:11800,taken_date:'2026-10-15',note:''})]; depositEntries=[];`);
    V1LOCK(A); await SYNC(A);
    T.employees = T.employees.filter(r => r.id !== 9).map(r => r.id === 3 ? { ...r, rate:11500 } : r);   // อีกเครื่องลดฐาน คิว 12,000 → 11,500 · ลบ ซี
    E(`empCols = new Set(${JSON.stringify(Object.keys(T.employees[0]))})`);
    const s0 = payOf(E, 'q', '2026-10');
    E(AUTO); await E(`payDayLock('load')`);
    const L = rowT(A, 'deposit_entries', 3, '2026-10');
    ok(s0.dep===200 && L && L.amount===0 && L.note==='lock:neg:300:-300' && !rowT(A,'deposit_entries',9,'2026-10') && E(`q.rate`)===11500 && !E(`employees.some(e=>e.id===9)`),
       `ค่าแรงในเครื่อง 12,000 (คิด 200) → อ่านใหม่ 11,500 → 🔒 0 lock:neg:300:-300 ตามสลิปที่จ่าย · ซี (ถูกลบแล้ว) ไม่ถูกเขียน (ได้ ${JSON.stringify(L)})`);
  }
  { console.log('[39d บัญชี _br กด 🔄 ระหว่าง 🔒 อัตโนมัติรออ่านข้อมูล → รอบเดิมเลิกเงียบ ๆ (ไม่ล็อกคนสาขาอื่น) · loadAll ตัดสาขาก่อนใส่รายชื่อ]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var l=V({id:1,code:'L1',nick:'แอล',bank_account:'1000000001'}), r=V({id:2,code:'R1',nick:'อาร์',branch:'JJRD',bank_account:'1000000002'});
      employees=[l,r]; punches=[...mkP('L1','2026-07-26','2026-11-05'), ...mkP('R1','2026-07-26','2026-11-05')]; recomputeAll(); depositEntries=[];`);
    V1LOCK(A); await SYNC(A);
    T.payroll_settings = [{ id:1, cutoff_hour:6, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08', single_fine:200, month_divisor:30, must_work_days:'5,6,0', must_work_fine:400 }];
    T.devices = [];
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{_br:'JJRD',dep:'vaed',payroll:'v'}}}; applyUser(AUTH); payLockAuto=false;`);
    await E(`loadAll()`); await wait(100);
    ok(E(`employees.length`)===1 && E(`employees[0].id`)===2 && !T.deposit_entries.some(x=>x.period>='2026-10'), 'โหลดครั้งแรก (บัญชี _br รัชดา) → เห็นเฉพาะอาร์ · ยังไม่ล็อก (ปิดสวิตช์ไว้)');
    E(`payLockAuto=true; payLockReady=true;`);
    A.db.latency = (t, op) => (t === 'adjustments' || t === 'punches') && op === 'select' ? 120 : 0;
    const p1 = E(`payDayLock('load')`); await wait(30);
    const p2 = E(`loadAll()`); await wait(40);
    const mid = E(`employees.some(e=>e.branch!=='JJRD')`);
    const r1 = await p1; await p2; A.db.latency = null; await wait(400);
    const rows = JSON.stringify(T.deposit_entries.filter(x=>x.period>='2026-10').map(x=>[x.employee_id, x.amount, x.note]));
    ok(r1 && r1.abort && !mid && rows===JSON.stringify([[2,300,'lock']]),
       `รอบที่ค้างอยู่เลิก (${JSON.stringify(r1)}) · ระหว่างโหลดไม่มีคนสาขาอื่นในรายชื่อ · รอบใหม่หลังโหลดล็อกเฉพาะอาร์ (ได้ ${rows})`);
  }
  { console.log('[39e ก้อนหนึ่งเขียนไม่ได้ ไม่หยุดก้อนอื่น/สำรองฯ · ล้มแล้วลองใหม่ภายในวันจ่าย (5 นาที) · เปิดแท็บระหว่างรอไม่ยิงเน็ต · ประวัติ 1 บรรทัดต่อรอบพร้อมรายแถว]');
    const A = boot({ now:'2026-11-05T09:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; pvdReady=true; pvdLoadErr=''; ${V5}
      var es=[...Array(13)].map((_,i)=>V({id:i+1,code:'E'+(i+1),nick:'คน'+(i+1),bank_account:'10000000'+String(i+1).padStart(2,'0')}));
      employees=es; punches=es.flatMap(e=>mkP(e.code,'2026-07-26','2026-11-04')); recomputeAll(); depositEntries=[];
      pvdMembers=[fromDbPvdM(${PV(13)})]; pvdEntries=[]; pvdPayouts=[];`);
    V1LOCK(A); await SYNC(A); T.payroll_audit = []; E(AUTO);
    A.db.wfail = (t, op, rows) => t === 'deposit_entries' && rows.some(r => r.employee_id === 5) ? { code:'23503', message:'insert or update on table "deposit_entries" violates foreign key constraint' } : null;
    const r1 = await E(`payDayLock('load')`);
    const dep1 = T.deposit_entries.filter(r=>r.period==='2026-10').length, pvd1 = (T.pvd_entries||[]).filter(r=>r.period==='2026-10').length;
    ok(r1 && r1.err && dep1===3 && pvd1===1 && /⚠️ ไม่สำเร็จ 10 แถว/.test(toastT(A)) && E(`payLockRetryAt`) > Date.parse('2026-11-05T09:04:00+07:00'),
       `ก้อนแรก (10 คน) ล้ม → ก้อนที่สอง 3 คน + สำรองฯ 1 แถวยังล็อก · toast บอกส่วนที่ล้ม · ตั้งเวลาลองใหม่ (ได้ ${dep1}+${pvd1} · ${toastT(A).slice(0,80)})`);
    const au = T.payroll_audit;
    ok(au.length===1 && au[0].action==='autolock' && (au[0].detail.match(/"employee_id":/g)||[]).length===4 && /⚠️ ไม่สำเร็จ 10 แถว/.test(au[0].detail),
       `payroll_audit 1 บรรทัดต่อรอบ (ไม่มีบรรทัด upsert รายก้อน) · มีรายแถว "employee_id" 4 แถว (ก้อน 9 ไล่รายคนได้) (ได้ ${au.length} บรรทัด: ${au.map(x=>x.action).join(',')})`);
    A.db.wfail = null; let reads = 0; A.db.latency = () => { reads++; return 0; };
    await E(`payDayLock('tab')`);
    ok(reads===0 && T.deposit_entries.filter(r=>r.period==='2026-10').length===3, `กลับมาเปิดแท็บระหว่างรอลองใหม่ → ไม่ยิงเน็ต (${reads})`);
    A.setNow('2026-11-05T09:06:00+07:00'); E(`payLockTick()`); await wait(150);
    ok(T.deposit_entries.filter(r=>r.period==='2026-10').length===13 && T.payroll_audit.filter(x=>x.action==='autolock').length===2 && E(`payLockRetryAt`)===0,
       'ครบ 5 นาที (payLockTick) → ลองใหม่ → 🔒 ครบ 13 คน · ประวัติรอบที่สอง 1 บรรทัด · ล้างตัวนับ');
    A.db.latency = null;
  }
  { console.log('[39f 🔒 0 ของคนที่ไม่เคยมีวันทำงาน (รับแล้วไม่มา/แถวสร้างผิด) ไม่นับเป็นประวัติเงิน → ลบพนักงานได้ · 🔒 0 แบบสุทธิติดลบยังนับ]');
    const A = boot({ now:'2026-11-06T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), n=V({id:2,code:'N1',nick:'ไม่มา',start_date:'2026-10-01',deposit_target_v1:null,deposit_monthly_v1:null});
      employees=[a,n]; punches=mkP('A1','2026-07-26','2026-11-05'); recomputeAll(); depositEntries=[];`);
    await SYNC(A); E(AUTO); await E(`payDayLock('load')`);
    const z = rowT(A, 'deposit_entries', 2, '2026-10');
    E(`AUTH={username:'h',role:'staff',apps:{payroll:{emp:'vaed'}}}; applyUser(AUTH); go('emp');`); io.alerts.length = 0; io.confirms.length = 0;
    await E(`delEmp(2)`); await wait(20);
    ok(z && z.amount===0 && z.note==='lock' && !io.alerts.length && !T.employees.some(r=>r.id===2) && !E(`employees.some(e=>e.id===2)`),
       `ไม่มา (เริ่ม 1 ต.ค. ไม่มีสแกน) ได้ 🔒 0 → HR ลบได้ (confirm ปกติ · ไม่ขึ้น "มียอด/ประวัติเงินประกัน") (alert ${JSON.stringify(io.alerts)})`);
    E(`var b=V({id:3,code:'B1',nick:'บี'}); employees.push(b); depositEntries.push(fromDbDep({id:77,employee_id:3,period:'2026-10',amount:0,note:'lock:neg:300:-50'}))`);
    T.employees.push({ id:3, code:'B1', nick:'บี', branch:'JJLP', active:true }); T.deposit_entries.push({ id:77, employee_id:3, period:'2026-10', amount:0, note:'lock:neg:300:-50' });
    io.alerts.length = 0; await E(`delEmp(3)`);
    ok(io.alerts.some(m=>/ลบ "บี" ไม่ได้/.test(m)) && T.employees.some(r=>r.id===3), '🔒 0 เพราะสุทธิติดลบ (มีวันทำงาน · จำเหตุผล neg) → ยังนับเป็นประวัติ ลบไม่ได้');
  }
  { console.log('[39g แก้/ลบเวลาสแกน ก.ย. (จ่ายแล้ว ยังไม่ 🔒) ที่ไม่เปลี่ยน "มีวันทำงาน" ของงวด → ไม่ถาม (เงินประกันงวดก่อน ต.ค. ไม่เปลี่ยน)]');
    const A = boot({ now:'2026-10-21T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'m',role:'staff',apps:{payroll:{detail:'vaed'}}}; applyUser(AUTH); ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-07-26','2026-10-20'); recomputeAll(); depositEntries=[];`);
    await SYNC(A);
    const d0 = E(`depositCalc(a,'2026-09').ded`);
    E(`go('detail'); openPunchEdit(1,'2026-09-20'); document.getElementById('pIn').value='09:30'; document.getElementById('pOut').value='18:00';`); io.confirms.length = 0;
    await E(`savePunchEdit()`); await wait(20);
    ok(!io.confirms.length && T.punches.some(r=>r.emp_code==='A1' && r.punch_date==='2026-09-20' && /^09:30/.test(r.punch_time)) && E(`depositCalc(a,'2026-09').ded`)===d0,
       `ผจก. (ไม่มี 🛡️) เลื่อนเวลาเข้า 20 ก.ย. 08:58 → 09:30 → บันทึกได้ ไม่ถาม · เงินประกัน ก.ย. ${d0} เท่าเดิม`);
    E(`openPunchEdit(1,'2026-09-21')`); io.confirms.length = 0;
    await E(`delPunchDay()`); await wait(20);
    ok(io.confirms.length===1 && /ทั้งวัน/.test(io.confirms[0]) && !T.punches.some(r=>r.emp_code==='A1' && r.punch_date==='2026-09-21'), 'ลบสแกน 21 ก.ย. (ยังมีวันอื่นใน ก.ย.) → ถามแค่ "ลบ…ทั้งวัน?" ไม่เตือนงวดก่อน ต.ค.');
  }
  // ============ 40) รอบ 8 (ผู้สั่งงานตัดสิน): 🔒 อัตโนมัติวันจ่ายเขียนได้เฉพาะหลัง loadAll ที่อ่านครบทุกตารางเงินในรอบนั้น — บาทจริง ============
  // ฐานข้อมูลจำลองเป็นต้นทาง (แอปอ่านด้วย loadAll จริง) · เครื่องค้าง = เปิดไว้ก่อนแล้วพลาด realtime
  const R8 = (() => {
    const ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const punRows = (code, from, to, tin, tout) => { const out = [];
      for(let d = new Date(from+'T12:00:00'); ymd(d) <= to; d.setDate(d.getDate()+1)){ const k = ymd(d);
        out.push({ emp_code:code, punch_date:k, punch_time:(tin||'08:58')+':00', device_sn:'' }, { emp_code:code, punch_date:k, punch_time:(tout||'18:02')+':00', device_sn:'' }); }
      return out; };
    let pid = 1; const withId = rows => rows.map(r => Object.assign({ id: pid++ }, r));
    const EMP = o => Object.assign({ full_name:(o.nick||'x')+' ทดสอบ', dept:'หน้าร้าน', position:'พนักงาน', branch:'JJLP', wage_type:'monthly', rate:12000, work_mode:'shift',
      shift_id:1, target_hours:10, active:true, must_work_exempt:true, off_count:0, off_weekdays:'', holiday_pay:true, deposit_on:true, deposit_target:3000, deposit_monthly:300,
      deposit_opening:0, deposit_target_v1:5000, deposit_monthly_v1:500, start_date:'2026-01-01', end_date:null, bank_name:'กสิกรไทย', bank_account:'1000000000', sso_on:false, birth_date:null, kbiz_added:true, nationality:'' }, o);
    const seed = T => {
      T.payroll_settings = [{ id:1, cutoff_hour:6, default_wage:400, min_fine:0, late_fine:0, cut_day:25, pay_day:5, adv_day:15, dep_start:'2026-08', single_fine:200, month_divisor:30, must_work_days:'5,6,0', must_work_fine:400 }];
      T.shifts = [{ id:1, name:'กะ', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1 }];
      for(const k of ['devices','deposit_entries','pvd_members','pvd_entries','pvd_payouts','adjustments','advances','holidays','payroll_audit','tips','mou_loans','mou_entries','doc_borrows','loans','loan_entries','fine_entries','sso_entries'])
        T[k] = T[k] || [];
    };
    const dev = async (now, db, who) => { const A = boot({ now, db }); await wait(300); A.E(`AUTH=${JSON.stringify(who || { username:'o', role:'owner' })}; applyUser(AUTH);`); return A; };
    const pay = (A, id, p) => JSON.parse(A.E(`JSON.stringify((x=>({net:Math.round(x.net*100)/100,dep:x.dep.ded,cap:x.dep.cap||'',tip:x.tip?x.tip.share:0}))(calcPay(employees.find(e=>e.id===${id}),'${p}')))`));
    const row = (A, id, p) => (A.T.deposit_entries || []).find(r => r.employee_id === id && r.period === p) || null;
    const lockOf = ['2026-08','2026-09'];
    return { punRows, withId, EMP, seed, dev, pay, row, lockOf };
  })();
  const { makeDB } = require('./fakedb');
  { console.log('[40a ③ เป้า 0 (ข้อตกลงพิเศษ) / ปิดหัก ที่มีวันทำงานในงวดที่จ่ายแล้ว → 🔒 0 อัตโนมัติ · ตั้งเป้าใหม่หลังวันจ่าย = ไม่หักย้อน ต.ค. · "มีผลตั้งแต่" ไม่ตอบงวดที่จ่ายแล้ว]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' }), R8.EMP({ id:2, code:'Z1', nick:'แซด', deposit_target:0, deposit_target_v1:0 }),
                   R8.EMP({ id:3, code:'Q1', nick:'คิว', deposit_target:0, deposit_on:false, deposit_target_v1:0 })];
    T.punches = R8.withId(['A1','Z1','Q1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-05')));
    T.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' }));
    const B = await R8.dev('2026-11-04T12:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    const paidZ = R8.pay(B, 2, '2026-10');
    const A = await R8.dev('2026-11-06T09:00:00+07:00', db); await A.E(`loadAll()`); await wait(300);
    const z = R8.row(A, 2, '2026-10'), q = R8.row(A, 3, '2026-10');
    ok(paidZ.dep===0 && z && z.amount===0 && z.note==='lock' && q && q.amount===0 && q.note==='lock' && R8.row(A, 1, '2026-10').amount===300,
       `6 พ.ย. เปิดแอป → 🔒 ต.ค.: เอ 300 · แซด (เป้า 0) 0 · คิว (เป้า 0 + ปิดหัก) 0 (เดิมข้ามคนเป้า 0 · ได้ ${JSON.stringify([z, q].map(r => r && [r.amount, r.note]))})`);
    A.io.confirms.length = 0;
    await A.E(`updDepField(2, 'deposit_target', 3000)`); await wait(50);
    const afterZ = R8.pay(A, 2, '2026-10');
    ok(T.employees.find(e=>e.id===2).deposit_target===3000 && afterZ.dep===0 && afterZ.net===paidZ.net && A.io.confirms.length===1 && /มีผลตั้งแต่ งวด พ\.ย\. 2569/.test(A.io.confirms[0]),
       `ตั้งเป้าแซด 3,000 หลังวันจ่าย → ต.ค. (จ่ายแล้ว) ยังหัก 0 สุทธิ ${afterZ.net} เท่าที่จ่าย · ถาม "มีผลตั้งแต่ งวด พ.ย. 2569" (เดิม ต.ค. · ได้ ${JSON.stringify(A.io.confirms)})`);
    const C = await R8.dev('2026-11-07T09:00:00+07:00', db); await C.E(`loadAll()`); await wait(200);
    ok(R8.pay(C, 2, '2026-10').dep===0 && C.E(`depositCalc(employees.find(e=>e.id===2),'2026-11').ded`)===300 && C.E(`depositCalc(employees.find(e=>e.id===2),'2026-11').before`)===0,
       'เครื่องใหม่: แซด ต.ค. 0 · พ.ย. หัก 300 · สะสมก่อน พ.ย. 0 (ไม่นับ 300 ที่ไม่เคยหัก)');
    ok(!A.errs.length && !B.errs.length && !C.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs, C.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[40b ①④ เครื่องค้างพลาด INSERT พนักงานใหม่ (ทิปอัตโนมัติ · เพื่อนสุทธิไม่พอ) → ข้ามวันแล้ว 🔒 = โหลดใหม่ทั้งชุดก่อน → ยอดเท่าสลิป/K BIZ ที่จ่ายจริง]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'W1', nick:'ดับบลิว' }), R8.EMP({ id:2, code:'V1', nick:'วี' })];
    T.punches = R8.withId(['W1','V1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-04')));
    T.deposit_entries = [1,2].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));
    T.tips = [{ id:1, period:'2026-10', branch:'JJLP', amount:3000, member_ids:'' }];
    T.advances = [{ id:501, employee_id:1, period:'2026-10', amount:12800, taken_date:'2026-10-15', note:'' }];
    const A = await R8.dev('2026-09-30T12:00:00+07:00', db); await A.E(`loadAll()`); await wait(100);
    T.employees.push(R8.EMP({ id:3, code:'X1', nick:'เอ็กซ์', start_date:'2026-10-01', deposit_target_v1:null, deposit_monthly_v1:null }));   // Worker สร้าง (A จอดับ ไม่ได้ยิน)
    T.punches.push(...R8.withId(R8.punRows('X1', '2026-10-01', '2026-11-04')));
    const B = await R8.dev('2026-11-04T12:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    const wB = R8.pay(B, 1, '2026-10');
    A.setNow('2026-11-05T07:00:00+07:00'); A.E(`payLockTick()`); await wait(600);
    const L = R8.row(A, 1, '2026-10');
    ok(wB.dep===200 && wB.cap==='short' && wB.tip===1000 && L && L.amount===200 && L.note==='lock:short:300:200' && A.E(`employees.length`)===3 && R8.pay(A, 1, '2026-10').tip===1000,
       `สลิปที่จ่าย: W ต.ค. ทิป 1,000 (หาร 3) หัก 200 (short) → เครื่องค้าง 🔒 200 lock:short (เดิม 300 · ทิปหาร 2) · รู้จัก 3 คน (ได้ ${JSON.stringify(L)})`);
    // ④ ทางออกเงิน (withFresh → moneyFresh): บัญชี _br ลาดพร้าวพลาด UPDATE ย้ายพนักงานรัชดาเข้าสาขา → อ่านแถวเต็มของคนที่ขาดเพิ่มเข้า (ทิปหารครบ)
    const db2 = makeDB(), T2 = db2.T; R8.seed(T2);
    T2.employees = [R8.EMP({ id:1, code:'W1', nick:'ดับบลิว' }), R8.EMP({ id:2, code:'V1', nick:'วี' }), R8.EMP({ id:3, code:'X1', nick:'เอ็กซ์', branch:'JJRD' })];
    T2.punches = R8.withId(['W1','V1','X1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-02')));
    T2.tips = [{ id:1, period:'2026-10', branch:'JJLP', amount:3000, member_ids:'' }];
    const D = await R8.dev('2026-11-01T09:00:00+07:00', db2, { username:'m', role:'staff', apps:{ payroll:{ _br:'JJLP', payroll:'vae', emp:'v', detail:'v' } } });
    D.E(`payLockAuto=false`); await D.E(`loadAll()`);
    const n0 = D.E(`employees.length`), t0 = R8.pay(D, 1, '2026-10').tip;
    T2.employees.find(e => e.id === 3).branch = 'JJLP';   // ย้ายสาขา (D จอดับ ไม่ได้ยิน UPDATE)
    D.setNow('2026-11-03T10:00:00+07:00');
    const got = JSON.parse(await D.E(`withFresh(() => JSON.stringify({ n: employees.length, x: !!employees.find(e=>e.id===3), tip: calcPay(employees.find(e=>e.id===1),'2026-10').tip.share }))`) || '{}');
    ok(n0===2 && t0===1500 && got.n===3 && got.x && got.tip===1000, `withFresh บนเครื่องค้าง (_br): คนที่ย้ายเข้าสาขาแต่เครื่องไม่มี → อ่านแถวเต็มเพิ่มเข้า · ทิปหาร 3 = 1,000 (ก่อนอ่าน ${n0} คน ${t0} · ได้ ${JSON.stringify(got)})`);
    ok(!A.errs.length && !B.errs.length && !D.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs, D.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[40c ④ EMP_SHAPE มี แผนก/ตำแหน่ง (กะเฉพาะแผนก) — เครื่องค้างพลาดการแก้ตำแหน่ง: withFresh ได้ยอดหลังจับกะใหม่ทันที · 🔒 (กลับมาเปิดแท็บ) = ยอดที่จ่าย]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.payroll_settings[0].min_fine = 1.5;
    T.shifts = [{ id:1, name:'กะเช้า', start_time:'09:00', end_time:'18:00', in_grace:5, out_grace:0, sort_order:1, dept_only:'' },
                { id:2, name:'กะเช้า (ล้างจาน)', start_time:'11:00', end_time:'20:00', in_grace:5, out_grace:0, sort_order:2, dept_only:'ล้างจาน' }];
    T.employees = [R8.EMP({ id:1, code:'D1', nick:'ดี', shift_id:null, position:'พนักงาน', dept:'ครัว' })];
    T.punches = R8.withId(R8.punRows('D1', '2026-07-26', '2026-11-05', '10:58', '20:02'));
    T.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' }));
    T.advances = [{ id:501, employee_id:1, period:'2026-10', amount:11000, taken_date:'2026-10-15', note:'' }];
    const A = await R8.dev('2026-11-01T12:00:00+07:00', db); await A.E(`loadAll()`); await wait(100);
    T.employees[0].position = 'ล้างจาน';
    const B = await R8.dev('2026-11-04T12:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    const dB = R8.pay(B, 1, '2026-10');
    A.setNow('2026-11-04T13:00:00+07:00');
    const got = JSON.parse(await A.E(`withFresh(() => JSON.stringify((x=>({net:x.net,dep:x.dep.ded}))(calcPay(employees[0],'2026-10'))))`));
    ok(dB.dep===300 && got.net===dB.net && got.dep===300, `withFresh (สลิป/K BIZ) ทันทีหลังอ่านสด = ยอดหลังจับกะล้างจาน (สุทธิ ${got.net} = ${dB.net} · เดิมได้ค่าปรับสายของกะเดิมจนอีก 1.5 วินาที)`);
    // เครื่องค้างอีกรอบ: กลับมาเปิดแท็บ 6 พ.ย. → 🔒 = ยอดที่จ่าย
    const A2 = await R8.dev('2026-11-01T12:00:00+07:00', db); T.employees[0].position = 'พนักงาน'; await A2.E(`loadAll()`); T.employees[0].position = 'ล้างจาน';
    A2.setNow('2026-11-06T09:00:00+07:00'); A2.E(`payLockSoon('tab', 0)`); await wait(600);
    const L = R8.row(A2, 1, '2026-10');
    ok(L && L.amount===300 && L.note==='lock', `กลับมาเปิดแท็บ → โหลดใหม่ทั้งชุดก่อน → 🔒 300 ตามสลิปที่จ่าย (เดิม 0 lock:neg · ได้ ${JSON.stringify(L)})`);
  }
  { console.log('[40d ② loadAll อ่านตารางเงินไม่ได้ชั่วคราว (timeout) = ข้อมูลเงินไม่ครบ: ไม่ 🔒 อัตโนมัติ + บล็อกสลิป/Excel/K BIZ · doc_borrows แยกจาก MOU · ครบแล้ว (ลองใหม่) = 🔒 ยอดจริง]');
    const mk = () => { const db = makeDB(), T = db.T; R8.seed(T);
      T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ', sso_on:true }), R8.EMP({ id:2, code:'B1', nick:'บี' })];
      T.punches = R8.withId(['A1','B1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-05')));
      T.deposit_entries = [1,2].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));
      T.advances = [{ id:501, employee_id:1, period:'2026-10', amount:8750, taken_date:'2026-10-15', note:'' }];
      T.mou_loans = [{ id:1, employee_id:1, amount:15000, monthly:2000, final_max:3000, start_period:'2026-10', opening:0, doc_passport:true, doc_pink:true, doc_complete:false, note:'', returned_at:null }];
      T.loans = [{ id:1, employee_id:1, amount:5000, monthly:1000, deduct_on:'payroll', start_period:'2026-10', opening:0, loan_date:'2026-09-20', note:'' }];
      T.fine_entries = [{ id:1, employee_id:1, period:'2026-10', kind:'single', amount:500, note:'' }];
      T.sso_entries = [{ id:1, employee_id:1, period:'2026-10', amount:600 }];
      T.tips = [{ id:1, period:'2026-10', branch:'JJLP', amount:2000, member_ids:'' }];
      return db; };
    const db0 = mk(); const R = await R8.dev('2026-11-06T12:00:00+07:00', db0); R.E(`payLockAuto=false`); await R.E(`loadAll()`);
    const truth = R8.pay(R, 1, '2026-10');
    let allOk = true; const lines = [];
    for(const tbl of ['fine_entries','mou_entries','mou_loans','loans','loan_entries','sso_entries','tips']){
      const db = mk(); db.fail[tbl] = { message:'timeout' };
      const A = await R8.dev('2026-11-06T12:00:00+07:00', db); await A.E(`loadAll()`); await wait(150);
      const t1 = (A.d.getElementById('toast') || {}).textContent || '';
      const blocked = A.E(`moneyBlocked()`), tb = (A.d.getElementById('toast') || {}).textContent || '';
      const none = !db.T.deposit_entries.some(r => r.period === '2026-10') && !db.T.pvd_entries.length;
      delete db.fail[tbl];
      A.setNow('2026-11-06T12:06:00+07:00'); A.E(`payLockTick()`); await wait(400);   // ลองใหม่ 5 นาที → โหลดใหม่ทั้งชุด (ครบ) → 🔒 ยอดจริง
      const L = db.T.deposit_entries.find(r => r.employee_id === 1 && r.period === '2026-10');
      const okT = none && blocked && /ไม่ครบ/.test(t1) && /ลากหน้าลง/.test(tb) && L && L.amount === truth.dep && !A.E(`moneyLoadErr`);
      if(!okT) allOk = false;
      lines.push(tbl + (okT ? ' ✓' : ' ✗ ' + JSON.stringify({ none, blocked, t1, L })));
    }
    ok(truth.dep===150 && truth.cap==='short' && allOk, `ครบ: เอ ต.ค. หัก ${truth.dep} (${truth.cap}) · อ่านไม่ได้ทีละตาราง → ไม่ล็อก + moneyBlocked + toast "ไม่ครบ — ลากหน้าลง" · 5 นาทีต่อมาโหลดครบ → 🔒 ${truth.dep}: ${lines.join(' · ')}`);
    const db = mk(); db.fail.doc_borrows = { message:'timeout' };
    const A = await R8.dev('2026-11-06T12:00:00+07:00', db); await A.E(`loadAll()`); await wait(300);
    const L = db.T.deposit_entries.find(r => r.employee_id === 1 && r.period === '2026-10');
    ok(A.E(`mouReady`)===true && !A.E(`moneyLoadErr`) && R8.pay(A, 1, '2026-10').dep===truth.dep && L && L.amount===truth.dep,
       `สมุดยืมเอกสาร (doc_borrows) อ่านไม่ได้ → MOU ยังเปิด (หัก MOU ครบ) · 🔒 ${L && L.amount} = ยอดจริง (เดิมปิด MOU เงียบ ๆ แล้ว 🔒 300)`);
  }
  { console.log('[40e ⑤ ช่วงสแกนที่ 🔒 อ่านใหม่ = เฉพาะงวดที่ยังไม่ 🔒 ที่มีวันทำงาน/แถว ✎ (คนใหม่ไม่ดึงย้อนถึง depStart)]');
    const A = boot({ now:'2027-06-05T09:00:00+07:00' }); const { E } = A; await wait(300);
    E(SEED);
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); pvdReady=false;
       const ps=[]; for(let p='2026-08'; p<='2027-05'; p=nextPeriod(p)) ps.push(p);
       employees=[]; depositEntries=[]; let rid=1;
       for(let i=1;i<=5;i++){ employees.push(emp({id:i,code:'C'+i,nick:'n'+i,start_date:'2026-01-01',deposit_target_v1:5000,deposit_monthly_v1:500}));
         for(const p of ps) if(p<'2027-05') depositEntries.push(fromDbDep({id:rid++,employee_id:i,period:p,amount:300,note:'lock'})); }
       employees.push(emp({id:99,code:'N1',nick:'ใหม่',start_date:'2027-01-10'}));
       for(const p of ['2027-01','2027-02','2027-03','2027-04']) depositEntries.push(fromDbDep({id:rid++,employee_id:99,period:p,amount:300,note:'lock'}));
       shifts={}; for(const e of employees) shifts[e.code]=mk(e.id===99?'2027-01-10':'2026-10-01','2027-06-04');
       punchLoaded=true; punchSince='2026-10-05';`);
    const r1 = JSON.parse(E(`JSON.stringify(payLockRange(payLockDue(payLockMay())))`));
    E(`depositEntries = depositEntries.filter(r => !(r.employee_id===3 && r.period==='2027-02') && !(r.empId===3 && r.period==='2027-02'));`);
    const r2 = JSON.parse(E(`JSON.stringify(payLockRange(payLockDue(payLockMay())))`));
    ok(r1.from==='2027-04-26' && r1.to==='2027-05-26' && r2.from==='2027-01-26',
       `ทุกคน 🔒 ถึง เม.ย. 70 + คนใหม่ (เริ่ม ม.ค. 70 ไม่มีแถวก่อนเริ่มงาน) → อ่าน 26 เม.ย.–26 พ.ค. (เดิมย้อนถึง ต.ค. 69 · ได้ ${JSON.stringify(r1)}) · มีคนค้าง ก.พ. ที่มีวันทำงาน → ย้อนถึงงวดนั้น (${JSON.stringify(r2)})`);
  }
  { console.log('[40f OT: ＋＋ รัว + realtime ของแถวตัวเอง + คำตอบอ่านเก่า → แถวเดียวต่อวัน ชั่วโมงตรงที่กด · echo ไม่วาดทับช่องที่กำลังพิมพ์]');
    const A = boot({ now:'2026-11-10T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(PUN); E(`${V5} var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}); employees=[a]; punches=mkP('A1','2026-10-26','2026-11-09'); recomputeAll(); depositEntries=[];`);
    await SYNC(A);
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{_br:'JJLP',today:'v',emp:'vae',detail:'vaed',adv:'vaed',payroll:'vae'}}}; applyUser(AUTH); scopeEmployees(); recomputeAll();
       adjRealtime(); detailEmpId=1; detailTab='time'; go('detail'); document.getElementById('detailPeriodSel').value='2026-11'; renderDetail();`);
    A.db.latency = (t, op) => t === 'adjustments' ? (op === 'select' ? 500 : 80) : 0;
    const echo = () => { const h = A.db.chans['jjmk-adj'] && A.db.chans['jjmk-adj'].adjustments; if(h) h({ eventType:'*' }); };
    for(const d of ['2026-11-02','2026-11-03','2026-11-04']){ for(let k = 0; k < 2; k++){ E(`stepOT(1,'${d}',1)`); setTimeout(echo, 230); await wait(k ? 1200 : 500); } }
    await wait(3500);
    const rows = T.adjustments.filter(r => r.employee_id === 1 && /^OT/.test(r.reason));
    ok(rows.length===3 && rows.every(r => /\(2 ชม\.\)/.test(r.reason)) && rows.reduce((s, r) => s + r.amount, 0)===300,
       `＋＋ ต่อวัน 3 วัน (อ่านช้า 500ms · echo ของแถวตัวเอง) → 3 แถว แถวละ 2 ชม. รวม 300 บ. (เดิม insert ซ้ำวันละ 2 แถว · ได้ ${JSON.stringify(rows.map(r => r.reason + '=' + r.amount))})`);
    A.db.latency = null;
    await E(`setOTHours(1,'2026-11-05',2)`); echo(); await wait(300);
    E(`(() => { const i=[...document.querySelectorAll('#detailContent input')].find(x=>/setOTHours\\(1,'2026-11-06'/.test(x.getAttribute('onchange')||'')); i.focus(); i.value='3'; window.__inp=i; })()`);
    await wait(2600);
    const st = JSON.parse(E(`JSON.stringify((() => { const i=[...document.querySelectorAll('#detailContent input')].find(x=>/setOTHours\\(1,'2026-11-06'/.test(x.getAttribute('onchange')||''));
      return { same: i===window.__inp, val: i.value, focus: document.activeElement===i }; })())`));
    ok(st.same && st.val==='3' && st.focus && !/ข้อมูลใหม่/.test(A.d.getElementById('toast').textContent),
       `realtime ของแถว OT ที่เครื่องนี้เพิ่งบันทึก → ไม่วาดทับช่อง OT วันถัดไปที่กำลังพิมพ์ "3" · ไม่ขึ้น "🔄 ข้อมูลใหม่" (ได้ ${JSON.stringify(st)})`);
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[40g ไฟล์ K BIZ ต.ค. สร้างแล้ว → ฟอร์ม ⚙️ ถามเฉพาะเมื่อสุทธิงวดนั้นเปลี่ยนจริง (ตำแหน่ง/แผนก/วันสิ้นสุดงานงวดหน้า ไม่ถาม · ฐานเงินเดือน ถาม)]');
    const res = [];
    for(const [name, js, want] of [['วันสิ้นสุด 30 พ.ย.', `fEnd').value='2026-11-30'`, false], ['ตำแหน่ง → เสิร์ฟ', `fPos').value='พนักงานเสิร์ฟ'`, false],
                                   ['แผนก → ครัว', `fDept').value='ครัว'`, false], ['วันเริ่มงาน 1 ม.ค. 69', `fStart').value='2026-01-01'`, false], ['ฐาน 13,000', `fRate').value='13000'`, true]]){
      const A = boot({ now:'2026-11-03T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
      E(SEED); E(PUN); E(`${V5} auditReady=true; var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'});
        employees=[a,b]; punches=[...mkP('A1','2026-09-26','2026-11-02'),...mkP('B1','2026-09-26','2026-11-02')]; recomputeAll(); depositEntries=[];`);
      await SYNC(A);
      T.payroll_audit = [{ id:1, action:'kbiz', tbl:'kbiz_pay', detail:'สร้างไฟล์โอนเงินเดือน ต.ค. 2569 · ลาดพร้าว [p:2026-10] [br:JJLP]' }];
      E(`AUTH={username:'h',role:'staff',apps:{payroll:{emp:'vae',detail:'vae'}}}; applyUser(AUTH);`);
      io.confirms.length = 0;
      await E(`(async()=>{ go('emp'); openEmpForm(2); document.getElementById('${js}; await saveEmpForm(); })()`); await wait(30);
      const asked = io.confirms.some(c => /K BIZ/.test(c));
      res.push(name + ':' + (asked ? 'ถาม' : 'ไม่ถาม') + (asked === want ? '' : ' ✗'));
    }
    ok(!res.some(x => / ✗/.test(x)), 'ถาม K BIZ ' + res.join(' · '));
  }
  { console.log('[40h ข้อความบล็อกยาว → toast ค้างนานตามความยาว + แตะปิด · ข้อความสั้นยัง 2.2 วินาที]');
    const A = boot({ now:'2026-11-03T12:00:00+07:00' }); const { E, d } = A; await wait(300);
    E(`toast('🔒 ยังไม่ได้บันทึก — ต.ค. 69 จ่ายแล้วแต่ยังไม่ปิดยอดเงินสำรองฯ (เอ) และบัญชีนี้ไม่มีสิทธิ์หน้า 🐷 · ให้เจ้าของ/ผู้มีสิทธิ์ 🐷 เปิดแอปหรือลากหน้าลง ระบบจะปิดยอดให้เอง แล้วลองใหม่')`);
    await wait(3000);
    const t = d.getElementById('toast'), vis = t.style.display === 'block' && t.classList.contains('long');
    t.click();
    E(`toast('บันทึกแล้ว')`); const short = !d.getElementById('toast').classList.contains('long');
    await wait(2400);
    ok(vis && short && d.getElementById('toast').style.display === 'none', 'ข้อความยาว 3 วินาทีแล้วยังขึ้น (class long กว้างเต็มจอ) · แตะปิดได้ · ข้อความสั้นหายใน 2.2 วินาที');
  }
  // ============ 41) รอบ 9: ออฟฟิศวันจ่าย = ข้อมูลถึงเมื่อวาน · วันนี้ที่สแกนขาเดียว = กำลังทำงาน · ตารางเงินเกิน 1,000 แถว · ✎ ที่อีกเครื่องแก้ระหว่างล็อก — บาทจริง ============
  { console.log('[41a รอบ 10: 🔒 อัตโนมัติวันจ่าย = หน้าร้านเท่านั้น — ออฟฟิศเปิดแอปวันจ่าย 06:30 / 10:00 / วันถัดไป = ไม่ล็อก (งวดยังไม่จบ/ให้กด 🔒) · หน้าร้าน 5 พ.ย. = 🔒 ยอดสลิปทั้งงวด]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' }), R8.EMP({ id:3, code:'S1', nick:'หน้าร้าน', bank_account:'1000000003' })];
    T.punches = R8.withId([...R8.punRows('O1', '2026-07-26', '2026-10-30'), ...R8.punRows('S1', '2026-07-26', '2026-11-04')]);
    T.deposit_entries = [1,3].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));
    const errs = [], seen = [];
    for(const at of ['2026-10-31T06:30:00+07:00', '2026-10-31T10:00:00+07:00', '2026-11-01T09:00:00+07:00']){
      const A = await R8.dev(at, db); await A.E(`loadAll()`); await wait(400);
      seen.push(T.deposit_entries.filter(r => r.period >= '2026-10').length); errs.push(...A.errs);
    }
    ok(seen.join()==='0,0,0', `ออฟฟิศ: เปิดแอป 31 ต.ค. 06:30 / 10:00 / 1 พ.ย. → ไม่ 🔒 อัตโนมัติ (แถว ต.ค. ${seen.join('/')}) — ยอดออฟฟิศปิดด้วยปุ่ม 🔒 / K BIZ งวดถัดไป`);
    const B = await R8.dev('2026-11-05T09:00:00+07:00', db); await B.E(`loadAll()`); await wait(400);
    const sl = R8.pay(B, 3, '2026-10'), L = R8.row(B, 3, '2026-10');
    ok(L && L.amount===sl.dep && sl.dep===300 && L.note==='lock' && !R8.row(B, 1, '2026-10') && /ออฟฟิศ 1 คน: ระบบไม่ปิดยอดเองวันจ่าย/.test(B.E(`depWarnHtml(depUnlockedPeriods(), 'dep')`)),
       `5 พ.ย. (วันจ่ายหน้าร้าน · งวดจบ 25 ต.ค.) → 🔒 หน้าร้าน ต.ค. ${L && L.amount} = สลิป ${sl.dep} · ออฟฟิศไม่ล็อก + แถบเตือนบอกให้กด 🔒`);
    ok(!errs.length && !B.errs.length, 'ไม่มี JS error (' + errs.concat(B.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[41b รอบ 10: ถอน attLive — calcPay/หน้ารายคน/จอเข้างานแบบ HEAD: วันนี้ที่สแกนขาเดียว = ลืมตอก (ปรับ 200 ตามกฎเดิม) · ไม่มีคำว่า "กำลังทำงาน"]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' })];
    T.punches = R8.withId([...R8.punRows('O1', '2026-07-26', '2026-10-29'), { emp_code:'O1', punch_date:'2026-10-30', punch_time:'08:55:00', device_sn:'' }]);
    const K = await R8.dev('2026-10-30T14:00:00+07:00', db); K.E(`payLockAuto=false`); await K.E(`loadAll()`);
    const p = JSON.parse(K.E(`JSON.stringify((x=>({sc:x.singleCount, f:x.singleFine}))(calcPay(employees.find(e=>e.id===1),'2026-10')))`));
    const dt = K.E(`(()=>{ detailEmpId=1; detailTab='time'; go('detail'); document.getElementById('detailPeriodSel').value='2026-10'; renderDetail(); return document.getElementById('detailContent').textContent; })()`);
    const sl = txt(K.E, `buildSlip(employees.find(e=>e.id===1),'2026-10',true)`);
    ok(p.sc===1 && p.f===200 && /ลืมตอกออก/.test(dt) && !/กำลังทำงาน/.test(sl) && K.E(`typeof attLive`)==='undefined' && K.E(`typeof attCut`)==='undefined',
       `30 ต.ค. 14:00 สแกนเข้าแล้วยังไม่ออก → ลืมตอก ${p.sc} ครั้ง ปรับ ${p.f} (กฎเดิม) · หน้ารายคน "ลืมตอกออก" · ไม่มี attLive/attCut`);
    ok(!K.errs.length, 'ไม่มี JS error (' + K.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[41c ตารางเงินเกิน 1,000 แถว (PostgREST ตัดที่ 1,000): loadAll/อ่านใหม่/realtime อ่านครบ → 🔒 ยอดจริง · หน้าที่อ่านไม่ครบ = ไม่ 🔒 + บล็อกสลิป/K BIZ]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' })];
    T.punches = R8.withId(R8.punRows('A1', '2026-07-26', '2026-11-05'));
    T.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' }));
    let id = 1;
    for(let i = 0; i < 1080; i++) T.adjustments.push({ id:id++, employee_id:999, kind:'add', reason:'OT เก่า', amount:100, period:'2026-08' });   // แถวเก่า (OT รายวัน)
    T.adjustments.push({ id:id++, employee_id:1, kind:'deduct', reason:'ของหาย', amount:11800, period:'2026-10' });   // แถวใหม่สุด = แถวที่ 1,081
    for(let i = 0; i < 1000; i++) T.advances.push({ id:5000 + i, employee_id:999, period:'2026-08', amount:1, taken_date:'2026-08-15', note:'' });
    T.advances.push({ id:7000, employee_id:1, period:'2026-11', amount:100, taken_date:'2026-11-05', note:'' });
    const A = await R8.dev('2026-11-06T09:00:00+07:00', db); await A.E(`loadAll()`); await wait(400);
    const L = R8.row(A, 1, '2026-10');
    ok(A.E(`adjustments.length`)===1081 && A.E(`advances.length`)===1001 && L && L.amount===200 && L.note==='lock:short:300:200' && R8.pay(A, 1, '2026-10').net===0,
       `adjustments 1,081 / advances 1,001 แถว → ในเครื่องครบ (${A.E('adjustments.length')}/${A.E('advances.length')}) · 🔒 ต.ค. ${JSON.stringify(L && [L.amount, L.note])} (เดิม 300 lock จากข้อมูลที่ถูกตัด · สลิปสุทธิ 11,700)`);
    T.adjustments.push({ id:id++, employee_id:1, kind:'add', reason:'OT 5 พ.ย.', amount:50, period:'2026-11' });
    const okR = await A.E(`moneyTblRefresh(true)`);
    const h = A.db.chans['jjmk-adj'] && A.db.chans['jjmk-adj'].adjustments; if(h) h({ eventType:'INSERT' }); await wait(1100);
    ok(okR===true && A.E(`adjustments.length`)===1082 && A.E(`adjustments.some(a=>a.reason==='OT 5 พ.ย.')`) && A.E(`adjustments.some(a=>a.reason==='ของหาย')`),
       'อ่านใหม่ก่อนออกเงิน (moneyTblRefresh) + realtime OT → 1,082 แถวครบ (เดิมแทนด้วย 1,000 แถวแรก = รายการใหม่สุดหาย)');
    // หน้าที่ 2 ได้ไม่ครบ: ตารางหลัก = loadAll ไม่สำเร็จ · ตารางเสริม = moneyLoadErr → ไม่ 🔒 + บล็อก
    const db2 = makeDB(), T2 = db2.T; R8.seed(T2);
    T2.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' })];
    T2.punches = R8.withId(R8.punRows('A1', '2026-07-26', '2026-11-05'));
    T2.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' }));
    for(let i = 0; i < 1001; i++) T2.fine_entries.push({ id:i + 1, employee_id:999, period:'2026-08', kind:'miss', amount:0, note:'' });
    T2.fine_entries.push({ id:3000, employee_id:1, period:'2026-10', kind:'must', amount:11800, note:'' });
    db2.rangeCut.fine_entries = 1;
    const B = await R8.dev('2026-11-06T09:00:00+07:00', db2); await B.E(`loadAll()`); await wait(400);
    const blocked = B.E(`moneyBlocked()`);
    ok(!R8.row(B, 1, '2026-10') && /แก้รายการหัก/.test(B.E('moneyLoadErr')) && blocked===true && B.E('loadOkSeq')!==B.E('loadSeq'),
       `fine_entries 1,002 แถว อ่านหน้า 2 ไม่ครบ → ไม่ 🔒 · moneyLoadErr "${B.E('moneyLoadErr')}" · สลิป/K BIZ บล็อก`);
    db2.rangeCut.fine_entries = 0;
    B.setNow('2026-11-06T09:06:00+07:00'); B.E(`payLockTick()`); await wait(600);
    const L2 = R8.row(B, 1, '2026-10');
    ok(L2 && L2.amount===200 && L2.note==='lock:short:300:200' && !B.E('moneyLoadErr'), `ลองใหม่ (5 นาที) อ่านครบ → 🔒 ${JSON.stringify(L2 && [L2.amount, L2.note])} (หักแก้รายการ 11,800 ครบ)`);
    db2.rangeCut.adjustments = 1;
    for(let i = 0; i < 1001; i++) T2.adjustments.push({ id:i + 1, employee_id:999, kind:'add', reason:'OT เก่า', amount:1, period:'2026-08' });
    const C = await R8.dev('2026-11-06T10:00:00+07:00', db2); const rC = await C.E(`loadAll()`); await wait(200);
    ok(rC===false && C.E('adjustments.length')===0 && /ต่อฐานข้อมูลไม่ได้/.test(C.d.getElementById('connTxt').textContent),
       'adjustments (ตารางหลัก) อ่านหน้า 2 ไม่ครบ → loadAll ไม่สำเร็จ (ไม่ใส่ข้อมูลครึ่ง ๆ · ไม่ 🔒)');
    ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[41d ✎ ที่อีกเครื่องแก้ระหว่าง 🔒 อัตโนมัติ (อ่านสแกนช้า) → ไม่ทับ (เงินประกัน + สำรองฯ) · อีก 1 นาทีปิดยอดด้วยยอดใหม่]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' })];
    T.punches = R8.withId(R8.punRows('A1', '2026-07-26', '2026-11-05'));
    T.deposit_entries = [...R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' })), { id:3, employee_id:1, period:'2026-10', amount:500, note:'' }];
    T.pvd_members = [PVM(1)]; T.pvd_entries = [{ id:7, employee_id:1, period:'2026-10', emp_amount:400, er_amount:null, note:'' }];
    let armed = false; db.latency = (t, op) => armed && t === 'punches' && op === 'select' ? 400 : 0;
    const X = await R8.dev('2026-11-06T09:00:00+07:00', db); X.E(`payLockAuto=false`); await X.E(`loadAll()`); X.E(`payLockAuto=true`);
    armed = true;
    const pX = X.E(`payDayLock('tab')`); await wait(250);
    T.deposit_entries.find(r => r.id === 3).amount = 200; T.pvd_entries.find(r => r.id === 7).emp_amount = 250;   // เครื่อง Y แก้ ✎ สำเร็จ
    const res = await pX; armed = false;
    const d1 = T.deposit_entries.find(r => r.id === 3), p1 = T.pvd_entries.find(r => r.id === 7);
    ok(d1.note==='' && d1.amount===200 && p1.note==='' && p1.emp_amount===250 && res && res.skip===2,
       `X 🔒 ระหว่าง Y แก้ ✎ → ไม่ทับ: เงินประกัน ${JSON.stringify([d1.amount, d1.note])} · สำรองฯ ${JSON.stringify([p1.emp_amount, p1.note])} (เดิม 🔒 500/400 ทับ · ได้ ${JSON.stringify(res)})`);
    X.setNow('2026-11-06T09:01:30+07:00'); X.E(`payLockTick()`); await wait(800);
    const d2 = T.deposit_entries.find(r => r.id === 3), p2 = T.pvd_entries.find(r => r.id === 7);
    ok(d2.note==='lock' && d2.amount===200 && p2.note==='lock' && p2.emp_amount===250, `1 นาทีต่อมา ปิดยอดด้วยยอดที่ Y แก้: ${JSON.stringify([d2.amount, d2.note, p2.emp_amount, p2.note])}`);
    ok(!X.errs.length, 'ไม่มี JS error (' + X.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[41e รอบ 10 (ผลตรวจรอบ 4 high): ส.ค./ก.ย. ยังไม่ 🔒 = ไม่ปิดยอด ต.ค. ให้ · แคชสแกนก่อน ต.ค. ขาด (สแกน ก.ย. ที่เพิ่มทีหลัง) → ยืนยันกับฐานข้อมูลก่อนเขียน · อ่านสแกนได้ไม่ครบ = ไม่ล็อก]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' }), R8.EMP({ id:2, code:'B1', nick:'บี', bank_account:'1000000002' }),
                   R8.EMP({ id:5, code:'Y1', nick:'วาย', deposit_opening:2400, start_date:'2026-09-10', bank_account:'1000000005' })];
    T.punches = R8.withId([...['A1','B1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-04')), ...R8.punRows('Y1', '2026-09-26', '2026-11-04')]);
    T.deposit_entries = [1].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));   // เอ 🔒 ส.ค./ก.ย. แล้ว · บี ยังไม่ 🔒
    const A = await R8.dev('2026-11-05T09:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    // แคชสแกนในเครื่อง = ของที่โหลดไว้ตอนนี้ (ยังไม่มีสแกน ก.ย. ของวาย) → อีกเครื่องเพิ่มสแกน 10–25 ก.ย. ของวายทีหลัง (หลังวันจ่าย ก.ย. — loadAll ไม่โหลดช่วงนั้นสดอีก)
    A.E(`window.__pc = { ver:PCACHE_VER, saved:Date.now(), rows:punches.map(p=>Object.assign({}, p)), since:punchSince }; idbKV = (mode) => Promise.resolve(mode==='readonly' ? window.__pc : null);`);
    T.punches.push(...R8.withId(R8.punRows('Y1', '2026-09-10', '2026-09-25')));
    const S = await R8.dev('2026-11-05T09:00:00+07:00', db); S.E(`payLockAuto=false`); await S.E(`loadAll()`);
    const fresh = R8.pay(S, 5, '2026-10');   // เครื่องที่โหลดสด: ก.ย. หัก 500 → สะสม 2,900 → ต.ค. หัก 100
    A.E(`payLockAuto=true; payLockReady=true;`); await A.E(`payDayLock('tab')`);
    const L = id => (r => r && [r.amount, r.note])(R8.row(A, id, '2026-10'));
    ok(JSON.stringify(L(1))==='[300,"lock"]' && !L(2) && !L(5) && fresh.dep===100,
       `เอ (ส.ค./ก.ย. 🔒) → 🔒 ต.ค. 300 · บี (ส.ค./ก.ย. ยังไม่ 🔒) ข้าม · วาย (แคชไม่มีสแกน ก.ย. แต่ฐานข้อมูลมี) ข้าม — เดิม 🔒 300 ผิดถาวร (สลิปสด ${fresh.dep}) · ได้ ${JSON.stringify([L(1), L(2), L(5)])}`);
    const ul = JSON.parse(A.E(`JSON.stringify(depUnlockedPeriods())`));
    ok(A.E(`empPeriodSet(employees.find(e=>e.id===5)).has('2026-09')`) && ul.find(x=>x.p==='2026-09').n===2 && ul.find(x=>x.p==='2026-10').v1===2,
       `สแกน ก.ย. ที่ขาดถูกเติมลงเครื่อง → แถบเตือน ก.ย. 2 คน (บี + วาย) · ต.ค. รอปิดยอดงวดก่อน 2 คน (${JSON.stringify(ul)})`);
    // เจ้าของตรวจแล้ว 🔒 ส.ค./ก.ย. → รอบถัดไประบบปิดยอด ต.ค. ให้ = สลิปที่โหลดสด
    A.E(`go('dep'); renderDeposit();`);
    for(const p of ['2026-08','2026-09']){ A.E(`document.getElementById('depPeriodSel').value='${p}'`); await A.E(`depLockOpen()`); await A.E(`depLockSave()`); await wait(30); }
    await A.E(`payDayLock('tab')`);
    ok(JSON.stringify(L(5))==='[100,"lock"]' && JSON.stringify(L(2))==='[300,"lock"]' && R8.row(A, 5, '2026-09').amount===500,
       `หลัง 🔒 ส.ค./ก.ย. (วาย ก.ย. ${R8.row(A, 5, '2026-09').amount}) → 🔒 ต.ค. วาย ${JSON.stringify(L(5))} = สลิปสด ${fresh.dep} · บี ${JSON.stringify(L(2))}`);
    ok(!A.errs.length && !S.errs.length, 'ไม่มี JS error (' + A.errs.concat(S.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[41e2 ผลตรวจรอบ 4 low: อ่านสแกนช่วงงวดใหม่ได้ไม่ครบตามจำนวน (มีคนลบระหว่างอ่านหลายหน้า) → ลองใหม่ 1 ครั้ง · ยังไม่ครบ = ไม่ล็อก ไม่แทนข้อมูลในเครื่อง]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' })];
    T.punches = R8.withId(R8.punRows('A1', '2026-07-26', '2026-11-04'));
    T.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' }));
    const A = await R8.dev('2026-11-05T09:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    const n0 = A.E(`punches.length`);
    db.rangeCut.punches = 1;
    A.E(`payLockAuto=true; payLockReady=true;`);
    const r1 = await A.E(`payDayLock('load')`);
    ok(r1 && r1.fail && !R8.row(A, 1, '2026-10') && A.E(`punches.length`)===n0, `ได้ขาด 1 แถว (ไม่มี error) → ไม่ล็อก · สแกนในเครื่องเท่าเดิม ${n0} (ได้ ${JSON.stringify(r1)})`);
    delete db.rangeCut.punches; A.E(`payLockRetryAt=0`);
    await A.E(`payDayLock('retry')`);
    ok(R8.row(A, 1, '2026-10') && R8.row(A, 1, '2026-10').amount===300, 'อ่านครบ → 🔒 ต.ค. 300');
  }
  { console.log('[41e3 รอบ 10: ยืนยันงวดก่อน ต.ค. กับฐานข้อมูล — สแกนก่อนหน้าต่างในเครื่อง (punchSince) = ข้ามคนนั้น ไม่เติมลงเครื่อง · K BIZ ออฟฟิศ (kbizAutoLock) ใช้ตัวยืนยันเดียวกัน]');
    { const db = makeDB(), T = db.T; R8.seed(T);
      T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' }), R8.EMP({ id:6, code:'Z1', nick:'แซด', bank_account:'1000000006' })];
      T.punches = R8.withId(['A1','Z1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-04')));
      T.deposit_entries = [...R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' })), { id:61, employee_id:6, period:'2026-09', amount:500, note:'lock' }];   // แซด 🔒 แค่ ก.ย. (ส.ค. ไม่มีแถว)
      const A = await R8.dev('2026-11-05T09:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.E(`punchSince='2026-08-26'; punches=punches.filter(p=>p.date>='2026-08-26'); recomputeAll(); loadOkSeq=loadDoneSeq=loadSeq; payLockAuto=true; payLockReady=true;`);   // เครื่องนี้ไม่มีสแกน ส.ค. (หลุดหน้าต่าง)
      const r = await A.E(`payDayLock('load')`);
      ok(R8.row(A, 1, '2026-10') && R8.row(A, 1, '2026-10').amount===300 && !R8.row(A, 6, '2026-10') && A.E(`punches.filter(p=>p.date<'2026-08-26').length`)===0,
         `แซด: ส.ค. ไม่มีแถว + ไม่อยู่ในเครื่อง แต่ฐานข้อมูลมีสแกน ส.ค. → ข้าม (ไม่ 🔒 ต.ค.) · สแกนก่อน punchSince ไม่เติมลงเครื่อง · เอ 🔒 300 (${JSON.stringify(r)})`);
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }
    { const db = makeDB(), T = db.T; R8.seed(T);
      T.employees = [R8.EMP({ id:7, code:'O1', nick:'ออฟ', branch:'OFFICE', dept:'ออฟฟิศ', deposit_opening:2400, start_date:'2026-09-10', bank_account:'1000000007' })];
      T.punches = R8.withId([...R8.punRows('O1', '2026-09-10', '2026-11-27')]);
      const A = await R8.dev('2026-11-28T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.E(`punches=punches.filter(p=>!(p.date<'2026-10-01')); recomputeAll();`);   // แคชค้าง: ไม่มีสแกน ก.ย. ของออฟ (ฐานข้อมูลมี)
      A.E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
      A.io.confirms.length = 0;
      await A.E(`exportKbizPay('OFFICE')`); await wait(50);
      const res = A.d.getElementById('kbizResBody').textContent;
      ok(!R8.row(A, 7, '2026-10') && !A.io.confirms.some(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) && /1 คนยังไม่ปิดยอดงวดก่อน ต\.ค\. 69/.test(res) && A.E(`empPeriodSet(employees[0]).has('2026-09')`),
         'K BIZ ออฟฟิศ พ.ย.: แคชไม่มีสแกน ก.ย. แต่ฐานข้อมูลมี → ไม่ปิดยอด ต.ค. (ยืนยันกับฐานข้อมูลก่อน) · เติมสแกน ก.ย. ลงเครื่อง · หน้าต่างผลบอก "1 คนยังไม่ปิดยอดงวดก่อน ต.ค. 69"');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }
  }
  { console.log('[41f 🔒 สำรองฯ ที่หักได้บางส่วน (สุทธิไม่พอ) → หลัง 🔒 อัตโนมัติ สลิป/สรุปยังบอก "หักได้ X จาก Y" · เงินเท่าเดิม · 🔒 ยอด ✎ ที่แก้เองไม่ขึ้นเหตุผล]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'A1', nick:'เอ' }), R8.EMP({ id:2, code:'B1', nick:'บี', bank_account:'1000000002' })];
    T.punches = R8.withId(['A1','B1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-05')));
    T.deposit_entries = [1,2].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));
    T.pvd_members = [PVM(1), PVM(2)]; T.pvd_entries = [{ id:8, employee_id:2, period:'2026-10', emp_amount:100, er_amount:null, note:'' }];
    T.advances = [{ id:501, employee_id:1, period:'2026-10', amount:11500, taken_date:'2026-10-15', note:'' }];   // สุทธิก่อนหักเงินประกัน 500 → เงินประกัน 300 → เหลือ 200
    const B = await R8.dev('2026-11-04T12:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    const pv = id => JSON.parse(B.E(`JSON.stringify((x=>({ded:x.ded,want:x.want,short:x.short,locked:x.locked}))(calcPay(employees.find(e=>e.id===${id}),'2026-10').pvd))`));
    const sumOf = X => (X.E(`(()=>{ go('payroll'); document.getElementById('periodSel').value='2026-10'; renderPayroll(); return document.getElementById('page-payroll').textContent; })()`).match(/ไม่พอ/g) || []).length;
    const b0 = [pv(1), pv(2)], s0 = txt(B.E, `buildSlip(employees.find(e=>e.id===1),'2026-10',true)`), n0 = R8.pay(B, 1, '2026-10'), c0 = sumOf(B);
    const A = await R8.dev('2026-11-06T09:00:00+07:00', db); await A.E(`loadAll()`); await wait(400);
    const pa = id => JSON.parse(A.E(`JSON.stringify((x=>({ded:x.ded,want:x.want,short:x.short,locked:x.locked}))(calcPay(employees.find(e=>e.id===${id}),'2026-10').pvd))`));
    const a1 = [pa(1), pa(2)], s1 = txt(A.E, `buildSlip(employees.find(e=>e.id===1),'2026-10',true)`), n1 = R8.pay(A, 1, '2026-10');
    const noDate = x => x.replace(/ออกเอกสาร\s*\d+ \S+/g, '');   // วันที่ออกเอกสาร = วันที่พิมพ์
    const c1 = sumOf(A);
    ok(b0[0].ded===200 && b0[0].short===300 && a1[0].locked && a1[0].ded===200 && a1[0].want===500 && a1[0].short===300 && noDate(s1)===noDate(s0) && /หักได้ 200 จาก 500/.test(s1) && n1.net===n0.net && c0 > 0 && c1===c0,
       `เอ: ก่อน 🔒 ${JSON.stringify(b0[0])} → หลัง ${JSON.stringify(a1[0])} · สลิปเหมือนเดิมทุกตัวอักษร · สรุปเงินเดือนชิป "ไม่พอ" ${c0} → ${c1} (เดิมหายหลังล็อก)`);
    ok(a1[1].locked && a1[1].ded===100 && a1[1].short===0 && a1[1].want===100, `บี ✎ 100 (แก้เอง สุทธิพอ) → 🔒 100 ไม่ขึ้นเหตุผล ${JSON.stringify(a1[1])}`);
    ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[42a รอบ 10 E: จอประวัติ — 📚 ประวัติเงินเดือนเป็นการ์ดที่ ≤560px · 🕘 ค้น "ประกัน" บอกที่ดูยอดหักอัตโนมัติ · 🛡️ ประวัติเงินประกันไม่หายเงียบ · งวดที่จ่ายแล้วยังไม่ 🔒 บอกให้กด 🔒]');
    const A = boot({ now:'2026-11-10T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true;
      var a=emp({id:1,code:'A',nick:'เอ',deposit_target_v1:5000,deposit_monthly_v1:500}); employees=[a]; shifts={A:mk('2026-07-26','2026-11-09')};
      depositEntries=[fromDbDep({id:1,employee_id:1,period:'2026-08',amount:500,note:'lock'})];`);
    const det = (tab, p) => E(`(()=>{ detailEmpId=1; detailTab='${tab}'; go('detail'); document.getElementById('detailPeriodSel').innerHTML='<option>${p}</option>'; document.getElementById('detailPeriodSel').value='${p}'; renderDetail(); return document.getElementById('detailContent').innerHTML; })()`);
    const tx = h => E(`(()=>{ const d=document.createElement('div'); d.innerHTML=${JSON.stringify(h)}; return d.textContent.replace(/\\s+/g,' '); })()`);
    const debt = det('debt', '2026-11'), dt = tx(debt);
    const src = JSON.parse(E(`(()=>{ const d=document.createElement('div'); d.innerHTML=${JSON.stringify(debt)};
      const card=[...d.querySelectorAll('.card')].find(c=>/🛡️ ประวัติเงินประกัน/.test(c.textContent)); if(!card) return '{}';
      const o={}; for(const tr of card.querySelectorAll('tbody tr')){ const td=tr.querySelectorAll('td'); o[td[0].textContent.trim().split(' ')[0]+' '+td[0].textContent.trim().split(' ')[1]] = td[td.length-1].textContent.replace(/\\s+/g,' ').trim(); }
      return JSON.stringify(o); })()`));
    const g = k => (Object.entries(src).find(([n]) => n.includes(k)) || ['', ''])[1];
    ok(/🛡️ ประวัติเงินประกัน/.test(dt) && /🔒 ปิดยอด/.test(g('ส.ค.')) && /จ่ายแล้ว ยังไม่ปิดยอด — กด 🔒 ที่หน้า 🛡️/.test(g('ก.ย.')) && /จ่ายแล้ว ยังไม่ปิดยอด — กด 🔒 ที่หน้า 🛡️/.test(g('ต.ค.')) &&
       /คิดสด — อาจเปลี่ยน/.test(g('พ.ย.')) && !/จ่ายแล้ว/.test(g('พ.ย.')),
       `🛡️ ประวัติเงินประกัน: ส.ค. 🔒 · ก.ย./ต.ค. (จ่ายแล้ว) "จ่ายแล้ว ยังไม่ปิดยอด — กด 🔒 ที่หน้า 🛡️" · พ.ย. (ยังไม่จ่าย) "คิดสด" ${JSON.stringify(src)}`);
    E(`depReady=false;`);
    const d0 = tx(det('debt', '2026-11'));
    ok(/🛡️ ประวัติเงินประกัน/.test(d0) && /ยังอ่านสมุดเงินประกัน \(ตาราง deposit_entries\) ไม่ได้/.test(d0) && /-500/.test(d0),
       'อ่านตารางเงินประกันไม่ได้ (!depReady) → การ์ดยังขึ้นพร้อมบอกสาเหตุ + ยอดที่คิดจากสแกน (เดิมหายเงียบ) ' + d0.slice(d0.indexOf('🛡️ ประวัติ'), d0.indexOf('🛡️ ประวัติ') + 400));
    E(`depReady=true; depLoadErr='โหลดเงินประกันไม่ครบ: timeout';`);
    ok(/⛔ โหลดเงินประกันไม่ครบ: timeout — ลากหน้าลง/.test(tx(det('debt', '2026-11'))), 'สมุดโหลดไม่ครบ (depLoadErr) → การ์ดบอกสาเหตุ');
    E(`depReady=false; depLoadErr='โหลดเงินประกันไม่ครบ: fail';`);   // ผลตรวจรอบ 10: โหลดครั้งแรกล้ม (500/timeout/42501) = depReady ยัง false + depLoadErr
    const d2 = tx(det('debt', '2026-11'));
    ok(/⛔ โหลดเงินประกันไม่ครบ: fail/.test(d2) && !/jj_deposit\.sql/.test(d2) && /ไม่รู้ว่า 🔒 แล้วหรือยัง/.test(d2) && !/กด 🔒 ที่หน้า 🛡️/.test(d2),
       'โหลดครั้งแรกล้ม (!depReady + depLoadErr) → บอก ⛔ สาเหตุจริง (ไม่แนะนำรัน jj_deposit.sql) · งวดที่จ่ายแล้ว "ยังอ่านสมุดไม่ได้ ไม่รู้ว่า 🔒 แล้วหรือยัง" (ไม่ใช่ "กด 🔒")');
    E(`depReady=true; depLoadErr='';`);
    const money = det('money', '2026-11');
    const hist = E(`(()=>{ const d=document.createElement('div'); d.innerHTML=${JSON.stringify(money)}; const t=[...d.querySelectorAll('table')].find(x=>/ประกันสะสม/.test(x.textContent));
      return t ? JSON.stringify({ mc:t.classList.contains('mcard'), lab:[...t.querySelectorAll('tbody tr:first-child td')].map(td=>td.getAttribute('data-l')), name:!!t.querySelector('tbody td.mc-name'), foot:[...t.querySelectorAll('tfoot td[data-l]')].length }) : 'null'; })()`);
    const H = JSON.parse(hist);
    ok(H && H.mc && H.name && H.lab.includes('เงินประกันงวดนี้') && H.lab.includes('ประกันสะสม') && H.lab.includes('สุทธิ') && H.foot >= 5,
       `📚 ประวัติเงินเดือน = table.mcard + td[data-l] (มือถือ ≤560px เป็นการ์ด · คอลัมน์เงินประกันไม่ล้นจอ) ${hist}`);
    T.payroll_audit = [{ id:1, at:'2026-11-01T10:00:00+07:00', username:'o', action:'login', tbl:'', detail:'เข้าสู่ระบบ' }];
    E(`go('audit'); document.getElementById('audQ').value='ประกัน';`); await E(`renderAudit()`);
    const au = A.d.getElementById('auditBody').textContent;
    ok(/ยอดเงินประกันที่หักอัตโนมัติทุกงวดไม่ได้จดที่หน้านี้/.test(au) && /🪪 ข้อมูลพนักงาน → เลือกคน → แท็บ เบิก · ยืม · ประกัน/.test(au),
       '🕘 ค้นคำว่า "ประกัน" → บรรทัดบอกว่ายอดหักอัตโนมัติดูที่ 🪪 → เบิก · ยืม · ประกัน');
    E(`document.getElementById('audQ').value='OT';`); await E(`renderAudit()`);
    ok(!/ยอดเงินประกันที่หักอัตโนมัติ/.test(A.d.getElementById('auditBody').textContent), 'ค้นคำอื่น → ไม่ขึ้นบรรทัดนี้');
    E(`document.getElementById('audQ').value='ประกันสังคม';`); await E(`renderAudit()`);
    ok(!/ยอดเงินประกันที่หักอัตโนมัติ/.test(A.d.getElementById('auditBody').textContent), 'ค้น "ประกันสังคม" → ไม่ขึ้นกล่องเงินประกัน (ผลตรวจรอบ 10)');
    ok(!E(`[...document.scripts].some(s=>s.textContent.includes('📜'))`), 'ข้อความอ้าง "📜 ประวัติ" เปลี่ยนเป็น "🕘 ประวัติการทำรายการ" ครบ (ชื่อเมนูจริง)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  // ============ 43) ผลตรวจรอบ 10 — บาทจริง
  { console.log('[43a fetchPunchRange: สแกนใหม่ของวันนี้เข้ามาระหว่างที่ loadAll เบื้องหลังอ่าน (ได้เกิน count) → รับไว้ · 🔒 อัตโนมัติไม่ล้ม]');
    const db = makeDB(), T = db.T; R8.seed(T);
    const emps = []; for(let i = 1; i <= 12; i++) emps.push(R8.EMP({ id:i, code:'C'+i, nick:'n'+i, bank_account:String(1000000000+i) }));
    T.employees = emps; T.punches = R8.withId(emps.flatMap(e => R8.punRows(e.code, '2026-07-26', '2026-11-05')));
    T.deposit_entries = emps.flatMap(e => R8.lockOf.map((p, i) => ({ id:e.id*10+i, employee_id:e.id, period:p, amount:500, note:'lock' })));
    const A = await R8.dev('2026-11-05T09:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`); await wait(200);
    A.E(`payLockAuto=true; payLockReady=true;`);
    let nid = 900000, on = true, calls = 0;
    db.latency = (t, op) => { if(on && t === 'punches' && op === 'select'){ calls++; if(calls % 2 === 0) T.punches.push({ id:nid++, emp_code:'C1', punch_date:'2026-11-05', punch_time:'09:0'+(calls%10)+':00', device_sn:'' }); } return 0; };
    const r = await A.E(`payDayLock('tab')`); on = false; delete db.latency;
    const L = T.deposit_entries.filter(x => x.period === '2026-10');
    ok(r && !r.fail && L.length === 12 && L.every(x => x.amount === 300 && x.note === 'lock'), `เครื่องสแกนส่งสแกนใหม่ระหว่างอ่าน → 🔒 ต.ค. ${L.length} คน × 300 (${JSON.stringify(r)}) — เดิม {"fail":true} ไม่ล็อกเลย`);
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[43b บัญชี _br นำเข้าสแกนคนสาขาตัวเอง ตอนออฟฟิศ ต.ค. ยังไม่ 🔒 (ออฟฟิศไม่ล็อกเองวันจ่าย) → ผ่าน · ไฟล์มีสแกนคนออฟฟิศในงวดที่จ่ายแล้ว → ยังบล็อก (fail closed)]');
    const A = boot({ now:'2026-11-08T10:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), o=V({id:3,code:'O1',nick:'ออฟ',branch:'OFFICE',bank_account:'1000000003'});
      employees=[a,o]; punches=[...mkP('A1','2026-07-26','2026-11-07'), ...mkP('O1','2026-07-26','2026-11-07')]; recomputeAll(); depositEntries=[];`);
    const v1 = JSON.parse(E(`JSON.stringify(depScope(() => employees.flatMap(e => depLockDue(e, { before:DEP_V2_START }).map(x => ({ employee_id:e.id, period:x.p, amount:x.amount, note:'lock' })))))`)).map((r, i) => Object.assign({ id:70000+i }, r));
    E(`depositEntries = ${JSON.stringify(v1)}.map(fromDbDep);`);
    await SYNC(A); E(AUTO); await E(`payDayLock('load')`);
    const oct = T.deposit_entries.filter(x => x.period === '2026-10').map(x => x.employee_id);
    const warn = E(`depWarnHtml(depUnlockedPeriods(), 'dep')`);
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{today:'v',emp:'vaed',detail:'vaed',adv:'vaed',shift:'vae',payroll:'v',_br:'JJLP'}}}; applyUser(AUTH); scopeEmployees(); go('emp');`);
    const res = [];
    for(const [lab, rows, want] of [['เอ 27 ต.ค. + 7 พ.ย. (งวด พ.ย. หน้าร้าน)', [['A1','2026-10-27','09:03:00'],['A1','2026-11-07','09:02:00']], true],
                                     ['เอ 1 พ.ย.', [['A1','2026-11-01','09:01:00']], true],
                                     ['ออฟ 30 ต.ค. (เครื่องร่วม · งวด ต.ค. ออฟฟิศจ่ายแล้ว ยังไม่ 🔒)', [['O1','2026-10-30','19:01:00']], false]]){
      io.confirms.length = 0; A.d.getElementById('toast').textContent = '';
      const r = await E(`importPaidGuard(${JSON.stringify(rows.map(([c,d,t]) => ({ emp_code:c, punch_date:d, punch_time:t })))}, new Map())`);
      res.push(lab + ' → ' + r + (r === want ? '' : ' ✗') + (r ? '' : ' (' + toastT(A).slice(0, 80) + ')'));
    }
    ok(oct.join() === '1' && !res.some(x => / ✗/.test(x)), 'ออฟฟิศ ต.ค. ยังไม่ 🔒 (แถว ต.ค. ของ ' + oct.join() + ') · _br ลาดพร้าว นำเข้า: ' + res.join(' · '));
    ok(/ออฟฟิศ 1 คน: ระบบไม่ปิดยอดเองวันจ่าย/.test(warn) && /ยังไม่ปิด = บัญชีที่เห็นเฉพาะบางสาขา\/ไม่มีสิทธิ์หน้า 🛡️ แก้กะ/.test(warn), 'แถบเตือนบอกผลของการยังไม่ปิดยอดออฟฟิศ (บัญชีสาขา/ไม่มีสิทธิ์ 🛡️ แก้กะ/ตั้งค่าเงินไม่ได้)');
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[43c lockHow: คิด depPeriods() ครั้งเดียว (กติกา "ห้ามเรียกในลูปต่อคน") · ผลเท่าเดิม]');
    const db = makeDB(), T = db.T; R8.seed(T);
    const emps = []; for(let i = 1; i <= 30; i++) emps.push(R8.EMP({ id:i, code:'C'+i, nick:'n'+i, bank_account:String(1000000000+i), ...(i === 30 ? { branch:'OFFICE', dept:'ออฟฟิศ' } : {}) }));
    T.employees = emps; T.punches = R8.withId(emps.flatMap(e => R8.punRows(e.code, '2026-07-26', '2026-11-05')));
    T.deposit_entries = emps.flatMap(e => R8.lockOf.map((p, i) => ({ id:e.id*10+i, employee_id:e.id, period:p, amount:500, note:'lock' })));
    const A = await R8.dev('2026-11-06T12:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    const r = JSON.parse(A.E(`(()=>{ let n=0; const o=depPeriods; depPeriods=function(){ n++; return o(); };
      const due = depScope(() => employees.flatMap(e => depLockDue(e, { ps: o().reverse() })));
      const s1 = lockHow(due.filter(x=>x.e.branch!=='OFFICE'), '🛡️'), s2 = lockHow(due, '🛡️'); depPeriods=o;
      return JSON.stringify({ rows:due.length, n, s1, s2 }); })()`));
    ok(r.rows === 30 && r.n === 2 && /ระบบจะปิดยอดให้เอง/.test(r.s1) && /กด 🔒/.test(r.s2), `${r.rows} แถว → depPeriods() ${r.n} ครั้ง (1 ครั้งต่อการเรียก · เดิม 1 ครั้งต่อแถว) · หน้าร้านล้วน = "ระบบปิดยอดให้เอง" · มีออฟฟิศ = "กด 🔒"`);
  }
  { console.log('[43d เจ้าของแก้กะหลังวันจ่าย: ปิดยอด ต.ค. ก่อนแก้ของคนที่ ส.ค./ก.ย. ยังไม่ 🔒 → หน้าต่างถามบอกชื่อ + งวด (ยอดสะสมยังไม่ได้ตรวจ)]');
    const A = boot({ now:'2026-11-10T10:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    E(SEED); E(PUN); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); auditReady=true; ${V5}
      var a=V({id:1,code:'A1',nick:'เอ',bank_account:'1000000001'}), b=V({id:2,code:'B1',nick:'บี',bank_account:'1000000002'});
      employees=[a,b]; punches=[...mkP('A1','2026-07-26','2026-11-09'), ...mkP('B1','2026-07-26','2026-11-09')]; recomputeAll(); depositEntries=[];`);
    const v1 = JSON.parse(E(`JSON.stringify(depScope(() => employees.filter(e=>e.id===1).flatMap(e => depLockDue(e, { before:DEP_V2_START }).map(x => ({ employee_id:e.id, period:x.p, amount:x.amount, note:'lock' })))))`)).map((r, i) => Object.assign({ id:70000+i }, r));
    E(`depositEntries = ${JSON.stringify(v1)}.map(fromDbDep);`);
    await SYNC(A); E(AUTO); await E(`payDayLock('load')`);
    const a0 = T.deposit_entries.filter(x => x.period === '2026-10').map(x => x.employee_id).join();
    io.confirms.length = 0;
    await E(`(async()=>{ go('shift'); await updShift(0,'inGrace',7); })()`); await wait(30);
    const c = io.confirms.find(m => /จะปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)) || '';
    ok(a0 === '1' && /⚠️ บี ยังไม่ 🔒 งวดก่อน ต\.ค\. 69 \(ส\.ค\. 69, ก\.ย\. 69\) — ยอด ต\.ค\. 69 ที่จะล็อกคิดจากยอดสะสมที่ยังไม่ได้ตรวจ/.test(c) && !/เอ ยังไม่ 🔒/.test(c),
       '🔒 อัตโนมัติข้ามบี (ต.ค. มีแค่ ' + a0 + ') · เจ้าของแก้กะ → หน้าต่างถามบอก "บี ยังไม่ 🔒 งวดก่อน ต.ค. 69 (ส.ค. 69, ก.ย. 69) — ยอด ต.ค. 69 … ยังไม่ได้ตรวจ" ' + JSON.stringify(c.split('\n').filter(l => /ยังไม่ 🔒/.test(l))));
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
  }
  { console.log('[43e ข้อความหลังข้อ B: หัวหน้า 🛡️ ไม่บอกว่าระบบปิดยอดให้ทุกคน · K BIZ ที่สร้างแล้ว (ออฟฟิศ) ไม่บอกว่าระบบ 🔒 ให้ · ปิดยอดออฟฟิศ (K BIZ งวดถัดไป/ปุ่ม 🔒) เตือนเรื่องวันสุดท้ายหลังสร้างไฟล์]');
    const db = makeDB(), T = db.T; R8.seed(T);
    T.employees = [R8.EMP({ id:1, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' }), R8.EMP({ id:3, code:'S1', nick:'หน้าร้าน', bank_account:'1000000003' })];
    T.punches = R8.withId([...R8.punRows('O1', '2026-07-26', '2026-11-27'), ...R8.punRows('S1', '2026-07-26', '2026-11-27')]);
    T.deposit_entries = [1,3].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })));
    const A = await R8.dev('2026-11-28T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    const info = A.E(`(()=>{ go('dep'); renderDeposit(); return document.getElementById('depInfo').textContent.replace(/\\s+/g,' '); })()`);
    ok(!/ระบบ 🔒 ให้เองเมื่อถึงวันจ่าย/.test(info) && /พนักงานหน้าร้านที่ปิดยอดงวดก่อนนั้นครบแล้ว ระบบปิดยอดให้เองในวันจ่าย/.test(info) && /ออฟฟิศ กด 🔒 เองหลังสิ้นเดือน หรือยืนยันตอนสร้างไฟล์ K BIZ งวดถัดไป/.test(info),
       'หัวหน้า 🛡️: "หน้าร้านที่ปิดยอดงวดก่อนนั้นครบแล้ว ระบบปิดยอดให้เองในวันจ่าย · ออฟฟิศ กด 🔒 เอง…" (ไม่ขัดกับแถบเตือน)');
    // ปุ่ม 🔒 ต.ค. (ออฟฟิศ) → หัวหน้าต่างเตือนเรื่องวันสุดท้าย
    A.E(`document.getElementById('depPeriodSel').value='2026-10'`); await A.E(`depLockOpen()`);
    const body = A.d.getElementById('depLockBody').textContent;
    ok(/ออฟฟิศ: ยอดนี้คิดทั้งงวดรวมวันสุดท้าย \(วันจ่าย\) แต่ไฟล์ K BIZ สร้างก่อนวันนั้น/.test(body), 'ปุ่ม 🔒 ต.ค. มีคนออฟฟิศ → หน้าต่างเตือน "ยอดนี้คิดทั้งงวดรวมวันสุดท้าย … ไฟล์ K BIZ สร้างก่อนวันนั้น · เทียบยอดในไฟล์ก่อน"');
    A.E(`closeModal('depLockBg')`);
    // สร้างไฟล์ K BIZ พ.ย. ออฟฟิศ → ถามปิดยอด ต.ค. พร้อมคำเตือนเดียวกัน
    A.E(`go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    A.io.confirms.length = 0; A.io.confirmAns = m => !/ก่อนสร้างไฟล์ จะปิดยอด/.test(m);
    await A.E(`exportKbizPay('OFFICE')`); await wait(50); A.io.confirmAns = null;
    const ck = A.io.confirms.find(m => /ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) || '';
    ok(/ออฟฟิศ: ยอดนี้คิดทั้งงวดรวมวันสุดท้าย/.test(ck) && !R8.row(A, 1, '2026-10'), 'K BIZ พ.ย. ออฟฟิศ → หน้าต่างปิดยอด ต.ค. บอกเรื่องวันสุดท้าย (กดยกเลิก = ไม่ล็อก)');
    // 31 ต.ค. (วันจ่ายออฟฟิศ) หลังสร้างไฟล์ ต.ค. แล้วแก้รายการ → คำเตือนไม่บอกว่า "ระบบ 🔒 ยอดที่จ่ายจริงให้ก่อน"
    const B = await R8.dev('2026-10-31T10:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    T.payroll_audit.push({ id:9001, action:'kbiz', tbl:'kbiz_pay', detail:'สร้างไฟล์โอนเงินเดือน ต.ค. 2569 · ออฟฟิศ [p:2026-10] [br:OFFICE]' });
    B.io.confirms.length = 0; B.io.confirmAns = () => false;
    await B.E(`depKbizMadeAsk([employees.find(e=>e.id===1)], () => ['2026-10'], 'บันทึก OT 31 ต.ค.')`); B.io.confirmAns = null;
    const km = B.io.confirms[0] || '';
    ok(/K BIZ เงินเดือน ต\.ค\. 69/.test(km) && !/ระบบ 🔒 ยอดที่จ่ายจริงให้ก่อน/.test(km) && /ออฟฟิศ: ระบบไม่ปิดยอดเอง — ให้ผู้มีสิทธิ์หน้า 🛡️ กด 🔒 งวดนั้นหลังสิ้นเดือนก่อน/.test(km),
       'วันจ่ายออฟฟิศ หลังสร้างไฟล์ K BIZ → "กดยกเลิก แล้วแก้หลังวันจ่าย (… ออฟฟิศ: ให้ผู้มีสิทธิ์หน้า 🛡️ กด 🔒 งวดนั้นหลังสิ้นเดือนก่อน)" ' + JSON.stringify(km.split('\n').slice(-3, -2)));
    ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
  }
  { console.log('[41g fakedb: หลายเครื่องใช้ฐานข้อมูลร่วม แต่ client แยกกัน — เครื่อง ผจก. (สิทธิ์ดูอย่างเดียว) ไม่ทำให้เครื่องเจ้าของเขียนไม่ได้]');
    const db = makeDB();
    const A = boot({ db, now:'2026-11-06T10:00:00+07:00' }); await wait(300); A.E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH); go('dep');`);
    const M = boot({ db, now:'2026-11-06T10:00:00+07:00' }); await wait(300); M.E(`AUTH={username:'m',role:'staff',apps:{payroll:{payroll:'v'}}}; applyUser(AUTH);`);
    const r = await A.E(`(async()=>{ const r = await db.from('deposit_entries').insert({ employee_id:2, period:'2026-10', amount:0, note:'lock' }).select(); return r.error ? r.error.message : 'ok'; })()`);
    const m = await M.E(`(async()=>{ const r = await db.from('deposit_entries').insert({ employee_id:3, period:'2026-10', amount:0, note:'lock' }).select(); return r.error ? r.error.message : 'ok'; })()`);
    ok(r==='ok' && m!=='ok', `เจ้าของเขียนได้ (${r}) · ผจก. เขียนไม่ได้ (${m})`);
  }

  // ============ 44) เหตุการณ์จริง 2026-10-19 11:32: บัญชี "เน" เลื่อน "เริ่มหักตั้งแต่งวด" ส.ค. → ต.ค. หลังสลิป ส.ค./ก.ย. หัก 500 ไปแล้ว ============
  //   เดิมกันแค่ "ย้อน" (depStartBack) → ไปข้างหน้าได้ → ส.ค./ก.ย. ไม่นับทุกคน ("ลิด ส่งมาหลายเดือน ยังขึ้นเดือนเดียว") · ตอนนี้ depStartFwd กัน (ตัวเลือก + depStartChange)
  { console.log('[44 เลื่อน "เริ่มหักตั้งแต่งวด" ไปข้างหน้าข้ามงวดที่จ่ายแล้ว (เหตุการณ์ 2026-10-19: ส.ค. → ต.ค.) — บาทจริง]');
    const mk42 = async (now, to, who) => {
      const A = boot({ now }); await wait(300);
      A.E(SEED); A.E(`AUTH={username:'เน',role:'owner'}; applyUser(AUTH); payLockAuto=false;
        var lid=emp({id:1,code:'L1',nick:'ลิด',deposit_target_v1:5000,deposit_monthly_v1:500});
        var off=emp({id:2,code:'O1',nick:'ออฟ',branch:'OFFICE',dept:'ออฟฟิศ',deposit_target_v1:5000,deposit_monthly_v1:500});
        var nw=emp({id:3,code:'N1',nick:'ใหม่'});
        var stop=emp({id:4,code:'P1',nick:'ปิดหัก',deposit_on:false,deposit_target_v1:5000,deposit_monthly_v1:500});
        var zero=emp({id:5,code:'Z1',nick:'ศูนย์',deposit_target:0,deposit_target_v1:0,deposit_monthly_v1:0});
        var __all={lid,off,nw,stop,zero}; employees=${JSON.stringify(who || ['lid','off','nw'])}.map(k=>__all[k]);
        shifts={L1:mk('2026-06-26','${to}'),O1:mk('2026-07-26','${to}'),N1:'${to}'>='2026-09-26'?mk('2026-09-26','${to}'):[],P1:mk('2026-07-26','${to}'),Z1:mk('2026-07-26','${to}')};
        for(const c in shifts) if(!employees.some(e=>e.code===c)) delete shifts[c];
        depositEntries=[]; var __sh42 = shifts; go('dep'); renderDeposit();
        var __sel42 = v => Object.assign(document.createElement('select'),{innerHTML:'<option value="'+(settings.depStart||'')+'">a</option><option value="'+v+'">b</option>',value:v});`);
      return A;
    };
    const snap = A => A.E(`JSON.stringify(depScope(() => employees.map(e => e.nick + ' ' + ['2026-08','2026-09','2026-10'].map(p => { const d = depositCalc(e, p); return d.ded + '>' + d.collected; }).join(' '))))`);
    const opt = (A, v) => JSON.parse(A.E(`JSON.stringify((o=>o?{d:o.disabled,t:o.textContent}:null)([...document.getElementById('depStartSel').options].find(o=>o.value==='${v}')))`));
    const change = async (A, v) => { A.io.alerts.length = 0; A.io.confirms.length = 0; A.db.log.length = 0; A.E(`var __s42 = __sel42('${v}')`); await A.E(`depStartChange(__s42)`);
      A.E(`shifts = __sh42`);   // saveSetting → recomputeAll สร้าง shifts ใหม่จาก punches (เทสนี้ตั้ง shifts ตรง ๆ) → คืนชุดเดิมก่อนเทียบยอด
      return A.io.alerts.join('\n'); };

    // ① ส.ค./ก.ย. จ่ายแล้ว (5 ก.ย. / 5 ต.ค. · ออฟฟิศ 30 ก.ย.) ยังไม่ 🔒 → ห้ามเลื่อนไป ต.ค.
    const A = await mk42('2026-10-19T11:32:00+07:00', '2026-10-18'); const { E } = A;
    const s0 = snap(A);
    ok(/ลิด 500>500 500>1000 300>1300/.test(s0) && /ออฟ 500>500 500>1000 300>1300/.test(s0) && /ใหม่ 0>0 0>0 300>300/.test(s0), 'ก่อนเลื่อน: ลิด/ออฟ ส.ค. 500 · ก.ย. 500 (สะสม 1,000) · ต.ค. 300 → 1,300 · ใหม่ (เริ่ม ต.ค.) 300 — ' + s0);
    ok(/งวดแรกที่เริ่มเก็บเงินประกันจริง/.test(A.d.getElementById('depStartNote').textContent) && /ไม่ต้องเปลี่ยนเมื่อกติกาเปลี่ยน/.test(A.d.getElementById('depStartNote').textContent) && /3,000\/300 เริ่ม ต\.ค\. 69/.test(A.d.getElementById('depStartNote').textContent),
       'ข้อความใต้ช่อง "เริ่มหักตั้งแต่งวด": งวดแรกที่เริ่มเก็บจริง · ไม่ต้องเปลี่ยนเมื่อกติกาเปลี่ยน (3,000/300 เริ่ม ต.ค. 69 เอง)');
    const o9 = opt(A, '2026-09'), o10 = opt(A, '2026-10'), o8 = opt(A, '2026-08');
    ok(o8 && !o8.d && o9 && o9.d && o10 && o10.d && /ข้าม ส\.ค\. 69 ที่ยังไม่ 🔒/.test(o10.t) && /ข้าม ส\.ค\. 69 ที่ยังไม่ 🔒/.test(o9.t),
       'ตัวเลือก: ส.ค. (ปัจจุบัน) เลือกได้ · ก.ย./ต.ค. เลือกไม่ได้ "(ข้าม ส.ค. 69 ที่ยังไม่ 🔒)" — ' + o10.t);
    let al = await change(A, '2026-10');
    ok(E(`settings.depStart`)==='2026-08' && E(`__s42.value`)==='2026-08' && !A.db.log.length && !A.io.confirms.length,
       'เลือก ต.ค. (เครื่องรุ่นเก่า/ค่าที่ส่งมา) → บล็อกก่อนถาม · depStart ยัง ส.ค. · ช่องกลับเป็น ส.ค. · ไม่เขียนอะไร');
    ok(/ห้ามเลื่อน "เริ่มหักตั้งแต่งวด" งวด ส\.ค\. 2569 → งวด ต\.ค\. 2569/.test(al) && /ส\.ค\. 69 \(2 คน\) · ก\.ย\. 69 \(2 คน\)/.test(al) && /ยอดที่หักจริงจะหายจากประวัติ\/ยอดสะสม/.test(al),
       'alert: งวดไหน · กี่คน (ส.ค. 69 (2 คน) · ก.ย. 69 (2 คน)) · "ยอดที่หักจริงจะหายจากประวัติ/ยอดสะสม"');
    // ผลตรวจ: เดิมบรรทัด "หยุดเก็บ = ปิดหักรายคน" ไม่บอกให้ 🔒 ก่อน — ปิดหัก (deposit_on=false) ตอน ส.ค./ก.ย. ยังไม่ 🔒 = ยอดที่หักจริงของคนนั้นหายแบบเหตุการณ์เดียวกัน
    ok(/ทุกกรณี: 🔒 ปิดยอดงวดข้างบนให้ครบทุกคนก่อน[^]*แล้วค่อย\n• จะหยุดเก็บ = ปิดหักรายคน \(สวิตช์ "หัก"\) หรือตั้งเป้าหมาย 0 ที่หน้า 🛡️ — ปิดหัก\/เป้า 0 มีผลย้อนกับงวดที่ยังไม่ 🔒 ด้วย[^]*\n• จะเลื่อนจริง = เลื่อนช่องนี้$/.test(al) &&
       /ไม่ต้องเปลี่ยนเมื่อกติกาเปลี่ยน \(กติกา 3,000\/300 เริ่มงวด ต\.ค\. 2569 เองแล้ว\)/.test(al),
       'alert บอกทางที่ถูก: ทุกกรณี 🔒 ก่อน แล้วค่อย หยุดเก็บ (ปิดหัก/เป้า 0 — มีผลย้อนกับงวดที่ยังไม่ 🔒) หรือเลื่อนจริง · กติกา 3,000/300 เริ่ม ต.ค. เองแล้ว');
    ok(snap(A)===s0 && E(`depositCalc(lid,'2026-10').before`)===1000, 'บล็อกแล้วยอดสะสมไม่เปลี่ยน (ลิด สะสมก่อน ต.ค. 1,000 · ไม่ใช่ 0)');
    al = await change(A, '2026-09');
    ok(E(`settings.depStart`)==='2026-08' && /ส\.ค\. 69 \(2 คน\)/.test(al) && !/ก\.ย\. 69 \(/.test(al), 'เลื่อนไป ก.ย. → ห้ามเหมือนกัน (ข้ามแค่ ส.ค. 69 (2 คน))');
    ok(E(`depStartFwd('2026-08','2026-08').length`)===0 && E(`depStartFwd('2026-08','').length`)===0 && E(`depStartFwd('2026-08','2026-07').length`)===0,
       'depStartFwd: ไม่เปลี่ยน / "ทุกงวด" / ย้อน = ไม่ใช่การเลื่อนไปข้างหน้า (depStartBack ดูแล)');
    ok(E(`(()=>{ settings.depStart=''; const r = depStartFwd('', '2026-10').map(x=>x.p+':'+x.n).join(); settings.depStart='2026-08'; return r; })()`)==='2026-07:1,2026-08:2,2026-09:2',
       '"ทุกงวด" → ต.ค. = ไปข้างหน้า: ข้าม ก.ค. (ลิด) · ส.ค./ก.ย. (2 คน)');
    //    ยังไม่ได้ตั้งช่องนี้ (dep_start ว่าง = คิดย้อนหลังทุกงวด) → ยอดงวดเก่าเป็นยอดที่ระบบคิด อาจไม่เคยหักจริง — alert ไม่เรียกว่า "หักไปจริง" · ให้ตรวจสลิปก่อน 🔒 (ไม่ได้หัก = 🔒 0)
    E(`settings.depStart=''`); al = await change(A, '2026-08');
    ok(E(`settings.depStart`)==='' && !A.db.log.length && /ห้ามเลื่อน "เริ่มหักตั้งแต่งวด" ทุกงวด → งวด ส\.ค\. 2569/.test(al) && /ยังไม่ได้ตั้งช่องนี้/.test(al) && /ยอดเงินประกันที่ระบบคิดย้อนหลัง แต่ยังไม่ 🔒 ปิดยอด: ก\.ค\. 69 \(1 คน\)/.test(al) &&
       /อาจไม่ได้หักจริง — ตรวจกับสลิปจริงก่อน/.test(al) && /ไม่ได้หัก = แก้ "ยอดที่จะล็อก" เป็น 0/.test(al) && !/หักเงินประกันไปจริง/.test(al) && /ทุกกรณี: 🔒/.test(al),
       'dep_start ว่าง → ตั้ง ส.ค.: ห้าม (ก.ค. 69 (1 คน)) · ข้อความ "ยอดที่ระบบคิดย้อนหลัง … อาจไม่ได้หักจริง — ตรวจกับสลิปจริงก่อน" ไม่ใช่ "หักไปจริง"');
    E(`settings.depStart='2026-08'`);

    // ② 🔒 ส.ค./ก.ย. ครบ (เจ้าของกดด้วยยอดที่ระบบคิด) → เลือก ต.ค. ได้ · ยอดเท่าเดิม
    ok(V1LOCK(A)===4, '🔒 ส.ค./ก.ย. ลิด + ออฟ (4 แถว · 500 ทุกแถว) — ใหม่ไม่มีวันทำงานก่อน ต.ค. ไม่ต้องล็อก');
    E(`renderDeposit()`);
    ok(!opt(A, '2026-09').d && !opt(A, '2026-10').d && !/ข้าม/.test(opt(A, '2026-10').t), 'หลัง 🔒 ครบ: ตัวเลือก ก.ย./ต.ค. เลือกได้');
    //    อีกเครื่องเพิ่งปลด 🔒 ส.ค. ของลิด (เครื่องนี้ยังเห็น 🔒) → ตัวกันชั้นแรกผ่าน · depLockBefore อ่านสมุดใหม่ → เช็คซ้ำ = ห้าม
    A.T.deposit_entries = A.T.deposit_entries.filter(r => !(r.employee_id===1 && r.period==='2026-08'));
    al = await change(A, '2026-10');
    ok(E(`settings.depStart`)==='2026-08' && /ส\.ค\. 69 \(1 คน\)/.test(al) && !A.db.log.length && E(`depositCalc(lid,'2026-09').collected`)===1000,
       'อีกเครื่องปลด 🔒 ส.ค. ของลิดระหว่างนั้น → อ่านใหม่แล้วเช็คซ้ำ = ห้าม "ส.ค. 69 (1 คน)" · ไม่บันทึก · สะสมลิด ก.ย. ยัง 1,000');
    A.T.deposit_entries.push({ id:99001, employee_id:1, period:'2026-08', amount:500, note:'lock' }); await E(`depRefresh()`);
    //    อีกเครื่องเปลี่ยน "เริ่มหักตั้งแต่งวด" ระหว่างหน้าต่างยืนยัน (realtime อัปเดต settings ในเครื่อง) → ไม่บันทึกทับ · toast ให้ตรวจแล้วลองใหม่
    A.io.confirmAns = m => { if(/เปลี่ยน "เริ่มหักตั้งแต่งวด" งวด ส\.ค\. 2569 → งวด ต\.ค\. 2569/.test(m)) E(`settings.depStart='2026-09'`); return true; };
    al = await change(A, '2026-10'); A.io.confirmAns = null;
    ok(E(`settings.depStart`)==='2026-09' && !al && A.io.confirms.length >= 1 && !A.db.log.some(l=>l.table==='payroll_settings') && /เพิ่งถูกเปลี่ยนจากเครื่องอื่น/.test(A.d.getElementById('toast').textContent),
       'อีกเครื่องเปลี่ยน dep_start (→ ก.ย.) ระหว่างถามยืนยัน → ไม่ saveSetting ทับ · toast "เพิ่งถูกเปลี่ยนจากเครื่องอื่น"');
    E(`settings.depStart='2026-08'; renderDeposit();`);
    //    ไม่ใช่เจ้าของ (สิทธิ์หน้า 🛡️ ครบ) = ห้ามเหมือนเดิม
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{dep:'vaed'}}}; applyUser(AUTH); go('dep'); renderDeposit();`);
    ok(E(`document.getElementById('depStartSel').disabled`)===true, 'ไม่ใช่เจ้าของ: ช่อง "เริ่มหักตั้งแต่งวด" เลือกไม่ได้');
    al = await change(A, '2026-10');
    ok(E(`settings.depStart`)==='2026-08' && !al && !A.db.log.length && /ได้เฉพาะเจ้าของ\/แอดมิน/.test(A.d.getElementById('toast').textContent),
       'ไม่ใช่เจ้าของ (🔒 ครบแล้ว) เลือก ต.ค. → "ได้เฉพาะเจ้าของ/แอดมิน" · ไม่เปลี่ยน');
    E(`AUTH={username:'เน',role:'owner'}; applyUser(AUTH); go('dep'); renderDeposit();`);
    al = await change(A, '2026-10');
    ok(E(`settings.depStart`)==='2026-10' && !al && A.db.log.some(l=>l.table==='payroll_settings' && l.op==='update' && l.payload.dep_start==='2026-10'),
       'เจ้าของ หลัง 🔒 ส.ค./ก.ย. ครบ → เลื่อนเป็น ต.ค. ได้ (บันทึก dep_start)');
    ok(snap(A)===s0, 'หลังเลื่อน: ยอดเท่าเดิมทุกบาท (ลิด/ออฟ 500 · 500 · 300 → 1,300 · ใหม่ 300) — ' + snap(A));
    //    ผลตรวจ: 🔒 → เลื่อน → ปลด 🔒 ส.ค. = ทางอ้อมตัวกัน (ปลดแล้ว 0 ถาวร · 🔒 ใหม่ไม่ได้ depLockOpen · เลื่อนกลับไม่ได้ depStartBack) → ห้ามปลด · แก้ยอดยังได้
    E(`document.getElementById('depPeriodSel').value='2026-08'; renderDeposit();`);
    ok(/ปลดล็อกไม่ได้/.test(E(`(b=>b?b.title:'')(document.querySelector('#depTable button[data-emp="1"][data-p="2026-08"]'))`)),
       'ปุ่ม ✎ บนชิป 🔒 งวดก่อน "เริ่มหักตั้งแต่งวด": title "แก้ยอด … ปลดล็อกไม่ได้"');
    A.io.alerts.length = 0; A.io.prompts.length = 0; A.io.confirms.length = 0; A.db.log.length = 0; A.io.promptAns = [''];
    await E(`editDeposit(1,'2026-08')`); E(`shifts = __sh42`);
    al = A.io.alerts.join('\n');
    ok(/ปลดล็อกไม่ได้/.test(A.io.prompts[0]||'') && !/เว้นว่างแล้วตกลง = ปลดล็อก/.test(A.io.prompts[0]||'') && /ปลดล็อก งวด ส\.ค\. 2569 ของ ลิด ไม่ได้/.test(al) && /ปลดแล้วยอดเป็น 0 ถาวร/.test(al) &&
       !A.io.confirms.length && !A.db.log.length && snap(A)===s0 && E(`depositCalc(lid,'2026-09').collected`)===1000,
       'เลื่อนแล้ว ✎ ปลด 🔒 ส.ค. ของลิด (เว้นว่าง) → ห้าม "ปลดแล้วยอดเป็น 0 ถาวร" · ไม่เขียน · ยอดสะสมไม่เปลี่ยน (ก.ย. 1,000)');
    A.io.promptAns = ['450']; await E(`editDeposit(1,'2026-08')`); E(`shifts = __sh42`);
    const s450 = snap(A);
    A.io.promptAns = ['500']; await E(`editDeposit(1,'2026-08')`); E(`shifts = __sh42`);
    ok(/ลิด 450>450 500>950 300>1250/.test(s450) && snap(A)===s0 && A.T.deposit_entries.some(r=>r.employee_id===1 && r.period==='2026-08' && r.note==='lock' && r.amount===500),
       'งวดก่อน "เริ่มหักตั้งแต่งวด" ✎ แก้ยอด 🔒 ยังได้ (450 → สะสม 950/1,250) แล้วแก้กลับ 500 = เท่าเดิม');
    //    ทำตาม alert: 🔒 ครบแล้วค่อยปิดหักรายคน → ส.ค./ก.ย. ที่ 🔒 ยังนับ (ปิดหักมีผลเฉพาะงวดที่ยังไม่ 🔒)
    await E(`updDepField(1,'deposit_on',false)`); E(`shifts = __sh42`);
    ok(/ลิด 500>500 500>1000 0>1000/.test(snap(A)) && /ออฟ 500>500 500>1000 300>1300/.test(snap(A)), '🔒 ครบแล้วปิดหักลิด → ส.ค./ก.ย. ยังนับ 500/500 (สะสม 1,000) · ต.ค. ไม่หัก · ออฟไม่เปลี่ยน — ' + snap(A));
    ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');

    // ③ งวดที่ข้ามยังไม่จ่าย (20 ส.ค. · ส.ค. จ่าย 5 ก.ย.) → เลื่อนได้เหมือนเดิม
    const B = await mk42('2026-08-20T10:00:00+07:00', '2026-08-19');
    ok(B.E(`depositCalc(lid,'2026-08').ded`)===500 && B.E(`depStartFwd('2026-08','2026-09').length`)===0, '20 ส.ค.: ส.ค. ยังไม่ถึงวันจ่าย (ลิดหัก 500 ในสลิปที่ยังไม่ออก) → ไม่ติด');
    al = await change(B, '2026-09');
    ok(B.E(`settings.depStart`)==='2026-09' && !al && B.E(`depositCalc(lid,'2026-08').ded`)===0, 'เลื่อน ส.ค. → ก.ย. ก่อนวันจ่าย ส.ค. = ได้ (ส.ค. ไม่หัก — ยังไม่ได้จ่ายจริง)');

    // ④ ไม่มีใครถูกหักในงวดที่ข้าม (คนใหม่เริ่ม ต.ค. · ปิดหัก · เป้า 0) → เลื่อนได้
    const C = await mk42('2026-10-19T11:32:00+07:00', '2026-10-18', ['nw', 'stop', 'zero']);
    ok(C.E(`depositCalc(stop,'2026-08').ded + depositCalc(zero,'2026-09').ded`)===0 && !opt(C, '2026-10').d, 'ส.ค./ก.ย. จ่ายแล้วแต่ไม่มีใครถูกหัก (ปิดหัก/เป้า 0/เริ่ม ต.ค.) → ตัวเลือก ต.ค. เลือกได้');
    al = await change(C, '2026-10');
    ok(C.E(`settings.depStart`)==='2026-10' && !al && C.E(`depositCalc(nw,'2026-10').ded`)===300, 'เลื่อน ส.ค. → ต.ค. = ได้ · ใหม่ ต.ค. ยังหัก 300');
    ok(!B.errs.length && !C.errs.length, 'ไม่มี JS error (' + B.errs.concat(C.errs).slice(0,2).join(' | ') + ')');

    // ⑤ "จ่ายแล้ว" ตามรอบของแต่ละคน (periodRangeE · ไม่ใช่ปฏิทินหน้าร้าน/สาขาไหนก็ได้) — dep_start = ต.ค. · ออฟฟิศ ต.ค. 1–31 จ่าย 31 ต.ค. · หน้าร้าน ต.ค. จ่าย 5 พ.ย.
    const D = await mk42('2026-11-02T10:00:00+07:00', '2026-11-01', ['lid', 'off']);
    D.E(`settings.depStart='2026-10'`);
    ok(D.E(`depositCalc(lid,'2026-10').ded`)===300 && D.E(`depositCalc(off,'2026-10').ded`)===300, '2 พ.ย. (dep_start ต.ค.): ลิด/ออฟ ต.ค. หัก 300 · ยังไม่ 🔒 (ออฟฟิศไม่ล็อกเองวันจ่าย)');
    al = await change(D, '2026-11');
    ok(D.E(`settings.depStart`)==='2026-10' && /ต\.ค\. 69 \(1 คน\)/.test(al) && !D.db.log.length,
       'เลื่อน ต.ค. → พ.ย.: ห้าม "ต.ค. 69 (1 คน)" = ออฟฟิศ (จ่าย 31 ต.ค. แล้ว) · หน้าร้านยังไม่ถึงวันจ่าย 5 พ.ย. ไม่นับ — ' + (al.split('\n')[1]||''));
    //    วันจ่ายของออฟฟิศ (31 ต.ค. 20:00 · ไฟล์ K BIZ/โอนวันนี้) = นับว่าจ่ายแล้ว (pdPaid นับวันถัดไป — ผลตรวจ) · วันก่อนหน้า = ยังไม่จ่าย
    const F = await mk42('2026-10-31T20:00:00+07:00', '2026-10-31', ['lid', 'off']);
    F.E(`settings.depStart='2026-10'`);
    ok(F.E(`JSON.stringify(depStartFwd('2026-10','2026-11'))`)==='[{"p":"2026-10","n":1}]' && F.E(`pdPaid(off,'2026-10',bizToday())`)===false,
       'วันจ่ายออฟฟิศ 31 ต.ค.: depStartFwd ต.ค. → พ.ย. = ติด ต.ค. (1 คน) แม้ pdPaid ยังเป็น false');
    al = await change(F, '2026-11');
    ok(F.E(`settings.depStart`)==='2026-10' && /ต\.ค\. 69 \(1 คน\)/.test(al) && /ออฟฟิศ 🔒 ได้วันถัดจากวันจ่าย/.test(al), 'เลื่อนวันจ่ายออฟฟิศ = ห้าม · บอก "ออฟฟิศ 🔒 ได้วันถัดจากวันจ่าย"');
    const G = await mk42('2026-10-30T20:00:00+07:00', '2026-10-30', ['lid', 'off']);
    G.E(`settings.depStart='2026-10'`);
    ok(G.E(`depStartFwd('2026-10','2026-11').length`)===0, '30 ต.ค. (ก่อนวันจ่ายออฟฟิศ) → ไม่ติด');
    ok(!D.errs.length && !F.errs.length && !G.errs.length, 'ไม่มี JS error (' + D.errs.concat(F.errs, G.errs).slice(0,2).join(' | ') + ')');
  }
  // ============ 45) 💵 เบิกเงินประกันคืน (เจ้าของแจ้ง 2026-10-21: "น้อยเบิกเงินประกันไป 5000 ตอนนี้ต้องเป็น 0 และเริ่มหักใหม่เดือนนี้ ทำไมขึ้นว่ามีอยู่ 1000") ============
  {
    const D44 = (X, id, p) => JSON.parse(X.E(`JSON.stringify((d=>({ded:d.ded,before:d.before,collected:d.collected,po:d.po,over:d.over,remain:d.remain}))(depositCalc(employees.find(e=>e.id===${id}),'${p}')))`));
    const seed44 = T => { R8.seed(T); T.deposit_payouts = T.deposit_payouts || [];
      T.employees = [R8.EMP({ id:1, code:'N1', nick:'น้อย' }), R8.EMP({ id:2, code:'B1', nick:'บี', deposit_opening:3500 }), R8.EMP({ id:3, code:'G1', nick:'กอ', active:false, end_date:'2026-10-10' })];
      T.punches = R8.withId(['N1','B1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-12-25')));
      T.deposit_entries = [1,2].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' }))); };
    const btnOf = (X, id) => X.d.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="' + id + '"]');
    const openPo = async (X, id) => { await X.E(`depPoOpen(document.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="${id}"]'))`); await wait(20); };
    const db = makeDB(), T = db.T; seed44(T);
    console.log('[45a 💵 น้อย: ส.ค./ก.ย. หัก 500 (🔒) → 21 ต.ค. เบิกคืน 1,000 (เงินสด) → สะสมหลัง ต.ค. 300 · หัก ต.ค. ยัง 300 · พ.ย. หักต่อ · สลิปไม่เปลี่ยน]');
    const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    const oct0 = D44(A, 1, '2026-10'), pay0 = R8.pay(A, 1, '2026-10'), nov0 = D44(A, 1, '2026-11');
    ok(A.E('depPoReady') === true && oct0.before === 1000 && oct0.ded === 300 && oct0.collected === 1300 && nov0.ded === 300 && nov0.collected === 1600,
       'ก่อนเบิก: ต.ค. สะสมก่อนงวด 1,000 (ส.ค./ก.ย. 500+500) · หัก 300 → 1,300 · พ.ย. 1,600 (' + JSON.stringify([oct0, nov0]) + ')');
    A.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    ok(!!btnOf(A, 1) && !btnOf(A, 3) && /💵 เบิกคืน/.test(A.d.getElementById('depInfo').textContent), 'ตาราง 🛡️ ต.ค.: น้อยมีปุ่ม 💵 เบิกคืน · กอ (พ้นสภาพ) ไม่มี · หัวหน้าอธิบาย 💵');
    await openPo(A, 1);
    const info = A.d.getElementById('depPoInfo').textContent;
    ok(A.d.getElementById('depPoBg').classList.contains('show') && /เบิกได้ไม่เกิน 1,000 บาท/.test(info) && /ยอดที่เก็บก่อนเข้าระบบ \(ก่อน ส\.ค\. 69\) ไม่อยู่ในแอป/.test(info) && /ไม่เข้าสลิป/.test(info),
       'หน้าต่าง 💵: เบิกได้ไม่เกิน 1,000 · บอกชัดว่ายอดก่อนเข้าระบบ (ก่อน ส.ค. 69) ไม่อยู่ในแอป · นอกสลิป');
    ok(A.d.getElementById('depPoAll').textContent === 'เบิกทั้งหมด (1,000)', 'ปุ่ม "เบิกทั้งหมด (1,000)"');
    A.E(`document.getElementById('depPoAmt').value='1001'; depPoHint();`);
    ok(/เกินยอดที่เบิกได้ 1,000 บาท/.test(A.d.getElementById('depPoHint').textContent), 'ใส่ 1,001 → ⛔ เกินยอดที่เบิกได้ 1,000');
    await A.E(`depPoSave()`); await wait(20);
    ok(T.deposit_payouts.length === 0, 'กดบันทึก 1,001 → ไม่เขียน');
    A.E(`depPoFill(); document.getElementById('depPoVia').value='cash'; document.getElementById('depPoNote').value='เบิก 5,000 (รวมยอดก่อนเข้าระบบ)';`);
    ok(A.E(`document.getElementById('depPoAmt').value`) === '1000' && /สะสมหลังงวด ต\.ค\. 2569 = 1,000 \+ หักงวดนี้ 300 − เบิก 1,000 = 300/.test(A.d.getElementById('depPoHint').textContent),
       'เบิกทั้งหมด = 1,000 · พรีวิว "1,000 + หักงวดนี้ 300 − เบิก 1,000 = 300" (' + A.d.getElementById('depPoHint').textContent.slice(0, 120) + ')');
    A.io.confirms.length = 0;
    await A.E(`depPoSave()`); await wait(30);
    const r1 = T.deposit_payouts[0] || {};
    ok(T.deposit_payouts.length === 1 && r1.employee_id === 1 && r1.period === '2026-10' && r1.amount === 1000 && r1.via === 'cash' && r1.pay_date === '2026-10-21' && /นอกสลิป/.test(A.io.confirms[0] || '') && /ทุกเครื่องต้องเป็นรุ่น "2026-10-21 · เงินประกัน v2\.[2-9]\b/.test(A.io.confirms[0] || ''),
       'บันทึก 1 แถว deposit_payouts {น้อย · 2026-10 · 1,000 · cash · 21 ต.ค.} · ยืนยันบอก "นอกสลิป" + ทุกเครื่องต้องเป็นรุ่น v2.2 (' + JSON.stringify(r1) + ')');
    const oct1 = D44(A, 1, '2026-10'), nov1 = D44(A, 1, '2026-11'), dec1 = D44(A, 1, '2026-12');
    ok(oct1.ded === 300 && oct1.before === 1000 && oct1.po === 1000 && oct1.collected === 300, 'ต.ค.: หักยังเป็น 300 · สะสมหลัง ต.ค. = 300 (' + JSON.stringify(oct1) + ')');
    ok(nov1.before === 300 && nov1.ded === 300 && nov1.collected === 600 && dec1.collected === 900, 'พ.ย. หักต่อ 300 → 600 · ธ.ค. 900 (หักต่อจนครบเป้า)');
    ok(JSON.stringify(R8.pay(A, 1, '2026-10')) === JSON.stringify(pay0), 'สลิป ต.ค. (สุทธิ/หักเงินประกัน) เท่าเดิมทุกบาท — เบิกคืนนอกสลิป ' + JSON.stringify(pay0));
    ok(JSON.stringify(D44(A, 1, '2026-09')) === JSON.stringify(D44(A, 1, '2026-09')) && D44(A, 1, '2026-09').collected === 1000, 'ก.ย. (ก่อนงวดที่เบิก) สะสม 1,000 เท่าเดิม');
    const au = (T.payroll_audit || []).filter(x => x.tbl === 'deposit_payouts');
    ok(au.length === 1 && /"amount":1000/.test(au[0].detail) && /"employee_id":1/.test(au[0].detail), 'ประวัติ 🕘 (payroll_audit) จดการบันทึก deposit_payouts');
    A.E(`renderDeposit()`);
    const cell = (btnOf(A, 1) || { closest:()=>null }).closest('td');
    ok(!A.d.getElementById('depPoBg').classList.contains('show') && cell && /💵 เบิกคืน 1,000 · 21 ต\.ค\. · 💵 เงินสด/.test(cell.textContent) && /300/.test(cell.textContent),
       'ตาราง 🛡️: ช่องสะสมของน้อย = 300 + ชิป "💵 เบิกคืน 1,000 · 21 ต.ค. · 💵 เงินสด"');
    ok(/1,000 ฿💵 เบิกคืนนอกสลิปงวดนี้/.test(A.d.getElementById('depStats').textContent.replace(/\s+/g, '')) || /💵 เบิกคืนนอกสลิปงวดนี้/.test(A.d.getElementById('depStats').textContent), 'สถิติ 🛡️ มี "💵 เบิกคืนนอกสลิปงวดนี้"');
    // เบิกซ้ำเกิน: ยอดที่เบิกได้เหลือ 0
    await openPo(A, 1);
    A.E(`document.getElementById('depPoAmt').value='1'; depPoHint();`);
    ok(/เกินยอดที่เบิกได้ 0 บาท/.test(A.d.getElementById('depPoHint').textContent), 'เบิกซ้ำอีก 1 บาท → ⛔ เกินยอดที่เบิกได้ 0');
    await A.E(`depPoSave()`); await wait(20);
    ok(T.deposit_payouts.length === 1, '…ไม่เขียนแถวที่ 2');
    // แก้ 1,000 → 800 แล้วกลับ 1,000
    A.E(`depPoEditBtn({ dataset:{ id:'${r1.id}' } }); document.getElementById('depPoAmt').value='800'; depPoHint();`);
    ok(A.d.getElementById('depPoFormHead').textContent === '✎ แก้รายการเบิกคืน' && /1,000 \+ หักงวดนี้ 300 − เบิก 800 = 500/.test(A.d.getElementById('depPoHint').textContent), '✎ แก้ → พรีวิวไม่นับรายการเดิม (1,000 + 300 − 800 = 500)');
    await A.E(`depPoSave()`); await wait(30);
    ok(T.deposit_payouts.length === 1 && T.deposit_payouts[0].amount === 800 && D44(A, 1, '2026-10').collected === 500 && D44(A, 1, '2026-10').ded === 300, 'แก้เป็น 800 → แถวเดิม 800 · สะสมหลัง ต.ค. 500 · หัก ต.ค. 300');
    await openPo(A, 1);
    A.E(`depPoEditBtn({ dataset:{ id:'${r1.id}' } }); document.getElementById('depPoAmt').value='1000';`);
    await A.E(`depPoSave()`); await wait(30);
    ok(T.deposit_payouts[0].amount === 1000 && D44(A, 1, '2026-10').collected === 300, 'แก้กลับ 1,000 → สะสม 300');
    // ประวัติรายคน
    const h = txt(A.E, `dtDepHistory(employees.find(e=>e.id===1), '2026-11')`);
    ok(/เบิกคืน/.test(h) && /-1,000/.test(h) && /21 ต\.ค\. · 💵 เงินสด/.test(h), 'การ์ด 🛡️ ประวัติเงินประกันรายคน: คอลัมน์ "เบิกคืน" -1,000 (21 ต.ค. · เงินสด)');
    const bx = txt(A.E, `dtBalances(employees.find(e=>e.id===1), calcPay(employees.find(e=>e.id===1), '2026-10'), '2026-10')`);
    ok(/💵 เบิกคืน 1,000 \(นอกสลิป\)/.test(bx) && /300 \/ 3,000/.test(bx), 'กล่อง 🛡️ หน้ารายคน ต.ค.: สะสม 300 / 3,000 · "💵 เบิกคืน 1,000 (นอกสลิป)"');
    const hB = txt(A.E, `dtDepHistory(employees.find(e=>e.id===2), '2026-11')`);
    ok(!/เบิกคืน/.test(hB), 'คนที่ไม่เคยเบิก → การ์ดแบบเดิม (ไม่มีคอลัมน์ "เบิกคืน")');
    // ห้ามเบิก: งวดก่อน ต.ค. · พ้นสภาพ · ลบพนักงานที่มีประวัติเบิก
    ok(/บันทึกได้ตั้งแต่งวด ต\.ค\. 2569/.test(A.E(`depPoBlock(employees.find(e=>e.id===1), '2026-09')`)) && /พ้นสภาพ/.test(A.E(`depPoBlock(employees.find(e=>e.id===3), '2026-10')`)),
       'บันทึกไม่ได้: งวดก่อน ต.ค. 69 · คนพ้นสภาพ (ใช้ 💸/🏦 คืนเกินส่วนเกิน)');
    A.io.alerts.length = 0; await A.E(`delEmp(1)`); await wait(20);
    ok(/เบิกเงินประกันคืน/.test(A.io.alerts.join(' ')) && T.employees.some(e => e.id === 1), 'ลบน้อย → บล็อก (มีประวัติ 💵 เบิกคืน)');

    console.log('[45b 💵 + 💸: บี สะสมก่อน ต.ค. 4,500 / เป้า 3,000 → เบิก 1,000 → 💸 เสนอคืนส่วนเกินแค่ 500 · ยกเลิกเบิก → 1,500]');
    await openPo(A, 2);
    ok(/ไม่อยู่ในแอป \(ยกเว้น "เก็บมาก่อน" 3,500 ที่รวมในยอดสะสมแล้ว\)/.test(A.d.getElementById('depPoInfo').textContent), 'บี (เก็บมาก่อน 3,500): หน้าต่างบอกว่ายอด "เก็บมาก่อน" รวมในยอดสะสมแล้ว');
    A.E(`document.getElementById('depPoAmt').value='1000'; document.getElementById('depPoVia').value='transfer';`);
    await A.E(`depPoSave()`); await wait(30);
    const rB = T.deposit_payouts.find(x => x.employee_id === 2) || {};
    ok(rB.amount === 1000 && rB.via === 'transfer' && D44(A, 2, '2026-10').collected === 3500 && D44(A, 2, '2026-10').over === 500, 'บี เบิก 1,000 (โอน) → สะสมหลัง ต.ค. 3,500 · เกินเป้า 500');
    A.E(`document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await A.E(`depRefundOpen()`); await wait(20);
    const itB = JSON.parse(A.E(`JSON.stringify((depRefState.items.find(x=>x.e.id===2)||{}).amount)`) || 'null');
    ok(itB === 500 && /เบิกคืนนอกสลิปงวดนี้แล้ว 1,000/.test(A.d.getElementById('depRefBody').textContent), '💸 คืนส่วนเกิน ต.ค. เสนอบี 500 (= 4,500 − เบิก 1,000 − เป้า 3,000 · เดิม 1,500) + เตือนว่าเบิกแล้ว');
    A.E(`closeModal('depRefBg')`);
    await openPo(A, 2);
    A.io.confirms.length = 0;
    await A.E(`depPoDelBtn({ dataset:{ id:'${rB.id}' } })`); await wait(30);
    ok(!T.deposit_payouts.some(x => x.employee_id === 2) && D44(A, 2, '2026-10').over === 1500 && /ยกเลิก = ยังไม่ได้จ่ายเงินจริง/.test(A.io.confirms[0] || ''), '🗑 ยกเลิกเบิกของบี (ถามก่อน) → ลบแถว · เกินเป้ากลับเป็น 1,500');
    A.E(`closeModal('depPoBg')`);

    console.log('[45c สิทธิ์: dep:ve บันทึกได้ (ตัวกันสิทธิ์กลางเช็ค e) · dep:v ไม่มีปุ่ม/บันทึกไม่ได้]');
    const M = await R8.dev('2026-10-21T10:30:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ dep:'ve' } } }); M.E(`payLockAuto=false`); await M.E(`loadAll()`);
    M.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await openPo(M, 2);
    M.E(`document.getElementById('depPoAmt').value='200';`);
    await M.E(`depPoSave()`); await wait(30);
    const rM = T.deposit_payouts.find(x => x.employee_id === 2);
    ok(!!btnOf(M, 2) && rM && rM.amount === 200, 'บัญชี dep:ve (ไม่มี a/d) → มีปุ่ม · บันทึกเบิก 200 ได้');
    M.E(`depPoEditBtn({ dataset:{ id:'${rM && rM.id}' } })`);
    await M.E(`depPoDelBtn({ dataset:{ id:'${rM && rM.id}' } })`); await wait(30);
    ok(!T.deposit_payouts.some(x => x.employee_id === 2), 'บัญชี dep:ve ยกเลิกรายการได้ (สิทธิ์ "แก้")');
    const V = await R8.dev('2026-10-21T10:30:00+07:00', db, { username:'v', role:'staff', apps:{ payroll:{ dep:'v' } } }); V.E(`payLockAuto=false`); await V.E(`loadAll()`);
    V.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const vIns = await V.E(`(async()=>{ const r = await asPerm('dep','e', () => db.from('deposit_payouts').insert({ employee_id:2, period:'2026-10', amount:1, pay_date:'2026-10-21', via:'cash', note:'' }).select()); return r.error ? 'denied' : 'ok'; })()`);
    ok(!btnOf(V, 1) && !btnOf(V, 2) && vIns === 'denied' && T.deposit_payouts.length === 1, 'บัญชี dep:v → ไม่มีปุ่ม 💵 · เขียนตรง ๆ ก็ถูกตัวกันสิทธิ์กลางปฏิเสธ');

    console.log('[45d realtime ช่องแยก jjmk-depo (ไม่อยู่ใน jjmk-live) · moneyFresh อ่าน deposit_payouts ด้วย]');
    ok(db.chans['jjmk-depo'] && typeof db.chans['jjmk-depo'].deposit_payouts === 'function' && !(db.chans['jjmk-live'] || {}).deposit_payouts, 'ช่อง jjmk-depo ฟัง deposit_payouts · jjmk-live ไม่มี');
    T.deposit_payouts.push({ id:777001, employee_id:2, period:'2026-10', amount:300, pay_date:'2026-10-21', via:'cash', note:'อีกเครื่อง', created_at:'' });
    db.chans['jjmk-depo'].deposit_payouts({}); await wait(1000);   // ช่องจำลองเก็บตัวฟังของเครื่องที่เปิดล่าสุด (V)
    ok(D44(V, 2, '2026-10').po === 300, 'อีกเครื่องบันทึก → realtime อ่านใหม่ (บี เบิก 300 ในเครื่องที่เปิดอยู่)');
    T.deposit_payouts = T.deposit_payouts.filter(x => x.id !== 777001);
    ok(await A.E(`moneyFresh(true)`) === true && D44(A, 2, '2026-10').po === 0, 'moneyFresh อ่าน deposit_payouts ใหม่ (ลบจากอีกเครื่อง → เครื่องนี้เห็น)');

    console.log('[45e 6 พ.ย. (จ่าย ต.ค. แล้ว): 🔒 อัตโนมัติ ต.ค. = 300 · แก้/ยกเลิก/บันทึกเบิกงวด ต.ค. = บล็อก · พ.ย. หักต่อ 300 · ปุ่ม 💵 ย้ายไปงวด พ.ย.]');
    const B = await R8.dev('2026-11-06T09:00:00+07:00', db); await B.E(`loadAll()`); await wait(400);
    const lk = R8.row(B, 1, '2026-10');
    ok(lk && lk.note === 'lock' && lk.amount === 300, '🔒 อัตโนมัติวันจ่าย: น้อย ต.ค. = 300 (ยอดหักไม่เปลี่ยนเพราะเบิก · ' + JSON.stringify(lk) + ')');
    ok(D44(B, 1, '2026-10').collected === 300 && D44(B, 1, '2026-11').ded === 300 && D44(B, 1, '2026-11').collected === 600, 'หลัง 🔒: สะสมหลัง ต.ค. 300 · พ.ย. หัก 300 → 600');
    ok(/ถึงวันจ่าย/.test(B.E(`depPoBlock(employees.find(e=>e.id===1), '2026-10')`)) && /ถึงวันจ่าย/.test(B.E(`depPoEditBlock(employees.find(e=>e.id===1), '2026-10')`)), 'งวด ต.ค. (จ่ายแล้ว) บันทึก/แก้ไม่ได้');
    B.io.toasts = []; const nPo = T.deposit_payouts.length;
    await B.E(`depPoDelBtn({ dataset:{ id:'${r1.id}' } })`); await wait(30);
    ok(T.deposit_payouts.length === nPo && T.deposit_payouts.some(x => x.id === r1.id), 'กดยกเลิกเบิกงวด ต.ค. หลังวันจ่าย → ไม่ลบ');
    B.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    const octCell = B.d.querySelector('#depTable td[data-l="สะสมแล้ว / เป้า"]');
    ok(!btnOf(B, 1) && octCell && /💵 เบิกคืน 1,000/.test(octCell.textContent), 'ตาราง 🛡️ ต.ค.: มีชิปเบิกคืน · ไม่มีปุ่ม (จ่ายแล้ว)');
    B.E(`document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    ok(!!btnOf(B, 1), 'ตาราง 🛡️ พ.ย. (งวดปัจจุบัน): มีปุ่ม 💵 (สะสมก่อนงวด 300)');
    ok(!A.errs.length && !B.errs.length && !M.errs.length && !V.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs, M.errs, V.errs).slice(0, 2).join(' | ') + ')');
  }
  { console.log('[45f ยังไม่รัน jj_deposit_payouts.sql (ตารางไม่มี) = เหมือน main ทุกอย่าง · อ่านไม่ได้ด้วยเหตุอื่น = บล็อก (depLoadErr)]');
    const mk44 = () => { const db = makeDB(), T = db.T; R8.seed(T);
      T.employees = [R8.EMP({ id:1, code:'N1', nick:'น้อย' })];
      T.punches = R8.withId(R8.punRows('N1', '2026-07-26', '2026-11-25'));
      T.deposit_entries = R8.lockOf.map((p, i) => ({ id:10+i, employee_id:1, period:p, amount:500, note:'lock' })); return db; };
    const db0 = mk44(); db0.fail.deposit_payouts = { code:'PGRST205', message:'Could not find the table public.deposit_payouts' };
    const Z = await R8.dev('2026-10-21T10:00:00+07:00', db0); Z.E(`payLockAuto=false`); await Z.E(`loadAll()`);
    const dz = JSON.parse(Z.E(`JSON.stringify(depositCalc(employees[0], '2026-10'))`));
    Z.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    ok(Z.E('depPoReady') === false && Z.E('depReady') === true && Z.E('depLoadErr') === '' && dz.collected === 1300 && dz.ded === 300 && dz.po === 0 && !Z.d.querySelector('#depTable button[onclick="depPoOpen(this)"]') && !/💵/.test(Z.d.getElementById('page-dep').textContent) && !db0.chans['jjmk-depo'],
       'ยังไม่รัน SQL: depPoReady=false · ไม่มีปุ่ม/ข้อความ 💵 · ไม่เปิดช่อง jjmk-depo · ต.ค. หัก 300 สะสม 1,300 (เท่าเดิม) · ไม่บล็อก');
    ok(Z.E(`moneyBlocked()`) === false && await Z.E(`moneyFresh(true)`) === true, '…ออกสลิป/K BIZ ได้ตามปกติ (moneyFresh ผ่าน)');
    const db1 = mk44(); db1.fail.deposit_payouts = { message:'timeout' };
    const X = await R8.dev('2026-10-21T10:00:00+07:00', db1); X.E(`payLockAuto=false`); await X.E(`loadAll()`);
    ok(/deposit_payouts|timeout/.test(X.E('depLoadErr')) && X.E(`moneyBlocked()`) === true, 'deposit_payouts อ่านไม่ได้ (timeout) → depLoadErr · moneyBlocked บล็อกสลิป/Excel/K BIZ');
    const db2 = mk44(); db2.fail.deposit_payouts = { code:'42501', message:'permission denied' };
    const Y = await R8.dev('2026-10-21T10:00:00+07:00', db2); Y.E(`payLockAuto=false`); await Y.E(`loadAll()`);
    ok(/ไม่มีสิทธิ์อ่าน deposit_payouts/.test(Y.E('depLoadErr')) && Y.E(`moneyBlocked()`) === true, 'ยังไม่รัน GRANT (42501) → "ไม่มีสิทธิ์อ่าน deposit_payouts — รัน GRANT" + บล็อก');
    ok(!Z.errs.length && !X.errs.length && !Y.errs.length, 'ไม่มี JS error');
  }
  // ============ 45g–45i) ผลตรวจ 💵 รอบ 1: เบิกได้เฉพาะเงินที่หักจริงแล้ว (ช่วง 26 → 5 · เพดานงวดหลัง) · สองเครื่อง 💸/🏦 กับ 💵 · ข้อความ/จอ
  { const D45 = (X, id, p) => JSON.parse(X.E(`JSON.stringify((d=>({ded:d.ded,before:d.before,collected:d.collected,po:d.po,over:d.over,refund:d.refund}))(depositCalc(employees.find(e=>e.id===${id}),'${p}')))`));
    const btnOf = (X, id) => X.d.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="' + id + '"]');
    const cellOf = (X, id) => { const b = [...X.d.querySelectorAll('#depTable tbody tr')].find(tr => tr.querySelector('[data-emp="' + id + '"]')); return b ? b.querySelector('td[data-l="สะสมแล้ว / เป้า"]').textContent : ''; };
    const E1 = id => `employees.find(e=>e.id===${id})`;
    const db = makeDB(), T = db.T; R8.seed(T); T.deposit_payouts = [];
    // น้อย: ส.ค./ก.ย. 🔒 500+500 · ซี: เก็บมาก่อน 1,900 + 500+500 → ต.ค. ✎ 500 → สะสมก่อน พ.ย. 3,400 · พ.ย. 💸 คืน 400 · โอ (ออฟฟิศ)
    T.employees = [R8.EMP({ id:1, code:'N1', nick:'น้อย' }), R8.EMP({ id:5, code:'C1', nick:'ซี', deposit_opening:1900 }), R8.EMP({ id:4, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' })];
    T.punches = R8.withId(['N1','C1','O1'].flatMap(c => R8.punRows(c, '2026-07-26', '2026-11-01')));
    T.deposit_entries = [1,5,4].flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' })))
      .concat([{ id:901, employee_id:5, period:'2026-10', amount:500, note:'' }, { id:902, employee_id:5, period:'2026-11', amount:-400, note:'refund' }]);

    console.log('[45g ออฟฟิศวันจ่าย (31 ต.ค.): บันทึกไม่ได้ทั้ง ต.ค./พ.ย. → ช่องสะสมบอก "บันทึกได้พรุ่งนี้" แทนปุ่มที่หายเฉย ๆ · 1 พ.ย. บันทึกงวด พ.ย. ได้]');
    const O = await R8.dev('2026-10-31T20:00:00+07:00', db); O.E(`payLockAuto=false`); await O.E(`loadAll()`);
    ok(/ถึงวันจ่าย/.test(O.E(`depPoBlock(${E1(4)}, '2026-10')`)) && /ยังไม่เริ่ม/.test(O.E(`depPoBlock(${E1(4)}, '2026-11')`)) &&
       /วันนี้วันจ่ายเงินเดือน — บันทึกได้พรุ่งนี้ \(งวด พ\.ย\. 2569\)/.test(O.E(`depPoWhere(${E1(4)}, '2026-11')`)), 'โอ (ออฟฟิศ) 31 ต.ค.: ต.ค. ถึงวันจ่าย · พ.ย. ยังไม่เริ่ม → "บันทึกได้พรุ่งนี้ (งวด พ.ย. 2569)"');
    O.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    ok(!btnOf(O, 4) && /💵 เบิกคืน: วันนี้วันจ่ายเงินเดือน/.test(cellOf(O, 4)) && !btnOf(O, 1) && /💵 เบิกคืน → บันทึกที่งวด ต\.ค\. 2569/.test(cellOf(O, 1)),
       'ตาราง 🛡️ พ.ย. (31 ต.ค.): ไม่มีปุ่ม 💵 แต่บอกเหตุ — โอ "บันทึกได้พรุ่งนี้" · น้อย (หน้าร้าน) "บันทึกที่งวด ต.ค." (' + cellOf(O, 4).slice(-60) + ')');
    const O2 = await R8.dev('2026-11-01T10:00:00+07:00', db); O2.E(`payLockAuto=false`); await O2.E(`loadAll()`);
    ok(O2.E(`depPoBlock(${E1(4)}, '2026-11')`) === '' && O2.E(`depPoMax(${E1(4)}, '2026-11').max`) === 1300, '1 พ.ย.: โอ บันทึกงวด พ.ย. ได้ (ต.ค. ออฟฟิศจ่ายแล้ว 31 ต.ค.) · เบิกได้ 1,300 (ส.ค./ก.ย. 500 + ต.ค. 300 ที่จ่ายแล้ว)');

    console.log('[45h ช่วง 26 → 5 (2 พ.ย. · ต.ค. ยังไม่ถึงวันจ่าย): น้อยบันทึก 💵 ได้แค่งวด ต.ค. ≤ 1,000 (เดิม พ.ย. "เบิกทั้งหมด 1,300" รวมยอดหัก ต.ค. ที่ยังไม่ได้หัก → สะสมติดลบ) · เพดานงวดหลังไม่นับยอดหักที่ยังไม่ถึงวันจ่าย]');
    const A = await R8.dev('2026-11-02T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    ok(/^งวด ต\.ค\. 2569 ยังไม่ถึงวันจ่าย \(5 พ\.ย\.\) — บันทึกเบิกคืนที่งวด ต\.ค\. 2569/.test(A.E(`depPoBlock(${E1(1)}, '2026-11')`)) && A.E(`depPoBlock(${E1(1)}, '2026-10')`) === '' && A.E(`depPoMax(${E1(1)}, '2026-10').max`) === 1000,
       'น้อย: งวด พ.ย. บล็อก "ต.ค. ยังไม่ถึงวันจ่าย — บันทึกที่งวด ต.ค." · งวด ต.ค. เบิกได้ 1,000 (= ส.ค.+ก.ย. ที่หักจริง)');
    A.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-11'; renderDeposit();`);
    ok(!btnOf(A, 1) && /💵 เบิกคืน → บันทึกที่งวด ต\.ค\. 2569/.test(cellOf(A, 1)), 'ตาราง 🛡️ พ.ย.: น้อยไม่มีปุ่ม 💵 · บอก "บันทึกที่งวด ต.ค. 2569"');
    A.E(`depPoSt = { empId:1, period:'2026-11', editId:null }; document.getElementById('depPoAmt').value='1300'; document.getElementById('depPoDate').value='2026-11-02';`);
    await A.E(`depPoSave()`); await wait(20);
    ok(T.deposit_payouts.length === 0 && /ยังไม่ถึงวันจ่าย/.test(A.E(`document.getElementById('toast').textContent`)), 'บันทึกงวด พ.ย. ตรง ๆ (1,300) → ไม่เขียน "ยังไม่ถึงวันจ่าย"');
    A.E(`depPoSt = null; document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await A.E(`depPoOpen(document.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="1"]'))`); await wait(20);
    ok(A.d.getElementById('depPoAll').textContent === 'เบิกทั้งหมด (1,000)' && A.d.getElementById('depPoNew').style.display === 'none', 'งวด ต.ค.: "เบิกทั้งหมด (1,000)" · ปุ่ม "＋ รายการใหม่แทน" ซ่อนจริง (display none — .hidden แพ้ CSS .btn)');
    A.E(`depPoFill()`); await A.E(`depPoSave()`); await wait(30);
    const n1 = T.deposit_payouts.find(x => x.employee_id === 1) || {};
    ok(n1.period === '2026-10' && n1.amount === 1000 && D45(A, 1, '2026-10').collected === 300 && D45(A, 1, '2026-11').before === 300 && D45(A, 1, '2026-11').ded === 300,
       'เบิก ต.ค. 1,000 → สะสมหลัง ต.ค. 300 (หัก ต.ค. 300 รอหัก 5 พ.ย.) · พ.ย. หักต่อ 300');
    await A.E(`depPoOpen(document.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="1"]'))`); await wait(20);
    A.E(`depPoEditBtn({ dataset:{ id:'${n1.id}' } })`);
    ok(A.d.getElementById('depPoNew').style.display === '' && A.d.getElementById('depPoFormHead').textContent === '✎ แก้รายการเบิกคืน', '✎ แก้ → ปุ่ม "＋ รายการใหม่แทน" โผล่');
    A.E(`closeModal('depPoBg'); depPoSt = null;`);
    // ต.ค. หักไม่ได้ภายหลัง (✎ 0 / สุทธิไม่พอ) → สะสมหลัง ต.ค. = 0 ไม่ติดลบ (เบิกเฉพาะเงินที่หักจริงแล้ว)
    A.io.alerts.length = 0;
    await A.E(`setDepOverride(1, '2026-10', '0')`); await wait(30);
    ok(D45(A, 1, '2026-10').ded === 0 && D45(A, 1, '2026-10').collected === 0 && A.E(`depPoOverdrawn(${E1(1)}, '2026-10')`) === false && !/เกินยอดสะสมที่หักจริง/.test(A.io.alerts.join(' ')),
       '✎ งดหัก ต.ค. หลังเบิก → สะสมหลัง ต.ค. 0 (ไม่ติดลบ · ไม่เตือน)');
    await A.E(`setDepOverride(1, '2026-10', '')`); await wait(30);
    ok(D45(A, 1, '2026-10').ded === 300, '…กลับเป็นหักอัตโนมัติ 300');
    // เพดานงวดหลัง: ซี ต.ค. สะสมก่อนงวด 2,900 · พ.ย. มี 💸 คืน 400 (สะสมก่อน พ.ย. 3,400 รวม ✎ ต.ค. 500 ที่ยังไม่ได้หัก)
    // → เบิก ต.ค. ได้ 2,500 (= 3,400 − 400 − ยอดหัก ต.ค. 500 ที่ยังไม่ถึงวันจ่าย) · เดิม 2,900 (ถ้า ต.ค. หักไม่ได้ สะสมหลัง พ.ย. ติดลบ 400)
    ok(A.E(`depFloorAfter(${E1(5)}, '2026-10', true)`) === 2500 && A.E(`depPoMax(${E1(5)}, '2026-10').max`) === 2500 && D45(A, 5, '2026-11').refund === 400,
       'ซี: เพดานงวดหลัง (พ.ย. มี 💸 400) = 2,500 — ไม่นับยอดหัก ต.ค. 500 ที่ยังไม่ถึงวันจ่าย · เบิกได้ 2,500 (เดิม 2,900)');
    ok(A.E(`depFloorAfter(${E1(5)}, '2026-10', false)`) === Infinity, '💸/🏦 ของคนที่ไม่เคยเบิก 💵 = Infinity (เพดานแบบเดิมทุกบาท)');
    // ประวัติรายคน: บอกช่วงยอดก่อนเข้าระบบทุกคน (เดิมเฉพาะคนที่มีรายการ 💵 และไม่บอกงวด)
    const hC = txt(A.E, `dtDepHistory(${E1(5)}, '2026-11')`), hN = txt(A.E, `dtDepHistory(${E1(1)}, '2026-11')`);
    ok(/ยอดที่เก็บก่อนเข้าระบบ \(ก่อนงวด ส\.ค\. 2569\)ไม่อยู่ในแอป — ยกเว้น "เก็บมาก่อน"/.test(hC) && !/เบิกคืน =/.test(hC) && /💵 เบิกคืน = .*ยอดที่เก็บก่อนเข้าระบบ \(ก่อนงวด ส\.ค\. 2569\)ไม่อยู่ในแอป/.test(hN),
       'การ์ด 🛡️ ประวัติ: ทุกคนเห็น "ยอดที่เก็บก่อนเข้าระบบ (ก่อนงวด ส.ค. 2569) ไม่อยู่ในแอป" (ซี: ยกเว้นเก็บมาก่อน) · น้อยมีคำอธิบาย 💵 ด้วย');
    // 6 พ.ย. (ต.ค. จ่ายแล้ว): บันทึกงวด พ.ย. ได้ ≤ สะสมก่อน พ.ย. 300 (ยอดหัก พ.ย. ที่ยังไม่ได้หักไม่นับ)
    const B = await R8.dev('2026-11-06T09:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    ok(B.E(`depPoBlock(${E1(1)}, '2026-11')`) === '' && B.E(`depPoMax(${E1(1)}, '2026-11').max`) === 300, '6 พ.ย.: น้อยบันทึกงวด พ.ย. ได้ · เบิกได้ 300 (= สะสมหลัง ต.ค. · ยอดหัก พ.ย. ไม่นับ)');
    ok(!O.errs.length && !O2.errs.length && !A.errs.length && !B.errs.length, 'ไม่มี JS error (' + O.errs.concat(O2.errs, A.errs, B.errs).slice(0, 2).join(' | ') + ')');
  }
  { console.log('[45i สองเครื่อง: 💸 คืนส่วนเกิน (A · อ่าน deposit_payouts ช้า) กับ 💵 เบิกทั้งหมด (B) คนเดียวกันงวดเดียวกัน → A ถอยแถว 💸 ที่เพิ่งเขียน (เดิมอยู่ทั้งคู่ = จ่าย 6,000 จากที่เก็บ 4,500)]');
    const mk = () => { const db = makeDB(), T = db.T; R8.seed(T); T.deposit_payouts = [];
      T.employees = [R8.EMP({ id:2, code:'B1', nick:'บี', deposit_opening:3500 })];
      T.punches = R8.withId(R8.punRows('B1', '2026-07-26', '2026-10-21'));
      T.deposit_entries = R8.lockOf.map((p, i) => ({ id:20+i, employee_id:2, period:p, amount:500, note:'lock' })); return db; };
    const db = mk(), T = db.T;
    let slow = false, sent = 0;
    db.latency = (t, op) => { if(slow && t === 'deposit_payouts' && op === 'select'){ sent++; return 1500; } return 0; };
    const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
    const B = await R8.dev('2026-10-21T10:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
    for(const X of [A, B]) X.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await A.E(`depRefundOpen()`); await wait(30);
    A.E(`depRefState.items.forEach(x=>x.on=true)`);
    await B.E(`depPoOpen(document.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="2"]'))`); await wait(30);
    B.E(`depPoFill()`);
    slow = true; const pa = A.E(`depRefundSave()`);
    for(let i = 0; i < 200 && !sent; i++) await wait(5);
    slow = false;
    await B.E(`depPoSave()`); await wait(50);
    await pa; await wait(300);
    const oct = T.deposit_entries.filter(r => r.period === '2026-10');
    ok(sent > 0 && T.deposit_payouts.length === 1 && T.deposit_payouts[0].amount === 4500 && !oct.length && /มีการ 💵 เบิกคืนจากเครื่องอื่นพร้อมกัน/.test(A.io.alerts.join(' ')),
       'B เบิก 4,500 ก่อน A เขียน 💸 → A อ่านใหม่หลังเขียนแล้วลบแถว 💸 ของตัวเอง + แจ้ง (' + JSON.stringify(oct) + ' · ' + A.io.alerts.join(' ').slice(0, 90) + ')');
    await A.E(`depRefresh()`);
    ok(JSON.parse(A.E(`JSON.stringify(depositCalc(employees[0], '2026-10').collected)`)) === 0 && R8.pay(A, 2, '2026-10').dep === 0, 'สะสมหลัง ต.ค. 0 (ไม่ติดลบ) · สลิป ต.ค. ไม่มียอดคืน');

    console.log('[45i ✎ เพิ่มยอด 💸 (A · อ่าน deposit_payouts ช้า) ระหว่างที่ B บันทึก 💵 → A ถอยกลับยอดเดิม]');
    const db2 = mk(), T2 = db2.T;
    T2.deposit_entries.push({ id:29, employee_id:2, period:'2026-10', amount:-500, note:'refund' });
    let slow2 = false, sent2 = 0;
    db2.latency = (t, op) => { if(slow2 && t === 'deposit_payouts' && op === 'select'){ sent2++; return 1500; } return 0; };
    const C = await R8.dev('2026-10-21T10:00:00+07:00', db2); C.E(`payLockAuto=false`); await C.E(`loadAll()`);
    const F = await R8.dev('2026-10-21T10:00:00+07:00', db2); F.E(`payLockAuto=false`); await F.E(`loadAll()`);
    for(const X of [C, F]) X.E(`go('dep'); document.getElementById('depPeriodSel').value='2026-10'; renderDeposit();`);
    await F.E(`depPoOpen(document.querySelector('#depTable button[onclick="depPoOpen(this)"][data-emp="2"]'))`); await wait(30);
    F.E(`depPoFill()`);
    const fAmt = F.E(`document.getElementById('depPoAmt').value`);
    C.io.promptAns = ['1500']; slow2 = true;
    const pc = C.E(`editDeposit(2, '2026-10')`);
    for(let i = 0; i < 400 && !sent2; i++) await wait(5);
    slow2 = false;
    await F.E(`depPoSave()`); await wait(50);
    await pc; await wait(300);
    const r29 = T2.deposit_entries.find(r => r.id === 29) || {};
    ok(fAmt === '4000' && sent2 > 0 && T2.deposit_payouts.length === 1 && T2.deposit_payouts[0].amount === 4000 && r29.amount === -500 && /คืนยอดเดิม 500 บาทแล้ว/.test(C.io.alerts.join(' ')),
       'F เบิก 4,000 (= 4,500 − คืน 500) ระหว่าง C แก้ 💸 500 → 1,500 → C ถอยกลับ 500 + แจ้ง (แถว ' + JSON.stringify(r29) + ' · ' + C.io.alerts.join(' ').slice(0, 80) + ')');
    await C.E(`depRefresh()`);
    ok(JSON.parse(C.E(`JSON.stringify(depositCalc(employees[0], '2026-10').collected)`)) === 0, 'สะสมหลัง ต.ค. 0 (คืน 500 + เบิก 4,000 = สะสม 4,500)');

    console.log('[45i สลิป/หน้ารายคน: งวดที่มีทั้ง 💸 คืนในสลิปและ 💵 เบิกคืน → "สะสม 4,500 → 2,000 / เป้า 3,000 · หลังเบิกคืนนอกสลิป 1,000"]');
    const db3 = mk(), T3 = db3.T;
    T3.deposit_entries.push({ id:29, employee_id:2, period:'2026-10', amount:-1500, note:'refund' });
    T3.deposit_payouts = [{ id:1, employee_id:2, period:'2026-10', amount:1000, pay_date:'2026-10-21', via:'cash', note:'', created_at:'' }];
    const G = await R8.dev('2026-10-21T10:00:00+07:00', db3); G.E(`payLockAuto=false`); await G.E(`loadAll()`);
    const sl = txt(G.E, `buildSlip(employees[0], '2026-10')`);
    ok(/คืนเงินประกันส่วนเกิน \(สะสม 4,500 → 2,000 \/ เป้า 3,000 · หลังเบิกคืนนอกสลิป 1,000\)/.test(sl) && R8.pay(G, 2, '2026-10').net === 13500,
       'สลิป: "คืนเงินประกันส่วนเกิน (สะสม 4,500 → 2,000 / เป้า 3,000 · หลังเบิกคืนนอกสลิป 1,000)" · สุทธิ 13,500 (คืน 1,500 ในสลิป · เบิกนอกสลิป)');
    G.E(`detailEmpId = employees[0].id; detailTab = 'money'; go('detail'); const s = document.getElementById('detailPeriodSel'); if(![...s.options].some(o => o.value === '2026-10')) s.add(new Option('x', '2026-10')); s.value = '2026-10'; renderDetail(true);`);
    ok(/สะสม 4,500 → 2,000 \/ เป้า 3,000 · หลังเบิกคืนนอกสลิป 1,000/.test(G.d.getElementById('detailContent').textContent), 'หน้า 🪪 รายคน บรรทัด 💸: บอกยอดเบิกคืนนอกสลิปด้วย');
    ok(!A.errs.length && !B.errs.length && !C.errs.length && !F.errs.length && !G.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs, C.errs, F.errs, G.errs).slice(0, 2).join(' | ') + ')');
  }
  // ============ 46) งวดเริ่มหักเงินประกันรายคน (เจ้าของสั่ง 2026-10-21: "อยากให้เพิ่มเงื่อนไข การหักเงินประกัน กับ ประกันสังคม ว่าเริ่มเดือนไหน เพราะมีพนักงานบางคนที่เพิ่งเริ่มหัก และหักมานานแล้ว") ============
  {
    const D45 = (X, id, p) => JSON.parse(X.E(`JSON.stringify((d=>({ded:d.ded,before:d.before,collected:d.collected,src:d.src}))(depositCalc(employees.find(e=>e.id===${id}),'${p}')))`));
    const ST = o => R8.EMP(Object.assign({ deposit_start:'', sso_start:'' }, o));   // หลังรัน jj_emp_start.sql (มีช่อง · ค่าเริ่ม '')
    const seed45 = (T, emps, locks) => { R8.seed(T); T.employees = emps;
      T.punches = R8.withId(emps.flatMap(e => R8.punRows(e.code, '2026-07-26', '2026-11-25')));
      T.deposit_entries = (locks || []).flatMap(id => R8.lockOf.map((p, i) => ({ id:id*10+i, employee_id:id, period:p, amount:500, note:'lock' }))); };
    const empRow = (T, id) => T.employees.find(e => e.id === id);
    const audHit = (T, re) => T.payroll_audit.filter(a => re.test(String(a.detail || '')));

    console.log('[46a เคสหลัก: คืนค่า dep_start ส.ค. แล้วแอปคิด ส.ค./ก.ย. 500 ให้ "นิว" ที่เพิ่งเริ่มหัก ต.ค. → เจ้าของตั้งเริ่มหัก ต.ค. + ยืนยันว่าสลิปจริงไม่ได้หัก → ส.ค./ก.ย. 0 · ต.ค. 300 · จด 🕘 · "ลิด" ที่หักมานานไม่เปลี่ยน]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว' }), ST({ id:2, code:'L1', nick:'ลิด' })], [2]);
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const b = ['2026-08','2026-09','2026-10','2026-11'].map(p => D45(A, 1, p)), l0 = D45(A, 2, '2026-10');
      ok(A.E('startReady') === true && b[0].ded === 500 && b[1].ded === 500 && b[2].ded === 300 && b[2].before === 1000 && l0.ded === 300 && l0.before === 1000,
         'ก่อนตั้ง: นิว ส.ค. 500 · ก.ย. 500 · ต.ค. 300 (สะสมก่อน 1,000) · ลิด ต.ค. 300 (🔒 ส.ค./ก.ย. 500) ' + JSON.stringify(b.map(x => x.ded)));
      A.io.promptAns = ['เพิ่งเริ่มหัก ต.ค. — สลิป ส.ค./ก.ย. ไม่ได้หัก'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(50);
      const c = A.io.confirms.find(m => /สลิปที่จ่ายจริงไม่ได้หัก/.test(m)) || '';
      const a = ['2026-08','2026-09','2026-10','2026-11'].map(p => D45(A, 1, p)), l1 = D45(A, 2, '2026-10');
      ok(/งวด ส\.ค\. 2569: หัก 500 → 0/.test(c) && /งวด ก\.ย\. 2569: หัก 500 → 0/.test(c) && !A.io.alerts.length && A.io.confirms.length === 1,
         'หน้าต่างยืนยันบอกงวด/ยอด "งวด ส.ค. 2569: หัก 500 → 0 · งวด ก.ย. 2569: หัก 500 → 0" (ถามครั้งเดียว · ไม่มี alert) ' + JSON.stringify(c.split('\n').slice(0, 4)));
      ok(empRow(T, 1).deposit_start === '2026-10' && a[0].ded === 0 && a[1].ded === 0 && a[2].ded === 300 && a[2].before === 0 && a[2].collected === 300 && a[3].ded === 300 && a[3].before === 300,
         'หลังตั้ง: นิว ส.ค. 0 · ก.ย. 0 · ต.ค. 300 (สะสมก่อน 0 → 300) · พ.ย. 300 (→ 600) · DB deposit_start 2026-10 ' + JSON.stringify(a));
      const nl = T.deposit_entries.filter(r => r.employee_id === 1).map(r => r.period + ':' + r.amount + ':' + r.note).sort().join();
      ok(l1.ded === 300 && l1.before === 1000 && T.deposit_entries.length === 4 && nl === '2026-08:0:lock,2026-09:0:lock' && R8.pay(A, 1, '2026-10').dep === 300,
         'ลิดไม่เปลี่ยน (ต.ค. 300 สะสมก่อน 1,000) · นิว: ข้อยกเว้นเจ้าของ = 🔒 0 ส.ค./ก.ย. (R4 — ยอดตายตัว) · ลิดไม่มีแถวใหม่ · สลิป ต.ค. นิวหัก 300 ' + nl);
      const au = audHit(T, /ข้อยกเว้น สลิปจริงไม่ได้หัก: ส\.ค\. 69 500→0, ก\.ย\. 69 500→0 \(🔒 แล้ว\) · เหตุผล: เพิ่งเริ่มหัก ต\.ค\./);
      ok(au.length === 1 && /งวดเริ่มหักเงินประกันของ นิว: ตามระบบ \(ส\.ค\. 69\) → ต\.ค\. 69/.test(au[0].detail), '🕘 จดข้อยกเว้น + งวด/ยอด + เหตุผล: ' + (au[0] || {}).detail);
      // เครื่องใหม่: อ่านค่าจาก DB · งวดก่อน ต.ค. ไม่ต้อง 🔒 แล้ว (ก่อนงวดเริ่ม) → 5 พ.ย. ระบบ 🔒 ต.ค. ให้นิวเองได้ (เดิมรอ ส.ค./ก.ย.)
      const C = await R8.dev('2026-11-05T07:00:00+07:00', db); await C.E(`loadAll()`); await wait(400);
      const r1 = R8.row(C, 1, '2026-10'), r2 = R8.row(C, 2, '2026-10');
      const r8 = R8.row(C, 1, '2026-08');
      ok(C.E(`depV1Hold(employees.find(e=>e.id===1)).length`) === 0 && r1 && r1.amount === 300 && r1.note === 'lock' && r2 && r2.amount === 300 && r8 && r8.amount === 0 && r8.note === 'lock',
         '5 พ.ย. เครื่องใหม่: นิวไม่มีงวดก่อน ต.ค. ที่ต้อง 🔒 → 🔒 ต.ค. อัตโนมัติ 300 (ลิด 300) · ส.ค. = 🔒 0 จากข้อยกเว้น ' + JSON.stringify([r1, r2, r8]));
      ok(!A.errs.length && !C.errs.length, 'ไม่มี JS error (' + A.errs.concat(C.errs).slice(0,2).join(' | ') + ')');
    }

    console.log('[46b บัญชีที่ไม่ใช่เจ้าของ (สิทธิ์ 🛡️ แก้ได้) → บล็อก + บอกทาง · เจ้าของกดยกเลิก/ไม่ใส่เหตุผล = ไม่บันทึก]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว' })]);
      const M = await R8.dev('2026-10-21T10:00:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ dep:'vae', emp:'v', detail:'v', payroll:'v' } } });
      M.E(`payLockAuto=false`); await M.E(`loadAll()`);
      await M.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(30);
      const al = M.io.alerts[0] || '';
      ok(empRow(T, 1).deposit_start === '' && /❌ ยังไม่ได้บันทึก/.test(al) && /ห้ามหักย้อน\/แก้ย้อนงวดที่จ่ายแล้ว/.test(al) && /🔒 ปิดยอดงวดนี้ ด้วยยอดตามสลิป/.test(al) && /ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al) && !M.io.confirms.length,
         'ผจก. (🛡️ vae): ไม่บันทึก · alert บอกงวด/ยอด + "🔒 ปิดยอดงวดนี้ ด้วยยอดตามสลิปก่อน" + "สลิปจริงไม่ได้หัก: ให้เจ้าของ/แอดมินเป็นคนเปลี่ยน" ' + JSON.stringify(al.split('\n').slice(0, 2)));
      ok(M.d.querySelector('#depTable select.emp-st[data-emp="1"]').value === '', 'ช่องเลือกกลับเป็นค่าเดิม (ตามระบบ)');
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.io.confirmAns = m => !/สลิปที่จ่ายจริงไม่ได้หัก/.test(m);
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); A.io.confirmAns = null;
      const nCancel = T.employees[0].deposit_start;
      A.io.promptAns = ['  '];
      await A.E(`empStartSet(1, 'dep', '2026-10')`);
      A.io.promptAns = [null];
      await A.E(`empStartSet(1, 'dep', '2026-10')`);
      ok(nCancel === '' && empRow(T, 1).deposit_start === '' && D45(A, 1, '2026-08').ded === 500 && A.io.prompts.length === 2,
         'เจ้าของกดยกเลิก / เหตุผลว่าง / ยกเลิกช่องเหตุผล = ไม่บันทึก (ส.ค. ยัง 500)');
      ok(!M.errs.length && !A.errs.length, 'ไม่มี JS error (' + M.errs.concat(A.errs).slice(0,2).join(' | ') + ')');
    }

    console.log('[46c เลื่อนงวดเริ่มรายคนย้อน = หักย้อนงวดที่จ่ายแล้ว → บล็อกแม้เป็นเจ้าของ (ไม่มีข้อยกเว้น) · 🔒 ตามสลิปก่อนแล้วเปลี่ยนได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'K1', nick:'เค', deposit_start:'2026-10' })]);
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const b = ['2026-08','2026-09','2026-10'].map(p => D45(A, 1, p).ded);
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', ''); })()`);
      const al = A.io.alerts[0] || '';
      ok(b.join() === '0,0,300' && empRow(T, 1).deposit_start === '2026-10' && /งวด ส\.ค\. 2569: หัก 0 → 500/.test(al) && /งวด ก\.ย\. 2569: หัก 0 → 500/.test(al) && !/ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al) && !A.io.confirms.length,
         'เคเริ่ม ต.ค. (ส.ค./ก.ย. 0) → เปลี่ยนเป็นตามระบบ = ส.ค./ก.ย. 0 → 500 → บล็อก (เจ้าของก็ไม่มีข้อยกเว้น) ' + JSON.stringify(al.split('\n').slice(1, 4)));
      // ทางที่ถูก: สลิปจริงหัก 500 → 🔒 ส.ค./ก.ย. ด้วยยอดตามสลิปก่อน (แถวตายตัว) แล้วค่อยเปลี่ยน
      T.deposit_entries.push({ id:71, employee_id:1, period:'2026-08', amount:500, note:'lock' }, { id:72, employee_id:1, period:'2026-09', amount:500, note:'lock' });
      A.io.alerts.length = 0; A.io.confirms.length = 0;
      await A.E(`empStartSet(1, 'dep', '')`);
      ok(empRow(T, 1).deposit_start === '' && !A.io.alerts.length && A.io.confirms.length === 1 && /ยอดของงวดที่มีข้อมูลตอนนี้ไม่เปลี่ยน/.test(A.io.confirms[0]) && D45(A, 1, '2026-10').before === 1000,
         'หลัง 🔒 ส.ค./ก.ย. 500 ตามสลิป → เปลี่ยนได้ (ถามยืนยันปกติ) · ต.ค. สะสมก่อน 1,000 ' + JSON.stringify(A.io.confirms[0].split('\n')));
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46d งวด ≥ ต.ค. ที่จ่ายแล้ว: เลื่อนงวดเริ่มรายคน → 🔒 ยอดเดิมก่อน (เลื่อนหลัง = 🔒 300 · เลื่อนย้อน = 🔒 0) — ยอดที่จ่ายแล้วไม่เปลี่ยน]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'P1', nick:'พี' }), ST({ id:2, code:'Q1', nick:'คิว', deposit_start:'2026-11' })], [1, 2]);
      const A = await R8.dev('2026-11-10T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const p0 = R8.pay(A, 1, '2026-10'), q0 = R8.pay(A, 2, '2026-10');
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-11'); })()`); await wait(30);
      const c1 = A.io.confirms.find(m => /จะปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)) || '';
      const rp = R8.row(A, 1, '2026-10');
      ok(p0.dep === 300 && empRow(T, 1).deposit_start === '2026-11' && rp && rp.amount === 300 && rp.note === 'lock' && R8.pay(A, 1, '2026-10').dep === 300 && D45(A, 1, '2026-11').before === 1300 && /🛡️ เงินประกัน: ต\.ค\. 69 300/.test(c1),
         'พีเลื่อนเริ่มเป็น พ.ย.: ต.ค. (จ่ายแล้ว) 🔒 300 ก่อน → สลิป ต.ค. ยัง 300 · พ.ย. สะสมก่อน 1,300 ' + JSON.stringify(c1.split('\n').slice(0, 2)));
      A.io.confirms.length = 0;
      await A.E(`empStartSet(2, 'dep', '')`); await wait(30);
      const rq = R8.row(A, 2, '2026-10');
      ok(q0.dep === 0 && empRow(T, 2).deposit_start === '' && rq && rq.amount === 0 && rq.note === 'lock' && R8.pay(A, 2, '2026-10').dep === 0 && D45(A, 2, '2026-11').ded === 300 && D45(A, 2, '2026-11').before === 1000 && !A.io.alerts.length,
         'คิว (เริ่ม พ.ย.) เปลี่ยนเป็นตามระบบ: ต.ค. (จ่ายแล้ว ไม่ได้หัก) 🔒 0 ก่อน → ไม่หักย้อน · พ.ย. หัก 300 (สะสมก่อน 1,000) ' + JSON.stringify(rq));
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46e สูตร: งวดเริ่ม = งวดหลังสุดของ (ระบบ, รายคน) — สุ่ม 300 คน × 6 งวด: รายคน ≤ ระบบ = เท่า "" · รายคน > ระบบ = เท่าตั้งระบบเป็นค่านั้น · แถว 🔒 นับเสมอ]');
    { const A = boot({ now:'2027-01-20T12:00:00+07:00' }); const { E } = A; await wait(300); E(SEED);
      let n = 0, bad = 0;
      for(let i = 0; i < 300; i++){
        const sys = ['', '2026-08', '2026-09'][i % 3], own = ['', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'][i % 7];
        E(`var e1=emp({id:${i+1},code:'C${i}',nick:'n${i}',branch:'${i%5===0?'OFFICE':'JJLP'}',deposit_target:${[3000,5000,0][i%3]},deposit_monthly:${[300,500][i%2]},deposit_opening:${[0,500,2500][i%3]},deposit_on:${i%9!==0},deposit_start:'${own}'});
           employees=[e1]; shifts={C${i}:mk('2026-07-20','2027-01-10',${i%4===0 ? "k=>k>='2026-10-26'&&k<='2026-11-25'" : 'null'})};
           depositEntries = ${i%4===1} ? [{id:1,empId:${i+1},period:'2026-09',amount:${(i*37)%900},note:''},{id:2,empId:${i+1},period:'2026-08',amount:500,note:'lock'}] : [];`);
        for(const p of ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']){
          n++;
          const got = E(`settings.depStart='${sys}'; JSON.stringify(depositCalc(e1,'${p}'))`);
          const eff = own > sys ? own : sys;
          const ref = E(`(()=>{ const k=e1.depositStart; e1.depositStart=''; settings.depStart='${eff}'; const r=JSON.stringify(depositCalc(e1,'${p}')); e1.depositStart=k; return r; })()`);
          if(got !== ref){ bad++; if(bad < 3) console.log('   DIFF', i, sys, own, p, got, ref); }
        }
      }
      ok(bad === 0, `${n} เคส (ระบบ ''/ส.ค./ก.ย. × รายคน ''/ก.ค.–ธ.ค. · ✎ · 🔒 · ออฟฟิศ · งวดไม่มีสแกน) ต่างจากสูตร max ${bad} เคส`);
      E(`settings.depStart='2026-08'; var e2=emp({id:500,code:'Z',nick:'z',deposit_start:'2026-10'}); employees=[e2]; shifts={Z:mk('2026-07-26','2026-11-20')};
         depositEntries=[{id:9,empId:500,period:'2026-09',amount:500,note:'lock'},{id:10,empId:500,period:'2026-08',amount:200,note:''}];`);
      const z = ['2026-08','2026-09','2026-10'].map(p => JSON.parse(E(`JSON.stringify(depositCalc(e2,'${p}'))`)));
      ok(z[0].ded === 0 && z[1].ded === 500 && z[1].src === 'lock' && z[2].before === 500 && z[2].ded === 300,
         'ก่อนงวดเริ่มรายคน: ✎ ส.ค. 200 ไม่นับ · 🔒 ก.ย. 500 ยังนับ → ต.ค. สะสมก่อน 500 หัก 300 ' + JSON.stringify(z.map(x => [x.ded, x.src, x.before])));
      ok(E(`depLockDue(e2, {}).filter(x=>x.p<'2026-10').length`) === 0 && E(`depUnlockedPeriods([e2]).filter(x=>x.p<'2026-10').length`) === 0 && E(`depLockDue(e2, {}).length`) > 0 && E(`depPreOwn(e2,'2026-09') && !depPreOwn(e2,'2026-10') && depStartOf(e2)==='2026-10'`),
         'depLockDue/แถบเตือน ไม่นับงวดก่อนงวดเริ่มรายคน (ไม่ต้อง 🔒 ส.ค./ก.ย. ของคนที่เพิ่งเริ่มหัก)');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46f ยังไม่รัน jj_emp_start.sql = ซ่อนช่อง/ไม่ส่งค่า · รันแล้ว = คอลัมน์ "เริ่มหักงวด" + ป้าย/ประวัติ · ฟอร์ม ✎ ไม่ส่งช่องนี้]');
    { const db = makeDB(), T = db.T; seed45(T, [R8.EMP({ id:1, code:'N1', nick:'นิว' })]);
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.E(`go('dep'); renderDeposit();`);
      ok(A.E('startReady') === false && !/เริ่มหักงวด/.test(A.d.getElementById('depTable').innerHTML) && !A.d.querySelector('select.emp-st') &&
         !('deposit_start' in JSON.parse(A.E(`JSON.stringify(toDbEmp(employees[0]))`))) && A.E(`fromDbEmp({id:1,code:'x',nick:'x'}).depositStart`) === '',
         'ยังไม่รัน SQL: ไม่มีคอลัมน์/ช่องเลือก · toDbEmp ไม่ส่ง deposit_start/sso_start · fromDbEmp ไม่มีช่อง = ""');
      ok(A.E(`fromDbEmp({id:1,code:'x',nick:'x',deposit_start:'2026-13',sso_start:'2026-1'}).depositStart + '|' + fromDbEmp({id:1,code:'x',nick:'x',sso_start:'2026-11'}).ssoStart`) === '|2026-11', 'fromDbEmp: งวดผิดรูปแบบ = "" (ไม่เดา)');
      const db2 = makeDB(), T2 = db2.T; seed45(T2, [ST({ id:1, code:'N1', nick:'นิว', deposit_start:'2026-10' })]);
      const B = await R8.dev('2026-10-21T10:00:00+07:00', db2); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
      B.E(`go('dep'); fillDepPeriodSel(); document.getElementById('depPeriodSel').value='2026-09'; renderDeposit();`);
      const sel = B.d.querySelector('#depTable select.emp-st[data-emp="1"]'), row = sel && sel.closest('tr');
      ok(!!sel && sel.value === '2026-10' && /ตามระบบ \(ส\.ค\. 69\)/.test(sel.options[0].textContent) && [...sel.options].some(o => /ส\.ค\. 69 · จ่ายแล้ว|ก\.ย\. 69 · จ่ายแล้ว/.test(o.textContent)) &&
         /ยังไม่เริ่มหัก · เริ่ม ต\.ค\. 69/.test(row.textContent) && row.querySelector('input[onchange="depOvChg(this)"]').disabled && /เริ่มหักงวด/.test(B.d.querySelector('#depTable thead').textContent),
         'รันแล้ว: คอลัมน์ "เริ่มหักงวด" · ตัวเลือก "ตามระบบ (ส.ค. 69)" + งวด (จ่ายแล้ว) · ดู ก.ย. = "ยังไม่เริ่มหัก · เริ่ม ต.ค. 69" + ช่อง ✎ ปิด');
      const hist = B.E(`dtDepHistory(employees[0], '2026-10')`), bal = B.E(`dtBalances(employees[0], calcPay(employees[0],'2026-09'), '2026-09')`), info = B.E(`dtInfo(employees[0])`);
      ok(/เริ่มหักงวด ต\.ค\. 2569 \(รายคน\)/.test(hist) && /ยอดที่เก็บก่อนเข้าระบบ \(ก่อนงวด ส\.ค\. 2569\)/.test(hist) && /เริ่มหักงวด ต\.ค\. 69 \(รายคน\) — งวดก่อนนั้นไม่หัก/.test(hist) &&
         !/งวด ส\.ค\. 2569/.test(hist.replace(/ก่อนงวด ส\.ค\. 2569/g, '')) && /ยังไม่เริ่มหัก — เริ่มงวด ต\.ค\. 2569/.test(bal) && /เริ่มหักงวด ต\.ค\. 2569/.test(info),
         'ประวัติเงินประกันรายคน "เริ่มหักงวด ต.ค. 2569 (รายคน)" (ไม่ไล่ ส.ค.) · หมายเหตุ "ก่อนเข้าระบบ" = dep_start ระบบ (ส.ค.) + บรรทัดงวดเริ่มรายคนแยก (R4) · กล่อง 🛡️ ก.ย. "ยังไม่เริ่มหัก" · แท็บข้อมูลส่วนตัว (เงินประกัน) บอกงวดเริ่ม');
      // ฟอร์ม ✎ (ข้อมูลการทำงาน) ไม่ส่งช่องงวดเริ่ม — เครื่องที่ค่าค้างเขียนทับไม่ได้
      B.db.log.length = 0;
      await B.E(`(async()=>{ go('emp'); openEmpForm(1); document.getElementById('fFull').value = 'แก้ชื่อ'; await saveEmpForm(); })()`); await wait(50);
      const up = B.db.log.find(x => x.table === 'employees' && x.op === 'update');
      ok(!!up && !('deposit_start' in up.payload) && !('sso_start' in up.payload) && T2.employees[0].deposit_start === '2026-10' && B.E('employees[0].depositStart') === '2026-10',
         'ฟอร์ม ✎ บันทึก: payload ไม่มี deposit_start/sso_start · ค่าใน DB/เครื่องยังเป็น 2026-10 ' + JSON.stringify(up && Object.keys(up.payload).filter(k => /start/.test(k))));
      ok(B.E(`toDbEmp(employees[0]).deposit_start`) === '2026-10' && B.E(`toDbEmp(fromDbEmp({id:9,code:'n',nick:'n'})).sso_start`) === '', 'รันแล้ว: toDbEmp ส่งช่องนี้ (คนใหม่ = "")');
      ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
    }

    // ===== ผลตรวจ R1 (2026-10-21) =====
    console.log('[46g (high) เลื่อนงวดเริ่มรายคนย้อน ตอนสแกนงวดก่อนงวดเริ่มหลุดหน้าต่างโหลด (loadMonths 8 · 10 มิ.ย. 70) → บล็อก ไม่บันทึก · เครื่องใหม่ไม่หักย้อน ส.ค./ก.ย.]');
    { const db = makeDB(), T = db.T; R8.seed(T);
      T.employees = [ST({ id:1, code:'X1', nick:'เอ็กซ์', deposit_start:'2026-10' })];
      T.punches = R8.withId(R8.punRows('X1', '2026-07-26', '2027-06-09'));
      T.deposit_entries = ['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05'].map((p, i) => ({ id:500+i, employee_id:1, period:p, amount:300, note:'lock' }));
      const A = await R8.dev('2027-06-10T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const b = ['2026-08','2026-09','2027-06'].map(p => D45(A, 1, p));
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', ''); })()`); await wait(30);
      const al = A.io.alerts[0] || '';
      ok(A.E('punchSince') > '2026-08-26' && b[0].ded === 0 && b[1].ded === 0 && b[2].ded === 300 && empRow(T, 1).deposit_start === '2026-10' && !A.io.confirms.length &&
         /งวดที่จ่ายแล้วของ เอ็กซ์ ที่ยังไม่ 🔒 ปิดยอด: ส\.ค\. 69, ก\.ย\. 69/.test(al) && /สแกนของงวดนี้ไม่อยู่ในเครื่องนี้ครบ/.test(al) && /เลือกงวดเริ่มตั้งแต่ ต\.ค\. 69 ขึ้นไป/.test(al) && /กด 🔄/.test(al),
         'punchSince ' + A.E('punchSince') + ' (ไม่ครอบ ส.ค./ก.ย.) → บล็อก: บอกงวด ส.ค./ก.ย. + "สแกนไม่อยู่ในเครื่องนี้ครบ" + 🔄 / เลือกตั้งแต่ ต.ค. · DB ยัง 2026-10 · ไม่ถาม ' + JSON.stringify(al.split('\n').slice(1, 4)));
      const B = await R8.dev('2027-06-10T10:00:00+07:00', db); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
      const c = ['2026-08','2026-09','2027-06'].map(p => D45(B, 1, p));
      ok(c[0].ded === 0 && c[1].ded === 0 && c[2].ded === 300 && c[2].before === 2400 && R8.pay(B, 1, '2027-06').dep === 300,
         'เครื่องใหม่: ส.ค./ก.ย. 0 · มิ.ย. 70 หัก 300 สะสมก่อน 2,400 (ไม่มีหักย้อน/เกินเป้า) ' + JSON.stringify(c.map(x => [x.ded, x.before])));
      // งวดที่ครอบอยู่ในเครื่อง (ต.ค. 69 ไม่ 🔒 · เลื่อนเริ่มเป็น พ.ย.) ไม่ติดตัวนี้ — ตัดสินตามยอดก่อน/หลังแบบเดิม
      ok(A.E(`empStartGap(employees[0], 'dep', '2026-10', '2026-11').length`) === 0 && A.E(`empStartGap(employees[0], 'dep', '2026-10', '').join()`) === '2026-08,2026-09',
         'empStartGap: เลื่อนไปข้างหน้า (ต.ค. → พ.ย.) = [] · เลื่อนย้อน (ต.ค. → ตามระบบ) = ส.ค./ก.ย.');
      ok(!A.errs.length && !B.errs.length, 'ไม่มี JS error (' + A.errs.concat(B.errs).slice(0,2).join(' | ') + ')');
    }

    console.log('[46h (medium) ✎ = ยอดตามสลิปจริง → ข้อยกเว้น "สลิปจริงไม่ได้หัก" ไม่ได้ · บอก ✎ + ให้ 🔒 ยอดนั้นก่อน]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว' })]);
      T.deposit_entries.push({ id:1, employee_id:1, period:'2026-08', amount:450, note:'' });
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(30);
      const al = A.io.alerts[0] || '';
      ok(empRow(T, 1).deposit_start === '' && !A.io.confirms.length && !A.io.prompts.length && /✎ บันทึกว่าสลิปหัก: ส\.ค\. 69 450/.test(al) && /🔒 ปิดยอดงวดนั้นด้วยยอดนั้นก่อน/.test(al) &&
         !/ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al) && D45(A, 1, '2026-08').ded === 450 && D45(A, 1, '2026-10').before === 950,
         'เจ้าของก็ไม่ได้ข้อยกเว้น: alert "✎ บันทึกว่าสลิปหัก: ส.ค. 69 450" → 🔒 ก่อน · ไม่บันทึก · ส.ค. ยัง 450 (ต.ค. สะสมก่อน 950) ' + JSON.stringify(al.split('\n').slice(2, 5)));
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46i (medium) ✎ ใหม่ในงวดก่อน "เริ่มหักงวด" รายคน (ทางหน้า 🪪 / setDepOverride) = ไม่บันทึก + บอกเหตุ · กล่อง 🛡️ ไม่มีปุ่ม ✎]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว', deposit_start:'2026-11' })]);
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const tz = []; A.w.toast = m => tz.push(String(m));
      const bal = A.E(`dtBalances(employees[0], calcPay(employees[0],'2026-10'), '2026-10')`);
      A.io.promptAns = ['300'];
      await A.E(`(async()=>{ go('payroll'); await editDeposit(1, '2026-10'); })()`); await wait(30);
      await A.E(`setDepOverride(1, '2026-10', '300')`); await wait(30);
      ok(!/editDeposit\(1,'2026-10'\)/.test(bal) && /ยังไม่เริ่มหัก — เริ่มงวด พ\.ย\. 2569/.test(bal) && !A.io.prompts.length && !T.deposit_entries.some(r => r.period === '2026-10') &&
         tz.filter(m => /อยู่ก่อนงวดเริ่มหักของ นิว \(พ\.ย\. 69\)/.test(m) && /ไม่ได้บันทึก/.test(m)).length === 2 && D45(A, 1, '2026-10').ded === 0,
         'กล่อง 🛡️ ต.ค. ไม่มีปุ่ม ✎ · editDeposit/setDepOverride ไม่ถาม ไม่เขียนแถว + toast "อยู่ก่อนงวดเริ่มหัก … ไม่ได้บันทึก" ' + JSON.stringify(tz.slice(0, 1)));
      // ✎ เดิมที่มีอยู่แล้ว (เช่นใส่ก่อนตั้งงวดเริ่ม) ยังแก้/ลบได้
      T.deposit_entries.push({ id:90, employee_id:1, period:'2026-10', amount:200, note:'' }); await A.E(`depRefresh()`);
      await A.E(`setDepOverride(1, '2026-10', '')`); await wait(30);
      ok(!T.deposit_entries.some(r => r.period === '2026-10'), '✎ เดิมในงวดก่อนงวดเริ่ม ลบได้ (กลับอัตโนมัติ)');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46j (medium) 🔒 ส.ค./ก.ย. 500 อยู่แล้ว + ตั้งเริ่ม ต.ค. → บอกว่า 🔒 ยังนับ (ไม่ใช่ "มีผลกับงวดถัดไป") · ป้ายในตาราง/ประวัติ · ปลด 🔒 ก่อนงวดเริ่มไม่ได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'L1', nick:'ล็อกแล้ว' })], [1]);
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(30);
      const c = A.io.confirms[0] || '';
      ok(empRow(T, 1).deposit_start === '2026-10' && /ℹ️ ส\.ค\. 69 🔒 500 · ก\.ย\. 69 🔒 500 ปิดยอดแล้ว — ยังนับในยอดสะสม/.test(c) && /แก้ 🔒 เป็น 0/.test(c) && !/มีผลกับงวดถัดไป/.test(c) &&
         c.includes(A.E('EMP_START_VER')) && D45(A, 1, '2026-10').before === 1000,
         'ยืนยัน: "ส.ค. 69 🔒 500 · ก.ย. 69 🔒 500 ปิดยอดแล้ว — ยังนับ … แก้ 🔒 เป็น 0" + ป้ายรุ่น · ไม่มี "มีผลกับงวดถัดไป" · ต.ค. สะสมก่อนยัง 1,000 ' + JSON.stringify(c.split('\n').slice(1, 3)));
      A.E(`go('dep'); fillDepPeriodSel(); document.getElementById('depPeriodSel').value='2026-09'; renderDeposit();`);
      const tr = A.d.querySelector('#depTable select.emp-st[data-emp="1"]').closest('tr').textContent, hist = A.E(`dtDepHistory(employees[0], '2026-10')`);
      ok(/🔒 ก่อนงวดเริ่ม ต\.ค\. 69 · ยังนับ/.test(tr) && /ก่อนงวดเริ่มรายคน · ยังนับ/.test(hist), 'ตาราง 🛡️ ก.ย. "🔒 ก่อนงวดเริ่ม ต.ค. 69 · ยังนับ" · ประวัติ "ก่อนงวดเริ่มรายคน · ยังนับ"');
      A.io.promptAns = [''];
      await A.E(`editDeposit(1, '2026-09')`); await wait(30);
      ok(/ปลดล็อก งวด ก\.ย\. 2569 ของ ล็อกแล้ว ไม่ได้ — งวดนี้อยู่ก่อน "เริ่มหักงวด"/.test(A.io.alerts.slice(-1)[0] || '') && R8.row(A, 1, '2026-09').note === 'lock',
         'ปลด 🔒 ก.ย. (ก่อนงวดเริ่มรายคน) = ห้าม (ปลดแล้วไม่ถูกนับ) · แถวยังอยู่');
      A.io.promptAns = ['0'];
      await A.E(`editDeposit(1, '2026-09')`); await wait(30);
      ok(R8.row(A, 1, '2026-09').amount === 0 && D45(A, 1, '2026-10').before === 500, 'แก้ 🔒 ก.ย. เป็น 0 ได้ (สลิปไม่ได้หัก) → ต.ค. สะสมก่อน 500');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46k (low) ออฟฟิศ 1 พ.ย.: ข้อยกเว้น ส.ค./ก.ย. แล้ว 🔒 ต.ค. ยอดเดิม — ไม่มีคำเตือน "ยังไม่ 🔒 งวดก่อน ต.ค." ที่ขัดกับที่เพิ่งยืนยัน]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' })]);
      const A = await R8.dev('2026-11-01T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.io.promptAns = ['เพิ่งเริ่มหัก พ.ย.'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-11'); })()`); await wait(30);
      const c2 = A.io.confirms.find(m => /จะปิดยอดงวดที่จ่ายแล้วก่อน/.test(m)) || '';
      const r = R8.row(A, 1, '2026-10');
      ok(empRow(T, 1).deposit_start === '2026-11' && /🛡️ เงินประกัน: ต\.ค\. 69 300/.test(c2) && !/ยังไม่ 🔒 งวดก่อน/.test(c2) && r && r.amount === 300 && r.note === 'lock' && A.io.confirms.length === 2,
         'ยืนยันข้อยกเว้น → หน้าต่าง 🔒 ต.ค. 300 ไม่มี "ยังไม่ 🔒 งวดก่อน ต.ค." · ต.ค. 🔒 300 (สลิปที่จ่ายแล้ว) ' + JSON.stringify(c2.split('\n').slice(0, 3)));
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46l (low/medium) ป้ายรุ่นใหม่ · จด 🕘 ทุกครั้ง · เหตุผลจำค่าเดิม · รอคนก่อนหน้า = toast · ป้ายใช้งวดเริ่มที่มีผลจริง · เครื่องที่เปิดค้างก่อนรัน SQL อ่านค่าใหม่ได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'A1', nick:'หนึ่ง' }), ST({ id:2, code:'B1', nick:'สอง' }), ST({ id:3, code:'C1', nick:'สาม' })], [3]);   // สาม 🔒 ส.ค./ก.ย. แล้ว
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      ok(/2026-10-21/.test(A.E('APP_VER')) && /เริ่มหักรายคน/.test(A.E('APP_VER')) && A.E('EMP_START_VER').includes(A.E('APP_VER')), 'APP_VER เลื่อนเป็นรุ่น 2026-10-21 (งวดเริ่มหักรายคน) · ข้อความเตือนรุ่นอ้างรุ่นนี้: ' + A.E('APP_VER'));
      A.io.promptAns = ['เพิ่งเริ่มหัก ต.ค. — สลิป ส.ค./ก.ย. ไม่ได้หัก'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`);
      await A.E(`empStartSet(2, 'dep', '2026-10')`);   // ไม่ใส่คำตอบ = กดตกลงด้วยค่าเริ่ม (เหตุผลของคนก่อน)
      const pr2 = A.io.prompts[1] || '';
      ok(empRow(T, 2).deposit_start === '2026-10' && A.io.prompts.length === 2 && audHit(T, /งวดเริ่มหักเงินประกันของ สอง: .* เหตุผล: เพิ่งเริ่มหัก ต\.ค\. — สลิป ส\.ค\.\/ก\.ย\. ไม่ได้หัก/).length === 1,
         'คนที่ 2: ช่องเหตุผลมีค่าเริ่ม = เหตุผลของคนก่อน (กดตกลงได้เลย) · จด 🕘 ครบ ' + JSON.stringify(pr2.slice(0, 40)));
      await A.E(`empStartSet(3, 'dep', '2026-12')`);
      ok(empRow(T, 3).deposit_start === '2026-12' && audHit(T, /^งวดเริ่มหักเงินประกันของ สาม: ตามระบบ \(ส\.ค\. 69\) → ธ\.ค\. 69$/).length === 1, '🕘 จดทุกครั้ง (ไม่ใช่ข้อยกเว้น): "งวดเริ่มหักเงินประกันของ สาม: ตามระบบ (ส.ค. 69) → ธ.ค. 69"');
      const tz = []; A.w.toast = m => tz.push(String(m));
      A.E(`empStartBusy = true`); await A.E(`empStartSet(3, 'dep', '')`); A.E(`empStartBusy = false`);
      ok(/รอบันทึกของคนก่อนหน้าให้เสร็จก่อน/.test(tz[0] || '') && empRow(T, 3).deposit_start === '2026-12', 'กำลังบันทึกคนก่อน → toast "รอบันทึกของคนก่อนหน้า…" (ไม่เด้งกลับเงียบ ๆ) · ไม่บันทึก');
      // ค่ารายคน ≤ dep_start ระบบ (ระบบเลื่อนไปทีหลัง) = ไม่มีผล → ป้ายไม่โชว์งวดดิบ
      A.E(`settings.depStart='2026-10'; var e3 = employees.find(e=>e.id===3); e3.depositStart='2026-09'; go('dep'); renderDeposit();`);
      const sel = A.d.querySelector('#depTable select.emp-st[data-emp="3"]');
      ok(!/เริ่มหักงวด ก\.ย\./.test(A.E(`dtInfo(e3)`)) && !/\(รายคน\)/.test(A.E(`dtDepHistory(e3, '2026-10')`)) && /ก\.ย\. 69 \(= ตามระบบ\)/.test(sel.selectedOptions[0].textContent) && A.E(`depStartOf(e3)`) === '2026-10',
         'ระบบ ต.ค. · รายคน ก.ย.: แท็บข้อมูล/ประวัติไม่โชว์ "เริ่มหักงวด ก.ย." · ช่องเลือก "ก.ย. 69 (= ตามระบบ)" · งวดเริ่มจริง ต.ค.');
      A.E(`settings.depStart='2026-08'`);
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
      // เครื่องที่เปิดค้างตั้งแต่ก่อนรัน jj_emp_start.sql: moneyFresh อ่าน deposit_start/sso_start ได้แม้ empCols ชุดเก่า (เดิมขอเฉพาะช่องที่มีตอน loadAll)
      const db2 = makeDB(), T2 = db2.T; seed45(T2, [R8.EMP({ id:1, code:'N1', nick:'นิว' })]);
      db2.cols.employees = Object.keys(T2.employees[0]).concat('id');
      const C = await R8.dev('2026-10-21T10:00:00+07:00', db2); C.E(`payLockAuto=false`); await C.E(`loadAll()`);
      const before = [C.E('startReady'), await C.E(`moneyFresh(true)`), C.E(`employees[0].depositStart`)];
      // รัน SQL + อีกเครื่องตั้งเริ่ม ต.ค. (เครื่องนี้พลาด realtime) · ผ่าน 10 นาที (เว้นการลองขอช่องใหม่)
      db2.cols.employees.push('deposit_start', 'sso_start'); T2.employees[0].deposit_start = '2026-10'; T2.employees[0].sso_start = '';
      C.setNow('2026-10-21T10:11:00+07:00');
      const ok2 = await C.E(`moneyFresh(true)`);
      ok(before.join() === 'false,true,' && ok2 === true && C.E('startReady') === true && C.E(`employees[0].depositStart`) === '2026-10' && D45(C, 1, '2026-08').ded === 0 && R8.pay(C, 1, '2026-10').dep === 300,
         'ยังไม่รัน: moneyFresh ผ่าน (ขอช่องใหม่ไม่ได้ = ขอแบบเดิม) · รันแล้ว: moneyFresh อ่าน deposit_start = 2026-10 → startReady · ส.ค. 0 · ต.ค. หัก 300 (ไม่ใช้ค่าเก่า) ' + JSON.stringify(before));
      ok(!C.errs.length, 'ไม่มี JS error (' + C.errs.slice(0,2).join(' | ') + ')');
    }

    // ===== ผลตรวจ R2 (2026-10-21) =====
    const tzCap = X => { const tz = []; const f = X.w.toast; X.w.toast = m => { tz.push(String(m)); return f && f(m); }; return tz; };
    console.log('[46m (high) 💸 คืนส่วนเกิน ต.ค. (ยังไม่จ่าย) คิดจากสะสมที่รวม ส.ค./ก.ย. → ตั้งเริ่ม ต.ค. = บล็อก "แก้/ยกเลิก 💸 ก่อน" · ยกเลิก 💸 แล้วตั้งได้ → ต.ค. หัก 300 ไม่คืน · หน้าต่างข้อยกเว้นบอกงวดที่ยังไม่จ่าย]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'R1', nick:'อาร์', deposit_opening:2500 })]);
      T.deposit_entries = [{ id:91, employee_id:1, period:'2026-10', amount:-500, note:'refund' }];
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const b = ['2026-08','2026-09','2026-10'].map(p => D45(A, 1, p)), p0 = R8.pay(A, 1, '2026-10');
      A.io.promptAns = ['เพิ่งเริ่มหัก ต.ค.'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(50);
      const al = A.io.alerts[0] || '';
      ok(b.map(x => x.ded).join() === '500,500,0' && b[2].before === 3500 && b[2].collected === 3000 && empRow(T, 1).deposit_start === '' && !A.io.confirms.length &&
         /💸 คืนส่วนเกิน ต\.ค\. 69 500 \(ในสลิปที่ยังไม่จ่าย\) คิดจากยอดสะสมเดิม — หลังเปลี่ยนคืนได้ไม่เกิน 0/.test(al) && /✎ แก้\/ยกเลิกรายการ 💸\/🏦 ของ อาร์ ก่อน/.test(al),
         'อาร์ เก็บมาก่อน 2,500 + ส.ค./ก.ย. 500 = 3,500 → 💸 ต.ค. 500 · ตั้งเริ่ม ต.ค. = บล็อก (เดิมบันทึกแล้วสลิป ต.ค. ยังคืน 500 · หัก 0) ' + JSON.stringify(al.split('\n').slice(1, 4)));
      // ยกเลิก 💸 (อีกเครื่อง) แล้วตั้งใหม่ → ข้อยกเว้น (ส.ค./ก.ย. 500 → 0) · หน้าต่างบอก "งวดที่ยังไม่จ่าย: ต.ค. 69 หัก 0 → 300" + สะสมล่าสุด
      T.deposit_entries = [];
      A.io.alerts.length = 0;
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(50);
      const c = A.io.confirms.find(m => /สลิปที่จ่ายจริงไม่ได้หัก/.test(m)) || '', d10 = D45(A, 1, '2026-10'), p1 = R8.pay(A, 1, '2026-10');
      ok(empRow(T, 1).deposit_start === '2026-10' && /งวดที่ยังไม่จ่าย: ต\.ค\. 69 หัก 0 → 300/.test(c) && /สะสมหลังงวด ต\.ค\. 2569: 3,500 → 2,800 \/ เป้า 3,000/.test(c) && A.io.confirms.length === 1 &&
         d10.ded === 300 && d10.before === 2500 && p1.dep === 300 && p0.dep === 0,
         'ยกเลิก 💸 แล้ว: หน้าต่างข้อยกเว้นบอก "งวดที่ยังไม่จ่าย: ต.ค. 69 หัก 0 → 300" + "สะสมหลังงวด ต.ค. 3,500 → 2,800" (เดิมไม่บอก) · ต.ค. หัก 300 (สะสมก่อน 2,500) ' + JSON.stringify([d10, p1]));
      ok(A.E('empStartWhy.dep') === 'เพิ่งเริ่มหัก ต.ค.' && A.E('empStartWhy.sso') === '', 'เหตุผลที่จำไว้แยกเงินประกัน/สปส. (สปส. ไม่ติดเหตุผลของเงินประกัน)');
      A.E(`go('dep'); renderDeposit();`);
      ok(/สลิปจริงไม่ได้หักงวดก่อนหน้า = เลือกงวดเริ่มได้เลย/.test(A.d.getElementById('depInfo').textContent) && /ระบบ 🔒 ยอดใหม่ให้ ยอดตายตัว/.test(A.d.getElementById('depInfo').textContent),
         'แถบหน้า 🛡️ บอกทางหลักของเจ้าของ: "สลิปจริงไม่ได้หักงวดก่อนหน้า = เลือกงวดเริ่มได้เลย … ระบบ 🔒 ยอดใหม่ให้ ยอดตายตัว" (R4)');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46n (high) เงินออกไปแล้ว: 💸 ต.ค. คืนในสลิปที่จ่ายแล้ว (6 พ.ย.) → เจ้าของยืนยันได้ (บอกในหน้าต่าง + 🕘 · สะสมหลัง ต.ค. 2,000 · พ.ย. หักต่อ) · ผจก. บล็อก · 💵 ที่ทำให้สะสมติดลบ = บล็อกแม้เจ้าของ]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'R1', nick:'อาร์', deposit_opening:2500 })]);
      T.deposit_entries = [{ id:91, employee_id:1, period:'2026-10', amount:-500, note:'refund' }];
      const M = await R8.dev('2026-11-06T10:00:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ dep:'vae', emp:'v', detail:'v', payroll:'v' } } });
      M.E(`payLockAuto=false`); await M.E(`loadAll()`);
      await M.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(30);
      const al = M.io.alerts[0] || '';
      ok(empRow(T, 1).deposit_start === '' && /💸 คืนส่วนเกิน ต\.ค\. 69 500 \(เงินออกไปแล้ว\)/.test(al) && /เงินออกไปแล้วตามยอดเดิม: ให้เจ้าของ\/แอดมินเป็นคนเปลี่ยน/.test(al),
         'ผจก.: 💸 ต.ค. จ่ายแล้วคิดจากยอดเดิม → บล็อก "ให้เจ้าของ/แอดมินเป็นคนเปลี่ยน" ' + JSON.stringify(al.split('\n').slice(2, 3)));
      const A = await R8.dev('2026-11-06T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.io.promptAns = ['เพิ่งเริ่มหัก ต.ค. — 💸 ต.ค. คืนเกินไป'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(50);
      const c = A.io.confirms.find(m => /สลิปที่จ่ายจริงไม่ได้หัก/.test(m)) || '', d10 = D45(A, 1, '2026-10'), d11 = D45(A, 1, '2026-11');
      const au = audHit(T, /คืน\/เบิกที่ออกไปแล้วตามยอดเดิม: ต\.ค\. 69 💸 คืนส่วนเกิน 500 \(หลังเปลี่ยนมี 0\)/);
      ok(empRow(T, 1).deposit_start === '2026-10' && /⚠️ 💸 คืนส่วนเกิน ต\.ค\. 69 500 \(เงินออกไปแล้ว\)/.test(c) && /เงินที่ออกไปแล้วไม่เปลี่ยน/.test(c) && /งวดที่ยังไม่จ่าย: พ\.ย\. 69 หัก 0 → 300/.test(c) &&
         d10.before === 2500 && d10.collected === 2000 && d11.ded === 300 && au.length === 1,
         'เจ้าของ: หน้าต่างบอก 💸 ต.ค. 500 (เงินออกไปแล้ว) + พ.ย. หัก 0 → 300 · สะสมหลัง ต.ค. 2,000 (ตามจริง) · 🕘 จดรายการ ' + JSON.stringify([d10, d11]));
      // 💵 เบิกคืน ต.ค. 600 (จ่ายแล้ว) — ตั้งเริ่ม ต.ค. แล้วสะสมก่อน ต.ค. 0 → หลังงวดติดลบ −300 = บล็อกแม้เจ้าของ
      const db2 = makeDB(), T2 = db2.T; seed45(T2, [ST({ id:1, code:'N1', nick:'นิว' })]);
      T2.deposit_payouts = [{ id:1, employee_id:1, period:'2026-10', amount:600, pay_date:'2026-10-21', via:'cash', note:'', created_at:'' }];
      const B = await R8.dev('2026-10-21T12:00:00+07:00', db2); B.E(`payLockAuto=false`); await B.E(`loadAll()`);
      const e0 = D45(B, 1, '2026-10');
      B.io.promptAns = ['x'];
      await B.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(30);
      const al2 = B.io.alerts[0] || '';
      ok(e0.collected === 700 && T2.employees[0].deposit_start === '' && !B.io.confirms.length && /💵 เบิกคืน ต\.ค\. 69 600 \(เงินออกไปแล้ว\) คิดจากยอดสะสมเดิม — หลังเปลี่ยนเบิกได้ไม่เกิน 0/.test(al2) &&
         /⛔ ต\.ค\. 69 สะสมหลังงวดติดลบ -300/.test(al2) && /ยอดสะสมจะติดลบ/.test(al2),
         'นิว ส.ค./ก.ย. 500 + 💵 ต.ค. 600 (สะสม 700) → ตั้งเริ่ม ต.ค. = สะสมติดลบ −300 → บล็อก (เจ้าของก็ไม่ได้) ' + JSON.stringify(al2.split('\n').slice(2, 4)));
      ok(!M.errs.length && !A.errs.length && !B.errs.length, 'ไม่มี JS error (' + M.errs.concat(A.errs, B.errs).slice(0,2).join(' | ') + ')');
    }

    console.log('[46o 💵 ใช้งวดเริ่มรายคน (rebase #176): เริ่ม พ.ย. → ต.ค. = "งวดก่อนเริ่มหักของ …" · 30 ต.ค. บันทึกที่ พ.ย. ได้เลย (ต.ค. ไม่มียอดหักค้าง) · หน้าต่าง/ประวัติบอก "ก่อน พ.ย. 69" · คน "" เท่า main]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'P1', nick:'พี', deposit_opening:2000, deposit_start:'2026-11' }), ST({ id:2, code:'Q1', nick:'คิว', deposit_opening:2000 })], [2]);
      T.deposit_payouts = [];
      const A = await R8.dev('2026-10-30T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const blk = (id, p) => A.E(`depPoBlock(employees.find(e=>e.id===${id}), '${p}')`);
      ok(/^งวดก่อน "เริ่มหักงวด" ของ พี \(พ\.ย\. 69\)$/.test(blk(1, '2026-10')) && blk(1, '2026-11') === '' && /งวด ต\.ค\. 2569 ยังไม่ถึงวันจ่าย/.test(blk(2, '2026-11')) && blk(2, '2026-10') === '' &&
         /บันทึกที่งวด พ\.ย\. 2569/.test(A.E(`depPoWhere(employees.find(e=>e.id===1), '2026-10')`)),
         'depPoBlock: พี ต.ค. = "งวดก่อน เริ่มหักตั้งแต่งวด ของ พี (พ.ย. 69)" · พ.ย. บันทึกได้ (เดิมส่งไป ต.ค.) · คิว (ตามระบบ) เท่า main: พ.ย. ติด "ต.ค. ยังไม่ถึงวันจ่าย" · ต.ค. บันทึกได้');
      await A.E(`depPoOpen({ dataset:{ emp:'1', p:'2026-11' } })`); await wait(20);
      const info = A.d.getElementById('depPoInfo').textContent, hist = A.E(`dtDepHistory(employees.find(e=>e.id===1), '2026-11')`);
      ok(/ยอดที่เก็บก่อนเข้าระบบ \(ก่อน ส\.ค\. 69\) ไม่อยู่ในแอป/.test(info) && /เริ่มหักงวด พ\.ย\. 69 \(รายคน\) — งวดก่อนนั้นไม่หัก/.test(info) && /เบิกได้ไม่เกิน 2,000 บาท/.test(info) &&
         /ยอดที่เก็บก่อนเข้าระบบ \(ก่อนงวด ส\.ค\. 2569\)ไม่อยู่ในแอป/.test(hist) && /เริ่มหักงวด พ\.ย\. 69 \(รายคน\) — งวดก่อนนั้นไม่หัก/.test(hist),
         'หน้าต่าง 💵 พี: "ยอดที่เก็บก่อนเข้าระบบ (ก่อน ส.ค. 69)" (dep_start ระบบ) + "เริ่มหักงวด พ.ย. 69 (รายคน) — งวดก่อนนั้นไม่หัก" (R4) · เบิกได้ไม่เกิน 2,000 · ประวัติแบบเดียวกัน');
      A.E(`document.getElementById('depPoAmt').value = '1000'`);
      await A.E(`depPoSave()`); await wait(30);
      const d11 = JSON.parse(A.E(`JSON.stringify((d=>({ded:d.ded,before:d.before,po:d.po,collected:d.collected}))(depositCalc(employees.find(e=>e.id===1),'2026-11')))`));
      ok(T.deposit_payouts.length === 1 && T.deposit_payouts[0].period === '2026-11' && d11.before === 2000 && d11.ded === 300 && d11.po === 1000 && d11.collected === 1300,
         '💵 พ.ย. 1,000 → สะสมก่อน 2,000 · หัก 300 · หลังเบิก 1,300 ' + JSON.stringify(d11));
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46p (low) ✎ เดิมในงวดก่อนงวดเริ่มรายคน: แก้เป็น 300 = ไม่บันทึก (เดิม toast "หักงวดนี้ 300" แต่ไม่ถูกนับ) · แก้เป็น 0 / ลบ ได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว', deposit_start:'2026-11' })]);
      T.deposit_entries = [{ id:5, employee_id:1, period:'2026-10', amount:0, note:'' }];
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const tz = tzCap(A); A.E(`go('dep')`);
      await A.E(`setDepOverride(1,'2026-10','300')`); await wait(30);
      ok(T.deposit_entries.length === 1 && T.deposit_entries[0].amount === 0 && /อยู่ก่อนงวดเริ่มหักของ นิว/.test(tz.join('|')) && /แก้เป็น 0 หรือลบ \(เว้นว่าง\) ได้เท่านั้น/.test(tz.join('|')) && !/หักงวดนี้ 300/.test(tz.join('|')),
         '✎ เดิม 0 → 300 ในงวดก่อนงวดเริ่ม = ไม่บันทึก + บอก "แก้เป็น 0 หรือลบได้เท่านั้น" ' + JSON.stringify(tz.slice(-1)));
      await A.E(`setDepOverride(1,'2026-10','')`); await wait(30);
      ok(!T.deposit_entries.length && D45(A, 1, '2026-10').ded === 0, 'ลบ ✎ เดิม (เว้นว่าง) ได้ → ต.ค. 0 (ก่อนงวดเริ่ม)');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }

    console.log('[46q (low) วันจ่ายออฟฟิศ 31 ต.ค. 20:00: ผจก. ตั้งเริ่ม พ.ย. (ต.ค. 300 → 0 ของงวดที่กำลังจ่าย) = บล็อก (เดิมผ่าน · pdPaid ยังไม่นับ) · วันถัดไปทำได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'O1', nick:'โอ', branch:'OFFICE', dept:'ออฟฟิศ' })], [1]);
      const M = await R8.dev('2026-10-31T20:00:00+07:00', db, { username:'m', role:'staff', apps:{ payroll:{ dep:'vae', emp:'v', detail:'v', payroll:'v' } } });
      M.E(`payLockAuto=false`); await M.E(`loadAll()`);
      await M.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-11'); })()`); await wait(30);
      const al = M.io.alerts[0] || '';
      ok(empRow(T, 1).deposit_start === '' && !M.io.confirms.length && /วันนี้วันจ่ายเงินเดือนงวด ต\.ค\. 2569 \(หัก 300 → 0\)/.test(al) && /ออฟฟิศ 🔒 ได้วันถัดไป/.test(al) && R8.pay(M, 1, '2026-10').dep === 300,
         'วันจ่ายออฟฟิศ: บล็อก "วันนี้วันจ่ายเงินเดือนงวด ต.ค. 2569 (หัก 300 → 0)" · ต.ค. ยังหัก 300 ' + JSON.stringify(al.split('\n').slice(1, 3)));
      ok(!M.errs.length, 'ไม่มี JS error (' + M.errs.slice(0,2).join(' | ') + ')');
    }
    // ===== ผลตรวจ R3 (2026-10-21) =====
    console.log('[46r (medium) ปิดหัก/เป้า 0 → เปลี่ยนงวดเริ่มรายคนไม่ได้ ถ้ามีงวดก่อน ต.ค. ที่จ่ายแล้ว (ยังไม่ 🔒) ที่ยอดจะเปลี่ยนตอนเปิดกลับ — ปิดหัก → เปลี่ยนงวดเริ่ม → เปิดหัก ย้อนข้อยกเว้นเจ้าของ/ใช้ข้อยกเว้นแทนเจ้าของไม่ได้]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'N1', nick:'นิว' }), ST({ id:2, code:'E1', nick:'เอ' }), ST({ id:3, code:'Z1', nick:'แซด', deposit_target:0, deposit_target_v1:null, deposit_monthly_v1:null }), ST({ id:4, code:'K1', nick:'เค' })], [4]);
      const MP = { username:'m', role:'staff', apps:{ payroll:{ dep:'vae', emp:'v', detail:'v', payroll:'v' } } };
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      A.io.promptAns = ['เพิ่งเริ่มหัก ต.ค.'];
      await A.E(`(async()=>{ go('dep'); await empStartSet(1, 'dep', '2026-10'); })()`); await wait(50);
      const n0 = ['2026-08','2026-09'].map(p => D45(A, 1, p).ded).join(), net9 = R8.pay(A, 1, '2026-09').net;
      const M = await R8.dev('2026-10-21T10:00:00+07:00', db, MP); M.E(`payLockAuto=false`); await M.E(`loadAll()`);
      await M.E(`(async()=>{ go('dep'); await updDepField(1,'deposit_on',false); await empStartSet(1,'dep',''); await updDepField(1,'deposit_on',true); })()`); await wait(50);
      const nk = T.deposit_entries.filter(r => r.employee_id === 1).map(r => r.period + ':' + r.amount + ':' + r.note).sort().join();
      ok(n0 === '0,0' && nk === '2026-08:0:lock,2026-09:0:lock' && ['2026-08','2026-09'].map(p => D45(M, 1, p).ded).join() === '0,0' && R8.pay(M, 1, '2026-09').net === net9 &&
         D45(M, 1, '2026-10').ded === 300 && D45(M, 1, '2026-10').before === 0,
         '(ก) ข้อยกเว้นเจ้าของ = 🔒 0 ส.ค./ก.ย. (R4) · ผจก. ปิดหัก → "ตามระบบ" → เปิดหัก: ส.ค./ก.ย. ยัง 0 (🔒) · สุทธิ ก.ย. ' + net9 + ' · ต.ค. 300 สะสมก่อน 0 (เดิม 500/500) ' + nk + ' start=' + empRow(T, 1).deposit_start);
      M.io.alerts.length = 0;
      await M.E(`(async()=>{ await updDepField(2,'deposit_on',false); await empStartSet(2,'dep','2026-10'); await updDepField(2,'deposit_on',true); })()`); await wait(50);
      ok(empRow(T, 2).deposit_start === '' && ['2026-08','2026-09','2026-10'].map(p => D45(M, 2, p).ded).join() === '500,500,300' && M.io.alerts.some(m => /เอ ปิดหักอยู่/.test(m)),
         '(ข) เอ ส.ค./ก.ย. 500 (หักจริง · ยังไม่ 🔒) · ผจก. ปิดหัก → ตั้ง ต.ค. = บล็อก → เปิดหัก: 500/500/300 เท่าเดิม (เดิม 0/0 ถาวร)');
      // เจ้าของก็ติดตอนปิดหัก · เป้า 0 ไม่มีกติกาเดิม (แซด) ติด · มี 🔒 ส.ค./ก.ย. แล้ว (เค) = ไม่ติด
      empRow(T, 2).deposit_on = false; empRow(T, 4).deposit_on = false;
      const O = await R8.dev('2026-10-21T10:00:00+07:00', db); O.E(`payLockAuto=false`); await O.E(`loadAll()`);
      O.io.promptAns = ['x', 'x', 'x'];
      await O.E(`(async()=>{ go('dep'); await empStartSet(2,'dep','2026-10'); await empStartSet(3,'dep','2026-10'); await empStartSet(4,'dep','2026-10'); })()`); await wait(50);
      ok(empRow(T, 2).deposit_start === '' && empRow(T, 3).deposit_start === '' && empRow(T, 4).deposit_start === '2026-10' &&
         O.io.alerts.some(m => /เอ ปิดหักอยู่/.test(m)) && O.io.alerts.some(m => /แซด เป้า\/หัก = 0/.test(m) && /ตั้งเป้า\/หักก่อน/.test(m)) && O.io.alerts.length === 2,
         'เจ้าของ: เอ (ปิดหัก) ติด · แซด (เป้า 0 · ไม่มีกติกาเดิม) ติด · เค (ปิดหัก แต่ ส.ค./ก.ย. 🔒 แล้ว) ตั้งได้ ' + JSON.stringify(O.io.alerts.map(m => m.split('\n')[1])));
      ok(!A.errs.length && !M.errs.length && !O.errs.length, 'ไม่มี JS error (' + A.errs.concat(M.errs, O.errs).slice(0,2).join(' | ') + ')');
    }

    console.log('[46s (low) ประวัติเงินประกันรายคน: 💵 ในงวดก่อน "เริ่มหักงวด" รายคน ยังมีแถวงวดนั้น · 💵 บอก "เริ่มหักงวด" ของคนนั้น · แถบ 🛡️ "ยืนยันทีละคน" · ช่องเลือกอยู่ใต้ชื่อ (ตาราง 9 คอลัมน์เท่าเดิม)]');
    { const db = makeDB(), T = db.T; seed45(T, [ST({ id:1, code:'P1', nick:'พี', deposit_opening:2500, deposit_start:'2026-11' })]);
      T.deposit_payouts = [{ id:71, employee_id:1, period:'2026-10', amount:300, pay_date:'2026-10-20', via:'cash', note:'', created_at:'' }];
      const A = await R8.dev('2026-10-21T10:00:00+07:00', db); A.E(`payLockAuto=false`); await A.E(`loadAll()`);
      const h = A.E(`dtDepHistory(employees[0],'2026-11')`), d10 = D45(A, 1, '2026-10'), rows = h.split('<tr').slice(2);
      ok(d10.collected === 2200 && rows.some(r => /งวด ต\.ค\. 2569/.test(r) && /300/.test(r) && /2,200/.test(r)) && rows.some(r => /งวด พ\.ย\. 2569/.test(r)) && /เบิกคืน/.test(h),
         'พี เริ่ม พ.ย. · 💵 ต.ค. 300 → ประวัติมีแถว ต.ค. (เบิกคืน 300 · สะสม 2,200) + พ.ย. (เดิมเหลือแค่ พ.ย.)');
      ok(A.E(`depPoBlock(employees[0],'2026-10')`) === 'งวดก่อน "เริ่มหักงวด" ของ พี (พ.ย. 69)', '💵 ต.ค.: "งวดก่อน \"เริ่มหักงวด\" ของ พี (พ.ย. 69)" (ชื่อเดียวกับคอลัมน์รายคน)');
      A.E(`go('dep'); renderDeposit();`);
      const sel = A.d.querySelector('#depTable select.emp-st[data-emp="1"]');
      ok(/เจ้าของ\/แอดมินยืนยันทีละคน — หน้าต่างบอกยอดทุกงวด \+ ใส่เหตุผล/.test(A.d.getElementById('depInfo').textContent) && A.d.querySelectorAll('#depTable thead th').length === 9 && !!sel && !!sel.closest('td.mc-name'),
         'แถบ 🛡️ "ยืนยันทีละคน — หน้าต่างบอกยอดทุกงวด" · ตาราง 9 คอลัมน์ · ช่องเลือกอยู่ใต้ชื่อ');
      sel.dispatchEvent(new A.w.MouseEvent('click', { bubbles:true }));
      ok(A.E('curPage()') === 'dep', 'คลิกช่องเลือกไม่เปิดหน้าพนักงาน');
      ok(!A.errs.length, 'ไม่มี JS error (' + A.errs.slice(0,2).join(' | ') + ')');
    }
  }
  }catch(e){ console.log('CRASH', e.stack); fail++; }
  console.log(fail ? fail+' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
