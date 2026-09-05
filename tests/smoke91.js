// smoke91: แท็บตรวจสอบเงิน — กระทบยอดไฟล์ Beam (ตัดตี 6) + ตรวจปิดกะรายสาขา
// ไฟล์ A: 50,000 (1 ก.ย. 12:00) + แถวซ้ำ charge_id เดิม (ต้องข้าม) + 10,000 (2 ก.ย. 01:30 → วันขาย 1 ก.ย.)
// ไฟล์ B: 40,000 (1 ก.ย. 13:00 PENDING) + 123 (2 ก.ย. 07:00 → วันขาย 2 ก.ย. ท้ายไฟล์ = ไม่ครบวัน)
// คีย์ในแอพ 1 ก.ย.: JJRD 60,000 + JJLP 40,000 = 100,000 = Beam → ✓ ตรง · 3 ก.ย. คีย์ 500 แต่ Beam 2,000 (รายการตี 1:30 ของ 4 ก.ย.) → คีย์ขาด 1,500 = เหลือง
// ปิดกะ: JJRD ลงตัวหมด · JJLP 1 ก.ย. เช้า นับได้ 49,000 ขาด 1,000
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const incJJRD=[
  {branch:'JJRD',d:'2026-09-01',sales_pos_am:100000,sales_pos_pm:0,deposit_am:40000,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:60000,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0},
  {branch:'JJRD',d:'2026-09-03',sales_pos_am:500,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:500,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const incJJLP=[
  {branch:'JJLP',d:'2026-09-01',sales_pos_am:50000,sales_pos_pm:0,deposit_am:9000,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:40000,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const incAll=[...incJJRD,...incJJLP].map(r=>({branch:r.branch,d:r.d,transfer_total_am:r.transfer_total_am,transfer_total_pm:r.transfer_total_pm}));
const HDR='merchant_id,transaction_date,transaction_time,transaction_amount,fee_amount,vat_amount,net_amount,settlement_status,charge_id';
const csvA='﻿'+HDR+'\n'
 +'A,2026-09-01,12:00:00,50000,175,12.25,49812.75,SETTLED,c1\n'
 +'A,2026-09-01,12:00:00,50000,175,12.25,49812.75,SETTLED,c1\n'
 +'A,2026-09-02,01:30:00,10000,35,2.45,9962.55,SETTLED,c2\n'
 +'A,2026-09-04,01:30:00,2000,7,0.49,1992.51,SETTLED,c9\n';
const csvB=HDR+'\n'
 +'B,2026-09-01,13:00:00,40000,140,9.8,39850.2,PENDING,c3\n'
 +'B,2026-09-02,07:00:00,123,0.43,0.03,122.54,PENDING,c4\n';
let beamRows=[]; const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-09'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_beam_daily')&&method!=='GET'){
        const rows=JSON.parse(opt.body); posts.push(rows);
        rows.forEach(r=>{ beamRows=beamRows.filter(x=>!(x.acct===r.acct&&x.d===r.d)); beamRows.push(r); });
        return T([]);
      }
      if(url.includes('pnl_beam_daily'))return T(beamRows);
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')){
        if(url.includes('d=lt.'))return T([]); // เก๊ะเดือนก่อน
        if(url.includes('transfer_total_am')&&!url.includes('select=*'))return T(incAll); // คิวรีหน้าตรวจสอบเงิน
        if(url.includes('branch=eq.JJRD'))return T(incJJRD);
        if(url.includes('branch=eq.JJLP'))return T(incJJLP);
        return T(incAll);
      }
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
  out.push('มีปุ่มแท็บตรวจสอบเงิน: '+!!d.querySelector('.sb-item[data-v="recon"]'));
  // 1) beamAgg: ตัดตี 6 + กันแถวซ้ำ + ธงไม่ครบวัน
  const agg=w.beamAgg([{name:'a.csv',text:csvA},{name:'b.csv',text:csvB}]);
  const A1=agg.rows.find(r=>r.acct==='A'&&r.d==='2026-09-01');
  const B1=agg.rows.find(r=>r.acct==='B'&&r.d==='2026-09-01');
  const B2=agg.rows.find(r=>r.acct==='B'&&r.d==='2026-09-02');
  out.push('รวม 4 แถว (บัญชี×วันขาย): '+(agg.rows.length===4&&agg.n===5));
  out.push('A 1 ก.ย. = 60,000 (รวมรายการตี 1:30 ของ 2 ก.ย.) · 2 รายการ (ข้ามซ้ำ) · fee 224.7 · net 59,775.3: '
    +(!!A1&&A1.gross===60000&&A1.tx_count===2&&A1.fee===224.7&&A1.net===59775.3&&A1.complete===true));
  out.push('B 1 ก.ย. PENDING 39,850.2: '+(!!B1&&B1.gross===40000&&B1.pending_net===39850.2&&B1.pending_count===1&&B1.complete===true));
  out.push('B 2 ก.ย. ท้ายช่วงไฟล์ = ไม่ครบวัน: '+(!!B2&&B2.gross===123&&B2.complete===false));
  // 2) อัปโหลดผ่านหน้า → upsert แล้วเรนเดอร์ตาราง
  await w.eval("show('recon')"); await sleep(300);
  const mkFile=(name,text)=>({name,text:()=>Promise.resolve(text)});
  await w.beamUpload({files:[mkFile('a.csv',csvA),mkFile('b.csv',csvB)],value:''});
  await sleep(400);
  out.push('upsert 4 แถว: '+(posts.length===1&&posts[0].length===4));
  const t=d.getElementById('view-recon').textContent;
  out.push('วัน 1: คีย์ 100,000 = Beam 100,000 → ✓ ตรง: '+(t.includes('✓ ตรง')&&t.includes('100,000.00')));
  out.push('วัน 1 มีโน้ตรอเงินเข้า 39,850.20 (1 รายการ): '+t.includes('รอเข้า ฿39,850.20 (1 รายการ)'));
  out.push('วัน 2 ⚠ ไฟล์ไม่ครบวัน: '+t.includes('⚠ ไฟล์ไม่ครบวัน'));
  const ye=[...d.querySelectorAll('#view-recon tr')].find(tr=>(tr.getAttribute('style')||'').includes('FFF6DF'));
  out.push('วัน 3 คีย์ขาด 1,500 พื้นเหลือง: '+(!!ye&&ye.textContent.includes('คีย์ขาด/ลืมคีย์ ฿1,500.00')));
  out.push('รวม 3 วัน · เข้าจริงรวม 101,740.55 · ค่าธรรมเนียม 382.45: '
    +(t.includes('รวม 3 วัน')&&t.includes('101,740.55')&&t.includes('฿382.45')));
  // 3) ตรวจปิดกะรายสาขา
  out.push('รัชดา ปิดกะลงตัวทุกวัน: '+/สาขารัชดา · 2 กะ/.test(t)+' '+t.includes('✓ ปิดกะลงตัวทุกวัน'));
  out.push('ลาดพร้าว ไม่ลงตัว 1 กะ ขาด 1,000: '+(t.includes('ไม่ลงตัว 1 กะ')&&t.includes('ขาด ฿1,000.00')&&t.includes('วันที่ 1 เช้า −1,000.00')));
  // 4) แถบสรุปในการ์ดหัว
  out.push('สรุปหัว: เขียวตรง 1 วัน + เหลืองคีย์ขาด 1 วัน ฿1,500: '+(t.includes('เงินโอนตรง 1 วัน')&&t.includes('คีย์ขาด/ลืมคีย์ 1 วัน ฿1,500.00')));
  out.push('สรุปหัว: รอเงินเข้า 39,850.20+122.54=39,972.74: '+t.includes('รอเงินเข้าบัญชี ฿39,972.74'));
  out.push('สรุปหัว: ปิดกะไม่ลงตัว 1 กะ ขาดรวม 1,000: '+t.includes('ปิดกะไม่ลงตัว 1 กะ (ขาดรวม ฿1,000.00)'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
