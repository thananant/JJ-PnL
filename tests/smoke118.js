// smoke118: แก้บั๊กจากรีวิวแท็บของใช้/อุปกรณ์ —
//  ตัวเลข ≥1,000 ในช่อง number ไม่หาย · "ส่วนที่ขาด → ชำรุด" คิดส่วนต่าง · นับจริงใช้ยอดสดจาก view (ไม่ใช่ค่าค้างในเครื่อง)
//  KPI เบิกเดือนนี้จากคิวรีทั้งเดือน · พิมพ์ค้นหาแล้วโฟกัสไม่หลุด · หมวดเรียงตาม SPL_CATS + colspan ตรง · ตัวกรองหมวดค้างข้ามสาขาถูกล้าง
//  เพิ่มชื่อที่เคยเลิกใช้ → กู้คืน · ลบประวัติแล้วอ่าน view ใหม่ · ผู้ใช้ดูอย่างเดียวไม่เห็นปุ่ม/ช่องแก้ · activity log อ่านออก
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const users=[
  {id:1,username:'admin',pass_hash:H('admin','x'),display_name:'แอด',role:'admin',perms:{},active:true,apps:{}},
  {id:2,username:'viewer',pass_hash:H('viewer','x'),display_name:'วิว',role:'staff',perms:{},active:true,apps:{pnl:{sup:'v',dash:'v'}}}];
