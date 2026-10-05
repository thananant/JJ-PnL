// เทสข้อมูลพนักงานเพิ่ม (jj_employee_hr.sql) กับโค้ดจริงใน jjmk-payroll.html
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
const writes=[];
function chain(table){ let op='select', row=null; const b={};
  for(const m of ['select','eq','neq','gte','lte','lt','gt','in','is','not','or','order','limit','range','single','maybeSingle','on','subscribe']) b[m]=()=>b;
  for(const m of ['insert','update','upsert','delete']) b[m]=(r)=>{ op=m; row=r; return b; };
  b.then=(ok,er)=>{ if(op!=='select') writes.push({table,op,row}); return Promise.resolve({data: op==='insert'?Object.assign({id:99},row):[],error:null}).then(ok,er); };
  return b; }
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){},storage:{from:()=>({})}})}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; w.scrollTo=()=>{}; }});
const w=dom.window, d=w.document; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
const tick=()=>new Promise(r=>setTimeout(r,30));
setTimeout(async ()=>{ try{
  const plus=n=>E(`(()=>{ const x=new Date(bizToday()+'T12:00:00'); x.setDate(x.getDate()+(${n})); return localYMD(x); })()`);
  console.log('[อ่าน/เขียนฐานข้อมูล]');
  const row={id:1,code:'A',nick:'แพร',full_name:'แพรวา',branch:'JJRD',dept:'หน้าร้าน',position:'เสิร์ฟ',wage_type:'daily',rate:450,active:true,
    gender:'หญิง',nationality:'MM',address:'12/3 ซอยลาดพร้าว',emergency_name:'สมศรี',emergency_relation:'แม่',emergency_phone:'0811111111',
    passport_exp:plus(30),work_permit_exp:plus(200),pink_card_exp:plus(-5),doc_notify_in:true,doc_notify_out:false,doc_guardian:false,
    sso_hospital:'รพ.ลาดพร้าว',face_scan:true,worker_group:'mou',doc_status:'passport',doc_start:'2026-09-01',doc_done:'',doc_agency:'บริษัท โกลด์สตาร์ อินฟินิตี้ จำกัด (Aisoon)'};
  w.__row=row;
  E(`applyUser({role:'owner'}); hrReady=true; employees=[fromDbEmp(window.__row),
     fromDbEmp({id:2,code:'B',nick:'บอส',branch:'JJRD',wage_type:'daily',rate:450,active:true}),
     fromDbEmp({id:3,code:'C',nick:'ต้น',branch:'JJRD',wage_type:'daily',rate:450,active:false,passport_exp:'${plus(-30)}'}),
     fromDbEmp({id:4,code:'D',nick:'มิว',branch:'JJLP',wage_type:'daily',rate:450,active:true,birth_date:'${plus(-365*16)}',nationality:'MM',worker_group:'',doc_status:'mou'})];
     recomputeAll();`);
  const e1=()=>E(`employees[0]`);
  ok(E(`employees[0].nat`)==='MM' && E(`employees[0].emgRel`)==='แม่' && E(`employees[0].faceScan`)===true && E(`employees[0].group`)==='mou','fromDbEmp อ่านช่องใหม่ครบ');
  const db1=E(`JSON.stringify(toDbEmp(employees[0]))`);
  ok(/"nationality":"MM"/.test(db1) && /"doc_agency":"บริษัท โกลด์สตาร์/.test(db1) && /"doc_done":null/.test(db1),'toDbEmp เขียนช่องใหม่ (วันที่ว่าง = null) เมื่อรัน SQL แล้ว');
  E(`hrReady=false`); const db0=E(`JSON.stringify(toDbEmp(employees[0]))`); E(`hrReady=true`);
  ok(!/nationality|passport_exp|worker_group/.test(db0),'ยังไม่รัน SQL = ไม่ส่งช่องใหม่ (บันทึกพนักงานไม่พัง)');
  console.log('[เตือนเอกสารหมดอายุ (3 เดือน)]');
  const al=JSON.parse(E(`JSON.stringify(docAlerts(employees[0]))`));
  ok(al.length===2 && al.find(a=>a.k==='passExp').days===30 && al.find(a=>a.k==='pinkExp').expired,'Passport เหลือ 30 วัน + บัตรชมพูหมดแล้ว = เตือน · ใบอนุญาต 200 วัน = ไม่เตือน');
  ok(E(`docAlerts(employees[2]).length`)===0,'คนพ้นสภาพ = ไม่เตือน');
  ok(E(`docAlertText(docAlerts(employees[0]).find(a=>a.expired))`)==='บัตรชมพู หมดอายุแล้ว 5 วัน','ข้อความเตือนอ่านง่าย');
  console.log('[หน้ารวมการ์ด]');
  E(`detailList()`);
  const txt=()=>d.getElementById('detailContent').textContent;
  ok(/เอกสารหมดอายุ\/ใกล้หมดใน 3 เดือน 1 คน/.test(txt()),'แถบเตือนบนหน้ารวม นับเฉพาะคนที่ยังทำงาน');
  const card=n=>[...d.querySelectorAll('.dt-card')].find(c=>c.querySelector('.dt-nm b').textContent===n);
  ok(card('แพร').querySelector('.dt-doc.bad') && /\+1/.test(card('แพร').querySelector('.dt-doc').textContent) && /MOU/.test(card('แพร').textContent),'การ์ดมีบรรทัดเตือนเอกสาร (แดง เมื่อมีใบหมดแล้ว) + ป้ายกลุ่ม');
  d.getElementById('detailActive').value='docexp'; E(`renderDetail()`);
  ok(d.querySelectorAll('.dt-card').length===1,'ตัวกรอง "เอกสารหมด/ใกล้หมด"');
  d.getElementById('detailActive').value='1'; d.getElementById('detailGroup').value='proc'; E(`renderDetail()`);
  ok(d.querySelectorAll('.dt-card').length===2,'ตัวกรอง "กำลังทำเอกสาร"');
  d.getElementById('detailGroup').value='general'; E(`renderDetail()`);
  ok([...d.querySelectorAll('.dt-card .dt-nm b')].map(b=>b.textContent).sort().join()==='บอส,มิว','ตัวกรอง "ทั่วไป" = ไม่ได้ตั้งกลุ่ม');
  d.getElementById('detailGroup').value=''; E(`renderDetail()`);
  console.log('[แท็บข้อมูลส่วนตัว]');
  E(`openDetail(1); setDetailTab('info')`);
  const info=txt();
  ok(['รายละเอียด','เอกสาร','ประกันสังคม','การจ่ายเงินเดือน','สแกนหน้า · กลุ่ม','การทำเอกสาร'].every(h=>[...d.querySelectorAll('.dt-h4')].some(x=>x.textContent===h)),'แบ่งหัวข้อตามที่เจ้าของให้มา');
  ok(/พม่า/.test(info) && /สมศรี \(แม่\) 0811111111/.test(info) && /รพ\.ลาดพร้าว/.test(info) && /เหลือ 30 วัน/.test(info) && /หมดอายุแล้ว 5 วัน/.test(info) && /กำลังทำ Passport/.test(info) && /Aisoon/.test(info) && /เพิ่มแล้ว/.test(info),'แสดงค่าครบ: สัญชาติ · ผู้ติดต่อฉุกเฉิน · รพ. · วันหมดอายุ · การทำเอกสาร · สแกนหน้า');
  const expBadge=E(`missingInfo(employees[0]).length + docAlerts(employees[0]).length`);
  ok(expBadge>=2 && [...d.querySelectorAll('.dt-tabs button')].find(b=>/ข้อมูลส่วนตัว/.test(b.textContent)).querySelector('.dt-badge').textContent===String(expBadge),'ป้ายแดงบนแท็บ = ข้อมูลขาด + เอกสารที่ต้องดู ('+expBadge+')');
  E(`setDetailTab('over')`);
  ok(/📄 เอกสาร:/.test(txt()) && /กำลังทำ Passport/.test(txt()),'แท็บภาพรวมเตือนเอกสาร + บอกสถานะการทำเอกสาร');
  E(`openDetail(4); setDetailTab('info')`);
  ok(/ยังไม่มี — จำเป็น \(อายุไม่ถึง 18\)/.test(txt()),'อายุไม่ถึง 18 + ไม่มีหนังสือยินยอมผู้ปกครอง = เตือนแดง');
  E(`hrReady=false; renderDetail()`);
  ok(d.getElementById('empHrSqlBox') && /ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality/.test(d.getElementById('empHrSqlBox').value),'ยังไม่รัน SQL = มีปุ่ม/กล่องคัดลอก SQL ในแท็บ');
  E(`hrReady=true`);
  console.log('[ฟอร์มพนักงาน]');
  E(`go('emp'); openEmpForm(4)`);
  ok(d.getElementById('fNat').value==='MM' && d.getElementById('fDocStatus').value==='mou' && d.getElementById('fHrNote').style.display==='none','เปิดฟอร์มแล้วเติมค่าเดิม');
  ok(/อายุ 1[0-9] ปี \(ไม่ถึง 18\)/.test(d.getElementById('fHrHint').textContent) && /หนังสือยินยอมผู้ปกครอง/.test(d.getElementById('fHrHint').textContent),'คำแนะนำ: อายุไม่ถึง 18 → กลุ่มคนเถื่อน + หนังสือผู้ปกครอง');
  d.getElementById('fGender').value='หญิง'; d.getElementById('fAddr').value='99 ถ.รัชดา'; d.getElementById('fEmgName').value='ป้าแดง';
  d.getElementById('fPassExp').value=plus(10); d.getElementById('fGroup').value='illegal_minor'; d.getElementById('fDocGuardian').checked=true;
  d.getElementById('fFace').checked=true; d.getElementById('fDocAgency').value='บริษัท โกลด์สตาร์ อินฟินิตี้ จำกัด (Aisoon)';
  writes.length=0; await w.eval(`saveEmpForm()`); await tick();
  const up=writes.find(x=>x.table==='employees'&&x.op==='update');
  ok(up && up.row.gender==='หญิง' && up.row.address==='99 ถ.รัชดา' && up.row.emergency_name==='ป้าแดง' && up.row.passport_exp===plus(10) && up.row.worker_group==='illegal_minor' && up.row.doc_guardian===true && up.row.face_scan===true && /Aisoon/.test(up.row.doc_agency),'บันทึกส่งช่องใหม่ไปฐานข้อมูลครบ');
  ok(E(`employees.find(e=>e.id===4).address`)==='99 ถ.รัชดา','ข้อมูลในเครื่องอัปเดตทันที');
  E(`openEmpForm(4)`); d.getElementById('fDocStart').value='2026-10-10'; d.getElementById('fDocDone').value='2026-10-01';
  let toasts=[]; w.toast=m=>toasts.push(m); writes.length=0; await w.eval(`saveEmpForm()`); await tick();
  ok(!writes.length && toasts.some(t=>/วันที่ทำเอกสารเสร็จ ต้องไม่ก่อนวันที่เริ่มทำ/.test(t)),'วันเสร็จก่อนวันเริ่ม = ไม่บันทึก');
  E(`hrReady=false; openEmpForm(4)`); d.getElementById('fDocStart').value=''; d.getElementById('fDocDone').value='';
  d.getElementById('fAddr').value='เปลี่ยนแล้ว'; toasts=[]; writes.length=0; await w.eval(`saveEmpForm()`); await tick();
  const up0=writes.find(x=>x.table==='employees'&&x.op==='update');
  ok(d.getElementById('fHrNote').style.display==='' && up0 && !('address' in up0.row) && toasts.some(t=>/jj_employee_hr\.sql/.test(t)) && E(`employees.find(e=>e.id===4).address`)==='99 ถ.รัชดา','ยังไม่รัน SQL: เตือนในฟอร์ม · ไม่ส่งช่องใหม่ · ไม่โชว์ค่าที่ไม่ได้บันทึก');
  console.log('[SQL ที่ฝังในแอป]');
  // เทียบกับไฟล์บน branch sql (ไฟล์ sql/ ในเครื่องอยู่ใน .gitignore — เครื่องอื่นอาจไม่มี)
  const emb=d.getElementById('sqlEmpHr').textContent.trim();
  let file=null; try{ file=require('child_process').execSync('git show origin/sql:jjmk-payroll/jj_employee_hr.sql',{cwd:__dirname,stdio:['ignore','pipe','ignore']}).toString().trim(); }catch(_){}
  if(file===null){ try{ file=require('fs').readFileSync(__dirname+'/../../sql/jj_employee_hr.sql','utf8').trim(); }catch(_){} }
  if(file===null) console.log('  – ข้ามการเทียบ SQL (ไม่มี origin/sql ในเครื่องนี้ — git fetch origin sql ก่อน)');
  else ok(emb===file,'SQL ในแอปตรงกับ jj_employee_hr.sql บน branch sql ทุกตัวอักษร');
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.filter(x=>!/scrollTo/.test(x)).slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
