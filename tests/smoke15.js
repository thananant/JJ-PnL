const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const saves=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_fixed_monthly')){saves.push(JSON.parse(opt.body));return T([]);}
      if(method==='GET'&&url.includes('pnl_fixed_items'))return T([
        {id:1,branch:'JJRD',grp:'Fix cost',name:'ค่าเช่าร้านรายเดือน',default_amount:85000,sort:1,active:true},
        {id:2,branch:'JJRD',grp:'Fix cost',name:'ค่าตำรวจ',default_amount:4000,sort:2,active:true},
        {id:3,branch:'JJRD',grp:'ค่าสาธารณูปโภค',name:'ค่าไฟฟ้า',default_amount:null,sort:10,active:true},
        {id:4,branch:'JJRD',grp:'ค่าพนักงาน',name:'ประกันสังคม',default_amount:3600,sort:20,active:true},
        {id:9,branch:'JJLP',grp:'Fix cost',name:'ค่าเช่า LP',default_amount:60000,sort:1,active:true}]);
      if(method==='GET'&&url.includes('pnl_fixed_monthly'))return T([{branch:'JJRD',month:'2026-08',item_id:2,amount:4500}]);
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
  const pn=d.getElementById('fixPanel');
  out.push('panel exists: '+!!pn);
  out.push('groups: '+[...pn.querySelectorAll('.fxgrp span:first-child')].map(x=>x.textContent).join('/'));
  out.push('rows: '+pn.querySelectorAll('.fxrow').length+' (เฉพาะ JJRD ควร 4)');
  // ค่าตำรวจ override 4500 → กลุ่ม Fix cost = 85000+4500 = 89500 / รวม = 89500+0+3600 = 93100
  out.push('grp1 subtotal: '+d.getElementById('fxg_0').textContent+' (คาด ฿89,500)');
  out.push('total: '+d.getElementById('fxTot').textContent+' (คาด ฿93,100)');
  const inp=[...pn.querySelectorAll('.fxrow input')][0];
  out.push('rent placeholder/value: '+inp.placeholder+' / "'+inp.value+'"');
  // แก้ค่าเช่าเป็น 90000 → รวมต้องเป็น 98,100 สด ๆ
  inp.value='90000'; inp.dispatchEvent(new w.Event('change'));
  await new Promise(r=>setTimeout(r,50));
  out.push('after edit total: '+d.getElementById('fxTot').textContent+' (คาด ฿98,100)');
  await new Promise(r=>setTimeout(r,800));
  out.push('saved: '+JSON.stringify(saves.flat().map(r=>({i:r.item_id,a:r.amount}))));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
