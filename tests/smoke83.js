// smoke83: หน้าใช้จริง — แถบเตือน "บิลวันนับล่าสุดยังไม่ลง" + ค่าติดลบทาแดง ⚠
// นับ 25=5, 26=9 · ไม่มีบิลเลย -> ใช้จริง 5+0-9 = -4 (แดง ⚠) + แถบ ⏳ ขึ้น
// เคสสอง: มีบิลวันที่ 26 -> แถบหาย
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
const prods=[{id:'p1',branch_id:SB,name:'กุ้งเด้ง',unit:'โล',sup:'ตลาด',deleted_at:null}];
const smap=[{id:1,branch:'JJRD',product_id:'p1',product_name:'กุ้งเด้ง',pnl_item:'กุ้งเด้ง',stock_unit:'โล',factor:1,active:true}];
const counts=[
 {id:'c1',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-25',qty:5,unit:'โล'},
 {id:'c2',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-26',qty:9,unit:'โล'}];
let abills=[];
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
      if(url.includes('pnl_income_daily'))return T([{branch:'JJRD',d:'2026-08-25',sales_pos_am:50000,sales_pos_pm:0}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('actual')"); await sleep(700);
  const v=d.getElementById('view-actual');
  out.push('แถบ ⏳ บิลวันที่ 26 ยังไม่ลง ขึ้น: '+v.textContent.includes('ยังไม่ถูกลงในระบบ'));
  out.push('ใช้จริง -4 ทาแดง + ⚠: '+(v.innerHTML.includes('-4')&&v.innerHTML.includes('⚠')&&/color:var\(--red\)[^>]*>-4/.test(v.innerHTML)));
  // ลงบิลวันที่ 26 แล้ว -> แถบหาย + เลขกลับเป็นบวก
  abills=[{branch:'JJRD',d:'2026-08-26',item:'กุ้งเด้ง',unit:'โล',qty:10}];
  await w.eval("S.cache={}"); await w.eval("show('actual')"); await sleep(700);
  const v2=d.getElementById('view-actual');
  out.push('มีบิลแล้ว: แถบหาย: '+(!v2.textContent.includes('ยังไม่ถูกลงในระบบ')));
  out.push('ใช้จริงกลับเป็น 6 (5+10-9): '+v2.textContent.includes('6'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
