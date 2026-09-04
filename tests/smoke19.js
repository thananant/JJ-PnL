const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const patches=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='PATCH'&&url.includes('pnl_suppliers')){patches.push({url:url.split('rest/v1/')[1],body:JSON.parse(opt.body)});return T([]);}
      if(method==='GET'&&url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'ซัพเก่ามียอด',category:'อาหาร',active:false,sort:2,vat_type:'NON-VAT'},
        {id:3,name:'ซัพเก่าไม่มียอด',category:'อาหาร',active:false,sort:3,vat_type:'NON-VAT'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([{branch:'JJRD',d:'2026-08-05',supplier_id:2,amount:1234,paid:false}]);
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  // หน้ารายจ่าย: เดือนนี้มียอดของซัพ id 2 (ที่ inactive) -> ต้องโชว์พร้อมป้าย · id 3 ต้องไม่โชว์
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  const form=d.getElementById('expForm');
  out.push('shows FarmFresh: '+form.textContent.includes('FarmFresh'));
  out.push('shows ซัพเก่ามียอด+ป้าย: '+(form.textContent.includes('ซัพเก่ามียอด')&&form.textContent.includes('เลิกใช้แล้ว')));
  out.push('hides ซัพเก่าไม่มียอด: '+!form.textContent.includes('ซัพเก่าไม่มียอด'));
  // ตั้งค่า: ปุ่มลบ/กู้คืน
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,250));
  const setV=d.getElementById('view-set');
  const delBtn=[...setV.querySelectorAll('button')].find(b=>b.getAttribute('onclick')==='supDel(1)');
  const resBtn=[...setV.querySelectorAll('button')].find(b=>b.getAttribute('onclick')==='supRestore(2)');
  out.push('active row has ลบ: '+!!delBtn+' | inactive row has กู้คืน: '+!!resBtn);
  await w.supDel(1);
  await new Promise(r=>setTimeout(r,150));
  out.push('PATCH: '+JSON.stringify(patches[0]));
  await w.supRestore(2);
  await new Promise(r=>setTimeout(r,150));
  out.push('restore PATCH: '+JSON.stringify(patches[1]));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
