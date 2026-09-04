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
      // ประวัติ: หมูสามชั้น เคยลด 5 บาท/บรรทัด · บิลเดิมวันนี้: มีส่วนลดท้ายบิล 50
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.1'))
        return T([{item:'หมูสามชั้น',unit:'กก.',price:150,qty:10,d:'2026-08-10',sort:0,discount:5}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds))
        return T(w.__existing?[{item:'หมูสามชั้น',qty:10,unit:'กก.',price:150,sort:0,vat_mode:'ex',discount:5,bill_discount:50}]:[]);
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
  await new Promise(r=>setTimeout(r,200));
  // 1) เทมเพลตวันใหม่: จำส่วนลดรายสินค้า 5 มาให้ · ท้ายบิล = 0
  out.push('line disc remembered=5: '+w.eval("S.dtLines[0].discount===5"));
  out.push('bill disc reset 0: '+w.eval("(S.dtBillDisc||0)===0")+' input empty: '+(d.getElementById('dtBillDisc').value===''));
  // 2) คำนวณ: 10×150−5=1495 · ท้ายบิล 95 → 1400 · ex → 1498
  w.eval("S.dtLines[0].qty=10"); w.renderDtLines();
  out.push('line total 1,495: '+d.getElementById('dtt0').textContent.includes('1,495.00'));
  d.getElementById('dtBillDisc').value='95'; w.eval("S.dtBillDisc=95"); w.dtTotals();
  out.push('net ex (1400×1.07)=1,498: '+d.getElementById('dtTot').textContent.includes('1,498.00'));
  out.push('breakdown line: '+d.getElementById('dtVatLine').textContent.includes('ส่วนลดท้ายบิล −฿95.00'));
  // 3) save -> rows มี discount + bill_discount · expense = 1498
  await w.dtSave();
  await new Promise(r=>setTimeout(r,200));
  const it=posts.find(p=>p.items), ex=posts.find(p=>p.exp);
  out.push('saved row: disc=5 billdisc=95: '+(it.items[0].discount===5&&it.items[0].bill_discount===95));
  out.push('expense 1498: '+(Math.abs(ex.exp[0].amount-1498)<0.01));
  // 4) โหลดบิลเดิม (ex, disc5, bd50): sub=1495, base=1445, net=1546.15
  w.__existing=true; posts.length=0;
  await w.dtLoad(); await new Promise(r=>setTimeout(r,150));
  out.push('load: billdisc input=50: '+(d.getElementById('dtBillDisc').value==='50'));
  out.push('load net 1,546.15: '+d.getElementById('dtTot').textContent.includes('1,546.15'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
