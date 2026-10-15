// smoke132: jjmk-stockcheck — คำแปลชื่อสินค้าที่ตั้งไว้ในแอพนับเดิม (products.i18n) ชนะคำแปลกูเกิล/คลังกลาง sc_i18n (เจ้าของสั่ง 15 ต.ค. 2569)
// p1 หมูสามชั้น i18n {en:'Pork belly (JJ)', lo:'ໝູສາມຊັ້ນ', my:'ဝက်သုံးထပ်'} · คลังกลาง sc_i18n en มี 'Three-layer pork' (กูเกิล) → ต้องได้ 'Pork belly (JJ)'
// p2 Coke i18n en 'Coke' (เหมือนชื่อ = '=') · p3 i18n เป็นสตริง JSON · p4 ไม่มี i18n → ไม่แตะ
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const RD='b19f0a17b4472';
const HP=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const MODE={i18nErr:false};
const PRODS=[
  {id:'p1',branch_id:RD,name:'หมูสามชั้น',unit:'กก.',sup:'S',cat_label:'เนื้อ',sort:1,rate_wk:1,rate_fri:1,rate_we:1,i18n:{en:'Pork belly (JJ)',lo:'ໝູສາມຊັ້ນ',my:'ဝက်သုံးထပ်'}},
  {id:'p2',branch_id:RD,name:'Coke',unit:'ขวด',sup:'S',cat_label:'น้ำ',sort:2,rate_wk:1,rate_fri:1,rate_we:1,i18n:{en:'Coke',lo:'',my:null}},
  {id:'p3',branch_id:RD,name:'ผักบุ้ง',unit:'กก.',sup:'S',cat_label:'ผัก',sort:3,rate_wk:1,rate_fri:1,rate_we:1,i18n:'{"en":"Morning glory (JJ)"}'},
  {id:'p4',branch_id:RD,name:'น้ำแข็ง',unit:'ถุง',sup:'S',cat_label:'น้ำ',sort:4,rate_wk:1,rate_fri:1,rate_we:1,i18n:null}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_tr3_en',JSON.stringify({'หมูสามชั้น':'Pork 3 layers (old cache)'}));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method!=='GET')return T([]);
      if(url.includes('translate.googleapis'))return T([[['x']]]);
      if(url.includes('pnl_users')){const um=url.match(/username=eq\.([^&]+)/);const PU=[
        {id:1,username:'admin',pass_hash:HP('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',unit:'ALL',active:true,apps:{}}];
        return T(um?PU.filter(x=>x.username===decodeURIComponent(um[1])):PU);}
      if(url.includes('products')&&url.includes('select=name,i18n')){ if(MODE.i18nErr)return {ok:false,status:400,text:async()=>'{"code":"42703","message":"column products.i18n does not exist"}'};
        return T(PRODS.filter(p=>p.i18n).map(p=>({name:p.name,i18n:p.i18n}))); }
      if(url.includes('products')&&url.includes('branch_id=eq.'+RD))return T(PRODS.map(({i18n,...p})=>p));
      if(url.includes('products'))return T([]);
      if(url.includes('sc_i18n'))return T(url.includes('lang=eq.en')?[{src:'หมูสามชั้น',txt:'Three-layer pork'},{src:'น้ำแข็ง',txt:'Ice'}]:[]);
      return T([]);
    };
    w.TextEncoder=TextEncoder; w.confirm=()=>true;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  d.getElementById('lgU').value='admin'; d.getElementById('lgP').value='jjmk1234';
  await w.doLogin(); await sleep(300);
  d.getElementById('cd').value='2026-10-15'; await w.loadAll(); await sleep(150);
  const tg=(t,l)=>w.eval("trGet("+JSON.stringify(t)+",trLoad('"+l+"'))");
  out.push('S.prodTr: en หมูสามชั้น/ผักบุ้ง(สตริง JSON)/Coke · lo หมูสามชั้น · ไม่มีน้ำแข็ง · lo ของ Coke ว่าง = ไม่เก็บ: '
    +w.eval("(o=>o.en['หมูสามชั้น']==='Pork belly (JJ)'&&o.en['ผักบุ้ง']==='Morning glory (JJ)'&&o.en['Coke']==='Coke'&&o.lo['หมูสามชั้น']==='ໝູສາມຊັ້ນ'&&!('น้ำแข็ง' in o.en)&&!('Coke' in o.lo)&&o.my['หมูสามชั้น']==='ဝက်သုံးထပ်')(S.prodTr)"));
  out.push('ทับแคชในเครื่องเดิม (Pork 3 layers) → Pork belly (JJ) · ลาว/พม่าได้ของที่ตั้งไว้: '+(tg('หมูสามชั้น','en')==='Pork belly (JJ)'&&tg('หมูสามชั้น','lo')==='ໝູສາມຊັ້ນ'&&tg('หมูสามชั้น','my')==='ဝက်သုံးထပ်'));
  out.push('ชื่อเหมือนคำแปล (Coke) = ใช้ต้นฉบับ (TRSAME): '+(w.eval("trLoad('en')['Coke']")==='='&&tg('Coke','en')==='Coke'));
  await w.eval("i18nLoad('en')"); await sleep(50);
  out.push('โหลดคลังกลาง sc_i18n (มีคำแปลกูเกิล Three-layer pork) แล้ว ชื่อสินค้ายังเป็นของที่ตั้งไว้ · คำอื่นจากคลังกลางยังได้ (Ice): '+(tg('หมูสามชั้น','en')==='Pork belly (JJ)'&&tg('น้ำแข็ง','en')==='Ice'));
  out.push('จำลงแคชในเครื่อง (localStorage) แล้ว: '+(JSON.parse(w.localStorage.getItem('jjsc_tr3_en')||'{}')['หมูสามชั้น']==='Pork belly (JJ)'));
  // 🌏 แก้คำแปลในแอพใหม่ (แทนแอพนับเดิม)
  const pt=[],po=[]; const f0=w.fetch; w.fetch=async(url,opt)=>{ const m=opt&&opt.method||'GET'; if(m==='PATCH')pt.push({url:decodeURIComponent(url),body:JSON.parse(opt.body)}); if(m==='POST')po.push({url,rows:JSON.parse(opt.body)}); return f0(url,opt); };
  w.prodTrOpen('หมูสามชั้น'); await sleep(30);
  out.push('🌏 เปิดแก้คำแปล: ช่องอังกฤษขึ้นของเดิม Pork belly (JJ): '+(d.getElementById('ptr_en').value==='Pork belly (JJ)'));
  d.getElementById('ptr_en').value='Pork belly slices'; d.getElementById('ptr_lo').value=''; d.getElementById('ptr_my').value='ဝက်သုံးထပ်';
  await w.prodTrSave('หมูสามชั้น'); await sleep(80);
  const p1=pt.find(x=>x.url.includes('products?name=eq.หมูสามชั้น'));
  out.push('บันทึก: PATCH products?name=eq.หมูสามชั้น {i18n:{en,my}} (ลาวว่าง = ไม่เก็บ) · แคช en เปลี่ยน · คลังกลาง sc_i18n ได้ด้วย: '
    +(!!p1&&p1.body.i18n.en==='Pork belly slices'&&!('lo' in p1.body.i18n)&&p1.body.i18n.my==='ဝက်သုံးထပ်'&&tg('หมูสามชั้น','en')==='Pork belly slices'
      &&po.some(x=>x.url.includes('sc_i18n')&&x.rows.some(r=>r.lang==='en'&&r.src==='หมูสามชั้น'&&r.txt==='Pork belly slices'))));
  out.push('ลาวว่าง → ลบคำแปลที่ตั้งไว้ (กลับไปแปลอัตโนมัติ): '+(w.eval("!('หมูสามชั้น' in S.prodTr.lo)")&&w.eval("trLoad('lo')['หมูสามชั้น']")===undefined));
  w.fetch=f0;
  // อ่าน products.i18n ไม่ได้ (ไม่มีคอลัมน์) → ไม่พัง ใช้แบบเดิม
  MODE.i18nErr=true; await w.loadAll(); await sleep(100);
  out.push('อ่าน i18n ไม่ได้ → ไม่พัง · S.prodTr ว่าง · หน้านับยังโหลด: '+(w.eval("Object.keys(S.prodTr.en).length")===0&&w.eval('S.all.length')===4));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
