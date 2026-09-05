const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
function run(hasTable){
 return new Promise(res=>{
  const posts=[], dels=[];
  let units=[{id:1,name:'กก.',sort:10},{id:2,name:'ถุง',sort:20},{id:3,name:'โหล',sort:30}];
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      w.confirm=()=>true;
      w.fetch=async(url,opt)=>{
        if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
        const method=opt&&opt.method||'GET';
        if(url.includes('pnl_units')){
          if(!hasTable)return {ok:false,status:404,text:async()=>'nf'};
          if(method==='POST'){const b=JSON.parse(opt.body);posts.push(b);units.push({id:9,...b});return T([]);}
          if(method==='DELETE'){dels.push(url);units=units.filter(u=>!url.includes('id=eq.'+u.id));return T([]);}
          return T(units);
        }
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
    d.querySelector('.sb-item[data-v="set"]').click();
    await new Promise(r=>setTimeout(r,350));
    const t=d.getElementById('view-set').textContent;
    if(hasTable){
      out.push('[db] chips: '+(t.includes('โหล')&&d.querySelectorAll('.unitchip').length===3));
      // เพิ่ม "แผง"
      d.getElementById('unitNew').value='แผง';
      await w.unitAdd(); await new Promise(r=>setTimeout(r,250));
      out.push('[db] add แผง: posted='+(posts[0]&&posts[0].name==='แผง'&&posts[0].sort===40)+' chips=4: '+(d.querySelectorAll('.unitchip').length===4));
      // ลบ ถุง
      await w.unitDel(2,'ถุง'); await new Promise(r=>setTimeout(r,250));
      out.push('[db] del ถุง: '+(dels.length===1&&!d.getElementById('view-set').textContent.includes('ถุง ')));
      // datalist หน้าบันทึกบิลใช้ชุดจาก DB
      d.querySelector('.sb-item[data-v="detail"]').click();
      await new Promise(r=>setTimeout(r,250));
      const dl=d.getElementById('dtUnitsDL').innerHTML;
      out.push('[db] datalist มี โหล+แผง ไม่มี ชิ้น: '+(dl.includes('โหล')&&dl.includes('แผง')&&!dl.includes('ชิ้น')));
    }else{
      out.push('[fallback] hint sql: '+t.includes('jjmk_pnl_units.sql'));
      d.querySelector('.sb-item[data-v="detail"]').click();
      await new Promise(r=>setTimeout(r,250));
      out.push('[fallback] datalist ใช้ชุดมาตรฐาน: '+d.getElementById('dtUnitsDL').innerHTML.includes('กระสอบ'));
    }
    out.push('errors: '+JSON.stringify(w.errors));
    res(out.join('\n'));
  },400);
 });
}
(async()=>{ console.log(await run(true)); console.log(await run(false)); process.exit(0); })();
