// เทสรอบจ่ายออฟฟิศกับ calcPay ตัวจริงใน jjmk-payroll.html (jsdom + Supabase ปลอม)
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
function chain(){ const res={data:[],error:null,count:0}; const b=new Proxy(function(){},{get:(t,k)=>k==='then'?(ok)=>Promise.resolve(res).then(ok):()=>b,apply:()=>b}); return b; }
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:()=>chain(),channel:()=>chain(),rpc:()=>chain(),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; }});
const w=dom.window; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
setTimeout(()=>{ try{
  E(`settings.cutDay=25; settings.payDay=5; settings.advDay=15; settings.monthDiv=30; settings.depStart='2099-01';
     var offE={id:1,code:'OF1',nick:'ออฟ',branch:'OFFICE',type:'monthly',rate:18000,mode:'shift',active:true,offCount:0,offWd:'0',holidayPay:false,depOn:false,depTarget:0};
     var stoE={id:2,code:'ST1',nick:'ร้าน',branch:'JJLP',type:'monthly',rate:18000,mode:'shift',active:true,offCount:0,offWd:'0',holidayPay:true,depOn:false,depTarget:0,mustWorkExempt:true};
     employees=[offE,stoE]; holidays={};
     function mk(from,to){ const a=[]; for(let d=new Date(from+'T12:00:00'); localYMD(d)<=to; d.setDate(d.getDate()+1)) a.push({day:localYMD(d),in:'09:00',out:'18:00',hours:9,fullHours:8,single:false,lateMin:0,earlyMin:0,shortMin:0,missMin:0}); return a; }
     shifts={OF1:mk('2026-07-20','2026-11-30'), ST1:mk('2026-07-20','2026-11-30')};`);
  const R=(e,p)=>JSON.parse(E(`JSON.stringify(periodRangeE(${e},'${p}'))`));
  // เจ้าของเลือก (2026-09-29): งวดเปลี่ยนผ่าน = งวด ก.ย. 2569 → 26 ส.ค. – 30 ก.ย. (36 วัน) จ่าย 30 ก.ย.
  let r=R('offE','2026-09'); ok(r.from==='2026-08-26'&&r.to==='2026-09-30'&&r.pay==='2026-09-30'&&r.transExtra===6,'ออฟฟิศ งวดเปลี่ยนผ่าน ก.ย. = 26 ส.ค.–30 ก.ย. จ่าย 30 ก.ย. เกิน 6 วัน → '+JSON.stringify(r));
  r=R('offE','2026-10'); ok(r.from==='2026-10-01'&&r.to==='2026-10-31'&&r.pay==='2026-10-31'&&r.transExtra===0,'ออฟฟิศ ต.ค. = 1–31 ต.ค. จ่าย 31 ต.ค.');
  r=R('offE','2026-11'); ok(r.from==='2026-11-01'&&r.to==='2026-11-30'&&r.pay==='2026-11-30','ออฟฟิศ พ.ย. = 1–30 พ.ย. จ่าย 30 พ.ย.');
  r=R('offE','2027-02'); ok(r.from==='2027-02-01'&&r.to==='2027-02-28','ออฟฟิศ ก.พ. 2570 = 1–28 ก.พ.');
  r=R('offE','2026-08'); ok(r.from==='2026-07-26'&&r.to==='2026-08-25'&&r.pay==='2026-09-05','ออฟฟิศ งวด ส.ค. (ก่อนเริ่ม) = แบบเดิม 26 ก.ค.–25 ส.ค. จ่าย 5 ก.ย.');
  r=R('stoE','2026-09'); ok(r.from==='2026-08-26'&&r.to==='2026-09-25'&&r.pay==='2026-10-05','หน้าร้านไม่เปลี่ยน: ก.ย. = 26 ส.ค.–25 ก.ย. จ่าย 5 ต.ค.');
  const P=(e,d)=>E(`periodOfE(${e},'${d}')`);
  ok(P('offE','2026-08-25')==='2026-08'&&P('offE','2026-08-27')==='2026-09'&&P('offE','2026-09-28')==='2026-09'&&P('offE','2026-10-01')==='2026-10','วันที่→งวด ออฟฟิศ: 25/8→ส.ค. · 27/8→ก.ย. · 28/9→ก.ย. · 1/10→ต.ค.');
  ok(P('stoE','2026-09-28')==='2026-10','วันที่→งวด หน้าร้าน: 28/9→ต.ค. (เหมือนเดิม)');
  const C=(e,p)=>JSON.parse(E(`(function(){const x=calcPay(${e},'${p}');return JSON.stringify({base:x.base,days:x.days,dip:x.dip,net:x.net,te:x.transExtra});})()`));
  let c=C('offE','2026-09'); ok(c.days===36&&c.dip===36&&c.base===21600,'เงินเดือนออฟฟิศงวด ก.ย. (36 วัน) = 18,000 + 6 วัน×600 = 21,600 = 36 วัน×600 (ได้ '+c.base+', วัน '+c.days+')');
  c=C('offE','2026-10'); ok(c.days===31&&c.base===18000,'ออฟฟิศ ต.ค. = 18,000 เต็มเดือน 31 วัน (ได้ '+c.base+', วัน '+c.days+')');
  c=C('offE','2026-08'); ok(c.days===31&&c.base===18000,'ออฟฟิศ ส.ค. (แบบเดิม) = 18,000 · 31 วัน (26/7–25/8)');
  c=C('stoE','2026-09'); ok(c.days===31&&c.base===18000&&c.te===0,'หน้าร้าน ก.ย. = 18,000 · 31 วัน (26/8–25/9) ไม่มีส่วนเกิน');
  // วันไม่ซ้อน/ไม่หล่น: ทุกวันของออฟฟิศอยู่ในงวดเดียวพอดี
  const cnt=JSON.parse(E(`JSON.stringify(['2026-08','2026-09','2026-10','2026-11'].map(p=>empShiftsInPeriod(offE,p).length))`));
  ok(cnt.reduce((a,b)=>a+b,0)===E(`shifts.OF1.filter(s=>s.day>='2026-07-26'&&s.day<='2026-11-30').length`),'ออฟฟิศ: ทุกวันตกงวดเดียวพอดี ไม่ซ้อนไม่หล่น ('+cnt.join('+')+')');
  ok(E(`JSON.stringify(allPeriods())`).includes('2026-11'),'รายการงวดมีงวดใหม่ของออฟฟิศ');
  // ออฟฟิศรายวัน (ไม่ใช่รายเดือน): 36 วัน × อัตรา ไม่ต้องบวกส่วนเกินซ้ำ
  E(`offE.type='daily'; offE.rate=500;`); c=C('offE','2026-09'); ok(c.base===36*500,'ออฟฟิศรายวัน งวดเปลี่ยนผ่าน = 36 วัน × 500 = 18,000 (ไม่บวกส่วนเกินซ้ำ)');
  // เข้างานใหม่กลางงวดเปลี่ยนผ่าน → คิดรายวันตามจริง ไม่ได้ส่วนเกิน
  E(`offE.type='monthly'; offE.rate=18000; offE.startDate='2026-09-10';`); c=C('offE','2026-09');
  ok(c.base===Math.round(c.days*600),'ออฟฟิศเริ่มงานกลางงวด → คิดรายวันตามวันที่ทำจริง (ได้ '+c.base+')');
}catch(e){ console.log('CRASH',e.message); fail++; }
 console.log(errs.length?('jsdom errors: '+errs.slice(0,3).join(' | ')):'');
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
