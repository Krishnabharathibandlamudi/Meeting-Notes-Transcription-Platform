'use client';
import {CheckCircle2, X} from 'lucide-react';
export default function Toast({message,onClose}:{message:string,onClose:()=>void}){return <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#201d2b] px-4 py-3 text-sm text-white shadow-2xl"><CheckCircle2 size={18} className="text-[#a89cff]"/><span>{message}</span><button onClick={onClose}><X size={15}/></button></div>}
