import { describe, expect, it } from 'vitest';
import { DEFAULT_IDENTITY_SETTINGS } from '../../src/database/models/Workspace';
import { extractIdentifiers, extractTraits } from '../../src/services/identity/extract';

const byType = (list: { type: string; value: string }[]) => Object.fromEntries(list.map(item => [item.type, item.value]));

describe('extractIdentifiers', () => {
  it('collects identifiers from traits, cookies, click ids and the anonymous id', () => {
    const ids = extractIdentifiers({
      anonymous_id: 'anon-1',
      event_type: 'identify',
      properties: { traits: { email: ' Ravi@Gmail.com ', phone: '98765 43210', user_id: 'u-7' } },
      context: { cookies: { _fbp: 'fb.1.1.123', _fbc: 'fb.1.1.IwAR' } },
      click_ids: { gclid: 'Cj0K' },
    });
    expect(byType(ids)).toEqual({
      user_id: 'u-7', email: 'ravi@gmail.com', phone: '+919876543210',
      anonymous_id: 'anon-1', fbp: 'fb.1.1.123', fbc: 'fb.1.1.IwAR', gclid: 'Cj0K',
    });
    expect(ids[0].type).toBe('user_id');
  });

  it('reads form fields in object and array shape', () => {
    expect(byType(extractIdentifiers({ anonymous_id: 'a', properties: { form: { billing_email: 'A@B.co' } } })).email).toBe('a@b.co');
    expect(byType(extractIdentifiers({
      anonymous_id: 'a', properties: { fields: [{ name: 'Mobile', value: '+91 98765 43210' }] },
    })).phone).toBe('+919876543210');
  });

  it('reads identifiers from the page URL query string', () => {
    const ids = extractIdentifiers({ anonymous_id: 'a', page_info: { url: 'https://x.test/thanks?email=ravi%40gmail.com&gclid=G1' } });
    expect(byType(ids)).toMatchObject({ email: 'ravi@gmail.com', gclid: 'G1' });
  });

  it('honours custom workspace identity field names', () => {
    const settings = { ...DEFAULT_IDENTITY_SETTINGS, email_keys: ['work_mail'], phone_keys: ['contact_no'] };
    const ids = extractIdentifiers({ anonymous_id: 'a', properties: { work_mail: 'X@Y.io', contact_no: '9876543210' } }, settings);
    expect(byType(ids)).toMatchObject({ email: 'x@y.io', phone: '+919876543210' });
    expect(byType(extractIdentifiers({ anonymous_id: 'a', properties: { work_mail: 'x@y.io' } })).email).toBeUndefined();
  });

  it('never treats IP address or user agent as an identifier', () => {
    const ids = extractIdentifiers({
      anonymous_id: 'a',
      properties: { ip: '203.0.113.7', user_agent: 'Mozilla/5.0' },
      context: { ip: '203.0.113.7', userAgent: 'Mozilla/5.0' },
    } as never);
    expect(ids.map(id => id.type)).toEqual(['anonymous_id']);
  });

  it('takes one value per type, preferring traits over loose properties', () => {
    const ids = extractIdentifiers({ anonymous_id: 'a', properties: { email: 'friend@x.io', traits: { email: 'me@x.io' } } });
    expect(ids.filter(id => id.type === 'email')).toEqual([{ type: 'email', value: 'me@x.io' }]);
  });
});

describe('extractTraits', () => {
  it('drops empty values', () => {
    expect(extractTraits({ properties: { traits: { first_name: 'Ravi', last_name: ' ', plan: null } } })).toEqual({ first_name: 'Ravi' });
  });
});
