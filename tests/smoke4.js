const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({SheetNames:[],Sheets:{}}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({rows:r})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const saved=[]; let cashId=100;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_income_daily')) saved.push('inc');
      if(method==='POST'&&url.includes('pnl_cash_expenses')){
        const b=JSON.parse(opt.body); saved.push('cash:'+b.shift);
        const row=[{id:cashId++,...b}]; return {ok:true,status:201,text:async()=>JSON.stringify(row),headers:{get:()=>null}};
      }
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
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,80));
  out.push('chips: '+d.querySelectorAll('#incChips button').length);
  out.push('day cards visible: '+d.querySelectorAll('.dayc').length+' (ควรเป็น 1)');
  out.push('selected: '+d.querySelector('#incChips button.on')?.dataset.d);
  // เลือกวัน 5
  w.incPick(5);
  await new Promise(r=>setTimeout(r,30));
  out.push('after pick5 -> card id: '+d.querySelector('.dayc')?.id+' inputs: '+d.querySelectorAll('.dayc input').length);
  out.push('cash buttons: '+[...d.querySelectorAll('.dayc button')].filter(b=>b.textContent.includes('เงินสดจ่าย')).map(b=>b.textContent.trim().slice(0,20)).join(' | '));
  // กรอกข้อมูลวัน 5 กะเช้า
  w.incInput(5,'sales_pos_am',5350); w.incInput(5,'deposit_am',5000); w.incInput(5,'cash_drawer_am',150);
  // เพิ่มเงินสดจ่ายกะเช้า 200
  const btnAm=[...d.querySelectorAll('.dayc button')].find(b=>(b.getAttribute('onclick')||'').includes("'เช้า'"));
  const ds5=btnAm.getAttribute('onclick').match(/'([\d-]+)'/)[1];
  w.cashModal(ds5,'เช้า');
  await w.cashAdd(ds5,'เช้า');
  await new Promise(r=>setTimeout(r,30));
  await w.cashUpd(100,'amount',200);
  await new Promise(r=>setTimeout(r,30));
  w.closeModal();
  out.push('sd5am: '+d.getElementById('sd5am').textContent.trim());
  out.push('cn5am: '+(d.getElementById('cn5am')||{}).textContent);
  out.push('chip5 has dot: '+d.querySelector('#incChips button[data-d="5"]').classList.contains('has'));
  // ปุ่มเลื่อนวัน
  const nav=[...d.querySelectorAll('.navday')]; nav[1].click();
  await new Promise(r=>setTimeout(r,30));
  out.push('after next -> selected: '+d.querySelector('#incChips button.on')?.dataset.d+' card: '+d.querySelector('.dayc')?.id);
  out.push('hint am day6: '+(d.getElementById('hint6am')||{textContent:''}).textContent.trim());
  await new Promise(r=>setTimeout(r,800));
  out.push('saves: '+JSON.stringify(saved.slice(0,6)));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
