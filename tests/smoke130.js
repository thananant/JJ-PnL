// smoke130: jjmk-stockcheck — โหมดซัพ "สั่งทุก N วัน" (order_mode='interval' · เจ้าของสั่ง 15 ต.ค. 2569 ให้แอพนับใหม่รองรับแทนแอพนับเดิม)
// วันขาย cd = พฤ 15 ต.ค. 2569 · สาขารัชดา · อัตราใช้ จ–พฤ / ศ / ส–อา
// Freshy Syrup: ทุก 7 วัน ส่ง +1 · สั่งล่าสุด 8 ต.ค. → 8+7 = 15 ≤ 15 → ครบรอบ · ของมา ศ 16 · ชุดหน้า 16+7 = 23
//   น้ำเชื่อม rate 2/3/4 · ช่วง 16–22 = ศ3 + ส4 + อา4 + จ2 + อ2 + พ2 + พฤ2 = 19 · นับได้ 10 · ใช้ระหว่างรอ [16,16) = 0 → แนะนำ 9
// หจก.รักษ์ข้าว: cycle_days ว่าง → 15 วัน · ส่ง +2 · สั่งล่าสุด 5 ต.ค. → รอบหน้า 20 ต.ค. → วันนี้ยังไม่ครบรอบ ไม่มียอดแนะนำ
//   วันขาย 20 ต.ค. (อ): ครบรอบ · ของมา 22 · ช่วง 22 ถึง 22+15 = 6 พ.ย. = 15 วัน × 5 = 75 · ใช้ระหว่างรอ [21,22) = 5 · นับได้ 20 → เหลือ 15 → แนะนำ 60
// เซ็นซอรี่: ทุก 10 วัน ยังไม่เคยสั่ง → ครบรอบ (เริ่มนับ) · ของมา 16 · 10 วัน × 1 = 10 · นับได้ 3 → แนะนำ 7
// ใบสั่งวันนี้ (stock_receipts ของวัน 15 เอง) ไม่ทำให้รอบเลื่อน — นับเฉพาะใบสั่งก่อนวันขาย
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
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      if(method==='POST'){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
        {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
        return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
      if(url.includes('products')&&url.includes('branch_id=eq.'+BID))return T([
        {id:'p1',branch_id:BID,cat_label:'เครื่องดื่ม',name:'น้ำเชื่อม',unit:'ขวด',sup:'Freshy Syrup',rate_wk:2,rate_fri:3,rate_we:4,dept:'บาร์น้ำ',image_url:null,sort:1},
        {id:'p2',branch_id:BID,cat_label:'ของแห้ง',name:'ข้าวสาร',unit:'กก.',sup:'หจก.รักษ์ข้าว',rate_wk:5,rate_fri:5,rate_we:5,dept:'ครัว',image_url:null,sort:2},
        {id:'p3',branch_id:BID,cat_label:'ของแห้ง',name:'ซอสพริก',unit:'ขวด',sup:'เซ็นซอรี่',rate_wk:1,rate_fri:1,rate_we:1,dept:'ครัว',image_url:null,sort:3},
        {id:'p4',branch_id:BID,cat_label:'ของแห้ง',name:'กระดาษ',unit:'แพ็ค',sup:'ซัพใหม่',rate_wk:1,rate_fri:1,rate_we:1,dept:'ครัว',image_url:null,sort:4}]);
      if(url.includes('products'))return T([]);
      if(url.includes('suppliers'))return T(SUPS);
      if(url.includes('stock_receipts')){
        const lo=(url.match(/order_date=gte\.([0-9-]+)/)||[])[1]||'0000', hi=(url.match(/order_date=lte\.([0-9-]+)/)||[])[1]||'9999';
        return T(RECEIPTS.filter(r=>r.order_date>=lo&&r.order_date<=hi&&(!url.includes('ordered=gt.0')||r.ordered>0)));
      }
      if(url.includes('stock_counts')&&method==='GET'){ const cd=decodeURIComponent((url.match(/count_date=eq\.([^&]+)/)||[])[1]||'');
        return T([{product_id:'p1',qty:10,out_of_stock:false,created_at:cd+'T10:00:00Z'},{product_id:'p2',qty:20,out_of_stock:false,created_at:cd+'T10:00:00Z'},
                  {product_id:'p3',qty:3,out_of_stock:false,created_at:cd+'T10:00:00Z'},{product_id:'p4',qty:9,out_of_stock:false,created_at:cd+'T10:00:00Z'}]); }
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
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
