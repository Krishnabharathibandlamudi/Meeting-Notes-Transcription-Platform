'use client';
import {ReactNode,useEffect} from 'react';
export default function ThemeProvider({children}:{children:ReactNode}){
  useEffect(()=>{
    const apply=()=>{const theme=localStorage.getItem('ff-theme')||'light';document.documentElement.classList.toggle('dark',theme==='dark');};
    apply();
    const onTheme=()=>apply(); window.addEventListener('ff-theme-change',onTheme); return()=>window.removeEventListener('ff-theme-change',onTheme);
  },[]);
  return <>{children}</>;
}
