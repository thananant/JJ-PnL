// เทสสิทธิ์รายหน้าจอ + รายสาขา กับโค้ดจริงใน jjmk-payroll.html
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
const writes=[];
/* ฐานข้อมูลปลอมแบบออบเจกต์ธรรมดา — ตัวครอบ db.from ของแอปแทนที่เมธอด insert/update/... บนออบเจกต์นี้ได้เหมือนของจริง */
function chain(table){ let op='select'; const res={data:[],error:null,count:0}; const b={};
  for(const m of ['select','eq','neq','gte','lte','lt','gt','in','is','not','or','order','limit','range','single','maybeSingle','on','subscribe']) b[m]=()=>b;
  for(const m of ['insert','update','upsert','delete']) b[m]=()=>{ op=m; return b; };
  b.then=(ok,er)=>{ if(op!=='select') writes.push(table+':'+op); return Promise.resolve(res).then(ok,er); };
  return b; }
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; }});
const w=dom.window, d=w.document; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
setTimeout(async ()=>{ try{
  console.log('[สิทธิ์รายหน้าจอ]');
  E(`applyUser({role:'owner',apps:{}})`); ok(E(`PERM===null&&SCOPE===null`),'เจ้าของ = ทุกหน้า ทุกสาขา');
  E(`applyUser({role:'admin',apps:{payroll:{today:'v',_br:'JJRD'}}})`); ok(E(`PERM===null&&SCOPE===null`),'ผู้ดูแลระบบ = ไม่ถูกจำกัดแม้ตั้งสิทธิ์ไว้');
  E(`applyUser({role:'manager',apps:{}})`); ok(E(`PERM===null&&SCOPE===null`),'ยังไม่เคยตั้งสิทธิ์ (apps ว่าง) = ไม่ล็อกใคร');
  E(`applyUser({role:'manager',apps:{pnl:{dash:'v'}}})`); ok(E(`NO_ACCESS`),'ตั้งสิทธิ์แอปอื่นแต่ไม่เปิด payroll = เข้าไม่ได้');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',emp:'vae',adv:'va',payroll:'v',_br:'JJRD,JJCK'}}})`);
  ok(E(`canSee('today')&&canSee('emp')&&!canSee('settings')&&!canSee('audit')`),'เห็นเฉพาะหน้าที่ติ๊ก "ดู"');
  ok(E(`canDo('adv','a')&&!canDo('adv','d')&&!canDo('payroll','e')`),'สิทธิ์เพิ่ม/แก้/ลบ แยกรายหน้า');
  ok(E(`JSON.stringify(SCOPE)`)==='["JJRD","JJCK"]'&&E(`myBranches().join()`)==='JJRD,JJCK','สาขาที่เห็น = รัชดา + ครัวกลาง');
  console.log('[ซ่อนเมนู + พาไปหน้าที่มีสิทธิ์]');
  E(`applyPermUI()`);
  ok(d.querySelector('button[data-page=settings]').hidden && !d.querySelector('button[data-page=emp]').hidden,'เมนูตั้งค่าถูกซ่อน · เมนูพนักงานยังอยู่');
  const grp=t=>[...d.querySelectorAll('aside nav .nav-grp')].find(h=>h.textContent.trim()===t);
  ok(grp('ตั้งค่า').hidden && grp('MOU').hidden && !grp('เงิน').hidden && !grp('ข้อมูลเข้างาน').hidden,'หัวกลุ่มเมนูที่ไม่มีเมนูให้เห็นเลย (ตั้งค่า/MOU) ถูกซ่อน · กลุ่มที่มีสิทธิ์ยังอยู่');
  ok([...d.querySelectorAll('aside nav button[data-page]')].length===14,'เมนูครบ 14 หน้าหลังจัดกลุ่ม');
  ok([...d.querySelectorAll('#fBranch option')].every(o=>['JJRD','JJCK'].includes(o.value)?!o.disabled:o.disabled),'ฟอร์มพนักงานเลือกได้เฉพาะรัชดา/ครัวกลาง (ห้ามไม่ระบุสาขา)');
  E(`go('settings')`); ok(E(`curPage()`)==='today','เปิดหน้าตั้งค่าตรง ๆ (#settings) → เด้งไปหน้าที่มีสิทธิ์');
  E(`applyUser({role:'staff',apps:{payroll:{adv:'v'}}}); go('today')`); ok(E(`curPage()`)==='adv','ไม่มีสิทธิ์หน้าวันนี้ → เปิดหน้าแรกที่มีสิทธิ์ (เบิกกลางเดือน)');
  console.log('[กันบันทึกเมื่อไม่มีสิทธิ์]');
  E(`applyUser({role:'manager',apps:{payroll:{adv:'va',emp:'v'}}}); go('adv')`);
  writes.length=0;
  let r=await w.eval(`db.from('advances').insert({amount:100})`); ok(!r.error && writes.includes('advances:insert'),'หน้าเบิก มีสิทธิ์เพิ่ม → บันทึกได้');
  r=await w.eval(`db.from('advances').delete().eq('id',1)`); ok(r.error && /ไม่มีสิทธิ์ลบ/.test(r.error.message) && !writes.includes('advances:delete'),'หน้าเบิก ไม่มีสิทธิ์ลบ → ถูกปฏิเสธ ไม่ถึงฐานข้อมูล');
  E(`go('emp')`); r=await w.eval(`db.from('employees').update({rate:1}).eq('id',1)`); ok(r.error && !writes.includes('employees:update'),'หน้าพนักงาน ดูอย่างเดียว → แก้ข้อมูลไม่ได้');
  r=await w.eval(`db.from('employees').insert({nick:'x'}).select().single()`); ok(r.error,'ถูกปฏิเสธแล้วยังเรียก .select().single() ต่อได้ ไม่พัง');
  E(`applyUser({role:'owner'})`); r=await w.eval(`db.from('employees').update({rate:1}).eq('id',1)`); ok(!r.error,'เจ้าของบันทึกได้ทุกหน้า');
  console.log('[เห็นเฉพาะพนักงานในสาขาที่ได้รับสิทธิ์]');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'JJRD'}}});
     devBranch={SN_RD:'JJRD',SN_LP:'JJLP'};
     shiftDefs=[fromDbShift({id:1,name:'กะ',start_time:'09:00',end_time:'18:00',in_grace:5,out_grace:0,sort_order:1})];
     const mk=(id,code,branch)=>fromDbEmp({id,code,nick:code,branch,wage_type:'monthly',rate:12000,active:true,shift_id:1});
     employees=[mk(1,'A','JJRD'),mk(2,'B','JJLP'),mk(3,'C',''),mk(4,'D',''),mk(5,'E','OFFICE')];
     punches=[{code:'C',date:'2026-09-28',time:'09:00',sn:'SN_RD'},{code:'D',date:'2026-09-28',time:'09:00',sn:'SN_LP'},{code:'B',date:'2026-09-28',time:'09:00',sn:'SN_LP'}];
     scopeEmployees();`);
  ok(E(`employees.map(e=>e.code).join()`)==='A,C','เห็นแค่พนักงานรัชดา + พนักงานใหม่ที่ยังไม่ระบุสาขาแต่สแกนที่รัชดา (ไม่เห็นลาดพร้าว/ออฟฟิศ)');
  E(`recomputeAll()`); ok(E(`!shifts.B && !shifts.D`),'ไม่คำนวณเวลาสแกนของพนักงานนอกสาขา');
  ok(E(`myBranches().join()`)==='JJRD','หน้าวันนี้/ปฏิทินแสดงแค่การ์ดสาขารัชดา');
  E(`applyUser({role:'owner'}); employees=[{id:1,code:'A',branch:'JJRD'},{id:2,code:'B',branch:'JJLP'}]; scopeEmployees();`);
  ok(E(`employees.length`)===2,'เจ้าของเห็นทุกสาขา');
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
