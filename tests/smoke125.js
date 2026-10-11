// smoke125 (ใช้ฟิกซ์เจอร์ชุดเดียวกับ smoke123 + บัญชีสำรอง 1,200 ที่ JJRD กะเย็น 3 ส.ค.): บัญชีสำรอง = ยอดช่วยกระทบ (user 11 ต.ค.)
//   ถ้ายอดขาด แล้วบวกบัญชีสำรองสะสมแล้วตรง → ✓ ตรง (รวมบัญชีสำรอง) · ไม่บวกเข้ายอดที่ควรมี · เทียบรวมทุกบัญชีด้วย
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
  {...Z,branch:'JJRD',d:'2026-08-03',sales_pos_am:40000,sales_pos_pm:30000,deposit_am:15000,deposit_pm:16800,reserve_acct_pm:1200,cash_drawer_am:4500,cash_drawer_pm:5000,transfer_total_am:20000,transfer_total_pm:10000,drawer_open_pm:4500},
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
const MODE={beam:false,payout:false}; const posts=[];
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
      if(url.includes('pnl_bank_accts'))return T(ACCTS);
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
  await w.eval("show('bank')"); await sleep(500);
  const B=w.eval('S.bank'); const x3=B.days.find(z=>z.ds==='2026-08-03');
  out.push('Rcum A1/A2 4 ส.ค. = 1,200 · 2 ส.ค. = 0: '+(near(B.Rcum.A1['2026-08-04'],1200)&&near(B.Rcum.A2['2026-08-04'],1200)&&near(B.Rcum.A1['2026-08-02'],0)));
  out.push('ควรมีไม่เปลี่ยน (บัญชีสำรองไม่บวกเข้า): A1 314,850.20 · A2 69,970.04: '+(near(B.bal.A1['2026-08-04'],314850.20)&&near(B.bal.A2['2026-08-04'],69970.04)));
  out.push('3 ส.ค.: R 1,200 · เงินสด 57,800: '+(x3.R===1200&&x3.cash===57800));
  const daily=d.getElementById('bkDaily');
  out.push('คอลัมน์บัญชีสำรองโชว์ (13 คอลัมน์) หัว ยอดช่วยกระทบ: '+(daily.querySelectorAll('thead th').length===13&&daily.querySelector('thead').textContent.includes('ยอดช่วยกระทบ')));
  out.push('ปิดกะ 3 ส.ค. ยังเหลือแค่ ลาดพร้าว เกิน ฿50 (รัชดาลงตัว แม้ฝากลดเท่าบัญชีสำรอง): '+([...daily.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('3 จ')).textContent.includes('เกิน ฿50.00')));
  const set=(a1,a2)=>{ d.getElementById('bkDate').value='2026-08-04'; w.bkDateChange();
    d.getElementById('bkBal_A1').value=a1==null?'':String(a1); d.getElementById('bkBal_A2').value=a2==null?'':String(a2); w.bkSnapPreview();
    return [...d.querySelectorAll('#bkCmp .bk-cb')]; };
  let cb=set(313650.20,69970.04);
  out.push('A1 ขาด 1,200 = บัญชีสำรอง → ✓ ตรง (รวมบัญชีสำรอง ฿1,200.00) เขียว: '+(cb[0].textContent.includes('✓ ตรง (รวมบัญชีสำรอง ฿1,200.00)')&&cb[0].classList.contains('ok')));
  out.push('รวมทุกบัญชี: ✓ ตรง (รวมบัญชีสำรอง) · ผลต่าง −1,200.00 · บัญชีสำรองสะสม ฿1,200.00: '+(cb.length===3&&cb[2].classList.contains('bk-tot')&&cb[2].textContent.includes('✓ ตรง (รวมบัญชีสำรอง ฿1,200.00)')&&cb[2].textContent.includes('บัญชีสำรองสะสม ฿1,200.00')&&cb[2].textContent.includes('−1,200.00')));
  cb=set(314850.20-700,69970.04-500);
  out.push('แยกเข้า 2 บัญชี (ขาด 700 + 500): รายบัญชีขาด · รวมทุกบัญชี ✓ ตรง (รวมบัญชีสำรอง): '+(cb[0].textContent.includes('ขาด −700.00')&&cb[1].textContent.includes('ขาด −500.00')&&cb[2].textContent.includes('✓ ตรง (รวมบัญชีสำรอง ฿1,200.00)')));
  cb=set(314850.20-1200-39850.20,69970.04);
  out.push('ก่อนรอบเงินเข้า + บัญชีสำรอง → ✓ ตรง (ก่อนรอบเงินเข้า + บัญชีสำรอง): '+cb[0].textContent.includes('✓ ตรง (ก่อนรอบเงินเข้า + บัญชีสำรอง)'));
  cb=set(314850.20-2000,69970.04);
  out.push('ขาดมากกว่าบัญชีสำรอง → ขาด −2,000.00 (แดง): '+(cb[0].textContent.includes('ขาด −2,000.00')&&cb[0].classList.contains('short')));
  cb=set(314850.20+1200,69970.04);
  out.push('เกินเท่าบัญชีสำรอง → ยังเป็น มากกว่าที่ควร +1,200.00: '+cb[0].textContent.includes('มากกว่าที่ควร +1,200.00'));
  cb=set(314850.20,null);
  out.push('กรอกบัญชีเดียว → ไม่มีบรรทัดรวม: '+(cb.length===2));
  set(313650.20,69970.04); await w.bkSnapSave(); await sleep(500);
  const sp=posts.find(p=>p.t==='snap');
  out.push('บันทึก: diff A1 เก็บค่าดิบ −1,200 (ไม่หักบัญชีสำรอง): '+(!!sp&&near(sp.rows[0].diff,-1200)));
  const a4=[...d.querySelectorAll('#bkAcc tbody tr')].find(tr=>tr.textContent.startsWith('4 อ'));
  out.push('ตารางสะสม A1 4 ส.ค. หลังบันทึก → ✓ ตรง (รวมบัญชีสำรอง ฿1,200.00): '+a4.textContent.includes('✓ ตรง (รวมบัญชีสำรอง ฿1,200.00)'));
  await w.bkWhy(); await sleep(200);
  out.push('ทำไมไม่ตรง: อธิบายบัญชีสำรองเป็นยอดช่วยกระทบ: '+d.getElementById('bkWhyBox').textContent.includes('ถ้ายอดขาดแล้วบวกยอดนี้ตรงพอดี'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
