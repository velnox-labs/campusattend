/* Teacher: add classes + approve per-subject student requests. Student: request subjects.
   Syncs approved data into the local attendance db so the existing screens keep working. */
const esc=s=>CA.esc(s);
const ST={pending:'warn',approved:'ok',rejected:'bad'};
const chip=s=>CA.chip(ST[s]||'neutral',s);
const B='btn sm ghost',empty=(i,t,s)=>'<div class="empty card flat"><div class="bubble">'+CA.icon(i)+'</div><b>'+esc(t)+'</b><span>'+esc(s)+'</span></div>';

async function sync(role){
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current(role).user,d=CA.db();
  const before=JSON.stringify([d.classes,d.students,d.teachers,d.cohorts]);
  const get=(c,...w)=>F.getDocs(F.query(F.collection(db,c),...w.map(x=>F.where(...x))));
  let cl,en;
  if(role==='teacher'){
    cl=(await get('classes',['teacherUid','==',uid])).docs.map(x=>({id:x.id,...x.data()}));
    en=(await get('enrollments',['teacherUid','==',uid],['status','==','approved'])).docs.map(x=>x.data());
  }else{
    en=(await get('enrollments',['studentUid','==',uid],['status','==','approved'])).docs.map(x=>x.data());
    cl=(await Promise.all(en.map(e=>F.getDoc(F.doc(db,'classes',e.classId))))).filter(s=>s.exists()).map(s=>({id:s.id,...s.data()}));
  }
  d.classes=d.classes.filter(c=>!c.fb);
  cl.forEach(c=>{
    d.classes.push({id:c.id,cohort:c.cohort,subject:c.subject,teacherId:c.teacherEmp,days:c.days||[],slot:c.slot,fb:true,
      enr:role==='teacher'?en.filter(e=>e.classId===c.id).map(e=>e.roll):[me.id],tuid:c.teacherUid,
      uids:role==='teacher'?Object.fromEntries(en.filter(e=>e.classId===c.id).map(e=>[e.roll,e.studentUid])):{}});
    if(!d.cohorts.some(x=>x.id===c.cohort))d.cohorts.push({id:c.cohort,name:c.cohort});
    if(!d.teachers.some(t=>t.id===c.teacherEmp))d.teachers.push({id:c.teacherEmp,name:c.teacherName,designation:'',dept:'',pass:'',fb:true});
  });
  if(role==='teacher')en.forEach(e=>{if(!d.students.some(s=>s.id===e.roll))d.students.push({id:e.roll,name:e.name,cohort:e.cohort,pass:'',fb:true})});
  if(JSON.stringify([d.classes,d.students,d.teachers,d.cohorts])!==before){CA.save();return true}
  return false;
}
const pend=a=>a.sort((x,y)=>(x.status==='pending'?0:1)-(y.status==='pending'?0:1));
async function teacherPanel(dirty,tab){
  dirty=dirty||{v:false,tab:'requests'};if(tab)dirty.tab=tab;
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('teacher').user;
  if(!CA.pageBody()){CA.page({title:'Classes & requests',sub:'Approve students and manage subjects',body:''});CA.pageClose(()=>dirty.v&&location.reload())}
  const b=CA.pageBody();b.innerHTML='<p class="muted" style="padding:20px;text-align:center">Loading…</p>';
  const q=c=>F.getDocs(F.query(F.collection(db,c),F.where('teacherUid','==',uid)));
  const [cs,es,rs]=await Promise.all([q('classes'),q('enrollments'),q('corrections')]);
  if(!CA.pageBody())return;
  const crs=pend(rs.docs.map(x=>({id:x.id,...x.data()}))),en=pend(es.docs.map(x=>({id:x.id,...x.data()}))),cls=cs.docs.map(x=>({id:x.id,...x.data()}));
  const D=['','Mon','Tue','Wed','Thu','Fri','Sat'],pc=crs.filter(r=>r.status==='pending').length+en.filter(e=>e.status==='pending').length;
  FBM.n=pc;document.querySelectorAll('[data-badge]').forEach(x=>{x.textContent=pc;x.hidden=!pc});
  const tabs=[['requests','Requests'+(pc?' ('+pc+')':'')],['classes','Classes'],['new','New class']];
  let h='<div class="seg" role="tablist">'+tabs.map(t=>'<button role="tab" aria-selected="'+(dirty.tab===t[0])+'" class="'+(dirty.tab===t[0]?'on':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>';
  if(dirty.tab==='requests'){
    h+='<div class="sect">Subject requests from students</div><div class="stack">'+(en.length?en.map(e=>'<div class="item"><span class="avatar">'+esc(CA.initials(e.name))+'</span><span class="grow"><div class="t ellipsis">'+esc(e.name)+'</div><div class="s">'+esc(e.roll)+' · '+esc(e.subject)+'</div></span>'+(e.status==='pending'?'<button class="btn sm" data-a="approved" data-id="'+e.id+'">Approve</button><button class="'+B+'" data-a="rejected" data-id="'+e.id+'">Reject</button>':chip(e.status)+(e.status==='approved'?'<button class="'+B+'" data-a="rejected" data-id="'+e.id+'">Remove</button>':''))+'</div>').join(''):empty('users','No requests yet','Students in your cohorts will appear here.'))+'</div>';
    h+='<div class="sect">Attendance correction requests</div><div class="stack">'+(crs.length?crs.map(r=>'<div class="card flat"><div class="row"><span class="grow"><div class="t"><b>'+esc(r.name)+'</b> · '+esc(r.roll)+'</div><div class="small muted">'+esc(r.subject)+' · '+esc(r.date)+'</div></span>'+(r.status==='pending'?'':chip(r.status))+'</div><p class="small" style="margin:8px 0 0;color:var(--ink-2)">“'+esc(r.reason)+'”</p>'+(r.status==='pending'?'<div class="row" style="margin-top:10px"><button class="btn sm" data-cr="approved" data-id="'+r.id+'" data-sid="'+r.sessionId+'" data-roll="'+esc(r.roll)+'">Mark present</button><button class="'+B+'" data-cr="rejected" data-id="'+r.id+'">Reject</button></div>':'')+'</div>').join(''):empty('checkc','No correction requests','Nothing is waiting for your review.'))+'</div>';
  }else if(dirty.tab==='classes'){
    h+='<div class="sect">Your classes</div><div class="stack">'+(cls.length?cls.map(c=>'<div class="item"><span class="bubble">'+CA.icon('book')+'</span><span class="grow"><div class="t ellipsis">'+esc(c.subject)+'</div><div class="s">'+esc(c.cohort)+' · '+(c.days||[]).map(x=>D[x]).join(', ')+' · '+esc(c.slot)+'</div></span><button class="btn sm danger" data-del="'+c.id+'">Delete</button></div>').join(''):empty('book','No classes yet','Use the New class tab to add your first one.'))+'</div>';
  }else{
    h+='<div class="stack" style="margin-top:14px"><label class="field"><span>Subject</span><input class="input" id="nc-s" placeholder="e.g. Data Structures"></label><label class="field"><span>Cohort code</span><input class="input" id="nc-c" placeholder="e.g. BCA3" style="text-transform:uppercase"></label><label class="field"><span>Class time</span><input class="input" id="nc-t" value="10:00 AM" placeholder="e.g. 10:00 AM"></label><div class="field"><span>Days</span><div id="nc-d" class="flexwrap" style="gap:8px">'+[1,2,3,4,5,6].map(i=>'<label class="daychip"><input type="checkbox" value="'+i+'"><span>'+D[i]+'</span></label>').join('')+'</div></div></div>';
  }
  CA.pageFoot(dirty.tab==='new'?'<button class="btn" id="nc-add">Add class</button>':'');
  b.innerHTML=h;
  const act=async e=>{
    const a=e.target.closest('[data-a]'),x=e.target.closest('[data-del]'),cr=e.target.closest('[data-cr]'),tb=e.target.closest('[data-tab]');
    try{
      if(tb)return teacherPanel(dirty,tb.dataset.tab);
      if(cr){
        await F.updateDoc(F.doc(db,'corrections',cr.dataset.id),{status:cr.dataset.cr});
        if(cr.dataset.cr==='approved'){const ss=CA.db().sessions.find(x=>x.id===cr.dataset.sid);if(ss){ss.records[cr.dataset.roll]='P';CA.save()}}
      }else if(a){await F.updateDoc(F.doc(db,'enrollments',a.dataset.id),{status:a.dataset.a})}
      else if(x){if(!confirm('Delete this class?'))return;await F.deleteDoc(F.doc(db,'classes',x.dataset.del))}
      else if(e.target.closest('#nc-add')){
        const v=id=>b.querySelector(id).value.trim(),s=v('#nc-s'),c=v('#nc-c').toUpperCase(),t=v('#nc-t'),days=[...b.querySelectorAll('#nc-d input:checked')].map(i=>+i.value);
        if(!s||!c||!t||!days.length)return CA.toast('Fill subject, cohort, time and days','bad');
        await F.addDoc(F.collection(db,'classes'),{subject:s,cohort:c,slot:t,days,teacherUid:uid,teacherEmp:me.id,teacherName:me.name,createdAt:F.serverTimestamp()});
        dirty.tab='classes';
      }else return;
      dirty.v=true;await sync('teacher');teacherPanel(dirty);
    }catch(err){CA.toast('Failed: '+(err.code||err.message),'bad')}
  };
  b.onclick=act;const ft=document.querySelector('.pagefoot');if(ft)ft.onclick=act;
}
async function studentPanel(dirty){
  dirty=dirty||{v:false};
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('student').user;
  if(!CA.pageBody()){CA.page({title:'Enroll in subjects',sub:'Cohort '+me.cohort,body:''});CA.pageClose(()=>dirty.v&&location.reload())}
  const b=CA.pageBody();b.innerHTML='<p class="muted" style="padding:20px;text-align:center">Loading…</p>';
  const [cs,es]=await Promise.all([F.getDocs(F.query(F.collection(db,'classes'),F.where('cohort','==',me.cohort))),F.getDocs(F.query(F.collection(db,'enrollments'),F.where('studentUid','==',uid)))]);
  if(!CA.pageBody())return;
  const st={};es.docs.forEach(x=>st[x.data().classId]=x.data().status);
  const cls=cs.docs.map(x=>({id:x.id,...x.data()}));
  b.innerHTML='<div class="card flat"><div class="row"><span class="bubble">'+CA.icon('shield')+'</span><p class="small muted">Request each subject you study. Its teacher approves you, and attendance starts counting after that.</p></div></div><div class="sect">Subjects in '+esc(me.cohort)+'</div><div class="stack">'+(cls.length?cls.map(c=>'<div class="item"><span class="bubble">'+CA.icon('book')+'</span><span class="grow"><div class="t ellipsis">'+esc(c.subject)+'</div><div class="s">'+esc(c.teacherName)+' · '+esc(c.slot)+'</div></span>'+(st[c.id]?chip(st[c.id]):'<button class="btn sm" data-req="'+c.id+'">Request</button>')+'</div>').join(''):empty('book','No subjects yet','Your teachers haven’t added classes for this cohort.'))+'</div>';
  b.onclick=async e=>{
    const r=e.target.closest('[data-req]');if(!r)return;
    const c=cls.find(x=>x.id===r.dataset.req);r.disabled=true;
    try{
      await F.setDoc(F.doc(db,'enrollments',uid+'_'+c.id),{studentUid:uid,classId:c.id,teacherUid:c.teacherUid,roll:me.id,name:me.name,subject:c.subject,cohort:c.cohort,status:'pending',createdAt:F.serverTimestamp()});
      dirty.v=true;CA.toast('Request sent to '+c.teacherName);studentPanel(dirty);
    }catch(err){r.disabled=false;CA.toast('Failed: '+(err.code||err.message),'bad')}
  };
}

/* ================= attendance sessions <-> Firestore =================
   sessions/{id}  teacher-only (holds live code)   live/{classId}  public "class is open" flag
   marks/{sid_uid} student's code submit (rules verify the code)   history/{sid_uid} final per-student result */
const WIN=30000;
const sdoc=(s,x)=>Object.assign({classId:s.classId,teacherUid:FBT.uid(),date:s.date,startedAt:s.startedAt,endedAt:s.endedAt||null,expiresAt:s.expiresAt||0,method:s.method,status:s.status,records:s.records},x);
async function teacherSessions(){
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),sig={},last={},lis={};
  const snap=await F.getDocs(F.query(F.collection(db,'sessions'),F.where('teacherUid','==',uid),F.where('status','==','closed')));
  let add=false;
  snap.docs.forEach(x=>{const v=x.data(),D=CA.db();sig[x.id]=JSON.stringify(v.records);
    if(!D.sessions.some(s=>s.id===x.id)&&D.classes.some(c=>c.id===v.classId)){
      D.sessions.push({id:x.id,classId:v.classId,date:v.date,startedAt:v.startedAt,endedAt:v.endedAt,method:v.method,status:'closed',records:v.records||{},marks:{},fb:true});add=true}});
  if(add){CA.save();return location.reload()}
  setInterval(async()=>{
    const D=CA.db(),ids=D.classes.filter(c=>c.fb).map(c=>c.id);
    for(const s of D.sessions.filter(s=>ids.includes(s.classId))){
      const c=D.classes.find(c=>c.id===s.classId);
      try{
        if(s.status==='open'){
          const w=Math.floor(Date.now()/WIN),code=CA.codeAt(s,w),k=code+'|'+s.expiresAt;
          if(last[s.id]!==k){
            await F.setDoc(F.doc(db,'sessions',s.id),sdoc(s,{code,prevCode:CA.codeAt(s,w-1)}));
            await F.setDoc(F.doc(db,'live',s.classId),{sessionId:s.id,classId:s.classId,subject:c.subject,teacherUid:uid,startedAt:s.startedAt,expiresAt:s.expiresAt});
            last[s.id]=k;
          }
          if(!lis[s.id]){lis[s.id]=1;
            F.onSnapshot(F.query(F.collection(db,'marks'),F.where('sessionId','==',s.id),F.where('teacherUid','==',uid)),q=>{
              const ss=CA.db().sessions.find(x=>x.id===s.id);if(!ss)return;let ch=false;
              q.docs.forEach(m=>{const v=m.data();if(ss.records[v.roll]!=='P'){ss.records[v.roll]='P';ss.marks[v.roll]=v.at;ch=true}});
              if(ch)CA.save();
            });}
        }else if(sig[s.id]!==JSON.stringify(s.records)){
          const rs=JSON.stringify(s.records),b=F.writeBatch(db);
          b.set(F.doc(db,'sessions',s.id),sdoc(s,{code:null,prevCode:null}));
          if(last[s.id])b.delete(F.doc(db,'live',s.classId));
          Object.entries(s.records).forEach(([roll,v])=>{const u=(c.uids||{})[roll];
            if(u)b.set(F.doc(db,'history',s.id+'_'+u),{sessionId:s.id,classId:s.classId,teacherUid:uid,studentUid:u,roll,date:s.date,startedAt:s.startedAt,endedAt:s.endedAt||null,method:s.method,status:v})});
          await b.commit();sig[s.id]=rs;delete last[s.id];
        }
      }catch(e){console.warn('sync',e.code||e)}
    }
  },1500);
}
async function studentSessions(){
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('student').user;
  CA.db().classes.filter(c=>c.fb).forEach(c=>F.onSnapshot(F.doc(db,'live',c.id),s=>{
    const D=CA.db(),old=D.sessions.find(x=>x.remote&&x.classId===c.id&&x.status==='open');
    D.sessions=D.sessions.filter(x=>!(x.remote&&x.classId===c.id));
    const v=s.exists()&&s.data();
    if(v&&v.expiresAt>Date.now()){
      const same=old&&old.id===v.sessionId;
      D.sessions.push({id:v.sessionId,classId:c.id,date:new Date(v.startedAt).toLocaleDateString('en-CA'),startedAt:v.startedAt,expiresAt:v.expiresAt,method:'live',status:'open',seed:0,
        records:same?old.records:{},marks:same?old.marks:{},fb:true,remote:true,tuid:v.teacherUid});
    }
    CA.save();
  }));
  CA.submitCode=async function(sid,raw){
    const code=String(raw).replace(/\D/g,'');
    if(code.length!==6)return{ok:false,reason:'format'};
    const open=CA.db().sessions.filter(s=>s.remote&&s.status==='open'&&Date.now()<s.expiresAt);
    if(!open.length)return{ok:false,reason:'noSession'};
    for(const s of open){
      if(s.records[sid]==='P')return{ok:false,reason:'already',cls:CA.getClass(s.classId)};
      try{
        await F.setDoc(F.doc(db,'marks',s.id+'_'+uid),{sessionId:s.id,classId:s.classId,teacherUid:s.tuid,studentUid:uid,roll:sid,code,at:Date.now()});
        s.records[sid]='P';s.marks[sid]=Date.now();CA.save();
        return{ok:true,cls:CA.getClass(s.classId),at:Date.now()};
      }catch(e){}
    }
    return{ok:false,reason:'invalid'};
  };
  const hs=(await F.getDocs(F.query(F.collection(db,'history'),F.where('studentUid','==',uid)))).docs.map(x=>x.data());
  const D=CA.db(),before=JSON.stringify(D.sessions),by={};
  hs.forEach(h=>{(by[h.sessionId]=by[h.sessionId]||{id:h.sessionId,classId:h.classId,date:h.date,startedAt:h.startedAt,endedAt:h.endedAt,method:h.method,status:'closed',records:{},marks:{},fb:true}).records[h.roll]=h.status});
  D.sessions=D.sessions.filter(s=>!(s.fb&&!s.remote)&&!by[s.id]).concat(Object.values(by));
  if(JSON.stringify(D.sessions)!==before){CA.save();location.reload()}
}

/* ---------- student: monthly calendar + correction requests ---------- */
async function calendar(m){
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('student').user,D=CA.db();
  m=m||new Date();m=new Date(m.getFullYear(),m.getMonth(),1);
  if(!CA.pageBody())CA.page({title:'Attendance calendar',sub:'Day-wise record of your classes',body:''});
  const b=CA.pageBody(),ids=D.classes.filter(c=>c.fb).map(c=>c.id);
  const ss=D.sessions.filter(s=>s.status==='closed'&&ids.includes(s.classId)&&s.records[me.id]);
  const cs={};(await F.getDocs(F.query(F.collection(db,'corrections'),F.where('studentUid','==',uid)))).docs.forEach(x=>cs[x.id]=x.data());
  if(!CA.pageBody())return;
  const y=m.getFullYear(),mo=m.getMonth(),n=new Date(y,mo+1,0).getDate(),off=m.getDay(),pad=v=>String(v).padStart(2,'0');
  let sel=null;
  const draw=()=>{
    let h='<div class="mbar"><button class="'+B+'" data-mv="-1" aria-label="Previous month">'+CA.icon('back',18)+'</button><b>'+m.toLocaleString('en',{month:'long'})+' '+y+'</b><button class="'+B+'" data-mv="1" aria-label="Next month">'+CA.icon('chev',18)+'</button></div><div class="cal">'+'SMTWTFS'.split('').map(x=>'<small>'+x+'</small>').join('');
    for(let i=0;i<off;i++)h+='<span></span>';
    for(let d=1;d<=n;d++){
      const k=y+'-'+pad(mo+1)+'-'+pad(d),day=ss.filter(s=>s.date===k),p=day.filter(s=>s.records[me.id]==='P').length,c=!day.length?'':p===day.length?'ok':p?'warn':'bad';
      h+='<button class="'+c+(k===sel?' sel':'')+'" data-day="'+k+'">'+d+'</button>';
    }
    h+='</div><div class="flexwrap" style="margin-top:14px">'+CA.chip('ok','Present')+CA.chip('warn','Partly')+CA.chip('bad','Absent')+'</div>';
    h+='<div class="sect">'+(sel?CA.fmtDate(sel):'Select a day to see its classes')+'</div>';
    if(sel)h+='<div class="stack">'+(ss.filter(s=>s.date===sel).map(s=>{
      const c=D.classes.find(x=>x.id===s.classId),A=s.records[me.id]==='A',cr=cs[s.id+'_'+uid];
      return '<div class="item"><span class="grow"><div class="t">'+esc(c.subject)+'</div><div class="s">'+CA.fmtTime(s.startedAt)+'</div></span>'+(A?(cr?CA.chip(ST[cr.status]||'neutral','Correction '+cr.status):'<button class="btn sm soft" data-cor="'+s.id+'">Request correction</button>'):CA.chip('ok','Present','check'))+'</div>'}).join('')||empty('cal','No class that day','Nothing was recorded on this date.'))+'</div>';
    b.innerHTML=h;
  };
  b.onclick=async e=>{
    const mv=e.target.closest('[data-mv]'),dy=e.target.closest('[data-day]'),co=e.target.closest('[data-cor]');
    if(mv)return calendar(new Date(y,mo+ +mv.dataset.mv,1));
    if(dy){sel=dy.dataset.day;draw()}
    if(co){
      const s=ss.find(x=>x.id===co.dataset.cor),c=D.classes.find(x=>x.id===s.classId),reason=prompt('Why should this be corrected?');
      if(!reason||!reason.trim())return;
      try{
        await F.setDoc(F.doc(db,'corrections',s.id+'_'+uid),{sessionId:s.id,classId:s.classId,teacherUid:c.tuid,studentUid:uid,roll:me.id,name:me.name,subject:c.subject,date:s.date,reason:reason.trim().slice(0,200),status:'pending',createdAt:F.serverTimestamp()});
        cs[s.id+'_'+uid]={status:'pending'};CA.toast('Correction requested');draw();
      }catch(err){CA.toast('Failed: '+(err.code||err.message),'bad')}
    }
  };
  draw();
}
/* ---------- student: low-attendance alert (below 75%, at least 3 classes) ---------- */
function lowAlert(){
  const me=CA.current('student').user,day=new Date().toDateString();
  const low=CA.db().classes.filter(c=>c.fb).map(c=>({c,t:CA.tally(me.id,c.id)})).filter(x=>x.t.t>=3&&x.t.pct<75);
  if(!low.length||sessionStorage.getItem('fbAlert')===day)return;
  const msg=low.map(x=>x.c.subject+' '+Math.round(x.t.pct)+'% — '+CA.advice(x.t.p,x.t.t)).join('\n');
  const el=document.createElement('div');
  el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:40;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:var(--bad-soft);color:var(--bad);font-size:13px;font-weight:600;display:flex;gap:10px;align-items:flex-start';
  el.innerHTML='<div style="flex:1"><b>Low attendance</b><br>'+low.map(x=>esc(x.c.subject)+' '+Math.round(x.t.pct)+'% — '+esc(CA.advice(x.t.p,x.t.t))).join('<br>')+(window.Notification&&Notification.permission==='default'?'<br><u data-n>Enable phone alerts</u>':'')+'</div><button data-x style="border:0;background:none;color:inherit;font-size:18px">×</button>';
  el.onclick=e=>{if(e.target.closest('[data-x]')){sessionStorage.setItem('fbAlert',day);el.remove()}if(e.target.closest('[data-n]'))Notification.requestPermission()};
  document.body.appendChild(el);
  if(window.Notification&&Notification.permission==='granted'&&localStorage.getItem('fbNotif')!==day){localStorage.setItem('fbNotif',day);new Notification('Low attendance',{body:msg})}
}
function watchBadge(){
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),n=[0,0];
  ['enrollments','corrections'].forEach((c,k)=>F.onSnapshot(F.query(F.collection(db,c),F.where('teacherUid','==',uid)),s=>{
    n[k]=s.docs.filter(d=>d.data().status==='pending').length;FBM.n=n[0]+n[1];
    document.querySelectorAll('[data-badge]').forEach(x=>{x.textContent=FBM.n;x.hidden=!FBM.n});
  },()=>{}));
}
window.FBM={n:0,
  openClasses:t=>teacherPanel(null,t),openEnroll:()=>studentPanel(),openCalendar:()=>calendar(),
  async teacher(){await FBT.ready;try{watchBadge();if(await sync('teacher'))return location.reload();await teacherSessions()}catch(e){console.warn(e)}},
  async student(){await FBT.ready;try{if(await sync('student'))return location.reload();await studentSessions();lowAlert()}catch(e){console.warn(e)}}
};
