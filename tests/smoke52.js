const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const today=new Date(); const ds=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
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
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'VatShop',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds))
        return T(w.__existing?[{item:'น้ำแข็ง',qty:10,unit:'ถุง',price:10,sort:0,vat_mode:'none',discount:0,bill_discount:0,ship_fee:50,other_fee:10,bill_no:1}]:[]);
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
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,250));
  // 1) ช่องใหม่มีจริง เริ่มว่าง
  out.push('ช่องค่าส่ง/ธรรมเนียมมี + ว่าง: '+(!!d.getElementById('dtShip')&&!!d.getElementById('dtOther')&&d.getElementById('dtShip').value===''&&d.getElementById('dtOther').value===''));
  // 2) คำนวณ: 10×100 ex = 1,070 + ค่าส่ง 120 + ธรรมเนียม 35 = 1,225
  w.eval("S.dtLines=[{item:'หมู',qty:10,unit:'กก.',price:100}]"); w.renderDtLines();
  d.getElementById('dtShip').value='120'; w.eval("S.dtShip=120");
  d.getElementById('dtOther').value='35'; w.eval("S.dtOther=35"); w.dtTotals();
  out.push('net 1,225.00: '+d.getElementById('dtTot').textContent.includes('1,225.00'));
  const vl=d.getElementById('dtVatLine').textContent;
  out.push('breakdown ค่าส่ง+ธรรมเนียม: '+(vl.includes('ค่าส่ง +฿120.00')&&vl.includes('ค่าธรรมเนียม +฿35.00')));
  // 3) save -> rows เก็บ fees + expense 1225
  await w.dtSave(); await new Promise(r=>setTimeout(r,250));
  const it=posts.find(p=>p.items), ex=posts.find(p=>p.exp);
  out.push('rows ship 120 / other 35: '+(it.items[0].ship_fee===120&&it.items[0].other_fee===35));
  out.push('expense 1,225: '+(Math.abs(ex.exp[0].amount-1225)<0.01));
  // 4) โหลดบิลเดิมที่มี fees (none 100 + 50 + 10 = 160)
  w.__existing=true; posts.length=0;
  await w.dtLoad(); await new Promise(r=>setTimeout(r,250));
  out.push('load: ช่องเติม 50/10: '+(d.getElementById('dtShip').value==='50'&&d.getElementById('dtOther').value==='10'));
  out.push('load net 160.00: '+d.getElementById('dtTot').textContent.includes('160.00'));
  out.push('ชิปวันนี้รวม fees ฿160: '+d.getElementById('dtBillTabs').textContent.includes('฿160'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
