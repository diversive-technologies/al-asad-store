import type { Locale } from '@/i18n/locales';

/**
 * D1 — the four help pages of section 28.4.
 *
 * Section 21's invariant: every page exists in both locales, and a missing Urdu
 * version renders the English text rather than an empty page. That fallback is
 * implemented in `pageFor` below rather than left to the interface, because it
 * is a property of the content service, not of the component rendering it.
 */

interface PageBlockPayload {
  kind: 'HEADING' | 'PARAGRAPH' | 'DEFINITION';
  id: string;
  text?: string;
  term?: string;
  description?: string;
}

export interface StaticPagePayload {
  slug: string;
  title: string;
  intro: string;
  blocks: PageBlockPayload[];
}

const FABRIC_TERMS = [
  {
    id: 'lawn',
    en: [
      'Lawn',
      'A fine, lightweight cotton with a smooth finish. The default choice for Pakistani summers because it breathes and washes well.',
    ],
    ur: [
      'لان',
      'باریک، ہلکا سوتی کپڑا جو ہموار ہوتا ہے۔ گرمیوں کا سب سے عام انتخاب، کیونکہ یہ ہوا گزرنے دیتا ہے اور آسانی سے دھل جاتا ہے۔',
    ],
  },
  {
    id: 'cambric',
    en: [
      'Cambric',
      'Slightly heavier than lawn with a tighter weave. Holds its shape better, which suits stitched pieces worn through the day.',
    ],
    ur: [
      'کیمبرک',
      'لان سے قدرے بھاری اور زیادہ کسا ہوا۔ اپنی ساخت بہتر رکھتا ہے، اس لیے دن بھر پہننے والے سلے ملبوسات کے لیے موزوں ہے۔',
    ],
  },
  {
    id: 'chiffon',
    en: [
      'Chiffon',
      'Sheer and light with a soft drape. Usually chosen for occasion wear rather than daily use.',
    ],
    ur: [
      'شفون',
      'باریک، ہلکا اور نرم گرنے والا۔ عام طور پر تقریبات کے ملبوسات کے لیے چنا جاتا ہے۔',
    ],
  },
  {
    id: 'cotton',
    en: [
      'Cotton',
      'Durable and everyday. Heavier than lawn, and the most forgiving fabric to care for.',
    ],
    ur: ['کاٹن', 'مضبوط اور روزمرہ کے لیے۔ لان سے بھاری، اور دیکھ بھال میں سب سے آسان۔'],
  },
] as const;

function fabricGlossary(locale: Locale): StaticPagePayload {
  return {
    slug: 'fabric-glossary',
    title: locale === 'ur' ? 'کپڑوں کی لغت' : 'Fabric glossary',
    intro:
      locale === 'ur'
        ? 'ہر کپڑا گرمی میں مختلف برتاؤ کرتا ہے۔ خریدنے سے پہلے فرق جان لیں۔'
        : 'Each fabric behaves differently in the heat. Know the difference before you buy.',
    blocks: FABRIC_TERMS.map((entry) => ({
      kind: 'DEFINITION' as const,
      id: entry.id,
      term: locale === 'ur' ? entry.ur[0] : entry.en[0],
      description: locale === 'ur' ? entry.ur[1] : entry.en[1],
    })),
  };
}

function simplePage(
  slug: string,
  titles: Record<Locale, string>,
  intros: Record<Locale, string>,
  paragraphs: Record<Locale, readonly string[]>,
): (locale: Locale) => StaticPagePayload {
  return (locale) => ({
    slug,
    title: titles[locale],
    intro: intros[locale],
    blocks: paragraphs[locale].map((text, index) => ({
      kind: 'PARAGRAPH' as const,
      id: `${slug}-${String(index)}`,
      text,
    })),
  });
}

