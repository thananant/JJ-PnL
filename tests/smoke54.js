const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(el,cfg){window.__charts=(window.__charts||[]);window.__charts.push(cfg);this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(d,amt)=>({branch:'JJRD',d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ขาย 4 วัน: 10,700 / 21,400 / 10,700 / 32,100 (revenue 74,900)
      if(url.includes('pnl_income_daily')&&url.includes('JJRD'))return T([inc('2026-08-01',10700),inc('2026-08-02',21400),inc('2026-08-03',3210),inc('2026-08-04',32100)]);
      if(url.includes('pnl_income_daily'))return T([]);
      // ต้นทุนผันแปร (บิลซัพ) 22,470 = 30% ของรายได้
      if(url.includes('pnl_expense_daily')&&url.includes('JJRD'))return T([{branch:'JJRD',d:'2026-08-02',supplier_id:1,amount:22470,paid:true}]);
      if(url.includes('pnl_expense_daily'))return T([]);
      // Fix cost 40,000/เดือน
      if(url.includes('pnl_fixed_items'))return T([{id:1,name:'ค่าเช่า',grp:'รายเดือน',default_amount:40000,sort:1,active:true,branch:'JJRD'}]);
      if(url.includes('pnl_fixed_monthly'))return T([]);
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
  // dash คือหน้าแรก — รอโหลด
  await new Promise(r=>setTimeout(r,600));
  const ar=d.getElementById('avgRow').textContent;
  out.push('chip Fix/วัน ฿1,290: '+(ar.includes('Fix/วัน')&&ar.includes('฿1,290')));
  out.push('chip คุ้มทุน/วัน ฿6,908 (1,290+22,470÷4): '+(ar.includes('คุ้มทุน/วัน')&&ar.includes('฿6,907.82')));
  out.push('โน้ตแท่งเขียว: '+ar.includes('เขียว'));
  const cfg=(w.__charts||[]).find(c=>c&&c.type==='bar'&&c.data&&c.data.datasets&&c.data.datasets.length>3);
  const lines=cfg.data.datasets.filter(x=>x.type==='line').map(x=>x.borderColor);
  out.push('มีเส้นเหลือง+น้ำตาล: '+(lines.includes('#E0B33C')&&lines.includes('#8B5A2B')));
  const bg=cfg.data.datasets[0].backgroundColor;
  const g=c2=>String(c2).includes('8FD6A4')||String(c2).includes('1E8A3C');
  out.push('แท่ง: วัน1,2,4 เขียว · วัน3 (3,210) แดงเดิม: '+(g(bg[0])&&g(bg[1])&&!g(bg[2])&&g(bg[3])));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},650);
