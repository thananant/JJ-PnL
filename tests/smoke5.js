const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({SheetNames:[],Sheets:{}}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({rows:r})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
let cashId=500;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_cash_expenses')){
        let b=JSON.parse(opt.body); if(Array.isArray(b))b=b[0];
        const row=[{id:cashId++,...b}];
        return {ok:true,status:201,text:async()=>JSON.stringify(row),headers:{get:()=>null}};
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
  // ปฏิทิน: ส.ค. 2026 เริ่มวันเสาร์ -> ช่องว่างนำ 6 ช่อง
  const cal=d.querySelector('#incChips .calgrid');
  const kids=[...cal.children];
  const heads=kids.slice(0,7).map(x=>x.textContent).join(' ');
  const blanks=kids.slice(7).findIndex(x=>x.tagName==='BUTTON');
  out.push('headers: '+heads);
  out.push('leading blanks: '+blanks+' (ควรเป็น 6 เพราะ 1 ส.ค. = เสาร์)');
  const btn1=cal.querySelector('button[data-d="1"]');
  out.push('day1 sun? '+btn1.classList.contains('sun')+' | day2 sun? '+cal.querySelector('button[data-d="2"]').classList.contains('sun')+' (2 ส.ค. = อาทิตย์ ควร true)');
  out.push('today marked: '+(cal.querySelector('button.tdy')?.dataset.d));
  // กล่องกะ
  w.incPick(1);
  await new Promise(r=>setTimeout(r,30));
  out.push('shiftboxes: '+d.querySelectorAll('.shiftbox').length+' | am? '+!!d.querySelector('.shiftbox.am')+' pm? '+!!d.querySelector('.shiftbox.pm'));
  out.push('posin fields: '+d.querySelectorAll('.posin').length);
  // กรอก: เช้า POS 10000, ฝาก 9000, เก๊ะ 1200, เก๊ะเปิด 200 -> counted 10200, base 200, net 10000 = ตรง
  w.incInput(1,'sales_pos_am',10000); w.incInput(1,'deposit_am',9000);
  w.incInput(1,'cash_drawer_am',1200); w.incInput(1,'drawer_open_am',200);
  await new Promise(r=>setTimeout(r,30));
  out.push('cl1am: '+d.getElementById('cl1am').textContent.replace(/\s+/g,' ').trim());
  out.push('sd1am: '+d.getElementById('sd1am').textContent.trim());
  // แท็บรายจ่าย: ปฏิทินต้องมี
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,80));
  out.push('exp calgrid: '+!!d.querySelector('#view-exp .calgrid'));
  const expBtn=d.querySelector('#view-exp .calgrid button[data-d="10"]');
  expBtn.click(); await new Promise(r=>setTimeout(r,80));
  out.push('expDay after click10: '+d.querySelector('#view-exp .calgrid button.on')?.dataset.d);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
