const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');

function mkWin(hasTable){
  const posts=[];
  const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
      w.URL.createObjectURL=()=>'blob:fake';
      w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
      w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAA';
      Object.defineProperty(w.HTMLImageElement.prototype,'src',{configurable:true,
        set(v){ this.setAttribute('src',v); setTimeout(()=>{ if(this.onload)this.onload(); },5); },
        get(){ return this.getAttribute('src'); }});
      w.XMLHttpRequest=function(){
        const self=this; this.upload={};
        this.open=()=>{}; this.setRequestHeader=()=>{}; this.abort=()=>{};
        this.send=()=>{ setTimeout(()=>{
          self.status=200;
          self.responseText=JSON.stringify({status:'done',rows:[{name:'ปลาหมึกกล้วย',qty:15,unit:'กก.',price:120,line_discount:0}],
            bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:1800,_model:'gemini-3.7-flash'})+'\n';
          self.onload&&self.onload();
        },15); };
      };
      w.fetch=async(url,opt)=>{
        if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
        const method=opt&&opt.method||'GET';
        if(url.includes('pnl_ocr_stats')){
          if(!hasTable) return {ok:false,status:404,text:async()=>'relation "pnl_ocr_stats" does not exist'};
          if(method==='POST'){ posts.push(JSON.parse(opt.body)); return T([]); }
          // ประวัติจำลอง: 3.7-flash 45, 3.6-flash 10, flash-latest 2, ล้มเหลว 3 (รวม 60)
          const rows=[];
          for(let i=0;i<45;i++)rows.push({model:'gemini-3.7-flash',ok:true});
          for(let i=0;i<10;i++)rows.push({model:'gemini-3.6-flash',ok:true});
          for(let i=0;i<2;i++)rows.push({model:'gemini-flash-latest',ok:true});
          for(let i=0;i<3;i++)rows.push({model:null,ok:false});
          return T(rows);
        }
        if(url.includes('pnl_suppliers'))return T([{id:1,name:'A',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
        if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
        if(url.includes('pnl_item_alias')||url.includes('pnl_bill_items')||url.includes('pnl_sup_items'))return T([]);
        return T([]);
      };
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
  return {vc, posts};
}

async function scenario1(){ // สแกนแล้วต้อง POST log ไปด้วย
  const out=[];
  const {vc,posts}=mkWin(true); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  out.push('สแกนสำเร็จ -> POST log ok=true model=3.7-flash: '+(posts.length===1&&posts[0].ok===true&&posts[0].model==='gemini-3.7-flash'&&posts[0].branch==='JJRD'&&typeof posts[0].ms==='number'));
  out.push('errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

async function scenario2(){ // การ์ดในหน้าตั้งค่าต้องสรุปสถิติถูกต้อง เรียงมากไปน้อย มีถ้วยที่อันดับ 1
  const out=[];
  const {vc}=mkWin(true); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,350));
  const box=d.getElementById('ocrStatsBox').textContent;
  out.push('เจอการ์ด + ชื่อโมเดลแบบอ่านง่าย: '+(box.includes('Gemini 3.7 Flash')&&box.includes('Gemini 3.6 Flash')&&box.includes('Gemini Flash')));
  out.push('ตัวเลขถูก: 45/10/2/3 ครั้ง: '+(box.includes('45 ครั้ง')&&box.includes('10 ครั้ง')&&box.includes('2 ครั้ง')&&box.includes('3 ครั้ง')));
  out.push('% ถูก (45/60=75%): '+box.includes('75.00%'));
  const oh=d.getElementById('ocrStatsBox').innerHTML;
  out.push('อันดับ1 มีถ้วย 🏆 + เรียงมาก->น้อย: '+(oh.indexOf('🏆')>=0 && oh.indexOf('🏆')<oh.indexOf('Gemini 3.6')));
  out.push('โชว์ยอดล้มเหลวแยกไว้: '+box.includes('ล้มเหลวทั้งหมด'));
  out.push('รวมทั้งหมด 60 ครั้ง: '+box.includes('รวม 60 ครั้ง'));
  out.push('errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

async function scenario3(){ // ยังไม่รัน SQL -> fallback แนะนำ
  const out=[];
  const {vc}=mkWin(false); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,350));
  out.push('fallback แนะนำรัน SQL: '+d.getElementById('ocrStatsBox').textContent.includes('jjmk_pnl_ocrstats.sql'));
  // สแกน (ยังไม่มีตาราง) ต้องไม่ทำให้ flow หลักพัง แค่ log เงียบๆไม่สำเร็จ
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  out.push('สแกนยังใช้ได้ปกติแม้ log พัง: '+w.eval("S.dtLines.length===1&&S.dtLines[0].item==='ปลาหมึกกล้วย'"));
  out.push('errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

(async()=>{
  console.log(await scenario1());
  console.log(await scenario2());
  console.log(await scenario3());
  process.exit(0);
})();
