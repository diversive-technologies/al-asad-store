import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { measurementProfileSchema } from '../schemas/profile.schema';
import { SavedProfileCard } from './SavedProfileCard';

const profile = measurementProfileSchema.parse({
  id: '00000000-0000-4000-8000-000000000001',
  garmentStyle: 'KAMEEZ_SHALWAR',
  setVersion: 1,
  ruleSetVersion: 1,
  version: 1,
  source: 'GARMENT_COPY',
  preferences: [],
  values: [
    {
      pointId: 'kameezChest',
      enteredValue: '21',
      unitEntered: 'IN',
      enteredAs: 'HALF',
      basis: 'GARMENT',
      origin: 'TYPED',
      valueMm: 1067,
    },
  ],
  acknowledgedFindings: [],
  keptWith: 'DEVICE',
  createdAt: '2026-09-14T10:00:00.000Z',
});

/**
 * TEST-08 — I18N-10: when the guide has no name for a saved style in this
 * language, or could not be read, the card rendered an empty `<h3>`.
 */
describe('a saved set of measurements on the account', () => {
  it('is headed by its style when the guide names it', () => {
    const markup = renderToStaticMarkup(
      <SavedProfileCard
        view={{ profile, styleLabel: 'Kameez shalwar', groups: [], notAsked: 0 }}
        locale="en"
        messages={en}
      />,
    );

    expect(markup).toContain('>Kameez shalwar</h3>');
  });

  it('is never headed by nothing', () => {
    const markup = renderToStaticMarkup(
      <SavedProfileCard
        view={{ profile, styleLabel: '', groups: [], notAsked: 0 }}
        locale="en"
        messages={en}
      />,
    );

    expect(markup).not.toMatch(/<h3[^>]*><\/h3>/);
    expect(markup).toContain(`>${en.account.savedMeasurementsUntitled}</h3>`);
  });
});
