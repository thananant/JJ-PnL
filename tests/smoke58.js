const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');

function mkWin(){
  return new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
      w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
      w.XMLHttpRequest=function(){
        const self=this; this.upload={};
        this.open=(m,u)=>{self._url=u;};
        this.setRequestHeader=()=>{};
        this.abort=()=>{self.onabort&&self.onabort();};
        this.send=()=>{
          setTimeout(()=>{
            self.status=200;
            self.responseText=JSON.stringify({
              status:'done',
              rows:[{name:'ปลาหมึกกล้วย',matched_item:null,qty:15,unit:'กก.',price:120,line_discount:0},
                    {name:'แมงกะพรุน',matched_item:null,qty:15,unit:'กก.',price:60,line_discount:0}],
              bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:3125,
              supplier_name:'ณชา ซีฟู้ดส์',_model:'gemini-3.7-flash'
            })+'\n';
            self.onload&&self.onload();
          },30);
        };
      };
      w.fetch=async(url,opt)=>{
        if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
        const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
        if(url.includes('pnl_suppliers'))return T([
          {id:1,name:'ณชา ซีฟู้ดส์',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
          {id:2,name:'Jimmy',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'}]);
        if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
        if(url.includes('pnl_item_alias'))return T([]);
        if(url.includes('pnl_bill_items'))return T([]);
        if(url.includes('pnl_sup_items'))return T([]);
        return T([]);
      };
      w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
      w.requestAnimationFrame=f=>setTimeout(f,0);
      // polyfill สำหรับ dtOcrShrink (jsdom ไม่มี createObjectURL/canvas จริง)
      w.URL.createObjectURL=()=>'blob:fake';
      w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
      w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAA';
      Object.defineProperty(w.HTMLImageElement.prototype,'src',{
        configurable:true,
        set(v){ this.setAttribute('src',v); setTimeout(()=>{ if(this.onload)this.onload(); },5); },
        get(){ return this.getAttribute('src'); }
      });
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
}

async function scenario1(){
  const out=[];
  const vc=mkWin(); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  out.push('[1] เริ่มต้นไม่มีซัพ: '+(w.eval('S.dtSup')==null));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  out.push('[1] มี pending หลังสแกน: '+!!w.eval('S._ocrPending'));
  const mtxt=d.body.textContent;
  out.push('[1] modal ถามซัพ + โชว์หัวบิล: '+(mtxt.includes('บิลนี้ของซัพไหน')&&mtxt.includes('ณชา ซีฟู้ดส์')));
  out.push('[1] ปุ่มเดาถูก มี ⭐: '+mtxt.includes('⭐ ณชา ซีฟู้ดส์'));
  out.push('[1] ยังไม่ apply เข้า dtLines: '+w.eval("S.dtLines.length===1&&!S.dtLines[0].item"));
  await w.ocrSupPick(1);
  await new Promise(r=>setTimeout(r,200));
  out.push('[1] เลือกจาก modal -> dtSup=1: '+w.eval('S.dtSup===1'));
  out.push('[1] เทผลสแกนอัตโนมัติ: '+w.eval("S.dtLines.length===2&&S.dtLines[0].item==='ปลาหมึกกล้วย'&&S.dtLines[1].item==='แมงกะพรุน'"));
  out.push('[1] pending ถูกเคลียร์: '+!w.eval('S._ocrPending'));
  out.push('[1] toast บอกเติมผลสแกน: '+d.getElementById('toast').textContent.includes('เติมผลสแกน'));
  out.push('[1] errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

async function scenario2(){
  const out=[];
  const vc=mkWin(); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  w.closeModal();
  await new Promise(r=>setTimeout(r,80));
  out.push('[2] ปิด modal ไม่เลือก -> banner โผล่: '+d.getElementById('dtOcrMap').textContent.includes('มีผลสแกนรอเลือกซัพ'));
  const btn=[...d.querySelectorAll('.dtsup')].find(b=>b.dataset.sid==='2');
  btn.click();
  await new Promise(r=>setTimeout(r,200));
  out.push('[2] จิ้มปุ่มซัพปกติ -> เทผลสแกนให้เอง: '+w.eval("S.dtSup===2&&S.dtLines.length===2&&S.dtLines[0].item==='ปลาหมึกกล้วย'"));
  out.push('[2] errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

async function scenario3(){
  const out=[];
  const vc=mkWin(); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  w.closeModal(); await new Promise(r=>setTimeout(r,80));
  const discardBtn=[...d.querySelectorAll('#dtOcrMap button')].find(b=>b.textContent.includes('ทิ้งผลสแกน'));
  out.push('[3] เจอปุ่มทิ้งผลสแกน: '+!!discardBtn);
  discardBtn.click();
  await new Promise(r=>setTimeout(r,80));
  out.push('[3] ทิ้งผลสแกน: pending null + banner หาย: '+(!w.eval('S._ocrPending')&&!d.getElementById('dtOcrMap').textContent.includes('รอเลือกซัพ')));
  const btn2=[...d.querySelectorAll('.dtsup')].find(b=>b.dataset.sid==='1');
  btn2.click();
  await new Promise(r=>setTimeout(r,200));
  out.push('[3] เลือกซัพหลังทิ้งแล้ว -> ไม่มีอะไรเทเข้า: '+w.eval("S.dtLines.length===1&&!S.dtLines[0].item"));
  out.push('[3] errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

async function scenario4(){ // กลับมาหน้า detail อีกรอบ (re-render) โดยยังไม่เลือกซัพ -> banner ต้องคงอยู่
  const out=[];
  const vc=mkWin(); const w=vc.window,d=w.document;
  await new Promise(r=>setTimeout(r,400));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,250));
  w.closeModal(); await new Promise(r=>setTimeout(r,80));
  d.querySelector('.sb-item[data-v="dash"]').click();
  await new Promise(r=>setTimeout(r,300));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  out.push('[4] re-render หน้า detail: banner ยังอยู่: '+d.getElementById('dtOcrMap').textContent.includes('มีผลสแกนรอเลือกซัพ'));
  out.push('[4] errors: '+JSON.stringify(w.errors));
  return out.join('\n');
}

(async()=>{
  console.log(await scenario1());
  console.log(await scenario2());
  console.log(await scenario3());
  console.log(await scenario4());
  process.exit(0);
})();
