const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(el,cfg){window.__charts=(window.__charts||[]);window.__charts.push(cfg);this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('pnl_suppliers')){let b=JSON.parse(opt.body);posts.push(b);return T([{id:99,...b}]);}
      if(method==='GET'&&url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
        {id:2,name:'ช้างขวด',category:'เครื่องดื่มแอลกอฮอล์',active:true,sort:2,vat_type:'VAT'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily'))return T([{branch:'JJRD',d:'2026-08-05',supplier_id:2,amount:900,paid:false}]);
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
  // catList มีหมวดใหม่ต่อท้าย + สีไม่ซ้ำ default
  out.push('catList: '+w.catList().join('/'));
  out.push('color for new cat: '+w.catColor('เครื่องดื่มแอลกอฮอล์')+' (ไม่ใช่ #999)');
  // หน้ารายจ่าย: การ์ดหมวดใหม่ขึ้นพร้อมยอด
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  const form=d.getElementById('expForm');
  out.push('exp shows new cat card: '+form.textContent.includes('เครื่องดื่มแอลกอฮอล์'));
  // modal ซัพ: dropdown มีหมวดใหม่ + สร้างหมวดใหม่ได้
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,250));
  w.supModal(null);
  await new Promise(r=>setTimeout(r,50));
  const sel=d.getElementById('spCat');
  out.push('spCat options: '+[...sel.options].map(o=>o.value||o.text).join('/').slice(0,120));
  sel.value='__new'; sel.dispatchEvent(new w.Event('change'));
  out.push('new input shown: '+(d.getElementById('spCatNewWrap').style.display==='block'));
  d.getElementById('spCatNew').value='ผลไม้';
  d.getElementById('spName').value='สวนส้มลุงดำ';
  await w.supSave(null);
  await new Promise(r=>setTimeout(r,150));
  out.push('saved category: '+(posts[0]&&(Array.isArray(posts[0])?posts[0][0]:posts[0]).category));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
