// smoke123: แท็บ "ตรวจสอบเงินในบัญชี" (bank) — ยอดที่ควรมี vs ยอดจากแอพธนาคาร + rename recon → ตรวจสอบยอดโอน
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
  // 1) เมนู / rename
  const sbR=d.querySelector('.sb-item[data-v="recon"]'), sbB=d.querySelector('.sb-item[data-v="bank"]');
  out.push('เมนู: มีปุ่ม bank + recon เปลี่ยนชื่อเป็น ตรวจสอบยอดโอน: '+(!!sbB&&sbB.textContent.trim()==='ตรวจสอบเงินในบัญชี'&&!!sbR&&sbR.textContent.trim()==='ตรวจสอบยอดโอน'));
  out.push('tabbar: recon=ยอดโอน · bank=เงินในบัญชี · section view-bank: '+(d.querySelector('.tabbar button[data-v="recon"]').textContent==='ยอดโอน'&&d.querySelector('.tabbar button[data-v="bank"]').textContent==='เงินในบัญชี'&&!!d.getElementById('view-bank')));
  out.push('MENU_LABEL/VIEWS/SCOPE_HIDE/LOGN: '+w.eval("MENU_LABEL.bank==='ตรวจสอบเงินในบัญชี'&&MENU_LABEL.recon==='ตรวจสอบยอดโอน'&&VIEWS.indexOf('bank')===VIEWS.indexOf('recon')+1&&SCOPE_HIDE.includes('bank')&&LOGN.pnl_bank_snap.includes('ตรวจสอบเงินในบัญชี')&&LOGN.pnl_cash_expenses==='เงินสดจ่าย'&&!LOGN.pnl_cash_paid&&ALL_TABLES.includes('pnl_bank_moves')"));
  // 2) helper วันเงินเข้า
  out.push('bkPayDate: จ→อ · พฤ→ศ · ศ→จ · ส→จ · อา→จ: '+w.eval("bkPayDate('2026-08-03')==='2026-08-04'&&bkPayDate('2026-08-06')==='2026-08-07'&&bkPayDate('2026-08-07')==='2026-08-10'&&bkPayDate('2026-08-08')==='2026-08-10'&&bkPayDate('2026-08-09')==='2026-08-10'"));
  // 3) หน้า bank โหมดประมาณ (ไม่มีไฟล์ Beam)
  await w.eval("show('bank')"); await sleep(500);
  const el=d.getElementById('view-bank'); let t=el.textContent;
  out.push('pageTitle = ตรวจสอบเงินในบัญชี · หัวการ์ด: '+(d.getElementById('pageTitle').textContent==='ตรวจสอบเงินในบัญชี'&&t.includes('🏦 ตรวจสอบเงินในบัญชี · ส.ค. 2569')));
  out.push('ป้ายโหมดประมาณ (ใช้กฎ 40,000): '+(t.includes('≈ ประมาณ')&&t.includes('ใช้กฎ 40,000')));
  const B=w.eval('S.bank'); const x3=B.days.find(z=>z.ds==='2026-08-03');
  out.push('bkCalc 3 ส.ค.: POS 107,000 · T 48,000 · CX 2,000 · fee 179.76 · net 47,820.24: '+(x3.POS===107000&&x3.T===48000&&x3.CX===2000&&near(x3.fee,179.76)&&near(x3.net,47820.24)&&x3.approx===true));
  out.push('bkCalc 3 ส.ค.: A1 39,850.20 · A2 7,970.04 · เข้า 4 ส.ค.: '+(near(x3.N.A1,39850.20)&&near(x3.N.A2,7970.04)&&x3.payDate==='2026-08-04'));
  out.push('bkCalc 7 ส.ค. (ศุกร์) → เข้า จ 10 ส.ค. 19,925.10: '+(near(B.QRin.A1['2026-08-10'],19925.10)&&B.days.find(z=>z.ds==='2026-08-07').payDate==='2026-08-10'));
  out.push('ควรมี 4 ส.ค.: A1 314,850.20 · A2 69,970.04 · A1 10 ส.ค. 334,775.30: '+(near(B.bal.A1['2026-08-04'],314850.20)&&near(B.bal.A2['2026-08-04'],69970.04)&&near(B.bal.A1['2026-08-10'],334775.30)));
  out.push('ยอดตั้งต้นบรรทัด: ณ สิ้นวัน ศ 31 ก.ค. · 300,000.00 · 62,000.00: '+(t.includes('ยอดตั้งต้น ณ สิ้นวัน ศ 31 ก.ค.')&&t.includes('฿300,000.00')&&t.includes('฿62,000.00')));
  // ตารางรายวัน
  const daily=d.getElementById('bkDaily'); const r3=[...daily.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('3 จ'));
  const c3=[...r3.querySelectorAll('td')].map(td=>td.textContent.trim());
  out.push('ตารางรายวัน 3 ส.ค.: POS 107,000 · เงินสด 59,000 · QR 48,000 · fee −179.76 · net 47,820.24 · A1 39,850.20≈ · A2 7,970.04≈ · จ่ายสด −2,000 · หลังจ่ายสด 104,820.24 · เข้า อ 4 ส.ค. · ปิดกะ เกิน ฿50.00: '
    +(c3[1]==='107,000'&&c3[2]==='59,000'&&c3[3]==='48,000'&&c3[4]==='−179.76'&&c3[5]==='47,820.24'&&c3[6]==='39,850.20 ≈'&&c3[7]==='7,970.04 ≈'&&c3[8]==='−2,000'&&c3[9]==='104,820.24'&&c3[10]==='อ 4 ส.ค.'&&c3[11]==='เกิน ฿50.00'));
  const cols=daily.querySelectorAll('thead th').length;
  out.push('ไม่มีคอลัมน์บัญชีสำรอง (ทั้งเดือน 0) = 12 คอลัมน์ · วันไม่มีข้อมูลเป็น —: '+(cols===12&&[...daily.querySelectorAll('tbody tr.bk-dim')].length===29));
  const tf=[...daily.querySelectorAll('tfoot td')].map(td=>td.textContent.trim());
  out.push('แถวรวม: 2 วัน · POS 157,000 · fee −254.66 · หลังจ่ายสด 154,745.34 · เข้าแล้ว 2 วัน: '+(tf[0]==='รวม 2 วัน'&&tf[1]==='157,000'&&tf[4]==='−254.66'&&tf[9]==='154,745.34'&&tf[10].includes('เข้าแล้ว 2 วัน')));
  out.push('กดแถว 7 ส.ค. → dashGoDay(7) → แท็บรายรับ incDay 7: '+await (async()=>{ [...daily.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('7 ศ')).click(); await sleep(300); const ok=w.eval('S.tab')==='income'&&w.eval('S.incDay')===7; await w.eval("show('bank')"); await sleep(500); return ok; })());
  t=el.textContent;
  // เงินสดในมือ
  const cb=[...d.querySelectorAll('#view-bank .bk-cbx')].map(x=>x.textContent);
  out.push('เงินสด รัชดา: เก๊ะล่าสุด 6,000 (กะเช้า 7 ส.ค.) · ฝากรอ 57,000 · จ่ายสด 2,000 (ดิฟ 500) · ลงตัวทุกกะ: '+(cb[0].includes('รัชดา')&&cb[0].includes('กะเช้า 7 ส.ค.')&&cb[0].includes('฿6,000')&&cb[0].includes('฿57,000')&&cb[0].includes('฿2,000 (ค่าดิฟ ฿500)')&&cb[0].includes('ลงตัวทุกกะ (3 กะ)')));
  out.push('เงินสด ลาดพร้าว: เก๊ะ 3,000 (กะเย็น 3 ส.ค.) · ฝากรอ 16,050 · 1 กะ เกิน ฿50.00: '+(cb[1].includes('ลาดพร้าว')&&cb[1].includes('กะเย็น 3 ส.ค.')&&cb[1].includes('฿3,000')&&cb[1].includes('฿16,050')&&cb[1].includes('1 กะ')&&cb[1].includes('เกิน ฿50.00 · กะเย็น 3 ส.ค.')));
  // ตารางสะสม A1
  const acc=d.getElementById('bkAcc'); const a4=[...acc.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('4 อ'));
  const a4c=[...a4.querySelectorAll('td')].map(td=>td.textContent.trim());
  out.push('สะสม A1 4 ส.ค.: ยกมา 300,000.00 · +39,850.20 ←ขาย 3 ส.ค. · −25,000.00 · ควรมี 314,850.20 · ยังไม่กรอก: '+(a4c[1]==='300,000.00'&&a4c[2].includes('+39,850.20')&&a4c[2].includes('←ขาย 3 ส.ค.')&&a4c[4]==='−25,000.00'&&a4c[5]==='314,850.20'&&a4c[7]==='ยังไม่กรอก'));
  const a8=[...acc.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('8 ส'));
  out.push('สะสม A1 8 ส.ค. (เสาร์): ไม่มีรอบ · 10 ส.ค. +19,925.10 ←ขาย 7 ส.ค. = 334,775.30: '+(a8.textContent.includes('เสาร์ ไม่มีรอบ')&&[...acc.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('10 จ')).textContent.includes('←ขาย 7 ส.ค.')&&acc.textContent.includes('334,775.30')));
  w.bkAcctTab('A2'); await sleep(50);
  const acc2=d.getElementById('bkAcc'); const b4=[...acc2.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith('4 อ'));
  out.push('แท็บ A2 4 ส.ค.: +7,970.04 · ควรมี 69,970.04 · รวม ตั้งต้น 62,000.00: '+(b4.textContent.includes('+7,970.04')&&b4.textContent.includes('69,970.04')&&acc2.textContent.includes('ตั้งต้น 62,000.00')));
  w.bkAcctTab('A1');
  // เงินออก
  const ot=d.getElementById('bkOutTbl').textContent;
  out.push('เงินออก: FarmFresh บิล 1 ส.ค. −25,000.00 จาก บัญชี 1 · มี 📎 · select pay_src · รวม บัญชี 1 25,000.00: '+(ot.includes('FarmFresh · บิล 1 ส.ค. (รัชดา)')&&ot.includes('−25,000.00')&&!!d.querySelector('#bkOutTbl select.bk-sel')&&d.querySelector('#bkOutTbl select.bk-sel').value==='A1'&&!!d.querySelector('#bkOutTbl a[href="https://x/slip.jpg"]')&&!!d.querySelector('#bkOutTbl input.bk-date[value="2026-08-04"]')));
  out.push('แถบเหลือง จ่ายแล้วไม่ลงวัน 1 รายการ ฿3,000.00 (Smilemeat 5 ส.ค.): '+(t.includes('จ่ายแล้วแต่ยังไม่ลงวันจ่าย/บัญชี 1 รายการ ฿3,000.00')&&t.includes('Smilemeat · บิล 5 ส.ค. (ลาดพร้าว)')));
  // 4) กรอก snap 4 ส.ค.
  d.getElementById('bkDate').value='2026-08-04'; w.bkDateChange();
  d.getElementById('bkBal_A1').value='314900.20'; d.getElementById('bkBal_A2').value='69970.04'; w.bkSnapPreview();
  let cmp=[...d.querySelectorAll('#bkCmp .bk-cb')].map(x=>x.textContent);
  out.push('เทียบสด A1: ควรมี ฿314,850.20 · แอพ ฿314,900.20 · +50.00 มากกว่าที่ควร (เหลือง): '+(cmp[0].includes('฿314,850.20')&&cmp[0].includes('฿314,900.20')&&cmp[0].includes('+50.00')&&cmp[0].includes('มากกว่าที่ควร +50.00')&&d.querySelector('#bkCmp .bk-cb').classList.contains('over')));
  out.push('เทียบสด A2: ✓ ตรง (เขียว): '+(cmp[1].includes('✓ ตรง')&&d.querySelectorAll('#bkCmp .bk-cb')[1].classList.contains('ok')));
  out.push('บรรทัดรอบเงินเข้า 4 ส.ค. (ยอดขาย 3 ส.ค.): '+d.getElementById('bkRound').textContent.includes('รวมเงินเข้าถึงรอบ 4 ส.ค. (ยอดขาย 3 ส.ค.)'));
  // ตรง (ก่อนรอบเงินเข้า): กรอก A1 = ควรมี − เงินเข้าวันนั้น
  d.getElementById('bkBal_A1').value=String(300000-25000); w.bkSnapPreview();
  out.push('A1 กรอก 275,000 (ก่อนรอบเงินเข้า 39,850.20) → ✓ ตรง (ก่อนรอบเงินเข้า): '+d.querySelector('#bkCmp .bk-cb').textContent.includes('✓ ตรง (ก่อนรอบเงินเข้า)'));
  d.getElementById('bkBal_A1').value='314900.20'; w.bkSnapPreview();
  d.getElementById('bkNote').value='ดูตอน 9 โมง';
  await w.bkSnapSave(); await sleep(500);
  const sp=posts.find(p=>p.t==='snap');
  out.push('POST pnl_bank_snap 2 แถว kind=actual · A1 expected 314,850.20 diff 50 · A2 diff 0 · note: '+(!!sp&&sp.rows.length===2&&sp.rows[0].kind==='actual'&&sp.rows[0].as_of==='2026-08-04'&&near(sp.rows[0].expected,314850.20)&&near(sp.rows[0].diff,50)&&sp.rows[0].balance===314900.2&&near(sp.rows[1].diff,0)&&sp.rows[0].note==='ดูตอน 9 โมง'));
  t=el.textContent;
  out.push('หลังบันทึก: วันที่คง 4 ส.ค. · ช่องเติมยอดเดิม · แถว 4 ส.ค. เน้น + ชิป มากกว่าที่ควร +50.00: '+(d.getElementById('bkDate').value==='2026-08-04'&&d.getElementById('bkBal_A1').value==='314900.2'&&!![...d.querySelectorAll('#bkAcc tbody tr.bk-hi')].find(tr=>tr.textContent.startsWith('4 อ')&&tr.textContent.includes('314,900.20')&&tr.textContent.includes('มากกว่าที่ควร +50.00'))));
  out.push('รวมเดือน กรอกแล้ว 1 วัน: '+d.getElementById('bkAcc').textContent.includes('กรอกแล้ว 1 วัน'));
  // 5) ทำไมไม่ตรง
  await w.bkWhy(); await sleep(200);
  const why=d.getElementById('bkWhyBox').textContent;
  out.push('ทำไมไม่ตรง: บิล Smilemeat ไม่ลงวัน · กะเย็น 3 ส.ค. ลาดพร้าว เกิน 50 · วันประมาณ ≈: '+(why.includes('บิล Smilemeat 5 ส.ค. ฿3,000.00')&&why.includes('กะเย็น 3 ส.ค. (ลาดพร้าว) ปิดกะเกิน ฿50.00')&&why.includes('วันประมาณ ≈ 1 วัน')));
  // 6) ลงวันจ่ายบิลที่ยังไม่มีวัน → PATCH paid_d + pay_src A1
  await w.bkUnpaidSet('JJLP','2026-08-05',2,'2026-08-06'); await sleep(400);
  const pt=posts.find(p=>p.t==='patch');
  out.push('ลงวันจ่าย → PATCH pnl_expense_daily branch=eq.JJLP&d=eq.2026-08-05&supplier_id=eq.2 {paid_d,pay_src:A1}: '+(!!pt&&pt.url.includes('branch=eq.JJLP&d=eq.2026-08-05&supplier_id=eq.2')&&pt.body.paid_d==='2026-08-06'&&pt.body.pay_src==='A1'));
  // 7) เพิ่มรายการเคลื่อนไหว: โอนออก A1 → A2 สร้างคู่ transfer_in
  w.bkMoveModal(); await sleep(50);
  d.getElementById('bkMvK').value='transfer_out'; w.bkMoveKind();
  out.push('modal: ชนิดโอนออก → ถามบัญชีปลายทาง (ตั้งต้น A2): '+(d.getElementById('bkMvToRow').style.display!=='none'&&d.getElementById('bkMvTo').value==='A2'));
  d.getElementById('bkMvV').value='10000'; d.getElementById('bkMvT').value='โอนไปบัญชี 2';
  await w.bkMoveSave(); await sleep(400);
  const mv=posts.find(p=>p.t==='move');
  out.push('POST pnl_bank_moves 2 แถว: A1 −10,000 transfer_out + A2 +10,000 transfer_in: '+(!!mv&&mv.rows.length===2&&mv.rows[0].acct==='A1'&&mv.rows[0].amount===-10000&&mv.rows[0].kind==='transfer_out'&&mv.rows[1].acct==='A2'&&mv.rows[1].amount===10000&&mv.rows[1].kind==='transfer_in'));
  // 8) เคสมีไฟล์ Beam → ใช้ค่าไฟล์ (fee 150/30 ไม่ใช่สูตร) · โหมดแม่น
  MODE.beam=true; await w.eval("show('bank')"); await sleep(500);
  const B2=w.eval('S.bank'); const y3=B2.days.find(z=>z.ds==='2026-08-03');
  out.push('Beam: 3 ส.ค. fee 180 · net 47,820 · A1 39,850 · A2 7,970 (ค่าไฟล์) ไม่มี ≈: '+(y3.fee===180&&y3.net===47820&&y3.N.A1===39850&&y3.N.A2===7970&&y3.approx===false&&y3.beamOK===true));
  out.push('Beam: ควรมี A1 4 ส.ค. 314,850.00 · A2 69,970.00 · 10 ส.ค. 334,775.00 · ป้าย ● แม่น ถึง 7 ส.ค.: '+(near(B2.bal.A1['2026-08-04'],314850)&&near(B2.bal.A2['2026-08-04'],69970)&&near(B2.bal.A1['2026-08-10'],334775)&&el.textContent.includes('● แม่น — มีไฟล์ Beam ถึง 7 ส.ค.')));
  out.push('Beam: snap 4 ส.ค. เดิม 314,900.20 → ผลต่าง +50.20: '+[...d.querySelectorAll('#bkAcc tbody tr')].find(tr=>tr.textContent.startsWith('4 อ')).textContent.includes('มากกว่าที่ควร +50.20'));
  // 9) PAYOUT ในไฟล์เงินเคลื่อนไหว แทนค่าประมาณสำหรับวัน ≤ lastPayout
  MODE.payout=true; await w.eval("show('bank')"); await sleep(500);
  const B3=w.eval('S.bank');
  out.push('PAYOUT 4 ส.ค. −39,800 → A1 เงินเข้า 4 ส.ค. 39,800 (ไม่ใช่ 39,850) · 10 ส.ค. ยังประมาณ 19,925 · A2 ไม่มี PAYOUT ใช้ประมาณ 7,970: '+(B3.QRin.A1['2026-08-04']===39800&&B3.QRin.A1['2026-08-10']===19925&&B3.QRin.A2['2026-08-04']===7970&&B3.lastPayout.A1==='2026-08-04'));
  out.push('PAYOUT: ควรมี A1 4 ส.ค. 314,800.00 · 10 ส.ค. 334,725.00 · แถวโชว์ ←Beam โอนเข้า: '+(near(B3.bal.A1['2026-08-04'],314800)&&near(B3.bal.A1['2026-08-10'],334725)&&[...d.querySelectorAll('#bkAcc tbody tr')].find(tr=>tr.textContent.startsWith('4 อ')).textContent.includes('←Beam โอนเข้า')));
  // 10) header recon เปลี่ยนชื่อ
  await w.eval("show('recon')"); await sleep(400);
  out.push('หน้า recon หัว = 🛡 ตรวจสอบยอดโอน: '+d.getElementById('view-recon').textContent.includes('🛡 ตรวจสอบยอดโอน · ส.ค. 2569'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
