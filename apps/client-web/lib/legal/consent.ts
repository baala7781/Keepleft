export const LEGAL_CONSENT_KEY='keepleft-legal-consent';
export const LEGAL_VERSION='2026-09-24-beta-1';

export type LegalConsent={version:string;acceptedAt:string;terms:boolean;privacy:boolean;safety:boolean};

export function validConsent(value:string|null):boolean{
  if(!value)return false;
  try{
    const parsed=JSON.parse(value) as Partial<LegalConsent>;
    return parsed.version===LEGAL_VERSION&&parsed.terms===true&&parsed.privacy===true&&parsed.safety===true&&typeof parsed.acceptedAt==='string';
  }catch{return false;}
}

export function consentRecord(now=new Date()):LegalConsent{
  return {version:LEGAL_VERSION,acceptedAt:now.toISOString(),terms:true,privacy:true,safety:true};
}
