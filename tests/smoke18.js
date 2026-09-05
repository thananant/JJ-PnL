const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const dels=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='DELETE'){dels.push(url.split('/rest/v1/')[1]);return T([]);}
      if(url.includes('pnl_fixed_items'))return T([
        {id:11,branch:'JJRD',grp:'Fix cost',name:'ค่าขยะ',default_amount:3000,sort:1,active:true},
        {id:12,branch:'JJRD',grp:'Fix cost',name:'ADS ค้างจ่าย',default_amount:null,sort:2,active:false}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.confirm=(m)=>{w.__confirmMsg=m; return true;};
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,250));
  const delBtns=[...d.querySelectorAll('#view-set button')].filter(b=>b.textContent==='ลบ'&&b.getAttribute('onclick')?.includes('fixDel'));
  out.push('fix del buttons: '+delBtns.length+' (คาด 2)');
  await w.fixDel(11);
  await new Promise(r=>setTimeout(r,200));
  out.push('confirm msg has name: '+w.__confirmMsg.includes('ค่าขยะ'));
  out.push('DELETE call: '+dels[0]);
  out.push('remaining rows: '+[...d.querySelectorAll('#view-set button')].filter(b=>b.getAttribute('onclick')?.includes('fixDel')).length+' (คาด 1)');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
