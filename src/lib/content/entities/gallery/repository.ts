import type { Gallery } from "./types";
import { InMemoryBaseRepository } from "../../framework/base";

export class InMemoryGalleryRepository extends InMemoryBaseRepository<Gallery> {}

export const galleryRepository = new InMemoryGalleryRepository();
