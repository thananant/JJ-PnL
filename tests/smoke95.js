// smoke95: jjmk-stockcheck — เมนู ⚙️ ตั้งค่า แยกหน้าละหัวข้อ (👤 สิทธิ์ผู้ใช้ / 🗂 แผนก / 📐 หน่วยซื้อ↔หน่วยนับ แยกรายซัพ)
//          + จำหน้าเดิมและค่านับตอนรีเฟรช + แผนกใน Safety เป็น dropdown + ลากลงเพื่อรีเฟรช (มือถือ/แท็บเล็ต)
// fixture JJRD: p1 ผักบุ้ง (ผูก "ผักบุ้งจีน", dept ผัก, หน่วยนับ โล, หน่วยซื้อ ลัง ×12) · p2 น้ำแข็ง (ไม่ผูก, dept บาร์น้ำ, ถุง)
//          sc_depts สาขารัชดา: ผัก · บาร์น้ำ · เตรียมของ (แผนกเปล่า) — แผนก/ของในแผนก แยกกันคนละสาขา
// ตั้ง localStorage jjsc_tab='cfgu' ก่อนโหลด → ต้องเปิดมาที่หน้าสิทธิ์ผู้ใช้เลย
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[
  {id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true},
  {id:2,username:'boy',pass_hash:H('boy','1234'),display_name:'บอย',role:'staff',branches:['JJRD'],depts:['ผัก'],active:true}];
