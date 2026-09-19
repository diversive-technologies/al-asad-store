import type { Locale } from '@/i18n/locales';

import { authoredPage, type StaticPagePayload } from './page-authoring';

/**
 * D1 — §28.4's static pages that read like policy: Terms of sale and Privacy.
 *
 * ## FIXTURE — NO LEGAL AUTHORITY. The client's lawyer replaces both pages.
 *
 * Neither page is legal text and neither was written by anyone qualified to
 * write one. They are placeholders that describe, plainly, what THIS storefront
 * does today, so a demo shows the right shape and says nothing false; they are
 * not terms a customer could be held to, nor a notice that meets any privacy law.
 *
 * What they say was read off the code, not assumed:
 *
 * - Terms — the total is `subtotal − discount + delivery + gift` (§6.5), a price
 *   change during checkout is shown and asked about again (§7.2 step 2), a bag
 *   holds items for a limited time (§7.1), the four payment methods and the cash
 *   on delivery limit (`checkout-config-db.ts`, described without figures), and
 *   the cut cutoff (§34.7).
 * - Privacy — every cookie and every browser-storage entry the storefront sets:
 *   the bag, the guest measurements token, the session, the order-access grants,
 *   the language, the theme, the phone grid, and the saved list a browser keeps
 *   before its customer signs in. Nothing is erased (D6), and every measurement
 *   version is kept (§34.7). Try-on photographs are never stored (§24, §30.4),
 *   and a tailor's-card photo never leaves the browser. No analytics or
 *   advertising cookie exists, and the page says so; if one is ever added, this
 *   page is wrong until it is updated.
 *
 * Durations are left out on purpose: each is a constant in the code
 * (`cart-cookie.ts`, `profile-owner.ts`, `auth/actions.ts`, `order-access-cookie.ts`)
 * that would drift from a copy here. The lawyer's version will want them stated.
 */

