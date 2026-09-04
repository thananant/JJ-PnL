// smoke75: หน้าการใช้ของ โหมด "⚖ ต่อยอดขาย ฿10,000" — แยกกลุ่มวัน จ–พฤ / ศ / ส–อา
// ยอดขาย(รวม VAT): จ 10,000 · อ 10,000 · ศ 20,000 · ส 30,000 · อา 40,000 → กลุ่ม [20,000 / 20,000 / 70,000] เฉลี่ย/วัน [10,000 / 20,000 / 35,000]
// โมเดล (แก้ 25 ส.ค. 69 ตามที่ผู้ใช้ชี้): อัตราเดียว = ใช้ทั้งเดือน ÷ (ยอดขายรวม ÷ 10,000) แล้วคาดการณ์ใช้/วันรายกลุ่ม = อัตรา × ยอดขายเฉลี่ยวันของกลุ่ม ÷ 10,000
// หมู 42 กก. → อัตรา 3.82/หมื่น · ใช้/วัน [จ–พฤ 3.82 · ศ 7.64 · ส–อา 13.36] · ฿/หมื่น 381.82
// น้ำแข็ง 4 ถุง → อัตรา 0.36 · ใช้/วัน [0.36 · 0.73 · 1.27] · ฿/หมื่น 5.45 · แถวรวม 387.27
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// ส.ค. 2569: 3=จันทร์ 4=อังคาร 7=ศุกร์ 8=เสาร์ 9=อาทิตย์
const inc=(d,amt)=>({branch:'JJRD',d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const incRows=[inc('2026-08-03',10000),inc('2026-08-04',10000),inc('2026-08-07',20000),inc('2026-08-08',30000),inc('2026-08-09',40000)];
const B=(d,item,unit,qty,price)=>({branch:'JJRD',d,supplier_id:1,item,unit,qty,price,discount:0,sort:0,bill_no:1});
const bills=[B('2026-08-03','หมู','กก.',5,100),B('2026-08-04','หมู','กก.',5,100),B('2026-08-07','หมู','กก.',8,100),
             B('2026-08-08','หมู','กก.',12,100),B('2026-08-09','หมู','กก.',12,100),B('2026-08-07','น้ำแข็ง','ถุง',4,15)];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาดสด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('2026-08'))return T(incRows);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rowOf=n=>[...d.querySelectorAll('tr.urow')].find(tr=>tr.textContent.includes(n));
const cells=tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent.trim());
setTimeout(async()=>{
  const out=[];
  await sleep(500); await w.eval("show('usage')"); await sleep(400);
  await w.usageModeSet('sup'); await sleep(400); // ใช้มุมมองแยกซัพ (มีหัวกลุ่มซัพให้เช็ค ฿/หมื่นรายกลุ่ม)
  out.push('มีปุ่มสลับ ⚖ ต่อยอดขาย ฿10,000 (เริ่มปิด · ตารางปกติ): '+([...d.querySelectorAll('.useg button')].some(b=>b.textContent.includes('ต่อยอดขาย ฿10,000')&&!b.classList.contains('on'))&&d.getElementById('view-usage').textContent.includes('ใช้ทั้งเดือน')));
  await w.usage10kSet(true); await sleep(500);
  const t=d.getElementById('view-usage').textContent;
  out.push('โน้ตสูตร + ยอดขายเฉลี่ย/วัน: จ–พฤ ฿10,000 (2 วัน) · ศ ฿20,000 (1 วัน) · ส–อา ฿35,000 (2 วัน): '+(t.includes('อัตรา (ต่อ ฿10,000)')&&t.includes('จ–พฤ ฿10,000 (2 วัน)')&&t.includes('ศ ฿20,000 (1 วัน)')&&t.includes('ส–อา ฿35,000 (2 วัน)')));
  out.push('หัวตาราง: ต่อ ฿10,000 · ใช้/วัน รายกลุ่ม · ฿/หมื่น: '+(t.includes('ต่อ ฿10,000')&&t.includes('จ–พฤ ใช้/วัน')&&t.includes('ส–อา ใช้/วัน')&&t.includes('฿/หมื่น')));
  const pork=rowOf('หมู'), ice=rowOf('น้ำแข็ง');
  const pc=cells(pork), ic=cells(ice);
  out.push('หมู อัตรา 3.82/หมื่น · ใช้/วัน [3.82, 7.64, 13.36] · ฿/หมื่น 381.82: '+(pc[1]==='3.82'&&pc[2]==='3.82'&&pc[3]==='7.64'&&pc[4]==='13.36'&&pc[5]==='381.82'));
  out.push('น้ำแข็ง อัตรา 0.36 · ใช้/วัน [0.36, 0.73, 1.27] · ฿/หมื่น 5.45: '+(ic[1]==='0.36'&&ic[2]==='0.36'&&ic[3]==='0.73'&&ic[4]==='1.27'&&ic[5]==='5.45'));
  const head=d.querySelector('tr.ughead');
  out.push('หัวซัพ: ช่องกลางว่าง (ไม่มีเรตรายกลุ่มแล้ว) · รวม ฿/หมื่น 387.27: '+(head.querySelectorAll('td').length===4&&head.querySelector('.usub').textContent==='387.27'));
  out.push('แถวรวมล่าง = มูลค่าของรวมต่อ ฿10,000 = 387.27: '+(d.getElementById('useTotL').textContent.includes('ต่อยอดขาย ฿10,000')&&d.getElementById('useTotV').textContent==='387.27'));
  // ค้นหาใช้ร่วมกันได้: กรอง "หมู" → รวมที่ค้นพบ 381.82 · ล้างแล้วป้ายกลับเป็นของโหมดหมื่น
  w.usageFilter('หมู');
  out.push('ค้น "หมู": รวมที่ค้นพบ (1 รายการ) 381.82: '+(d.getElementById('useTotL').textContent==='รวมที่ค้นพบ (1 รายการ)'&&d.getElementById('useTotV').textContent==='381.82'));
  w.usageFilter('');
  out.push('ล้างคำค้น: ป้ายกลับเป็น "มูลค่าของรวม ต่อยอดขาย ฿10,000": '+(d.getElementById('useTotL').textContent==='มูลค่าของรวม ต่อยอดขาย ฿10,000'&&d.getElementById('useTotV').textContent==='387.27'));
  out.push('จำโหมดใน LS: '+(w.localStorage.getItem('jj_use10k')==='true'));
  // สลับกลับโหมดปกติ: คอลัมน์เดิมกลับมา
  await w.usage10kSet(false); await sleep(400);
  out.push('ปิดโหมด: ตารางปกติกลับมา (ใช้ทั้งเดือน · หมู 42 กก.): '+(d.getElementById('view-usage').textContent.includes('ใช้ทั้งเดือน')&&rowOf('หมู').textContent.includes('42')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
