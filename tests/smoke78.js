// smoke78: เตือนสินค้าใหม่/ยังไม่ผูกจากระบบนับ — ป้ายแดงที่แถบข้าง + แถบบนแดชบอร์ด
// JJRD (b19f0a17b4472) มีสินค้า 3 ตัว ผูกแล้ว 1 → เตือน 2 · ผูกเพิ่ม 1 → เหลือ 1 · สาขา ALL → ไม่มีป้าย
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const products=[
  {id:'q1',branch_id:'b19f0a17b4472',name:'หมูเด้ง',unit:'โล',deleted_at:null},
  {id:'q2',branch_id:'b19f0a17b4472',name:'เต้าหู้ไข่',unit:'แพ็ค',deleted_at:null},
  {id:'q3',branch_id:'b19f0a17b4472',name:'สาหร่าย',unit:'ห่อ',deleted_at:null},
  {id:'qL',branch_id:'b19f0a17b448212',name:'หมูเด้ง',unit:'โล',deleted_at:null},
];
const mapRows=[{id:1,branch:'JJRD',product_id:'q1',product_name:'หมูเด้ง',pnl_item:'หมูเด้ง',stock_unit:'โล',factor:1,active:true}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(mapRows);
      if(url.includes('products'))return T(products);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    const _doc=w.document; try{ Object.defineProperty(_doc,'hidden',{get:()=>false}); Object.defineProperty(_doc,'visibilityState',{get:()=>'visible'}); }catch(e){}
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(600); // boot -> dash + stkBadge
  const btn=d.querySelector('.sb-item[data-v="actual"]');
  out.push('ป้ายแดงที่แถบข้าง = 2 (มี 3 ผูกแล้ว 1): '+(btn.querySelector('.sbadge')&&btn.querySelector('.sbadge').textContent==='2'));
  const dn=d.getElementById('stkDashNote');
  out.push('แดชบอร์ดขึ้นแถบเตือน 2 ตัว + แตะไปหน้าผูกได้: '+(!!dn&&dn.textContent.includes('ยังไม่ได้ผูกชื่อ 2 ตัว')&&dn.innerHTML.includes("show('actual')")));
  // ผูกเพิ่ม 1 ตัว (จำลอง) -> ป้ายอัปเดตเป็น 1
  mapRows.push({id:2,branch:'JJRD',product_id:'q2',product_name:'เต้าหู้ไข่',pnl_item:'เต้าหู้ไข่',stock_unit:'แพ็ค',factor:1,active:true});
  await w.stkBadge(); await sleep(150);
  out.push('ผูกเพิ่มแล้วป้ายเหลือ 1: '+(btn.querySelector('.sbadge').textContent==='1'&&dn.textContent.includes('1 ตัว')));
  // ผูกครบ -> ป้ายหาย แถบหาย
  mapRows.push({id:3,branch:'JJRD',product_id:'q3',product_name:'สาหร่าย',pnl_item:'สาหร่าย',stock_unit:'ห่อ',factor:1,active:true});
  await w.stkBadge(); await sleep(150);
  out.push('ผูกครบ: ป้ายหาย + แถบแดชหาย: '+(!btn.querySelector('.sbadge')&&dn.innerHTML===''));
  // สาขาที่ไม่มีระบบนับ (ALL) -> ไม่มีป้าย
  mapRows.pop(); // เหลือไม่ผูก 1 ตัว
  w.eval("S.br='ALL'"); await w.stkBadge(); await sleep(150);
  out.push('สาขา ALL: ไม่ขึ้นป้าย: '+(!btn.querySelector('.sbadge')));
  w.eval("S.br='JJRD'"); await w.stkBadge(); await sleep(150);
  out.push('กลับ JJRD: ป้ายกลับมา 1: '+(btn.querySelector('.sbadge')&&btn.querySelector('.sbadge').textContent==='1'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
