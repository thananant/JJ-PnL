const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const mkInc=(br,pos1,pos2)=>[{branch:br,d:'2026-08-01',sales_pos_am:pos1,sales_pos_pm:pos2,deposit_am:pos1,deposit_pm:pos2,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      if(method==='GET'&&url.includes('pnl_income_daily')&&url.includes('d=gte')){
        const rows=url.includes('branch=eq.JJRD')?mkInc('JJRD',10000,20000):url.includes('branch=eq.JJLP')?mkInc('JJLP',5000,7000):[];
        return {ok:true,status:200,text:async()=>JSON.stringify(rows),headers:{get:()=>null}};
      }
      return {ok:true,status:200,text:async()=>'[]',headers:{get:()=>null}};
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  out.push('seg buttons: '+[...d.querySelectorAll('#brSeg button')].map(b=>b.textContent).join('/'));
  // กดทุกสาขา
  const allBtn=d.querySelector('#brSeg button[data-br="ALL"]');
  allBtn.click();
  await new Promise(r=>setTimeout(r,250));
  const dash=d.getElementById('view-dash');
  const hero=dash.querySelector('.kpi.hero');
  out.push('hero: '+hero.textContent.replace(/\s+/g,' ').trim().slice(0,80));
  // รายได้รวม = (10000+20000+5000+7000)/1.07 = 42000/1.07 = 39252.34
  out.push('has 39,252: '+hero.textContent.includes('39,252'));
  const cmp=[...dash.querySelectorAll('h3')].find(h=>h.textContent.includes('เทียบรายสาขา')).parentElement;
  out.push('compare cols: '+[...cmp.querySelectorAll('th')].map(t=>t.textContent).join('|'));
  // ตารางยอดดิบรวม: วัน 1 เช้า 15000 เย็น 27000 รวม 42000
  const rep=[...dash.querySelectorAll('h3')].find(h=>h.textContent.includes('ยอดขายดิบ')).parentElement;
  out.push('sales row: '+rep.querySelector('.drrow:not(.head):not(.tot)').textContent.replace(/\s+/g,' ').trim());
  // สรุปเดือน = read-only
  d.querySelector('.sb-item[data-v="sum"]').click();
  await new Promise(r=>setTimeout(r,250));
  const sum=d.getElementById('view-sum');
  out.push('sum RO note: '+sum.textContent.includes('โหมดรวม'));
  out.push('sum inputs: '+sum.querySelectorAll('input').length+' (ควรเป็น 0)');
  // รายรับ = notice
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,120));
  const inc=d.getElementById('view-income');
  out.push('income ALL = ตารางรวม (ไม่ใช่ notice): '+(!inc.textContent.includes('ต้องเลือกสาขาก่อน')&&inc.textContent.includes('รวม/วัน')));
  // สลับสาขาผ่านแถบบน
  d.querySelector('#brSeg button[data-br="JJRD"]').click();
  await new Promise(r=>setTimeout(r,200));
  out.push('after pickBranch -> br on: '+d.querySelector('#brSeg button.on')?.dataset.br+' | income has calendar: '+!!d.querySelector('#incChips .calgrid'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
