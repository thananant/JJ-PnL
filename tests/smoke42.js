const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_bill_items')){posts.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'||method==='DELETE')return T([]);
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'VatShop',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
        {id:2,name:'NoVat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // บิลเดิมของ NoVat วันนี้: โหมด inc
      const today=new Date(); const ds=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds)&&url.includes('supplier_id=eq.2'))
        return T([{item:'น้ำแข็ง',qty:10,unit:'ถุง',price:10.7,sort:0,vat_mode:'inc'}]);
      if(method==='GET'&&url.includes('pnl_bill_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_sup_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('d=eq.'))return T([]);
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
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  // 1) ซัพ VAT -> default = ex (+7%)
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  out.push('VAT sup default=ex: '+(w.eval('S.dtVat')==='ex')+' btn on: '+d.querySelector('.vch[data-vm="ex"]').classList.contains('on'));
  w.eval("S.dtLines=[{item:'หมู',qty:10,unit:'กก.',price:100}]"); w.renderDtLines();
  out.push('ex: net 1,070: '+d.getElementById('dtTot').textContent.includes('1,070.00')+' | line: '+d.getElementById('dtVatLine').textContent.trim());
  // 2) สลับ inc
  w.dtVatSet('inc');
  out.push('inc: net 1,000: '+d.getElementById('dtTot').textContent.includes('1,000.00')+' | vat in: '+d.getElementById('dtVatLine').textContent.includes('65.42'));
  // 3) save โหมด ex -> expense = 1070, rows มี vat_mode
  w.dtVatSet('ex');
  await w.dtSave();
  await new Promise(r=>setTimeout(r,200));
  const it=posts.find(p=>p.items), ex=posts.find(p=>p.exp);
  out.push('rows vat_mode=ex: '+(it.items[0].vat_mode==='ex')+' | expense amount 1070: '+(Math.abs(ex.exp[0].amount-1070)<0.01));
  // 4) โหลดบิลเดิมโหมด inc -> ปุ่ม/ยอดถูก
  posts.length=0;
  await w.dtPickSup(2);
  await new Promise(r=>setTimeout(r,250));
  out.push('load inc mode: '+(w.eval('S.dtVat')==='inc')+' net 107: '+d.getElementById('dtTot').textContent.includes('107.00'));
  // 5) ซัพ NON-VAT วันใหม่ default none — ใช้ "พรุ่งนี้" แบบคำนวณ (เดิมฝังวันที่ตายตัว พอถึงวันจริงเทสต์พังเอง)
  const tm=new Date(Date.now()+86400000); const nd=tm.getFullYear()+'-'+String(tm.getMonth()+1).padStart(2,'0')+'-'+String(tm.getDate()).padStart(2,'0');
  w.eval("S.dtDate='"+nd+"'"); await w.dtLoad(); await new Promise(r=>setTimeout(r,150));
  out.push('NoVat new day default=none: '+(w.eval('S.dtVat')==='none'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
