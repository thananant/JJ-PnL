// smoke102: jjmk-stockcheck — เน็ตช้า/กูเกิลช้า ต้องไม่ทำให้ "ของที่มีในแคช" ช้าตาม
//   ① กดเปลี่ยนภาษาระหว่างที่รอบแปลภาษาเก่ายังค้างอยู่ → ภาษาใหม่ (ที่มีแคช) ต้องขึ้นทันที และรอบเก่าห้ามมาทับ
//   ② ระหว่างรอแปลคำใหม่ 1 คำ ผู้ใช้กดนับ → การ์ดใหม่ที่คำแปลมีอยู่แล้วต้องขึ้นทันที ไม่รอกูเกิล
//   ③ คำที่กูเกิลตอบว่างเปล่า ต้องไม่ถูกยิงซ้ำรัว ๆ จนหมดโควตาลองใหม่ (MutationObserver ไม่วนจากการเขียนของตัวเอง)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const trQ=[]; let LAT=600;
const NAV=['📊 แดชบอร์ด','📋 นับสต๊อก','🛒 สั่งของ','🔗 ผูกชื่อ','🛟 Safety','🚚 รอบสั่งซัพ','📦 รายการสินค้า','ตั้งค่า','สิทธิ์การใช้งานพนักงาน','แผนก','หน่วยซื้อ–หน่วยนับ','ซัพพลายเออร์',
  'JJ เช็คสต๊อก','จริงใจหมูกระทะ · เชื่อมระบบนับ + P&L','📅 วันที่นับ','🏪 สาขา','👤 ผู้นับ','รัชดา','ลาดพร้าว','ผู้ดูแลระบบ','· แอดมิน','ออก','📊 ภาพรวม','🛒 สั่งของ','🚚 รอบสั่ง','📦 สินค้า','⚙️ ตั้งค่า',
  'ผักบุ้ง','โล','0 โล','🥬 ผัก','🥬 ผัก 0','ผัก','✓ นับแล้ว','⚠ ยังไม่นับ','ยังไม่นับ','นับได้','หมด','💾 บันทึกการนับ','นับแล้ว','/0 · รัชดา · 0','สี่มุมเมือง','🔍 พิมพ์ชื่อสินค้าค้นหา (ทุกแผนก)...','ชื่อผู้นับ','ตั้งโซนหน้าร้าน/หลังร้านได้ที่ ⚙️ ตั้งค่า › แผนก','↓ ลากลงเพื่อรีเฟรช','เปลี่ยนภาษา / Language','จริงใจ'];
