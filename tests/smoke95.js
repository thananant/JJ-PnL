// smoke95: jjmk-stockcheck — เมนู ⚙️ ตั้งค่า (สิทธิ์ผู้ใช้แบบเลือกระดับ / แผนก / หน่วยซื้อ↔หน่วยนับ)
//          + จำหน้าเดิมและค่านับตอนรีเฟรช + แผนกใน Safety เป็น dropdown + ลากลงเพื่อรีเฟรช (มือถือ/แท็บเล็ต)
// fixture JJRD: p1 ผักบุ้ง (ผูก "ผักบุ้งจีน", dept ผัก, หน่วยนับ โล, หน่วยซื้อ ลัง ×12) · p2 น้ำแข็ง (ไม่ผูก, dept บาร์น้ำ, ถุง)
// ตั้ง localStorage jjsc_tab='cfg' ก่อนโหลด → ต้องเปิดมาที่หน้าตั้งค่าเลย
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
const posts=[],patches=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    // ล็อกอินค้างไว้ + จำหน้าเดิม = ตั้งค่า
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','cfg');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        if(um)return T(users.filter(x=>x.username===decodeURIComponent(um[1])));
        return T(users);
      }
      if(url.includes('pnl_stock_names'))return T([
        {id:11,branch:'JJRD',product_id:'p1',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง',bill_unit:'ลัง',stock_unit:'โล',factor:12,active:true}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'โล',sup:'FarmFresh',safety:null,max:null,rate_wk:2,rate_fri:3,rate_we:4,dept:'ผัก',zone:'หลังร้าน',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'อื่นๆ',name:'น้ำแข็ง',unit:'ถุง',sup:'โรงน้ำแข็ง',safety:null,max:null,rate_wk:null,rate_fri:null,rate_we:null,dept:'บาร์น้ำ',zone:'หน้าร้าน',image_url:null,sort:2}]);
      if(url.includes('products'))return T([]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('suppliers'))return T([{name:'FarmFresh',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_counts')&&method==='GET')return T([]);
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
  // 1) จำหน้าเดิม: เปิดมาที่ ⚙️ ตั้งค่า + ครบ 3 หัวข้อ
  out.push('รีเฟรชแล้วกลับหน้าเดิม (ตั้งค่า): '+(w.eval('S.tab')==='cfg'&&d.querySelector('#sideNav [data-t="cfg"]').classList.contains('on')));
  out.push('ตั้งค่ามี 3 หัวข้อ (สิทธิ์ผู้ใช้/แผนก/หน่วย): '
    +(list().includes('สิทธิ์การใช้งานพนักงาน')&&list().includes('แผนก + ของที่ต้องนับ')&&list().includes('หน่วยซื้อ ↔ หน่วยนับ')));
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
  // 3) แผนก: ย้ายไปแผนกใหม่ (prompt) → PATCH ตามชื่อ (2 สาขา)
  w.prompt=()=>'ของแห้ง';
  await w.moveDept('p2','__new'); await sleep(40);
  const pmv=patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('น้ำแข็ง'))&&p.body.dept==='ของแห้ง');
  out.push('ย้ายน้ำแข็ง → แผนกใหม่ "ของแห้ง" (PATCH ตามชื่อ + local): '
    +(!!pmv&&w.eval("S.all.find(x=>x.id==='p2').dept")==='ของแห้ง'));
  // เปลี่ยนชื่อแผนก ผัก → ผักสด
  w.prompt=()=>'ผักสด';
  await w.renameDept('ผัก'); await sleep(40);
  const prn=patches.find(p=>p.url.includes('products?dept=eq.'+encodeURIComponent('ผัก'))&&p.body.dept==='ผักสด');
  out.push('เปลี่ยนชื่อแผนก ผัก → ผักสด: '+(!!prn&&w.eval("S.all.find(x=>x.id==='p1').dept")==='ผักสด'));
  // เอาออกจากแผนก
  await w.moveDept('p2','__none'); await sleep(40);
  out.push('เอาน้ำแข็งออกจากแผนก → dept=null: '
    +(!!patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('น้ำแข็ง'))&&p.body.dept===null)));
  // 4) หน่วยซื้อ↔หน่วยนับ: โชว์ "หน่วยซื้อ คือ ลัง" + "1 ลัง = 12 โล" · แก้ตัวคูณ → PATCH pnl_stock_map
  out.push('บอกหน่วยซื้อ/หน่วยนับ + ตัวคูณ 1 ลัง = 12 โล: '
    +(list().includes('หน่วยซื้อ คือ')&&list().includes('ลัง')&&list().includes('1 ลัง = 12 โล')));
  out.push('ตัวไม่ผูก (น้ำแข็ง) ขึ้นว่ายังไม่ผูกชื่อบิล แก้หน่วยซื้อไม่ได้: '+list().includes('ยังไม่ผูกชื่อบิล'));
  d.getElementById('bu_p1').value='ลัง'; d.getElementById('fx_p1').value='24'; d.getElementById('cu_p1').value='โล';
  await w.unitSave('p1'); await sleep(40);
  const pfx=patches.find(p=>p.url.includes('pnl_stock_map?id=eq.11'));
  out.push('แก้ตัวคูณ 12→24 → PATCH pnl_stock_map ตัวเดียว (หน่วยนับไม่เปลี่ยนไม่ PATCH products): '
    +(!!pfx&&pfx.body.factor===24&&pfx.body.bill_unit==='ลัง'&&!patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.unit)));
  // เปลี่ยนหน่วยนับ โล → กก. → PATCH products ตามชื่อ + สำเนาใน map
  d.getElementById('cu_p1').value='กก.';
  await w.unitSave('p1'); await sleep(40);
  out.push('เปลี่ยนหน่วยนับ โล→กก. → PATCH products ตามชื่อ (2 สาขา) + stock_unit ใน map: '
    +(!!patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.unit==='กก.')
      &&!!patches.find(p=>p.url.includes('pnl_stock_map?product_name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.stock_unit==='กก.')));
  out.push('มี datalist หน่วย (เพิ่ม/พิมพ์หน่วยใหม่ได้): '+!!d.getElementById('unitList'));
  // 5) Safety: ช่องแผนกเป็น dropdown จากรายชื่อแผนกหน้าตั้งค่า
  w.setTab('set'); await sleep(30);
  const dsel=[...d.querySelectorAll('#list select')].find(s2=>s2.textContent.includes('– แผนก –'));
  out.push('Safety: แผนกเป็น dropdown มีตัวเลือกจากตั้งค่า (ผักสด): '
    +(!!dsel&&dsel.textContent.includes('ผักสด')&&!d.querySelector('#list input[list="deptList"]')));
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
  const hid=['set','sched','cfg'].every(t=>d.querySelector('#sideNav [data-t="'+t+'"]').style.display==='none');
  w.setTab('cfg');
  out.push('พนักงานทั่วไป: เมนูแอดมินซ่อนครบ + เข้า ตั้งค่า ไม่ได้: '+(hid&&w.eval('S.tab')!=='cfg'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
