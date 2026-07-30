export enum ProvisionStep {
  IMPORT_REQUESTED = "IMPORT_REQUESTED",
  ANALYZING = "ANALYZING",
  PROFILE_READY = "PROFILE_READY",
  PROVISIONING = "PROVISIONING",
  TENANT_CREATED = "TENANT_CREATED",
  WORKSPACE_CREATED = "WORKSPACE_CREATED",
  ADMIN_CREATED = "ADMIN_CREATED",
  WEBSITE_CREATED = "WEBSITE_CREATED",
  PUBLISHED = "PUBLISHED",
  READY = "READY",
  DOMAIN_FAILED = "DOMAIN_FAILED",
  ADMIN_FAILED = "ADMIN_FAILED",
  WEBSITE_FAILED = "WEBSITE_FAILED",
  PUBLISH_FAILED = "PUBLISH_FAILED",
  PROVISION_FAILED = "PROVISION_FAILED",
}

export enum ProvisionEventType {
  STARTED = "started",
  COMPLETED = "completed",
  FAILED = "failed",
}

const STEP_ORDER: ProvisionStep[] = [
  ProvisionStep.IMPORT_REQUESTED,
  ProvisionStep.ANALYZING,
  ProvisionStep.PROFILE_READY,
  ProvisionStep.PROVISIONING,
  ProvisionStep.TENANT_CREATED,
  ProvisionStep.WORKSPACE_CREATED,
  ProvisionStep.ADMIN_CREATED,
  ProvisionStep.WEBSITE_CREATED,
  ProvisionStep.PUBLISHED,
  ProvisionStep.READY,
];

const FAILURE_STEPS = new Set([
  ProvisionStep.DOMAIN_FAILED,
  ProvisionStep.ADMIN_FAILED,
  ProvisionStep.WEBSITE_FAILED,
  ProvisionStep.PUBLISH_FAILED,
  ProvisionStep.PROVISION_FAILED,
]);

export class ProvisioningStateMachine {
  nextStep(current: ProvisionStep): ProvisionStep | null {
    const idx = STEP_ORDER.indexOf(current);
    if (idx === -1 || idx >= STEP_ORDER.length - 1) return null;
    return STEP_ORDER[idx + 1];
  }

  isFailure(step: ProvisionStep): boolean {
    return FAILURE_STEPS.has(step);
  }

  isTerminal(step: ProvisionStep): boolean {
    return step === ProvisionStep.READY || FAILURE_STEPS.has(step);
  }

  label(step: ProvisionStep): string {
    return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  failureStep(from: ProvisionStep): ProvisionStep {
    switch (from) {
      case ProvisionStep.TENANT_CREATED:
        return ProvisionStep.ADMIN_FAILED;
      case ProvisionStep.WEBSITE_CREATED:
        return ProvisionStep.DOMAIN_FAILED;
      case ProvisionStep.PUBLISHED:
        return ProvisionStep.PUBLISH_FAILED;
      case ProvisionStep.WORKSPACE_CREATED:
      case ProvisionStep.ADMIN_CREATED:
        return ProvisionStep.WEBSITE_FAILED;
      default:
        return ProvisionStep.PROVISION_FAILED;
    }
  }
}

export const provisionStateMachine = new ProvisioningStateMachine();
