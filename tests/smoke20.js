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
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='PATCH'&&url.includes('pnl_fixed_items')){patches.push({u:url.split('rest/v1/')[1],b:JSON.parse(opt.body)});return T([]);}
      if(method==='GET'&&url.includes('pnl_fixed_items'))return T([
        {id:1,branch:'JJRD',grp:'Fix cost',name:'ค่าเช่า',default_amount:120000,sort:1,active:true},
        {id:2,branch:'JJRD',grp:'Fix cost',name:'ค่าตำรวจ',default_amount:4000,sort:1,active:true},
        {id:3,branch:'JJRD',grp:'พนักงาน',name:'ประกันสังคม',default_amount:3600,sort:1,active:true}]);
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
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
  await new Promise(r=>setTimeout(r,250));
  const setV=d.getElementById('view-set');
  const cats=[...setV.querySelectorAll('tr.cat')].filter(t=>t.textContent.includes('รายการ')&&(t.textContent.includes('Fix cost')||t.textContent.includes('พนักงาน')));
  out.push('group headers: '+cats.map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(' | '));
  const mv=[...setV.querySelectorAll('.mvbtn')].filter(b=>(b.getAttribute('onclick')||'').includes('fixMove'));
  out.push('move btns: '+mv.length+' | first ▲ disabled: '+mv[0].disabled+' | ▼ of last-in-grp disabled: '+mv[3].disabled);
  // เลื่อน ค่าตำรวจ (id2) ขึ้น — sort ชนกัน (1,1) ต้อง renormalize ก่อนแล้วสลับ
  await w.fixMove(2,-1);
  await new Promise(r=>setTimeout(r,250));
  out.push('patches: '+patches.length+' (renorm 3 + swap 2 = 5)');
  const f1=w.S ? null : null;
  // ลำดับใหม่ในหน้า: ค่าตำรวจ ต้องมาก่อน ค่าเช่า
  const names=[...d.querySelectorAll('#view-set tr td .b.sm')].map(x=>x.textContent);
  out.push('order now: '+names.slice(0,3).join(' → '));
  // modal หมวด: มี dropdown หมวดจริง + สร้างใหม่
  w.fixModal(null);
  await new Promise(r=>setTimeout(r,50));
  const sel=d.getElementById('fxGrp');
  out.push('grp options: '+[...sel.options].map(o=>o.value||o.text).join('/'));
  sel.value='__new'; sel.dispatchEvent(new w.Event('change'));
  out.push('new grp input visible: '+(d.getElementById('fxGrpNewWrap').style.display==='block'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
