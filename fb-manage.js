/* Teacher: add classes + approve per-subject student requests. Student: request subjects.
   Syncs approved data into the local attendance db so the existing screens keep working. */
const esc=s=>CA.esc(s);
const ST={pending:'warn',approved:'ok',rejected:'bad'};
const chip=s=>CA.chip(ST[s]||'neutral',s);
const btn='style="padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font-weight:600"';

function fab(label,fn,bot){
  const b=document.createElement('button');b.textContent=label;b.onclick=fn;
  b.style.cssText='position:fixed;right:14px;bottom:'+(bot||88)+'px;z-index:30;padding:12px 18px;border-radius:99px;background:var(--btn);color:var(--btn-ink);font-weight:700;border:0;box-shadow:0 4px 14px rgba(0,0,0,.28)';
  document.body.appendChild(b);
}
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
function done(b,dirty){b.insertAdjacentHTML('beforeend','<button id="fbdone" class="btn" style="margin-top:14px;width:100%">Done</button>');
  b.querySelector('#fbdone').onclick=()=>dirty.v?location.reload():CA.closeSheet()}

async function teacherPanel(dirty){
  dirty=dirty||{v:false};
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('teacher').user;
  if(!CA.sheetBody())CA.sheet({title:'My classes & requests'});
  const b=CA.sheetBody();b.innerHTML='<p>Loading…</p>';
  const q=c=>F.getDocs(F.query(F.collection(db,c),F.where('teacherUid','==',uid)));
  const [cs,es,rs]=await Promise.all([q('classes'),q('enrollments'),q('corrections')]);
  const crs=rs.docs.map(x=>({id:x.id,...x.data()})).sort((a,c)=>(a.status==='pending'?0:1)-(c.status==='pending'?0:1));
  const cls=cs.docs.map(x=>({id:x.id,...x.data()}));
  const en=es.docs.map(x=>({id:x.id,...x.data()})).sort((a,c)=>(a.status==='pending'?0:1)-(c.status==='pending'?0:1));
  const D=['','Mon','Tue','Wed','Thu','Fri','Sat'];
  b.innerHTML='<h4>Correction requests</h4>'+(crs.length?crs.map(r=>'<div class="card" style="margin:8px 0"><b>'+esc(r.name)+'</b> · <small>'+esc(r.roll)+' · '+esc(r.subject)+' · '+esc(r.date)+'</small><p style="margin:6px 0;color:var(--ink-2)">“'+esc(r.reason)+'”</p>'+(r.status==='pending'?'<button '+btn+' data-cr="approved" data-id="'+r.id+'" data-sid="'+r.sessionId+'" data-roll="'+esc(r.roll)+'">Mark present</button> <button '+btn+' data-cr="rejected" data-id="'+r.id+'">Reject</button>':chip(r.status))+'</div>').join(''):'<p>No correction requests.</p>')+'<h4 style="margin-top:18px">Student requests</h4>'+(en.length?en.map(e=>'<div class="card" style="margin:8px 0;display:flex;gap:8px;align-items:center;justify-content:space-between"><div><b>'+esc(e.name)+'</b><br><small>'+esc(e.roll)+' · '+esc(e.subject)+'</small></div><div style="display:flex;gap:6px;align-items:center">'+
    (e.status==='pending'?'<button '+btn+' data-a="approved" data-id="'+e.id+'">Approve</button><button '+btn+' data-a="rejected" data-id="'+e.id+'">Reject</button>':chip(e.status)+(e.status==='approved'?'<button '+btn+' data-a="rejected" data-id="'+e.id+'">Remove</button>':''))+'</div></div>').join(''):'<p>No requests yet.</p>')+
    '<h4 style="margin-top:18px">My classes</h4>'+(cls.length?cls.map(c=>'<div class="card" style="margin:8px 0;display:flex;justify-content:space-between;align-items:center"><div><b>'+esc(c.subject)+'</b><br><small>'+esc(c.cohort)+' · '+(c.days||[]).map(x=>D[x]).join(', ')+' · '+esc(c.slot)+'</small></div><button '+btn+' data-del="'+c.id+'">Delete</button></div>').join(''):'<p>No classes yet.</p>')+
    '<h4 style="margin-top:18px">Add class</h4><div style="display:grid;gap:8px"><input class="input" id="nc-s" placeholder="Subject e.g. Data Structures"><input class="input" id="nc-c" placeholder="Cohort code e.g. BCA3" style="text-transform:uppercase"><input class="input" id="nc-t" value="10:00 AM" placeholder="Time e.g. 10:00 AM"><div id="nc-d" style="display:flex;flex-wrap:wrap;gap:10px">'+[1,2,3,4,5,6].map(i=>'<label><input type="checkbox" value="'+i+'"> '+D[i]+'</label>').join('')+'</div><button class="btn" id="nc-add">Add class</button></div>';
  b.onclick=async e=>{
    const a=e.target.closest('[data-a]'),x=e.target.closest('[data-del]'),cr=e.target.closest('[data-cr]');
    try{
      if(cr){
        await F.updateDoc(F.doc(db,'corrections',cr.dataset.id),{status:cr.dataset.cr});
        if(cr.dataset.cr==='approved'){const ss=CA.db().sessions.find(x=>x.id===cr.dataset.sid);if(ss){ss.records[cr.dataset.roll]='P';CA.save()}}
      }else if(a){await F.updateDoc(F.doc(db,'enrollments',a.dataset.id),{status:a.dataset.a})}
      else if(x){if(!confirm('Delete this class?'))return;await F.deleteDoc(F.doc(db,'classes',x.dataset.del))}
      else if(e.target.id==='nc-add'){
        const s=b.querySelector('#nc-s').value.trim(),c=b.querySelector('#nc-c').value.trim().toUpperCase(),t=b.querySelector('#nc-t').value.trim();
        const days=[...b.querySelectorAll('#nc-d input:checked')].map(i=>+i.value);
        if(!s||!c||!t||!days.length)return CA.toast('Fill subject, cohort, time and days');
        await F.addDoc(F.collection(db,'classes'),{subject:s,cohort:c,slot:t,days,teacherUid:uid,teacherEmp:me.id,teacherName:me.name,createdAt:F.serverTimestamp()});
      }else return;
      dirty.v=true;await sync('teacher');teacherPanel(dirty);
    }catch(err){CA.toast('Failed: '+(err.code||err.message))}
  };
  done(b,dirty);
}
async function studentPanel(dirty){
  dirty=dirty||{v:false};
  const F=FBT.f,db=FBT.db,uid=FBT.uid(),me=CA.current('student').user;
  if(!CA.sheetBody())CA.sheet({title:'My subjects'});
  const b=CA.sheetBody();b.innerHTML='<p>Loading…</p>';
  const [cs,es]=await Promise.all([
    F.getDocs(F.query(F.collection(db,'classes'),F.where('cohort','==',me.cohort))),
    F.getDocs(F.query(F.collection(db,'enrollments'),F.where('studentUid','==',uid)))]);
  const st={};es.docs.forEach(x=>st[x.data().classId]=x.data().status);
  const cls=cs.docs.map(x=>({id:x.id,...x.data()}));
  b.innerHTML='<p style="color:var(--ink-2)">Cohort: <b>'+esc(me.cohort)+'</b>. Request each subject; its teacher approves.</p>'+(cls.length?cls.map(c=>'<div class="card" style="margin:8px 0;display:flex;justify-content:space-between;align-items:center"><div><b>'+esc(c.subject)+'</b><br><small>'+esc(c.teacherName)+'</small></div>'+(st[c.id]?chip(st[c.id]):'<button '+btn+' data-req="'+c.id+'">Request</button>')+'</div>').join(''):'<p>No classes for your cohort yet.</p>');
  b.onclick=async e=>{
    const r=e.target.closest('[data-req]');if(!r)return;
    const c=cls.find(x=>x.id===r.dataset.req);
    try{
      await F.setDoc(F.doc(db,'enrollments',uid+'_'+c.id),{studentUid:uid,classId:c.id,teacherUid:c.teacherUid,roll:me.id,name:me.name,subject:c.subject,cohort:c.cohort,status:'pending',createdAt:F.serverTimestamp()});
      studentPanel(dirty);
    }catch(err){CA.toast('Failed: '+(err.code||err.message))}
  };
  done(b,dirty);
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
  if(!CA.sheetBody())CA.sheet({title:'Attendance calendar'});
  const b=CA.sheetBody(),ids=D.classes.filter(c=>c.fb).map(c=>c.id);
  const ss=D.sessions.filter(s=>s.status==='closed'&&ids.includes(s.classId)&&s.records[me.id]);
  const cs={};(await F.getDocs(F.query(F.collection(db,'corrections'),F.where('studentUid','==',uid)))).docs.forEach(x=>cs[x.id]=x.data());
  const y=m.getFullYear(),mo=m.getMonth(),n=new Date(y,mo+1,0).getDate(),off=m.getDay(),pad=v=>String(v).padStart(2,'0');
  let sel=null;
  const draw=()=>{
    let h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button '+btn+' data-mv="-1">‹</button><b>'+m.toLocaleString('en',{month:'long'})+' '+y+'</b><button '+btn+' data-mv="1">›</button></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">'+'SMTWTFS'.split('').map(x=>'<small>'+x+'</small>').join('');
    for(let i=0;i<off;i++)h+='<span></span>';
    for(let d=1;d<=n;d++){
      const k=y+'-'+pad(mo+1)+'-'+pad(d),day=ss.filter(s=>s.date===k),p=day.filter(s=>s.records[me.id]==='P').length;
      const c=!day.length?'':p===day.length?'ok':p?'warn':'bad';
      h+='<button data-day="'+k+'" style="padding:9px 0;border-radius:10px;border:1px solid '+(k===sel?'var(--brand)':'var(--line)')+';background:'+(c?'var(--'+c+'-soft)':'var(--surface)')+';color:'+(c?'var(--'+c+')':'var(--ink-2)')+';font-weight:600">'+d+'</button>';
    }
    h+='</div><p style="color:var(--ink-2);font-size:12px">Green: present · Amber: partly · Red: absent. Tap a day.</p>';
    if(sel)h+='<h4>'+sel+'</h4>'+(ss.filter(s=>s.date===sel).map(s=>{
      const c=D.classes.find(x=>x.id===s.classId),A=s.records[me.id]==='A',cr=cs[s.id+'_'+uid];
      return '<div class="card" style="margin:6px 0;display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b>'+esc(c.subject)+'</b><br><small>'+CA.fmtTime(s.startedAt)+'</small></div>'+(A?(cr?chip(cr.status).replace(cr.status,'correction '+cr.status):'<button '+btn+' data-cor="'+s.id+'">Request correction</button>'):CA.chip('ok','Present'))+'</div>'}).join('')||'<p>No class that day.</p>');
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
        cs[s.id+'_'+uid]={status:'pending'};draw();
      }catch(err){CA.toast('Failed: '+(err.code||err.message))}
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
window.FBM={
  async teacher(){fab('Classes',()=>teacherPanel());await FBT.ready;try{if(await sync('teacher'))return location.reload();await teacherSessions()}catch(e){console.warn(e)}},
  async student(){fab('Subjects',()=>studentPanel());fab('Calendar',()=>calendar(),140);await FBT.ready;try{if(await sync('student'))return location.reload();await studentSessions();lowAlert()}catch(e){console.warn(e)}}
};
