const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08'))return T([
        {branch:'JJRD',d:'2026-08-05',supplier_id:1,amount:11885,paid:false,slip_url:null,checked:false},
        {branch:'JJRD',d:'2026-08-06',supplier_id:1,amount:5000,paid:false,slip_url:null,checked:true},
        {branch:'JJRD',d:'2026-08-07',supplier_id:2,amount:9451,paid:true,slip_url:'https://x/slip.jpg',checked:true}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener:()=>{}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,350));
  // 1) ฟอร์มวันซ่อนโดย default · เมทริกซ์โชว์
  out.push('form hidden: '+(d.getElementById('expDayWrap').style.display==='none'));
  out.push('matrix exists: '+!!d.querySelector('table.mx'));
  // 2) สีสถานะ 3 ระดับ
  const c1=d.querySelector('[data-mx="2026-08-05|1"]'), c2=d.querySelector('[data-mx="2026-08-06|1"]'), c3=d.querySelector('[data-mx="2026-08-07|2"]');
  out.push('ขาว 11,885.00: '+(c1.className==='cw'&&c1.textContent==='11,885.00'));
  out.push('เหลือง (ตรวจแล้ว): '+(c2.className==='cy'));
  out.push('เขียว 9,451.00: '+(c3.className==='cg'&&c3.textContent==='9,451.00'));
  out.push('ช่องว่าง ce: '+(d.querySelector('[data-mx="2026-08-05|2"]').className==='ce'));
  // 3) รวม/วัน + รวม/ซัพ
  const t=d.querySelector('table.mx').textContent;
  out.push('รวมซัพ1 16,885.00: '+t.includes('16,885.00')+' | grand 26,336.00: '+t.includes('26,336.00'));
  // 4) กดช่อง -> เปิดฟอร์มวันนั้น
  w.expCell(5,1);
  await new Promise(r=>setTimeout(r,450));
  out.push('cell click -> day 5 + form shown: '+(w.eval('S.expDay===5&&S.expOpen===true')&&d.getElementById('expDayWrap').style.display!=='none'));
  // 5) ชิป 🔍 ตรวจ -> เหลือง + POST checked
  out.push('cchip exists: '+!!d.querySelector('[data-ck="1"]'));
  await w.chkToggle('2026-08-05',1);
  await new Promise(r=>setTimeout(r,150));
  const p1=posts.find(x=>Array.isArray(x)&&x[0].checked!==undefined&&x[0].d==='2026-08-05');
  out.push('checked posted: '+(p1&&p1[0].checked===true&&p1[0].amount===11885));
  out.push('cell -> cy: '+(d.querySelector('[data-mx="2026-08-05|1"]').className==='cy'));
  out.push('chip on: '+d.querySelector('[data-ck="1"]').classList.contains('on'));
  // 6) ปิดฟอร์ม
  w.expCloseDay();
  out.push('close: '+(d.getElementById('expDayWrap').style.display==='none'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
