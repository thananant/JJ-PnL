const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
let mode='quota41'; let call=0;
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
      this.send=()=>{ call++; setTimeout(()=>{
        self.status=200;
        if(mode==='quota41'){
          self.responseText=[
            JSON.stringify({status:'trying',model:'gemini-3.7-flash'}),
            JSON.stringify({status:'trying',model:'gemini-3.6-flash'}),
            JSON.stringify({status:'trying',model:'gemini-flash-latest'}),
            JSON.stringify({status:'quota',model:'gemini-3.7-flash',retryAfter:41,reason:'Quota exceeded'})
          ].join('\n')+'\n';
        }else{ // สแกนซ้ำหลังหมดเวลารอ -> สำเร็จ
          self.responseText=JSON.stringify({status:'done',rows:[{name:'ปลาหมึกกล้วย',qty:15,unit:'กก.',price:120,line_discount:0}],
            bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:1800,_model:'gemini-3.7-flash'})+'\n';
        }
        self.onload&&self.onload();
      },15); };
    };
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_ocr_stats')){posts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'A',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_item_alias')||url.includes('pnl_bill_items')||url.includes('pnl_sup_items'))return T([]);
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

  await w.dtOcrPick({files:[{}],value:''});
  await new Promise(r=>setTimeout(r,150));

  const toastTxt=d.getElementById('toast').textContent;
  out.push('toast บอกโควตาหมด + วินาทีชัดเจน (41 วิ): '+(toastTxt.includes('โควตา')&&toastTxt.includes('41')));
  out.push('ไม่ apply ข้อมูลมั่ว (dtLines ยังว่าง): '+w.eval("S.dtLines.length===1&&!S.dtLines[0].item"));
  const rw=d.getElementById('dtOcrRetryWrap').textContent;
  out.push('ปุ่ม retry ล็อกไว้ระหว่างรอโควตา ไม่ใช่ปุ่มกดได้: '+(rw.includes('รออีก')&&!d.querySelector('#dtOcrRetryWrap button')));
  out.push('log สถิติ: ok=false model=null: '+(posts.length===1&&posts[0].ok===false&&posts[0].model===null));

  // ยังไม่ครบเวลา กดปุ่มไม่ได้จริง (ไม่มีปุ่มให้กด) -> ไม่ยิงซ้ำ
  out.push('เรียก XHR แค่ 1 ครั้ง (ยังไม่ได้กดซ้ำ): '+(call===1));

  // จำลองเวลาผ่านไปครบ 41 วิ -> ปุ่มกลับมากดได้เอง (ผ่าน renderOcrRetryBtn re-render ตามเวลาจริง)
  w.eval('S._ocrQuotaUntil = Date.now() - 1000'); // เสมือนเวลาหมดแล้ว
  w.renderOcrRetryBtn();
  await new Promise(r=>setTimeout(r,50));
  out.push('ครบเวลาแล้ว ปุ่มกลับมากดได้: '+!!d.querySelector('#dtOcrRetryWrap button'));

  // กดสแกนซ้ำ (คนละรอบ mock ตอบสำเร็จ) -> ใช้รูปเดิม ไม่ต้องเลือกไฟล์ใหม่ + สำเร็จ + เคลียร์ quota lock
  mode='success';
  d.querySelector('#dtOcrRetryWrap button').click();
  await new Promise(r=>setTimeout(r,150));
  out.push('retry หลังหมดเวลา -> สำเร็จ apply ข้อมูล: '+w.eval("S.dtLines.length===1&&S.dtLines[0].item==='ปลาหมึกกล้วย'"));
  out.push('เคลียร์ quota lock แล้ว (ปุ่มปกติ ไม่ค้างรอ): '+!d.getElementById('dtOcrRetryWrap').textContent.includes('รออีก'));
  out.push('เรียก XHR รวม 2 ครั้ง (ไม่ต้องเลือกไฟล์ใหม่รอบสอง): '+(call===2));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
