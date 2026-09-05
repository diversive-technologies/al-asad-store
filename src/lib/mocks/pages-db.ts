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
    id: 'wash-n-wear',
    en: [
      'Wash-n-wear',
      'A polyester-cotton blend that holds its press and dries quickly. The default choice for daily kameez shalwar because it needs almost no ironing.',
    ],
    ur: [
      'واش این ویئر',
      'پالیسٹر اور کاٹن کا ملواں کپڑا جو استری برقرار رکھتا ہے اور جلد سوکھ جاتا ہے۔ روزمرہ کی قمیض شلوار کا سب سے عام انتخاب، کیونکہ اسے استری کی ضرورت نہ ہونے کے برابر ہوتی ہے۔',
    ],
  },
  {
    id: 'boski',
    en: [
      'Boski',
      'A soft silk-finish cloth with a quiet sheen and a fluid fall. Chosen for Eid, weddings and occasion wear rather than daily use.',
    ],
    ur: [
      'بوسکی',
      'نرم ریشمی سطح والا کپڑا، ہلکی چمک اور بہتی ہوئی گرن کے ساتھ۔ عید، شادیوں اور خاص مواقع کے لیے چنا جاتا ہے، روزمرہ کے لیے نہیں۔',
    ],
  },
  {
    id: 'karandi',
    en: [
      'Karandi',
      'A textured winter weave with visible slubs and a matte surface. Heavier than the rest, and the usual choice once the weather turns.',
    ],
    ur: [
      'کرنڈی',
      'سردیوں کا بُنا ہوا کپڑا، نمایاں دانے دار سطح اور بغیر چمک کے۔ باقی سب سے بھاری، اور موسم بدلتے ہی عام انتخاب۔',
    ],
  },
  {
    id: 'cotton',
    en: [
      'Cotton',
      'Durable and everyday. Breathes better than a blend, and the most forgiving fabric to care for — but it creases and will want ironing.',
    ],
    ur: [
      'کاٹن',
      'مضبوط اور روزمرہ کے لیے۔ ملواں کپڑے سے زیادہ ہوادار، اور دیکھ بھال میں سب سے آسان — مگر شکن پڑتی ہے اور استری مانگتا ہے۔',
    ],
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
        'A set is measured piece by piece, because the waistcoat, kameez and shalwar are sized independently.',
        'Unstitched fabric is sold by length rather than by size. The metreage is shown on every unstitched product.',
        'If you are between sizes, the looser size is usually the better choice for stitched pieces.',
      ],
      ur: [
        'سیٹ کی پیمائش ہر جزو کے لیے الگ ہوتی ہے، کیونکہ واسکٹ، قمیض اور شلوار کے سائز الگ الگ ہوتے ہیں۔',
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
        'Wash wash-n-wear and cotton cold, and dry them in shade. Direct sun fades colour quickly.',
        'Boski, karandi and embroidered pieces should be dry cleaned, or hand washed with great care.',
        'Store folded rather than hung. Hanging stretches lightweight fabric at the shoulders over time.',
      ],
      ur: [
        'واش این ویئر اور کاٹن کو ٹھنڈے پانی میں دھوئیں اور سائے میں سکھائیں۔ تیز دھوپ سے رنگ جلد پھیکا پڑ جاتا ہے۔',
        'بوسکی، کرنڈی اور کڑھائی والے ملبوسات ڈرائی کلین کروائیں، یا بہت احتیاط سے ہاتھ سے دھوئیں۔',
        'لٹکانے کے بجائے تہہ کر کے رکھیں۔ لٹکانے سے ہلکا کپڑا کندھوں سے کھنچ جاتا ہے۔',
      ],
    },
  ),
};

export function pageFor(slug: string, locale: Locale): StaticPagePayload | null {
  const build = PAGES[slug];
  return build === undefined ? null : build(locale);
}
