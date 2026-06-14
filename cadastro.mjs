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
  const ex=await getUser(email);if(ex&&ex.ativo)return json({detail:'Já existe uma conta para este e-mail. Use "Entrar" ou "Recuperar senha".'},409);
  // Conta ativa imediatamente — o login funciona logo após o cadastro.
  await setUser(email,{nome,crm:(b.crm||'').trim(),senha:hashSenha(b.senha),ativo:true,criado:Date.now()});
  // E-mail de boas-vindas/confirmação (não bloqueia o acesso).
  const link=(E.APP_BASE_URL||E.URL||'')+'/login.html';
  if(smtpOk()){try{await enviar(email,'Conta criada · Delfos EchoFlow','<p>Olá, '+nome+'.</p><p>Sua conta na Delfos EchoFlow foi criada e já está ativa.</p><p>Acesse: <a href="'+link+'">'+link+'</a></p>');}catch(_){}}
  return json({ok:true,ativa:true,email_enviado:smtpOk(),mensagem:'Conta criada e ativada. Você já pode entrar.'});
};
export const config={path:'/auth/cadastro'};
