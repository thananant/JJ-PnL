const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=[]; for(let d=1;d<=10;d++){const ds='2026-08-'+String(d).padStart(2,'0');
  inc.push({branch:'JJRD',d:ds,sales_pos_am:10700,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});}
// เดือนนี้: 4 บิล — (03,A)none 100 · (04,A)ex 100→107 · (05,B)inc 107 · หมูสามชั้น A(10th) 10กก.×150 none + B(12th) 20กก.×139 none
const monthRows=[
  {d:'2026-08-03',supplier_id:1,item:'ถุงมือ',qty:10,unit:'กล่อง',price:10,vat_mode:'none'},
  {d:'2026-08-04',supplier_id:1,item:'น้ำมัน',qty:10,unit:'ขวด',price:10,vat_mode:'ex'},
  {d:'2026-08-05',supplier_id:2,item:'ซอส',qty:10,unit:'ขวด',price:10.7,vat_mode:'inc'},
  {d:'2026-08-10',supplier_id:1,item:'หมูสามชั้น',qty:10,unit:'กก.',price:150,vat_mode:'none'},
  {d:'2026-08-12',supplier_id:2,item:'หมูสามชั้น',qty:20,unit:'กก.',price:139,vat_mode:'none'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(monthRows);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.2026-07'))return T([{supplier_id:1,item:'หมูสามชั้น',unit:'กก.',qty:20}]);
      // dtHist: per-sup (มี supplier_id=eq) / ทั้งสาขา (ไม่มี supplier_id)
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&url.includes('supplier_id=eq.1'))
        return T([{item:'หมูสามชั้น',unit:'กก.',price:150,qty:10,d:'2026-08-10',sort:0}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc')&&!url.includes('supplier_id=eq.'))
        return T([{supplier_id:2,item:'หมูสามชั้น',unit:'กก.',price:139,d:'2026-08-12'},
                  {supplier_id:1,item:'หมูสามชั้น',unit:'กก.',price:150,d:'2026-08-10'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'))return T([]);
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
  // 1) rename + เมนูใหม่
  out.push('sidebar rename: '+(d.querySelector('.sb-item[data-v="detail"]').textContent.includes('บันทึกข้อมูลบิล')));
  out.push('sidebar vatrep: '+(d.querySelector('.sb-item[data-v="vatrep"]').textContent.includes('รายละเอียดบิล')));
  // 2) vatrep report
  d.querySelector('.sb-item[data-v="vatrep"]').click();
  await new Promise(r=>setTimeout(r,300));
  const t=d.getElementById('view-vatrep').textContent;
  const tc=t.replace(/\s+/g,' ');
  out.push('sections: none 3 บิล: '+tc.includes('ไม่มี VAT 3 บิล')+' ex 1: '+tc.includes('(+7%) 1 บิล')+' inc 1: '+tc.includes('รวม VAT แล้ว 1 บิล'));
  out.push('ex net 107: '+t.includes('107.00')+' | inc vat 7.00: '+t.includes('7.00'));
  out.push('grand 4,594.00: '+t.includes('4,594.00'));
  // คลิกบิล ex -> เปิดหน้า detail พร้อมค่า
  w.vrOpen('2026-08-04',1);
  await new Promise(r=>setTimeout(r,250));
  out.push('vrOpen -> tab=detail sup=1 date=04: '+(w.eval("S.tab==='detail'&&S.dtSup===1&&S.dtDate==='2026-08-04'")));
  // 3) dtCmp เทียบราคาข้ามซัพตอนลงบิล
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  w.eval("S.dtDate='2026-08-21'");
  w.eval("S.dtLines=[{item:'',qty:'',unit:'',price:''}]"); w.renderDtLines();
  w.dtEdit(0,'item','หมูสามชั้น');
  const cmp=d.getElementById('dtc0').innerHTML;
  out.push('dtCmp shows: cheapest ✓ Smilemeat 139 first: '+(cmp.indexOf('Smilemeat')<cmp.indexOf('FarmFresh')&&cmp.includes('✓')&&cmp.includes('139.00')));
  out.push('marks current sup: '+cmp.includes('(ซัพนี้)'));
  // 4) usage โหมดรวมสินค้า
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,350));
  w.usageModeSet('item');
  await new Promise(r=>setTimeout(r,350));
  const u=d.getElementById('view-usage').textContent;
  out.push('merged หมู 30 กก.: '+u.includes('30')+' | 3/วัน: '+u.includes('3/วัน')+' | ✓Smilemeat ถูกสุด: '+u.includes('✓Smilemeat 139.00'));
  out.push('chip ▲50% (เดือนก่อน 20): '+(u.includes('▲')&&u.includes('50.00%')));
  // modal รวมซัพ
  const key=Object.keys(w.eval('S._usage.gi')).find(k=>k.includes('หมูสามชั้น'));
  w.usageDetailItem(key);
  await new Promise(r=>setTimeout(r,80));
  const m=d.body.textContent;
  out.push('modal: 2 ซัพ + ราคาเฉลี่ย: '+(m.includes('รวม 2 ซัพ')&&m.includes('FarmFresh')&&m.includes('Smilemeat')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
