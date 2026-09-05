const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_fixed_items'))return T([
        {id:1,branch:'JJRD',grp:'Fix cost',name:'ค่าเช่า',default_amount:85000,sort:1,active:true},
        {id:2,branch:'JJRD',grp:'Fix cost',name:'ค่าตำรวจ',default_amount:4000,sort:2,active:true},
        {id:3,branch:'JJRD',grp:'ค่าไฟ',name:'ค่าไฟฟ้า',default_amount:null,sort:3,active:true}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD'},{code:'JJLP'}]);
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
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  const inputs=[...d.querySelectorAll('#fixPanel .fxrow input')];
  out.push('fix inputs: '+inputs.length);
  inputs[0].focus();
  out.push('focus at: '+d.activeElement.placeholder);
  inputs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  out.push('after Enter -> focus at: '+d.activeElement.placeholder+' (คาด 4,000)');
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  out.push('after Enter x2 -> focus at placeholder: "'+d.activeElement.placeholder+'" (คาด 0 = ค่าไฟ)');
  // ช่องสุดท้าย Enter -> blur
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  out.push('after Enter last -> active is input: '+(d.activeElement.tagName==='INPUT'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
