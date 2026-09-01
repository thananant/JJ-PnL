const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({SheetNames:[],Sheets:{}}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:(r)=>({rows:r})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const saved=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(opt&&opt.method==='POST'&&url.includes('pnl_income_daily')) saved.push(JSON.parse(opt.body));
      return {ok:true,status:200,json:async()=>[],text:async()=>'[]',headers:{get:()=>null}};
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  // ไปหน้ารายรับ
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,80));
  out.push('income cards: '+d.querySelectorAll('.dayc').length);
  out.push('shift heads day1: '+d.querySelectorAll('#dc1 .shifthead').length);
  out.push('inputs day1: '+d.querySelectorAll('#dc1 input').length);
  // กรอกกะเช้าวัน 1: POS 10000, ฝาก 5000, เก๊ะ 5350, เก๊ะเปิด 0
  w.incInput(1,'sales_pos_am',10700); w.incInput(1,'deposit_am',5000); w.incInput(1,'cash_drawer_am',5700);
  // กรอกกะเย็นวัน 1: POS 21400, ฝาก 20000, เก๊ะ 2000 (ขาด 5700 ถ้าไม่ใส่เก๊ะเปิด... เก๊ะเปิดเย็น=เก๊ะเช้า 5700)
  w.incInput(1,'sales_pos_pm',21400); w.incInput(1,'deposit_pm',20000); w.incInput(1,'cash_drawer_pm',7100);
  await new Promise(r=>setTimeout(r,30));
  out.push('hint pm day1: '+d.getElementById('hint1pm').textContent.trim());
  // กดใช้ hint เก๊ะเปิดกะเย็น = 5700
  w.applyOpen(1,'pm',5700);
  await new Promise(r=>setTimeout(r,30));
  out.push('sd1am: '+d.getElementById('sd1am').textContent.trim());
  out.push('sd1pm: '+d.getElementById('sd1pm').textContent.trim());
  out.push('dsum1: '+d.getElementById('dsum1').textContent.replace(/\s+/g,' ').trim());
  // hint เช้าวัน 2 ควรมาจากเก๊ะเย็นวัน 1 (7100)
  await new Promise(r=>setTimeout(r,30));
  out.push('hint am day2: '+d.getElementById('hint2am').textContent.trim());
  // รอ debounce บันทึก
  await new Promise(r=>setTimeout(r,800));
  out.push('saved payload keys: '+(saved.length?Object.keys(saved[saved.length-1][0]).filter(k=>k.includes('_am')||k.includes('_pm')).length+' shift cols':'none'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n'));
  process.exit(0);
},400);
