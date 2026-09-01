// smoke85: ตัวกรองซัพ/หมวด ในโมดัลเลือกสินค้าออก PDF
// สินค้า: หมู(ซัพ1 อาหาร) เห็ด(ซัพ1 อาหาร) น้ำยา(ซัพ2 ของใช้) -> กรองซัพ2 เหลือ 1 · กรองหมวดอาหาร เหลือ 2 · สร้างเฉพาะที่เห็น
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const B=(item,unit,sid,qty,price)=>({branch:'JJRD',d:'2026-08-03',supplier_id:sid,item,unit,qty,price,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'});
const bills=[B('หมู','กก.',1,5,100),B('เห็ด','กก.',1,3,40),B('น้ำยาล้างจาน','แกลลอน',2,2,90)];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'ตลาดสด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'ร้านเคมี',category:'ของใช้',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T([{branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.print=()=>{ w._printed=(w._printed||0)+1; };
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vis=()=>[...d.querySelectorAll('.pdfrow')].filter(r=>r.style.display!=='none');
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('usage')"); await sleep(500);
  await w.usagePdf(); await sleep(150);
  out.push('มีดรอปดาวน์ซัพ + หมวด: '+(!!d.getElementById('pdfFsup')&&!!d.getElementById('pdfFcat')));
  out.push('เริ่มต้นเห็น 3 รายการ: '+(vis().length===3));
  // กรองซัพ 2 -> เหลือน้ำยา 1 ตัว + ปุ่มนับ 1 หน้า
  d.getElementById('pdfFsup').value='2'; w.usagePdfFilter(); await sleep(80);
  out.push('กรองซัพ "ร้านเคมี" เหลือ 1 (น้ำยา): '+(vis().length===1&&vis()[0].textContent.includes('น้ำยาล้างจาน')));
  out.push('ปุ่มนับเฉพาะที่เห็น (1 หน้า): '+d.getElementById('pdfGoBtn').textContent.includes('(1'));
  // ล้างซัพ กรองหมวดอาหาร -> 2
  d.getElementById('pdfFsup').value=''; d.getElementById('pdfFcat').value='อาหาร'; w.usagePdfFilter(); await sleep(80);
  out.push('กรองหมวดอาหาร เหลือ 2: '+(vis().length===2));
  // สร้าง: ได้ 2 หน้า (เฉพาะที่เห็น แม้ตัวอื่นยังติ๊กอยู่)
  await w.usagePdfGo(); await sleep(400);
  out.push('สร้างเฉพาะที่เห็น 2 หน้า + สั่งพิมพ์: '+(d.querySelectorAll('#printArea .ppage').length===2&&w._printed===1));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
