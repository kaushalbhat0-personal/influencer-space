import { AuthCredentials, AuthRegistration, AuthResult, AuthTokenPair, IdentityUser, AuthProvider } from "../types";

export interface PasswordValidation {
  readonly isValid: boolean;
  readonly errors: string[];
}

export interface AuthStrategy {
  readonly provider: AuthProvider;
  authenticate(credentials: Record<string, unknown>): Promise<IdentityUser>;
}

export type { AuthCredentials, AuthRegistration, AuthResult, AuthTokenPair, IdentityUser, AuthProvider };
