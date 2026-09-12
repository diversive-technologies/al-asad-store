import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RULE_SETS } from '@/lib/mocks/profile-rule-rows';

/*
 * The tailor's rules are the SERVER's, and the plan's Phase 6 check says so: no
 * rule number appears in the interface code. The page reads a reason, a rule id
 * it never writes down, a direction and the measurements a finding is about —
 * and chooses our words for them.
 */

const ROOTS = ['src/features/made-to-measure', 'app'];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.');
    return isSource ? [path] : [];
  });
}

describe('the rulebook stays on the server', () => {
  const files = ROOTS.flatMap((root) => sourceFiles(root));
  const sources = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  it('reads enough of the storefront to mean something', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('names no rule, and holds no tolerance of its own', () => {
    const numbers = new Set<string>();
    const ids = new Set<string>();
    for (const set of RULE_SETS) {
      for (const rule of set.rows) {
        ids.add(rule.id);
        numbers.add(String(rule.permille));
        numbers.add(String(rule.toleranceBelowMm));
        if (rule.toleranceAboveMm !== null) numbers.add(String(rule.toleranceAboveMm));
      }
    }

    for (const { path, text } of sources) {
      for (const id of ids) expect(text, `${path} names the rule ${id}`).not.toContain(id);
      for (const word of ['permille', 'toleranceBelowMm', 'toleranceAboveMm', 'showsTarget']) {
        expect(text, `${path} holds ${word}`).not.toContain(word);
      }
    }
  });
});
