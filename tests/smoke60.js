const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_item_alias')){posts.push({alias:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'||method==='DELETE')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สุรพลไฟน์เนสท์',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_item_alias'))return T([]);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_sup_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  // จำลองผลสแกน: 2 รายการยังไม่ผูกชื่อ (เหมือนภาพจริง)
  w.dtOcrApply({
    rows:[
      {name:'ปลาม้วนไส้เค็ม',matched_item:null,qty:2,unit:'10*500G.',price:1250,line_discount:0},
      {name:'เกี๊ยวปลากุ้งทอง',matched_item:null,qty:1,unit:'8BAG*40PCS',price:932,line_discount:0}
    ],
    bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:2182
  });
  await new Promise(r=>setTimeout(r,120));

  // 1) ไม่มีกล่องลอยแยกต่างหากอีกแล้ว (dtOcrMap ว่าง — ใช้แค่ pending-banner)
  out.push('ไม่มีกล่องลอยซ้ำซ้อน: '+(d.getElementById('dtOcrMap').innerHTML===''));
  // 2) แถบผูกชื่อฝังอยู่ใต้แถวของมันเองจริง (sibling ต่อจาก .dtrow ตัวนั้น)
  const row0=d.querySelectorAll('.dtrow')[0];
  out.push('แถบผูกอยู่ติดกับแถวที่ 0 (sibling ถัดไปถัดไป): '+(row0.nextElementSibling.nextElementSibling.id==='omr0'));
  out.push('มี 2 แถบ ตรงกับ 2 แถว: '+(d.querySelectorAll('.ocrinline').length===2));
  // 3) ป้าย "จากบิล" ตรงกับชื่อดิบ ก่อนแก้ไขอะไร
  out.push('ป้ายจากบิล แถว0 = ปลาม้วนไส้เค็ม: '+d.getElementById('omr0').textContent.includes('ปลาม้วนไส้เค็ม'));
  out.push('ป้ายจากบิล แถว1 = เกี๊ยวปลากุ้งทอง: '+d.getElementById('omr1').textContent.includes('เกี๊ยวปลากุ้งทอง'));

  // ★ กรณีจริงที่ทำให้งง: ผู้ใช้พิมพ์แก้ชื่อในตาราง (แถว1) จาก "เกี๊ยวปลากุ้งทอง" เป็น "เกี๊ยวปลาถุงทอง"
  const nameInput1=d.querySelectorAll('.dtrow')[1].querySelector('input');
  nameInput1.value='เกี๊ยวปลาถุงทอง';
  nameInput1.dispatchEvent(new w.Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,80));
  out.push('แก้ชื่อในตารางแล้ว dtLines อัปเดตตาม: '+w.eval("S.dtLines[1].item==='เกี๊ยวปลาถุงทอง'"));
  out.push('★ ป้าย "จากบิล" ยังคงค้าง "เกี๊ยวปลากุ้งทอง" ไม่ขยับตาม (ไม่งงอีกต่อไป): '+d.getElementById('omr1').textContent.includes('เกี๊ยวปลากุ้งทอง'));

  // ผูกชื่อแถว1 เป็นสินค้าใหม่ -> alias ต้องบันทึกด้วย "ชื่อดิบจากบิล" (เกี๊ยวปลากุ้งทอง) ไม่ใช่ชื่อที่พิมพ์ทับ (เกี๊ยวปลาถุงทอง)
  d.getElementById('oms1').value='__new__';
  await w.dtOcrBind(1);
  await new Promise(r=>setTimeout(r,150));
  const al=posts.find(p=>p.alias);
  out.push('★ alias ผูกกับชื่อดิบจากบิลจริง (ไม่ใช่ชื่อที่แก้ทับ): '+(al&&al.alias.alias==='เกี๊ยวปลากุ้งทอง'));
  out.push('item ที่บันทึกใช้ชื่อที่ผู้ใช้แก้ล่าสุด: '+(al&&al.alias.item==='เกี๊ยวปลาถุงทอง'));
  out.push('แถบผูกของแถว1 หายไปแล้ว (แก้ครบ เหลือแถว0 ที่ยังไม่ผูก): '+(!d.getElementById('omr1')&&!!d.getElementById('omr0')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
