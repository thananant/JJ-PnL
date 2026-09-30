// เทสวันหยุดพิเศษกับ calcPay ตัวจริงใน jjmk-payroll.html (jsdom + Supabase ปลอม)
// ส่วน A = ล็อกพฤติกรรมเดิมของหน้า 🎌 (ต้องผ่านกับไฟล์ที่ยังไม่แก้) — เจ้าของสั่ง 2026-09-29: วันจ่ายค่าแรงจากปฏิทินใช้กฎเดิมทุกข้อ
// ส่วน B = การ์ด "📅 จากปฏิทิน รอยืนยัน" (calDayDiff / ยืนยัน / ไม่ใช้) — ข้ามถ้ายังไม่มีฟังก์ชัน
// ส่วน C = วันหยุดใช้กับใคร (holidays.scope — เจ้าของสั่ง 2026-09-30: ปฏิทินแยก 🏢 ออฟฟิศหยุด / 💰 ค่าแรง ×2 · ออฟฟิศ = สาขา OFFICE)
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
/* Supabase ปลอม: จดทุกคำสั่งเขียน + ตอบตามที่ตั้งไว้ใน w.__resp */
function mkDb(w){
  return { from:(tbl)=>{ const st={tbl,op:'select',body:null,filters:[],opts:null};
    const res=()=>{ const r=(w.__resp||(()=>null))(st); return r||{data:st.op==='select'?[]:(st.body&&!Array.isArray(st.body)?[st.body]:[]),error:null}; };
    const b=new Proxy(function(){},{get:(t,k)=>{
      if(k==='then')return (ok,er)=>{ if(st.op!=='select')(w.__writes=w.__writes||[]).push(JSON.parse(JSON.stringify(st))); return Promise.resolve(res()).then(ok,er); };
      if(['insert','update','upsert','delete'].includes(k))return (body,opts)=>{st.op=k;st.body=body===undefined?null:body;st.opts=opts||null;return b;};
      if(['eq','neq','gte','lte','in','is','not','or','match'].includes(k))return (...a)=>{st.filters.push([k,...a]);return b;};
      return ()=>b; }, apply:()=>b}); return b; },
    channel:()=>new Proxy(function(){},{get:()=>()=>({subscribe(){return this;},on(){return this;}})}), rpc:()=>Promise.resolve({data:null,error:null}), removeChannel(){} };
}
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html#holi',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>mkDb(w)}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; }});
const w=dom.window; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
setTimeout(async()=>{ try{
  E(`settings.cutDay=25; settings.payDay=5; settings.advDay=15; settings.monthDiv=30; settings.depStart='2099-01'; settings.mustWorkDays='5,6,0';
     var st={id:2,code:'ST',nick:'ร้าน',branch:'JJLP',type:'monthly',rate:18000,mode:'shift',active:true,offCount:0,offWd:'',holidayPay:true,depOn:false,depTarget:0,mustWorkExempt:false};
     var of={id:1,code:'OF',nick:'ออฟ',branch:'OFFICE',type:'monthly',rate:18000,mode:'shift',active:true,offCount:0,offWd:'0',holidayPay:false,depOn:false,depTarget:0};
     var hr={id:3,code:'HR',nick:'ชม',branch:'JJLP',type:'hourly',rate:60,mode:'hourly',active:true,offCount:0,offWd:'',holidayPay:true,depOn:false,depTarget:0};
     employees=[st,of,hr];
     function sh(day,o){ return Object.assign({day,in:'10:00',out:'19:00',hours:9,fullHours:8,single:false,lateMin:0,earlyMin:0,shortMin:0,missMin:0},o||{}); }
     function mk(from,to,skip,over){ const a=[]; for(let d=new Date(from+'T12:00:00'); localYMD(d)<=to; d.setDate(d.getDate()+1)){ const k=localYMD(d); if((skip||[]).includes(k))continue; a.push(sh(k,(over||{})[k])); } return a; }`);
  const C=(e,p)=>JSON.parse(E(`(function(){const x=calcPay(${e},'${p}');return JSON.stringify({net:x.net,holiBonus:x.holiBonus,holiDays:x.holiDays,paidHoli:x.paidHoli.map(h=>h.day),holiWorked:x.holiWorked.map(h=>h.day),mustViol:x.mustViol.map(v=>v.day),mustFine:x.mustFine,days:x.days,dRate:x.dRate});})()`));
  console.log('A · กฎเดิมของหน้า 🎌 (ล็อกไว้ก่อนแก้)');
  // งวด ส.ค. 2569 (26 ก.ค.–25 ส.ค.) · 12 ส.ค. = วันแม่ (พุธ)
  E(`holidays={'2026-08-12':{name:'วันแม่',mult:2,id:1}}; shifts={ST:mk('2026-07-26','2026-08-25'),OF:mk('2026-07-26','2026-08-25',['2026-08-12']),HR:mk('2026-07-26','2026-08-25')};`);
  let c=C('st','2026-08');
  ok(c.dRate===600&&c.holiBonus===600&&c.holiDays.length===1&&c.holiDays[0].ok,'หน้าร้านมาทำงานวันแม่ ตรงเวลา ×2 → ได้เพิ่ม 600 (1 เท่าของค่าแรงวัน 600)');
  E(`holidays['2026-08-12'].mult=3;`); c=C('st','2026-08');
  ok(c.holiBonus===1200,'×3 → ได้เพิ่ม 1,200 (2 เท่าของค่าแรงวัน)');
  E(`holidays['2026-08-12'].mult=1.5;`); c=C('st','2026-08');
  ok(c.holiBonus===300,'×1.5 → ได้เพิ่ม 300');
  E(`holidays['2026-08-12'].mult=2; shifts.ST=mk('2026-07-26','2026-08-25',[],{'2026-08-12':{lateMin:7}});`); c=C('st','2026-08');
  ok(c.holiBonus===0&&c.holiDays.length===1&&!c.holiDays[0].ok,'มาสาย 7 นาทีวันแม่ → ไม่ได้เบี้ย (ได้ค่าแรงปกติ)');
  E(`shifts.ST=mk('2026-07-26','2026-08-25',[],{'2026-08-12':{single:true,singleKind:'noOut'}});`); c=C('st','2026-08');
  ok(c.holiBonus===0,'ลืมตอกวันแม่ → ไม่ได้เบี้ย');
  c=C('of','2026-08');
  ok(c.holiBonus===0&&c.paidHoli.length===1&&c.paidHoli[0]==='2026-08-12','ออฟฟิศไม่ได้ ×2 — ไม่มาวันแม่ = นับเป็นวันทำงาน (paidHoli)');
  E(`shifts.OF=mk('2026-07-26','2026-08-25');`); c=C('of','2026-08');
  ok(c.holiBonus===0&&c.holiWorked.length===1&&c.paidHoli.length===0,'ออฟฟิศมาทำงานวันแม่ → แค่แสดงว่ามา ไม่จ่ายเพิ่ม');
  c=C('hr','2026-08');
  ok(c.holiBonus===0&&c.holiDays.length===0,'รายชั่วโมงไม่ได้เบี้ยวันหยุดพิเศษ');
  // วันห้ามหยุด: หน้าร้านขาดวันแม่ (พุธ ไม่ใช่ ศ-ส-อา) → หัก 2 เท่า = 1,200
  E(`shifts.ST=mk('2026-07-26','2026-08-25',['2026-08-12']);`); c=C('st','2026-08');
  ok(c.mustViol.includes('2026-08-12')&&c.mustFine===1200,'หน้าร้านขาดวันแม่ = วันห้ามหยุด → หัก 1,200 (2 เท่าค่าแรงวัน) · ได้ '+c.mustFine);
  E(`holidays={};`); c=C('st','2026-08');
  ok(!c.mustViol.includes('2026-08-12')&&c.mustFine===0,'ไม่มีวันหยุดพิเศษ → ขาดวันพุธไม่โดนหัก');
  // วันหยุดวันที่ 26–31 ตกงวดถัดไปของหน้าร้าน
  E(`holidays={'2026-08-28':{name:'x',mult:2,id:2}}; shifts.ST=mk('2026-07-26','2026-09-25');`);
  ok(C('st','2026-08').holiBonus===0&&C('st','2026-09').holiBonus===600,'วันหยุด 28 ส.ค. อยู่งวด ก.ย. ของหน้าร้าน');

  console.log('B · การ์ด "📅 จากปฏิทิน รอยืนยัน" (ปฏิทินแยก 🏢 ออฟฟิศหยุด / 💰 ค่าแรง ×2)');
  if(E(`typeof calDayDiff`)!=='function'){ console.log('  (ยังไม่มี calDayDiff — ข้ามส่วน B)'); }
  else {
    E(`holiCalReady=true; holiScopeReady=true;`);
    const D=(row,h)=>JSON.parse(E(`(function(){ holidays=${JSON.stringify(h||{})}; return JSON.stringify(calDayDiff(${JSON.stringify(row)})); })()`));
    const P=(id,name,from,to,m,o)=>Object.assign({id,name,kind:'pay',day_from:from,day_to:to,pay_multiplier:m,pay_status:'pending',cancelled:false},o||{});
    const O=(id,name,from,to,o)=>Object.assign({id,name,kind:'office',day_from:from,day_to:to,pay_multiplier:null,pay_status:'pending',cancelled:false},o||{});
    const H=(day,name,mult,scope,id,calId)=>({day,name,mult,scope,id,calId:calId||null});
    let d=D(P('a','สงกรานต์','2027-04-13','2027-04-15',2));
    ok(d.adds.length===3&&d.adds.every(x=>x.scope==='store'&&x.mult===2)&&d.adds[0].key==='2027-04-13|store','💰 วันใหม่ 3 วัน → เพิ่มแถวหน้าร้าน 3 แถว');
    d=D(O('b','วันจักรี','2027-04-06','2027-04-06'));
    ok(d.adds.length===1&&d.adds[0].scope==='office'&&d.adds[0].key==='2027-04-06|office','🏢 วันออฟฟิศหยุด → เพิ่มแถวออฟฟิศ');
    d=D(P('a','สงกรานต์','2027-04-13','2027-04-14',3),{'2027-04-13|store':H('2027-04-13','สงกรานต์',2,'store',5,'a'),'2027-04-14|store':H('2027-04-14','สงกรานต์',2,'store',6,'a'),'2027-04-15|store':H('2027-04-15','สงกรานต์',2,'store',7,'a')});
    ok(d.changes.length===2&&d.changes[0].to.mult===3&&d.removes.length===1&&d.removes[0].id===7,'แก้เป็น ×3 และตัดวันที่ 15 → เปลี่ยน 2 เอาออก 1 (เฉพาะแถวของรายการนี้)');
    d=D(P('a','สงกรานต์','2027-04-13','2027-04-15',2,{cancelled:true}),{'2027-04-13|store':H('2027-04-13','สงกรานต์',2,'store',5,'a'),'2027-04-14|store':H('2027-04-14','ตั้งเอง',3,'store',6,null),'2027-04-15|store':H('2027-04-15','สงกรานต์',2,'store',7,'a'),'2027-04-13|office':H('2027-04-13','สงกรานต์',2,'office',8,'zz')});
    ok(d.removes.length===2&&!d.removes.some(r=>r.id===6||r.id===8),'ยกเลิก → เอาออกเฉพาะแถวของรายการนี้ (แถวที่ตั้งเอง / ของปฏิทินออฟฟิศ ไม่แตะ)');
    d=D(O('b','วันจักรี','2027-04-06','2027-04-06'),{'2027-04-06|office':H('2027-04-06','วันจักรี',2,'office',9,null)});
    ok(d.changes.length===1&&d.changes[0].link===true,'มีแถวตั้งเองค่าเดียวกันอยู่แล้ว → แค่ผูกกับปฏิทิน (🔗)');
    d=D(P('a','วันแม่','2027-08-12','2027-08-12',2),{'2027-08-12|store':H('2027-08-12','วันแม่',2,'store',9,'a')});
    ok(!d.adds.length&&!d.changes.length&&!d.removes.length,'ตรงกับหน้า 🎌 อยู่แล้ว → ไม่มีอะไรต้องเปลี่ยน');
    // ย้ายจากรุ่นก่อน (แถว "ทั้งคู่" ที่ยืนยันไว้ไม่มี cal_id) → แยกเป็นแถวหน้าร้าน + แถวออฟฟิศ แล้วเอาแถวทุกคนเดิมออก
    const legacy={days:['2027-04-13'],mult:2,name:'สงกรานต์',scope:'all'}, h0={'2027-04-13':H('2027-04-13','สงกรานต์',2,'all',11,null)};
    d=D(P('p','สงกรานต์','2027-04-13','2027-04-13',2,{pay_status:'confirmed',pay_snapshot:legacy}),h0);
    ok(d.adds.length===1&&d.adds[0].key==='2027-04-13|store'&&d.removes.length===1&&d.removes[0].id===11,'รุ่นก่อน (💰 ทั้งคู่) → เพิ่มแถวหน้าร้าน + เอาแถวทุกคนเดิมออก');
    d=D(O('o','สงกรานต์','2027-04-13','2027-04-13',{pay_status:'confirmed',pay_snapshot:legacy}),h0);
    ok(d.adds.length===1&&d.adds[0].key==='2027-04-13|office'&&d.removes.length===1,'รุ่นก่อน (🏢 แถวที่แยกออกมา) → เพิ่มแถวออฟฟิศ + เอาแถวทุกคนเดิมออก');
    E(`holidays=${JSON.stringify(h0)}; calDays=[${JSON.stringify(P('p','สงกรานต์','2027-04-13','2027-04-13',2,{pay_status:'confirmed',pay_snapshot:legacy}))}]; calDaysReady=true;`);
    ok(E(`calPending().length`)===1,'รายการที่ยืนยันไว้ก่อนแยกปฏิทิน ขึ้นการ์ดให้ยืนยันอีกครั้ง');
    // ยืนยันจริง
    E(`holidays={}; calDays=[${JSON.stringify(P('r1','สงกรานต์','2027-04-13','2027-04-14',2,{updated_at:'2026-09-29T10:00:00+00:00'}))}];
       __writes=[]; __resp=(st)=>{ if(st.tbl==='cal_special_days'&&st.op==='update')return {data:[{id:'r1'}],error:null};
         if(st.tbl==='holidays'&&st.op==='upsert')return {data:(Array.isArray(st.body)?st.body:[st.body]).map((b,i)=>Object.assign({id:100+i},b)),error:null}; return null; };`);
    await E(`calConfirm('r1')`);
    let W=JSON.parse(E(`JSON.stringify(__writes)`)), cal=W.find(x=>x.tbl==='cal_special_days'), hol=W.find(x=>x.tbl==='holidays'&&x.op==='upsert');
    ok(cal&&cal.body.pay_status==='confirmed'&&cal.filters.some(f=>f[1]==='updated_at'),'ยืนยัน → ปฏิทินเป็น confirmed แบบมีเงื่อนไข updated_at');
    ok(cal&&cal.body.pay_snapshot.v===2&&cal.body.pay_snapshot.kind==='pay'&&JSON.stringify(cal.body.pay_snapshot.days)==='["2027-04-13","2027-04-14"]','เก็บ snapshot รุ่น 2 (ปฏิทินไหน + วัน)');
    ok(hol&&hol.body.length===2&&hol.body.every(b=>b.scope==='store'&&b.cal_id==='r1'&&b.multiplier===2)&&hol.opts.onConflict==='day,scope','เขียน holidays 2 แถว หน้าร้าน ×2 + cal_id (ไม่ซ้ำตาม วัน+scope)');
    ok(E(`!!holidays['2027-04-13|store']&&holidays['2027-04-13|store'].calId==='r1'`)===true,'หน้าเงินเดือนเห็นแถวใหม่ทันที');
    // 🏢 + 💰 วันเดียวกัน = 2 แถว
    E(`calDays=[${JSON.stringify(O('r9','สงกรานต์','2027-04-13','2027-04-13',{updated_at:'t'}))}]; __writes=[];
       __resp=(st)=>{ if(st.tbl==='cal_special_days'&&st.op==='update')return {data:[{id:'r9'}],error:null};
         if(st.tbl==='holidays'&&st.op==='upsert')return {data:(Array.isArray(st.body)?st.body:[st.body]).map((b,i)=>Object.assign({id:200+i},b)),error:null}; return null; };`);
    await E(`calConfirm('r9')`);
    ok(E(`!!holidays['2027-04-13|store']&&!!holidays['2027-04-13|office']`)===true,'ยืนยัน 🏢 วันเดียวกับ 💰 → มีทั้งแถวหน้าร้านและแถวออฟฟิศ');
    // ปฏิทินถูกแก้พร้อมกัน → ห้ามเขียน holidays
    E(`holidays={}; calDays=[${JSON.stringify(P('r2','x','2027-05-01','2027-05-01',2,{updated_at:'old'}))}];
       __writes=[]; __resp=(st)=>st.tbl==='cal_special_days'&&st.op==='update'?{data:[],error:null}:null;`);
    await E(`calConfirm('r2')`);
    ok(!JSON.parse(E(`JSON.stringify(__writes)`)).some(x=>x.tbl==='holidays'),'ปฏิทินถูกแก้พร้อมกัน → ไม่เขียน holidays');
    // ยังไม่รัน SQL รุ่น 3 ปฏิทิน → ยืนยันไม่ได้
    E(`holiCalReady=false; calDays=[${JSON.stringify(P('r5','y','2027-05-02','2027-05-02',2,{updated_at:'t'}))}]; __writes=[]; __resp=null;`);
    await E(`calConfirm('r5')`);
    ok(JSON.parse(E(`JSON.stringify(__writes)`)).length===0,'ยังไม่รัน SQL (ไม่มี holidays.cal_id) → ไม่ยืนยัน ไม่เขียนอะไร');
    E(`holiCalReady=true;`);
    // ไม่ใช้
    E(`calDays=[${JSON.stringify(P('r3','y','2027-06-01','2027-06-01',2,{updated_at:'t'}))}];
       __writes=[]; __resp=(st)=>st.tbl==='cal_special_days'?{data:[{id:'r3'}],error:null}:null;`);
    await E(`calDecline('r3')`);
    const W3=JSON.parse(E(`JSON.stringify(__writes)`));
    ok(W3.length===1&&W3[0].body.pay_status==='declined'&&!W3.some(x=>x.tbl==='holidays'),'ไม่ใช้ → ปฏิทินเป็น declined · ไม่แตะ holidays');
    E(`PERM={holi:'v'}; __writes=[]; __resp=null;`);
    ok(E(`calCanAct()`)===false,'สิทธิ์ดูอย่างเดียว → ไม่มีปุ่มยืนยัน');
    E(`PERM=null;`);
    // พรีวิวเงิน
    E(`holidays={}; employees=[st,of,hr]; shifts={ST:mk('2026-07-26','2026-08-25'),OF:mk('2026-07-26','2026-08-25',['2026-08-12']),HR:mk('2026-07-26','2026-08-25')};`);
    let pv=JSON.parse(E(`JSON.stringify(calPreview(${JSON.stringify(P('p','วันแม่','2026-08-12','2026-08-12',2))}))`));
    let aug=pv.past.find(x=>x.p==='2026-08');
    ok(aug&&aug.plus===600&&aug.nPlus===1&&aug.minus===0,'พรีวิว 💰 วันที่ผ่านมา: งวด ส.ค. หน้าร้าน +600 (1 คน) → '+JSON.stringify(pv.past));
    ok(E(`Object.keys(holidays).length`)===0,'พรีวิวแล้วคืนค่า holidays เดิม');
    pv=JSON.parse(E(`JSON.stringify(calPreview(${JSON.stringify(O('o','วันแม่','2026-08-12','2026-08-12'))}))`));
    ok(!pv.past.some(x=>x.plus>0),'พรีวิว 🏢 วันที่ผ่านมา: ไม่มีใครได้เงินเพิ่ม (ออฟฟิศรายเดือนได้หยุดนับเป็นวันทำงาน) → '+JSON.stringify(pv.past));
    let pf=JSON.parse(E(`JSON.stringify(calPreview(${JSON.stringify(P('f','สิ้นปี','2099-12-31','2099-12-31',2))}))`));
    ok(pf.fut&&pf.fut.days===1&&pf.fut.store===1&&pf.fut.office===0&&pf.fut.maxBonus===600,'พรีวิว 💰 วันข้างหน้า: หน้าร้าน 1 คน +600 · ออฟฟิศไม่เกี่ยว · รายชั่วโมงไม่นับ → '+JSON.stringify(pf.fut));
    pf=JSON.parse(E(`JSON.stringify(calPreview(${JSON.stringify(O('f','สิ้นปี','2099-12-31','2099-12-31'))}))`));
    ok(pf.fut&&pf.fut.days===1&&pf.fut.store===0&&pf.fut.office===1&&pf.fut.maxBonus===0,'พรีวิว 🏢 วันข้างหน้า: ออฟฟิศ 1 คนได้หยุด · หน้าร้านไม่เกี่ยว → '+JSON.stringify(pf.fut));
  }

  console.log('C · วันหยุดใช้กับใคร (ทุกคน / หน้าร้าน / ออฟฟิศ) + วันเดียวกันหลายแถว');
  if(E(`typeof holiFor`)!=='function'){ console.log('  (ยังไม่มี holiFor — ข้ามส่วน C)'); }
  else {
    E(`var mg={id:4,code:'MG',nick:'ผจก',branch:'JJLP',type:'monthly',rate:18000,mode:'shift',active:true,offCount:0,offWd:'1',holidayPay:false,depOn:false,depTarget:0,mustWorkExempt:true};
       employees=[st,of,hr,mg];
       shifts={ST:mk('2026-07-26','2026-08-25'),OF:mk('2026-07-26','2026-08-25',['2026-08-12']),HR:mk('2026-07-26','2026-08-25'),MG:mk('2026-07-26','2026-08-25',['2026-08-12'])};`);
    E(`holidays={'2026-08-12|store':{day:'2026-08-12',name:'วันแม่',mult:2,id:1,scope:'store'}};`);
    let c=C('st','2026-08');
    ok(c.holiBonus===600,'🏪 หน้าร้าน: หน้าร้านมาทำงาน ตรงเวลา → ได้เพิ่ม 600 เหมือนเดิม');
    c=C('of','2026-08');
    ok(c.paidHoli.length===0&&c.holiWorked.length===0,'🏪 หน้าร้าน: ออฟฟิศ (สาขา OFFICE) ไม่ได้หยุด — ขาดวันนั้น = ขาดงานปกติ');
    c=C('mg','2026-08');
    ok(c.paidHoli.length===1,'🏪 หน้าร้าน: คนสาขาหน้าร้านที่ปิดสวิตช์เบี้ย (ผู้จัดการ) ยังได้หยุดนับเป็นวันทำงานตามสวิตช์เดิม');
    E(`shifts.ST=mk('2026-07-26','2026-08-25',['2026-08-12']);`); c=C('st','2026-08');
    ok(c.mustViol.includes('2026-08-12')&&c.mustFine===1200,'🏪 หน้าร้าน: หน้าร้านขาด = วันห้ามหยุด หัก 1,200 เหมือนเดิม');
    E(`holidays={'2026-08-12|office':{day:'2026-08-12',name:'วันแม่',mult:2,id:1,scope:'office'}};`);
    c=C('st','2026-08');
    ok(!c.mustViol.includes('2026-08-12')&&c.mustFine===0&&c.holiBonus===0,'🏢 ออฟฟิศ: หน้าร้านขาดวันนั้น = ไม่ใช่วันห้ามหยุด ไม่โดนหัก');
    E(`shifts.ST=mk('2026-07-26','2026-08-25');`); c=C('st','2026-08');
    ok(c.holiBonus===0&&c.holiDays.length===0,'🏢 ออฟฟิศ: หน้าร้านมาทำงาน = วันปกติ ไม่ได้ ×2');
    c=C('of','2026-08');
    ok(c.paidHoli.length===1&&c.paidHoli[0]==='2026-08-12','🏢 ออฟฟิศ: ออฟฟิศไม่มา = ได้หยุดนับเป็นวันทำงาน');
    c=C('mg','2026-08');
    ok(c.paidHoli.length===0,'🏢 ออฟฟิศ: คนสาขาหน้าร้านที่ปิดสวิตช์เบี้ย ไม่ได้หยุดวันออฟฟิศ (นับตามสาขา OFFICE เท่านั้น)');
    // วันเดียวกันอยู่ทั้ง 🏢 และ 💰 = เหมือน "ทุกคน" แบบเดิมทุกบาท
    E(`holidays={'2026-08-12|store':{day:'2026-08-12',name:'วันแม่',mult:2,id:1,scope:'store'},'2026-08-12|office':{day:'2026-08-12',name:'วันแม่',mult:2,id:2,scope:'office'}}; shifts.ST=mk('2026-07-26','2026-08-25',['2026-08-12']);`);
    const both=[C('st','2026-08'),C('of','2026-08'),C('mg','2026-08')].map(x=>x.net);
    E(`holidays={'2026-08-12':{name:'วันแม่',mult:2,id:1}};`);
    const all0=[C('st','2026-08'),C('of','2026-08'),C('mg','2026-08')].map(x=>x.net);
    ok(JSON.stringify(both)===JSON.stringify(all0),'🏢+💰 วันเดียวกัน = ยอดเงินเท่ากับวันหยุดแบบเดิม (ทุกคน) ทุกบาท');
    // แถวทุกคน + แถวเจาะจงกลุ่มวันเดียวกัน → แถวเจาะจงชนะ · ไม่นับซ้ำ
    E(`holidays={'2026-08-12':{day:'2026-08-12',name:'เดิม',mult:2,id:1,scope:'all'},'2026-08-12|store':{day:'2026-08-12',name:'ใหม่',mult:3,id:2,scope:'store'},'2026-08-12|office':{day:'2026-08-12',name:'ออฟ',mult:2,id:3,scope:'office'}}; shifts.ST=mk('2026-07-26','2026-08-25');`);
    c=C('st','2026-08');
    ok(c.holiBonus===1200,'แถวหน้าร้าน ×3 ชนะแถวทุกคน ×2 (เจาะจงกว่า) → ได้เพิ่ม 1,200');
    c=C('of','2026-08');
    ok(c.paidHoli.length===1,'วันเดียวมี 3 แถว → ออฟฟิศนับวันหยุดครั้งเดียว (ไม่ซ้ำ)');
    // หน้า 🎌
    E(`holiScopeReady=true; holiCalReady=true; holidays={}; __writes=[]; __resp=(st)=>st.tbl==='holidays'?{data:Object.assign({id:77},st.body),error:null}:null;
       document.getElementById('hId').value=''; document.getElementById('hDay').value='2027-10-23'; document.getElementById('hName').value='ปิยะ';
       document.getElementById('hMult').value='2'; document.getElementById('hScope').value='office';`);
    await E(`saveHoli()`);
    let hw=JSON.parse(E(`JSON.stringify(__writes)`)).find(x=>x.tbl==='holidays');
    ok(hw&&hw.body.scope==='office'&&hw.opts&&hw.opts.onConflict==='day,scope'&&E(`holidays['2027-10-23|office'].scope`)==='office','หน้า 🎌: เลือก 🏢 ออฟฟิศ → บันทึก scope=office (ไม่ซ้ำตาม วัน+scope)');
    E(`holiScopeReady=false; holiCalReady=false; __writes=[]; document.getElementById('hDay').value='2027-10-24';`);
    await E(`saveHoli()`);
    hw=JSON.parse(E(`JSON.stringify(__writes)`)).find(x=>x.tbl==='holidays');
    ok(hw&&!('scope' in hw.body)&&hw.opts.onConflict==='day','หน้า 🎌: ยังไม่รัน SQL → ไม่ส่งช่อง scope · ไม่ซ้ำตามวันแบบเดิม');
    E(`holiScopeReady=true; holiCalReady=true; holidays={'2027-10-23|office':{day:'2027-10-23',name:'ปิยะ',mult:2,id:77,scope:'office',calId:'c1'},'2027-10-23|store':{day:'2027-10-23',name:'ปิยะ',mult:2,id:78,scope:'store'}};
       document.getElementById('holiYear').dataset.pick='2027'; renderHoli();`);
    const cell=E(`document.getElementById('holiTable').textContent`);
    ok(/ออฟฟิศ/.test(cell)&&/ได้หยุด/.test(cell)&&/หน้าร้าน/.test(cell)&&/📅/.test(cell)&&E(`document.querySelectorAll('#holiTable tbody tr').length`)===2,'ตารางหน้า 🎌 โชว์วันเดียวกัน 2 แถว (🏢 ได้หยุด / 🏪 ×2) + ป้าย 📅 แถวจากปฏิทิน');
    E(`openHoliForm('2027-10-23|store')`);
    ok(E(`document.getElementById('hDay').value`)==='2027-10-23'&&E(`document.getElementById('hScope').value`)==='store','กดแก้ไขแถวหน้าร้าน → ฟอร์มได้วันและกลุ่มถูก');
  }
}catch(e){ console.log('CRASH',e.stack||e.message); fail++; }
 console.log(errs.length?('jsdom errors: '+errs.slice(0,3).join(' | ')):'');
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
