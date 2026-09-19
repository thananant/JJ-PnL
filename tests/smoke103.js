// smoke103: jjmk-stockcheck — 📏 คลังหน่วย ในหน้า ⚙️ ตั้งค่า › หน่วยซื้อ–หน่วยนับ
//   เห็นหน่วยทั้งหมด (จากตาราง sc_units + ที่ใช้จริงในข้อมูล/บิล) · เพิ่ม · แก้ชื่อ (เปลี่ยนให้ทุกที่) · ลบ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472',BID2='b19f0a17b448212';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const UNITS=[{id:1,name:'โล',kind:'count',sort:0},{id:2,name:'ถุง',kind:'count',sort:0},{id:3,name:'แพ็ค',kind:'both',sort:0}];
const reqs=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','cfgn');
    w.JJSC_NOPREWARM=1;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const body=opt&&opt.body?JSON.parse(opt.body):null;
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method!=='GET')reqs.push({method,url,body});
      if(url.includes('sc_units')){
        if(method==='POST')return T((body||[]).map((r,i)=>({id:90+i,...r})));
        if(method==='PATCH'||method==='DELETE')return T([]);
        return T(UNITS);
      }
      if(method!=='GET')return T([]);
      if(url.includes('sc_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}]);
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('line_groups'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:1,product_id:'p1',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:'ลัง',stock_unit:'โล',factor:12},
        {id:2,product_id:'p2',pnl_item:'หมูสามชั้น',product_name:'หมูสามชั้น',bill_unit:'กก.',stock_unit:'กก.',factor:1}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('pnl_unit_conv'))return T([{item:'ผักบุ้งจีน',from_unit:'ลัง',to_unit:'โล',factor:12}]);
      if(url.includes('pnl_bill_items'))return T([
        {item:'ผักบุ้งจีน',unit:'ลัง',d:'2026-09-10',supplier_id:1},
        {item:'ผักบุ้งจีน',unit:'ลัง',d:'2026-09-12',supplier_id:1},
        {item:'หมูสามชั้น',unit:'กก.',d:'2026-09-11',supplier_id:2}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สี่มุมเมือง'},{id:2,name:'หมูไทย'}]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([
        {id:'p1',branch_id:BID,name:'ผักบุ้ง',unit:'โล'},{id:'p2',branch_id:BID,name:'หมูสามชั้น',unit:'กก.'},
        {id:'q1',branch_id:BID2,name:'ผักบุ้ง',unit:'โล'},{id:'q2',branch_id:BID2,name:'หมูสามชั้น',unit:'กก.'}]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'สี่มุมเมือง',dept:'ผัก',zone:'หลังร้าน',sort:1},
        {id:'p2',branch_id:BID,cat_label:'ของสด',name:'หมูสามชั้น',unit:'กก.',sup:'หมูไทย',dept:'ของสด',zone:'หลังร้าน',sort:2}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([{name:'สี่มุมเมือง',order_mode:'any',lead_days:1},{name:'หมูไทย',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_counts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=()=>[...d.querySelectorAll('#list .card .lrow')].map(r=>r.textContent);
setTimeout(async()=>{
  const out=[];
  await sleep(900);
  const txt=()=>d.getElementById('list').textContent;
  // 1) เห็นหน่วยทั้งหมด + บอกว่าใช้ที่ไหน
  out.push('มีแผง "หน่วยทั้งหมดในระบบ" อยู่บนหน้าหน่วยซื้อ–หน่วยนับ: '
    +(txt().includes('📏 หน่วยทั้งหมดในระบบ')&&txt().indexOf('📏 หน่วยทั้งหมด')<txt().indexOf('📐 หน่วยซื้อ ↔ หน่วยนับ')));
  const list=w.eval('JSON.stringify(unitAll())'), UA=JSON.parse(list);
  const byName={}; UA.forEach(u=>byName[u.name]=u);
  out.push('รวมหน่วยครบทั้งจากรายการ จากสินค้า และจากบิล (โล/กก./ถุง/แพ็ค/ลัง): '
    +(['โล','กก.','ถุง','แพ็ค','ลัง'].every(n=>byName[n])));
  out.push('บอกจำนวนที่ใช้: โล = หน่วยนับ 2 รายการ (2 สาขา) · ลัง = พบในบิล 2 ครั้ง + ตัวคูณ: '
    +(byName['โล'].cnt===2&&byName['ลัง'].bill===2&&byName['ลัง'].conv===1&&byName['ลัง'].cnt===0));
  out.push('หน่วยที่ยังไม่อยู่ในรายการ (กก./ลัง) ขึ้นป้ายเตือน + ปุ่มเพิ่มเข้ารายการ: '
    +(!byName['กก.'].row&&!byName['ลัง'].row&&txt().includes('ยังไม่อยู่ในรายการ')&&txt().includes('เพิ่มเข้ารายการ')));
  out.push('ช่องค้นหาหน่วย + ช่องเพิ่มหน่วยใหม่ + ปุ่มเพิ่ม: '
    +(!!d.getElementById('uQ')&&!!d.getElementById('uNew')&&txt().includes('➕ เพิ่มหน่วย')));
  // 2) เพิ่มหน่วยใหม่
  d.getElementById('uNew').value='ขวด';
  await w.unitAdd(); await sleep(120);
  const add=reqs.find(r=>r.method==='POST'&&r.url.includes('sc_units'));
  out.push('เพิ่มหน่วยใหม่ "ขวด" → เขียนลง sc_units + ขึ้นในรายการทันที: '
    +(!!add&&add.body[0].name==='ขวด'&&txt().includes('ขวด')));
  // 3) แก้ชื่อหน่วย = เปลี่ยนให้ทุกที่ (สินค้า 2 สาขา + ชื่อที่ผูก P&L + ตัวคูณ + รายการ)
  w.prompt=()=>'กิโล';
  const n0=reqs.length;
  await w.unitRename('กก.'); await sleep(200);
  const r2=reqs.slice(n0);
  const pat=(t,f)=>r2.find(r=>r.method==='PATCH'&&r.url.includes(t)&&(!f||r.url.includes(f)));
  out.push('แก้ "กก." → "กิโล": PATCH products ทั้ง 2 สาขา (ตามชื่อหน่วย ไม่ระบุสาขา): '
    +(!!pat('products','unit=eq.')&&pat('products').body.unit==='กิโล'&&!pat('products').url.includes('branch_id')));
  out.push('แก้ชื่อแล้วแก้ที่ผูกกับ P&L (pnl_stock_map.stock_unit) ด้วย: '
    +(!!pat('pnl_stock_map')&&pat('pnl_stock_map').body.stock_unit==='กิโล'));
  out.push('หน่วยที่ยังไม่อยู่ในรายการ พอแก้ชื่อแล้วถูกเพิ่มเข้ารายการให้เลย: '
    +!!r2.find(r=>r.method==='POST'&&r.url.includes('sc_units')&&r.body[0].name==='กิโล'));
  out.push('หน้าจอเปลี่ยนตามทันที (สินค้าใช้หน่วย กิโล แล้ว ไม่มีสินค้าที่ใช้ กก.): '
    +(w.eval("S.all.filter(x=>x.unit==='กิโล').length")===1
      &&w.eval("JSON.stringify(unitAll().find(u=>u.name==='กก.'))").includes('"cnt":0')));
  out.push('หน่วยเดิมยังอยู่ในบิล → ใส่ตัวคูณ 1 กก. = 1 กิโล ให้อัตโนมัติ (ใบสั่งไม่พัง): '
    +!!r2.find(r=>r.method==='POST'&&r.url.includes('pnl_unit_conv')
      &&r.body.some(x=>x.item==='หมูสามชั้น'&&x.from_unit==='กก.'&&x.to_unit==='กิโล'&&x.factor===1)));
  out.push('บิลเก่าไม่ถูกแก้ (ไม่มี PATCH pnl_bill_items): '+!r2.some(r=>r.url.includes('pnl_bill_items')&&r.method!=='GET'));
  // 4) ลบ: หน่วยที่ยังใช้อยู่ห้ามลบ · หน่วยที่ไม่ได้ใช้ลบได้
  w.confirm=()=>true;
  const n1=reqs.length;
  await w.unitDel('โล'); await sleep(80);
  out.push('ลบหน่วยที่ยังมีสินค้าใช้อยู่ไม่ได้ + บอกเหตุผล: '
    +(!reqs.slice(n1).some(r=>r.method==='DELETE')&&d.getElementById('toast').textContent.includes('ยังใช้เป็นหน่วยนับอยู่')));
  await w.unitDel('ถุง'); await sleep(120);
  const del=reqs.find(r=>r.method==='DELETE'&&r.url.includes('sc_units'));
  out.push('ลบหน่วยที่ไม่มีใครใช้ได้ (ถุง) → DELETE sc_units + หายจากรายการ: '
    +(!!del&&del.url.includes('id=eq.2')&&!w.eval("JSON.stringify(S.units)").includes('ถุง')));
  // 5) datalist หน่วยนับในตารางด้านล่าง ใช้รายชื่อเดียวกัน
  const dl=[...d.querySelectorAll('#unitList option')].map(o=>o.value);
  out.push('ช่องเลือกหน่วยนับในตารางด้านล่าง ใช้รายชื่อหน่วยชุดเดียวกัน: '
    +(dl.includes('กิโล')&&dl.includes('ขวด')&&dl.includes('ลัง')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
