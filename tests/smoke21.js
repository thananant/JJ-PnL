const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const dels=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method==='GET'&&url.includes('pnl_suppliers'))return T([
        {id:1,name:'ActiveA',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
        {id:2,name:'DeadNoData',category:'อาหาร',active:false,sort:2,vat_type:'VAT'},
        {id:3,name:'DeadWithData',category:'อาหาร',active:false,sort:3,vat_type:'VAT'},
        {id:4,name:'ActiveB',category:'อาหาร',active:true,sort:4,vat_type:'VAT'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('supplier_id=eq.3'))return T([{d:'2026-07-01'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([]);
      if(method==='GET'&&url.includes('pnl_pv_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.__msgs=[]; w.confirm=m=>{w.__msgs.push(m);return true;};
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,250));
  const names=[...d.querySelectorAll('#view-set .card:first-child tr td .b.sm')].map(x=>x.textContent);
  out.push('order: '+names.join(' → ')+' (active ก่อน)');
  out.push('divider: '+[...d.querySelectorAll('#view-set tr.cat')].some(t=>t.textContent.includes('เลิกใช้แล้ว')));
  const hardBtns=[...d.querySelectorAll('#view-set button')].filter(b=>b.textContent==='ลบถาวร');
  out.push('ลบถาวร btns: '+hardBtns.length+' (คาด 2 เฉพาะ inactive)');
  // ลบถาวรตัวไม่มีประวัติ -> confirm เดียว, DELETE supplier อย่างเดียว
  await w.supDelHard(2);
  await new Promise(r=>setTimeout(r,150));
  out.push('no-data: confirms='+w.__msgs.length+' dels='+JSON.stringify(dels));
  // ลบถาวรตัวมีประวัติ -> confirm 2 ชั้น + ลบลูกก่อน
  w.__msgs.length=0; dels.length=0;
  await w.supDelHard(3);
  await new Promise(r=>setTimeout(r,150));
  out.push('with-data: confirms='+w.__msgs.length+' (คาด 2) dels='+JSON.stringify(dels));
  out.push('warn mentions history: '+w.__msgs[0].includes('ประวัติ'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
