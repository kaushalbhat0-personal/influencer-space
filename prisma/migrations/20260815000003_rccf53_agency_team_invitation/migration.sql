-- RCCF-53: Partner team invitation lifecycle — dedicated single-use, expiring,
-- agency/workspace-scoped invitation. Kept separate from Creator invitations
-- (creator_invite Setting) so Creator onboarding and Partner team membership
-- never share an authorization path. The token is the sole authority for
-- invitation identity; agency, workspace and role are derived server-side from
-- the stored row on acceptance.
CREATE TABLE "AgencyTeamInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyTeamInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgencyTeamInvitation_token_key" ON "AgencyTeamInvitation"("token");
CREATE INDEX "AgencyTeamInvitation_workspaceId_idx" ON "AgencyTeamInvitation"("workspaceId");
CREATE INDEX "AgencyTeamInvitation_email_idx" ON "AgencyTeamInvitation"("email");
