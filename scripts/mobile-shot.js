// เครื่องมือ dev: เรนเดอร์ jjmk-stockcheck.html ขนาดมือถือแล้วบันทึกภาพ (mock Supabase ทั้งหมด)
// ใช้: node scripts/mobile-shot.js out.png '#order'   (แท็บ: dash/count/order/link/set/sched/items/cfgl)
const {chromium}=require('playwright');
const fs=require('fs'),crypto=require('crypto');
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const BID='b19f0a17b4472';
const prods=[];
const CATS=['ของสด','บาร์น้ำ','ครัวร้อน (ยำ ของทอด)','ผัก','ของหวาน','ล้างจาน','สไลด์','Mixfresh'];
for(let i=0;i<40;i++)prods.push({id:'p'+i,branch_id:BID,cat_label:CATS[i%CATS.length],name:'สินค้าทดสอบ '+(i+1),unit:'โล',sup:'สี่มุมเมือง',
  rate_wk:5,rate_fri:6,rate_we:8,dept:null,zone:null,image_url:null,sort:i});
const routes=(url)=>{
  if(url.includes('sc_users'))return [{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
  if(url.includes('sc_depts'))return [];
  if(url.includes('line_groups'))return [];
  if(url.includes('pnl_stock_names'))return prods.slice(0,25).map((p,i)=>({id:i+1,product_id:p.id,pnl_item:'บิล '+p.name,product_name:p.name,bill_unit:'ลัง',stock_unit:'โล',factor:12}));
  if(url.includes('products'))return prods;
  if(url.includes('stock_current'))return [];
  if(url.includes('suppliers'))return [{name:'สี่มุมเมือง',order_mode:'any',lead_days:1,line_group_id:null}];
  if(url.includes('stock_counts'))return [{product_id:'p0',qty:3,out_of_stock:false,created_at:new Date().toISOString()}];
  return [];
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.route('**/*',async r=>{
    const u=r.request().url();
    if(u.includes('supabase.co'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(routes(u))});
    if(u.includes('fonts.googleapis')||u.includes('fonts.gstatic'))return r.fulfill({status:200,contentType:'text/css',body:''});
    return r.continue();
  });
  const pg=await ctx.newPage();
  await pg.addInitScript(([h])=>{localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h}));localStorage.setItem('jjsc_tab',(location.hash||'#count').slice(1));},[H('admin','jjmk1234')]);
  await pg.goto('file://'+process.cwd()+'/jjmk-stockcheck.html'+(process.argv[3]||''));
  await pg.waitForTimeout(1500);
  await pg.screenshot({path:process.argv[2]||'/tmp/m1.png'});
  await b.close();
})();
