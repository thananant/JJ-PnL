// smoke_sc_items: jjmk-stockcheck — หน้า 📦 รายการสินค้า กันพัง (รีวิว 15 ต.ค. 2569)
// ① ชื่อมี ' (Lay's / M&M's / แผนก Chef's) และชื่อแปลก x');window.PWN=1;(' → ปุ่ม 🌏/บันทึกคำแปล/ช่องซัพ/🗑 เลิกใช้/↩️ กู้คืน/หัวแผนก ใช้ได้ ไม่รันโค้ด
// ② กู้คืนสาขาละ 1 ตัว (ตัวที่ลบล่าสุด): ลาดพร้าวมี ข้าวคั่ว ในถังขยะ 2 ตัว t6 (10-10) t5 (09-03) → กู้ t6 ตัวเดียว · รัชดา t4 ชื่อชนตัวที่ใช้อยู่ p2 → ข้าม
//    หมูยอ 2 ตัวแต่สาขาเดียว → ปุ่มไม่ขึ้น "ทุกสาขา"
// ③ รายการทุกสาขากำลังโหลด/โหลดพัง → ➕ เพิ่ม "หมูสามชั้น" (มีอยู่แล้วทั้ง 2 สาขา) ต้องไม่ POST · ↩️ กู้ t4 ต้องไม่ PATCH · ไม่ยิงโหลดรัวตอนวาดจอ
// ④ กด "บันทึกสินค้า" 2–3 ที ระหว่างรอเน็ต → POST ครั้งเดียว · ปุ่มขึ้น ⏳ กำลังบันทึก... แล้วกลับมาเหมือนเดิม
//    คิดมือ sort: รัชดาที่ใช้อยู่ p1 1 · p2 2 · p8 6 · p9 7 (p7 Lay's เลิกใช้ไปแล้ว) → 8 · ลาดพร้าว q1 3 · t6 4 (กู้แล้ว) · q9 9 → 10
// ⑤ เพิ่ม "ซอสพริก" ที่รัชดา (ลาดพร้าวมีพร้อมคำแปล) → แถวใหม่ได้ i18n ของเดิม · sort รัชดา = 8 (ซอสใหม่) + 1 = 9
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const RD='b19f0a17b4472', LP='b19f0a17b448212';
const HP=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const PWN="x');window.PWN=1;('";
const L=(id,br,name,o)=>Object.assign({id,branch_id:br,name,unit:'กก.',sup:'',cat_label:'ของ',sort:1,image_url:null,dept:'ครัว',deleted_at:null,i18n:null},o||{});
const DB=[
  L('p1',RD,'หมูสามชั้น',{sup:'Smilemeat',sort:1}), L('q1',LP,'หมูสามชั้น',{sup:'Smilemeat',sort:3}),
  L('p2',RD,'ข้าวคั่ว',{sort:2}),
  L('p7',RD,"Lay's",{sup:'FarmFresh',sort:5}), L('p8',RD,PWN,{sup:'FarmFresh',sort:6}),
  L('p9',RD,'ผักชี',{dept:"Chef's",sort:7}),
  L('q9',LP,'ซอสพริก',{unit:'ขวด',sort:9,i18n:{en:'Chili sauce (JJ)',lo:'ຊອດພິກ (JJ)',my:'ငရုတ်ဆော့ (JJ)'}}),
  L('t6',LP,'ข้าวคั่ว',{sort:4,deleted_at:'2026-10-10T10:00:00Z'}), L('t5',LP,'ข้าวคั่ว',{sort:8,deleted_at:'2026-09-03T10:00:00Z'}),
  L('t4',RD,'ข้าวคั่ว',{sort:3,deleted_at:'2026-09-03T10:00:00Z'}),
  L('t8',LP,'หมูยอ',{deleted_at:'2026-10-12T10:00:00Z'}), L('t7',LP,'หมูยอ',{deleted_at:'2026-09-03T10:00:00Z'}),
  L('t10',RD,"M&M's",{deleted_at:'2026-10-01T10:00:00Z'})];
