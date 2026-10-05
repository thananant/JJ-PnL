// เทสหน้าข้อมูลพนักงานแบบ A (การ์ด → รายคนแบ่งแท็บ) กับโค้ดจริงใน jjmk-payroll.html
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
function mkDom(pre){ return new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html#detail',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; w.scrollTo=()=>{};
    if(pre) w.sessionStorage.setItem('jjpay_detail', JSON.stringify(pre)); }}); }
const SEED=`applyUser({role:'owner'});
  devBranch={SN_RD:'JJRD',SN_LP:'JJLP'};
  shiftDefs=[fromDbShift({id:1,name:'กะเช้า',start_time:'10:00',end_time:'19:00',in_grace:5,out_grace:0,sort_order:1})];
  const mk=(id,code,nick,br,pos,active,extra)=>fromDbEmp(Object.assign({id,code,nick,full_name:nick+' ทดสอบ',branch:br,dept:'หน้าร้าน',position:pos,wage_type:'daily',rate:450,active:active!==false,shift_id:1,
    birth_date:'1995-05-05',phone:'0812345678',bank_name:'กสิกรไทย',bank_account:'1234567890'},extra||{}));
  employees=[mk(1,'A','แพร','JJRD','พนักงานเสิร์ฟ'),mk(2,'B','หลิน','JJRD',''),mk(3,'C','นุ่น','JJLP','หัวหน้ากะ',true,{wage_type:'monthly',rate:16000}),mk(4,'D','ปอ','JJLP','ครัว',false)];
  const d=bizToday();
  punches=[{code:'A',date:d,time:'09:55',sn:'SN_RD'},{code:'C',date:d,time:'09:30',sn:'SN_LP'},{code:'C',date:d,time:'19:05',sn:'SN_LP'}];
  advances=[fromDbAdv({id:9,employee_id:1,period:periodOf(d),amount:1500,taken_date:d,note:'ทดสอบ'})];
  recomputeAll();`;
