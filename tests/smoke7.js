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
    w.fetch=async()=>({ok:true,status:200,text:async()=>'[]',headers:{get:()=>null}});
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
  out.push('report empty state: '+d.getElementById('incRep').textContent.includes('ยังไม่มียอดขาย'));
  // กรอกวัน 1: เช้า 68229.62 เย็น 175694 / วัน 2: เช้า 50000
  w.incPick(1);
  w.incInput(1,'sales_pos_am',68229.62); w.incInput(1,'sales_pos_pm',175694);
  w.incPick(2); w.incInput(2,'sales_pos_am',50000);
  await new Promise(r=>setTimeout(r,50));
  const rep=d.getElementById('incRep');
  const rows=[...rep.querySelectorAll('.drrow:not(.head):not(.tot)')];
  out.push('rows: '+rows.length);
  out.push('row1: '+rows[0].textContent.replace(/\s+/g,' ').trim());
  out.push('row2: '+rows[1].textContent.replace(/\s+/g,' ').trim());
  out.push('total: '+rep.querySelector('.drrow.tot').textContent.replace(/\s+/g,' ').trim());
  out.push('selected row highlighted: '+rows[1].classList.contains('on'));
  // คลิกแถวรายงาน -> เปลี่ยนวัน
  rows[0].click();
  await new Promise(r=>setTimeout(r,30));
  out.push('after row click -> card: '+d.querySelector('.dayc')?.id);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
