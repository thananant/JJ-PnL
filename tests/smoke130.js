// smoke130: jjmk-stockcheck — โหมดซัพ "สั่งทุก N วัน" (order_mode='interval' · เจ้าของสั่ง 15 ต.ค. 2569 ให้แอพนับใหม่รองรับแทนแอพนับเดิม)
// วันขาย cd = พฤ 15 ต.ค. 2569 · สาขารัชดา · อัตราใช้ จ–พฤ / ศ / ส–อา
// Freshy Syrup: ทุก 7 วัน ส่ง +1 · สั่งล่าสุด 8 ต.ค. → 8+7 = 15 ≤ 15 → ครบรอบ · ของมา ศ 16 · ชุดหน้า 16+7 = 23
//   น้ำเชื่อม rate 2/3/4 · ช่วง 16–22 = ศ3 + ส4 + อา4 + จ2 + อ2 + พ2 + พฤ2 = 19 · นับได้ 10 · ใช้ระหว่างรอ [16,16) = 0 → แนะนำ 9
// หจก.รักษ์ข้าว: cycle_days ว่าง → 15 วัน · ส่ง +2 · สั่งล่าสุด 5 ต.ค. → รอบหน้า 20 ต.ค. → วันนี้ยังไม่ครบรอบ ไม่มียอดแนะนำ
//   วันขาย 20 ต.ค. (อ): ครบรอบ · ของมา 22 · ช่วง 22 ถึง 22+15 = 6 พ.ย. = 15 วัน × 5 = 75 · ใช้ระหว่างรอ [21,22) = 5 · นับได้ 20 → เหลือ 15 → แนะนำ 60
// เซ็นซอรี่: ทุก 10 วัน ยังไม่เคยสั่ง → ครบรอบ (เริ่มนับ) · ของมา 16 · 10 วัน × 1 = 10 · นับได้ 3 → แนะนำ 7
// ใบสั่งวันนี้ (stock_receipts ของวัน 15 เอง) ไม่ทำให้รอบเลื่อน — นับเฉพาะใบสั่งก่อนวันขาย
// ✏️ เปลี่ยนชื่อซัพ interval (วันขาย 20 ต.ค. Freshy สั่งล่าสุด 15 → รอบหน้า 22): ต้อง PATCH stock_receipts.sup ด้วย + ย้าย S.lastOrd → ยังไม่ครบรอบเหมือนเดิม (ทั้งในจอและหลังโหลดใหม่)
// 📏 รอบยาวเกิน 31 วัน (ซัพ "ข้าวรอบยาว" ทุก 45 วัน ส่ง +1 · ยังไม่เคยสั่ง) วันขาย 15 ต.ค.: ของมา ศ 16 · ชุดหน้า 16+45 = 30 พ.ย.
//   ข้าวหอม 5/5/5 → 45 × 5 = 225 · น้ำปลา 1/1/2 → 45 + ส–อา 14 วัน = 59 (16 ต.ค.–29 พ.ย. = 6 สัปดาห์ ศ–พฤ ×2 + ศ ส อา) · นับได้ 0 → สั่งเท่ายอดใช้
//   เปลี่ยนเป็นทุก 90 วัน: ชุดหน้า 14 ม.ค. 2570 · ข้าวหอม 450 · น้ำปลา 90 + ส–อา 26 + วันขายดี พ 23 ธ.ค. (เกิน +50 วันจากวันขาย) 1 = 117
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const HP=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const posts=[],patches=[];
let SUPS=[
  {name:'Freshy Syrup',order_mode:'interval',cycle_days:7,lead_days:1,line_group_id:null},
  {name:'หจก.รักษ์ข้าว',order_mode:'interval',cycle_days:null,lead_days:2,line_group_id:null},
  {name:'เซ็นซอรี่',order_mode:'interval',cycle_days:10,lead_days:1,line_group_id:null},
  {name:'Smilemeat',order_mode:'any',lead_days:1,line_group_id:null}];
