import { creatorOnboardingWorkflow as _creatorOnboardingWorkflow } from "./creator-onboarding";
import { manualRegenerationWorkflow as _manualRegenerationWorkflow } from "./manual-regeneration";
import { builderPublishWorkflow as _builderPublishWorkflow } from "./builder-publish";
import { superAdminProvisionWorkflow as _superAdminProvisionWorkflow } from "./super-admin-provision";
import { agencyClientOnboardingWorkflow as _agencyClientOnboardingWorkflow } from "./agency-client-onboarding";

export const creatorOnboardingWorkflow = _creatorOnboardingWorkflow;
export const manualRegenerationWorkflow = _manualRegenerationWorkflow;
export const builderPublishWorkflow = _builderPublishWorkflow;
export const superAdminProvisionWorkflow = _superAdminProvisionWorkflow;
export const agencyClientOnboardingWorkflow = _agencyClientOnboardingWorkflow;

export const ALL_WORKFLOWS = [
  _creatorOnboardingWorkflow,
  _manualRegenerationWorkflow,
  _builderPublishWorkflow,
  _superAdminProvisionWorkflow,
  _agencyClientOnboardingWorkflow,
] as const;
