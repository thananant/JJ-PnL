// ord02: โฟลว์หน้าจอ JJ สั่งของ — นับ (upsert) → สั่ง (การ์ดซัพ + สร้างใบสั่ง + ข้อความ LINE + ส่งแล้ว) → รับของ
// fixture เดียวกับ ord01 ข้อ F: หมู อัตรา 10/12/15 ถุง · 6 ถุง/ลัง · นับ พ2 = 20 · ค้างส่ง พฤ3 = 6 (ใบสั่ง #90 sent) → สั่ง 18 ถุง = 3 ลัง
const fs=require('fs'); const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-order.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const D='2026-09-02';
const sups=[{id:5,name:'สมายมีท',sched:{type:'map',map:{'1':3,'3':5,'5':6,'6':1}},lead_ok:true,contact:'',note:'',active:true,sort:1},
  {id:6,name:'โค้ก',sched:{type:'days',days:[1],lead:1},lead_ok:true,contact:'',note:'',active:true,sort:2}]; // สั่งได้เฉพาะจันทร์ -> วันพุธยังไม่ถึงรอบ
const prods=[
 {id:1,branch:'JJRD',name:'หมู',bill_name:'หมูสามชั้น',name_en:'Pork',name_lo:'ໝູ',name_my:'',dept:'ของสด',unit:'ถุง',supplier_id:5,pack_qty:6,pack_unit:'ลัง',order_step:null,order_unit:'',rate:{g0:10,g1:12,g2:15},safety_days:null,max_old:null,active:true,sort:1},
 {id:2,branch:'JJRD',name:'ผัก',bill_name:'ผัก',name_en:'Veg',name_lo:'',name_my:'',dept:'ผัก',unit:'โล',supplier_id:5,pack_qty:null,pack_unit:'',rate:null,max_old:10,active:true,sort:2},
 {id:3,branch:'JJRD',name:'Coke',bill_name:'โค้ก กล่อง',name_en:'Coke',name_lo:'',name_my:'',dept:'บาร์น้ำ',unit:'กล่อง',supplier_id:6,pack_qty:1,pack_unit:'กล่อง',rate:{g0:1,g1:1,g2:1},max_old:null,active:true,sort:3}];
