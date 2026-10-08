// smoke121: บันทึกบิลพร้อมกันหลายเครื่อง (8 ต.ค. — จากรีวิวอิสระ)
//   เครื่อง A เปิดบิลใบ 1 ของวัน/ซัพ (วันนั้นมีใบเดียว) · เครื่อง B เพิ่มบิลใบ 2 ของวัน/ซัพเดียวกัน · A กดบันทึกใบ 1
//   เดิม: DELETE ทั้งวัน (ไม่มี bill_no) → บิลใบ 2 หาย แต่ยอดวันยังนับรวม · ใหม่: ลบเฉพาะ bill_no=1 + ยอดวัน = ใบ 1 + ใบ 2 + แจ้งเตือน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ds='2026-08-20';
const bill1=[{id:11,branch:'JJRD',d:ds,supplier_id:1,item:'หมูสามชั้น',qty:10,unit:'กก.',price:100,sort:0,vat_mode:'none',discount:0,bill_discount:0,bill_no:1}];
const bill2=[{id:12,branch:'JJRD',d:ds,supplier_id:1,item:'ซี่โครง',qty:2,unit:'กก.',price:50,sort:0,vat_mode:'none',discount:0,bill_discount:0,bill_no:2}];
const posts=[],dels=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      const method=opt&&opt.method||'GET';
      if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){posts.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'หมูไทย',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds)){
        // เครื่อง B เพิ่มบิลใบ 2 หลังจาก A โหลดหน้าไปแล้ว (w.__other=true)
        return T(JSON.parse(JSON.stringify(w.__other?[...bill1,...bill2]:bill1)));
      }
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.Element.prototype.scrollIntoView=function(){};
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="detail"]').click(); await sleep(400);
  d.getElementById('dtDate').value=ds; w.eval("S.dtDate='"+ds+"'");
  await w.dtPickSup(1); await sleep(250);
  out.push('A เปิดบิลใบ 1 (วันนั้นมีใบเดียว): '+(w.eval("S.dtBillNo")===1&&w.eval("Object.keys(S._dtDayBills).length")===1&&w.eval("S.dtLines[0].qty")===10));
  // B เพิ่มบิลใบ 2 · A แก้ราคาเป็น 120 แล้วบันทึก
  w.__other=true;
  w.dtEdit(0,'price','120'); await w.dtSave(); await sleep(300);
  const delUrl=dels.find(u=>u.startsWith('pnl_bill_items'));
  out.push('DELETE เฉพาะบิลใบ 1 (มี bill_no=eq.1) ไม่ลบทั้งวัน: '+(!!delUrl&&delUrl.includes('bill_no=eq.1')));
  const ins=posts.find(p=>p.items), ex=posts.find(p=>p.exp);
  out.push('insert ใบ 1 ใหม่ 10×120 bill_no 1: '+(!!ins&&ins.items.length===1&&Number(ins.items[0].price)===120&&ins.items[0].bill_no===1));
  out.push('ยอดรายจ่ายของวัน = ใบ 1 (1,200) + ใบ 2 (100) = 1,300 (ตรงกับแถวที่เหลือจริง): '+(!!ex&&Number(ex.exp[0].amount)===1300));
  out.push('แจ้งว่ามีบิลใบอื่นจากเครื่องอื่น / รวมทั้งวัน: '+(d.getElementById('toast').textContent.includes('รวมทั้งวัน')||d.getElementById('toast').textContent.includes('เครื่องอื่น')));
  // กรณีปกติ (ไม่มีใครเพิ่ม): วันมีใบเดียว → ยังลบทั้งวันเหมือนเดิม (fallback ฐานที่ไม่มีคอลัมน์ bill_no)
  w.__other=false; dels.length=0; posts.length=0;
  await w.dtPickSup(1); await sleep(250); w.dtEdit(0,'price','110'); await w.dtSave(); await sleep(300);
  const delUrl2=dels.find(u=>u.startsWith('pnl_bill_items'));
  out.push('ไม่มีใบอื่น → DELETE ทั้งวันเหมือนเดิม (ไม่มี bill_no): '+(!!delUrl2&&!delUrl2.includes('bill_no')&&Number(posts.find(p=>p.exp).exp[0].amount)===1100));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},500);
