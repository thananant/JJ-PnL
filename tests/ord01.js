// ord01: เครื่องคำนวณของ JJ สั่งของ (jjmk-order.html) — รอบสั่ง-ส่ง / วันหยุด / จำนวนสั่ง / ปัดลัง / เรียนรู้อัตราใช้
// ตัวเลขทุกตัวคำนวณมือไว้ในคอมเมนต์ · วันนี้สมมติ = พ 2 ก.ย. 2569
const fs=require('fs'); const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-order.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new JSDOM(html,{runScripts:'dangerously',url:'https://x.test/',beforeParse(w){
  w.fetch=async(url,opt)=>({ok:true,status:200,text:async()=>'[]',headers:{get:()=>null}});
  w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
}});
const w=vc.window; const out=[]; const T=(l,ok)=>out.push(l+': '+ok); const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
setTimeout(()=>{
  const D='2026-09-02'; // พุธ
  // A) สั่งได้ จ–ศ ส่งวันถัดไป
  let pl=w.orderPlan({type:'days',days:[1,2,3,4,5],lead:1},D,{},1);
  T('days จ–ศ lead1: สั่ง พ2 → มา พฤ3 → รอบถัดไปมา ศ4 · 1 คืน · ถึงรอบวันนี้',pl.orderDate==='2026-09-02'&&pl.L1==='2026-09-03'&&pl.L2==='2026-09-04'&&pl.days===1&&pl.dueToday===true);
  pl=w.orderPlan({type:'days',days:[1,4],lead:1},'2026-09-05',{},1); // เสาร์: ซัพสั่งได้ จ/พฤ → สั่ง จ7 มา อ8 → รอบถัดไป พฤ10 มา ศ11 → 3 คืน
  T('days จ พฤ จากวันเสาร์: สั่ง จ7 มา อ8 รอบถัดไปมา ศ11 · 3 คืน · ยังไม่ถึงรอบ',pl.orderDate==='2026-09-07'&&pl.L1==='2026-09-08'&&pl.L2==='2026-09-11'&&pl.days===3&&!pl.dueToday);
  // B) จับคู่วัน: สั่ง จ ส่ง พ · สั่ง พ ส่ง ศ · สั่ง ศ ส่ง ส · สั่ง ส ส่ง จ
  const MAP={type:'map',map:{'1':3,'3':5,'5':6,'6':1}};
  pl=w.orderPlan(MAP,D,{},1);
  T('map วันพุธ: สั่ง พ2 → มา ศ4 → รอบถัดไป (สั่ง ศ4) มา ส5 · 1 คืน',pl.orderDate==='2026-09-02'&&pl.L1==='2026-09-04'&&pl.od2==='2026-09-04'&&pl.L2==='2026-09-05'&&pl.days===1);
  pl=w.orderPlan(MAP,'2026-09-05',{},1);
  T('map วันเสาร์: สั่ง ส5 → มา จ7 → รอบถัดไป (สั่ง จ7) มา พ9 · 2 คืน',pl.orderDate==='2026-09-05'&&pl.L1==='2026-09-07'&&pl.L2==='2026-09-09'&&pl.days===2);
  pl=w.orderPlan(MAP,'2026-09-06',{},1);
  T('map วันอาทิตย์ (สั่งไม่ได้): เลื่อนไปสั่ง จ7 มา พ9 → รอบถัดไปมา ศ11',pl.orderDate==='2026-09-07'&&pl.L1==='2026-09-09'&&pl.L2==='2026-09-11'&&!pl.dueToday);
  // C) รอบทุก 15 วัน นับจาก 1 ก.ย.
  pl=w.orderPlan({type:'cycle',every:15,anchor:'2026-09-01',lead:1},D,{},1);
  T('cycle 15 วัน: สั่ง 16 ก.ย. มา 17 → รอบถัดไป 1 ต.ค. มา 2 ต.ค. · 15 คืน',pl.orderDate==='2026-09-16'&&pl.L1==='2026-09-17'&&pl.od2==='2026-10-01'&&pl.L2==='2026-10-02'&&pl.days===15);
  T('cycle ตรงวัน anchor = ถึงรอบ',w.orderPlan({type:'cycle',every:15,anchor:'2026-09-01',lead:1},'2026-09-01',{},1).dueToday===true);
  // D) สั่งได้ทุกวัน
  pl=w.orderPlan({type:'any',lead:1},D,{},1);
  T('any lead1: สั่งวันนี้ มา พฤ3 รอบถัดไปมา ศ4 · 1 คืน',pl.orderDate===D&&pl.L1==='2026-09-03'&&pl.L2==='2026-09-04'&&pl.days===1);
  // E) วันหยุด: ซัพ 7 ไม่ส่ง พฤ3 → ของเลื่อนไป ศ4 · รอบถัดไปต้องมาหลังจากนั้น (ส5)
  let H=w.hidx([{d:'2026-09-03',kind:'nodeliv',supplier_id:7,factor:1}]);
  pl=w.orderPlan({type:'days',days:[1,2,3,4,5],lead:1},D,H,7);
  T('ซัพไม่ส่ง พฤ3: ของมา ศ4 · รอบถัดไปมา ส5',pl.L1==='2026-09-04'&&pl.L2==='2026-09-05');
  T('ซัพอื่น (id 8) ไม่โดนวันหยุดของซัพ 7',w.orderPlan({type:'days',days:[1,2,3,4,5],lead:1},D,H,8).L1==='2026-09-03');
  H=w.hidx([{d:'2026-09-04',kind:'closed',factor:1}]);
  pl=w.orderPlan({type:'any',lead:1},D,H,1);
  T('ร้านปิด ศ4: รอบถัดไปรับของไม่ได้ เลื่อนไป ส5 · ของรอบนี้ต้องพอ 2 คืน',pl.L1==='2026-09-03'&&pl.L2==='2026-09-05'&&pl.days===2);
  // F) จำนวนสั่ง: อัตรา จ–พฤ 10 · ศ 12 · ส–อา 15 (ถุง) · 1 ลัง = 6 ถุง · นับ พ2 = 20 · ค้างส่ง พฤ3 อีก 6
  const p={id:1,name:'หมู',unit:'ถุง',pack_qty:6,pack_unit:'ลัง',rate:{g0:10,g1:12,g2:15},_rate:[10,12,15]};
  const st={countD:'2026-09-02',countQ:20,inflow:[{d:'2026-09-03',qty:6}]};
  pl=w.orderPlan(MAP,D,{},1); // มา ศ4 · รอบถัดไปมา ส5
  T('stockBefore ศ4 = 20 + 6 − (พ10 + พฤ10) = 6',near(w.stockBefore(p,st,{},'2026-09-04'),6));
  let c=w.calcOrder(p,pl,st,{},{safetyDays:1});
  T('ต้องใช้ ศ = 12 · safety 1 วัน = 12 · สั่ง 12+12−6 = 18 → 3 ลัง = 18 ถุง',c.mode==='rate'&&near(c.cover,12)&&near(c.safety,12)&&near(c.raw,18)&&c.qty===18&&c.packs===3&&c.warn.length===0);
  c=w.calcOrder(p,pl,st,{},{safetyDays:0.5});
  T('safety 0.5 วัน = 6 → 12 → 2 ลัง',near(c.safety,6)&&c.qty===12&&c.packs===2);
  c=w.calcOrder({...p,safety_days:0},pl,st,{},{safetyDays:1});
  T('safety รายสินค้า = 0 ทับค่ากลาง → 12−6 = 6 → 1 ลัง',c.qty===6&&c.packs===1);
  H=w.hidx([{d:'2026-09-04',kind:'busy',factor:1.5}]);
  c=w.calcOrder(p,pl,st,H,{safetyDays:1});
  T('วันขายดี ศ4 ×1.5: ใช้ 18 + safety 18 − 6 = 30 → 5 ลัง',near(c.cover,18)&&near(c.raw,30)&&c.qty===30&&c.packs===5);
  // G) ของจะขาดก่อนของมา
  c=w.calcOrder(p,pl,{countD:'2026-09-02',countQ:5,inflow:[]},{},{safetyDays:1});
  T('นับ 5: เหลือถึงวันส่ง 5−20 = −15 ⚠ · สั่ง 12+12+15 = 39 → 7 ลัง = 42',near(c.stockL1,-15)&&c.warn.includes('ของอาจขาดก่อนถึงวันส่ง')&&near(c.raw,39)&&c.qty===42&&c.packs===7);
  // H) ไม่มีอัตรา → โหมด max เดิม · หน่วยโล ปัด 0.5
  c=w.calcOrder({id:2,name:'ผัก',unit:'โล',max_old:10,_rate:null},pl,{countD:D,countQ:4,inflow:[]},{},{safetyDays:1});
  T('โหมด max: 10 − 4 = 6 โล',c.mode==='max'&&c.qty===6&&c.packs===null);
  c=w.calcOrder({id:2,name:'ผัก',unit:'โล',max_old:10,_rate:null},pl,{countD:D,countQ:4.8,inflow:[]},{},{});
  T('โล ปัดขึ้น 0.5: 5.2 → 5.5',c.qty===5.5);
  c=w.calcOrder({id:3,name:'x',unit:'ถุง',_rate:null},pl,{countD:D,countQ:1,inflow:[]},{},{});
  T('ไม่มีอัตรา ไม่มี max → เตือนให้ใส่เอง',c.mode==='none'&&c.qty===0&&c.warn.some(x=>x.includes('ใส่จำนวนเอง')));
  T('ยังไม่มีการนับ → เตือน',w.calcOrder(p,pl,{countD:null,countQ:0,inflow:[]},{},{}).warn.includes('ยังไม่มีการนับ'));
  // I) ปัดตามขั้นสั่ง: 12 ขวด/ลัง สั่งทีละ 8 ลัง → 30 ขวด → 3 ลัง → 8 ลัง = 96 ขวด
  let r=w.roundQty({unit:'ขวด',pack_qty:12,pack_unit:'ลัง',order_step:8,order_unit:'ลัง'},30);
  T('ขั้นสั่ง 8 ลัง: 30 ขวด → 8 ลัง = 96',r.qty===96&&r.packs===8);
  r=w.roundQty({unit:'ถุง',order_step:5,order_unit:'ถุง'},7);
  T('ขั้นสั่ง 5 ถุง (หน่วยนับ): 7 → 10',r.qty===10&&r.packs===null);
  r=w.roundQty({unit:'กล่อง',pack_qty:1,pack_unit:'กล่อง'},2.2);
  T('1 กล่อง/แพ็ค: 2.2 → 3 กล่อง = 3 แพ็ค',r.qty===3&&r.packs===3);
  T('สั่ง 0 → 0',w.roundQty(p,0).qty===0&&w.roundQty(p,-3).qty===0);
  // J) เรียนรู้อัตราใช้
  const counts=[{product_id:1,d:'2026-09-01',qty:30},{product_id:1,d:'2026-09-02',qty:22},{product_id:1,d:'2026-09-03',qty:25},{product_id:1,d:'2026-09-04',qty:40},{product_id:1,d:'2026-09-06',qty:10}];
  const inflow=[{product_id:1,d:'2026-09-03',qty:10}];
  const L=w.learnRates(counts,inflow,()=>[10,12,15]);
  // อ1→พ2: 30−22 = 8 (จ–พฤ) · พ2→พฤ3: 22+10−25 = 7 (จ–พฤ) → เฉลี่ย 7.5 · พฤ3→ศ4: 25−40 ติดลบ ข้าม · ศ4→อา6: 30 ถัว ศ 12/27 → 13.333 · ส 15/27 → 16.667
  T('เรียนรู้ จ–พฤ = (8+7)/2 = 7.5 จาก 2 จุด · ศ 13.33 · ส–อา 16.67',near(L[1].avg[0],7.5)&&L[1].n[0]===2&&near(L[1].avg[1],30*12/27)&&near(L[1].avg[2],30*15/27)&&L[1].n[1]===1&&L[1].n[2]===1);
  let er=w.effRate({id:1,rate:{g0:10,g1:12,g2:15}},L[1],4);
  T('ข้อมูลยังน้อย (<4) → ใช้ seed',er.src==='seed'&&er.rate.join()==='10,12,15');
  er=w.effRate({id:1,rate:{g0:10,g1:12,g2:15}},L[1],2);
  T('พอ 2 จุด → จ–พฤ ใช้ค่าเรียนรู้ 7.5 ที่เหลือ seed',er.src==='learned'&&near(er.rate[0],7.5)&&er.rate[1]===12);
  T('ไม่มี seed ไม่มีเรียนรู้ → null',w.effRate({id:9,rate:null},null,4).rate===null);
  T('ข้อความรอบ map',w.schedText(MAP)==='สั่งจ→ส่งพ · สั่งพ→ส่งศ · สั่งศ→ส่งส · สั่งส→ส่งจ');
  out.push('errors: '+JSON.stringify(w.errors)); console.log(out.join('\n')); process.exit(0);
},600);
