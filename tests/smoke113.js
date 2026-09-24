// smoke113: jjmk-stockcheck — หน้า 🛟 Safety: คอลัมน์ "หน่วยนับ" ดู/เปลี่ยนได้ + ปุ่ม 🗑 เลิกใช้สินค้า
// fixture JJRD: กุ้งขาว(กก.) · ไข่ไก่(แผง) · พริก(ยังไม่ตั้งหน่วย) · ลาดพร้าวมี "กุ้งขาว" ชื่อเดียวกัน
// กติกาเดิมของระบบ: หน่วยนับใช้ชื่อเดียวกันทั้ง 2 สาขา → PATCH by name + ตามไปแก้ pnl_stock_map.stock_unit
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472',BID2='b19f0a17b448212';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const P=(id,bid,name,unit,sup)=>({id,branch_id:bid,cat_label:'',name,unit,sup,dept:'ครัว',zone:'หลังร้าน',
  rate_wk:2,rate_fri:3,rate_we:4,image_url:null,sort:1});
const patches=[],posts=[];
let units=[{id:1,name:'กก.',kind:'both'},{id:2,name:'ถุง',kind:'both'},{id:3,name:'ลัง',kind:'buy'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','set');
    w.localStorage.setItem('jjsc_lgsync',String(Date.now()));
    w.localStorage.setItem('JJSC_NOPREWARM','1');
    w.confirm=()=>w.__cfm!==false;
    w.prompt=()=>w.__ask;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'){const b=JSON.parse(opt.body);posts.push({url,rows:b});
        if(url.includes('sc_units')){const r={id:99,...(Array.isArray(b)?b[0]:b)};units=units.concat(r);return T([r]);}
        return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([{id:1,branch_id:BID,name:'ครัว',sort:1}]);
      if(url.includes('sc_units'))return T(units);
      if(url.includes('pnl_stock_names'))return T([
        {id:7,branch:'JJRD',product_id:'p1',pnl_item:'กุ้งขาวสด',product_name:'กุ้งขาว',bill_unit:'กก.',stock_unit:'กก.',factor:1,active:true}]);
      if(url.includes('pnl_stock_map')||url.includes('pnl_bill_items')||url.includes('pnl_suppliers')||url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('products')&&url.includes('branch_id=in.'))return T([
        P('p1',BID,'กุ้งขาว','กก.','CPF'),P('p1b',BID2,'กุ้งขาว','กก.','CPF'),
        P('p2',BID,'ไข่ไก่','แผง','CPF'),P('p3',BID,'พริก','','ตลาดสด')]);
      if(url.includes('products'))return T([
        P('p1',BID,'กุ้งขาว','กก.','CPF'),P('p2',BID,'ไข่ไก่','แผง','CPF'),P('p3',BID,'พริก','','ตลาดสด')]);
      if(url.includes('suppliers'))return T([{name:'CPF',order_mode:'any',lead_days:1}]);
      if(url.includes('stock_current')||url.includes('stock_counts')||url.includes('stock_receipts'))return T([]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450);
  w.setTab('set'); await sleep(250);
  const rowOf=n=>[...d.querySelectorAll('#list .row2')].find(x=>x.querySelector('.nm .t').textContent.trim()===n);
  const uSel=n=>[...rowOf(n).querySelectorAll('select.zsel')][1];
  out.push('มีคอลัมน์ "หน่วยนับ" ในหัวตาราง + ทุกแถวมีช่องเลือกหน่วย: '
    +(d.querySelector('#list .hd2').textContent.includes('หน่วยนับ')
      &&[...d.querySelectorAll('#list .row2')].every(r=>r.querySelectorAll('select.zsel').length===2)));
  out.push('ช่องหน่วยโชว์หน่วยปัจจุบันของสินค้า (กุ้งขาว = กก. · ไข่ไก่ = แผง): '
    +(uSel('กุ้งขาว').value==='กก.'&&uSel('ไข่ไก่').value==='แผง'));
  out.push('สินค้าที่ยังไม่ตั้งหน่วย ขึ้น "– ยังไม่ตั้งหน่วย –": '
    +(uSel('พริก').value===''&&uSel('พริก').textContent.includes('ยังไม่ตั้งหน่วย')));
  const opts=[...uSel('กุ้งขาว').options].map(o=>o.value);
  out.push('ตัวเลือกมีหน่วยจากรายการหน่วย + หน่วยที่ใช้อยู่จริง + ปุ่มหน่วยใหม่: '
    +(opts.includes('กก.')&&opts.includes('ถุง')&&opts.includes('ลัง')&&opts.includes('แผง')&&opts.slice(-1)[0]==='__new'));
  // เปลี่ยนหน่วย → ถามยืนยันก่อน แล้วเซฟทันที (ไม่ต้องกดบันทึก)
  patches.length=0;
  const s1=uSel('กุ้งขาว'); s1.value='ถุง'; s1.dispatchEvent(new w.Event('change')); await sleep(250);
  const pProd=patches.find(x=>x.url.includes('products?name=eq.'));
  const pMap=patches.find(x=>x.url.includes('pnl_stock_map'));
  out.push('เปลี่ยนหน่วย → PATCH products ด้วย "ชื่อสินค้า" (เหมือนกันทั้ง 2 สาขา) ไม่ใช่รายตัว: '
    +(!!pProd&&pProd.body.unit==='ถุง'&&decodeURIComponent(pProd.url).includes('name=eq.กุ้งขาว')));
  out.push('ตามไปแก้หน่วยนับฝั่ง P&L ให้ด้วย (pnl_stock_map.stock_unit): '+(!!pMap&&pMap.body.stock_unit==='ถุง'));
  out.push('ข้อมูลในหน้าอัปเดตทันที + ขึ้นข้อความยืนยัน (ไม่ต้องกดบันทึก): '
    +(w.eval("(S.all.find(x=>x.name==='กุ้งขาว')||{}).unit")==='ถุง'&&uSel('กุ้งขาว').value==='ถุง'
      &&d.getElementById('toast').textContent.includes('หน่วยนับ ถุง')
      &&w.eval("(S.items.filter(x=>Object.keys(x.dirty).length)).length")===0));
  out.push('สาขาอีกสาขาที่ชื่อสินค้าเดียวกันเปลี่ยนตามในหน่วยความจำด้วย: '
    +(w.eval("((S.allBr||[]).filter(x=>x.name==='กุ้งขาว').every(x=>x.unit==='ถุง'))")===true));
  // กดยกเลิกตอนถามยืนยัน = ไม่เปลี่ยนอะไร
  patches.length=0; w.__cfm=false;
  const s2=uSel('ไข่ไก่'); s2.value='ลัง'; s2.dispatchEvent(new w.Event('change')); await sleep(200);
  out.push('กดยกเลิกตอนถามยืนยัน → ไม่เปลี่ยนอะไร ช่องเด้งกลับหน่วยเดิม: '
    +(patches.length===0&&w.eval("(S.all.find(x=>x.name==='ไข่ไก่')||{}).unit")==='แผง'&&uSel('ไข่ไก่').value==='แผง'));
  w.__cfm=true;
  // เลือก "➕ หน่วยใหม่…" → พิมพ์ชื่อ → ใช้เลย + เพิ่มเข้ารายการหน่วย
  patches.length=0; posts.length=0; w.__ask='กระสอบ';
  const s3=uSel('พริก'); s3.value='__new'; s3.dispatchEvent(new w.Event('change')); await sleep(300);
  out.push('เลือก "หน่วยใหม่" แล้วพิมพ์ชื่อ → ใช้กับสินค้าทันที: '
    +(w.eval("(S.all.find(x=>x.name==='พริก')||{}).unit")==='กระสอบ'&&uSel('พริก').value==='กระสอบ'));
  out.push('หน่วยใหม่ถูกเพิ่มเข้ารายการหน่วยกลางให้ด้วย (sc_units): '
    +(posts.some(x=>x.url.includes('sc_units')&&JSON.stringify(x.rows).includes('กระสอบ'))));
  // พิมพ์ชื่อหน่วยว่าง = ไม่ทำอะไร
  patches.length=0; w.__ask='';
  const s4=uSel('ไข่ไก่'); s4.value='__new'; s4.dispatchEvent(new w.Event('change')); await sleep(200);
  out.push('กดหน่วยใหม่แล้วไม่พิมพ์อะไร → ไม่เปลี่ยน: '
    +(patches.length===0&&uSel('ไข่ไก่').value==='แผง'));
  // เลือกหน่วยเดิมซ้ำ = ไม่ยิงอะไร
  patches.length=0;
  const s5=uSel('ไข่ไก่'); s5.value='แผง'; s5.dispatchEvent(new w.Event('change')); await sleep(150);
  out.push('เลือกหน่วยเดิมซ้ำ → ไม่ยิงอะไรให้เปลืองเน็ต: '+(patches.length===0));
  // ช่องกรอกอัตราใช้ยังทำงานเหมือนเดิม
  const ri=rowOf('ไข่ไก่').querySelectorAll('input.ri.rk');
  out.push('ยังมีช่องอัตราใช้ 3 ช่องต่อแถวเหมือนเดิม: '+(ri.length===3&&ri[0].value==='2'));
  /* ---- ปุ่ม 🗑 เลิกใช้สินค้าที่ไม่ใช้แล้ว ---- */
  out.push('ทุกแถวมีปุ่ม 🗑 เลิกใช้: '
    +([...d.querySelectorAll('#list .row2')].every(r=>!!r.querySelector('button.delx'))
      &&d.querySelector('#list .hd2').children.length===8));
  // กดยกเลิกตอนถาม = ไม่ลบ
  patches.length=0; w.__cfm=false;
  rowOf('พริก').querySelector('button.delx').click(); await sleep(200);
  out.push('กด 🗑 แล้วยกเลิก → ไม่ลบอะไร: '+(patches.length===0&&!!rowOf('พริก')));
  w.__cfm=true;
  // ลบจริง = soft delete เฉพาะสาขานี้ (PATCH deleted_at ด้วย id ของแถวสาขานี้)
  patches.length=0;
  const n0=d.querySelectorAll('#list .row2').length;
  rowOf('พริก').querySelector('button.delx').click(); await sleep(250);
  const pd=patches.find(x=>x.url.includes('products?id=eq.'));
  out.push('กดยืนยัน → ซ่อนสินค้าด้วย deleted_at (ไม่ได้ลบข้อมูลทิ้ง) เฉพาะแถวของสาขานี้: '
    +(!!pd&&!!pd.body.deleted_at&&decodeURIComponent(pd.url).includes('id=eq.p3')));
  out.push('หายจากหน้าจอทันที + ขึ้นข้อความยืนยัน: '
    +(!rowOf('พริก')&&d.querySelectorAll('#list .row2').length===n0-1
      &&d.getElementById('toast').textContent.includes('เลิกใช้')));
  out.push('ตัวนับรายการในตัวกรองลดลงตาม: '
    +d.querySelector('#list .lrow div:last-child').textContent.replace(/\s+/g,' ').includes('แสดง 2/2'));
  out.push('ลบแล้วไม่หลุดจาก S.all/S.items (คำนวณหน้าอื่นไม่เพี้ยน): '
    +(w.eval("S.all.some(x=>x.name==='พริก')")===false&&w.eval("S.items.length")===2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
