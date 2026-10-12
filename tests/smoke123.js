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
// สมการเดียว (11 ต.ค.): ยอดต้นเดือน 0 (ปิดบัญชีทุกสิ้นเดือน — ไม่ใช้ยอดตั้งต้นใน SNAPS) + ยอดขาย − เงินสดที่ฝาก − จ่ายสด − บิลที่จ่าย − รายจ่ายอื่น − ค่าธรรมเนียม ± (เงินทอน/เข้าออกอื่น/รอบโอน)
//   3 ส.ค.: 107,000 − ฝาก 49,050 − จ่ายสด 2,000 − fee 179.76 − เงินทอนเพิ่ม 8,000 − โอนยังไม่เข้า 47,820.24 = −50 (= ลาดพร้าวปิดกะเกิน 50) → ควรมี −50.00
//   4 ส.ค.: โอนเข้า +47,820.24 − บิล 25,000 → 22,770.24 · 5 ส.ค.: บิล Smilemeat 3,000 (ไม่มีวันจ่าย ใช้วันบิล) → 19,770.24
//   7 ส.ค. (ศ): 50,000 − ฝาก 24,000 − เงินทอน 6,000 − fee 74.90 − โอนยังไม่เข้า 19,925.10 = 0 · 10 ส.ค. (จ) โอนเข้า +19,925.10 → 39,695.34
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
  out.push('pageTitle = ตรวจสอบเงินในบัญชี · หัวการ์ดอธิบายสมการ: '+(d.getElementById('pageTitle').textContent==='ตรวจสอบเงินในบัญชี'&&t.includes('🏦 ตรวจสอบเงินในบัญชี · ส.ค. 2569')&&t.includes('ดิฟควรเป็น 0')));
  const B=w.eval('S.bank'); const x3=B.days.find(z=>z.ds==='2026-08-03');
  out.push('bkCalc 3 ส.ค.: POS 107,000 · ฝาก 49,050 · เงินทอนเพิ่ม 8,000 · จ่ายสด 2,000 · fee 179.76 · net 47,820.24: '+(x3.POS===107000&&x3.dep===49050&&x3.dDraw===8000&&x3.CX===2000&&near(x3.fee,179.76)&&near(x3.net,47820.24)&&x3.approx===true));
  out.push('bkCalc 3 ส.ค.: A1 39,850.20 · A2 7,970.04 · เข้า 4 ส.ค. · 7 ส.ค. (ศ) เข้า จ 10 ส.ค.: '+(near(x3.N.A1,39850.20)&&near(x3.N.A2,7970.04)&&x3.payDate==='2026-08-04'&&B.days.find(z=>z.ds==='2026-08-07').payDate==='2026-08-10'));
  const E=k=>B.eqBy[k];
  out.push('สมการ: ยอดต้นเดือน 0 (ไม่ใช้ยอดตั้งต้นที่บันทึกไว้) · ควรมี 1 ส.ค. 0 · 3 ส.ค. −50.00 · 4 ส.ค. 22,770.24 · 5 ส.ค. 19,770.24 · 7 ส.ค. 19,770.24 · 10 ส.ค. 39,695.34: '+(B.open0===0&&B.eqO==='2026-07-31'&&near(E('2026-08-01').should,0)&&near(E('2026-08-03').should,-50)&&near(E('2026-08-04').should,22770.24)&&near(E('2026-08-05').should,19770.24)&&near(E('2026-08-07').should,19770.24)&&near(E('2026-08-10').should,39695.34)));
  const c4=E('2026-08-04').cum;
  out.push('สะสมถึง 4 ส.ค.: ขาย 107,000 · ฝาก 49,050 · จ่ายสด 2,000 · บิล 25,000 · อื่น 0 · fee 179.76 · เงินทอน 8,000 · รอบโอน 0: '+(c4.pos===107000&&c4.dep===49050&&c4.cx===2000&&c4.bills===25000&&c4.fix===0&&near(c4.fee,179.76)&&c4.draw===8000&&near(c4.adj,0)));
  out.push('บิลไม่มีวันจ่าย (Smilemeat 5 ส.ค. 3,000) นับตามวันบิล: '+(E('2026-08-05').bills===3000));
  out.push('ไม่มีบรรทัด/ฟอร์มยอดตั้งต้นแล้ว · หัวการ์ดบอกยอดต้นเดือน 0: '+(!d.getElementById('bkOpen')&&!d.getElementById('bkOpenForm')&&t.includes('ยอดต้นเดือน 0 + ยอดขาย')));
  // ตารางรายวัน
  const daily=d.getElementById('bkDaily'); const row=k=>[...daily.querySelectorAll('tbody tr')].find(tr=>tr.textContent.startsWith(k));
  const c3=[...row('3 จ').querySelectorAll('td')].map(td=>td.textContent.trim());
  out.push('รายวัน 3 ส.ค.: ขาย 107,000.00 · ฝาก −49,050.00 · จ่ายสด −2,000.00 · บิล — · ปรับ −56,000.00 · ควรมี -50.00 · ยังไม่กรอก: '
    +(c3[1]==='107,000.00'&&c3[2]==='−49,050.00'&&c3[3]==='−2,000.00'&&c3[4]==='—'&&c3[5]==='−56,000.00'&&c3[6]==='-50.00'&&c3[7]==='—'&&c3[8]==='ยังไม่กรอก'));
  const c4r=[...row('4 อ').querySelectorAll('td')].map(td=>td.textContent.trim());
  out.push('รายวัน 4 ส.ค.: บิล −25,000.00 · ปรับ +47,820.24 (โอนเข้า) · ควรมี 22,770.24: '+(c4r[4]==='−25,000.00'&&c4r[5]==='+47,820.24'&&c4r[6]==='22,770.24'));
  out.push('ตารางรายวัน 9 คอลัมน์ (รายจ่ายอื่นหักทั้งเดือน) · ไม่มีตารางแยกบัญชีแล้ว: '+(daily.querySelectorAll('thead th').length===9&&!d.getElementById('bkAcc')));
  // เงินสดในมือ (พับไว้ใน details)
  const cb=[...d.querySelectorAll('#view-bank .bk-cbx')].map(x=>x.textContent);
  out.push('เงินสด รัชดา: เก๊ะล่าสุด 6,000 · ฝากรอ 57,000 · จ่ายสด 2,000 (ดิฟ 500) · ลงตัวทุกกะ: '+(cb[0].includes('รัชดา')&&cb[0].includes('฿6,000')&&cb[0].includes('กะเช้า 7 ส.ค.')&&cb[0].includes('฿57,000')&&cb[0].includes('฿2,000')&&cb[0].includes('ค่าดิฟ ฿500')&&cb[0].includes('ลงตัวทุกกะ')));
  out.push('เงินสด ลาดพร้าว: เก๊ะ 3,000 · ฝากรอ 16,050 · 1 กะ เกิน ฿50.00: '+(cb[1].includes('ลาดพร้าว')&&cb[1].includes('กะเย็น 3 ส.ค.')&&cb[1].includes('฿16,050')&&cb[1].includes('เกิน ฿50.00')));
  out.push('รายละเอียดพับไว้ 2 กล่อง (รายการที่หักออก · เงินสดในมือ): '+(d.querySelectorAll('#view-bank details.bk-more').length===2&&[...d.querySelectorAll('#view-bank details.bk-more')].every(x=>!x.open)));
  // รายการที่หักออก
  const ot=d.getElementById('bkOutTbl').textContent;
  out.push('รายการหักออก: FarmFresh −25,000.00 จากบัญชี 1 + Smilemeat −3,000.00 (ใช้วันบิล): '+(ot.includes('FarmFresh · บิล 1 ส.ค. (รัชดา)')&&ot.includes('−25,000.00')&&ot.includes('Smilemeat · บิล 5 ส.ค. (ลาดพร้าว)')&&ot.includes('(ใช้วันบิล)')&&ot.includes('−3,000.00')));
  out.push('หัวกล่อง: 2 รายการ ฿28,000.00: '+d.querySelector('#view-bank details.bk-more summary').textContent.includes('2 รายการ ฿28,000.00'));
  // 4) กรอกยอด 4 ส.ค. → สมการ + ดิฟ
  d.getElementById('bkDate').value='2026-08-04'; w.bkDateChange();
  const setV=(a1,a2)=>{ d.getElementById('bkBal_A1').value=String(a1); d.getElementById('bkBal_A2').value=String(a2); w.bkSnapPreview(); return d.getElementById('bkEq'); };
  let eq=setV(15000.20,7770.04);
  const lines=[...eq.querySelectorAll('.bk-ln')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  out.push('สมการ 4 ส.ค.: ยอดต้นเดือน 0.00 · +ขาย 107,000.00 · −ฝาก 49,050.00 · −เงินสดค้างในเก๊ะ 8,000.00 · +เก๊ะเปิดวันที่ 1 0.00 · −จ่ายสด 2,000.00 · −บิล 25,000.00 · −อื่น 0.00 · −fee 179.76 · =22,770.24 · จริง 22,770.24: '
    +(lines.length===11&&lines[0].includes('ยอดต้นเดือน')&&lines[0].includes('0.00')&&lines[1].includes('+ 107,000.00')&&lines[2].includes('− 49,050.00')
      &&lines[3].includes('เงินสดค้างในเก๊ะ ณ สิ้นวัน 4 ส.ค.')&&lines[3].includes('− 8,000.00')&&lines[4].includes('เก๊ะเปิดเช้าวันที่ 1')&&lines[4].includes('เงินของเดือนที่แล้ว')&&lines[4].includes('+ 0.00')
      &&lines[5].includes('− 2,000.00')&&lines[6].includes('− 25,000.00')&&lines[7].includes('− 0.00')&&lines[8].includes('− 179.76')&&lines[9].includes('= 22,770.24')&&lines[10].includes('22,770.24')));
  const df=()=>eq.querySelector('.bk-diff');
  d.getElementById('bkFrom').value='2026-08-04'; w.bkFromChange();
  const rl=[...d.getElementById('bkEq').querySelectorAll('.bk-ln')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  out.push('ช่วง 4–4 ส.ค.: ยกมา −50.00 · ขาย 0.00 · เก๊ะค้าง −8,000.00 · เก๊ะยกมา +8,000.00 · บิล −25,000.00 · ปรับ +47,820.24 · =22,770.24 (เท่าดูทั้งเดือน): '
    +(rl[0].includes('ยอดยกมา ณ สิ้นวัน 3 ส.ค.')&&rl[0].includes('− 50.00')&&rl[1].includes('+ 0.00')&&rl[3].includes('− 8,000.00')&&rl[4].includes('เงินในเก๊ะยกมา ณ สิ้นวัน 3 ส.ค.')&&rl[4].includes('+ 8,000.00')
      &&rl[6].includes('− 25,000.00')&&rl.some(x=>x.includes('ปรับอื่นๆ')&&x.includes('+ 47,820.24'))&&rl.some(x=>x.includes('= 22,770.24'))&&df().textContent.includes('0.00')));
  out.push('ตารางรายวันเหลือเฉพาะช่วง 4–4 ส.ค. (1 แถว): '+(d.querySelectorAll('#bkDaily tbody tr').length===1&&d.querySelector('#bkDaily tbody tr').textContent.startsWith('4 อ')));
  d.getElementById('bkFrom').value='2026-08-01'; w.bkFromChange(); eq=d.getElementById('bkEq');
  out.push('ยอดจริงตรง → ดิฟ 0.00 · ✓ ตรง (เขียว): '+(df().classList.contains('ok')&&df().textContent.includes('0.00')&&df().textContent.includes('✓ ตรง')));
  eq=setV(15100.20,7770.04);
  out.push('จริงเกิน 100 → ดิฟ +100.00 · มากกว่าที่ควร (เหลือง): '+(df().classList.contains('over')&&df().textContent.includes('+100.00')&&df().textContent.includes('มากกว่าที่ควร')));
  eq=setV(-25050,0);
  out.push('ดูยอดก่อนรอบเงินเข้า (ขาดเท่าโอนที่เข้าวันนั้น 47,820.24) → ✓ ตรง (ก่อนรอบเงินเข้า): '+df().textContent.includes('✓ ตรง (ก่อนรอบเงินเข้า)'));
  eq=setV(0,0);
  out.push('ขาด → ดิฟ −22,770.24 · ขาด (แดง): '+(df().classList.contains('short')&&df().textContent.includes('−22,770.24')));
  d.getElementById('bkBal_A2').value=''; w.bkSnapPreview();
  out.push('กรอกไม่ครบ 2 บัญชี → ดิฟ — · บอกให้ใส่ให้ครบ: '+(df().textContent.includes('—')&&d.getElementById('bkEq').textContent.includes('ใส่ยอดให้ครบทั้ง 2 บัญชี')));
  setV(15100.20,7770.04); d.getElementById('bkNote').value='ดูตอน 9 โมง';
  await w.bkSnapSave(); await sleep(500);
  const sp=posts.find(p=>p.t==='snap');
  out.push('POST pnl_bank_snap 2 แถว · แถวแรก expected 22,770.24 diff 100 (รวมทุกบัญชี) · แถว 2 null · note: '+(!!sp&&sp.rows.length===2&&sp.rows[0].kind==='actual'&&sp.rows[0].as_of==='2026-08-04'&&near(sp.rows[0].expected,22770.24)&&near(sp.rows[0].diff,100)&&sp.rows[1].expected===null&&sp.rows[1].diff===null&&sp.rows[0].note==='ดูตอน 9 โมง'));
  out.push('หลังบันทึก: วันที่คง 4 ส.ค. · ช่องเติมยอดเดิม · แถว 4 ส.ค. ยอดจริง 22,870.24 + มากกว่าที่ควร: '+(d.getElementById('bkDate').value==='2026-08-04'&&d.getElementById('bkBal_A1').value==='15100.2'
    &&(r4=>r4.classList.contains('bk-hi')&&r4.textContent.includes('22,870.24')&&r4.textContent.includes('มากกว่าที่ควร +100.00'))([...d.querySelectorAll('#bkDaily tbody tr')].find(tr=>tr.textContent.startsWith('4 อ')))));
  // 5) ทำไมไม่ตรง (ดูถึง 10 ส.ค. ให้ครอบบิล 5 ส.ค.)
  d.getElementById('bkDate').value='2026-08-10'; w.bkDateChange();
  await w.bkWhy(); await sleep(200);
  const why=d.getElementById('bkWhyBox').textContent;
  out.push('ทำไมไม่ตรง: รายการไม่มีวันจ่าย 1 รายการ ฿3,000.00 · กะเย็น 3 ส.ค. ลาดพร้าว เกิน 50 · วันประมาณ ≈ · ยังไม่มี Balances: '+(why.includes('รายการที่ยังไม่ลงวันจ่าย 1 รายการ ฿3,000.00')&&why.includes('กะเย็น 3 ส.ค. (ลาดพร้าว) ปิดกะเกิน ฿50.00')&&why.includes('วันประมาณ ≈')&&why.includes('ยังไม่มีไฟล์เงินเคลื่อนไหว')));
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
  // 8) เคสมีไฟล์ Beam → ใช้ค่าไฟล์ (fee 150/30 ไม่ใช่สูตร)
  MODE.beam=true; await w.eval("show('bank')"); await sleep(500);
  const B2=w.eval('S.bank'); const y3=B2.days.find(z=>z.ds==='2026-08-03');
  out.push('Beam: 3 ส.ค. fee 180 · net 47,820 · A1 39,850 · A2 7,970 (ค่าไฟล์) ไม่มี ≈: '+(y3.fee===180&&y3.net===47820&&y3.N.A1===39850&&y3.N.A2===7970&&y3.approx===false&&y3.beamOK===true));
  out.push('Beam: ควรมี 4 ส.ค. 22,770.00 · 10 ส.ค. 39,695.00 · แถว 4 ส.ค. snap เดิม → มากกว่าที่ควร +100.24: '+(near(B2.eqBy['2026-08-04'].should,22770)&&near(B2.eqBy['2026-08-10'].should,39695)
    &&[...d.querySelectorAll('#bkDaily tbody tr')].find(tr=>tr.textContent.startsWith('4 อ')).textContent.includes('มากกว่าที่ควร +100.24')));
  // 9) PAYOUT ในไฟล์เงินเคลื่อนไหว แทนค่าประมาณสำหรับวันในช่วงไฟล์
  MODE.payout=true; await w.eval("show('bank')"); await sleep(500);
  const B3=w.eval('S.bank');
  out.push('PAYOUT 4 ส.ค. −39,800 → เงินเข้า A1 4 ส.ค. 39,800 · 10 ส.ค. ยังประมาณ 19,925 · A2 7,970: '+(B3.QRin.A1['2026-08-04']===39800&&near(B3.QRin.A1['2026-08-10'],19925)&&B3.QRin.A2['2026-08-04']===7970));
  out.push('PAYOUT: ควรมี 4 ส.ค. 22,720.00 · 10 ส.ค. 39,645.00: '+(near(B3.eqBy['2026-08-04'].should,22720)&&near(B3.eqBy['2026-08-10'].should,39645)));
  // 10) header recon เปลี่ยนชื่อ
  await w.eval("show('recon')"); await sleep(400);
  out.push('หน้า recon หัว = 🛡 ตรวจสอบยอดโอน: '+d.getElementById('view-recon').textContent.includes('🛡 ตรวจสอบยอดโอน · ส.ค. 2569'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
