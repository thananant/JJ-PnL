// smoke88: ⬇ Excel ข้อมูลดิบหน้าการใช้ของ (โหมดทุกสาขา -> 4 ชีท)
// หมู: รด 10@100 (3 ส.ค. จันทร์) · ลพ 30@100 (3 ส.ค.) · เห็ด ลพ 5@40 (4 ส.ค. อังคาร) · ยอดขาย รด 50k ลพ 100k
// รวมทุกสาขา: หมู 40 กก. · วันขาย จ–พฤ 2 วัน -> จ–พฤ ใช้/วัน 20 · ต่อหมื่น 40/15 = 2.6667 · เทียบสาขา รด 2 / ลพ 3 / ต่าง 50%
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
const bills=[B('JJRD','2026-08-03','หมู','กก.',10,100),B('JJLP','2026-08-03','หมู','กก.',30,100),B('JJLP','2026-08-04','เห็ด','กก.',5,40)];
const incRows=[{branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0},{branch:'JJLP',d:'2026-08-03',sales_pos_am:60000,sales_pos_pm:0},{branch:'JJLP',d:'2026-08-04',sales_pos_am:40000,sales_pos_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('ALL')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
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
  out.push('มีปุ่ม ⬇ Excel: '+[...d.querySelectorAll('button')].some(b=>b.textContent.includes('Excel')));
  w.usageXlsx(); await sleep(100);
  const names=w._sheets.map(s=>s.name);
  out.push('4 ชีท (รายสินค้า/แยกตามซัพ/เทียบสาขา/สรุป): '+(JSON.stringify(names)===JSON.stringify(['รายสินค้า','แยกตามซัพ','เทียบสาขา','สรุป'])));
  const s1=w._sheets[0].rows.find(r=>r['สินค้า']==='หมู');
  out.push('รายสินค้า หมู: ปริมาณ 40 · มูลค่า 4000 · จ–พฤ ใช้/วัน 20: '+(!!s1&&s1['ปริมาณรวม']===40&&s1['มูลค่า (บาท)']===4000&&s1['จ–พฤ ใช้/วัน']===20));
  out.push('ต่อ ฿10,000 = 2.6667: '+(!!s1&&s1['ต่อ ฿10,000']===2.6667));
  const s3=w._sheets[2].rows.find(r=>r['สินค้า']==='หมู');
  out.push('เทียบสาขา หมู: รด 2 · ลพ 3 · ต่าง 50%: '+(!!s3&&s3['รัชดา ต่อ ฿10,000']===2&&s3['ลาดพร้าว ต่อ ฿10,000']===3&&s3['ต่าง % (ลพ. vs รด.)']===50));
  out.push('ชื่อไฟล์ระบุสาขา+เดือน: '+w._file.includes('JJ-การใช้ของ-ALL-2026-08'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
