import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const SECRET=process.env.AUTH_SECRET||'dev';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const hashSenha=(p,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+'$'+crypto.pbkdf2Sync(String(p),salt,200000,32,'sha256').toString('base64');};
const lerToken=t=>{try{const[raw,sig]=String(t).split('.');const e=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');if(sig.length!==e.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(e)))return null;const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(p.exp<Math.floor(Date.now()/1000))return null;return p.d;}catch{return null;}};
const store=()=>getStore({name:'delfos-users',consistency:'strong'});
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  let b={};try{b=await req.json();}catch{}
  const d=lerToken(b.token);
  if(!d||d.acao!=='redefinir')return json({detail:'Link inválido ou expirado.'},400);
  if((b.senha||'').length<8)return json({detail:'A senha deve ter ao menos 8 caracteres.'},400);
  const u=await store().get(d.email,{type:'json'}).catch(()=>null);
  if(!u)return json({detail:'Conta não encontrada.'},404);
  u.senha=hashSenha(b.senha);await store().setJSON(d.email,u);
  return json({ok:true,mensagem:'Senha redefinida com sucesso.'});
};
export const config={path:'/auth/redefinir'};
