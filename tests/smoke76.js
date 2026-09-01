// smoke76: แท็บ "ใช้จริง (สต๊อก)" — อ่าน stock_counts ของระบบนับเดิม + บิล P&L
// จับคู่สาขาตามชื่อ · ผูกชื่อครั้งแรก (เดา + ตัวคูณหน่วย) · ใช้จริง = นับก่อน + ซื้อเข้า − นับหลัง จับคู่ยอดขายคืนที่ขาย
// หมูสามชั้นก้อน: 22→23: 50+20−40=30 (ขาย 30,000 → 10.00/หมื่น) · 23→24: 40+30−55=15 (20,000 → 7.50) · 24→25: 55−30=25 (25,000 → 10.00)
//   รวมเดือน 70 / 75,000 → เฉลี่ย 9.33/หมื่น · ช่วงล่าสุด +7% → chip กลาง
// น้ำแข็งหลอด (นับเป็นถุง บิลเป็นกระสอบ ×4): 24→25: 10+2×4−6=12 (25,000 → 4.80)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
let mapMissing=true, permDenied=true, rlsEmpty=false;
const mapRows=[]; const posts=[]; const dels=[];
const branches=[{id:1,name:'สาขารัชดา'},{id:2,name:'สาขาลาดพร้าว'}]; // ตารางของระบบเงินเดือน id คนละชุด — ถ้าแอพหลงใช้ จะกรองสินค้าไม่เจอ
const products=[
  {id:'p1',branch_id:'b1',name:'หมูสามชั้นก้อน',unit:'โล',sup:'สมายมีท',cat_label:'สไลด์',cat_key:'z6',sort:1,deleted_at:null},
  {id:'p2',branch_id:'b1',name:'น้ำแข็งหลอด',unit:'ถุง',sup:'โรงน้ำแข็ง',cat_label:'น้ำ',cat_key:'z9',sort:2,deleted_at:null},
  {id:'p4',branch_id:'b1',name:'ถ้วยน้ำจิ้ม',unit:'ใบ',sup:'แพ็คเกจ',cat_label:'ของใช้',cat_key:'z8',sort:3,deleted_at:null},
  {id:'p5',branch_id:'b1',name:'ช้อนพลาสติก',unit:'แพ็ค',sup:'แพ็คเกจ',cat_label:'ของใช้',cat_key:'z8',sort:4,deleted_at:null},
  {id:'p3',branch_id:'b2',name:'ผักชี',unit:'โล',sup:'สี่มุมเมือง',cat_label:'ผัก',cat_key:'z5',sort:1,deleted_at:null},
  {id:'p1L',branch_id:'b2',name:'หมูสามชั้นก้อน',unit:'โล',sup:'สมายมีท',cat_label:'สไลด์',cat_key:'z6',sort:5,deleted_at:null},
  {id:'p2L',branch_id:'b2',name:'น้ำแข็งหลอด',unit:'กระป๋อง',sup:'โรงน้ำแข็ง',cat_label:'น้ำ',cat_key:'z9',sort:6,deleted_at:null},
  {id:'p6L',branch_id:'b2',name:'เกลือ',unit:'ถุง',sup:'แม็คโคร',cat_label:'ของแห้ง',cat_key:'z7',sort:7,deleted_at:null},
];
const SC=(pid,d,qty,oos)=>({branch_id:'b1',branch_name:'สาขารัชดา',count_date:d,product_id:pid,qty,out_of_stock:!!oos,created_at:d+'T10:01:00+00:00'});
const stockCounts=[SC('p1','2026-07-28',999), // ก่อนวันตัด 31 ก.ค. — ต้องไม่ถูกดึงมาคิดเลย
                   SC('p1','2026-08-22',50),SC('p1','2026-08-23',40),SC('p1','2026-08-24',55),SC('p1','2026-08-25',30),
                   SC('p2','2026-08-24',10),SC('p2','2026-08-25',6),
                   SC('p3','2026-08-24',99),
                   {branch_id:'b2',branch_name:'สาขาลาดพร้าว',count_date:'2026-08-24',product_id:'p1L',qty:40,out_of_stock:false,created_at:'2026-08-24T10:01:00+00:00'}];
