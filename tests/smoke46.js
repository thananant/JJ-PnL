const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08'))return T([
        {branch:'JJRD',d:'2026-08-05',supplier_id:1,amount:12500,paid:false},
        {branch:'JJRD',d:'2026-08-05',supplier_id:2,amount:32700,paid:false},
        {branch:'JJRD',d:'2026-08-09',supplier_id:1,amount:850,paid:true},
        {branch:'JJRD',d:'2026-08-12',supplier_id:2,amount:1250000,paid:false}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,350));
  const grid=d.querySelector('#view-exp .calgrid');
  out.push('calgrid.amt (ใหญ่ขึ้น): '+grid.classList.contains('amt'));
  const b5=grid.querySelector('button[data-d="5"]');
  out.push('วันที่ 5 รวม 45.2k: '+(b5.textContent.includes('45.2k')&&b5.classList.contains('hasamt')));
  out.push('วันที่ 9 = 850: '+grid.querySelector('button[data-d="9"]').textContent.includes('850'));
  out.push('วันที่ 12 = 1.25M: '+grid.querySelector('button[data-d="12"]').textContent.includes('1.25M'));
  out.push('วันว่างไม่มีตัวเลข: '+!grid.querySelector('button[data-d="3"]').querySelector('.ca'));
  // ปฏิทินหน้ารายรับต้องไม่เปลี่ยน (ไม่มี amt)
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,300));
  out.push('income cal ไม่มี amt: '+!d.querySelector('#view-income .calgrid').classList.contains('amt'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
