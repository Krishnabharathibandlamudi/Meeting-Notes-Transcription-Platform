'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Copy, Mic, MicOff, PhoneOff, Sparkles, Users, Video, VideoOff, Wifi, Send, ShieldCheck} from 'lucide-react';
import {useParams,useRouter} from 'next/navigation';
import {api,fmtTime,WS_BASE} from '@/lib/api';

type Message={id:number;speaker:string;text:string;timestamp_seconds:number;sequence:number;created_at:string};
type Room={token:string;meeting_id:number;title:string;host_name:string;status:'live'|'ended';participants:{id:number;name:string}[];messages:Message[]};
const demoLines:[string,string][]=[
  ['Alex Morgan','Thanks everyone. Let’s align on the product goals and the next sprint priorities.'],
  ['Krishna Bharathi','I think onboarding should be our first priority because the first-session drop-off is still high.'],
  ['Priya Shah','Agreed. We can simplify the first-run experience and add a guided checklist.'],
  ['Alex Morgan','Let’s validate that with customer interviews before we lock the sprint scope.'],
  ['Krishna Bharathi','I’ll prepare the prototype and share the usability findings with the team.'],
  ['Priya Shah','I’ll prepare the interview script and recruit five customers this week.'],
];
export default function RoomPage(){
  const {token}=useParams<{token:string}>(); const router=useRouter();
  const [room,setRoom]=useState<Room|null>(null); const [name,setName]=useState(''); const [joined,setJoined]=useState(false); const [text,setText]=useState('');
  const [mic,setMic]=useState(true); const [camera,setCamera]=useState(false); const [remoteStreams,setRemoteStreams]=useState<Record<string,MediaStream>>({});
  const localVideoRef=useRef<HTMLVideoElement|null>(null); const localStreamRef=useRef<MediaStream|null>(null); const socketRef=useRef<WebSocket|null>(null); const peersRef=useRef<Record<string,RTCPeerConnection>>({}); const [elapsed,setElapsed]=useState(0); const [copied,setCopied]=useState(false); const [ending,setEnding]=useState(false); const [error,setError]=useState('');
  const load=useCallback(async()=>{try{const r=await api<Room>(`/rooms/${token}`);setRoom(r);setElapsed(r.messages.length*8)}catch(e){setError((e as Error).message)}},[token]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!joined||room?.status!=='live')return; const t=setInterval(load,2500); return()=>clearInterval(t)},[joined,room?.status,load]);
  useEffect(()=>{if(!joined||room?.status!=='live')return; const t=setInterval(()=>setElapsed(x=>x+1),1000);return()=>clearInterval(t)},[joined,room?.status]);
  useEffect(()=>{
    if(!joined||!room||room.status!=='live') return;
    let cancelled=false;
    const setup=async()=>{
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});
        if(cancelled)return; localStreamRef.current=stream; if(localVideoRef.current)localVideoRef.current.srcObject=stream;
      }catch{
        // Browsers may block media permission. The shared transcript still works without camera/mic.
      }
      const ws=new WebSocket(`${WS_BASE}/ws/rooms/${token}?name=${encodeURIComponent(name)}`);
      socketRef.current=ws;
      const ensurePeer=(peer:string)=>{
        if(peersRef.current[peer])return peersRef.current[peer];
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
        localStreamRef.current?.getTracks().forEach(t=>pc.addTrack(t,localStreamRef.current!));
        pc.onicecandidate=e=>{if(e.candidate)ws.send(JSON.stringify({type:'candidate',to:peer,candidate:e.candidate}))};
        pc.ontrack=e=>setRemoteStreams(prev=>({...prev,[peer]:e.streams[0]}));
        pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)){pc.close();delete peersRef.current[peer];setRemoteStreams(prev=>{const x={...prev};delete x[peer];return x})}};
        peersRef.current[peer]=pc; return pc;
      };
      ws.onmessage=async event=>{
        const msg=JSON.parse(event.data);
        if(msg.type==='existing-peers'){
          for(const peer of msg.peers as string[]){const pc=ensurePeer(peer);const offer=await pc.createOffer();await pc.setLocalDescription(offer);ws.send(JSON.stringify({type:'offer',to:peer,offer}))}
        } else if(msg.type==='offer'){
          const pc=ensurePeer(msg.from); await pc.setRemoteDescription(msg.offer); const answer=await pc.createAnswer(); await pc.setLocalDescription(answer); ws.send(JSON.stringify({type:'answer',to:msg.from,answer}));
        } else if(msg.type==='answer'){const pc=peersRef.current[msg.from]; if(pc)await pc.setRemoteDescription(msg.answer)}
        else if(msg.type==='candidate'){const pc=peersRef.current[msg.from]; if(pc&&msg.candidate)await pc.addIceCandidate(msg.candidate)}
      };
    };
    setup();
    return()=>{cancelled=true;socketRef.current?.close();Object.values(peersRef.current).forEach(p=>p.close());peersRef.current={};localStreamRef.current?.getTracks().forEach(t=>t.stop());localStreamRef.current=null;setRemoteStreams({})};
  },[joined,room?.status,token,name]);

  useEffect(()=>{localStreamRef.current?.getAudioTracks().forEach(t=>t.enabled=mic);},[mic]);
  useEffect(()=>{localStreamRef.current?.getVideoTracks().forEach(t=>t.enabled=camera);},[camera]);
  const join=async()=>{if(!name.trim())return;try{const r=await api<Room>(`/rooms/${token}/join`,{method:'POST',body:JSON.stringify({name:name.trim()})});setRoom(r);setJoined(true);setError('')}catch(e){setError((e as Error).message)}};
  const send=async()=>{if(!text.trim()||!room)return;try{await api(`/rooms/${token}/messages`,{method:'POST',body:JSON.stringify({speaker:name.trim(),text:text.trim()})});setText('');await load()}catch(e){setError((e as Error).message)}};
  const addDemo=async()=>{if(!room)return;for(const [speaker,line] of demoLines){await api(`/rooms/${token}/messages`,{method:'POST',body:JSON.stringify({speaker,text:line})})}await load()};
  const end=async()=>{if(!room||ending)return;setEnding(true);try{const r=await api<{meeting_id:number}>(`/rooms/${token}/end`,{method:'POST',body:JSON.stringify({generate_demo_summary:true})});router.push(`/meetings/${r.meeting_id}`)}catch(e){setError((e as Error).message)}finally{setEnding(false)}};
  const share=async()=>{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),1600)};
  const participantNames=useMemo(()=>room?.participants.map(p=>p.name).join(', ')||'',[room]);
  if(!room) return <div className="min-h-screen grid place-items-center bg-[#f7f6fa]"><div className="rounded-2xl bg-white p-8 shadow-sm">{error||'Loading meeting room...'}</div></div>;
  if(!joined) return (
    <div className="min-h-screen bg-[#f7f6fa] flex items-center justify-center p-4">
      <div className="w-full max-w-[920px] overflow-hidden rounded-3xl border border-[#e8e5ee] bg-white shadow-xl">
        <div className="grid md:grid-cols-[1.15fr_.85fr]">
          <div className="p-8 md:p-12">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#6c5ce7] text-white"><Mic size={20}/></div>
              <span className="text-xl font-bold">fireflies<span className="text-[#6c5ce7]">.</span></span>
            </div>
            <span className="rounded-full bg-[#f1efff] px-3 py-1 text-xs font-semibold text-[#6558d2]">Live meeting room</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{room.title}</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#777281]">Join with the link shared by the host. The workspace captures the shared conversation and turns it into a searchable transcript and AI meeting recap when the host ends the session.</p>
            <div className="mt-7 flex items-center gap-2 text-xs text-[#777281]"><Users size={15}/>{room.participants.length} people in this room</div>
            <div className="mt-8 max-w-md">
              <label className="text-xs font-bold">Your name</label>
              <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} placeholder="e.g. Krishna Bharathi" className="mt-2 w-full rounded-xl border border-[#e5e2eb] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#dcd6ff]"/>
              <button onClick={join} className="mt-3 w-full rounded-xl bg-[#6c5ce7] py-3 text-sm font-semibold text-white hover:bg-[#5c4fd3]">Join meeting</button>
            </div>
            {error&&<p className="mt-3 text-xs text-red-600">{error}</p>}
          </div>
          <div className="bg-[#f7f5ff] p-8 md:p-10">
            <div className="rounded-2xl border border-white/80 bg-white/70 p-5">
              <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-[#6c5ce7]"/> Built for post-meeting insights</div>
              <div className="mt-5 space-y-4 text-sm text-[#5f5a69]">
                <div><b>Live transcript</b><p className="mt-1 text-xs leading-5 text-[#878191]">Participants can add conversation lines during the demo. A production speech-to-text provider can feed this automatically.</p></div>
                <div><b>AI summary</b><p className="mt-1 text-xs leading-5 text-[#878191]">When the host ends the call, the app creates an AI-style summary, topics, outline and follow-ups.</p></div>
                <div><b>Shareable link</b><p className="mt-1 text-xs leading-5 text-[#878191]">Send the room URL to anyone you want to invite.</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return <div className="min-h-screen bg-[#111018] text-white"><header className="flex h-16 items-center justify-between border-b border-white/10 px-4 md:px-7"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6c5ce7]"><Mic size={17}/></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{room.title}</div><div className="flex items-center gap-2 text-[11px] text-white/50"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Live</span><span>·</span><span>{fmtTime(elapsed)}</span></div></div></div><div className="hidden items-center gap-2 md:flex"><button onClick={share} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/5"><Copy size={14} className="mr-2 inline"/>{copied?'Link copied':'Share invite link'}</button><div className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60">{room.participants.length} participants</div></div><button onClick={end} disabled={ending} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold hover:bg-red-600 disabled:opacity-60"><PhoneOff size={14} className="mr-2 inline"/>{ending?'Ending...':'End meeting'}</button></header><main className="mx-auto grid max-w-[1500px] gap-4 p-4 md:p-6 lg:grid-cols-[1fr_320px]"><section className="min-h-[calc(100vh-110px)] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1922]"><div className="grid min-h-[280px] grid-cols-2 gap-3 bg-gradient-to-br from-[#272338] to-[#17161e] p-4 md:grid-cols-3">
