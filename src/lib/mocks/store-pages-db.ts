import type { Locale } from '@/i18n/locales';

import { authoredPage, type StaticPagePayload } from './page-authoring';

/**
 * D1 — §28.4's static pages about the store itself: About us, Contact us,
 * Delivery, and Returns and exchanges. Served by §21 `page(slug, locale)` exactly
 * as the help pages are.
 *
 * ## FIXTURE — every word below is placeholder copy for the client to replace
 *
 * It is written to say ONLY what this store does today, so a demo never promises
 * something no system does:
 *
 * - Returns: seven days from delivery, unworn with tags — the product page's
 *   "Delivery and returns" section (`INFO_SECTIONS`) says the same, and the two
 *   must move together. A return is REQUESTED BY CONTACTING the store: there is
 *   no return form yet, and the page says so.
 * - A made-to-measure garment cannot be changed, cancelled or returned once
 *   cutting starts (§34.7), in the words checkout already uses before payment.
 * - Delivery options, their charges, the free-delivery threshold and the cash on
 *   delivery limit are described WITHOUT figures: each is configuration served by
 *   the checkout and bag mocks (`checkout-config-db.ts`, `bag-pricing.ts`), and a
 *   number copied here would drift the first time the operator changed one.
 * - No order tracking, and no text message or email is promised — none is sent.
 *
 * The Contact us page carries no contact details of its own: the route renders
 * them from `CLIENT.contact` (D5), which is itself FIXTURE until the client
 * supplies real ones. The store's history, if the client wants one told, is the
 * client's to write; nothing is invented about it here.
 */

const aboutUs = authoredPage('about-us', {
  en: {
    title: 'About us',
    intro:
      'Al-Asad sells men’s and boys’ ethnic wear across Pakistan: kameez shalwar, waistcoat suits and kurtas.',
    body: [
      { heading: 'What we sell' },
      'Kameez shalwar, three-piece waistcoat suits and kurtas for men, and kurtas for boys — in wash-n-wear, boski, karandi and cotton.',
      { heading: 'Three ways to buy' },
      'Ready to wear, in standard sizes. A set — a waistcoat suit, or a kameez with its shalwar — is sized piece by piece, so each part can fit.',
      'As unstitched cloth, sold by length, for your own tailor. The length is shown on every unstitched product.',
      'Stitched to your measurements. Measure a garment you already own, or copy the figures from your tailor’s card, and we cut the new one to the same fit. The time it takes to make is shown before you pay.',
      { heading: 'Delivery and payment' },
      'We deliver across Pakistan. You can pay in cash on delivery, by debit or credit card, from a mobile wallet or by bank transfer — the payment guide explains each.',
    ],
  },
  ur: {
    title: 'ہمارے بارے میں',
    intro:
      'الاسد پورے پاکستان میں مردوں اور لڑکوں کے روایتی ملبوسات فروخت کرتا ہے: قمیض شلوار، واسکٹ سوٹ اور کرتے۔',
    body: [
      { heading: 'ہم کیا بیچتے ہیں' },
      'مردوں کے لیے قمیض شلوار، تین پیس واسکٹ سوٹ اور کرتے، اور لڑکوں کے لیے کرتے — واش این ویئر، بوسکی، کرنڈی اور کاٹن میں۔',
      { heading: 'خریدنے کے تین طریقے' },
      'تیار، معیاری سائز میں۔ سیٹ — واسکٹ سوٹ، یا شلوار کے ساتھ قمیض — کا ہر حصہ الگ سائز میں لیا جاتا ہے، تاکہ ہر حصہ پورا آئے۔',
      'بغیر سلا کپڑا، لمبائی کے حساب سے، آپ کے اپنے درزی کے لیے۔ ہر بغیر سلے کپڑے پر اس کی لمبائی درج ہوتی ہے۔',
      'آپ کے ناپ پر سلا ہوا۔ اپنا کوئی پہلے سے موجود لباس ناپیں، یا اپنے درزی کے کارڈ سے ناپ لکھیں، اور ہم نیا لباس اسی فٹنگ پر کاٹتے ہیں۔ بننے میں لگنے والا وقت ادائیگی سے پہلے دکھایا جاتا ہے۔',
      { heading: 'ترسیل اور ادائیگی' },
      'ہم پورے پاکستان میں ترسیل کرتے ہیں۔ آپ ڈیلیوری پر نقد، ڈیبٹ یا کریڈٹ کارڈ، موبائل والٹ یا بینک ٹرانسفر سے ادائیگی کر سکتے ہیں — ادائیگی کی رہنمائی میں ہر ایک کی تفصیل ہے۔',
    ],
  },
});