const termsOfSale = authoredPage('terms-of-sale', {
  en: {
    title: 'Terms of sale',
    intro: 'How buying from Al-Asad works: prices, orders, payment, delivery and returns.',
    body: [
      { heading: 'Prices' },
      'Prices are in Pakistani rupees. What you pay is the total shown at checkout when you place the order: the items, less any discount, plus the delivery charge, and gift wrapping if you chose it.',
      'If a price or availability changes while you are checking out, checkout shows you the new total and asks you to place the order again, rather than placing it at a total you did not see.',
      { heading: 'Your bag' },
      'An item in your bag is held for you for a limited time, and the bag shows until when. When the hold ends, the item goes back on sale and leaves your bag.',
      { heading: 'Orders' },
      'Your order is placed when checkout accepts it and gives it an order number. The order’s page shows what you ordered, where it is going and how you are paying.',
      { heading: 'Payment' },
      'You can pay in cash on delivery, by debit or credit card, from a mobile wallet, or by bank transfer. Cash on delivery is available up to a value limit shown at checkout. For a bank transfer, the account to pay into and the amount are shown once the order is placed, and your order number is the reference.',
      { heading: 'Delivery' },
      'Delivery is described on the Delivery page. The delivery date shown on a product page is an estimate.',
      { heading: 'Returns' },
      'Returns are described on the Returns and exchanges page: within seven days of delivery, unworn and with tags attached, requested by contacting us.',
      { heading: 'Made to your measurements' },
      'A garment made to your measurements is cut to the measurements you had saved when you added it to your bag. If you save your measurements again afterwards, it is not cut until you add it again. Once cutting starts, it cannot be changed, cancelled or returned.',
    ],
  },
  ur: {
    title: 'فروخت کی شرائط',
    intro: 'الاسد سے خریداری کیسے ہوتی ہے: قیمتیں، آرڈر، ادائیگی، ترسیل اور واپسی۔',
    body: [
      { heading: 'قیمتیں' },
      'قیمتیں پاکستانی روپے میں ہیں۔ آپ وہی رقم ادا کرتے ہیں جو آرڈر دیتے وقت چیک آؤٹ پر کل رقم کے طور پر دکھائی جاتی ہے: اشیاء کی قیمت، رعایت منہا کر کے، اور ترسیل کا خرچ، اور اگر آپ نے چنا ہو تو تحفے کی پیکنگ کا خرچ جمع کر کے۔',
      'اگر چیک آؤٹ کے دوران کوئی قیمت یا دستیابی بدل جائے تو چیک آؤٹ آپ کو نئی کل رقم دکھاتا ہے اور آرڈر دوبارہ دینے کو کہتا ہے، بجائے اس کے کہ آرڈر ایسی رقم پر دیا جائے جو آپ نے نہیں دیکھی۔',
      { heading: 'آپ کا تھیلا' },
      'تھیلے میں رکھی چیز ایک محدود وقت کے لیے آپ کے لیے مخصوص رہتی ہے، اور تھیلا بتاتا ہے کہ کب تک۔ یہ وقت ختم ہونے پر چیز دوبارہ فروخت کے لیے دستیاب ہو جاتی ہے اور آپ کے تھیلے سے نکل جاتی ہے۔',
      { heading: 'آرڈر' },
      'آپ کا آرڈر اس وقت دیا جاتا ہے جب چیک آؤٹ اسے قبول کر کے آرڈر نمبر دے۔ آرڈر کے صفحے پر دکھایا جاتا ہے کہ آپ نے کیا منگوایا، وہ کہاں جا رہا ہے اور آپ کیسے ادائیگی کر رہے ہیں۔',
      { heading: 'ادائیگی' },
      'آپ ڈیلیوری پر نقد، ڈیبٹ یا کریڈٹ کارڈ، موبائل والٹ یا بینک ٹرانسفر سے ادائیگی کر سکتے ہیں۔ ڈیلیوری پر نقد ادائیگی ایک مقررہ رقم تک دستیاب ہے جو چیک آؤٹ پر دکھائی جاتی ہے۔ بینک ٹرانسفر کے لیے اکاؤنٹ اور رقم آرڈر دینے کے بعد دکھائے جاتے ہیں، اور حوالے میں آپ کا آرڈر نمبر لکھا جاتا ہے۔',
      { heading: 'ترسیل' },
      'ترسیل کی تفصیل "ترسیل" کے صفحے پر ہے۔ مصنوعات کے صفحے پر دکھائی گئی ترسیل کی تاریخ ایک اندازہ ہے۔',
      { heading: 'واپسی' },
      'واپسی کی تفصیل "واپسی اور تبادلہ" کے صفحے پر ہے: ترسیل کے سات دن کے اندر، بغیر پہنے اور ٹیگ کے ساتھ، اور درخواست ہم سے رابطہ کر کے کی جاتی ہے۔',
      { heading: 'آپ کے ناپ پر بنا لباس' },
      'آپ کے ناپ پر بنا لباس ان ناپوں پر کاٹا جاتا ہے جو اسے تھیلے میں ڈالتے وقت آپ نے محفوظ کیے ہوئے تھے۔ اگر اس کے بعد آپ اپنے ناپ دوبارہ محفوظ کریں تو اسے دوبارہ تھیلے میں ڈالنے تک نہیں کاٹا جاتا۔ کٹائی شروع ہونے کے بعد اسے نہ بدلا جا سکتا ہے، نہ منسوخ اور نہ واپس کیا جا سکتا ہے۔',
    ],
  },
});

