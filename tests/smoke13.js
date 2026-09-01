const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
let chartArgs=null;
const pre=`<script>
window.Chart=function(el,cfg){ window.__chart=cfg; this.destroy=()=>{}; this.update=()=>{}; };
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// ส.ค. 2026: 1=ส 2=อา 3=จ 4=อ 5=พ 6=พฤ 7=ศ
const mkRow=(d,am,pm)=>({branch:'JJRD',d:'2026-08-0'+d,sales_pos_am:am,sales_pos_pm:pm,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const rows=[mkRow(1,100000,100000),mkRow(2,50000,50000),mkRow(3,30000,30000),mkRow(7,60000,60000)];
// หนัก: วัน1(ส)=200k วัน2(อา)=100k วัน7(ศ)=120k -> avg 140k | ธรรมดา: วัน3(จ)=60k -> avg 60k | ทั้งเดือน avg (200+100+60+120)/4=120k
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if((opt&&opt.method||'GET')==='GET'&&url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08-01'))return T(rows);
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
  await new Promise(r=>setTimeout(r,300));
  const ar=d.getElementById('avgRow');
  out.push('avg chips: '+ar.textContent.replace(/\s+/g,' ').trim());
  const cfg=w.__chart;
  out.push('datasets: '+cfg.data.datasets.length+' (แท่ง 1 + เส้น 3)');
  out.push('line values: '+cfg.data.datasets.slice(1).map(ds=>ds.data[0]).join(' | '));
  const bg=cfg.data.datasets[0].backgroundColor;
  out.push('bar colors d1(ส)/d3(จ)/d7(ศ): '+bg[0]+' / '+bg[2]+' / '+bg[6]);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
