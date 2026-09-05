const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const mk=(store)=>new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    // จำลอง localStorage ที่คงอยู่ข้าม "refresh"
    const s=store;
    Object.defineProperty(w,'localStorage',{value:{
      getItem:k=>k in s?s[k]:null, setItem:(k,v)=>s[k]=String(v), removeItem:k=>delete s[k], clear:()=>{for(const k in s)delete s[k];}
    }});
    w.fetch=async()=>({ok:true,status:200,text:async()=>'[]',headers:{get:()=>null}});
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
(async()=>{
  const store={};
  // ครั้งแรก: ไปหน้ารายรับ เลือกวัน 7
  let vc=mk(store); let w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,80));
  w.incPick(7);
  await new Promise(r=>setTimeout(r,50));
  console.log('before refresh: tab=income day=7 | stored:', store['jjpnl_view']);
  vc.window.close();
  // "F5": สร้าง DOM ใหม่ด้วย store เดิม
  vc=mk(store); w=vc.window; d=w.document;
  await new Promise(r=>setTimeout(r,500));
  const onTab=d.querySelector('.sb-item.on')?.dataset.v;
  const onView=d.querySelector('.view.on')?.id;
  const onDay=d.querySelector('#incChips button.on')?.dataset.d;
  console.log('after refresh -> tab:',onTab,'view:',onView,'day:',onDay);
  console.log('errors:',JSON.stringify(w.errors));
  process.exit(0);
})();