const posts=[],patches=[],dels=[];
let depts=[{id:1,branch_id:BID,name:'ผัก',zone:'หลังร้าน',sort:1},{id:2,branch_id:BID,name:'บาร์น้ำ',zone:'หน้าร้าน',sort:2},{id:3,branch_id:BID,name:'เตรียมของ',zone:null,sort:3}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    // ล็อกอินค้างไว้ + จำหน้าเดิม = ตั้งค่า
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','cfgu');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){const b=JSON.parse(opt.body);posts.push({url,rows:b});
        if(url.includes('sc_depts')){const r={id:99,...b};depts.push(r);return T([r]);}
        return T([]);}
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(method==='DELETE'){dels.push(url);const m2=url.match(/id=eq\.(\d+)/);if(m2)depts=depts.filter(x=>String(x.id)!==m2[1]);return T([]);}
      if(url.includes('sc_depts'))return T(depts.filter(x=>x.branch_id===BID));
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        if(um)return T(users.filter(x=>x.username===decodeURIComponent(um[1])));
        return T(users);
      }
      if(url.includes('pnl_stock_names'))return T([
        {id:11,branch:'JJRD',product_id:'p1',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:null,stock_unit:'โล',factor:12,active:true}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([
        {id:'p1',branch_id:BID,name:'ผักบุ้ง',unit:'โล',sup:'FarmFresh',dept:'ผัก',image_url:null},
        {id:'p1b',branch_id:'b19f0a17b448212',name:'ผักบุ้ง',unit:'โล',sup:'FarmFresh',dept:'ผักสดลาดพร้าว',image_url:null},
        {id:'p2',branch_id:BID,name:'น้ำแข็ง',unit:'ถุง',sup:'โรงน้ำแข็ง',dept:null,cat_label:'ของแห้งเดิม',image_url:null}]);
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'FarmFresh',safety:null,max:null,rate_wk:2,rate_fri:3,rate_we:4,dept:'ผัก',zone:'หลังร้าน',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'อื่นๆ',name:'น้ำแข็ง',unit:'ถุง',sup:'โรงน้ำแข็ง',safety:null,max:null,rate_wk:null,rate_fri:null,rate_we:null,dept:'บาร์น้ำ',zone:'หน้าร้าน',image_url:null,sort:2}]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_bill_items'))return T([
        {item:'ผักบุ้งจีน',unit:'ลัง',d:'2026-09-10',supplier_id:1},
        {item:'ผักบุ้งจีน',unit:'ลัง',d:'2026-09-05',supplier_id:1},
        {item:'ผักบุ้งจีน',unit:'ลัง',d:'2026-09-01',supplier_id:1},
        {item:'ผักบุ้งจีน',unit:'โล',d:'2026-08-20',supplier_id:2}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh'},{id:2,name:'ตลาดสด'}]);
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([{name:'FarmFresh',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_counts')&&method==='GET')return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.confirm=()=>true;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(350);
  const list=()=>d.getElementById('list').textContent;
  const cards=()=>[...d.querySelectorAll('#list .card')].map(x=>x.textContent).join('|'); // เนื้อการ์ด (ไม่รวมแถบเลือกหัวข้อ)
  // 1) จำหน้าเดิม: เปิดมาที่ ⚙️ ตั้งค่า › สิทธิ์ผู้ใช้ · เมนูย่อยแยก 3 หัวข้อ
  out.push('รีเฟรชแล้วกลับหน้าเดิม (ตั้งค่า › สิทธิ์ผู้ใช้): '
    +(w.eval('S.tab')==='cfgu'&&d.querySelector('#sideNav [data-t="cfgu"]').classList.contains('on')
      &&d.querySelector('#sideNav [data-t="cfg"]').classList.contains('on')&&d.getElementById('cfgSub').classList.contains('on')));
  out.push('เมนูย่อยตั้งค่า 3 หัวข้อแยกกัน: '
    +(['cfgu','cfgd','cfgn'].every(t=>!!d.querySelector('#sideNav [data-t="'+t+'"]'))
      &&d.querySelector('#sideNav [data-t="cfgd"]').textContent.includes('แผนก')
      &&d.querySelector('#sideNav [data-t="cfgn"]').textContent.includes('หน่วยซื้อ')));
  out.push('หน้าสิทธิ์ผู้ใช้มีเฉพาะหัวข้อตัวเอง (ไม่ปนแผนก/หน่วย): '
    +(cards().includes('สิทธิ์การใช้งานพนักงาน')&&!cards().includes('แผนก + ของที่ต้องนับ')&&!cards().includes('หน่วยซื้อ ↔ หน่วยนับ')));
  out.push('มีแถบเลือกหัวข้อในหน้า (สำหรับจอเล็ก) 4 ปุ่ม: '+(d.querySelectorAll('#list .subtabs .stb').length===4));
  out.push('เมนูข้าง: มีปุ่ม ⚙️ ตั้งค่า + 🚚 รอบสั่งซัพ: '
    +(!!d.querySelector('#sideNav [data-t="cfg"]')&&!!d.querySelector('#sideNav [data-t="sched"]')));
  // 2) สิทธิ์ผู้ใช้: เลือกระดับ ผู้จัดการ/พนักงานทั่วไป ได้ + เซฟ role
  const rsel=d.querySelector('select[data-uf="role"][data-id="2"]');
  out.push('มีช่องเลือกระดับ (ผู้จัดการ/พนักงานทั่วไป) และ boy = พนักงานทั่วไป: '
    +(!!rsel&&rsel.value==='staff'&&rsel.textContent.includes('ผู้จัดการ')&&!!d.getElementById('nuR')));
  rsel.value='admin';
  await w.userSave(2); await sleep(40);
  const pu=patches.find(p=>p.url.includes('sc_users?id=eq.2'));
  out.push('อัปเกรด boy → ผู้จัดการ: PATCH role=admin: '+(!!pu&&pu.body.role==='admin'));
  // 3) หน้า 🗂 แผนก (แยกหน้า, แยกสาขา): พับรายละเอียด + เพิ่ม/ลบ/แก้ชื่อ/ย้าย
  w.setTab('cfgd'); await sleep(30);
  out.push('หน้าแผนกแยกหน้า มีเฉพาะการ์ดแผนก + บอกว่าแยกสาขา: '
    +(cards().includes('แผนก + ของที่ต้องนับ')&&cards().includes('แยกกันคนละสาขา')
      &&!cards().includes('สิทธิ์การใช้งานพนักงาน')&&!cards().includes('หน่วยซื้อ ↔ หน่วยนับ')));
  out.push('แผนกเปล่า "เตรียมของ" จากตารางแผนกขึ้นด้วย (0 รายการ): '+(cards().includes('เตรียมของ')&&cards().includes('0 รายการ')));
  out.push('รายละเอียดพับไว้ตั้งต้น (ยังไม่เห็นชื่อสินค้า): '+(!cards().includes('ผักบุ้ง')&&cards().includes('▸')));
  w.toggleDept('ผัก'); await sleep(30);
  out.push('กดแผนก → ขยายเห็นรายการในแผนก: '+(cards().includes('ผักบุ้ง')&&cards().includes('▾')));
  // เพิ่มแผนกใหม่ → POST sc_depts รายสาขา + ขึ้นแถบแผนกหน้านับทันที
  d.getElementById('ndName').value='ของแห้ง';
  await w.addDept(); await sleep(40);
  const pnew=posts.find(p=>p.url.includes('sc_depts'));
  out.push('เพิ่มแผนก "ของแห้ง" → POST sc_depts ผูก branch_id สาขานี้: '
    +(!!pnew&&pnew.rows.name==='ของแห้ง'&&pnew.rows.branch_id==='b19f0a17b4472'));
  w.setTab('count'); await sleep(40);
  out.push('แผนกใหม่ขึ้นแถบแผนกหน้านับเลย (ยังไม่มีของ): '+d.getElementById('pills').textContent.includes('ของแห้ง'));
  w.setTab('cfgd'); await sleep(30);
  // ย้ายของข้ามแผนก = PATCH by id (สาขาเดียว ไม่กระทบอีกสาขา)
  await w.moveDept('p2','ของแห้ง'); await sleep(40);
  const pmv=patches.find(p=>p.url.includes('products?id=eq.p2')&&p.body.dept==='ของแห้ง');
  const pmvName=patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('น้ำแข็ง'))&&p.body.dept!==undefined);
  out.push('ย้ายน้ำแข็ง → "ของแห้ง" แบบแยกสาขา (PATCH by id ไม่ใช่ตามชื่อ): '
    +(!!pmv&&!pmvName&&w.eval("S.all.find(x=>x.id==='p2').dept")==='ของแห้ง'));
  // เปลี่ยนชื่อแผนก ผัก → ผักสด (เฉพาะสาขานี้ + ตารางแผนก)
  w.prompt=()=>'ผักสด';
  await w.renameDept('ผัก'); await sleep(40);
  const prn=patches.find(p=>p.url.includes('products?id=in.')&&p.url.includes('p1')&&p.body.dept==='ผักสด');
  out.push('เปลี่ยนชื่อแผนก ผัก → ผักสด เฉพาะของในแผนกของสาขานี้ + อัปเดต sc_depts: '
    +(!!prn&&!!patches.find(p=>p.url.includes('sc_depts?id=eq.1')&&p.body.name==='ผักสด')
      &&w.eval("S.all.find(x=>x.id==='p1').dept")==='ผักสด'));
  // ลบแผนก → ของย้ายไปยังไม่จัดแผนก + DELETE sc_depts + หายจากหน้านับ
  await w.delDept('ของแห้ง'); await sleep(40);
  out.push('ลบแผนก "ของแห้ง": ย้ายของออก (ล้าง dept+หมวดเดิม) + DELETE sc_depts: '
    +(!!patches.find(p=>p.url.includes('products?id=in.')&&p.body.dept===null&&p.body.cat_label===null)
      &&dels.some(u=>u.includes('sc_depts?id=eq.99'))));
  w.setTab('count'); await sleep(40);
  out.push('ลบแล้วแถบแผนกหน้านับหายตาม: '+!d.getElementById('pills').textContent.includes('ของแห้ง'));
  w.setTab('cfgd'); await sleep(30);
  // ตั้งโซนแผนก = รายสาขา
  await w.setZone('ผักสด','หน้าร้าน'); await sleep(40);
  out.push('ตั้งโซนแผนก → PATCH sc_depts + สินค้าในแผนกนั้น (แก้บั๊กโซนไม่ถูกบันทึก): '
    +(!!patches.find(p=>p.url.includes('sc_depts?id=eq.1')&&p.body.zone==='หน้าร้าน')
      &&!!patches.find(p=>p.url.includes('products?id=in.')&&p.body.zone==='หน้าร้าน'&&p.body.dept==='ผักสด')
      &&w.eval("S.all.find(x=>x.id==='p1').zone")==='หน้าร้าน'));
  // 3.5) หน้า 📦 รายการสินค้า: ทุกสาขา แยกแผนก + ค้นหา + ลบ
  w.setTab('items'); await sleep(150);
  out.push('เมนูหลัก 📦 รายการสินค้า อยู่ถัดจาก 🚚 รอบสั่งซัพ + โหลดสินค้าทุกสาขา: '
    +(d.querySelector('#sideNav [data-t="sched"]').nextElementSibling===d.querySelector('#sideNav [data-t="items"]')
      &&cards().includes('รายการสินค้าทั้งหมด')&&w.eval('S.allBr.length')===3));
  out.push('จัดกลุ่มตามแผนก (ใช้แผนกของสาขาที่เปิดอยู่) + มีช่องค้นหาด้านบน: '
    +(cards().includes('ผัก')&&!!d.getElementById('cfgQ')));
  out.push('ของที่ยังไม่ตั้ง dept ใช้หมวดเดิมจากแอพนับ ไม่ตกไป "ยังไม่จัดแผนก": '
    +(cards().includes('ของแห้งเดิม')&&cards().includes('หมวดเดิมจากแอพนับ')&&!cards().includes('ยังไม่จัดแผนก')));
  w.toggleItemGrp('ผัก'); await sleep(30);
  out.push('กางกลุ่ม → ผักบุ้งขึ้น 2 สาขา (รัชดา+ลาดพร้าว): '
    +(cards().includes('ผักบุ้ง')&&[...d.querySelectorAll('.brchip.on')].filter(x=>x.textContent.includes('รัชดา')||x.textContent.includes('ลาดพร้าว')).length>=2));
  w.cfgSearch('น้ำแข็ง'); await sleep(40);
  out.push('ค้นหา "น้ำแข็ง" → เจอและกางให้เอง + ไม่โชว์ผักบุ้ง: '+(cards().includes('น้ำแข็ง')&&!cards().includes('ผักบุ้ง')));
  out.push('น้ำแข็งมีสาขาเดียว (ลาดพร้าวขึ้นว่าไม่มี): '
    +[...d.querySelectorAll('.brchip')].some(x=>!x.classList.contains('on')&&x.textContent.includes('ลาดพร้าว')));
  // ลบเฉพาะสาขา
  await w.delProd('p2'); await sleep(40);
  const dl1=patches.find(p=>p.url.includes('products?id=eq.p2')&&p.body.deleted_at);
  out.push('กด ✕ ที่สาขา → soft delete เฉพาะสาขานั้น (deleted_at) + หายจากรายการ: '
    +(!!dl1&&!w.eval("(S.allBr||[]).some(x=>x.id==='p2')")));
  // เลิกใช้ทุกสาขา
  w.cfgSearch(''); await sleep(40);
  await w.delProdAll('ผักบุ้ง'); await sleep(40);
  const dl2=patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.deleted_at);
  out.push('ปุ่ม 🗑 เลิกใช้ → PATCH ตามชื่อ ทุกสาขาที่ยังไม่ถูกลบ: '
    +(!!dl2&&dl2.url.includes('deleted_at=is.null')&&!w.eval("(S.allBr||[]).some(x=>x.name==='ผักบุ้ง')")));
  await w.loadAll(); await sleep(80); // โหลดใหม่จาก mock (คืนสภาพก่อนเทสต์หัวข้อถัดไป)
  w.setTab('cfgd'); await sleep(40);
  // 4) หน้า 📐 หน่วยซื้อ↔หน่วยนับ (แยกหน้า): โชว์ "หน่วยซื้อ คือ ลัง" + "1 ลัง = 12 โล" · แก้ตัวคูณ → PATCH pnl_stock_map
  w.setTab('cfgn'); await sleep(30);
  out.push('หน้าหน่วยแยกหน้า มีเฉพาะการ์ดหน่วย: '
    +(cards().includes('หน่วยซื้อ ↔ หน่วยนับ')&&!cards().includes('สิทธิ์การใช้งานพนักงาน')&&!cards().includes('แผนก + ของที่ต้องนับ')));
  out.push('จำหัวข้อย่อยล่าสุด (jjsc_cfg=cfgn): '+(w.localStorage.getItem('jjsc_cfg')==='cfgn'));
  await sleep(150); // รอดึงหน่วยจากบิล + ซัพ + ตัวคูณ
  out.push('จัดกลุ่มตามซัพจากบิลจริง: FarmFresh (ลัง) · ตลาดสด (โล) — สินค้าตัวเดียวหลายซัพได้: '
    +(list().includes('FarmFresh')&&list().includes('ตลาดสด')
      &&!!w.eval("S.billSup['FarmFresh']['ผักบุ้งจีน']['ลัง'].n===3")
      &&!!w.eval("S.billSup['ตลาดสด']['ผักบุ้งจีน']['โล'].n===1")));
  out.push('ซัพพับไว้ตั้งต้น + บอกว่ายังไม่ใส่ตัวคูณ: '+(!list().includes('ผักบุ้ง ')&&list().includes('ยังไม่ใส่ตัวคูณ')&&list().includes('▸')));
  w.toggleSup('FarmFresh'); await sleep(40);
  const uRows=()=>JSON.parse(w.eval('JSON.stringify(S._uRows)'));
  const idxOf=u=>uRows().findIndex(r=>r.unit===u);
  const iLang=idxOf('ลัง');
  out.push('กางซัพ FarmFresh → เห็นแถวหน่วย ลัง (3 บิล) ของผักบุ้ง: '
    +(list().includes('ผักบุ้ง')&&list().includes('ลัง')&&list().includes('3 บิล')&&iLang>=0&&!!d.getElementById('fx_'+iLang)));
  // ใส่ตัวคูณ 1 ลัง = 12 โล → upsert pnl_unit_conv
  d.getElementById('fx_'+iLang).value='12';
  await w.convSave(iLang); await sleep(50);
  const pc=posts.find(p=>p.url.includes('pnl_unit_conv'));
  out.push('ใส่ตัวคูณ → upsert pnl_unit_conv (item,from_unit) 1 ลัง = 12 โล: '
    +(!!pc&&pc.url.includes('on_conflict=item,from_unit')&&pc.rows[0].item==='ผักบุ้งจีน'
      &&pc.rows[0].from_unit==='ลัง'&&pc.rows[0].to_unit==='โล'&&pc.rows[0].factor===12));
  out.push('ตั้งแล้วขึ้นสรุป 1 ลัง = 12 โล: '+list().includes('1 ลัง = 12 โล'));
  // ซัพตลาดสดลงหน่วย โล = หน่วยนับ → ไม่ต้องแปลง ช่องตัวคูณถูกปิด
  w.toggleSup('ตลาดสด'); await sleep(40);
  const kRow=idxOf('โล');
  out.push('ซัพที่ลงหน่วยเดียวกับหน่วยนับ (โล) → ไม่ต้องแปลง + ปิดช่องตัวคูณ: '
    +(kRow>=0&&!!d.getElementById('fx_'+kRow)&&d.getElementById('fx_'+kRow).disabled===true&&list().includes('ไม่ต้องแปลง')));
  // เปลี่ยนหน่วยนับจากหน้านี้ → PATCH products ตามชื่อ (2 สาขา) + สำเนาใน map
  const iLang2=idxOf('ลัง');
  d.getElementById('cu_'+iLang2).value='กก.';
  await w.convSave(iLang2); await sleep(50);
  out.push('เปลี่ยนหน่วยนับ โล→กก. → PATCH products ตามชื่อ (2 สาขา) + stock_unit ใน map: '
    +(!!patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.unit==='กก.')
      &&!!patches.find(p=>p.url.includes('pnl_stock_map?product_name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.stock_unit==='กก.')));
  out.push('น้ำแข็ง (ไม่มีในบิล) อยู่กลุ่ม "ยังไม่พบในบิล" ตั้งได้เฉพาะหน่วยนับ: '
    +(list().includes('ยังไม่พบในบิล')&&list().includes('ตั้งได้เฉพาะหน่วยนับ')));
  out.push('มี datalist หน่วย (เพิ่ม/พิมพ์หน่วยใหม่ได้): '+!!d.getElementById('unitList'));
  // 5) Safety: ช่องแผนกเป็น dropdown จากรายชื่อแผนกหน้าตั้งค่า
  w.setTab('set'); await sleep(30);
  const dsel=[...d.querySelectorAll('#list select')].find(s2=>s2.textContent.includes('– แผนก –'));
  out.push('Safety: แผนกเป็น dropdown ดึงรายชื่อจากหน้าตั้งค่า (ไม่ใช่ช่องพิมพ์): '
    +(!!dsel&&dsel.textContent.includes('ผัก')&&dsel.textContent.includes('เตรียมของ')&&!d.querySelector('#list input[list="deptList"]')));
  // 6) จำค่านับตอนรีเฟรช: นับแล้วไม่กดบันทึก → โหลดใหม่ ค่ายังอยู่
  w.setTab('count'); await sleep(30);
  out.push('setTab เก็บหน้าล่าสุดใน localStorage: '+(w.localStorage.getItem('jjsc_tab')==='count'));
  w.bump('p1',1); w.bump('p1',1); await sleep(20);
  const cd=d.getElementById('cd').value;
  const dkey='jjsc_draft_JJRD_'+cd;
  out.push('นับ 2 → ร่างถูกจำใน localStorage: '+(JSON.parse(w.localStorage.getItem(dkey)||'{}').p1||{}).q);
  await w.loadAll(); await sleep(60); // = รีเฟรช
  out.push('รีเฟรชแล้วค่านับยังอยู่ (2) + การ์ดโชว์นับแล้ว: '
    +(w.eval("S.all.find(x=>x.id==='p1').qty")===2&&list().includes('นับได้ 2')));
  // กดหมด → ร่างจำ out ด้วย
  w.setOut('p2'); await sleep(20);
  out.push('กดหมด → ร่างจำ out: '+((JSON.parse(w.localStorage.getItem(dkey)||'{}').p2||{}).o===1));
  // บันทึกจริง → ร่างเคลียร์
  await w.saveAll(); await sleep(60);
  out.push('บันทึกแล้วร่างถูกล้าง: '+(w.localStorage.getItem(dkey)===null));
  // 7) จำแผนกล่าสุด
  out.push('pickDept เก็บแผนกล่าสุด: '+(w.pickDept('บาร์น้ำ')===undefined&&w.localStorage.getItem('jjsc_dept')==='บาร์น้ำ'));
  // 8) ลากลงเพื่อรีเฟรช (จอสัมผัส): touchstart→move ยาว→end = โหลดใหม่
  let reloaded=false; const orig=w.loadAll; w.loadAll=async()=>{reloaded=true;return orig();};
  const te=(t,y)=>{const e=new w.Event(t,{bubbles:true});if(y!=null)e.touches=[{clientY:y}];else e.touches=[];d.dispatchEvent(e);};
  te('touchstart',30); te('touchmove',150); te('touchend'); await sleep(80);
  out.push('ลากลง >75px แล้วปล่อย → รีเฟรชข้อมูล + มีป้าย #ptr: '+(reloaded&&!!d.getElementById('ptr')));
  w.loadAll=orig;
  // ลากสั้น → ไม่รีเฟรช
  reloaded=false; te('touchstart',30); te('touchmove',60); te('touchend'); await sleep(40);
  out.push('ลากสั้น <75px ไม่รีเฟรช: '+(reloaded===false));
  // 9) พนักงานทั่วไป: เมนู ตั้งค่า/รอบสั่งซัพ ซ่อน + setTab โดนกัน
  w.eval("S.user={role:'staff',username:'boy',branches:['JJRD'],depts:['ผักสด']};applyAuth()");
  const hid=['set','sched','items','cfg','cfgu','cfgd','cfgn'].every(t=>{const b=d.querySelector('#sideNav [data-t="'+t+'"]');
    return b.style.display==='none'||d.getElementById('cfgBox').style.display==='none';});
  const hidBox=d.getElementById('cfgBox').style.display==='none';
  w.setTab('cfgu'); w.setTab('cfg');
  out.push('พนักงานทั่วไป: เมนูแอดมิน+กล่องตั้งค่าซ่อนครบ + เข้าตั้งค่าไม่ได้: '+(hid&&hidBox&&!w.eval('isCfgTab(S.tab)')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
