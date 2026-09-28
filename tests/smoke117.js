// smoke117: แท็บ "ของใช้/อุปกรณ์" (sup) — ยอดคงเหลือจาก view, แถวต่ำกว่า safety, ตั้ง safety inline,
//   เบิกของ (บันทึกใครเบิก/เมื่อไร) → ยอดลด + ประวัติขึ้น, นับจริงปรับยอดเป็นส่วนต่าง, เพิ่มของใหม่ทุกสาขา + ยอดตั้งต้น, เลิกใช้
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const bal=[
  {item_id:1,branch:'JJRD',name:'จานกลม',cat:'ภาชนะ',unit:'ใบ',safety:50,note:null,sort:1,deleted_at:null,qty:63,last_out_d:'2026-08-20'},
  {item_id:2,branch:'JJRD',name:'ชามซุป',cat:'ภาชนะ',unit:'ใบ',safety:40,note:null,sort:2,deleted_at:null,qty:12,last_out_d:null}, // ต่ำกว่า safety
  {item_id:3,branch:'JJRD',name:'เตาไฟฟ้า',cat:'เครื่องใช้ไฟฟ้า',unit:'เครื่อง',safety:2,note:'ยี่ห้อ A',sort:5,deleted_at:null,qty:2,last_out_d:null},
  {item_id:9,branch:'JJLP',name:'จานกลม',cat:'ภาชนะ',unit:'ใบ',safety:50,note:null,sort:1,deleted_at:null,qty:80,last_out_d:null}];
let moves=[{id:11,item_id:1,branch:'JJRD',d:'2026-08-20',kind:'out',qty:30,who:'บอย',by_user:'admin',note:'โต๊ะ 5',created_at:'2026-08-20T10:00:00Z'},
           {id:10,item_id:1,branch:'JJRD',d:'2026-08-01',kind:'in',qty:93,who:'ตั้งต้น',by_user:'admin',note:null,created_at:'2026-08-01T10:00:00Z'}];
