const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const B='https://api.deepgram.com/v1';
export default async ()=>{
  const key=process.env.DEEPGRAM_API_KEY;
  if(!key)return json({detail:'Deepgram não configurado.'},503);
  try{let pid=process.env.DEEPGRAM_PROJECT_ID;
    if(!pid){const p=await (await fetch(B+'/projects',{headers:{Authorization:'Token '+key}})).json();pid=p.projects&&p.projects[0]&&p.projects[0].project_id;}
    if(!pid)return json({detail:'Nenhum projeto Deepgram.'},502);
    const d=await (await fetch(B+'/projects/'+pid+'/keys',{method:'POST',headers:{Authorization:'Token '+key,'content-type':'application/json'},body:JSON.stringify({comment:'delfos temp',scopes:['usage:write'],time_to_live_in_seconds:300})})).json();
    if(!d.key)return json({detail:'Falha ao criar chave.'},502);
    return json({key:d.key,model:process.env.DEEPGRAM_MODEL||'nova-3',ttl:300});
  }catch(e){return json({detail:'Erro Deepgram: '+e.message},502);}
};
export const config={path:'/stt/token'};
