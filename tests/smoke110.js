// smoke110: jjmk-stockcheck — หน้า 🛟 Safety จัดกลุ่ม แผนก → ซัพ → ชื่อสินค้า (ก–ฮ)
// fixture JJRD:
//   ครัว      : กุ้งขาว(CPF) · ไข่ไก่(CPF) · ข้าวสาร(FarmFresh) · พริก(ตลาดสด)
//   บาร์น้ำ    : น้ำแข็ง(ตลาดสด) · โค้ก(ไม่ระบุซัพ)
//   ยังไม่จัดแผนก : ผักบุ้ง(FarmFresh)   ← สินค้าที่ยังไม่ได้ตั้งแผนก ต้องอยู่การ์ดท้ายสุด
// คาด: แผนกเรียง ครัว → บาร์น้ำ → ยังไม่จัดแผนก · ในแผนกเรียงซัพ (ไทยก่อนอังกฤษ · ไม่ระบุซัพท้ายสุด)
//      ในกลุ่มซัพเรียงชื่อสินค้าตามตัวอักษรล้วน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
const P=(id,name,sup,dept,rate)=>({id,branch_id:BID,cat_label:'',name,unit:'กก.',sup,dept,zone:'หลังร้าน',
  rate_wk:rate,rate_fri:rate,rate_we:rate,image_url:null,sort:1});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','set');
    w.localStorage.setItem('jjsc_lgsync',String(Date.now()));
    w.localStorage.setItem('JJSC_NOPREWARM','1');
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([{id:1,branch_id:BID,name:'ครัว',sort:1},{id:2,branch_id:BID,name:'บาร์น้ำ',sort:2}]);
      if(url.includes('pnl_stock_names'))return T([
        {id:9,branch:'JJRD',product_id:'p1',pnl_item:'ไข่ไก่เบอร์ 2',product_name:'ไข่ไก่',bill_unit:'แผง',stock_unit:'กก.',factor:1,active:true}]);
      if(url.includes('pnl_stock_map')||url.includes('pnl_bill_items')||url.includes('pnl_suppliers')||url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('products'))return T([
        P('p1','ไข่ไก่','CPF','ครัว',3), P('p2','กุ้งขาว','CPF','ครัว',4),
        P('p3','ข้าวสาร','FarmFresh','ครัว',5), P('p4','พริก','ตลาดสด','ครัว',6),
        P('p5','น้ำแข็ง','ตลาดสด','บาร์น้ำ',7), P('p6','โค้ก','','บาร์น้ำ',8),
        P('p7','ผักบุ้ง','FarmFresh','',9)]);
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
  await sleep(400);
  w.setTab('set'); await sleep(250);
  const cards=[...d.querySelectorAll('#list .card')];
  const head=c=>c.querySelector('.h').textContent.replace(/\s+/g,' ').trim();
  out.push('แยกการ์ดตามแผนก 3 การ์ด เรียงตามตัวอักษร (ครัว → บาร์น้ำ) และที่ยังไม่จัดแผนกอยู่ท้ายสุด: '
    +(cards.length===3&&head(cards[0]).includes('ครัว')&&head(cards[1]).includes('บาร์น้ำ')&&head(cards[2]).includes('ยังไม่จัดแผนก')));
  const subs=c=>[...c.querySelectorAll('.subh')].map(x=>x.childNodes[0].textContent.replace('🏷','').trim());
  out.push('ในแผนกครัวมีหัวกลุ่มซัพ 3 กลุ่ม เรียงตามตัวอักษร (ไทยก่อน): '
    +(subs(cards[0]).join()==='ตลาดสด,CPF,FarmFresh'));
  out.push('หัวกลุ่มบอกจำนวนรายการของซัพนั้น (CPF 2 รายการ): '
    +[...cards[0].querySelectorAll('.subh')].some(x=>x.textContent.includes('CPF')&&x.textContent.includes('2 รายการ')));
  // ลำดับสินค้าในแผนกครัว: ตลาดสด(พริก) · CPF(กุ้งขาว, ไข่ไก่) · FarmFresh(ข้าวสาร)
  const seq=c=>[...c.querySelectorAll('.subh,.row2')].map(x=>x.classList.contains('subh')
    ?'— '+x.childNodes[0].textContent.replace('🏷','').trim()
    :x.querySelector('.nm .t').textContent.trim());
  const kitchen=seq(cards[0]);
  out.push('เรียง ซัพ → ชื่อสินค้าตามตัวอักษรในกลุ่ม: '
    +(JSON.stringify(kitchen)===JSON.stringify(['— ตลาดสด','พริก','— CPF','กุ้งขาว','ไข่ไก่','— FarmFresh','ข้าวสาร'])));
  out.push('สินค้าที่ไม่ระบุซัพอยู่กลุ่มท้ายสุดของแผนก: '
    +(JSON.stringify(seq(cards[1]))===JSON.stringify(['— ตลาดสด','น้ำแข็ง','— (ไม่ระบุซัพ)','โค้ก'])));
  out.push('แถวสินค้าไม่ต้องซ้ำชื่อซัพแล้ว (ย้ายไปอยู่หัวกลุ่ม) แต่ยังโชว์ชื่อบิลถ้าต่างจากชื่อนับ: '
    +(!cards[0].querySelector('.row2 .nm .s')?.textContent.includes('CPF')
      &&cards[0].textContent.includes('🧾 บิล: ไข่ไก่เบอร์ 2')));
  // ช่องกรอกอัตราใช้ยังอยู่ครบและแก้ได้
  const rowE=[...cards[0].querySelectorAll('.row2')].find(x=>x.querySelector('.nm .t').textContent.trim()==='กุ้งขาว');
  const ri=rowE.querySelectorAll('input.ri');
  out.push('ทุกแถวยังมีช่อง จ–พฤ / ศ / ส–อา + ช่องเลือกแผนก: '
    +(ri.length===3&&ri[0].value==='4'&&!!rowE.querySelector('select.zsel')));
  ri[0].value='12'; ri[0].dispatchEvent(new w.Event('change')); await sleep(120);
  out.push('แก้ค่าแล้วจำไว้ (ยังอยู่กลุ่มเดิม ไม่กระโดดที่): '
    +(w.eval("(S.all.find(x=>x.id==='p2')||{}).dirty.rate_wk")===12
      &&seq([...d.querySelectorAll('#list .card')][0])[3]==='กุ้งขาว'));
  // ค้นหาแล้วยังจัดกลุ่มเหมือนเดิม
  d.getElementById('q').value='ไข่';
  d.getElementById('q').dispatchEvent(new w.Event('input'));
  await sleep(200);
  const c0=[...d.querySelectorAll('#list .card')];
  out.push('ค้นหาแล้วเหลือเฉพาะที่ตรง แต่ยังมีหัวกลุ่มซัพกำกับ: '
    +(c0.length===1&&c0[0].querySelectorAll('.row2').length===1&&subs(c0[0]).join()==='CPF'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
