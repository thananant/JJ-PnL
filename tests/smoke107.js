// smoke107: jjmk-stockcheck — สูตรสั่งของแบบ "ครอบคลุมถึงก่อนของชุดถัดไปมา"
//   + สั่งล่วงหน้า N วัน (order_ahead) + หักของที่สั่งไว้แล้วกำลังมา (stock_receipts)
// fixture สาขารัชดา:
//   CPF  วันสั่งตายตัว ศุกร์→ส่งเสาร์ · อาทิตย์→ส่งจันทร์   (p1 หมูสามชั้น ใช้วันละ 10 · นับได้ 5)
//   FarmFresh วันสั่งตายตัว พุธ→ส่งพฤหัส · สั่งล่วงหน้า 1 วัน (p2 ผักกาด ใช้วันละ 6 · นับได้ 10)
//   Makro สั่งได้ทุกวัน ส่งหลังสั่ง 3 วัน (p4 น้ำมัน ใช้วันละ 5 · นับได้ 2 · มีของกำลังมา 12)
// คำนวณมือ:
//   A) สั่งศุกร์ 18 ก.ย. → CPF ของมาเสาร์ 19 · ชุดหน้ามาจันทร์ 21 → ต้องเผื่อ เสาร์+อาทิตย์ = 20 − เหลือ 5 = สั่ง 15
//      (สูตรเก่าคิดแค่วันที่ของมา = 10 − 5 = 5 → ของขาดวันอาทิตย์)
//      Makro ของมาจันทร์ 21 · ใช้ระหว่างรอ (ส+อา) 10 · กำลังมา 12 → เหลือ 4 → ต้องใช้ 5 → สั่ง 1
//   B) สั่งอาทิตย์ 20 ก.ย. → CPF ของมาจันทร์ 21 · ชุดหน้ามาเสาร์ 26 → เผื่อ จ–ศ 5 วัน = 50 − 5 = สั่ง 45
//   C) สั่งอังคาร 22 ก.ย. → FarmFresh สั่งล่วงหน้า 1 วัน (วันสั่งจริงพุธ 23) ของมาพฤหัส 24 · ชุดหน้ามาพฤหัส 1 ต.ค.
//      เผื่อ 7 วัน = 42 · ใช้ระหว่างรอ (พุธ) 6 → เหลือ 4 → สั่ง 38
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const COUNTS={p1:5,p2:10,p4:2};
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','order');
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
      if(url.includes('sc_depts'))return T([]);
      if(url.includes('sc_units'))return T([]);
      if(url.includes('sc_i18n'))return T([]);
      if(url.includes('line_groups'))return T([{group_id:'C123',name:'กลุ่ม CPF',seen_at:'2026-09-01'}]);
      if(url.includes('sc_config'))return T([]);
      if(url.includes('stock_receipts'))return T([
        {product_id:'p4',order_date:'2026-09-16',ordered:12},   // Makro lead 3 → ถึงเสาร์ 19 (ยังไม่ถึงตอนนับศุกร์)
        {product_id:'p4',order_date:'2026-09-10',ordered:99}]); // ถึงตั้งแต่ 13 ก.ย. = นับรวมไปแล้ว ห้ามหักซ้ำ
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_suppliers'))return T([]);
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสามชั้น',unit:'กก.',sup:'CPF',rate_wk:10,rate_fri:10,rate_we:10,dept:'ครัว',sort:1},
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักกาด',unit:'กก.',sup:'FarmFresh',rate_wk:6,rate_fri:6,rate_we:6,dept:'ผัก',sort:2},
        {id:'p4',branch_id:BID,cat_label:'ของแห้ง',name:'น้ำมัน',unit:'ขวด',sup:'Makro',rate_wk:5,rate_fri:5,rate_we:5,dept:'ครัว',sort:3}]);
      if(url.includes('suppliers'))return T([
        {name:'CPF',order_mode:'fixed',schedule:{fri:'sat',sun:'mon'},order_ahead:0,prepay:false,line_group_id:'C123'},
        {name:'FarmFresh',order_mode:'fixed',schedule:{wed:'thu'},order_ahead:1,prepay:false,line_group_id:null},
        {name:'Makro',order_mode:'any',lead_days:3,order_ahead:0,prepay:false,line_group_id:null}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('stock_counts')){
        const m=url.match(/2026-09-\d\d/);
        if(!m||!['2026-09-18','2026-09-20','2026-09-22'].includes(m[0]))return T([]);
        return T(Object.keys(COUNTS).map(id=>({product_id:id,qty:COUNTS[id],out_of_stock:false,created_at:m[0]+'T23:00:00Z'})));
      }
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pick=(P,sup)=>P.find(g=>g.sup===sup);
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  const list=()=>d.getElementById('list').textContent;
  const setDay=async ds=>{ d.getElementById('cd').value=ds;
    d.getElementById('cd').dispatchEvent(new w.Event('change')); await sleep(300); };
  const plan=()=>JSON.parse(w.eval('JSON.stringify(orderPlan().map(g=>({sup:g.sup,d:g.dl.d,od:g.dl.od,ahead:g.dl.ahead,nx:g.nx,covTxt:g.covTxt,rows:g.rows.map(r=>({n:r.it.name,have:r.have,need:r.need,order:r.order,cov:r.cov,pre:r.pre,left:r.left,onWay:r.onWay}))})))'));

  /* ---------- A) สั่งวันศุกร์ 18 ก.ย. 2569 ---------- */
  await setDay('2026-09-18');
  let P=plan(), cpf=pick(P,'CPF'), mk=pick(P,'Makro'), ff=pick(P,'FarmFresh');
  let r1=cpf.rows.find(r=>r.n==='หมูสามชั้น');
  out.push('สั่งศุกร์ → CPF ของมาเสาร์ 19 · ชุดถัดไปมาจันทร์ 21: '
    +(cpf.d==='2026-09-19'&&cpf.nx==='2026-09-21'));
  out.push('ต้องเผื่อ เสาร์+อาทิตย์ = 2 วัน = 20 (ไม่ใช่แค่วันที่ของมา 10): '
    +(r1.cov.days===2&&r1.need===20));
  out.push('ไม่มีวันรอของ (ของมาพรุ่งนี้) → เหลือเท่าที่นับได้ 5 → ต้องสั่ง 15: '
    +(r1.pre.sum===0&&r1.left===5&&r1.order===15));
  out.push('ป้ายบนหัวซัพบอกช่วงที่ต้องเผื่อ + วันที่ของชุดหน้ามา: '
    +(cpf.covTxt==='ครอบคลุม 2 วัน (เสาร์,อาทิตย์)'&&list().includes('ครอบคลุม 2 วัน (เสาร์,อาทิตย์)')&&list().includes('ชุดหน้ามา จันทร์')));
  let r4=mk.rows.find(r=>r.n==='น้ำมัน');
  out.push('Makro สั่งได้ทุกวัน lead 3 → ของมาจันทร์ 21 · ครอบคลุม 1 วัน (พรุ่งนี้สั่งใหม่ได้): '
    +(mk.d==='2026-09-21'&&r4.cov.days===1&&r4.need===5));
  out.push('หักของที่สั่งไว้แล้วกำลังมา 12 (ใบสั่ง 16 ก.ย. ถึงเสาร์ 19) · ของที่ถึงก่อนวันนับไม่นับซ้ำ: '+(r4.onWay===12));
  out.push('น้ำมัน: นับได้ 2 − ใช้ระหว่างรอ (ส+อา) 10 + กำลังมา 12 = เหลือ 4 → สั่ง 1: '
    +(r4.have===2&&r4.pre.sum===10&&r4.left===4&&r4.order===1));
  out.push('หน้าจอโชว์ที่มาของ "เหลือ": '+list().includes('− ใช้ระหว่างรอ 10 + กำลังมา 12 = เหลือ 4'));
  out.push('วันศุกร์ไม่ใช่รอบสั่งของ FarmFresh (สั่งพุธอย่างเดียว) → ไม่มีวันส่ง ไม่สั่งอะไร: '
    +(ff.d===''&&ff.rows.every(r=>r.order===null)&&list().includes('วันนี้ไม่ใช่รอบสั่งของซัพนี้')));

  /* ---------- B) สั่งวันอาทิตย์ 20 ก.ย. 2569 ---------- */
  await setDay('2026-09-20');
  P=plan(); cpf=pick(P,'CPF'); r1=cpf.rows.find(r=>r.n==='หมูสามชั้น');
  out.push('สั่งอาทิตย์ → ของมาจันทร์ 21 · ชุดหน้ามาเสาร์ 26 → ต้องเผื่อ จ–ศ 5 วัน = 50: '
    +(cpf.d==='2026-09-21'&&cpf.nx==='2026-09-26'&&r1.cov.days===5&&r1.need===50));
  out.push('สั่งคนละวันได้ของไม่เท่ากัน (ศุกร์ 15 · อาทิตย์ 45) เพราะช่วงที่ต้องเผื่อไม่เท่ากัน: '+(r1.order===45));

  /* ---------- C) สั่งล่วงหน้า 1 วัน: อังคาร 22 ก.ย. แทนวันสั่งจริงพุธ 23 ---------- */
  await setDay('2026-09-22');
  P=plan(); ff=pick(P,'FarmFresh'); cpf=pick(P,'CPF');
  const r2=ff.rows.find(r=>r.n==='ผักกาด');
  out.push('FarmFresh ตั้งสั่งล่วงหน้า 1 วัน → วันอังคารขึ้นให้สั่งแล้ว (วันสั่งจริงพุธ 23) ของมาพฤหัส 24: '
    +(ff.ahead===1&&ff.od==='2026-09-23'&&ff.d==='2026-09-24'));
  out.push('หัวซัพบอกว่าสั่งล่วงหน้า + วันสั่งจริง: '
    +(list().includes('สั่งล่วงหน้า 1 วัน')&&list().includes('วันสั่งจริง พุธ')));
  out.push('ชุดหน้ามาพฤหัส 1 ต.ค. → ต้องเผื่อ 7 วัน = 42: '+(ff.nx==='2026-10-01'&&r2.cov.days===7&&r2.need===42));
  out.push('ผักกาด: นับได้ 10 − ใช้ระหว่างรอ (พุธ) 6 = เหลือ 4 → สั่ง 38: '
    +(r2.pre.sum===6&&r2.left===4&&r2.order===38));
  out.push('CPF (สั่งล่วงหน้า 0) วันอังคารยังไม่ถึงรอบ → ไม่ขึ้นให้สั่ง: '+(cpf.d===''));
  out.push('ใบสั่งไลน์ของ FarmFresh ใช้ยอดเดียวกับหน้าจอ: '+w.orderText('FarmFresh').includes('ผักกาด — 38 กก.'));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
