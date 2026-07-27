import { GalleryService } from "@/lib/gallery/service";
import { BulkActionEngine, type BulkExecutor } from "@/lib/bulk/BulkActionEngine";

const bulkExecutor: BulkExecutor = {
  publish: (ids, tenantId) => GalleryService.bulkPublish(ids, tenantId),
  archive: (ids, tenantId) => GalleryService.bulkArchive(ids, tenantId),
  delete: (ids, tenantId) => GalleryService.bulkDelete(ids, tenantId),
};

export const galleryBulkEngine = new BulkActionEngine(bulkExecutor, "Gallery", "/admin/gallery");
