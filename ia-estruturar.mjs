const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const SYS='Você é o motor de estruturação de laudos de US da Delfos EchoFlow, PT-BR. ORGANIZA o que o médico ditou na máscara. NÃO diagnostica, NÃO inventa, NÃO calcula. "Normal"->expande. Insere valores já calculados. Lacuna->[CAMPO PENDENTE]. Conclui com "CONCLUSÃO:". Devolve só o laudo.';
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  const key=process.env.ANTHROPIC_API_KEY;
  if(!key)return json({detail:'Claude não configurado.'},503);
  let b={};try{b=await req.json();}catch{}
  try{
    const d=await (await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL_PADRAO||'claude-haiku-4-5-20251001',max_tokens:1600,temperature:0.2,system:SYS,messages:[{role:'user',content:JSON.stringify({tipo_exame:b.tipo_exame,mascara:b.mascara,valores_calculados:b.valores_calculados||{},transcricao:b.transcricao||''})}]})})).json();
    if(d.error)return json({detail:'IA: '+d.error.message},502);
    return json({laudo:(d.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('').trim()});
  }catch(e){return json({detail:'Erro na IA: '+e.message},502);}
};
export const config={path:'/ia/estruturar'};
