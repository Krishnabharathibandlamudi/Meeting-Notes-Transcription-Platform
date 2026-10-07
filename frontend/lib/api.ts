export const API=process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
export const WS_BASE=process.env.NEXT_PUBLIC_WS_URL || API.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
export async function api<T>(path:string, options?:RequestInit):Promise<T>{const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(options?.headers||{})},cache:'no-store'});if(!r.ok){const e=await r.json().catch(()=>({detail:'Request failed'}));throw new Error(e.detail||'Request failed')}return r.json()}
export const fmtTime=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
export const fmtDuration=(s:number)=>`${Math.floor(s/60)}m`;
