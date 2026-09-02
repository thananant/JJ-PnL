// smoke89: ⬇ Excel ใช้/วัน จ–พฤ/ศ/ส–อา ต้องถัวตามยอดขาย ไม่อิงวันที่ลงบิล
// หมู JJRD 30 กก. ลงบิลวันจันทร์วันเดียว (3 ส.ค.) · ยอดขาย จ 50k · ศ 100k · ส 150k (salesAll 300k)
// อัตรา = 30/(300000/10000) = 1.0 ต่อหมื่น
// ใช้/วัน: จ–พฤ = 1×(50000/10000)=5 · ศ = 1×10 = 10 · ส–อา = 1×15 = 15  (สูตรเก่าอิงวันบิลจะได้ 30/0/0)
// คอลัมน์ดิบ "ซื้อ (ตามวันบิล)": จ–พฤ 30 · ศ 0 · ส–อา 0
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
const B=(br,d,item,unit,qty,price)=>({branch:br,d,supplier_id:1,item,unit,qty,price,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'});
const bills=[B('JJRD','2026-08-03','หมู','กก.',30,100)]; // จันทร์
const incRows=[
  {branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0},   // จันทร์
  {branch:'JJRD',d:'2026-08-07',sales_pos_am:100000,sales_pos_pm:0},  // ศุกร์
  {branch:'JJRD',d:'2026-08-08',sales_pos_am:150000,sales_pos_pm:0}]; // เสาร์
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T(incRows);
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
  await sleep(450); await w.eval("show('usage')"); await sleep(500);
  w.usageXlsx(); await sleep(100);
  const s1=(w._sheets[0]||{rows:[]}).rows.find(r=>r['สินค้า']==='หมู');
  out.push('รายสินค้า หมู เจอ: '+!!s1);
  out.push('ต่อ ฿10,000 = 1: '+(!!s1&&s1['ต่อ ฿10,000']===1));
  out.push('จ–พฤ ใช้/วัน 5 (อัตรา×ขายเฉลี่ยกลุ่ม): '+(!!s1&&s1['จ–พฤ ใช้/วัน']===5));
  out.push('ศ ใช้/วัน 10 แม้ไม่มีบิลวันศุกร์: '+(!!s1&&s1['ศ ใช้/วัน']===10));
  out.push('ส–อา ใช้/วัน 15 แม้ไม่มีบิลเสาร์อาทิตย์: '+(!!s1&&s1['ส–อา ใช้/วัน']===15));
  out.push('คอลัมน์ดิบ ซื้อ (ตามวันบิล) จ–พฤ 30 · ศ 0 · ส–อา 0: '+(!!s1&&s1['จ–พฤ ซื้อ (ตามวันบิล)']===30&&s1['ศ ซื้อ (ตามวันบิล)']===0&&s1['ส–อา ซื้อ (ตามวันบิล)']===0));
  const s2=(w._sheets[1]||{rows:[]}).rows.find(r=>r['สินค้า']==='หมู');
  out.push('ชีทแยกตามซัพ ใช้สูตรเดียวกัน (5/10/15): '+(!!s2&&s2['จ–พฤ ใช้/วัน']===5&&s2['ศ ใช้/วัน']===10&&s2['ส–อา ใช้/วัน']===15));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
