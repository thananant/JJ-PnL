// smoke94: jjmk-stockcheck v3 — นับ (แถบแผนก+การ์ด+stepper) / ผูกชื่อ / Safety (+เมนู รอบสั่งซัพ/ตั้งค่า แยก — เทสต์ละเอียดใน smoke95)
// fixture JJRD: p1 หมูสามชั้น (ผูก "สามชั้น", dept ครัว) · p2 ผักบุ้ง (ผูก, dept บาร์น้ำ) · p3 น้ำแข็ง (ไม่ผูก)
// นับ: เลือกแผนกครัว เห็นเฉพาะหมู · stepper + 2 ครั้ง = 2 · pill ครัวขึ้น ✓ · ค้นหาข้ามแผนก
// ผูกชื่อ: น้ำแข็งอยู่กลุ่ม ⚠ ยังไม่ผูก · สรุป 2/3 · Safety: แก้ rate_wk → PATCH id / dept → PATCH name
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const crypto=require('crypto');
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[
  {id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true},
  {id:2,username:'boy',pass_hash:H('boy','1234'),display_name:'บอย',role:'staff',branches:['JJRD'],depts:['ครัว'],active:true}];
const posts=[],patches=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
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
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสามชั้น',unit:'กก.',sup:'Smilemeat',safety:4,max:8,rate_wk:2,rate_fri:3,rate_we:4,dept:'ครัว',zone:'หลังร้าน',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',safety:2,max:4,rate_wk:null,rate_fri:null,rate_we:null,dept:'บาร์น้ำ',zone:'หน้าร้าน',image_url:null,sort:2},
        {id:'p3',branch_id:BID,cat_label:'อื่นๆ',name:'น้ำแข็ง',unit:'ถุง',sup:'',safety:null,max:null,rate_wk:null,rate_fri:null,rate_we:null,dept:null,zone:null,image_url:null,sort:3}]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:1,product_id:'p1',pnl_item:'สามชั้น',product_name:'หมูสามชั้น'},
        {id:2,product_id:'p2',pnl_item:'ผักบุ้ง',product_name:'ผักบุ้ง'},
        {id:3,product_id:'none:xx',pnl_item:'x',product_name:''},
        {id:4,product_id:'p9',pnl_item:'สามชั้น',product_name:'หมูสามชั้นสไลด์'},
        {id:5,product_id:'p2b',pnl_item:'ผักบุ้งจีน',product_name:'ผักบุ้ง'}]);
      if(url.includes('stock_current'))return T([{product_id:'p1',qty:5,updated_at:'2026-09-16T20:00:00Z'}]);
      if(url.includes('suppliers'))return T([
        {name:'FarmFresh',order_mode:'fixed',schedule:{mon:'tue',thu:'fri'},lead_days:1},
        {name:'Smilemeat',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_counts')&&method==='GET')return T([{product_id:'p1',qty:7,out_of_stock:false,created_at:'2026-09-17T10:00:00Z'}]);
      return T([]);
    };
    w.TextEncoder=TextEncoder; // jsdom ไม่มีใน window — sha256hex ต้องใช้
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  // 0) ต้องล็อกอินก่อน · วันที่/สาขา/ผู้นับย้ายไปแถบข้าง (จอกว้าง)
  out.push('ขึ้นหน้า login ก่อนเข้า: '+d.getElementById('loginOv').classList.contains('on'));
  out.push('กล่องวันที่/สาขาอยู่ใน sidebar ใต้โลโก้: '+(d.querySelector('#scSlot #ctl')!==null));
  d.getElementById('lgU').value='admin'; d.getElementById('lgP').value='jjmk1234';
  await w.doLogin(); await sleep(300);
  out.push('login แอดมินผ่าน + ผู้นับล็อกเป็น username: '+(!d.getElementById('loginOv').classList.contains('on')&&d.getElementById('who').value==='admin'&&d.getElementById('who').readOnly===true));
  d.getElementById('cd').value='2026-09-17';
  const list=()=>d.getElementById('list').textContent;
  // 0.5) เปิดมาเจอแดชบอร์ดก่อน (เมนูบนสุด) แล้วค่อยไปหน้านับ
  out.push('เปิดแอพมาที่ 📊 แดชบอร์ด (เมนูบนสุด) + มีกล่องสรุปนับแล้ว/ยังไม่นับ/ของหมด: '
    +(w.eval("S.tab")==='dash'&&d.querySelector('#sideNav [data-t]').dataset.t==='dash'
      &&d.querySelectorAll('#list .dtile').length===4&&list().includes('นับแล้ววันนี้')&&list().includes('ของหมดสต๊อก')));
  w.setTab('count'); await sleep(60);
  const pills=()=>d.getElementById('pills').textContent;
  // 1) แถบแผนก + การ์ดเฉพาะแผนกแรก
  out.push('pills 2 แผนก (ครัว/บาร์น้ำ): '+(pills().includes('ครัว')&&pills().includes('บาร์น้ำ')));
  // ของที่ยังไม่ตั้ง dept ยังอยู่หมวดเดิมของแอพนับ (ไม่ถูกดันไปกองรวม)
  out.push('ของยังไม่ผูกไม่ถูกซ่อน: มี pill หมวดเดิม (อื่นๆ) + โน้ตนับได้ปกติ: '
    +(pills().includes('อื่นๆ')&&pills().includes('ยังไม่จัดโซน')&&list().includes('ยังนับได้ปกติ')));
  w.pickDept('อื่นๆ'); await sleep(30);
  out.push('การ์ดน้ำแข็งขึ้นหน้านับ + ป้าย ⚠ ยังไม่ผูกชื่อบิล: '+(list().includes('น้ำแข็ง')&&list().includes('ยังไม่ผูกชื่อบิล')));
  w.pickDept('ครัว'); await sleep(30);
  out.push('พื้นที่แบ่งโซน หน้าร้าน/หลังร้าน: '+(pills().includes('หน้าร้าน')&&pills().includes('หลังร้าน')));
  out.push('โลโก้ขึ้นทั้ง sidebar และหัว: '+(String(d.getElementById('scLogo').src).startsWith('data:image/png')&&String(d.getElementById('hdLogo').src).startsWith('data:image/png')));
  out.push('แผนกแรกเลือกอยู่ เห็นหมูตัวเดียว: '+(list().includes('สามชั้น')&&!list().includes('ผักบุ้ง')));
  out.push('การ์ด: prefill ยอดนับวันนี้ 7 (✓ นับแล้ว) + ชื่อนับหลัก + บิลสีฟ้า + ครั้งก่อน 5: '
    +(list().includes('นับได้ 7')&&list().includes('✓ นับแล้ว')&&list().includes('หมูสามชั้น')&&list().includes('บิล: สามชั้น')&&list().includes('ครั้งก่อน 5')));
  // เปลี่ยนวันเป็น 17 ก.ย. (พฤ) → แบนเนอร์รอบสั่ง: FarmFresh พฤ→ศ · Smilemeat สั่งได้ทุกวัน
  d.getElementById('cd').dispatchEvent(new w.Event('change')); await sleep(250);
  // แบนเนอร์รอบสั่ง: ย่อเป็นสรุปสั้น (ไม่ยัดชื่อซัพทั้งหมด) กด "ดูรายชื่อ" ถึงจะกาง
  out.push('แบนเนอร์ 🚚 สรุปสั้น: ถึงรอบสั่ง 1 ซัพ · สั่งได้ทุกวันอีก 1 ซัพ + ยังไม่โชว์ชื่อซัพ: '
    +(list().includes('รอบสั่งวันนี้ (พฤหัสบดี)')&&list().includes('ถึงรอบสั่ง')&&list().includes('สั่งได้ทุกวันอีก 1 ซัพ')
      &&!d.querySelector('#list .obchip')));
  w.obToggle(); await sleep(40);
  out.push('กดดูรายชื่อ → ชิปซัพ FarmFresh → ส่งศ. · Smilemeat → พรุ่งนี้ (กดไปหน้าสั่งของได้): '
    +(d.querySelectorAll('#list .obchip').length===2
      &&list().includes('FarmFresh')&&list().includes('ศุกร์')&&list().includes('Smilemeat')&&list().includes('พรุ่งนี้')));
  w.obToggle(); await sleep(30);
  // 2) stepper: + สองครั้ง = 2 · pill ✓
  w.bump('p1',1); w.bump('p1',1); await sleep(30);
  out.push('กด + สองครั้ง 7→9: '+(list().includes('นับได้ 9')));
  out.push('pill ครัวครบ → มี ✓ และไม่กระพริบแล้ว: '
    +(!!d.querySelector('#pills .pill .ok')&&!d.querySelector('#pills .pill.on.needc')));
  out.push('แผนกที่ยังนับไม่ครบ pill กระพริบแดง (.needc) + การ์ดที่ยังไม่นับกระพริบด้วย: '
    +(d.querySelectorAll('#pills .pill.needc').length>0
      &&(w.pickDept('อื่นๆ'),d.querySelectorAll('#list .pcard.needc').length===1
         &&d.querySelectorAll('#list .pcard.done').length===0)));
  w.pickDept('ครัว');
  // 3) ค้นหาข้ามแผนก
  d.getElementById('q').value='ผักบุ้ง'; d.getElementById('q').dispatchEvent(new w.Event('input')); await sleep(30);
  out.push('ค้นหาเจอผักบุ้งข้ามแผนก: '+(list().includes('ผักบุ้ง')&&list().includes('ผลค้นหา')));
  w.pickDept('ครัว'); await sleep(30);
  // 4) เปลี่ยนแผนก → เห็นผักบุ้ง
  w.pickDept('บาร์น้ำ'); await sleep(30);
  out.push('สลับแผนกบาร์น้ำ เห็นผักบุ้ง: '+(list().includes('ผักบุ้ง')&&!list().includes('สามชั้น')));
  // 5) กดหมด + บันทึก → stock_counts ใช้แผนกเป็น cat_label
  w.setOut('p2');
  await w.saveAll(); await sleep(60);
  const hist=posts.find(p=>p.url.includes('stock_counts'));
  const h1=hist&&hist.rows.find(r=>r.product_id==='p1'),h2=hist&&hist.rows.find(r=>r.product_id==='p2');
  out.push('บันทึก 2 แถว (เฉพาะที่เปลี่ยนจากที่เซฟแล้ว): หมู qty 9 cat=ครัว · ผักบุ้ง out_of_stock cat=บาร์น้ำ: '
    +(!!h1&&h1.qty===9&&h1.cat_label==='ครัว'&&!!h2&&h2.out_of_stock===true&&h2.cat_label==='บาร์น้ำ'&&h1.count_date==='2026-09-17'&&h1.counter==='admin'));
  out.push('stock_current upsert: '+!!posts.find(p=>p.url.includes('on_conflict=branch_id,product_id')));
  // 6) หน้าผูกชื่อ: แยกกลุ่ม + สรุป
  w.setTab('link'); await sleep(30);
  out.push('เตือนชื่อบิลเดียวกันชื่อนับต่าง: สามชั้น → หมูสามชั้น ≠ หมูสามชั้นสไลด์: '
    +(list().includes('ชื่อนับไม่ตรงกัน')&&list().includes('หมูสามชั้นสไลด์')));
  out.push('เตือนชื่อนับเดียวกันชื่อบิลต่าง: ผักบุ้ง → ผักบุ้ง ≠ ผักบุ้งจีน: '
    +(list().includes('ชื่อบิลไม่ตรงกัน')&&list().includes('ผักบุ้งจีน')));
  out.push('ผูกชื่อ: สรุปผูกแล้ว 2/3 + น้ำแข็งกลุ่มยังไม่ผูก: '
    +(list().includes('ผูกแล้ว 2')&&list().includes('ทั้งหมด 3')&&list().includes('น้ำแข็ง')&&list().includes('ยังไม่ผูก')));
  // แก้ชื่อนับ inline: ผักบุ้ง → ผักบุ้งไทย (products ตามชื่อ + pnl_stock_map ตามสำเนาชื่อ)
  w.editCn('p2'); await sleep(30);
  d.getElementById('cni_p2').value='ผักบุ้งไทย';
  await w.saveCn('p2'); await sleep(40);
  const pn=patches.find(p=>p.url.includes('products?name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.name==='ผักบุ้งไทย');
  const pm=patches.find(p=>p.url.includes('pnl_stock_map?product_name=eq.'+encodeURIComponent('ผักบุ้ง'))&&p.body.product_name==='ผักบุ้งไทย');
  out.push('แก้ชื่อนับ inline → PATCH products (2 สาขา) + pnl_stock_map: '+(!!pn&&!!pm&&list().includes('ผักบุ้งไทย')));
  out.push('แถบข้าง 7 เมนูหลัก (แดชบอร์ด/นับ/สั่งของ/ผูกชื่อ/Safety/รอบสั่งซัพ/รายการสินค้า) + 3 เมนูย่อยตั้งค่า: '
    +(d.querySelectorAll('#sideNav [data-t]').length===12&&d.querySelector('#sideNav [data-t="link"]').classList.contains('on')
      &&!!d.querySelector('#sideNav [data-t="order"]')));
  out.push('แถบแผนกซ่อนในหน้าผูกชื่อ: '+(d.getElementById('deptbar').style.display==='none'));
  out.push('ปุ่มบันทึกซ่อน: '+(d.getElementById('save').style.display==='none'));
  // 7) หน้า Safety: แก้อัตรา + แผนก
  w.setTab('set'); await sleep(30);
  out.push('Safety: มีหัว จ–พฤ/ศ/ส–อา + ค่าเดิม 2: '+(list().includes('จ–พฤ')&&[...d.querySelectorAll('.ri')].some(i=>i.value==='2')));
  w.setF('p1','rate_wk',2.5); w.setF('p1','dept','หน้าเตา'); await sleep(30);
  await w.saveAll(); await sleep(60);
  const pr=patches.find(p=>p.url.includes('id=eq.p1'));
  const pdName=patches.find(p=>p.url.includes('name=eq.'+encodeURIComponent('หมูสามชั้น'))&&p.body.dept!==undefined);
  out.push('PATCH by id: อัตรา 2.5 + แผนกหน้าเตา (แผนกแยกสาขา ไม่ PATCH ตามชื่อ): '
    +(!!pr&&pr.body.rate_wk===2.5&&pr.body.dept==='หน้าเตา'&&!pdName));
  // 8) รูปตามชื่อ + วันตัดตี 6
  await w.setImgUrl('หมูสามชั้น','https://x.test/img.jpg');
  await w.setZone('หน้าเตา','หน้าร้าน'); await sleep(30); // p1 ถูกย้ายไปแผนกหน้าเตาแล้วจากขั้นก่อน
  const pz=patches.find(p=>p.url.includes('products?id=in.')&&p.body.zone==='หน้าร้าน');
  out.push('setZone → PATCH เฉพาะ zone ของสินค้าในแผนกนั้น (ไม่ไปแตะ dept/หมวดเดิม) + local: '
    +(!!pz&&pz.body.dept===undefined&&pz.body.cat_label===undefined&&w.eval("S.all.find(x=>x.id==='p1').zone")==='หน้าร้าน'));
  out.push('setImgUrl PATCH name=eq + local: '+(!!patches.find(p=>p.body.image_url)&&w.eval("S.all.find(x=>x.id==='p1').image_url")==='https://x.test/img.jpg'));
  out.push('bizToday ตี 2 → เมื่อวาน · dayGrp พฤ/ศ/ส = 0/1/2: '
    +(w.bizToday(new Date(2026,8,17,2,0))==='2026-09-16'&&w.dayGrp('2026-09-17')===0&&w.dayGrp('2026-09-18')===1&&w.dayGrp('2026-09-19')===2));
  // 9) เมนู 🚚 รอบสั่งซัพ (แยกจาก Safety แล้ว) · เมนู ⚙️ ตั้งค่า มีการ์ดผู้ใช้
  out.push('Safety ไม่มีการ์ดรอบสั่ง/ผู้ใช้แล้ว (แยกเมนู): '+(!list().includes('รอบสั่ง–ส่งของซัพ')&&!list().includes('สิทธิ์การใช้งานพนักงาน')));
  w.setTab('sched'); await sleep(30);
  out.push('หน้ารอบสั่งซัพ: การ์ดซัพ + ช่องวันสั่งแบบการ์ดรายวัน (ชื่อวันเต็ม): '+(list().includes('รอบสั่ง–ส่งของซัพ')&&list().includes('FarmFresh')&&list().includes('สั่งจันทร์')&&list().includes('ไม่สั่ง')));
  const si=w.eval("S.supList.indexOf('Smilemeat')");
  w.supSetLead(si,2); await w.supSave(si); await sleep(40);
  const ps=patches.find(p=>p.url.includes('suppliers?name=eq.Smilemeat'));
  out.push('ตั้ง Smilemeat ส่งหลังสั่ง 2 วัน → PATCH suppliers: '+(!!ps&&ps.body.lead_days===2&&ps.body.order_mode==='any'));
  w.setTab('cfg'); await sleep(30);
  out.push('หน้าตั้งค่า: การ์ดสิทธิ์ผู้ใช้ เห็น admin+boy: '+(list().includes('สิทธิ์การใช้งานพนักงาน')&&list().includes('boy')));
  await w.userSave(2); await sleep(30);
  const pu=patches.find(p=>p.url.includes('sc_users?id=eq.2'));
  out.push('userSave boy → PATCH branches JJRD + depts ครัว: '+(!!pu&&JSON.stringify(pu.body.branches)==='["JJRD"]'&&JSON.stringify(pu.body.depts)==='["ครัว"]'&&pu.body.active===true));
  // 10) พนักงาน boy: เห็นเฉพาะรัชดา + นับได้เฉพาะแผนกครัว + เข้า Safety ไม่ได้
  w.logout(); await sleep(30);
  out.push('ออกแล้วเด้ง login: '+d.getElementById('loginOv').classList.contains('on'));
  d.getElementById('lgU').value='boy'; d.getElementById('lgP').value='1234';
  await w.doLogin(); await sleep(300);
  out.push('boy: ปุ่มสาขามีแค่รัชดา: '+(d.querySelectorAll('#brSeg button').length===1&&d.querySelector('#brSeg button').textContent==='รัชดา'));
  w.setTab('count'); await sleep(50);
  out.push('boy: pills มีครัว ไม่มีบาร์น้ำ: '+(pills().includes('ครัว')&&!pills().includes('บาร์น้ำ')));
  out.push('boy: เมนู Safety ซ่อน + setTab(set) โดนกัน: '+(d.querySelector('#sideNav [data-t="set"]').style.display==='none'&&(w.setTab('set'),w.eval('S.tab')!=='set')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
