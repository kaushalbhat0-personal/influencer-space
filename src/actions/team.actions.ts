"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { authorizationService } from "@/modules/workspace/domain/authorization";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function inviteMember(workspaceId: string, email: string, role: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const member = await workspaceRepository.findMember(workspaceId, session.user.id);
  if (!member || !authorizationService.can("members:invite")) {
    return { success: false, error: "Forbidden" };
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    user = await prisma.user.create({
      data: { email, password: hashedPassword, name: email.split("@")[0], role: "AGENCY_STAFF" },
    });
  }

  const existing = await workspaceRepository.findMember(workspaceId, user.id);
  if (existing) return { success: false, error: "User is already a member" };

  await workspaceRepository.addMember({ workspaceId, userId: user.id, role: role as never });
  return { success: true };
}

export async function removeMember(workspaceId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const member = await workspaceRepository.findMember(workspaceId, session.user.id);
  if (!member || !authorizationService.can("members:remove")) {
    return { success: false, error: "Forbidden" };
  }

  await workspaceRepository.removeMember(workspaceId, userId);
  return { success: true };
}

export async function changeMemberRole(workspaceId: string, userId: string, role: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const member = await workspaceRepository.findMember(workspaceId, session.user.id);
  if (!member || !authorizationService.can("members:change-role")) {
    return { success: false, error: "Forbidden" };
  }

  await workspaceRepository.updateMemberRole(workspaceId, userId, role);
  return { success: true };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
  }));
}

import crypto from "crypto";
