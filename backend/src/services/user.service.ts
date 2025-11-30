import { userRepository, isPlanExpired } from '../repositories/user.repository.js';
import { maskApiKey, PLAN_LIMITS, IUser } from '../models/user.model.js';

export interface UserProfile {
  username: string;
  apiKey: string;
  apiKeyCreatedAt: Date;
  plan: string;
  totalTokens: number;
  tokensUsed: number;
  monthlyTokensUsed: number;
  monthlyResetDate: Date;
  role: string;
  credits: number;
}

export interface BillingInfo {
  plan: string;
  planLimits: { monthlyTokens: number; totalTokens: number };
  totalTokensRemaining: number;
  tokensUsed: number;
  monthlyTokensUsed: number;
  monthlyTokensLimit: number;
  monthlyResetDate: Date;
  usagePercentage: number;
  planStartDate: Date | null;
  planExpiresAt: Date | null;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
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
      totalTokens: user.totalTokens,
      tokensUsed: user.tokensUsed,
      monthlyTokensUsed: user.monthlyTokensUsed,
      monthlyResetDate: user.monthlyResetDate,
      role: user.role,
      credits: user.credits || 0,
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
    const totalTokensRemaining = user.totalTokens === -1 
      ? -1 
      : Math.max(0, user.totalTokens - user.tokensUsed);
    
    const monthlyUsagePercent = planLimits.monthlyTokens > 0
      ? (user.monthlyTokensUsed / planLimits.monthlyTokens) * 100
      : 0;

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
      planLimits,
      totalTokensRemaining,
      tokensUsed: user.tokensUsed,
      monthlyTokensUsed: user.monthlyTokensUsed,
      monthlyTokensLimit: planLimits.monthlyTokens,
      monthlyResetDate: user.monthlyResetDate,
      usagePercentage: Math.min(100, monthlyUsagePercent),
      planStartDate: user.planStartDate || null,
      planExpiresAt: user.planExpiresAt || null,
      daysUntilExpiration,
      isExpiringSoon,
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
