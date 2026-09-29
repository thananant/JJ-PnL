// smoke116: สิทธิ์จากหน้า JJ Access (pnl_users.apps.pnl = {หน้า:'vaed'}) ต้องมีผลใน P&L
//  - พนักงานที่ perms เก่าว่าง แต่ JJ Access ติ๊ก ครัวกลาง(vaed)/แดชบอร์ด(v)/รายจ่าย(vae) → เห็น 3 เมนู, ck แก้ได้, dash ดูอย่างเดียว
//  - พนักงานที่ไม่มี apps.pnl → ถอยไปใช้ perms เก่าเหมือนเดิม
//  - บันทึกผู้ใช้จากหน้าตั้งค่า → เขียนทั้ง perms และ apps.pnl ให้ตรงกัน (JJ Access เห็นค่าเดียวกัน)
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
const users=[
  {id:1,username:'admin',pass_hash:H('admin','x'),display_name:'แอด',role:'admin',perms:{},active:true,apps:{}},
  // ตั้งจาก JJ Access อย่างเดียว (perms เก่าว่าง) — เคสที่เจ้าของเจอ: ให้สิทธิ์ครัวกลางแล้วแต่ไม่เห็น
  {id:2,username:'first',pass_hash:H('first','x'),display_name:'เฟิร์ส',role:'staff',active:true,perms:{},
   apps:{pnl:{dash:'v',exp:'vae',ck:'vaed'},payroll:{today:'v'}}},
  // บัญชีเก่าที่ไม่เคยตั้งใน JJ Access → ใช้ perms เดิม
  {id:3,username:'boy',pass_hash:H('boy','x'),display_name:'บอย',role:'staff',active:true,
   perms:{dash:'view',income:'edit',ck:'none'},apps:{}},
  // JJ Access ตั้งแอพอื่นให้แต่ "ปิดแอพนี้" (ไม่มีคีย์ pnl) ทั้งที่ perms เก่ายังมี → ต้องเข้า P&L ไม่ได้
  {id:4,username:'pay',pass_hash:H('pay','x'),display_name:'เพย์',role:'staff',active:true,
   perms:{dash:'edit',income:'edit'},apps:{payroll:{today:'v'}}},
  // เจ้าของ (role owner จาก JJ Access) = ทุกสิทธิ์ และหน้าผู้ใช้ต้องไม่ลดขั้นเป็นพนักงาน
  {id:5,username:'boss',pass_hash:H('boss','x'),display_name:'บอส',role:'owner',active:true,perms:{},apps:{}}];
