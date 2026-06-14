import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import nodemailer from 'nodemailer';
const E=process.env;
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const SECRET=E.AUTH_SECRET||'dev';
const hashSenha=(p,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+'$'+crypto.pbkdf2Sync(String(p),salt,200000,32,'sha256').toString('base64');};
const gerarToken=(d,ttl=86400)=>{const raw=Buffer.from(JSON.stringify({d,exp:Math.floor(Date.now()/1000)+ttl})).toString('base64url');return raw+'.'+crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');};
const store=()=>getStore({name:'delfos-users',consistency:'strong'});
const getUser=async e=>{try{return await store().get(e,{type:'json'});}catch{return null;}};
const setUser=async(e,d)=>{await store().setJSON(e,d);};
const smtpOk=()=>!!(E.SMTP_HOST&&E.SMTP_USER&&E.SMTP_PASS);
async function enviar(to,s,html){const port=+(E.SMTP_PORT||587);const t=nodemailer.createTransport({host:E.SMTP_HOST,port,secure:port===465,auth:{user:E.SMTP_USER,pass:E.SMTP_PASS}});await t.sendMail({from:E.EMAIL_FROM||'Delfos EchoFlow <no-reply@delfos>',to,subject:s,html});}
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  let b={};try{b=await req.json();}catch{}
  const nome=(b.nome||'').trim(),email=(b.email||'').toLowerCase().trim();
  if(!nome)return json({detail:'Informe o nome completo.'},400);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json({detail:'E-mail inválido.'},400);
  if((b.senha||'').length<8)return json({detail:'A senha deve ter ao menos 8 caracteres.'},400);
  const ex=await getUser(email);if(ex&&ex.ativo)return json({detail:'Já existe uma conta ativa para este e-mail.'},409);
  await setUser(email,{nome,crm:(b.crm||'').trim(),senha:hashSenha(b.senha),ativo:false,criado:Date.now()});
  const link=(E.APP_BASE_URL||E.URL||'')+'/confirmar.html?token='+gerarToken({email,acao:'confirmar'},86400);
  if(smtpOk())await enviar(email,'Confirme seu e-mail · Delfos EchoFlow','<p>Olá, '+nome+'.</p><p>Confirme seu e-mail:</p><p><a href="'+link+'">Confirmar e-mail</a></p><p>'+link+'</p>');
  const resp={ok:true,email_enviado:smtpOk(),mensagem:'Enviamos um link de confirmação para o seu e-mail.'};
  if(!smtpOk())resp.dev_link=link;return json(resp);
};
export const config={path:'/auth/cadastro'};