const EN={}; NAV.forEach(k=>{EN[k]='en:'+k;});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','count');
    w.localStorage.setItem('jjsc_tr3_en',JSON.stringify(EN));   // อังกฤษ: มีแคชครบแล้ว · ลาว: ยังไม่มีเลย
    w.JJSC_NOPREWARM=1;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(url.includes('translate.googleapis.com')){
        const q=decodeURIComponent((url.match(/[&?]q=([^&]*)/)||[])[1]||'');
        const tl=(url.match(/[&?]tl=([^&]*)/)||[])[1]||'';
        q.split('\n').forEach(x=>trQ.push({tl,q:x,at:Date.now()}));
        await new Promise(r=>setTimeout(r,LAT));                              // กูเกิลช้า
        return T([q.split('\n').map(x=>[x.includes('ว่างเปล่า')?'\n':tl+':'+x+'\n','',null,null,1])]); // คำนี้ตอบว่าง
      }
      if(url.includes('sc_i18n'))return T([]);
      if(method!=='GET')return T([]);
      if(url.includes('sc_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}]);
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([]);
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'สี่มุมเมือง',rate_wk:5,rate_fri:6,rate_we:8,dept:'ผัก',zone:null,image_url:null,sort:1}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([]);
      if(url.includes('stock_counts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nav=()=>[...d.querySelectorAll('#sideNav [data-t]')].map(b=>b.textContent);
const vis=()=>{ const c=d.body.cloneNode(true); [...c.querySelectorAll('script,style')].forEach(x=>x.remove()); return c.textContent; };
setTimeout(async()=>{
  const out=[];
  await sleep(500);
  // ① ลาว (ไม่มีแคช) กำลังรอกูเกิล 600ms → กดอังกฤษ (มีแคช) ต้องขึ้นทันที
  w.setLang('lo'); await sleep(80);
  out.push('ลาวยังรอกูเกิลอยู่ (ป้ายกำลังแปลขึ้น, เมนูยังเป็นไทย): '
    +(d.getElementById('trBar').classList.contains('on')&&trQ.some(x=>x.tl==='lo')&&!nav()[1].includes('lo:')));
  const t0=Date.now(); await w.setLang('en'); const dt=Date.now()-t0;
  out.push('กดอังกฤษระหว่างลาวค้าง → เมนู/หน้านับเป็นอังกฤษทันที ('+dt+'ms) ไม่รอรอบเก่า: '
    +(dt<150&&nav().every(x=>x.includes('en:'))&&vis().includes('en:ผักบุ้ง')));
  out.push('ป้าย "กำลังแปล" ของรอบลาวถูกปิดทันทีที่เปลี่ยนภาษา: '+!d.getElementById('trBar').classList.contains('on'));
  await sleep(900);   // รอบลาวเสร็จช้ากว่า
  out.push('รอบลาวที่ค้างเสร็จทีหลัง ต้องไม่มาทับหน้าอังกฤษ (ไม่มี lo: บนจอ): '
    +(!vis().includes('lo:')&&nav().every(x=>x.includes('en:'))));
  out.push('แต่คำแปลลาวที่ได้มา ถูกเก็บลงแคชไว้ให้ครั้งหน้า: '
    +(Object.keys(JSON.parse(w.localStorage.getItem('jjsc_tr3_lo')||'{}')).length>5));
  // ② อังกฤษ: เพิ่มสินค้าใหม่ (ไม่มีแคช) → รอกูเกิล · ระหว่างนั้นกดนับของเดิม → การ์ดใหม่ต้องแปลทันทีจากแคช
  for(let i=0;i<40&&w.eval('_trFetching');i++)await sleep(50);   // รอให้รอบแปลคำอังกฤษที่ไม่ได้ seed ไว้ (หน้าล็อกอิน ฯลฯ) จบก่อน
  w.eval("S.all.push({id:'p9',branch_id:'"+BID+"',cat_label:'ผัก',name:'ว่างเปล่า',unit:'โล',sup:'สี่มุมเมือง',dept:'ผัก',zone:null,qty:null,out:false,dirty:{}});S.items=S.all;render();");
  await sleep(80);
  out.push('สินค้าใหม่ถูกส่งไปแปล (รอกูเกิลอยู่): '+(trQ.some(x=>x.tl==='en'&&x.q==='ว่างเปล่า')));
  w.setQ('p1','4'); await sleep(60);
  const v2=vis();
  out.push('ระหว่างรอ กดนับ 4 โล → "en:นับได้"/"en:4 โล" ขึ้นทันทีจากแคช ไม่รอกูเกิล: '
    +(v2.includes('en:นับได้')&&v2.includes('en:4 โล')&&v2.includes('en:✓ นับแล้ว')));
  // ③ คำที่กูเกิลตอบว่าง: ต้องไม่ยิงซ้ำรัว ๆ (ห้ามเกิน 2 ครั้งใน 1.5 วินาทีแรก)
  await sleep(1400);
  const nEmpty=trQ.filter(x=>x.tl==='en'&&x.q==='ว่างเปล่า').length;
  out.push('คำที่ตอบว่าง ไม่ถูกยิงรัว ๆ (ยิง '+nEmpty+' ครั้ง ≤ 2 ใน 1.5 วิ): '+(nEmpty<=2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
