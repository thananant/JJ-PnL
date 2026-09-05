// smoke84: หน้าใช้จริง — แผงผูกพับได้ (พับเป็นค่าตั้งต้น) + โหมดรายวัน + โหมดช่วงวันที่
// นับ: 24=10, 25=5, 26=9 · บิล: 25 = 2 โล, 26 = 10 โล (factor 1)
// ล่าสุด 25→26: 5+10-9=6 · รายวัน 26: 6 · ‹ ย้อน -> 24→25: 10+2-5=7 · ช่วง 24→26: 10+12-9=13
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const SB='b19f0a17b4472';
const prods=[
 {id:'p1',branch_id:SB,name:'กุ้งเด้ง',unit:'โล',sup:'ตลาด',deleted_at:null},
 {id:'p2',branch_id:SB,name:'ของยังไม่ผูก',unit:'ถุง',sup:'ตลาด',deleted_at:null}];
const smap=[{id:1,branch:'JJRD',product_id:'p1',product_name:'กุ้งเด้ง',pnl_item:'กุ้งเด้ง',stock_unit:'โล',factor:1,active:true}];
const counts=[
 {id:'c0',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-24',qty:10,unit:'โล'},
 {id:'c1',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-25',qty:5,unit:'โล'},
 {id:'c2',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-26',qty:9,unit:'โล'}];
const abills=[
 {branch:'JJRD',d:'2026-08-25',item:'กุ้งเด้ง',unit:'โล',qty:2},
 {branch:'JJRD',d:'2026-08-26',item:'กุ้งเด้ง',unit:'โล',qty:10}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(smap);
      if(url.includes('stock_counts'))return T(counts);
      if(url.includes('products'))return T(prods);
      if(url.includes('pnl_bill_items')&&url.includes('select=branch,d,item'))return T(abills);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T([{branch:'JJRD',d:'2026-08-24',sales_pos_am:50000,sales_pos_pm:0},{branch:'JJRD',d:'2026-08-25',sales_pos_am:50000,sales_pos_pm:0}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const useCell=()=>{const tr=[...d.querySelectorAll('#view-actual table tr')].find(r=>r.textContent.includes('กุ้งเด้ง'));return tr?[...tr.children].map(c=>c.textContent.trim()):null;};
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('actual')"); await sleep(700);
  const v=d.getElementById('view-actual');
  out.push('แผงผูกพับเป็นค่าตั้งต้น (เห็นหัว ไม่เห็นแถวผูก): '+(v.textContent.includes('ผูกชื่อ · เหลือ 1 ตัว')&&!d.querySelector('.bindrow')));
  // เปิดแผง
  await w.eval("S._stkBindOpen=true"); await w.eval("show('actual')"); await sleep(500);
  out.push('แตะแล้วแผงเปิด เห็นแถวผูก: '+(!!d.querySelector('.bindrow')));
  await w.eval("S._stkBindOpen=false");
  // โหมดล่าสุด: 6
  await w.eval("show('actual')"); await sleep(500);
  out.push('ช่วงล่าสุด ใช้จริง 6: '+(useCell()&&useCell()[2]==='6'));
  // รายวัน (ค่าตั้งต้น = วันนับล่าสุด 26): 6
  await w.stkViewSet('day'); await sleep(500);
  out.push('รายวัน (26 ส.ค.) ใช้จริง 6 + คอลัมน์นับปลายช่วง 9: '+(useCell()&&useCell()[2]==='6'&&useCell()[6].startsWith('9')));
  // ‹ ถอยวัน -> ช่วง 24→25 = 7
  await w.stkDayStep(-1); await sleep(500);
  out.push('ถอยวัน (25 ส.ค.) ใช้จริง 7: '+(useCell()&&useCell()[2]==='7'&&useCell()[1].includes('24')));
  // ช่วงวันที่ 24→26 = 13
  await w.eval("S.stkFrom='2026-08-24';S.stkTo='2026-08-26'");
  await w.stkViewSet('range'); await sleep(500);
  out.push('ช่วงวันที่ 24→26 ใช้จริง 13: '+(useCell()&&useCell()[2]==='13'));
  out.push('มีช่องเลือกวันที่ 2 ช่องในโหมดช่วง: '+(d.querySelectorAll('#view-actual input[type=date]').length===2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