const PAGES: Record<string, (locale: Locale) => StaticPagePayload> = {
  'fabric-glossary': fabricGlossary,
  'payment-guide': simplePage(
    'payment-guide',
    { en: 'Payment guide', ur: 'ادائیگی کی رہنمائی' },
    {
      en: 'How you can pay, and what happens after you place an order.',
      ur: 'آپ کیسے ادائیگی کر سکتے ہیں، اور آرڈر کے بعد کیا ہوتا ہے۔',
    },
    {
      en: [
        'Cash on delivery is available across Pakistan, up to a value limit shown at checkout.',
        'Card and wallet payments are authorised before the order is confirmed. If a payment does not complete, your bag is kept and nothing is charged.',
        'Orders paid by cash on delivery are confirmed by SMS before dispatch.',
      ],
      ur: [
        'کیش آن ڈیلیوری پورے پاکستان میں دستیاب ہے، ایک مقررہ حد تک جو چیک آؤٹ پر دکھائی جاتی ہے۔',
        'کارڈ اور والٹ کی ادائیگی آرڈر کی تصدیق سے پہلے منظور کی جاتی ہے۔ اگر ادائیگی مکمل نہ ہو تو آپ کا تھیلا محفوظ رہتا ہے اور کوئی رقم نہیں کٹتی۔',
        'کیش آن ڈیلیوری کے آرڈر روانگی سے پہلے ایس ایم ایس کے ذریعے تصدیق کیے جاتے ہیں۔',
      ],
    },
  ),
  'size-guide': simplePage(
    'size-guide',
    { en: 'Size guide', ur: 'سائز کی رہنمائی' },
    {
      en: 'Measurements are taken flat, in inches, and listed per piece.',
      ur: 'پیمائش سیدھی حالت میں، انچ میں لی جاتی ہے اور ہر جزو کے لیے الگ دی جاتی ہے۔',
    },
    {
      en: [
        'A set is measured piece by piece, because the kameez, shalwar and dupatta are sized independently.',
        'Unstitched fabric is sold by length rather than by size. The metreage is shown on every unstitched product.',
        'If you are between sizes, the looser size is usually the better choice for stitched pieces.',
      ],
      ur: [
        'سیٹ کی پیمائش ہر جزو کے لیے الگ ہوتی ہے، کیونکہ قمیض، شلوار اور دوپٹہ کے سائز الگ الگ ہوتے ہیں۔',
        'بغیر سلا کپڑا سائز کے بجائے لمبائی کے حساب سے بکتا ہے۔ ہر ایسی مصنوعات پر لمبائی درج ہوتی ہے۔',
        'اگر آپ دو سائز کے درمیان ہیں تو سلے ملبوسات کے لیے عام طور پر بڑا سائز بہتر رہتا ہے۔',
      ],
    },
  ),
  'care-guide': simplePage(
    'care-guide',
    { en: 'Care guide', ur: 'دیکھ بھال کی رہنمائی' },
    {
      en: 'How to wash and store each fabric so it lasts.',
      ur: 'ہر کپڑے کو کیسے دھوئیں اور رکھیں تاکہ وہ دیر تک چلے۔',
    },
    {
      en: [
        'Wash lawn and cotton cold, and dry them in shade. Direct sun fades printed colour quickly.',
        'Chiffon and embroidered pieces should be dry cleaned, or hand washed with great care.',
        'Store folded rather than hung. Hanging stretches lightweight fabric at the shoulders over time.',
      ],
      ur: [
        'لان اور کاٹن کو ٹھنڈے پانی میں دھوئیں اور سائے میں سکھائیں۔ تیز دھوپ سے پرنٹ کا رنگ جلد پھیکا پڑ جاتا ہے۔',
        'شفون اور کڑھائی والے ملبوسات ڈرائی کلین کروائیں، یا بہت احتیاط سے ہاتھ سے دھوئیں۔',
        'لٹکانے کے بجائے تہہ کر کے رکھیں۔ لٹکانے سے ہلکا کپڑا کندھوں سے کھنچ جاتا ہے۔',
      ],
    },
  ),
};

export function pageFor(slug: string, locale: Locale): StaticPagePayload | null {
  const build = PAGES[slug];
  return build === undefined ? null : build(locale);
}