const RECEIPTS=[ // stock_receipts ของสาขานี้
  {sup:'Freshy Syrup',order_date:'2026-10-01',product_id:'p1',ordered:12},
  {sup:'Freshy Syrup',order_date:'2026-10-08',product_id:'p1',ordered:14},
  {sup:'Freshy Syrup',order_date:'2026-10-15',product_id:'p1',ordered:9},   // ส่งไปแล้ววันนี้ — ต้องไม่ทำให้รอบเลื่อน
  {sup:'หจก.รักษ์ข้าว',order_date:'2026-10-05',product_id:'p2',ordered:60},
  {sup:'หจก.รักษ์ข้าว',order_date:'2026-10-10',product_id:'p2',ordered:0}];  // ยกเลิกส่ง — ต้องไม่นับเป็นใบสั่งล่าสุด
const PRODS=[
  {id:'p1',branch_id:BID,cat_label:'เครื่องดื่ม',name:'น้ำเชื่อม',unit:'ขวด',sup:'Freshy Syrup',rate_wk:2,rate_fri:3,rate_we:4,dept:'บาร์น้ำ',image_url:null,sort:1},
  {id:'p2',branch_id:BID,cat_label:'ของแห้ง',name:'ข้าวสาร',unit:'กก.',sup:'หจก.รักษ์ข้าว',rate_wk:5,rate_fri:5,rate_we:5,dept:'ครัว',image_url:null,sort:2},
  {id:'p3',branch_id:BID,cat_label:'ของแห้ง',name:'ซอสพริก',unit:'ขวด',sup:'เซ็นซอรี่',rate_wk:1,rate_fri:1,rate_we:1,dept:'ครัว',image_url:null,sort:3},
  {id:'p4',branch_id:BID,cat_label:'ของแห้ง',name:'กระดาษ',unit:'แพ็ค',sup:'ซัพใหม่',rate_wk:1,rate_fri:1,rate_we:1,dept:'ครัว',image_url:null,sort:4}];
