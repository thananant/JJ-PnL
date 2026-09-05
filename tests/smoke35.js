const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const patches=[];
let supRows=[
  {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:10,vat_type:'NON-VAT'},
  {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:20,vat_type:'NON-VAT'},
  {id:3,name:'Siammitr',category:'อาหาร',active:true,sort:30,vat_type:'VAT'},
  {id:9,name:'Oldie',category:'ของใช้',active:false,sort:99,vat_type:'VAT'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='PATCH'&&url.includes('pnl_suppliers')){
        const id=parseInt(url.match(/id=eq\.(\d+)/)[1]); const b=JSON.parse(opt.body);
        patches.push({id,...b});
        const r=supRows.find(x=>x.id===id); if(r&&'sort'in b)r.sort=b.sort;
        return T([]);
      }
      if(url.includes('pnl_suppliers'))return T(supRows.slice().sort((a,b)=>a.sort-b.sort));
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
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,300));
  const supCard=[...d.querySelectorAll('#view-set .card')].find(c=>c.querySelector('h3')?.textContent.includes('ซัพพลายเออร์'));
  const mv=[...supCard.querySelectorAll('.mvbtn')];
  out.push('mv buttons: '+mv.length+' (คาด 6 = active 3 × ▲▼, inactive ไม่มี)');
  out.push('first ▲ disabled: '+mv[0].disabled+' | last ▼ disabled: '+mv[5].disabled);
  // เลื่อน Smilemeat ขึ้น
  await w.supMove(2,-1);
  await new Promise(r=>setTimeout(r,250));
  out.push('patches: '+JSON.stringify(patches));
  const names=[...supCard.querySelectorAll('.b.sm')].map(x=>x.textContent);
  // การ์ดถูก re-render จาก show('set') — ดึงใหม่
  const supCard2=[...d.querySelectorAll('#view-set .card')].find(c=>c.querySelector('h3')?.textContent.includes('ซัพพลายเออร์'));
  out.push('order now: '+[...supCard2.querySelectorAll('.b.sm')].slice(0,3).map(x=>x.textContent).join(' → ')+' (คาด Smilemeat → FarmFresh → Siammitr)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
