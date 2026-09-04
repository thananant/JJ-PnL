const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl-beta.html','utf8');

// mock CDN libs before scripts run
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({SheetNames:[],Sheets:{}}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:()=>({})},writeFile:()=>{}};
</script>`;
const patched=html
  .replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'')
  .replace('<style>',pre+'<style>');

const vc=new JSDOM(patched,{
  runScripts:'dangerously',
  url:'https://thananant.github.io/JJ-PnL/jjmk-pnl-beta.html',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_url','https://aikyxvluaiubdidqxwnd.supabase.co');
    w.localStorage.setItem('jjpnl_key','sb_publishable_test');
    w.fetch=async(url,opt)=>{
      return {ok:true,status:200,json:async()=>[],text:async()=>'[]',headers:{get:()=>null}};
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[];
    w.addEventListener('error',e=>w.errors.push(e.message));
  }
});
const w=vc.window,d=w.document;

setTimeout(async()=>{
  const out=[];
  out.push('app visible: '+(d.getElementById('app').style.display!=='none'));
  out.push('sidebar items: '+d.querySelectorAll('.sb-item').length);
  out.push('sbLogo src set: '+(d.getElementById('sbLogo').src.startsWith('data:image/png')));
  out.push('hdLogo src set: '+(d.getElementById('hdLogo').src.startsWith('data:image/png')));
  out.push('favicon links: '+d.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').length);
  // click through every sidebar item
  for(const v of ['income','exp','sum','pv','etc','set','dash']){
    const btn=d.querySelector(`.sb-item[data-v="${v}"]`);
    btn.click();
    await new Promise(r=>setTimeout(r,60));
    const sbOn=d.querySelector('.sb-item.on')?.dataset.v;
    const tbOn=d.querySelector('.tabbar button.on')?.dataset.v;
    const title=d.getElementById('pageTitle').textContent;
    out.push(`click ${v} -> sb:${sbOn} tab:${tbOn} title:${title} viewOn:${d.querySelector('.view.on')?.id}`);
  }
  out.push('page errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n'));
  process.exit(0);
},400);
