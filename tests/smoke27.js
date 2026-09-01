const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
window.__ocrText='โอนเงินสำเร็จ จำนวนเงิน 5,000.00 บาท ค่าธรรมเนียม 0.00 อ้างอิง 202608191234';
window.Tesseract={recognize:async(b,l)=>({data:{text:window.__ocrText}})};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const saves=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('/storage/'))return T({Key:'x'});
      if(method==='POST'&&url.includes('pnl_expense_daily')){saves.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([{id:7,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([{branch:'JJRD',d:'2026-08-18',supplier_id:7,amount:5000,paid:false,slip_url:null}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.__clicks=0;
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  const fileInp=d.getElementById('slipFile');
  fileInp.click=()=>{w.__clicks++;};
  // 1) ติ๊กจ่าย -> ต้องเปิด picker อัตโนมัติ
  await w.paidToggle('2026-08-18',7);
  const chip0=d.querySelector('[data-pd="7"]');
  out.push('tick w/o slip -> picker opened: '+(w.__clicks===1)+' | NOT ticked: '+!chip0.classList.contains('on')+' | no paid save: '+!saves.flat().some(r=>r.paid===true));
  // 2) แนบสลิป (ตั้ง unpaid ก่อนเพื่อทดสอบ auto-tick)
  w.eval("S.cache[mkey(S.br,S.m)].exp['2026-08-18|7'].paid=false");
  const chip=d.querySelector('[data-pd="7"]'); chip.classList.remove('on');
  const blob=new w.Blob(['x'],{type:'image/jpeg'});
  w.eval("S._slipTarget={ds:'2026-08-18',sid:7}");
  await w.slipPicked({files:[blob],value:''});
  await new Promise(r=>setTimeout(r,150));
  out.push('after attach -> paid ticked: '+chip.classList.contains('on')+' tick✓: '+chip.textContent.includes('✓'));
  const pay=saves.flat().find(r=>r.slip_url);
  out.push('payload paid+slip: '+(pay&&pay.paid===true&&!!pay.slip_url));
  // 3) OCR ตรง (5,000.00 vs 5000) -> ไม่มี modal เตือน
  out.push('no mismatch modal: '+!d.querySelector('#modal.on, .modal.on')?.textContent?.includes?.('ไม่ตรง'));
  // 4) OCR ไม่ตรง: เปลี่ยนข้อความสลิปเป็น 4,500 แล้วแนบใหม่
  w.__ocrText='จำนวนเงิน 4,500.00 บาท อ้างอิง 99';
  w.eval("S._slipTarget={ds:'2026-08-18',sid:7}");
  await w.slipPicked({files:[blob],value:''});
  await new Promise(r=>setTimeout(r,150));
  const modalTxt=(d.querySelector('.modal.on,#modalBox')||d.body).textContent;
  out.push('mismatch modal: '+modalTxt.includes('ยอดสลิปอาจไม่ตรง')+' | shows 4,500: '+modalTxt.includes('4,500.00')+' | bill 5,000: '+modalTxt.includes('5,000.00'));
  // 4.5) ลบสลิป -> ต้องยกเลิกติ๊กจ่าย
  await w.slipDel('2026-08-18',7);
  await new Promise(r=>setTimeout(r,100));
  out.push('after slipDel -> unticked: '+!d.querySelector('[data-pd="7"]').classList.contains('on')+' | payload paid:false: '+saves.flat().some(r=>r.slip_url===null&&r.paid===false));
  // 5) ใช้ยอดจากสลิป
  w.applyBillFromSlip(4500,'2026-08-18',7);
  await new Promise(r=>setTimeout(r,850));
  const amtSave=saves.flat().filter(r=>'amount' in r).pop();
  out.push('bill updated to 4500: '+(amtSave&&amtSave.amount===4500));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