function run(dom, fn){ return new Promise(res=>setTimeout(async()=>{ try{ await fn(dom.window, dom.window.document, s=>dom.window.eval(s)); }catch(e){ console.log('CRASH',e.stack); fail++; } res(); },400)); }
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
(async()=>{
  const d1=mkDom();
  await run(d1, async (w,d,E)=>{
    console.log('[หน้ารวม = การ์ดพนักงาน]');
    E(SEED); E(`detailList()`);
    const cards=()=>[...d.querySelectorAll('#detailContent .dt-card')];
    ok(cards().length===3,'ค่าเริ่มต้นโชว์เฉพาะคนที่ทำงานอยู่ (3 จาก 4)');
    ok([...d.querySelectorAll('.dt-brh h3')].map(h=>h.textContent.trim()).join()==='ลาดพร้าว,รัชดา','จัดกลุ่มตามสาขา');
    const card=n=>cards().find(c=>c.querySelector('.dt-nm b').textContent===n);
    ok(/กำลังทำงาน/.test(card('แพร').textContent) && /ออกแล้ว/.test(card('นุ่น').textContent) && /ยังไม่มา/.test(card('หลิน').textContent),'การ์ดบอกสถานะวันนี้ (กำลังทำงาน / ออกแล้ว / ยังไม่มา)');
    ok(card('หลิน').querySelector('.nopos-tag'),'คนไม่มีตำแหน่งมีป้ายกระพริบบนการ์ด');
    ok(/฿/.test(card('แพร').querySelector('.dt-foot').textContent),'การ์ดโชว์ยอดคาดว่าได้รับ');
    d.getElementById('detailActive').value='nopos'; E(`renderDetail()`);
    ok(cards().length===1 && cards()[0].textContent.includes('หลิน'),'กรอง "ยังไม่มีตำแหน่ง" ได้');
    d.getElementById('detailActive').value='0'; E(`renderDetail()`);
    ok(cards().length===1 && cards()[0].classList.contains('gone'),'กรองพ้นสภาพได้ (การ์ดจาง)');
    d.getElementById('detailActive').value='1'; d.getElementById('detailSearch').value='นุ่น'; E(`renderDetail()`);
    ok(cards().length===1 && /พบ 1 คน/.test(d.getElementById('detailCount').textContent),'ค้นหาชื่อได้ + บอกจำนวนที่พบ');
    d.getElementById('detailSearch').value=''; E(`renderDetail()`);

    console.log('[กดการ์ด = หน้ารายคนแบ่งแท็บ]');
    card('แพร').click();
    ok(E(`detailEmpId`)===1 && d.getElementById('detailFilters').hidden && !d.getElementById('detailBackBtn').hidden,'เปิดหน้ารายคน · ซ่อนตัวกรอง · มีปุ่มย้อนกลับ');
    ok(d.querySelectorAll('.dt-tabs button').length===5,'มี 5 แท็บ');
    ok(d.querySelector('#detailContent .stats') && /คาดว่าจะได้รับสุทธิ/.test(d.getElementById('detailContent').textContent),'แท็บภาพรวม: ตัวเลขสรุป');
    const tab=t=>[...d.querySelectorAll('.dt-tabs button')].find(b=>b.textContent.startsWith(t));
    tab('เวลาทำงาน').click();
    ok(d.querySelector('#detailContent input[type=number]') && /เพิ่ม\/แก้เวลา/.test(d.getElementById('detailContent').textContent),'แท็บเวลาทำงาน: ตารางเข้างาน + ช่อง OT + ปุ่มแก้เวลา');
    ok(JSON.parse(w.sessionStorage.getItem('jjpay_detail')).tab==='time','จำแท็บไว้ใน sessionStorage');
    tab('เงินเดือน').click();
    const txt=()=>d.getElementById('detailContent').textContent;
    ok(/สุทธิ/.test(txt()) && /เพิ่มเงิน \/ OT \/ โบนัส/.test(txt()) && /หักเงิน/.test(txt()),'แท็บเงินเดือน: รายการเงิน + ปุ่มเพิ่ม/หักเงิน');
    tab('เบิก').click();
    ok(/เบิกกลางเดือน/.test(txt()) && /1,500/.test(txt()) && /ทดสอบ/.test(txt()),'แท็บเบิก·ยืม·ประกัน: เห็นรายการเบิกของคนนี้');
    tab('ข้อมูลส่วนตัว').click();
    ok(/รหัสเครื่องสแกน/.test(txt()) && /081/.test(txt()) && /กสิกรไทย/.test(txt()),'แท็บข้อมูลส่วนตัว: รหัส เบอร์ บัญชี');
    d.getElementById('detailBackBtn').click();
    ok(E(`detailEmpId`)===null && cards().length===3 && !w.sessionStorage.getItem('jjpay_detail'),'← รายชื่อทั้งหมด กลับหน้ารวม และล้างที่จำไว้');
    E(`openDetail(2)`);
    ok(E(`curPage()`)==='detail' && E(`detailTab`)==='over' && /หลิน/.test(d.querySelector('#detailContent h2').textContent),'openDetail จากหน้าอื่นเปิดหน้ารายคนที่ภาพรวม');
    const wb=[...d.querySelectorAll('#detailContent button')].find(b=>/ข้อมูลการทำงาน/.test(b.textContent));
    ok(!d.querySelector('.dt-tabs .dt-badge') && wb && wb.classList.contains('btn-alert') && /ตำแหน่ง/.test(wb.title),'ไม่มีตำแหน่ง = ปุ่ม ⚙️ ข้อมูลการทำงานกระพริบ (ไม่ใช่ป้ายบนแท็บข้อมูลส่วนตัว)');
    E(`employees.find(e=>e.id===2).phone=''; renderDetail()`);
    ok(d.querySelector('.dt-tabs .dt-badge') && d.querySelector('.dt-tabs .dt-badge').textContent==='1','ข้อมูลส่วนตัวขาด (เบอร์) = ป้ายเตือนบนแท็บข้อมูลส่วนตัว');
    d.querySelector('aside nav button[data-page=detail]').click();
    ok(E(`detailEmpId`)===null && cards().length===3,'กดเมนู "ข้อมูลพนักงาน" = กลับหน้ารวม');
  });
  console.log('[ปฏิทินเข้างาน = เดือนปฏิทิน 1–สิ้นเดือน]');
  const d3=mkDom();
  await run(d3, async (w,d,E)=>{
    E(SEED);
    E(`punches=[['2026-08-27','A'],['2026-09-01','A'],['2026-09-24','A'],['2026-09-24','C'],['2026-09-28','A'],['2026-09-30','C'],['2026-10-02','A']]
         .flatMap(([dd,c])=>[{code:c,date:dd,time:'09:50',sn:c==='A'?'SN_RD':'SN_LP'},{code:c,date:dd,time:'19:00',sn:c==='A'?'SN_RD':'SN_LP'}]);
       recomputeAll(); fillCalMonths(); document.getElementById('calPeriodSel').value='2026-09'; go('cal');`);
    const cellCnt=day=>{ const c=[...d.querySelectorAll('#calGrid .cell:not(.empty)')].find(x=>x.querySelector('.dnum').textContent===String(day)); return c? c.querySelector('.cnt').textContent.replace(/[^0-9]/g,'') : null; };
    ok(cellCnt(24)==='2' && cellCnt(28)==='1' && cellCnt(30)==='1','ก.ย. เห็นครบถึงสิ้นเดือน (26–30 ไม่ว่างแล้ว)');
    ok(d.querySelectorAll('#calGrid .cell:not(.empty)').length===30 && /เปิดงาน 4 วัน · รวม 5 คน-วัน/.test(d.getElementById('calSummary').textContent),'วาด 30 วัน · นับเฉพาะวันในเดือน 1/24/28/30 (ไม่รวม 27 ส.ค./2 ต.ค.)');
    ok([...d.querySelectorAll('#calPeriodSel option')].map(o=>o.textContent).join()==='ตุลาคม 2569,กันยายน 2569,สิงหาคม 2569','ตัวเลือกเป็นชื่อเดือน ไม่ใช่งวด');
    d.getElementById('calPeriodSel').value='2026-08'; E(`renderCalendar()`);
    ok(cellCnt(27)==='1','ส.ค. เห็นวันที่ 27 (เดิมไปอยู่ในงวด ก.ย. แต่ไม่ถูกวาดที่ไหนเลย)');
  });
  console.log('[รีเฟรชแล้วอยู่หน้าเดิม]');
  const d2=mkDom({id:3,tab:'money'});
  await run(d2, async (w,d,E)=>{
    E(SEED); E(`go('detail')`);
    ok(E(`detailEmpId`)===3 && d.querySelector('.dt-tabs button.on').textContent.startsWith('เงินเดือน') && /นุ่น/.test(d.querySelector('#detailContent h2').textContent),'เปิดใหม่แล้วกลับมาที่คนเดิม แท็บเดิม');
    E(`employees=employees.filter(e=>e.id!==3); renderDetail()`);
    ok(E(`detailEmpId`)===null && d.querySelectorAll('.dt-card').length===2,'คนที่จำไว้หายไป (ลบ/นอกสิทธิ์) → กลับหน้ารวมเอง');
  });
  if(errs.length) console.log('jsdom:',errs.filter(x=>!/scrollTo/.test(x)).slice(0,3).join(' | '));
  console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
})();
