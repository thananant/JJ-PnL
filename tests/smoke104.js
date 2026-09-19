// smoke104: jjmk-stockcheck — รวมหน่วยที่ชื่อต่างกันแต่ของเดียวกัน (โล / กก. / กก) โดยไม่ทำให้ระบบไหนเสีย
//   บิลเก่าไม่ถูกแก้ · ระบบนับถือว่าเป็นหน่วยเดียวกัน (alias) · ฝั่ง P&L ได้ตัวคูณ 1:1 อัตโนมัติ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472',BID2='b19f0a17b448212';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
let UNITS=[{id:1,name:'โล',kind:'count',sort:0,alias_of:null},{id:2,name:'กก.',kind:'both',sort:0,alias_of:null}];
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
        {id:1,product_id:'p1',pnl_item:'หมูสามชั้น',product_name:'หมูสามชั้น',bill_unit:'กก.',stock_unit:'โล',factor:1},
        {id:2,product_id:'p2',pnl_item:'หมูสันคอ',product_name:'หมูสันคอ',bill_unit:'กก.',stock_unit:'กก.',factor:1}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_bill_items'))return T([
        {item:'หมูสามชั้น',unit:'กก.',d:'2026-09-10',supplier_id:1},
        {item:'หมูสันคอ',unit:'กก.',d:'2026-09-11',supplier_id:1}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'หมูไทย'}]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([
        {id:'p1',branch_id:BID,name:'หมูสามชั้น',unit:'โล'},{id:'p2',branch_id:BID,name:'หมูสันคอ',unit:'กก.'},
        {id:'q1',branch_id:BID2,name:'หมูสามชั้น',unit:'โล'},{id:'q2',branch_id:BID2,name:'หมูสันคอ',unit:'กก.'}]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'ของสด',name:'หมูสามชั้น',unit:'โล',sup:'หมูไทย',dept:'ของสด',rate_wk:10,rate_fri:10,rate_we:10,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ของสด',name:'หมูสันคอ',unit:'กก.',sup:'หมูไทย',dept:'ของสด',rate_wk:8,rate_fri:8,rate_we:8,sort:2}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([{name:'หมูไทย',order_mode:'any',lead_days:1}]);
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
  await sleep(900);
  const txt=()=>d.getElementById('list').textContent;
  const names=()=>JSON.parse(w.eval('JSON.stringify(unitAll().map(u=>u.name))'));
  // ① ก่อนรวม: เป็นคนละหน่วย · สินค้าที่บิลเขียน กก. แต่หน่วยนับ โล ขึ้นว่ายังไม่ใส่ตัวคูณ
  out.push('ก่อนรวม: โล กับ กก. เป็นคนละหน่วย: '+(names().includes('โล')&&names().includes('กก.')));
  out.push('ก่อนรวม: หมูสามชั้น (บิล กก. · นับ โล) ขึ้นเตือนยังไม่ใส่ตัวคูณ: '+txt().includes('⚠ ยังไม่ใส่ตัวคูณ'));
  // ② รวม กก. → โล
  w.confirm=()=>true;
  const n0=reqs.length;
  await w.unitMerge('กก.','โล'); await sleep(250);
  const r=reqs.slice(n0), pat=(t,f)=>r.find(x=>x.method==='PATCH'&&x.url.includes(t)&&(!f||x.url.includes(f)));
  out.push('เปลี่ยนสินค้าที่ใช้ "กก." เป็น "โล" ทั้ง 2 สาขา (ไม่ระบุสาขา): '
    +(!!pat('products','unit=eq.')&&pat('products').body.unit==='โล'&&!pat('products').url.includes('branch_id')));
  out.push('จำว่า "กก." = ชื่อพ้องของ "โล" (sc_units.alias_of): '
    +!!r.find(x=>x.method==='PATCH'&&x.url.includes('sc_units')&&x.body&&x.body.alias_of==='โล'));
  const cv=r.find(x=>x.method==='POST'&&x.url.includes('pnl_unit_conv'));
  out.push('ฝั่ง P&L: ใส่ตัวคูณ 1 กก. = 1 โล ให้ทุกสินค้าที่บิลเขียน "กก." อัตโนมัติ: '
    +(!!cv&&cv.body.length===2&&cv.body.every(x=>x.from_unit==='กก.'&&x.to_unit==='โล'&&x.factor===1)
      &&cv.body.some(x=>x.item==='หมูสามชั้น')&&cv.body.some(x=>x.item==='หมูสันคอ')));
  out.push('บิลเก่าไม่ถูกแตะ (ไม่มีการเขียน pnl_bill_items): '+!r.some(x=>x.url.includes('pnl_bill_items')));
  // ③ หลังรวม: เหลือหน่วยเดียวในรายการ + โชว์ชื่อพ้อง + ไม่เตือนตัวคูณอีก
  out.push('รายการหน่วยเหลือ "โล" ตัวเดียว (กก. ไปอยู่ใต้ชื่อพ้อง): '
    +(names().includes('โล')&&!names().includes('กก.')&&txt().includes('🔗 ชื่อพ้อง:')));
  out.push('สินค้าทุกตัวใช้หน่วย "โล" แล้ว: '+(w.eval("S.all.every(x=>x.unit==='โล')")===true));
  w.toggleSup('หมูไทย'); await sleep(120);   // กางรายการของซัพเพื่อดูสถานะรายแถว
  out.push('ไม่ขึ้นเตือน "ยังไม่ใส่ตัวคูณ" อีก + แถวบอกว่าเป็นชื่อพ้อง: '
    +(!txt().includes('⚠ ยังไม่ใส่ตัวคูณ')&&txt().includes('ชื่อพ้องของ โล')));
  out.push('ระบบถือว่า กก. = โล (uSame) และ uMain คืนชื่อหลัก: '
    +(w.eval("uSame('กก.','โล')")===true&&w.eval("uMain('กก.')")==='โล'));
  // ④ ใบสั่งของยังคิดถูก (หน่วยนับ ไม่ต้องแปลงเป็นลัง/แพ็ค)
  w.setQ('p1','4'); await sleep(60);
  const plan=JSON.parse(w.eval('JSON.stringify(orderPlan().map(g=>g.rows.map(r=>({n:r.it.name,u:r.it.unit,bu:r.bu,f:r.factor,o:r.order,p:r.packs}))))'));
  const row=plan[0].find(x=>x.n==='หมูสามชั้น');
  out.push('ใบสั่ง: นับได้ 4 · ต้องใช้ 10 → สั่ง 6 โล (ไม่แปลงหน่วยซ้ำเพราะเป็นหน่วยเดียวกัน): '
    +(!!row&&row.o===6&&row.u==='โล'&&row.bu==='กก.'&&row.f===null&&row.p===null));
  // ⑤ แยกชื่อพ้องออกได้
  const n1=reqs.length;
  await w.unitUnmerge('กก.'); await sleep(120);
  out.push('แยก "กก." ออกจาก "โล" ได้ (alias_of=null) และกลับมาเป็นคนละหน่วย: '
    +(!!reqs.slice(n1).find(x=>x.method==='PATCH'&&x.url.includes('sc_units')&&x.body&&x.body.alias_of===null)
      &&w.eval("uSame('กก.','โล')")===false));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
