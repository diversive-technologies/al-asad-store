/** STRUCT-04 / STRUCT-06 — the public barrel for the Content feature. */
export { fetchHomepage } from './api/fetch-homepage';
export { fetchHelpPage, type HelpPageRead } from './api/fetch-help-page';
export { fetchPage } from './api/fetch-page';
export { HomepageSections, type HomepageSectionsProps } from './components/HomepageSections';
export { InlineHelpPage, type InlineHelpPageProps } from './components/InlineHelpPage';
export { StaticPageArticle } from './components/StaticPageArticle';
export {
  StoreContactDetails,
  type StoreContactDetailsProps,
} from './components/StoreContactDetails';
export { collectRailProductIds } from './lib/homepage';
export { staticPageSchema, type PageBlock, type StaticPage } from './schemas/page.schema';
export {
  homepageSchema,
  homepageSectionSchema,
  type CatalogueEntrySection,
  type Cta,
  type Homepage,
  type HomepageSection,
} from './schemas/homepage.schema';
