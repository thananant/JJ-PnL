const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// จำลองข้อมูล income 2 วัน
const incRows=[
 {branch:'JJRD',d:'2026-08-01',sales_pos_am:68229.62,sales_pos_pm:175694,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0},
 {branch:'JJRD',d:'2026-08-02',sales_pos_am:65705.49,sales_pos_pm:141236.79,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}
];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      if(method==='GET'&&url.includes('pnl_income_daily')&&url.includes('d=gte')){
        return {ok:true,status:200,text:async()=>JSON.stringify(incRows),headers:{get:()=>null}};
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
  // แดชบอร์ดโหลดตอน boot อยู่แล้ว
  await new Promise(r=>setTimeout(r,300));
  const dash=d.getElementById('view-dash');
  const card=[...dash.querySelectorAll('.card h3')].find(h=>h.textContent.includes('ยอดขายดิบรายวัน'));
  out.push('sales table card: '+!!card);
  const rep=card.parentElement.querySelector('.dayrep');
  const rows=[...rep.querySelectorAll('.drrow:not(.head):not(.tot)')];
  out.push('rows: '+rows.length);
  out.push('row1: '+rows[0].textContent.replace(/\s+/g,' ').trim());
  out.push('tot: '+rep.querySelector('.drrow.tot').textContent.replace(/\s+/g,' ').trim());
  // คลิกแถว -> ไปหน้ารายรับวันนั้น
  rows[1].click();
  await new Promise(r=>setTimeout(r,80));
  out.push('after click row2 -> view: '+d.querySelector('.view.on')?.id+' day card: '+d.querySelector('.dayc')?.id);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