let counts=[{id:1,branch:'JJRD',product_id:1,d:D,qty:20,out_of_stock:false}];
let orders=[{id:90,branch:'JJRD',supplier_id:5,order_date:'2026-09-01',deliver_date:'2026-09-03',status:'sent',note:'',ord_order_items:[{id:900,order_id:90,product_id:1,qty:6,packs:1,received_qty:null}]}];
let nextId=100; const log=[];
const vc=new JSDOM(html,{runScripts:'dangerously',url:'https://x.test/',beforeParse(w){
  w.fetch=async(url,opt)=>{ url=url.replace(/^.*\/rest\/v1\//,''); const m=(opt&&opt.method)||'GET'; const body=opt&&opt.body?JSON.parse(opt.body):null; const T=v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
    if(m!=='GET')log.push({m,url,body});
    if(m==='GET'){ if(url.includes('ord_products'))return T(prods); if(url.includes('ord_suppliers'))return T(sups); if(url.includes('ord_holidays'))return T([]);
      if(url.includes('ord_counts'))return T(counts); if(url.includes('ord_orders'))return T(orders); if(url.includes('ord_settings'))return T([{key:'pin',val:'1234'},{key:'safety_days',val:1}]); return T([]); }
    if(m==='POST'&&url.startsWith('ord_counts')){ body.forEach(r=>{ const i=counts.findIndex(c=>c.d===r.d&&c.product_id===r.product_id); const row={id:i>=0?counts[i].id:nextId++,...r}; if(i>=0)counts[i]=row; else counts.push(row); }); return T(body.map(r=>counts.find(c=>c.d===r.d&&c.product_id===r.product_id))); }
    if(m==='POST'&&url.startsWith('ord_orders')){ const rows=body.map(r=>({id:nextId++,...r,ord_order_items:[]})); orders.push(...rows); return T(rows); }
    if(m==='POST'&&url.startsWith('ord_order_items?on_conflict=id')){ body.forEach(r=>{ orders.forEach(o=>(o.ord_order_items||[]).forEach(it=>{ if(it.id===r.id)Object.assign(it,r); })); }); return T(body); }
    if(m==='POST'&&url.startsWith('ord_order_items')){ const rows=body.map(r=>({id:nextId++,...r})); rows.forEach(r=>{ const o=orders.find(x=>x.id===r.order_id); if(o)o.ord_order_items.push(r); }); return T(rows); }
    if(m==='PATCH'&&url.startsWith('ord_orders')){ const id=+url.match(/id=eq\.(\d+)/)[1]; const o=orders.find(x=>x.id===id); if(o)Object.assign(o,body); return T([o]); }
    return T([]); };
  w.confirm=()=>true; w.navigator.clipboard={writeText:async t=>{ w._copied=t; }};
  w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
}});
const w=vc.window,d=w.document; const out=[]; const T=(l,ok)=>out.push(l+': '+ok); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  await sleep(500);
  w.S.D=D; w.S.countD=D; await w.reload(); await w.show('count'); await sleep(200);
  // 1) หน้านับ
  let t=d.getElementById('view').textContent;
  T('หน้านับ: แผนก + ชื่อ + 🧾 ชื่อบิล + นับแล้ว 1/3',t.includes('ของสด')&&t.includes('หมู')&&t.includes('🧾 หมูสามชั้น')&&t.includes('นับแล้ว 1/3'));
  const chips=[...d.querySelectorAll('.dchip')].map(c=>c.textContent.replace(/\s+/g,' ').trim());
  T('แถบหมวด: ทั้งหมด 3 · ของสด 1 ✓ (นับครบ) · ผัก 1 · บาร์น้ำ 1',chips.some(c=>c.startsWith('ทั้งหมด')&&c.includes('3'))&&chips.some(c=>c.includes('ของสด')&&c.includes('✓'))&&chips.some(c=>c.includes('ผัก'))&&chips.some(c=>c.includes('บาร์น้ำ')));
  T('Coke ซัพยังไม่ถึงรอบวันนี้ → ซ่อนการ์ด + แจ้ง "1 รายการยังไม่ถึงรอบสั่งวันนี้"',!d.getElementById('cr3')&&t.includes('1 รายการยังไม่ถึงรอบสั่งวันนี้')&&t.includes('โค้ก'));
  w.S._showND={'บาร์น้ำ':true}; await w.show('count'); T('กด "ดูรายการ" → การ์ด Coke โผล่แบบจาง',!!d.getElementById('cr3')&&d.getElementById('cr3').classList.contains('notdue')); w.S._showND=null; await w.show('count');
  w.S._dept='ผัก'; await w.show('count'); T('กดหมวดผัก → เห็นเฉพาะผัก',!!d.getElementById('cr2')&&!d.getElementById('cr1')); w.S._dept=null; await w.show('count');
  w.cntFilter('หมู'); T('ค้นหา "หมู" → ซ่อนผัก โชว์หมู',d.getElementById('cr1').style.display!=='none'&&d.getElementById('cr2').style.display==='none'); w.cntFilter('');
  T('แถวหมูมีค่านับ 20 (saved) · แถวผักว่าง',d.getElementById('cr1').classList.contains('saved')&&d.getElementById('cr1').querySelector('input').value==='20'&&!d.getElementById('cr2').classList.contains('saved'));
  w.S.lang='en'; await w.show('count'); T('สลับภาษา EN: ชื่อ Pork ขึ้น + ชื่อไทยเป็นบรรทัดรอง',d.getElementById('view').textContent.includes('Pork')&&d.getElementById('cr1').querySelector('.sub').textContent.includes('หมู')); w.S.lang='th'; await w.show('count');
  await w.cntSave(2,'4',false); await sleep(50);
  const up=log.find(l=>l.m==='POST'&&l.url.startsWith('ord_counts'));
  T('บันทึกนับผัก 4 → upsert on_conflict=branch,d,product_id',!!up&&up.url.includes('on_conflict=branch,d,product_id')&&up.body[0].product_id===2&&up.body[0].qty===4&&up.body[0].d===D&&up.body[0].branch==='JJRD');
  T('การ์ดผักขึ้น saved + คงเหลือ 4 โล + นับแล้ว 2/3 โดยไม่ re-render ทั้งหน้า',d.getElementById('cr2').classList.contains('saved')&&d.getElementById('crl2').textContent.includes('คงเหลือ 4 โล')&&d.getElementById('cntProg').textContent.includes('2/3'));
  w.cntStep(2,0.5); w.cntStep(2,0.5); await sleep(600);
  T('ปุ่ม + สองครั้ง (หน่วยโล ทีละ 0.5) → 5 บันทึกครั้งเดียวหลังหยุดกด',log.filter(l=>l.url.startsWith('ord_counts')).pop().body[0].qty===5&&d.getElementById('cr2').querySelector('input').value==='5');
  w.cntStep(2,-1); await sleep(600); T('ปุ่ม − → 4',d.getElementById('crl2').textContent.includes('คงเหลือ 4 โล'));
  await w.cntSave(2,0,true); T('กด "หมด" → out_of_stock true qty 0 · แถวเป็น oos',log.filter(l=>l.url.startsWith('ord_counts')).pop().body[0].out_of_stock===true&&d.getElementById('cr2').classList.contains('oos')&&d.getElementById('cr2').querySelector('.stepper .pl').disabled);
  await w.cntSave(2,'4',false);
  // 2) หน้าสั่ง ล็อก PIN
  await w.show('order'); T('หน้าสั่งของล็อก PIN',d.getElementById('view').textContent.includes('PIN'));
  w.mgrLogin('0000','order'); T('PIN ผิดยังล็อก',!w.S.mgr);
  w.mgrLogin('1234','order'); await sleep(100);
  t=d.getElementById('view').textContent;
  T('เข้าได้ · ซัพสมายมีทถึงรอบวันนี้ (สั่ง พ2 → มา ศ4 → รอบถัดไป ส5 · 1 คืน)',w.S.mgr&&t.includes('สมายมีท')&&t.includes('ซัพที่ต้องสั่งวันนี้')&&t.includes('พ 2 ก.ย.')&&t.includes('ศ 4 ก.ย.')&&t.includes('ส 5 ก.ย.')&&t.includes('1 คืน'));
  const qIn=d.querySelector('#sup5 .oqty[data-pid="1"]'), qIn2=d.querySelector('#sup5 .oqty[data-pid="2"]');
  T('หมู: เสนอสั่ง 18 (= 3 ลัง) · ผัก โหมด max: 10−4 = 6',!!qIn&&qIn.value==='18'&&d.querySelector('#sup5 tr[data-pid="1"]').textContent.includes('= 3 ลัง')&&qIn2.value==='6'&&d.querySelector('#sup5 tr[data-pid="2"]').textContent.includes('ใช้ max เดิม'));
  T('เหลือถึงวันส่ง หมู = 6',d.querySelector('#sup5 tr[data-pid="1"]').children[2].textContent.trim()==='6');
  // 3) สร้างใบสั่ง
  qIn2.value='7'; await w.ordCreate(5); await sleep(100);
  const po=log.find(l=>l.m==='POST'&&l.url.startsWith('ord_orders')), pi=log.find(l=>l.m==='POST'&&l.url.startsWith('ord_order_items')&&!l.url.includes('on_conflict'));
  T('POST ใบสั่ง: ซัพ 5 สั่ง 2 ก.ย. ส่ง 4 ก.ย. draft',!!po&&po.body[0].supplier_id===5&&po.body[0].order_date===D&&po.body[0].deliver_date==='2026-09-04'&&po.body[0].status==='draft');
  T('POST รายการ: หมู 18 (3 ลัง) + ผัก 7 (แก้มือ) พร้อม calc',!!pi&&pi.body.length===2&&pi.body[0].qty===18&&pi.body[0].packs===3&&pi.body[0].calc.suggest===18&&pi.body[1].qty===7);
  t=d.getElementById('view').textContent;
  const o=orders.find(x=>x.supplier_id===5&&x.order_date===D&&x.status!=='cancelled'); const oid=o.id;
  T('การ์ดกลายเป็นใบสั่งร่าง',t.includes('ร่าง — ยังไม่ส่ง')&&t.includes('ใบสั่ง #'+oid));
  const lt=w.lineText(o);
  T('ข้อความ LINE: หัว + ซัพ + สาขา + "1. หมู 18 ถุง (3 ลัง)" + "2. ผัก 7 โล" + รวม 2',lt.includes('ซัพ: สมายมีท')&&lt.includes('สาขารัชดา')&&lt.includes('1. หมู 18 ถุง (3 ลัง)')&&lt.includes('2. ผัก 7 โล')&&lt.includes('รวม 2 รายการ'));
  w.ordShowText(oid); await w.copyTxt(d.getElementById('lineTxt').textContent); T('คัดลอกข้อความได้',w._copied&&w._copied.includes('1. หมู 18 ถุง')); w.closeModal();
  await w.ordMarkSent(oid); await sleep(100);
  T('ส่งซัพแล้ว → PATCH status sent + เก็บข้อความ',o.status==='sent'&&!!o.line_text);
  T('ป้ายรับของ = 1 (นับเฉพาะใบที่ของมาวันนี้/พรุ่งนี้: #90 มา พฤ3 · ใบใหม่มา ศ4 ยังไม่นับ)',d.getElementById('bdgRecv').textContent==='1');
  // 4) รับของ
  await w.show('recv'); t=d.getElementById('view').textContent;
  T('หน้ารับของ: ใบ #90 กำหนดส่ง พฤ3 · ใบใหม่กำหนดส่ง ศ4',t.includes('ใบสั่ง #90')&&t.includes('ใบสั่ง #'+oid));
  const rq=d.querySelector('#rc'+oid+' .rq[data-iid]'); rq.value='12'; // หมูมาแค่ 12 จาก 18
  await w.recvSave(oid); await sleep(100);
  const ri=log.find(l=>l.url.startsWith('ord_order_items?on_conflict=id'));
  T('บันทึกรับ: upsert received_qty หมู 12 · ผัก 7 · PATCH received',!!ri&&ri.body.find(r=>r.product_id===1).received_qty===12&&ri.body.find(r=>r.product_id===2).received_qty===7&&o.status==='received');
  t=d.getElementById('view').textContent;
  T('ใบใหม่ย้ายไป "รับแล้ว" พร้อมป้ายขาด 1 ตัว · เหลือรอรับ #90',t.includes('ขาด 1 ตัว')&&t.includes('ใบสั่ง #90')&&!d.getElementById('rc'+oid));
  // 5) ของเข้าที่รับจริง (12 ไม่ใช่ 18) ถูกใช้ในสต๊อกคาดการณ์
  const p1=w.S.data.prodById[1]; T('inflow หมู: ค้างส่ง 6 (พฤ3) + รับจริง 12 (ศ4)',p1._st.inflow.some(f=>f.d==='2026-09-03'&&f.qty===6&&f.pending)&&p1._st.inflow.some(f=>f.d==='2026-09-04'&&f.qty===12&&!f.pending));
  out.push('errors: '+JSON.stringify(w.errors)); console.log(out.join('\n')); process.exit(0);
},500);
