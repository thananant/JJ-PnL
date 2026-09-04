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
      if(method==='DELETE'&&url.includes('pnl_bill_items')){calls.push({del:url.split('rest/v1/')[1]});return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){calls.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){calls.push({exp:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ประวัติสินค้าของซัพ 1 (สำหรับ datalist + จำราคา)
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('supplier_id=eq.1')&&url.includes('order=d.desc'))
        return T([{item:'หมูสามชั้น',unit:'กก.',price:139,d:'2026-08-10'},{item:'หมูสันคอ',unit:'กก.',price:145,d:'2026-08-10'}]);
      // โหลดบิลวันเดิม (ว่าง)
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
      // ลิสต์เดือน
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.'))
        return T([{d:'2026-08-10',supplier_id:1,qty:10,price:139},{d:'2026-08-10',supplier_id:1,qty:2,price:145}]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('d=eq.'))return T([{amount:1500,paid:false}]);
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
  out.push('sidebar has detail: '+!!d.querySelector('.sb-item[data-v="detail"]'));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  const v=d.getElementById('view-detail');
  out.push('page rendered: '+v.textContent.includes('รายการสินค้าในบิล'));
  // เลือกซัพ FarmFresh
  await w.dtPickSup('1');
  await new Promise(r=>setTimeout(r,150));
  out.push('cur amount hint: '+d.getElementById('dtCur').textContent.includes('1,500'));
  out.push('datalist history: '+(d.getElementById('dtItemsDL').innerHTML.includes('หมูสามชั้น')));
  // พิมพ์ชื่อที่เคยลง -> เติมหน่วย+ราคาเดิม
  w.dtEdit(0,'item','หมูสามชั้น');
  out.push('auto unit/price: unit='+w.eval('S.dtLines[0].unit')+' price='+w.eval('S.dtLines[0].price'));
  w.dtEdit(0,'qty','10');
  out.push('line total: '+d.getElementById('dtt0').textContent+' (คาด ฿1,390.00)');
  // เพิ่มบรรทัด 2: หมูสันคอ 2.5 กก. × 145
  w.dtAddLine();
  w.dtEdit(1,'item','หมูสันคอ'); w.dtEdit(1,'qty','2.5');
  out.push('grand: '+d.getElementById('dtTot').textContent+' (คาด ฿1,752.50)');
  out.push('save btn: '+d.getElementById('dtSaveBtn').textContent.includes('1,752.50'));
  // บันทึก
  await w.dtSave();
  await new Promise(r=>setTimeout(r,150));
  const items=calls.find(c=>c.items); const exp=calls.find(c=>c.exp);
  out.push('deleted old: '+!!calls.find(c=>c.del));
  out.push('items saved: '+items.items.length+' first='+JSON.stringify({i:items.items[0].item,q:items.items[0].qty,u:items.items[0].unit,p:items.items[0].price}));
  out.push('expense upsert: '+JSON.stringify(exp.exp[0]));
  // ลิสต์เดือน + jump
  out.push('month list total: '+d.getElementById('dtList').textContent.includes('1,680'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
