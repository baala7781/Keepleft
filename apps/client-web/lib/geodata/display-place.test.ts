import {expect,it} from 'vitest';
import {displayPlace} from './display-place';

it('uses a human locality title without discarding stored administrative names',()=>{
  const full='Ward 106 Serilingampally · Greater Hyderabad Municipal Corporation West Zone';
  expect(displayPlace(full)).toBe('Serilingampally · Hyderabad');
  expect(full).toContain('Ward 106');
  expect(displayPlace('Tandur mandal · Vikarabad')).toBe('Tandur mandal · Vikarabad');
  expect(displayPlace('Hussain Sagar · Hyderabad')).toBe('Hussain Sagar · Hyderabad');
  expect(displayPlace(undefined)).toBe('Your route');
});
