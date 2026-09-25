// เครื่องมือ dev: ถ่ายภาพหน้าลูกค้า/พนักงาน ของระบบสั่งอาหาร QR ขนาดมือถือ (mock Supabase)
// ใช้: node scripts/qr-shot.js menu out.png   |   node scripts/qr-shot.js order out.png [tables|orders|menu|settings]
const {chromium}=require('playwright');
const which=process.argv[2]||'menu',out=process.argv[3]||'/tmp/qr.png',tab=process.argv[4]||'tables';
const menu=[{id:1,name:'หมูสามชั้น',category:'หมู',unit_label:'จาน',unit:'จาน',max:null,max_per_order:null,packages:['standard','premium'],active:true,sort:1,image:null},
 {id:2,name:'หมูสันคอ',category:'หมู',unit_label:'จาน',unit:'จาน',max:null,packages:['standard','premium'],active:true,sort:2},
 {id:3,name:'เนื้อวากิว A5',category:'เนื้อ',unit_label:'จาน',unit:'จาน',max:2,max_per_order:2,packages:['premium'],active:true,sort:3},
 {id:4,name:'กุ้งแม่น้ำ',category:'ซีฟู้ด',unit_label:'จาน',unit:'จาน',max:null,packages:['premium'],active:true,sort:4},
 {id:5,name:'ผักรวม',category:'ผัก',unit_label:'จาน',unit:'จาน',max:null,packages:['standard','premium'],active:true,sort:5}];
const now=Date.now();
const sessions=[{id:1,token:'abc123def456',branch:'JJRD',table_no:7,package:'premium',status:'open',started_at:new Date(now-20*60000).toISOString(),expires_at:new Date(now+90*60000).toISOString()},
 {id:2,token:'zzz',branch:'JJRD',table_no:12,package:'standard',status:'open',started_at:new Date(now-105*60000).toISOString(),expires_at:new Date(now+5*60000).toISOString()},
 {id:3,token:'yyy',branch:'JJRD',table_no:20,package:'standard',status:'open',started_at:new Date(now-120*60000).toISOString(),expires_at:new Date(now-10*60000).toISOString()}];
const orders=[{id:501,session_id:1,branch:'JJRD',table_no:7,items:[{id:1,name:'หมูสามชั้น',qty:2,unit:'จาน'},{id:3,name:'เนื้อวากิว A5',qty:1,unit:'จาน'}],note:'ไม่ใส่ผัก',kind:'order',status:'new',created_at:new Date(now-3*60000).toISOString(),at:new Date(now-3*60000).toISOString()},
 {id:502,session_id:2,branch:'JJRD',table_no:12,items:[],note:'ขอน้ำแข็ง',kind:'call',status:'new',created_at:new Date(now-60000).toISOString(),at:new Date(now-60000).toISOString()},
 {id:500,session_id:1,branch:'JJRD',table_no:7,items:[{id:5,name:'ผักรวม',qty:1,unit:'จาน'}],kind:'order',status:'served',created_at:new Date(now-15*60000).toISOString(),at:new Date(now-15*60000).toISOString()}];
const settings=[{key:'pin',value:'1234'},{key:'tables',value:'{"JJRD":44,"JJLP":38}'},{key:'minutes',value:'110'},{key:'packages',value:'[{"code":"standard","name":"Standard","color":"#5B7FA6"},{"code":"premium","name":"Premium","color":"#E5B03C"}]'}];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.route('**/*',async r=>{const u=r.request().url();
    const J=v=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(v)});
    if(u.includes('rpc/qr_session_info'))return J({ok:true,now:new Date().toISOString(),session:{...sessions[0],open:true},packages:JSON.parse(settings[3].value),menu:menu.filter(m=>m.packages.includes('premium')),orders:orders.filter(o=>o.session_id===1)});
    if(u.includes('rpc/qr_place_order'))return J({ok:true,order_id:999});
    if(u.includes('qr_settings'))return J(settings);
    if(u.includes('qr_sessions'))return J(sessions);
    if(u.includes('qr_orders'))return J(orders);
    if(u.includes('qr_menu_items'))return J(menu);
    if(u.includes('fonts.g'))return r.fulfill({status:200,contentType:'text/css',body:''});
    if(u.includes('qrcode'))return r.continue();
    if(u.includes('qrserver'))return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')});
    return r.continue();});
  const pg=await ctx.newPage();
  if(which==='menu'){ await pg.goto('file://'+process.cwd()+'/jjmk-menu.html?s=abc123def456'); await pg.waitForTimeout(1200); await pg.evaluate(()=>{qty(1,1);qty(1,1);qty(3,1);}); }
  else{ await pg.addInitScript(()=>{localStorage.setItem('jjqr_pin','1234');localStorage.setItem('jjqr_br','JJRD');}); await pg.goto('file://'+process.cwd()+'/jjmk-order.html'); await pg.waitForTimeout(1500);
    if(tab==='qr'){await pg.evaluate(()=>{setTab('tables');openTable(7);}); await pg.waitForTimeout(600);} else {await pg.evaluate(t=>setTab(t),tab); await pg.waitForTimeout(300);} }
  const w=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));
  console.log(which,tab,'scrollWidth',w.sw,'innerWidth',w.iw,'ล้น:',w.sw>w.iw);
  await pg.screenshot({path:out,fullPage:process.argv[5]==='full'}); await b.close();
})();
