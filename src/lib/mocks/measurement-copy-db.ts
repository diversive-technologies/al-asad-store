import type { Locale } from '@/i18n/locales';

import { CARD_POINT_COPY } from './measurement-card-copy-db';

/**
 * D1 — §22 Localisation's wording for the studio, standing in for Java: every
 * style, garment and measurement point by id, one read per locale (§34.3).
 *
 * One read covers every style, because a point is measured the same way in
 * whichever style it appears. A second point measured differently gets a second
 * id, never a second meaning for the first.
 *
 * The Urdu needs a native tailor's review before any demo.
 */

interface CopyRow {
  styles: Record<string, string>;
  pieces: Record<string, string>;
  points: Record<string, { label: string; instruction: string }>;
  options: Record<string, { label: string; values: Record<string, string> }>;
}

const MEASUREMENT_COPY: Readonly<Record<Locale, CopyRow>> = {
  en: {
    styles: {
      KAMEEZ_SHALWAR: 'Kameez shalwar',
      WAISTCOAT_SUIT: 'Waistcoat suit',
      KURTA: 'Kurta',
    },
    pieces: { KAMEEZ: 'Kameez', SHALWAR: 'Shalwar', WAISTCOAT: 'Waistcoat' },
    points: {
      kameezLength: {
        label: 'Kameez length',
        instruction: 'From the highest point of the shoulder, straight down to the hem.',
      },
      kameezSleeve: {
        label: 'Sleeve length',
        instruction:
          'From the shoulder seam, along the top of the sleeve, to its end — the cuff included, if it has one.',
      },
      kameezShoulder: {
        label: 'Shoulder',
        instruction:
          'Lay the kameez flat, face up. Measure across the back, from one shoulder seam to the other.',
      },
      kameezNeck: {
        label: 'Neck',
        instruction:
          'Unbutton the band at the neck — the ban, or the stand under a collar — and lay it open. Measure from the centre of the button to the far end of the buttonhole.',
      },
      kameezChest: {
        label: 'Chest',
        instruction:
          'Button the neck again, then measure straight across the chest, an inch below the armhole, with the kameez flat.',
      },
      kameezBottom: {
        label: 'Hem (Ghera)',
        instruction: 'Measure across the hem at its widest, with the kameez lying flat.',
      },
      kameezCuff: {
        label: 'Cuff',
        instruction: 'Measure across the cuff opening with it fastened.',
      },
      kameezMohri: {
        label: 'Sleeve opening (Mohri)',
        instruction: 'With the sleeve lying flat, measure straight across its open end.',
      },
      shalwarLength: {
        label: 'Shalwar length',
        instruction: 'From the top of the waistband, straight down to the hem.',
      },
      shalwarPaincha: {
        label: 'Trouser bottom (Poncha)',
        instruction: 'Measure across the opening at the ankle.',
      },
      shalwarWaist: {
        label: 'Waist',
        instruction:
          'Loosen the nala and spread the waistband out flat so no gathers remain, then measure straight across from edge to edge.',
      },
      shalwarThigh: {
        label: 'Thigh',
        instruction: 'Measure across one leg at its widest, just below the crotch seam.',
      },
      /* The waistcoat's own points name the garment, because a suit asks for a
         shoulder and a chest twice and the label is often all that is on screen. */
      waistcoatShoulder: {
        label: 'Waistcoat shoulder',
        instruction: 'Across the back, from one shoulder seam to the other.',
      },
      waistcoatChest: {
        label: 'Waistcoat chest',
        instruction:
          'Measure across the chest just below the armholes, with the waistcoat fastened and flat.',
      },
      waistcoatLength: {
        label: 'Waistcoat length',
        instruction: 'From the highest point of the shoulder, straight down to the hem.',
      },
    },
    /* The choices' own names avoid the measurements' — "Neck style", "Cuff
       style" — because both sit in one fieldset under the same garment. */
    options: {
      neckStyle: { label: 'Neck style', values: { BAN: 'Ban (band collar)', COLLAR: 'Collar' } },
      banWidth: { label: 'Ban width', values: { NARROW: 'Narrow', WIDE: 'Wide' } },
      banShape: { label: 'Ban ends', values: { ROUND: 'Round', SQUARE: 'Square' } },
      sleeveFinish: { label: 'Sleeve end', values: { CUFF: 'Cuff', PLAIN: 'Plain' } },
      cuffStyle: { label: 'Cuff style', values: { SINGLE: 'Single', DOUBLE: 'Double' } },
    },
  },
  ur: {
    styles: { KAMEEZ_SHALWAR: 'قمیض شلوار', WAISTCOAT_SUIT: 'واسکٹ سوٹ', KURTA: 'کرتا' },
    pieces: { KAMEEZ: 'قمیض', SHALWAR: 'شلوار', WAISTCOAT: 'واسکٹ' },
    points: {
      kameezLength: {
        label: 'قمیض کی لمبائی',
        instruction: 'کندھے کے سب سے اونچے مقام سے سیدھا دامن تک۔',
      },
      kameezSleeve: {
        label: 'آستین کی لمبائی',
        instruction: 'کندھے کی سلائی سے، آستین کے اوپر سے، اس کے آخر تک — کف ہو تو اسے ملا کر۔',
      },
      kameezShoulder: {
        label: 'کندھا',
        instruction: 'قمیض سیدھی بچھائیں۔ پیٹھ کی طرف ایک کندھے کی سلائی سے دوسری تک ناپیں۔',
      },
      kameezNeck: {
        label: 'گلا',
        instruction:
          'گلے کی پٹی — بین، یا کالر کے نیچے کی پٹی — کے بٹن کھول کر اسے سیدھا بچھائیں۔ بٹن کے درمیان سے کاج کے دوسرے سرے تک ناپیں۔',
      },
      kameezChest: {
        label: 'چھاتی',
        instruction:
          'گلے کا بٹن دوبارہ بند کریں، پھر بغل سے ایک انچ نیچے، قمیض بچھا کر سیدھا آر پار ناپیں۔',
      },
      kameezBottom: {
        label: 'دامن کا گھیر',
        instruction: 'قمیض بچھا کر دامن کو سب سے چوڑی جگہ سے آر پار ناپیں۔',
      },
      kameezCuff: {
        label: 'کف',
        instruction: 'کف بند کر کے اس کے منہ کو آر پار ناپیں۔',
      },
      kameezMohri: {
        // Neutral words, not a spelling of "mohri": a native tailor settles the term.
        label: 'آستین کا منہ',
        instruction: 'آستین سیدھی بچھا کر اس کے کھلے سرے کو آر پار ناپیں۔',
      },
      shalwarLength: {
        label: 'شلوار کی لمبائی',
        instruction: 'نیفے کے اوپر سے سیدھا پائنچے تک۔',
      },
      shalwarPaincha: {
        label: 'پائنچہ',
        instruction: 'پائنچے کے منہ کو آر پار ناپیں۔',
      },
      shalwarWaist: {
        label: 'کمر',
        instruction:
          'ناڑا ڈھیلا کر کے نیفہ پورا کھول کر سیدھا بچھائیں، پھر ایک سرے سے دوسرے سرے تک ناپیں۔',
      },
      shalwarThigh: {
        label: 'ران',
        instruction:
          'شلوار کی ایک ٹانگ کو، آسن کی سلائی سے ذرا نیچے، سب سے چوڑی جگہ سے آر پار ناپیں۔',
      },
      waistcoatShoulder: {
        label: 'واسکٹ کا کندھا',
        instruction: 'پیٹھ کی طرف ایک کندھے کی سلائی سے دوسری تک۔',
      },
      waistcoatChest: {
        label: 'واسکٹ کی چھاتی',
        instruction: 'واسکٹ بند کر کے، بغلوں سے ذرا نیچے، آر پار ناپیں۔',
      },
      waistcoatLength: {
        label: 'واسکٹ کی لمبائی',
        instruction: 'کندھے کے سب سے اونچے مقام سے سیدھا دامن تک۔',
      },
    },
    options: {
      neckStyle: { label: 'گلے کا انداز', values: { BAN: 'بین', COLLAR: 'کالر' } },
      banWidth: { label: 'بین کی چوڑائی', values: { NARROW: 'پتلی', WIDE: 'چوڑی' } },
      banShape: { label: 'بین کے سرے', values: { ROUND: 'گول', SQUARE: 'چوکور' } },
      sleeveFinish: { label: 'آستین کا سرا', values: { CUFF: 'کف', PLAIN: 'سادہ' } },
      cuffStyle: { label: 'کف کا انداز', values: { SINGLE: 'سنگل', DOUBLE: 'ڈبل' } },
    },
  },
};

/** One read per locale: every style's words, the card path's points included. */
export function measurementCopyFor(locale: Locale): CopyRow {
  const row = MEASUREMENT_COPY[locale];
  return { ...row, points: { ...row.points, ...CARD_POINT_COPY[locale] } };
}
