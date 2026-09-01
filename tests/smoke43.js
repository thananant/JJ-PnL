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
function run(role){
 return new Promise(res=>{
  const dels=[];
  let branches=[{code:'JJRD',name:'รัชดา',sort:1},{code:'JJLP',name:'ลาดพร้าว',sort:2},{code:'OFFICE',name:'ออฟฟิศ',sort:3}];
  const users=[{id:1,username:'admin',pass_hash:H('admin','x'),display_name:'แอด',role:'admin',perms:{},active:true},
               {id:2,username:'boy',pass_hash:H('boy','x'),display_name:'บอย',role:'staff',active:true,perms:{set:'edit',dash:'edit'}}];
  const me=users.find(u=>u.role===role);
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      w.localStorage.setItem('jjpnl_auth',JSON.stringify({u:me.username,h:me.pass_hash,t:Date.now()}));
      w.confirm=()=>true; w.prompt=()=>'OFFICE';
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
        if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);
          if(url.includes('pnl_branches'))branches=branches.filter(b=>!url.includes(b.code)||!url.includes('code=eq.'+b.code));
          return T([]);}
        if(url.includes('pnl_users')&&url.includes('username=eq.'))return T(users.filter(u=>url.includes(u.username)));
        if(url.includes('pnl_users'))return T(users);
        if(url.includes('pnl_branches'))return T(branches);
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
        // OFFICE มีข้อมูลรายจ่าย 1 แถว (ทดสอบเส้นทาง cascade)
        if(url.includes('branch=eq.OFFICE')&&url.includes('pnl_expense_daily'))return T([{branch:'OFFICE'}]);
        if(url.includes('branch=eq.OFFICE'))return T([]);
        if(method==='POST')return T([]);
        return T([]);
      };
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      w.HTMLCanvasElement.prototype.getContext=()=>({});
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  const w=vc.window,d=w.document;
  setTimeout(async()=>{
    const out=[];
    await new Promise(r=>setTimeout(r,400));
    w.brModal('OFFICE');
    await new Promise(r=>setTimeout(r,80));
    const delBtn=[...d.querySelectorAll('button')].find(b=>b.textContent.includes('ลบสาขา'));
    out.push(`[${role}] ปุ่มลบโชว์: `+!!delBtn);
    if(role==='admin'){
      await w.brDelete('OFFICE');
      await new Promise(r=>setTimeout(r,300));
      out.push('[admin] cascade deletes: '+dels.filter(x=>x.includes('branch=eq.OFFICE')).length+' ตาราง + branch row: '+dels.some(x=>x.includes('pnl_branches?code=eq.OFFICE')));
      out.push('[admin] seg เหลือ: '+[...d.querySelectorAll('#brSeg button')].map(b=>b.textContent).join('/'));
    }else{
      await w.brDelete('OFFICE');
      await new Promise(r=>setTimeout(r,150));
      out.push('[staff] โดนกัน ไม่มี DELETE: '+(dels.length===0)+' | toast: '+d.getElementById('toast').textContent.includes('admin'));
    }
    out.push('errors: '+JSON.stringify(w.errors));
    res(out.join('\n'));
  },450);
 });
}
(async()=>{ console.log(await run('admin')); console.log(await run('staff')); process.exit(0); })();
