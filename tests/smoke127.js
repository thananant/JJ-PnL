// smoke127: หน่วยสะกดต่างกันรวมเป็นหน่วยเดียว (กก / กก. / กิโล / KG) + กล่องแปลงหน่วยถามแบบ "1 ลัง มี __ กก."
// ซุปหมาล่า: 2 ลัง@1,500 · 50 กก@60 · 50 กก.@60 · 4 กิโล@60 → ก่อนตั้งค่า = 2 แถว (กก. 104 · ลัง 2) + ป้ายหน่วยปน
//   หน่วยหลักตั้งต้น = กก. (จำนวนมากสุด) · ตั้ง 1 ลัง มี 15 กก. → แถวเดียว 134 กก. มูลค่า 3,000+3,000+3,000+240 = 9,240
// อัตราเก่าที่บันทึกด้วย from_unit 'กก' (ไม่มีจุด) ยังจับคู่ได้: หมูหมัก 1 กก = 1 กก. ไม่ทำให้แยกแถว
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const convRows=[{item:'ผงปรุงรส',from_unit:'กล่อง',to_unit:'กก',factor:2}];
const B0={branch:'JJRD',supplier_id:1,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'};
const bills=[
 {...B0,d:'2026-08-03',item:'ซุปหมาล่า',unit:'ลัง',qty:2,price:1500},
 {...B0,d:'2026-08-04',item:'ซุปหมาล่า',unit:'กก',qty:50,price:60},
 {...B0,d:'2026-08-05',item:'ซุปหมาล่า',unit:'กก.',qty:50,price:60},
 {...B0,d:'2026-08-06',item:'ซุปหมาล่า',unit:'กิโล',qty:4,price:60},
 {...B0,d:'2026-08-03',item:'หมูหมัก',unit:'KG',qty:10,price:200},
 {...B0,d:'2026-08-04',item:'หมูหมัก',unit:'กก.',qty:5,price:200},
 {...B0,d:'2026-08-03',item:'ผงปรุงรส',unit:'กล่อง',qty:3,price:100},
 {...B0,d:'2026-08-04',item:'ผงปรุงรส',unit:'กก.',qty:1,price:50}];
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
  await sleep(450); await w.eval("show('usage')"); await sleep(700);
  const rows=()=>[...d.querySelectorAll('#useTbl tr.urow')];
  const of=n=>rows().filter(r=>r.dataset.s.includes(n));
  out.push('unitNorm: กก / กก. / กิโล / KG / kg. → กก. · ลัง. → ลัง · EACH คงเดิม: '+(['กก','กก.','กิโล','KG','kg.'].every(u=>w.unitNorm(u)==='กก.')&&w.unitNorm('ลัง.')==='ลัง'&&w.unitNorm('EACH')==='EACH'));
  const hm=of('หมูหมัก');
  out.push('หมูหมัก KG + กก. รวมแถวเดียว 15 กก. ไม่มีป้ายหน่วยปน: '+(hm.length===1&&hm[0].textContent.includes('15')&&hm[0].textContent.includes('กก.')&&!hm[0].textContent.includes('หน่วยปน')));
  const pp=of('ผงปรุงรส');
  out.push('อัตราเก่า (กล่อง → กก ไม่มีจุด) ยังใช้ได้: ผงปรุงรสแถวเดียว 7 กก. (3×2+1): '+(pp.length===1&&pp[0].textContent.includes('7')&&!pp[0].textContent.includes('หน่วยปน')));
  let ml=of('ซุปหมาล่า');
  out.push('ซุปหมาล่า ก่อนตั้งค่า: 2 แถว (กก. 104 · ลัง 2) + ป้ายหน่วยปน (กก/กก./กิโล ไม่แยกแถวแล้ว): '+(ml.length===2&&ml.some(r=>r.textContent.includes('104')&&r.textContent.includes('กก.'))&&ml.some(r=>r.textContent.includes('ลัง'))&&ml.every(r=>r.textContent.includes('หน่วยปน'))));
  const nk=w.ocrNorm('ซุปหมาล่า');
  out.push('หน่วยในกล่อง = กก. กับ ลัง เท่านั้น เรียงจำนวนมากสุดก่อน: '+(JSON.stringify(w.eval('S._uMix')[nk].units)==='["กก.","ลัง"]'));
  await w.uconvModal(nk); await sleep(150);
  const mb=d.getElementById('modalBox');
  out.push('กล่องแปลงหน่วย: หน่วยหลักตั้งต้น กก. · ถาม "1 ลัง มี __ กก." · บอกว่ากก/กก./กิโลรวมให้แล้ว: '+(d.getElementById('ucPrim').value==='กก.'&&mb.textContent.replace(/\s+/g,' ').includes('1 ลัง มี')&&mb.textContent.includes('ระบบรวมให้เองแล้ว')&&!!d.getElementById('ucF0')&&!d.getElementById('ucF1')));
  d.getElementById('ucF0').value='15'; w.uconvHint(0,'ลัง','กก.');
  out.push('ตัวช่วยแสดงกลับด้าน: 1 กก. = 0.0667 ลัง: '+d.getElementById('ucH0').textContent.includes('1 กก. = 0.0667 ลัง'));
  await w.uconvSave(nk); await sleep(700);
  const up=upserts[upserts.length-1];
  out.push('บันทึก: from ลัง → to กก. ×15: '+(!!up&&up.rows.length===1&&up.rows[0].item==='ซุปหมาล่า'&&up.rows[0].from_unit==='ลัง'&&up.rows[0].to_unit==='กก.'&&up.rows[0].factor===15));
  ml=of('ซุปหมาล่า');
  out.push('หลังตั้งค่า: ซุปหมาล่าแถวเดียว 134 กก. มูลค่า 9,240 ไม่มีป้ายหน่วยปน: '+(ml.length===1&&ml[0].textContent.includes('134')&&ml[0].textContent.includes('กก.')&&ml[0].textContent.includes('9,240')&&!ml[0].textContent.includes('หน่วยปน')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
