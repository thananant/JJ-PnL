const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
let call=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    // polyfill สำหรับ dtOcrShrink (เหมือน smoke58)
    w.URL.createObjectURL=()=>'blob:fake';
    w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAA';
    Object.defineProperty(w.HTMLImageElement.prototype,'src',{
      configurable:true,
      set(v){ this.setAttribute('src',v); setTimeout(()=>{ if(this.onload)this.onload(); },5); },
      get(){ return this.getAttribute('src'); }
    });
    // XHR: จำลอง NDJSON stream จริง (ทยอย onprogress หลายครั้งก่อน onload)
    // ครั้งแรก: ลองครบทุกโมเดลแล้วพังหมด (high demand) · ครั้งที่สอง (retry): โมเดลแรกสำเร็จเลย
    w.__stageLog=[];
    w.XMLHttpRequest=function(){
      const self=this; this.upload={}; this.readyState=0; this.responseText='';
      this.open=(m,u)=>{self._url=u;};
      this.setRequestHeader=()=>{};
      this.abort=()=>{self.onabort&&self.onabort();};
      this.send=(body)=>{
        call++;
        const linesC1=[
          {status:'trying',model:'gemini-3.7-flash',attempt:1},
          {status:'trying',model:'gemini-3.6-flash',attempt:1},
          {status:'trying',model:'gemini-flash-latest',attempt:1},
          {status:'error',error:'Gemini อ่านไม่สำเร็จ — high demand ทุกโมเดล'}
        ];
        const linesC2=[
          {status:'trying',model:'gemini-3.7-flash',attempt:1},
          {status:'done',rows:[{name:'ปลาหมึกกล้วย',matched_item:null,qty:15,unit:'กก.',price:120,line_discount:0}],
            bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:1800,_model:'gemini-3.7-flash'}
        ];
        const lines=(call===1?linesC1:linesC2).map(o=>JSON.stringify(o));
        self.status=200; self.readyState=2;
        let i=0;
        const pump=()=>{
          if(i>=lines.length){ self.readyState=4; self.onload&&self.onload(); return; }
          self.responseText += lines[i]+'\n'; i++;
          self.readyState=3;
          self.onprogress&&self.onprogress(); // ให้ dtOcrSend อ่าน tick ก่อน ค่อยบันทึกผลลัพธ์หลังอัปเดต
          w.__stageLog.push(w.eval('OCRP.stage'));
          setTimeout(pump,15);
        };
        setTimeout(pump,10);
      };
    };
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ณชา',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_item_alias'))return T([]);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_sup_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  out.push('ยังไม่เคยสแกน -> ไม่มีปุ่ม retry: '+(d.getElementById('dtOcrRetryWrap').innerHTML===''));

  // ครั้งที่ 1: สแกนแล้วพังตามสถานการณ์ที่ผู้ใช้เจอ (รูปเดิม บางทีอ่านไม่ได้)
  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,200));
  out.push('ครั้งแรกพัง -> toast แนะนำให้ลองสแกนซ้ำ: '+d.getElementById('toast').textContent.includes('สแกนรูปเดิมอีกครั้ง'));
  out.push('ปุ่ม retry โผล่ทันทีแม้ครั้งแรกพัง (มีรูปแคชไว้แล้ว): '+d.getElementById('dtOcrRetryWrap').textContent.includes('สแกนรูปเดิมอีกครั้ง'));
  out.push('ยังไม่มีข้อมูลเข้า dtLines (พังจริง ไม่ apply มั่ว): '+w.eval("S.dtLines.length===1&&!S.dtLines[0].item"));

  // กดปุ่มสแกนรูปเดิมอีกครั้ง -> ไม่ต้องเลือกไฟล์ใหม่ ใช้ b64 เดิมที่แคชไว้ ส่งซ้ำแล้วสำเร็จ
  const btn=d.querySelector('#dtOcrRetryWrap button');
  out.push('เจอปุ่ม retry ในหน้าจริง: '+!!btn);
  btn.click();
  await new Promise(r=>setTimeout(r,250));
  out.push('retry ครั้งที่ 2 สำเร็จ + apply เข้า dtLines: '+w.eval("S.dtLines.length===1&&S.dtLines[0].item==='ปลาหมึกกล้วย'"));
  out.push('เรียก XHR ทั้งหมด 2 ครั้ง (ไม่ต้องเลือกไฟล์ใหม่รอบสอง): '+(call===2));
  out.push('โน้ตบอกชื่อโมเดลที่อ่านสำเร็จ: '+d.getElementById('dtTplNote').textContent.includes('gemini-3.7-flash'));
  // ★ ตอบคำถามผู้ใช้ตรง ๆ: ระหว่างรอ (โดยเฉพาะครั้งแรกที่ลองครบ 3 โมเดล) ต้องเห็นชื่อโมเดลจริงที่กำลังลอง ไม่ใช่ข้อความเดา
  const seen=w.__stageLog.filter((s,i,a)=>a.indexOf(s)===i); // unique in order
  out.push('★ เห็นสถานะจริงระหว่างรอ (ไล่ตามโมเดลที่ลองจริงทีละตัว ไม่เดา): '+
    (seen.some(s=>s.includes('Gemini 3.7 Flash'))&&seen.some(s=>s.includes('Gemini 3.6 Flash'))&&seen.some(s=>s.includes('Gemini Flash'))));
  out.push('★ ลำดับตรงกับที่ลองจริง (3.7 -> 3.6 -> latest): '+
    (w.__stageLog.findIndex(s=>s.includes('3.7'))<w.__stageLog.findIndex(s=>s.includes('3.6'))&&
     w.__stageLog.findIndex(s=>s.includes('3.6'))<w.__stageLog.findIndex(s=>s.includes('ด้วย Gemini Flash'))));

  // ปุ่ม retry ยังอยู่หลังสแกนสำเร็จ (เผื่ออยากลองซ้ำเทียบผล) + คงอยู่แม้สลับหน้าไปมา
  out.push('ปุ่ม retry ยังอยู่หลังสำเร็จ: '+!!d.querySelector('#dtOcrRetryWrap button'));
  d.querySelector('.sb-item[data-v="dash"]').click();
  await new Promise(r=>setTimeout(r,250));
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,250));
  out.push('สลับหน้าไปมา ปุ่ม retry ยังอยู่: '+!!d.querySelector('#dtOcrRetryWrap button'));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