const contactUs = authoredPage('contact-us', {
  en: {
    title: 'Contact us',
    intro:
      'Questions about a product, a size, an order or a return — reach us by phone, WhatsApp or email.',
    body: [
      'If your question is about an order, have your order number ready. It is shown on your order’s page when you place the order.',
      'To return an item, contact us within seven days of delivery with your order number and the item you want to return. There is no online return form yet.',
      'We do not send order updates by text message or email yet, so this page is the way to reach us about an order.',
    ],
  },
  ur: {
    title: 'ہم سے رابطہ',
    intro:
      'کسی چیز، سائز، آرڈر یا واپسی کے بارے میں سوال ہو تو ہم سے فون، واٹس ایپ یا ای میل پر رابطہ کریں۔',
    body: [
      'اگر سوال کسی آرڈر کے بارے میں ہے تو اپنا آرڈر نمبر ساتھ رکھیں۔ آرڈر دیتے وقت یہ آپ کے آرڈر کے صفحے پر دکھایا جاتا ہے۔',
      'کوئی چیز واپس کرنے کے لیے ترسیل کے سات دن کے اندر اپنے آرڈر نمبر اور واپس کی جانے والی چیز کے ساتھ ہم سے رابطہ کریں۔ واپسی کا آن لائن فارم ابھی موجود نہیں۔',
      'ہم ابھی آرڈر کی اطلاعات ایس ایم ایس یا ای میل سے نہیں بھیجتے، اس لیے کسی آرڈر کے بارے میں ہم تک پہنچنے کا طریقہ یہی صفحہ ہے۔',
    ],
  },
});

const delivery = authoredPage('delivery', {
  en: {
    title: 'Delivery',
    intro: 'Where we deliver, what it costs, and how long it takes.',
    body: [
      { heading: 'Where we deliver' },
      'We deliver to addresses across Pakistan.',
      { heading: 'Options and charges' },
      'Checkout lists the delivery options, each with its charge and how long it usually takes. The total you are shown before you place the order includes the delivery charge.',
      'Once your bag passes a set value, delivery is free whichever option you choose. Your bag shows how much more that takes.',
      { heading: 'When it arrives' },
      'Each product page shows an estimated delivery date. It is an estimate, not a promise.',
      'A garment stitched to your measurements is made first and sent after. The time it takes to make is shown at checkout, before you pay.',
      { heading: 'Following your order' },
      'We do not offer delivery tracking yet, and we do not send updates by text message or email. If you want to know where your order is, contact us with your order number.',
      { heading: 'Gifts' },
      'At checkout you can have an order gift-wrapped, with a message on the card. The charge for wrapping is shown there.',
      { heading: 'Paying on delivery' },
      'Cash on delivery is available up to a value limit shown at checkout. Above it, choose another way to pay.',
    ],
  },
  ur: {
    title: 'ترسیل',
    intro: 'ہم کہاں ترسیل کرتے ہیں، اس کا خرچ کتنا ہے، اور کتنا وقت لگتا ہے۔',
    body: [
      { heading: 'ہم کہاں ترسیل کرتے ہیں' },
      'ہم پورے پاکستان کے پتوں پر ترسیل کرتے ہیں۔',
      { heading: 'طریقے اور خرچ' },
      'چیک آؤٹ پر ترسیل کے طریقے، ہر ایک کے خرچ اور عام طور پر لگنے والے وقت کے ساتھ دکھائے جاتے ہیں۔ آرڈر دینے سے پہلے دکھائی جانے والی کل رقم میں ترسیل کا خرچ شامل ہوتا ہے۔',
      'جب آپ کے تھیلے کی رقم ایک مقررہ حد سے بڑھ جائے تو ترسیل مفت ہو جاتی ہے، چاہے آپ کوئی بھی طریقہ چنیں۔ آپ کا تھیلا بتاتا ہے کہ اس کے لیے مزید کتنی خریداری درکار ہے۔',
      { heading: 'آرڈر کب پہنچتا ہے' },
      'ہر مصنوعات کے صفحے پر ترسیل کی متوقع تاریخ دکھائی جاتی ہے۔ یہ ایک اندازہ ہے، وعدہ نہیں۔',
      'آپ کے ناپ پر سلا لباس پہلے تیار ہوتا ہے، پھر بھیجا جاتا ہے۔ بننے میں لگنے والا وقت ادائیگی سے پہلے چیک آؤٹ پر دکھایا جاتا ہے۔',
      { heading: 'آرڈر کی خبر' },
      'ہم ابھی ترسیل کی ٹریکنگ کی سہولت نہیں دیتے، اور نہ ہی ایس ایم ایس یا ای میل سے اطلاعات بھیجتے ہیں۔ اگر آپ جاننا چاہیں کہ آپ کا آرڈر کہاں ہے تو اپنے آرڈر نمبر کے ساتھ ہم سے رابطہ کریں۔',
      { heading: 'تحفے' },
      'چیک آؤٹ پر آپ آرڈر کو تحفے کے طور پر پیک کروا سکتے ہیں، کارڈ پر پیغام کے ساتھ۔ پیکنگ کا خرچ وہیں دکھایا جاتا ہے۔',
      { heading: 'ڈیلیوری پر ادائیگی' },
      'ڈیلیوری پر نقد ادائیگی ایک مقررہ رقم تک دستیاب ہے جو چیک آؤٹ پر دکھائی جاتی ہے۔ اس سے زیادہ کے آرڈر پر ادائیگی کا کوئی دوسرا طریقہ چنیں۔',
    ],
  },
});

