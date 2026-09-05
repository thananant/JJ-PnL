// smoke80: โหมด 🆚 เทียบสาขา ในหน้าการใช้ของ (เฉพาะมุมมองทุกสาขา)
// ยอดขาย: รัชดา 50,000 · ลาดพร้าว 100,000
// หมู: รด 10@100 → 2.00/หมื่น, ฿200/หมื่น · ลพ 30@100 → 3.00/หมื่น, ฿300/หมื่น → ต่าง +50% (chip แดง ▲) imp 100
// เห็ด: ลพ อย่างเดียว 5@40 → chip "เฉพาะลาดพร้าว" imp 20 → เรียงหลังหมู
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const B=(br,d,item,unit,qty,price)=>({branch:br,d,supplier_id:1,item,unit,qty,price,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'});
const bills=[B('JJRD','2026-08-03','หมู','กก.',10,100),B('JJLP','2026-08-03','หมู','กก.',30,100),B('JJLP','2026-08-04','เห็ด','กก.',5,40)];
const incRows=[
 {branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0},
 {branch:'JJLP',d:'2026-08-03',sales_pos_am:60000,sales_pos_pm:0},
 {branch:'JJLP',d:'2026-08-04',sales_pos_am:40000,sales_pos_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('ALL')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
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
  await sleep(500); await w.eval("show('usage')"); await sleep(500);
  out.push('มุมมองทุกสาขา: มีปุ่ม 🆚 เทียบสาขา: '+[...d.querySelectorAll('.useg button')].some(b=>b.textContent.includes('เทียบสาขา')));
  await w.usageModeSet('cmp'); await sleep(500);
  const t=d.getElementById('view-usage').textContent;
  out.push('หัวตาราง: รัชดา/ลาดพร้าว ใช้/หมื่น + ต่าง: '+(t.includes('รัชดา ใช้/หมื่น')&&t.includes('ลาดพร้าว ใช้/หมื่น')&&t.includes('ต่าง (ลพ. vs รด.)')));
  out.push('ปุ่ม ⚖ ต่อยอดขายถูกซ่อนในโหมดเทียบ: '+(![...d.querySelectorAll('.useg button')].some(b=>b.textContent.includes('ต่อยอดขาย ฿10,000'))));
  out.push('ยอดขายแยกสาขาโชว์ถูก (รด 50,000 · ลพ 100,000): '+(t.includes('50,000')&&t.includes('100,000')));
  const rows2=[...d.querySelectorAll('#useTbl tr.urow')];
  out.push('เรียงตามผลต่างมูลค่า: หมูมาก่อนเห็ด: '+(rows2.length===2&&rows2[0].textContent.includes('หมู')&&rows2[1].textContent.includes('เห็ด')));
  const cd=[...rows2[0].children].map(c=>c.textContent.trim());
  out.push('หมู: อัตรา 2 vs 3 · ฿/หมื่น 200 vs 300: '+(cd[1]==='2'&&cd[2]==='3'&&cd[4]==='200'&&cd[5]==='300'));
  out.push('หมู: chip แดง ▲ 50%: '+(!!rows2[0].querySelector('.chip.bad')&&rows2[0].querySelector('.chip.bad').textContent.includes('▲')&&rows2[0].textContent.includes('50')));
  out.push('เห็ด: ป้าย "เฉพาะลาดพร้าว": '+rows2[1].textContent.includes('เฉพาะลาดพร้าว'));
  // ค้นหาใช้ได้ในโหมดเทียบ
  w.usageFilter('เห็ด');
  out.push('กรอง "เห็ด": เหลือแถวเดียว: '+([...d.querySelectorAll('#useTbl tr.urow')].filter(r=>r.style.display!=='none').length===1));
  w.usageFilter('');
  // PDF: กล่องยอดใช้ของ แยกสาขา (โหมดทุกสาขา)
  await w.usageModeSet('item'); await sleep(400);
  await w.usagePdf(); await sleep(120);
  await w.usagePdfGo(); await sleep(400);
  const pg=[...d.querySelectorAll('#printArea .ppage')].find(x=>x.textContent.includes('หมู'));
  out.push('PDF: ยอดใช้แยกสาขา รัชดา 10 · ลาดพร้าว 30 และไม่มีอัตราต่อหมื่น: '+(!!pg&&pg.textContent.includes('ยอดใช้ของ')&&pg.textContent.includes('รัชดา')&&pg.textContent.includes('ลาดพร้าว')&&pg.textContent.includes('10 กก.')&&pg.textContent.includes('30 กก.')&&!pg.textContent.includes('฿10,000<')));
  await w.usageModeSet('cmp'); await sleep(300);
  // ออกจากทุกสาขา -> ปุ่มหาย + โหมดถอยกลับ item
  w.eval("S.br='JJRD'"); await w.eval("show('usage')"); await sleep(500);
  const t2=d.getElementById('view-usage').textContent;
  out.push('สาขาเดียว: ปุ่มเทียบหาย + ถอยกลับโหมดรายสินค้า: '+(![...d.querySelectorAll('.useg button')].some(b=>b.textContent.includes('เทียบสาขา'))&&t2.includes('ใช้ทั้งเดือน')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
