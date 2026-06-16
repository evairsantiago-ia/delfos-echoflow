// Atualiza nome/CRM do usuário autenticado. Path: /auth/perfil
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const SECRET=process.env.AUTH_SECRET||'dev';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const lerToken=t=>{try{const[raw,sig]=String(t).split('.');const e=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');
  if(sig.length!==e.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(e)))return null;
  const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(p.exp<Math.floor(Date.now()/1000))return null;return p.d;}catch{return null;}};
const getTok=req=>{const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):'';};
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  const d=lerToken(getTok(req)); if(!d||!d.email)return json({detail:'Não autenticado'},401);
  let b={};try{b=await req.json();}catch{}
  const nome=(b.nome||'').trim(); if(!nome)return json({detail:'Informe o nome.'},400);
  const store=getStore({name:'delfos-users',consistency:'strong'});
  const u=await store.get(d.email,{type:'json'}).catch(()=>null);
  if(!u)return json({detail:'Conta não encontrada.'},404);
  u.nome=nome; u.crm=(b.crm||'').trim();
  await store.setJSON(d.email,u);
  return json({ok:true,nome:u.nome,crm:u.crm});
};
export const config={path:'/auth/perfil'};
