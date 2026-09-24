// เครื่องจำลองปฏิทินสั่งของ — รัน "เอนจินจริง" ของ jjmk-stockcheck.html (orderPlan/deliveryDate/nextDeliveryAfter) ใน jsdom
// กับสแนปช็อตข้อมูลจาก sql/jjmk_export_sim.sql (CSV) แล้วไล่วันขายทีละวัน ออกเป็น JSON
// ใช้: node scripts/sim-orders.js snapshot.csv 2026-11-01 15 out.json
//   สมมติ: นับสต๊อกทุกวัน ได้ 0 ทุกตัว (ไม่มีของค้าง) → ยอดสั่ง = ยอดที่ต้องเผื่อจนของชุดหน้ามา · ไม่มีใบสั่งค้างทาง
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const [,,CSV,START,NDAYS,OUT]=process.argv;
if(!CSV||!START){console.error('ใช้: node scripts/sim-orders.js snapshot.csv YYYY-MM-DD [days=15] [out.json]');process.exit(1);}
const N=parseInt(NDAYS||'15',10);
const html=fs.readFileSync('jjmk-stockcheck.html','utf8').replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const BR={JJRD:'b19f0a17b4472',JJLP:'b19f0a17b448212'};
function parseCSV(t){ // CSV ธรรมดา รองรับ "..." และ "" ข้างใน
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else if(c==='"')q=true; else if(c===','){row.push(cur);cur='';}
    else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}
    else if(c!=='\r')cur+=c; }
  if(cur!==''||row.length){row.push(cur);rows.push(row);}
  const h=rows.shift(); return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k.trim(),(r[i]||'').trim()])));
}
const snap=parseCSV(fs.readFileSync(CSV,'utf8'));
const num=v=>{const n=parseFloat(String(v??'').replace(/,/g,''));return isNaN(n)?null:n;};
const addDays=(ds,n)=>{const d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+n);const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
// ---- ซัพ: รวมจากทุกแถว (กติกาเดียวกันทั้ง 2 สาขา) ----
const sups={};
snap.forEach(r=>{const n=(r.sup_name||r.sup||'').trim(); if(!n||sups[n])return;
  let sch={}; try{sch=JSON.parse(r.schedule||'{}')||{};}catch(e){}
  sups[n]={name:n,order_mode:r.order_mode||'any',schedule:sch,lead_days:parseInt(r.lead_days,10)||1,
    order_ahead:parseInt(r.order_ahead,10)||0,prepay:String(r.prepay).toLowerCase()==='true',
    line_group_id:r.line_group_id||null,cutoff:r.cutoff||null,min_cases:num(r.min_cases),cycle_days:num(r.cycle_days)};});
const prodsOf=code=>snap.filter(r=>r.branch_code===code).map((r,i)=>({id:r.product_id||(code+'_'+i),branch_id:BR[code],
  cat_label:r.dept||'',dept:r.dept||'',name:r.name,unit:r.unit,sup:r.sup,rate_wk:num(r.rate_wk),rate_fri:num(r.rate_fri),rate_we:num(r.rate_we),
  image_url:null,sort:i,zone:null}));
async function simBranch(code){
  const prods=prodsOf(code);
  const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'sim',role:'admin',branches:[],depts:[],active:true}];
  const vc=new JSDOM(html,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
      w.localStorage.setItem('jjsc_br',code); w.localStorage.setItem('jjsc_tab','order');
      w.localStorage.setItem('jjsc_lgsync',String(Date.now())); w.localStorage.setItem('JJSC_NOPREWARM','1');
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
        if(method!=='GET')return T([]);
        if(url.includes('sc_users')){const um=url.match(/username=eq\.([^&]+)/);return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);}
        if(url.includes('pnl_')||url.includes('sc_depts')||url.includes('sc_units')||url.includes('sc_i18n')||url.includes('sc_config')||url.includes('line_groups')||url.includes('config')||url.includes('stock_receipts')||url.includes('stock_current'))return T([]);
        if(url.includes('products')&&url.includes('branch_id=in.'))return T([].concat(prodsOf('JJRD'),prodsOf('JJLP')));
        if(url.includes('products'))return T(prods);
        if(url.includes('suppliers'))return T(Object.values(sups));
        if(url.includes('stock_counts'))return T(prods.map(p=>({product_id:p.id,qty:0,out_of_stock:false,created_at:'2026-01-01T23:00:00Z'}))); // นับได้ 0 ทุกตัว ทุกวัน
        return T([]);
      };
      w.TextEncoder=TextEncoder; w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,700));
  const days=[];
  for(let k=0;k<N;k++){
    const cd=addDays(START,k);
    d.getElementById('cd').value=cd; d.getElementById('cd').dispatchEvent(new w.Event('change'));
    await new Promise(r=>setTimeout(r,120));
    const plan=JSON.parse(w.eval(`JSON.stringify(orderPlan().map(g=>({sup:g.sup,d:g.dl.d,od:g.dl.od,ahead:g.dl.ahead,mode:g.dl.mode,lead:g.dl.lead,unset:!!g.dl.unset,
      nx:g.nx,covDays:g.covDays,covTxt:g.covTxt,nOrder:g.nOrder,nNoRate:g.nNoRate,
      prepay:!!((supSched(g.sup)||{}).prepay),lineGroup:!!(lineOf(g.sup)&&lineOf(g.sup).group_id),
      rows:g.rows.map(r=>({name:r.it.name,unit:r.it.unit||'',dept:deptOf(r.it),need:r.need,order:r.order,covDays:r.cov.days,pre:r.pre.sum,
        rate_wk:r.it.rate_wk,rate_fri:r.it.rate_fri,rate_we:r.it.rate_we}))})))`));
    days.push({cd,dow:new Date(cd+'T12:00:00').getDay(),plan});
  }
  return {code,errors:w.errors,nProducts:prods.length,days};
}
(async()=>{
  const out={start:START,days:N,generatedFrom:CSV,suppliers:sups,branches:{}};
  for(const code of ['JJRD','JJLP']){ out.branches[code]=await simBranch(code); console.error(code,'สินค้า',out.branches[code].nProducts,'· errors',JSON.stringify(out.branches[code].errors)); }
  const js=JSON.stringify(out,null,1);
  if(OUT)fs.writeFileSync(OUT,js); else process.stdout.write(js);
  process.exit(0);
})();
