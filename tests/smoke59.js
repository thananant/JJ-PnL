const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');

// Jimmy (id=2) วันที่ 21 ส.ค. มี 2 บิล: bn1(none)=ไข่ห่านอาเจน,กุ้งเด้ง60/70 · bn2(ex)=ปลาหมึกกล้วย,แมงกะพรุน,แฮมกลม
// วันที่ 1 ส.ค. มี 1 บิล (bn1,none) = ปลาหมึกกล้วย 20กก.
const day21=[
  {branch:'JJRD',d:'2026-08-21',supplier_id:2,item:'ไข่ห่านอาเจน',unit:'กก.',qty:20,price:270,discount:0,sort:0,bill_no:1,vat_mode:'none'},
  {branch:'JJRD',d:'2026-08-21',supplier_id:2,item:'กุ้งเด้ง 60/70',unit:'กก.',qty:20,price:185,discount:0,sort:1,bill_no:1,vat_mode:'none'},
  {branch:'JJRD',d:'2026-08-21',supplier_id:2,item:'ปลาหมึกกล้วย',unit:'กก.',qty:15,price:120,discount:0,sort:0,bill_no:2,vat_mode:'ex'},
  {branch:'JJRD',d:'2026-08-21',supplier_id:2,item:'แมงกะพรุน',unit:'กก.',qty:15,price:60,discount:0,sort:1,bill_no:2,vat_mode:'ex'},
  {branch:'JJRD',d:'2026-08-21',supplier_id:2,item:'แฮมกลม',unit:'กก.',qty:8,price:85,discount:0,sort:2,bill_no:2,vat_mode:'ex'},
];
const day1=[{branch:'JJRD',d:'2026-08-01',supplier_id:2,item:'ปลาหมึกกล้วย',unit:'กก.',qty:20,price:120,discount:0,sort:0,bill_no:1,vat_mode:'none'}];
const monthRows=[...day21,...day1];

const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(url.includes('pnl_suppliers'))return T([{id:2,name:'Jimmy',category:'อาหาร',active:true,sort:1,vat_type:'VAT / NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // usage: ดึงทั้งเดือน
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08')&&url.includes('order=d'))
        return T(monthRows);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.2026-07'))return T([]);
      // dtLoad: dayRows ของวันที่เจาะจง
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.2026-08-21')&&url.includes('order=bill_no,sort'))
        return T(day21);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.2026-08-01')&&url.includes('order=bill_no,sort'))
        return T(day1);
      // dtHist
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))
        return T(monthRows.map(r=>({item:r.item,unit:r.unit,price:r.price,qty:r.qty,d:r.d,sort:r.sort,discount:r.discount,bill_no:r.bill_no,vat_mode:r.vat_mode})));
      if(method==='GET'&&url.includes('pnl_sup_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_item_alias'))return T([]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([]);
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
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,400));
  const key=Object.keys(w.eval('S._usage.g')).find(k=>k.includes('ปลาหมึกกล้วย'));
  out.push('เจอ key ปลาหมึกกล้วย: '+!!key);
  // เปิด modal แยกตามซัพ (usageDetail) — ต้องมี 2 แถวประวัติ พร้อม bn ติดมา
  w.usageDetail(key);
  await new Promise(r=>setTimeout(r,80));
  const hist=w.eval('S._usage.g["'+key+'"].hist');
  out.push('hist เก็บ bn: วัน21=bn2, วัน1=bn1: '+(hist.find(h=>h.d==='2026-08-21').bn===2 && hist.find(h=>h.d==='2026-08-01').bn===1));
  // คลิกแถว 21 ส.ค. -> ต้องกระโดดไปหน้า detail ที่บิลที่ 2 (ex) ตรงตัว มีปลาหมึกกล้วยอยู่จริง
  const row21=[...d.querySelectorAll('#modalBox tr')].find(tr=>tr.textContent.includes('21 ส.ค'));
  out.push('เจอแถว 21 ส.ค. ใน modal: '+!!row21);
  row21.click();
  await new Promise(r=>setTimeout(r,300));
  out.push('เด้งไปหน้า detail + เลือกซัพ Jimmy: '+w.eval("S.tab==='detail'&&S.dtSup===2&&S.dtDate==='2026-08-21'"));
  out.push('ไปตรงบิลที่ 2 (ไม่ใช่บิลที่ 1 ที่ตัวเลขน้อยกว่า): '+w.eval("S.dtBillNo===2"));
  out.push('รายการที่เห็น = ของบิล2 มีปลาหมึกกล้วยจริง (ไม่ใช่ของบิล1): '+w.eval("S.dtLines.some(l=>l.item==='ปลาหมึกกล้วย')&&!S.dtLines.some(l=>l.item==='ไข่ห่านอาเจน')"));
  out.push('โหมด VAT ตรงกับบิล2 (ex): '+w.eval("S.dtVat==='ex'"));
  // เปิด modal อีกรอบ คลิกแถว 1 ส.ค. -> ต้องไปบิลที่ 1 (none) ของวันนั้น
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,400));
  w.usageDetail(key);
  await new Promise(r=>setTimeout(r,80));
  const lbl1=w.eval("thDate('2026-08-01')");
  const row1=[...d.querySelectorAll('#modalBox tr')].find(tr=>tr.querySelector('td')&&tr.querySelector('td').textContent.trim()===lbl1);
  row1.click();
  await new Promise(r=>setTimeout(r,300));
  out.push('วันที่ 1 -> บิลที่ 1 (none) ถูกต้อง: '+w.eval("S.dtDate==='2026-08-01'&&S.dtBillNo===1&&S.dtVat==='none'"));
  // มุมมองรวมสินค้าข้ามซัพ (usageDetailItem) ก็ต้องได้ bn ถูกเหมือนกัน
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,400));
  w.usageModeSet('item');
  await new Promise(r=>setTimeout(r,400));
  const key2=Object.keys(w.eval('S._usage.gi')).find(k=>k.includes('ปลาหมึกกล้วย'));
  w.usageDetailItem(key2);
  await new Promise(r=>setTimeout(r,80));
  const row21b=[...d.querySelectorAll('#modalBox tr')].find(tr=>tr.textContent.includes('21 ส.ค'));
  row21b.click();
  await new Promise(r=>setTimeout(r,300));
  out.push('มุมมองรวมสินค้า: คลิก 21 ส.ค. -> บิลที่ 2 ถูกต้องเหมือนกัน: '+w.eval("S.dtBillNo===2&&S.dtLines.some(l=>l.item==='ปลาหมึกกล้วย')"));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
