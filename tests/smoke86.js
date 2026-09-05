// smoke86: โมดัลรายละเอียดสินค้า — กราฟแท่งจำนวนซื้อ + เส้นราคา (แยกเส้นรายซัพ)
// หมู: ซัพ1 วัน 3 (5@100) วัน 5 (4@110) · ซัพ2 วัน 5 (2@95) -> labels [3,5] แท่ง [5,6] เส้น 2 เส้น
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window._charts=[];
window.Chart=function(ctx,cfg){window._charts.push(cfg);this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const B=(d,sid,qty,price)=>({branch:'JJRD',d,supplier_id:sid,item:'หมู',unit:'กก.',qty,price,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'});
const bills=[B('2026-08-03',1,5,100),B('2026-08-05',1,4,110),B('2026-08-05',2,2,95)];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สมาย',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'ตลาด',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T([{branch:'JJRD',d:'2026-08-03',sales_pos_am:50000,sales_pos_pm:0}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('usage')"); await sleep(500);
  const before=w._charts.length;
  await w.usageDetailItem('หมู|กก.'); await sleep(150);
  out.push('โมดัลมี canvas กราฟ: '+(!!d.getElementById('dtlChart')));
  const cfg=w._charts[w._charts.length-1];
  out.push('สร้างกราฟใหม่ 1 อัน: '+(w._charts.length===before+1&&!!cfg));
  const dsets=cfg.data.datasets;
  const bar=dsets.find(x=>x.type==='bar');
  out.push('แกนวัน [3,5]: '+(JSON.stringify(cfg.data.labels)===JSON.stringify([3,5])));
  out.push('แท่งจำนวนซื้อ [5,6]: '+(bar&&JSON.stringify(bar.data)===JSON.stringify([5,6])));
  const lines=dsets.filter(x=>x.type==='line');
  out.push('เส้นราคาแยกรายซัพ 2 เส้น: '+(lines.length===2));
  const l1=lines.find(l=>l.label==='สมาย'), l2=lines.find(l=>l.label==='ตลาด');
  out.push('เส้นสมาย [100,110] · ตลาด [null,95]: '+(JSON.stringify(l1.data)===JSON.stringify([100,110])&&JSON.stringify(l2.data)===JSON.stringify([null,95])));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
