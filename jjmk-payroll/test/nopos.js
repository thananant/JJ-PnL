// เทสไฟกระพริบแดงของพนักงานที่ยังไม่มีตำแหน่ง กับโค้ดจริงใน jjmk-payroll.html
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
  console.log('[พนักงานไม่มีตำแหน่ง = ช่องชื่อกระพริบแดง]');
  E(`applyUser({role:'owner'});
     devBranch={SN_RD:'JJRD'};
     shiftDefs=[fromDbShift({id:1,name:'กะ',start_time:'09:00',end_time:'18:00',in_grace:5,out_grace:0,sort_order:1})];
     const mk=(id,code,pos,active)=>fromDbEmp({id,code,nick:'N'+code,branch:'JJRD',dept:'ครัว',position:pos,wage_type:'daily',rate:500,active:active!==false,shift_id:1,
       birth_date:'1990-01-01',phone:'0800000000',bank_name:'เงินสด'});
     employees=[mk(1,'A','หัวหน้ากะ'),mk(2,'B',''),mk(3,'C','  '),mk(4,'D',null),mk(5,'E','',false)];
     punches=[{code:'A',date:'2026-09-28',time:'09:52',sn:'SN_RD'},{code:'A',date:'2026-09-28',time:'19:02',sn:'SN_RD'},
              {code:'B',date:'2026-09-28',time:'09:52',sn:'SN_RD'},{code:'B',date:'2026-09-28',time:'19:03',sn:'SN_RD'}];
     recomputeAll();
     document.getElementById('todayDate').value='2026-09-28'; go('today');`);
  const nameCell=nick=>[...d.querySelectorAll('#todayBody td')].find(td=>td.textContent.trim()===nick);
  ok(nameCell('NB') && nameCell('NB').classList.contains('no-pos'),'หน้าวันนี้: คนที่ไม่มีตำแหน่ง (B) ช่องชื่อกระพริบแดง');
  ok(nameCell('NA') && !nameCell('NA').classList.contains('no-pos'),'หน้าวันนี้: คนที่มีตำแหน่ง (A) ไม่กระพริบ');
  ok(nameCell('NB') && /ไม่มีตำแหน่ง/.test(nameCell('NB').nextElementSibling.textContent),'หน้าวันนี้: ช่องตำแหน่งขึ้นป้าย "ไม่มีตำแหน่ง"');
  const absent=[...d.querySelectorAll('#todayBody span.clickable')].filter(s=>['NC','ND'].includes(s.textContent.trim()));
  ok(absent.length===2 && absent.every(s=>s.classList.contains('no-pos')),'หน้าวันนี้: รายชื่อยังไม่มา ตำแหน่งว่าง/มีแต่ช่องว่าง/null ก็กระพริบ');
  ok(/ไม่มีตำแหน่ง 1/.test(d.getElementById('todayBody').textContent),'หัวแผนกสรุปว่ามีคนไม่มีตำแหน่งกี่คน');
  E(`go('emp')`);
  const row=nick=>[...d.querySelectorAll('#empTable tbody tr')].find(tr=>tr.cells[0].textContent.trim()===nick);
  ok(row('NB').cells[0].classList.contains('no-pos') && !row('NA').cells[0].classList.contains('no-pos'),'หน้าพนักงาน: กระพริบเฉพาะคนไม่มีตำแหน่ง');
  ok(!row('NE').cells[0].classList.contains('no-pos'),'หน้าพนักงาน: คนพ้นสภาพไม่กระพริบ');
  ok(row('NB').querySelector('.btn-alert') && /ตำแหน่ง/.test(row('NB').querySelector('.btn-alert').title),'ปุ่ม ✎ กระพริบแดงบอก "ข้อมูลไม่ครบ: ตำแหน่ง"');
  console.log('[กดป้ายแล้วไปเติมตำแหน่ง]');
  E(`go('today')`);
  nameCell('NB').nextElementSibling.querySelector('.nopos-tag').click();
  ok(E(`curPage()`)==='emp' && d.getElementById('fId').value==='2','กดป้าย → ไปหน้าพนักงานแล้วเปิดฟอร์มของคนนั้น (สิทธิ์บันทึกเช็คตามหน้าพนักงาน)');
  E(`applyUser({role:'staff',apps:{payroll:{today:'v',emp:'v'}}}); go('today')`);
  ok(!/onclick/.test(nameCell('NB').nextElementSibling.innerHTML),'ไม่มีสิทธิ์แก้หน้าพนักงาน → ป้ายโชว์อย่างเดียว กดไม่ได้');
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
