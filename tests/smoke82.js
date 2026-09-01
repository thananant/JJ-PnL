// smoke82: แปลงหน่วยรายสินค้า (หน่วยปน)
// เฟรนฟราย: ตั้ง 1 ลัง = 12 กก. -> บิล 2 ลัง@600 + 12 กก.@55 ต้องรวมเหลือแถวเดียว กก. 36 หน่วย มูลค่า 1,860
// น้ำแข็ง: ถุง+กระสอบ ยังไม่ตั้ง -> 2 แถว มีป้าย ⚠ หน่วยปน · เปิดโมดัล บันทึก 1 กระสอบ = 20 ถุง -> upsert ถูก
// หน้าใช้จริง: นับ 5 -> 3, บิล 1 ลัง (=12 กก.) ตัวคูณ 1 -> ใช้จริง 5+12-3 = 14
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const convRows=[{item:'เฟรนฟราย',from_unit:'ลัง',to_unit:'กก.',factor:12}];
const bills=[
 {branch:'JJRD',d:'2026-08-03',supplier_id:1,item:'เฟรนฟราย',unit:'ลัง',qty:2,price:600,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'},
 {branch:'JJRD',d:'2026-08-04',supplier_id:1,item:'เฟรนฟราย',unit:'กก.',qty:12,price:55,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'},
 {branch:'JJRD',d:'2026-08-03',supplier_id:1,item:'น้ำแข็ง',unit:'ถุง',qty:1,price:40,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'},
 {branch:'JJRD',d:'2026-08-04',supplier_id:1,item:'น้ำแข็ง',unit:'กระสอบ',qty:1,price:100,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'}];
const upserts=[];
// ---- หน้าใช้จริง (สต๊อก) ----
const SB='b19f0a17b4472';
const prods=[{id:'p1',branch_id:SB,name:'เฟรนฟรายแช่แข็ง',unit:'กก.',sup:'ตลาด',deleted_at:null}];
const smap=[{id:1,branch:'JJRD',product_id:'p1',product_name:'เฟรนฟรายแช่แข็ง',pnl_item:'เฟรนฟราย',stock_unit:'กก.',factor:1,active:true}];
const counts=[
 {id:'c1',branch_id:SB,branch_name:'รัชดา',product_id:'p1',product_name:'เฟรนฟรายแช่แข็ง',count_date:'2026-08-03',qty:5,quantity:5,unit:'กก.'},
 {id:'c2',branch_id:SB,branch_name:'รัชดา',product_id:'p1',product_name:'เฟรนฟรายแช่แข็ง',count_date:'2026-08-04',qty:3,quantity:3,unit:'กก.'}];
const abills=[{branch:'JJRD',d:'2026-08-04',item:'เฟรนฟราย',unit:'ลัง',qty:1}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_unit_conv')){
        if(method==='POST'){ const b=JSON.parse(opt.body); upserts.push({url,rows:b}); b.forEach(x=>convRows.push(x)); return T([]); }
        if(method==='DELETE') return T([]);
        return T(convRows);
      }
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(smap);
      if(url.includes('stock_counts'))return T(counts);
      if(url.includes('products'))return T(prods);
      if(url.includes('pnl_bill_items')&&url.includes('select=branch,d,item'))return T(abills);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T([{branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0},{branch:'JJRD',d:'2026-08-04',sales_pos_am:50000,sales_pos_pm:0}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('usage')"); await sleep(600);
  const rows2=[...d.querySelectorAll('#useTbl tr.urow')];
  const fr=rows2.filter(r=>r.dataset.s.includes('เฟรนฟราย'));
  out.push('เฟรนฟรายรวมเหลือแถวเดียว หน่วย กก.: '+(fr.length===1&&fr[0].textContent.includes('กก.')));
  out.push('จำนวนรวม 36 (2 ลัง×12 + 12): '+fr[0].textContent.includes('36'));
  out.push('มูลค่ารวม 1,860: '+fr[0].textContent.includes('1,860'));
  out.push('เฟรนฟรายไม่มีป้ายหน่วยปน (ตั้งแล้ว): '+(!fr[0].textContent.includes('หน่วยปน')));
  const ice=rows2.filter(r=>r.dataset.s.includes('น้ำแข็ง'));
  out.push('น้ำแข็งยังแยก 2 แถว + ป้าย ⚠ หน่วยปน: '+(ice.length===2&&ice.every(r=>r.textContent.includes('หน่วยปน'))));
  // เปิดโมดัลตั้งค่า: หน่วยหลัก=ถุง · 1 กระสอบ = 20 ถุง
  await w.uconvModal(w.ocrNorm('น้ำแข็ง')); await sleep(150);
  out.push('โมดัลตั้งอัตราแปลงเปิด: '+d.getElementById('modalBox').textContent.includes('ตั้งอัตราแปลงหน่วย'));
  d.getElementById('ucPrim').value='ถุง';
  d.getElementById('ucF0').value='20';
  await w.uconvSave(w.ocrNorm('น้ำแข็ง')); await sleep(600);
  const up=upserts[0];
  out.push('upsert ถูกต้อง (กระสอบ->ถุง ×20 + on_conflict): '+(!!up&&up.rows[0].item==='น้ำแข็ง'&&up.rows[0].from_unit==='กระสอบ'&&up.rows[0].to_unit==='ถุง'&&up.rows[0].factor===20&&up.url.includes('on_conflict=item,from_unit')));
  const ice2=[...d.querySelectorAll('#useTbl tr.urow')].filter(r=>r.dataset.s.includes('น้ำแข็ง'));
  out.push('หลังตั้งค่า น้ำแข็งรวมเหลือแถวเดียว 21 ถุง: '+(ice2.length===1&&ice2[0].textContent.includes('21')));
  // หน้าใช้จริง: บิล 1 ลัง -> 12 กก. -> ใช้จริง 5+12-3=14
  await w.eval("show('actual')"); await sleep(700);
  const at=d.getElementById('view-actual').textContent;
  out.push('ใช้จริงแปลงหน่วยบิลก่อนคูณ (14): '+at.includes('14'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
