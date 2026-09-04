const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ups=[],inserts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(method==='POST'&&url.includes('pnl_fix_groups')){let b=JSON.parse(opt.body);ups.push(Array.isArray(b)?b[0]:b);return T([]);}
      if(method==='POST'&&url.includes('pnl_branches')){let b=JSON.parse(opt.body);inserts.push(b);return T([{...b}]);}
      if(method==='GET'&&url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา',sort:1},{code:'JJLP',name:'ลาดพร้าว',sort:2},{code:'JJBN',name:'บางนา',sort:3}]);
      if(method==='GET'&&url.includes('pnl_fix_groups'))return T([{name:'พนักงาน',sort:10},{name:'รายเดือน',sort:20},{name:'สาธารณูปโภค',sort:30}]);
      if(method==='GET'&&url.includes('pnl_fixed_items'))return T([
        {id:1,branch:'JJRD',grp:'สาธารณูปโภค',name:'ค่าไฟ',default_amount:null,sort:1,active:true},
        {id:2,branch:'JJRD',grp:'รายเดือน',name:'ค่าเช่า',default_amount:120000,sort:2,active:true},
        {id:3,branch:'JJRD',grp:'พนักงาน',name:'ประกันสังคม',default_amount:3600,sort:3,active:true}]);
      if(method==='GET'&&url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))
        return T(url.includes('JJBN')?[]:[{branch:'X',d:'2026-08-01',sales_pos_am:10000,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}]);
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
  // 1) seg dynamic 3 สาขา + ทุกสาขา
  out.push('seg: '+[...d.querySelectorAll('#brSeg button')].map(b=>b.textContent).join('/'));
  // 2) หมวดเรียงตามค่ากลาง (พนักงาน -> รายเดือน -> สาธารณูปโภค)
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,250));
  out.push('fix panel grp order: '+[...d.querySelectorAll('#fixPanel .fxgrp span:first-child')].map(x=>x.textContent).join(' → '));
  // 3) ตั้งค่า: ปุ่มเลื่อนหมวด + เลื่อน "รายเดือน" ขึ้น
  d.querySelector('.sb-item[data-v="set"]').click();
  await new Promise(r=>setTimeout(r,250));
  await w.grpMove('รายเดือน',-1);
  await new Promise(r=>setTimeout(r,200));
  out.push('grp ups: '+JSON.stringify(ups));
  out.push('order after move: '+[...d.querySelectorAll('#view-set tr.cat')].map(x=>x.textContent.trim().split(' ')[0]).filter(x=>['พนักงาน','รายเดือน','สาธารณูปโภค'].includes(x)).join(' → '));
  // 4) ทุกสาขา: ตารางเทียบ 3 คอลัมน์
  d.querySelector('#brSeg button[data-br="ALL"]').click();
  await new Promise(r=>setTimeout(r,300));
  const cmp=[...d.querySelectorAll('#view-dash h3')].find(h=>h.textContent.includes('เทียบรายสาขา'))?.parentElement;
  out.push('compare cols: '+[...(cmp?.querySelectorAll('th')||[])].map(t=>t.textContent).join('|'));
  // 5) เพิ่มสาขาใหม่
  w.brModal(null);
  await new Promise(r=>setTimeout(r,50));
  d.getElementById('brCode').value='jjon'; d.getElementById('brName').value='อ่อนนุช';
  await w.brSave(null);
  await new Promise(r=>setTimeout(r,200));
  out.push('branch insert: '+JSON.stringify(inserts[0]));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
