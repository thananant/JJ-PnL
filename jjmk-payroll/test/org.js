// เทสหน้า 🧑‍🤝‍🧑 แผนผังพนักงาน (#org) กับโค้ดจริงใน jjmk-payroll.html
// กติกาเจ้าของ: ① ผจก./รองผจก. ดูจากชื่อตำแหน่ง ② กะ = กะที่เข้างานจริงล่าสุดจากเวลาสแกน 14 วันของร้าน (ไม่ใช่กะที่ล็อกไว้)
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
function chain(table){ let op='select'; const res={data:[],error:null,count:0}; const b={};
  for(const m of ['select','eq','neq','gte','lte','lt','gt','in','is','not','or','order','limit','range','single','maybeSingle','on','subscribe']) b[m]=()=>b;
  for(const m of ['insert','update','upsert','delete']) b[m]=()=>{ op=m; return b; };
  b.then=(ok,er)=>Promise.resolve(res).then(ok,er);
  return b; }
function mkDom(pre){ return new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html#today',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; w.scrollTo=()=>{};
    if(pre) pre(w); }}); }
/* T = วันของร้านวันนี้ · D(n) = ย้อนไป n วัน · สแกนก่อนตี 6 ของวันถัดไป = กะเย็นของวันก่อน */
const SEED=`applyUser({role:'owner'});
  devBranch={SN_RD:'JJRD',SN_LP:'JJLP'};
  const sd=(id,name,s,e,sort,dept)=>fromDbShift({id,name,start_time:s,end_time:e,in_grace:5,out_grace:0,sort_order:sort,dept_only:dept||''});
  shiftDefs=[sd(1,'กะเช้า','10:00','19:00',1),sd(2,'กะกลาง','15:00','00:00',2),sd(3,'กะเย็น','18:00','03:00',3),
    sd(4,'กะเช้า (ล้างจาน)','11:00','20:00',4,'ล้างจาน'),sd(5,'กะครัวพิเศษ','06:30','15:30',5,'ครัวกลาง')];
  orgPos=[{id:1,dept:'หน้าร้าน',name:'แคชเชียร์',sort:1},{id:2,dept:'หน้าร้าน',name:'เสิร์ฟ',sort:2},{id:3,dept:'Kitchen',name:'ครัว',sort:1},{id:4,dept:'Kitchen',name:'ล้างจาน',sort:2}];
  const mk=(id,code,nick,br,pos,x)=>fromDbEmp(Object.assign({id,code,nick,full_name:nick+' ทดสอบ',branch:br,dept:'หน้าร้าน',position:pos,wage_type:'daily',rate:450,active:true,work_mode:'shift',
    birth_date:'1995-05-05',phone:'0812345678',bank_name:'กสิกรไทย',bank_account:'1234567890'},x||{}));
  employees=[
    mk(1,'M1','ซอ','JJLP','ผู้จัดการสาขา',{work_mode:'hours',target_hours:10,dept:'Manager'}),
    mk(2,'A1','วิน','JJLP','รองผู้จัดการ',{shift_id:1}),
    mk(3,'A2','ใบเตย','JJLP','ผู้ช่วยผู้จัดการ'),
    mk(4,'A3','แอส','JJLP','Assistant Manager'),
    mk(5,'S1','ต้น','JJLP','เสิร์ฟ',{shift_id:1}),
    mk(6,'S2','ฝน','JJLP','เสิร์ฟ'),
    mk(7,'S3','เบล','JJLP','แคชเชียร์',{shift_id:2}),
    mk(8,'S4','ใหม่','JJLP','ครัว',{dept:'Kitchen'}),
    mk(9,'P1','แป้ง','JJLP','เสิร์ฟ',{work_mode:'hourly',wage_type:'hourly',rate:60}),
    mk(10,'H1','บัญชีหนึ่ง','OFFICE','บัญชี',{work_mode:'hours',dept:'ออฟฟิศ'}),
    mk(11,'W1','น้ำ','JJLP','ล้างจาน',{dept:'Kitchen'}),
    mk(12,'K1','หัวหน้าครัว','JJLP','หัวหน้าครัว',{dept:'Kitchen'}),
    mk(13,'N1','<img src=x onerror=alert(1)>','JJRD','<b>ตำแหน่ง</b>',{photo_url:'x" onerror="alert(2)'}),
    mk(14,'X1','ไร้สังกัด','',''),
    mk(15,'G1','ลาออก','JJLP','เสิร์ฟ',{active:false}),
    mk(16,'R1','รัช','JJRD','เสิร์ฟ'),
    mk(17,'E1','ขอบ','JJLP','เสิร์ฟ',{shift_id:1}),
    mk(18,'MH','หัวหน้าเสิร์ฟ','JJLP','หัวหน้าเสิร์ฟ',{work_mode:'hours'})];
  const T=bizToday(), D=n=>addDaysYMD(T,-n), P=(code,date,time,sn)=>({code,date,time,sn:sn||'SN_LP'});
  punches=[
    P('A1',D(5),'09:58'),P('A1',D(5),'19:02'),P('A1',D(1),'17:55'),P('A1',D(0),'03:05'),          // ล็อกกะเช้า · ล่าสุดเข้ากะเย็น
    P('A2',D(2),'09:55'),P('A2',D(2),'19:05'),
    P('S1',D(4),'10:00'),P('S1',D(4),'19:00'),P('S1',D(2),'18:02'),P('S1',D(1),'03:00'),P('S1',D(1),'18:05'),P('S1',D(0),'02:50'),
    P('S2',D(2),'18:10'),P('S2',D(1),'02:30'),                                                   // 02:30 = กะเย็นของ D(2)
    P('S3',D(14),'15:00'),P('S3',D(14),'23:50'),                                                 // 14 วันก่อน = นอกหน้าต่าง
    P('E1',D(13),'18:00'),P('E1',D(12),'02:55'),                                                 // 13 วันก่อน = ยังอยู่ในหน้าต่าง
    P('P1',D(1),'18:00'),P('P1',D(1),'23:30'),P('H1',D(1),'09:00'),P('H1',D(1),'18:00'),
    P('W1',D(1),'10:58'),P('W1',D(1),'19:40'),P('K1',D(1),'17:50'),P('K1',D(0),'02:40'),
    P('M1',D(1),'10:00'),P('M1',D(1),'20:00'),P('R1',T,'09:50','SN_RD'),P('N1',D(1),'10:00','SN_RD'),P('N1',D(1),'19:00','SN_RD'),
    P('G1',D(1),'10:00'),P('G1',D(1),'19:00')];
  recomputeAll();`;
