import type { Messages } from './en';

/**
 * SSOT-07 — structurally checked against `Messages`.
 *
 * I18N-09: 'Al-Asad' is a proper noun carried as supplied; garment and fabric
 * vocabulary arriving from the backend's protected-terms list is likewise
 * rendered verbatim and never transliterated here.
 */
export const ur: Messages = {
  site: {
    name: 'الاسد',
    tagline: 'روایتی ملبوسات، سلے اور بغیر سلے۔',
  },
  nav: {
    home: 'صفحۂ اول',
    catalogue: 'مجموعہ',
    search: 'تلاش',
    bag: 'تھیلا',
    signIn: 'سائن اِن',
    skipToContent: 'مواد پر جائیں',
    primary: 'بنیادی',
    footer: 'فوٹر',
  },
  common: {
    switchToUrdu: 'اردو',
    switchToEnglish: 'English',
    languageGroupLabel: 'زبان',
    loading: 'لوڈ ہو رہا ہے…',
    retry: 'دوبارہ کوشش کریں',
  },
  foundation: {
    heading: 'بنیاد کام کر رہی ہے',
    body: 'رجسٹریاں، ٹائپ شدہ API کلائنٹ، ماک پرت اور دو طرفہ لے آؤٹ تیار ہیں۔ اسٹور کے ماڈیول اسی پر بنیں گے۔',
    backendLabel: 'بیک اینڈ',
    backendReachable: 'دستیاب',
    backendVersionLabel: 'معاہدہ ورژن',
    mockLabel: 'ماخذ',
    mockEnabled: 'HTTP سرحد پر ماک',
    mockDisabled: 'زندہ جاوا سروس',
    directionLabel: 'سمت',
    sampleAmountLabel: 'نمونہ قیمت',
    primaryAction: 'بنیادی عمل',
    secondaryAction: 'ثانوی عمل',
  },
  errors: {
    network: 'ہم اسٹور تک نہیں پہنچ سکے۔ براہِ کرم دوبارہ کوشش کریں۔',
    unexpected: 'کچھ غلط ہو گیا۔ براہِ کرم دوبارہ کوشش کریں۔',
  },
};
