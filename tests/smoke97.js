// smoke97: ใบสำคัญจ่าย (PV) — ซัพ "เครดิต 1 เดือน" ต้องไม่ตกหล่น
// เดิม PV มีแค่งวด 1–15 / 16–สิ้นเดือน · ซัพเครดิตเดือนจ่ายเดือนละครั้ง เลยไม่เข้ารอบไหนเลย
// ใหม่: pnl_suppliers.pay_cycle='monthly' → ไม่ขึ้นงวด 1–15 แต่รวมทั้งเดือนไปออกงวด 16–สิ้นเดือน
// fixture (ส.ค. 2569 · JJRD):
//   s1 ตลาดสด (period)  : 5 ส.ค. 1,000 · 20 ส.ค. 2,000 · 21 ส.ค. 900 (ติ๊กจ่ายแล้ว → ต้องถูกหักออก)
//   s2 บริษัทเครดิตเดือน (monthly): 6 ส.ค. 500 · 22 ส.ค. 700  → รวม 1,200 ออกงวดสิ้นเดือน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const SUPS=[
  {id:1,name:'ตลาดสด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT',payment_term:'15 วัน จ่าย',pay_cycle:'period',bank:'KBANK',account_no:'111',account_name:'ตลาดสด'},
  {id:2,name:'บริษัทเครดิตเดือน',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT',payment_term:'เครดิต 1 เดือน',pay_cycle:'monthly',bank:'SCB',account_no:'222',account_name:'เครดิตเดือน'}];
const EXP=[
  {branch:'JJRD',d:'2026-08-05',supplier_id:1,amount:1000,paid:false},
  {branch:'JJRD',d:'2026-08-20',supplier_id:1,amount:2000,paid:false},
  {branch:'JJRD',d:'2026-08-21',supplier_id:1,amount:900,paid:true},
  {branch:'JJRD',d:'2026-08-06',supplier_id:2,amount:500,paid:false},
  {branch:'JJRD',d:'2026-08-22',supplier_id:2,amount:700,paid:false}];
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(method==='POST'&&url.includes('pnl_pv_items')){posts.push({t:'items',rows:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_pv')){const b=JSON.parse(opt.body);posts.push({t:'pv',rows:b});return T([{id:77,...b}]);}
      if(url.includes('pnl_pv_items')&&url.includes('pv_id=eq.77'))return T([{id:501,pv_id:77,supplier_id:1,amount:2140,vat_amount:140,scheduled:false,paid:false},{id:502,pv_id:77,supplier_id:2,amount:1070,vat_amount:70,scheduled:true,paid:false}]);
      if(url.includes('pnl_pv_items')&&url.includes('pv_id=eq.78'))return T([{id:503,pv_id:78,supplier_id:1,amount:900,vat_amount:0,scheduled:false,paid:false}]);
      if(url.includes('pnl_pv_items'))return T([]);
      if(url.includes('pnl_pv')&&url.includes('id=eq.77'))return T([{id:77,branch:'JJRD',pv_no:'JJRD-05092026V',pv_date:'2026-09-05',d_from:'2026-08-16',d_to:'2026-08-31',vat_type:'VAT'}]);
      if(url.includes('pnl_pv')&&url.includes('id=eq.78'))return T([{id:78,branch:'JJRD',pv_no:'JJRD-05092026',pv_date:'2026-09-05',d_from:'2026-08-16',d_to:'2026-08-31',vat_type:'NON-VAT'}]);
      if(url.includes('pnl_pv'))return T([]);
      if(url.includes('pnl_suppliers'))return T(SUPS);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_expense_daily')){
        const m=url.match(/d=gte\.([0-9-]+)&d=lte\.([0-9-]+)/);
        if(m)return T(EXP.filter(r=>r.d>=m[1]&&r.d<=m[2]));
        return T(EXP);
      }
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_income_daily'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const draft=()=>JSON.parse(w.eval('JSON.stringify({from:S._pvDraft.from,to:S._pvDraft.to,items:S._pvDraft.items.map(x=>({n:x.s.name,amt:x.amt}))})'));
setTimeout(async()=>{
  const out=[];
  await sleep(500);
  await w.eval("show('pv')"); await sleep(250);
  // 1) งวด 1–15: ซัพเครดิตเดือนต้องไม่ขึ้น
  w.pvCreateModal(); await sleep(60);
  d.getElementById('pvM').value='2026-08';
  d.getElementById('pvPer').value='1';
  d.getElementById('pvVat').value='NON-VAT';
  await w.pvPreview(); await sleep(120);
  const p1=draft();
  out.push('งวด 1–15: เห็นเฉพาะซัพรายงวด (ตลาดสด 1,000) ไม่มีซัพเครดิตเดือน: '
    +(p1.items.length===1&&p1.items[0].n==='ตลาดสด'&&p1.items[0].amt===1000&&p1.from==='2026-08-01'&&p1.to==='2026-08-15'));
  // 2) งวด 16–สิ้นเดือน: ซัพเครดิตเดือนได้ทั้งเดือน · ซัพปกติได้เฉพาะครึ่งหลัง · บิลติ๊กจ่ายแล้วถูกหักออก
  d.getElementById('pvPer').value='2';
  await w.pvPreview(); await sleep(120);
  const p2=draft();
  const a=p2.items.find(x=>x.n==='ตลาดสด'),b=p2.items.find(x=>x.n==='บริษัทเครดิตเดือน');
  out.push('งวดสิ้นเดือน: ตลาดสดได้เฉพาะ 16–31 = 2,000 (บิลติ๊กจ่าย 900 ถูกหักออก): '+(!!a&&a.amt===2000));
  out.push('งวดสิ้นเดือน: ซัพเครดิต 1 เดือน รวมทั้งเดือน 500+700 = 1,200: '+(!!b&&b.amt===1200));
  out.push('งวดสิ้นเดือน d_from/d_to ยังเป็น 16–31 ตามงวด: '+(p2.from==='2026-08-16'&&p2.to==='2026-08-31'));
  const prev=d.getElementById('pvPrev').textContent;
  out.push('ในรายการมีป้ายบอกว่าตัวไหนเครดิต 1 เดือน (รวมทั้งเดือน): '+prev.includes('เครดิต 1 เดือน (รวมทั้งเดือน)'));
  out.push('โน้ตในกล่องอธิบายกติกาใหม่: '+d.getElementById('modalBox').textContent.includes('จะรวมทั้งเดือนมาออกในงวด 16 – สิ้นเดือน'.replace(/\s+/g,' ').slice(0,10)));
  // 2b) งวด 1–สิ้นเดือน (ทั้งเดือน · เพิ่ม 2 ต.ค.): ทุกซัพ ทั้งเดือน เฉพาะที่ยังไม่จ่าย
  out.push('มีตัวเลือกงวด "1 – สิ้นเดือน": '+[...d.querySelectorAll('#pvPer option')].some(o=>o.value==='all'&&o.textContent.includes('1 – สิ้นเดือน')));
  d.getElementById('pvPer').value='all';
  await w.pvPreview(); await sleep(120);
  const p3=draft();
  const a3=p3.items.find(x=>x.n==='ตลาดสด'),b3=p3.items.find(x=>x.n==='บริษัทเครดิตเดือน');
  out.push('ทั้งเดือน: ตลาดสด 1,000+2,000 = 3,000 (บิลติ๊กจ่าย 900 ไม่เอามา): '+(!!a3&&a3.amt===3000));
  out.push('ทั้งเดือน: ซัพเครดิตเดือน 500+700 = 1,200: '+(!!b3&&b3.amt===1200));
  out.push('ทั้งเดือน: หัวใบ d_from/d_to = 1–31: '+(p3.from==='2026-08-01'&&p3.to==='2026-08-31'));
  out.push('ทั้งเดือน: พรีวิวบอกว่าหักบิลติ๊กจ่ายแล้ว 900: '+d.getElementById('pvPrev').textContent.includes('หักบิลติ๊กจ่ายแล้วออก ฿900'));
  // 2c) กด "จ่ายไปแล้ว" ของตลาดสด → กางรายการบิลที่จ่ายแล้ว (วันที่ · ยอด)
  const pb=[...d.querySelectorAll('#pvPrev button.pvpaid')].find(b=>b.textContent.includes('900'));
  out.push('มีปุ่ม "จ่ายไปแล้ว ฿900" ที่แถวตลาดสด: '+!!pb);
  if(pb){ pb.click(); await sleep(30); }
  const pl=d.getElementById('pvPaid1');
  out.push('กดแล้วกางรายการ: 21 ส.ค. 2569 · ฿900.00 · 1 ใบ: '+(!!pl&&pl.style.display!=='none'&&pl.textContent.includes('21 ส.ค. 2569')&&pl.textContent.includes('฿900.00')&&pl.textContent.includes('1 ใบ')));
  if(pb){ pb.click(); await sleep(30); }
  out.push('กดอีกครั้งพับเก็บ: '+(!!pl&&pl.style.display==='none'));
  out.push('ซัพเครดิตเดือนไม่มีบิลจ่ายแล้ว → ไม่มีปุ่ม: '+!d.getElementById('pvPaid2'));
  d.getElementById('pvPer').value='2'; await w.pvPreview(); await sleep(120); // กลับมางวดสิ้นเดือนให้ข้อ 3 เหมือนเดิม
  // 3) บันทึก PV → ยอดที่ส่งขึ้นต้องตรงกับพรีวิว
  d.getElementById('pvDate').value='2026-09-05';
  await w.pvSave(); await sleep(150);
  const it=posts.find(x=>x.t==='items');
  const hd=posts.find(x=>x.t==='pv');
  out.push('บันทึก PV: หัวใบ 16–31 + รายการ 2 ราย ยอด 2,000 / 1,200: '
    +(!!hd&&hd.rows.d_from==='2026-08-16'&&hd.rows.d_to==='2026-08-31'&&!!it&&it.rows.length===2
      &&it.rows.some(r=>r.supplier_id===1&&r.amount===2000)&&it.rows.some(r=>r.supplier_id===2&&r.amount===1200)));
  // 3b) เปิดใบ PV (4 ต.ค.): หัวคอลัมน์บอกชัดว่ายอด = ยอดโอน (รวม VAT) + มีคอลัมน์ก่อน VAT ในใบ VAT
  await w.pvOpen(77); await sleep(120);
  let mb=d.getElementById('modalBox'); let ths=[...mb.querySelectorAll('table tr:first-child th')].map(t=>t.textContent.trim());
  out.push('ใบ VAT: หัวคอลัมน์ = ซัพ · ก่อน VAT · VAT · ยอดโอน (รวม VAT) · ตั้งจ่าย · สำเร็จ: '+(JSON.stringify(ths)===JSON.stringify(['ซัพพลายเออร์','ก่อน VAT','VAT','ยอดโอน (รวม VAT)','ตั้งจ่าย','สำเร็จ'])));
  const r1=[...mb.querySelectorAll('table tr')].find(tr=>tr.textContent.includes('ตลาดสด'));
  const cells=r1?[...r1.querySelectorAll('td.n')].map(t=>t.textContent.trim()):[];
  out.push('แถวตลาดสด: ก่อน VAT 2,000.00 · VAT 140.00 · ยอดโอน 2,140.00: '+(JSON.stringify(cells)===JSON.stringify(['2,000.00','140.00','2,140.00'])));
  const totRow=mb.querySelector('tr.tot'); const tc=totRow?[...totRow.querySelectorAll('td.n')].map(t=>t.textContent.trim()):[];
  out.push('แถวรวม: 3,000.00 · 210.00 · 3,210.00: '+(JSON.stringify(tc)===JSON.stringify(['3,000.00','210.00','3,210.00'])));
  w.closeModal();
  await w.pvOpen(78); await sleep(120);
  mb=d.getElementById('modalBox'); ths=[...mb.querySelectorAll('table tr:first-child th')].map(t=>t.textContent.trim());
  out.push('ใบ NON-VAT: หัวคอลัมน์ = ซัพ · ยอดโอน · ตั้งจ่าย · สำเร็จ (ไม่มีคอลัมน์ VAT): '+(JSON.stringify(ths)===JSON.stringify(['ซัพพลายเออร์','ยอดโอน','ตั้งจ่าย','สำเร็จ'])));
  // ใบพิมพ์ใช้หัวเดียวกัน
  w.closeModal(); await w.pvOpen(77); await sleep(120);
  w.pvPrint({id:77,branch:'JJRD',pv_no:'JJRD-05092026V',pv_date:'2026-09-05',d_from:'2026-08-16',d_to:'2026-08-31',vat_type:'VAT'});
  const pa=d.getElementById('printArea').textContent;
  out.push('ใบพิมพ์: มีหัว ก่อน VAT / ยอดโอน (รวม VAT) และยอด 2,000.00 · 2,140.00: '+(pa.includes('ก่อน VAT')&&pa.includes('ยอดโอน (รวม VAT)')&&pa.includes('2,000.00')&&pa.includes('2,140.00')));
  w.closeModal();
  // 4) ตั้งค่าซัพ: มีช่องเลือกรอบทำ PV และค่าเดิมถูกเลือกไว้
  w.supModal(2); await sleep(60);
  const sel=d.getElementById('spCycle');
  out.push('หน้าตั้งค่าซัพ: มีช่อง "รอบทำ PV" และซัพนี้ถูกตั้งเป็นเครดิต 1 เดือน: '
    +(!!sel&&sel.value==='monthly'&&sel.textContent.includes('เครดิต 1 เดือน')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
