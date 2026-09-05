const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สุรพลไฟน์เนสท์',category:'อาหาร',active:true,sort:1,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_item_alias')||url.includes('pnl_bill_items')||url.includes('pnl_sup_items'))return T([]);
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

  // เคสจริงจากบิลสุรพล: รูปตัดขอบ -> AI ส่ง warning กลับมาด้วย
  w.dtOcrApply({
    rows:[
      {name:'ปลาม้วนไส้ไข่เค็ม',matched_item:null,qty:2,unit:'10*500G.',price:625,line_discount:0},
      {name:'เกี๊ยวปลากุ้งทอง',matched_item:null,qty:1,unit:'8BAG*40PCS',price:832,line_discount:0}
    ],
    bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'ex',total_on_bill:null,
    warning:'รูปตัดขอบขวาของตาราง มองไม่เห็นคอลัมน์จำนวน/ราคาเต็มแถว ตัวเลขที่กรอกอาจไม่ตรง แนะนำถ่ายใหม่ให้เห็นทั้งตาราง',
    _model:'gemini-3.7-flash'
  });
  await new Promise(r=>setTimeout(r,120));

  const note=d.getElementById('dtTplNote');
  out.push('มีกล่องเตือนสีส้มขึ้นก่อนข้อความอื่น: '+(!!note.querySelector('.ocrwarn')));
  out.push('ข้อความเตือนตรงกับที่ AI ส่งมา: '+note.querySelector('.ocrwarn').textContent.includes('รูปตัดขอบขวาของตาราง'));
  out.push('กล่องเตือนอยู่บรรทัดแรกสุด (ก่อนข้อความรายการปกติ): '+(note.innerHTML.indexOf('ocrwarn')<note.innerHTML.indexOf('อ่านบิลได้')));
  out.push('toast ก็บอกด้วย: '+d.getElementById('toast').textContent.includes('รูปอาจไม่ครบ'));
  out.push('รายการยังถูกกรอกให้ตามปกติ (ไม่ได้ทิ้งไปเฉยๆ): '+w.eval("S.dtLines.length===2&&S.dtLines[0].item==='ปลาม้วนไส้ไข่เค็ม'"));

  // เคสปกติไม่มี warning -> ต้องไม่มีกล่องส้มโผล่มาเฉยๆ (กันไม่ให้ตกใจทุกครั้ง)
  w.dtOcrApply({
    rows:[{name:'หมูสามชั้น',matched_item:'หมูสามชั้น',qty:5,unit:'กก.',price:150,line_discount:0}],
    bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:750
  });
  await new Promise(r=>setTimeout(r,100));
  out.push('ไม่มี warning -> ไม่มีกล่องส้ม: '+!d.getElementById('dtTplNote').querySelector('.ocrwarn'));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
