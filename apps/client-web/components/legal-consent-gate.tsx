'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,MapPin,ShieldCheck,TriangleAlert} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {consentRecord,LEGAL_CONSENT_KEY,validConsent} from '@/lib/legal/consent';

const LEGAL_PATHS=new Set(['/','/terms','/privacy','/about']);

export function LegalConsentGate({children,onLegal}:{children:React.ReactNode;onLegal?:(path:'/terms'|'/privacy')=>void}){
  const [ready,setReady]=useState(false),[accepted,setAccepted]=useState(false),[step,setStep]=useState(0);
  const [terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false);
  useEffect(()=>{
    const read=()=>{try{setAccepted(validConsent(localStorage.getItem(LEGAL_CONSENT_KEY)));}catch{setAccepted(false);}setReady(true);};
    read();window.addEventListener('keepleft:consent-reset',read);return()=>window.removeEventListener('keepleft:consent-reset',read);
  },[]);
  const exempt=typeof window!=='undefined'&&LEGAL_PATHS.has(window.location.pathname);
  const finish=()=>{try{localStorage.setItem(LEGAL_CONSENT_KEY,JSON.stringify(consentRecord()));}catch{/* The consent still applies for this session. */}setAccepted(true);};
  const legalLink=(path:'/terms'|'/privacy',label:string)=><button type="button" className="kl-inline-link" onClick={()=>onLegal?onLegal(path):window.open(path,'_blank','noopener,noreferrer')}>{label}</button>;
  return <>{children}{ready&&!accepted&&!exempt&&<dialog className="kl-consent" open aria-labelledby="kl-consent-title">
    <div className="kl-consent-route" aria-hidden="true"><i/><i/><i/></div>
    {step===0&&<div className="kl-consent-panel"><MapPin className="kl-consent-icon"/><p className="kl-consent-kicker">Private beta</p><h1 id="kl-consent-title">Your movement stays yours.</h1><p>YourLeft turns a recorded walk, run, or ride into a 3D replay. Activities stay on this device unless you deliberately export or share them.</p><Button className="kl-action" onClick={()=>setStep(1)}>Review before starting<ArrowRight/></Button></div>}
    {step===1&&<div className="kl-consent-panel"><ShieldCheck className="kl-consent-icon"/><p className="kl-consent-kicker">Terms and privacy</p><h1 id="kl-consent-title">Two clear agreements.</h1><p>These are recorded separately on this device. You can reset them later from Legal &amp; Data.</p><label className="kl-consent-check"><input type="checkbox" checked={terms} onChange={event=>setTerms(event.target.checked)}/><span>I accept the {legalLink('/terms','Terms of Use')}.</span></label><label className="kl-consent-check"><input type="checkbox" checked={privacy} onChange={event=>setPrivacy(event.target.checked)}/><span>I acknowledge the {legalLink('/privacy','Privacy Policy')}.</span></label><div className="kl-consent-actions"><Button variant="ghost" onClick={()=>setStep(0)}>Back</Button><Button className="kl-action" disabled={!terms||!privacy} onClick={()=>setStep(2)}>Continue<ArrowRight/></Button></div></div>}
    {step===2&&<div className="kl-consent-panel"><TriangleAlert className="kl-consent-icon"/><p className="kl-consent-kicker">Move safely</p><h1 id="kl-consent-title">The world deserves your attention.</h1><p>GPS, routes, pace and terrain can be inaccurate. YourLeft is not emergency navigation or medical advice. Set up the view before moving and never operate the 3D map in traffic.</p><p className="kl-consent-note">Shared routes can reveal where you live or work. Route exports hide the first and last 200 metres by default when the activity is long enough.</p><div className="kl-consent-actions"><Button variant="ghost" onClick={()=>setStep(1)}>Back</Button><Button className="kl-action" onClick={finish}>I understand · Enter YourLeft</Button></div></div>}
  </dialog>}</>;
}
