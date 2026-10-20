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
    // เปลี่ยน "เริ่มหักตั้งแต่งวด" → ก.ย.: ออฟ1 ส.ค. (ก่อน ต.ค. 69) ยังไม่ 🔒 → confirm เตือน · ยกเลิก → 🔒 ส.ค. ด้วยปุ่มก่อน → เลื่อน → ส.ค. ยังนับ 500
    E(`var __stSel = () => Object.assign(document.createElement('select'),{innerHTML:'<option value="2026-09">x</option>',value:'2026-09'});`);
    io.confirms.length = 0; io.confirmAns = m => !/เริ่มหักตั้งแต่งวด/.test(m);
    await E(`depStartChange(__stSel())`);
    ok(E(`settings.depStart`)==='2026-08' && /งวดก่อน ต\.ค\. 69 ที่ยังไม่ 🔒 ระบบไม่ปิดยอดให้/.test(io.confirms.join()) && /2 คน \(ส\.ค\. 69\)/.test(io.confirms.join()),
       'เลื่อนงวดเริ่ม: confirm เตือน "งวดก่อน ต.ค. 69 ที่ยังไม่ 🔒 … 2 คน (ส.ค. 69)" · ยกเลิก = ไม่เปลี่ยน');
    io.confirmAns = null;
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
    const it = n => JSON.parse(E(`JSON.stringify((x=>x&&{block:x.block,on:x.on,amount:x.amount,warn:x.warn})(depRefState.items.find(x=>x.e.nick==='${n}')))`));
    ok(/ไม่มีสลิป/.test(it('ลาออก').block), 'ติ๊กไม่ได้: คนพ้นสภาพไม่มีวันทำงานงวด ต.ค. ("ไม่มีสลิป/ไม่อยู่ในไฟล์ K BIZ")');
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
    A.T.deposit_entries = []; await E(`depRefresh()`);
    E(`p2.depOpen=0; document.getElementById('periodSel').value='2026-10';`);
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
    A.T.deposit_entries = []; await E(`depRefresh()`); A.db.log.length = 0;
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
    // H1-a ยังไม่รัน v2 (_v1 null): ✎ ในงวดที่ไม่มีวันทำงาน (ส.ค./ก.ย./พ.ย.) + ✎ ต.ค. → เท่าแอปเดิมทุกงวด
    let n = 0, diff = 0;
    for(let i=0; i<300; i++){
      const tgt=[0,3000,5000,6000][i%4], mon=[300,500,700][i%3], op=[0,500,1800,2500,4000][i%5], on=(i%7)!==0, br=(i%5===0)?'OFFICE':'JJLP';
      const gapP = ['2026-08','2026-09','2026-11'][i%3];
      E(`var e1=emp({id:${i+1},code:'C${i}',nick:'n${i}',branch:'${br}',deposit_target:${tgt},deposit_monthly:${mon},deposit_opening:${op},deposit_on:${on}});
         employees=[e1]; shifts={C${i}:mk('2026-07-20','2027-01-25',k=>periodOfE(e1,k)==='${gapP}')}; depV2Col=false;
         depositEntries=[{id:1,empId:${i+1},period:'${gapP}',amount:${[200,500,1000][i%3]},note:''}${i%2 ? `,{id:2,empId:${i+1},period:'2026-10',amount:${(i*37)%900},note:''}` : ''}];`);
      for(const p of ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01']){
        n++;
        const o = JSON.parse(E(`JSON.stringify(depositCalcOld(e1,'${p}'))`)), m = JSON.parse(E(`JSON.stringify(depositCalc(e1,'${p}'))`));
        if(o.ded!==m.ded || o.collected!==m.collected || o.remain!==m.remain || o.done!==m.done){ diff++; if(diff<4) console.log('   DIFF', i, p, JSON.stringify(o), JSON.stringify(m)); }
      }
    }
    ok(diff === 0, `ยังไม่รัน v2: ✎ ในงวดที่ไม่มีวันทำงาน (ส.ค./ก.ย./พ.ย.) สุ่มเทียบแอปเดิม ${n} เคส ต่างกัน ${diff} เคส`);
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
    console.log('[30b K BIZ พ.ย.: ล็อกอัตโนมัติเฉพาะงวด ≥ ต.ค. 69 (ถามพร้อมสรุป) · ส.ค./ก.ย. ไม่ล็อก]');
    E(SEED); E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'เอ',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'1111111111'});
      var b=emp({id:2,code:'B',nick:'บี',deposit_target_v1:5000,deposit_monthly_v1:500,bank_name:'กสิกรไทย',bank_account:'2222222222'});
      employees=[a,b]; shifts={A:mk('2026-07-26','2026-12-02'),B:mk('2026-07-26','2026-12-02')}; depositEntries=[]; depV2Col=true;
      go('payroll'); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-11';`);
    T.deposit_entries = []; await E(`depRefresh()`);
    const nW = () => A.db.log.filter(l=>l.op!=='select').length;
    io.confirmAns = m => !/ก่อนสร้างไฟล์ จะปิดยอด/.test(m); io.confirms.length = 0; io.files.length = 0; A.db.log.length = 0;
    await E(`exportKbizPay('')`); await wait(20);
    const lk = io.confirms.find(m=>/ก่อนสร้างไฟล์ จะปิดยอด/.test(m)) || '';
    ok(/ปิดยอดงวดที่จ่ายแล้ว ต\.ค\. 69 /.test(lk) && /เงินประกัน 2 คน รวม 600 บาท/.test(lk) && !io.files.length && !nW(),
       'K BIZ พ.ย.: ถาม "ก่อนสร้างไฟล์ จะปิดยอด ต.ค. 69 · เงินประกัน 2 คน รวม 600 บาท" (ไม่มี ส.ค./ก.ย.) → ตอบไม่ = ไม่มีไฟล์ · ไม่เขียน');
    io.confirmAns = null;
    await E(`exportKbizPay('')`); await wait(20);
    ok(io.files.length===1 && T.deposit_entries.map(r=>r.employee_id+':'+r.period+':'+r.amount+':'+r.note).sort().join()==='1:2026-10:300:lock,2:2026-10:300:lock',
       'ตอบใช่ → ล็อก ต.ค. 300 × 2 คน แล้วสร้างไฟล์ · ไม่ล็อก ส.ค./ก.ย. (ก่อน ต.ค. 69) · ไม่ล็อก พ.ย. (งวดของไฟล์)');
    ok(JSON.parse(E(`JSON.stringify(depUnlockedPeriods())`)).map(x=>x.p).join()==='2026-08,2026-09', 'แถบเตือน: ส.ค./ก.ย. ยังไม่ปิดยอด (เจ้าของตรวจแล้ว 🔒 เอง)');
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
  }catch(e){ console.log('CRASH', e.stack); fail++; }
  console.log(fail ? fail+' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
