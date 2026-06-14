import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
const SECRET=process.env.AUTH_SECRET||'dev';
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const hashSenha=(p,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+'$'+crypto.pbkdf2Sync(String(p),salt,200000,32,'sha256').toString('base64');};
const verifica=(p,arm)=>{try{const s=String(arm).split('$')[0];const h=hashSenha(p,s);return h.length===arm.length&&crypto.timingSafeEqual(Buffer.from(h),Buffer.from(arm));}catch{return false;}};
const lerToken=t=>{try{const[raw,sig]=String(t).split('.');const e=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');if(sig.length!==e.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(e)))return null;const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(p.exp<Math.floor(Date.now()/1000))return null;return p.d;}catch{return null;}};
function getTok(req){const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7):'';}
const store=()=>getStore({name:'delfos-users',consistency:'strong'});
export default async (req)=>{
  if(req.method!=='POST')return json({detail:'Método inválido'},405);
  const d=lerToken(getTok(req));
  if(!d||!d.email)return json({detail:'Não autenticado'},401);
  let b={};try{b=await req.json();}catch{}
  if((b.nova||'').length<8)return json({detail:'A nova senha deve ter ao menos 8 caracteres.'},400);
  const u=await store().get(d.email,{type:'json'}).catch(()=>null);
  if(!u)return json({detail:'Conta não encontrada.'},404);
  if(!verifica(b.atual,u.senha))return json({detail:'Senha atual incorreta.'},400);
  u.senha=hashSenha(b.nova);await store().setJSON(d.email,u);
  return json({ok:true,mensagem:'Senha alterada com sucesso.'});
};
export const config={path:'/auth/alterar-senha'};
