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
      const method=opt&&opt.method||'GET';
      if(method==='GET'&&url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT',bank:'KBANK',account_no:'111',account_name:'ฟาร์ม'},
        {id:2,name:'Siammitr',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT',bank:'SCB',account_no:'222',account_name:'สยาม'}]);
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // งวด 1-15: FarmFresh มี 2 บิล (จ่ายแล้ว 3000 / ค้าง 5000) · Siammitr จ่ายครบ 900
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('select=supplier_id,amount,paid'))return T([
        {supplier_id:1,amount:3000,paid:true},
        {supplier_id:1,amount:5000,paid:false},
        {supplier_id:2,amount:900,paid:true}]);
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
  d.querySelector('.sb-item[data-v="pv"]').click();
  await new Promise(r=>setTimeout(r,200));
  w.pvCreateModal();
  await new Promise(r=>setTimeout(r,50));
  await w.pvPreview();
  await new Promise(r=>setTimeout(r,80));
  const prev=d.getElementById('pvPrev');
  const rows=[...prev.querySelectorAll('.exrow')];
  out.push('rows: '+rows.length+' (คาด 1 — Siammitr จ่ายครบหายไป)');
  out.push('row1: '+rows[0].querySelector('.t').textContent+' amt='+rows[0].querySelector('input').value+' (คาด FarmFresh 5000)');
  out.push('note จ่ายไปแล้ว: '+rows[0].textContent.includes('จ่ายไปแล้ว ฿3,000'));
  out.push('header หักออก: '+prev.textContent.includes('หักบิลติ๊กจ่ายแล้วออก ฿3,900'));
  out.push('draft items: '+JSON.stringify(w.eval('S._pvDraft.items.map(x=>({n:x.s.name,a:x.amt}))')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
