const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const today=new Date(); const M=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
const ds=`${M}-${String(today.getDate()).padStart(2,'0')}`;
const calls=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='DELETE'){calls.push({del:url.split('rest/v1/')[1]});return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_log')){calls.push({log:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){calls.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){calls.push({exp:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},
        {id:3,name:'Knock',category:'ของใช้',active:false,sort:3,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_log')&&method==='GET')return T([{editor:'บอย',change:'ยอด ฿100.00 → ฿200.00',created_at:'2026-08-20T10:00:00Z'}]);
      // history ของซัพ 1: บิลล่าสุดเมื่อวาน 2 รายการ
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))
        return T([{item:'หมูสามชั้น',unit:'กก.',price:139,qty:10,d:'2026-08-15',sort:0},
                  {item:'หมูสันคอ',unit:'กก.',price:145,qty:2,d:'2026-08-15',sort:1},
                  {item:'ปลาหมึก',unit:'กก.',price:120,qty:1,d:'2026-08-10',sort:0}]);
      // บิลวันนี้: มีอยู่แล้ว (เคสแก้ไข) เฉพาะ call ที่ 2 เป็นต้นไป? -> คุมด้วย flag
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))
        return T(w.__hasBill?[{item:'หมูสามชั้น',qty:10,unit:'กก.',price:139,sort:0}]:[]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('d=eq.'))return T([]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.'))return T([{d:ds,supplier_id:1,qty:10,price:139}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=()=>true;
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  // 1) กล่องซัพ: เฉพาะ active เรียงตาม sort + วันที่อยู่หัวการ์ด
  const tiles=[...d.querySelectorAll('.dtsup')];
  out.push('tiles: '+tiles.map(t=>t.textContent.trim()).join('/')+' (คาด FarmFresh/Smilemeat ไม่มี Knock)');
  out.push('date in header: '+!!d.querySelector('h3 #dtDate'));
  // 2) เลือกซัพ -> เทมเพลตจากบิลล่าสุด (จำนวนว่าง)
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  out.push('tile highlighted: '+d.querySelector('.dtsup[data-sid="1"]').classList.contains('on'));
  out.push('template lines: '+w.eval('S.dtLines.length')+' (คาด 2 จากบิล 15 ส.ค.)');
  out.push('qty ว่าง ราคาเดิม: '+w.eval("S.dtLines[0].qty===''&&S.dtLines[0].price===139"));
  out.push('note: '+d.getElementById('dtTplNote').textContent.includes('บิลล่าสุด'));
  out.push('log shows บอย: '+d.getElementById('dtLog').textContent.includes('บอย'));
  // 3) แก้ไขบิลที่มีอยู่ -> log diff
  w.__hasBill=true;
  await w.dtLoad(); await new Promise(r=>setTimeout(r,120));
  w.dtEdit(0,'qty','12'); w.dtEdit(0,'price','142');
  w.dtAddLine(); w.dtEdit(1,'item','ปลาหมึก'); w.dtEdit(1,'qty','3');
  await w.dtSave(); await new Promise(r=>setTimeout(r,150));
  const log=calls.find(c=>c.log&&c.log.change&&c.log.change.includes('→'));
  out.push('log editor แพท: '+(log.log.editor==='แพท'));
  out.push('log has diff: qty '+log.log.change.includes('10→12')+' price '+log.log.change.includes('139.00→142.00')+' add '+log.log.change.includes('เพิ่ม ปลาหมึก'));
  // 3.5) ลงผิด: เคลียร์รายการหมดแล้วกดบันทึก -> เสนอให้ลบ (confirm=true -> ลบเลย)
  w.__hasBill=true; await w.dtLoad(); await new Promise(r=>setTimeout(r,120));
  out.push('del btn visible: '+(d.getElementById('dtDelBtn').style.display===''));
  w.eval("S.dtLines=[{item:'',qty:'',unit:'',price:''}]");
  calls.length=0;
  await w.dtSave(); await new Promise(r=>setTimeout(r,150));
  out.push('empty save -> deleted: '+(calls.filter(c=>c.del).length>=1)+' log ลบบิล: '+!!calls.find(c=>c.log&&c.log.change.includes('ลบบิล')));
  // 4) ลบบิล (ไม่มีสลิป) -> ลบ items + expense + log
  calls.length=0;
  await w.dtDeleteBill(ds,1,null);
  await new Promise(r=>setTimeout(r,150));
  out.push('del bill_items: '+(calls.filter(c=>c.del).length===1)+' (ไม่มีแถวรายจ่ายใน mock จึงลบเฉพาะ items)');
  out.push('del log: '+!!calls.find(c=>c.log&&c.log.change.includes('ลบบิล')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
