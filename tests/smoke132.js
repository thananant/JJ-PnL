// smoke132: jjmk-stockcheck — คำแปลชื่อสินค้าที่ตั้งไว้ในแอพนับเดิม (products.i18n) ชนะคำแปลกูเกิล/คลังกลาง sc_i18n (เจ้าของสั่ง 15 ต.ค. 2569)
// ฐานจำลองแบบมีสถานะ (PATCH เขียนจริง · sc_i18n upsert จริง) · กูเกิลจำลอง = "G(ข้อความ)" · ปิด prewarm (ทดสอบว่าไม่ต้องพึ่งตัวแปลล่วงหน้า)
// รัชดา p1 หมูสามชั้น {en:'Pork belly (JJ)',lo,my} · ลาดพร้าว q1 หมูสามชั้น {en:'Pork belly (LP old)'} → en ต้องได้ของสาขาที่เปิด (รัชดา)
// p2 Coke en 'Coke' (= ชื่อ → '=') · p3 ผักบุ้ง i18n เป็นสตริง JSON · p4 น้ำแข็ง ไม่มี i18n
// p5 น้ำจิ้ม รัชดา i18n null แต่ลาดพร้าว q5 มี {en,my} → ข้ามสาขาต้องได้ · q6 แจ่วลาว มีแค่ลาดพร้าว {en,lo,my} (คลังกลางมีกูเกิล 'Lao Jaew')
// p7 "น้ำแข็ง 5 กก." {en:'Ice bag (JJ)'} + คลังกลางมีแถวชื่อเต็ม 'Ice bag (JJ)' (ของเก่าที่แอพเขียนไว้) + แถวคีย์ตัดเลข 'น้ำแข็ง 0 กก.' = 'Ice 0 kg'
// คิดมือ: ล้าง en ของ "น้ำแข็ง 5 กก." → คำแปลอัตโนมัติ = trFill('Ice 0 kg') = 'Ice 5 kg' → เขียนทับแถวชื่อเต็มในคลังกลาง
//         แก้แจ่วลาวเฉพาะ en → {en:'Jaew chili dip', lo:'ແຈ່ວ (JJ)', my:'ဂျော်ချဥ် (JJ)'} (ลาว/พม่าไม่หาย)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const RD='b19f0a17b4472', LP='b19f0a17b448212';
const HP=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const MODE={i18nErr:false};
const P=(id,br,name,unit,i18n,sort)=>({id,branch_id:br,name,unit,sup:'S',cat_label:'ของ',sort,rate_wk:1,rate_fri:1,rate_we:1,image_url:null,deleted_at:null,i18n});
const DB=[
  P('p1',RD,'หมูสามชั้น','กก.',{en:'Pork belly (JJ)',lo:'ໝູສາມຊັ້ນ',my:'ဝက်သုံးထပ်'},1),
  P('q1',LP,'หมูสามชั้น','กก.',{en:'Pork belly (LP old)'},1),
  P('p2',RD,'Coke','ขวด',{en:'Coke',lo:'',my:null},2),
  P('p3',RD,'ผักบุ้ง','กก.','{"en":"Morning glory (JJ)"}',3),
  P('p4',RD,'น้ำแข็ง','ถุง',null,4),
  P('p5',RD,'น้ำจิ้ม','ขวด',null,5),
  P('q5',LP,'น้ำจิ้ม','ขวด',{en:'Dipping sauce (JJ)',my:'ဆော့စ် (JJ)'},5),
  P('q6',LP,'แจ่วลาว','ถ้วย',{en:'Jaew dip (JJ)',lo:'ແຈ່ວ (JJ)',my:'ဂျော်ချဥ် (JJ)'},6),
  P('p7',RD,'น้ำแข็ง 5 กก.','ถุง',{en:'Ice bag (JJ)'},7)];
