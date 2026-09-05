const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl-beta.html','utf8');
const pre=`<script>
window.__charts={};
window.Chart=function(el,cfg){ if(el)window.__charts[el.id]=cfg; this.destroy=()=>{};this.update=()=>{}; };
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// วันนี้ = 2026-08-20 (วันจริงของ jsdom clock) — mock ข้อมูลเดือน ส.ค.
const today=new Date(); const M=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
const D=today.getDate(); const ds=`${M}-${String(D).padStart(2,'0')}`;
const mkInc=(d,am,pm)=>({branch:'JJRD',d:`${M}-${String(d).padStart(2,'0')}`,sales_pos_am:am,sales_pos_pm:pm,deposit_am:am,deposit_pm:pm,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const incRows=[mkInc(D,10700,0)]; if(D>1)incRows.push(mkInc(D-1,21400,0));
const meta={branch:'JJRD',month:M,grab:0,lineman:0,days_divisor:null,note:'',locked:false};
const saves=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('pnl_month_meta')){saves.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
        {id:2,name:'Knock Knock',category:'ของใช้',active:true,sort:2,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_month_meta'))return T([meta]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.'+M))return T(url.includes('JJLP')?[]:incRows);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.'+M))return T(url.includes('JJLP')?[]:[
        {branch:'JJRD',d:ds,supplier_id:1,amount:5000,paid:false,slip_url:null}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  // 1) แท็บวันนี้เป็นค่าเริ่มต้น
  out.push('start tab: '+d.querySelector('.view.on')?.id+' (คาด view-home)');
  await new Promise(r=>setTimeout(r,300));
  const hv=d.getElementById('view-home');
  out.push('hero มียอดวันนี้ ฿10,700: '+hv.textContent.includes('10,700'));
  out.push('checklist เช้า✓ เย็น!: '+(hv.textContent.includes('รายรับกะเช้า')&&hv.textContent.includes('ยังไม่ลง')));
  out.push('ค้างจ่าย 1 บิล ฿5,000: '+hv.textContent.includes('1 บิล · ฿5,000'));
  // copy summary
  let copied=null; w.navigator.clipboard={writeText:t=>{copied=t;return Promise.resolve();}};
  w.copyToday(); await new Promise(r=>setTimeout(r,30));
  out.push('copy has ยอดขาย+ค้างจ่าย: '+(copied.includes('฿10,700')&&copied.includes('ค้างจ่ายสะสม')));
  // 2) รายจ่าย: ค้นหา + เฉพาะมียอด + พับหมวด
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,300));
  const rows=()=>[...d.querySelectorAll('#expForm .exrow')].filter(x=>x.style.display!=='none').length;
  out.push('rows ทั้งหมด: '+rows());
  d.getElementById('supSearch').value='knock'; w.expFilter();
  out.push('ค้นหา knock เหลือ: '+rows()+' (คาด 1)');
  d.getElementById('supSearch').value=''; w.toggleOnlyVal();
  out.push('เฉพาะมียอด เหลือ: '+rows()+' (คาด 1 FarmFresh)');
  w.toggleOnlyVal();
  w.toggleCat('อาหาร');
  const foodCard=[...d.querySelectorAll('#expForm .exCat')].find(c=>c.dataset.cat==='อาหาร');
  out.push('พับหมวดอาหาร: '+(foodCard.querySelector('.catbody').style.display==='none')+' caret ▸: '+(foodCard.querySelector('.caret').textContent==='▸'));
  // 3) ล็อกเดือน
  d.querySelector('.sb-item[data-v="sum"]').click();
  await new Promise(r=>setTimeout(r,300));
  const lockBtn=[...d.querySelectorAll('#view-sum button')].find(b=>b.textContent.includes('ปิดเดือน'));
  out.push('มีปุ่มปิดเดือน: '+!!lockBtn);
  await w.toggleLock(); await new Promise(r=>setTimeout(r,200));
  out.push('meta saved locked:true: '+saves.flat().some(r=>r.locked===true));
  // ลองแก้รายจ่าย -> ต้องโดนบล็อก
  w.expInput(ds,1,'999');
  await new Promise(r=>setTimeout(r,100));
  out.push('lock บล็อกแก้: '+d.getElementById('toast').textContent.includes('ปิดแล้ว'));
  // income tab banner
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,250));
  out.push('income banner ล็อก: '+d.getElementById('view-income').textContent.includes('เดือนนี้ปิดแล้ว'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