const MODE={lat:0,apSlow:0,apFail:false}; const log={posts:[],patches:[],toast:[],ap:0};
function prodQ(url){
  const p=new URL(url).searchParams; let rows=DB.slice();
  const nm=p.get('name'); if(nm&&nm.startsWith('eq.'))rows=rows.filter(r=>r.name===nm.slice(3));
  const bi=p.get('branch_id'); if(bi&&bi.startsWith('eq.'))rows=rows.filter(r=>r.branch_id===bi.slice(3));
  if(bi&&bi.startsWith('in.(')){const ids=bi.slice(4,-1).split(',');rows=rows.filter(r=>ids.includes(r.branch_id));}
  const id=p.get('id'); if(id&&id.startsWith('in.(')){const ids=id.slice(4,-1).split(',');rows=rows.filter(r=>ids.includes(r.id));}
  if(id&&id.startsWith('eq.'))rows=rows.filter(r=>r.id===id.slice(3));
  if(p.get('i18n')==='not.is.null')rows=rows.filter(r=>r.i18n!=null);
  const da=p.get('deleted_at'); if(da==='is.null')rows=rows.filter(r=>!r.deleted_at); if(da==='not.is.null')rows=rows.filter(r=>r.deleted_at);
  if(p.get('order')==='deleted_at.desc')rows.sort((a,b)=>String(b.deleted_at).localeCompare(String(a.deleted_at)));
  return rows;
}
const sel=(rows,url)=>{const s=(new URL(url).searchParams.get('select')||'*').split(',');return rows.map(r=>{const o={};s.forEach(k=>{if(k in r)o[k]=r[k];});return o;});};
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.JJSC_NOPREWARM=1;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      const E=async(st,m)=>({ok:false,status:st,text:async()=>m});
      if(MODE.lat)await new Promise(r=>setTimeout(r,MODE.lat));
      if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
        {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
        return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
      if(url.includes('/rest/v1/products')){
        if(method==='POST'){const rows=JSON.parse(opt.body);log.posts.push(rows);rows.forEach(r=>DB.push(L(r.id,r.branch_id,r.name,r)));return T([]);}
        if(method==='PATCH'){const body=JSON.parse(opt.body);log.patches.push({url:decodeURIComponent(url),body});prodQ(url).forEach(r=>Object.assign(r,body));return T([]);}
        if(url.includes('select=cat_key'))return T([]);
        if(url.includes('select=id,branch_id,name,unit,sup,cat_label,sort,image_url')){ log.ap++;   // รายการทุกสาขา (ensureAllProducts)
          if(MODE.apSlow)await new Promise(r=>setTimeout(r,MODE.apSlow));
          if(MODE.apFail)return E(503,'Failed to fetch'); }
        return T(sel(prodQ(url),url));}
      if(url.includes('suppliers')&&method==='GET')return T([{name:'Smilemeat',order_mode:'any',lead_days:1},{name:'FarmFresh',order_mode:'any',lead_days:1}]);
      if(url.includes('sc_units'))return T([{name:'กก.',sort:1},{name:'ขวด',sort:2}]);
      return T([]);
    };
    w.TextEncoder=TextEncoder; w.confirm=()=>true;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const prodPosts=()=>log.posts.filter(rows=>rows.some(r=>r.branch_id));
