// smoke74: กติกาบันทึกบิล — บรรทัดที่ใส่จำนวนแล้วต้องมี ชื่อ/หน่วย/ราคาต่อหน่วย ครบ
// ขาด = ทาแดงตรงช่องที่ขาดของบรรทัดนั้น + toast + ไม่บันทึก · พิมพ์เติม = แดงหาย · ราคา "0" พิมพ์เอง = ผ่าน (ของแถม)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ds='2026-08-25';
const posts=[], dels=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='DELETE'){dels.push(1);return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){posts.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'โรงสีข้าว',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cell=(r,c)=>d.querySelector(`#dtLines [data-r="${r}"][data-c="${c}"]`);
const bad=(r,c)=>{const t=cell(r,c);return !!(t&&t.classList.contains('vbad'));};
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  w.eval("S.dtDate='"+ds+"'");
  await w.eval("show('detail')"); await sleep(250);
  await w.dtPickSup(1); await sleep(300);
  // แถว0: มีจำนวน ขาดหน่วย+ราคา · แถว1: มีจำนวน ขาดชื่อ · แถว2: ไม่มีจำนวน (ปล่อยผ่าน) · แถว3: ครบ
  w.eval("S.dtLines=[{item:'ข้าว',qty:5,unit:'',price:''},{item:'',qty:2,unit:'กก.',price:50},{item:'น้ำแข็ง',qty:'',unit:'',price:''},{item:'หมู',qty:3,unit:'กก.',price:100}]");
  w.renderDtLines(); await sleep(80);
  posts.length=0; dels.length=0;
  await w.dtSave(); await sleep(200);
  out.push('บล็อกการบันทึก (ไม่มี POST/DELETE): '+(posts.length===0&&dels.length===0));
  out.push('toast เตือน 2 บรรทัด: '+d.getElementById('toast').textContent.includes('มี 2 บรรทัด'));
  out.push('แถว0 ทาแดงเฉพาะ หน่วย+ราคา (ชื่อ/จำนวนไม่โดน): '+(bad(0,2)&&bad(0,3)&&!bad(0,0)&&!bad(0,1)));
  out.push('แถว1 ทาแดงเฉพาะ ชื่อ: '+(bad(1,0)&&!bad(1,2)&&!bad(1,3)));
  out.push('แถวไม่มีจำนวน + แถวครบ ไม่โดนทาแดง: '+(!bad(2,0)&&!bad(2,2)&&!bad(2,3)&&!bad(3,0)&&!bad(3,2)&&!bad(3,3)));
  out.push('โฟกัสเด้งไปช่องแดงช่องแรก (หน่วยแถว0): '+(d.activeElement===cell(0,2)));
  // พิมพ์เติมหน่วย → แดงหายทันทีเฉพาะช่องนั้น
  const u0=cell(0,2); u0.value='กก.'; u0.dispatchEvent(new w.Event('input',{bubbles:true}));
  out.push('พิมพ์หน่วยแล้วแดงหาย (ราคายังแดงอยู่): '+(!bad(0,2)&&bad(0,3)));
  // ราคา "0" พิมพ์เอง = ผ่านได้ (ของแถม)
  const p0=cell(0,3); p0.value='0'; p0.dispatchEvent(new w.Event('input',{bubbles:true}));
  const it1=cell(1,0); it1.value='ปลายข้าว'; it1.dispatchEvent(new w.Event('input',{bubbles:true}));
  await w.dtSave(); await sleep(250);
  const it=posts.find(p=>p.items);
  out.push('กรอกครบแล้วบันทึกผ่าน: '+(!!it&&it.items.length===3));
  out.push('ราคา 0 ที่พิมพ์เองถูกบันทึก (ข้าว @0): '+(!!it&&it.items.some(r=>r.item==='ข้าว'&&r.price===0&&r.qty===5)));
  out.push('แดงถูกล้างหมดหลังผ่าน: '+(!d.querySelector('#dtLines input.vbad')));
  // (เพิ่ม 25 ส.ค. 69) บันทึกเสร็จ → เด้งกลับไปที่แถบเลือกซัพ (ชิปซัพเดิมโฟกัส พร้อมลงซัพต่อไป)
  await sleep(200);
  out.push('บันทึกเสร็จ โฟกัสกลับไปชิปซัพ (ตัวที่เลือกอยู่): '+(d.activeElement&&d.activeElement.classList.contains('dtsup')&&d.activeElement.classList.contains('on')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
