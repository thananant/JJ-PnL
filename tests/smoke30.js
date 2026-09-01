const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// รายรับ 15 วัน วันละ POS 10,700 (รวม VAT) -> exVat วันละ 10,000
const rows=[]; for(let d=1;d<=15;d++){const ds='2026-08-'+String(d).padStart(2,'0');
  rows.push({branch:'JJRD',d:ds,sales_pos_am:10700,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});}
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:rows);
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
  d.querySelector('.sb-item[data-v="sum"]').click();
  await new Promise(r=>setTimeout(r,300));
  const sum=d.getElementById('view-sum');
  const t=sum.textContent;
  out.push('auto note 15 วัน: '+t.includes('อัตโนมัติตามวันที่มีรายรับ 15 วัน'));
  out.push('เฉลี่ย/วัน ฿10,000: '+t.includes('เฉลี่ย/วัน ฿10,000'));
  const inp=[...sum.querySelectorAll('input')].find(i=>i.placeholder==='15');
  out.push('divisor input ว่าง+placeholder 15: '+(inp&&inp.value===''));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
