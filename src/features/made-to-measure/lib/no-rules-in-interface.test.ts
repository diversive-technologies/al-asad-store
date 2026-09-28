import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The tailor's rules are the SERVER's, and the plan's Phase 6 check says so: no
 * rule number appears in the interface code. The page reads a reason, a rule id
 * it never writes down, a direction and the measurements a finding is about —
 * and chooses our words for them.
 */

const ROOTS = ['src/features/made-to-measure', 'app'];

/*
 * The ids the backend's rule set judges by today (§34.4, A2-6). The rows behind
 * them — ratios, tolerances, severities — never reach this repository; an id is
 * the one part of a rule the page is ever served, on a finding, so it is the one
 * part it could be tempted to branch on. A rule the backend adds later is not
 * listed until someone adds it here.
 */
const RULE_IDS = [
  'hemAtLeastChest',
  'shoulderForChest',
  'neckForChestBan',
  'neckForChestCollar',
  'waistcoatOverKameez',
];

/* A rule row's own columns: a copy of the rulebook would have to name them,
   whatever its rules are called. */
const RULE_COLUMNS = ['permille', 'toleranceBelowMm', 'toleranceAboveMm', 'showsTarget'];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.');
    return isSource ? [path] : [];
  });
}

describe('the rulebook stays on the server', () => {
  const sources = ROOTS.flatMap((root) => sourceFiles(root)).map((path) => ({
    path,
    text: readFileSync(path, 'utf8'),
  }));
  const filesNaming = (word: string) =>
    sources.filter(({ text }) => text.includes(word)).map(({ path }) => path);

  it('reads enough of the storefront to mean something', () => {
    expect(sources.length).toBeGreaterThan(40);
  });

  it.each(RULE_IDS)('names no rule — %s appears nowhere', (id) => {
    expect(filesNaming(id)).toEqual([]);
  });

  it.each(RULE_COLUMNS)('holds no tolerance of its own — %s appears nowhere', (column) => {
    expect(filesNaming(column)).toEqual([]);
  });
});
