import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex">
      <SuperAdminSidebar />
      <div className="flex-1 ml-56 min-w-0">
        <main className="p-6 sm:p-8 pb-48">{children}</main>
      </div>
    </div>
  );
}
