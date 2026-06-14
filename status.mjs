const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
export default async ()=>json({deepgram:!!process.env.DEEPGRAM_API_KEY,claude:!!process.env.ANTHROPIC_API_KEY,vidaas:!!(process.env.VIDAAS_CLIENT_ID&&process.env.VIDAAS_CLIENT_SECRET)});
export const config={path:'/integracoes/status'};
