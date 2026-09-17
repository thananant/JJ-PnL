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
const sent=[],receipts=[];
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','dash');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v}); // ของจริงมี json()
      if(url.includes('/functions/v1/line-order')){sent.push(JSON.parse(opt.body));return T({ok:true});}
      if(url.includes('stock_receipts')){receipts.push(JSON.parse(opt.body));return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([{group_id:'C123',name:'กลุ่มสั่งของ Smilemeat',seen_at:'2026-09-01'}]);
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
        {product_id:'p2',qty:8,out_of_stock:false,created_at:'2026-09-15T01:05:00Z'}]:[]); // วันอื่น = ยังไม่ได้นับ
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
  out.push('ผักบุ้ง: นับได้ 8 · วันพุธใช้ 8 → ไม่ต้องสั่ง (0): '+(r2.have===8&&r2.need===8&&r2.order===0));
  out.push('น้ำแข็ง: ยังไม่ได้นับ → order=null (ไม่เดาให้): '+(r3.have===null&&r3.order===null));
  out.push('สรุปรายซัพ: Smilemeat ต้องสั่ง 1 รายการ · FarmFresh 0: '+(sm.nOrder===1&&ff.nOrder===0));
  // 3) หน้าจอ
  out.push('หน้าสั่งของแยกการ์ดรายซัพ + บอกวันส่ง + ปุ่มคัดลอกใบสั่ง: '
    +(list().includes('Smilemeat')&&list().includes('FarmFresh')&&list().includes('ส่ง 2026-09-15')&&list().includes('คัดลอก')&&list().includes('ส่งเข้าไลน์')));
  out.push('ซัพที่ยังไม่ผูกกลุ่มในระบบเดิม ปุ่มบอกว่ายังไม่ผูก: '+w.eval("lineOf('FarmFresh')===null"));
  out.push('จับคู่ชื่อซัพทนตัวพิมพ์/ช่องว่างต่างกัน (products.sup "Smilemeat" ↔ suppliers "smilemeat "): '
    +(w.eval("!!supSched('Smilemeat')")&&w.eval("lineOf('Smilemeat').group_id")==='C123'));
  w.toggleOrd('FarmFresh'); await sleep(40); // ซัพที่ไม่ต้องสั่งพับไว้ตั้งต้น — กางดู
  out.push('แถวหมูสไลด์โชว์ 40 กก. + ≈ 4 ลัง · ผักบุ้งขึ้น "พอแล้ว" · น้ำแข็ง "ยังไม่นับ": '
    +(list().includes('40')&&list().includes('4 ลัง')&&list().includes('พอแล้ว')&&list().includes('ยังไม่นับ')));
  out.push('ข้อความใบสั่งรูปแบบเดียวกับแอพนับเดิม (🛒 ออเดอร์ / ซัพ / สาขา / • รายการ): '
    +(()=>{const t=w.orderText('Smilemeat');
      return t.includes('🛒 ออเดอร์')&&t.includes('🏷️ Smilemeat')&&t.includes('🏪 รัชดา')
        &&t.includes('ส่งวัน 2026-09-15')&&t.includes('• หมูสไลด์ — 4 ลัง')&&t.includes('= 40 กก.')&&t.includes('รวม 1 รายการ');})());
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
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
