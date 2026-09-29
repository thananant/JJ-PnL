// smoke119: jjmk-stockcheck — หน้าสั่งของ: ช่อง "สั่งเพิ่ม" เป็นค่าแนะนำที่พิมพ์ทับได้
//   แก้เอง → ใบสั่งไลน์/จำนวนรายการ/ลัง ใช้ค่าที่แก้ · เท่าค่าแนะนำ/ว่าง = กลับค่าแนะนำ · สั่งของที่ "พอแล้ว" เพิ่มได้
//   จำต่อสาขา+วันขาย (localStorage) · ↺ กลับค่าแนะนำทั้งซัพ · Enter ไปช่องถัดไป · ติดลบไม่รับ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472',BID2='b19f0a17b448212';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const reqs=[];
function mk(preLS){
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
      w.localStorage.setItem('jjsc_tab','order');
      if(preLS)Object.entries(preLS).forEach(([k,v])=>w.localStorage.setItem(k,v));
      w.JJSC_NOPREWARM=1; w.confirm=()=>true;
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const body=opt&&opt.body?JSON.parse(opt.body):null;
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
        if(method!=='GET'){reqs.push({method,url,body});return T([]);}
        if(url.includes('sc_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}]);
        if(url.includes('pnl_users'))return T([{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',active:true,apps:{},perms:{}}]);
        if(url.includes('sc_units'))return T([{id:1,name:'กก.',kind:'both',sort:0,alias_of:null},{id:2,name:'ลัง',kind:'both',sort:1,alias_of:null}]);
        if(url.includes('pnl_unit_conv'))return T([{item:'น้ำดื่ม',from_unit:'ลัง',to_unit:'ขวด',factor:12}]);
        if(url.includes('pnl_bill_items'))return T([{item:'น้ำดื่ม',unit:'ลัง',d:'2026-09-10',supplier_id:1}]);
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาดสด'}]);
        if(url.includes('products')&&url.includes('branch_id=in.'))return T([]);
        if(url.includes('products'))return T([
          {id:'p1',branch_id:BID,cat_label:'ผัก',name:'กะหล่ำปลี',unit:'กก.',sup:'ตลาดสด',dept:'ผัก',rate_wk:10,rate_fri:10,rate_we:10,sort:1},
          {id:'p2',branch_id:BID,cat_label:'ผัก',name:'แครอท',unit:'กก.',sup:'ตลาดสด',dept:'ผัก',rate_wk:3,rate_fri:3,rate_we:3,sort:2},
          {id:'p3',branch_id:BID,cat_label:'ของแห้ง',name:'น้ำดื่ม',unit:'ขวด',sup:'ตลาดสด',dept:'ของแห้ง',rate_wk:24,rate_fri:24,rate_we:24,sort:3}]);
        if(url.includes('suppliers'))return T([{name:'ตลาดสด',order_mode:'any',lead_days:1}]);
        return T([]);
      };
      w.TextEncoder=TextEncoder;
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  return vc.window;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const plan=w=>JSON.parse(w.eval('JSON.stringify(orderPlan().map(g=>({sup:g.sup,nOrder:g.nOrder,nOvr:g.nOvr,rows:g.rows.map(r=>({n:r.it.name,o:r.order,s:r.sug,ov:r.ovr,p:r.packs}))})))'))[0];
(async()=>{
  const out=[];
  let w=mk(); let d=w.document;
  await sleep(900);
  // นับ: กะหล่ำ 4 (ต้องใช้ 10 → แนะนำ 6) · แครอท 10 (ต้องใช้ 3 → พอแล้ว) · น้ำดื่ม 0 (ต้องใช้ 24 → แนะนำ 24 ขวด = 2 ลัง)
  w.setQ('p1','4'); w.setQ('p2','10'); w.setQ('p3','0'); await sleep(60);
  w.setTab('order'); await sleep(200);
  let P=plan(w); const row=n=>P.rows.find(r=>r.n===n);
  out.push('ค่าแนะนำเดิม: กะหล่ำ 6 · แครอท 0 (พอแล้ว) · น้ำดื่ม 24 = 2 ลัง · ต้องสั่ง 2 รายการ: '+(row('กะหล่ำปลี').o===6&&row('แครอท').o===0&&row('น้ำดื่ม').o===24&&row('น้ำดื่ม').p===2&&P.nOrder===2&&P.nOvr===0));
  const inp=n=>[...d.querySelectorAll('#list input.oq')].find(i=>i.closest('.ordrow').textContent.includes(n));
  out.push('ทุกแถวมีช่องพิมพ์ (รวมแถวพอแล้ว) ค่าเริ่ม = ค่าแนะนำ: '+(!!inp('กะหล่ำปลี')&&inp('กะหล่ำปลี').value==='6'&&!!inp('แครอท')&&inp('แครอท').value===''&&inp('แครอท').closest('.ordrow').textContent.includes('พอแล้ว')));
  // แก้กะหล่ำเป็น 9
  let el=inp('กะหล่ำปลี'); el.value='9'; el.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(80);
  P=plan(w);
  out.push('แก้กะหล่ำ 6→9: order=9 · sug ยัง 6 · ovr=true · หัวซัพบอก แก้เอง 1: '+(row('กะหล่ำปลี').o===9&&row('กะหล่ำปลี').s===6&&row('กะหล่ำปลี').ov===true&&P.nOvr===1&&d.getElementById('list').textContent.includes('แก้เอง 1')));
  out.push('แถวโชว์ "แนะนำ 6" + ปุ่ม ↺ และช่องเป็นสีแก้เอง: '+(inp('กะหล่ำปลี').classList.contains('ov')&&inp('กะหล่ำปลี').closest('.ordrow').textContent.includes('แนะนำ 6')));
  // สั่งของที่พอแล้วเพิ่ม 2
  el=inp('แครอท'); el.value='2'; el.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(80);
  P=plan(w);
  out.push('แครอท (พอแล้ว) สั่งเพิ่ม 2 → นับเป็นรายการต้องสั่ง (3 รายการ): '+(row('แครอท').o===2&&P.nOrder===3));
  // น้ำดื่ม แก้เป็น 30 ขวด → 3 ลัง
  el=inp('น้ำดื่ม'); el.value='30'; el.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(80);
  P=plan(w);
  out.push('น้ำดื่ม 24→30 ขวด → ลังคิดใหม่ = 3: '+(row('น้ำดื่ม').o===30&&row('น้ำดื่ม').p===3));
  // ใบสั่งไลน์ใช้ค่าที่แก้
  const txt=w.orderText('ตลาดสด');
  out.push('ใบสั่งไลน์: กะหล่ำ 9 · แครอท 2 · น้ำดื่ม 3 ลัง (= 30 ขวด) · รวม 3 รายการ: '+(/กะหล่ำปลี — 9 กก\./.test(txt)&&/แครอท — 2 กก\./.test(txt)&&/น้ำดื่ม — 3 ลัง \(= 30 ขวด\)/.test(txt)&&txt.includes('รวม 3 รายการ')));
  // จำไว้ใน localStorage ต่อสาขา+วันขาย
  const ls=JSON.parse(w.localStorage.getItem('jjsc_ordovr'));
  out.push('จำใน localStorage คีย์ สาขา|วันขาย + map 3 ตัว: '+(!!ls&&ls.key===('JJRD|'+w.eval("($('#cd')&&$('#cd').value)||bizToday()"))&&ls.map.p1===9&&ls.map.p2===2&&ls.map.p3===30));
  // พิมพ์เท่าค่าแนะนำ = ยกเลิกการแก้
  el=inp('กะหล่ำปลี'); el.value='6'; el.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(80);
  P=plan(w);
  out.push('พิมพ์ 6 (= ค่าแนะนำ) → ไม่ถือว่าแก้เอง: '+(row('กะหล่ำปลี').o===6&&row('กะหล่ำปลี').ov===false));
  // ติดลบไม่รับ
  el=inp('กะหล่ำปลี'); el.value='-3'; el.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(80);
  P=plan(w);
  out.push('ติดลบ → ไม่รับ ค่าเดิม 6 + เตือน: '+(row('กะหล่ำปลี').o===6&&d.getElementById('toast').textContent.includes('ติดลบ')));
  // Enter ไปช่องถัดไป
  el=inp('กะหล่ำปลี'); el.focus(); el.value='7'; el.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true})); el.dispatchEvent(new w.Event('change',{bubbles:true})); /* jsdom: blur ไม่ยิง change เอง */ await sleep(80);
  P=plan(w);
  out.push('Enter: เก็บค่า 7 แล้วโฟกัสไปช่องถัดไป (แครอท): '+(row('กะหล่ำปลี').o===7&&d.activeElement&&d.activeElement.classList.contains('oq')&&d.activeElement.closest('.ordrow').textContent.includes('แครอท')));
  // ↺ ทั้งซัพ
  w.ordReset('ตลาดสด'); await sleep(80);
  P=plan(w);
  out.push('↺ ค่าแนะนำทั้งซัพ → กลับเป็น 6 / 0 / 24 · nOvr=0: '+(row('กะหล่ำปลี').o===6&&row('แครอท').o===0&&row('น้ำดื่ม').o===24&&P.nOvr===0));
  out.push('errors: '+JSON.stringify(w.errors));
  // เปิดใหม่ (รีเฟรช) — override ของสาขา/วันขายเดิมยังอยู่ · เปลี่ยนสาขา = ไม่ติดไป
  const cd=w.eval("($('#cd')&&$('#cd').value)||bizToday()");
  const w2=mk({jjsc_ordovr:JSON.stringify({key:'JJRD|'+cd,map:{p1:11}})}); const d2=w2.document;
  await sleep(900); w2.setQ('p1','4'); w2.setQ('p2','10'); w2.setQ('p3','0'); await sleep(60); w2.setTab('order'); await sleep(200);
  let P2=plan(w2);
  out.push('รีเฟรชแล้วค่าที่แก้ (11) ยังอยู่: '+(P2.rows.find(r=>r.n==='กะหล่ำปลี').o===11&&P2.nOvr===1));
  const w3=mk({jjsc_ordovr:JSON.stringify({key:'JJLP|'+cd,map:{p1:11}})});
  await sleep(900); w3.setQ('p1','4'); await sleep(60); w3.setTab('order'); await sleep(200);
  out.push('ค่าที่แก้ของอีกสาขา (JJLP) ไม่ติดมาที่รัชดา: '+(plan(w3).rows.find(r=>r.n==='กะหล่ำปลี').o===6));
  out.push('errors: '+JSON.stringify(w2.errors.concat(w3.errors)));
  console.log(out.join('\n')); process.exit(0);
})();
