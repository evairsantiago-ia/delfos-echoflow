import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const SECRET=process.env.AUTH_SECRET||'dev';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const lerToken=t=>{try{const[raw,sig]=String(t).split('.');const e=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');if(sig.length!==e.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(e)))return null;const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(p.exp<Math.floor(Date.now()/1000))return null;return p.d;}catch{return null;}};
function getTok(req){const h=req.headers.get('authorization')||'';if(h.startsWith('Bearer '))return h.slice(7);return new URL(req.url).searchParams.get('token')||'';}
export default async (req)=>{
  const d=lerToken(getTok(req));
  if(!d||!d.email)return json({detail:'Não autenticado'},401);
  const u=await getStore({name:'delfos-users',consistency:'strong'}).get(d.email,{type:'json'}).catch(()=>null);
  if(!u||!u.ativo)return json({detail:'Sessão inválida'},401);
  return json({email:d.email,nome:u.nome,crm:u.crm||''});
};
export const config={path:'/auth/me'};
