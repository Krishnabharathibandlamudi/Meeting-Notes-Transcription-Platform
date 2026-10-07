"use client";
import {useState} from 'react';
import {ArrowRight,CheckCircle2,LockKeyhole,Mic2,Sparkles,Video} from 'lucide-react';
import {useRouter} from 'next/navigation';

export default function LoginPage(){
 const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 const submit=(e:React.FormEvent)=>{e.preventDefault();setError('');setLoading(true);setTimeout(()=>{if(!email||!password){setError('Enter your email and password to continue.');setLoading(false);return}localStorage.setItem('ff-demo-user',email);router.push('/');},450)};
 return <main className="auth-shell">
   <section className="auth-art hidden md:block"><div className="auth-grid"/><div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
     <div><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur"><Mic2 size={21}/></div><span className="text-2xl font-extrabold tracking-tight">fireflies<span className="text-pink-200">.</span></span></div>
       <div className="mt-20 max-w-xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15"><Sparkles size={14}/> AI-powered meeting workspace</div><h1 className="text-5xl font-black leading-[1.05] tracking-tight lg:text-6xl">Turn every conversation into <span className="text-pink-100">clear next steps.</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-white/75">Capture meetings, explore transcripts, ask your AI assistant questions and keep action items moving.</p></div>
       <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3"><Feature icon={<Video size={16}/>} text="Live rooms"/><Feature icon={<Sparkles size={16}/>} text="AI insights"/><Feature icon={<CheckCircle2 size={16}/>} text="Action items"/></div>
     </div><p className="text-xs text-white/55">A polished Fireflies-style workspace demo.</p>
   </div></section>
   <section className="flex items-center justify-center px-5 py-10 lg:px-10"><div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3 md:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-white"><Mic2 size={18}/></div><span className="text-xl font-extrabold">fireflies<span className="gradient-text">.</span></span></div>
      <div className="auth-card">
        <div className="mb-8"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl brand-gradient text-white shadow-lg shadow-purple-200/40"><LockKeyhole size={21}/></div><h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2><p className="mt-2 text-sm leading-6 text-muted">Sign in to your meeting workspace and pick up where you left off.</p></div>
        <form onSubmit={submit} className="space-y-5"><label className="block text-xs font-bold">Email address<input className="auth-input mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label className="block text-xs font-bold">Password<input className="auth-input mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
          {error&&<p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">{error}</p>}
          <button disabled={loading} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-200/30 transition hover:-translate-y-0.5 disabled:opacity-60">{loading?'Signing in...':'Sign in'}<ArrowRight size={16}/></button>
        </form>
        <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-line border-t border-line"/><span className="text-[11px] text-muted">DEMO MODE</span><div className="h-px flex-1 border-t border-line"/></div>
        <button onClick={()=>{localStorage.setItem('ff-demo-user','demo@fireflies.local');router.push('/')}} className="w-full rounded-xl border border-line bg-soft px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">Continue as demo user</button>
        <p className="mt-5 text-center text-[11px] leading-5 text-muted">Authentication is mocked for this assignment. No real account is created.</p>
      </div><button onClick={()=>router.push('/')} className="mx-auto mt-5 block text-xs font-semibold text-muted hover:text-main">← Back to workspace</button>
   </div></section>
 </main>
}
function Feature({icon,text}:{icon:React.ReactNode;text:string}){return <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold ring-1 ring-white/10 backdrop-blur">{icon}<span>{text}</span></div>}
