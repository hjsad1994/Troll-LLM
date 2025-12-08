import { userRepository, isCreditsExpired } from '../repositories/user.repository.js';
import { maskApiKey, IUser } from '../models/user.model.js';

export interface UserProfile {
  username: string;
  apiKey: string;
  apiKeyCreatedAt: Date;
  creditsUsed: number;
  credits: number;
  refCredits: number;
  role: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  purchasedAt: Date | null;
  expiresAt: Date | null;
}

export interface BillingInfo {
  creditsUsed: number;
  credits: number;
  refCredits: number;
  purchasedAt: Date | null;
  expiresAt: Date | null;
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
      creditsUsed: user.creditsUsed,
      credits: user.credits || 0,
      refCredits: user.refCredits || 0,
      role: user.role,
      totalInputTokens: (user as any).totalInputTokens || 0,
      totalOutputTokens: (user as any).totalOutputTokens || 0,
      purchasedAt: user.purchasedAt || null,
      expiresAt: user.expiresAt || null,
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

    // Calculate days until expiration
    let daysUntilExpiration: number | null = null;
    let isExpiringSoon = false;
    
    if (user.expiresAt && (user.credits > 0 || user.refCredits > 0)) {
      const now = new Date();
      const expiresAt = new Date(user.expiresAt);
      const diffTime = expiresAt.getTime() - now.getTime();
      daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpiringSoon = daysUntilExpiration <= 3 && daysUntilExpiration > 0;
    }

    return {
      creditsUsed: user.creditsUsed,
      credits: user.credits || 0,
      refCredits: user.refCredits || 0,
      purchasedAt: user.purchasedAt || null,
      expiresAt: user.expiresAt || null,
      daysUntilExpiration,
      isExpiringSoon,
    };
  }

  async findByApiKey(apiKey: string): Promise<IUser | null> {
    return userRepository.findByApiKey(apiKey);
  }

  async checkAndResetExpiredCredits(username: string): Promise<{ wasExpired: boolean; user: IUser | null }> {
    return userRepository.checkAndResetExpiredCredits(username);
  }

  isCreditsExpired(user: IUser): boolean {
    return isCreditsExpired(user);
  }
}

export const userService = new UserService();
