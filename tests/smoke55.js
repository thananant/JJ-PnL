const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const today=new Date(); const ds=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
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
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ซัพไข่',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // alias เดิม: "ไข่ไก่สด" -> ไข่ไก่ (แผง) 1 มัด = 5 แผง
      if(url.includes('pnl_item_alias'))return T([{supplier_id:1,alias:'ไข่ไก่สด',item:'ไข่ไก่',unit:'แผง',bill_unit:'มัด',factor:5}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.1'))
        return T([{item:'ไข่ไก่',unit:'แผง',price:55,qty:10,d:'2026-08-10',sort:0,discount:0,bill_no:1,vat_mode:'none'},
                  {item:'หมูสามชั้น',unit:'กก.',price:150,qty:5,d:'2026-08-10',sort:1,discount:0,bill_no:1,vat_mode:'none'}]);
      if(method==='GET'&&url.includes('pnl_bill_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_sup_items'))return T([]);
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
  await new Promise(r=>setTimeout(r,250));
  out.push('ปุ่มสแกนมี: '+!!d.getElementById('dtOcrFile'));
  // ผล OCR จำลอง: ไข่ไก่สด 2 มัด @275 (alias->แปลง) · หมูสามชั้นสไลด์ (matched) · น้ำจิ้มแจ่ว (ใหม่)
  w.dtOcrApply({
    rows:[
      {name:'ไข่ไก่สด',matched_item:null,qty:2,unit:'มัด',price:275,line_discount:0},
      {name:'หมูสามชั้นสไลด์ 2มม.',matched_item:'หมูสามชั้น',qty:3,unit:'กก.',price:150,line_discount:10},
      {name:'น้ำจิ้มแจ่ว',matched_item:null,qty:2,unit:'ขวด',price:40,line_discount:0}
    ],
    bill_discount:20, ship_fee:60, other_fee:0, vat_mode:'ex', total_on_bill:1177.90
  });
  await new Promise(r=>setTimeout(r,150));
  // 1) alias แปลงหน่วย: 2 มัด -> 10 แผง @55 (ยอดบรรทัด 550 เท่าบิล)
  out.push('alias แปลง: ไข่ไก่ 10 แผง @55: '+w.eval("S.dtLines[0].item==='ไข่ไก่'&&S.dtLines[0].qty===10&&S.dtLines[0].unit==='แผง'&&Math.abs(S.dtLines[0].price-55)<0.001"));
  // 2) สเปกใหม่: matched_item = แค่เดา — ต้องผูกครั้งแรก (ช่องเลือกตั้ง "หมูสามชั้น" รอไว้แล้ว ค่าดิบจากบิลคงเดิม)
  out.push('เดา: แถว1 _unm + ตั้งหมูสามชั้นรอ + ค่าดิบคงเดิม: '+(w.eval("!!S.dtLines[1]._unm&&S.dtLines[1]._guess==='หมูสามชั้น'&&S.dtLines[1].item==='หมูสามชั้นสไลด์ 2มม.'&&S.dtLines[1].qty===3&&S.dtLines[1].price===150&&S.dtLines[1].discount===10")&&d.getElementById('oms1').value==='หมูสามชั้น'));
  out.push('เดา: ป้าย "เดาว่า" + ช่องตัวคูณซ่อน (กก.=กก.): '+(d.getElementById('omr1').textContent.includes('เดาว่า')&&d.getElementById('omf1').style.display==='none'));
  // 3) ตัวใหม่ = ไฮไลต์ + แผงผูกชื่อ
  out.push('ตัวใหม่ flag + แผงผูก: '+(w.eval("!!S.dtLines[2]._unm")&&!!d.getElementById('oms2')));
  // 4) VAT/ส่วนลดท้าย/ค่าส่ง เติมครบ
  out.push('vat ex + bd 20 + ship 60: '+w.eval("S.dtVat==='ex'&&S.dtBillDisc===20&&S.dtShip===60"));
  // 5) ยอดตรวจกับบิล: (550+450-10+80)-20=1050 ×1.07=1123.5 +60=1183.5 ≠ 1177.9 -> เตือน
  out.push('เตือนยอดไม่ตรง: '+d.getElementById('dtTplNote').textContent.includes('⚠ ยอดที่คำนวณ'));
  // 6) ผูก "น้ำจิ้มแจ่ว" เป็นสินค้าใหม่ -> alias ถูกบันทึก factor 1
  d.getElementById('oms2').value='__new__';
  await w.dtOcrBind(2);
  await new Promise(r=>setTimeout(r,150));
  const al=posts.find(p=>p.alias);
  out.push('alias saved (ใหม่ f=1): '+(al&&al.alias.alias==='น้ำจิ้มแจ่ว'&&al.alias.factor===1&&!w.eval("S.dtLines[2]._unm")));
  out.push('แถบผูกหาย (ฝังใต้แถวหายไปด้วย): '+!d.getElementById('omr2'));
  // 7) ผูกแบบแปลงหน่วย: จำลองบรรทัดใหม่ "ไข่เป็ดมัดใหญ่" 1 มัด @300 -> ไข่ไก่? ใช้ pool ไข่ไก่(แผง) factor 6
  w.eval("S.dtLines.push({item:'ไข่เป็ดมัดใหญ่',qty:1,unit:'มัด',price:300,discount:'',_unm:true,_bu:'มัด',_billName:'ไข่เป็ดมัดใหญ่'})");
  w.renderDtLines();
  const i=w.eval('S.dtLines.length-1');
  d.getElementById('oms'+i).value='ไข่ไก่'; w.dtOcrSelChg(i);
  out.push('ช่อง factor โชว์ (มัด≠แผง): '+(d.getElementById('omf'+i).style.display!=='none'));
  d.getElementById('omv'+i).value='6';
  await w.dtOcrBind(i);
  await new Promise(r=>setTimeout(r,150));
  out.push('แปลง 1 มัด=6 แผง: qty 6 @50: '+w.eval(`S.dtLines[${i}].qty===6&&Math.abs(S.dtLines[${i}].price-50)<0.001&&S.dtLines[${i}].unit==='แผง'`));
  const al2=posts.filter(p=>p.alias).pop();
  out.push('alias factor 6 saved: '+(al2.alias.factor===6&&al2.alias.bill_unit==='มัด'));
  // 8) ยืนยันตัวที่เดา (แถว1) -> ได้ชื่อแอพ ค่าคงเดิม + alias จำ "หมูสามชั้นสไลด์ 2มม." factor 1
  await w.dtOcrBind(1); await new Promise(r=>setTimeout(r,150));
  out.push('ยืนยันเดา: item=หมูสามชั้น qty3 @150 disc10: '+w.eval("S.dtLines[1].item==='หมูสามชั้น'&&!S.dtLines[1]._unm&&S.dtLines[1].qty===3&&S.dtLines[1].price===150&&S.dtLines[1].discount===10"));
  const al3=posts.filter(p=>p.alias).pop();
  out.push('alias เดา saved f=1: '+(al3.alias.alias==='หมูสามชั้นสไลด์ 2มม.'&&al3.alias.item==='หมูสามชั้น'&&al3.alias.factor===1));
  // 9) สแกนซ้ำชื่อเดิม -> เงียบ (alias จำแล้ว) ไม่ต้องผูกอีก
  w.dtOcrApply({rows:[{name:'หมูสามชั้นสไลด์ 2มม.',matched_item:'หมูสามชั้น',qty:5,unit:'กก.',price:150,line_discount:0}],bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:null});
  await new Promise(r=>setTimeout(r,120));
  out.push('สแกนรอบถัดไป: เงียบผ่าน alias (ไม่มี _unm): '+w.eval("S.dtLines[0].item==='หมูสามชั้น'&&S.dtLines[0].qty===5&&!S.dtLines[0]._unm"));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
