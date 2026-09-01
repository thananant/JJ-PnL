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
      if(method==='POST'&&url.includes('pnl_sup_items')){posts.push({cat:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'||method==='DELETE')return T([]);
      if(url.includes('pnl_suppliers'))return T([
        {id:5,name:'เสี่ยบิ๊ก',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // catalog มี "กุ้งขาว" อยู่แล้วตัวเดียว
      if(method==='GET'&&url.includes('pnl_sup_items')&&url.includes('supplier_id=eq.5'))
        return T(w.__emptyCat?[]:[{item:'กุ้งขาว',unit:'กก.',sort:0}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))
        return T([{item:'กุ้งขาว',unit:'กก.',price:150,qty:30,d:'2026-08-15',sort:0},
                  {item:'กุ้งก้ามกราม',unit:'กก.',price:190,qty:30,d:'2026-08-15',sort:1}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
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
  // 1) ลงบิล: กุ้งขาว(มีใน catalog) + กุ้งก้ามกราม(ใหม่) -> ต้อง ins เฉพาะก้ามกราม
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(5);
  await new Promise(r=>setTimeout(r,200));
  w.eval("S.dtLines=[{item:'กุ้งขาว',qty:30,unit:'กก.',price:150},{item:'กุ้งก้ามกราม',qty:30,unit:'กก.',price:190}]");
  await w.dtSave();
  await new Promise(r=>setTimeout(r,200));
  const cats=posts.filter(p=>p.cat);
  out.push('auto-add to catalog: '+cats.length+' call, items='+JSON.stringify(cats[0].cat.map(x=>x.item))+' (คาดเฉพาะ กุ้งก้ามกราม)');
  out.push('sort ต่อท้าย: '+(cats[0].cat[0].sort===1));
  // 2) modal เปิดตอน catalog ว่าง -> auto-pull จากบิลเก่า
  w.__emptyCat=true; posts.length=0;
  await w.supItemsModal(5);
  await new Promise(r=>setTimeout(r,150));
  out.push('auto-pull rows: '+w.eval('S._si.rows.length')+' = '+w.eval("S._si.rows.map(r=>r.item).join('/')"));
  out.push('note shown: '+d.body.textContent.includes('ดึงรายการจากบิลเก่าให้อัตโนมัติแล้ว'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
