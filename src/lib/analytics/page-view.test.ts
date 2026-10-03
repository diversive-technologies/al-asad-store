import { describe, expect, it } from 'vitest';

import { pageViewFor } from './page-view';

const VISITOR = '00000000-0000-4000-8000-0000000000aa';
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function view(pathname: string, headers: Record<string, string> = {}, method = 'GET') {
  return pageViewFor(
    {
      method,
      pathname,
      headers: new Headers({ 'user-agent': CHROME, accept: 'text/html', ...headers }),
    },
    VISITOR,
  );
}

describe('pageViewFor', () => {
  it('counts a full page load', () => {
    expect(view('/catalogue')).toMatchObject({
      type: 'page_view',
      path: '/catalogue',
      visitorId: VISITOR,
      device: 'desktop',
    });
  });

  it('counts a soft navigation, which asks for the RSC payload', () => {
    expect(view('/bag', { accept: '*/*', rsc: '1' })).toMatchObject({
      type: 'page_view',
      path: '/bag',
    });
  });

  it('counts nothing for a prefetch, a crawler or a HEAD', () => {
    expect(view('/bag', { accept: '*/*', rsc: '1', 'next-router-prefetch': '1' })).toBeNull();
    expect(view('/', { 'user-agent': 'Googlebot/2.1' })).toBeNull();
    expect(view('/', {}, 'HEAD')).toBeNull();
  });

  it('counts nothing that is not a page', () => {
    expect(view('/api/bag', { accept: 'application/json' })).toBeNull();
    expect(view('/api/health')).toBeNull();
    expect(view('/_next/data/x.json')).toBeNull();
    expect(view('/bag', { accept: 'application/json' })).toBeNull();
    expect(view('/bag', {}, 'POST')).toBeNull();
  });
});
