// smoke96: jjmk-stockcheck — เมนู 🛒 สั่งของ (แยกรายซัพ) + แดชบอร์ด 📊
// สูตร: ต้องสั่ง = อัตราใช้ของ "วันที่ของมาส่ง" − ยอดที่นับได้ (ตัดวันขายตี 6)
// fixture JJRD วันขาย 2026-09-14 (จันทร์):
//   p1 หมูสไลด์ · ซัพ Smilemeat (สั่งได้ทุกวัน lead 1 → ส่งอังคาร 15 ก.ย.) rate_wk=50 · นับได้ 10 → ต้องสั่ง 40
//   p2 ผักบุ้ง · ซัพ FarmFresh (วันสั่งตายตัว จันทร์→ส่งพุธ 16 ก.ย.) rate_wk=8 · นับได้ 8 → พอแล้ว (0)
//   p3 น้ำแข็ง · ซัพ Smilemeat · rate_wk=20 · ยังไม่ได้นับ → ขึ้น "ยังไม่นับ"
//   หน่วยซื้อหมูสไลด์จากบิล = ลัง (1 ลัง = 12 กก.) → 40 กก. ≈ 4 ลัง (ปัดขึ้น)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const sent=[],receipts=[],supPosts=[],supPatches=[],supDels=[],syncs=[];
let lineGroups=[{group_id:'C123',name:'กลุ่มสั่งของ Smilemeat',seen_at:'2026-09-01'}];
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','dash');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v}); // ของจริงมี json()
      if(url.includes('/functions/v1/line-order')){sent.push(JSON.parse(opt.body));return T({ok:true});}
      if(url.includes('/functions/v1/sync-line-groups')){syncs.push(1);return T({updated:2});}
      if(url.includes('stock_receipts')){receipts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('suppliers')&&method==='POST'){supPosts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('suppliers')&&method==='PATCH'){supPatches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('products')&&method==='PATCH'){supPatches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('line_groups')&&method==='PATCH'){supPatches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(method==='DELETE'){supDels.push(url);return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T(lineGroups);
      if(url.includes('sc_config'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:21,branch:'JJRD',product_id:'p1',pnl_item:'หมูสไลด์',product_name:'หมูสไลด์',bill_unit:'ลัง',stock_unit:'กก.',factor:12,active:true},
        {id:22,branch:'JJRD',product_id:'p2',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:'กก.',stock_unit:'กก.',factor:1,active:true}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([
        {id:'p1',branch_id:BID,name:'หมูสไลด์',unit:'กก.',sup:'Smilemeat',cat_label:'เนื้อสัตว์',dept:'ครัว'},
        {id:'p1b',branch_id:'b19f0a17b448212',name:'หมูสไลด์',unit:'กก.',sup:'Smilemeat',cat_label:'เนื้อสัตว์',dept:'ครัว'},
        {id:'p2',branch_id:BID,name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',cat_label:'ผัก',dept:'ผัก'},
        {id:'p2b',branch_id:'b19f0a17b448212',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',cat_label:'ผัก',dept:'ผัก'},
        {id:'p3',branch_id:BID,name:'น้ำแข็ง',unit:'ถุง',sup:'Smilemeat',cat_label:'เครื่องดื่ม',dept:'บาร์น้ำ'}]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสไลด์',unit:'กก.',sup:'Smilemeat',rate_wk:50,rate_fri:60,rate_we:80,dept:'ครัว',zone:'หลังร้าน',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',rate_wk:8,rate_fri:9,rate_we:12,dept:'ผัก',zone:'หลังร้าน',image_url:null,sort:2},
        {id:'p3',branch_id:BID,cat_label:'เครื่องดื่ม',name:'น้ำแข็ง',unit:'ถุง',sup:'Smilemeat',rate_wk:20,rate_fri:20,rate_we:30,dept:'บาร์น้ำ',zone:'หน้าร้าน',image_url:null,sort:3}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('pnl_bill_items'))return T([
        {item:'หมูสไลด์',unit:'ลัง',d:'2026-09-10',supplier_id:1}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'Smilemeat'}]);
      if(url.includes('pnl_unit_conv'))return T([{item:'หมูสไลด์',from_unit:'ลัง',to_unit:'กก.',factor:12}]);
      if(url.includes('suppliers'))return T([
        {name:'smilemeat ',order_mode:'any',lead_days:1,line_group_id:'C123'}, // เขียนต่างตัวพิมพ์/มีช่องว่างท้าย
        {name:'FarmFresh',order_mode:'fixed',schedule:{mon:'wed'},lead_days:1,line_group_id:null}]);
      if(url.includes('stock_counts'))return T(url.includes(encodeURIComponent('2026-09-14'))||url.includes('2026-09-14')?[
        {product_id:'p1',qty:10,out_of_stock:false,created_at:'2026-09-15T01:00:00Z'},  // นับตี 1 = ยังเป็นวันจันทร์
        {product_id:'p2',qty:2,out_of_stock:false,created_at:'2026-09-15T01:05:00Z'}]:[]); // วันอื่น = ยังไม่ได้นับ
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(350);
  const list=()=>d.getElementById('list').textContent;
  // 0) แดชบอร์ดเป็นหน้าแรก
  out.push('เมนูบนสุด = 📊 แดชบอร์ด และเปิดมาหน้านี้: '
    +(w.eval("S.tab")==='dash'&&d.querySelector('#sideNav [data-t]').dataset.t==='dash'&&list().includes('แดชบอร์ด')));
  out.push('แดชบอร์ดมีกล่องสรุป 4 กล่อง + การ์ดใบสั่งของวันนี้: '
    +(d.querySelectorAll('#list .dtile').length===4&&list().includes('ใบสั่งของวันนี้')));
  // ตั้งวันขาย = จันทร์ 14 ก.ย. 2569
  d.getElementById('cd').value='2026-09-14';
  d.getElementById('cd').dispatchEvent(new w.Event('change'));
  await sleep(300);
  // 1) วันที่ของมาส่ง
  out.push('bizToday ตัดรอบ 6 โมง: ตี 1 ของ 15 ก.ย. = ยังเป็นวันขาย 14: '
    +(w.bizToday(new Date(2026,8,15,1,0))==='2026-09-14'));
  out.push('Smilemeat สั่งได้ทุกวัน lead 1 → ส่ง 15 ก.ย. (อังคาร): '
    +(w.deliveryDate('Smilemeat','2026-09-14').d==='2026-09-15'));
  out.push('FarmFresh วันสั่งตายตัว จันทร์→พุธ → ส่ง 16 ก.ย.: '
    +(w.deliveryDate('FarmFresh','2026-09-14').d==='2026-09-16'));
  // 2) สูตรคำนวณ
  w.setTab('order'); await sleep(250); // รอดึงหน่วยซื้อ/ตัวคูณจากบิล
  const plan=()=>JSON.parse(w.eval('JSON.stringify(orderPlan().map(g=>({sup:g.sup,d:g.dl.d,nOrder:g.nOrder,rows:g.rows.map(r=>({n:r.it.name,have:r.have,need:r.need,order:r.order,packs:r.packs,bu:r.bu}))})))'));
  const P=plan();
  const sm=P.find(g=>g.sup==='Smilemeat'),ff=P.find(g=>g.sup==='FarmFresh');
  const r1=sm.rows.find(r=>r.n==='หมูสไลด์'),r3=sm.rows.find(r=>r.n==='น้ำแข็ง');
  const r2=ff.rows.find(r=>r.n==='ผักบุ้ง');
  out.push('หมูสไลด์: นับได้ 10 · วันอังคารใช้ 50 → ต้องสั่ง 40: '+(r1.have===10&&r1.need===50&&r1.order===40));
  out.push('แปลงเป็นหน่วยซื้อ: 40 กก. ÷ 12 = 4 ลัง (ปัดขึ้น): '+(r1.packs===4&&r1.bu==='ลัง'));
  out.push('ผักบุ้ง: นับได้ 2 · วันพุธใช้ 8 → ต้องสั่ง 6: '+(r2.have===2&&r2.need===8&&r2.order===6));
  out.push('น้ำแข็ง: ยังไม่ได้นับ → order=null (ไม่เดาให้): '+(r3.have===null&&r3.order===null));
  out.push('สรุปรายซัพ: Smilemeat ต้องสั่ง 1 รายการ · FarmFresh 1: '+(sm.nOrder===1&&ff.nOrder===1));
  // 3) หน้าจอ
  out.push('หน้าสั่งของแยกการ์ดรายซัพ + บอกวันส่ง + ปุ่มคัดลอก/ส่งเข้าไลน์: '
    +(list().includes('Smilemeat')&&list().includes('FarmFresh')&&list().includes('ส่ง 2026-09-15')&&list().includes('คัดลอก')&&list().includes('ส่งเข้าไลน์')));
  out.push('ซัพที่ยังไม่ผูกกลุ่มในระบบเดิม ปุ่มบอกว่ายังไม่ผูก: '+w.eval("lineOf('FarmFresh')===null"));
  out.push('จับคู่ชื่อซัพทนตัวพิมพ์/ช่องว่างต่างกัน (products.sup "Smilemeat" ↔ suppliers "smilemeat "): '
    +(w.eval("!!supSched('Smilemeat')")&&w.eval("lineOf('Smilemeat').group_id")==='C123'));
  out.push('แถวหมูสไลด์โชว์ 40 กก. + ≈ 4 ลัง · น้ำแข็งขึ้น "ยังไม่นับ": '
    +(list().includes('40')&&list().includes('4 ลัง')&&list().includes('ยังไม่นับ')));
  out.push('ข้อความใบสั่ง: ร้าน/สาขา/ซัพ/สั่งวันที่/ส่งวันที่ (พ.ศ.) แล้วค่อยรายการ: '
    +(()=>{const t=w.orderText('Smilemeat'),L=t.split('\n');
      return L[0]==='🛒 จริงใจหมูกระทะ'&&L[1]==='🏪 สาขารัชดา'&&L[2]==='🏷️ Smilemeat'
        &&L[3]==='📅 สั่งวันที่ 14 ก.ย. 2569 (จันทร์)'&&L[4]==='🚚 ส่งวันที่ 15 ก.ย. 2569 (อังคาร)'&&L[5]===''
        &&t.includes('• หมูสไลด์ — 4 ลัง')&&t.includes('= 40 กก.')&&t.includes('รวม 1 รายการ');})());
  out.push('ค้นหาในใบสั่ง: พิมพ์ "ผักบุ้ง" เหลือเฉพาะผักบุ้ง: '
    +(w.ordSearch('ผักบุ้ง')===undefined&&list().includes('ผักบุ้ง')&&!list().includes('หมูสไลด์')));
  w.ordSearch('');
  // 4) ของหมด = นับได้ 0 → ต้องสั่งเต็มจำนวน
  w.setTab('count'); await sleep(50);
  w.setOut('p1'); await sleep(30);
  w.setTab('order'); await sleep(50);
  const r1b=plan().find(g=>g.sup==='Smilemeat').rows.find(r=>r.n==='หมูสไลด์');
  out.push('กดหมด → นับได้ 0 → ต้องสั่งเต็ม 50: '+(r1b.have===0&&r1b.order===50));
  // 5) ลำดับรายการเหมือนกันทุกเมนู: ของที่มีครบ 2 สาขาขึ้นก่อน · ของที่มีสาขาเดียวไว้ท้ายกลุ่ม
  // (น้ำแข็ง มีเฉพาะรัชดา — ตามตัวอักษรไทย "น" มาก่อน "ห" แต่ต้องถูกดันลงล่าง)
  out.push('รู้ว่าสินค้าตัวไหนมีกี่สาขา (โหลดทุกสาขาตั้งแต่เปิดแอพ): '
    +(w.eval("S.nameBrN['หมูสไลด์']")===2&&w.eval("S.nameBrN['น้ำแข็ง']")===1));
  const ordNames=plan().find(g=>g.sup==='Smilemeat').rows.map(r=>r.n);
  out.push('หน้าสั่งของ: ตัวที่ต้องสั่ง (หมูสไลด์) ถูกดันขึ้นบนสุดของซัพ: '
    +(JSON.stringify(ordNames)===JSON.stringify(['หมูสไลด์','น้ำแข็ง'])));
  // วันใหม่ (ยังไม่ได้นับอะไร) = ไม่มีตัวไหนต้องสั่ง → กลับไปเรียงลำดับปกติทุกเมนู
  d.getElementById('cd').value='2026-09-21'; d.getElementById('cd').dispatchEvent(new w.Event('change'));
  await sleep(300);
  const fresh=plan().find(g=>g.sup==='Smilemeat').rows.map(r=>r.n);
  out.push('พอเปลี่ยนวัน (ยังไม่นับ) → กลับไปเรียงปกติ ไม่มีตัวไหนถูกดันขึ้น: '
    +(JSON.stringify(fresh)===JSON.stringify(['หมูสไลด์','น้ำแข็ง'])&&plan().every(g=>g.nOrder===0)));
  d.getElementById('cd').value='2026-09-14'; d.getElementById('cd').dispatchEvent(new w.Event('change'));
  await sleep(320);
  // ส่งใบสั่งเข้ากลุ่มไลน์ของซัพ (ผ่านตัวกลางที่ถือโทเคน)
  w.confirm=()=>true;
  await w.sendLine('Smilemeat'); await sleep(60);
  out.push('ส่งไลน์ผ่าน Edge Function เดิม (/functions/v1/line-order) ด้วย group id จาก suppliers: '
    +(sent.length===1&&sent[0].to==='C123'&&sent[0].text.includes('หมูสไลด์')));
  out.push('ส่งสำเร็จ → บันทึกยอดสั่งลง stock_receipts ให้ระบบเดิมใช้ต่อ (ordered 40, order_date วันขาย): '
    +(receipts.length===1&&receipts[0][0].ordered===40&&receipts[0][0].sup==='Smilemeat'
      &&receipts[0][0].order_date==='2026-09-14'&&receipts[0][0].product_id==='p1'));
  await w.sendLine('FarmFresh'); await sleep(40);
  out.push('ซัพที่ยังไม่ผูกกลุ่ม ไม่ยิงเข้าไลน์ (เปิดแชร์ให้เลือกกลุ่มเองแทน): '+(sent.length===1));
  out.push('ตัวเรียงกลาง cmpItem ใช้ร่วมทุกเมนู (ของสาขาเดียวลงท้าย ถึงชื่อจะมาก่อนตามตัวอักษร): '
    +(w.eval("[{name:'น้ำแข็ง'},{name:'หมูสไลด์'},{name:'ผักบุ้ง'}].sort(cmpItem).map(x=>x.name).join(',')")==='ผักบุ้ง,หมูสไลด์,น้ำแข็ง'));
  w.setTab('count'); w.pickDept('บาร์น้ำ'); await sleep(50);
  const cntTxt=list();
  out.push('การ์ดหน้านับบอกด้วยว่าเป็นของเฉพาะสาขานี้: '+cntTxt.includes('เฉพาะสาขารัชดา'));
  // 6) จัดการซัพ: เพิ่ม / เปลี่ยนชื่อ (ตามไปแก้ในสินค้า) / ย้ายของ / ลบ
  w.setTab('cfgl'); await sleep(60);
  out.push('หน้าซัพพลายเออร์: เห็นซัพจากระบบเดิม + จำนวนสินค้า + ช่องเพิ่มซัพใหม่: '
    +(list().includes('ซัพพลายเออร์')&&list().includes('Smilemeat')&&!!d.getElementById('nsName')));
  d.getElementById('nsName').value='ซัพใหม่ทดสอบ';
  await w.supAdd(); await sleep(50);
  out.push('เพิ่มซัพใหม่ → POST suppliers (order_mode any, lead 1): '
    +(supPosts.length===1&&supPosts[0].name==='ซัพใหม่ทดสอบ'&&supPosts[0].order_mode==='any'
      &&w.eval("!!supSched('ซัพใหม่ทดสอบ')")));
  w.prompt=()=>'ซัพเปลี่ยนชื่อแล้ว';
  await w.supRename('ซัพใหม่ทดสอบ'); await sleep(50);
  out.push('เปลี่ยนชื่อซัพ → PATCH suppliers + PATCH products?sup=eq (ทุกสาขา): '
    +(!!supPatches.find(p=>p.url.includes('suppliers?name=eq.')&&p.body.name==='ซัพเปลี่ยนชื่อแล้ว')
      &&!!supPatches.find(p=>p.url.includes('products?sup=eq.')&&p.body.sup==='ซัพเปลี่ยนชื่อแล้ว')));
  await w.supDel('ซัพเปลี่ยนชื่อแล้ว'); await sleep(50);
  out.push('ลบซัพที่ไม่มีสินค้าใช้ → DELETE suppliers: '
    +(supDels.some(u=>u.includes('suppliers?name=eq.'))&&w.eval("!supSched('ซัพเปลี่ยนชื่อแล้ว')")));
  const before=supDels.length;
  await w.supDel('Smilemeat'); await sleep(40);
  out.push('ลบซัพที่ยังมีสินค้าใช้อยู่ไม่ได้ (ต้องย้ายของก่อน): '+(supDels.length===before));
  w.prompt=()=>'FarmFresh';
  await w.supMove('Smilemeat'); await sleep(50);
  out.push('ย้ายสินค้าทั้งหมดไปซัพอื่น → PATCH products?sup=eq.Smilemeat: '
    +(!!supPatches.find(p=>p.url.includes('products?sup=eq.')&&p.body.sup==='FarmFresh')
      &&w.eval("supCount('Smilemeat')")===0));
  // 7) กลุ่มไลน์ใหม่: เชิญบอท+พิมพ์ในกลุ่ม → กด 🔄 แล้วกลุ่มต้องโผล่ใน dropdown
  lineGroups=lineGroups.concat([{group_id:'C999',name:'JJ x ซัพใหม่',seen_at:'2026-09-17'},{group_id:'C7f5de7010abc',name:null,seen_at:'2026-09-17'}]);
  await w.syncLineGroups(); await sleep(60);
  w.gpOpen(0); await sleep(60);   // เปิดกล่องเลือกกลุ่มของซัพแถวแรก (ตัวเลือกแบบค้นหาได้)
  const items=()=>[...d.querySelectorAll('#list .gpitem')];
  out.push('ปุ่ม 🔄 เรียก Edge Function sync-line-groups แล้วโหลดกลุ่มใหม่เข้ามา: '
    +(syncs.length===1&&w.eval('S.lineGroups.length')===3
      &&items().some(o=>o.textContent.includes('JJ x ซัพใหม่'))));
  const opTxt=items().map(o=>o.textContent);
  out.push('รายการกลุ่มบอกสถานะ: กลุ่มที่ผูกแล้วบอกจำนวนซัพ · กลุ่มใหม่ขึ้น "ยังไม่ผูก": '
    +(opTxt.some(t=>t.includes('กลุ่มสั่งของ Smilemeat')&&t.includes('ผูกอยู่ 1 ซัพ'))
      &&opTxt.some(t=>t.includes('JJ x ซัพใหม่')&&t.includes('ยังไม่ผูก'))));
  const one=opTxt.filter(t=>t.includes('·'));
  out.push('เรียงชื่อกลุ่ม อังกฤษก่อนแล้วไทย + สรุปบอกจำนวนผูกแล้ว/ยังไม่ผูก: '
    +(one.length===3&&one[0].indexOf('JJ x ซัพใหม่')===0&&one.slice(1).every(t=>/^[\u0E00-\u0E7F]/.test(t))
      &&list().includes('ผูกอยู่แล้ว 1 กลุ่ม')&&list().includes('ยังไม่ได้ผูก 2 กลุ่ม')));
  // ช่องพิมพ์ค้นหากลุ่ม
  out.push('มีช่องพิมพ์ค้นหากลุ่มไลน์ในกล่องเลือก: '+!!d.getElementById('gpQ'));
  w.gpSearch('smile'); await sleep(30);
  out.push('พิมพ์ค้นหาแล้วเหลือเฉพาะกลุ่มที่ตรง: '
    +(items().length===1&&items()[0].textContent.includes('Smilemeat')));
  w.gpSearch('ไม่มีกลุ่มนี้'); await sleep(30);
  out.push('ค้นหาไม่เจอ ขึ้นว่าไม่พบ: '+(!items().length&&d.getElementById('gpList').textContent.includes('ไม่พบกลุ่ม')));
  w.gpSearch(''); await sleep(30);
  out.push('กลุ่มที่ไลน์ไม่ส่งชื่อมา แสดงเป็น "กลุ่ม C7f5de7010…" และตั้งชื่อเองได้: '
    +(items().map(o=>o.textContent).some(t=>t.includes('กลุ่ม C7f5de7010'))
      &&w.eval("lgLabel({group_id:'C7f5de7010abc',name:null})")==='กลุ่ม C7f5de7010…'));
  w.prompt=()=>'JJ x กลุ่มตั้งชื่อเอง';
  await w.lgRename('C7f5de7010abc'); await sleep(50);
  out.push('ตั้งชื่อกลุ่มเอง → PATCH line_groups.name (แอพเดิมเห็นด้วย): '
    +(!!supPatches.find(p=>p.url.includes('line_groups?group_id=eq.')&&p.body.name==='JJ x กลุ่มตั้งชื่อเอง')
      &&w.eval("lgLabel(S.lineGroups.find(g=>g.group_id==='C7f5de7010abc'))")==='JJ x กลุ่มตั้งชื่อเอง'));
  out.push('ซัพที่ยังไม่ผูกกลุ่มไลน์ ขึ้นกรอบแดงกระพริบ (.needlink) + ข้อความแดง: '
    +(!!d.querySelector('#list .gpbtn.needlink')&&list().includes('⚠ ยังไม่ผูกกลุ่มไลน์')
      &&d.querySelectorAll('#list .gpbtn.needlink').length===w.eval("(S._lineSups||[]).filter(sp=>supSched(sp)&&!(lineOf(sp)&&lineOf(sp).group_id)).length")));
  if(w.eval('S.gpOpen')!==0){ w.gpOpen(0); await sleep(60); }
  const red=[...d.querySelectorAll('#list .gpitem .gpu')].map(e=>e.textContent);
  const blue=[...d.querySelectorAll('#list .gpitem .gpf')].map(e=>e.textContent);
  out.push('สีแดงเฉพาะป้าย "· ผูกอยู่ N ซัพ" (ไม่ใช่ทั้งบรรทัด) และกลุ่มที่ไม่มีซัพผูกเลยเป็นสีน้ำเงิน: '
    +(red.length===1&&red[0].trim()==='· ผูกอยู่ 1 ซัพ'&&blue.length===2&&blue.every(t=>t.includes('ยังไม่ผูก'))
      &&html.includes('.gpu{color:var(--red)')&&html.includes('.gpf{color:#24466F')
      &&[...d.querySelectorAll('#list .gpitem .gpn')].every(e=>!(e.getAttribute('style')||'').includes('--red'))));
  w.gpPick(0,'Cabc111'); await sleep(120);   // เลือกกลุ่มจากรายการ = บันทึกเลย
  out.push('เลือกกลุ่มจากรายการ → บันทึกลง suppliers.line_group_id + ปิดกล่อง: '
    +(!!supPatches.find(p=>p.url.includes('suppliers?name=eq.')&&p.body.line_group_id==='Cabc111')
      &&w.eval('S.gpOpen')===null&&!d.getElementById('gpMenu')));
  // 8) ปุ่มส่งทั้งหมด: เลือกกลุ่มจริง / กลุ่มทดสอบ + ยืนยันก่อนส่ง
  await w.loadAll(); await sleep(150); // คืนสภาพข้อมูลจาก mock (ข้อก่อนหน้าย้าย/ลบซัพไปแล้ว)
  w.setTab('order'); await sleep(120);
  sent.length=0; receipts.length=0;
  w.sendAllOpen(); await sleep(40);
  const ov=()=>d.getElementById('ovlBox').textContent;
  out.push('กดส่งทั้งหมด → กล่องยืนยันเลือกปลายทาง (กลุ่มจริง/กลุ่มทดสอบ) + ติ๊กซัพได้: '
    +(d.getElementById('ovl').classList.contains('on')&&ov().includes('กลุ่มจริงของแต่ละซัพ')&&ov().includes('กลุ่มทดสอบ')
      &&d.querySelectorAll('#ovlBox .mrow').length===2&&ov().includes('ยืนยันส่ง')));
  out.push('ซัพที่ยังไม่ผูกกลุ่มขึ้นเตือนว่าจะถูกข้าม + ปุ่มยืนยันนับเฉพาะซัพที่ส่งได้: '
    +(ov().includes('ยังไม่ผูกกลุ่มไลน์ — จะข้ามซัพนี้')&&ov().includes('ยืนยันส่ง 1 ซัพ')));
  w.sendMode('test'); await sleep(40);
  d.getElementById('testGrp').value='C123';
  await w.sendAllGo(); await sleep(150);
  out.push('โหมดทดสอบ: ส่งทุกซัพเข้ากลุ่มทดสอบกลุ่มเดียว · ข้อความเหมือนของจริง (ไม่มีป้ายทดสอบ) · ไม่บันทึกยอดสั่ง: '
    +(sent.length===2&&sent.every(x=>x.to==='C123')&&sent.every(x=>!x.text.includes('ทดสอบ')&&x.text.indexOf('🛒 จริงใจหมูกระทะ')===0)
      &&receipts.length===0&&!d.getElementById('ovl').classList.contains('on')));
  sent.length=0; receipts.length=0;
  w.sendAllOpen(); await sleep(30); w.sendMode('real'); await sleep(30);
  await w.sendAllGo(); await sleep(150);
  out.push('โหมดจริง: ส่งเข้ากลุ่มของซัพเอง (ข้ามซัพที่ยังไม่ผูก) + บันทึกยอดสั่ง: '
    +(sent.length===1&&sent[0].to==='C123'&&!sent[0].text.includes('ทดสอบ')&&receipts.length===1));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
