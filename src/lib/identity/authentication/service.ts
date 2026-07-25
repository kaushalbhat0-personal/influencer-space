import { IdentityUser, AuthResult, AuthCredentials, AuthRegistration, AuthTokenPair, IdentityWorkspace } from "../types";
import { AuthenticationError, UserNotFoundError, UserAlreadyExistsError, EmailNotVerifiedError } from "../errors";
import { IdentityEventDispatcher, createUserCreatedEvent, createUserLoginEvent } from "../events";
import { PasswordValidation } from "./types";
import { DEFAULT_IDENTITY_CONFIG } from "../types";

export interface UserRepository {
  findById(id: string): Promise<IdentityUser | null>;
  findByEmail(email: string): Promise<IdentityUser | null>;
  create(input: {
    email: string;
    name: string;
    authProvider: string;
    platformRole: string;
    passwordHash: string | null;
  }): Promise<IdentityUser>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  verifyEmail(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}

export interface AuthenticationConfig {
  readonly maxFailedAttempts: number;
  readonly lockoutDurationMinutes: number;
  readonly passwordMinLength: number;
  readonly bcryptRounds: number;
}

export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventDispatcher: IdentityEventDispatcher,
    private readonly config: AuthenticationConfig = {
      maxFailedAttempts: DEFAULT_IDENTITY_CONFIG.maxFailedAttempts,
      lockoutDurationMinutes: DEFAULT_IDENTITY_CONFIG.lockoutDurationMinutes,
      passwordMinLength: DEFAULT_IDENTITY_CONFIG.passwordMinLength,
      bcryptRounds: DEFAULT_IDENTITY_CONFIG.bcryptRounds,
    }
  ) {}

  validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];
    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }
    return { isValid: errors.length === 0, errors };
  }

  async register(input: AuthRegistration): Promise<IdentityUser> {
    const existing = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (existing) {
      throw new UserAlreadyExistsError(input.email);
    }

    const passwordValidation = this.validatePassword(input.password);
    if (!passwordValidation.isValid) {
      throw new AuthenticationError(passwordValidation.errors.join("; "));
    }

    const platformRole = input.persona === "agency" ? "agency_admin" : "creator_owner";
    const passwordHash = input.password;

    const user = await this.userRepository.create({
      email: input.email.toLowerCase(),
      name: input.name,
      authProvider: "email",
      platformRole,
      passwordHash,
    });

    this.eventDispatcher.emit(
      createUserCreatedEvent(user.id, user.id, user.email, "email")
    );

    return user;
  }

  async login(credentials: AuthCredentials): Promise<IdentityUser> {
    const user = await this.userRepository.findByEmail(credentials.email.toLowerCase());
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    await this.userRepository.updateLastLogin(user.id);

    this.eventDispatcher.emit(
      createUserLoginEvent(user.id, user.id, "", null)
    );

    return user;
  }

  async getUserByEmail(email: string): Promise<IdentityUser> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) throw new UserNotFoundError(email);
    return user;
  }

  async getUserById(id: string): Promise<IdentityUser> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.userRepository.verifyEmail(userId);
  }
}
