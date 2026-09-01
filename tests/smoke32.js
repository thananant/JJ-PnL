// เช็คเส้นทาง PV: pool กรองตามช่วงงวด
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
      if((opt&&opt.method)==='POST'&&url.includes('/storage/'))return T({Key:'x'});
      if(url.includes('pnl_suppliers'))return T([{id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_expense_daily'))return T([
        {branch:'JJRD',d:'2026-08-05',supplier_id:2,amount:4000,paid:false,slip_url:null},
        {branch:'JJRD',d:'2026-08-12',supplier_id:2,amount:3000,paid:false,slip_url:null},
        {branch:'JJRD',d:'2026-08-18',supplier_id:2,amount:5000,paid:false,slip_url:null}]);
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
  await new Promise(r=>setTimeout(r,300));
  // จำลองกดจาก PV งวด 1-15
  w.pvSlipPick(2,'2026-08-01','2026-08-15',77);
  const blob=new w.Blob(['x'],{type:'image/jpeg'});
  await w.slipPicked({files:[blob],value:''});
  await new Promise(r=>setTimeout(r,120));
  const boxes=[...d.querySelectorAll('[data-abd]')].map(x=>x.dataset.abd);
  out.push('PV pool (งวด 1-15): '+boxes.join(', ')+' (คาด 05,12 — ไม่มี 18)');
  out.push('total: '+d.getElementById('asTot').textContent+' (คาด ฿7,000)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
