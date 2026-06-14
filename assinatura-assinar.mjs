import crypto from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const E=process.env;
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const VB=E.VIDAAS_BASE_URL||'https://certificado.vidaas.com.br';
const pkce=()=>{const v=crypto.randomBytes(40).toString('base64url');return [v,crypto.createHash('sha256').update(v).digest('base64url')];};
const wrap=(s,n)=>{const o=[];let l='';for(const w of String(s).split(' ')){if((l+w).length>n){o.push(l.trim());l='';}l+=w+' ';}o.push(l.trim());return o.length?o:[''];};
async function pdf(cab,corpo,rod){const doc=await PDFDocument.create();let pg=doc.addPage([595,842]);const f=await doc.embedFont(StandardFonts.Helvetica);let y=800;const d=(t,sz=11)=>{for(const ln of String(t||'').split('\n'))for(const w of wrap(ln,92)){if(y<50){pg=doc.addPage([595,842]);y=800;}pg.drawText(w,{x:50,y,size:sz,font:f});y-=sz+4;}y-=10;};d(cab,11);d(corpo,11);d(rod,9);return Buffer.from(await doc.save());}
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  const CID=E.VIDAAS_CLIENT_ID,CS=E.VIDAAS_CLIENT_SECRET;
  if(!(CID&&CS))return json({detail:'VIDaaS não configurado.'},503);
  let b={};try{b=await req.json();}catch{}
  const cpf=String(b.cpf||'').replace(/\D/g,'');if(!cpf)return json({detail:'Informe o CPF.'},400);
  try{
    const [verifier,challenge]=pkce();
    const ud=await (await fetch(VB+'/v0/oauth/user-discovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,user_cpf_cnpj:'CPF',val_cpf_cnpj:cpf})})).json();
    if(ud.status!=='S')return json({detail:'Sem certificado válido para o CPF.'},400);
    const qs=new URLSearchParams({client_id:CID,code_challenge:challenge,code_challenge_method:'S256',response_type:'code',scope:'single_signature',login_hint:cpf,redirect_uri:'push://'});
    const az=await (await fetch(VB+'/v0/oauth/authorize?'+qs)).text();
    const code=az.includes('code=')?az.split('code=')[1].trim():az.trim();
    let at=null;const fim=Date.now()+9000;
    while(Date.now()<fim){const a=await (await fetch(VB+'/valid/api/v1/trusted-services/authentications?code='+code)).json();if(a.authorizationToken){at=a.authorizationToken;break;}await new Promise(r=>setTimeout(r,1200));}
    if(!at)return json({detail:'Autorização não recebida a tempo. Autorize mais rápido no app VIDaaS.'},504);
    const tk=await (await fetch(VB+'/v0/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:CID,client_secret:CS,code:at,code_verifier:verifier})})).json();
    if(!tk.access_token)return json({detail:'Falha ao obter token VIDaaS.'},502);
    const pf=await pdf(b.cabecalho,b.corpo,b.rodape);
    const sg=await (await fetch(VB+'/v0/oauth/signature',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+tk.access_token},body:JSON.stringify({hashes:[{id:'laudo',alias:'laudo.pdf',hash:crypto.createHash('sha256').update(pf).digest('base64'),hash_algorithm:'2.16.840.1.101.3.4.2.1',signature_format:'PAdES_AD_RT',padding_method:'PKCS1V1_5',base64_content:pf.toString('base64')}]})})).json();
    const ass=sg.signatures&&sg.signatures[0]&&sg.signatures[0].raw_signature;
    if(!ass)return json({detail:'Assinatura não retornada.'},502);
    return json({ok:true,pdf_assinado_b64:ass.replace(/\r\n/g,'')});
  }catch(e){return json({detail:'Falha VIDaaS: '+e.message},502);}
};
export const config={path:'/assinatura/assinar'};
