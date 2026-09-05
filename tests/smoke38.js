const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJPNL').digest('hex');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const users=[
  {id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',perms:{},active:true},
  {id:2,username:'boy',pass_hash:H('boy','1234'),display_name:'บอย',role:'staff',active:true,
   perms:{dash:'view',income:'edit',exp:'edit',detail:'edit',usage:'view',sum:'none',pv:'none',etc:'none',set:'none'}}];
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:107000,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(method==='POST'&&url.includes('pnl_activity_log')){posts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_users')&&method==='GET'){
        if(url.includes('username=eq.')){const u=decodeURIComponent(url.match(/username=eq\.([^&]+)/)[1]);return T(users.filter(x=>x.username===u));}
        return T(users);
      }
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
      if(method==='POST'&&url.includes('pnl_income_daily')){posts.push({inc:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      return T([]);
    };
    w.TextEncoder=TextEncoder; // jsdom ไม่มีใน window — sha256hex ต้องใช้
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  await new Promise(r=>setTimeout(r,350));
  // 1) ไม่มี session -> ต้องเจอหน้า login, แอปยังไม่โชว์
  out.push('login shown: '+(d.getElementById('loginOv').style.display==='flex'));
  out.push('app hidden: '+(d.getElementById('app').style.display!=='block'));
  // 2) รหัสผิด
  d.getElementById('lgU').value='boy'; d.getElementById('lgP').value='wrong';
  await w.doLogin(); await new Promise(r=>setTimeout(r,150));
  out.push('wrong pass msg: '+d.getElementById('lgMsg').textContent.includes('ไม่ถูกต้อง'));
  // 3) login พนักงาน boy
  d.getElementById('lgP').value='1234';
  await w.doLogin(); await new Promise(r=>setTimeout(r,450));
  out.push('logged in: '+w.eval("S.user&&S.user.username")+' role='+w.eval("S.user.role"));
  out.push('login log posted: '+posts.some(p=>p.action==='เข้าสู่ระบบ'&&p.username==='boy'));
  // 4) เมนูตามสิทธิ์: sum/pv/etc/set ต้องซ่อน
  const hidden=['sum','pv','etc','set'].every(v=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display==='none');
  const shown=['dash','income','exp'].every(v=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display!=='none');
  out.push('nav perms: hidden='+hidden+' shown='+shown);
  // หมวด "ตรวจสอบ & เอกสาร" ของ boy ถูกซ่อนทั้งหมวด (ทุกเมนูข้างในไม่มีสิทธิ์) แต่หมวดอื่นยังโชว์
  const secs=[...d.querySelectorAll('.sb-sec')];
  const secShown=t=>{const x=secs.find(e=>e.textContent.includes(t));return x?x.style.display!=='none':null;};
  out.push('หัวหมวดตามสิทธิ์: ตรวจสอบ&เอกสาร ซ่อน · ภาพรวม/งานประจำวัน/สต๊อก โชว์: '
    +(secShown('ตรวจสอบ')===false&&secShown('ภาพรวม')===true&&secShown('งานประจำวัน')===true&&secShown('สต๊อก')===true));
  out.push('user chip: '+d.getElementById('sbUser').textContent.includes('บอย'));
  // 5) dash = view -> มีแบนเนอร์ + เขียนถูกบล็อก
  out.push('dash banner: '+d.getElementById('view-dash').textContent.includes('ดูอย่างเดียว'));
  const dsh=d.getElementById('view-dash').textContent;
  out.push('คงเหลือสุทธิตั้งจากรวม VAT: 107,000 · VAT รอนำส่ง 7,000 · หลังหัก 100,000: '+(dsh.includes('฿107,000')&&dsh.includes('VAT รอนำส่ง ฿7,000')&&dsh.includes('เหลือ ฿100,000')));
  let blocked=false;
  try{ await w.eval("ups('pnl_expense_daily',[{branch:'JJRD',d:'2026-08-01',supplier_id:1,amount:1}],'branch,d,supplier_id')"); }
  catch(e){ blocked=String(e.message).includes('view-only'); }
  out.push('write blocked on view tab: '+blocked+' | no exp post: '+!posts.some(p=>p.exp));
  // 6) หน้า income = edit -> เขียนได้ + auto log
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,250));
  const cb=[...d.querySelectorAll('#incChips button')].find(b=>b.dataset.d==='1');
  out.push('ปฏิทินรายรับโชว์ยอดรายวัน 107k เหมือนรายจ่าย: '+(!!cb&&cb.classList.contains('hasamt')&&cb.textContent.includes('107k')));
  // เงินโอนคีย์ยอดก่อนหัก 10,000 → โน้ตใต้ช่องบอกเข้าบัญชีจริง 9,962.55 (หัก 37.45) · เทียบ POS ใช้ยอดก่อนหักตรง ๆ
  w.eval("S.incDay=1"); w.renderIncDay();
  const r1=w.eval("S.cache[mkey(S.br,S.m)].inc['2026-08-01']");
  r1.deposit_am=97000; r1.transfer_total_am=10000; w.renderIncDay();
  await new Promise(r=>setTimeout(r,100));
  const tf=d.getElementById('tfee1_am').textContent;
  out.push('โน้ตยอดเข้าจริง: 9,962.55 หัก 37.45: '+(tf.includes('9,962.55')&&tf.includes('37.45')));
  const clT=d.getElementById('cl1am').textContent, sdT=d.getElementById('sd1am').textContent;
  out.push('เทียบกะ: นับได้ 107,000 ตรง POS ผลต่าง 0: '+(clT.includes('107,000.00')&&/ตรง/.test(sdT)));
  const df=w.shiftDiffCalc(w.eval("S.cache[mkey(S.br,S.m)]"),'2026-08-01',r1,'am');
  out.push('shiftDiffCalc ไม่บวกค่าธรรมเนียม: '+(Math.abs(df)<0.01));
  w.incInput(1,'transfer_total_am','5000');
  out.push('พิมพ์ใหม่ 5,000 → โน้ตอัปเดตสด 4,981.28: '+d.getElementById('tfee1_am').textContent.includes('4,981.28'));
  const trp=d.getElementById('trfRep').textContent;
  out.push('แผงเงินโอนรายวัน: วัน 1 ก่อนหัก 5,000.00 เข้าจริง 4,981.28 + รวม 1 วัน + ค่าธรรมเนียมเดือน 18.73: '+(trp.includes('5,000.00')&&trp.includes('4,981.28')&&trp.includes('รวม 1 วัน')&&trp.includes('18.73')));
  r1.deposit_am=0; r1.transfer_total_am=0; w.renderIncDay();
  await w.eval("ups('pnl_income_daily',[{branch:'JJRD',d:'2026-08-02',sales_pos_am:5}],'branch,d')");
  await new Promise(r=>setTimeout(r,150));
  out.push('income write ok: '+posts.some(p=>p.inc));
  out.push('auto log บันทึกรายรับ: '+posts.some(p=>p.action==='บันทึกรายรับ'&&p.username==='boy'&&(p.detail||'').includes('2026-08-02')));
  // 7) พยายามเข้าหน้า set ตรงๆ -> เด้งไปหน้าแรกที่มีสิทธิ์
  await w.show('set'); await new Promise(r=>setTimeout(r,200));
  out.push('show(set) redirected: '+w.eval('S.tab')+' (คาด dash)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
