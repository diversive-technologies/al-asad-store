import next from 'eslint-config-next';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * §2 — ESLint flat config invoked directly. `next lint` was removed in
 * Next.js 16.
 *
 * The local rule block below mechanises the prohibitions in §21 that a
 * reviewer would otherwise have to catch by eye.
 */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**'] },
  ...next,
  ...nextTypescript,
  {
    rules: {
      // TS-02 / TS-04 / TS-05
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // TS-11
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // TS-10
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'TS-10: `enum` is PROHIBITED. Use an `as const` object with a derived union.',
        },
      ],
      // IMP-04 / IMP-06
      '@typescript-eslint/no-require-imports': 'error',
      // ERR-07
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
];

export default config;
