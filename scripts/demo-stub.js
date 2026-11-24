/* DEMONSTRAÇÃO: simula o Supabase no navegador (localStorage). Nada é enviado a servidor algum. */
(function(){
 const K='ampara_demo_v2',now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID();
 const seed=()=>({users:{},contato:[],contratacoes:[],cuidadores:[
  {id:uid(),nome:'Maria da Silva Souza',cidade:'Criciúma',esp:['Enfermeiro(a)','Cuidados paliativos'],exp:8,bio:'Enfermeira com experiência em cuidados paliativos e pós-operatório em casa.',p_hora:55,p_8:300,p_12:420,p_24:650,status:'verificado',created_at:'2026-11-01T10:00:00Z'},
  {id:uid(),nome:'João Pereira Lima',cidade:'Criciúma',esp:['Técnico em enfermagem','Acompanhante hospitalar'],exp:5,bio:'Técnico em enfermagem. Acompanhamento hospitalar e curativos.',p_hora:40,p_8:220,p_12:280,p_24:400,status:'verificado',created_at:'2026-11-02T10:00:00Z'},
  {id:uid(),nome:'Ana Paula Rocha',cidade:'Içara',esp:['Cuidador com curso'],exp:3,bio:'Curso de cuidador de idosos. Higiene, alimentação e companhia.',p_hora:30,p_8:180,p_12:250,p_24:380,status:'ativo',created_at:'2026-11-05T10:00:00Z'},
  {id:uid(),nome:'Carlos Eduardo Nunes',disponivel:false,cidade:'Forquilhinha',esp:['Cuidador com experiência','Acompanhante hospitalar'],exp:10,bio:'Dez anos cuidando de idosos acamados e com Alzheimer.',p_hora:35,p_8:200,p_12:270,p_24:390,status:'ativo',created_at:'2026-11-08T10:00:00Z'}]});
 let db;try{db=JSON.parse(localStorage.getItem(K))}catch{}
 if(!db)db=seed();
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(db))}catch{}};
 let sess=null;try{sess=JSON.parse(localStorage.getItem(K+'_s'))}catch{}
 const setS=s=>{sess=s;try{s?localStorage.setItem(K+'_s',JSON.stringify(s)):localStorage.removeItem(K+'_s')}catch{}};
 let cb=null;const emit=(e)=>setTimeout(()=>cb&&cb(e,sess),10);
 const from=t=>{
  const q={f:[],ins:null,
   select(){if(q.ins){return{single:async()=>({data:{id:q.ins.id},error:null})}}return q},
   in(c,a){q.f.push(r=>a.includes(r[c]));return q},
   eq(c,v){q.f.push(r=>r[c]==v);return q},
   order(){return q},
   insert(o){const r={...o};
    if(t=='cuidadores'){r.status=r.status||'ativo';r.created_at=now();db.cuidadores.push(r)}
    else if(t=='cuidadores_contato'){db.contato.push(r)}
    else if(t=='contratacoes'){r.id=uid();r.user_id=sess&&sess.user.email;r.pago=false;r.confirmada=false;r.created_at=now();db.contratacoes.push(r)}
    save();q.ins=r;return q},
   then(ok,no){let d;
    if(q.ins)d={error:null,data:null};
    else{let rows=(t=='cuidadores'?db.cuidadores:t=='contratacoes'?db.contratacoes.filter(r=>sess&&r.user_id==sess.user.email):[]).filter(r=>q.f.every(f=>f(r)));
     rows=rows.map(r=>t=='contratacoes'?{...r,cuidadores:{nome:(db.cuidadores.find(c=>c.id==r.cuidador_id)||{}).nome||'Cuidador'}}:{...r});
     rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));d={data:rows,error:null}}
    return Promise.resolve(d).then(ok,no)}};
  return q};
 const ok=()=>({error:null,data:{session:sess}});
 window.supabase={createClient:()=>({from,
  auth:{
   getSession:async()=>({data:{session:sess}}),
   onAuthStateChange:f=>{cb=f;return{data:{subscription:{unsubscribe(){}}}}},
   signUp:async({email,password})=>{if(db.users[email])return{error:null,data:{session:null,user:{identities:[]}}};db.users[email]=password;save();setS({user:{email}});emit('SIGNED_IN');return ok()},
   signInWithPassword:async({email,password})=>{if(db.users[email]!==password)return{error:{message:'Invalid login credentials'}};setS({user:{email}});emit('SIGNED_IN');return ok()},
   signOut:async()=>{setS(null);emit('SIGNED_OUT');return{error:null}},
   resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null})},
  storage:{from:()=>({upload:async()=>({error:null})})}})};
 window.__demo={get db(){return db},save,reset(){try{localStorage.removeItem(K);localStorage.removeItem(K+'_s')}catch{}location.reload()}};
})();
