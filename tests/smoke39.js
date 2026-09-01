// admin: การ์ดผู้ใช้/สิทธิ์/ประวัติ + สร้างผู้ใช้ + legacy mode
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
function run(mode){ // 'admin' | 'legacy'
 return new Promise(res=>{
  const posts=[];
  const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',perms:{},active:true}];
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      if(mode==='admin') w.localStorage.setItem('jjpnl_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234'),t:Date.now()}));
      w.fetch=async(url,opt)=>{
        const method=opt&&opt.method||'GET';
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
        if(mode==='legacy'&&url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'404',json:async()=>({})};
        if(method==='POST'&&url.includes('pnl_users')){const b=JSON.parse(opt.body);posts.push({newuser:b});return T([{id:9,...b}]);}
        if(method==='POST'&&url.includes('pnl_activity_log')){posts.push(JSON.parse(opt.body));return T([]);}
        if(url.includes('pnl_users')&&url.includes('username=eq.'))return T(users);
        if(url.includes('pnl_users'))return T(users);
        if(url.includes('pnl_activity_log')&&method==='GET')return T([{username:'boy',branch:'JJRD',action:'บันทึกรายจ่าย',detail:'d=2026-08-20',created_at:'2026-08-20T09:30:00Z'}]);
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
        if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
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
    if(mode==='legacy'){
      out.push('[legacy] app boots no login: '+(d.getElementById('app').style.display==='block')+' user=legacy admin: '+w.eval("S.user.legacy&&S.user.role==='admin'"));
      d.querySelector('.sb-item[data-v="set"]').click();
      await new Promise(r=>setTimeout(r,250));
      out.push('[legacy] note run sql: '+d.getElementById('view-set').textContent.includes('jjmk_pnl_users.sql'));
    }else{
      out.push('[admin] auto login from saved: '+(d.getElementById('app').style.display==='block')+' '+w.eval("S.user.username"));
      out.push('[admin] all menus visible: '+['sum','pv','set'].every(v=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display!=='none'));
      d.querySelector('.sb-item[data-v="set"]').click();
      await new Promise(r=>setTimeout(r,350));
      const t=d.getElementById('view-set').textContent;
      out.push('[admin] cards: บัญชี='+t.includes('บัญชีของฉัน')+' ผู้ใช้และสิทธิ์='+t.includes('ผู้ใช้และสิทธิ์')+' ประวัติ='+t.includes('ประวัติการใช้งาน'));
      out.push('[admin] act row: '+d.getElementById('actList').textContent.includes('บันทึกรายจ่าย'));
      // เพิ่มผู้ใช้ boy สิทธิ์ income=edit dash=view
      w.userModal(null);
      await new Promise(r=>setTimeout(r,60));
      d.getElementById('umName').value='บอย'; d.getElementById('umUser').value='boy'; d.getElementById('umPass').value='1234';
      d.querySelector('input[name="pm_income"][value="edit"]').checked=true;
      d.querySelector('input[name="pm_dash"][value="view"]').checked=true;
      await w.userSave(null);
      await new Promise(r=>setTimeout(r,150));
      const nu=posts.find(p=>p.newuser);
      out.push('[admin] new user saved: hash ok='+(nu.newuser.pass_hash===H('boy','1234'))+' perms='+JSON.stringify({i:nu.newuser.perms.income,d:nu.newuser.perms.dash,s:nu.newuser.perms.sum}));
    }
    out.push('errors: '+JSON.stringify(w.errors));
    res(out.join('\n'));
  },450);
 });
}
(async()=>{ console.log(await run('admin')); console.log(await run('legacy')); process.exit(0); })();
