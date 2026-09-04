// smoke71: ตารางบิล เดินช่องด้วยลูกศร ↑↓←→ + Enter แบบสเปรดชีต
// ↑↓ = คอลัมน์เดิมแถวบน/ล่าง (เฉพาะช่องตัวเลข — ช่องสินค้า/หน่วยมี datalist ปล่อยให้ลิสต์ใช้)
// ←→ = เดินช่องเมื่อเคอร์เซอร์ชนขอบข้อความ (กลางข้อความ = เลื่อนเคอร์เซอร์ปกติ) · สุดแถววนไปแถวถัดไป · มาถึงช่องใหม่ = เลือกทั้งค่า
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
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cell=(r,c)=>d.querySelector(`#dtLines [data-r="${r}"][data-c="${c}"]`);
const press=(el,key)=>{const e=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});el.dispatchEvent(e);return e;};
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  w.eval("S.dtDate='2026-08-24'");
  await w.eval("show('detail')"); await sleep(250);
  await w.dtPickSup(1); await sleep(300);
  w.eval("S.dtLines=[{item:'หมูสามชั้น',qty:10,unit:'กก.',price:150,discount:''},{item:'ไก่คาราเกะ',qty:5,unit:'กก.',price:85,discount:''},{item:'',qty:'',unit:'',price:''}]");
  w.renderDtLines(); await sleep(80);
  out.push('ช่องตัวเลขเป็น text+inputmode decimal ชิดขวา (ไม่มีปุ่มหมุนเลขแล้ว): '+(cell(0,1).type==='text'&&cell(0,1).getAttribute('inputmode')==='decimal'&&cell(0,1).className.includes('numf')&&cell(0,3).type==='text'&&cell(0,4).type==='text'));
  // ↓ จากช่องจำนวนแถว 0 -> จำนวนแถว 1 + เลือกทั้งค่า
  const q0=cell(0,1); q0.focus(); q0.setSelectionRange(2,2);
  let ev=press(q0,'ArrowDown');
  out.push('↓ จำนวน(0)→จำนวน(1) + เลือกทั้งค่า + preventDefault: '+(d.activeElement===cell(1,1)&&ev.defaultPrevented===true&&cell(1,1).selectionStart===0&&cell(1,1).selectionEnd===String(cell(1,1).value).length));
  // ↑ กลับขึ้น
  ev=press(cell(1,1),'ArrowUp');
  out.push('↑ กลับมาแถว 0: '+(d.activeElement===cell(0,1)));
  // ↑ ที่แถวบนสุด = อยู่ที่เดิม
  ev=press(cell(0,1),'ArrowUp');
  out.push('↑ แถวแรก = ไม่ขยับ ไม่ preventDefault: '+(d.activeElement===cell(0,1)&&ev.defaultPrevented===false));
  // → กลางข้อความ = ไม่เดินช่อง (ให้เคอร์เซอร์ขยับเอง)
  const p0=cell(0,3); p0.focus(); p0.setSelectionRange(1,1);
  ev=press(p0,'ArrowRight');
  out.push('→ กลางตัวเลข: ไม่เดินช่อง: '+(d.activeElement===p0&&ev.defaultPrevented===false));
  // → ที่ท้ายค่า = ไปช่องส่วนลด
  p0.setSelectionRange(3,3);
  ev=press(p0,'ArrowRight');
  out.push('→ ท้ายค่า ราคา(0)→ส่วนลด(0): '+(d.activeElement===cell(0,4)));
  // → ท้ายช่องส่วนลด (คอลัมน์สุดท้าย) = วนไปช่องสินค้าแถวถัดไป
  const d0=cell(0,4); d0.focus(); const L=String(d0.value).length; d0.setSelectionRange(L,L);
  ev=press(d0,'ArrowRight');
  out.push('→ สุดแถว 0 → สินค้าแถว 1: '+(d.activeElement===cell(1,0)));
  // ← ต้นช่องสินค้าแถว 1 = วนกลับส่วนลดแถว 0
  const it1=cell(1,0); it1.focus(); it1.setSelectionRange(0,0);
  ev=press(it1,'ArrowLeft');
  out.push('← ต้นช่องสินค้า(1) → ส่วนลด(0): '+(d.activeElement===cell(0,4)));
  // ← กลางข้อความสินค้า = ไม่เดิน
  it1.focus(); it1.setSelectionRange(3,3);
  ev=press(it1,'ArrowLeft');
  out.push('← กลางชื่อสินค้า: ไม่เดินช่อง: '+(d.activeElement===it1&&ev.defaultPrevented===false));
  // ↑↓ บนช่องสินค้า/หน่วย (มี datalist) = ไม่แย่งลิสต์
  ev=press(it1,'ArrowDown');
  const u0=cell(0,2); u0.focus(); const ev2=press(u0,'ArrowDown');
  out.push('↑↓ ช่องมี datalist ไม่ถูกแย่ง (สินค้า+หน่วย): '+(d.activeElement===u0&&ev.defaultPrevented===false&&ev2.defaultPrevented===false));
  // Enter = พฤติกรรมเดิม (handler กลาง): เดินไปช่องถัดไปทีละช่อง
  const q1=cell(1,1); q1.focus(); q1.setSelectionRange(0,0);
  ev=press(q1,'Enter');
  out.push('Enter ยังเดินช่องถัดไปเหมือนเดิม จำนวน(1)→หน่วย(1): '+(d.activeElement===cell(1,2)&&ev.defaultPrevented===true));
  // ↓ แถวสุดท้าย = อยู่ที่เดิม
  cell(2,1).focus();
  ev=press(cell(2,1),'ArrowDown');
  out.push('↓ แถวสุดท้าย = ไม่ขยับ: '+(d.activeElement===cell(2,1)&&ev.defaultPrevented===false));
  // พิมพ์ค่าในช่อง text แล้ว dtEdit ยังคิดยอดปกติ
  cell(2,1).value='4'; cell(2,1).dispatchEvent(new w.Event('input',{bubbles:true}));
  cell(2,3).value='60'; cell(2,3).dispatchEvent(new w.Event('input',{bubbles:true}));
  out.push('พิมพ์เลขผ่านช่อง text: dtEdit เก็บค่า + ยอดคิดถูก (4×60=240): '+(w.eval("num(S.dtLines[2].qty)===4&&num(S.dtLines[2].price)===60")&&d.getElementById('dtt2').textContent.includes('240')));
  const css=[...d.querySelectorAll('style')].map(x=>x.textContent).join('');
  out.push('จอกว้าง: view-detail จำกัด 1024px + กึ่งกลาง: '+css.includes('#view-detail{max-width:1024px;margin:0 auto}'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
// (เพิ่ม 24 ส.ค. 69) จอกว้าง: หน้าบันทึกบิลถูกจำกัดความกว้าง 1024px — เช็คว่ากฎ CSS อยู่จริง
