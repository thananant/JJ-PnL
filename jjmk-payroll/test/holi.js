// เทสวันหยุดพิเศษกับ calcPay ตัวจริงใน jjmk-payroll.html (jsdom + Supabase ปลอม)
// ส่วน A = ล็อกพฤติกรรมเดิมของหน้า 🎌 (ต้องผ่านกับไฟล์ที่ยังไม่แก้) — เจ้าของสั่ง 2026-09-29: วันจ่ายค่าแรงจากปฏิทินใช้กฎเดิมทุกข้อ
// ส่วน B = การ์ด "📅 จากปฏิทิน รอยืนยัน" (calDayDiff / ยืนยัน / ไม่ใช้) — ข้ามถ้ายังไม่มีฟังก์ชัน
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

  console.log('B · การ์ด "📅 จากปฏิทิน รอยืนยัน"');
  if(E(`typeof calDayDiff`)!=='function'){ console.log('  (ยังไม่มี calDayDiff — ข้ามส่วน B)'); }
  else {
    const D=(row,h)=>JSON.parse(E(`(function(){ holidays=${JSON.stringify(h||{})}; return JSON.stringify(calDayDiff(${JSON.stringify(row)})); })()`));
    let d=D({id:'a',name:'สงกรานต์',day_from:'2027-04-13',day_to:'2027-04-15',pay_multiplier:2,pay_status:'pending',cancelled:false});
    ok(d.adds.length===3&&d.changes.length===0&&d.removes.length===0&&d.adds[0].day==='2027-04-13'&&d.adds[2].mult===2,'วันใหม่ 3 วัน → เพิ่ม 3 วัน');
    d=D({id:'a',name:'สงกรานต์',day_from:'2027-04-13',day_to:'2027-04-14',pay_multiplier:3,pay_status:'pending',cancelled:false,pay_snapshot:{days:['2027-04-13','2027-04-14','2027-04-15'],mult:2,name:'สงกรานต์'}},
      {'2027-04-13':{name:'สงกรานต์',mult:2,id:5},'2027-04-14':{name:'สงกรานต์',mult:2,id:6},'2027-04-15':{name:'สงกรานต์',mult:2,id:7}});
    ok(d.changes.length===2&&d.changes[0].to.mult===3&&d.removes.length===1&&d.removes[0].day==='2027-04-15'&&d.removes[0].id===7,'แก้เป็น ×3 และตัดวันที่ 15 → เปลี่ยน 2 วัน เอาออก 1 วัน');
    d=D({id:'a',name:'สงกรานต์',day_from:'2027-04-13',day_to:'2027-04-15',pay_multiplier:2,cancelled:true,pay_status:'pending',pay_snapshot:{days:['2027-04-13','2027-04-14','2027-04-15'],mult:2,name:'สงกรานต์'}},
      {'2027-04-13':{name:'สงกรานต์',mult:2,id:5},'2027-04-14':{name:'แก้มือในหน้า 🎌',mult:3,id:6},'2027-04-15':{name:'สงกรานต์',mult:2,id:7}});
    ok(d.removes.length===2&&!d.removes.some(r=>r.day==='2027-04-14'),'ยกเลิกในปฏิทิน → เอาออกเฉพาะวันที่ยังตรงกับที่ปฏิทินใส่ (วันที่แก้มือในหน้า 🎌 ไม่แตะ)');
    d=D({id:'a',name:'วันแม่',day_from:'2027-08-12',day_to:'2027-08-12',pay_multiplier:2,pay_status:'pending',cancelled:false},{'2027-08-12':{name:'วันแม่',mult:2,id:9}});
    ok(d.adds.length===0&&d.changes.length===0&&d.removes.length===0,'ตรงกับหน้า 🎌 อยู่แล้ว → ไม่มีอะไรต้องเปลี่ยน');
    // ยืนยันจริง: ต้องเขียน holidays ผ่านตัวดักเดียวกับหน้า 🎌 (จดประวัติ + เช็คสิทธิ์) และติ๊กปฏิทินแบบมีเงื่อนไข
    E(`holidays={}; calDays=[{id:'r1',name:'สงกรานต์',day_from:'2027-04-13',day_to:'2027-04-14',pay_multiplier:2,pay_status:'pending',cancelled:false,updated_at:'2026-09-29T10:00:00+00:00'}]; calDaysReady=true;
       __writes=[]; __resp=(st)=>{ if(st.tbl==='cal_special_days'&&st.op==='update')return {data:[{id:'r1'}],error:null};
         if(st.tbl==='holidays'&&st.op==='upsert')return {data:(Array.isArray(st.body)?st.body:[st.body]).map((b,i)=>Object.assign({id:100+i},b)),error:null}; return null; };`);
    await E(`calConfirm('r1')`);
    const W=JSON.parse(E(`JSON.stringify(__writes)`));
    const cal=W.find(x=>x.tbl==='cal_special_days'), hol=W.find(x=>x.tbl==='holidays'&&x.op==='upsert');
    ok(cal&&cal.body.pay_status==='confirmed'&&cal.filters.some(f=>f[1]==='updated_at'),'ยืนยัน → ปฏิทินเป็น confirmed แบบมีเงื่อนไข updated_at');
    ok(cal&&cal.body.pay_snapshot&&JSON.stringify(cal.body.pay_snapshot.days)==='["2027-04-13","2027-04-14"]','เก็บ snapshot วันที่ยืนยัน');
    ok(hol&&Array.isArray(hol.body)&&hol.body.length===2&&hol.body[0].multiplier===2&&hol.opts&&hol.opts.onConflict==='day','เขียน holidays 2 วัน ×2 (upsert ตามวัน)');
    ok(E(`holidays['2027-04-13']&&holidays['2027-04-13'].mult===2`)===true,'หน้าเงินเดือนเห็นวันใหม่ทันที');
    // ปฏิทินถูกแก้ระหว่างเปิดหน้า → ห้ามเขียน holidays
    E(`holidays={}; calDays=[{id:'r2',name:'x',day_from:'2027-05-01',day_to:'2027-05-01',pay_multiplier:2,pay_status:'pending',cancelled:false,updated_at:'old'}];
       __writes=[]; __resp=(st)=>st.tbl==='cal_special_days'&&st.op==='update'?{data:[],error:null}:null;`);
    await E(`calConfirm('r2')`);
    ok(!JSON.parse(E(`JSON.stringify(__writes)`)).some(x=>x.tbl==='holidays'),'ปฏิทินถูกแก้พร้อมกัน → ไม่เขียน holidays');
    // ไม่ใช้
    E(`calDays=[{id:'r3',name:'y',day_from:'2027-06-01',day_to:'2027-06-01',pay_multiplier:2,pay_status:'pending',cancelled:false,updated_at:'t'}];
       __writes=[]; __resp=(st)=>st.tbl==='cal_special_days'?{data:[{id:'r3'}],error:null}:null;`);
    await E(`calDecline('r3')`);
    const W3=JSON.parse(E(`JSON.stringify(__writes)`));
    ok(W3.length===1&&W3[0].body.pay_status==='declined'&&!W3.some(x=>x.tbl==='holidays'),'ไม่ใช้ → ปฏิทินเป็น declined · ไม่แตะ holidays');
    // ไม่มีสิทธิ์หน้า 🎌 → ตัวดักปฏิเสธ
    E(`PERM={holi:'v'}; __writes=[]; holidays={}; calDays=[{id:'r4',name:'z',day_from:'2027-07-01',day_to:'2027-07-01',pay_multiplier:2,pay_status:'pending',cancelled:false,updated_at:'t'}]; __resp=null;`);
    ok(E(`calCanAct()`)===false,'สิทธิ์ดูอย่างเดียว → ไม่มีปุ่มยืนยัน');
    E(`PERM=null;`);
    // พรีวิวเงิน: วันที่ผ่านมาแล้ว คิดจริงด้วย calcPay (แล้วคืน holidays เดิม)
    E(`holidays={}; shifts={ST:mk('2026-07-26','2026-08-25'),OF:mk('2026-07-26','2026-08-25',['2026-08-12']),HR:mk('2026-07-26','2026-08-25')};`);
    const pv=JSON.parse(E(`JSON.stringify(calPreview({id:'p',name:'วันแม่',day_from:'2026-08-12',day_to:'2026-08-12',pay_multiplier:2,pay_status:'pending',cancelled:false}))`));
    const aug=pv.past.find(x=>x.p==='2026-08');
    ok(aug&&aug.plus===600&&aug.nPlus===1&&aug.minus===0,'พรีวิววันที่ผ่านมา: งวด ส.ค. หน้าร้าน +600 (1 คน) · ออฟฟิศไม่ได้เพิ่ม → '+JSON.stringify(pv.past));
    ok(E(`Object.keys(holidays).length`)===0,'พรีวิวแล้วคืนค่า holidays เดิม (ไม่ค้างค่าทดลอง)');
    const pf=JSON.parse(E(`JSON.stringify(calPreview({id:'f',name:'สิ้นปี',day_from:'2099-12-31',day_to:'2099-12-31',pay_multiplier:2,pay_status:'pending',cancelled:false}))`));
    ok(pf.fut&&pf.fut.days===1&&pf.fut.store===1&&pf.fut.office===1&&pf.fut.maxBonus===600,'พรีวิววันข้างหน้า: หน้าร้าน 1 คน สูงสุด +600 · ออฟฟิศ 1 คนได้หยุด · รายชั่วโมงไม่นับ → '+JSON.stringify(pf.fut));
  }
}catch(e){ console.log('CRASH',e.stack||e.message); fail++; }
 console.log(errs.length?('jsdom errors: '+errs.slice(0,3).join(' | ')):'');
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
