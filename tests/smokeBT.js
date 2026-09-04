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
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:535000,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:5,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=lte.2026-07-31'))return T([{d:'2026-07-10',sales_pos_am:1070000,sales_pos_pm:0}]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=lte.2026-07-31'))return T([{d:'2026-07-10',supplier_id:5,amount:300000}]);
      if(url.includes('pnl_history_items'))return T([{branch:'JJRD',month:'2026-06',name:'Smilemeat',amount:200000}]);
      if(url.includes('pnl_history'))return T([{branch:'JJRD',month:'2026-06',revenue:800000}]);
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
  d.querySelector('.sb-item[data-v="dash"]').click();
  await new Promise(r=>setTimeout(r,400));
  const t=w.__charts['chTrend'];
  out.push('trend exists: '+!!t);
  out.push('labels: '+t.data.labels.join(' | '));
  out.push('rev: '+t.data.datasets[0].data.join('/')+' | vc%: '+t.data.datasets[1].data.join('/'));
  out.push('card visible: '+(d.getElementById('trendCard').style.display===''));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
