const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
window.Tesseract={recognize:async()=>({data:{text:'รวม 12,000.00 บาท'}})};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('/storage/'))return T({Key:'x'});
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},
        {id:3,name:'Knock Knock',category:'ของใช้',active:true,sort:3,vat_type:'VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([
        {branch:'JJRD',d:'2026-08-05',supplier_id:2,amount:4000,paid:false,slip_url:null},
        {branch:'JJRD',d:'2026-08-12',supplier_id:2,amount:3000,paid:false,slip_url:null},
        {branch:'JJRD',d:'2026-08-18',supplier_id:2,amount:5000,paid:false,slip_url:null}]);
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
  await new Promise(r=>setTimeout(r,300));
  // ---- layout 3 คอลัมน์ ----
  out.push('exgrid exists: '+!!d.querySelector('#expForm .exgrid'));
  out.push('no qadd: '+!d.getElementById('qSup'));
  out.push('rows in grid: '+d.querySelectorAll('#expForm .exgrid .exrow').length);
  // ---- สลิปเดียวหลายบิล (Smilemeat มี 3 บิลค้าง: 4000/3000/5000) ----
  w.eval("S._slipTarget={ds:'2026-08-18',sid:2}");
  const blob=new w.Blob(['x'],{type:'image/jpeg'});
  await w.slipPicked({files:[blob],value:''});
  await new Promise(r=>setTimeout(r,120));
  const mtxt=d.body.textContent;
  out.push('assign modal: '+mtxt.includes('สลิปเดียว จ่ายหลายบิล')+' | 3 checkbox: '+d.querySelectorAll('[data-abd]').length);
  out.push('default total 12,000: '+d.getElementById('asTot').textContent.includes('12,000'));
  // เอาบิล 12 ส.ค. ออก -> เหลือ 9,000 2 บิล
  const cb=d.querySelector('[data-abd="2026-08-12"]'); cb.checked=false; w.assignTick(cb);
  out.push('after untick: '+d.getElementById('asTot').textContent+' btn: '+d.getElementById('asBtn').textContent);
  await w.assignConfirm();
  await new Promise(r=>setTimeout(r,120));
  const bulk=posts.flat().filter(r=>r.slip_url&&r.paid===true);
  out.push('bulk rows: '+bulk.length+' days: '+bulk.map(r=>r.d).join(',')+' same url: '+(new Set(bulk.map(r=>r.slip_url)).size===1));
  out.push('unpaid bar after: '+d.getElementById('unpaidT').textContent+' (เหลือบิล 12 ส.ค. 3,000)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
