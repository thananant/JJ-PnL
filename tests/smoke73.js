// smoke73: คีย์บอร์ดโฟลว์หน้าบันทึกบิล — เปิดหน้า: default ซัพตัวแรก + โฟกัสวันที่
// Enter: วันที่→ซัพ (ลูกศรเลื่อนได้)→แบบบิล (ลูกศรเลื่อนได้)→ตาราง→ (ช่องว่าง/สุดตาราง)→ส่วนลด→ค่าส่ง→ค่าธรรมเนียม→บันทึก
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'ผัก',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},{id:3,name:'Coke',category:'น้ำ',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ประวัติของซัพ 2 (ผัก): มีของประจำ 1 ตัว -> เทมเพลตขึ้น item แถวแรก
      if(url.includes('pnl_bill_items')&&url.includes('supplier_id=eq.2')&&url.includes('order=d.desc'))return T([{item:'กะหล่ำปลี',unit:'กก.',price:30,qty:5,d:'2026-08-10',sort:0,discount:0,bill_no:1,vat_mode:'none'}]);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const press=(el,key)=>{const e=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});el.dispatchEvent(e);return e;};
setTimeout(async()=>{
  const out=[];
  await sleep(400); await w.eval("show('detail')"); await sleep(500);
  // เปิดหน้า: ยังไม่เลือกซัพให้เอง (กันชนโฟลว์สแกนก่อนเลือกซัพ) + โฟกัสวันที่
  out.push('เปิดหน้า: ยังไม่เลือกซัพเอง (โฟลว์สแกนก่อนยังใช้ได้): '+w.eval("S.dtSup==null"));
  out.push('โฟกัสเริ่มที่ช่องวันที่: '+(d.activeElement===d.getElementById('dtDate')));
  // Enter ที่วันที่ -> ไฮไลต์ซัพตัวแรกเป็น default (กด Enter ต่อ = ได้ตัวแรกเลย)
  press(d.getElementById('dtDate'),'Enter');
  out.push('Enter วันที่ → default ไฮไลต์ซัพตัวแรก: '+(d.activeElement.classList.contains('dtsup')&&d.activeElement.dataset.sid==='1'));
  // ลูกศรขวา -> ชิปถัดไป (ผัก id 2) · ซ้ายวนกลับ · Up/Down ถอย ±1 ใน jsdom
  press(d.activeElement,'ArrowRight');
  out.push('→ เลื่อนไปชิป "ผัก": '+(d.activeElement.dataset.sid==='2'));
  press(d.activeElement,'ArrowLeft'); press(d.activeElement,'ArrowLeft');
  out.push('← ← วนไปชิปสุดท้าย (Coke): '+(d.activeElement.dataset.sid==='3'));
  press(d.activeElement,'ArrowRight'); press(d.activeElement,'ArrowRight'); // กลับมาที่ ผัก (id 2)
  // Enter เลือก "ผัก" -> โหลด + โฟกัสปุ่มแบบบิลตัว active
  press(d.activeElement,'Enter'); await sleep(400);
  out.push('Enter เลือกผัก: S.dtSup=2 + เทมเพลตขึ้น กะหล่ำปลี: '+w.eval("S.dtSup===2&&S.dtLines[0].item==='กะหล่ำปลี'"));
  out.push('โฟกัสมาปุ่มแบบบิล (ไม่มี VAT ตัว active): '+(d.activeElement.classList.contains('vch')&&d.activeElement.dataset.vm==='none'));
  // ลูกศรเลื่อนแบบบิล: ขวา -> ex · Enter ใช้ ex แล้วลงตาราง (แถวแรกมี item -> โฟกัสช่องจำนวน)
  press(d.activeElement,'ArrowRight');
  out.push('→ เลื่อนไปปุ่ม +7%: '+(d.activeElement.dataset.vm==='ex'));
  press(d.activeElement,'Enter'); await sleep(250);
  out.push('Enter ใช้ +7% + โฟกัสช่องจำนวนแถวแรก: '+(w.eval("S.dtVat==='ex'")&&d.activeElement===d.querySelector('#dtLines [data-r="0"][data-c="1"]')));
  // กรอกจำนวนแล้ว Enter = เดินช่องถัดไปตามเดิม (หน่วย)
  d.activeElement.value='5'; d.activeElement.dispatchEvent(new w.Event('input',{bubbles:true}));
  press(d.activeElement,'Enter');
  out.push('Enter (จำนวนมีค่า) → เดินช่องถัดไปเหมือนเดิม (หน่วย): '+(d.activeElement===d.getElementById('dtu0')));
  // เพิ่มแถวว่างท้าย -> Enter ที่ช่องสินค้าว่าง = กระโดดไปส่วนลดท้ายบิล
  await w.dtAddLine(); await sleep(120);
  const emptyItem=d.querySelector('#dtLines [data-r="1"][data-c="0"]'); emptyItem.focus();
  press(emptyItem,'Enter');
  out.push('Enter ช่องสินค้าว่าง → กระโดดไปส่วนลดท้ายบิล: '+(d.activeElement===d.getElementById('dtBillDisc')));
  // Enter ช่องจำนวนว่าง = กระโดดเช่นกัน
  const emptyQty=d.querySelector('#dtLines [data-r="1"][data-c="1"]'); emptyQty.focus();
  press(emptyQty,'Enter');
  out.push('Enter ช่องจำนวนว่าง → ส่วนลดท้ายบิล: '+(d.activeElement===d.getElementById('dtBillDisc')));
  // ส่วนลด -> ค่าส่ง -> ค่าธรรมเนียม -> บันทึก
  d.getElementById('dtBillDisc').value='20'; d.getElementById('dtBillDisc').dispatchEvent(new w.Event('input',{bubbles:true}));
  press(d.getElementById('dtBillDisc'),'Enter');
  out.push('Enter ส่วนลด → ค่าส่ง: '+(d.activeElement===d.getElementById('dtShip')));
  press(d.getElementById('dtShip'),'Enter');
  out.push('Enter ค่าส่ง → ค่าธรรมเนียม: '+(d.activeElement===d.getElementById('dtOther')));
  w.eval("window.__saveN=0; const _ods=dtSave; dtSave=async()=>{window.__saveN++;};");
  press(d.getElementById('dtOther'),'Enter'); await sleep(120);
  out.push('Enter ค่าธรรมเนียม → เรียกบันทึกบิล: '+((w.__saveN||0)===1));
  // สุดตาราง (ช่องส่วนลดของแถวสุดท้ายมีค่า) -> Enter = ลงไปส่วนลดท้ายบิล
  const lastDisc=d.getElementById('dtd1'); lastDisc.value='1'; lastDisc.focus();
  press(lastDisc,'Enter');
  out.push('Enter ช่องสุดท้ายของตาราง → ส่วนลดท้ายบิล: '+(d.activeElement===d.getElementById('dtBillDisc')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
