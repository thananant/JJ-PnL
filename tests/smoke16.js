const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const calls=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('/storage/v1/object/slips/')){calls.push('upload:'+url.split('/slips/')[1]);return T({Key:'x'});}
      if(method==='POST'&&url.includes('pnl_expense_daily')){calls.push(JSON.parse(opt.body));return T([]);}
      if(method==='GET'&&url.includes('pnl_suppliers'))return T([{id:7,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT',payment_term:'7 วัน',bank:'KBANK',account_no:'123-4-56789-0',account_name:'ฟาร์มเฟรช จก.'}]);
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([{branch:'JJRD',d:'2026-08-18',supplier_id:7,amount:5000,paid:false,slip_url:'https://x/have.jpg'}]);
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
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  out.push('unpaid bar: '+d.getElementById('unpaidT').textContent+' (คาด ฿5,000)');
  const chip=d.querySelector('[data-pd="7"]'), slip=d.querySelector('[data-sl="7"]');
  out.push('chip: "'+chip.textContent.trim()+'" on='+chip.classList.contains('on')+' slip: "'+slip.textContent+'"');
  // ติ๊กจ่าย
  await w.paidToggle('2026-08-18',7);
  out.push('after toggle: on='+chip.classList.contains('on')+' tick='+chip.textContent.includes('✓')+' unpaid='+d.getElementById('unpaidT').textContent);
  // แนบสลิป (จำลองผ่าน slipPicked ตรง ๆ)
  const blob=new w.Blob(['fake'],{type:'image/jpeg'});
  blob.name='slip.jpg';
  w.S_slipHack=1; w.eval("S._slipTarget={ds:'2026-08-18',sid:7}");
  await w.slipPicked({files:[blob],value:''});
  await new Promise(r=>setTimeout(r,80));
  out.push('slip btn after upload: "'+slip.textContent+'" has='+slip.classList.contains('has'));
  const saved=calls.filter(x=>typeof x!=='string').flat();
  out.push('paid save: '+JSON.stringify(saved.find(r=>'paid' in r)));
  out.push('slip save has url: '+!!(saved.find(r=>r.slip_url)||{}).slip_url);
  out.push('upload path: '+calls.find(x=>typeof x==='string'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
