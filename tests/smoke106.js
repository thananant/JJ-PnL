// smoke106: P&L · โหมดมือถือ — หน้าต้องไม่กว้างเกินจอจนเบราว์เซอร์ย่อทั้งหน้า
//   บั๊กที่เจอ: .hrow (แบรนด์ + แถบสาขา + ช่องเดือน) เป็น flex แถวเดียวย่อไม่ได้ → หน้ากว้างขั้นต่ำ ~548px
//   มือถือเลยย่อทั้งหน้าให้พอดีจอ ตัวหนังสือจิ๋ว แถบบนเลื่อน/กดยาก
//   ใหม่: ≤899px หัวจอเป็นกริด 2 แถว (แบรนด์+เดือน / แถบสาขาเลื่อนได้) + ทุกชิ้นย่อได้ (min-width:0)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const css=html.slice(html.indexOf('<style>'),html.lastIndexOf('</style>'));
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url)=>{
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'},{code:'OFF',name:'ออฟฟิศ'}]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาดสด',active:true,sort:1,vat_type:'NON-VAT'}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// ตัดเฉพาะกติกาในบล็อกมือถือออกมาตรวจ (jsdom ไม่คิด layout ให้ จึงตรวจที่ตัว CSS + โครง DOM)
const mob=css.slice(css.indexOf('@media(max-width:899px)'));
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  out.push('มีบล็อก CSS โหมดมือถือ (≤899px) และอยู่ท้ายสุดของสไตล์ (ชนะกติกา base): '
    +(mob.length>0&&css.indexOf('@media(max-width:899px)')>css.lastIndexOf('.perbar{display:flex')));
  out.push('หัวจอ ≤899px เป็นกริด 2 แถว (แบรนด์+เดือน / แถบสาขา): '
    +(/\.hrow\{display:grid/.test(mob)&&mob.includes('"brand month dot" "seg seg seg"')));
  out.push('ทุกชิ้นในหัวจอย่อได้ (min-width:0) ไม่บังคับให้หน้ากว้าง: '
    +(/\.brand\{[^}]*min-width:0/.test(mob)&&/#monthPick\{[^}]*min-width:0/.test(mob)&&/\.seg\{[^}]*min-width:0/.test(mob)));
  out.push('แถบสาขา/แถบแท็บเลื่อนแนวนอนได้เอง (overflow-x:auto + snap): '
    +(/\.seg\{[^}]*overflow-x:auto/.test(mob)&&/\.seg\{[^}]*scroll-snap-type/.test(mob)&&/\.tabbar\{[^}]*scroll-snap-type/.test(mob)));
  out.push('เว้นพื้นที่ status bar ของมือถือ (safe-area) ที่หัวจอ: '+/header\{padding-top:env\(safe-area-inset-top\)/.test(mob));
  out.push('การ์ดยอดงวดเป็น 2 คอลัมน์บนมือถือ: '+/\.perbar\{display:grid;grid-template-columns:1fr 1fr/.test(mob));
  out.push('ตารางกว้างเลื่อนในกรอบตัวเอง ไม่ดันหน้าทั้งหน้า: '+/\.twrap,\.mxwrap,\.tblwrap\{max-width:100%;overflow-x:auto/.test(mob));
  out.push('หัวการ์ดไม่ถูกบีบจนชื่อตัดคำ (คำอธิบายลงบรรทัดใหม่): '
    +(/\.card h3\{flex-wrap:wrap/.test(mob)&&/\.card h3 \.sp\{margin-left:0;flex:1 0 100%/.test(mob)));
  // โครง DOM: หัวจอมีครบและแท็บเลื่อนตามตัวที่เลือก
  const hrow=d.querySelector('.hrow');
  out.push('หัวจอมี แบรนด์ / แถบสาขา / ช่องเดือน / จุดสถานะ ครบ: '
    +(!!hrow.querySelector('.brand')&&!!d.getElementById('brSeg')&&!!d.getElementById('monthPick')&&!!d.getElementById('syncDot')));
  out.push('แถบสาขาเป็นปุ่มเลื่อนได้ ไม่ใช่ dropdown (กดสลับสาขาได้ไว): '
    +(d.querySelectorAll('#brSeg button').length>=3&&[...d.querySelectorAll('#brSeg button')].some(b=>b.classList.contains('on'))));
  await w.show('exp'); await sleep(200);
  const on=d.querySelector('.tabbar button.on');
  out.push('เปลี่ยนแท็บแล้วปุ่มที่เลือกถูกทำเครื่องหมาย + โค้ดเลื่อนแท็บมาให้เห็นบนจอเล็ก: '
    +(!!on&&on.dataset.v==='exp'&&html.includes("if(tb&&tb.scrollIntoView&&innerWidth<900)")));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},300);
