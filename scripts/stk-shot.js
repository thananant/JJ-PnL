// เครื่องมือ dev: เรนเดอร์ jjmk-stockcheck.html ขนาดมือถือแล้วบันทึกภาพ (mock Supabase ทั้งหมด)
// ใช้: node scripts/stk-shot.js out.png count      (แท็บ: dash/count/order/link/set/sched/items/cfgl/...)
//      W=390 H=844 node scripts/stk-shot.js out.png order full
const {chromium}=require('playwright');
const crypto=require('crypto');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const CATS=['เนื้อสัตว์','ผัก','ของแห้ง','เครื่องดื่ม','ของใช้'];
const SUPS=['Smilemeat','FarmFresh','Makro','CPF','ตลาดสด'];
const PRODS=[];
for(let i=1;i<=42;i++)PRODS.push({id:'p'+i,branch_id:BID,cat_label:CATS[i%5],
  name:['หมูสไลด์','ผักบุ้งจีนกรอบ','น้ำแข็งหลอด','ซอสหมูกระทะสูตรร้าน','กุ้งขาวแกะเปลือก','เห็ดเข็มทอง'][i%6]+' '+i,
  unit:['กก.','ถุง','ลัง','ขวด'][i%4],sup:SUPS[i%5],rate_wk:5+i%20,rate_fri:8+i%20,rate_we:12+i%20,
  dept:['ครัว','ผัก','บาร์น้ำ'][i%3],zone:'หลังร้าน',image_url:null,sort:i});
const routes=u=>{
  if(u.includes('sc_users'))return [{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
  if(u.includes('sc_depts'))return [{id:1,name:'ครัว',sort:1},{id:2,name:'ผัก',sort:2},{id:3,name:'บาร์น้ำ',sort:3}];
  if(u.includes('sc_units'))return [];
  if(u.includes('sc_i18n')||u.includes('sc_config'))return [];
  if(u.includes('line_groups'))return [{group_id:'C123',name:'กลุ่มสั่งของ Smilemeat',seen_at:'2026-09-02'},
    {group_id:'C999',name:'กลุ่มสั่งของ Makro',seen_at:'2026-09-03'},{group_id:'CADM',name:'กลุ่มแอดมิน JJ',seen_at:'2026-09-04'}];
  if(u.includes('config'))return [{key:'remind_line_group',value:'CADM'}];
  if(u.includes('stock_receipts'))return [];
  if(u.includes('pnl_stock_names'))return PRODS.slice(0,10).map((p,i)=>({id:i+1,branch:'JJRD',product_id:p.id,
    pnl_item:p.name+' (ชื่อบิล)',product_name:p.name,bill_unit:'ลัง',stock_unit:p.unit,factor:12,active:true}));
  if(u.includes('pnl_stock_map')||u.includes('pnl_bill_items')||u.includes('pnl_suppliers')||u.includes('pnl_unit_conv'))return [];
  if(u.includes('products'))return PRODS;
  if(u.includes('suppliers'))return [
    {name:'Smilemeat',order_mode:'any',lead_days:1,order_ahead:0,prepay:false,line_group_id:'C123'},
    {name:'FarmFresh',order_mode:'fixed',schedule:{wed:'thu',sun:'mon'},order_ahead:1,prepay:true,line_group_id:null},
    {name:'Makro',order_mode:'any',lead_days:3,order_ahead:0,prepay:false,line_group_id:'C999'},
    {name:'CPF',order_mode:'fixed',schedule:{fri:'sat',sun:'mon'},order_ahead:0,prepay:true,line_group_id:null},
    {name:'ตลาดสด',order_mode:'any',lead_days:1,order_ahead:0,prepay:false,line_group_id:null}];
  if(u.includes('stock_current'))return [];
  if(u.includes('stock_counts'))return PRODS.slice(0,20).map(p=>({product_id:p.id,qty:(p.sort*3)%17,out_of_stock:false,created_at:'2026-09-20T23:00:00Z'}));
  return [];
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
  const W=parseInt(process.env.W||'390',10),Hh=parseInt(process.env.H||'844',10);
  const ctx=await b.newContext({viewport:{width:W,height:Hh},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.route('**/*',async r=>{
    const u=r.request().url();
    if(u.includes('supabase.co')){
      if(u.includes('/storage/')||u.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(routes(u))});
    }
    if(u.includes('fonts.googleapis')||u.includes('fonts.gstatic'))return r.fulfill({status:200,contentType:'text/css',body:''});
    if(u.match(/cdnjs|jsdelivr|unpkg/))return r.fulfill({status:200,contentType:'application/javascript',
      body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Chart.defaults={font:{},plugins:{}};'});
    return r.continue();
  });
  const pg=await ctx.newPage();
  await pg.addInitScript(h=>{localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h}));
    localStorage.setItem('JJSC_NOPREWARM','1');},H('admin','jjmk1234'));
  await pg.goto('file://'+process.cwd()+'/jjmk-stockcheck.html');
  await pg.waitForTimeout(1800);
  const tab=process.argv[3]||'count';
  await pg.evaluate(t=>{const cd=document.getElementById('cd'); if(cd){cd.value='2026-09-20';cd.dispatchEvent(new Event('change'));}
    window.setTab&&window.setTab(t);},tab);
  await pg.waitForTimeout(1200);
  const w=await pg.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth,
    vw:visualViewport&&Math.round(visualViewport.width),
    over:[...document.querySelectorAll('body *')].map(e=>({e,r:e.getBoundingClientRect()}))
      .filter(x=>x.r.width>innerWidth+0.5||x.r.right>innerWidth+0.5).slice(0,12)
      .map(x=>x.e.tagName+'.'+(x.e.className||'').toString().slice(0,26)+' w='+Math.round(x.r.width)+' right='+Math.round(x.r.right)+' pos='+getComputedStyle(x.e).position),
    head:document.querySelector('header')?.getBoundingClientRect().height,
    nav:document.querySelector('#sideNav')?getComputedStyle(document.querySelector('#sideNav')).display:'-'}));
  console.log('scrollWidth',w.doc,'· innerWidth',w.win,'· visualVP',w.vw,'· ล้นแนวนอน:',w.doc>w.win,'· สูงหัวจอ',Math.round(w.head||0),'· sideNav',w.nav);
  console.log('กล่องที่กว้างเกินจอ:',JSON.stringify(w.over,null,0));
  await pg.screenshot({path:process.argv[2]||'/tmp/s1.png',fullPage:process.argv[4]==='full'});
  await b.close();
})();
