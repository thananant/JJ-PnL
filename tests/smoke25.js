const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:535000,sales_pos_pm:535000,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'Smilemeat',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
        {id:2,name:'FarmFresh',category:'อาหาร',active:true,sort:2,vat_type:'VAT'},
        {id:3,name:'Knock Knock',category:'ของใช้',active:true,sort:3,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:[
        {branch:'JJRD',d:'2026-08-01',supplier_id:1,amount:200000,paid:false},
        {branch:'JJRD',d:'2026-08-01',supplier_id:2,amount:100000,paid:false},
        {branch:'JJRD',d:'2026-08-01',supplier_id:3,amount:50000,paid:false}]);
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
  await new Promise(r=>setTimeout(r,350));
  const card=[...d.querySelectorAll('#view-dash h3')].find(h=>h.textContent.includes('ต้นทุนซัพพลายเออร์')).parentElement;
  const cats=[...card.querySelectorAll('tr.cat')].map(t=>t.textContent.replace(/\s+/g,' ').trim());
  out.push('cat rows: '+cats.length+' (คาด 3: อาหาร, ของใช้, รวม)');
  out.push('อาหาร subtotal 300,000: '+cats[0].includes('300,000')+' | 30.00%: '+cats[0].includes('30.00%'));
  out.push('ของใช้ subtotal 50,000: '+cats[1].includes('50,000'));
  out.push('grand: '+cats[2]);
  const supRows=[...card.querySelectorAll('tr:not(.cat)')].length-1; // หัก header
  out.push('supplier rows: '+supRows+' (คาด 3 ครบทุกราย)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
