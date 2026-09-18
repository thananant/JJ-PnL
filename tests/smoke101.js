// smoke101: jjmk-stockcheck — "กดเปลี่ยนภาษาแล้วต้องขึ้นทันที"
//   ① เปิดแอพเป็นไทย → แปลล่วงหน้าทุกภาษาเงียบ ๆ (ชื่อสินค้า/หน่วย/แผนก/เมนู) เก็บลง localStorage + sc_i18n
//   ② กดเปลี่ยนภาษา → ทาจากแคชทันที ไม่ยิงกูเกิลแม้แต่ครั้งเดียว
//   ③ ตัวเลขในข้อความไม่ทำให้ต้องแปลใหม่ ("นับได้ 3 โล" ใช้คำแปลของ "0 โล")
//   ④ เพิ่มสินค้าใหม่ → แปลเฉพาะชื่อนั้น แล้วเก็บเข้าคลังกลาง
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const trQ=[],posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','count');
    w.JJSC_PREWARM_MS=300;   // เทสต์: แปลล่วงหน้าเร็ว ๆ
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(url.includes('translate.googleapis.com')){
        const q=decodeURIComponent((url.match(/[&?]q=([^&]*)/)||[])[1]||'');
        const tl=(url.match(/[&?]tl=([^&]*)/)||[])[1]||'';
        q.split('\n').forEach(x=>trQ.push({tl,q:x}));
        return T([q.split('\n').map(x=>[tl+':'+x+'\n','',null,null,1])]);
      }
      if(url.includes('sc_i18n')){
        if(method==='POST'){ posts.push(...JSON.parse(opt.body)); return T([]); }
        return T([]);
      }
      if(method!=='GET')return T([]);
      if(url.includes('sc_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}]);
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([]);
      if(url.includes('pnl_stock_names'))return T([{id:1,product_id:'p1',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:'ลัง',stock_unit:'โล',factor:12}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'สี่มุมเมือง',rate_wk:5,rate_fri:6,rate_we:8,dept:'ผัก',zone:'หลังร้าน',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ของหวาน',name:'ไอศกรีมกะทิ',unit:'ถัง',sup:'สี่มุมเมือง',rate_wk:2,rate_fri:2,rate_we:3,dept:'ของหวาน',zone:'หน้าร้าน',image_url:null,sort:2}]);
      if(url.includes('stock_current'))return T([{product_id:'p1',qty:7}]);
      if(url.includes('suppliers'))return T([{name:'สี่มุมเมือง',order_mode:'any',lead_days:1,line_group_id:null}]);
      if(url.includes('stock_counts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vis=()=>{ const c=d.body.cloneNode(true); [...c.querySelectorAll('script,style')].forEach(x=>x.remove()); return c.textContent; };
setTimeout(async()=>{
  const out=[];
  await sleep(2500);   // รอโหลด + แปลล่วงหน้า (300ms หลัง render)
  // ① แปลล่วงหน้าตอนยังเป็นไทย
  const langsHit=[...new Set(trQ.map(x=>x.tl))].sort().join();
  out.push('ยังเป็นไทยอยู่ แต่แปลล่วงหน้าครบ 3 ภาษาแล้ว (en/lo/my): '+(w.eval('LANG')==='th'&&langsHit==='en,lo,my'));
  const has=(tl,q)=>trQ.some(x=>x.tl===tl&&x.q===q);
  out.push('แปลชื่อสินค้าทุกแผนกไว้ล่วงหน้า (รวมแผนกที่ยังไม่ได้เปิด) + หน่วย + ชื่อบิล + เมนู: '
    +(has('lo','ผักบุ้ง')&&has('lo','ไอศกรีมกะทิ')&&has('lo','ถัง')&&has('lo','ผักบุ้งจีน')&&has('lo','📋 นับสต๊อก')&&has('my','ไอศกรีมกะทิ')));
  out.push('ข้อความที่มีตัวเลขถูกแปลเป็นแบบแม่พิมพ์ (ตัวเลขแทนด้วย 0): '
    +(has('lo','0 โล')&&has('lo','0 ถัง')&&!trQ.some(x=>/[1-9]/.test(x.q))));
  out.push('คำแปลล่วงหน้าถูกเก็บลงคลังกลางครบ 3 ภาษา: '
    +(['en','lo','my'].every(l=>posts.some(r=>r.lang===l&&r.src==='ผักบุ้ง'&&r.txt===l+':ผักบุ้ง'))));
  out.push('และเก็บในเครื่อง (localStorage) ด้วย: '
    +(!!JSON.parse(w.localStorage.getItem('jjsc_tr3_my')||'{}')['ไอศกรีมกะทิ']));
  // ② กดเปลี่ยนภาษา → ทันที ไม่ยิงกูเกิลเลย
  const n0=trQ.length;
  await w.setLang('lo');
  const nav=[...d.querySelectorAll('#sideNav [data-t]')].map(b=>b.textContent);
  const t=vis();
  out.push('เปลี่ยนเป็นลาวแล้วขึ้นทันที (ไม่รอ) ไม่ยิงตัวแปลเพิ่มแม้แต่ครั้งเดียว: '
    +(trQ.length===n0&&nav.every(x=>x.includes('lo:'))&&t.includes('lo:ผักบุ้ง')&&t.includes('lo:โล')));
  out.push('ไม่ขึ้นป้าย "กำลังแปล": '+!d.getElementById('trBar').classList.contains('on'));
  // ③ ตัวเลข: ยอดครั้งก่อน 7 · นับ 3 โล → ใช้คำแปลแม่พิมพ์ ใส่เลขกลับ ไม่ต้องแปลใหม่
  out.push('ข้อความมีตัวเลข ("ยังไม่นับ · ครั้งก่อน 7") ถูกแปลโดยใส่เลขจริงกลับเข้าไป: '+t.includes('lo:ยังไม่นับ · ครั้งก่อน 7'));
  const n1=trQ.length;
  w.setQ('p1','3'); await sleep(150);
  const t2=vis();
  out.push('นับ 3 โล → ขึ้น "lo:3 โล" ทันทีจากแม่พิมพ์ "0 โล" โดยไม่ยิงแปลใหม่: '
    +(t2.includes('lo:3 โล')&&t2.includes('lo:นับได้')&&trQ.length===n1));
  const st=d.getElementById('st').textContent;
  out.push('แถบล่าง "นับแล้ว 1/2 · รัชดา" ใส่เลขกลับถูกต้อง: '+(st.includes('lo:นับแล้ว')&&st.includes('1')&&st.includes('lo:/2 · รัชดา')));
  // ④ สินค้าใหม่โผล่มา → แปลเฉพาะชื่อนั้น + เก็บเข้าคลังกลาง
  w.eval("S.all.push({id:'p9',branch_id:'"+BID+"',cat_label:'ผัก',name:'คะน้าฮ่องกง',unit:'โล',sup:'สี่มุมเมือง',dept:'ผัก',zone:'หลังร้าน',qty:null,out:false,dirty:{}});S.items=S.all;render();");
  await sleep(400);
  const newQ=trQ.slice(n1).map(x=>x.q);
  out.push('สินค้าใหม่ → แปลเฉพาะชื่อใหม่ (ไม่แปลทั้งหน้าซ้ำ) และขึ้นบนจอ: '
    +(newQ.includes('คะน้าฮ่องกง')&&!newQ.includes('ผักบุ้ง')&&vis().includes('lo:คะน้าฮ่องกง')));
  await sleep(1200);  // แปลล่วงหน้ารอบถัดไปสำหรับภาษาอื่น
  out.push('ชื่อใหม่ถูกเก็บเข้าคลังกลาง (lo) และแปลล่วงหน้าให้ภาษาอื่นด้วย: '
    +(posts.some(r=>r.lang==='lo'&&r.src==='คะน้าฮ่องกง')&&has('en','คะน้าฮ่องกง')&&has('my','คะน้าฮ่องกง')));
  // ⑤ กลับไทย → เปลี่ยนภาษาซ้ำอีกครั้งก็ยังทันที
  await w.setLang('th');
  const n2=trQ.length;
  await w.setLang('my');
  out.push('สลับ ไทย → พม่า ก็ทันทีจากแคช (ไม่ยิงแปล): '+(trQ.length===n2&&vis().includes('my:ผักบุ้ง')&&vis().includes('my:คะน้าฮ่องกง')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