const posts=[],patches=[],dels=[];
let nextId=100;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      const path=url.split('rest/v1/')[1]||'';
      if(path.startsWith('pnl_users'))return {ok:false,status:404,text:async()=>'',json:async()=>[]}; // โหมดเดิม = admin
      if(method==='PATCH'){patches.push({path,body:JSON.parse(opt.body)});return T([]);}
      if(method==='DELETE'){dels.push(path);return T([]);}
      if(method==='POST'&&path.startsWith('pnl_supply_items')){const rows=JSON.parse(opt.body);const made=rows.map(r=>Object.assign({id:nextId++},r));posts.push({t:'items',rows:made});return T(made);}
      if(method==='POST'&&path.startsWith('pnl_supply_moves')){let rows=JSON.parse(opt.body);const arr=Array.isArray(rows)?rows:[rows];const made=arr.map(r=>Object.assign({id:nextId++,created_at:new Date().toISOString()},r));posts.push({t:'moves',rows:made});return T(Array.isArray(rows)?made:made);}
      if(method==='POST')return T([]);
      if(path.startsWith('pnl_supply_balance')){const br=(path.match(/branch=eq\.([A-Z]+)/)||[])[1];const q=path.match(/item_id=eq\.(\d+)/);let r=bal.filter(b=>!br||b.branch===br);if(q)r=r.filter(b=>b.item_id===+q[1]);return T(r);}
      if(path.startsWith('pnl_supply_moves')){const br=(path.match(/branch=eq\.([A-Z]+)/)||[])[1];const it=path.match(/item_id=eq\.(\d+)/);let r=moves.filter(m=>!br||m.branch===br);if(it)r=r.filter(m=>m.item_id===+it[1]);return T(r);}
      if(path.startsWith('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(path.startsWith('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await wait(500);
  out.push('เมนู sup อยู่ใน VIEWS + sidebar: '+(w.eval('VIEWS').includes('sup')&&!!d.querySelector('.sb-item[data-v="sup"]')&&!!d.querySelector('.tabbar button[data-v="sup"]')));
  await w.show('sup'); await wait(300);
  const v=d.getElementById('view-sup'); const txt=v.textContent;
  out.push('หัวข้อหน้า = ของใช้/อุปกรณ์: '+(d.getElementById('pageTitle').textContent==='ของใช้/อุปกรณ์'));
  out.push('โชว์เฉพาะสาขารัชดา 3 รายการ (ไม่มีของลาดพร้าว): '+(v.querySelectorAll('tr[data-id]').length===3));
  out.push('KPI ต่ำกว่า safety = 1 (ชามซุป 12<40): '+(v.querySelector('.kpi.hero .kpi-v').textContent==='1'));
  const rowLow=v.querySelector('tr[data-id="2"]'), rowOk=v.querySelector('tr[data-id="1"]'), rowEq=v.querySelector('tr[data-id="3"]');
  out.push('แถวชามซุปเป็นสีแดง + ข้อความต่ำกว่า safety · จานกลม/เตา(=safety) ไม่แดง: '+(rowLow.classList.contains('spl-low')&&rowLow.textContent.includes('ต่ำกว่า safety')&&!rowOk.classList.contains('spl-low')&&!rowEq.classList.contains('spl-low')));
  out.push('คงเหลือจานกลม 63 ใบ · เบิกล่าสุด 20 ส.ค.: '+(rowOk.querySelector('.spl-qty').textContent==='63'&&rowOk.textContent.includes('20 ส.ค. 2569')));
  out.push('หมวดคั่น 2 หมวด (ภาชนะ/เครื่องใช้ไฟฟ้า): '+(v.querySelectorAll('tr.spl-cat').length===2));
  out.push('ประวัติล่าสุด: บอย เบิก 30 โต๊ะ 5: '+(txt.includes('บอย')&&txt.includes('โต๊ะ 5')&&v.querySelectorAll('.spl-kind.out').length===1));
  out.push('KPI เบิกเดือนนี้ 1 ครั้ง · 30 หน่วย: '+(txt.includes('30 หน่วย')));
  // ตั้ง safety inline
  const saf=rowOk.querySelector('input.spl-saf'); saf.value='70'; await w.splSafety(1,saf); await wait(50);
  out.push('ตั้ง safety จานกลม 70 → PATCH + แถวกลายเป็นแดง (63<70): '+(patches.some(p=>p.path==='pnl_supply_items?id=eq.1'&&p.body.safety===70)&&d.querySelector('#view-sup tr[data-id="1"]').classList.contains('spl-low')));
  // เบิก
  w.splMove(1,'out'); await wait(80);
  out.push('หน้าต่างเบิกเปิด + โชว์คงเหลือ 63: '+(d.getElementById('modalWrap').classList.contains('on')&&d.getElementById('modalBox').textContent.includes('63 ใบ')));
  d.getElementById('smQ').value='13'; d.getElementById('smWho').value='น้องเฟิร์น'; d.getElementById('smNote').value='แตก 3 เปลี่ยนใหม่'; d.getElementById('smD').value='2026-08-25';
  await w.splMoveSave(1,'out'); await wait(80);
  const mv=posts.find(p=>p.t==='moves');
  out.push('POST เบิก: item 1 · JJRD · out 13 · who น้องเฟิร์น · วันที่ 25 ส.ค.: '+!!(mv&&mv.rows[0].item_id===1&&mv.rows[0].branch==='JJRD'&&mv.rows[0].kind==='out'&&mv.rows[0].qty===13&&mv.rows[0].who==='น้องเฟิร์น'&&mv.rows[0].d==='2026-08-25'));
  const r1=d.querySelector('#view-sup tr[data-id="1"]');
  out.push('หลังเบิก: คงเหลือ 50 · เบิกล่าสุด 25 ส.ค. · ประวัติแถวแรกคือน้องเฟิร์น: '+(r1.querySelector('.spl-qty').textContent==='50'&&r1.textContent.includes('25 ส.ค. 2569')&&d.querySelector('#view-sup .card:nth-of-type(2) table tr:nth-child(2)').textContent.includes('น้องเฟิร์น')));
  out.push('modal ปิดแล้ว: '+!d.getElementById('modalWrap').classList.contains('on'));
  // เบิกโดยไม่ใส่ชื่อ → ถูกกัน
  w.splMove(2,'out'); await wait(50); d.getElementById('smQ').value='1'; d.getElementById('smWho').value=''; const n0=posts.length; await w.splMoveSave(2,'out'); await wait(30);
  out.push('เบิกไม่ใส่ชื่อผู้เบิก → ไม่บันทึก: '+(posts.length===n0&&d.getElementById('toast').textContent.includes('ผู้เบิก')));
  w.closeModal();
  // นับจริง → ส่วนต่าง
  w.splMove(2,'adj'); await wait(50);
  out.push('หน้าต่างนับจริงใส่ค่าปัจจุบัน 12 ให้: '+(d.getElementById('smQ').value==='12'));
  d.getElementById('smQ').value='45'; await w.splMoveSave(2,'adj'); await wait(50);
  const adj=posts.filter(p=>p.t==='moves').pop();
  out.push('นับจริง 45 → adj +33 · ชามซุปพ้น safety: '+(adj.rows[0].kind==='adj'&&adj.rows[0].qty===33&&!d.querySelector('#view-sup tr[data-id="2"]').classList.contains('spl-low')&&d.querySelector('#view-sup tr[data-id="2"] .spl-qty').textContent==='45'));
  // รับเข้า
  w.splMove(3,'in'); await wait(50); d.getElementById('smQ').value='1'; await w.splMoveSave(3,'in'); await wait(50);
  out.push('รับเข้าเตา 1 → คงเหลือ 3: '+(d.querySelector('#view-sup tr[data-id="3"] .spl-qty').textContent==='3'));
  // ประวัติรายชิ้น
  moves=[...posts.filter(p=>p.t==='moves').flatMap(p=>p.rows),...moves];
  await w.splHist(1); await wait(100);
  const mb=d.getElementById('modalBox').textContent;
  out.push('ประวัติจานกลม: รับเข้า 93 · เบิก 43 · 3 รายการ: '+(mb.includes('รับเข้า 93')&&mb.includes('เบิก 43')&&mb.includes('3 รายการ')));
  w.closeModal();
  // เพิ่มของใหม่ทุกสาขา + ยอดตั้งต้น
  w.splItemModal(null); await wait(50);
  d.getElementById('siName').value='เสื้อพนักงาน'; d.getElementById('siCat').value='ยูนิฟอร์ม'; d.getElementById('siUnit').value='ตัว'; d.getElementById('siSaf').value='5';
  d.getElementById('siAll').checked=true; d.getElementById('siInit').value='20';
  bal.push({item_id:100,branch:'JJRD',name:'เสื้อพนักงาน',cat:'ยูนิฟอร์ม',unit:'ตัว',safety:5,qty:20,deleted_at:null,sort:0},{item_id:101,branch:'JJLP',name:'เสื้อพนักงาน',cat:'ยูนิฟอร์ม',unit:'ตัว',safety:5,qty:20,deleted_at:null,sort:0});
  await w.splItemSave(null); await wait(400);
  const pi=posts.find(p=>p.t==='items'); const pm=posts.filter(p=>p.t==='moves').pop();
  out.push('เพิ่มของ 2 สาขา (JJRD+JJLP) หมวดยูนิฟอร์ม safety 5: '+!!(pi&&pi.rows.length===2&&pi.rows.map(r=>r.branch).sort().join()==='JJLP,JJRD'&&pi.rows[0].cat==='ยูนิฟอร์ม'&&pi.rows[0].safety===5));
  out.push('ยอดตั้งต้น 20 → POST in ให้ทั้ง 2 ชิ้น อ้าง item id ที่สร้าง: '+!!(pm&&pm.rows.length===2&&pm.rows.every(r=>r.kind==='in'&&r.qty===20&&r.note==='ยอดตั้งต้น')&&pm.rows.map(r=>r.item_id).sort().join()===pi.rows.map(r=>r.id).sort().join()));
  out.push('หน้าโหลดใหม่เห็นเสื้อพนักงาน (รัชดา): '+(d.querySelectorAll('#view-sup tr[data-id]').length===4&&d.getElementById('view-sup').textContent.includes('เสื้อพนักงาน')));
  // ตัวกรอง
  w.eval('S.spl.low=true'); w.splRender(); out.push('กรองเฉพาะต่ำกว่า safety → เหลือแค่ชามซุป (mock view ยังคืน 12<40 หลังโหลดใหม่): '+(d.querySelectorAll('#view-sup tr[data-id]').length===1&&d.querySelector('#view-sup tr[data-id="2"]')!==null));
  w.eval("S.spl.low=false; S.spl.q='เตา'"); w.splRender(); out.push('ค้นหา "เตา" → 1 แถว: '+(d.querySelectorAll('#view-sup tr[data-id]').length===1));
  w.eval("S.spl.q=''");
  // เลิกใช้
  await w.splItemDel(3); await wait(50);
  out.push('เลิกใช้เตา → PATCH deleted_at + หายจากรายการ: '+(patches.some(p=>p.path==='pnl_supply_items?id=eq.3'&&p.body.deleted_at)&&!d.querySelector('#view-sup tr[data-id="3"]')));
  // ทุกสาขา: มีคอลัมน์สาขา
  w.pickBranch('ALL'); await wait(300);
  out.push('โหมดทุกสาขา: เห็นของทั้ง 2 สาขา + คอลัมน์สาขา: '+(d.querySelectorAll('#view-sup tr[data-id]').length===bal.length&&d.getElementById('view-sup').textContent.includes('ลาดพร้าว')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
