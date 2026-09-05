const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:535000,sales_pos_pm:535000,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_fixed_items'))return T([{id:1,branch:'JJRD',grp:'รายเดือน',name:'ค่าเช่า',default_amount:120000,sort:1,active:true},{id:2,branch:'JJRD',grp:'รายเดือน',name:'ค่าขยะ',default_amount:650,sort:2,active:true}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
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
  await new Promise(r=>setTimeout(r,350));
  const kpis=[...d.querySelectorAll('#view-dash .kpi')];
  out.push('kpi boxes: '+kpis.length+' (คาด 5)');
  const fx=kpis.find(k=>k.querySelector('.t')?.textContent==='Fix cost');
  out.push('Fix cost box: '+fx.textContent.replace(/\s+/g,' ').trim());
  // 120650 / 1000000 = 12.07%(revenue = 1,070,000/1.07 = 1,000,000)
  out.push('value 120,650: '+fx.textContent.includes('120,650')+' | pct 12.07%: '+fx.textContent.includes('12.07%'));
  fx.querySelector('.hintlink').click();
  await new Promise(r=>setTimeout(r,200));
  out.push('link -> view: '+d.querySelector('.view.on')?.id);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
