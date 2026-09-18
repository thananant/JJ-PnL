// smoke99: jjmk-stockcheck — ตัวแปลตอบไม่ตรงบรรทัด/ล้มกลางคัน ต้องไม่ทิ้งข้อความค้างเป็นไทย
// เคสจริง: เมนูข้าง (#sideNav) ค้างเป็นไทยทั้งแถบ เพราะก้อนที่มีอิโมจิตอบกลับจำนวนบรรทัดไม่ตรง
// ใหม่: ตอบไม่ตรง → ผ่าครึ่งยิงใหม่จนถึงทีละคำ · คำขอล้ม → ลองซ้ำ · ยังไม่ครบ → วนแปลใหม่อีกไม่กี่รอบ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
let nTr=0,nBroke=0,nDead=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','count');
    w.localStorage.setItem('jjsc_lang','my');           // เปิดมาเป็นพม่าเลย
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(url.includes('translate.googleapis.com')){
        nTr++;
        const q=decodeURIComponent((url.match(/[&?]q=([^&]*)/)||[])[1]||'');
        const tl=(url.match(/[&?]tl=([^&]*)/)||[])[1]||'';
        const lines=q.split('\n');
        if(lines.length>3&&nBroke<3){ nBroke++; return T([[['พัง\n','',null,null,1]]]); }  // ตอบมาบรรทัดเดียว
        if(nDead<2){ nDead++; throw new Error('network'); }                                 // คำขอล้มทั้งอัน
        return T([lines.map(x=>[tl+':'+x+'\n','',null,null,1])]);
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
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(6000);   // เผื่อรอบลองใหม่ (1.2s, 2.4s, …)
  const nav=[...d.querySelectorAll('#sideNav [data-t]')].map(b=>b.textContent);
  out.push('เมนูข้างถูกแปลครบทุกปุ่ม (ไม่ค้างเป็นไทย): '
    +(nav.length>=7&&nav.every(t=>t.includes('my:'))));
  out.push('หัวแถบข้าง (ชื่อร้าน/คำโปรย) ก็ถูกแปล: '
    +(d.querySelector('#sideNav .brand').textContent.includes('my:')
      &&d.querySelector('#sideNav .bsub').textContent.includes('my:')));
  out.push('ตัวแปลตอบไม่ตรงบรรทัด → ผ่าครึ่งยิงใหม่ (ไม่ทิ้งทั้งก้อน): '+(nBroke>=1));
  out.push('คำขอล้มกลางคัน → ลองซ้ำเองจนได้: '+(nDead>=1&&nTr>4));
  out.push('ไม่มีคำแปลเพี้ยนจากก้อนที่ตอบพัง: '+!d.body.textContent.includes('my:พัง'));
  out.push('คำแปลถูกเก็บลงแคช: '
    +(Object.keys(JSON.parse(w.localStorage.getItem('jjsc_tr2_my')||'{}')).length>5));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