function run(dom, fn){ return new Promise(res=>setTimeout(async()=>{ try{ await fn(dom.window, dom.window.document, s=>dom.window.eval(s)); }catch(e){ console.log('CRASH',e.stack); fail++; } res(); },400)); }
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  console.log('[กติกา 1: ผจก./รองผจก. จากชื่อตำแหน่ง]');
  const d0=mkDom();
  await run(d0, async (w,d,E)=>{
    const R=p=>E(`ocRole(${JSON.stringify(p)})`);
    ok(R('รองผู้จัดการ')==='assistant' && R('ผู้ช่วยผู้จัดการ')==='assistant' && R('Assistant Manager')==='assistant' && R('รองหัวหน้าครัว')==='assistant','ขึ้นต้น รอง/ผู้ช่วย/assistant = รองผจก. (เช็คก่อน "ผู้จัดการ/หัวหน้า")');
    ok(R('ผู้จัดการสาขา')==='manager' && R('หัวหน้าครัว')==='manager' && R('Store Manager')==='manager' && R(' ผู้จัดการ ')==='manager','มี ผู้จัดการ/หัวหน้า/manager = ผจก.');
    ok(R('เสิร์ฟ')==='staff' && R('')==='staff' && R('Kitchen Assistant')==='staff','อื่น ๆ = พนักงาน (assistant ต้องขึ้นต้นตำแหน่ง)');
    const K=n=>E(`ocColKey({id:9,name:${JSON.stringify(n)}})`);
    ok(K('กะเช้า')==='morning' && K('กะเช้า (ล้างจาน)')==='morning' && K('กะกลาง')==='mid' && K(' กะเย็น')==='night' && K('กะครัวพิเศษ')==='sh:9','คอลัมน์กะจากชื่อ: เช้า (รวมล้างจาน) / กลาง / เย็น / ชื่ออื่น = คอลัมน์ของตัวเอง');
  });

  console.log('[กติกา 2: กะ = เข้างานจริงล่าสุด 14 วัน]');
  const d1=mkDom();
  await run(d1, async (w,d,E)=>{
    E(SEED);
    const X=JSON.parse(E(`JSON.stringify(ocBuild())`)), by=n=>X.employees.find(e=>e.nick===n);
    const T=E('bizToday()'), D=n=>E(`addDaysYMD(bizToday(),-${n})`);
    ok(by('วิน').shift==='night' && by('วิน').shiftSrc==='scan' && by('วิน').role==='assistant','รองผจก. ล็อกกะเช้าไว้ แต่เข้างานล่าสุดกะเย็น → กะเย็น (จากสแกนจริง)');
    ok(by('ต้น').shift==='night' && by('ต้น').note.some(t=>/14 วันล่าสุด: เย็น 2 · เช้า 1/.test(t)) && by('ต้น').note.some(t=>/เข้ากะล่าสุด เมื่อวาน/.test(t)),'พนักงานล็อกกะเช้า ล่าสุดเข้ากะเย็น → กะเย็น + นับ 14 วัน "เย็น 2 · เช้า 1" + เข้ากะล่าสุดเมื่อวาน');
    const sc=JSON.parse(E(`JSON.stringify(ocScanShifts())`));
    ok(sc.S2.lastDay===D(2) && sc.S2.nDays===1 && by('ฝน').shift==='night','สแกน 02:30 นับเป็นกะเย็นของวันก่อน (ตัดวันตี 6)');
    ok(!sc.S3 && by('เบล').shift==='mid' && by('เบล').shiftSrc==='set' && by('เบล').note[0]==='ยังไม่มีสแกน 14 วัน · ใช้กะที่ตั้งไว้','สแกนเก่า 14 วันขึ้นไป + ตั้งกะกลางไว้ → ใช้กะที่ตั้ง + ป้าย');
    ok(sc.E1 && sc.E1.lastDay===D(13) && by('ขอบ').shift==='night' && by('ขอบ').shiftSrc==='scan','สแกนเมื่อ 13 วันก่อนยังนับ (14 วันรวมวันนี้) — ล็อกกะเช้าแต่เข้ากะเย็น');
    ok(by('ใหม่').shift===null && by('ใหม่').shiftSrc==='none','ไม่มีสแกนและไม่ได้ตั้งกะ → ยังไม่รู้กะ');
    ok(by('แป้ง').shift==='part' && by('บัญชีหนึ่ง').shift==='hours' && by('ซอ').shift==='hours' && by('ซอ').role==='manager','รายชั่วโมง = พาร์ทไทม์ · นับชั่วโมง = นับชั่วโมง · ผจก. นับชั่วโมง');
    ok(by('น้ำ').shift==='morning' && by('น้ำ').shiftName==='กะเช้า (ล้างจาน)','"กะเช้า (ล้างจาน)" อยู่คอลัมน์เช้า');
    ok(by('รัช').shift==='morning' && by('รัช').onDuty && by('รัช').note.some(t=>/เข้ากะล่าสุด วันนี้/.test(t)),'วันนี้เพิ่งสแกนเข้า (ครั้งเดียว) → กะเช้า + เข้างานอยู่ตอนนี้');
    ok(!X.employees.some(e=>e.nick==='ลาออก'),'คนที่ไม่ active ไม่ขึ้นในผัง');
    ok(X.employees.every(e=>!('rate' in e) && !('phone' in e) && !('birth' in e) && !('bankAcc' in e)),'ข้อมูลที่ส่งเข้าผังไม่มีเงินเดือน/เบอร์/วันเกิด/บัญชี');
    ok(X.order.join()==='morning,mid,night,sh:5,part,hours,' && X.shifts.find(s=>s.key==='sh:5').name==='กะครัวพิเศษ' && X.shifts.find(s=>s.key==='morning').time==='10:00–19:00','ลำดับคอลัมน์: เช้า กลาง เย็น กะอื่นตามลำดับกะ พาร์ทไทม์ นับชั่วโมง ยังไม่รู้กะ · เวลาจากกะจริง');
    E(`shiftDefs=[]`); const X2=JSON.parse(E(`JSON.stringify(ocBuild())`));
    ok(X2.employees.find(e=>e.nick==='ต้น').shift===null && X2.employees.find(e=>e.nick==='แป้ง').shift==='part','ยังไม่มีกะในระบบเลย (detectShift คืน undefined) → ไม่พัง · คนสแกนเป็น "ยังไม่รู้กะ"');
  });

  console.log('[หน้าแผนผัง: สาขา → ผจก. → รองผจก. → กะ → แผนก → ตำแหน่ง → ชื่อ + เวลาเข้างาน]');
  const d2=mkDom();
  await run(d2, async (w,d,E)=>{
    E(SEED); E(`go('org')`);
    ok(E(`curPage()`)==='org' && w.location.hash==='#org' && d.querySelector('aside nav button[data-page=org]').classList.contains('active'),'เปิดหน้า #org ได้ · เมนูแผนผังพนักงาน active');
    const nav=[...d.querySelectorAll('aside nav button[data-page]')].map(b=>b.dataset.page);
    ok(nav.indexOf('org')===nav.indexOf('detail')+1,'เมนูอยู่ต่อจาก 🪪 ข้อมูลพนักงาน (กลุ่มข้อมูลพนักงาน)');
    ok(d.querySelector('main').style.maxWidth==='none','หน้ากว้างเต็มจอ (คอมเห็นทุกกะเรียงกัน)');
    ok([...d.querySelectorAll('.og-br b')].map(b=>b.textContent).join()==='ลาดพร้าว,รัชดา,ครัวกลาง,ออฟฟิศ,ไม่ระบุสาขา','สาขาเรียงตาม ALL_BR + "ไม่ระบุสาขา" ท้ายสุด');
    ok(d.querySelector('.og-br[aria-pressed=true]').dataset.b==='JJLP','เปิดมาที่ลาดพร้าว');
    const P=id=>d.querySelector('.og-root [data-id="'+id+'"]'), colK=id=>{ const c=P(id)&&P(id).closest('.og-col'); return c?c.dataset.k:null; };
    const deptOf=id=>{ const g=P(id)&&P(id).closest('.og-dept'); return g?g.querySelector('.og-dh').firstChild.textContent.trim():null; };
    const posOf=id=>{ const g=P(id)&&P(id).closest('.og-pos'); return g?g.querySelector('.og-ph').firstChild.textContent.trim():null; };
    const F=f=>d.querySelector('.og-flt [data-f="'+f+'"]'), ids=()=>[...d.querySelectorAll('.og-root [data-id]')].map(x=>x.dataset.id).sort((a,b)=>a-b).join();
    const mg=[...d.querySelectorAll('.og-mgr')].map(x=>x.dataset.id);
    ok(mg[0]==='1' && mg.includes('12') && mg.includes('18') && mg.length===3,'ชั้น ผจก.: ผู้จัดการสาขาขึ้นก่อน + ตำแหน่งที่มีคำว่าหัวหน้า (กติกา 1)');
    const as=[...d.querySelectorAll('.og-ast')];
    ok(as.map(x=>x.dataset.id).join()==='3,2,4','ชั้นรองผจก.: เรียงตามกะ เช้า → เย็น → ยังไม่รู้กะ');
    ok(/กะเย็น/.test(P(2).textContent) && /กะเช้า/.test(P(3).textContent) && /ยังไม่รู้กะ/.test(P(4).textContent),'รองผจก. บอกกะที่เข้างานจริงล่าสุด');
    ok(!P(2).closest('.og-col') && !P(1).closest('.og-col'),'ผจก./รองผจก. อยู่ชั้นบน ไม่อยู่ในคอลัมน์กะ');
    const cols=[...d.querySelectorAll('.og-col')].map(c=>c.dataset.k).join();
    ok(cols==='morning,mid,night,part,none','คอลัมน์ลาดพร้าว: เช้า กลาง เย็น พาร์ทไทม์ ยังไม่รู้กะ');
    ok(colK(5)==='night' && colK(6)==='night' && colK(11)==='morning' && colK(9)==='part' && colK(8)==='none' && colK(7)==='mid','คนอยู่กะถูก: ต้น/ฝน=เย็น · น้ำ(ล้างจาน)=เช้า · แป้ง=พาร์ทไทม์ · ใหม่=ยังไม่รู้กะ · เบล=กลาง');
    ok(deptOf(5)==='หน้าร้าน' && deptOf(11)==='Kitchen' && deptOf(8)==='Kitchen','ในกะแยกตามแผนก (หน้าร้าน / Kitchen)');
    ok(posOf(5)==='เสิร์ฟ' && posOf(6)==='เสิร์ฟ' && posOf(11)==='ล้างจาน' && posOf(7)==='แคชเชียร์' && P(5).closest('.og-pos')===P(6).closest('.og-pos'),'ในแผนกแยกตามตำแหน่ง → รายชื่อ (ต้น/ฝน อยู่กลุ่มเสิร์ฟเดียวกัน)');
    ok(!/เสิร์ฟ/.test(P(5).textContent) && P(5).querySelector('.og-nm') && P(5).querySelector('.og-dot'),'แถวรายชื่อ = จุดสถานะ + ชื่อ + เวลา (ตำแหน่งอยู่หัวกลุ่ม ไม่ซ้ำในแถว)');
    ok(F('all').getAttribute('aria-pressed')==='true' && /ทุกคน\s*13/.test(F('all').textContent),'ตัวกรองเริ่มที่ "ทุกคน" + บอกจำนวนคนในสาขา');
    ok(/กะที่ตั้งไว้/.test(P(7).textContent) && !/กะที่ตั้งไว้/.test(P(5).textContent),'ใช้กะที่ตั้งไว้ (ไม่มีสแกน 14 วัน) มีป้ายบอก');
    ok(/ยังไม่เข้า/.test(P(5).textContent) && P(5).querySelector('.og-t'),'ยังไม่สแกนวันนี้ = "ยังไม่เข้า"');
    ok(!P(15),'คนลาออกไม่มีในผัง');
    console.log('[แตะชื่อ = ไปหน้าข้อมูลพนักงาน]');
    P(5).click();
    ok(E(`curPage()`)==='detail' && E(`detailEmpId`)===5 && E(`detailTab`)==='over','แตะชื่อ → หน้าข้อมูลพนักงานของคนนั้น (แท็บภาพรวม)');
    E(`go('org')`);
    ok(!/081|1995|กสิกร|1234567890|450/.test(d.getElementById('page-org').textContent),'ผังไม่มีเบอร์/วันเกิด/บัญชี/ค่าแรง');
    d.querySelector('.og-br[data-b="_none"]').click();
    ok(/ไม่มีตำแหน่ง/.test(posOf(14)) && P(14).closest('.og-pos').querySelector('.og-ph.og-nopos'),'ไม่มีตำแหน่ง → กลุ่ม "⚠️ ไม่มีตำแหน่ง" สีแดง');
    E(`go('today')`); E(`go('org')`);
    ok(d.querySelector('.og-br[aria-pressed=true]').dataset.b==='_none','กลับมาหน้าผังยังอยู่สาขาเดิม');
    ok(JSON.parse(w.localStorage.getItem('jjpay_org')).b==='_none','จำสาขาที่เลือกใน localStorage (jjpay_org)');
    console.log('[escape ข้อความจากฐานข้อมูล]');
    d.querySelector('.og-br[data-b="JJRD"]').click();
    const root=d.getElementById('page-org');
    ok(!root.querySelector('img') && !root.querySelector('.og-p b b') && root.textContent.includes('<img src=x onerror=alert(1)>') && root.textContent.includes('<b>ตำแหน่ง</b>'),'ชื่อ/ตำแหน่งที่มี HTML แสดงเป็นตัวอักษร ไม่ถูกรันเป็นแท็ก');
    ok(/เข้า 09:50/.test(P(16).textContent) && P(16).querySelector('.og-t.og-in'),'สแกนเข้าวันนี้ → เวลาเข้างาน "เข้า 09:50" (สีเขียว)');
    console.log('[รูปพนักงาน]');
    ok(P(16).querySelector('.og-av') && !P(16).querySelector('.og-av img') && P(16).querySelector('.og-av').firstChild.textContent==='ร','ไม่มีรูป → วงกลมตัวอักษรแรกของชื่อ');
    E(`employees.find(e=>e.code==='R1').photo='https://x.supabase.co/storage/v1/object/public/emp/r1.jpg?v=1'; employees.find(e=>e.code==='N1').photo='javascript:alert(3)'; renderAll()`);
    const im=P(16).querySelector('.og-av img');
    ok(im && im.getAttribute('src')==='https://x.supabase.co/storage/v1/object/public/emp/r1.jpg?v=1' && im.getAttribute('loading')==='lazy','มีรูป (https) → โชว์รูปพนักงาน (โหลดเมื่อเลื่อนถึง)');
    ok(!P(13).querySelector('img') && P(13).querySelector('.og-av'),'ลิงก์รูปแปลก (javascript:/ข้อความ) → ไม่ใส่เป็นรูป ใช้ตัวอักษรแทน');
    im.dispatchEvent(new w.Event('error'));
    ok(!P(16).querySelector('.og-av img') && P(16).querySelector('.og-av').textContent==='ร','รูปโหลดไม่ขึ้น → เหลือตัวอักษรแทน');
    ok(P(16).classList.contains('og-on'),'ทำงานอยู่ → จุดเขียวที่มุมรูป');
    console.log('[อัปเดตเองเมื่อมีสแกนใหม่ · ข้ามวัน]');
    d.querySelector('.og-br[data-b="JJLP"]').click();
    E(`punches.push({code:'S1',date:bizToday(),time:'09:56',sn:'SN_LP'},{code:'S2',date:bizToday(),time:'09:40',sn:'SN_LP'}); recomputeAll(); renderAll();`);
    ok(colK(5)==='morning' && /เข้า 09:56/.test(P(5).textContent),'สแกนเข้าวันนี้ 09:56 → ต้น ย้ายไปกะเช้า + โชว์เวลาเข้า (renderAll)');
    const g=P(5).closest('.og-pos'), gi=[...g.querySelectorAll('[data-id]')].map(x=>x.dataset.id);
    ok(gi.indexOf('6')<gi.indexOf('5'),'ในตำแหน่งเรียงตามเวลาเข้างาน (09:40 ก่อน 09:56)');
    ok(P(5).classList.contains('og-on') && P(7).classList.contains('og-idle'),'ทำงานอยู่ = จุดเขียว (og-on) · ยังไม่เข้า = ชื่อสีจาง');
    console.log('[ตัวกรอง ทุกคน / ทำงานอยู่ / ไม่ได้ทำงาน]');
    ok(/ทำงานอยู่\s*2/.test(F('in').textContent) && /ไม่ได้ทำงาน\s*11/.test(F('out').textContent),'ปุ่มกรองบอกจำนวน: ทำงานอยู่ 2 · ไม่ได้ทำงาน 11');
    F('in').click();
    ok(ids()==='5,6' && F('in').getAttribute('aria-pressed')==='true','ทำงานอยู่ → เหลือเฉพาะคนที่สแกนเข้าวันนี้ยังไม่ออก (ต้น ฝน)');
    ok([...d.querySelectorAll('.og-col')].map(c=>c.dataset.k).join()==='morning','กรองแล้วโชว์เฉพาะกะที่มีคน');
    ok(/ไม่มี ผจก\. ที่ทำงานอยู่ตอนนี้/.test(d.querySelector('.og-lvl').textContent),'ไม่มี ผจก. ทำงานอยู่ → บอกว่า "ไม่มี ผจก. ที่ทำงานอยู่ตอนนี้"');
    ok(JSON.parse(w.localStorage.getItem('jjpay_org')).f==='in','จำตัวกรองใน localStorage');
    E(`renderAll()`);
    ok(F('in').getAttribute('aria-pressed')==='true' && ids()==='5,6','ข้อมูลอัปเดต (renderAll) → ยังกรองอยู่');
    F('out').click();
    ok(!P(5) && !P(6) && P(7) && P(1) && P(2) && P(8),'ไม่ได้ทำงาน → ไม่มีคนที่ทำงานอยู่ · มี ผจก./รองผจก./พนักงานที่ยังไม่เข้า');
    d.querySelector('.og-br[data-b="JJRD"]').click();
    ok(F('out').getAttribute('aria-pressed')==='true' && !P(16) && P(13),'เปลี่ยนสาขา → ตัวกรองเดิมยังอยู่');
    F('in').click();
    ok(ids()==='16' && /ไม่มีรองผจก\./.test(d.getElementById('page-org').textContent),'รัชดา ทำงานอยู่ = รัช คนเดียว');
    d.querySelector('.og-br[data-b="JJLP"]').click(); F('all').click();
    ok(P(5) && P(7) && [...d.querySelectorAll('.og-col')].map(c=>c.dataset.k).join()==='morning,mid,night,part,none','กลับ "ทุกคน" → เห็นครบทุกกะ');
    console.log('[ลำดับตำแหน่งตามหน้า 🗂 แผนก/ตำแหน่ง]');
    E(`[[40,'C1','ก้อย','แคชเชียร์'],[41,'B1','บี','บาริสต้า'],[42,'Z1','ซี','']].forEach(([id,code,nick,pos])=>{ employees.push(fromDbEmp({id,code,nick,branch:'JJLP',dept:'หน้าร้าน',position:pos,work_mode:'shift',wage_type:'daily',rate:450,active:true}));
      punches.push({code,date:bizToday(),time:'10:01',sn:'SN_LP'}); }); recomputeAll(); renderAll();`);
    const mh=[...P(5).closest('.og-dept').querySelectorAll('.og-ph')].map(x=>x.firstChild.textContent.trim());
    ok(mh.join()==='แคชเชียร์,เสิร์ฟ,บาริสต้า,⚠️ ไม่มีตำแหน่ง','ตำแหน่งเรียงตามที่ตั้งไว้ (แคชเชียร์ → เสิร์ฟ) → ชื่ออื่น → ไม่มีตำแหน่งท้ายสุด');
    E(`ocDay='2000-01-01'; ocTick()`);
    ok(E(`ocDay`)===E(`bizToday()`),'ข้ามวันของร้าน (ocTick) → วาดใหม่เอง');
    E(`renderOrgChart(); renderOrgChart()`);
    ok(d.querySelectorAll('#page-org .og-root').length===1,'วาดซ้ำหลายครั้งไม่ซ้อนโครงหน้า');
  });

  console.log('[สิทธิ์]');
  const d3=mkDom();
  await run(d3, async (w,d,E)=>{
    E(SEED);
    E(`applyUser({role:'manager',apps:{payroll:{today:'v'}}}); applyPermUI(); go('org')`);
    ok(d.querySelector('aside nav button[data-page=org]').hidden && E(`curPage()`)==='today','ไม่มีสิทธิ์ดูพนักงาน → ซ่อนเมนู + เปิด #org เด้งไปหน้าที่มีสิทธิ์');
    E(`applyUser({role:'manager',apps:{payroll:{emp:'v'}}})`); ok(E(`canSee('org')`),'ยังไม่เคยตั้งสิทธิ์หน้านี้ + ดูหน้าพนักงานได้ → เห็นแผนผัง');
    E(`applyUser({role:'manager',apps:{payroll:{detail:'v'}}})`); ok(E(`canSee('org')`),'ยังไม่เคยตั้ง + ดูหน้าข้อมูลพนักงานได้ → เห็นแผนผัง');
    E(`applyUser({role:'manager',apps:{payroll:{emp:'vae',org:''}}})`); ok(!E(`canSee('org')`),'ตั้งไว้ชัด ๆ ว่าไม่ให้เห็น (org:"") → ไม่เห็น');
    E(`applyUser({role:'manager',apps:{payroll:{org:'v'}}})`); ok(E(`canSee('org')`) && !E(`NO_ACCESS`) && E(`PAGES.find(canSee)`)==='org','ให้เห็นแค่แผนผัง → เข้าแอปได้ เปิดหน้าแผนผัง');
    E(`applyUser({role:'manager',apps:{payroll:{emp:'v'}}}); go('org')`);
    const p5=d.querySelector('.og-root [data-id="5"]');
    ok(p5 && p5.tagName==='DIV',"ไม่มีสิทธิ์ดู 🪪 → ชื่อไม่เป็นปุ่ม");
    p5.click();
    ok(E(`curPage()`)==='org','แตะชื่อแล้วไม่ไปหน้าข้อมูลพนักงาน');
    E(`applyUser({role:'manager',apps:{payroll:{emp:'v',detail:'v',_br:'JJRD'}}}); scopeEmployees(); recomputeAll(); go('org')`);
    ok([...d.querySelectorAll('.og-br')].map(b=>b.dataset.b).join()==='JJRD' && !d.querySelector('.og-root [data-id="5"]') && d.querySelector('.og-root [data-id="16"]'),'บัญชี _br รัชดา เห็นเฉพาะสาขารัชดา');
    E(`applyUser({role:'manager',apps:{payroll:{emp:'v',_br:'XXXX'}}}); employees=employees.filter(inScope); renderOrgChart()`);
    ok(/ไม่มีสาขาที่เปิดให้ดู/.test(d.getElementById('page-org').textContent),'_br รหัสที่ไม่รู้จัก → ไม่เห็นใคร (fail closed)');
  });

  console.log('[รีเฟรช/ลิงก์ #org + จำสาขา · สาขาใหม่จากทะเบียนกลาง]');
  const REG=[{code:'JJRD',name:'สาขารัชดา',short:'รัชดา',kind:'store',sort:1,active:true},{code:'JJLP',name:'สาขาลาดพร้าว',short:'ลาดพร้าว',kind:'store',sort:2,active:true},
    {code:'JJBN',name:'สาขาบางนา',short:'บางนา',kind:'store',sort:3,color:'#2E8B57',active:true},{code:'JJOF',name:'ออฟฟิศ',short:'ออฟฟิศ',kind:'office',sort:9,active:true}];
  const d4=mkDom(w=>{ w.localStorage.setItem('jjbr_cache',JSON.stringify({t:Date.now(),cols:true,rows:REG}));
    w.localStorage.setItem('jjpay_org',JSON.stringify({b:'JJRD',s:{JJRD:'night'},d:'2000-01-01'})); });
  await run(d4, async (w,d,E)=>{
    E(SEED); E(`employees.push(fromDbEmp({id:30,code:'BN1',nick:'บางนาหนึ่ง',branch:'JJBN',position:'เสิร์ฟ',work_mode:'shift',wage_type:'daily',rate:450,active:true}))`);
    w.location.hash='#org'; await wait(80);
    ok(E(`curPage()`)==='org','เปิดลิงก์/รีเฟรชที่ #org → อยู่หน้าแผนผัง');
    ok([...d.querySelectorAll('.og-br b')].map(b=>b.textContent).join()==='ลาดพร้าว,รัชดา,บางนา,ครัวกลาง,ออฟฟิศ,ไม่ระบุสาขา','สาขาใหม่ (บางนา) ขึ้นต่อจากสาขาหน้าร้าน ก่อนครัวกลาง');
    ok(/--og-c:#2E8B57/.test(d.querySelector('.og-br[data-b="JJBN"]').getAttribute('style')||''),'สาขาใหม่ใช้สีจากทะเบียน');
    ok(d.querySelector('.og-br[aria-pressed=true]').dataset.b==='JJRD','จำสาขาที่เลือกไว้จาก localStorage (รูปแบบเก่าก็อ่านได้)');
  });
  const d5=mkDom(w=>{ w.localStorage.setItem('jjpay_org','{"b":"XXXX","s":[1,2]}'); });
  await run(d5, async (w,d,E)=>{
    E(SEED); E(`go('org')`);
    ok(d.querySelector('.og-br[aria-pressed=true]').dataset.b==='JJLP','ค่าที่จำไว้ผิด/สาขาไม่มีแล้ว → กลับลาดพร้าว ไม่พัง');
  });
  const d6=mkDom(w=>{ Object.defineProperty(w,'localStorage',{get(){ throw new Error('blocked'); }}); });
  await run(d6, async (w,d,E)=>{
    let threw=false; try{ w.localStorage.getItem('x'); }catch(_){ threw=true; }
    E(SEED); E(`go('org')`); d.querySelector('.og-br[data-b="JJRD"]').click();
    ok(threw && E(`curPage()`)==='org' && d.querySelectorAll('.og-p').length>0 && d.querySelector('.og-br[aria-pressed=true]').dataset.b==='JJRD','เบราว์เซอร์ปิด localStorage → หน้าแผนผังยังใช้ได้ (เปลี่ยนสาขาได้ แค่ไม่จำ)');
  });
  console.log('[เลือกวันที่ดูย้อนหลัง]');
  const d7=mkDom();
  await run(d7, async (w,d,E)=>{
    E(SEED); E(`go('org')`);
    const P=id=>d.querySelector('.og-root [data-id="'+id+'"]'), F=f=>d.querySelector('.og-flt [data-f="'+f+'"]');
    const ids=()=>[...d.querySelectorAll('.og-root [data-id]')].map(x=>x.dataset.id).sort((a,b)=>a-b).join();
    const T=E('bizToday()'), D=n=>E(`addDaysYMD(bizToday(),-${n})`);
    const pick=v=>{ const i=d.querySelector('.og-date'); i.value=v; i.dispatchEvent(new w.Event('change',{bubbles:true})); };
    let inp=d.querySelector('.og-date');
    ok(inp && inp.value===T && inp.max===T && inp.min && inp.min<T && !d.querySelector('[data-dd="0"]') && d.querySelector('[data-dd="1"]').disabled,'เปิดมา = วันนี้ · เลือกวันอนาคตไม่ได้ (max = วันนี้)');
    pick(D(1));
    ok(d.querySelector('.og-date').value===D(1) && d.querySelector('[data-dd="0"]') && d.querySelector('.og-root').classList.contains('og-past') && /ดูย้อนหลัง/.test(d.querySelector('.og-top').textContent),'เลือกเมื่อวาน → ผังของวันนั้น + ปุ่ม "วันนี้" + บอกว่าดูย้อนหลัง');
    ok(/18:05–02:50/.test(P(5).textContent) && /10:58–19:40/.test(P(11).textContent),'เวลาเข้า–ออกของวันที่เลือก (ต้น 18:05–02:50 · น้ำ 10:58–19:40)');
    ok(P(15) && /10:00–19:00/.test(P(15).textContent),'คนที่ลาออกแล้วแต่มาทำงานวันนั้น ขึ้นในผังวันนั้น');
    ok(/ไม่มา/.test(P(7).textContent) && !/ยังไม่เข้า/.test(P(7).textContent),'ย้อนหลัง: ไม่มีสแกน = "ไม่มา"');
    ok(/มาทำงาน/.test(F('in').textContent) && /ไม่ได้มา/.test(F('out').textContent),'ย้อนหลัง: ตัวกรองเป็น มาทำงาน / ไม่ได้มา');
    F('in').click();
    ok(ids()==='1,2,5,9,11,12,15','มาทำงาน = คนที่มีสแกนวันนั้น (สแกนตี 2 นับเป็นวันก่อน)');
    F('all').click();
    pick(D(3));
    ok(/กะเช้า/.test(P(2).textContent) && !/18:05/.test(d.getElementById('page-org').textContent),'กะ = กะจริงล่าสุดใน 14 วันก่อนถึงวันที่ดู (วิน ย้อนไปยังเป็นกะเช้า)');
    d.querySelector('[data-dd="1"]').click();
    ok(d.querySelector('.og-date').value===D(2),'▶ = วันถัดไป');
    d.querySelector('[data-dd="-1"]').click(); d.querySelector('[data-dd="-1"]').click();
    ok(d.querySelector('.og-date').value===D(4),'◀ = วันก่อนหน้า');
    E(`renderAll()`);
    ok(d.querySelector('.og-date').value===D(4),'ข้อมูลอัปเดต (renderAll) → ยังอยู่วันที่เลือก');
    d.querySelector('[data-dd="0"]').click();
    ok(d.querySelector('.og-date').value===T && !d.querySelector('[data-dd="0"]') && !d.querySelector('.og-root').classList.contains('og-past') && /ทำงานอยู่/.test(F('in').textContent),'ปุ่ม "วันนี้" → กลับวันนี้ (ตัวกรองกลับเป็น ทำงานอยู่)');
    pick(E(`addDaysYMD(bizToday(),3)`));
    ok(d.querySelector('.og-date').value===T,'พิมพ์วันอนาคต → ใช้วันนี้');
    pick('1999-01-01');
    ok(d.querySelector('.og-date').value===d.querySelector('.og-date').min,'ก่อนวันแรกที่มีข้อมูล → ใช้วันแรก');
    const mn=d.querySelector('.og-date').min; pick('xx');
    ok(E(`OrgChart.state.d`)===mn && d.querySelectorAll('.og-root [data-id]').length>0,'ค่าแปลก → ไม่เปลี่ยนวันที่ ไม่พัง');
    ok(!('d' in JSON.parse(w.localStorage.getItem('jjpay_org')||'{}')),'วันที่ไม่จำข้ามการเปิดหน้าใหม่ (เปิดมา = วันนี้เสมอ)');
  });
  const bad=errs.filter(x=>!/scrollTo|Not implemented: navigation/.test(x));
  if(bad.length){ console.log('jsdom:',bad.slice(0,3).join(' | ')); }
  console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
})();
