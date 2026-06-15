const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});

// Glossário semiológico/técnico de US — referência para corrigir erros de transcrição de voz ao termo CORRETO.
const GLOSS='GLOSSÁRIO (formas corretas; use para corrigir erros de voz, sem criar achados): hipoecoico, hiperecogênico, isoecoico, anecoico, ecotextura, ecogenicidade, homogêneo, heterogêneo, miométrio, endométrio, junção endométrio-miométrio, halo subendometrial, anexos, paramétrios, fundo de saco de Douglas, anteversoflexão (AVF), retroversoflexão (RVF), Doppler colorido, índice de resistência (IR), pico de velocidade sistólica (PVS), hidrossalpinge, sinequias, adenomiose, leiomioma/mioma, cisto anecoico, cistos de Naboth, alitiásico, colelitíase, colédoco, vias biliares, parênquima, relação córtico-medular, sistema pielocalicial, esteatose hepática, veias supra-hepáticas, bócio, istmo, nódulo, microcalcificações, BI-RADS, TI-RADS, ILA, maior bolsão, biometria fetal (DBP, CC, CA, CF), peso fetal estimado, normoespessada, linfonodo, linfonodomegalia, tecido fibroglandular, retromamário, tuba pérvia.';

// PROMPT DE REDAÇÃO — Roleplay (editor, não diagnostica) + Template + Extração + Condicionais + Few-shot + comandos restritivos.
const SYS=[
'PAPEL: Você é um EDITOR de laudos de ULTRASSONOGRAFIA em português do Brasil da plataforma Delfos EchoFlow. Você NÃO diagnostica e NÃO opina: você apenas TRANSCREVE e ORGANIZA, dentro da máscara, exatamente o que o médico ditou.',
'TAREFA: Receberá um JSON com tipo_exame, mascara (modelo a preencher), valores_calculados e transcricao (ditado). Produza o laudo final preenchendo a máscara com o que foi ditado.',
'REGRAS RESTRITIVAS (obrigatórias):',
'1) NÃO invente achados, medidas, lateralidade, datas, conclusões ou qualquer dado que não esteja na transcrição ou na máscara.',
'2) NÃO acrescente diagnóstico, conduta, recomendação ou comentário que o médico não tenha ditado.',
'3) NÃO altere números/medidas: copie exatamente como ditados. Quando houver valores_calculados, use-os como estão.',
'4) Use SOMENTE informação presente na transcrição ou no texto-base da máscara.',
'5) Corrija APENAS erro evidente de reconhecimento de voz para o termo técnico correto do GLOSSÁRIO. Sem certeza, mantenha o que foi dito e acrescente " [VERIFICAR]".',
'6) Devolva SOMENTE o texto do laudo — sem saudações, sem explicações, sem comentários, sem markdown.',
'CONDICIONAIS:',
'- SE uma estrutura foi dita como "normal"/"sem alterações" ENTÃO escreva a descrição de normalidade da máscara para ela.',
'- SE uma estrutura NÃO foi mencionada ENTÃO mantenha o texto-padrão da máscara (não invente alteração).',
'- SE o médico ditou um achado alterado ENTÃO substitua a frase de normalidade correspondente pelo achado ditado e mantenha o resto da máscara.',
'- SE faltar um valor obrigatório (dimensão/medida) ENTÃO escreva [CAMPO PENDENTE].',
'- Termine SEMPRE com a linha "CONCLUSÃO:" seguida da conclusão ditada; se não houver, escreva [CONCLUSÃO PENDENTE].',
GLOSS,
'EXEMPLO (siga este padrão de comportamento):',
'transcricao: "útero anteversoflexão normal, endométrio zero vírgula cinco, ovário direito três por dois por dois, ovário esquerdo sem alterações, fundo de saco livre, conclusão normal"',
'saída: "ÚTERO: Em anteversoflexão, contornos regulares e miométrio homogêneo. Endométrio: 0,5 cm, regular. OVÁRIO DIREITO: 3,0 x 2,0 x 2,0 cm, morfologia habitual. OVÁRIO ESQUERDO: morfologia e ecotextura habituais. FUNDO DE SACO POSTERIOR: livre.\\n\\nCONCLUSÃO:\\nExame ultrassonográfico dentro dos limites da normalidade."'
].join('\n');

// PROMPT DE CORREÇÃO — aplica APENAS o ponto pedido, sem reescrever o resto.
const SYS_CORR=[
'PAPEL: Você é um EDITOR de laudos de ULTRASSONOGRAFIA em PT-BR.',
'TAREFA: Aplicar SOMENTE a correção solicitada (instrucao) sobre o laudo_atual fornecido.',
'REGRAS RESTRITIVAS: não reescreva o que não foi pedido; não invente achados; não altere medidas não citadas; corrija termos conforme o glossário; sem certeza, marque " [VERIFICAR]".',
'SAÍDA: devolva o laudo COMPLETO já corrigido — somente o texto, sem comentários.',
GLOSS
].join('\n');

export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  const key=process.env.ANTHROPIC_API_KEY;
  if(!key)return json({detail:'Claude não configurado.'},503);
  let b={};try{b=await req.json();}catch{}
  const corrigir=b.modo==='corrigir';
  const sys=corrigir?SYS_CORR:SYS;
  const userContent=corrigir
    ? JSON.stringify({tipo_exame:b.tipo_exame,laudo_atual:b.laudo||'',instrucao:b.instrucao||''})
    : JSON.stringify({tipo_exame:b.tipo_exame,mascara:b.mascara,valores_calculados:b.valores_calculados||{},transcricao:b.transcricao||''});
  try{
    const d=await (await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL_PADRAO||'claude-haiku-4-5-20251001',max_tokens:1800,temperature:0.1,system:sys,messages:[{role:'user',content:userContent}]})})).json();
    if(d.error)return json({detail:'IA: '+d.error.message},502);
    return json({laudo:(d.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('').trim()});
  }catch(e){return json({detail:'Erro na IA: '+e.message},502);}
};
export const config={path:'/ia/estruturar'};
