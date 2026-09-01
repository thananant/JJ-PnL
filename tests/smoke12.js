const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');

// mock: เดือนปัจจุบัน ส.ค. 2026 · supplier id 5 = Smilemeat
// ข้อมูลจริงเดือน ก.ค. (2026-07): ยอดขาย 1,070,000 → rev 1,000,000 / Smilemeat 80,000 → 8%
// history เดือน มิ.ย. (2026-06): rev 500,000 / Smilemeat 30,000 → 6%   ⇒ avg 7% min 6%
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method!=='GET') return T([]);
      if(url.includes('pnl_suppliers')) return T([{id:5,name:'Smilemeat',category:'อาหาร',active:true,sort:1}]);
      if(url.includes('pnl_branches')) return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_benchmarks')) return T([{bkey:'Smilemeat',period:'1/68',pct:0.10}]); // static เดิม 10%
      if(url.includes('pnl_fixed_items')) return T([]);
      if(url.includes('pnl_meat_prices')) return T([]);
      // ---- ช่วง benchmark window (มี d=gte เดือนก่อนๆ ไม่ใช่เดือนปัจจุบัน) ----
      if(url.includes('pnl_income_daily')&&url.includes('d=lte.2026-07-31')){
        return T([{d:'2026-07-10',sales_pos_am:500000,sales_pos_pm:570000}]); // 1,070,000
      }
      if(url.includes('pnl_expense_daily')&&url.includes('d=lte.2026-07-31')){
        return T([{d:'2026-07-10',supplier_id:5,amount:80000}]);
      }
      if(url.includes('pnl_history_items')) return T([{branch:'JJRD',month:'2026-06',name:'Smilemeat',amount:30000}]);
      if(url.includes('pnl_history')) return T([{branch:'JJRD',month:'2026-06',revenue:500000}]);
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
  // ทดสอบ loadBenchWindow ตรง ๆ
  const bw=await w.loadBenchWindow('JJRD','2026-08');
  out.push('months used: '+JSON.stringify(bw.months)+' n='+bw.n);
  const sm=bw.map['Smilemeat'];
  out.push('Smilemeat avg: '+(sm.avg*100).toFixed(2)+'% min: '+(sm.min*100).toFixed(2)+'% n='+sm.n+' (คาด avg 7.00 min 6.00)');
  out.push('total vc: '+JSON.stringify(bw.total&&{avg:+(bw.total.avg*100).toFixed(2),n:bw.total.n}));
  // benchOf ต้องใช้ dynamic ก่อน static

  w.__bw=bw; w.eval('S.dynBench=window.__bw');
  const b=w.benchOf('Smilemeat');
  out.push('benchOf uses dynamic: '+((b.avg*100).toFixed(2)==='7.00'));
  // parser Excel (AoA จากโครงจริง)
  const incAoA=[[],[],['บันทึกรายรับ'],[],[null,'พ'],['',1,null,2],['ยอดขาย',10000,20000,15000,5000],['เงินฝาก'],['เงินเก๊ะ'],[],['ยอดเงินโอน'],['ยอดเงินบัญชีสำรอง'],['รายจ่ายเงินสด',100,200,50,0]];
  const expAoA=[[2],[null,null,null,null,'บันทึกรายจ่าย'],[null,'',null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,'ยอดรวม 1-15'],[null,'อาหาร'],[1,'FarmFresh',null,null,111,222,0,0,0,0,0,0,0,0,0,0,0,0,0,999999],[2,'ธาริกันฟู้ดส์',null,null,50,50,0,0,0,0,0,0,0,0,0,0,0,0,0,888]];
  const r=w.parseHistoryWB({'รายรับ':incAoA,'รายจ่าย':expAoA});
  out.push('parse pos=50000: '+(r.pos===50000)+' | FarmFresh=333: '+(r.items['FarmFresh']===333)+' | mapชื่อ AFM: '+(r.items['AFM ธาริกันฟู้ดส์']===100));
  out.push('cash เช้า=150 เย็น=200: '+(r.items['กะเช้า']===150&&r.items['กะเย็น']===200));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},500);
