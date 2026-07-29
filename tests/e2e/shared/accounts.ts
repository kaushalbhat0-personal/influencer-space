const TS = () => Date.now().toString(36);

export function createTestEmail(prefix: string): string {
  return `${prefix}-${TS()}@certify.creatos.test`;
}

export function createTestPassword(): string {
  return `Certify${TS()}!`;
}

export interface RuntimeAccount {
  email: string;
  password: string;
  name: string;
}

export function createCreatorAccount(): RuntimeAccount {
  return {
    email: createTestEmail("creator"),
    password: createTestPassword(),
    name: `Test Creator ${TS()}`,
  };
}

export function createAgencyAccount(): RuntimeAccount {
  return {
    email: createTestEmail("agency"),
    password: createTestPassword(),
    name: `Test Agency ${TS()}`,
  };
}

export function createTeamMemberAccount(): RuntimeAccount {
  return {
    email: createTestEmail("member"),
    password: createTestPassword(),
    name: `Test Member ${TS()}`,
  };
}

export function createClientAccount(): RuntimeAccount {
  return {
    email: createTestEmail("client"),
    password: createTestPassword(),
    name: `Test Client ${TS()}`,
  };
}