const SC={en:{'หมูสามชั้น':'Three-layer pork','น้ำแข็ง':'Ice','แจ่วลาว':'Lao Jaew','น้ำแข็ง 5 กก.':'Ice bag (JJ)','น้ำแข็ง 0 กก.':'Ice 0 kg'},lo:{},my:{}};
function prodQ(url){ // กรองแบบ PostgREST เท่าที่แอพใช้
  const p=new URL(url).searchParams; let rows=DB.slice();
  const nm=p.get('name'); if(nm&&nm.startsWith('eq.'))rows=rows.filter(r=>r.name===nm.slice(3));
  const bi=p.get('branch_id'); if(bi&&bi.startsWith('eq.'))rows=rows.filter(r=>r.branch_id===bi.slice(3));
  if(bi&&bi.startsWith('in.(')){const ids=bi.slice(4,-1).split(',');rows=rows.filter(r=>ids.includes(r.branch_id));}
  if(p.get('i18n')==='not.is.null')rows=rows.filter(r=>r.i18n!=null);
  if(p.get('deleted_at')==='is.null')rows=rows.filter(r=>!r.deleted_at);
  const sel=(p.get('select')||'*').split(',');
  return rows.map(r=>{const o={};sel.forEach(k=>{if(k in r)o[k]=r[k];});return o;});
}
function session(ls){
  const log={patch:[],post:[],gt:[],toast:[]};
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      Object.keys(ls||{}).forEach(k=>w.localStorage.setItem(k,ls[k]));
      w.JJSC_NOPREWARM=1;
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
        if(url.includes('translate.googleapis')){const q=new URL(url).searchParams.get('q');log.gt.push(q);return T([[[q.split('\n').map(x=>'G('+x+')').join('\n')]]]);}
        if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
          {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
          return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
        if(url.includes('/sc_i18n')){
          if(method==='POST'){const rows=JSON.parse(opt.body);log.post.push(rows);rows.forEach(r=>{(SC[r.lang]=SC[r.lang]||{})[r.src]=r.txt;});return T([]);}
          const l=new URL(url).searchParams.get('lang').slice(3);return T(Object.keys(SC[l]||{}).map(src=>({src,txt:SC[l][src]})));}
        if(url.includes('/products')){
          if(method==='PATCH'){const p=new URL(url).searchParams,body=JSON.parse(opt.body);log.patch.push({url:decodeURIComponent(url),body});
            const nm=p.get('name');DB.forEach(r=>{if(nm&&r.name===nm.slice(3))Object.assign(r,JSON.parse(JSON.stringify(body)));});return T([]);}
          if(method!=='GET')return T([]);
          if(MODE.i18nErr&&/select=[^&]*i18n/.test(url))return {ok:false,status:400,text:async()=>'{"code":"42703","message":"column products.i18n does not exist"}'};
          return T(prodQ(url));}
        return T([]);
      };
      w.TextEncoder=TextEncoder; w.confirm=()=>true;
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  const w=vc.window;
  return {w,d:w.document,log};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(s){
  await sleep(300);
  const t0=s.w.toast; s.w.toast=(m,bad)=>{s.log.toast.push(m);t0(m,bad);};
  s.d.getElementById('lgU').value='admin'; s.d.getElementById('lgP').value='jjmk1234';
  await s.w.doLogin(); await sleep(200);
  s.d.getElementById('cd').value='2026-10-15'; await s.w.loadAll(); await sleep(120);
}
const tg=(w,t,l)=>w.eval("trGet("+JSON.stringify(t)+",trLoad('"+l+"'))");
const val=(d,l)=>(d.getElementById('ptr_'+l)||{}).value;
const lsCopy=w=>{const o={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);if(/^jjsc_(tr3|ptr)_/.test(k))o[k]=w.localStorage.getItem(k);}return o;};
async function saveTr(s){ const b=s.d.querySelector('#ovlBox .go'); b.click(); await sleep(150); }
setTimeout(async()=>{
  const out=[];
  // ===== เครื่อง A =====
  const A=session({'jjsc_tr3_en':JSON.stringify({'หมูสามชั้น':'Pork 3 layers (old cache)'})}); const w=A.w,d=A.d;
  await boot(A);
  out.push('S.prodTr: en หมูสามชั้น/ผักบุ้ง(สตริง JSON)/Coke · lo หมูสามชั้น · ไม่มีน้ำแข็ง · lo ของ Coke ว่าง = ไม่เก็บ: '
    +w.eval("(o=>o.en['หมูสามชั้น']==='Pork belly (JJ)'&&o.en['ผักบุ้ง']==='Morning glory (JJ)'&&o.en['Coke']==='Coke'&&o.lo['หมูสามชั้น']==='ໝູສາມຊັ້ນ'&&!('น้ำแข็ง' in o.en)&&!('Coke' in o.lo)&&o.my['หมูสามชั้น']==='ဝက်သုံးထပ်')(S.prodTr)"));
  out.push('อ่าน products.i18n ทุกสาขา: น้ำจิ้ม (รัชดาว่าง ลาดพร้าวมี) en Dipping sauce (JJ) · แจ่วลาว (มีแค่ลาดพร้าว) en/lo · หมูสามชั้น en ใช้ของสาขาที่เปิด (ไม่ใช่ Pork belly (LP old)): '
    +w.eval("(o=>o.en['น้ำจิ้ม']==='Dipping sauce (JJ)'&&o.my['น้ำจิ้ม']==='ဆော့စ် (JJ)'&&o.en['แจ่วลาว']==='Jaew dip (JJ)'&&o.lo['แจ่วลาว']==='ແຈ່ວ (JJ)'&&o.en['หมูสามชั้น']==='Pork belly (JJ)')(S.prodTr)"));
  out.push('ทับแคชในเครื่องเดิม (Pork 3 layers) → Pork belly (JJ) · ลาว/พม่าได้ของที่ตั้งไว้: '+(tg(w,'หมูสามชั้น','en')==='Pork belly (JJ)'&&tg(w,'หมูสามชั้น','lo')==='ໝູສາມຊັ້ນ'&&tg(w,'หมูสามชั้น','my')==='ဝက်သုံးထပ်'));
  out.push('ชื่อเหมือนคำแปล (Coke) = ใช้ต้นฉบับ (TRSAME): '+(w.eval("trLoad('en')['Coke']")==='='&&tg(w,'Coke','en')==='Coke'));
  await w.eval("i18nLoad('en')"); await sleep(50);
  out.push('โหลดคลังกลาง sc_i18n (มีคำแปลกูเกิล Three-layer pork / Lao Jaew) แล้ว ชื่อสินค้ายังเป็นของที่ตั้งไว้ · คำอื่นจากคลังกลางยังได้ (Ice): '
    +(tg(w,'หมูสามชั้น','en')==='Pork belly (JJ)'&&tg(w,'แจ่วลาว','en')==='Jaew dip (JJ)'&&tg(w,'น้ำแข็ง','en')==='Ice'));
  out.push('จำลงแคชในเครื่อง (localStorage) แล้ว: '+(JSON.parse(w.localStorage.getItem('jjsc_tr3_en')||'{}')['หมูสามชั้น']==='Pork belly (JJ)'));
  // 🌏 สินค้าที่มีแค่อีกสาขา: ช่องต้องขึ้นคำแปลที่ตั้งไว้ (ไม่ใช่กูเกิล) · แก้แค่ en → ลาว/พม่าไม่หาย
  A.log.patch.length=0; A.log.post.length=0;
  await w.prodTrOpen('แจ่วลาว'); await sleep(60);
  out.push('🌏 แจ่วลาว (มีแค่ลาดพร้าว · เปิดอยู่รัชดา): ช่องขึ้น Jaew dip (JJ) / ແຈ່ວ (JJ) / ဂျော်ချဥ် (JJ) ไม่ใช่กูเกิล Lao Jaew: '
    +(val(d,'en')==='Jaew dip (JJ)'&&val(d,'lo')==='ແຈ່ວ (JJ)'&&val(d,'my')==='ဂျော်ချဥ် (JJ)'));
  d.getElementById('ptr_en').value='Jaew chili dip'; await saveTr(A);
  const pj=A.log.patch.find(x=>x.url.includes('products?name=eq.แจ่วลาว'));
  out.push('บันทึกแบบรวม: PATCH {en:Jaew chili dip, lo:ແຈ່ວ (JJ), my:ဂျော်ချဥ် (JJ)} · ในฐานลาว/พม่ายังอยู่: '
    +(!!pj&&JSON.stringify(pj.body.i18n)===JSON.stringify({en:'Jaew chili dip',lo:'ແຈ່ວ (JJ)',my:'ဂျော်ချဥ် (JJ)'})&&DB.find(r=>r.id==='q6').i18n.lo==='ແຈ່ວ (JJ)'));
  out.push('คำแปลที่ตั้งเองไม่เขียนลงคลังกลาง sc_i18n · แคชเครื่องนี้ได้ Jaew chili dip: '+(!A.log.post.some(rows=>rows.some(r=>r.txt==='Jaew chili dip'))&&tg(w,'แจ่วลาว','en')==='Jaew chili dip'));
  // 🌏 สินค้าที่ไม่มีคำแปลตั้งไว้: ช่องว่าง (ไม่เอากูเกิล/คลังกลางมาใส่)
  await w.prodTrOpen('น้ำแข็ง'); await sleep(60);
  out.push('🌏 น้ำแข็ง (ไม่เคยตั้ง · คลังกลางมี Ice): ช่องว่างทั้ง 3: '+(val(d,'en')===''&&val(d,'lo')===''&&val(d,'my')===''));
  w.modalClose();
  // 🌏 หมูสามชั้น: แก้ en · ล้าง lo · my เดิม
  A.log.patch.length=0; A.log.post.length=0; A.log.gt.length=0;
  await w.prodTrOpen('หมูสามชั้น'); await sleep(60);
  out.push('🌏 หมูสามชั้น: ช่องอังกฤษขึ้นของสาขาที่เปิด Pork belly (JJ): '+(val(d,'en')==='Pork belly (JJ)'));
  d.getElementById('ptr_en').value='Pork belly slices'; d.getElementById('ptr_lo').value=''; await saveTr(A); await sleep(150);
  const p1=A.log.patch.find(x=>x.url.includes('products?name=eq.หมูสามชั้น'));
  out.push('บันทึก: PATCH products?name=eq.หมูสามชั้น {en:Pork belly slices, my:ဝက်သုံးထပ်} (ลาวล้าง = ไม่เก็บ) · ทั้ง 2 สาขาในฐานได้เหมือนกัน · แคช en เปลี่ยน: '
    +(!!p1&&JSON.stringify(p1.body.i18n)===JSON.stringify({en:'Pork belly slices',my:'ဝက်သုံးထပ်'})&&JSON.stringify(DB.find(r=>r.id==='q1').i18n)===JSON.stringify(p1.body.i18n)&&tg(w,'หมูสามชั้น','en')==='Pork belly slices'));
  out.push('ไม่เขียน Pork belly slices ลงคลังกลาง: '+!A.log.post.some(rows=>rows.some(r=>r.txt==='Pork belly slices')));
  out.push('ลาวล้าง → ลบคำแปลที่ตั้งไว้ แล้วแปลอัตโนมัติกลับมา (กูเกิล G(หมูสามชั้น)) + เขียนทับแถวในคลังกลาง: '
    +(w.eval("!('หมูสามชั้น' in S.prodTr.lo)")&&tg(w,'หมูสามชั้น','lo')==='G(หมูสามชั้น)'&&SC.lo['หมูสามชั้น']==='G(หมูสามชั้น)'));
  A.log.patch.length=0; await w.prodTrOpen('หมูสามชั้น'); await sleep(60); const lo2=val(d,'lo'); await saveTr(A);
  out.push('เปิดหมูสามชั้นอีกรอบ: ช่องลาวว่าง (ไม่เอากูเกิล G(...) มาใส่) · กดบันทึกโดยไม่แก้อะไร → ไม่ PATCH: '+(lo2===''&&!A.log.patch.length&&!d.getElementById('ovl').classList.contains('on')));
  // ชื่อมีตัวเลข: ล้าง en → คลังกลางแถวชื่อเต็ม (Ice bag (JJ) ค้าง) ถูกเขียนทับด้วยคำแปลอัตโนมัติ Ice 5 kg
  A.log.patch.length=0;
  await w.prodTrOpen('น้ำแข็ง 5 กก.'); await sleep(60);
  const pre7=val(d,'en'); d.getElementById('ptr_en').value=''; await saveTr(A); await sleep(150);
  const p7=A.log.patch.find(x=>x.url.includes('products?name=eq.น้ำแข็ง 5 กก.'));
  out.push('น้ำแข็ง 5 กก.: ช่องขึ้น Ice bag (JJ) → ล้าง = PATCH i18n null · แคช = Ice 5 kg · คลังกลางแถวชื่อเต็มเป็น Ice 5 kg (ไม่ใช่ Ice bag (JJ)): '
    +(pre7==='Ice bag (JJ)'&&!!p7&&p7.body.i18n===null&&tg(w,'น้ำแข็ง 5 กก.','en')==='Ice 5 kg'&&SC.en['น้ำแข็ง 5 กก.']==='Ice 5 kg'));
  // products.i18n ถูกล้างจากที่อื่น (แอพเดิม/อีกเครื่อง) → โหลดใหม่ = ลบคำแปลเก่าออกจากแคชเครื่องนี้ · ของที่ไม่ได้มาจาก products.i18n ไม่แตะ
  DB.find(r=>r.id==='p3').i18n=null;
  await w.loadAll(); await sleep(100);
  out.push('ผักบุ้ง i18n ถูกล้าง → โหลดใหม่ แคชไม่มี Morning glory (JJ) แล้ว · รายการที่จำไว้ (jjsc_ptr_en) ไม่มีผักบุ้ง · น้ำแข็ง (Ice จากคลังกลาง) ยังอยู่: '
    +(tg(w,'ผักบุ้ง','en')!=='Morning glory (JJ)'&&!('ผักบุ้ง' in JSON.parse(w.localStorage.getItem('jjsc_ptr_en')||'{}'))&&'หมูสามชั้น' in JSON.parse(w.localStorage.getItem('jjsc_ptr_en')||'{}')&&tg(w,'น้ำแข็ง','en')==='Ice'));
  // ===== เครื่อง A เปิดใหม่ (แคชเดิม) =====
  const A2=session(lsCopy(w)); await boot(A2); await A2.w.eval("i18nLoad('en')"); await A2.w.eval("i18nLoad('lo')"); await sleep(50);
  out.push('เครื่องเดิมเปิดใหม่: น้ำแข็ง 5 กก. = Ice 5 kg (ไม่กลับเป็น Ice bag (JJ)) · ผักบุ้งไม่มีคำแปลเก่า · หมูสามชั้น ลาว = G(หมูสามชั้น) · en = Pork belly slices: '
    +(tg(A2.w,'น้ำแข็ง 5 กก.','en')==='Ice 5 kg'&&tg(A2.w,'ผักบุ้ง','en')!=='Morning glory (JJ)'&&tg(A2.w,'หมูสามชั้น','lo')==='G(หมูสามชั้น)'&&tg(A2.w,'หมูสามชั้น','en')==='Pork belly slices'));
  await A2.w.prodTrOpen('น้ำแข็ง 5 กก.'); await sleep(60);
  out.push('เครื่องเดิมเปิดใหม่: 🌏 น้ำแข็ง 5 กก. ช่อง en ว่าง: '+(val(A2.d,'en')===''));
  // ===== เครื่องใหม่ (แคชว่าง) =====
  const B=session({}); await boot(B); await B.w.eval("i18nLoad('en')"); await sleep(50);
  out.push('เครื่องใหม่: น้ำแข็ง 5 กก. = Ice 5 kg · แจ่วลาว (ลาดพร้าว) en Jaew chili dip / lo ແຈ່ວ (JJ) ทั้งที่เปิดรัชดา: '
    +(tg(B.w,'น้ำแข็ง 5 กก.','en')==='Ice 5 kg'&&tg(B.w,'แจ่วลาว','en')==='Jaew chili dip'&&B.w.eval("trGet('แจ่วลาว',trLoad('lo'))")==='ແຈ່ວ (JJ)'));
  // อ่าน products.i18n ไม่ได้ (ไม่มีคอลัมน์) → ไม่พัง ใช้แบบเดิม · ไม่ลบคำแปลในเครื่อง · 🌏 ไม่เปิด (กันบันทึกทับของเดิม)
  MODE.i18nErr=true; await w.loadAll(); await sleep(100);
  out.push('อ่าน i18n ไม่ได้ → ไม่พัง · S.prodTr ว่าง · หน้านับยังโหลด (รัชดา 6 ตัว) · แคชคำแปลเดิมยังอยู่ (Pork belly slices): '
    +(w.eval("Object.keys(S.prodTr.en).length")===0&&w.eval('S.all.length')===6&&tg(w,'หมูสามชั้น','en')==='Pork belly slices'));
  w.modalClose(); A.log.toast.length=0;
  await w.prodTrOpen('หมูสามชั้น'); await sleep(60);
  out.push('อ่าน i18n ไม่ได้ → 🌏 ไม่เปิดหน้าแก้ + แจ้ง "โหลดคำแปลไม่สำเร็จ": '+(!d.getElementById('ovl').classList.contains('on')&&A.log.toast.some(m=>m.includes('โหลดคำแปลไม่สำเร็จ'))));
  out.push('errors: '+JSON.stringify([].concat(w.errors,A2.w.errors,B.w.errors)));
  console.log(out.join('\n')); process.exit(0);
},400);
