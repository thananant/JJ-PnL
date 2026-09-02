// smoke90: P&L รู้จักทั้งสองชื่อ — ชื่อบิลเป็นหลัก + ชื่อนับ (ระบบนับสต๊อก) ตัวเล็กกำกับ
// แหล่งหลัก = view pnl_stock_names (ชื่อนับสด) · ไม่มี view -> ตกกลับ pnl_stock_map (product_name สำเนา)
// map: หมูสามชั้น(บิล) -> "สามชั้น" (JJRD) / "สามชั้น ลพ" (JJLP) · เห็ด -> "เห็ด" (สะกดเหมือน = ไม่ต้องโชว์)
//      ปลา -> active=false (ไม่นับ) · น้ำแข็ง -> none:* (จำว่าไม่มีในระบบนับ = ไม่นับ)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window._sheets=[]; window._file='';
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:r=>({rows:r}),book_append_sheet:(wb,ws,name)=>{window._sheets.push({name,rows:ws.rows||[]});}},writeFile:(wb,fn)=>{window._file=fn;}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const B=(br,d,item,unit,qty,price,sid=1)=>({branch:br,d,supplier_id:sid,item,unit,qty,price,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'});
const bills=[B('JJRD','2026-08-03','หมูสามชั้น','กก.',10,100),B('JJRD','2026-08-03','เห็ด','กก.',5,40),B('JJRD','2026-08-04','ปลา','กก.',2,80),B('JJRD','2026-08-04','น้ำแข็ง','ถุง',3,20)];
const smap=[
  {id:1,branch:'JJRD',product_id:'p1',product_name:'สามชั้น(สำเนาเก่า)',pnl_item:'หมูสามชั้น',bill_unit:'',stock_unit:'กก.',factor:1,active:true},
  {id:2,branch:'JJLP',product_id:'p1L',product_name:'สามชั้น ลพ',pnl_item:'หมูสามชั้น',bill_unit:'',stock_unit:'กก.',factor:1,active:true},
  {id:3,branch:'JJRD',product_id:'p2',product_name:'เห็ด',pnl_item:'เห็ด',bill_unit:'',stock_unit:'กก.',factor:1,active:true},
  {id:4,branch:'JJRD',product_id:'p3',product_name:'ปลาทับทิม',pnl_item:'ปลา',bill_unit:'',stock_unit:'กก.',factor:1,active:false},
  {id:5,branch:'JJRD',product_id:'none:JJRD:น้ำแข็ง',product_name:'(ไม่มีในระบบนับ)',pnl_item:'น้ำแข็ง',bill_unit:'',stock_unit:'',factor:1,active:false}];
// view = เฉพาะคู่ที่ active และมีในระบบนับจริง · stock_name สดจาก products (p1 เปลี่ยนชื่อแล้ว สำเนาใน map ยังเป็นชื่อเก่า)
const sview=[
  {branch:'JJRD',product_id:'p1',stock_name:'สามชั้น',bill_name:'หมูสามชั้น'},
  {branch:'JJLP',product_id:'p1L',stock_name:'สามชั้น ลพ',bill_name:'หมูสามชั้น'},
  {branch:'JJRD',product_id:'p2',stock_name:'เห็ด',bill_name:'เห็ด'}];
let viewDown=false; const posts=[];
const incRows=[{branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_stock_names')){ if(viewDown)return {ok:false,status:404,text:async()=>'relation does not exist',json:async()=>({})}; return T(sview); }
      if(url.includes('pnl_stock_map')){ if(opt&&opt.method==='POST')posts.push(JSON.parse(opt.body)); if(url.includes('product_id=like.none'))return T(smap.filter(r=>String(r.product_id).startsWith('none:'))); return T(smap); }   // ต้องเช็คก่อน products
      if(url.includes('products'))return T([{id:'pF',branch_id:'b19f0a17b4472',name:'ปลาทับทิม',unit:'กก.',sup:'Jimmy'},{id:'pX',branch_id:'b19f0a17b448212',name:'ของ ลพ',unit:'กก.',sup:''}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T(bills);
      if(url.includes('pnl_sup_items'))return T([{supplier_id:1,item:'หมูสามชั้น',unit:'กก.',sort:1}]);
      if(url.includes('pnl_income_daily'))return T(incRows);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.confirm=()=>true;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450);
  // 1) แคชชื่อโหลดตอนบูต + helper
  out.push('โหลดแคชตอนบูต: '+(!!w.eval("S.stkNames")&&Object.keys(w.eval("S.stkNames")).length===2));
  out.push("อ่านจาก view (ชื่อนับสด ไม่ใช่สำเนาเก่า): "+(w.eval('S._stkNamesSrc')==='view'&&w.stkNm('หมูสามชั้น')==='สามชั้น'));
  out.push("stkNm ALL รวมสองสาขา: "+(w.stkNm('หมูสามชั้น','ALL')==='สามชั้น / สามชั้น ลพ'));
  out.push("ไม่นับ active=false / none:* / ไม่ผูก: "+(w.stkNm('ปลา')===''&&w.stkNm('น้ำแข็ง')===''&&w.stkNm('ไก่')===''));
  out.push("สะกดเหมือนกัน → ป้าย 📦✓ (ผูกแล้ว): "+(w.stkNmHtml('เห็ด').includes('📦✓')&&!w.stkNmHtml('เห็ด').includes('📦 เห็ด')&&w.stkNm('เห็ด')==='เห็ด'));
  out.push("สถานะ: หมู linked · เห็ด linked · ปลา unbound · น้ำแข็ง none · ไก่ unbound: "+(w.stkState('หมูสามชั้น')==='linked'&&w.stkState('เห็ด')==='linked'&&w.stkState('ปลา')==='unbound'&&w.stkState('น้ำแข็ง')==='none'&&w.stkState('ไก่')==='unbound'));
  out.push("ยังไม่ผูก → ป้าย ⚠ กดได้ · none → ไม่มีป้าย: "+(w.stkNmHtml('ปลา').includes('⚠ ยังไม่ผูก')&&w.stkNmHtml('ปลา').includes("stkBindBill('ปลา')")&&w.stkNmHtml('น้ำแข็ง')===''));
  out.push("โหมด ALL: ยังไม่ผูก ไม่มีปุ่มกด: "+(w.stkNmHtml('ปลา','ALL').includes('⚠ ยังไม่ผูก')&&!w.stkNmHtml('ปลา','ALL').includes('onclick')));
  out.push("ชื่อบิลกลับด้าน (หน้าใช้จริง): "+(w.billNmHtml('หมูสามชั้น','สามชั้น').includes('🧾 หมูสามชั้น')&&w.billNmHtml('เห็ด','เห็ด')===''));
  out.push('ฟัง realtime pnl_stock_map: '+w.eval("RT_TABLES.includes('pnl_stock_map')"));
  // ยังไม่ได้รัน view -> ตกกลับตาราง pnl_stock_map (ได้ชื่อสำเนา) แล้วกลับมา view ใหม่
  viewDown=true; await w.loadStkNames();
  out.push("ไม่มี view -> ตกกลับ pnl_stock_map ได้ชื่อสำเนา: "+(w.eval('S._stkNamesSrc')==='table'&&w.stkNm('หมูสามชั้น')==='สามชั้น(สำเนาเก่า)'&&w.stkNm('ปลา')===''));
  viewDown=false; await w.loadStkNames();
  out.push("view กลับมา -> ชื่อสดอีกครั้ง: "+(w.stkNm('หมูสามชั้น')==='สามชั้น'));
  // 2) หน้าการใช้ของ: ป้าย 📦 ข้างชื่อบิล + ค้นหาด้วยชื่อนับได้
  await w.eval("show('usage')"); await sleep(500);
  const rowOf=n=>[...d.querySelectorAll('#useTbl tr.urow')].find(tr=>tr.textContent.includes(n));
  const rp=rowOf('หมูสามชั้น'), rh=rowOf('เห็ด');
  out.push('แถวหมูสามชั้น มี 📦 สามชั้น: '+(!!rp&&rp.textContent.includes('📦 สามชั้น')));
  out.push('แถวเห็ด มี 📦✓ ไม่มีชื่อซ้ำ: '+(!!rh&&rh.textContent.includes('📦✓')&&!rh.textContent.includes('📦 เห็ด')));
  const rf=rowOf('ปลา'); out.push('แถวปลา มีป้าย ⚠ ยังไม่ผูก: '+(!!rf&&rf.textContent.includes('⚠ ยังไม่ผูก')));
  w.usageFilter('สามชั้น ลพ'); // ชื่อนับของอีกสาขา ไม่อยู่ในสาขานี้ -> ไม่เจอ
  out.push('ค้นชื่อนับอีกสาขา ไม่เจอ: '+(rp.style.display==='none'));
  w.usageFilter('สามชั้น'); // ทั้งชื่อบิลและชื่อนับ
  out.push('ค้น "สามชั้น" เจอหมู ซ่อนเห็ด: '+(rp.style.display!=='none'&&rh.style.display==='none'));
  w.usageFilter('');
  // 2b) กดผูกจากหน้าการใช้ของ: ปลา -> ปลาทับทิม (ของนับสาขานี้ที่ยังไม่ถูกผูก)
  await w.stkBindBill('ปลา'); await sleep(150);
  const mb0=d.getElementById('modalBox');
  out.push('โมดัลผูกขึ้น หัว "ผูกชื่อบิลกับระบบนับ" มีเฉพาะของสาขานี้: '+(mb0.textContent.includes('ผูกชื่อบิลกับระบบนับ')&&!!mb0.querySelector('#stkLinkDL option[value="ปลาทับทิม"]')&&!mb0.querySelector('#stkLinkDL option[value="ของ ลพ"]')));
  d.getElementById('stkLinkSel').value='ปลาทับทิม'; d.getElementById('stkLinkF').value='1';
  await w.stkLinkBind(); await sleep(200);
  const pb=posts.find(b=>Array.isArray(b)&&b[0]&&b[0].pnl_item==='ปลา');
  out.push('POST pnl_stock_map: JJRD · product pF · pnl_item ปลา · active: '+(!!pb&&pb[0].branch==='JJRD'&&pb[0].product_id==='pF'&&pb[0].product_name==='ปลาทับทิม'&&pb[0].active===true&&pb[0].factor===1));
  out.push('ผูกเสร็จ โมดัลปิด + กลับหน้าการใช้ของ: '+(!d.getElementById('modalWrap').classList.contains('on')&&w.eval('S.tab')==='usage'&&w.eval('S._stkLink')===null));
  // 3) โมดัลรายละเอียด
  rp.click(); await sleep(150);
  const mb=d.getElementById('modalBox');
  out.push('หัวโมดัลมีชื่อนับ: '+(!!mb&&mb.querySelector('h3').textContent.includes('📦 สามชั้น')));
  w.closeModal();
  // 4) Excel: คอลัมน์ ชื่อนับ ทั้งสองชีท
  w.usageXlsx(); await sleep(100);
  const s1=w._sheets[0].rows, s2=w._sheets[1].rows;
  const x1=s1.find(r=>r['สินค้า']==='หมูสามชั้น'), x1h=s1.find(r=>r['สินค้า']==='เห็ด'), x1p=s1.find(r=>r['สินค้า']==='ปลา');
  out.push("Excel รายสินค้า ชื่อนับ: หมู=สามชั้น · เห็ด=เห็ด · ปลา='': "+(!!x1&&x1['ชื่อนับ']==='สามชั้น'&&x1h['ชื่อนับ']==='เห็ด'&&x1p['ชื่อนับ']===''));
  const x2=s2.find(r=>r['สินค้า']==='หมูสามชั้น');
  out.push('Excel แยกตามซัพ มีคอลัมน์ ชื่อนับ: '+(!!x2&&x2['ชื่อนับ']==='สามชั้น'));
  // 5) หน้าบันทึกบิล: แถบใต้แถว 📦 ชื่อนับ
  await w.eval("show('detail')"); await sleep(300);
  await w.dtPickSup(1); await sleep(200);
  w.eval("S.dtLines=[{item:'',qty:'',unit:'',price:''},{item:'',qty:'',unit:'',price:''}]"); w.renderDtLines();
  w.dtEdit(0,'item','หมูสามชั้น'); w.dtEdit(1,'item','เห็ด');
  const c0=d.getElementById('dtc0'), c1=d.getElementById('dtc1');
  out.push('บันทึกบิล แถวหมู โชว์ 📦 ชื่อนับ: สามชั้น: '+(c0.style.display!=='none'&&c0.textContent.includes('ชื่อนับ')&&c0.textContent.includes('สามชั้น')));
  out.push('แถวเห็ด (สะกดเหมือน) ไม่โชว์: '+(c1.style.display==='none'));
  const dl=d.getElementById('dtItemsDL');
  out.push('datalist ใส่ label ชื่อนับ: '+(!!dl&&!!dl.querySelector('option[value="หมูสามชั้น"][label="📦 สามชั้น"]')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
