import { WebsiteService } from "./service";
import { BrandService } from "./brand";
import { PublishService } from "./publish";

export { WebsiteService, BrandService, PublishService };
export const websiteService = new WebsiteService();
export const brandService = new BrandService();
export const publishService = new PublishService();
