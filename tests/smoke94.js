// smoke94: jjmk-stockcheck.html (ต้นแบบเช็คสต๊อก) — เชื่อม products (ระบบนับ) + pnl_stock_names (P&L)
// fixture JJRD: หมูสามชั้น (เนื้อสัตว์, ผูกชื่อบิล "สามชั้น", ครั้งก่อน 5) · ผักบุ้ง (ผัก, ยังไม่ผูก)
// นับ: หมู 3.5 · ผักบุ้ง กด "หมด" → บันทึก stock_counts 2 แถว (qty 3.5 / 0+out_of_stock) + stock_current upsert
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472'; // STK_BR.JJRD
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_key:'meat',cat_label:'เนื้อสัตว์',cat_ic:'🥩',name:'หมูสามชั้น',unit:'กก.',sup:'Smilemeat',safety:4,max:8,sort:1},
        {id:'p2',branch_id:BID,cat_key:'veg',cat_label:'ผัก',cat_ic:'🥬',name:'ผักบุ้ง',unit:'กก.',sup:'FarmFresh',safety:2,max:4,sort:2}]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_stock_names'))return T([
        {id:1,product_id:'p1',pnl_item:'สามชั้น',bill_unit:'กก.'},
        {id:2,product_id:'none:xx',pnl_item:'อะไรสักอย่าง'}]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('stock_current'))return T([{product_id:'p1',qty:5,counter:'บอย',updated_at:'2026-09-16T20:00:00Z'}]);
      return T([]);
    };
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  const t=d.getElementById('list').textContent;
  out.push('โหลด 2 รายการ 2 หมวด: '+(t.includes('หมูสามชั้น')&&t.includes('ผักบุ้ง')&&t.includes('เนื้อสัตว์')&&t.includes('ผัก')));
  out.push('ชื่อบิลจาก P&L: 🧾 สามชั้น: '+t.includes('🧾 สามชั้น'));
  out.push('ผักบุ้งยังไม่ผูก ⚠: '+t.includes('⚠ ยังไม่ผูกชื่อบิล'));
  out.push('สรุปผูกแล้ว 1/2 (แถว none ไม่นับ): '+t.includes('ผูกชื่อบิล P&L แล้ว 1/2'));
  out.push('ครั้งก่อนของหมู = 5: '+t.includes('ครั้งก่อน'));
  // bizToday ตัดตี 6
  out.push('bizToday ตี 2 ของ 17 ก.ย. → 16 ก.ย.: '+(w.bizToday(new Date(2026,8,17,2,0))==='2026-09-16'));
  out.push('bizToday 11 โมง → วันเดียวกัน: '+(w.bizToday(new Date(2026,8,17,11,0))==='2026-09-17'));
  // นับ: หมู 3.5 · ผักบุ้ง หมด
  w.setQ('p1','3.5'); w.setOut('p2'); await sleep(50);
  out.push('นับแล้ว 2/2: '+d.getElementById('st').textContent.includes('นับแล้ว 2/2'));
  d.getElementById('who').value='นัน';
  d.getElementById('cd').value='2026-09-17';
  await w.saveAll(); await sleep(100);
  const hist=posts.find(p=>p.url.includes('stock_counts'));
  const cur=posts.find(p=>p.url.includes('stock_current'));
  const h1=hist&&hist.rows.find(r=>r.product_id==='p1'), h2=hist&&hist.rows.find(r=>r.product_id==='p2');
  out.push('stock_counts 2 แถว: '+(!!hist&&hist.rows.length===2));
  out.push('แถวหมู: qty 3.5 · branch_id/name/cat/หน่วย/ซัพ/ผู้นับ/วันครบ: '
    +(!!h1&&h1.qty===3.5&&h1.branch_id===BID&&h1.branch_name==='รัชดา'&&h1.cat_label==='เนื้อสัตว์'&&h1.unit==='กก.'&&h1.sup==='Smilemeat'&&h1.counter==='นัน'&&h1.count_date==='2026-09-17'&&h1.out_of_stock===false&&h1.safety===4&&h1.max===8));
  out.push('แถวผักบุ้ง: หมด → qty 0 + out_of_stock: '+(!!h2&&h2.qty===0&&h2.out_of_stock===true));
  out.push('stock_current upsert on_conflict=branch_id,product_id 2 แถว: '
    +(!!cur&&cur.url.includes('on_conflict=branch_id,product_id')&&cur.rows.length===2&&cur.rows.every(r=>r.branch_id===BID)));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
