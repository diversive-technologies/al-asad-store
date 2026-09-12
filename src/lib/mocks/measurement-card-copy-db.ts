import type { Locale } from '@/i18n/locales';

/**
 * D1 — §22 Localisation's words for the TAILOR'S CARD points (plan Phase 4), by
 * id, merged into the one wording read by `measurement-copy-db.ts`.
 *
 * Each instruction says what the STORE does with the figure — "we read the card's
 * chest as half the way round: 19.5 is kept as 39" — never what cards "usually"
 * do. How cards write each figure is a guess until real cards arrive (plan
 * questions 1 and 3), and a guess stated as a fact gets believed. The page's hint
 * asks for every figure as written; the readout shows what is kept.
 *
 * FIXTURE with the conventions they describe, and the Urdu needs a native
 * tailor's review before any demo — the spelling of "teera" above all.
 */
export const CARD_POINT_COPY: Readonly<
  Record<Locale, Readonly<Record<string, { label: string; instruction: string }>>>
> = {
  en: {
    kameezCardLength: {
      label: 'Length',
      instruction: 'Type the card’s kameez length as written.',
    },
    kameezCardSleeve: {
      label: 'Sleeve',
      instruction: 'Type the card’s sleeve length as written.',
    },
    kameezCardTeera: {
      label: 'Teera (shoulder)',
      instruction: 'We read the card’s teera as half the shoulder: 8.5 is kept as 17. Type it as written.',
    },
    kameezCardNeck: {
      label: 'Gala (neck)',
      instruction: 'We read the card’s neck as the whole way round. Type it as written.',
    },
    kameezCardChest: {
      label: 'Chest',
      instruction: 'We read the card’s chest as half the way round: 19.5 is kept as 39. Type it as written.',
    },
    kameezCardGhera: {
      label: 'Ghera (hem)',
      instruction: 'We read the card’s ghera as half the way round: 20.5 is kept as 41. Type it as written.',
    },
    kameezCardCuff: {
      label: 'Cuff',
      instruction: 'We read the card’s cuff as the whole way round. Type it as written.',
    },
    shalwarCardLength: {
      label: 'Shalwar length',
      instruction: 'Type the card’s shalwar length as written.',
    },
    shalwarCardPoncha: {
      label: 'Trouser bottom (Poncha)',
      instruction: 'We read the card’s poncha as half the way round: 7.5 is kept as 15. Type it as written.',
    },
  },
  ur: {
    kameezCardLength: {
      label: 'لمبائی',
      instruction: 'کارڈ پر لکھی قمیض کی لمبائی ویسی ہی لکھیں۔',
    },
    kameezCardSleeve: {
      label: 'آستین',
      instruction: 'کارڈ پر لکھی آستین کی لمبائی ویسی ہی لکھیں۔',
    },
    kameezCardTeera: {
      // "Shoulder" first: the term alone reads first as the informal "your".
      label: 'کندھا (تیرا)',
      instruction: 'ہم کارڈ کے تیرا کو آدھا کندھا پڑھتے ہیں: 8.5 کو 17 رکھا جاتا ہے۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
    kameezCardNeck: {
      label: 'گلا',
      instruction: 'ہم کارڈ کے گلے کو پورا گھیر پڑھتے ہیں۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
    kameezCardChest: {
      label: 'چھاتی',
      instruction: 'ہم کارڈ کی چھاتی کو آدھا گھیر پڑھتے ہیں: 19.5 کو 39 رکھا جاتا ہے۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
    kameezCardGhera: {
      // One word with the garment path's, which the readout's "around" also uses.
      label: 'دامن کا گھیر',
      instruction: 'ہم کارڈ کے دامن کے گھیر کو آدھا پڑھتے ہیں: 20.5 کو 41 رکھا جاتا ہے۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
    kameezCardCuff: {
      label: 'کف',
      instruction: 'ہم کارڈ کے کف کو پورا گھیر پڑھتے ہیں۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
    shalwarCardLength: {
      label: 'شلوار کی لمبائی',
      instruction: 'کارڈ پر لکھی شلوار کی لمبائی ویسی ہی لکھیں۔',
    },
    shalwarCardPoncha: {
      label: 'پائنچہ',
      instruction: 'ہم کارڈ کے پائنچے کو آدھا گھیر پڑھتے ہیں: 7.5 کو 15 رکھا جاتا ہے۔ جیسا لکھا ہے ویسا لکھیں۔',
    },
  },
};
