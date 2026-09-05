const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.__charts={};
window.Chart=function(el,cfg){ if(el)window.__charts[el.id]=cfg; this.destroy=()=>{};this.update=()=>{}; };
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
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_fixed_items'))return T([{id:1,branch:'JJRD',grp:'รายเดือน',name:'ค่าเช่า',default_amount:120000,sort:1,active:true}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:[{branch:'JJRD',d:'2026-08-01',supplier_id:1,amount:300000,paid:false}]);
      if(url.includes('pnl_extra_expenses'))return T(url.includes('JJLP')?[]:[{id:1,branch:'JJRD',d:'2026-08-02',descr:'ซ่อม',amount:8000}]);
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
  // มินิ 2 ใบ: legend ปิด + % list ข้างวง
  const dou=w.__charts['chDou'], rev=w.__charts['chRev'];
  out.push('mini legends off: '+(dou.options.plugins.legend.display===false&&rev.options.plugins.legend.display===false));
  out.push('douPct: '+d.getElementById('douPct').textContent.replace(/\s+/g,' ').trim());
  out.push('revPct: '+d.getElementById('revPct').textContent.replace(/\s+/g,' ').trim());
  out.push('note: '+d.getElementById('revNote').textContent);
  // แตะขยาย
  w.douBig('rev');
  await new Promise(r=>setTimeout(r,80));
  const big=w.__charts['chBig'];
  out.push('big chart: '+!!big+' | legend on: '+(big.options.plugins.legend.position==='bottom'));
  const legends=big.options.plugins.legend.labels.generateLabels({data:big.data});
  out.push('big legend %: '+legends.map(l=>l.text).join(' | '));
  const tt=big.options.plugins.tooltip.callbacks.label({label:'Fix cost',raw:120000});
  out.push('big tooltip: '+tt);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