const COUNTS={p1:10,p2:20,p3:3,p4:9};
const SPD_ROWS=[];
let APPLY=false,RCFAIL=false,APFAIL=false,RRFAIL=false,PFAIL=false;   // APFAIL = โหลดสินค้าทุกสาขาไม่ได้ · RRFAIL = อ่านตัวสะกดใบสั่งเก่าไม่ได้ · PFAIL = PATCH products ไม่สำเร็จ   // APPLY = mock แก้ข้อมูลตาม PATCH (ใช้ช่วงทดสอบเปลี่ยนชื่อ) · RCFAIL = PATCH stock_receipts ไม่สำเร็จ
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'){const body=JSON.parse(opt.body);patches.push({url,body});
        if(RCFAIL&&url.includes('stock_receipts'))return {ok:false,status:403,text:async()=>'permission denied'};
        if(PFAIL&&url.includes('/products?'))return {ok:false,status:403,text:async()=>'permission denied'};
        if(APPLY){const tb=(url.match(/\/rest\/v1\/([a-z_]+)\?/)||[])[1],fm=url.match(/[?&](\w+)=eq\.([^&]*)/),fv=fm&&decodeURIComponent(fm[2]);
          const arr=tb==='suppliers'?SUPS:tb==='products'?PRODS:tb==='stock_receipts'?RECEIPTS:null;
          if(arr&&fm)arr.forEach(r=>{if(String(r[fm[1]])===fv)Object.assign(r,body);});}
        return T([]);}
      if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
        {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
        return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
      if(APFAIL&&url.includes('products')&&url.includes('branch_id=in.'))return {ok:false,status:500,text:async()=>'boom'};
      if(RRFAIL&&url.includes('stock_receipts')&&url.includes('ilike.'))return {ok:false,status:500,text:async()=>'boom'};
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T(JSON.parse(JSON.stringify(PRODS)));
      if(url.includes('products'))return T([]);
      if(url.includes('cal_special_days')){
        const lo=(url.match(/day_to=gte\.([0-9-]+)/)||[])[1]||'0000', hi=(url.match(/day_from=lte\.([0-9-]+)/)||[])[1]||'9999';
        return T(SPD_ROWS.filter(r=>r.day_to>=lo&&r.day_from<=hi));
      }
      if(url.includes('suppliers'))return T(SUPS);
      if(url.includes('stock_receipts')){
        const lo=(url.match(/order_date=gte\.([0-9-]+)/)||[])[1]||'0000', hi=(url.match(/order_date=lte\.([0-9-]+)/)||[])[1]||'9999';
        return T(RECEIPTS.filter(r=>r.order_date>=lo&&r.order_date<=hi&&(!url.includes('ordered=gt.0')||r.ordered>0)));
      }
      if(url.includes('stock_counts')&&method==='GET'){ const cd=decodeURIComponent((url.match(/count_date=eq\.([^&]+)/)||[])[1]||'');
        return T(Object.keys(COUNTS).map(id=>({product_id:id,qty:COUNTS[id],out_of_stock:false,created_at:cd+'T10:00:00Z'}))); }
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
  await sleep(300);
  d.getElementById('lgU').value='admin'; d.getElementById('lgP').value='jjmk1234';
  await w.doLogin(); await sleep(300);
  d.getElementById('cd').value='2026-10-15'; await w.loadAll(); await sleep(200);
  const plan=()=>w.eval('orderPlan()');
  const G=n=>plan().find(g=>g.sup===n);
  const R=(g,id)=>g.rows.find(r=>r.it.id===id);
  let fr=G('Freshy Syrup'), rk=G('หจก.รักษ์ข้าว'), ss=G('เซ็นซอรี่'), sm=G('Smilemeat');
  out.push('supModeOf = interval · supCyc: 7 / ว่าง→15 / 10: '+w.eval("supModeOf(supSched('Freshy Syrup'))==='interval'&&supCyc(supSched('Freshy Syrup'))===7&&supCyc(supSched('หจก.รักษ์ข้าว'))===15&&supCyc(supSched('เซ็นซอรี่'))===10"));
  out.push('ivState Freshy: สั่งล่าสุด 8 ต.ค. (ไม่นับใบสั่งวันนี้ 15) · รอบหน้า 15 · ครบรอบ: '+w.eval("(s=>s.last==='2026-10-08'&&s.next==='2026-10-15'&&s.due===true&&s.cyc===7)(ivState('Freshy Syrup','2026-10-15'))"));
  out.push('Freshy ครบรอบ: ส่ง 16 ต.ค. · ชุดหน้า 23 · ครอบคลุม 7 วัน · ต้องใช้ 19 · นับได้ 10 → แนะนำ 9: '
    +(fr.dl.d==='2026-10-16'&&fr.dl.mode==='interval'&&fr.nx==='2026-10-23'&&fr.covDays===7&&R(fr,'p1').need===19&&R(fr,'p1').left===10&&R(fr,'p1').order===9));
  out.push('หจก.รักษ์ข้าว ยังไม่ครบรอบ (5 ต.ค. + 15 = 20 ต.ค.): ไม่มีวันส่ง · ไม่มียอดแนะนำ · ต้องสั่ง 0: '
    +(rk.dl.d===''&&rk.dl.iv&&rk.dl.iv.next==='2026-10-20'&&rk.dl.iv.due===false&&R(rk,'p2').order==null&&rk.nOrder===0));
  out.push('เซ็นซอรี่ ยังไม่เคยสั่ง = ครบรอบ (เริ่มนับ): ส่ง 16 · 10 วัน × 1 = 10 · นับได้ 3 → แนะนำ 7: '
    +(ss.dl.d==='2026-10-16'&&ss.dl.iv.last===null&&ss.dl.iv.due===true&&ss.covDays===10&&R(ss,'p3').need===10&&R(ss,'p3').order===7));
  out.push('ซัพสั่งได้ทุกวัน (Smilemeat) ไม่เปลี่ยน: mode any · ไม่มี iv: '+(!sm||(sm.dl.mode==='any'&&!sm.dl.iv)));
  // หน้า 🛒 สั่งของ: ข้อความหัวซัพ
  w.setTab('order'); await sleep(80);
  const L=d.getElementById('list').textContent;
  out.push('หน้าสั่งของ: Freshy "ครบรอบสั่งทุก 7 วัน (สั่งล่าสุด 8 ต.ค. 2569 (พฤหัสบดี))" · ข้าว "ยังไม่ครบรอบ (สั่งทุก 15 วัน) · รอบหน้า 20 ต.ค." · ซอส "ยังไม่เคยสั่ง — เริ่มนับรอบ": '
    +(L.includes('🔁 ครบรอบสั่งทุก 7 วัน (สั่งล่าสุด 8 ต.ค. 2569 (พฤหัสบดี))')&&L.includes('🔁 ยังไม่ครบรอบ (สั่งทุก 15 วัน) · สั่งล่าสุด 5 ต.ค. 2569 (จันทร์) · รอบหน้า 20 ต.ค. 2569 (อังคาร)')
      &&L.includes('ยังไม่เคยสั่ง — เริ่มนับรอบ')));
  // แถบรอบสั่งวันนี้
  w.eval('S.obOpen=true'); const ob=w.eval('orderBanner()');
  out.push('แถบรอบสั่งวันนี้: ถึงรอบ 2 ซัพ (Freshy · เซ็นซอรี่) ไม่มีข้าว: '+(ob.includes('ถึงรอบสั่ง <b>2</b> ซัพ')&&ob.includes('Freshy Syrup')&&ob.includes('เซ็นซอรี่')&&!ob.includes('หจก.รักษ์ข้าว')&&ob.includes('🔁 ครบ 7 วัน')));
  // หน้า 🚚 รอบสั่งซัพ
  w.setTab('sched'); await sleep(80);
  const sl=w.eval('S.supList'); const iR=sl.indexOf('หจก.รักษ์ข้าว');
  const rowEl=[...d.querySelectorAll('#list .lrow')].find(x=>x.textContent.includes('หจก.รักษ์ข้าว'));
  const sel=rowEl&&rowEl.querySelector('select.zsel');
  out.push('หน้ารอบสั่งซัพ: มีตัวเลือก "สั่งทุก N วัน" และเลือกไว้ · ช่องทุก N วัน = 15 · บอกสั่งล่าสุด/รอบหน้า: '
    +(!!sel&&[...sel.options].some(o=>o.value==='interval'&&o.textContent==='สั่งทุก N วัน')&&sel.value==='interval'
      &&rowEl.querySelector('input.ri').value==='15'&&rowEl.textContent.includes('รอบหน้า 20 ต.ค. 2569')));
  w.supSetCyc(iR,'12'); await w.supSave(iR); await sleep(50);
  const pt=patches.find(p=>p.url.includes('suppliers?name=eq.'+encodeURIComponent('หจก.รักษ์ข้าว')));
  out.push('💾 บันทึก: PATCH suppliers {order_mode:interval, cycle_days:12, lead_days:2}: '+(!!pt&&pt.body.order_mode==='interval'&&pt.body.cycle_days===12&&pt.body.lead_days===2));
  out.push('ใส่ N นอกช่วง (1) → ใช้ 15: '+(w.supSetCyc(iR,'1'),w.eval("supObj('หจก.รักษ์ข้าว').cyc")===15));
  // ซัพที่ยังไม่มีในตาราง → กด 💾 = สร้างให้เลย (ไม่ไล่ไปแอพนับเดิม)
  const iN=w.eval('S.supList').indexOf('ซัพใหม่');
  await w.supSave(iN); await sleep(50);
  const pn=posts.find(p=>p.url.includes('suppliers')&&!Array.isArray(p.rows)&&p.rows.name==='ซัพใหม่');
  out.push('ซัพยังไม่มีในตาราง → POST suppliers {name:ซัพใหม่} แล้ว PATCH รอบสั่ง · ไม่มีข้อความ "แอพนับเดิม": '
    +(!!pn&&patches.some(p=>p.url.includes('suppliers?name=eq.'+encodeURIComponent('ซัพใหม่')))&&!d.body.textContent.includes('เพิ่มชื่อซัพที่แอพนับเดิม')));
  out.push('ไม่มีข้อความให้ไปเพิ่มซัพที่แอพนับเดิมเหลือในโค้ด: '+!html.includes('เพิ่มชื่อซัพที่แอพนับเดิม'));
  // วันขาย 20 ต.ค. → ข้าวครบรอบ
  d.getElementById('cd').value='2026-10-20'; await w.loadAll(); await sleep(200);
  rk=G('หจก.รักษ์ข้าว');
  out.push('วันขาย 20 ต.ค.: ข้าวครบรอบ · ส่ง 22 · ชุดหน้า 6 พ.ย. · ต้องใช้ 75 · ใช้ระหว่างรอ 5 · นับได้ 20 → แนะนำ 60: '
    +(rk.dl.d==='2026-10-22'&&rk.nx==='2026-11-06'&&R(rk,'p2').need===75&&R(rk,'p2').pre.sum===5&&R(rk,'p2').order===60));
  fr=G('Freshy Syrup');
  out.push('วันขาย 20 ต.ค.: Freshy สั่งล่าสุด 15 (ใบสั่งวันนั้นนับแล้ว) → รอบหน้า 22 ยังไม่ครบรอบ: '+(fr.dl.d===''&&fr.dl.iv.last==='2026-10-15'&&fr.dl.iv.next==='2026-10-22'));

  // ✏️ เปลี่ยนชื่อซัพ interval → รอบสั่งต้องไม่หาย
  APPLY=true; patches.length=0; w.prompt=()=>'Freshy Syrup Co.';
  await w.supRename('Freshy Syrup'); await sleep(50);
  const prc=patches.find(p=>p.url.includes('stock_receipts?sup=eq.'+encodeURIComponent('Freshy Syrup')));
  out.push('เปลี่ยนชื่อ Freshy Syrup → Freshy Syrup Co.: PATCH stock_receipts?sup=eq.Freshy%20Syrup {sup:ชื่อใหม่} (+ suppliers, products): '
    +(!!prc&&prc.url.endsWith('stock_receipts?sup=eq.Freshy%20Syrup')&&prc.body.sup==='Freshy Syrup Co.'
      &&patches.some(p=>p.url.includes('suppliers?name=eq.Freshy%20Syrup'))&&patches.some(p=>p.url.includes('products?sup=eq.Freshy%20Syrup'))));
  let fc=G('Freshy Syrup Co.');
  out.push('หลังเปลี่ยนชื่อ (ในจอ): ยังไม่ครบรอบ · สั่งล่าสุด 15 · รอบหน้า 22 · ไม่มียอดสั่ง · ไม่มีกลุ่มชื่อเดิม: '
    +(!!fc&&!G('Freshy Syrup')&&fc.dl.d===''&&fc.dl.iv.last==='2026-10-15'&&fc.dl.iv.next==='2026-10-22'&&fc.dl.iv.due===false&&fc.nOrder===0));
  await w.loadAll(); await sleep(200); fc=G('Freshy Syrup Co.');
  w.eval('S.obOpen=true'); const ob2=w.eval('orderBanner()');
  out.push('หลังโหลดใหม่: ยังไม่ครบรอบ (สั่งล่าสุด 15 · รอบหน้า 22) · แถบรอบสั่งไม่มี Freshy: '
    +(!!fc&&fc.dl.d===''&&fc.dl.iv.last==='2026-10-15'&&fc.dl.iv.due===false&&fc.nOrder===0&&!ob2.includes('Freshy')));
  RCFAIL=true; w.prompt=()=>'เซ็นซอรี่ ใหม่';
  await w.supRename('เซ็นซอรี่'); await sleep(50);
  const tt=d.getElementById('toast');
  out.push('ย้ายประวัติสั่งไม่ได้ → เตือน (สีแดง) "ย้ายประวัติสั่งไม่ได้": '+(tt.textContent.includes('ย้ายประวัติสั่งไม่ได้')&&tt.className.includes('err')));
  RCFAIL=false;
  // ✏️ ชื่อสะกดต่างกันแค่ตัวพิมพ์/ช่องว่าง: สินค้าเก็บ 'siam  ice' · ใบสั่งเก่าเก็บ 'SIAM ICE' (ไม่มีสินค้าไหนใช้ตัวสะกดนี้แล้ว) → ต้องแก้ครบทุกตัวสะกด
  SUPS.push({name:'Siam Ice',order_mode:'interval',cycle_days:10,lead_days:1,line_group_id:null});
  PRODS.push({id:'p9',branch_id:BID,cat_label:'ของสด',name:'น้ำแข็งหลอด',unit:'ถุง',sup:'siam  ice',rate_wk:2,rate_fri:2,rate_we:2,dept:'บาร์น้ำ',image_url:null,sort:9});
  COUNTS.p9=5; RECEIPTS.push({sup:'SIAM ICE',order_date:'2026-10-13',product_id:'p9',ordered:20});
  await w.loadAll(); await sleep(200);
  out.push('ก่อนเปลี่ยนชื่อ: น้ำแข็ง (ซัพสะกด siam  ice) สั่งล่าสุด 13 (ใบสั่งสะกด SIAM ICE) · ยังไม่ครบรอบ: '+w.eval("(s=>!!s&&s.last==='2026-10-13'&&s.due===false)(ivState('siam  ice','2026-10-20'))"));
  patches.length=0; w.prompt=()=>'Siam Ice Co';
  await w.supRename('Siam Ice'); await sleep(50);
  out.push('เปลี่ยนชื่อ Siam Ice → Siam Ice Co: แก้สินค้าตัวสะกด "siam  ice" + ใบสั่งตัวสะกด "SIAM ICE" ที่อ่านจากฐาน: '
    +(patches.some(p=>p.url.endsWith('products?sup=eq.'+encodeURIComponent('siam  ice')))&&patches.some(p=>p.url.endsWith('stock_receipts?sup=eq.'+encodeURIComponent('SIAM ICE')))
      &&PRODS.find(p=>p.id==='p9').sup==='Siam Ice Co'&&RECEIPTS.filter(r=>r.product_id==='p9').every(r=>r.sup==='Siam Ice Co')));
  await w.loadAll(); await sleep(200); const si=G('Siam Ice Co');
  out.push('หลังโหลดใหม่: น้ำแข็งอยู่ซัพ Siam Ice Co (สั่งทุก 10 วัน) · สั่งล่าสุด 13 · รอบหน้า 23 · ยังไม่ครบรอบ: '
    +(!!si&&si.rows.some(r=>r.it.id==='p9')&&si.dl.mode==='interval'&&si.dl.iv&&si.dl.iv.last==='2026-10-13'&&si.dl.iv.next==='2026-10-23'&&si.dl.iv.due===false&&si.nOrder===0));
  APPLY=false;
  // 🛡 อ่านไม่ครบ = ไม่เขียนอะไรเลย · เขียนไม่ครบ = เตือน + โหลดใหม่ · ย้ายของใช้ชื่อตามตารางซัพ
  const toastT=()=>d.getElementById('toast').textContent;
  w.eval('S.allBr=null;S.apErr=null;S._apErrAt=0'); APFAIL=true; patches.length=0; w.prompt=()=>'Siam Ice X';
  await w.supRename('Siam Ice Co'); await sleep(50);
  out.push('โหลดสินค้าทุกสาขาไม่ได้ → ไม่เปลี่ยนชื่อ (ไม่มี PATCH เลย) + เตือน: '+(patches.length===0&&toastT().includes('ยังไม่ได้เปลี่ยนชื่อ')));
  APFAIL=false; RRFAIL=true; patches.length=0;
  await w.supRename('Siam Ice Co'); await sleep(50);
  out.push('อ่านใบสั่งเก่าไม่ได้ → ไม่เปลี่ยนชื่อ (ไม่มี PATCH เลย) + เตือน: '+(patches.length===0&&toastT().includes('อ่านประวัติสั่งไม่สำเร็จ')));
  RRFAIL=false; PFAIL=true; patches.length=0;
  await w.supRename('Siam Ice Co'); await sleep(250);
  out.push('แก้สินค้าไม่สำเร็จ → เตือนให้ลองซ้ำ (ไม่ขึ้น "เปลี่ยนชื่อไม่สำเร็จ") + โหลดใหม่ (สินค้ายังอยู่ชื่อเดิมตามฐาน): '
    +(toastT().includes('แก้ชื่อซัพในสินค้าบางตัวไม่สำเร็จ')&&!toastT().includes('เปลี่ยนชื่อไม่สำเร็จ')&&w.eval("S.all.find(p=>p.id==='p9').sup")==='Siam Ice Co'));
  PFAIL=false;
  w.prompt=()=>'smilemeat'; patches.length=0;
  await w.supRename('Siam Ice Co'); await sleep(50);
  out.push('เปลี่ยนชื่อไปซ้ำกับซัพที่มีอยู่ (smilemeat ≈ Smilemeat) → ไม่ให้ทำ (ให้ใช้ย้ายของ): '+(patches.length===0&&toastT().includes('มีซัพชื่อ')));
  patches.length=0;
  await w.supMove('ซัพใหม่'); await sleep(50);
  const pm=patches.find(p=>p.url.includes('products?sup=eq.'+encodeURIComponent('ซัพใหม่')));
  out.push('ย้ายของ พิมพ์ "smilemeat" → เขียนชื่อตามตารางซัพ "Smilemeat" (ใบสั่งไม่แตกเป็น 2 กลุ่ม): '+(!!pm&&pm.body.sup==='Smilemeat'&&w.eval("S.all.find(p=>p.id==='p4').sup")==='Smilemeat'));
  w.prompt=()=>'Siam Ice Co';

  // 📏 รอบยาวเกิน 31 วัน
  SUPS.push({name:'ข้าวรอบยาว',order_mode:'interval',cycle_days:45,lead_days:1,line_group_id:null});
  PRODS.push({id:'p5',branch_id:BID,cat_label:'ของแห้ง',name:'ข้าวหอม',unit:'กก.',sup:'ข้าวรอบยาว',rate_wk:5,rate_fri:5,rate_we:5,dept:'ครัว',image_url:null,sort:5},
             {id:'p6',branch_id:BID,cat_label:'ของแห้ง',name:'น้ำปลา',unit:'ขวด',sup:'ข้าวรอบยาว',rate_wk:1,rate_fri:1,rate_we:2,dept:'ครัว',image_url:null,sort:6});
  COUNTS.p5=0; COUNTS.p6=0;
  SPD_ROWS.push({id:1,name:'วันขายดีไกล',day_from:'2026-12-23',day_to:'2026-12-23',order_rate_group:2,order_branches:null,cancelled:false});
  d.getElementById('cd').value='2026-10-15'; await w.loadAll(); await sleep(200);
  let lg=G('ข้าวรอบยาว');
  out.push('ทุก 45 วัน: ส่ง 16 ต.ค. · ชุดหน้า 30 พ.ย. · ครอบคลุม 45 วัน · ข้าวหอม 45×5 = 225 สั่ง 225 · น้ำปลา 59: '
    +(!!lg&&lg.dl.d==='2026-10-16'&&lg.nx==='2026-11-30'&&lg.covDays===45&&R(lg,'p5').cov.days===45&&R(lg,'p5').need===225&&R(lg,'p5').order===225&&R(lg,'p6').need===59&&R(lg,'p6').order===59));
  out.push('หัวซัพ "ครอบคลุม 45 วัน (…)" — เกิน 14 วันมี … ต่อท้าย ไม่ตัดเงียบ: '
    +(!!lg&&lg.covTxt.startsWith('ครอบคลุม 45 วัน (ศุกร์,เสาร์,')&&lg.covTxt.endsWith(',…)')&&w.eval("covRange('2026-10-16',2)")==='ศุกร์,เสาร์'));
  w.setTab('order'); await sleep(80);
  out.push('หน้าสั่งของ: มีข้อความ "ครอบคลุม 45 วัน": '+d.getElementById('list').textContent.includes('ครอบคลุม 45 วัน'));
  SUPS[SUPS.length-1].cycle_days=90; await w.loadAll(); await sleep(200); lg=G('ข้าวรอบยาว');
  out.push('ทุก 90 วัน: ชุดหน้า 14 ม.ค. 2570 · ครอบคลุม 90 วัน · ข้าวหอม 450 · น้ำปลา 117 (รวมวันขายดี 23 ธ.ค. ที่เกิน +50 วัน): '
    +(!!lg&&lg.nx==='2027-01-14'&&lg.covDays===90&&R(lg,'p5').need===450&&R(lg,'p6').need===117&&R(lg,'p6').order===117));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
