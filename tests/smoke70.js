// smoke70: หลายบิลต่อวัน "ประเภท VAT ซ้ำกันได้" — ใบแรกไม่มี VAT ใบสองไม่มี VAT อีกใบ
// ➕ บิลใหม่ · แท็บต่อใบ (กดเปิดใบนั้นตรง ๆ) · บันทึก scoped bill_no · รายจ่ายวัน = รวมทุกใบ · บันทึกแล้วค้างที่ใบเดิม
// ปุ่ม VAT บนบิลใหม่ = เปลี่ยนประเภทใบนี้ ไม่กระโดดไปใบอื่น
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ds='2026-08-24';
const posts=[], dels=[];
// วันนี้มีบิล 1 (ไม่มี VAT): ข้าว 8 ถุง × 100 = 800 · ประวัติซัพมีแต่บิล none (ซัพแบบเดียว)
let dayRows=[{branch:'JJRD',d:ds,supplier_id:1,item:'ข้าว',unit:'ถุง',qty:8,price:100,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){const it=JSON.parse(opt.body);posts.push({items:it});it.forEach(r=>dayRows.push({...r,bill_discount:r.bill_discount||0,ship_fee:r.ship_fee||0,other_fee:r.other_fee||0}));return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      if(method==='POST')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'โรงสีข้าว',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))return T([{item:'ข้าว',unit:'ถุง',price:100,qty:8,d:'2026-08-15',sort:0,discount:0,bill_no:1,vat_mode:'none'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds))return T(dayRows);
      if(method==='GET'&&url.includes('pnl_bill_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('d=eq.'))return T([{amount:800,paid:false}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  w.eval("S.dtDate='"+ds+"'");
  await w.eval("show('detail')"); await sleep(250);
  await w.dtPickSup(1); await sleep(300);
  // เปิดมาที่บิล 1 · แท็บมี 1 ใบ (ไม่โชว์เลขบิล) + ปุ่ม ➕
  let tabs=d.getElementById('dtBillTabs');
  out.push('เปิดที่บิล 1 (ข้าว qty 8): '+w.eval("S.dtBillNo===1&&S._dtExisting===true&&S.dtLines[0].item==='ข้าว'&&S.dtLines[0].qty===8"));
  out.push('แท็บ: ใบเดียวไม่โชว์เลขบิล + มีปุ่ม ➕ บิลใหม่: '+(tabs.textContent.includes('ไม่มี VAT · ฿800')&&!tabs.textContent.includes('บิล 1')&&tabs.textContent.includes('➕ บิลใหม่')));
  // กด ➕ บิลใหม่ → ใบที่ 2 โหมด none เหมือนเดิม เริ่มว่าง
  await w.dtNewBill(); await sleep(250);
  out.push('➕ → บิลใหม่ใบที่ 2 · โหมดเดิม none · ขึ้นเทมเพลตจากบิลล่าสุด (ข้าว @100 จำนวนว่าง): '+w.eval("S.dtBillNo===2&&S.dtVat==='none'&&S._dtExisting===false&&S.dtLines.length===1&&S.dtLines[0].item==='ข้าว'&&S.dtLines[0].price===100&&S.dtLines[0].qty===''"));
  out.push('โน้ตบอกบิลใหม่ใบที่ 2 + ที่มาเทมเพลต: '+(d.getElementById('dtTplNote').textContent.includes('บิลใหม่ใบที่ 2')&&d.getElementById('dtTplNote').textContent.includes('บิลล่าสุด')));
  out.push('ปุ่ม ➕ ติดสถานะ on ระหว่างลงบิลใหม่: '+[...d.querySelectorAll('#dtBillTabs button')].some(b=>b.textContent.includes('➕')&&b.classList.contains('on')));
  // ปุ่ม VAT บนบิลใหม่: เปลี่ยนประเภท ไม่เด้งไปบิล 1
  await w.dtVatSet('ex'); await sleep(150);
  out.push('กด +7% บนบิลใหม่: ยังอยู่ใบที่ 2 โหมด ex: '+w.eval("S.dtBillNo===2&&S.dtVat==='ex'&&S._dtExisting===false"));
  await w.dtVatSet('none'); await sleep(150);
  // ลงรายการ น้ำแข็ง 20 ถุง × 15 = 300 แล้วบันทึก
  w.dtEdit(0,'item','น้ำแข็ง'); w.dtEdit(0,'unit','ถุง'); w.dtEdit(0,'qty','20'); w.dtEdit(0,'price','15');
  posts.length=0; dels.length=0;
  await w.dtSave(); await sleep(350);
  out.push('ลบ scoped bill_no=2 เท่านั้น: '+(dels.some(x=>x.includes('bill_no=eq.2'))&&!dels.some(x=>x.includes('bill_no=eq.1'))));
  const it=posts.find(p=>p.items);
  out.push('แถวใหม่ bill_no=2 vat none: '+(!!it&&it.items[0].bill_no===2&&it.items[0].vat_mode==='none'&&it.items[0].item==='น้ำแข็ง'));
  const ex=posts.find(p=>p.exp);
  out.push('รายจ่ายวัน = บิล1 800 + บิล2 300 = 1,100: '+(!!ex&&Math.abs(ex.exp[0].amount-1100)<0.01));
  out.push('บันทึกแล้วค้างที่ใบที่ 2 (ไม่เด้งกลับใบ 1): '+w.eval("S.dtBillNo===2&&S._dtExisting===true&&S.dtLines[0].item==='น้ำแข็ง'"));
  tabs=d.getElementById('dtBillTabs');
  out.push('แท็บ 2 ใบโหมดเดียวกัน: "บิล 1 · ไม่มี VAT · ฿800" + "บิล 2 · ไม่มี VAT · ฿300": '+(tabs.textContent.includes('บิล 1 · ไม่มี VAT · ฿800')&&tabs.textContent.includes('บิล 2 · ไม่มี VAT · ฿300')));
  out.push('แท็บใบที่ 2 ติด on: '+[...d.querySelectorAll('#dtBillTabs button')].some(b=>b.textContent.includes('บิล 2')&&b.classList.contains('on')));
  // กดแท็บบิล 1 → เปิดใบ 1
  await w.dtOpenBill(1); await sleep(250);
  out.push('กดแท็บบิล 1 → เปิดใบ 1 (ข้าว qty 8): '+w.eval("S.dtBillNo===1&&S._dtExisting===true&&S.dtLines[0].item==='ข้าว'&&S.dtLines[0].qty===8"));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
