// smoke108: jjmk-stockcheck — ซัพที่ "ต้องจ่ายก่อนส่ง" → เตือนเข้ากลุ่มไลน์แอดมิน
//   + ตั้งค่ากลุ่มแอดมิน (config.remind_line_group) + ช่องสั่งล่วงหน้า/ติ๊กจ่ายก่อนส่ง ในหน้า 🚚 รอบสั่งซัพ
//   + ถ้ายังไม่ได้รัน sql/jjmk_stockcheck_supflags.sql (ไม่มีคอลัมน์ใหม่) ต้องบันทึกรอบสั่งได้ตามปกติ
// fixture: วันขายศุกร์ 18 ก.ย. 2569 · CPF (ต้องจ่ายก่อนส่ง · กลุ่ม C123) · Makro (ไม่ต้องจ่ายก่อน · กลุ่ม C999)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const sent=[],cfgPosts=[],supPatch=[];
let cfgRows=[];              // ยังไม่ได้ตั้งกลุ่มแอดมิน
let supColsOk=true;          // false = ยังไม่ได้รัน SQL (ไม่มีคอลัมน์ order_ahead/prepay)
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','order');
    w.localStorage.setItem('jjsc_lgsync',String(Date.now()));
    w.localStorage.setItem('JJSC_NOPREWARM','1');
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      const E=async(st,msg)=>({ok:false,status:st,text:async()=>JSON.stringify({message:msg}),json:async()=>({message:msg})});
      if(url.includes('/functions/v1/line-order')){sent.push(JSON.parse(opt.body));return T({ok:true});}
      if(url.includes('config')&&method==='POST'){const b=JSON.parse(opt.body);cfgPosts.push(b);
        cfgRows=[].concat(b).map(r=>({key:r.key,value:r.value}));return T([]);}
      if(url.includes('suppliers')&&method==='PATCH'){const b=JSON.parse(opt.body);
        if(!supColsOk&&('order_ahead' in b||'prepay' in b))return E(400,"Could not find the 'order_ahead' column of 'suppliers' in the schema cache (PGRST204)");
        supPatch.push(b);return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts')||url.includes('sc_units')||url.includes('sc_i18n')||url.includes('sc_config'))return T([]);
      if(url.includes('line_groups'))return T([
        {group_id:'C123',name:'กลุ่มสั่งของ CPF',seen_at:'2026-09-02'},
        {group_id:'C999',name:'กลุ่มสั่งของ Makro',seen_at:'2026-09-03'},
        {group_id:'CADM',name:'กลุ่มแอดมิน JJ',seen_at:'2026-09-04'}]);
      if(url.includes('config'))return T(cfgRows);
      if(url.includes('stock_receipts'))return T([]);
      if(url.includes('pnl_'))return T([]);
      if(url.includes('products'))return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสามชั้น',unit:'กก.',sup:'CPF',rate_wk:10,rate_fri:10,rate_we:10,dept:'ครัว',sort:1},
        {id:'p4',branch_id:BID,cat_label:'ของแห้ง',name:'น้ำมัน',unit:'ขวด',sup:'Makro',rate_wk:5,rate_fri:5,rate_we:5,dept:'ครัว',sort:2}]);
      if(url.includes('suppliers'))return T([
        {name:'CPF',order_mode:'fixed',schedule:{fri:'sat',sun:'mon'},order_ahead:0,prepay:true,line_group_id:'C123'},
        {name:'Makro',order_mode:'any',lead_days:1,order_ahead:0,prepay:false,line_group_id:'C999'}]);
      if(url.includes('stock_current'))return T([]);
      if(url.includes('stock_counts'))return T(url.includes('2026-09-18')
        ?[{product_id:'p1',qty:0,out_of_stock:false,created_at:'2026-09-18T23:00:00Z'},
          {product_id:'p4',qty:0,out_of_stock:false,created_at:'2026-09-18T23:00:00Z'}]:[]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  const list=()=>d.getElementById('list').textContent;
  d.getElementById('cd').value='2026-09-18';
  d.getElementById('cd').dispatchEvent(new w.Event('change'));
  await sleep(300);

  /* ---- 1) หน้า 🚚 รอบสั่งซัพ: ช่องสั่งล่วงหน้า + ติ๊กจ่ายก่อนส่ง ---- */
  w.setTab('sched'); await sleep(200);
  out.push('หน้ารอบสั่งซัพมีช่อง "สั่งล่วงหน้า N วัน" (เฉพาะซัพวันสั่งตายตัว) + ติ๊ก "ต้องจ่ายก่อนส่ง": '
    +(list().includes('สั่งล่วงหน้า')&&list().includes('ต้องจ่ายก่อนส่ง')
      &&d.querySelectorAll('#list input[type=checkbox]').length===2));
  out.push('CPF ติ๊กจ่ายก่อนส่งไว้แล้ว (อ่านค่าจาก suppliers.prepay) · Makro ยังไม่ติ๊ก: '
    +(w.eval("supObj('CPF').prepay")===true&&w.eval("supObj('Makro').prepay")===false));
  const iCPF=w.eval("S.supList.indexOf('CPF')");
  w.supSetAhead(iCPF,'2'); await sleep(60);
  w.supSetPrepay(iCPF,false); await sleep(60);
  out.push('แก้ค่าแล้วจำไว้ (ล่วงหน้า 2 วัน · เอาติ๊กออก) · เกิน 6 วันไม่ได้: '
    +(w.eval("supObj('CPF').ahead")===2&&w.eval("supObj('CPF').prepay")===false
      &&(w.supSetAhead(iCPF,'99'),w.eval("supObj('CPF').ahead"))===6));
  w.supSetAhead(iCPF,'1'); w.supSetPrepay(iCPF,true); await sleep(60);
  supPatch.length=0;
  await w.supSave(iCPF); await sleep(150);
  out.push('กด 💾 บันทึก order_ahead + prepay ลง suppliers (ชุดเดียวกับแอพนับเดิม): '
    +(supPatch.length===1&&supPatch[0].order_ahead===1&&supPatch[0].prepay===true&&supPatch[0].order_mode==='fixed'));
  // ยังไม่ได้รัน SQL → คอลัมน์ใหม่ไม่มี ต้องไม่พัง บันทึกรอบสั่งได้ตามปกติ
  supColsOk=false; supPatch.length=0;
  await w.supSave(iCPF); await sleep(150);
  out.push('ยังไม่ได้รัน sql/jjmk_stockcheck_supflags.sql → บันทึกรอบสั่งได้ตามเดิม + เตือนให้ไปรัน SQL: '
    +(supPatch.length===1&&!('order_ahead' in supPatch[0])&&!('prepay' in supPatch[0])
      &&d.getElementById('toast').textContent.includes('jjmk_stockcheck_supflags.sql')
      &&d.getElementById('toast').className.includes('err')));
  supColsOk=true;

  /* ---- 2) ส่งใบสั่งซัพที่ต้องจ่ายก่อนส่ง แต่ยังไม่ได้ตั้งกลุ่มแอดมิน ---- */
  w.setTab('order'); await sleep(200);
  sent.length=0;
  await w.sendLine('CPF'); await sleep(200);
  out.push('ซัพจ่ายก่อนส่ง แต่ยังไม่ได้ตั้งกลุ่มแอดมิน → ส่งใบสั่งปกติ 1 ข้อความ + เตือนให้ไปตั้งกลุ่ม: '
    +(sent.length===1&&sent[0].to==='C123'&&!sent.some(x=>x.text.includes('ต้องจ่ายก่อนของออก'))
      &&d.getElementById('toast').textContent.includes('ยังไม่ได้ตั้งกลุ่มแจ้งเตือนแอดมิน')));

  /* ---- 3) ตั้งกลุ่มแอดมินที่ ⚙️ ตั้งค่า › ซัพพลายเออร์ ---- */
  w.setTab('cfgl'); await sleep(250);
  out.push('หน้าซัพพลายเออร์มีกล่อง "กลุ่มแจ้งเตือนแอดมิน" + บอกว่ายังไม่ได้ตั้ง + ชื่อซัพที่ติ๊กจ่ายก่อนส่ง: '
    +(list().includes('กลุ่มแจ้งเตือนแอดมิน')&&list().includes('ยังไม่ได้ตั้งกลุ่ม')&&list().includes('CPF')));
  w.gpOpen('adm'); await sleep(120);
  out.push('กดแล้วเปิดกล่องเลือกกลุ่ม + พิมพ์ค้นหาได้ (กล่องเดียวกับที่ใช้ผูกกลุ่มซัพ): '
    +(!!d.getElementById('gpQ')&&d.querySelectorAll('#gpList .gpitem').length===4));
  w.gpSearch('แอดมิน'); await sleep(60);
  out.push('ค้นหา "แอดมิน" แล้วเหลือกลุ่มเดียว: '
    +(d.querySelectorAll('#gpList .gpitem').length===1&&d.getElementById('gpList').textContent.includes('กลุ่มแอดมิน JJ')));
  cfgPosts.length=0;
  await w.gpPick('adm','CADM'); await sleep(200);
  out.push('เลือกแล้วบันทึกลง config.remind_line_group (คีย์เดียวกับบอทเตือนรอบสั่งเดิม): '
    +(cfgPosts.length===1&&cfgPosts[0][0].key==='remind_line_group'&&cfgPosts[0][0].value==='CADM'&&w.eval("adminGroup()")==="CADM"));
  out.push('หน้าจอขึ้นชื่อกลุ่มที่ตั้งไว้ + ปุ่มทดสอบ: '
    +(list().includes('กลุ่มแอดมิน JJ')&&list().includes('ทดสอบ')));

  /* ---- 4) ส่งใบสั่งอีกครั้ง → ได้ข้อความเตือนโอนเงินเข้ากลุ่มแอดมินด้วย ---- */
  w.setTab('order'); await sleep(200);
  sent.length=0;
  await w.sendLine('CPF'); await sleep(250);
  const adm=sent.find(x=>x.to==='CADM');
  out.push('ซัพจ่ายก่อนส่ง → 2 ข้อความ: ใบสั่งเข้ากลุ่มซัพ + เตือนโอนเข้ากลุ่มแอดมิน: '
    +(sent.length===2&&sent.some(x=>x.to==='C123'&&x.text.includes('🛒 จริงใจหมูกระทะ'))&&!!adm));
  out.push('ข้อความเตือนบอก ซัพ/สาขา/วันสั่ง/วันส่ง/จำนวนรายการ: '
    +(!!adm&&adm.text.includes('ต้องจ่ายก่อนของออก')&&adm.text.includes('CPF')&&adm.text.includes('สาขารัชดา')
      &&adm.text.includes('สั่งวันที่ 18 ก.ย. 2569')&&adm.text.includes('ส่งวันที่ 19 ก.ย. 2569')&&adm.text.includes('รวม 1 รายการ')));
  sent.length=0;
  await w.sendLine('Makro'); await sleep(250);
  out.push('ซัพที่ไม่ได้ติ๊กจ่ายก่อนส่ง → ข้อความเดียว ไม่กวนกลุ่มแอดมิน: '
    +(sent.length===1&&sent[0].to==='C999'));

  /* ---- 5) ส่งทั้งหมดโหมดทดสอบ → เตือนจ่ายก่อนส่งยิงเข้ากลุ่มทดสอบ ไม่ไปกลุ่มแอดมินจริง ---- */
  sent.length=0;
  w.sendAllOpen(); await sleep(80);
  w.sendMode('test'); await sleep(60);
  d.getElementById('testGrp').value='C999';
  await w.sendAllGo(); await sleep(350);
  out.push('โหมดทดสอบ: ทั้งใบสั่งและข้อความเตือนจ่ายก่อนส่งเข้ากลุ่มทดสอบหมด (ไม่รบกวนกลุ่มจริง): '
    +(sent.length===3&&sent.every(x=>x.to==='C999')&&sent.filter(x=>x.text.includes('ต้องจ่ายก่อนของออก')).length===1));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
