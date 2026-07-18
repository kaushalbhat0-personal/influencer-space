import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AgencyPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    redirect("/admin/login");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { agencyId: true },
  });

  if (!user?.agencyId) {
    redirect("/admin/login");
  }

  redirect(`/agency/${user.agencyId}`);
}
