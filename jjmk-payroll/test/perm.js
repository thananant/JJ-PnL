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
  ok([...d.querySelectorAll('aside nav button[data-page]')].length===15,'เมนูครบ 15 หน้าหลังจัดกลุ่ม (รวม 🧑‍🤝‍🧑 แผนผังพนักงาน)');
  ok(d.querySelectorAll('main > .page').length===15 && d.querySelector('main #page-audit'),'ทุกหน้า (รวมประวัติการทำรายการ) อยู่ในพื้นที่เนื้อหา ไม่หลุดไปใต้เมนู');
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
  console.log('[_br รหัสที่ไม่รู้จัก = ไม่เห็นใคร (fail closed) — ทะเบียนสาขายังไม่มา/อ่านไม่ได้]');
  ok(E(`ALL_BR.join()`)==='JJLP,JJRD,JJCK,OFFICE','ไม่มีทะเบียนสาขา = รายการสาขาเดิม 4 แห่ง');
  const mk2=`const mk=(id,code,branch)=>fromDbEmp({id,code,nick:code,branch,wage_type:'monthly',rate:12000,active:true,shift_id:1}); employees=[mk(1,'A','JJRD'),mk(2,'B','JJLP'),mk(9,'N','JJBN')];`;
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'JJBN'}}}); ${mk2} scopeEmployees();`);
  ok(E(`JSON.stringify(SCOPE)`)==='[]' && E(`employees.length`)===0 && E(`myBranches().length`)===0,'_br = สาขาใหม่ที่ยังไม่รู้จัก → เห็น 0 คน (เดิมหลุดเป็นทุกสาขา)');
  E(`applyPermUI()`); ok(/ไม่มีสาขาที่เปิดให้ดู/.test(d.getElementById('permNote').textContent),'แถบสิทธิ์บอกว่าไม่มีสาขาที่เปิดให้ดู');
  ok([...d.querySelectorAll('#empBranchFilter option')].filter(o=>o.value).every(o=>o.disabled),'ตัวกรองสาขาเลือกสาขาไหนไม่ได้เลย');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'XXXX, '}}})`); ok(E(`JSON.stringify(SCOPE)`)==='[]','_br พิมพ์ผิด/ไม่มีจริง → ไม่เห็นใคร');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'JJRD,XXXX'}}})`); ok(E(`JSON.stringify(SCOPE)`)==='["JJRD"]','_br มีรหัสที่ใช้ได้ปนอยู่ = เห็นเฉพาะรหัสที่ใช้ได้ (เหมือนเดิม)');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:''}}})`); ok(E(`SCOPE===null`),'_br ว่าง = ทุกสาขา (เหมือนเดิม)');
  E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'jjrd'}}})`); ok(E(`JSON.stringify(SCOPE)`)==='["JJRD"]','_br ตัวพิมพ์เล็ก = รหัสเดียวกัน (เดิมหลุดเป็นทุกสาขา)');
  E(`applyUser({role:'owner',apps:{payroll:{_br:'XXXX'}}})`); ok(E(`SCOPE===null`),'เจ้าของไม่ถูกจำกัดแม้ _br ผิด');
  E(`applyUser({role:'manager',apps:{payroll:{emp:'va',_br:'XXXX'}}}); go('emp'); openEmpForm(null)`);
  d.getElementById('fNick').value='ทดสอบ'; writes.length=0; await w.eval(`saveEmpForm()`);
  ok(!writes.some(x=>x.startsWith('employees:')),'ไม่มีสาขาที่ดูแล = เพิ่มพนักงานไม่ได้ (ไม่หลุดไปสร้างคนไม่มีสาขา)');
  E(`applyUser({role:'manager',apps:{payroll:{emp:'va',_br:'JJRD'}}}); applyPermUI(); go('emp'); openEmpForm(null)`);
  d.getElementById('fNick').value='ทดสอบ'; writes.length=0; await w.eval(`saveEmpForm()`);
  ok(d.getElementById('fBranch').value==='JJRD' && writes.includes('employees:insert'),'(เทียบ) ผู้จัดการรัชดาเพิ่มพนักงานรัชดาได้ตามเดิม');
  await regTests();
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);

/* ---- ทะเบียนสาขากลาง (JJBR · pnl_branches) มีสาขาใหม่ JJBN — โหลดจากแคชในเครื่อง (localStorage.jjbr_cache) ---- */
function regTests(){ return new Promise(done=>{
  const REG=[{code:'JJRD',name:'สาขารัชดา',short:'รัชดา',kind:'store',sort:1,stk_id:'b19f0a17b4472',active:true},
    {code:'JJLP',name:'สาขาลาดพร้าว',short:'ลาดพร้าว',kind:'store',sort:2,stk_id:'b19f0a17b448212',active:true},
    {code:'JJBN',name:'สาขาบางนา',short:'บางนา',kind:'store',sort:3,stk_id:'JJBN',color:'#2E8B57',active:true},
    {code:'JJOF',name:'ออฟฟิศ',short:'ออฟฟิศ',kind:'office',sort:9,active:true}];
  const dom2=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.localStorage.setItem('jjbr_cache',JSON.stringify({t:Date.now(),cols:true,rows:REG}));
      w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; }});
  const w=dom2.window, d=w.document, E=s=>w.eval(s);
  setTimeout(()=>{ try{
    console.log('[ทะเบียนสาขามีสาขาใหม่ JJBN (บางนา)]');
    ok(E(`ALL_BR.join()`)==='JJLP,JJRD,JJBN,JJCK,OFFICE','สาขาใหม่ต่อท้ายสาขาหน้าร้าน ก่อนครัวกลาง/ออฟฟิศ');
    ok(E(`BR.JJBN.t`)==='บางนา' && E(`BR.JJLP.t`)==='ลาดพร้าว' && E(`BR.OFFICE.t`)==='ออฟฟิศ','ป้ายชื่อสาขาใหม่ = ชื่อสั้นจากทะเบียน · สาขาเดิมชื่อเดิม');
    ok(E(`Object.keys(BR).join()`)==='JJLP,JJRD,JJBN,JJCK,OFFICE','ลำดับปุ่มสาขา (K BIZ/ทิป) เรียงแบบเดียวกัน');
    const opts=id=>[...d.querySelectorAll('#'+id+' option')].map(o=>o.value+'='+o.textContent.trim()).join('|');
    for(const id of ['empBranchFilter','detailBranch','advBranch','ssoBranch','loanBranch','calBranch','payBranch','depBranch','mouBranch'])
      ok(opts(id)==='=ทุกสาขา|JJLP=ลาดพร้าว|JJRD=รัชดา|JJBN=บางนา|JJCK=ครัวกลาง|OFFICE=ออฟฟิศ','ตัวกรอง '+id+' มีบางนา (ก่อนครัวกลาง)');
    ok(opts('fBranch')==='=– อัตโนมัติตามแผนก –|JJLP=ลาดพร้าว (JJLP)|JJRD=รัชดา (JJRD)|JJBN=บางนา (JJBN)|JJCK=ครัวกลาง (JJCK)|OFFICE=ส่วนกลาง / ออฟฟิศ','ฟอร์มพนักงานเลือกบางนาได้');
    ok(d.getElementById('tip_JJBN') && d.getElementById('tipPick_JJBN') && d.getElementById('tipPickBtn_JJBN') && d.getElementById('tipPrev_JJBN'),'มีช่องทิปของบางนา');
    const tipOrder=[...d.querySelectorAll('#tipBg input[type=number]')].map(i=>i.id).join();
    ok(tipOrder==='tip_JJLP,tip_JJRD,tip_JJBN,tip_JJCK,tip_OFFICE','ช่องทิปเรียง ลาดพร้าว รัชดา บางนา ครัวกลาง ออฟฟิศ');
    E(`brSync(); brSync();`);
    ok(d.querySelectorAll('#empBranchFilter option[value=JJBN]').length===1 && d.querySelectorAll('#tip_JJBN').length===1 && E(`ALL_BR.join()`)==='JJLP,JJRD,JJBN,JJCK,OFFICE','เรียกซ้ำไม่เพิ่มซ้ำ');
    ok(E(`branchChip({branch:'JJBN'})`).includes('บางนา') && E(`branchChip({branch:'JJBN'})`).includes('#2E8B57'),'ชิปสาขาบางนาใช้สีจากทะเบียน');
    ok(E(`branchChip({branch:'JJLP'})`)==='<span class="chip chip-blue">ลาดพร้าว</span>','ชิปสาขาเดิมเหมือนเดิมทุกตัวอักษร');
    ok(E(`BR_SHORT.JJBN`)==='บางนา' && E(`BR_COLOR.JJBN`)==='#2E8B57' && E(`BR_SHORT.JJLP`)==='ลพ.','ปฏิทิน: ชื่อย่อ/สีของบางนา · สาขาเดิมเหมือนเดิม');
    console.log('[_br กับสาขาใหม่]');
    E(`applyUser({role:'manager',apps:{payroll:{today:'v',emp:'vae',_br:'JJBN'}}});
       devBranch={SN_RD:'JJRD',SN_BN:'JJBN'};
       shiftDefs=[fromDbShift({id:1,name:'กะ',start_time:'09:00',end_time:'18:00',in_grace:5,out_grace:0,sort_order:1})];
       const mk=(id,code,branch)=>fromDbEmp({id,code,nick:code,branch,wage_type:'monthly',rate:12000,active:true,shift_id:1});
       employees=[mk(1,'A','JJRD'),mk(2,'B','JJBN'),mk(3,'C',''),mk(4,'D','JJLP')];
       punches=[{code:'C',date:'2026-09-28',time:'09:00',sn:'SN_BN'}];
       scopeEmployees();`);
    ok(E(`JSON.stringify(SCOPE)`)==='["JJBN"]' && E(`employees.map(e=>e.code).join()`)==='B,C','_br = JJBN → เห็นเฉพาะพนักงานบางนา + คนใหม่ที่สแกนที่เครื่องบางนา');
    ok(E(`myBranches().join()`)==='JJBN','การ์ดหน้าวันนี้/ปฏิทิน = บางนาอย่างเดียว');
    E(`applyPermUI()`);
    ok([...d.querySelectorAll('#fBranch option')].every(o=>o.value==='JJBN'?!o.disabled:o.disabled),'ฟอร์มพนักงานเลือกได้เฉพาะบางนา');
    ok(/เห็นเฉพาะ บางนา/.test(d.getElementById('permNote').textContent),'แถบสิทธิ์บอกชื่อบางนา');
    E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'JJRD,JJBN'}}})`); ok(E(`myBranches().join()`)==='JJRD,JJBN','_br หลายสาขารวมสาขาใหม่ได้');
    E(`applyUser({role:'manager',apps:{payroll:{today:'v',_br:'XXXX'}}})`); ok(E(`JSON.stringify(SCOPE)`)==='[]','รหัสที่ไม่อยู่ในทะเบียน → ไม่เห็นใคร');
    console.log('[กฎเงินเดือนของสาขาใหม่ = หน้าร้าน (ไม่เปลี่ยน)]');
    ok(!E(`isOfficeCycle({branch:'JJBN'})`) && E(`isOfficeCycle({branch:'OFFICE'})`),'บางนาใช้รอบ 26→25 แบบหน้าร้าน · ออฟฟิศเหมือนเดิม');
  }catch(e){ console.log('CRASH',e.stack); fail++; } done(); },400);
}); }
