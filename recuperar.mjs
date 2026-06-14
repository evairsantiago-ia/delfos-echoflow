import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import nodemailer from 'nodemailer';
const E=process.env;
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const SECRET=E.AUTH_SECRET||'dev';
const gerarToken=(d,ttl=3600)=>{const raw=Buffer.from(JSON.stringify({d,exp:Math.floor(Date.now()/1000)+ttl})).toString('base64url');return raw+'.'+crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');};
const smtpOk=()=>!!(E.SMTP_HOST&&E.SMTP_USER&&E.SMTP_PASS);
async function enviar(to,s,html){const port=+(E.SMTP_PORT||587);const t=nodemailer.createTransport({host:E.SMTP_HOST,port,secure:port===465,auth:{user:E.SMTP_USER,pass:E.SMTP_PASS}});await t.sendMail({from:E.EMAIL_FROM||'Delfos EchoFlow <no-reply@delfos>',to,subject:s,html});}
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  let b={};try{b=await req.json();}catch{}
  const email=(b.email||'').toLowerCase().trim();
  const resp={ok:true,mensagem:'Se houver uma conta para este e-mail, enviamos o link de redefinição.'};
  const u=await getStore({name:'delfos-users',consistency:'strong'}).get(email,{type:'json'}).catch(()=>null);
  if(u){const link=(E.APP_BASE_URL||E.URL||'')+'/redefinir.html?token='+gerarToken({email,acao:'redefinir'},3600);
    if(smtpOk())await enviar(email,'Redefinir senha · Delfos EchoFlow','<p>Redefina sua senha:</p><p><a href="'+link+'">Redefinir senha</a></p><p>'+link+'</p>');
    if(!smtpOk())resp.dev_link=link;}
  return json(resp);
};
export const config={path:'/auth/recuperar'};
