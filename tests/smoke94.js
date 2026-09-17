// smoke94: jjmk-stockcheck v2 — เฉพาะที่ผูกชื่อบิล · ชื่อบิลเป็นหลัก · แบ่งแผนก · ตั้งอัตราใช้ จ-พฤ/ศ/ส-อา · รูปตามชื่อ
// fixture JJRD 3 ตัว: p1 หมูสามชั้น (ผูก "สามชั้น", dept ครัว, ครั้งก่อน 5, safety 4) · p2 ผักบุ้ง (ผูก, ไม่มี dept → หมวดเดิม "ผัก (หมวดเดิม)")
//                     p3 น้ำแข็ง (ไม่ผูก → ถูกซ่อน, note "ซ่อน 1 รายการ")
// นับ: หมู 3 (< safety 4 → ⚠ ต่ำกว่า safety) · บันทึกนับ → stock_counts cat_label='ครัว' (ใช้แผนก)
// ตั้งค่า: หมู rate_wk 2.5 / dept 'หน้าเตา' → PATCH id=eq.p1 (อัตรา) + name=eq.หมูสามชั้น (แผนก)
// setImgUrl → PATCH products?name=eq + อัปเดต local ทุกแถวชื่อเดียวกัน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472'; // STK_BR.JJRD
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
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',safety:2,max:4,rate_wk:null,rate_fri:null,rate_we:null,dept:null,image_url:null,sort:2},
        {id:'p3',branch_id:BID,cat_label:'อื่นๆ',name:'น้ำแข็ง',unit:'ถุง',sup:'',safety:null,max:null,rate_wk:null,rate_fri:null,rate_we:null,dept:null,image_url:null,sort:3}]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:1,product_id:'p1',pnl_item:'สามชั้น'},
        {id:2,product_id:'p2',pnl_item:'ผักบุ้ง'},
        {id:3,product_id:'none:xx',pnl_item:'x'}]);
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
  d.getElementById('cd').value='2026-09-17'; // พฤหัส → กลุ่ม จ–พฤ
  const t=()=>d.getElementById('list').textContent;
  // 1) กรองเฉพาะผูกแล้ว + แบ่งแผนก
  out.push('โชว์ 2 ตัวที่ผูกแล้ว · น้ำแข็งถูกซ่อน: '+(t().includes('สามชั้น')&&t().includes('ผักบุ้ง')&&!t().includes('น้ำแข็ง')));
  out.push('note ซ่อน 1 รายการ: '+d.getElementById('note').textContent.includes('ซ่อน 1 รายการ'));
  out.push('แผนก "ครัว" + ตกกลับ "ผัก (หมวดเดิม)": '+(t().includes('🗂 ครัว')&&t().includes('ผัก (หมวดเดิม)')));
  out.push('ชื่อบิลเป็นหลัก + ชื่อนับตัวรอง: '+(t().includes('สามชั้น')&&t().includes('นับ: หมูสามชั้น')));
  out.push('ครั้งก่อนหมู 5: '+t().includes('5'));
  // 2) นับต่ำกว่า safety → เตือน · บันทึกนับใช้แผนกเป็น cat_label
  w.setQ('p1','3'); await sleep(30);
  out.push('หมูนับ 3 < safety 4 → ⚠ ต่ำกว่า safety: '+t().includes('ต่ำกว่า safety'));
  d.getElementById('who').value='นัน';
  await w.saveAll(); await sleep(60);
  const hist=posts.find(p=>p.url.includes('stock_counts'));
  const h1=hist&&hist.rows.find(r=>r.product_id==='p1');
  out.push('บันทึกนับ: ชื่อนับในแถว + cat_label=แผนก "ครัว" + qty 3 + วัน 2026-09-17: '
    +(!!h1&&h1.name==='หมูสามชั้น'&&h1.cat_label==='ครัว'&&h1.qty===3&&h1.count_date==='2026-09-17'&&h1.branch_name==='รัชดา'));
  out.push('stock_current upsert: '+!!posts.find(p=>p.url.includes('on_conflict=branch_id,product_id')));
  // 3) แท็บตั้งค่า: แก้อัตรา + แผนก
  d.getElementById('tabSet').click(); await sleep(30);
  out.push('ตั้งค่า: มีช่อง จ–พฤ/ศ/ส–อา ค่าเดิม 2/3/4: '+(t().includes('จ–พฤ')&&[...d.querySelectorAll('.ri')].some(i=>i.value==='2')));
  w.setF('p1','rate_wk',2.5); w.setF('p1','dept','หน้าเตา'); await sleep(30);
  out.push('สถานะแก้ 1 รายการ: '+d.getElementById('st').textContent.includes('แก้ตั้งค่า 1 รายการ'));
  await w.saveAll(); await sleep(60);
  const pr=patches.find(p=>p.url.includes('id=eq.p1'));
  const pd=patches.find(p=>p.url.includes('name=eq.'+encodeURIComponent('หมูสามชั้น'))&&p.body.dept!==undefined);
  out.push('PATCH อัตรารายสาขา id=eq.p1 rate_wk 2.5: '+(!!pr&&pr.body.rate_wk===2.5&&pr.body.dept===undefined));
  out.push('PATCH แผนกตามชื่อ (2 สาขา) = หน้าเตา: '+(!!pd&&pd.body.dept==='หน้าเตา'));
  out.push('แผนกย้ายในจอ: '+t().includes('🗂 หน้าเตา'));
  // 4) รูปตามชื่อ
  await w.setImgUrl('หมูสามชั้น','https://x.test/img.jpg'); await sleep(30);
  const pi=patches.find(p=>p.url.includes('name=eq.'+encodeURIComponent('หมูสามชั้น'))&&p.body.image_url);
  out.push('setImgUrl → PATCH name=eq + local อัปเดต: '+(!!pi&&w.eval("S.items.find(x=>x.id==='p1').image_url")==='https://x.test/img.jpg'));
  // 5) bizToday + กลุ่มวัน
  out.push('bizToday ตี 2 → เมื่อวาน: '+(w.bizToday(new Date(2026,8,17,2,0))==='2026-09-16'));
  out.push('dayGrp: พฤ=จ–พฤ(0) ศ=1 ส=2: '+(w.dayGrp('2026-09-17')===0&&w.dayGrp('2026-09-18')===1&&w.dayGrp('2026-09-19')===2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
