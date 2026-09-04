// smoke66: ข้อมูลย้อนหลังที่นำเข้าด้วย jjmk_pnl_history_import_2569.sql — แอพอ่านแล้วคิด "เฉลี่ย" ถูก
// JJLP ดูเดือน ส.ค. 69 → หน้าต่าง 8 เดือนก่อน (ธ.ค.68–ก.ค.69) มี history ม.ค.–ก.ค. → ใช้ 5 เดือนล่าสุด (มี.ค.–ก.ค.)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const H=JSON.parse(fs.readFileSync('tests/fixtures/fix_history.json','utf8'));
const I=JSON.parse(fs.readFileSync('tests/fixtures/fix_items.json','utf8'));
const SUP=JSON.parse(fs.readFileSync('tests/fixtures/fix_sup.json','utf8'));
const pre=`<script>
window.Chart=function(el,cfg){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(d,amt)=>({branch:'JJLP',d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const supId=n=>SUP.find(s=>s.name===n).id;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJLP')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T(SUP);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_history_items')){ const m=url.match(/branch=eq\.(\w+)/); return T(I.filter(r=>!m||r.branch===m[1])); }
      if(url.includes('pnl_history')){ const m=url.match(/branch=eq\.(\w+)/); return T(H.filter(r=>!m||r.branch===m[1])); }
      // เดือน ส.ค. 69: ขาย 2 วัน 214,000 (ก่อน VAT 200,000) · FarmFresh 8,000 = 4.00%
      if(url.includes('pnl_income_daily')&&url.includes('JJLP')&&url.includes('2026-08'))return T([inc('2026-08-01',107000),inc('2026-08-02',107000)]);
      if(url.includes('pnl_income_daily'))return T([]);
      if(url.includes('pnl_expense_daily')&&url.includes('JJLP')&&url.includes('2026-08'))return T([{branch:'JJLP',d:'2026-08-02',supplier_id:supId('FarmFresh'),amount:8000,paid:true}]);
      if(url.includes('pnl_expense_daily'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document; const S=()=>w.eval('S');
const near=(a,b,t)=>Math.abs(a-b)<(t||0.0005);
setTimeout(async()=>{
  const out=[];
  await new Promise(r=>setTimeout(r,800));
  out.push('สาขา/เดือนที่ดู: '+S().br+' '+S().m+' → '+(S().br==='JJLP'&&S().m==='2026-08'));
  const B=S().dynBench;
  out.push('dynBench ใช้ทุกเดือนที่มีข้อมูล 7 เดือน ม.ค.–ก.ค.: '+(B&&B.n===7&&JSON.stringify(B.months)==='["2026-07","2026-06","2026-05","2026-04","2026-03","2026-02","2026-01"]'));
  // คำนวณค่าคาดหวังจาก fixture ตรง ๆ (JJLP 7 เดือน)
  const jl=mo=>({rev:H.filter(h=>h.branch==='JJLP'&&h.month===mo).reduce((a,h)=>a+Number(h.revenue),0),
                 its:I.filter(i=>i.branch==='JJLP'&&i.month===mo)});
  const mos7=['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'];
  const expTot=mos7.map(mo=>{const {rev,its}=jl(mo);return its.reduce((a,i)=>a+Number(i.amount),0)/rev;}).reduce((a,c)=>a+c,0)/7;
  out.push('VC% เฉลี่ยรวม 7 เดือน '+(expTot*100).toFixed(2)+'%: '+(B&&near(B.total.avg,expTot,0.0002))+' ('+(B&&(B.total.avg*100).toFixed(2))+')');
  const expFF=(()=>{const L=mos7.map(mo=>{const {rev,its}=jl(mo);const x=its.find(i=>i.name==='FarmFresh');return x?Number(x.amount)/rev:null;}).filter(v=>v!=null);return L.reduce((a,c)=>a+c,0)/L.length;})();
  out.push('FarmFresh เฉลี่ย 7 เดือน '+(expFF*100).toFixed(2)+'%: '+(B&&near(B.map['FarmFresh'].avg,expFF,0.0002))+' ('+(B&&(B.map['FarmFresh'].avg*100).toFixed(3))+')');
  // Pure food มีแค่ พ.ค.–ก.ค. (3 เดือน) = (4.47+3.23+0.15)/3 = 2.617%
  out.push('Pure food เฉลี่ยเฉพาะเดือนที่มียอด (3 เดือน) 2.62%: '+(B&&B.map['Pure food'].n===3&&near(B.map['Pure food'].avg,0.02617,0.0002)));
  out.push('ชื่อ map ตรงซัพในแอพ: AFM ธาริกันฟู้ดส์ / TRR (ม้าบิน) / Freshy Syrup (TRR Food product): '+(B&&!!B.map['AFM ธาริกันฟู้ดส์']&&!!B.map['TRR (ม้าบิน)']&&!!B.map['Freshy Syrup (TRR Food product)']));
  const txt=d.body.textContent;
  out.push('ตารางซัพบอก "อิงข้อมูลจริงทุกเดือนที่มี (7 เดือน)": '+txt.includes('อิงข้อมูลจริงทุกเดือนที่มี (7 เดือน)'));
  // แถว FarmFresh: เดือนนี้ 4.00% · เฉลี่ย = ค่าจาก fixture
  const row=[...d.querySelectorAll('tr')].find(tr=>tr.textContent.startsWith('FarmFresh'));
  out.push('แถว FarmFresh เดือนนี้ 4.00% เฉลี่ย '+(expFF*100).toFixed(2)+'%: '+(!!row&&row.textContent.includes('4.00%')&&row.textContent.includes((expFF*100).toFixed(2)+'%')));
  // ALL: รวม 2 สาขา ก.ค. = history JJLP+JJRD
  w.eval("S.br='ALL'; S.benchCache={};"); const all=await w.eval("loadBenchWindow('ALL','2026-08')");
  // คาดหวัง: เฉลี่ยของ VC%/เดือน 5 เดือน (มี.ค.–มิ.ย. = JJLP · ก.ค. = JJLP+JJRD รวมกัน) คำนวณจาก fixture ตรง ๆ
  const pct=mo=>{const rev=H.filter(h=>h.month===mo).reduce((a,h)=>a+Number(h.revenue),0); const vcs=I.filter(i=>i.month===mo).reduce((a,i)=>a+Number(i.amount),0); return vcs/rev;};
  const exp=['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'].map(pct).reduce((a,c)=>a+c,0)/7;
  out.push('โหมด ALL ทุกเดือน (ก.ค. = JJLP+JJRD) เฉลี่ย '+(exp*100).toFixed(2)+'%: '+(all.n===7&&near(all.total.avg,exp,0.0002))+' ('+(all.total.avg*100).toFixed(2)+')');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},900);