const rowOf=n=>[...d.querySelectorAll('#list .lrow')].find(x=>{const t=x.querySelector('.nm .t');return t&&t.textContent===n;});
const btnIn=(el,txt)=>el&&[...el.querySelectorAll('button')].find(b=>b.textContent.includes(txt));
const set=(id,v)=>{const el=d.getElementById(id); if(el)el.value=v;};
const fillNew=(name,unit,brs)=>{ w.newProdOpen(); set('np_name',name); set('np_unit',unit); ['JJRD','JJLP'].forEach(b=>{const c=d.getElementById('np_br_'+b); if(c)c.checked=brs.includes(b);}); };
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  const t0=w.toast; w.toast=(m,bad)=>{log.toast.push(m);t0(m,bad);};
  d.getElementById('lgU').value='admin'; d.getElementById('lgP').value='jjmk1234';
  await w.doLogin(); await sleep(200);
  d.getElementById('cd').value='2026-10-15'; await w.loadAll(); await sleep(150);
  // ===== ① ชื่อมี ' / ชื่อแปลก =====
  const dash=[...d.querySelectorAll('#list .lrow')].find(x=>x.textContent.includes("Chef's"));
  if(dash)dash.click(); await sleep(60);
  out.push("หน้าหลัก: กดแถวแผนก Chef's → ไปหน้านับแผนก Chef's: "+(w.eval('S.tab')==='count'&&w.eval('S.dept')==="Chef's"));
  w.eval("S.dept='ครัว'"); w.render(); await sleep(30);
  const pill=[...d.querySelectorAll('.pill')].find(x=>x.textContent.includes("Chef's"));
  if(pill)pill.click(); await sleep(30);
  out.push("หน้านับ: ปุ่มแผนก Chef's กดได้: "+(w.eval('S.dept')==="Chef's"));
  w.setTab('items'); await sleep(100);
  const ghead=[...d.querySelectorAll('#list .lrow')].find(x=>x.textContent.includes("Chef's")&&x.textContent.includes('รายการ'));
  if(ghead)ghead.click(); await sleep(30);
  out.push("หัวแผนก Chef's กดกางได้: "+(w.eval("!!(S.itemOpen||{})[\"Chef's\"]")));
  w.eval("S.itemOpen={'ครัว':true}"); w.render(); await sleep(30);
  const tr=async n=>{ log.patches.length=0; const b=btnIn(rowOf(n),'🌏'); if(b)b.click(); await sleep(80);
    const open=d.getElementById('ovl').classList.contains('on'), title=(d.querySelector('#ovlBox b')||{}).textContent;
    set('ptr_en',n+' EN'); const g=d.querySelector('#ovlBox .go'); if(open&&g)g.click(); await sleep(80);
    return {open,title,p:log.patches.find(x=>x.url.includes('products?name=eq.'+n)&&x.body.i18n&&x.body.i18n.en===n+' EN')}; };
  const ss=async(n,v)=>{ log.patches.length=0; const s=rowOf(n)&&rowOf(n).querySelector('select.zsel'); if(s){ s.value=v; s.dispatchEvent(new w.Event('change',{bubbles:true})); } await sleep(80);
    return log.patches.find(x=>x.url.includes('products?name=eq.'+n+'&deleted_at=is.null')&&x.body.sup===v); };
  const a1=await tr("Lay's");
  out.push("Lay's: 🌏 เปิดหน้าแก้คำแปล (หัวข้อ Lay's) · กดบันทึก → PATCH products?name=eq.Lay's {i18n:{en:\"Lay's EN\"}}: "+(a1.open&&a1.title==="Lay's"&&!!a1.p));
  out.push("Lay's: เปลี่ยนซัพเป็น Smilemeat → PATCH products?name=eq.Lay's&deleted_at=is.null {sup:Smilemeat}: "+!!(await ss("Lay's",'Smilemeat')));
  const a2=await tr(PWN);
  out.push("ชื่อ x');window.PWN=1;(' : 🌏 + บันทึก → PATCH ด้วยชื่อเต็ม (ไม่ใช่ name=eq.x): "+(a2.open&&a2.title===PWN&&!!a2.p&&!log.patches.some(x=>/name=eq\.x(&|$)/.test(x.url))));
  out.push("ชื่อ x');window.PWN=1;(' : เปลี่ยนซัพ → PATCH ด้วยชื่อเต็ม: "+!!(await ss(PWN,'Smilemeat')));
  out.push('ไม่มีโค้ดจากชื่อสินค้าถูกรัน (window.PWN ยังไม่มี): '+(w.PWN===undefined));
  log.patches.length=0; const dl=btnIn(rowOf("Lay's"),'เลิกใช้'); if(dl)dl.click(); await sleep(80);
  out.push("Lay's: 🗑 เลิกใช้ → PATCH name=eq.Lay's&deleted_at=is.null {deleted_at}: "+log.patches.some(x=>x.url.includes("products?name=eq.Lay's&deleted_at=is.null")&&x.body.deleted_at));
  // ===== ② ถังขยะ: กู้สาขาละ 1 ตัว =====
  w.eval('S.trashOpen=false'); await w.trashToggle(); await sleep(80);
  const tRow=n=>[...d.querySelectorAll('#list .lrow')].find(x=>{const t=x.querySelector('.nm .t');return t&&t.textContent===n&&x.textContent.includes('กู้คืน');});
  out.push('ถังขยะ: หมูยอ 2 ตัวแต่ลาดพร้าวสาขาเดียว → ปุ่ม "↩️ กู้คืน" (ไม่ใช่ทุกสาขา) · ข้าวคั่ว (ลาดพร้าว+รัชดา) → "ทุกสาขา": '
    +(!!tRow('หมูยอ')&&!btnIn(tRow('หมูยอ'),'ทุกสาขา')&&!!btnIn(tRow('หมูยอ'),'↩️ กู้คืน')&&!!btnIn(tRow('ข้าวคั่ว'),'↩️ กู้คืนทุกสาขา')));
  log.patches.length=0; log.toast.length=0; const rb=btnIn(tRow('ข้าวคั่ว'),'↩️ กู้คืนทุกสาขา'); if(rb)rb.click(); await sleep(150);
  const pr=log.patches.filter(x=>x.url.includes('products?id=in.'));
  out.push('↩️ กู้คืน ข้าวคั่ว → PATCH id=in.(t6) ตัวเดียว (ไม่เอา t5 ตัวซ้ำเก่า · t4 รัชดาชน p2 ข้าม) · บอกข้าม 1 สาขา: '
    +(pr.length===1&&pr[0].url.endsWith('products?id=in.(t6)')&&pr[0].body.deleted_at===null&&log.toast.some(m=>m.includes('(1 สาขา)')&&m.includes('ข้าม 1 สาขา'))));
  log.patches.length=0; w.setTab('items'); await sleep(60);
  const mm=btnIn(tRow("M&M's"),'↩️ กู้คืน'); if(mm)mm.click(); await sleep(150);
  out.push("ถังขยะ M&M's: ปุ่ม ↩️ กู้คืน → PATCH id=in.(t10): "+log.patches.some(x=>x.url.endsWith('products?id=in.(t10)')));
  // ➕ เพิ่ม "ข้าวคั่ว" ทั้ง 2 สาขา (รัชดามีอยู่แล้ว · ลาดพร้าวอยู่ในถังขยะ 2 ตัว) → กู้ t6 ตัวเดียว ไม่ POST
  DB.find(r=>r.id==='t6').deleted_at='2026-10-10T10:00:00Z'; await w.loadAll(); await sleep(80);
  log.patches.length=0; log.posts.length=0; fillNew('ข้าวคั่ว','กก.',['JJRD','JJLP']); await w.newProdSave(); await sleep(100);
  const pr2=log.patches.filter(x=>x.url.includes('products?id=in.'));
  out.push('➕ ข้าวคั่ว → กู้คืน ลาดพร้าว id=in.(t6) ตัวเดียว · ไม่สร้างใหม่: '+(pr2.length===1&&pr2[0].url.endsWith('products?id=in.(t6)')&&!prodPosts().length));
  // ===== ③ รายการทุกสาขากำลังโหลด / โหลดพัง =====
  w.setTab('items'); await sleep(40);
  MODE.apSlow=700; await w.loadAll(); await sleep(20);
  const loading=w.eval('S.allBr===null');
  log.posts.length=0; log.toast.length=0; fillNew('หมูสามชั้น','กก.',['JJRD','JJLP']); await w.newProdSave(); await sleep(50);
  out.push('กำลังโหลดรายการทุกสาขา (S.allBr ยังว่าง) → ➕ หมูสามชั้น รอโหลดเสร็จแล้วเจอว่ามีอยู่แล้ว ไม่ POST: '
    +(loading&&!prodPosts().length&&log.toast.some(m=>m.includes('มี "หมูสามชั้น" อยู่แล้ว'))));
  w.modalClose(); MODE.apSlow=0; MODE.apFail=true; await w.loadAll(); await sleep(60);
  out.push('โหลดรายการทุกสาขาพัง → S.allBr = null (ไม่ใช่ []) · หน้าแจ้ง ⚠ โหลดไม่สำเร็จ + ปุ่มลองใหม่: '
    +(w.eval('S.allBr===null&&!!S.apErr')&&d.getElementById('list').textContent.includes('⚠ โหลดไม่สำเร็จ')&&!!btnIn(d.getElementById('list'),'ลองใหม่')));
  const ap0=log.ap; for(let i=0;i<5;i++){ w.render(); await sleep(20); }
  out.push('โหลดพังแล้ววาดจอซ้ำ 5 รอบ → ไม่ยิงโหลดรัว (0 ครั้ง): '+(log.ap===ap0));
  log.posts.length=0; log.toast.length=0; fillNew('หมูสามชั้น','กก.',['JJRD','JJLP']); await w.newProdSave(); await sleep(50);
  out.push('โหลดพัง → ➕ หมูสามชั้น ไม่ POST + แจ้ง "โหลดรายการสินค้าไม่สำเร็จ": '+(!prodPosts().length&&log.toast.some(m=>m.includes('โหลดรายการสินค้าไม่สำเร็จ'))));
  w.modalClose(); await w.ensureTrash(true);
  log.patches.length=0; log.toast.length=0; await w.prodRestore(['t4']); await sleep(50);
  out.push('โหลดพัง → ↩️ กู้ t4 (ข้าวคั่วรัชดา · p2 ใช้อยู่) ไม่ PATCH + แจ้ง "โหลดรายการสินค้าไม่สำเร็จ": '+(!log.patches.length&&log.toast.some(m=>m.includes('โหลดรายการสินค้าไม่สำเร็จ'))));
  MODE.apFail=false; const rt=btnIn(d.getElementById('list'),'ลองใหม่'); if(rt)rt.click(); await sleep(80);
  out.push('เน็ตกลับมา → กด ↻ ลองใหม่ → โหลดรายการได้: '+w.eval('Array.isArray(S.allBr)&&S.allBr.length>0&&!S.apErr'));
  // ===== ④ กดบันทึกซ้ำ =====
  log.posts.length=0; fillNew('ซอสใหม่','ขวด',['JJRD','JJLP']); await sleep(20);
  MODE.lat=80; const b=d.getElementById('npGo');
  b.click(); await sleep(30); const mid={dis:b.disabled,txt:b.textContent}; b.click(); w.newProdSave(); await sleep(60); w.newProdSave();
  await sleep(2500); MODE.lat=0;
  const pp=prodPosts();
  out.push('กดบันทึก 3 ที ระหว่างรอ → POST products ครั้งเดียว 2 แถว (รัชดา+ลาดพร้าว): '+(pp.length===1&&pp[0].length===2&&pp[0].every(r=>r.name==='ซอสใหม่')));
  out.push('ระหว่างบันทึก ปุ่มกดไม่ได้ + ขึ้น "⏳ กำลังบันทึก..." · เสร็จแล้วกลับเป็น "บันทึกสินค้า": '+(mid.dis===true&&mid.txt==='⏳ กำลังบันทึก...'&&b.disabled===false&&b.textContent==='บันทึกสินค้า'));
  out.push('sort ต่อท้าย: รัชดา 8 · ลาดพร้าว 10: '+(pp.length>0&&pp[0][0].sort===8&&pp[0][1].sort===10));
  log.toast.length=0; fillNew('','ขวด',['JJRD']); const b2=d.getElementById('npGo'); b2.click(); await sleep(50);
  out.push('ไม่ใส่ชื่อ → แจ้ง "ใส่ชื่อสินค้าก่อนครับ" · ปุ่มกลับมากดได้: '+(log.toast.includes('ใส่ชื่อสินค้าก่อนครับ')&&b2.disabled===false&&b2.textContent==='บันทึกสินค้า'));
  w.modalClose();
  // ===== ⑤ เพิ่มชื่อที่อีกสาขามี → เอาคำแปลมาด้วย =====
  log.posts.length=0; fillNew('ซอสพริก','ขวด',['JJRD','JJLP']); await w.newProdSave(); await sleep(100);
  const sp=prodPosts()[0], r0=sp&&sp[0];
  out.push('➕ ซอสพริก (ลาดพร้าวมีแล้ว) → POST รัชดาแถวเดียว sort 9 · i18n {en:Chili sauce (JJ), lo, my} ตามของเดิม: '
    +(!!sp&&sp.length===1&&r0.branch_id===RD&&r0.sort===9&&JSON.stringify(r0.i18n)===JSON.stringify({en:'Chili sauce (JJ)',lo:'ຊອດພິກ (JJ)',my:'ငရုတ်ဆော့ (JJ)'})));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