const bills=[{branch:'JJRD',d:'2026-08-23',item:'หมูสามชั้น',qty:20},{branch:'JJRD',d:'2026-08-24',item:'หมูสามชั้น',qty:30},
             {branch:'JJRD',d:'2026-08-25',item:'น้ำแข็ง',qty:2}];
const incRow=(d,amt)=>({d,sales_pos_am:amt,sales_pos_pm:0});
const incRows=[incRow('2026-08-22',30000),incRow('2026-08-23',20000),incRow('2026-08-24',25000)];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_stkbind_open',JSON.stringify(true));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(method==='POST'&&url.includes('pnl_stock_map')){const r=JSON.parse(opt.body);posts.push(r);r.forEach(x=>mapRows.push({id:mapRows.length+1,...x}));return T([]);}
      if(method==='DELETE'&&url.includes('pnl_stock_map')){dels.push(url.split('rest/v1/')[1]);
        const pm=url.match(/product_id=eq\.([^&]+)/);
        if(pm){for(let i=mapRows.length-1;i>=0;i--)if(mapRows[i].product_id===decodeURIComponent(pm[1]))mapRows.splice(i,1);}
        else {for(let i=mapRows.length-1;i>=0;i--)if(!mapRows[i].active)mapRows.splice(i,1);}
        return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('pnl_stock_map')){ if(mapMissing)return {ok:false,status:404,text:async()=>'relation does not exist',headers:{get:()=>null}}; return T(mapRows); }
      if(permDenied&&(url.includes('products')||url.includes('stock_counts')))return {ok:false,status:401,text:async()=>JSON.stringify({code:'42501',message:'permission denied for table products'}),headers:{get:()=>null}};
      if(rlsEmpty&&(url.includes('products')||url.includes('stock_counts')))return T([]); // RLS กรองเหลือ 0 แถวแบบเงียบ
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('branches'))return T(branches);
      if(url.includes('products'))return T(products);
      if(url.includes('stock_counts')){ w.__stkUrl=url; const mm=url.match(/count_date=gte\.([0-9-]+)/); const g=mm?mm[1]:'0000-00-00'; return T(stockCounts.filter(c=>c.count_date>=g)); }
      if(url.includes('pnl_sup_items'))return T([{item:'หมูสามชั้น'},{item:'น้ำแข็ง'},{item:'ข้าวสวย'}]);
      if(url.includes('pnl_bill_items'))return T(bills);
      if(url.includes('pnl_income_daily'))return T(incRows);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450);
  // -1) สิทธิ์อ่านถูกปฏิเสธ (42501) → ขึ้นชื่อไฟล์ stockread + ไม่เด้ง toast "บันทึกไม่สำเร็จ" หลอก
  await w.eval("show('actual')"); await sleep(450);
  out.push('สิทธิ์ไม่พอ: ขึ้นชื่อไฟล์ jjmk_pnl_stockread.sql: '+d.getElementById('view-actual').textContent.includes('jjmk_pnl_stockread.sql'));
  out.push('อ่านเงียบ ไม่เด้ง toast บันทึกไม่สำเร็จ: '+(!d.getElementById('toast').textContent.includes('บันทึกไม่สำเร็จ')));
  permDenied=false;
  // -0.5) GRANT ผ่านแต่ RLS กรองเหลือ 0 → ชี้ไปที่ stockread2
  rlsEmpty=true; mapMissing=false;
  await w.eval("show('actual')"); await sleep(450);
  out.push('RLS กรองเงียบ (0 ตัว): ขึ้นชื่อไฟล์ jjmk_pnl_stockread2.sql: '+d.getElementById('view-actual').textContent.includes('jjmk_pnl_stockread2.sql'));
  rlsEmpty=false; mapMissing=true;
  // 0) ยังไม่รัน SQL → บอกชัด
  await w.eval("show('actual')"); await sleep(450);
  out.push('ยังไม่รัน SQL: ขึ้นชื่อไฟล์ jjmk_pnl_stockmap.sql: '+d.getElementById('view-actual').textContent.includes('jjmk_pnl_stockmap.sql'));
  mapMissing=false;
  await w.eval("show('actual')"); await sleep(450);
  let t=d.getElementById('view-actual').textContent;
  // 1) แผงผูกชื่อ: เฉพาะสินค้าสาขารัชดา (ไม่มีผักชีของลาดพร้าว) + เดาถูก
  out.push('แผงผูก 4 ตัวของรัชดา (ไม่มีผักชี): '+(t.includes('เหลือ 4 ตัว')&&t.includes('หมูสามชั้นก้อน')&&t.includes('น้ำแข็งหลอด')&&t.includes('ถ้วยน้ำจิ้ม')&&t.includes('ช้อนพลาสติก')&&!t.includes('ผักชี')));
  out.push('เดา: ช่องพิมพ์ค้นหา (datalist) ตั้งค่าเดารอ + ติ๊กเฉพาะตัวที่เดาได้: '+(d.getElementById('bsel0').value==='หมูสามชั้น'&&d.getElementById('bsel0').getAttribute('list')==='stkNamesDL'&&d.getElementById('bsel1').value==='น้ำแข็ง'&&d.querySelectorAll('.stkck:checked').length===2&&d.getElementById('stkBulkBtn').textContent.includes('(2)')));
  // กรองรายการ: พิมพ์ "น้ำแข็ง" เหลือแถวเดียว
  w.stkBindFilter('น้ำแข็ง');
  out.push('กรอง "น้ำแข็ง": โชว์เฉพาะแถวน้ำแข็ง: '+([...d.querySelectorAll('.bindrow')].filter(r=>r.style.display!=='none').length===1));
  w.stkBindFilter('');
  // 2)+3) ผูกทีเดียวสองตัว (หมู f=1 · น้ำแข็ง f=4) — POST เดียว
  d.getElementById('bnd1').querySelector('input[id^=bf]').value='4';
  await w.stkBindSel(); await sleep(450);
  out.push('ผูกทีเดียว: POST เดียว 3 แถว = หมู f=1 · น้ำแข็ง f=4 + กระจกหมูลาดพร้าว (p1L หน่วยตรง): '+(posts.length===1&&posts[0].length===3&&posts[0][0].product_id==='p1'&&posts[0][1].product_id==='p2'&&posts[0][1].factor===4&&posts[0][2].product_id==='p1L'&&posts[0][2].branch==='JJLP'&&posts[0][2].pnl_item==='หมูสามชั้น'&&posts[0][2].factor===1));
  out.push('น้ำแข็งลาดพร้าว (p2L) หน่วยไม่ตรง = ไม่ถูกผูกกระจก: '+(!mapRows.some(r=>r.product_id==='p2L')));
  // ชื่อที่ผูกแล้วหายจากลิสต์ให้เลือก (datalist) — ชื่อที่ยังว่างยังอยู่
  const dlOpts=[...d.querySelectorAll('#stkNamesDL option')].map(o=>o.value);
  out.push('ชื่อที่ผูกแล้ว (หมูสามชั้น/น้ำแข็ง) หายจากลิสต์ · ข้าวสวยยังอยู่: '+(!dlOpts.includes('หมูสามชั้น')&&!dlOpts.includes('น้ำแข็ง')&&dlOpts.includes('ข้าวสวย')));
  t=d.getElementById('view-actual').textContent;
  const rows=w.eval('S._stkRows');
  const pork=rows.find(r=>r.pr.id==='p1'), ice=rows.find(r=>r.pr.id==='p2');
  // 4) เลขใช้จริงหมู: 3 ช่วง [30,15,25] · ขาย [30000,20000,25000] · เฉลี่ย 9.33/หมื่น
  out.push('ตัดข้อมูลก่อน 31 ก.ค.: ดึง stock_counts ตั้งแต่ gte.2026-07-31 (แถว 28 ก.ค. ไม่เข้ามาปน): '+(String(w.__stkUrl).includes('count_date=gte.2026-07-31')));
  out.push('หมู: ช่วง [30,15,25] ขายคู่ [30000,20000,25000]: '+(pork.per.length===3&&pork.per[0].use===30&&pork.per[1].use===15&&pork.per[2].use===25&&pork.per[0].sale===30000&&pork.per[1].sale===20000&&pork.per[2].sale===25000));
  out.push('หมู: ซื้อเข้าเข้าช่วงถูกวัน (23→ช่วงแรก 20, 24→ช่วงสอง 30): '+(pork.per[0].buy===20&&pork.per[1].buy===30&&pork.per[2].buy===0));
  out.push('หมู: รวม 70 / 75,000 → เฉลี่ย 9.33/หมื่น · ช่วงล่าสุด 10.00: '+(pork.totU===70&&pork.totS===75000&&Math.abs(pork.avg10-9.3333)<0.01&&Math.abs(pork.last.p10-10)<0.001));
  out.push('น้ำแข็ง: ตัวคูณ 4 → ใช้ 10+8−6=12 · 4.80/หมื่น · คงเหลือ 6: '+(ice.per.length===1&&ice.per[0].buy===8&&ice.per[0].use===12&&Math.abs(ice.per[0].p10-4.8)<0.001&&ice.lastQty===6));
  // ผูกเดี่ยวแบบพิมพ์เอง: ถ้วยน้ำจิ้ม → พิมพ์ "ข้าวสวย" (ชื่อที่มีจริง) ผ่าน / ชื่อมั่วโดนกัน
  const bndCup=[...d.querySelectorAll('.bindrow')].find(r=>r.textContent.includes('ถ้วยน้ำจิ้ม'));
  const cupIdx=bndCup.id.replace('bnd','');
  bndCup.querySelector('.bsel').value='ชื่อมั่วๆ';
  await w.stkBind(cupIdx,'p4'); await sleep(150);
  out.push('ชื่อไม่ตรงบิล: โดนกัน + toast บอก: '+(d.getElementById('toast').textContent.includes('ไม่ตรงกับชื่อในบิล')&&!mapRows.some(r=>r.product_id==='p4')));
  // ผูกยกชุดโดยตั้งชื่อซ้ำกัน 2 แถว (ถ้วยน้ำจิ้ม + ช้อนพลาสติก = "ข้าวสวย") -> ผูกได้ตัวแรกตัวเดียว
  bndCup.querySelector('.bsel').value='ข้าวสวย';
  const bndSpoon=[...d.querySelectorAll('.bindrow')].find(r=>r.textContent.includes('ช้อนพลาสติก'));
  bndSpoon.querySelector('.bsel').value='ข้าวสวย';
  d.querySelectorAll('.stkck').forEach(c=>c.checked=false);
  bndCup.querySelector('.stkck').checked=true; bndSpoon.querySelector('.stkck').checked=true;
  posts.length=0;
  await w.stkBindSel(); await sleep(450);
  out.push('ชื่อซ้ำในชุดเดียว: ผูกแค่ตัวแรก (p4=ข้าวสวย) + ข้ามอีกตัว: '+(posts.length===1&&posts[0].length===1&&posts[0][0].product_id==='p4'&&mapRows.some(r=>r.product_id==='p4'&&r.pnl_item==='ข้าวสวย')&&!mapRows.some(r=>r.product_id==='p5')&&d.getElementById('toast').textContent.includes('ข้าม 1 ตัว')));
  // เลิกผูก: เปิดโมดัลหมู → ปุ่มเลิกผูก → p1 กลับไปอยู่ลิสต์ผูก
  const rows2=w.eval('S._stkRows'); const pi2=rows2.findIndex(r2=>r2.pr.id==='p1');
  w.stkDetail(pi2);
  out.push('โมดัลมีปุ่มเลิกผูก: '+d.getElementById('modalBox').textContent.includes('เลิกผูก'));
  await w.stkUnbind('p1'); await sleep(450);
  out.push('เลิกผูกหมู: DELETE product_id=eq.p1 + กลับมาอยู่ลิสต์ผูก: '+(dels.some(x=>x.includes('product_id=eq.p1'))&&!mapRows.some(r=>r.product_id==='p1')&&d.getElementById('view-actual').textContent.includes('หมูสามชั้นก้อน')));
  // ผูกหมูกลับ (ให้เช็คต่อท้ายเดิมได้)
  const bndPork=[...d.querySelectorAll('.bindrow')].find(r2=>r2.textContent.includes('หมูสามชั้นก้อน'));
  await w.stkBind(bndPork.id.replace('bnd',''),'p1'); await sleep(400);
  out.push('ตารางโชว์ chip เทียบ (หมู +7% = โซนกลาง): '+(!!d.querySelector('#view-actual .chip.mid')&&t.includes('คงเหลือล่าสุด')));
  // 5) โมดัลไทม์ไลน์
  const pi=rows.indexOf(pork); w.stkDetail(pi);
  const mb=d.getElementById('modalBox').textContent;
  out.push('โมดัลหมู: แถวช่วง 3 แถว + รวมเดือน 70 · 75,000 · 9.33: '+(mb.includes('หมูสามชั้นก้อน')&&mb.includes('รวมเดือน')&&mb.includes('70')&&mb.includes('75,000')&&mb.includes('9.33')));
  w.closeModal();
  // 6) ข้าม "ช้อนพลาสติก" → แผงหาย มีลิงก์เอากลับ
  await w.stkSkip('p5'); await sleep(450);
  t=d.getElementById('view-actual').textContent;
  out.push('ข้ามแล้ว: แผงผูกหาย + "ข้ามไว้ 1 ตัว": '+(!t.includes('เหลือ 1 ตัว')&&t.includes('ข้ามไว้ 1 ตัว')));
  await w.stkUnskipAll(); await sleep(450);
  t=d.getElementById('view-actual').textContent;
  out.push('เอากลับ: DELETE active=false + แผงผูกกลับมา: '+(dels.some(x=>x.includes('active=eq.false'))&&t.includes('เหลือ 1 ตัว')));
  // 6.5) เก็บตกข้ามสาขา: รัชดาเคยผูก "เกลือ" ไว้ (ก่อนมีระบบกระจก) -> เปิดลาดพร้าว มีลิงก์ผูกตาม
  mapRows.push({id:990,branch:'JJRD',product_id:'p6',product_name:'เกลือ',pnl_item:'เกลือ ปรุงทิพย์',bill_unit:'',stock_unit:'ถุง',factor:2,active:true});
  w.eval("S.br='JJLP'"); await w.eval("show('actual')"); await sleep(450);
  t=d.getElementById('view-actual').textContent;
  out.push('ลาดพร้าว: ลิงก์ "ผูกตามอีกสาขา" ขึ้น (เกลือ 1 ตัว): '+(t.includes('อีกสาขาผูกชื่อพวกนี้ไว้แล้ว 1 ตัว')));
  posts.length=0;
  await w.stkCopyFromOther(); await sleep(450);
  out.push('ผูกตาม: POST p6L branch JJLP ชื่อ+ตัวคูณตามรัชดา (เกลือ ปรุงทิพย์ f=2): '+(posts.length===1&&posts[0].length===1&&posts[0][0].product_id==='p6L'&&posts[0][0].branch==='JJLP'&&posts[0][0].pnl_item==='เกลือ ปรุงทิพย์'&&posts[0][0].factor===2));
  w.eval("S.br='JJRD'");
  // 7) โหมดทุกสาขา = บอกให้เลือกสาขา
  w.eval("S.br='ALL'"); await w.eval("show('actual')"); await sleep(300);
  out.push('ALL: บอกให้เลือกสาขาก่อน: '+d.getElementById('view-actual').textContent.includes('เลือก'));
  // 8) สาขาที่ไม่มีระบบนับ (เช่น ออฟฟิศ) = บอกตรง ๆ ไม่เดา id มั่ว
  w.eval("S.br='JJOF'"); await w.eval("show('actual')"); await sleep(400);
  out.push('สาขาอื่น (ออฟฟิศ): บอกว่าไม่มีระบบนับสต๊อก: '+d.getElementById('view-actual').textContent.includes('ไม่มีระบบนับสต๊อก'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
