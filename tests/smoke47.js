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
const posts=[], dels=[];
// วันนี้มี 2 บิล: บิล1 none (ข้าว 10×100=1000) · บิล2 ex (น้ำมัน 10×10−0=100→107)
const dayRows=[
  {item:'ข้าว',qty:10,unit:'ถุง',price:100,sort:0,vat_mode:'none',discount:0,bill_discount:0,bill_no:1},
  {item:'น้ำมัน',qty:10,unit:'ขวด',price:10,sort:0,vat_mode:'ex',discount:0,bill_discount:0,bill_no:2}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){posts.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      if(method==='POST')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'AFM',category:'อาหาร',active:true,sort:1,vat_type:'VAT / NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ประวัติ (มี bill_no): บิล2 ของวันก่อน = น้ำมัน ex
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.1'))
        return T([{item:'น้ำมัน',unit:'ขวด',price:10,qty:5,d:'2026-08-15',sort:0,discount:0,bill_no:2,vat_mode:'ex'},
                  {item:'ข้าว',unit:'ถุง',price:100,qty:8,d:'2026-08-15',sort:0,discount:0,bill_no:1,vat_mode:'none'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds))return T(w.__day2?dayRows:[]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.'))return T(dayRows.map(r=>({...r,d:ds,supplier_id:1})));
      if(method==='GET'&&url.includes('pnl_bill_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_sup_items'))return T([]);
      if(method==='GET'&&url.includes('pnl_expense_daily')&&url.includes('d=eq.'))return T([{amount:1107,paid:false,slip_url:null}]);
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
  w.__day2=true;
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,250));
  // 1) แถบ "วันนี้" = ป้ายโหมด ไม่มีเลขบิล
  const tabs=d.getElementById('dtBillTabs').textContent;
  out.push('ชิปวันนี้: ไม่มีVAT ฿1,000 + +7% ฿107 (ไม่มีคำว่าบิลที่): '+(tabs.includes('วันนี้')&&tabs.includes('ไม่มี VAT · ฿1,000')&&tabs.includes('+7% · ฿107')&&!tabs.includes('บิลที่')));
  out.push('เปิดมาที่บิล none: '+w.eval("S.dtBillNo===1&&S.dtVat==='none'&&S.dtLines[0].item==='ข้าว'"));
  // 2) ปุ่ม VAT = สลับไปบิล ex ของวัน (ใบที่บันทึกไว้ qty เดิมมาครบ)
  await w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,200));
  out.push('สลับ +7%: โหลดบิล ex เดิม (น้ำมัน qty10): '+w.eval("S.dtBillNo===2&&S.dtVat==='ex'&&S.dtLines[0].item==='น้ำมัน'&&S.dtLines[0].qty===10"));
  // 3) แก้บิล 2 แล้วบันทึก -> ลบ/insert เฉพาะ bill_no=2 + expense = 1000+214=1214
  w.dtEdit(0,'qty','20');
  await w.dtSave(); await new Promise(r=>setTimeout(r,250));
  out.push('delete scoped bn2: '+dels.some(x=>x.includes('bill_no=eq.2')));
  const it=posts.find(p=>p.items);
  out.push('rows bill_no=2: '+(it.items[0].bill_no===2));
  const ex=posts.find(p=>p.exp);
  out.push('expense วันรวม 1,214: '+(Math.abs(ex.exp[0].amount-1214)<0.01));
  // 4) วันใหม่: กดปุ่ม +7% -> เทมเพลตชุด ex (น้ำมัน qty ว่าง)
  w.__day2=false; posts.length=0; dels.length=0;
  w.eval("S.dtDate='2026-08-25'");
  await w.dtLoad(); await new Promise(r=>setTimeout(r,200));
  await w.dtVatSet('ex'); await new Promise(r=>setTimeout(r,200));
  out.push('วันใหม่กด +7%: template น้ำมัน qty ว่าง: '+w.eval("S.dtLines[0].item==='น้ำมัน'&&S.dtLines[0].qty===''&&S.dtVat==='ex'"));
  out.push('note ชุดตามแบบบิล: '+d.getElementById('dtTplNote').textContent.includes('ทุกสินค้าที่เคยอยู่ในบิลแบบนี้'));
  // 5) ลบบิล 2 ของวันเดิม (มีบิล 1 เหลือ) -> expense = 1000
  w.__day2=true; w.eval("S.dtDate='"+ds+"'");
  await w.dtDeleteBill(ds,1,null,2); await new Promise(r=>setTimeout(r,250));
  out.push('ลบ scoped + expense เหลือ 1,000: '+(dels.some(x=>x.includes('bill_no=eq.2'))&&posts.some(p=>p.exp&&Math.abs(p.exp[0].amount-1000)<0.01)));
  // 6) vatrep แยก 2 บิล
  d.querySelector('.sb-item[data-v="vatrep"]').click();
  await new Promise(r=>setTimeout(r,300));
  const vt=d.getElementById('view-vatrep').textContent.replace(/\s+/g,' ');
  out.push('vatrep: none 1 + ex 1 · ไม่มีคำว่าบิลที่: '+(vt.includes('ไม่มี VAT 1 บิล')&&vt.includes('(+7%) 1 บิล')&&!vt.includes('บิลที่')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
