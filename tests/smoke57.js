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
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    // XHR ปลอม: ยิง progress อัปโหลด แล้วตอบ JSON
    w.__xhrLog=[];
    w.XMLHttpRequest=function(){
      const self=this; this.upload={};
      this.open=(m,u)=>{self._url=u;};
      this.setRequestHeader=()=>{};
      this.abort=()=>{w.__xhrLog.push('abort'); self.onabort&&self.onabort();};
      this.send=(body)=>{
        w.__xhrLog.push('send');
        setTimeout(()=>{ self.upload.onprogress&&self.upload.onprogress({lengthComputable:true,loaded:60,total:100}); },30);
        setTimeout(()=>{
          if(w.__xhrHang)return; // โหมดทดสอบยกเลิก
          self.status=200;
          self.responseText=JSON.stringify({status:'done',rows:[{name:'ปลาหมึกกล้วย',matched_item:null,qty:15,unit:'กก.',price:120,line_discount:0}],bill_discount:0,ship_fee:0,other_fee:0,vat_mode:'none',total_on_bill:1800,_model:'gemini-3.7-flash'})+'\n';
          self.onload&&self.onload();
        },250);
      };
    };
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ณชา',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_item_alias'))return T([]);
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
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,300));
  await w.dtPickSup(1);
  await new Promise(r=>setTimeout(r,200));
  // 1) จำลองสแกน (เรียกส่วนหลังจากย่อรูปโดยตรง)
  w.ocrProgOpen();
  out.push('หลอดเปิด + 2%: '+(d.getElementById('ocrProg').style.display==='flex'&&d.getElementById('ocrpPct').textContent==='2%'));
  w.eval("OCRP.timer=setInterval(ocrTick,100)");
  const p=w.dtOcrSend({image:'x',mime:'image/jpeg',knownItems:[],aliases:[]});
  await new Promise(r=>setTimeout(r,80));
  out.push('อัปโหลด % จริง (~24%): '+d.getElementById('ocrpPct').textContent);
  await new Promise(r=>setTimeout(r,120));
  out.push('เข้าเฟส AI + มี ETA: '+(d.getElementById('ocrpStage').textContent.includes('AI')&&/เหลือประมาณ \d+ วินาที|อีกแป๊บ/.test(d.getElementById('ocrpEta').textContent)));
  const r=await p;
  // จำลองจบเหมือนใน dtOcrPick
  w.eval("LS.set('jj_ocr_ms', Math.round(OCRP.est*0.55 + (Date.now()-OCRP.t0)*0.45))");
  w.ocrProgSet('เสร็จแล้ว ✅',100,' '); w.ocrProgClose(); w.dtOcrApply(r.j);
  await new Promise(r2=>setTimeout(r2,100));
  out.push('ตอบกลับ ok + apply: '+(r.ok&&w.eval("S.dtLines[0].item==='ปลาหมึกกล้วย'&&S.dtLines[0].qty===15")));
  out.push('จำเวลาเฉลี่ยไว้: '+(Number(JSON.parse(w.localStorage.getItem('jj_ocr_ms')))>0));
  out.push('หลอดปิดแล้ว: '+(d.getElementById('ocrProg').style.display==='none'));
  // 2) ปุ่มยกเลิก
  w.__xhrHang=true;
  w.ocrProgOpen();
  const p2=w.dtOcrSend({image:'x'});
  p2.catch(()=>{});
  await new Promise(r2=>setTimeout(r2,50));
  w.ocrCancel();
  await new Promise(r2=>setTimeout(r2,50));
  out.push('ยกเลิก: abort ถูกเรียก + หลอดปิด: '+(w.__xhrLog.includes('abort')&&d.getElementById('ocrProg').style.display==='none'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
