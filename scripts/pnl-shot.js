// เครื่องมือ dev: เรนเดอร์ jjmk-pnl.html ขนาดมือถือแล้วบันทึกภาพ (mock Supabase + CDN ทั้งหมด)
// ใช้: node scripts/pnl-shot.js out.png exp        (แท็บ: dash/income/exp/detail/vatrep/usage/sum/pv/...)
const {chromium}=require('playwright');
const M='2026-08';
const SUPS=[{id:1,name:'ตลาดสด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
            {id:2,name:'Yannah Beef',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},
            {id:3,name:'สยามแม็คโคร',category:'อาหาร',active:true,sort:3,vat_type:'VAT'}];
const EXP=[],INC=[];
for(let d=1;d<=31;d++){
  const ds=`${M}-${String(d).padStart(2,'0')}`;
  SUPS.forEach(s=>{ if((d+s.id)%3) EXP.push({branch:'JJRD',d:ds,supplier_id:s.id,amount:12000+((d*s.id*997)%90000),paid:(d+s.id)%4===0,slip_url:null}); });
  INC.push({branch:'JJRD',d:ds,total:90000+((d*7919)%60000),cash:20000,transfer:30000,card:10000,delivery:5000,cash_drawer_pm:3000});
}
const routes=u=>{
  if(u.includes('pnl_users'))return null;
  if(u.includes('pnl_branches'))return [{code:'JJRD',name:'รัชดา',sort:1},{code:'JJLP',name:'ลาดพร้าว',sort:2},{code:'OFF',name:'ออฟฟิศ',sort:3}];
  if(u.includes('pnl_suppliers'))return SUPS;
  if(u.includes('pnl_expense_daily'))return EXP;
  if(u.includes('pnl_income_daily'))return INC;
  if(u.includes('pnl_fixed_items'))return [{id:1,name:'เงินเดือนพนักงานหน้าสาขา',group_name:'พนักงาน',amount:813102,sort:1},
    {id:2,name:'พนักงานเบิก 15',group_name:'พนักงาน',amount:74500,sort:2},
    {id:3,name:'ค่าเช่าพื้นที่',group_name:'รายเดือน',amount:120000,sort:3},
    {id:4,name:'ค่าบริการพื้นที่ VAT (30,000)',group_name:'รายเดือน',amount:32100,sort:4},
    {id:5,name:'ค่าขยะ',group_name:'รายเดือน',amount:3000,sort:5}];
  return [];
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
  const W=parseInt(process.env.W||'390',10),H=parseInt(process.env.H||'844',10);
  const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.route('**/*',async r=>{
    const u=r.request().url();
    if(u.includes('supabase.co')){
      if(u.includes('/storage/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
      const v=routes(u);
      if(v===null)return r.fulfill({status:404,contentType:'application/json',body:'{}'});
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(v)});
    }
    if(u.includes('fonts.googleapis')||u.includes('fonts.gstatic'))return r.fulfill({status:200,contentType:'text/css',body:''});
    if(u.match(/cdnjs|jsdelivr|unpkg/))return r.fulfill({status:200,contentType:'application/javascript',
      body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Chart.defaults={font:{},plugins:{}};'
          +'window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};'
          +'window.Tesseract={recognize:async()=>({data:{text:""}})};'});
    return r.continue();
  });
  const pg=await ctx.newPage();
  await pg.addInitScript(m=>{localStorage.setItem('jjpnl_m',JSON.stringify(m));localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));},M);
  await pg.goto('file://'+process.cwd()+'/jjmk-pnl.html');
  await pg.waitForTimeout(1800);
  const tab=process.argv[3]||'exp';
  await pg.evaluate(t=>window.show&&window.show(t),tab);
  await pg.waitForTimeout(1500);
  const w=await pg.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth,
    vw:visualViewport&&Math.round(visualViewport.width),dpr:devicePixelRatio,
    over:[...document.querySelectorAll('body *')].map(e=>({e,r:e.getBoundingClientRect()}))
      .filter(x=>x.r.width>390.5||x.r.right>390.5).slice(0,12)
      .map(x=>x.e.tagName+'.'+(x.e.className||'').toString().slice(0,26)+' w='+Math.round(x.r.width)+' right='+Math.round(x.r.right)+' pos='+getComputedStyle(x.e).position),
    hrow:document.querySelector('.hrow')?.scrollWidth,head:document.querySelector('header')?.getBoundingClientRect().height}));
  console.log('scrollWidth',w.doc,'· innerWidth',w.win,'· visualVP',w.vw,'· ล้นแนวนอน:',w.doc>w.win,'· hrow',w.hrow,'· สูงหัวจอ',Math.round(w.head));
  console.log('กล่องที่กว้างเกินจอ:',JSON.stringify(w.over));
  const chain=await pg.evaluate(()=>{const t=[...document.querySelectorAll('table')].find(x=>x.getBoundingClientRect().width>innerWidth+2);if(!t)return null;const out=[];
    for(let e=t;e&&e!==document.body;e=e.parentElement){const cs=getComputedStyle(e);
      out.push(e.tagName+'.'+(e.className||'').toString().slice(0,20)+' w='+Math.round(e.getBoundingClientRect().width)+' disp='+cs.display+' ovx='+cs.overflowX+' minw='+cs.minWidth);}
    return out;});
  if(chain)console.log('สายของ table.mx:\n  '+chain.join('\n  '));
  await pg.screenshot({path:process.argv[2]||'/tmp/p1.png',fullPage:process.argv[4]==='full'});
  await b.close();
})();
