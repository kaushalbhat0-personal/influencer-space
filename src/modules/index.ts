export { heroModule } from "./hero/definition";
export { heroDataLoader } from "./hero/data-loader";
export { productsModule } from "./products/definition";
export { productsDataLoader } from "./products/data-loader";
export {
  galleryModule,
  timelineModule,
  contentFeedModule,
  profileModule,
  affiliateLinksModule,
  gamesModule,
  contactModule,
} from "./definitions";
export {
  galleryDataLoader,
  timelineDataLoader,
  contentFeedDataLoader,
  profileDataLoader,
  affiliateLinksDataLoader,
  gamesDataLoader,
  contactDataLoader,
} from "./shared/data-loaders";
export { registerAllModules, PLATFORM_MODULES } from "./register";
