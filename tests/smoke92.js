// smoke92: แท็บตรวจสอบเงิน — ไฟล์เงินเคลื่อนไหว (balances) → ตารางเงินเข้าธนาคาร
// mookt: PAYMENT 1 ก.ย. 39,850.20 → PAYOUT 1 ก.ย. · PAYMENT 2 ก.ย. 38,853.945 ยังไม่ payout (คงค้าง 38,853.95)
// jingjai: PAYMENT+PAYOUT 1 ก.ย. 298,876.50 · ADJUSTMENT 2 ก.ย. +1,298.98
// เงินเข้าธนาคาร 1 ก.ย. = 39,850.20+298,876.50 = 338,726.70 · แยกบัญชีจากชื่อไฟล์ (ไฟล์ไม่มีคอลัมน์ merchant)
// อัปโหลดปนกับไฟล์รายการ (transactions) 1 ไฟล์ → ต้องแยกชนิดเองแล้วลงคนละตาราง
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const BH='created_at,balance_type,gross_amount,fee_amount,vat_amount,net_amount,accumulated_amount,currency';
const csvBalA=BH+'\n'
 +'2026-09-02T02:01:00.000000+07:00,PAYMENT,39000,136.5,9.555,38853.945,38853.95,THB\n'
 +'2026-09-01T10:30:00.000000+07:00,PAYOUT,-39850.2,0,0,-39850.2,0,THB\n'
 +'2026-09-01T02:01:00.000000+07:00,PAYMENT,40000,140,9.8,39850.2,39850.2,THB\n';
const csvBalB=BH+'\n'
 +'2026-09-02T14:00:00.000000+07:00,ADJUSTMENT,1298.98,0,0,1298.98,1298.98,THB\n'
 +'2026-09-01T11:00:00.000000+07:00,PAYOUT,-298876.5,0,0,-298876.5,0,THB\n'
 +'2026-09-01T02:01:00.000000+07:00,PAYMENT,300000,1050,73.5,298876.5,298876.5,THB\n';
const csvTx='merchant_id,transaction_date,transaction_time,transaction_amount,fee_amount,vat_amount,net_amount,settlement_status,charge_id\n'
 +'A,2026-09-01,12:00:00,1000,3.5,0.245,996.255,SETTLED,z1\n'
 +'A,2026-09-02,01:30:00,50,0.18,0.0126,49.81,SETTLED,z2\n';
let beamRows=[],moveRows=[]; const posts={daily:[],moves:[]};
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-09'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_beam_moves')&&method!=='GET'){
        const rows=JSON.parse(opt.body); posts.moves.push(rows);
        rows.forEach(r=>{ moveRows=moveRows.filter(x=>!(x.acct===r.acct&&x.ts===r.ts&&x.btype===r.btype)); moveRows.push(r); });
        return T([]);
      }
      if(url.includes('pnl_beam_moves'))return T(moveRows);
      if(url.includes('pnl_beam_daily')&&method!=='GET'){
        const rows=JSON.parse(opt.body); posts.daily.push(rows);
        rows.forEach(r=>{ beamRows=beamRows.filter(x=>!(x.acct===r.acct&&x.d===r.d)); beamRows.push(r); });
        return T([]);
      }
      if(url.includes('pnl_beam_daily'))return T(beamRows);
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
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
  await sleep(450);
  // 1) ชื่อบัญชีจากชื่อไฟล์
  out.push('beamAcct จากชื่อไฟล์: '+(w.beamAcct('jingjaimookt-balances_20260801.csv')==='jingjaimookt'&&w.beamAcct('jingjaibalances_x.csv')==='jingjai'));
  // 2) beamMoves แปลงแถวถูก
  const mv=w.beamMoves([{name:'jingjaimookt-balances.csv',text:csvBalA}]);
  const p1=mv.rows.find(r=>r.btype==='PAYOUT');
  out.push('mookt 3 แถว · PAYOUT net -39,850.2 d=2026-09-01: '+(mv.rows.length===3&&!!p1&&p1.net===-39850.2&&p1.d==='2026-09-01'&&p1.acct==='jingjaimookt'));
  // 3) อัปโหลดปน 3 ไฟล์ (บาลานซ์ 2 + รายการ 1) → แยกชนิดเอง ลงคนละตาราง
  await w.eval("show('recon')"); await sleep(300);
  const mkFile=(name,text)=>({name,text:()=>Promise.resolve(text)});
  await w.beamUpload({files:[mkFile('jingjaimookt-balances.csv',csvBalA),mkFile('jingjai-balances.csv',csvBalB),mkFile('jingjaimookt-transactions.csv',csvTx)],value:''});
  await sleep(400);
  out.push('แยกชนิด: moves 6 แถว · daily 1 แถว (bizday เดียว 2 รายการ): '
    +(posts.moves.length===1&&posts.moves[0].length===6&&posts.daily.length===1&&posts.daily[0].length===1&&posts.daily[0][0].tx_count===2));
  const t=d.getElementById('view-recon').textContent;
  // 4) ตารางเงินเข้าธนาคาร
  out.push('มีการ์ด 🏦 + คอลัมน์ 2 บัญชี: '+(t.includes('เงินเข้าบัญชีธนาคาร')&&t.includes('jingjaimookt')&&t.includes('jingjai')));
  out.push('เงินเข้า 1 ก.ย.: mookt 39,850.20 · jingjai 298,876.50 · รวม 338,726.70: '
    +(t.includes('39,850.20')&&t.includes('298,876.50')&&t.includes('338,726.70')));
  out.push('รวมเดือนนี้ = 338,726.70 (payout เดียว): '+t.includes('รวมเดือนนี้'));
  out.push('คงค้าง mookt ณ 2026-09-02 ฿38,853.95: '+t.includes('คงค้างใน jingjaimookt ณ 2026-09-02 ฿38,853.95'));
  out.push('เตือน ADJUSTMENT +1,298.98: '+(t.includes('ADJUSTMENT')&&t.includes('+1,298.98')));
  out.push('มีปุ่ม 2 ช่อง (รายการ/เงินเคลื่อนไหว): '+(!!d.getElementById('beamFile')&&!!d.getElementById('beamFile2')&&t.includes('ไฟล์เงินเคลื่อนไหว')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
