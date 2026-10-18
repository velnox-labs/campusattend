/* CampusAttend — Firebase layer (teacher/student registration, approvals, admin helpers).
   Firestore: teachers/{uid}.status = pending|approved|rejected|terminated
              students/{uid}.status = active|terminated
              classes/{id}, enrollments/{studentUid_classId}.status = pending|approved|rejected, admins/{uid} */
import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import*as FS from'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ====== PASTE YOUR FIREBASE CONFIG HERE ====== */
const firebaseConfig={
  apiKey:'AIzaSyBcuMyiigUvamYBa-mWCo6gsstaDciIzSc',
  authDomain:'csjmu-campusattend.firebaseapp.com',
  projectId:'csjmu-campusattend',
  storageBucket:'csjmu-campusattend.firebasestorage.app',
  messagingSenderId:'66111082447',
  appId:'1:66111082447:web:359d1b6d38c9806b160cba'
};
/* ============================================= */

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=FS.getFirestore(app);
const mail=(id,p)=>(p||'')+String(id).trim().toLowerCase().replace(/[^a-z0-9._-]/g,'')+'@campusattend.app';
const ready=new Promise(r=>{const u=onAuthStateChanged(auth,x=>{u();r(x)})});
const me=(col,ok)=>async(id,pw,pre)=>{
  const c=await signInWithEmailAndPassword(auth,mail(id,pre),pw);
  const s=await FS.getDoc(FS.doc(db,col,c.user.uid)),d=s.exists()?s.data():null;
  if(!d||d.status!==ok){const status=d?d.status:'pending';await signOut(auth);throw{code:'status',status}}
  return d;
};

window.FBT={
  db,f:FS,ready,
  configured:()=>!firebaseConfig.apiKey.startsWith('YOUR_'),
  uid:()=>auth.currentUser&&auth.currentUser.uid,
  async register(o){
    const c=await createUserWithEmailAndPassword(auth,mail(o.empId),o.password);
    await FS.setDoc(FS.doc(db,'teachers',c.user.uid),{name:o.name,empId:o.empId,dept:o.dept,designation:o.designation,status:'pending',createdAt:FS.serverTimestamp()});
    await signOut(auth);
  },
  async registerStudent(o){
    const c=await createUserWithEmailAndPassword(auth,mail(o.roll,'s.'),o.password);
    await FS.setDoc(FS.doc(db,'students',c.user.uid),{name:o.name,roll:o.roll,cohort:o.cohort,status:'active',createdAt:FS.serverTimestamp()});
    await signOut(auth);
  },
  login:(id,pw)=>me('teachers','approved')(id,pw,''),
  loginStudent:(id,pw)=>me('students','active')(id,pw,'s.'),
  /* admin: real email + password; needs a doc admins/{uid} (create in console) */
  admin(cb){onAuthStateChanged(auth,async u=>{
    if(!u)return cb(false);
    const s=await FS.getDoc(FS.doc(db,'admins',u.uid)).catch(()=>null);
    if(s&&s.exists())cb(true);else{await signOut(auth);cb(false)}
  })},
  adminLogin:(e,p)=>signInWithEmailAndPassword(auth,e,p),
  /* cb(false) when signed out or status changes from `ok` */
  watch(cb,col='teachers',ok='approved'){
    let un=null;
    onAuthStateChanged(auth,u=>{
      if(un){un();un=null}
      if(!u){cb(false);return}
      un=FS.onSnapshot(FS.doc(db,col,u.uid),s=>cb(!!s.exists()&&s.data().status===ok),()=>{});
    });
  },
  async cohorts(){const s=await FS.getDocs(FS.collection(db,'cohorts'));return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}))},
  logout:()=>signOut(auth)
};

if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
