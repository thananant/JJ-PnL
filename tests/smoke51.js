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
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'Maruha',category:'อาหาร',active:true,sort:1,vat_type:'VAT / NON-VAT'},
        {id:2,name:'SingleShop',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // Maruha: ประวัติ 2 แบบบิล — bn1(ปลาดอลลี่ none) / bn2(ยำสาหร่าย+ไข่กุ้ง+ถั่วแระ ex)
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.1'))
        return T([
          {item:'ปลาดอลลี่',unit:'ลัง',price:650,qty:2,d:'2026-08-14',sort:0,discount:0,bill_no:1,vat_mode:'none'},
          {item:'หมึกกล้วย',unit:'ลัง',price:900,qty:1,d:'2026-08-10',sort:0,discount:0,bill_no:1,vat_mode:'none'},
          {item:'ปลาดอลลี่',unit:'ลัง',price:600,qty:1,d:'2026-08-10',sort:1,discount:0,bill_no:1,vat_mode:'none'},
          {item:'ยำสาหร่าย',unit:'ลัง',price:800,qty:1,d:'2026-08-14',sort:0,discount:0,bill_no:2,vat_mode:'ex'},
          {item:'ไข่กุ้ง',unit:'ลัง',price:3800,qty:1,d:'2026-08-14',sort:1,discount:0,bill_no:2,vat_mode:'ex'},
          {item:'ถั่วแระ',unit:'ลัง',price:800,qty:1,d:'2026-08-14',sort:2,discount:0,bill_no:2,vat_mode:'ex'},
          {item:'ถุงพลาสติก',unit:'แพ็ค',price:120,qty:3,d:'2026-08-12',sort:0,discount:0,bill_no:3,vat_mode:'none'}]);
      // SingleShop: บิลเดียวตลอด
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.2'))
        return T([{item:'น้ำแข็ง',unit:'ถุง',price:12,qty:10,d:'2026-08-14',sort:0,discount:0,bill_no:1,vat_mode:'none'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
      // catalog: Maruha มีครบ 4 / SingleShop มี 2
      if(method==='GET'&&url.includes('pnl_sup_items')&&url.includes('supplier_id=eq.1'))
        return T([{item:'ปลาดอลลี่',unit:'ลัง',sort:0},{item:'ยำสาหร่าย',unit:'ลัง',sort:1},{item:'ไข่กุ้ง',unit:'ลัง',sort:2},{item:'ถั่วแระ',unit:'ลัง',sort:3}]);
      if(method==='GET'&&url.includes('pnl_sup_items'))
        return T([{item:'น้ำแข็ง',unit:'ถุง',sort:0},{item:'น้ำดื่ม',unit:'แพ็ค',sort:1}]);
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
  // Maruha (เคยมี 2 แบบบิล): บิล 1 ต้องมีแค่ปลาดอลลี่ + none
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,250));
  out.push('บิล1 = ชุด "ไม่มี VAT" ทั้งหมด 3 ตัว (ปลาดอลลี่650/ถุงพลาสติก/หมึกกล้วย): '+w.eval("S.dtLines.length===3&&S.dtLines[0].item==='ปลาดอลลี่'&&S.dtLines[0].price===650&&S.dtLines.some(l=>l.item==='ถุงพลาสติก')&&S.dtLines.some(l=>l.item==='หมึกกล้วย')"));
  out.push('บิล1 vat=none: '+w.eval("S.dtVat==='none'"));
  out.push('note ชุดแบบนี้ 3 ตัว + วิธีสลับ: '+(d.getElementById('dtTplNote').textContent.includes('ทุกสินค้าที่เคยอยู่ในบิลแบบนี้ 3 ตัว')&&d.getElementById('dtTplNote').textContent.includes('สลับปุ่ม VAT ด้านบน')));
  // SingleShop (ไม่เคยหลายบิล): บิล 1 ยังได้รายการประจำครบ 2 ตัว
  await w.dtPickSup(2);
  await new Promise(r=>setTimeout(r,250));
  out.push('ซัพบิลเดียว: catalog ครบ 2: '+w.eval("S.dtLines.length===2&&S.dtLines[0].item==='น้ำแข็ง'"));
  out.push('note 🧺 เดิม: '+d.getElementById('dtTplNote').textContent.includes('รายการสินค้าประจำครบ 2'));
  // ★ กดปุ่มโหมด VAT = สลับชุดรายการทันที (ไม่ล็อกกับเลขบิล)
  await w.dtPickSup(1); await new Promise(r=>setTimeout(r,250));
  w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,100));
  out.push('บิล1 กด +7% -> สลับเป็นชุด ex 3 ตัว: '+w.eval("S.dtLines.length===3&&S.dtLines.map(l=>l.item).join()==='ยำสาหร่าย,ไข่กุ้ง,ถั่วแระ'"));
  out.push('note บอกสลับชุด: '+d.getElementById('dtTplNote').textContent.includes('สลับปุ่ม VAT ด้านบน = สลับชุดรายการ'));
  w.dtVatSet('none'); await new Promise(r=>setTimeout(r,100));
  out.push('กดกลับ ไม่มี VAT -> ชุด none 3 ตัว: '+w.eval("S.dtLines.length===3&&S.dtLines[0].item==='ปลาดอลลี่'"));
  // มี qty แล้วสลับ -> confirm ปฏิเสธ = ไม่สลับ
  w.eval("S.dtLines[0].qty=5");
  w.confirm=()=>false; w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,80));
  out.push('confirm=false ไม่สลับ+โหมดเดิม: '+w.eval("S.dtVat==='none'&&S.dtLines[0].item==='ปลาดอลลี่'&&S.dtLines[0].qty===5"));
  w.confirm=()=>true; w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,80));
  out.push('confirm=true สลับได้: '+w.eval("S.dtVat==='ex'&&S.dtLines[0].item==='ยำสาหร่าย'"));
  // ซัพโหมดเดียว: กดสลับโหมด รายการต้องไม่โดนล้าง
  await w.dtPickSup(2); await new Promise(r=>setTimeout(r,250));
  w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,80));
  out.push('ซัพโหมดเดียว: สลับ VAT รายการคงเดิม: '+w.eval("S.dtLines.length===2&&S.dtLines[0].item==='น้ำแข็ง'&&S.dtVat==='ex'"));
  // สเปกที่ผู้ใช้เลือก (24 ส.ค. 69): แถบ "วันนี้" ซ่อนเมื่อยังไม่มีบิลของวัน — ปุ่ม ➕ โผล่หลังบันทึกใบแรกแล้ว
  await w.dtPickSup(1); await new Promise(r=>setTimeout(r,250));
  const tabsEl=d.getElementById('dtBillTabs');
  out.push('ไม่มีคำว่า บิลที่ ใน UI: '+!d.getElementById('view-detail').textContent.includes('บิลที่'));
  out.push('แถบวันนี้ซ่อน (ยังไม่มีบิล): '+(tabsEl.style.display==='none'));
  // (เพิ่ม 25 ส.ค. 69) ➕ บิลใหม่บนซัพหลายแบบ: ขึ้นชุดของโหมดปัจจุบัน + ปุ่ม VAT สลับชุดได้โดยไม่กระโดดใบ
  w.eval("S._dtDayBills={1:[{vat_mode:'none',item:'x',qty:1,price:1,bill_no:1}]}"); // จำลองว่ามีบิลของวันแล้ว (ให้ ➕ ทำงาน)
  await w.dtNewBill(); await new Promise(r=>setTimeout(r,250));
  out.push('➕ ซัพหลายแบบ: บิลใหม่ขึ้นชุดตามโหมด (none 3 ตัว) จำนวนว่าง: '+w.eval("S._dtIsNew===true&&S.dtLines.length===3&&S.dtLines[0].item==='ปลาดอลลี่'&&S.dtLines.every(l=>l.qty==='')"));
  await w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,150));
  out.push('➕ กด +7%: สลับชุดเป็น ex 3 ตัว โดยไม่กระโดดใบ: '+w.eval("S._dtIsNew===true&&S.dtVat==='ex'&&S.dtLines[0].item==='ยำสาหร่าย'&&S.dtLines.length===3"));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