<div className="relative min-h-[230px] overflow-hidden rounded-2xl bg-[#302d3b]"><video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${camera?'block':'hidden'}`}/><div className={`${camera?'hidden':''} absolute inset-0 grid place-items-center`}><div className="grid h-24 w-24 place-items-center rounded-full bg-[#f2c6a0] text-3xl font-bold text-[#332a26]">{name.slice(0,2).toUpperCase()||'KB'}</div></div><span className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-1 text-[10px] font-semibold">{name} · You</span></div>
{Object.entries(remoteStreams).map(([peer,stream])=><div key={peer} className="relative min-h-[230px] overflow-hidden rounded-2xl bg-[#302d3b]"><RemoteVideo stream={stream}/><span className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-1 text-[10px] font-semibold">{peer}</span></div>)}
{Object.keys(remoteStreams).length===0&&<div className="hidden rounded-2xl border border-white/10 bg-white/[.03] md:grid place-items-center text-xs text-white/30">Invite someone with the meeting link to start a live video tile.</div>}
</div><div className="flex items-center justify-center gap-3 border-t border-white/10 py-4"><button onClick={()=>setMic(!mic)} className={`grid h-11 w-11 place-items-center rounded-full ${mic?'bg-white/10':'bg-red-500'}`}>{mic?<Mic size={18}/>:<MicOff size={18}/>}</button><button onClick={()=>setCamera(!camera)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10">{camera?<Video size={18}/>:<VideoOff size={18}/>}</button><button onClick={end} className="grid h-11 w-11 place-items-center rounded-full bg-red-500"><PhoneOff size={18}/></button></div><div className="border-t border-white/10 p-5"><div className="mb-4 flex items-center justify-between"><div><div className="flex items-center gap-2 text-sm font-bold"><Wifi size={15} className="text-emerald-400"/> Live transcript</div><p className="mt-1 text-xs text-white/40">Shared with everyone in this room</p></div><button onClick={addDemo} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/5"><Sparkles size={13} className="mr-1 inline"/>Simulate sample conversation</button></div><div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">{room.messages.length===0?<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40">No transcript yet. Add a line below or simulate a sample conversation.</div>:room.messages.map(msg=><div key={msg.id} className="rounded-xl bg-white/[.04] p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-bold text-[#bdb4ff]">{msg.speaker}</span><span className="text-[10px] text-white/30">{fmtTime(msg.timestamp_seconds)}</span></div><p className="text-sm leading-6 text-white/80">{msg.text}</p></div>)}</div><div className="mt-4 flex gap-2"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Add what someone said..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#6c5ce7]"/><button onClick={send} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6c5ce7]"><Send size={17}/></button></div></div></section><aside className="rounded-2xl border border-white/10 bg-[#1a1922] p-5"><div className="flex items-center justify-between"><div><div className="text-sm font-bold">People</div><div className="mt-1 text-xs text-white/40">Anyone with the link can join</div></div><Users size={17} className="text-white/50"/></div><div className="mt-5 space-y-2">{room.participants.map((p,i)=><div key={p.id} className="flex items-center gap-3 rounded-xl bg-white/[.04] p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#f2c6a0] text-xs font-bold text-[#332a26]">{p.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{p.name}</div><div className="text-[10px] text-white/35">{i===0?'Host':'In meeting'}</div></div></div>)}</div><div className="mt-6 rounded-xl border border-[#6c5ce7]/30 bg-[#6c5ce7]/10 p-4"><div className="flex items-center gap-2 text-xs font-bold"><Sparkles size={14} className="text-[#bdb4ff]"/> AI meeting copilot</div><p className="mt-2 text-xs leading-5 text-white/50">After the host ends the call, Fireflies-style insights will be generated from the captured transcript.</p></div><button onClick={share} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-xs font-semibold hover:bg-white/5"><Copy size={14} className="mr-2 inline"/>{copied?'Copied invite link':'Copy invite link'}</button></aside></main></div>;
}

function RemoteVideo({stream}:{stream:MediaStream}){const ref=useRef<HTMLVideoElement|null>(null);useEffect(()=>{if(ref.current)ref.current.srcObject=stream},[stream]);return <video ref={ref} autoPlay playsInline className="h-full w-full object-cover"/>}
