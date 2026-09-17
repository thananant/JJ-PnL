// smoke94: jjmk-stockcheck v3 — 3 หน้า: นับ (แถบแผนก+การ์ด+stepper) / ผูกชื่อ / Safety
// fixture JJRD: p1 หมูสามชั้น (ผูก "สามชั้น", dept ครัว) · p2 ผักบุ้ง (ผูก, dept บาร์น้ำ) · p3 น้ำแข็ง (ไม่ผูก)
// นับ: เลือกแผนกครัว เห็นเฉพาะหมู · stepper + 2 ครั้ง = 2 · pill ครัวขึ้น ✓ · ค้นหาข้ามแผนก
// ผูกชื่อ: น้ำแข็งอยู่กลุ่ม ⚠ ยังไม่ผูก · สรุป 2/3 · Safety: แก้ rate_wk → PATCH id / dept → PATCH name
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const posts=[],patches=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสามชั้น',unit:'กก.',sup:'Smilemeat',safety:4,max:8,rate_wk:2,rate_fri:3,rate_we:4,dept:'ครัว',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',safety:2,max:4,rate_wk:null,rate_fri:null,rate_we:null,dept:'บาร์น้ำ',image_url:null,sort:2},
        {id:'p3',branch_id:BID,cat_label:'อื่นๆ',name:'น้ำแข็ง',unit:'ถุง',sup:'',safety:null,max:null,rate_wk:null,rate_fri:null,rate_we:null,dept:null,image_url:null,sort:3}]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:1,product_id:'p1',pnl_item:'สามชั้น'},{id:2,product_id:'p2',pnl_item:'ผักบุ้ง'},{id:3,product_id:'none:xx',pnl_item:'x'}]);
      if(url.includes('stock_current'))return T([{product_id:'p1',qty:5,updated_at:'2026-09-16T20:00:00Z'}]);
      return T([]);
    };
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  d.getElementById('cd').value='2026-09-17';
  const list=()=>d.getElementById('list').textContent;
  const pills=()=>d.getElementById('pills').textContent;
  // 1) แถบแผนก + การ์ดเฉพาะแผนกแรก
  out.push('pills 2 แผนก (ครัว/บาร์น้ำ) ไม่มีของที่ไม่ผูก: '+(pills().includes('ครัว')&&pills().includes('บาร์น้ำ')&&!pills().includes('อื่นๆ')));
  out.push('แผนกแรกเลือกอยู่ เห็นหมูตัวเดียว: '+(list().includes('สามชั้น')&&!list().includes('ผักบุ้ง')));
  out.push('การ์ด: ⚠ ยังไม่นับ + ชื่อนับตัวรอง + หน่วย กก. + ครั้งก่อน 5: '
    +(list().includes('ยังไม่นับ')&&list().includes('นับ: หมูสามชั้น')&&list().includes('กก.')&&list().includes('ครั้งก่อน 5')));
  // 2) stepper: + สองครั้ง = 2 · pill ✓
  w.bump('p1',1); w.bump('p1',1); await sleep(30);
  out.push('กด + สองครั้ง → นับได้ 2 + ✓ นับแล้ว: '+(list().includes('นับได้ 2')&&list().includes('✓ นับแล้ว')));
  out.push('pill ครัวครบ → มี ✓: '+!!d.querySelector('#pills .pill .ok'));
  // 3) ค้นหาข้ามแผนก
  d.getElementById('q').value='ผักบุ้ง'; d.getElementById('q').dispatchEvent(new w.Event('input')); await sleep(30);
  out.push('ค้นหาเจอผักบุ้งข้ามแผนก: '+(list().includes('ผักบุ้ง')&&list().includes('ผลค้นหา')));
  w.pickDept('ครัว'); await sleep(30);
  // 4) เปลี่ยนแผนก → เห็นผักบุ้ง
  w.pickDept('บาร์น้ำ'); await sleep(30);
  out.push('สลับแผนกบาร์น้ำ เห็นผักบุ้ง: '+(list().includes('ผักบุ้ง')&&!list().includes('สามชั้น')));
  // 5) กดหมด + บันทึก → stock_counts ใช้แผนกเป็น cat_label
  w.setOut('p2'); d.getElementById('who').value='นัน';
  await w.saveAll(); await sleep(60);
  const hist=posts.find(p=>p.url.includes('stock_counts'));
  const h1=hist&&hist.rows.find(r=>r.product_id==='p1'),h2=hist&&hist.rows.find(r=>r.product_id==='p2');
  out.push('บันทึก 2 แถว: หมู qty 2 cat=ครัว · ผักบุ้ง out_of_stock cat=บาร์น้ำ: '
    +(!!h1&&h1.qty===2&&h1.cat_label==='ครัว'&&!!h2&&h2.out_of_stock===true&&h2.cat_label==='บาร์น้ำ'&&h1.count_date==='2026-09-17'));
  out.push('stock_current upsert: '+!!posts.find(p=>p.url.includes('on_conflict=branch_id,product_id')));
  // 6) หน้าผูกชื่อ: แยกกลุ่ม + สรุป
  w.setTab('link'); await sleep(30);
  out.push('ผูกชื่อ: สรุปผูกแล้ว 2/3 + น้ำแข็งกลุ่มยังไม่ผูก: '
    +(list().includes('ผูกแล้ว 2')&&list().includes('ทั้งหมด 3')&&list().includes('น้ำแข็ง')&&list().includes('ยังไม่ผูก')));
  out.push('แถบแผนกซ่อนในหน้าผูกชื่อ: '+(d.getElementById('deptbar').style.display==='none'));
  out.push('ปุ่มบันทึกซ่อน: '+(d.getElementById('save').style.display==='none'));
  // 7) หน้า Safety: แก้อัตรา + แผนก
  w.setTab('set'); await sleep(30);
  out.push('Safety: มีหัว จ–พฤ/ศ/ส–อา + ค่าเดิม 2: '+(list().includes('จ–พฤ')&&[...d.querySelectorAll('.ri')].some(i=>i.value==='2')));
  w.setF('p1','rate_wk',2.5); w.setF('p1','dept','หน้าเตา'); await sleep(30);
  await w.saveAll(); await sleep(60);
  const pr=patches.find(p=>p.url.includes('id=eq.p1'));
  const pd=patches.find(p=>p.url.includes('name=eq.'+encodeURIComponent('หมูสามชั้น'))&&p.body.dept!==undefined);
  out.push('PATCH อัตรารายสาขา (id) 2.5 + แผนกตามชื่อ (2 สาขา) หน้าเตา: '
    +(!!pr&&pr.body.rate_wk===2.5&&pr.body.dept===undefined&&!!pd&&pd.body.dept==='หน้าเตา'));
  // 8) รูปตามชื่อ + วันตัดตี 6
  await w.setImgUrl('หมูสามชั้น','https://x.test/img.jpg');
  out.push('setImgUrl PATCH name=eq + local: '+(!!patches.find(p=>p.body.image_url)&&w.eval("S.all.find(x=>x.id==='p1').image_url")==='https://x.test/img.jpg'));
  out.push('bizToday ตี 2 → เมื่อวาน · dayGrp พฤ/ศ/ส = 0/1/2: '
    +(w.bizToday(new Date(2026,8,17,2,0))==='2026-09-16'&&w.dayGrp('2026-09-17')===0&&w.dayGrp('2026-09-18')===1&&w.dayGrp('2026-09-19')===2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
