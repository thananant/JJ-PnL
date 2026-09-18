// smoke100: jjmk-stockcheck — คลังคำแปลกลางบนฐานข้อมูล (sc_i18n)
// แปลครั้งเดียวเก็บเข้าฐาน → เครื่องอื่น/คนอื่นเปิดมาได้คำแปลเลย ไม่ต้องรอแปลใหม่
// และรอบถัดไปส่งไปแปลเฉพาะ "คำที่ยังไม่เคยแปล" เท่านั้น
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const DB=[{src:'📋 นับสต๊อก',txt:'Count stock'},{src:'🛒 สั่งของ',txt:'Place order'}];
const trQ=[],posts=[]; let nGetEn=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','count');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(url.includes('translate.googleapis.com')){
        const q=decodeURIComponent((url.match(/[&?]q=([^&]*)/)||[])[1]||'');
        const tl=(url.match(/[&?]tl=([^&]*)/)||[])[1]||'';
        q.split('\n').forEach(x=>trQ.push(x));
        return T([q.split('\n').map(x=>[tl+':'+x+'\n','',null,null,1])]);
      }
      if(url.includes('sc_i18n')){
        if(method==='POST'){ posts.push(JSON.parse(opt.body)); return T([]); }
        if(url.includes('lang=eq.lo'))return {ok:false,status:404,text:async()=>'42P01 undefined_table',json:async()=>({})};
        if(url.includes('lang=eq.en')){ nGetEn++; return T(DB); }
        return T([]);
      }
      if(method!=='GET')return T([]);
      if(url.includes('sc_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}]);
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([]);
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'สี่มุมเมือง',rate_wk:5,rate_fri:6,rate_we:8,dept:'ผัก',zone:'หลังร้าน',image_url:null,sort:1}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([{name:'สี่มุมเมือง',order_mode:'any',lead_days:1,line_group_id:null}]);
      if(url.includes('stock_counts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder; w.JJSC_NOPREWARM=1;   // เทสต์นี้ไม่ทดสอบการแปลล่วงหน้า (ดู smoke101)
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  await w.setLang('en'); await sleep(700);
  const nav=[...d.querySelectorAll('#sideNav [data-t]')].map(b=>b.textContent);
  out.push('คำที่มีในคลังกลางถูกใช้เลย (ไม่ต้องรอแปล): '
    +(nav.some(t=>t==='Count stock')&&nav.some(t=>t==='Place order')));
  out.push('คำที่คลังมีแล้ว ไม่ถูกส่งไปแปลซ้ำ: '+!trQ.some(x=>x==='📋 นับสต๊อก'||x==='🛒 สั่งของ'));
  const rows=[].concat.apply([],posts);
  out.push('คำที่เพิ่งแปลถูกเก็บเข้าคลังกลาง (lang/src/txt): '
    +(rows.length>3&&rows.every(r=>r.lang==='en'&&r.src&&r.txt&&r.txt!==r.src)
      &&rows.some(r=>r.src==='🔗 ผูกชื่อ'&&r.txt==='en:🔗 ผูกชื่อ')));
  out.push('คำที่ได้มาจากคลัง ไม่ถูกเขียนกลับซ้ำ: '+!rows.some(r=>r.src==='📋 นับสต๊อก'));
  out.push('ข้อความยาวเกิน 400 ตัวไม่ถูกส่งเข้าคลัง: '+rows.every(r=>r.src.length<=400));
  // เปลี่ยนภาษาไป–กลับ: โหลดคลังภาษาเดิมซ้ำไม่ได้ · ตารางยังไม่ถูกสร้าง (404) ต้องไม่พัง
  const n1=nGetEn;
  await w.setLang('lo'); await sleep(700);
  out.push('ยังไม่ได้สร้างตาราง sc_i18n (404) ก็ยังแปลได้ตามปกติ: '
    +(d.querySelector('#sideNav [data-t]').textContent.startsWith('lo:')&&w.errors.length===0));
  await w.setLang('en'); await sleep(500);
  out.push('กลับมาภาษาเดิม ใช้ของที่โหลดไว้ ไม่ดึงคลังซ้ำ: '
    +(nGetEn===n1&&[...d.querySelectorAll('#sideNav [data-t]')].some(b=>b.textContent==='Count stock')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
