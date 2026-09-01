const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.ontouchstart=null; // ให้ initPullRefresh ทำงานใน jsdom
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
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'A',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
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
  await new Promise(r=>setTimeout(r,400));
  out.push('indicator ถูกสร้าง: '+!!d.getElementById('ptr'));
  let coreCalls=0; const origCore=w.loadCore; w.loadCore=async()=>{coreCalls++; return origCore();};
  // 1) ลากสั้น (<70) -> ไม่รีเฟรช
  w.ptrStart({touches:[{clientY:100}],target:d.body});
  w.ptrMove({touches:[{clientY:160}],cancelable:true,preventDefault(){}});
  await w.ptrEnd();
  await new Promise(r=>setTimeout(r,100));
  out.push('ลากสั้น ไม่ trigger: '+(coreCalls===0));
  // 2) ลากยาว (dy 200 -> pull 100) -> รีเฟรช + toast
  w.ptrStart({touches:[{clientY:100}],target:d.body});
  w.ptrMove({touches:[{clientY:300}],cancelable:true,preventDefault(){}});
  const pulled=d.getElementById('ptr').classList.contains('rel');
  await w.ptrEnd();
  await new Promise(r=>setTimeout(r,300));
  out.push('ลากยาว: สถานะ rel ระหว่างลาก: '+pulled+' | loadCore ถูกเรียก: '+(coreCalls===1));
  out.push('toast อัปเดต: '+d.getElementById('toast').textContent.includes('อัปเดตข้อมูลล่าสุดแล้ว'));
  out.push('indicator กลับที่เดิม: '+!d.getElementById('ptr').classList.contains('spin'));
  // 3) นิ้วอยู่ในกล่องเลื่อนที่เลื่อนค้าง -> ไม่แย่ง
  const box=d.createElement('div'); const inner=d.createElement('span'); box.appendChild(inner); d.body.appendChild(box);
  Object.defineProperty(box,'scrollTop',{value:50});
  w.ptrStart({touches:[{clientY:100}],target:inner});
  out.push('ในกล่องเลื่อนค้าง ไม่เริ่ม gesture: '+(w.eval('PTR.on')===false));
  // 4) เปิด modal -> ไม่เริ่ม
  w.openModal('<h3>x</h3>');
  w.ptrStart({touches:[{clientY:100}],target:d.body});
  out.push('modal เปิด ไม่เริ่ม gesture: '+(w.eval('PTR.on')===false));
  w.closeModal();
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
