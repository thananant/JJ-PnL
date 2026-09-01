// smoke81: ลงบิลเจอสินค้าชื่อใหม่ -> โมดัลชวนผูกกับสินค้านับที่ยังไม่ผูก + ปุ่ม "ไม่มีในระบบนับ" จำถาวร
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const products=[
 {id:'u1',branch_id:'b19f0a17b4472',name:'ซอสพุดดิ้ง Blueberry',unit:'ขวด',sup:'Mitrphol',deleted_at:null},
 {id:'u2',branch_id:'b19f0a17b4472',name:'หมูสามชั้นก้อน',unit:'โล',sup:'สมาย',deleted_at:null},
 {id:'u3',branch_id:'b19f0a17b4472',name:'ผงโกโก้',unit:'ถุง',sup:'Mix888',deleted_at:null}];
const mapRows=[
 {id:1,branch:'JJRD',product_id:'u2',product_name:'หมูสามชั้นก้อน',pnl_item:'หมูสามชั้น',stock_unit:'โล',factor:1,active:true},
 {id:2,branch:'JJRD',product_id:'none:JJRD:ชื่อเก่าไม่เอา',product_name:'(ไม่มีในระบบนับ)',pnl_item:'ชื่อเก่าไม่เอา',stock_unit:'',factor:1,active:false}];
const posts=[]; const dels=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_stock_map')){const r=JSON.parse(opt.body);posts.push(r);r.forEach(x=>mapRows.push({id:mapRows.length+9,...x}));return T([]);}
      if(method==='DELETE'&&url.includes('pnl_stock_map')){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method!=='GET')return T([]);
      if(url.includes('pnl_stock_map'))return T(mapRows);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('products'))return T(products);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450);
  // 1) กรองชื่อ: ผูกแล้ว (หมูสามชั้น) + จำว่าไม่มี (ชื่อเก่าไม่เอา) ต้องไม่ถูกถาม เหลือถามตัวเดียว
  const opened=await w.dtStkPrompt(['หมูสามชั้น','ชื่อเก่าไม่เอา','น้ำวิปครีมใหม่']); await sleep(200);
  out.push('เปิดโมดัลเฉพาะชื่อใหม่จริง (1/1): '+(opened===true&&d.getElementById('modalBox').textContent.includes('น้ำวิปครีมใหม่')&&d.getElementById('modalBox').textContent.includes('1/1')));
  out.push('รายการให้เลือกมีเฉพาะตัวยังไม่ผูก (Blueberry ไม่มีหมู): '+(!!d.querySelector('#stkLinkDL option[value="ซอสพุดดิ้ง Blueberry"]')&&!d.querySelector('#stkLinkDL option[value="หมูสามชั้นก้อน"]')));
  // 2) ผูกพร้อมตัวคูณ
  d.getElementById('stkLinkSel').value='ซอสพุดดิ้ง Blueberry';
  d.getElementById('stkLinkF').value='2';
  await w.stkLinkBind(); await sleep(200);
  const pr=posts[0]&&posts[0][0];
  out.push('POST ผูกถูกต้อง (u1 · น้ำวิปครีมใหม่ · f=2): '+(!!pr&&pr.product_id==='u1'&&pr.pnl_item==='น้ำวิปครีมใหม่'&&pr.factor===2&&pr.branch==='JJRD'&&pr.active===true));
  out.push('จบคิวแล้วปิดโมดัล: '+(!d.getElementById('modalWrap').classList.contains('on')));
  // 3) ปุ่ม "ไม่มีในระบบนับ" -> จำเป็น none: และถามซ้ำไม่ได้อีก
  await w.dtStkPrompt(['ของแปลกๆ']); await sleep(200);
  await w.stkLinkNone(); await sleep(200);
  const nr=posts[1]&&posts[1][0];
  out.push('ไม่มี: POST none-marker (active=false): '+(!!nr&&String(nr.product_id).startsWith('none:JJRD:')&&nr.pnl_item==='ของแปลกๆ'&&nr.active===false));
  const again=await w.dtStkPrompt(['ของแปลกๆ']); await sleep(150);
  out.push('ถามซ้ำชื่อเดิมไม่ขึ้นแล้ว: '+(again===false));
  // 4) สาขาที่ไม่มีระบบนับ -> ไม่ถาม
  w.eval("S.br='JJOF'");
  out.push('สาขาออฟฟิศ: ไม่ถาม: '+((await w.dtStkPrompt(['อะไรก็ได้']))===false));
  w.eval("S.br='JJRD'");
  // 5) เอากลับมาทั้งหมด ต้องไม่ลบ none-marker
  await w.stkUnskipAll(); await sleep(150);
  out.push('unskip กัน none-marker (not.like.none:*): '+dels.some(x=>x.includes('product_id=not.like.none:*')));
  // 6) dtSave ต่อสายเรียก dtStkPrompt จริง
  const src=fs.readFileSync('jjmk-pnl.html','utf8');
  out.push('dtSave เรียก dtStkPrompt และเก็บชื่อใหม่: '+(src.includes('await dtStkPrompt(_newN)')&&src.includes('_newN=newItems.map(l=>l.item)')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
