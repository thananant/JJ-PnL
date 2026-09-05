// smoke67: หลังนำเข้า history — (1) หัวคอลัมน์ "เฉลี่ย N ด." ตามจำนวนเดือนจริง (2) ไม่เอามาตรฐานตั้งต้นมาปนรายซัพเมื่อมีข้อมูลจริง
// (3) แตะตัวเลขเฉลี่ย → ป๊อปอัพรายเดือน (ทั้งแบบข้อมูลจริงและแบบมาตรฐานตั้งต้น) (4) "เทียบเดือนก่อน" ใช้ข้อมูลย้อนหลังเมื่อเดือนก่อนไม่มีข้อมูลรายวัน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const H=JSON.parse(fs.readFileSync('tests/fixtures/fix_history.json','utf8'));
const I=JSON.parse(fs.readFileSync('tests/fixtures/fix_items.json','utf8'));
const SUP=JSON.parse(fs.readFileSync('tests/fixtures/fix_sup.json','utf8'));
// มาตรฐานตั้งต้น 2 ช่วง (จำลอง pnl_benchmarks หลังรัน import: period = YYYY-MM)
const BEN=[{bkey:'FarmFresh',period:'2026-02',pct:0.0451},{bkey:'FarmFresh',period:'2026-01',pct:0.0374},{bkey:'Smilemeat',period:'2026-01',pct:0.0861},{bkey:'Smilemeat',period:'2026-02',pct:0.0561},{bkey:'TRR (ม้าบิน)',period:'2026-01',pct:0.0026},{bkey:'TRR (ม้าบิน)',period:'2026-02',pct:0.0015}];
const pre=`<script>
window.Chart=function(el,cfg){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(br,d,amt)=>({branch:br,d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const supId=n=>SUP.find(s=>s.name===n).id;
function boot(br,m){
  return new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      w.localStorage.setItem('jjpnl_br',JSON.stringify(br)); w.localStorage.setItem('jjpnl_m',JSON.stringify(m));
      w.fetch=async(url,opt)=>{
        if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
        if(url.includes('pnl_suppliers'))return T(SUP);
        if(url.includes('pnl_benchmarks'))return T(BEN);
        if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
        // กรองตามสาขา + ช่วงเดือนเหมือน Supabase จริง (month=gte.X&month=lte.Y)
        const inRange=r=>{ const g=url.match(/month=gte\.([\d-]+)/), l=url.match(/month=lte\.([\d-]+)/); return (!g||r.month>=g[1])&&(!l||r.month<=l[1]); };
        if(url.includes('pnl_history_items')){ const mm=url.match(/branch=eq\.(\w+)/); return T(I.filter(r=>(!mm||r.branch===mm[1])&&inRange(r))); }
        if(url.includes('pnl_history')){ const mm=url.match(/branch=eq\.(\w+)/); return T(H.filter(r=>(!mm||r.branch===mm[1])&&inRange(r))); }
        // ส.ค. 69 รัชดา: ขาย 214,000 (ก่อน VAT 200,000) · FarmFresh 8,000 (4.00%) · Smilemeat 12,000 (6.00%)
        if(url.includes('pnl_income_daily')&&url.includes('JJRD')&&url.includes('2026-08'))return T([inc('JJRD','2026-08-01',107000),inc('JJRD','2026-08-02',107000)]);
        if(url.includes('pnl_income_daily'))return T([]);
        if(url.includes('pnl_expense_daily')&&url.includes('JJRD')&&url.includes('2026-08'))return T([{branch:'JJRD',d:'2026-08-02',supplier_id:supId('FarmFresh'),amount:8000,paid:true},{branch:'JJRD',d:'2026-08-03',supplier_id:supId('Smilemeat'),amount:12000,paid:true}]);
        if(url.includes('pnl_expense_daily'))return T([]);
        return T([]);
      };
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      w.HTMLCanvasElement.prototype.getContext=()=>({});
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const near=(a,b,t)=>Math.abs(a-b)<(t||0.0005);
(async()=>{
  const out=[];
  // ---------- รัชดา ส.ค. 69: history มีแค่ ก.ค. (1 เดือน) ----------
  let vc=boot('JJRD','2026-08'); let w=vc.window,d=w.document; await sleep(900);
  const rowOf=n=>[...d.querySelectorAll('tr')].find(tr=>tr.textContent.trim().startsWith(n));
  // แดชบอร์ด: เทียบเดือนก่อนใช้ history ก.ค. (รายได้ 7,221,914.01 · VC 3,263,519.40) ไม่มีแถวสุทธิ
  let t=d.body.textContent;
  const emptyPrev=[...d.querySelectorAll('.empty')].some(e=>e.textContent.includes('ยังไม่มีข้อมูลเดือนก่อน'));
  out.push('[dash JJRD] เทียบเดือนก่อนจาก history (ไม่ขึ้น "ยังไม่มีข้อมูลเดือนก่อน"): '+(!emptyPrev&&t.includes('เดือนก่อนจากข้อมูลย้อนหลัง')&&t.includes('7,221,914.01')&&t.includes('3,263,519.40')));
  const cmp=[...d.querySelectorAll('table')].find(tb=>tb.textContent.includes('เดือนก่อน')&&tb.textContent.includes('รายได้รวม'));
  out.push('[dash JJRD] ตารางเทียบไม่มีแถวคงเหลือสุทธิ (history ไม่มี Fix cost): '+(!!cmp&&!cmp.textContent.includes('คงเหลือสุทธิ')));
  out.push('[dash JJRD] chip เทียบเฉลี่ย + เฉลี่ยในตารางซัพ แตะได้: '+(d.querySelectorAll('.avgtap[data-k="__total"]').length>=2&&!!d.querySelector('.avgtap[data-k="FarmFresh"]')));
  // สรุป
  await w.eval("show('sum')"); await sleep(500); t=d.body.textContent;
  out.push('[sum JJRD] หัวคอลัมน์ "เฉลี่ย 1 ด." (ไม่ใช่ 5): '+(t.includes('เฉลี่ย 1 ด.')&&!t.includes('เฉลี่ย 5 ด.')));
  out.push('[sum JJRD] โน้ตบอกเดือนที่ใช้ + เดือนก่อนจากย้อนหลัง: '+(t.includes('เฉลี่ยจากทุกเดือนที่มีข้อมูล 1 เดือน (ก.ค. 2569 · 1 เดือนจากข้อมูลย้อนหลัง)')&&t.includes('เดือนก่อน (คอลัมน์ขวาสุด) จากข้อมูลย้อนหลัง')));
  out.push('[sum JJRD] benchOf ม้าบิน = null (ไม่เอามาตรฐานตั้งต้นมาปน) + แถวหาย: '+(w.benchOf('TRR (ม้าบิน)')===null&&!rowOf('TRR (ม้าบิน)')));
  out.push('[sum JJRD] Smile heart ไม่มียอดเดือนนี้แต่มี history → แถวยังอยู่ เฉลี่ย 0.49%: '+(!!rowOf('Smile heart')&&rowOf('Smile heart').textContent.includes('0.49%')));
  const ff=rowOf('FarmFresh');
  out.push('[sum JJRD] FarmFresh เดือนนี้ 4.00% · เฉลี่ย 2.84% (แตะได้) · เทียบเดือนก่อน ▲1.16%: '+(!!ff&&ff.textContent.includes('4.00%')&&!!ff.querySelector('.avgtap')&&ff.textContent.includes('▲ 1.16%')));
  const tot=rowOf('ยอดรวม Variable cost');
  out.push('[sum JJRD] แถวรวม: เทียบเดือนก่อน ▼35.19% (10%−45.19%): '+(!!tot&&tot.textContent.includes('▼ 35.19%')));
  // ป๊อปอัพรายเดือน (ข้อมูลจริง)
  w.benchModal('FarmFresh'); let mb=d.getElementById('modalBox').textContent;
  out.push('[modal FarmFresh] เดือน ก.ค. 2569 · ย้อนหลัง · 205,283.50 · 2.84% · เฉลี่ย 1 เดือน: '+(mb.includes('FarmFresh')&&mb.includes('ก.ค. 2569')&&mb.includes('ย้อนหลัง')&&mb.includes('205,283.50')&&mb.includes('2.84%')&&mb.includes('เฉลี่ย 1 เดือน')&&d.getElementById('modalWrap').classList.contains('on')));
  w.closeModal(); w.benchModal('__total'); mb=d.getElementById('modalBox').textContent;
  out.push('[modal รวม] Variable cost รวม 3,263,519.40 · 45.19%: '+(mb.includes('Variable cost รวม')&&mb.includes('3,263,519.40')&&mb.includes('45.19%')));
  out.push('[JJRD] errors: '+JSON.stringify(w.errors));

  // ---------- ลาดพร้าว ส.ค. 69: history 7 เดือน → ใช้ 5 · ม้าบินไม่มีใน 5 เดือน (ก.ค.=0) แต่มี มี.ค.–มิ.ย. → แสดง ----------
  vc=boot('JJLP','2026-08'); w=vc.window; d=w.document; await sleep(900);
  await w.eval("show('sum')"); await sleep(500); t=d.body.textContent;
  out.push('[sum JJLP] หัวคอลัมน์ "เฉลี่ย 7 ด." + โน้ต ม.ค.–ก.ค.: '+(t.includes('เฉลี่ย 7 ด.')&&t.includes('(ม.ค. 2569 – ก.ค. 2569 · 7 เดือนจากข้อมูลย้อนหลัง)')));
  w.benchModal('Pure food'); mb=d.getElementById('modalBox').textContent;
  const modalRows=[...d.querySelectorAll('#modalBox tbody tr, #modalBox table tr')].filter(tr=>!tr.querySelector('th'));
  out.push('[modal Pure food] 7 แถวเดือน + เฉลี่ย 3 เดือน 2.62%: '+(modalRows.length===8&&mb.includes('เฉลี่ย 3 เดือน')&&mb.includes('2.62%')&&mb.includes('ม.ค. 2569')&&mb.includes('ก.ค. 2569')));
  out.push('[modal Pure food] เดือนที่ไม่มียอดโชว์ – และไม่นับ: '+(modalRows[0].textContent.includes('ม.ค.')&&modalRows[0].textContent.includes('–')));
  out.push('[JJLP] errors: '+JSON.stringify(w.errors));

  // ---------- ดูเดือนเก่าที่ไม่มี history ในช่วง 8 เดือนก่อน (ม.ค. 68) → มาตรฐานตั้งต้น ----------
  vc=boot('JJLP','2025-01'); w=vc.window; d=w.document; await sleep(900);
  await w.eval("show('sum')"); await sleep(500); t=d.body.textContent;
  out.push('[sum static] หัวคอลัมน์ "มาตรฐาน" + โน้ตยังไม่มีข้อมูล: '+(t.includes('มาตรฐาน')&&t.includes('ยังไม่มีข้อมูลของเดือนก่อนหน้าเลย')&&!t.includes('เฉลี่ย 7 ด.')));
  out.push('[static] benchOf ม้าบิน กลับมาใช้มาตรฐาน 0.21%: '+(near(w.benchOf('TRR (ม้าบิน)').avg,0.00205,0.00002)));
  w.benchModal('FarmFresh'); mb=d.getElementById('modalBox').textContent;
  out.push('[modal static] ป้ายมาตรฐานตั้งต้น + เดือนเรียง ม.ค.→ก.พ. 2569 + 3.74%/4.51% + เฉลี่ย 4.13%: '+(mb.includes('มาตรฐานตั้งต้น')&&mb.indexOf('ม.ค. 2569')<mb.indexOf('ก.พ. 2569')&&mb.includes('3.74%')&&mb.includes('4.51%')&&mb.includes('4.13%')));
  w.closeModal(); w.benchModal('__total'); mb=d.getElementById('modalBox').textContent;
  out.push('[modal static รวม] รวมทุก bkey ต่อเดือน ม.ค. 12.61%: '+(mb.includes('Variable cost รวม')&&mb.includes('12.61%')));
  out.push('[static] errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
})();
