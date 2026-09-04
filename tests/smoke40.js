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
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ประวัติ: 20 ส.ค. ราคา 150 · 5 ส.ค. ราคา 120
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))return T([
        {item:'หมูสามชั้น',unit:'กก.',price:150,qty:10,d:'2026-08-20',sort:0},
        {item:'หมูสามชั้น',unit:'กก.',price:120,qty:8,d:'2026-08-05',sort:0}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
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
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  // วันนี้ (21) -> เทมเพลต+ราคา จากบิล 20 = 150
  out.push('today template from 20th: '+w.eval("S.dtLines[0].price===150")+' note: '+d.getElementById('dtTplNote').textContent.includes('20 ส.ค.'));
  // ลงย้อนหลังวันที่ 10 -> ต้องได้ราคาจากบิลก่อนวันที่ 10 = 5 ส.ค. (120) ไม่ใช่ 150
  w.eval("S.dtDate='2026-08-10'");
  await w.dtLoad();
  await new Promise(r=>setTimeout(r,150));
  out.push('backdate 10th template from 5th: '+w.eval("S.dtLines[0].price===120")+' note 5 ส.ค.: '+d.getElementById('dtTplNote').textContent.includes('5 ส.ค.'));
  // autofill ตอนพิมพ์ชื่อ ก็ต้องอิงวันที่ (10 -> 120)
  w.eval("S.dtLines=[{item:'',qty:'',unit:'',price:''}]"); w.renderDtLines();
  w.dtEdit(0,'item','หมูสามชั้น');
  out.push('autofill backdate = 120: '+w.eval("S.dtLines[0].price===120"));
  // ก่อนบิลแรกสุด (3 ส.ค.) -> ไม่มีราคา ไม่มีเทมเพลต
  w.eval("S.dtDate='2026-08-03'");
  await w.dtLoad();
  await new Promise(r=>setTimeout(r,150));
  out.push('before-all: blank line no price: '+w.eval("S.dtLines.length===1&&S.dtLines[0].item===''"));
  w.dtEdit(0,'item','หมูสามชั้น');
  out.push('no future price leak: '+w.eval("S.dtLines[0].price===''"));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
