// เทสเงินสำรองเลี้ยงชีพ (เจ้าของสั่ง 2026-10-20 · สมัครใจรายคน) กับโค้ดจริงใน jjmk-payroll.html (jsdom + ฐานข้อมูลจำลอง + นาฬิกาจำลอง)
// ตัวเลขเงินเป็นบาทจริงตามตาราง D.7 · ร้านสมทบไม่เปลี่ยน net · หักได้ไม่เกินสุทธิ · ถอน/จ่ายคืน · ปิดยอด · ยังไม่รัน SQL = เหมือนเดิมทุกบาท
const { boot, SEED, wait } = require('./fakedb');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(!c) fail++; };
const txt = (E, js) => E(`(()=>{const d=document.createElement('div'); d.innerHTML=${js}; return d.textContent.replace(/\\s+/g,' ');})()`);
const PSEED = `pvdReady=true; pvdLoadErr=''; pvdMembers=[]; pvdEntries=[]; pvdPayouts=[]; AUTH={username:'o',role:'owner'}; applyUser(AUTH);
  var M = function(o){ return fromDbPvdM(Object.assign({id:o.employee_id, emp_mode:'fixed', emp_value:0, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:''}, o)); };
  var V = function(e,p){ return calcPay(e,p).pvd; };`;

(async () => {
  try{
  // ============ 8) ยังไม่รัน SQL: เหมือนเดิมทุกบาท ============
  { const A = boot(); const { E } = A; await wait(300);
    console.log('[8 ยังไม่รัน jj_provident.sql — calcPay เท่าเดิม · ปุ่มบอกให้รัน SQL · ไม่มีช่อง jjmk-pvd]');
    E(SEED); E(`var a=emp({id:1,code:'A',nick:'เอ',deposit_on:false}); employees=[a]; shifts={A:mk('2026-09-26','2026-10-25')};`);
    const base0 = E(`JSON.stringify((({base,addSum,deduSum,net})=>({base,addSum,deduSum,net}))(calcPay(a,'2026-10')))`);
    E(`pvdReady=false; pvdMembers=[fromDbPvdM({id:1,employee_id:1,emp_mode:'fixed',emp_value:500})];`);
    ok(E(`JSON.stringify((({base,addSum,deduSum,net})=>({base,addSum,deduSum,net}))(calcPay(a,'2026-10')))`)===base0 && E(`calcPay(a,'2026-10').pvd.ded`)===0, 'pvdReady=false → calcPay ทุกฟิลด์เท่าเดิม (แม้มีแถวสมาชิกค้างในเครื่อง)');
    E(`openPvdForm()`); ok(/jj_provident\.sql/.test(A.d.getElementById('toast').textContent) && !A.d.getElementById('pvdBg').classList.contains('show'), 'ปุ่ม ＋ เพิ่มสมาชิก → "ต้องรัน jj_provident.sql ใน Supabase ก่อน"');
    E(`go('pvd')`); ok(/ต้องรัน jj_provident\.sql/.test(A.d.getElementById('pvdInfo').textContent), 'หน้า 🐷 ขึ้น "⚠️ ต้องรัน jj_provident.sql ก่อน"');
    E(`pvdRealtime()`); ok(!A.db.chans['jjmk-pvd'], 'ไม่เปิดช่อง realtime jjmk-pvd ก่อนรัน SQL');
  }

  // ============ 1–3, 9, 10) ตาราง D.7 เป็นบาทจริง ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[1 ตาราง D.7 — งวด ต.ค. 69 (หน้าร้าน 26 ก.ย.–25 ต.ค. · ออฟฟิศ 1–31 ต.ค.)]');
    E(SEED); E(PSEED); E(`
      var e1=emp({id:1,code:'E1',nick:'หนึ่ง',deposit_on:false});
      var e2=emp({id:2,code:'E2',nick:'สอง',wage_type:'daily',rate:400,deposit_on:false});
      var e3=emp({id:3,code:'E3',nick:'สาม',rate:12345,deposit_on:false});
      var e4=emp({id:4,code:'E4',nick:'สี่',branch:'OFFICE',rate:18000,deposit_on:false,holiday_pay:false});
      var e5=emp({id:5,code:'E5',nick:'ห้า',start_date:'2026-10-10',deposit_on:false});
      var e6=emp({id:6,code:'E6',nick:'หก',deposit_on:false});
      var e7=emp({id:7,code:'E7',nick:'เจ็ด',deposit_on:false});
      var e10=emp({id:10,code:'E10',nick:'สิบ',wage_type:'daily',rate:400,deposit_on:false});
      employees=[e1,e2,e3,e4,e5,e6,e7,e10];
      shifts={E1:mk('2026-09-26','2026-12-25'), E2:mk('2026-09-26','2026-10-25',k=>['2026-10-01','2026-10-08','2026-10-15','2026-10-22'].includes(k)),
              E3:mk('2026-09-26','2026-10-25'), E4:mk('2026-10-01','2026-10-31'), E5:mk('2026-10-10','2026-10-25'), E6:mk('2026-07-26','2026-09-25'),
              E7:mk('2026-09-26','2026-10-25'), E10:mk('2026-10-20','2026-10-20')};
      pvdMembers=[M({employee_id:1,emp_mode:'fixed',emp_value:500}), M({employee_id:2,emp_mode:'pct',emp_value:5,er_mode:'match',er_value:50}),
                  M({employee_id:3,emp_mode:'pct',emp_value:2.5,er_mode:'pct',er_value:2.5}), M({employee_id:4,emp_mode:'pct',emp_value:3,er_mode:'pct',er_value:3}),
                  M({employee_id:5,emp_mode:'pct',emp_value:3,er_mode:'fixed',er_value:200}), M({employee_id:6,emp_mode:'fixed',emp_value:500,er_mode:'match',er_value:50}),
                  M({employee_id:7,emp_mode:'fixed',emp_value:500,er_mode:'match',er_value:50}), M({employee_id:10,emp_mode:'fixed',emp_value:500,er_mode:'match',er_value:50})];
      pvdEntries=[fromDbPvdE({id:1,employee_id:7,period:'2026-10',emp_amount:0,er_amount:null,note:''})];`);
    const R = id => JSON.parse(E(`(p=>JSON.stringify({base:p.base,ded:p.pvd.ded,er:p.pvd.er,net:p.net,bal:p.pvd.balance,want:p.pvd.want,emp:p.pvd.empSum,erS:p.pvd.erSum}))(calcPay(employees.find(e=>e.id===${id}),'2026-10'))`));
    const net0 = id => E(`(()=>{ const s=pvdReady; pvdReady=false; const n=calcPay(employees.find(e=>e.id===${id}),'2026-10').net; pvdReady=s; return n; })()`);
    let r = R(1); ok(r.base===12000 && r.ded===500 && r.er===0 && r.net===11500 && r.bal===500, `คน 1 รายเดือน 12,000 · คงที่ 500 · ร้านไม่สมทบ → หัก 500 · ร้าน 0 · สุทธิ 11,500 · สะสม 500 (ได้ ${JSON.stringify(r)})`);
    ok(E(`V(e1,'2026-12').balance`)===1500, 'คน 1 ครบ 3 งวด (ต.ค.–ธ.ค.) สะสม 1,500');
    r = R(2); ok(r.base===10400 && r.ded===520 && r.er===260 && r.net===9880 && r.bal===780, `คน 2 รายวัน 400 × 26 วัน · 5% · ร้าน "ครึ่งหนึ่ง" (match 50) → 520 · 260 · สุทธิ 9,880 · สะสม 780 (ได้ ${JSON.stringify(r)})`);
    r = R(3); ok(r.base===12345 && r.ded===309 && r.er===309 && r.net===12345-309 && r.bal===618, `คน 3 รายเดือน 12,345 · 2.5% (308.625 → 309) · ร้าน 2.5% ของค่าแรง 309 · สะสม 618 (ได้ ${JSON.stringify(r)})`);
    r = R(4); ok(r.base===18000 && r.ded===540 && r.er===540 && r.net===17460 && r.bal===1080, `คน 4 ออฟฟิศ 18,000 (1–31 ต.ค.) · 3% · ร้าน 3% → 540 · 540 · สุทธิ 17,460 · สะสม 1,080 (ได้ ${JSON.stringify(r)})`);
    r = R(5); ok(r.base===6400 && r.ded===192 && r.er===200 && r.bal===392, `คน 5 เริ่มงาน 10 ต.ค. (16 วัน = 6,400) · 3% · ร้านคงที่ 200 → 192 · 200 · สะสม 392 (ได้ ${JSON.stringify(r)})`);
    r = R(6); ok(r.base===0 && r.ded===0 && r.er===0 && r.net===0, 'คน 6 ลาทั้งงวด (ไม่มีวันทำงาน) → หัก 0 · ร้าน 0');
    r = R(7); ok(r.base===12000 && r.ded===0 && r.er===0 && r.net===12000, 'คน 7 ✎ งวดนี้ "งดหัก" (0) · ร้าน match 50 → 0 · 0');
    r = R(10); ok(r.base===400 && r.want===500 && r.ded===400 && r.er===200 && r.net===0 && r.bal===600, `คน 10 รายวัน 400 × 1 วัน · คงที่ 500 · สุทธิไม่พอ → หัก 400 จาก 500 · ร้าน 200 · สุทธิ 0 · สะสม 600 (ได้ ${JSON.stringify(r)})`);
    ok([1,2,3,4,5].every(id => { const x = R(id); return x.net === net0(id) - x.ded; }), 'ร้านสมทบไม่เปลี่ยน net (net = สุทธิเดิม − ยอดหักพนักงานเท่านั้น)');
    const s10 = txt(E, `buildSlip(e10,'2026-10',true)`);
    ok(s10.includes('เงินสำรองเลี้ยงชีพ') && s10.includes('หักได้ 400 จาก 500') && s10.includes('400.00'), 'สลิป: "เงินสำรองเลี้ยงชีพ (หักได้ 400 จาก 500 · สุทธิไม่พอ …)" 400.00');
    const s2 = txt(E, `buildSlip(e2,'2026-10',true)`);
    ok(s2.includes('เงินสำรองเลี้ยงชีพ (5% ของค่าแรง · ร้านสมทบ 260 · ยอดสะสม 780)') && s2.includes('520.00') && !/ม\.76/.test(s2), 'สลิป: "เงินสำรองเลี้ยงชีพ (5% ของค่าแรง · ร้านสมทบ 260 · ยอดสะสม 780)" 520.00 · ร้านสมทบอยู่ในข้อความเท่านั้น · ไม่พิมพ์ ม.76');

    console.log('[2–3 ร้านสมทบ none/match/fixed/pct · override null/0/ร้าน 100]');
    E(`pvdMembers.find(m=>m.empId===1).erMode='match'; pvdMembers.find(m=>m.empId===1).erValue=50;`); ok(E(`V(e1,'2026-10').er`)===250, 'match 50 ของ 500 → 250');
    E(`pvdMembers.find(m=>m.empId===1).erMode='fixed'; pvdMembers.find(m=>m.empId===1).erValue=200;`); ok(E(`V(e1,'2026-10').er`)===200, 'fixed 200 → 200');
    E(`pvdMembers.find(m=>m.empId===1).erMode='pct'; pvdMembers.find(m=>m.empId===1).erValue=3;`); ok(E(`V(e1,'2026-10').er`)===360, 'pct 3% ของ 12,000 → 360');
    E(`pvdMembers.find(m=>m.empId===1).erMode='none';`); ok(E(`V(e1,'2026-10').er`)===0, 'none → 0');
    E(`pvdEntries.push(fromDbPvdE({id:2,employee_id:1,period:'2026-10',emp_amount:null,er_amount:100,note:''}))`);
    ok(E(`V(e1,'2026-10').ded`)===500 && E(`V(e1,'2026-10').er`)===100, 'override emp_amount NULL = อัตโนมัติ 500 · er_amount 100 = ร้าน 100');
    ok(E(`fromDbPvdE({id:3,employee_id:1,period:'x',emp_amount:null,er_amount:0}).empAmt`)===null && E(`fromDbPvdE({id:3,employee_id:1,period:'x',emp_amount:null,er_amount:0}).erAmt`)===0, 'fromDbPvdE: NULL ยังเป็น null (ไม่กลายเป็น "งด 0") · 0 ยังเป็น 0');
    E(`pvdEntries=pvdEntries.filter(x=>x.id!==2)`);

    console.log('[10 สุทธิไม่พอจากเบิกกลางเดือน · 13 เตือน ม.76]');
    E(`advances=[fromDbAdv({id:1,employee_id:3,period:'2026-10',amount:12500,taken_date:'2026-10-15'})]`);
    ok(E(`V(e3,'2026-10').ded`)===0 && E(`V(e3,'2026-10').er`)===0 && E(`V(e3,'2026-10').short`)===309, '% ที่สุทธิติดลบจากเบิกกลางเดือน → หัก 0 · ร้าน 0 (ยอดสะสมนับเฉพาะที่หักได้)');
    E(`advances=[]`);
    E(`depReady=true; e2.depOn=true; e2.depTarget=3000; e2.depMonthly=300; loans=[fromDbLoan({id:1,employee_id:2,amount:10000,monthly:2000,deduct_on:'payroll',start_period:'2026-10'})]; loanReady=true;`);
    ok(E(`V(e2,'2026-10').warn76`)===true && E(`V(e2,'2026-10').ded`)===520, '5% ของ 10,400 (520) + เงินประกัน 300 + ผ่อน 2,000 = 2,820 > 20% ของค่าแรง → เตือน ม.76');
    ok(!/ม\.76/.test(txt(E, `buildSlip(e2,'2026-10',true)`)), 'เตือน ม.76 ไม่พิมพ์ในสลิป');
    E(`loans=[]; e2.depOn=false; pvdMembers.find(m=>m.empId===1).empMode='pct'; pvdMembers.find(m=>m.empId===1).empValue=12;`);
    ok(E(`V(e1,'2026-10').warn76`)===true && E(`V(e1,'2026-10').ded`)===1440, 'หัก 12% (1,440) > 10% ของค่าแรง → เตือน ม.76');
    E(`pvdMembers.find(m=>m.empId===1).empValue=5;`); ok(E(`V(e1,'2026-10').warn76`)===false, 'หัก 5% ไม่มีหักอื่น → ไม่เตือน');
    E(`pvdMembers.find(m=>m.empId===1).empMode='fixed'; pvdMembers.find(m=>m.empId===1).empValue=500;`);
  }

  // ============ 4–7, 14, 15) ถอน · สะสม · ปิดยอด · หยุดหัก · ลบ · สาขา ============
  { const A = boot({ now:'2026-11-08T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[5 สะสม 3 งวด + ยกมา · 🔒 แล้วเปลี่ยน % / ลบสแกน → ยอดที่ล็อกไม่เปลี่ยน]');
    E(SEED); E(PSEED); E(`
      var a=emp({id:1,code:'A',nick:'เอ',deposit_on:false,bank_name:'กสิกรไทย',bank_account:'1234567890'});
      var b=emp({id:2,code:'B',nick:'บี',branch:'JJRD',deposit_on:false});
      var g=emp({id:3,code:'G',nick:'ลาออก',active:false,deposit_on:false});
      employees=[a,b,g]; shifts={A:mk('2026-07-26','2027-01-25'),B:mk('2026-07-26','2027-01-25'),G:mk('2026-07-26','2026-09-25')};
      settings.depStart='2026-08';`);
    A.T.pvd_members = [ { id:1, employee_id:1, emp_mode:'pct', emp_value:5, er_mode:'match', er_value:50, start_period:'2026-09', stop_period:'', opening_emp:1000, opening_er:500, consent:true, note:'' },
                        { id:2, employee_id:2, emp_mode:'fixed', emp_value:300, er_mode:'none', er_value:0, start_period:'2026-09', stop_period:'', opening_emp:0, opening_er:0, consent:false, note:'' },
                        { id:3, employee_id:3, emp_mode:'fixed', emp_value:500, er_mode:'none', er_value:0, start_period:'2026-08', stop_period:'2026-10', opening_emp:0, opening_er:0, consent:true, note:'' } ];
    A.T.pvd_entries = []; A.T.pvd_payouts = [];
    await E(`pvdRefresh()`);
    ok(E(`V(a,'2026-11').empSum`)===1000+600*3 && E(`V(a,'2026-11').erSum`)===500+300*3 && E(`V(a,'2026-11').balance`)===1000+500+900*3, 'สะสม ก.ย.–พ.ย. 3 งวด (600+300 ต่องวด) + ยกมา 1,000/500 → พนักงาน 2,800 · ร้าน 1,400 · คงเหลือ 4,200');
    // 🔒 ต.ค. ผ่านปุ่ม แล้วเปลี่ยน % → ต.ค. ไม่เปลี่ยน
    E(`go('pvd'); renderPvd(); document.getElementById('pvdPeriodSel').value='2026-10';`);
    await E(`pvdLockOpen()`);
    ok(E(`depLockState.mode`)==='pvd' && E(`depLockState.items.map(x=>x.e.nick+':'+x.ded+'/'+x.er).join()`)==='เอ:600/300,บี:300/0', 'พรีวิว 🔒 เงินสำรองฯ ต.ค.: เอ 600/300 · บี 300/0');
    await E(`depLockSave()`);
    ok(T.pvd_entries.filter(r=>r.period==='2026-10' && r.note==='lock').length===2, 'บันทึก pvd_entries note lock ต.ค. 2 แถว');
    io.confirms.length = 0;
    await E(`updPvdField(1,'emp_value',10)`);
    ok(/ก\.ย\. 69 600/.test(io.confirms[0]||'') && T.pvd_entries.some(r=>r.employee_id===1 && r.period==='2026-09' && r.note==='lock' && r.emp_amount===600 && r.er_amount===300), 'แก้ % → ล็อกก่อนแก้ ก.ย. 600/300 (งวดที่จ่ายแล้วยังไม่ล็อก)');
    ok(E(`V(a,'2026-10').ded`)===600 && E(`V(a,'2026-11').ded`)===1200 && E(`V(a,'2026-11').empSum`)===1000+600+600+1200, 'หลังเปลี่ยนเป็น 10%: ก.ย./ต.ค. ที่ล็อกยัง 600 · พ.ย. 1,200');
    E(`shifts.A = shifts.A.filter(s=>periodOfE(a,s.day)!=='2026-10')`);
    ok(E(`V(a,'2026-11').empSum`)===1000+600+600+1200, 'ลบสแกน ต.ค. หลังล็อก → ยอดสะสมไม่ลด');

    console.log('[4 ถอนเงินสด/โอน vs จ่ายคืนในสลิป · 6 ถอนเกิน/งวดปิดยอด/หยุดหัก · 14 ไม่มีสลิป/เลยกำหนด]');
    const bal = E(`V(a,'2026-12').balance`);
    const net12 = E(`calcPay(a,'2026-12').net`);
    const out = async (via, amt, period, emp) => { E(`openPvdOut(); pvdOutPick=${emp||1}; fillPvdOutEmp(''); document.getElementById('pvdOutDate').value='2026-11-08'; pvdOutDateChg();
        (s=>{ if(![...s.options].some(o=>o.value==='${period}')) s.innerHTML+='<option value="${period}">${period}</option>'; s.value='${period}'; })(document.getElementById('pvdOutPeriod'));
        document.getElementById('pvdOutAmt').value='${amt}'; document.getElementById('pvdOutVia').value='${via}';`); return E(`savePvdPayout()`); };
    await out('cash', 1500, '2026-12');
    ok(E(`calcPay(a,'2026-12').net`)===net12 && E(`V(a,'2026-12').balance`)===bal-1500, 'ถอนเงินสด 1,500 → net เท่าเดิม · คงเหลือลด 1,500');
    await out('slip', 1500, '2026-12');
    ok(E(`calcPay(a,'2026-12').net`)===net12+1500 && E(`V(a,'2026-12').balance`)===bal-3000, 'จ่ายคืนในสลิป 1,500 → net +1,500 · คงเหลือลดอีก 1,500');
    const sa = txt(E, `buildSlip(a,'2026-12',true)`);
    ok(sa.includes('รับคืนเงินสำรองเลี้ยงชีพ') && sa.includes('1,500.00'), 'สลิป: บรรทัดรายรับ "รับคืนเงินสำรองเลี้ยงชีพ (คงเหลือ …)" 1,500.00');
    E(`refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-12';`); io.files.length = 0;
    await E(`Promise.resolve(exportKbizPay(''))`); await wait(50);
    const kf = io.files.pop(); const kr = kf && kf.aoa.slice(3).find(x=>x[1]==='1234567890');
    ok(kr && Math.abs(kr[3] - E(`Math.round(calcPay(a,'2026-12').net*100)/100`)) < 0.005, 'ไฟล์ K BIZ: ยอดโอน = net (รวมรับคืน 1,500)');
    const n0 = T.pvd_payouts.length;
    await out('cash', 999999, '2026-12');
    ok(T.pvd_payouts.length===n0, 'ถอนเกินยอดคงเหลือ → บล็อก (ไม่บันทึก)');
    await out('slip', 100, '2026-10');
    ok(T.pvd_payouts.length===n0, 'จ่ายคืนในสลิปงวดที่ปิดยอดแล้ว (ต.ค.) → บล็อก');
    A.setNow('2026-12-04T12:00:00+07:00');
    await out('slip', 100, '2026-11');
    ok(T.pvd_payouts.length===n0, 'จ่ายในสลิปงวด พ.ย. วันที่ 4 ธ.ค. (วันจ่าย 5 ธ.ค. ≤ พรุ่งนี้) → บล็อก "เลยกำหนดสร้างไฟล์โอน"');
    A.setNow('2026-11-08T12:00:00+07:00');
    await out('slip', 100, '2026-11');
    ok(T.pvd_payouts.length===n0+1, 'จ่ายในสลิปงวด พ.ย. วันที่ 8 พ.ย. (วันจ่าย 5 ธ.ค.) → ได้');
    await out('slip', 100, '2026-12', 3);
    ok(T.pvd_payouts.length===n0+1, 'คนพ้นสภาพที่ไม่มีวันทำงานงวดนั้น → จ่ายในสลิปไม่ได้ (ไม่มีสลิป/ไม่อยู่ในไฟล์ K BIZ)');
    await out('cash', 100, '2026-12', 3);
    ok(T.pvd_payouts.length===n0+2, '…แต่จ่ายเงินสดได้');
    ok(E(`V(g,'2026-09').ded`)===500 && E(`V(g,'2026-10').ded`)===0 && E(`V(g,'2026-12').balance`)===1000-100, 'stop_period 2026-10 → หยุดหักตั้งแต่ ต.ค. · ยอดเดิม 1,000 ยังอยู่ (ถอน 100 → 900)');

    console.log('[7 คนพ้นสภาพที่มียอดอยู่ในตาราง · ลบสมาชิกที่มียอด = ไม่เขียน · 15 ขอบเขตสาขา/realtime]');
    E(`document.getElementById('pvdPeriodSel').value='2026-12'; renderPvd();`);
    ok([...A.d.querySelectorAll('#pvdTable tbody tr')].some(r=>/ลาออก/.test(r.textContent) && /พ้นสภาพ/.test(r.textContent)), 'ตาราง #pvd มีคนพ้นสภาพที่คงเหลือ > 0');
    A.db.log.length = 0;
    await E(`delPvdMember({dataset:{m:'1'}})`);
    ok(!A.db.log.some(l=>l.table==='pvd_members' && l.op==='delete'), 'ลบสมาชิกที่มียอด → ไม่มีการเขียน (ใช้ ⏸ หยุดหักแทน)');
    E(`AUTH={username:'m',role:'manager',apps:{payroll:{pvd:'vae',_br:'JJLP'}}}; applyUser(AUTH); scopeEmployees(); go('pvd'); renderPvd();`);
    const rowsTxt = A.d.getElementById('pvdTable').textContent;
    ok(/เอ/.test(rowsTxt) && !/บี/.test(rowsTxt), 'บัญชีสาขา JJLP ไม่เห็นสมาชิก JJRD (ไล่จาก employees ที่ผ่าน scope แล้ว)');
    ok(!A.errs.some(x=>/TypeError|ReferenceError/.test(x)) && E(`pvdMembers.length`)===3, 'มีสมาชิกที่ employees ในเครื่องไม่มี (สาขาอื่น) → ไม่ error');
    E(`pvdRealtime(); pvdRealtime();`);
    ok(A.db.chans['jjmk-pvd'] && E(`!!pvdCh`) && Object.keys(A.db.chans['jjmk-pvd']).sort().join()==='pvd_entries,pvd_members,pvd_payouts' && !('pvd_members' in (A.db.chans['jjmk-live']||{})), 'pvdRealtime() เรียก 2 ครั้ง = ช่องเดียว jjmk-pvd (3 ตาราง · ไม่อยู่ใน jjmk-live)');
    // 2 ขั้นไม่ทับ: เครื่องค้างเห็น ✎ แต่ DB เป็น 🔒
    E(`AUTH={username:'o',role:'owner'}; applyUser(AUTH);`);
    A.T.pvd_entries.push({ id:8001, employee_id:2, period:'2026-12', emp_amount:300, er_amount:0, note:'lock' });
    const w2 = JSON.parse(await E(`pvdLockWrite([{e:b,p:'2026-12',ded:999,er:9,row:{id:8001,note:''}}]).then(r=>JSON.stringify({n:r.rows.length,skip:r.skip}))`));
    ok(w2.skip===1 && T.pvd_entries.find(r=>r.id===8001).emp_amount===300, 'ล็อก 2 ขั้น: ในเครื่องเห็น ✎ แต่ DB เป็น 🔒 → ไม่ทับ');
  }

  // ============ 9, 12) ออฟฟิศ % · พรีวิวปฏิทินไม่ทำให้ยอดค้าง ============
  { const A = boot({ now:'2026-11-08T12:00:00+07:00' }); const { E } = A; await wait(300);
    console.log('[9 ออฟฟิศโหมด % ใช้ฐาน 1–31 ต.ค. · 12 พรีวิวปฏิทินไม่ทำให้ยอดสะสมค้าง]');
    E(SEED); E(PSEED); E(`
      var o=emp({id:1,code:'O',nick:'ออฟ',branch:'OFFICE',wage_type:'daily',rate:600,deposit_on:false,holiday_pay:false});
      employees=[o]; shifts={O:mk('2026-09-01','2026-11-30',k=>k==='2026-10-15')};
      pvdMembers=[M({employee_id:1,emp_mode:'pct',emp_value:3,er_mode:'match',er_value:100,start_period:'2026-10'})];`);
    ok(E(`calcPay(o,'2026-10').base`)===30*600 && E(`V(o,'2026-10').ded`)===540, 'ออฟฟิศรายวัน ต.ค. (1–31 ต.ค. ขาด 15 ต.ค. = 30 วัน × 600 = 18,000) · 3% = 540');
    const before = txt(E, `buildSlip(o,'2026-11',true)`), b0 = E(`V(o,'2026-11').balance`);
    E(`calPreview({id:'o1',name:'หยุดออฟฟิศ',kind:'office',day_from:'2026-10-15',day_to:'2026-10-15',pay_multiplier:null,pay_status:'pending',cancelled:false})`);
    ok(E(`V(o,'2026-11').balance`)===b0 && txt(E, `buildSlip(o,'2026-11',true)`)===before, 'เรียกพรีวิวปฏิทิน (วันหยุดออฟฟิศเปลี่ยนฐาน ต.ค.) แล้วยอดสะสมในสลิป พ.ย. เท่าเดิม (ไม่ค้าง)');
    E(`holidays['2026-10-15|office']={day:'2026-10-15',name:'หยุด',mult:2,id:9,scope:'office',calId:null}`);
    ok(E(`V(o,'2026-10').ded`)===558 && E(`V(o,'2026-11').balance`)===b0+36, 'วันหยุดจริง → ฐาน ต.ค. 31 วัน = 18,600 · 3% = 558 → ยอดสะสม พ.ย. +18+18 (ร้าน match 100) ทันที');
  }

  // ============ 11) เกิน 1,000 แถว + โหลดล้ม ============
  { const A = boot({ now:'2026-11-08T12:00:00+07:00' }); const { E, io } = A; await wait(300);
    console.log('[11 pvd_entries เกิน 1,000 แถว · โหลดล้ม = pvdLoadErr บล็อกการออกตัวเลขเงิน]');
    E(SEED);
    A.T.pvd_members = Array.from({length:120}, (_,i)=>({ id:i+1, employee_id:i+1, emp_mode:'fixed', emp_value:100, er_mode:'none', er_value:0, start_period:'2026-01', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' }));
    A.T.pvd_entries = []; let id = 1;
    for(let e=1; e<=120; e++) for(let k=0; k<12; k++) A.T.pvd_entries.push({ id:id++, employee_id:e, period:'2026-'+String(k+1).padStart(2,'0'), emp_amount:100, er_amount:0, note:'lock' });
    A.T.pvd_payouts = [];
    await E(`pvdLoad()`);
    ok(E(`pvdReady && !pvdLoadErr && pvdEntries.length`)===1440, 'โหลด pvd_entries 1,440 แถวครบ (แบ่งหน้า)');
    A.db.countLie.pvd_entries = 2000; await E(`pvdLoad()`);
    ok(/ไม่ครบ/.test(E(`pvdLoadErr`)) && E(`pvdEntries.length`)===1440, 'count ไม่ตรง → pvdLoadErr · เก็บข้อมูลเดิม');
    E(`var x=emp({id:1,code:'X',nick:'x',deposit_on:false}); employees=[x]; shifts={X:mk('2026-09-26','2026-10-25')}; refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    io.files.length = 0; A.db.log.length = 0;
    await E(`Promise.all([exportPayrollXlsx(), exportKbizPay(''), openSlip(1,'2026-10'), openPvdOut(), openPvdForm()])`); await wait(50);
    ok(!io.files.length && !A.d.getElementById('slipBg').classList.contains('show') && !A.d.getElementById('pvdOutBg').classList.contains('show') && !A.d.getElementById('pvdBg').classList.contains('show') && !A.db.log.length, 'pvdLoadErr → Excel / K BIZ / สลิป / ถอน / เพิ่มสมาชิก ไม่ทำงาน');
    delete A.db.countLie.pvd_entries; A.db.fail.pvd_members = { code:'PGRST205', message:"Could not find the table 'public.pvd_members'" };
    await E(`pvdLoad()`);
    ok(E(`pvdReady`)===false && E(`pvdLoadErr`)==='', 'ยังไม่มีตาราง (PGRST205) → pvdReady=false ไม่บล็อก');
  }

  // ============ 16) ห้ามหักย้อนหลังงวดที่จ่ายแล้ว: หักต่อ · เลื่อนงวดเริ่ม · เพิ่มสมาชิกงวดเก่า ============
  { const A = boot({ now:'2027-03-10T12:00:00+07:00' }); const { E, T, io } = A; await wait(300);
    console.log('[16 หักต่อ/เลื่อนงวดเริ่ม/เพิ่มสมาชิกย้อนหลัง → งวดที่จ่ายแล้วไม่เปลี่ยน (ล็อก 0 ก่อน)]');
    E(SEED); E(PSEED); E(`
      var a=emp({id:1,code:'A',nick:'เอ',deposit_on:false,bank_name:'กสิกรไทย',bank_account:'1234567890'});
      var b=emp({id:2,code:'B',nick:'บี',deposit_on:false});
      employees=[a,b]; shifts={A:mk('2026-09-26','2027-03-09'),B:mk('2026-11-26','2027-03-09')}; depositEntries=[];`);
    T.deposit_entries = [];
    T.pvd_members = [{ id:1, employee_id:1, emp_mode:'fixed', emp_value:500, er_mode:'match', er_value:50, start_period:'2026-10', stop_period:'2026-12', opening_emp:0, opening_er:0, consent:true, note:'' },
                     { id:2, employee_id:2, emp_mode:'pct', emp_value:5, er_mode:'none', er_value:0, start_period:'2027-03', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' }];
    T.pvd_entries = [{ id:1, employee_id:1, period:'2026-10', emp_amount:500, er_amount:250, note:'lock' }, { id:2, employee_id:1, period:'2026-11', emp_amount:500, er_amount:250, note:'lock' }];
    T.pvd_payouts = [];
    await E(`depRefresh()`); await E(`pvdRefresh()`);
    const snap = (v, ps) => E(`JSON.stringify(${JSON.stringify(ps)}.map(p=>{const x=calcPay(${v},p); return [x.pvd.ded, x.net];}))`);
    const P3 = ['2026-12','2027-01','2027-02'];
    const s0 = snap('a', P3), bal0 = E(`V(a,'2027-02').balance`);
    ok(s0 === JSON.stringify([[0,12000],[0,12000],[0,12000]]) && bal0 === 1500, `ก่อนหักต่อ: ธ.ค.–ก.พ. หยุดหัก (หัก 0 · สุทธิ 12,000) · คงเหลือ 1,500 (ได้ ${s0} · ${bal0})`);
    E(`go('pvd')`); io.confirms.length = 0;
    await E(`pvdResume({dataset:{m:'1'}})`); await wait(20);
    ok(snap('a', P3) === s0 && E(`V(a,'2027-02').balance`) === 1500, 'กด "หักต่อ" 10 มี.ค. 70 → ธ.ค./ม.ค./ก.พ. ที่จ่ายแล้ว สุทธิยัง 12,000 · คงเหลือยัง 1,500 (ไม่หักย้อนหลัง)');
    ok(P3.every(p => T.pvd_entries.some(r=>r.employee_id===1 && r.period===p && r.note==='lock' && r.emp_amount===0 && r.er_amount===0)) && T.pvd_members.find(m=>m.id===1).stop_period==='',
       'ล็อก 0/0 ธ.ค./ม.ค./ก.พ. ก่อน แล้วค่อยล้างงวดหยุด (stop_period = "")');
    ok(io.confirms.some(m=>/ธ\.ค\. 69 0 \(ไม่ได้หัก\)/.test(m)), 'ข้อความยืนยันบอก "ธ.ค. 69 0 (ไม่ได้หัก)"');
    ok(E(`V(a,'2027-03').ded`) === 500 && E(`V(a,'2027-03').balance`) === 1500 + 750, 'มี.ค. 70 (ยังไม่จ่าย) หักต่อ 500 + ร้าน 250 → คงเหลือ 2,250');
    // เลื่อนงวดเริ่มย้อนไปงวดที่จ่ายแล้ว → บล็อก · ตัวเลือกในตารางไม่มีงวดที่จ่ายแล้ว
    const sb = snap('b', P3); const nE = T.pvd_entries.length;
    await E(`updPvdField(2,'start_period','2026-12')`);
    ok(T.pvd_members.find(m=>m.id===2).start_period==='2027-03' && snap('b', P3)===sb && T.pvd_entries.length===nE, 'เลื่อนงวดเริ่มของบี 2027-03 → 2026-12 (จ่ายแล้ว) = บล็อก · สุทธิ ธ.ค.–ก.พ. เท่าเดิม');
    E(`renderPvd()`);
    const opt = [...A.d.querySelectorAll('#pvdTable select[data-f="start_period"][data-m="2"] option')].map(o=>o.value);
    ok(opt.length && opt.every(p=>p>='2027-03'), 'ช่อง "เริ่มงวด" ในตารางมีแต่งวดที่ยังไม่ถึงวันจ่าย ('+opt.join(',')+')');
    // เพิ่มสมาชิก: ตัวเลือกงวดเริ่มไม่มีงวดที่จ่ายแล้ว · บังคับงวดเก่า = บล็อก
    E(`var c=emp({id:3,code:'C',nick:'ซี',deposit_on:false}); employees.push(c); shifts.C=mk('2026-07-26','2027-03-09');`);
    const sc = snap('c', ['2026-12','2027-01','2027-02']);
    E(`openPvdForm(); pvdEmpPick=3; fillPvdEmp('');`);
    const fo = [...A.d.querySelectorAll('#pvdStart option')].map(o=>o.value);
    ok(fo.length && fo.every(p=>p>='2027-03'), 'หน้าต่างเพิ่มสมาชิก: ตัวเลือกงวดเริ่มเฉพาะงวดที่ยังไม่จ่าย ('+fo.join(',')+')');
    E(`(s=>{ s.innerHTML+='<option value="2026-12">x</option>'; s.value='2026-12'; })(document.getElementById('pvdStart')); document.getElementById('pvdEmpVal').value='1000'; document.getElementById('pvdConsent').checked=true;`);
    await E(`savePvdMember()`);
    ok(!T.pvd_members.some(m=>m.employee_id===3) && snap('c', ['2026-12','2027-01','2027-02'])===sc, 'บังคับงวดเริ่ม ธ.ค. 69 (จ่ายแล้ว) → ไม่บันทึก · สุทธิงวดเก่าเท่าเดิม');
    E(`document.getElementById('pvdStart').value='2027-03'`); await E(`savePvdMember()`);
    ok(T.pvd_members.some(m=>m.employee_id===3 && m.start_period==='2027-03') && E(`V(c,'2027-03').ded`)===1000, 'เริ่ม มี.ค. 70 → บันทึกได้ · หัก 1,000');
    // เปลี่ยนวิธีหัก คงที่ 500 → % : ถามค่าใหม่ บันทึกพร้อมกัน (ไม่กลายเป็น 500%)
    io.promptAns = ['5']; A.db.log.length = 0;
    await E(`updPvdField(1,'emp_mode','pct')`);
    const m1 = T.pvd_members.find(m=>m.id===1);
    ok(m1.emp_mode==='pct' && m1.emp_value===5 && A.db.log.filter(l=>l.table==='pvd_members' && l.op==='update').length===1, 'เปลี่ยน คงที่ 500 → % : ถาม % ใหม่ (5) แล้วบันทึก emp_mode + emp_value ในคำสั่งเดียว');
    io.promptAns = [null]; await E(`updPvdField(1,'emp_mode','fixed')`);
    ok(T.pvd_members.find(m=>m.id===1).emp_mode==='pct', 'กดยกเลิกตอนถามค่า → ไม่เปลี่ยนวิธีหัก');
    io.promptAns = ['150']; await E(`updPvdField(1,'er_mode','pct')`);
    ok(T.pvd_members.find(m=>m.id===1).er_mode==='match', 'ร้านสมทบ % ของค่าแรง ใส่ 150 → บล็อก (เกิน 100)');
  }

  // ============ 17) ถอน: เกินคงเหลือเมื่อมีถอนงวดหลัง · กดซ้ำ · ลบรายการในสลิปที่จ่ายแล้ว · ลบสมาชิกจากเครื่องที่ข้อมูลค้าง ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, T, io } = A; await wait(300);
    console.log('[17 ถอนย้อนงวด · กดบันทึกซ้ำ · ลบจ่ายคืนในสลิป · ลบสมาชิก (ข้อมูลค้าง)]');
    E(SEED); E(PSEED); E(`var a=emp({id:1,code:'A',nick:'เอ',deposit_on:false}); employees=[a]; shifts={A:mk('2026-07-26','2026-10-19')};`);
    T.pvd_members = [{ id:1, employee_id:1, emp_mode:'fixed', emp_value:500, er_mode:'none', er_value:0, start_period:'2026-09', stop_period:'2026-10', opening_emp:500, opening_er:0, consent:true, note:'' }];
    T.pvd_entries = [{ id:1, employee_id:1, period:'2026-09', emp_amount:500, er_amount:0, note:'lock' }]; T.pvd_payouts = [];
    await E(`pvdRefresh()`);
    ok(E(`V(a,'2026-11').balance`)===1000, 'คงเหลือ 1,000 (ยกมา 500 + ก.ย. 500 · หยุดหักตั้งแต่ ต.ค.)');
    const out = async (amt, period, via) => { E(`openPvdOut(); pvdOutPick=1; fillPvdOutEmp(''); document.getElementById('pvdOutDate').value='2026-10-20'; pvdOutDateChg();
        (s=>{ if(![...s.options].some(o=>o.value==='${period}')) s.innerHTML+='<option value="${period}">${period}</option>'; s.value='${period}'; })(document.getElementById('pvdOutPeriod'));
        document.getElementById('pvdOutAmt').value='${amt}'; document.getElementById('pvdOutVia').value='${via||'cash'}';`); return E(`savePvdPayout()`); };
    await out(1000, '2026-11');
    ok(T.pvd_payouts.length===1, 'ถอนเงินสด 1,000 งวด พ.ย. → บันทึกได้');
    await out(500, '2026-10');
    ok(T.pvd_payouts.length===1 && E(`V(a,'2026-12').balance`)===0, 'แล้วบันทึกถอน 500 งวด ต.ค. (ย้อนงวด) → บล็อก (คงเหลือ ต.ค. 1,000 − ถอนงวดหลัง 1,000 = 0) · คงเหลือไม่ติดลบ');
    T.pvd_payouts = []; await E(`pvdRefresh()`);
    E(`openPvdOut(); pvdOutPick=1; fillPvdOutEmp(''); document.getElementById('pvdOutPeriod').value='2026-10'; document.getElementById('pvdOutAmt').value='800'; document.getElementById('pvdOutVia').value='cash';`);
    await E(`Promise.all([savePvdPayout(), savePvdPayout()])`);
    ok(T.pvd_payouts.length===1, 'กดบันทึกถอน 2 ครั้งติดกัน → ได้แถวเดียว');
    // จ่ายคืนในสลิปงวดที่เลยกำหนดสร้างไฟล์ (ไม่มีแถว 🔒 เพราะหยุดหัก) → ลบไม่ได้
    T.pvd_payouts.push({ id:9001, employee_id:1, pay_date:'2026-10-01', period:'2026-09', amount:100, via:'slip', note:'' }); await E(`pvdRefresh()`);
    await E(`delPvdPayout({dataset:{id:'9001'}})`);
    ok(T.pvd_payouts.some(r=>r.id===9001), 'ลบรายการจ่ายคืนในสลิปงวด ก.ย. (จ่ายแล้ว 5 ต.ค.) → บล็อก');
    // ลบสมาชิก: ในเครื่องไม่มีแถว แต่ DB มีแถวรายงวดแล้ว → อ่านใหม่แล้วไม่ลบ
    E(`pvdEntries=[]; pvdPayouts=[]; pvdMembers.forEach(m=>{m.openEmp=0;}); go('pvd');`);
    A.db.log.length = 0;
    await E(`delPvdMember({dataset:{m:'1'}})`);
    ok(!A.db.log.some(l=>l.table==='pvd_members' && l.op==='delete') && T.pvd_members.length===1, 'ลบสมาชิกจากเครื่องที่ข้อมูลค้าง (DB มีแถวแล้ว) → อ่านใหม่แล้วไม่ลบ');
    // ประวัติ: ลบด้วย id จดคน/งวด · upsert ที่ข้ามแถวซ้ำ = ไม่จด
    E(`auditReady=true;`); T.payroll_audit = [];
    await E(`pvdLockWrite([{e:a,p:'2026-09',ded:9,er:9,row:null}])`); await wait(10);
    ok(!T.payroll_audit.length, 'ล็อกงวดที่มีแถว 🔒 อยู่แล้ว (ignoreDuplicates ข้าม) → ไม่จดประวัติ');
    T.pvd_entries.push({ id:9100, employee_id:1, period:'2026-11', emp_amount:1, er_amount:null, note:'' }); await E(`pvdRefresh()`);
    io.promptAns = ['', '']; E(`go('pvd')`); await E(`editPvd(1,'2026-11')`); await wait(10);
    const au = T.payroll_audit.find(r=>r.tbl==='pvd_entries' && r.action==='delete');
    ok(au && /"employee_id":1/.test(au.detail) && /"period":"2026-11"/.test(au.detail), 'ลบแถว ✎ → ประวัติจดแถวที่ลบ (employee_id + period) ไล่รายคนได้');
    // บัญชีที่ไม่ได้ติ๊กหน้า 🐷 → แก้สำรองฯ รายงวดไม่ได้ (เห็นยอดได้)
    T.pvd_members[0].stop_period = ''; await E(`pvdRefresh()`);
    const dHtml = () => { E(`detailEmpId=1; detailTab='money'; refreshPeriodSelectors(); document.getElementById('detailPeriodSel').value='2026-10'; go('detail'); renderDetail(true);`); let h = A.d.getElementById('detailContent').innerHTML;
      E(`setDetailTab('debt')`); return h + A.d.getElementById('detailContent').innerHTML; };
    ok(/editPvd\(1/.test(dHtml()), 'เจ้าของ: หน้ารายคนมีปุ่ม ✎ สำรองฯ (งวด ต.ค. หัก 500)');
    E(`AUTH={username:'m',role:'manager',apps:{payroll:{detail:'vae',payroll:'vae'}}}; applyUser(AUTH);`);
    const h2 = dHtml();
    A.db.log.length = 0; await E(`editPvd(1,'2026-10')`);
    ok(!A.db.log.length && !/editPvd/.test(h2) && /เงินสำรองเลี้ยงชีพ/.test(h2), 'บัญชีไม่มีสิทธิ์ 🐷 → เห็นยอดสำรองฯ แต่ไม่มีปุ่ม ✎ · editPvd ไม่เขียน');
  }

  // ============ 18) โหลดตาราง: HEAD ไม่มี body แบบ postgrest-js จริง ============
  { const A = boot({ now:'2026-10-20T12:00:00+07:00' }); const { E, T } = A; await wait(300);
    console.log('[18 ยังไม่รัน SQL (HEAD 404 ไม่มี body) · ไม่มีสิทธิ์ (401) · ไม่ได้ count = fail closed]');
    E(SEED); E(`var x=emp({id:1,code:'X',nick:'x',deposit_on:false}); employees=[x]; shifts={X:mk('2026-09-26','2026-10-19')}; refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-10';`);
    for(const t of ['pvd_members','pvd_entries','pvd_payouts']) A.db.fail[t] = { code:'PGRST205', message:"Could not find the table 'public."+t+"' in the schema cache" };
    await E(`pvdLoad()`);
    ok(E(`pvdReady`)===false && E(`pvdLoadErr`)==='', 'HEAD ของตารางที่ยังไม่มี = {error:null,count:null} → ยิง GET เห็น PGRST205 → pvdReady=false (ไม่ถือว่าตารางว่าง)');
    E(`go('payroll'); renderPayroll(); pvdRealtime();`);
    ok(!/สำรองฯ/.test(A.d.getElementById('payTable').textContent) && !A.db.chans['jjmk-pvd'], 'ก่อนรัน jj_provident.sql: ตารางสรุปไม่มีคอลัมน์ "สำรองฯ" · ไม่เปิดช่อง jjmk-pvd');
    E(`go('pvd')`); ok(/ต้องรัน jj_provident\.sql/.test(A.d.getElementById('pvdInfo').textContent), 'หน้า 🐷 บอกให้รัน jj_provident.sql');
    for(const t of ['pvd_members','pvd_entries','pvd_payouts']) A.db.fail[t] = { code:'42501', message:'permission denied for table '+t };
    await E(`pvdLoad()`);
    ok(/ไม่มีสิทธิ์อ่าน pvd_/.test(E(`pvdLoadErr`)) && !/object Object/.test(E(`pvdLoadErr`)), 'ไม่มีสิทธิ์ (HEAD 401 ไม่มี body) → "ไม่มีสิทธิ์อ่าน pvd_… — รัน GRANT" (ไม่ใช่ [object Object])');
    for(const t of ['pvd_members','pvd_entries','pvd_payouts']) delete A.db.fail[t];
    T.pvd_members = []; T.pvd_entries = []; T.pvd_payouts = []; await E(`pvdLoad()`);
    ok(E(`pvdReady`)===true && E(`pvdLoadErr`)==='', 'ตารางมีแล้ว (ว่าง) → pvdReady=true');
    A.db.countLie.pvd_entries = null; await E(`pvdLoad()`);
    ok(/ไม่ได้รับจำนวนแถว/.test(E(`pvdLoadErr`)), 'HEAD ไม่ได้ count แต่ GET ปกติ → โหลดไม่ครบ (fail closed — ห้ามถือว่าว่าง)');
    delete A.db.countLie.pvd_entries;
    A.db.fail.deposit_entries = { code:'PGRST205', message:"Could not find the table 'public.deposit_entries'" };
    await E(`depRefresh()`);
    ok(E(`depReady`)===false && E(`depLoadErr`)==='', 'deposit_entries ยังไม่มี (HEAD 404) → depReady=false');
  }

  // ============ 19) แบบ % งวดที่ไม่มีวันทำงาน (มีแต่วันหยุดราชการ) = 0 ทุกที่ · ล็อกสำรองฯ ใช้สิทธิ์ 🐷 · ประวัติ pvd_members มี employee_id ============
  { const A = boot({ now:'2026-12-20T12:00:00+07:00' }); const { E, io, T } = A; await wait(300);
    console.log('[19 % ไม่มีสแกนทั้งงวด (ออฟฟิศ 18,000 + วันหยุด 23 ต.ค.) = ไม่หัก · สลิป=ยอดสะสม=ประวัติ=🔒 · สิทธิ์ 🐷 · audit]');
    E(SEED); E(PSEED); E(`
      var o=emp({id:1,code:'O',nick:'ออฟ',branch:'OFFICE',rate:18000,holiday_pay:false,deposit_on:false});
      employees=[o]; shifts={O:mk('2026-07-26','2026-09-30').concat(mk('2026-11-01','2026-12-20'))};
      holidays={'2026-10-23':{day:'2026-10-23',name:'ปิยมหาราช',mult:2,id:1,scope:'all'}};
      pvdMembers=[M({employee_id:1,emp_mode:'pct',emp_value:5,er_mode:'match',er_value:100,start_period:'2026-10'})];`);
    const P = p => JSON.parse(E(`(x=>JSON.stringify({days:x.days,base:x.base,net:x.net,ded:x.pvd.ded,er:x.pvd.er,bal:x.pvd.balance,emp:x.pvd.empSum,erS:x.pvd.erSum}))(calcPay(o,'${p}'))`));
    let r = P('2026-10');
    ok(r.days===1 && r.base===18000 && r.ded===0 && r.er===0 && r.net===18000 && r.bal===0, `ต.ค. ไม่มีสแกน (มีแต่วันหยุด → days 1 · ฐาน 18,000) · 5% + ร้าน match 100 → หัก 0 · ร้าน 0 · สุทธิ 18,000 · สะสม 0 (ตาราง D.7 แถว 6 · ได้ ${JSON.stringify(r)})`);
    r = P('2026-11');
    ok(r.ded===900 && r.er===900 && r.net===17100 && r.bal===1800 && r.emp===900 && r.erS===900, `พ.ย. หัก 900 · ร้าน 900 · สุทธิ 17,100 · สะสม 1,800 (= พ.ย. เท่านั้น · ได้ ${JSON.stringify(r)})`);
    r = P('2026-12');
    ok(r.ded===900 && r.bal===3600, `ธ.ค. สะสม 3,600 = 900+900 (พ.ย.) + 900+900 (ธ.ค.) — ยอดที่หักในสลิปทุกงวดอยู่ในยอดสะสม (ได้ ${JSON.stringify(r)})`);
    const hist = txt(E, `dtPvdHistory(o,'2026-12')`);
    ok(/งวด ธ\.ค\. 69|ธ\.ค\./.test(hist) && /พ\.ย\./.test(hist) && !/ต\.ค\. 69.*900/.test(hist), 'ประวัติ 🐷 รายคน: มี พ.ย./ธ.ค. · ต.ค. ไม่มียอด 900 (สลิป ต.ค. ก็ไม่ได้หัก)');
    ok(E(`JSON.stringify(pvdLockDue(o).map(x=>[x.p,x.ded,x.er]))`)==='[["2026-11",900,900]]', '🔒 งวดที่ต้องปิดยอด = พ.ย. 900/900 เท่านั้น (ต.ค. หัก 0 ไม่มีอะไรต้องล็อก — ชุดงวดเดียวกับสลิป/ยอดสะสม)');
    // ✎ ใส่ยอดเองในงวดที่ไม่มีวันทำงาน = นับ (แถวอยู่ในชุดงวด) · สลิป = ยอดสะสม
    E(`pvdEntries=[fromDbPvdE({id:9,employee_id:1,period:'2026-10',emp_amount:300,er_amount:null,note:''})]; pvdMemo={};`);
    r = P('2026-10'); const r12 = P('2026-12');
    ok(r.ded===300 && r.er===300 && r12.bal===4200, `✎ ต.ค. 300 (ไม่มีสแกน) → หัก 300 · ร้าน 300 · สะสม ธ.ค. 4,200 = 600 + 3,600 (ได้ ${JSON.stringify(r)} / ${r12.bal})`);
    E(`pvdEntries=[]; pvdMemo={};`);

    // สิทธิ์: ผู้จัดการมีสิทธิ์ 🛡️ แต่ไม่ได้ติ๊ก 🐷 แก้เงินประกัน → ไม่เขียนแถว 🔒 สำรองฯ (บอกในข้อความ) · ไม่มีสิทธิ์หน้าเลย → ไม่ถาม confirm ก่อน
    E(`depReady=true; depositEntries=[]; settings.depStart='2026-08'; o.depOn=true; o.depTarget=3000; o.depMonthly=300; o.depTargetV1=5000; o.depMonthlyV1=500;`);
    T.deposit_entries = []; T.pvd_members = [{id:1,employee_id:1,emp_mode:'pct',emp_value:5,er_mode:'match',er_value:100,start_period:'2026-10',stop_period:'',opening_emp:0,opening_er:0,consent:true,note:''}]; T.pvd_entries = []; T.pvd_payouts = [];
    E(`AUTH={username:'m',role:'staff',apps:{payroll:{dep:'vae',emp:'v'}}}; applyUser(AUTH); go('dep');`);
    io.confirms.length = 0; A.db.log.length = 0;
    await E(`updDepField(1,'deposit_monthly',250)`);
    const cf = io.confirms.join('\n');
    ok(A.db.log.some(l=>l.table==='deposit_entries' && l.op==='upsert') && !A.db.log.some(l=>l.table==='pvd_entries') && /ไม่มีสิทธิ์หน้า 🐷/.test(cf),
       'ผู้จัดการ (🛡️ ได้ · 🐷 ไม่ได้ติ๊ก) แก้หัก/เดือน → ล็อกเงินประกันงวดที่จ่ายแล้ว · ไม่เขียนแถว 🔒 สำรองฯ · ข้อความบอก "บัญชีนี้ไม่มีสิทธิ์หน้า 🐷"');
    E(`AUTH={username:'v',role:'staff',apps:{payroll:{dep:'v'}}}; applyUser(AUTH); go('dep');`);
    E(`depositEntries=[]; o.depMonthly=300;`); T.deposit_entries = [];
    io.confirms.length = 0; A.db.log.length = 0;
    await E(`updDepField(1,'deposit_monthly',250)`);
    ok(!io.confirms.length && !A.db.log.some(l=>l.op!=='select'), 'คนที่ดู 🛡️ ได้อย่างเดียว → ไม่ขึ้น confirm "จะปิดยอด…" ก่อนโดนแจ้งไม่มีสิทธิ์ · ไม่เขียนอะไร');

    // audit: แก้วิธีหัก → payroll_audit จดแถวพร้อม employee_id (ก้อน 9 ไล่รายคนได้)
    E(`AUTH={username:'o',role:'owner',display_name:'o'}; applyUser(AUTH); auditReady=true; go('pvd');`);
    T.payroll_audit = [];
    await E(`pvdRefresh()`);
    await E(`updPvdField(1,'note','เซ็นแล้ว')`); await wait(20);
    const au = (T.payroll_audit||[]).find(x=>x.tbl==='pvd_members' && x.action==='update');
    ok(au && /"employee_id":1/.test(au.detail) && /set:/.test(au.detail), 'แก้สมาชิกสำรองฯ → ประวัติ (payroll_audit) จด rows:[{… "employee_id":1 …}] set:{…} (เดิมจดแค่ where id=…)');
    const n0 = A.db.log.length;
    T.pvd_members[0].employee_id = 2;   // แถวกลายเป็นของคนอื่น (เลขแถวเดียวกัน) → ไม่แก้
    await E(`updPvdField(1,'note','x')`);
    ok(T.pvd_members[0].note !== 'x', 'update ต่อ .eq("employee_id") → แถวเลขเดียวกันแต่เป็นของคนอื่น ไม่ถูกแก้');
  }
  // ============ 20) ผลตรวจรอบสุดท้าย L4: แก้สมาชิกสำรองฯ ไม่เขียนแถว 🔒 เงินประกัน (สิทธิ์หน้า 🐷 ≠ หน้า 🛡️) · ลบสมาชิกแล้วลบแถว 🔒 0/0 ของคนนั้น ============
  { const A = boot({ now:'2027-03-10T12:00:00+07:00' }); const { E, T, io } = A; await wait(300);
    console.log('[20 แก้สมาชิกสำรองฯ ไม่แตะเงินประกัน · ลบสมาชิก = ลบแถว 🔒 0/0 ด้วย]');
    E(SEED); E(PSEED); E(`AUTH={username:'p',role:'staff',apps:{payroll:{pvd:'vaed'}}}; applyUser(AUTH);
      var a=emp({id:1,code:'A',nick:'เอ',deposit_target_v1:5000,deposit_monthly_v1:500});
      var b=emp({id:2,code:'B',nick:'บี',deposit_target_v1:5000,deposit_monthly_v1:500});
      employees=[a,b]; shifts={A:mk('2026-09-26','2027-03-09'),B:[]}; depositEntries=[]; go('pvd');`);
    T.deposit_entries = [];
    T.pvd_members = [{ id:1, employee_id:1, emp_mode:'fixed', emp_value:500, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'2026-12', opening_emp:0, opening_er:0, consent:true, note:'' },
                     { id:2, employee_id:2, emp_mode:'fixed', emp_value:300, er_mode:'none', er_value:0, start_period:'2026-10', stop_period:'', opening_emp:0, opening_er:0, consent:true, note:'' }];
    T.pvd_entries = [{ id:1, employee_id:1, period:'2026-10', emp_amount:500, er_amount:0, note:'lock' }, { id:2, employee_id:1, period:'2026-11', emp_amount:500, er_amount:0, note:'lock' },
                     { id:3, employee_id:2, period:'2026-12', emp_amount:0, er_amount:0, note:'lock' }, { id:4, employee_id:2, period:'2027-01', emp_amount:0, er_amount:0, note:'lock' }];
    T.pvd_payouts = [];
    await E(`depRefresh()`); await E(`pvdRefresh()`);
    ok(E(`depLockDue(a,{}).length`) > 0, '(เอ มีงวดเงินประกันที่จ่ายแล้วยังไม่ปิดยอด)');
    io.confirms.length = 0; A.db.log.length = 0;
    await E(`pvdResume({dataset:{m:'1'}})`); await wait(20);
    ok(!A.db.log.some(l=>l.table==='deposit_entries') && !T.deposit_entries.length, 'หักต่อสำรองฯ (บัญชีสิทธิ์หน้า 🐷 อย่างเดียว) → ไม่เขียนแถว 🔒 เงินประกัน');
    ok(['2026-12','2027-01','2027-02'].every(p=>T.pvd_entries.some(r=>r.employee_id===1 && r.period===p && r.note==='lock' && r.emp_amount===0)) && T.pvd_members.find(m=>m.id===1).stop_period==='',
       '…แต่ยังล็อกสำรองฯ 0/0 ธ.ค.–ก.พ. ก่อนหักต่อ (กันหักย้อนหลัง) แล้วบันทึก');
    ok(!io.confirms.some(m=>/🛡️ เงินประกัน/.test(m)), 'ข้อความยืนยันไม่มีส่วนเงินประกัน');
    // ลบสมาชิกบี (มีแค่แถว 🔒 0/0) → ลบสมาชิก + ลบแถว 0/0 ของบี · แถวของเอไม่แตะ
    const nA = T.pvd_entries.filter(r=>r.employee_id===1).length;
    await E(`delPvdMember({dataset:{m:'2'}})`); await wait(20);
    ok(!T.pvd_members.some(m=>m.id===2) && !T.pvd_entries.some(r=>r.employee_id===2) && T.pvd_entries.filter(r=>r.employee_id===1).length===nA && E(`pvdEntries.some(x=>x.empId===2)`)===false,
       'ลบสมาชิกบี (มีแค่ 🔒 0/0) → ลบสมาชิก + แถว 🔒 0/0 ของบี · แถวของเอยังอยู่ครบ');
  }
  }catch(e){ console.log('CRASH', e.stack); fail++; }
  console.log(fail ? fail+' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
