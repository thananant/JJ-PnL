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
function run(tOffsetMin){ // อายุ session ล่าสุด (นาทีที่แล้ว)
 return new Promise(res=>{
  const users=[{id:1,username:'admin',pass_hash:H('admin','x'),display_name:'แอด',role:'admin',perms:{},active:true}];
  let reloaded=false;
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      if(tOffsetMin!=null)
        w.localStorage.setItem('jjpnl_auth',JSON.stringify({u:'admin',h:H('admin','x'),t:Date.now()-tOffsetMin*60000}));
      Object.defineProperty(w.location.constructor.prototype,'reload',{value:function(){reloaded=true;},configurable:true});
      w.fetch=async(url,opt)=>{
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
        if(url.includes('pnl_users')&&url.includes('username=eq.'))return T(users);
        if(url.includes('pnl_users'))return T(users);
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'A',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
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
    const loggedIn=d.getElementById('app').style.display==='block';
    if(tOffsetMin==null){
      out.push('[no session] login shown: '+(!loggedIn&&d.getElementById('loginOv').style.display==='flex'));
      const p2=d.getElementById('lgP');
      out.push('[no session] anti-autofill: new-password='+(p2.getAttribute('autocomplete')==='new-password')+' readonly='+p2.hasAttribute('readonly')+' lpignore='+(p2.dataset.lpignore==='true'));
      const u2=d.getElementById('lgU');
      out.push('[no session] username off: '+(u2.getAttribute('autocomplete')==='off'));
    }else if(tOffsetMin<30){
      out.push(`[fresh ${tOffsetMin}m] refresh ไม่เด้ง: `+loggedIn);
      // touchAuth ต่ออายุเมื่อคลิก
      const before=JSON.parse(w.localStorage.getItem('jjpnl_auth')).t;
      w.eval('S._lastTouch=0');
      d.body.dispatchEvent(new w.Event('click',{bubbles:true}));
      await new Promise(r=>setTimeout(r,50));
      const after=JSON.parse(w.localStorage.getItem('jjpnl_auth')).t;
      out.push('[fresh] activity ต่ออายุ: '+(after>before));
      // จำลองปล่อยเงียบเกิน 30 นาที -> idleCheck เด้ง reload
      w.localStorage.setItem('jjpnl_auth',JSON.stringify({...JSON.parse(w.localStorage.getItem('jjpnl_auth')),t:Date.now()-31*60000}));
      w.idleCheck();
      out.push('[fresh] idle 31m -> auto logout (ล้าง auth + reload ถูกเรียก): '+(w.localStorage.getItem('jjpnl_auth')==='null'));
    }else{
      out.push(`[stale ${tOffsetMin}m] เปิดมาต้องใส่รหัสใหม่: `+(!loggedIn&&d.getElementById('loginOv').style.display==='flex'));
      out.push('[stale] auth ถูกล้าง: '+(w.localStorage.getItem('jjpnl_auth')==='null'));
    }
    out.push('errors: '+JSON.stringify(w.errors));
    res(out.join('\n'));
  },450);
 });
}
(async()=>{
  console.log(await run(5));      // ใช้เมื่อ 5 นาทีก่อน -> ไม่เด้ง
  console.log(await run(31));     // เงียบ 31 นาที -> เด้ง login
  console.log(await run(null));   // ไม่มี session + เช็คกัน autofill
  process.exit(0);
})();
