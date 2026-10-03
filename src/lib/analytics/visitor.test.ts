import { describe, expect, it } from 'vitest';

import { deviceOf, isCountable, newVisitorId, parseVisitorId } from './visitor';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function request(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers({ 'user-agent': CHROME, ...headers }) };
}

describe('deviceOf', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148', 'mobile'],
    ['Mozilla/5.0 (Linux; Android 14; SM-S911B) Chrome/130.0 Mobile Safari/537.36', 'mobile'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'tablet'],
    ['Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/130.0 Safari/537.36', 'tablet'],
    [CHROME, 'desktop'],
    [null, 'desktop'],
  ] as const)('reads %s as %s', (agent, device) => {
    expect(deviceOf(agent)).toBe(device);
  });
});

describe('parseVisitorId', () => {
  it('accepts a UUID and nothing else', () => {
    const id = newVisitorId();
    expect(parseVisitorId(id)).toBe(id);
    expect(parseVisitorId('not-a-uuid')).toBeNull();
    expect(parseVisitorId('')).toBeNull();
    expect(parseVisitorId(undefined)).toBeNull();
  });
});

describe('isCountable', () => {
  it('counts a browser GET', () => {
    expect(isCountable(request('GET'))).toBe(true);
  });

  it('does not count a HEAD', () => {
    expect(isCountable(request('HEAD'))).toBe(false);
  });

  it('does not count a Next prefetch or a browser prefetch', () => {
    expect(isCountable(request('GET', { 'next-router-prefetch': '1' }))).toBe(false);
    expect(isCountable(request('GET', { purpose: 'prefetch' }))).toBe(false);
    expect(isCountable(request('GET', { 'sec-purpose': 'prefetch;prerender' }))).toBe(false);
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
    'facebookexternalhit/1.1',
    'WhatsApp/2.23.20 A',
    'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130.0 Safari/537.36',
    'curl/8.4.0',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
    'Slackbot-LinkExpanding 1.0',
  ])('does not count the crawler %s', (agent) => {
    expect(isCountable(request('GET', { 'user-agent': agent }))).toBe(false);
  });

  it('does not count a request with no user agent', () => {
    expect(isCountable({ method: 'GET', headers: new Headers() })).toBe(false);
  });
});
