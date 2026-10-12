// smoke126 (ฟิกซ์เจอร์ชุด smoke123): รอบแก้หลังรีวิว — Fix cost/นอกเหนือที่ยังไม่ลงวันจ่าย · ไฟล์ Beam ไม่ครบบัญชี · PAYOUT เฉพาะช่วงไฟล์
//   · ฝากเงินสดต้องระบุสาขา · ยอดตั้งต้นต้องครบ · โหลดไม่สำเร็จ ≠ ไม่มีตาราง · ค่าที่พิมพ์ค้างไม่หายเมื่อหน้าโหลดใหม่ · เริ่มนับกลางเดือน
// (ต้นฉบับ smoke123: แท็บ "ตรวจสอบเงินในบัญชี" (bank) — ยอดที่ควรมี vs ยอดจากแอพธนาคาร + rename recon → ตรวจสอบยอดโอน
// fixture 2 สาขา เดือน ส.ค. 2569 · ยอดตั้งต้น ณ 31 ก.ค.: A1 300,000 · A2 62,000
// 3 ส.ค. (จันทร์): POS รวม 107,000 (JJRD 70,000 + JJLP 37,000) · โอน QR 48,000 (30,000+18,000) · สำรอง 0 · จ่ายสด 2,000 (ดิฟ 500 + น้ำแข็ง 1,500)
//   → fee 48,000×0.003745 = 179.76 · net 47,820.24 · A1 รับ 40,000 → 39,850.20 · A2 รับ 8,000 → 7,970.04 · เข้าธนาคาร อ 4 ส.ค.
//   เงินสด = 107,000−48,000 = 59,000 · ยอดขายจริงหลังจ่ายสด = 107,000−179.76−2,000 = 104,820.24
// 4 ส.ค.: จ่ายซัพ FarmFresh 25,000 จาก A1 (paid_d 4 ส.ค.) → ควรมี A1 = 300,000+39,850.20−25,000 = 314,850.20 · A2 = 62,000+7,970.04 = 69,970.04
// 7 ส.ค. (ศุกร์): JJRD POS 50,000 โอน 20,000 → net 19,925.10 เข้า จ 10 ส.ค. → A1 10 ส.ค. = 334,775.30
// รวมเดือน: POS 157,000 · fee 254.66 · หลังจ่ายสด 154,745.34
// ปิดกะ: JJLP กะเย็น 3 ส.ค. เงินฝากเกิน 50 → "เกิน ฿50.00" · JJRD ลงตัวหมด
// snap 4 ส.ค.: A1 กรอก 314,900.20 → +50.00 มากกว่าที่ควร · A2 69,970.04 → ตรง · POST มี expected/diff
// เคส Beam: ไฟล์ gross/fee/net ต่างจากสูตร (fee 150/30/75) → ต้องใช้ค่าไฟล์ · PAYOUT 4 ส.ค. −39,800 แทนค่าประมาณ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const Z={sales_pos_am:0,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0};
const INC=[
  // JJRD 3 ส.ค.: เช้า POS 40,000 = ฝาก 15,000 + เก๊ะ 4,500 + โอน 20,000 + จ่ายสด 500 · เย็น POS 30,000 = ฝาก 18,000 + เก๊ะ 5,000 + โอน 10,000 + จ่ายสด 1,500 − เก๊ะเปิด 4,500
  {...Z,branch:'JJRD',d:'2026-08-03',sales_pos_am:40000,sales_pos_pm:30000,deposit_am:15000,deposit_pm:18000,cash_drawer_am:4500,cash_drawer_pm:5000,transfer_total_am:20000,transfer_total_pm:10000,drawer_open_pm:4500},
  // JJLP 3 ส.ค.: เช้า POS 20,000 = ฝาก 7,000 + เก๊ะ 3,000 + โอน 10,000 · เย็น POS 17,000 = ฝาก 9,050 (เกิน 50) + เก๊ะ 3,000 + โอน 8,000 − เก๊ะเปิด 3,000
  {...Z,branch:'JJLP',d:'2026-08-03',sales_pos_am:20000,sales_pos_pm:17000,deposit_am:7000,deposit_pm:9050,cash_drawer_am:3000,cash_drawer_pm:3000,transfer_total_am:10000,transfer_total_pm:8000,drawer_open_pm:3000},
  // JJRD 7 ส.ค. (ศุกร์): เช้า POS 50,000 = ฝาก 24,000 + เก๊ะ 6,000 + โอน 20,000
  {...Z,branch:'JJRD',d:'2026-08-07',sales_pos_am:50000,deposit_am:24000,cash_drawer_am:6000,transfer_total_am:20000}];
