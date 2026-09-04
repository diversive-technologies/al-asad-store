/** STRUCT-04 / STRUCT-06 — the public barrel for the Content feature. */
export { fetchHomepage } from './api/fetch-homepage';
export { fetchPage } from './api/fetch-page';
export { HomepageSections, type HomepageSectionsProps } from './components/HomepageSections';
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
