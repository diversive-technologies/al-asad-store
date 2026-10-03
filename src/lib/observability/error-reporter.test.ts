import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logApiError, logContentIssue, logProviderFailure } from '@/lib/utils/log';

import { installErrorReporter, reportToTracker, type ErrorReport } from './error-reporter';

/**
 * F-08 — the logger's three functions also tell the tracker, and the personal data
 * a careless message might carry is masked BEFORE it leaves.
 */

const EMAIL = 'ayesha.khan@example.com';
const MOBILE = '03001234567';

let reports: ErrorReport[];

beforeEach(() => {
  reports = [];
  installErrorReporter((report) => {
    reports.push(report);
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  installErrorReporter(null);
  vi.restoreAllMocks();
});

describe('logApiError', () => {
  it('reports an error with its boundary as the context', () => {
    logApiError('api:checkout:place', { kind: 'SERVER', message: 'The store failed', status: 500 });

    expect(reports).toEqual([
      { level: 'error', context: 'api:checkout:place', message: 'SERVER: The store failed' },
    ]);
  });

  it('masks an email and a mobile inside the message before sending', () => {
    logApiError('api:test', {
      kind: 'NETWORK',
      message: `could not reach for ${EMAIL} on ${MOBILE}`,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]?.message).toBe('NETWORK: could not reach for [email] on [phone]');
    expect(JSON.stringify(reports)).not.toContain(EMAIL);
    expect(JSON.stringify(reports)).not.toContain(MOBILE);
  });

  it('carries the failing keys of a contract violation, and no value', () => {
    logApiError('page:product', {
      kind: 'CONTRACT_VIOLATION',
      message: 'did not match',
      path: '/api/v1/catalogue/products',
      issues: [
        {
          code: 'invalid_type',
          expected: 'number',
          path: ['price', 'amount'],
          message: 'secret',
          input: 1,
        },
      ],
    });

    expect(reports[0]?.message).toBe(
      'CONTRACT_VIOLATION: did not match (/api/v1/catalogue/products: price.amount invalid_type)',
    );
  });
});

describe('logContentIssue', () => {
  it('reports a warning, masked', () => {
    logContentIssue('made-to-measure', `point kameezChest has no words for ${EMAIL}`);

    expect(reports).toEqual([
      {
        level: 'warning',
        context: 'made-to-measure',
        message: 'point kameezChest has no words for [email]',
      },
    ]);
  });
});

describe('logProviderFailure', () => {
  it('reports an error, masked', () => {
    logProviderFailure('try-on:provider', `HTTP 400 for ${MOBILE}`);

    expect(reports).toEqual([
      { level: 'error', context: 'try-on:provider', message: 'HTTP 400 for [phone]' },
    ]);
  });
});

describe('the seam', () => {
  it('does nothing when no tracker is installed', () => {
    installErrorReporter(null);

    expect(() => {
      logApiError('api:test', { kind: 'NETWORK', message: 'down' });
    }).not.toThrow();
    expect(reports).toEqual([]);
  });

  it('never lets a failing tracker break the code that logged', () => {
    installErrorReporter(() => {
      throw new Error('tracker is down');
    });

    expect(() => {
      reportToTracker('error', 'api:test', 'a message');
    }).not.toThrow();
  });

  it('still prints to the console as it always did', () => {
    logApiError('api:test', { kind: 'NETWORK', message: 'down' });

    expect(console.error).toHaveBeenCalledWith('[api:test] NETWORK: down');
  });
});
