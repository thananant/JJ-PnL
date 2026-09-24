// smoke112: jjmk-stockcheck — หน้า 🛟 Safety: แตะช่องอัตราใช้แล้วเลือกทั้งช่อง · Enter = ไปช่องถัดไป
//   Enter ที่ช่องที่ 3 ของแถว → ลงไปช่องแรกของแถวถัดไป (เรียงตามที่เห็นบนจอ)
// fixture JJRD:
//   ครัว      : กุ้งขาว(CPF) · ไข่ไก่(CPF) · ข้าวสาร(FarmFresh) · พริก(ตลาดสด)
//   บาร์น้ำ    : น้ำแข็ง(ตลาดสด) · โค้ก(ไม่ระบุซัพ)
//   ยังไม่จัดแผนก : ผักบุ้ง(FarmFresh)   ← สินค้าที่ยังไม่ได้ตั้งแผนก ต้องอยู่การ์ดท้ายสุด
// คาด: แผนกเรียง ครัว → บาร์น้ำ → ยังไม่จัดแผนก · ในแผนกเรียงซัพ (ไทยก่อนอังกฤษ · ไม่ระบุซัพท้ายสุด)
//      ซัพเดียวกันเรียงชื่อสินค้าตามตัวอักษร
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const P=(id,name,sup,dept,rate)=>({id,branch_id:BID,cat_label:'',name,unit:'กก.',sup,dept,zone:'หลังร้าน',
  rate_wk:rate,rate_fri:rate,rate_we:rate,image_url:null,sort:1});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','set');
    w.localStorage.setItem('jjsc_lgsync',String(Date.now()));
    w.localStorage.setItem('JJSC_NOPREWARM','1');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([{id:1,branch_id:BID,name:'ครัว',sort:1},{id:2,branch_id:BID,name:'บาร์น้ำ',sort:2}]);
      if(url.includes('pnl_stock_names'))return T([
        {id:9,branch:'JJRD',product_id:'p1',pnl_item:'ไข่ไก่เบอร์ 2',product_name:'ไข่ไก่',bill_unit:'แผง',stock_unit:'กก.',factor:1,active:true}]);
      if(url.includes('pnl_stock_map')||url.includes('pnl_bill_items')||url.includes('pnl_suppliers')||url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('products'))return T([
        P('p1','ไข่ไก่','CPF','ครัว',3), P('p2','กุ้งขาว','CPF','ครัว',4),
        P('p3','ข้าวสาร','FarmFresh','ครัว',5), P('p4','พริก','ตลาดสด','ครัว',6),
        P('p5','น้ำแข็ง','ตลาดสด','บาร์น้ำ',7), P('p6','โค้ก','','บาร์น้ำ',8),
        P('p7','ผักบุ้ง','FarmFresh','',9)]);
      if(url.includes('suppliers'))return T([{name:'CPF',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_current')||url.includes('stock_counts')||url.includes('stock_receipts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  w.setTab('set'); await sleep(250);
  const ris=()=>[...d.querySelectorAll('#list input.ri.rk')];
  const at=()=>ris().indexOf(d.activeElement);
  const rowOf=el=>el.closest('.row2').querySelector('.nm .t').textContent.trim();
  const selAll=el=>el.selectionStart===0&&el.selectionEnd===String(el.value).length&&el.value!=='';
  const enter=async el=>{ el.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await sleep(80); };
  const typ=(el,v)=>{ el.value=v; el.dispatchEvent(new w.Event('change',{bubbles:true})); };
  out.push('แถวละ 3 ช่อง (จ–พฤ / ศ / ส–อา) ทุกแถวในหน้า: '
    +(ris().length===d.querySelectorAll('#list .row2').length*3&&ris().length===21));
  // แตะช่องไหนก็เลือกทั้งช่องให้เลย (พิมพ์ทับได้ทันที)
  const a0=ris()[0];
  a0.focus(); await sleep(60);
  out.push('แตะช่องแล้วเลือกข้อความทั้งช่อง (พิมพ์ทับได้เลย): '+selAll(a0));
  // Enter → ช่องขวา (ในแถวเดียวกัน)
  const firstRow=rowOf(ris()[0]);
  typ(ris()[0],'11'); await sleep(80);
  await enter(ris()[0]);
  out.push('Enter ครั้งที่ 1 → ไปช่อง ศ/วัน ของแถวเดิม + เลือกทั้งช่องให้: '
    +(at()===1&&rowOf(d.activeElement)===firstRow&&selAll(d.activeElement)));
  typ(ris()[1],'22'); await sleep(80);
  await enter(ris()[1]);
  out.push('Enter ครั้งที่ 2 → ไปช่อง ส–อา/วัน ของแถวเดิม: '+(at()===2&&rowOf(d.activeElement)===firstRow));
  typ(ris()[2],'33'); await sleep(80);
  await enter(ris()[2]);
  out.push('Enter ครั้งที่ 3 (ครบ 3 ช่อง) → ลงแถวถัดไป ช่องแรกเลย: '
    +(at()===3&&rowOf(d.activeElement)!==firstRow&&selAll(d.activeElement)));
  out.push('ค่าที่พิมพ์ถูกเก็บครบทั้ง 3 ช่อง: '
    +(JSON.stringify(w.eval("JSON.stringify((S.all.find(x=>x.name==='พริก')||{}).dirty)"))
      ==='"{\\"rate_wk\\":11,\\"rate_fri\\":22,\\"rate_we\\":33}"'));
  // ข้ามการ์ด (แผนกถัดไป) ก็ต่อเนื่องตามที่เห็นบนจอ
  const lastOfCard1=d.querySelectorAll('#list .card')[0].querySelectorAll('input.ri.rk').length-1;
  ris()[lastOfCard1].focus(); await sleep(60);
  await enter(ris()[lastOfCard1]);
  out.push('Enter ที่ช่องสุดท้ายของแผนก → ข้ามไปแผนกถัดไปต่อเนื่อง: '
    +(at()===lastOfCard1+1&&d.activeElement.closest('.card')!==d.querySelectorAll('#list .card')[0]));
  // ช่องสุดท้ายของหน้า Enter แล้วต้องไม่พัง
  const last=ris()[ris().length-1];
  last.focus(); await sleep(50);
  await enter(last);
  out.push('Enter ที่ช่องสุดท้ายของหน้า ไม่พัง (จบแค่นั้น): '+(w.errors.length===0));
  // ปุ่มอื่นยังพิมพ์ได้ตามปกติ (ไม่ได้ดักทุกคีย์)
  const el2=ris()[0]; el2.focus();
  const ev=new w.KeyboardEvent('keydown',{key:'5',bubbles:true,cancelable:true});
  el2.dispatchEvent(ev); await sleep(50);
  out.push('กดเลขปกติไม่โดนดัก (ยังพิมพ์ได้): '+(!ev.defaultPrevented&&at()===0));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