function mk(me){
  // view: ตะเกียบ 1,200 คู่ safety 1,000 · 'อื่นๆ' และ 'เครื่องใช้ไฟฟ้า' เพื่อเช็คลำดับหมวด · ลาดพร้าวมีหมวด 'ยูนิฟอร์ม' เท่านั้น
  const bal=[
    {item_id:1,branch:'JJRD',name:'ตะเกียบ',cat:'ภาชนะ',unit:'คู่',safety:1000,qty:1200,last_out_d:'2026-08-20',deleted_at:null,sort:1},
    {item_id:2,branch:'JJRD',name:'ถังขยะ',cat:'อื่นๆ',unit:'ใบ',safety:2,qty:5,last_out_d:null,deleted_at:null,sort:9},
    {item_id:3,branch:'JJRD',name:'เตาไฟฟ้า',cat:'เครื่องใช้ไฟฟ้า',unit:'เครื่อง',safety:2,qty:4,last_out_d:'2026-08-02',deleted_at:null,sort:5},
    {item_id:4,branch:'JJRD',name:'น้ำยาล้างจาน',cat:'ทำความสะอาด',unit:'แกลลอน',safety:1,qty:3,last_out_d:null,deleted_at:null,sort:7},
    {item_id:7,branch:'JJRD',name:'ผ้ากันเปื้อน',cat:'ยูนิฟอร์ม',unit:'ผืน',safety:5,qty:0,last_out_d:null,deleted_at:'2026-08-01T00:00:00Z',sort:6}, // เลิกใช้แล้ว
    {item_id:9,branch:'JJLP',name:'เสื้อพนักงาน',cat:'ยูนิฟอร์ม',unit:'ตัว',safety:5,qty:8,last_out_d:null,deleted_at:null,sort:6}];
  const items=[{id:1,branch:'JJRD',name:'ตะเกียบ',deleted_at:null},{id:7,branch:'JJRD',name:'ผ้ากันเปื้อน',deleted_at:'2026-08-01T00:00:00Z'},{id:9,branch:'JJLP',name:'เสื้อพนักงาน',deleted_at:null}];
  // ประวัติ 130 แถว: เบิก 125 ครั้งในเดือน ส.ค. (KPI ต้องได้ 125 ไม่ใช่นับจาก 120 แถวที่โหลด) + อื่น 5
  let moves=[]; let mid=1000;
  for(let i=0;i<125;i++) moves.push({id:mid++,item_id:1,branch:'JJRD',d:'2026-08-'+String(1+(i%28)).padStart(2,'0'),kind:'out',qty:2,who:'บอย',by_user:'boy',note:null,created_at:'2026-08-'+String(1+(i%28)).padStart(2,'0')+'T10:00:'+String(i%60).padStart(2,'0')+'Z'});
  moves.push({id:mid++,item_id:1,branch:'JJRD',d:'2026-08-01',kind:'in',qty:1450,who:'แอด',by_user:'admin',note:'ตั้งต้น',created_at:'2026-08-01T08:00:00Z'});
  moves.push({id:mid++,item_id:1,branch:'JJRD',d:'2026-08-29',kind:'out',qty:3,who:'เฟิร์น',by_user:'admin',note:'ล่าสุด',created_at:'2026-08-29T10:00:00Z'}); // id 1126 = เบิกล่าสุด
  const LAST_OUT_ID=mid-1;
  const posts=[],patches=[],dels=[],logs=[];
  let nextId=200;
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
      w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
      w.localStorage.setItem('jjpnl_auth',JSON.stringify({u:me.username,h:me.pass_hash,t:Date.now()}));
      try{w.sessionStorage.setItem('jjgate_pnl',JSON.stringify({u:me.username,t:Date.now()}));}catch(e){}
      w.confirm=()=>true;
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
        const path=url.split('rest/v1/')[1]||'';
        if(path.startsWith('pnl_users')&&method==='GET'){
          if(path.includes('username=eq.')){const u=decodeURIComponent(path.match(/username=eq\.([^&]+)/)[1]);return T(users.filter(x=>x.username===u));}
          return T(users);
        }
        if(method==='POST'&&path.startsWith('pnl_activity_log')){logs.push(JSON.parse(opt.body));return T([]);}
        if(method==='PATCH'){patches.push({path,body:JSON.parse(opt.body)});
          if(path.startsWith('pnl_supply_items?id=eq.')){const id=+path.match(/id=eq\.(\d+)/)[1];const b=bal.find(x=>x.item_id===id);const it=items.find(x=>x.id===id);const body=JSON.parse(opt.body);if(b)Object.assign(b,body);if(it)Object.assign(it,body);}
          return T([]);}
        if(method==='DELETE'){dels.push(path);const id=+(path.match(/id=eq\.(\d+)/)||[])[1];moves=moves.filter(m=>m.id!==id);
          // view คำนวณใหม่: ตะเกียบ
          const b=bal.find(x=>x.item_id===1); b.qty=moves.filter(m=>m.item_id===1).reduce((a,m)=>a+(m.kind==='in'||m.kind==='adj'?+m.qty:-m.qty),0);
          b.last_out_d=moves.filter(m=>m.item_id===1&&m.kind==='out').map(m=>m.d).sort().pop()||null;
          return T([]);}
        if(method==='POST'&&path.startsWith('pnl_supply_items')){const rows=JSON.parse(opt.body);const made=rows.map(r=>Object.assign({id:nextId++},r));posts.push({t:'items',rows:made});return T(made);}
        if(method==='POST'&&path.startsWith('pnl_supply_moves')){let rows=JSON.parse(opt.body);const arr=Array.isArray(rows)?rows:[rows];const made=arr.map(r=>Object.assign({id:nextId++,created_at:new Date().toISOString()},r));posts.push({t:'moves',rows:made});return T(made);}
        if(method==='POST')return T([]);
        if(path.startsWith('pnl_supply_balance')){const br=(path.match(/branch=eq\.([A-Z]+)/)||[])[1];const q=path.match(/item_id=eq\.(\d+)/);let r=bal.filter(b=>!br||b.branch===br);if(path.includes('deleted_at=is.null'))r=r.filter(b=>!b.deleted_at);if(q)r=r.filter(b=>b.item_id===+q[1]);return T(r);}
        if(path.startsWith('pnl_supply_items')){ // ค้นชื่อซ้ำ (รวมที่เลิกใช้)
          const nm=decodeURIComponent((path.match(/name=eq\.([^&]+)/)||[])[1]||'');const brs=((path.match(/branch=in\.\(([^)]*)\)/)||[])[1]||'').split(',').filter(Boolean);
          return T(items.filter(x=>x.name===nm&&(!brs.length||brs.includes(x.branch))));}
        if(path.startsWith('pnl_supply_moves')){const br=(path.match(/branch=eq\.([A-Z]+)/)||[])[1];const it=path.match(/item_id=eq\.(\d+)/);let r=moves.filter(m=>!br||m.branch===br);
          if(it)r=r.filter(m=>m.item_id===+it[1]);
          if(path.includes('kind=eq.out'))r=r.filter(m=>m.kind==='out');
          const g=(path.match(/d=gte\.([\d-]+)/)||[])[1],l=(path.match(/d=lte\.([\d-]+)/)||[])[1]; if(g)r=r.filter(m=>m.d>=g); if(l)r=r.filter(m=>m.d<=l);
          if(path.includes('order=created_at.desc'))r=[...r].sort((a,b)=>a.created_at<b.created_at?1:-1);
          const lim=+(path.match(/limit=(\d+)/)||[])[1]; const off=+(path.match(/offset=(\d+)/)||[])[1]||0; if(lim)r=r.slice(off,off+lim);
          return T(r);}
        if(path.startsWith('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
        if(path.startsWith('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
        return T([]);
      };
      w.TextEncoder=TextEncoder;
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      w.HTMLCanvasElement.prototype.getContext=()=>({});
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  const w=vc.window; return {w,d:w.document,bal,moves:()=>moves,posts,patches,dels,logs,LAST_OUT_ID};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=[];
  // ===== ผู้ดูแล =====
  {
    const {w,d,bal,posts,patches,dels,logs,LAST_OUT_ID}=mk(users[0]);
    await wait(500); await w.show('sup'); await wait(400);
    const v=d.getElementById('view-sup');
    out.push('[A] KPI เบิกเดือนนี้ = 126 ครั้ง (125+1) ไม่ใช่นับจาก 120 แถวที่โหลด: '+(v.textContent.includes('เบิกเดือนนี้')&&[...v.querySelectorAll('.kpi')].some(k=>k.textContent.includes('เบิกเดือนนี้')&&k.querySelector('.kpi-v').textContent==='126')));
    out.push('[A] ช่อง safety ตะเกียบ = 1000 (ไม่ใช่ว่างเพราะคอมมา): '+(v.querySelector('tr[data-id="1"] input.spl-saf').value==='1000'));
    // ลำดับหมวด: ภาชนะ → เครื่องใช้ไฟฟ้า → ทำความสะอาด → อื่นๆ (ตาม SPL_CATS ไม่ใช่ตัวอักษร) + colspan = 5 คอลัมน์โหมดสาขาเดียว
    const cats=[...v.querySelectorAll('tr.spl-cat td')];
    out.push('[A] หมวดเรียงตาม SPL_CATS (ภาชนะ,เครื่องใช้ไฟฟ้า,ทำความสะอาด,อื่นๆ): '+(cats.map(c=>c.textContent).join('|')==='ภาชนะ|เครื่องใช้ไฟฟ้า|ทำความสะอาด|อื่นๆ'));
    out.push('[A] colspan หัวหมวด = จำนวนคอลัมน์จริง (5): '+(cats[0].getAttribute('colspan')==='5'&&v.querySelector('table tr').children.length===5));
    out.push('[A] ของที่เลิกใช้ (ผ้ากันเปื้อน) ไม่แสดง: '+!v.textContent.includes('ผ้ากันเปื้อน'));
    // พิมพ์ค้นหา: โฟกัสต้องอยู่ที่ช่องเดิม
    const q=d.getElementById('splQ'); q.focus(); q.value='เตา'; q.dispatchEvent(new w.Event('input',{bubbles:true})); await wait(30);
    out.push('[A] พิมพ์ค้นหาแล้วโฟกัสยังอยู่ที่ช่องค้นหา + ค่าคงอยู่ + กรองเหลือ 1: '+(d.activeElement&&d.activeElement.id==='splQ'&&d.getElementById('splQ').value==='เตา'&&v.querySelectorAll('tr[data-id]').length===1));
    w.eval("S.spl.q=''"); w.splRender();
    // นับจริงตะเกียบ: ช่องเติม 1200 (เลขดิบ) และคิดส่วนต่างจากยอดสด (view เปลี่ยนเป็น 1190 ระหว่างเปิดหน้า)
    bal[0].qty=1190; // อีกเครื่องเบิกไป 10
    await w.splMove(1,'adj'); await wait(80);
    out.push('[A] หน้าต่างนับ: ช่องเติมยอดสด 1190 (เลขดิบ ไม่มีคอมมา) + ข้อความคงเหลือ 1,190: '+(d.getElementById('smQ').value==='1190'&&d.getElementById('modalBox').textContent.includes('1,190')));
    d.getElementById('smQ').value='1185'; await w.splMoveSave(1,'adj'); await wait(60);
    let mv=posts.filter(p=>p.t==='moves').pop();
    out.push('[A] นับได้ 1185 → adj -5 (จากยอดสด 1190 ไม่ใช่ 1200) + หมายเหตุอัตโนมัติ: '+!!(mv&&mv.rows[0].kind==='adj'&&mv.rows[0].qty===-5&&/นับจริงได้ 1,185/.test(mv.rows[0].note)));
    out.push('[A] คงเหลือหลังนับ 1,185: '+(v.querySelector('tr[data-id="1"] .spl-qty').textContent==='1,185'));
    // นับจริงช่องว่าง → ไม่บันทึก
    bal[0].qty=1185;
    await w.splMove(1,'adj'); await wait(60); d.getElementById('smQ').value=''; const n0=posts.length; await w.splMoveSave(1,'adj'); await wait(30);
    out.push('[A] นับจริงช่องว่าง → ไม่บันทึก + เตือน: '+(posts.length===n0&&d.getElementById('toast').textContent.includes('นับได้')));
    // ส่วนที่ขาด → ชำรุด: นับได้ 1180 จาก 1185 → lost 5
    d.getElementById('smQ').value='1180'; await w.splMoveSave(1,'lost',true); await wait(60);
    mv=posts.filter(p=>p.t==='moves').pop();
    out.push('[A] "ส่วนที่ขาด → ชำรุด" นับได้ 1180 จาก 1185 → POST lost qty 5 (ไม่ใช่ 1180): '+!!(mv&&mv.rows[0].kind==='lost'&&mv.rows[0].qty===5));
    out.push('[A] คงเหลือ 1,180: '+(v.querySelector('tr[data-id="1"] .spl-qty').textContent==='1,180'));
    // ส่วนที่ขาด → ชำรุด แต่นับได้เท่าเดิม/มากกว่า → ไม่บันทึก
    bal[0].qty=1180;
    await w.splMove(1,'adj'); await wait(60); const n1=posts.length; await w.splMoveSave(1,'lost',true); await wait(30);
    out.push('[A] นับได้เท่าที่มี กดชำรุด → ไม่บันทึก: '+(posts.length===n1&&d.getElementById('toast').textContent.includes('ไม่มีของชำรุด')));
    d.getElementById('smQ').value='1300'; await w.splMoveSave(1,'lost',true); await wait(30);
    out.push('[A] นับได้มากกว่าที่มี กดชำรุด → ไม่บันทึก: '+(posts.length===n1));
    w.closeModal();
    // ปุ่มชำรุดตรง: 3 ชิ้น
    await w.splMove(1,'lost'); await wait(60);
    out.push('[A] ปุ่มชำรุดในแถว: ป้ายช่อง "จำนวนที่ชำรุด": '+d.getElementById('modalBox').textContent.includes('จำนวนที่ชำรุด'));
    d.getElementById('smQ').value='3'; await w.splMoveSave(1,'lost'); await wait(60);
    mv=posts.filter(p=>p.t==='moves').pop();
    out.push('[A] ชำรุด 3 → POST lost 3 · คงเหลือ 1,177: '+!!(mv&&mv.rows[0].qty===3&&v.querySelector('tr[data-id="1"] .spl-qty').textContent==='1,177'));
    // เบิกเกินยอดสด → มี confirm (mock confirm=true) และ toast ไม่มี &amp;
    // ลบประวัติเบิกล่าสุด → view คำนวณใหม่ ทั้ง qty และเบิกล่าสุด
    bal[0].qty=1177;
    await w.splHist(1); await wait(100);
    await w.splMoveDel(LAST_OUT_ID,1); await wait(120);
    out.push('[A] ลบเบิกล่าสุด 29 ส.ค. → เบิกล่าสุดกลายเป็น 28 ส.ค. (อ่าน view ใหม่) + DELETE ถูกยิง: '+(dels.some(x=>x.includes('id=eq.'+LAST_OUT_ID))&&v.querySelector('tr[data-id="1"] .spl-lo').textContent.includes('28 ส.ค.')));
    out.push('[A] KPI เบิกเดือนนี้ลดเป็น 125: '+([...v.querySelectorAll('.kpi')].some(k=>k.textContent.includes('เบิกเดือนนี้')&&k.querySelector('.kpi-v').textContent==='125')));
    w.closeModal();
    // เพิ่มชื่อที่เคยเลิกใช้ → กู้คืน (PATCH deleted_at null) ไม่ POST ใหม่
    w.splItemModal(null); await wait(50);
    d.getElementById('siName').value='ผ้ากันเปื้อน'; d.getElementById('siCat').value='ยูนิฟอร์ม'; d.getElementById('siUnit').value='ผืน'; d.getElementById('siSaf').value='6'; d.getElementById('siInit').value='10';
    const nItems=posts.filter(p=>p.t==='items').length;
    bal[4].deleted_at=null; // จำลอง view หลังกู้คืน
    await w.splItemSave(null); await wait(400);
    const rp=patches.find(x=>x.path==='pnl_supply_items?id=eq.7');
    out.push('[A] กู้คืนของที่เลิกใช้: PATCH deleted_at=null + safety 6, ไม่ POST แถวใหม่: '+!!(rp&&rp.body.deleted_at===null&&rp.body.safety===6&&posts.filter(p=>p.t==='items').length===nItems));
    const im=posts.filter(p=>p.t==='moves').pop();
    out.push('[A] ยอดตั้งต้น 10 ลงให้รายการที่กู้คืน (item 7): '+!!(im&&im.rows[0].item_id===7&&im.rows[0].qty===10&&im.rows[0].kind==='in'));
    out.push('[A] toast บอกว่ากู้คืน: '+d.getElementById('toast').textContent.includes('กู้คืน'));
    // เพิ่มชื่อที่มีอยู่แล้ว → แจ้งซ้ำ ไม่ POST
    w.splItemModal(null); await wait(50); d.getElementById('siName').value='ตะเกียบ'; const nI2=posts.filter(p=>p.t==='items').length; await w.splItemSave(null); await wait(60);
    out.push('[A] เพิ่มชื่อซ้ำ (ตะเกียบ) → แจ้ง "มีอยู่แล้ว" ไม่ POST: '+(posts.filter(p=>p.t==='items').length===nI2&&d.getElementById('toast').textContent.includes('อยู่แล้ว')));
    w.closeModal();
    // ตัวกรองหมวดค้าง: เลือก 'ทำความสะอาด' แล้วสลับไปลาดพร้าว (ไม่มีหมวดนี้) → ต้องล้างตัวกรอง เห็นของ
    w.eval("S.spl.cat='ทำความสะอาด'"); w.splRender();
    out.push('[A] กรองหมวดทำความสะอาด → 1 แถว: '+(v.querySelectorAll('tr[data-id]').length===1));
    w.pickBranch('JJLP'); await wait(400);
    out.push('[A] สลับสาขาที่ไม่มีหมวดนั้น → ตัวกรองถูกล้าง เห็นเสื้อพนักงาน: '+(w.eval('S.spl.cat')===''&&v.querySelectorAll('tr[data-id]').length===1&&v.textContent.includes('เสื้อพนักงาน')));
    // โหมดทุกสาขา: หมวดเดียวหัวเดียว, colspan 6
    w.pickBranch('ALL'); await wait(400);
    const catsAll=[...v.querySelectorAll('tr.spl-cat td')];
    out.push('[A] ทุกสาขา: 5 หัวหมวด (ไม่ซ้ำข้ามสาขา) + colspan 6 + ยูนิฟอร์มมีทั้ง 2 สาขาใต้หัวเดียว: '+(catsAll.length===5&&catsAll[0].getAttribute('colspan')==='6'&&v.querySelector('table tr').children.length===6));
    // activity log อ่านออก
    out.push('[A] activity log ใช้ชื่ออ่านออก + มี kind/who: '+logs.some(l=>l.action.includes('ของใช้/อุปกรณ์')&&/kind=/.test(l.detail)));
    out.push('errors: '+JSON.stringify(w.errors));
  }
  // ===== ผู้ใช้ดูอย่างเดียว (JJ Access sup='v') =====
  {
    const {w,d,posts,patches}=mk(users[1]);
    await wait(600); await w.show('sup'); await wait(400);
    const v=d.getElementById('view-sup');
    out.push('[V] เข้าแท็บได้ (S.tab=sup) + แบนเนอร์ดูอย่างเดียว: '+(w.eval('S.tab')==='sup'&&v.textContent.includes('ดูอย่างเดียว')));
    out.push('[V] ไม่มีปุ่มเบิก/รับเข้า/เพิ่มของใช้ และช่อง safety เป็นตัวหนังสือ: '+(!v.querySelector('.spl-act button')&&!v.textContent.includes('เพิ่มของใช้')&&!v.querySelector('input.spl-saf')&&v.querySelector('tr[data-id="1"]').textContent.includes('1,000')));
    out.push('[V] colspan หัวหมวด = 4 (ไม่มีคอลัมน์ปุ่ม): '+(v.querySelector('tr.spl-cat td').getAttribute('colspan')==='4'&&v.querySelector('table tr').children.length===4));
    await w.splMove(1,'out'); await wait(50);
    out.push('[V] เรียก splMove ตรง ๆ → ไม่เปิดหน้าต่าง + เตือน: '+(!d.getElementById('modalWrap').classList.contains('on')&&d.getElementById('toast').textContent.includes('ได้อย่างเดียว')));
    out.push('[V] ไม่มีการเขียนใด ๆ: '+(posts.length===0&&patches.length===0));
    out.push('errors: '+JSON.stringify(w.errors));
  }
  console.log(out.join('\n')); process.exit(0);
})();