const privacyPolicy = authoredPage('privacy-policy', {
  en: {
    title: 'Privacy',
    intro: 'What this store keeps about you, where it keeps it, and why.',
    body: [
      { heading: 'When you place an order' },
      'Checkout asks for your name, mobile number and delivery address, and an email address if you choose to give one. They are kept with the order, because the order is the record of what was sold and where it went.',
      'Anyone with an order number and the mobile number it was placed with can open that order’s page, which shows the delivery address. Keep them to yourself.',
      { heading: 'If you sign in' },
      'Your name, email address and mobile number are kept with your account, along with what you choose to keep there: saved addresses, saved items, saved sizes and measurements. Your orders are listed in your account.',
      { heading: 'Your measurements' },
      'If you are signed in, measurements you save are kept with your account. If you are not, they are kept on file for this browser, which a cookie identifies; signing in does not move them to your account yet.',
      'Every version of your measurements is kept. Saving changed measurements adds a new version rather than replacing the old one, because a garment may already have been cut to it.',
      { heading: 'Nothing is erased' },
      'When you remove a saved item, an address or a saved size, the store records that you removed it and stops showing it, but keeps the record. The same is true of an item removed from your bag.',
      { heading: 'Photographs' },
      'Try-on photographs are never stored. A photo you upload to see a garment on yourself is used to make that one picture and then discarded, whether it works or fails. It is not written to storage, to backups or to logs, and the picture made from it is sent to your browser and not kept.',
      'A photo of a tailor’s card that you choose while measuring stays in your browser: it is shown beside the form and never sent to us.',
      { heading: 'Requests and the newsletter' },
      'If you ask to be told when a sold-out size is back, we keep that request, with your account or with the email address you gave for it. If you subscribe to the newsletter, we keep your email address for it.',
      { heading: 'Cookies and browser storage' },
      'This store sets no advertising or analytics cookies. It uses only these, each for the one job named.',
      'Bag — which bag is yours, so it is still there when you come back.',
      'Measurements — which measurements are yours, when you saved them without signing in.',
      'Signed in — keeps you signed in until you sign out or it expires.',
      'Orders — lets this browser open an order placed or looked up from it, for a while afterwards, without asking for the mobile number again.',
      'Language — the language you read the store in, set on your first visit.',
      'Theme — light or dark, if you chose one.',
      'Grid — how many products a row shows on a phone, if you chose.',
      'Saved items in this browser — items saved before signing in are kept in the browser’s own storage and not sent to us until you sign in; they are then added to your account and cleared from the browser.',
      'Clearing these in your browser’s settings empties your bag, signs you out, and means this browser can no longer open measurements saved without signing in.',
      { heading: 'Payment details' },
      'Card and wallet details are never kept by this store.',
      { heading: 'Questions' },
      'To ask what is kept about you, contact us — the details are on the Contact us page.',
    ],
  },
  ur: {
    title: 'رازداری',
    intro: 'یہ اسٹور آپ کے بارے میں کیا رکھتا ہے، کہاں رکھتا ہے، اور کیوں۔',
    body: [
      { heading: 'جب آپ آرڈر دیتے ہیں' },
      'چیک آؤٹ پر آپ کا نام، موبائل نمبر اور ترسیل کا پتہ مانگا جاتا ہے، اور اگر آپ چاہیں تو ای میل ایڈریس بھی۔ یہ آرڈر کے ساتھ رکھے جاتے ہیں، کیونکہ آرڈر ہی اس بات کا ریکارڈ ہے کہ کیا بیچا گیا اور کہاں بھیجا گیا۔',
      'جس کسی کے پاس آرڈر نمبر اور وہ موبائل نمبر ہو جس سے آرڈر دیا گیا تھا، وہ اس آرڈر کا صفحہ کھول سکتا ہے، جس پر ترسیل کا پتہ دکھایا جاتا ہے۔ انہیں اپنے تک رکھیں۔',
      { heading: 'اگر آپ سائن اِن کریں' },
      'آپ کا نام، ای میل ایڈریس اور موبائل نمبر آپ کے اکاؤنٹ کے ساتھ رکھے جاتے ہیں، اور وہ سب بھی جو آپ وہاں رکھنا چاہیں: محفوظ پتے، محفوظ اشیاء، محفوظ سائز اور ناپ۔ آپ کے آرڈر آپ کے اکاؤنٹ میں درج ہوتے ہیں۔',
      { heading: 'آپ کے ناپ' },
      'اگر آپ سائن اِن ہیں تو آپ کے محفوظ کیے گئے ناپ آپ کے اکاؤنٹ کے ساتھ رکھے جاتے ہیں۔ اگر نہیں، تو وہ اس براؤزر کے لیے محفوظ رہتے ہیں، جسے ایک کوکی پہچانتی ہے؛ سائن اِن کرنے سے وہ ابھی آپ کے اکاؤنٹ میں منتقل نہیں ہوتے۔',
      'آپ کے ناپ کا ہر نسخہ رکھا جاتا ہے۔ بدلے ہوئے ناپ محفوظ کرنے سے پرانا نسخہ بدلا نہیں جاتا بلکہ نیا نسخہ شامل ہوتا ہے، کیونکہ ممکن ہے کوئی لباس پہلے ہی پرانے ناپ پر کاٹا جا چکا ہو۔',
      { heading: 'کچھ مٹایا نہیں جاتا' },
      'جب آپ کوئی محفوظ چیز، پتہ یا محفوظ سائز ہٹاتے ہیں تو اسٹور یہ درج کرتا ہے کہ آپ نے اسے ہٹایا اور اسے دکھانا بند کر دیتا ہے، مگر ریکارڈ رکھتا ہے۔ تھیلے سے ہٹائی گئی چیز کا بھی یہی حال ہے۔',
      { heading: 'تصاویر' },
      'ٹرائی آن کی تصاویر کبھی محفوظ نہیں کی جاتیں۔ خود پر لباس دیکھنے کے لیے اپ لوڈ کی گئی تصویر صرف وہی ایک تصویر بنانے میں استعمال ہوتی ہے اور پھر ضائع کر دی جاتی ہے، کام ہو یا نہ ہو۔ وہ نہ کہیں محفوظ کی جاتی ہے، نہ بیک اپ میں اور نہ لاگ میں، اور اس سے بنی تصویر آپ کے براؤزر کو بھیج دی جاتی ہے اور رکھی نہیں جاتی۔',
      'ناپ لیتے وقت آپ درزی کے کارڈ کی جو تصویر چنتے ہیں وہ آپ کے براؤزر ہی میں رہتی ہے: وہ فارم کے ساتھ دکھائی جاتی ہے اور ہمیں کبھی نہیں بھیجی جاتی۔',
      { heading: 'درخواستیں اور نیوز لیٹر' },
      'اگر آپ کہیں کہ کوئی ختم شدہ سائز واپس آنے پر آپ کو بتایا جائے تو ہم وہ درخواست آپ کے اکاؤنٹ کے ساتھ، یا اس کے لیے دیے گئے ای میل ایڈریس کے ساتھ رکھتے ہیں۔ اگر آپ نیوز لیٹر کے لیے اندراج کریں تو ہم اس کے لیے آپ کا ای میل ایڈریس رکھتے ہیں۔',
      { heading: 'کوکیز اور براؤزر اسٹوریج' },
      'یہ اسٹور کوئی اشتہاری یا تجزیاتی کوکی استعمال نہیں کرتا۔ یہ صرف یہ استعمال کرتا ہے، ہر ایک بتائے گئے ایک ہی کام کے لیے۔',
      'تھیلا — کون سا تھیلا آپ کا ہے، تاکہ واپس آنے پر بھی موجود رہے۔',
      'ناپ — کون سے ناپ آپ کے ہیں، جب آپ نے انہیں سائن اِن کیے بغیر محفوظ کیا ہو۔',
      'سائن اِن — آپ کو سائن اِن رکھتی ہے، جب تک آپ سائن آؤٹ نہ کریں یا اس کی مدت ختم نہ ہو۔',
      'آرڈر — اس براؤزر سے دیا گیا یا تلاش کیا گیا آرڈر، کچھ عرصے تک، موبائل نمبر دوبارہ پوچھے بغیر کھولنے دیتی ہے۔',
      'زبان — وہ زبان جس میں آپ اسٹور پڑھتے ہیں، جو آپ کے پہلے دورے پر مقرر ہوتی ہے۔',
      'تھیم — روشن یا تاریک، اگر آپ نے چنا ہو۔',
      'گرڈ — فون پر ایک قطار میں کتنی مصنوعات دکھائی جائیں، اگر آپ نے چنا ہو۔',
      'اس براؤزر میں محفوظ اشیاء — سائن اِن سے پہلے محفوظ کی گئی اشیاء براؤزر کے اپنے اسٹوریج میں رہتی ہیں اور سائن اِن تک ہمیں نہیں بھیجی جاتیں؛ پھر وہ آپ کے اکاؤنٹ میں شامل ہو جاتی ہیں اور براؤزر سے ہٹا دی جاتی ہیں۔',
      'اپنے براؤزر کی ترتیبات میں انہیں صاف کرنے سے آپ کا تھیلا خالی ہو جاتا ہے، آپ سائن آؤٹ ہو جاتے ہیں، اور یہ براؤزر سائن اِن کے بغیر محفوظ کیے گئے ناپ مزید نہیں کھول سکتا۔',
      { heading: 'ادائیگی کی تفصیلات' },
      'کارڈ اور والٹ کی تفصیلات یہ اسٹور کبھی نہیں رکھتا۔',
      { heading: 'سوالات' },
      'یہ جاننے کے لیے کہ آپ کے بارے میں کیا رکھا گیا ہے، ہم سے رابطہ کریں — تفصیلات "ہم سے رابطہ" کے صفحے پر ہیں۔',
    ],
  },
});

/** By the slug each is served under. */
export const POLICY_PAGES: Readonly<Record<string, (locale: Locale) => StaticPagePayload>> = {
  'terms-of-sale': termsOfSale,
  'privacy-policy': privacyPolicy,
};
