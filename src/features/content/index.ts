/** STRUCT-04 / STRUCT-06 — the public barrel for the Content feature. */
export { fetchHomepage } from './api/fetch-homepage';
export { HomepageSections, type HomepageSectionsProps } from './components/HomepageSections';
export { collectRailProductIds } from './lib/homepage';
export {
  homepageSchema,
  homepageSectionSchema,
  type Cta,
  type Homepage,
  type HomepageSection,
} from './schemas/homepage.schema';
