import { requireTenant } from "@/lib/auth/require-tenant";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { courseService } from "@/features/courses/service";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const { tenantId } = await requireTenant();

  const courses = await courseService.list(tenantId);

  return (
    <FeaturePage title="Courses" description="Manage your courses. Full LMS integration coming soon.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <GlassCard key={course.id} className="p-5">
            <h3 className="font-semibold text-white">{course.title}</h3>
            {course.description && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{course.description}</p>}
            <p className="mt-2 text-xs text-zinc-500">{course.moduleCount} modules</p>
          </GlassCard>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-zinc-500 col-span-full">No courses yet. Create your first course.</p>
        )}
      </div>
    </FeaturePage>
  );
}