function run(me,fn){
 return new Promise(res=>{
  const patches=[];
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
      w.localStorage.setItem('jjpnl_auth',JSON.stringify({u:me.username,h:me.pass_hash,t:Date.now()}));
      try{w.sessionStorage.setItem('jjgate_pnl',JSON.stringify({u:me.username,t:Date.now()}));}catch(e){}
      w.confirm=()=>true;
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
        if(url.includes('pnl_users')&&method==='GET'){
          if(url.includes('username=eq.')){const u=decodeURIComponent(url.match(/username=eq\.([^&]+)/)[1]);return T(users.filter(x=>x.username===u));}
          if(url.includes('id=eq.')){const id=+url.match(/id=eq\.(\d+)/)[1];return T(users.filter(x=>x.id===id));}
          return T(users);
        }
        if(url.includes('pnl_users')&&method==='PATCH'){patches.push({url:url.split('rest/v1/')[1],body:JSON.parse(opt.body)});return T([]);}
        if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
        return T([]);
      };
      w.TextEncoder=TextEncoder;
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      w.HTMLCanvasElement.prototype.getContext=()=>({});
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  const w=vc.window,d=w.document;
  setTimeout(async()=>{
    const out=[];
    await new Promise(r=>setTimeout(r,500));
    try{ await fn(w,d,out,patches); }catch(e){ out.push('EXC: '+e.message); }
    out.push('errors: '+JSON.stringify(w.errors));
    res(out.join('\n'));
  },400);
 });
}
const nav=(d,v)=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display!=='none';
(async()=>{
  // 1) เฟิร์ส: สิทธิ์จาก JJ Access
  console.log(await run(users[1],async(w,d,out)=>{
    out.push('[first] logged in: '+(w.eval("S.user&&S.user.username")==='first'));
    out.push('[first] เห็น แดชบอร์ด/รายจ่าย/ครัวกลาง: '+(nav(d,'dash')&&nav(d,'exp')&&nav(d,'ck')));
    out.push('[first] ซ่อน รายรับ/สรุป/ตั้งค่า/PV: '+(!nav(d,'income')&&!nav(d,'sum')&&!nav(d,'set')&&!nav(d,'pv')));
    out.push('[first] permOf ck=edit exp=edit dash=view income=none: '+
      (w.eval("permOf('ck')")==='edit'&&w.eval("permOf('exp')")==='edit'&&w.eval("permOf('dash')")==='view'&&w.eval("permOf('income')")==='none'));
    out.push('[first] แดชบอร์ดขึ้นแบนเนอร์ดูอย่างเดียว: '+d.getElementById('view-dash').textContent.includes('ดูอย่างเดียว'));
    await w.show('ck'); await new Promise(r=>setTimeout(r,300));
    out.push('[first] เปิดหน้าครัวกลางได้ (ไม่เด้งไปหน้าอื่น): '+(w.eval('S.tab')==='ck'));
    out.push('[first] ครัวกลางไม่มีแบนเนอร์ดูอย่างเดียว: '+!d.getElementById('view-ck').textContent.includes('ดูอย่างเดียว'));
    await w.show('income'); await new Promise(r=>setTimeout(r,200));
    out.push('[first] ขอเปิดรายรับ → เด้งไปหน้าแรกที่มีสิทธิ์ (dash): '+(w.eval('S.tab')==='dash'));
  }));
  // 2) บอย: ไม่มี apps.pnl → perms เก่า
  console.log(await run(users[2],async(w,d,out)=>{
    out.push('[boy] เห็น แดชบอร์ด/รายรับ · ซ่อน ครัวกลาง: '+(nav(d,'dash')&&nav(d,'income')&&!nav(d,'ck')));
    out.push('[boy] permOf income=edit dash=view ck=none: '+(w.eval("permOf('income')")==='edit'&&w.eval("permOf('dash')")==='view'&&w.eval("permOf('ck')")==='none'));
  }));
  // 2b) เพย์: ถูกปิดแอพ P&L จาก JJ Access → เด้งกลับหน้าล็อกอินพร้อมข้อความ แม้ perms เก่าจะมี
  console.log(await run(users[3],async(w,d,out)=>{
    out.push('[pay] ไม่ได้เข้าแอพ (S.user ว่าง + auth ถูกล้าง): '+(!w.eval('S.user')&&w.localStorage.getItem('jjpnl_auth')==='null'));
    const ov=d.getElementById('loginOv');
    out.push('[pay] หน้าล็อกอินขึ้น + ข้อความบอกให้เปิดสิทธิ์ใน JJ Access: '+(!!ov&&ov.style.display==='flex'&&d.getElementById('lgMsg').textContent.includes('JJ Access')));
  }));
  // 2c) บอส (owner): เห็นทุกเมนู แก้ได้ทุกหน้า
  console.log(await run(users[4],async(w,d,out)=>{
    out.push('[boss] owner เห็นทุกเมนู + permOf(set)=edit: '+(['dash','income','ck','set','sup'].every(v=>nav(d,v))&&w.eval("permOf('set')")==='edit'));
    await w.show('set'); await new Promise(r=>setTimeout(r,400));
    out.push('[boss] เห็นการ์ดผู้ใช้และสิทธิ์ (isBoss): '+d.getElementById('view-set').textContent.includes('ผู้ใช้และสิทธิ์'));
  }));
  // 3) แอดมินแก้ผู้ใช้เฟิร์สในหน้าตั้งค่า → หน้าต่างโชว์สิทธิ์ที่มีผลจริง และบันทึกเขียน apps.pnl ด้วย
  console.log(await run(users[0],async(w,d,out,patches)=>{
    out.push('[admin] เห็นทุกเมนู: '+['dash','income','ck','set'].every(v=>nav(d,v)));
    await w.show('set'); await new Promise(r=>setTimeout(r,400));
    w.userModal(2); await new Promise(r=>setTimeout(r,100));
    const chk=v=>{const r=d.querySelector('input[name="pm_'+v+'"]:checked');return r?r.value:null;};
    out.push('[admin] หน้าต่างผู้ใช้โชว์สิทธิ์จาก JJ Access: ck=edit dash=view income=none: '+(chk('ck')==='edit'&&chk('dash')==='view'&&chk('income')==='none'));
    // เปลี่ยน ครัวกลาง → ดูอย่างเดียว, รายรับ → แก้ไข แล้วบันทึก
    d.querySelector('input[name="pm_ck"][value="view"]').checked=true;
    d.querySelector('input[name="pm_income"][value="edit"]').checked=true;
    await w.userSave(2); await new Promise(r=>setTimeout(r,200));
    const p=patches.find(x=>x.url.startsWith('pnl_users?id=eq.2'));
    out.push('[admin] PATCH perms: ck=view income=edit: '+!!(p&&p.body.perms.ck==='view'&&p.body.perms.income==='edit'));
    out.push('[admin] PATCH apps.pnl: ck=v income=vaed dash=v exp=vaed, ไม่มี sum: '+!!(p&&p.body.apps&&p.body.apps.pnl&&p.body.apps.pnl.ck==='v'&&p.body.apps.pnl.income==='vaed'&&p.body.apps.pnl.dash==='v'&&p.body.apps.pnl.exp==='vaed'&&!('sum' in p.body.apps.pnl)));
    out.push('[admin] apps ของแอพอื่น (payroll) ไม่หาย: '+!!(p&&p.body.apps.payroll&&p.body.apps.payroll.today==='v'));
    // เปิดหน้าต่างของบอส (owner) แล้วกดบันทึกโดยไม่แก้อะไร → role ต้องยังเป็น owner
    w.userModal(5); await new Promise(r=>setTimeout(r,100));
    out.push('[admin] หน้าต่างผู้ใช้เลือกบทบาท owner ให้ถูก: '+(d.getElementById('umRole').value==='owner'));
    await w.userSave(5); await new Promise(r=>setTimeout(r,200));
    const pb=patches.find(x=>x.url.startsWith('pnl_users?id=eq.5'));
    out.push('[admin] บันทึกบอสแล้ว role ยัง owner (ไม่ถูกลดเป็น staff): '+!!(pb&&pb.body.role==='owner'));
    out.push('[admin] รายชื่อผู้ใช้โชว์ป้าย "เจ้าของ": '+d.getElementById('userList').textContent.includes('เจ้าของ'));
    out.push('[admin] flagsToPerm: v→view vae→edit ""→none d→none: '+(w.flagsToPerm('v')==='view'&&w.flagsToPerm('vae')==='edit'&&w.flagsToPerm('')==='none'&&w.flagsToPerm('d')==='none'));
  }));
  process.exit(0);
})();
