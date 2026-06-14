import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const SECRET=process.env.AUTH_SECRET||'dev';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const lerToken=t=>{try{const[raw,sig]=String(t).split('.');const e=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');if(sig.length!==e.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(e)))return null;const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(p.exp<Math.floor(Date.now()/1000))return null;return p.d;}catch{return null;}};
const store=()=>getStore('delfos-users');
export default async (req)=>{
  const d=lerToken(new URL(req.url).searchParams.get('token')||'');
  if(!d||d.acao!=='confirmar')return json({detail:'Link inválido ou expirado.'},400);
  const u=await store().get(d.email,{type:'json'}).catch(()=>null);
  if(!u)return json({detail:'Conta não encontrada.'},404);
  u.ativo=true;await store().setJSON(d.email,u);
  return json({ok:true,mensagem:'E-mail confirmado. Conta ativada.'});
};
export const config={path:'/auth/confirmar'};
