// smoke111: jjmk-stockcheck — หน้า 🛟 Safety: ตัวกรอง แผนก · ซัพ · ค้นหาชื่อ
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
  const sel=i=>d.querySelectorAll('#list .lrow select.zsel')[i];
  const names=()=>[...d.querySelectorAll('#list .card .row2 .nm .t')].map(x=>x.textContent.trim()).sort();
  const cardHeads=()=>[...d.querySelectorAll('#list .card .h')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  const cntTxt=()=>d.querySelector('#list .lrow div:last-child').textContent.replace(/\s+/g,' ').trim();
  out.push('มีแถบตัวกรอง: เลือกแผนก + เลือกซัพ + ช่องค้นหา + ตัวนับรายการ: '
    +(!!sel(0)&&!!sel(1)&&!!d.getElementById('setQ')&&cntTxt().includes('แสดง 7/7 รายการ')));
  const optTxt=s2=>[...s2.options].map(o=>o.textContent.trim());
  out.push('ตัวเลือกแผนกมีจำนวนกำกับ + ยังไม่จัดแผนกอยู่ท้ายสุด: '
    +(optTxt(sel(0))[0].includes('ทุกแผนก (7)')&&optTxt(sel(0)).some(t=>t.includes('ครัว (4)'))
      &&optTxt(sel(0)).slice(-1)[0].includes('ยังไม่จัดแผนก (1)')));
  out.push('ตัวเลือกซัพเรียงไทยก่อนอังกฤษ + (ไม่ระบุซัพ) ท้ายสุด: '
    +(optTxt(sel(1)).slice(1).join('|')==='🏷 ตลาดสด (2)|🏷 CPF (2)|🏷 FarmFresh (2)|🏷 (ไม่ระบุซัพ) (1)'));
  // กรองตามแผนก
  sel(0).value='ครัว'; sel(0).dispatchEvent(new w.Event('change')); await sleep(150);
  out.push('เลือกแผนกครัว → เหลือการ์ดเดียว 4 รายการ + ตัวนับบอก 4/7: '
    +(cardHeads().length===1&&cardHeads()[0].includes('ครัว')&&names().length===4&&cntTxt().includes('แสดง 4/7')));
  // กรองตามซัพ (ข้ามแผนก)
  sel(0).value=''; sel(0).dispatchEvent(new w.Event('change')); await sleep(120);
  sel(1).value='ตลาดสด'; sel(1).dispatchEvent(new w.Event('change')); await sleep(150);
  out.push('เลือกซัพตลาดสด → เห็นของซัพนี้ทุกแผนก (พริก/ครัว + น้ำแข็ง/บาร์น้ำ): '
    +(names().join()==='น้ำแข็ง,พริก'&&cardHeads().length===2&&cntTxt().includes('แสดง 2/7')));
  // แผนก + ซัพ พร้อมกัน
  sel(0).value='ครัว'; sel(0).dispatchEvent(new w.Event('change')); await sleep(150);
  out.push('ใส่ทั้งแผนกและซัพพร้อมกัน = ตัดกัน (ครัว + ตลาดสด = พริกตัวเดียว): '
    +(names().join()==='พริก'&&cntTxt().includes('แสดง 1/7')));
  // ค้นหาชื่อสินค้า / ชื่อบิล
  d.querySelector('#list .lrow .outb').click(); await sleep(150);   // ✕ ล้างตัวกรอง
  out.push('ปุ่มล้างตัวกรองคืนทุกรายการ + ช่องเลือกกลับเป็น "ทุกแผนก/ทุกซัพ": '
    +(names().length===7&&sel(0).value===''&&sel(1).value===''&&d.getElementById('setQ').value===''));
  const typ=async v=>{const e=d.getElementById('setQ');e.value=v;e.dispatchEvent(new w.Event('input'));await sleep(170);};
  await typ('ข้าว');
  out.push('ค้นหาชื่อสินค้า: '+(names().join()==='ข้าวสาร'&&cntTxt().includes('แสดง 1/7')));
  await typ('เบอร์ 2');
  out.push('ค้นหาด้วยชื่อบิลก็เจอ (ไข่ไก่ = บิล "ไข่ไก่เบอร์ 2"): '+(names().join()==='ไข่ไก่'));
  out.push('พิมพ์ค้นหาแล้วเคอร์เซอร์ยังอยู่ในช่อง (ไม่หลุดโฟกัส): '+(d.activeElement===d.getElementById('setQ')));
  await typ('ไม่มีของชื่อนี้');
  out.push('ไม่เจออะไรเลย → บอกให้กดล้างตัวกรอง: '
    +(!d.querySelector('#list .card')&&d.getElementById('list').textContent.includes('ล้างตัวกรอง')));
  await typ('');
  // แก้ค่าได้ตามปกติระหว่างกรองอยู่
  sel(1).value='CPF'; sel(1).dispatchEvent(new w.Event('change')); await sleep(150);
  const row=[...d.querySelectorAll('#list .row2')].find(x=>x.querySelector('.nm .t').textContent.trim()==='กุ้งขาว');
  const ri=row.querySelectorAll('input.ri');
  ri[0].value='15'; ri[0].dispatchEvent(new w.Event('change')); await sleep(150);
  out.push('แก้อัตราใช้ระหว่างเปิดตัวกรองได้ และตัวกรองไม่หลุด: '
    +(w.eval("(S.all.find(x=>x.id==='p2')||{}).dirty.rate_wk")===15
      &&sel(1).value==='CPF'&&names().join()==='กุ้งขาว,ไข่ไก่'));
  // สลับหน้าไปมา ตัวกรองยังอยู่
  w.setTab('count'); await sleep(120); w.setTab('set'); await sleep(200);
  out.push('ออกไปหน้าอื่นแล้วกลับมา ตัวกรองยังอยู่: '+(sel(1).value==='CPF'&&names().join()==='กุ้งขาว,ไข่ไก่'));
  // โหลดข้อมูลใหม่ = ล้างตัวกรอง (กันกรองค้างแล้วหน้าว่าง)
  await w.loadAll(); await sleep(250); w.setTab('set'); await sleep(200);
  out.push('โหลดข้อมูลใหม่/เปลี่ยนสาขา = ล้างตัวกรองให้เอง: '+(sel(0).value===''&&sel(1).value===''&&names().length===7));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
