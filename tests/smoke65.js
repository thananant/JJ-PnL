// smoke65: กราฟยอดขายรายวัน แยก VAT — แท่งล่าง = ก่อน VAT (×100/107) · แท่งบน (ฟ้า) = VAT 7% ซ้อนกันสูงเท่ายอดรวม VAT
// สีเขียว/แดงยังตัดสินจากยอดรวม VAT เทียบคุ้มทุน (กติกาเดิม) · tooltip โชว์ ก่อน VAT / VAT / รวม + สถานะคุ้มทุน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(el,cfg){window.__charts=(window.__charts||[]);window.__charts.push(cfg);this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(d,amt)=>({branch:'JJRD',d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // ขาย 4 วัน (ข้อมูลเดียวกับ smoke54): 10,700 / 21,400 / 3,210 / 32,100
      if(url.includes('pnl_income_daily')&&url.includes('JJRD'))return T([inc('2026-08-01',10700),inc('2026-08-02',21400),inc('2026-08-03',3210),inc('2026-08-04',32100)]);
      if(url.includes('pnl_income_daily'))return T([]);
      if(url.includes('pnl_expense_daily')&&url.includes('JJRD'))return T([{branch:'JJRD',d:'2026-08-02',supplier_id:1,amount:22470,paid:true}]);
      if(url.includes('pnl_expense_daily'))return T([]);
      if(url.includes('pnl_fixed_items'))return T([{id:1,name:'ค่าเช่า',grp:'รายเดือน',default_amount:40000,sort:1,active:true,branch:'JJRD'}]);
      if(url.includes('pnl_fixed_monthly'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const near=(a,b)=>Math.abs(a-b)<0.01;
setTimeout(async()=>{
  const out=[];
  await new Promise(r=>setTimeout(r,600));
  // หัวการ์ด + โน้ตอธิบายแท่ง
  out.push('หัวการ์ด "แยก VAT": '+(d.body.innerHTML.includes('ยอดขายรายวัน (แยก VAT)')&&!d.body.innerHTML.includes('ยอดขายรายวัน (รวม VAT) <span')));
  const ar=d.getElementById('avgRow').textContent;
  out.push('โน้ตแท่งล่าง/บน: '+(ar.includes('ก่อน VAT')&&ar.includes('แท่งบนสีฟ้า')&&ar.includes('VAT 7%')));
  out.push('chips เฉลี่ย/คุ้มทุน ยังอยู่ (ยอดรวม VAT เหมือนเดิม): '+(ar.includes('เฉลี่ยทั้งเดือน')&&ar.includes('คุ้มทุน/วัน')&&ar.includes('฿6,907.82')));
  const cfg=(w.__charts||[]).find(c=>c&&c.type==='bar'&&c.data&&c.data.datasets&&c.data.datasets.length>3);
  const bars=cfg.data.datasets.filter(x=>x.type!=='line');
  out.push('แท่ง 2 ชุดซ้อน stack เดียวกัน: '+(bars.length===2&&bars[0].stack==='sales'&&bars[1].stack==='sales'&&bars[0].label==='ก่อน VAT'&&bars[1].label==='VAT 7%'));
  out.push('x stacked + y ไม่ stack (เส้นไม่โดนซ้อน): '+(cfg.options.scales.x.stacked===true&&cfg.options.scales.y.stacked===undefined));
  const ex=bars[0].data, vat=bars[1].data;
  out.push('วัน1 ก่อน VAT 10,000 + VAT 700 = 10,700: '+(near(ex[0],10000)&&near(vat[0],700)&&near(ex[0]+vat[0],10700)));
  out.push('วัน4 ก่อน VAT 30,000 + VAT 2,100: '+(near(ex[3],30000)&&near(vat[3],2100)));
  out.push('วันไม่มีขาย = 0 ทั้งสองแท่ง: '+(ex[10]===0&&vat[10]===0));
  const bg=bars[0].backgroundColor;
  const g=c2=>String(c2).includes('8FD6A4')||String(c2).includes('1E8A3C');
  out.push('สีแท่งล่างยังตัดสินจากยอดรวม: วัน1,2,4 เขียว · วัน3 (3,210) แดง: '+(g(bg[0])&&g(bg[1])&&!g(bg[2])&&g(bg[3])));
  const vbg=bars[1].backgroundColor;
  out.push('แท่ง VAT สีฟ้า (เข้ม ศ-ส-อา / อ่อน จ-พฤ): '+(vbg.every(c2=>c2==='#7FA3B8'||c2==='#BBD0DC')&&vbg.includes('#7FA3B8')&&vbg.includes('#BBD0DC')));
  out.push('รัศมีมุมแบบ middle (โค้งเฉพาะขอบนอกของแท่งซ้อน): '+(bars[0].borderSkipped==='middle'&&bars[1].borderSkipped==='middle'));
  // tooltip: mode index ให้แตะแท่งเดียวเห็นทั้ง 3 ตัวเลข
  out.push('interaction index/ไม่ต้องแตะตรงเป๊ะ: '+(cfg.options.interaction.mode==='index'&&cfg.options.interaction.intersect===false));
  const cb=cfg.options.plugins.tooltip.callbacks;
  const mk=(di,idx)=>({dataset:bars[di],raw:bars[di].data[idx],dataIndex:idx,label:String(idx+1)});
  out.push('title: '+(cb.title([mk(0,0)])==='วันที่ 1'));
  out.push('label ก่อน VAT: '+(cb.label(mk(0,0))==='ก่อน VAT ฿10,000'));
  out.push('label VAT: '+(cb.label(mk(1,0))==='VAT 7% ฿700'));
  out.push('footer วัน1 รวม 10,700 เกินคุ้มทุน: '+(cb.footer([mk(0,0),mk(1,0)])==='รวม VAT ฿10,700 · ✅ เกินคุ้มทุน'));
  out.push('footer วัน3 รวม 3,210 ต่ำกว่า: '+(cb.footer([mk(0,2),mk(1,2)])==='รวม VAT ฿3,210 · ต่ำกว่าคุ้มทุน'));
  out.push('footer ว่างเมื่อไม่มี item: '+(cb.footer([])===''));
  out.push('filter ตัดเส้นออกจาก tooltip: '+(cfg.options.plugins.tooltip.filter({dataset:{type:'line'}})===false&&cfg.options.plugins.tooltip.filter({dataset:bars[1]})===true));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},650);
