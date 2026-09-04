const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const calls=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='DELETE'&&url.includes('pnl_sup_items')){calls.push({del:1});return T([]);}
      if(method==='POST'&&url.includes('pnl_sup_items')){calls.push({cat:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:10,vat_type:'NON-VAT'},
        {id:2,name:'NoCat',category:'อาหาร',active:true,sort:20,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // catalog: ซัพ 1 มี 3 ตัว / ซัพ 2 ว่าง
      if(method==='GET'&&url.includes('pnl_sup_items')&&url.includes('supplier_id=eq.1'))
        return T([{item:'หมูสามชั้น',unit:'กก.',sort:0},{item:'หมูสันคอ',unit:'กก.',sort:1},{item:'น้ำจิ้ม',unit:'ถุง',sort:2}]);
      if(method==='GET'&&url.includes('pnl_sup_items'))return T([]);
      // history: ราคาเดิมหมูสามชั้น 139 / บิลล่าสุดของซัพ 2 (fallback)
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('supplier_id=eq.1')&&url.includes('order=d.desc'))
        return T([{item:'หมูสามชั้น',unit:'กก.',price:139,qty:10,d:'2026-08-15',sort:0}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('supplier_id=eq.2')&&url.includes('order=d.desc'))
        return T([{item:'ปลาหมึก',unit:'กก.',price:120,qty:2,d:'2026-08-14',sort:0}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
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
  // 1) ตั้งค่า: แตะชื่อ -> modal + แก้ + บันทึก
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.supItemsModal(1);
  await new Promise(r=>setTimeout(r,100));
  out.push('modal: '+d.body.textContent.includes('รายการสินค้าประจำ'));
  out.push('rows loaded: '+w.eval('S._si.rows.length')+' (คาด 3)');
  w.siAdd(); w.eval("S._si.rows[3]={item:'ผักกาด',unit:'มัด'}");
  await w.siSave();
  await new Promise(r=>setTimeout(r,100));
  const cat=calls.find(c=>c.cat);
  out.push('saved: del='+!!calls.find(c=>c.del)+' rows='+cat.cat.length+' last='+JSON.stringify(cat.cat[3]));
  // 2) รายละเอียดบิล: ซัพมี catalog -> ขึ้นครบ + ราคาจากบิลเก่า
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,250));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  out.push('lines from catalog: '+w.eval('S.dtLines.length')+' (คาด 3)');
  out.push('first: '+w.eval("S.dtLines[0].item+' '+S.dtLines[0].unit+' price='+S.dtLines[0].price+' qty=\"'+S.dtLines[0].qty+'\"'"));
  out.push('note 🧺: '+d.getElementById('dtTplNote').textContent.includes('รายการสินค้าประจำครบ 3'));
  // 3) ซัพไม่มี catalog -> fallback บิลล่าสุด
  await w.dtPickSup(2);
  await new Promise(r=>setTimeout(r,200));
  out.push('fallback lastbill: '+w.eval("S.dtLines[0].item")+' note 📌: '+d.getElementById('dtTplNote').textContent.includes('บิลล่าสุด'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
