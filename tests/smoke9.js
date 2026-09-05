const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
let cashId=900;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_cash_expenses')){
        let b=JSON.parse(opt.body); if(Array.isArray(b))b=b[0];
        return {ok:true,status:201,text:async()=>JSON.stringify([{id:cashId++,...b}]),headers:{get:()=>null}};
      }
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
  // วัน 1 เช้า: POS 10000 นับได้ 9998.82 -> ขาด 1.18 | เย็น: POS 5000 นับได้ 5003.55 -> เกิน 3.55
  w.incPick(1);
  w.incInput(1,'sales_pos_am',10000); w.incInput(1,'deposit_am',9998.82);
  w.incInput(1,'sales_pos_pm',5000);  w.incInput(1,'deposit_pm',5003.55);
  // วัน 2 เช้าอย่างเดียว: ตรงพอดี
  w.incPick(2);
  w.incInput(2,'sales_pos_am',7000); w.incInput(2,'deposit_am',7000);
  await new Promise(r=>setTimeout(r,50));
  const rep=d.getElementById('incRep');
  const rows=[...rep.querySelectorAll('.drrow:not(.head):not(.tot)')];
  out.push('head: '+rep.querySelector('.drrow.head').textContent.replace(/\s+/g,' ').trim());
  out.push('row1: '+rows[0].textContent.replace(/\s+/g,' ').trim());
  out.push('row2: '+rows[1].textContent.replace(/\s+/g,' ').trim());
  out.push('tot: '+rep.querySelector('.drrow.tot').textContent.replace(/\s+/g,' ').trim());
  out.push('colors: neg='+rep.querySelectorAll('.drn').length+' pos='+rep.querySelectorAll('.drp').length);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
