import {describe,expect,it} from 'vitest';
import {consentRecord,LEGAL_VERSION,validConsent} from './consent';

describe('legal consent',()=>{
  it('accepts only the current complete consent version',()=>{
    expect(validConsent(JSON.stringify(consentRecord(new Date('2026-09-24T00:00:00Z'))))).toBe(true);
    expect(validConsent(JSON.stringify({...consentRecord(),version:'old'}))).toBe(false);
    expect(validConsent(JSON.stringify({...consentRecord(),safety:false}))).toBe(false);
    expect(validConsent('not-json')).toBe(false);
  });
  it('stores a timestamp and the current version',()=>{
    const value=consentRecord(new Date('2026-09-24T12:00:00Z'));
    expect(value.version).toBe(LEGAL_VERSION);
    expect(value.acceptedAt).toBe('2026-09-24T12:00:00.000Z');
  });
});
