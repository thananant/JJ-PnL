// smoke98: jjmk-stockcheck — เปลี่ยนภาษา ไทย/อังกฤษ/ลาว/พม่า + แปลอัตโนมัติทั้งหน้า
// ปุ่มเลือกภาษาอยู่มุมบนขวา · เปลี่ยนแล้วข้อความไทยทุกจุด (รวมชื่อสินค้า/แผนก) ถูกแทนด้วยคำแปล
// mock ตัวแปล: ตอบกลับเป็น "<lang>:<ต้นฉบับ>" ทีละบรรทัด (เลียนแบบ Google translate gtx)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const trCalls=[];
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
        trCalls.push({tl,n:q.split('\n').length});
        const lines=q.split('\n').map(x=>tl+':'+x);
        return T([lines.map(x=>[x+'\n','',null,null,1])]);
      }
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const u=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?u.filter(x=>x.username===decodeURIComponent(um[1])):u);
      }
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([]);
      if(url.includes('pnl_stock_names'))return T([{id:1,product_id:'p1',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:'ลัง',stock_unit:'โล',factor:12}]);
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
  await sleep(400);
  const body=()=>d.body.textContent;
  // 1) ปุ่มเลือกภาษามุมบนขวา + 4 ภาษา
  const box=d.getElementById('langBox');
  out.push('มีปุ่มเลือกภาษามุมบนขวาของหัวจอ: '
    +(!!box&&box.parentElement.className==='hrow'&&!!d.getElementById('langBtn')));
  w.langToggle(); await sleep(20);
  const opts=[...d.querySelectorAll('#langMenu button')].map(b=>b.textContent);
  out.push('เลือกได้ 4 ภาษา ไทย/อังกฤษ/ลาว/พม่า: '
    +(opts.length===4&&opts[0].includes('ไทย')&&opts[1].includes('English')
      &&opts[2].includes('ລາວ')&&opts[3].includes('မြန်မာ')));
  out.push('ตั้งต้นเป็นไทย ยังไม่เรียกตัวแปลเลย: '+(w.eval('LANG')==='th'&&trCalls.length===0));
  // 2) สลับเป็นอังกฤษ → ข้อความไทยถูกแปลทั้งหน้า (รวมชื่อสินค้า/หน่วย/เมนู)
  await w.setLang('en'); await sleep(400);
  const t1=body();
  out.push('เปลี่ยนเป็น English แล้วเรียกตัวแปลจริง + ปุ่มเปลี่ยนชื่อภาษา: '
    +(trCalls.length>0&&trCalls[0].tl==='en'&&d.getElementById('langName').textContent==='English'));
  const nav=[...d.querySelectorAll('#sideNav [data-t]')].map(b=>b.textContent);
  out.push('เมนู/หัวข้อถูกแปล แปลรอบเดียวไม่ซ้อนทับ (ไม่มี en:en:): '
    +(nav[1].startsWith('en:')&&nav[1].includes('นับสต๊อก')&&!t1.includes('en:en:')));
  out.push('ชื่อสินค้า/ซัพในข้อมูลก็ถูกแปลด้วย: '+(t1.includes('en:ผักบุ้ง')||t1.includes('en:ผัก')));
  out.push('placeholder ช่องค้นหาถูกแปล: '+String(d.getElementById('q').getAttribute('placeholder')).startsWith('en:'));
  out.push('ปุ่มเลือกภาษาเองไม่ถูกแปล (data-notr): '+d.getElementById('langBtn').textContent.includes('English'));
  // 3) แปลแล้วจำไว้ (cache) — เปลี่ยนหน้าไม่ยิงซ้ำ
  const n1=trCalls.length;
  w.setTab('link'); await sleep(300);
  const n2=trCalls.length;
  w.setTab('count'); await sleep(300);
  out.push('เปลี่ยนหน้าแล้วแปลต่อเองอัตโนมัติ + กลับหน้าเดิมใช้แคช ไม่ยิงซ้ำ: '
    +(body().includes('en:')&&n2>n1&&trCalls.length===n2));
  out.push('เก็บคำแปลไว้ใน localStorage (เปิดใหม่ไม่ต้องแปลซ้ำ): '
    +(Object.keys(JSON.parse(w.localStorage.getItem('jjsc_tr_en')||'{}')).length>5));
  // 4) เปลี่ยนเป็นลาว → ยิงตัวแปลด้วย tl=lo
  await w.setLang('lo'); await sleep(400);
  out.push('เปลี่ยนเป็นลาว: ยิง tl=lo + หน้าจอเป็นคำแปลลาว: '
    +(trCalls.some(c=>c.tl==='lo')&&body().includes('lo:')&&w.localStorage.getItem('jjsc_lang')==='lo'));
  // 5) พม่า
  await w.setLang('my'); await sleep(400);
  out.push('เปลี่ยนเป็นพม่า: ยิง tl=my + หน้าจอเป็นคำแปลพม่า: '
    +(trCalls.some(c=>c.tl==='my')&&body().includes('my:')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
