import type { Messages } from './en';

/**
 * SSOT-07 — structurally checked against `Messages`.
 *
 * I18N-09: fabric and garment vocabulary carried by the backend's
 * protected-terms list is rendered exactly as supplied and is never
 * transliterated here. The interface labels below are ordinary translatable
 * copy and carry no protected terms.
 */
export const ur: Messages = {
  site: {
    name: 'الاسد',
    tagline: 'روایتی ملبوسات، سلے اور بغیر سلے۔',
  },
  nav: {
    home: 'صفحۂ اول',
    catalogue: 'مجموعہ',
    unstitched: 'بغیر سلے',
    stitched: 'سلے ہوئے',
    search: 'تلاش',
    bag: 'تھیلا',
    signIn: 'سائن اِن',
    skipToContent: 'مواد پر جائیں',
    primaryLabel: 'بنیادی نیویگیشن',
    footerLabel: 'فوٹر نیویگیشن',
    openMenu: 'مینو کھولیں',
    closeMenu: 'مینو بند کریں',
  },
  common: {
    switchToUrdu: 'اردو',
    switchToEnglish: 'English',
    languageGroupLabel: 'زبان',
    loading: 'لوڈ ہو رہا ہے…',
    retry: 'دوبارہ کوشش کریں',
    viewAll: 'سب دیکھیں',
    submit: 'جمع کریں',
  },
  product: {
    newBadge: 'نیا',
    discountBadge: 'رعایت',
    lowStockBadge: 'اسٹاک کم ہے',
    soldOutBadge: 'ختم ہو گیا',
    setLabel: 'سیٹ',
    pieceCountLabel: 'اجزاء',
    originalPriceLabel: 'پہلے',
    metreageLabel: 'کپڑے کی لمبائی',
    colourLabel: 'رنگ',
    imageAlt: 'مصنوعات کی تصویر',
  },
  home: {
    metaTitle: 'روایتی ملبوسات، سلے اور بغیر سلے',
    metaDescription:
      'لان، کاٹن اور شفون، سلے اور بغیر سلے۔ پورے پاکستان میں ترسیل، کیش آن ڈیلیوری دستیاب ہے۔',
    railScrollLabel: 'مصنوعات دیکھیں',
  },
  newsletter: {
    heading: 'نئی آمد، سب سے پہلے آپ کے لیے',
    body: 'جب کوئی نیا مجموعہ آئے گا تو ایک پیغام۔ اس کے سوا کچھ نہیں۔',
    emailLabel: 'ای میل پتہ',
    emailPlaceholder: 'you@example.com',
    subscribeCta: 'شامل ہوں',
    successMessage: 'آپ فہرست میں شامل ہیں۔ اگلی لانچ کا انتظار کریں۔',
    invalidEmail: 'درست ای میل پتہ درج کریں۔',
  },
  auth: {
    signInHeading: 'سائن اِن',
    signInBody: 'اصل تصدیقی نظام تیار ہونے تک یہ عارضی سائن اِن ہے۔',
    mobileLabel: 'موبائل نمبر',
    mobilePlaceholder: '03xx xxxxxxx',
    signInCta: 'جاری رکھیں',
    invalidMobile: 'درست پاکستانی موبائل نمبر درج کریں۔',
    signedInAs: 'سائن اِن ہیں',
    signOut: 'سائن آؤٹ',
    placeholderNotice:
      'یہ صفحہ عارضی ہے۔ یہ صرف ایک نمونہ سیشن بناتا ہے اور کوئی معلومات محفوظ نہیں کرتا۔',
  },
  footer: {
    helpHeading: 'مدد',
    shopHeading: 'خریداری',
    fabricGlossary: 'کپڑوں کی لغت',
    paymentGuide: 'ادائیگی کی رہنمائی',
    sizeGuide: 'سائز کی رہنمائی',
    careGuide: 'دیکھ بھال کی رہنمائی',
    rightsReserved: 'جملہ حقوق محفوظ ہیں۔',
  },
  catalogue: {
    title: 'مجموعہ',
    breadcrumbHome: 'صفحۂ اول',
    productCount: { one: '{count} مصنوعات', other: '{count} مصنوعات' },
    noResultsHeading: 'ان فلٹرز سے کچھ نہیں ملا',
    noResultsBody: 'کوئی فلٹر ہٹا کر دیکھیں، یا پورا مجموعہ دیکھیں۔',
    clearFilters: 'تمام فلٹر ہٹائیں',
    browseAll: 'سب کچھ دیکھیں',
    previousPage: 'پچھلا صفحہ',
    nextPage: 'اگلا صفحہ',
    paginationLabel: 'صفحہ بندی',
    goToPage: { one: 'صفحہ {count} پر جائیں', other: 'صفحہ {count} پر جائیں' },
    quickAdd: 'فوری شامل کریں',
    quickAddPending: 'فوری شامل کرنا تھیلے کے ساتھ آئے گا',
    quickView: 'فوری جھلک',
  },
  search: {
    title: 'تلاش',
    inputLabel: 'مصنوعات تلاش کریں',
    placeholder: 'لان، شفون، یا پروڈکٹ کوڈ…',
    submit: 'تلاش کریں',
    resultsHeading: 'نتائج',
    noResultsHeading: 'کوئی نتیجہ نہیں',
    noResultsBody: 'ہجے دیکھیں، کپڑے کا نام آزمائیں، یا مجموعہ دیکھیں۔',
  },
  theme: {
    switchToDark: 'ڈارک موڈ پر جائیں',
    switchToLight: 'لائٹ موڈ پر جائیں',
  },
  errors: {
    network: 'ہم اسٹور تک نہیں پہنچ سکے۔ براہِ کرم دوبارہ کوشش کریں۔',
    unexpected: 'کچھ غلط ہو گیا۔ براہِ کرم دوبارہ کوشش کریں۔',
  },
};
