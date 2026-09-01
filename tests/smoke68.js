// smoke68: หน้าการใช้ของ — ตารางเต็มหน้า (ไม่จำกัดความสูง) + ช่องค้นหาชื่อสินค้า
// กรองสด ไม่โหลดใหม่ · หลายคำต้องเจอทุกคำ · โหมดแยกซัพค้นชื่อซัพได้ · ซ่อนหัวกลุ่มที่ไม่มีสินค้าตรง · ยอดกลุ่ม/ยอดรวมคิดเฉพาะที่แสดง · จำคำค้นข้ามการสลับโหมด
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:107000,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const B=(sid,item,unit,qty,price,d)=>({branch:'JJRD',d:d||'2026-08-05',supplier_id:sid,item,unit,qty,price,discount:0,sort:0,bill_no:1});
const items=[
  B(1,'หมูสามชั้น','กก.',10,150), B(1,'หมูสันคอ','กก.',4,171), B(1,'มันหมู','กก.',5,78),
  B(2,'เนื้อสามชั้น','กก.',8,155), B(2,'ลิ้นวัว','กก.',2,240),
  B(3,'ไก่คาราเกะ','กก.',6,85),
];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('sup'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'Yannah Beef',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},{id:3,name:'FarmFresh',category:'อาหาร',active:true,sort:3,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('2026-08'))return T(inc);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(items);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vis=sel=>[...d.querySelectorAll(sel)].filter(tr=>tr.style.display!=='none');
const names=()=>vis('tr.urow').map(tr=>tr.querySelector('td').textContent.trim());
setTimeout(async()=>{
  const out=[];
  await sleep(500); await w.eval("show('usage')"); await sleep(500);
  const wrap=d.getElementById('useTbl').parentElement;
  out.push('ตารางเต็มหน้า (ไม่มี max-height/overflow-y บน twrap): '+(wrap.classList.contains('twrap')&&!/max-height/.test(wrap.getAttribute('style')||'')));
  const q=d.getElementById('useQ');
  out.push('มีช่องค้นหา type=search + placeholder ชื่อสินค้า/ซัพ: '+(!!q&&q.type==='search'&&q.placeholder.includes('ค้นหาชื่อสินค้า')&&q.placeholder.includes('ซัพ')));
  out.push('เริ่มต้น 6 แถว 3 กลุ่ม ปุ่มล้างซ่อน: '+(names().length===6&&vis('tr.ughead').length===3&&d.getElementById('useQx').style.display==='none'));
  const tot=()=>d.getElementById('useTotV').textContent, totL=()=>d.getElementById('useTotL').textContent;
  out.push('ยอดรวมเริ่มต้น 4,804: '+(tot()==='4,804'&&totL()==='รวมมูลค่าของที่ลงรายละเอียด'));
  // ค้น "หมู" → 3 แถวใน Smilemeat เท่านั้น
  q.value='หมู'; w.usageFilter('หมู');
  out.push('ค้น "หมู" → 3 รายการ เฉพาะกลุ่ม Smilemeat: '+(JSON.stringify(names())===JSON.stringify(['หมูสามชั้น','หมูสันคอ','มันหมู'])&&vis('tr.ughead').length===1&&vis('tr.ughead')[0].textContent.includes('Smilemeat')));
  out.push('ยอดกลุ่ม Smilemeat ยังเต็ม 2,574 · รวมที่ค้นพบ (3 รายการ) 2,574 · ปุ่มล้างโชว์: '+(vis('tr.ughead')[0].querySelector('.usub').textContent==='2,574'&&totL()==='รวมที่ค้นพบ (3 รายการ)'&&tot()==='2,574'&&d.getElementById('useQx').style.display===''));
  // หลายคำ: "หมู สาม" → เฉพาะหมูสามชั้น · ยอดกลุ่มคิดเฉพาะที่แสดง 1,500
  w.usageFilter('หมู สาม');
  out.push('ค้น "หมู สาม" → หมูสามชั้น อย่างเดียว · ยอดกลุ่ม 1,500: '+(JSON.stringify(names())===JSON.stringify(['หมูสามชั้น'])&&vis('tr.ughead')[0].querySelector('.usub').textContent==='1,500'&&tot()==='1,500'));
  // ค้นชื่อซัพ (โหมดแยกซัพ) ไม่สนตัวพิมพ์
  w.usageFilter('YANNAH');
  out.push('ค้นชื่อซัพ "YANNAH" → 2 รายการของ Yannah Beef: '+(JSON.stringify(names())===JSON.stringify(['เนื้อสามชั้น','ลิ้นวัว'])&&tot()==='1,720'));
  // ไม่เจอ
  w.usageFilter('ปลาหมึก');
  out.push('ไม่เจอ → แถว "ไม่พบสินค้าที่ค้นหา" + รวม 0 + ซ่อนทุกกลุ่ม: '+(d.getElementById('useNone').style.display===''&&names().length===0&&vis('tr.ughead').length===0&&tot()==='0'));
  // ล้าง → กลับมาครบ
  w.usageFilter('');
  out.push('ล้างคำค้น → 6 แถว 3 กลุ่ม ยอดรวมเดิม ปุ่มล้างซ่อน: '+(names().length===6&&vis('tr.ughead').length===3&&tot()==='4,804'&&totL()==='รวมมูลค่าของที่ลงรายละเอียด'&&d.getElementById('useNone').style.display==='none'&&d.getElementById('useQx').style.display==='none'));
  // จำคำค้นข้ามการสลับโหมด
  w.usageFilter('สามชั้น'); w.usageModeSet('item'); await sleep(500);
  const q2=d.getElementById('useQ');
  out.push('สลับโหมดรวมสินค้า → ช่องค้นยังมี "สามชั้น" + กรองไว้ 2 รายการ (หมูสามชั้น, เนื้อสามชั้น): '+(!!q2&&q2.value==='สามชั้น'&&names().length===2&&names().every(n=>n.includes('สามชั้น'))&&d.getElementById('useTotL').textContent==='รวมที่ค้นพบ (2 รายการ)'));
  out.push('โหมดรวมสินค้า placeholder ไม่มี "/ ซัพ": '+(!q2.placeholder.includes('/ ซัพ')));
  w.usageFilter(''); w.usageModeSet('sup'); await sleep(400);
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