const CASH=[{id:1,branch:'JJRD',d:'2026-08-03',shift:'เช้า',descr:'ค่าดิฟ',amount:500},{id:2,branch:'JJRD',d:'2026-08-03',shift:'เย็น',descr:'น้ำแข็ง',amount:1500}];
const EXP=[
  {branch:'JJRD',d:'2026-08-01',supplier_id:1,amount:25000,paid:true,paid_d:'2026-08-04',pay_src:'A1',slip_url:'https://x/slip.jpg',checked:true},
  {branch:'JJLP',d:'2026-08-05',supplier_id:2,amount:3000,paid:true,paid_d:null,pay_src:null,slip_url:'https://x/s2.jpg',checked:true}];
const ACCTS=[{acct:'A1',label:'บัญชี 1',beam_acct:'jingjaimookt',daily_cap:40000,sort:1,active:true},{acct:'A2',label:'บัญชี 2',beam_acct:'jingjai',daily_cap:null,sort:2,active:true}];
let SNAPS=[{acct:'A1',as_of:'2026-07-31',kind:'opening',balance:300000,note:''},{acct:'A2',as_of:'2026-07-31',kind:'opening',balance:62000,note:''}];
const BEAM=[{acct:'jingjaimookt',d:'2026-08-03',gross:40000,fee:150,net:39850,tx_count:10,pending_net:0,pending_count:0,complete:true},
            {acct:'jingjai',d:'2026-08-03',gross:8000,fee:30,net:7970,tx_count:2,pending_net:0,pending_count:0,complete:true},
            {acct:'jingjaimookt',d:'2026-08-07',gross:20000,fee:75,net:19925,tx_count:5,pending_net:0,pending_count:0,complete:true}];
