'use client';
import {Sun,Moon} from 'lucide-react';
import {useWorldTheme} from '@/hooks/use-world-theme';

export function ThemeToggle({compact=false}:{compact?:boolean}){
  const [theme,setTheme]=useWorldTheme();
  const toggle=()=>setTheme(theme==='day'?'night':'day');
  return <button
    type="button"
    className={`kl-theme-toggle${compact?' kl-compact':''}`}
    aria-label={`Switch to ${theme==='day'?'night':'day'} mode`}
    onClick={toggle}
    title={theme==='day'?'Switch to night mode':'Switch to day mode'}
  >
    {theme==='day'?<Moon size={20}/>:<Sun size={20}/>}
    {!compact&&<span>{theme==='day'?'Night':'Day'}</span>}
  </button>;
}
