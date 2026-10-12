// smoke128: ตรวจสอบเงินในบัญชี — เลือกวันยอดขายแยกจากช่วงบัญชี (user 12 ต.ค.: "อยากเลือกวันยอดขายได้ด้วย")
// fixture เดียวกับ smoke123 (ส.ค. 2569 · ประมาณจากกฎเพดาน) + JJRD 10 ส.ค. กะเช้า POS 30,000 (โอน 10,000 · เงินสดค้างเก๊ะ 20,000)
//   ต่อวันขาย: 3 ส.ค. ขาย 107,000 ฝาก 49,050 เก๊ะ +8,000 จ่ายสด 2,000 fee 179.76 net 47,820.24 → เข้า 4 ส.ค.
//             7 ส.ค. ขาย 50,000 ฝาก 24,000 เก๊ะ +6,000 (เปิด 0 ทั้งที่ปิดก่อนหน้า 5,000 → ช่องว่างเก๊ะ 5,000) fee 74.90 net 19,925.10 → เข้า 10 ส.ค.
//             10 ส.ค. ขาย 30,000 เก๊ะ +20,000 fee 37.45 net 9,962.55 → เข้า 11 ส.ค. · บิล 4 ส.ค. 25,000 + 5 ส.ค. 3,000
// สูตร: ควรมี(D, ขายถึง SD) = Σ(วันขาย≤SD)(ขาย−ฝาก−จ่ายสด−fee−เก๊ะ−net) + QR ที่เข้าถึง D − QR ของวันขายหลัง SD ที่เข้าแล้ว − บิลถึง D − รายจ่ายอื่นทั้งเดือน
// A) บัญชี 1–10 · ขาย 1–10 (ค่าเริ่ม): ขาย 187,000 ฝาก 73,050 เก๊ะค้าง 29,000 จ่ายสด 2,000 บิล 28,000 fee 292.11 ปรับ −9,962.55−5,000 = 39,695.34
// B) บัญชี 1–10 · ขาย 1–9 (ถึงเมื่อวาน): ขาย 157,000 ฝาก 73,050 เก๊ะค้าง ณ 9 ส.ค. 9,000 fee 254.66 ปรับ −5,000 (QR ไม่ต้องปรับ) = 39,695.34 (เท่าเดิม)
// C) บัญชี 1–10 · ขาย 1–5: ขาย 107,000 ฝาก 49,050 เก๊ะ 8,000 จ่ายสด 2,000 บิล 28,000 fee 179.76 · QR เข้า 10 ส.ค. ของวันขาย 7 ส.ค. 19,925.10 ไม่นับ = 19,770.24
// D) บัญชี 4–10 · ขาย 7–9: ยกมา 47,770.24 (ขาย/เงินสด 1–6 + บิล 1–3) + 50,000 − 24,000 − 9,000 + 8,000 − 28,000 − 74.90 − 5,000 = 39,695.34
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
  {...Z,branch:'JJRD',d:'2026-08-07',sales_pos_am:50000,deposit_am:24000,cash_drawer_am:6000,transfer_total_am:20000},
  // JJRD 10 ส.ค. (จันทร์) กะเช้ายังไม่ปิดวัน: POS 30,000 = โอน 10,000 + เงินสดในเก๊ะ 20,000 (เก๊ะเปิด 6,000 → 26,000) · fee 37.45 · net 9,962.55 เข้า อ 11 ส.ค.
  {...Z,branch:'JJRD',d:'2026-08-10',sales_pos_am:30000,drawer_open_am:6000,cash_drawer_am:26000,transfer_total_am:10000}];
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
  const B=w.eval('S.bank');
  out.push('bkCalc: สะสม net (QR สุทธิของวันขาย) + dayBy · 10 ส.ค. net 9,962.55 เข้า 11 ส.ค. · ควรมี 10 ส.ค. 39,695.34: '+(near(B.eqBy['2026-08-10'].cum.net,77707.89)&&near(B.dayBy['2026-08-10'].net,9962.55)&&B.dayBy['2026-08-10'].payDate==='2026-08-11'&&near(B.eqBy['2026-08-10'].should,39695.34)));
  const sf=()=>d.getElementById('bkSFrom'), st=()=>d.getElementById('bkSTo'), rs=()=>d.getElementById('bkSReset');
  const L=()=>[...d.getElementById('bkEq').querySelectorAll('.bk-ln')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  const find=(ls,k)=>ls.find(x=>x.includes(k))||'';
  const df=()=>d.querySelector('#bkEq .bk-diff');
  d.getElementById('bkFrom').value='2026-08-01'; d.getElementById('bkDate').value='2026-08-10'; w.bkDateChange(); w.bkFromChange();
  // A) ค่าเริ่ม: ช่องวันขาย = ช่วงด้านบน · ไม่มีปุ่ม ↺
  let ls=L();
  out.push('A ค่าเริ่ม: ช่องวันขายอยู่ในบรรทัดยอดขาย 1–10 ส.ค. (max = วันที่ดูยอด) · ปุ่ม ↺ ซ่อน · S.bankSale ว่าง: '+(!!d.querySelector('#bkEqS #bkSFrom')&&sf().value==='2026-08-01'&&st().value==='2026-08-10'&&st().max==='2026-08-10'&&sf().min==='2026-08-01'&&rs().style.display==='none'&&w.eval('S.bankSale')==null));
  out.push('A สมการ: ขาย +187,000.00 · ฝาก −73,050.00 · เก๊ะค้าง ณ 10 ส.ค. −29,000.00 · บิล −28,000.00 · fee −292.11 · ปรับ −14,962.55 · =39,695.34: '
    +(ls[1].startsWith('ยอดขายทั้งหมด')&&ls[1].endsWith('+ 187,000.00')&&find(ls,'เงินสดที่ฝาก').includes('− 73,050.00')&&find(ls,'เงินสดค้างในเก๊ะ ณ สิ้นวัน 10 ส.ค.').includes('− 29,000.00')
      &&find(ls,'บิลที่จ่ายแล้ว').includes('− 28,000.00')&&find(ls,'ค่าธรรมเนียม').includes('− 292.11')&&find(ls,'ปรับอื่นๆ').includes('− 14,962.55')&&find(ls,'ปรับอื่นๆ').includes('ยังไม่เข้า/เพิ่งเข้าบัญชี (โอนวันนี้ เข้าวันถัดไป) −9,962.55')&&find(ls,'ยอดที่ควรมีในบัญชี').includes('39,695.34')));
  // B) ขายถึงเมื่อวาน (9 ส.ค.) ดูยอดบัญชี 10 ส.ค.
  st().value='2026-08-09'; w.bkSaleChange(1); ls=L();
  out.push('B เลือกวันขาย 1–9: S.bankSale = {f:1,t:9} · ปุ่ม ↺ โผล่ · บรรทัดยอดขายบอก "เลือกวันขายเอง (บิลยังนับ 1 ส.ค. – 10 ส.ค.)": '+(w.eval("S.bankSale.f==='2026-08-01'&&S.bankSale.t==='2026-08-09'&&S.bankSale.m==='2026-08'")&&rs().style.display===''&&ls[1].includes('เลือกวันขายเอง (บิลยังนับ 1 ส.ค. – 10 ส.ค.)')&&d.getElementById('bkEqS').classList.contains('bk-cust')));
  out.push('B สมการ: ขาย +157,000.00 · ฝาก −73,050.00 (1 ส.ค. – 9 ส.ค.) · เก๊ะค้าง ณ 9 ส.ค. −9,000.00 · บิล −28,000.00 (1–10) · fee −254.66 · ปรับ −5,000.00 (ไม่มีรอบ QR) · =39,695.34 · บอกนับยอดขาย 1–9: '
    +(ls[1].endsWith('+ 157,000.00')&&find(ls,'เงินสดที่ฝาก').includes('1 ส.ค. – 9 ส.ค.')&&find(ls,'เงินสดที่ฝาก').includes('− 73,050.00')&&find(ls,'เงินสดค้างในเก๊ะ ณ สิ้นวัน 9 ส.ค.').includes('− 9,000.00')
      &&find(ls,'บิลที่จ่ายแล้ว').includes('1 ส.ค. – 10 ส.ค.')&&find(ls,'บิลที่จ่ายแล้ว').includes('− 28,000.00')&&find(ls,'ค่าธรรมเนียม').includes('− 254.66')
      &&find(ls,'ปรับอื่นๆ').includes('− 5,000.00')&&!find(ls,'ปรับอื่นๆ').includes('QR')&&find(ls,'ยอดที่ควรมีในบัญชี').includes('39,695.34')&&find(ls,'ยอดที่ควรมีในบัญชี').includes('นับยอดขาย 1 ส.ค. – 9 ส.ค. · บิลที่จ่ายถึง 10 ส.ค.')));
  d.getElementById('bkBal_A1').value='30000'; d.getElementById('bkBal_A2').value='9695.34'; w.bkSnapPreview();
  out.push('B ยอดจริง 39,695.34 → ดิฟ 0.00 ✓ ตรง · ช่องวันขายไม่หาย/ไม่รีเซ็ตตอนพิมพ์ยอด: '+(df().classList.contains('ok')&&df().textContent.includes('0.00')&&st().value==='2026-08-09'));
  // C) ขาย 1–5 → QR ของวันขาย 7 ส.ค. ที่เข้า 10 ส.ค. ไม่นับ
  st().value='2026-08-05'; w.bkSaleChange(1); ls=L();
  out.push('C วันขาย 1–5: ขาย +107,000.00 · ฝาก −49,050.00 · เก๊ะค้าง ณ 5 ส.ค. −8,000.00 · จ่ายสด −2,000.00 · fee −179.76 · ปรับ 0.00 = QR เพิ่งเข้า +19,925.10 − QR วันขาย 7 ส.ค. ที่ไม่ได้นับ −19,925.10 · =19,770.24: '
    +(ls[1].endsWith('+ 107,000.00')&&find(ls,'เงินสดที่ฝาก').includes('− 49,050.00')&&find(ls,'เงินสดค้างในเก๊ะ ณ สิ้นวัน 5 ส.ค.').includes('− 8,000.00')&&find(ls,'รายจ่ายเงินสดหน้าร้าน').includes('− 2,000.00')
      &&find(ls,'ค่าธรรมเนียม').includes('− 179.76')&&find(ls,'ปรับอื่นๆ').includes('+19,925.10')&&find(ls,'ปรับอื่นๆ').includes('QR ของวันขายที่ไม่ได้นับ (7 ส.ค.) ที่เข้าบัญชีแล้ว −19,925.10')&&find(ls,'ปรับอื่นๆ').endsWith('0.00')
      &&find(ls,'ยอดที่ควรมีในบัญชี').includes('19,770.24')));
  out.push('C ยอดจริงเดิม 39,695.34 → มากกว่าที่ควร +19,925.10 (เงินของวันขายที่ไม่ได้เลือก): '+(df().classList.contains('over')&&df().textContent.includes('+19,925.10')));
  // D) ช่วงบัญชี 4–10 · วันขาย 7–9 → ยอดยกมาแยก ยอดขาย/เงินสด 1–6 + บิล 1–3
  d.getElementById('bkFrom').value='2026-08-04'; w.bkFromChange();
  sf().value='2026-08-07'; w.bkSaleChange(0); st().value='2026-08-09'; w.bkSaleChange(1); ls=L();
  out.push('D ยกมา 47,770.24 (ยอดขาย/เงินสด 1 ส.ค. – 6 ส.ค. + บิลที่จ่าย 1 ส.ค. – 3 ส.ค.) · ขาย +50,000.00 · ฝาก −24,000.00 · เก๊ะค้าง ณ 9 ส.ค. −9,000.00 · เก๊ะยกมา ณ 6 ส.ค. +8,000.00 · บิล −28,000.00 (4–10) · fee −74.90 · ปรับ −5,000.00 · =39,695.34: '
    +(ls[0].startsWith('ยอดยกมา')&&ls[0].includes('ยอดขาย/เงินสด 1 ส.ค. – 6 ส.ค. + บิลที่จ่าย 1 ส.ค. – 3 ส.ค.')&&ls[0].endsWith('47,770.24')&&ls[1].endsWith('+ 50,000.00')
      &&find(ls,'เงินสดที่ฝาก').includes('7 ส.ค. – 9 ส.ค.')&&find(ls,'เงินสดที่ฝาก').includes('− 24,000.00')&&find(ls,'เงินสดค้างในเก๊ะ ณ สิ้นวัน 9 ส.ค.').includes('− 9,000.00')
      &&find(ls,'เงินในเก๊ะยกมา ณ สิ้นวัน 6 ส.ค.').includes('+ 8,000.00')&&find(ls,'บิลที่จ่ายแล้ว').includes('4 ส.ค. – 10 ส.ค.')&&find(ls,'บิลที่จ่ายแล้ว').includes('− 28,000.00')
      &&find(ls,'ค่าธรรมเนียม').includes('− 74.90')&&find(ls,'ปรับอื่นๆ').includes('− 5,000.00')&&find(ls,'ยอดที่ควรมีในบัญชี').includes('39,695.34')&&df().classList.contains('ok')));
  // ตั้งแต่ > ถึง → ดึงอีกช่องตาม
  sf().value='2026-08-09'; st().value='2026-08-08'; w.bkSaleChange(1);
  out.push('เลือกถึง < ตั้งแต่ → ตั้งแต่ถอยตาม (8–8 ส.ค.): '+(sf().value==='2026-08-08'&&st().value==='2026-08-08'));
  sf().value='2026-08-10'; st().value='2026-08-08'; w.bkSaleChange(0);
  out.push('เลือกตั้งแต่ > ถึง → ถึงเลื่อนตาม (10–10 ส.ค.): '+(sf().value==='2026-08-10'&&st().value==='2026-08-10'));
  // วันขายตรงกับช่วงบน → กลับไปตามช่วงบนเอง
  sf().value='2026-08-04'; w.bkSaleChange(0);
  out.push('เลือกให้ตรงช่วงบน (4–10) → กลับไปตามช่วงบน S.bankSale ว่าง · ↺ ซ่อน: '+(w.eval('S.bankSale')==null&&rs().style.display==='none'&&!d.getElementById('bkEqS').classList.contains('bk-cust')));
  // เปลี่ยนวันที่ดูยอดตอนเลือกวันขายเอง → วันขายไม่เกินวันที่ดูยอด
  d.getElementById('bkFrom').value='2026-08-01'; w.bkFromChange();
  st().value='2026-08-09'; w.bkSaleChange(1);
  d.getElementById('bkDate').value='2026-08-05'; w.bkDateChange(); ls=L();
  out.push('วันขาย 1–9 แล้วเปลี่ยนวันที่ดูยอดเป็น 5 ส.ค. → วันขายถูกตัดเหลือ 1–5 · max 5 ส.ค. · =19,770.24 (เท่าค่าเริ่ม): '+(st().value==='2026-08-05'&&st().max==='2026-08-05'&&find(ls,'ยอดที่ควรมีในบัญชี').includes('19,770.24')&&rs().style.display==='none'));
  d.getElementById('bkDate').value='2026-08-10'; w.bkDateChange();
  out.push('กลับไปดูยอด 10 ส.ค. → วันขายที่เลือกไว้ (1–9) กลับมา: '+(st().value==='2026-08-09'&&rs().style.display===''));
  w.bkSaleReset(); ls=L();
  out.push('↺ ตามช่วงด้านบน → 1–10 ส.ค. · ขาย 187,000.00: '+(w.eval('S.bankSale')==null&&st().value==='2026-08-10'&&ls[1].endsWith('+ 187,000.00')));
  // หลังโหลดหน้าใหม่ วันขายที่เลือกไว้ยังอยู่ (เช่น กดบันทึกยอด)
  st().value='2026-08-09'; w.bkSaleChange(1);
  await w.eval("show('bank')"); await sleep(500);
  out.push('โหลดหน้าใหม่ → วันขาย 1–9 ยังอยู่ · ขาย 157,000.00: '+(st().value==='2026-08-09'&&L()[1].endsWith('+ 157,000.00')));
  // เปลี่ยนเดือน → ไม่ใช้วันขายของเดือนอื่น
  w.eval("S.bankSale={m:'2026-07',f:'2026-07-01',t:'2026-07-09'}"); w.bkSnapPreview();
  out.push('วันขายของเดือนอื่น → ไม่ใช้ (ตามช่วงบน): '+(st().value==='2026-08-10'&&rs().style.display==='none'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
