import { requireTenant } from "@/lib/auth/require-tenant";
import { courseService } from "@/features/courses/service";
import { CoursesManager } from "./_components/courses-manager";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const { tenantId } = await requireTenant();
  const courses = await courseService.list(tenantId);

  return <CoursesManager initialData={courses} />;
}
