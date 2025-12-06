import { userRepository, isPlanExpired } from '../repositories/user.repository.js';
import { maskApiKey, PLAN_LIMITS, IUser } from '../models/user.model.js';

export interface UserProfile {
  username: string;
  apiKey: string;
  apiKeyCreatedAt: Date;
  plan: string;
  tokensUsed: number;
  monthlyTokensUsed: number;
  monthlyResetDate: Date;
  role: string;
  credits: number;
  refCredits: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface BillingInfo {
  plan: string;
  planLimits: { rpm: number };
  tokensUsed: number;
  planStartDate: Date | null;
  planExpiresAt: Date | null;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  credits: number;
}

export class UserService {
  async getProfile(username: string): Promise<UserProfile | null> {
    const user = await userRepository.getFullUser(username);
    if (!user) return null;

    return {
      username: user._id,
      apiKey: maskApiKey(user.apiKey),
      apiKeyCreatedAt: user.apiKeyCreatedAt,
      plan: user.plan,
      tokensUsed: user.tokensUsed,
      monthlyTokensUsed: user.monthlyTokensUsed,
      monthlyResetDate: user.monthlyResetDate,
      role: user.role,
      credits: user.credits || 0,
      refCredits: user.refCredits || 0,
      totalInputTokens: (user as any).totalInputTokens || 0,
      totalOutputTokens: (user as any).totalOutputTokens || 0,
    };
  }

  async getFullApiKey(username: string): Promise<string | null> {
    const user = await userRepository.getFullUser(username);
    return user?.apiKey || null;
  }

  async rotateApiKey(username: string): Promise<{ newApiKey: string; createdAt: Date }> {
    const newApiKey = await userRepository.rotateApiKey(username);
    return {
      newApiKey,
      createdAt: new Date(),
    };
  }

  async getBillingInfo(username: string): Promise<BillingInfo | null> {
    const user = await userRepository.getFullUser(username);
    if (!user) return null;

    const planLimits = PLAN_LIMITS[user.plan];

    // Calculate days until expiration
    let daysUntilExpiration: number | null = null;
    let isExpiringSoon = false;
    
    if (user.planExpiresAt && user.plan !== 'free') {
      const now = new Date();
      const expiresAt = new Date(user.planExpiresAt);
      const diffTime = expiresAt.getTime() - now.getTime();
      daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration > 0;
    }

    return {
      plan: user.plan,
      planLimits: { rpm: planLimits.rpm },
      tokensUsed: user.tokensUsed,
      planStartDate: user.planStartDate || null,
      planExpiresAt: user.planExpiresAt || null,
      daysUntilExpiration,
      isExpiringSoon,
      credits: user.credits || 0,
    };
  }

  async findByApiKey(apiKey: string): Promise<IUser | null> {
    return userRepository.findByApiKey(apiKey);
  }

  async checkAndResetExpiredPlan(username: string): Promise<{ wasExpired: boolean; user: IUser | null }> {
    return userRepository.checkAndResetExpiredPlan(username);
  }

  isPlanExpired(user: IUser): boolean {
    return isPlanExpired(user);
  }
}

export const userService = new UserService();
