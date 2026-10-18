/* CampusAttend — shared declaration / disclaimer / confirmation layer. Load with <script src="fb-guard.js"></script> on every page. */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const st=document.createElement('style');st.textContent=`
.gd-ov{position:fixed;inset:0;z-index:9999;background:rgba(20,8,6,.6);display:grid;place-items:center;padding:16px;overflow:auto}
.gd{background:var(--surface,var(--s,#fff));color:var(--ink,#1d1816);border-radius:20px;padding:18px;max-width:440px;width:100%;display:grid;gap:10px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 system-ui,sans-serif}
.gd h3{font-size:17px}.gd .wn{background:var(--warn-soft,var(--warns,#fff1d6));color:var(--warn,#9a5800);border-radius:12px;padding:10px 12px;font-weight:600}
.gd .wn.bad{background:var(--bad-soft,var(--bads,#fce9e7));color:var(--bad,#b3261e)}
.gd ul{margin:0 0 0 18px;color:var(--ink-2,var(--ink2,#645b58))}.gd .dis{font-size:12px;color:var(--ink-3,var(--ink3,#857b78));line-height:1.4}
.gd .ck{display:flex;gap:10px;align-items:flex-start;font-weight:600}.gd .ck input{margin-top:3px;width:18px;height:18px;flex:none}
.gd .row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.gd .row button{padding:10px 16px;border-radius:12px;font-weight:700;border:1px solid var(--line,#eae3e1);background:var(--surface-2,var(--s2,#faf6f5));color:inherit;cursor:pointer;font:inherit}
.gd .row .go{background:var(--btn,#c8221a);color:#fff;border-color:transparent}.gd .row .go.bad{background:var(--bad,#b3261e)}.gd .row button[disabled]{opacity:.45;pointer-events:none}
.gd-foot{font-size:11.5px;line-height:1.5;color:var(--ink-3,var(--ink3,#857b78));text-align:center;padding:14px 18px calc(var(--nav-h,0px) + 18px);max-width:640px;margin:0 auto}
`;document.head.appendChild(st);
const DISC='Disclaimer: this action is saved to the live database immediately and is visible to the people concerned. It is not undone automatically. Student data is confidential and for official college use only.';
function ask(o){return new Promise(res=>{
  const h=document.createElement('div');h.className='gd-ov';
  h.innerHTML='<div class="gd" role="alertdialog" aria-modal="true" aria-label="'+esc(o.title)+'"><h3>'+esc(o.title)+'</h3>'+(o.warn?'<p class="wn'+(o.danger?' bad':'')+'">'+esc(o.warn)+'</p>':'')+(o.items&&o.items.length?'<ul>'+o.items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>':'')+'<p class="dis">'+esc(o.disc||DISC)+'</p><label class="ck"><input type="checkbox" id="gd-ak"><span>'+esc(o.decl||'I declare that I have checked the details above and I want to continue.')+'</span></label><div class="row">'+(o.noCancel?'':'<button data-n>Cancel</button>')+'<button class="go'+(o.danger?' bad':'')+'" data-y disabled>'+esc(o.ok||'Confirm')+'</button></div></div>';
  const end=v=>{h.remove();res(v)},y=h.querySelector('[data-y]');
  h.addEventListener('change',e=>{if(e.target.id==='gd-ak')y.disabled=!e.target.checked});
  h.addEventListener('click',e=>{if(e.target.closest('[data-y]'))end(true);else if(e.target.closest('[data-n]')||(e.target===h&&!o.noCancel))end(false)});
  document.body.appendChild(h);h.querySelector('#gd-ak').focus()})}
const TXT={
 student:['Student declaration','I will mark attendance only when I am personally present. Marking for someone else, sharing codes or QR, or sending false correction requests is misconduct and may lead to disciplinary action.','Your attendance, name and roll number are stored online and are visible to your teachers and the admin.'],
 teacher:['Teacher declaration','I will take and edit attendance only for classes I teach, record it honestly, and keep student data confidential.','Every change you make is stored online and visible to the students concerned and the admin.'],
 login:['Declaration & disclaimer','By signing in or registering I confirm that the details I give are true and that I will use CampusAttend only for official CSJMU work.','Your data is stored online. False information can lead to your account being rejected or terminated.'],
 admin:['Admin declaration','I am an authorised admin of CampusAttend. I will change, download or delete data only for official college work, and I understand that deletions are permanent.','Student and teacher data is confidential. Every action you take is live immediately.']};
const FOOT={student:'Declaration: use this app only for your own attendance. Disclaimer: records are stored online and visible to your teachers and admin; false marking is misconduct.',teacher:'Declaration: record attendance honestly and only for your own classes. Disclaimer: all changes are stored online, are visible to students and admin, and student data is confidential.',login:'By continuing you declare that your details are true. Disclaimer: data is stored online for official CSJMU use only.',admin:'Declaration: act only as an authorised admin. Disclaimer: changes and deletions are live and permanent; student data is confidential and must not be shared outside the college.'};
window.GUARD={ask,
 declare(role,key){const k='gd.'+(key||role);try{if(sessionStorage.getItem(k))return}catch(e){}
  const t=TXT[role];ask({title:t[0],warn:t[1],disc:t[2],decl:'I have read this declaration and disclaimer, and I agree.',ok:'I agree and continue',noCancel:true}).then(()=>{try{sessionStorage.setItem(k,1)}catch(e){}})},
 foot(role,host){const p=document.createElement('p');p.className='gd-foot';p.textContent=FOOT[role];(host||document.querySelector('main')||document.body).appendChild(p)},
 text:role=>FOOT[role],
 protect(rules){
  const h=type=>e=>{for(const r of rules){if((r.type||'click')!==type)continue;const el=e.target.closest(r.sel);if(!el)continue;if(el.__gd)return;
    const c=typeof r.cfg==='function'?r.cfg(el):r.cfg;if(!c)return;
    e.stopImmediatePropagation();e.preventDefault();
    ask(c).then(y=>{if(!y)return;el.__gd=1;try{type==='submit'?(el.requestSubmit?el.requestSubmit():el.submit()):el.click()}finally{el.__gd=0}});return}};
  document.addEventListener('click',h('click'),true);document.addEventListener('submit',h('submit'),true)}
};
})();