const PAYOUT=[{acct:'jingjaimookt',ts:'2026-08-04T10:30:00',d:'2026-08-04',btype:'PAYOUT',gross:-39800,fee:0,net:-39800,bal:0}];
const MODE={beam:false,payout:false,beamPartial:false,payout10:false,noOpen:false,midOpen:false,accErr:0}; const posts=[];
const FIXN=[{branch:'JJRD',month:'2026-08',item_id:9,amount:50000,paid_d:null,pay_src:null}];
const EXTN=[{id:77,branch:'JJLP',d:'2026-08-06',descr:'ซ่อมแอร์',amount:3500,requester:'บอย',paid_d:null,pay_src:null}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      // ตารางใหม่ต้องมาก่อน pnl_beam · pnl_branches ก่อน branches
      if(url.includes('pnl_bank_accts')){ if(MODE.accErr)return {ok:false,status:MODE.accErr,text:async()=>'err '+MODE.accErr,json:async()=>({})}; return T(ACCTS); }
      if(url.includes('pnl_bank_snap')&&method==='GET'&&MODE.noOpen)return T([]);
      if(url.includes('pnl_bank_snap')&&method==='GET'&&MODE.midOpen)return T([{acct:'A1',as_of:'2026-08-05',kind:'opening',balance:300000,note:''},{acct:'A2',as_of:'2026-08-05',kind:'opening',balance:62000,note:''}]);
      if(url.includes('pnl_beam_daily')&&MODE.beamPartial)return T([{acct:'jingjaimookt',d:'2026-08-03',gross:40000,fee:150,net:39850,tx_count:10,pending_net:0,pending_count:0,complete:true}]);
      if(url.includes('pnl_beam_moves')&&MODE.payout10)return T(url.includes('btype=eq.PAYOUT')?[{acct:'jingjaimookt',ts:'2026-08-10T10:30:00',d:'2026-08-10',btype:'PAYOUT',gross:-19925,fee:0,net:-19925,bal:0}]:[]);
      if(url.includes('pnl_fixed_items'))return T([{id:9,name:'ค่าเช่าพื้นที่',grp:'รายเดือน',sort:1,default_amount:null}]);
      if(url.includes('pnl_fixed_monthly')){ if(method==='PATCH'){posts.push({t:'fixpatch',url,body:JSON.parse(opt.body)});return T([]);} return T(url.includes('paid_d=is.null')?FIXN:[]); }
      if(url.includes('pnl_extra_expenses')){ if(method==='PATCH'){posts.push({t:'expatch',url,body:JSON.parse(opt.body)});return T([]);} return T(url.includes('paid_d=is.null')?EXTN:[]); }
      if(url.includes('pnl_bank_snap')){
        if(method==='POST'){ const rows=JSON.parse(opt.body); posts.push({t:'snap',rows});
          rows.forEach(r=>{ SNAPS=SNAPS.filter(x=>!(x.acct===r.acct&&x.as_of===r.as_of&&x.kind===r.kind)); SNAPS.push(r); }); return T(rows); }
        return T(SNAPS);
      }
      if(url.includes('pnl_bank_moves')){ if(method==='POST'){posts.push({t:'move',rows:JSON.parse(opt.body)});return T([]);} return T([]); }
      if(url.includes('pnl_beam_daily'))return T(MODE.beam?BEAM:[]);
      if(url.includes('pnl_beam_moves'))return T(MODE.payout&&url.includes('btype=eq.PAYOUT')?PAYOUT:[]);
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา',sort:1},{code:'JJLP',name:'ลาดพร้าว',sort:2}]);
      if(url.includes('pnl_income_daily')){
        if(url.includes('d=lt.'))return T([]);
        if(url.includes('branch=eq.JJRD'))return T(INC.filter(r=>r.branch==='JJRD'));
        if(url.includes('branch=eq.JJLP'))return T(INC.filter(r=>r.branch==='JJLP'));
        return T(INC);
      }
      if(url.includes('pnl_cash_expenses')){
        if(url.includes('branch=eq.JJRD'))return T(CASH.filter(r=>r.branch==='JJRD'));
        if(url.includes('branch=eq.JJLP'))return T([]);
        return T(CASH);
      }
      if(url.includes('pnl_expense_daily')){
        if(method==='PATCH'){ posts.push({t:'patch',url,body:JSON.parse(opt.body)}); return T([]); }
        if(url.includes('paid_d=is.null'))return T(EXP.filter(r=>r.paid&&!r.paid_d));
        if(url.includes('paid_d=gte.'))return T(EXP.filter(r=>r.paid&&r.paid_d));
        if(url.includes('branch=eq.JJRD'))return T(EXP.filter(r=>r.branch==='JJRD'));
        if(url.includes('branch=eq.JJLP'))return T(EXP.filter(r=>r.branch==='JJLP'));
        return T(EXP);
      }
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const near=(a,b)=>Math.abs(Number(a)-Number(b))<0.005;
setTimeout(async()=>{
  const out=[];
  await sleep(450);
  // 1) Fix cost / นอกเหนือ ที่ยังไม่ลงวันจ่าย → บล็อกพับ + เลือกบัญชี + ลงวัน → PATCH
  await w.eval("show('bank')"); await sleep(500);
  const nod=d.querySelector('#view-bank details.bk-nod');
  out.push('บล็อก Fix cost ยังไม่ลงวันจ่าย 1 รายการ ฿50,000.00 (พับไว้): '+(!!nod&&!nod.open&&nod.textContent.includes('Fix cost เดือนนี้ที่ยังไม่ลงวันจ่าย 1 รายการ ฿50,000.00')&&nod.textContent.includes('ค่าเช่าพื้นที่')));
  const B0=w.eval('S.bank');
  out.push('รายจ่ายนอกเหนือไม่มีวันจ่าย (ซ่อมแอร์ 3,500 · 6 ส.ค.) นับตามวันที่ในสมการ: '+(B0.eqBy['2026-08-06'].other===3500&&d.getElementById('bkOutTbl').textContent.includes('ซ่อมแอร์')));
  // ค่าที่พิมพ์ค้าง ต้องไม่หายเมื่อหน้าโหลดใหม่หลังลงวัน
  d.getElementById('bkDate').value='2026-08-04'; w.bkDateChange(); d.getElementById('bkBal_A1').value='1234'; w.bkSnapPreview();
  d.getElementById('bkNoA_0').value='A2';
  const di=nod.querySelectorAll('input[type=date]')[0]; di.value='2026-08-05'; di.dispatchEvent(new w.Event('change')); await sleep(600);
  const fp=posts.find(p=>p.t==='fixpatch');
  out.push('ลงวัน Fix cost → PATCH pnl_fixed_monthly branch=eq.JJRD&month=eq.2026-08&item_id=eq.9 {paid_d 5 ส.ค., pay_src A2}: '+(!!fp&&fp.url.includes('branch=eq.JJRD&month=eq.2026-08&item_id=eq.9')&&fp.body.paid_d==='2026-08-05'&&fp.body.pay_src==='A2'));
  out.push('หลังหน้าโหลดใหม่ วันที่ดูยอด 4 ส.ค. + ยอดที่พิมพ์ค้าง 1,234 ยังอยู่: '+(d.getElementById('bkDate').value==='2026-08-04'&&d.getElementById('bkBal_A1').value==='1234'));
  // 2) ไฟล์ Beam มีแค่ jingjaimookt วัน 3 ส.ค. → A2 ได้ส่วนที่ขาด 8,000 ด้วยกฎเพดาน ≈ · ไม่ขึ้น ● แม่น
  MODE.beamPartial=true; await w.eval("show('bank')"); await sleep(500);
  let B=w.eval('S.bank'); let x3=B.days.find(z=>z.ds==='2026-08-03');
  out.push('Beam ไม่ครบบัญชี: A1 39,850 (ไฟล์) · A2 7,970.04 (ประมาณ) · approx · partialB 3 ส.ค. · ไม่ใช่โหมดแม่น: '+(x3.N.A1===39850&&near(x3.N.A2,7970.04)&&x3.approx===true&&B.partialB.includes('2026-08-03')&&B.mode.exact===false));
  out.push('ควรมี A2 4 ส.ค. = 69,970.04 (ไม่หายเป็น 62,000): '+near(B.bal.A2['2026-08-04'],69970.04));
  MODE.beamPartial=false;
  // 3) ไฟล์ Balances มีแค่ PAYOUT 10 ส.ค. → วันขาย 3 ส.ค. (เข้า 4 ส.ค. ก่อนช่วงไฟล์) ยังประมาณ ไม่หายเงียบ
  MODE.payout10=true; await w.eval("show('bank')"); await sleep(500);
  B=w.eval('S.bank');
  out.push('PAYOUT เฉพาะช่วงไฟล์: 4 ส.ค. ยังมี 39,850.20 (ประมาณ) · 10 ส.ค. 19,925 (จริง): '+(near(B.QRin.A1['2026-08-04'],39850.20)&&near(B.QRin.A1['2026-08-10'],19925)&&B.firstPayout.A1==='2026-08-10'));
  out.push('ควรมี A1 4 ส.ค. ยัง 314,850.20: '+near(B.bal.A1['2026-08-04'],314850.20));
  MODE.payout10=false;
  // 4) ฝากเงินสด 2 สาขา ไม่เลือกสาขา → ไม่บันทึก
  await w.eval("show('bank')"); await sleep(400);
  w.bkMoveModal(); await sleep(50);
  d.getElementById('bkMvK').value='cash_deposit'; w.bkMoveKind(); d.getElementById('bkMvV').value='5000';
  const nMv=posts.filter(p=>p.t==='move').length; await w.bkMoveSave(); await sleep(200);
  out.push('ฝากเงินสดไม่เลือกสาขา → ไม่ POST + เตือน: '+(posts.filter(p=>p.t==='move').length===nMv&&d.getElementById('toast').textContent.includes('เลือกสาขาที่นำเงินสดไปฝาก')));
  d.getElementById('bkMvBr').value='JJRD'; await w.bkMoveSave(); await sleep(300);
  const mv=posts.filter(p=>p.t==='move').pop();
  out.push('เลือกสาขาแล้ว → POST cash_deposit +5,000 branch JJRD: '+(!!mv&&mv.rows[0].kind==='cash_deposit'&&mv.rows[0].amount===5000&&mv.rows[0].branch==='JJRD'));
  // 5) ไม่ต้องตั้งยอดตั้งต้น (ปิดบัญชีทุกสิ้นเดือน) → ไม่มี opening ก็ขึ้นสมการเลย
  MODE.noOpen=true; await w.eval("show('bank')"); await sleep(400);
  out.push('ไม่มียอดตั้งต้นในฐาน → สมการขึ้นเลย เริ่มที่ 0: '+(!!d.getElementById('bkEq')&&w.eval('S.bank.open0')===0&&!d.getElementById('bkOpenForm')));
  MODE.noOpen=false;
  // 6) มียอดตั้งต้นเก่าค้างในฐาน (5 ส.ค.) → ไม่ใช้ · นับทั้งเดือนจากวันที่ 1 ที่ 0
  MODE.midOpen=true; await w.eval("show('bank')"); await sleep(400);
  out.push('ยอดตั้งต้นในฐานถูกข้าม · eqO 31 ก.ค. · open0 0 · มีแถววันที่ 1–5: '+(w.eval("S.bank.eqO")==='2026-07-31'&&w.eval('S.bank.open0')===0&&!!w.eval("S.bank.eqBy['2026-08-03']")));
  MODE.midOpen=false;
  // 7) โหลดไม่สำเร็จ (500) ≠ ยังไม่มีตาราง (404)
  MODE.accErr=500; await w.eval("show('bank')"); await sleep(400);
  let t=d.getElementById('view-bank').textContent;
  out.push('500 → โหลดข้อมูลไม่สำเร็จ + ปุ่มลองใหม่ (ไม่บอกให้รัน SQL): '+(t.includes('โหลดข้อมูลไม่สำเร็จ')&&!t.includes('ยังไม่ได้สร้างตาราง')));
  MODE.accErr=404; await w.eval("show('bank')"); await sleep(400);
  t=d.getElementById('view-bank').textContent;
  out.push('404 → ยังไม่ได้สร้างตาราง: '+t.includes('ยังไม่ได้สร้างตาราง'));
  MODE.accErr=0;
  // 8) เก๊ะเปิดเช้าวันที่ 1 = เงินเดือนที่แล้ว (เดือนนี้เริ่มที่ 0) — เรียก bkCalc ตรงด้วยข้อมูลสังเคราะห์ (รัชดาสาขาเดียว)
  //    1 ส.ค. (ส): เช้า เปิด 2,930 (ยกมา) ขาย 10,000 เงินสด → ปิด 12,930 · เย็น ขาย 20,000 (โอน 15,000) ฝาก 10,000 → ปิด 7,930 · ปิดกะลงตัวทั้ง 2 กะ
  //    → ขาย 30,000 − ฝาก 10,000 − เก๊ะค้าง 7,930 + เก๊ะเปิดวันที่ 1 2,930 − fee 56.175 − โอนยังไม่เข้า 14,943.825 = 0 · จ 3 ส.ค. โอนเข้า → 14,943.83
  const R=await w.eval(`(()=>{ const Z={sales_pos_am:0,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0};
    const row={...Z,branch:'JJRD',d:'2026-08-01',drawer_open_am:2930,sales_pos_am:10000,cash_drawer_am:12930,drawer_open_pm:12930,sales_pos_pm:20000,transfer_total_pm:15000,deposit_pm:10000,cash_drawer_pm:7930};
    const B=bkCalc({accts:BK_DEF_ACCTS.map(a=>({...a})),opening:{},actual:{},from:'2026-08-01',to:'2026-08-31',lo:'2026-08-01',lo0:'2026-07-29',mFrom:'2026-08-01',mTo:'2026-08-31',brs:['JJRD'],O:null,
      inc:[row],cash:[],beam:[],payout:[],moves:[],expPaid:[],expNoD:[],fixPaid:[],extraPaid:[],fixNoD:[],extraNoD:[],month:{JJRD:{inc:{'2026-08-01':row},cash:[],exp:{}}},cols:true});
    const e1=B.eqBy['2026-08-01'], e3=B.eqBy['2026-08-03'];
    return {drawNow:e1.drawNow,open1:e1.open1,gap:e1.drawGap,s1:e1.should,s3:e3.should,cashOpen1:B.cashBr[0].open1}; })()`);
  out.push('เก๊ะเปิดวันที่ 1 = 2,930 · เก๊ะค้าง 7,930 · ไม่มีส่วนต่างเก๊ะ: '+(R.open1===2930&&R.drawNow===7930&&Math.abs(R.gap)<0.005));
  out.push('สมการ 1 ส.ค. = 0.00 (เงินเดือนที่แล้วในเก๊ะไม่นับเป็นของเดือนนี้) · 3 ส.ค. = 14,943.83 (โอนเข้า): '+(near(R.s1,0)&&near(R.s3,14943.825)));
  out.push('การ์ดเงินสดในมือรู้เก๊ะเปิดวันที่ 1 = 2,930: '+(R.cashOpen1===2930));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
