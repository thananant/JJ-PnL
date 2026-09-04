const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const saves=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      // จำลองแถวสิ้นเดือนก่อน: 31 ก.ค. เก๊ะเย็น 8755
      if(method==='GET'&&url.includes('pnl_income_daily')&&url.includes('d=lt.')){
        return {ok:true,status:200,text:async()=>JSON.stringify([{d:'2026-07-31',cash_drawer_pm:8755}]),headers:{get:()=>null}};
      }
      if(method==='POST'&&url.includes('pnl_income_daily')){ saves.push(JSON.parse(opt.body)); }
      return {ok:true,status:200,text:async()=>'[]',headers:{get:()=>null}};
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,80));
  // วันที่ 1: เก๊ะเปิดเช้าต้องดึง 8755 จากสิ้นเดือนก่อนอัตโนมัติ
  w.incPick(1);
  await new Promise(r=>setTimeout(r,50));
  const openAm1=d.getElementById('in1_drawer_open_am');
  out.push('day1 open_am value: '+openAm1.value+' readonly: '+openAm1.readOnly);
  out.push('day1 label: '+[...d.querySelectorAll('.lk')].map(x=>x.textContent).join(' | '));
  // กรอกเก๊ะเช้าวัน 1 = 5000 -> เก๊ะเปิดเย็นต้องเป็น 5000 ทันที
  w.incInput(1,'cash_drawer_am',5000);
  const openPm1=d.getElementById('in1_drawer_open_pm');
  out.push('after key drawer_am=5000 -> open_pm: '+openPm1.value+' readonly: '+openPm1.readOnly);
  // กรอกเก๊ะเย็นวัน 1 = 7100 แล้วไปวัน 2 -> เก๊ะเปิดเช้าวัน 2 = 7100 อัตโนมัติ
  w.incInput(1,'cash_drawer_pm',7100);
  w.incPick(2);
  await new Promise(r=>setTimeout(r,50));
  const openAm2=d.getElementById('in2_drawer_open_am');
  out.push('day2 open_am: '+openAm2.value+' readonly: '+openAm2.readOnly);
  // เก๊ะเปิดเย็นวัน 2 ยังไม่มี source (เก๊ะเช้าวัน 2 = 0) -> ต้องแก้ไขเองได้
  const openPm2=d.getElementById('in2_drawer_open_pm');
  out.push('day2 open_pm editable: '+(!openPm2.readOnly));
  // รอ save
  await new Promise(r=>setTimeout(r,800));
  const last=saves.flat().filter(r=>r.d==='2026-08-02').pop();
  out.push('saved day2 open_am: '+(last&&last.drawer_open_am));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
