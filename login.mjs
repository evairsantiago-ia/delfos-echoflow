import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const hashSenha=(p,salt)=>salt+'$'+crypto.pbkdf2Sync(String(p),salt,200000,32,'sha256').toString('base64');
const verifica=(p,arm)=>{try{const s=String(arm).split('$')[0];const c=hashSenha(p,s);return c.length===arm.length&&crypto.timingSafeEqual(Buffer.from(c),Buffer.from(arm));}catch{return false;}};
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  let b={};try{b=await req.json();}catch{}
  const u=await getStore({name:'delfos-users',consistency:'strong'}).get((b.email||'').toLowerCase().trim(),{type:'json'}).catch(()=>null);
  if(!u||!verifica(b.senha,u.senha))return json({detail:'E-mail ou senha incorretos.'},401);
  if(!u.ativo)return json({detail:'Confirme seu e-mail antes de entrar.'},403);
  return json({ok:true,nome:u.nome});
};
export const config={path:'/auth/login'};
