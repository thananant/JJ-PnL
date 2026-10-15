// smoke131: jjmk-stockcheck — ➕ เพิ่มสินค้าใหม่ · 🗑 ถังขยะ/↩️ กู้คืน · ตั้งซัพรายสินค้า (เจ้าของสั่ง 15 ต.ค. 2569: ทำในแอพนับใหม่ ไม่ต้องไปแอพนับเดิม)
// live: รัชดา p1 หมูสามชั้น (sort 1) p2 ผักบุ้ง (sort 7) · ลาดพร้าว q1 หมูสามชั้น (sort 3)
// ถังขยะ: รัชดา t1 น้ำแข็ง · ลาดพร้าว t2 น้ำแข็ง · รัชดา t3 หมูสามชั้น (ชื่อซ้ำกับตัวที่ใช้อยู่ → ห้ามกู้)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const RD='b19f0a17b4472', LP='b19f0a17b448212';
const HP=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const posts=[],patches=[]; const MODE={deny:false};
const LIVE=[
  {id:'p1',branch_id:RD,name:'หมูสามชั้น',unit:'กก.',sup:'Smilemeat',cat_label:'เนื้อสัตว์',sort:1,image_url:null,dept:'ครัว'},
  {id:'p2',branch_id:RD,name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',cat_label:'ผัก',sort:7,image_url:null,dept:'ครัว'},
  {id:'q1',branch_id:LP,name:'หมูสามชั้น',unit:'กก.',sup:'Smilemeat',cat_label:'เนื้อสัตว์',sort:3,image_url:null,dept:'ครัว'}];
const TRASH=[
  {id:'t1',branch_id:RD,name:'น้ำแข็ง',unit:'ถุง',sup:'',deleted_at:'2026-09-19T12:00:00Z'},
  {id:'t2',branch_id:LP,name:'น้ำแข็ง',unit:'ถุง',sup:'',deleted_at:'2026-09-19T12:00:00Z'},
  {id:'t3',branch_id:RD,name:'หมูสามชั้น',unit:'กก.',sup:'',deleted_at:'2026-09-01T12:00:00Z'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      const E=async(st,m)=>({ok:false,status:st,text:async()=>m});
      if(method==='POST'){ if(MODE.deny&&url.includes('/products'))return E(401,'{"code":"42501","message":"permission denied for table products"}');
        posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'){patches.push({url:decodeURIComponent(url),body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
        {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
        return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
      if(url.includes('products')&&url.includes('deleted_at=not.is.null'))return T(TRASH);
      if(url.includes('products')&&url.includes('select=cat_key,cat_ic'))return T(decodeURIComponent(url).includes('cat_label=eq.เนื้อสัตว์')?[{cat_key:'meat',cat_ic:'🥩'}]:[]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T(LIVE);
      if(url.includes('products')&&url.includes('branch_id=eq.'+RD))return T(LIVE.filter(r=>r.branch_id===RD).map(r=>({...r,rate_wk:1,rate_fri:1,rate_we:1})));
      if(url.includes('products'))return T([]);
      if(url.includes('suppliers'))return T([{name:'Smilemeat',order_mode:'any',lead_days:1},{name:'FarmFresh',order_mode:'any',lead_days:1}]);
      if(url.includes('sc_units'))return T([{name:'กก.',sort:1},{name:'ถุง',sort:2}]);
      return T([]);
    };
    w.TextEncoder=TextEncoder; w.confirm=()=>true;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  d.getElementById('lgU').value='admin'; d.getElementById('lgP').value='jjmk1234';
  await w.doLogin(); await sleep(300);
  d.getElementById('cd').value='2026-10-15'; await w.loadAll(); await sleep(150);
  w.setTab('items'); await sleep(150);
  const L=()=>d.getElementById('list').textContent;
  out.push('หน้า 📦 รายการสินค้า: มีปุ่ม ➕ เพิ่มสินค้าใหม่ + 🗑 ถังขยะ · โน้ตไม่บอก "กู้คืนได้ที่ฐานข้อมูล" แล้ว: '+(L().includes('➕ เพิ่มสินค้าใหม่')&&L().includes('🗑 ถังขยะ')&&!L().includes('กู้คืนได้ที่ฐานข้อมูล')));
  // 1) เพิ่มสินค้าใหม่ 2 สาขา
  w.newProdOpen(); await sleep(50);
  const set=(id,v)=>{const el=d.getElementById(id); el.value=v;};
  out.push('ฟอร์มเพิ่มสินค้า: ชื่อ/หน่วย/แผนก/ซัพ/สาขา 2 ช่อง (ติ๊กไว้)/อัตราใช้ 3 ช่อง · หน่วยมีให้เลือก กก./ถุง: '
    +(!!d.getElementById('np_name')&&!!d.getElementById('np_br_JJRD')&&d.getElementById('np_br_JJRD').checked&&d.getElementById('np_br_JJLP').checked&&!!d.getElementById('np_we')
      &&[...d.querySelectorAll('#np_units option')].map(o=>o.value).join(',')==='กก.,ถุง'));
  set('np_name','  หมูสันคอ   สไลด์ '); set('np_unit','กก.'); set('np_dept','เนื้อสัตว์'); set('np_sup','CPF'); set('np_wk','2'); set('np_fri','3'); set('np_we','');
  await w.newProdSave(); await sleep(100);
  const pp=posts.find(p=>p.url.includes('/rest/v1/products'));
  const r0=pp&&pp.rows[0], r1=pp&&pp.rows[1];
  out.push('POST products 2 แถว (รัชดา+ลาดพร้าว) ชื่อตัดช่องว่าง "หมูสันคอ สไลด์" · หน่วย กก. · ซัพ CPF · cat_label/dept เนื้อสัตว์ · cat_key meat (ของหมวดเดิม) 🥩: '
    +(!!pp&&pp.rows.length===2&&r0.branch_id===RD&&r1.branch_id===LP&&r0.name==='หมูสันคอ สไลด์'&&r0.unit==='กก.'&&r0.sup==='CPF'&&r0.cat_label==='เนื้อสัตว์'&&r0.dept==='เนื้อสัตว์'&&r0.cat_key==='meat'&&r0.cat_ic==='🥩'));
  out.push('sort ต่อท้ายแต่ละสาขา (รัชดา 7+1 = 8 · ลาดพร้าว 3+1 = 4) · อัตราใช้ 2/3/ว่าง → null · id ขึ้นต้น p + 16 หลัก ไม่ซ้ำ: '
    +(r0.sort===8&&r1.sort===4&&r0.rate_wk===2&&r0.rate_fri===3&&r0.rate_we===null&&/^p[0-9a-f]{16}$/.test(r0.id)&&r0.id!==r1.id));
  out.push('ซัพใหม่ CPF → เพิ่มเข้าตาราง suppliers ด้วย: '+posts.some(p=>p.url.includes('/suppliers')&&p.rows.name==='CPF'));
  // 2) ชื่อซ้ำในสาขาที่มีอยู่แล้ว
  posts.length=0; w.newProdOpen(); await sleep(30);
  set('np_name','หมูสามชั้น'); set('np_unit','กก.'); d.getElementById('np_br_JJLP').checked=false;
  await w.newProdSave(); await sleep(60);
  out.push('ชื่อซ้ำกับตัวที่ใช้อยู่ในสาขาเดียวกัน → ไม่สร้าง: '+!posts.some(p=>p.url.includes('/rest/v1/products')));
  // 3) ชื่ออยู่ในถังขยะ → เสนอกู้คืน (ตกลง) = PATCH deleted_at null ด้วย id เดิม ไม่ POST
  posts.length=0; patches.length=0; w.newProdOpen(); await sleep(30);
  set('np_name','น้ำแข็ง'); set('np_unit','ถุง');
  await w.newProdSave(); await sleep(100);
  const pr=patches.find(p=>p.url.includes('products?id=in.'));
  out.push('ชื่ออยู่ในถังขยะ → กู้คืนตัวเดิม t1+t2 (deleted_at null) ไม่สร้างใหม่: '+(!!pr&&pr.url.includes('id=in.(t1,t2)')&&pr.body.deleted_at===null&&!posts.some(p=>p.url.includes('/rest/v1/products'))));
  // 4) ถังขยะ: เปิดดู · กู้คืน
  w.eval('S.trashOpen=false'); await w.trashToggle(); await sleep(80);
  out.push('🗑 ถังขยะ: เห็นน้ำแข็ง (2 สาขา) + หมูสามชั้น: '+(L().includes('🗑 ถังขยะ')&&L().includes('น้ำแข็ง')&&L().includes('↩️ กู้คืนทุกสาขา')));
  patches.length=0; await w.prodRestore(['t3']); await sleep(50);
  out.push('กู้ t3 หมูสามชั้น ไม่ได้ (ชื่อนี้ใช้อยู่แล้วในรัชดา): '+!patches.some(p=>p.url.includes('id=in.')));
  patches.length=0; await w.prodRestore(['t2']); await sleep(80);
  out.push('กู้ t2 (ลาดพร้าว) → PATCH id=in.(t2) deleted_at null: '+patches.some(p=>p.url.includes('products?id=in.(t2)')&&p.body.deleted_at===null));
  // 5) ตั้งซัพรายสินค้า
  w.setTab('items'); await sleep(80);
  patches.length=0; await w.prodSetSup('ผักบุ้ง','Freshy'); await sleep(60);
  const ps=patches.find(p=>p.url.includes('products?name=eq.ผักบุ้ง'));
  out.push('เปลี่ยนซัพ ผักบุ้ง → Freshy: PATCH products?name=eq.ผักบุ้ง&deleted_at=is.null {sup:Freshy} + ซัพใหม่เข้าตาราง: '
    +(!!ps&&ps.url.includes('deleted_at=is.null')&&ps.body.sup==='Freshy'&&posts.some(p=>p.url.includes('/suppliers')&&p.rows.name==='Freshy')
      &&w.eval("S.all.find(x=>x.id==='p2').sup")==='Freshy'));
  w.eval("S.itemOpen={'ครัว':true};render()"); await sleep(40);
  const sel=[...d.querySelectorAll('#list select.zsel')].find(s=>[...s.options].some(o=>o.value==='Smilemeat'));
  out.push('ช่องซัพในแถวสินค้าเป็นตัวเลือก (มี "(ไม่ระบุซัพ)" + รายชื่อซัพ): '+(!!sel&&[...sel.options].some(o=>o.textContent==='(ไม่ระบุซัพ)')));
  // 6) ยังไม่รัน SQL (ไม่มีสิทธิ์ insert) → บอกให้รัน SQL ไม่พัง
  MODE.deny=true; w.newProdOpen(); await sleep(30);
  set('np_name','ของใหม่ทดสอบ'); set('np_unit','ชิ้น');
  let msg=''; const t0=w.toast; w.toast=(m,bad)=>{msg=m; t0(m,bad);};
  await w.newProdSave(); await sleep(60);
  out.push('ไม่มีสิทธิ์ insert → ข้อความ "ต้องรัน SQL ... grant insert on products" · ฟอร์มยังเปิดอยู่: '+(msg.includes('grant insert on products')&&d.getElementById('ovl').classList.contains('on')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