const returnsAndExchanges = authoredPage('returns-and-exchanges', {
  en: {
    title: 'Returns and exchanges',
    intro:
      'You can return an item within seven days of delivery, unworn and with its tags attached.',
    body: [
      { heading: 'How to return an item' },
      'Contact us by phone, WhatsApp or email — the details are on the Contact us page, linked at the foot of every page. Tell us your order number and the item you want to return. There is no online return form yet: contacting us is how a return is requested.',
      'How the item comes back to us, and how you are refunded, is arranged with you when you get in touch.',
      { heading: 'Exchanges' },
      'There is no separate exchange. To change a size, return the item as above and place a new order for the size you want.',
      { heading: 'Made to your measurements' },
      'Once we start cutting, a garment made to your measurements cannot be changed, cancelled or returned — it is made to your figures and fits nobody else. Checkout tells you this before you pay, beside the price.',
      'Everything else in the same order can be returned as usual.',
    ],
  },
  ur: {
    title: 'واپسی اور تبادلہ',
    intro: 'آپ کوئی چیز ترسیل کے سات دن کے اندر واپس کر سکتے ہیں، بغیر پہنے اور ٹیگ کے ساتھ۔',
    body: [
      { heading: 'چیز کیسے واپس کریں' },
      'ہم سے فون، واٹس ایپ یا ای میل پر رابطہ کریں — تفصیلات "ہم سے رابطہ" کے صفحے پر ہیں، جس کا لنک ہر صفحے کے آخر میں ہے۔ ہمیں اپنا آرڈر نمبر اور وہ چیز بتائیں جو آپ واپس کرنا چاہتے ہیں۔ واپسی کا آن لائن فارم ابھی موجود نہیں: واپسی کی درخواست ہم سے رابطہ کر کے ہی کی جاتی ہے۔',
      'چیز ہم تک کیسے واپس آئے گی، اور رقم کیسے واپس ملے گی، یہ آپ کے رابطہ کرنے پر آپ کے ساتھ طے کیا جاتا ہے۔',
      { heading: 'تبادلہ' },
      'تبادلے کا الگ کوئی طریقہ نہیں۔ سائز بدلنے کے لیے چیز اوپر بتائے گئے طریقے سے واپس کریں اور مطلوبہ سائز کا نیا آرڈر دیں۔',
      { heading: 'آپ کے ناپ پر بنا لباس' },
      'کٹائی شروع ہونے کے بعد آپ کے ناپ پر بنا لباس نہ بدلا جا سکتا ہے، نہ منسوخ اور نہ واپس — وہ آپ کے اعداد پر بنتا ہے اور کسی اور کو نہیں آتا۔ چیک آؤٹ پر یہ بات ادائیگی سے پہلے، قیمت کے ساتھ بتائی جاتی ہے۔',
      'اسی آرڈر کی باقی اشیاء معمول کے مطابق واپس کی جا سکتی ہیں۔',
    ],
  },
});

/** By the slug each is served under. */
export const STORE_PAGES: Readonly<Record<string, (locale: Locale) => StaticPagePayload>> = {
  'about-us': aboutUs,
  'contact-us': contactUs,
  delivery,
  'returns-and-exchanges': returnsAndExchanges,
};
