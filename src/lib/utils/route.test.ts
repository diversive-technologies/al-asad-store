import { describe, expect, it } from 'vitest';

import { declaredLength, readFormBody, readJsonBody } from './route';

const URL_ = 'https://shop.example.com/api/test';

describe('readJsonBody', () => {
  it.each([
    ['a JSON body', '{"a":1}', { a: 1 }],
    ['a body that is not JSON', 'not json', null],
    ['an empty body', '', null],
  ])('reads %s without throwing', async (_label, body, expected) => {
    await expect(readJsonBody(new Request(URL_, { method: 'POST', body }))).resolves.toEqual(
      expected,
    );
  });
});

describe('readFormBody', () => {
  it('reads a multipart form', async () => {
    const form = new FormData();
    form.set('productId', 'abc');

    const read = await readFormBody(new Request(URL_, { method: 'POST', body: form }));

    expect(read?.get('productId')).toBe('abc');
  });

  /* An unguarded `request.formData()` rejects on these, which a Route Handler
     turned into a 500 where its own answer is a 400. */
  it.each([
    ['a JSON body', { 'content-type': 'application/json' }, '{"a":1}'],
    [
      'a truncated multipart body',
      { 'content-type': 'multipart/form-data; boundary=x' },
      '--x\r\n',
    ],
  ])('answers null for %s rather than rejecting', async (_label, headers, body) => {
    await expect(
      readFormBody(new Request(URL_, { method: 'POST', headers, body })),
    ).resolves.toBeNull();
  });
});

describe('declaredLength', () => {
  it.each([
    ['a length', '1024', 1024],
    ['no length at all', null, null],
    ['a length that is not a number', '12abc', null],
    ['a negative length', '-5', null],
  ])('reads %s', (_label, value, expected) => {
    const headers: Record<string, string> = value === null ? {} : { 'content-length': value };

    expect(declaredLength(new Request(URL_, { headers }))).toBe(expected);
  });
});
