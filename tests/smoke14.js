const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.__written=null;
window.XLSX={
  SSF:{parse_date_code:v=>({y:2026,m:6,d:1})},
  utils:{book_new:()=>({SheetNames:[],Sheets:{}}),
    aoa_to_sheet:a=>({__aoa:a}),
    book_append_sheet:(wb,ws,n)=>{wb.SheetNames.push(n);wb.Sheets[n]=ws;},
    json_to_sheet:r=>({})},
  writeFile:(wb,name)=>{window.__written={wb,name};}
};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if((opt&&opt.method||'GET')==='GET'&&url.includes('pnl_suppliers'))
        return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1},{id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2},{id:3,name:'เลิกใช้แล้ว',category:'อาหาร',active:false,sort:3}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window;
setTimeout(async()=>{
  const out=[];
  // 1) สร้างเทมเพลต
  w.makeHistTemplate();
  const wr=w.__written;
  out.push('template file: '+wr.name);
  const aoa=wr.wb.Sheets['ข้อมูลย้อนหลัง'].__aoa;
  out.push('rows: '+aoa.length+' | has FarmFresh: '+aoa.some(r=>r[0]==='FarmFresh')+' | inactive excluded: '+!aoa.some(r=>r[0]==='เลิกใช้แล้ว')+' | has กะเช้า/Shopee: '+(aoa.some(r=>r[0]==='กะเช้า')&&aoa.some(r=>r[0]==='Shopee')));
  // 2) parse เทมเพลตที่กรอกแล้ว (สาขาพิมพ์ 'ลาดพร้าว', เดือนเป็นตัวเลข excel serial)
  const filled=[
    ['เทมเพลตข้อมูลย้อนหลัง · JJ P&L','...'],[],
    ['เดือน (พิมพ์แบบ 2026-06)', 46000],          // serial -> SSF mock => 2026-06
    ['สาขา (JJRD หรือ JJLP)','ลาดพร้าว'],
    ['ยอดขายดิบรวมทั้งเดือน (รวม VAT)', 1070000],
    ['Grab (ถ้ามี)', 50000],['Lineman (ถ้ามี)', 0],[],
    ['รายการ','ยอด'],['FarmFresh', 12345],['Smilemeat', 0],['ธาริกันฟู้ดส์', 700],['กะเช้า', 900]
  ];
  const t=w.parseHistTemplate(filled);
  out.push('parsed: mo='+t.mo+' br='+t.br+' pos='+t.pos+' grab='+t.grab);
  out.push('items: '+JSON.stringify(t.items));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
