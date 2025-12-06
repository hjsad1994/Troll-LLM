import { User, IUser, hashPassword, generateApiKey, generateReferralCode, PLAN_LIMITS, UserPlan } from '../models/user.model.js';
import { UserKey } from '../models/user-key.model.js';
import { RequestLog } from '../models/request-log.model.js';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'user';
  plan?: UserPlan;
  referredBy?: string;
}

function planToTier(plan: UserPlan): 'dev' | 'pro' {
  return plan === 'pro' ? 'pro' : 'dev';
}

export function calculatePlanExpiration(startDate: Date): Date {
  const expiresAt = new Date(startDate);
  expiresAt.setDate(expiresAt.getDate() + 30); // +30 days, then reset to Free Tier
  return expiresAt;
}

export function isPlanExpired(user: IUser): boolean {
  if (user.plan === 'free' || !user.planExpiresAt) return false;
  return new Date() > new Date(user.planExpiresAt);
}

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    // Try exact match first
    let user = await User.findById(id).lean();
    if (user) return user;
    
    // Try case-insensitive match with trimmed spaces (for legacy accounts)
    user = await User.findOne({ 
      _id: { $regex: new RegExp(`^\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }
    }).lean();
    return user;
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.findById(username);
  }

  async create(data: CreateUserData): Promise<IUser> {
    const { hash, salt } = hashPassword(data.password);
    const plan = data.plan || 'free';
    const planLimits = PLAN_LIMITS[plan];
    const apiKey = generateApiKey();
    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    
    // Validate referredBy if provided
    let validReferredBy: string | null = null;
    if (data.referredBy) {
      const referrer = await User.findOne({ referralCode: data.referredBy }).lean();
      if (referrer) {
        validReferredBy = referrer._id;
      }
    }
    
    // Create user with retry for referral code collision
    let user;
    let createAttempts = 0;
    const maxCreateAttempts = 3;
    
    while (createAttempts < maxCreateAttempts) {
      // Generate unique referral code
      let referralCode = generateReferralCode();
      let codeAttempts = 0;
      while (await User.exists({ referralCode }) && codeAttempts < 10) {
        referralCode = generateReferralCode();
        codeAttempts++;
      }

      try {
        user = await User.create({
          _id: data.username,
          passwordHash: hash,
          passwordSalt: salt,
          role: data.role,
          isActive: true,
          apiKey,
          apiKeyCreatedAt: now,
          plan,
          tokensUsed: 0,
          monthlyTokensUsed: 0,
          monthlyResetDate: firstDayOfMonth,
          credits: 0,
          referralCode,
          referredBy: validReferredBy,
          refCredits: 0,
          referralBonusAwarded: false,
        });
        break; // Success, exit loop
      } catch (err: any) {
        // Check if error is duplicate key on referralCode
        if (err.code === 11000 && err.keyPattern?.referralCode) {
          createAttempts++;
          if (createAttempts >= maxCreateAttempts) {
            throw new Error('Failed to generate unique referral code after multiple attempts');
          }
          continue; // Retry with new code
        }
        throw err; // Re-throw other errors
      }
    }

    if (!user) {
      throw new Error('Failed to create user');
    }

    // Sync API key to user_keys collection for GoProxy (only for non-free plans)
    if (plan !== 'free') {
      await UserKey.create({
        _id: apiKey,
        name: data.username,
        tier: planToTier(plan),
        tokensUsed: 0,
        requestsCount: 0,
        isActive: true,
        createdAt: now,
      });
    }

    return user.toObject();
  }

  async updateLastLogin(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { lastLoginAt: new Date() });
  }

  async setActive(id: string, isActive: boolean): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { isActive }, { new: true }).lean();
  }

  async exists(username: string): Promise<boolean> {
    const count = await User.countDocuments({ _id: username });
    return count > 0;
  }

  async findByApiKey(apiKey: string): Promise<IUser | null> {
    return User.findOne({ apiKey, isActive: true }).lean();
  }

  async rotateApiKey(username: string): Promise<string> {
    const user = await User.findById(username).lean();
    if (!user) throw new Error('User not found');

    const oldApiKey = user.apiKey;
    const newApiKey = generateApiKey();
    const now = new Date();

    await User.updateOne(
      { _id: username },
      { apiKey: newApiKey, apiKeyCreatedAt: now }
    );

    // Sync to user_keys collection for GoProxy
    if (user.plan !== 'free') {
      // Delete old key entry
      if (oldApiKey) {
        await UserKey.deleteOne({ _id: oldApiKey });
      }
      // Create new key entry
      await UserKey.create({
        _id: newApiKey,
        name: username,
        tier: planToTier(user.plan),
        tokensUsed: user.tokensUsed || 0,
        requestsCount: 0,
        isActive: true,
        createdAt: now,
      });
    }

    return newApiKey;
  }

  async updatePlan(username: string, plan: UserPlan): Promise<IUser | null> {
    const user = await User.findById(username).lean();
    if (!user) return null;

    const oldPlan = user.plan || 'free';
    const planLimits = PLAN_LIMITS[plan];
    const oldPlanLimits = PLAN_LIMITS[oldPlan] || PLAN_LIMITS.free;
    
    // Calculate credits to add (only for upgrades)
    let creditsToAdd = 0;
    if (planLimits.valueUsd > oldPlanLimits.valueUsd) {
      creditsToAdd = planLimits.valueUsd - oldPlanLimits.valueUsd;
    }

    // Set plan expiration dates
    const now = new Date();
    let planStartDate: Date | null = null;
    let planExpiresAt: Date | null = null;
    
    if (plan !== 'free') {
      planStartDate = now;
      planExpiresAt = calculatePlanExpiration(now);
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      username,
      { 
        plan, 
        planStartDate,
        planExpiresAt,
        $inc: { credits: creditsToAdd }
      },
      { new: true }
    ).lean();

    // Sync to user_keys collection for GoProxy
    if (user.apiKey) {
      if (plan === 'free' && oldPlan !== 'free') {
        // Downgrade to free: delete user_key entry
        await UserKey.deleteOne({ _id: user.apiKey });
      } else if (plan !== 'free' && oldPlan === 'free') {
        // Upgrade from free: create user_key entry
        await UserKey.create({
          _id: user.apiKey,
          name: username,
          tier: planToTier(plan),
          tokensUsed: user.tokensUsed || 0,
          requestsCount: 0,
          isActive: true,
          createdAt: new Date(),
          planExpiresAt,
        });
      } else if (plan !== 'free') {
        // Change between paid plans: update tier and expiration
        await UserKey.updateOne(
          { _id: user.apiKey },
          { tier: planToTier(plan), planExpiresAt }
        );
      }
    }

    return updatedUser;
  }

  async incrementTokensUsed(username: string, tokens: number): Promise<void> {
    const user = await User.findById(username);
    if (!user) return;

    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    
    if (!user.monthlyResetDate || user.monthlyResetDate < firstDayOfMonth) {
      await User.updateOne(
        { _id: username },
        {
          $set: { monthlyTokensUsed: tokens, monthlyResetDate: firstDayOfMonth },
          $inc: { tokensUsed: tokens }
        }
      );
    } else {
      await User.updateOne(
        { _id: username },
        { $inc: { tokensUsed: tokens, monthlyTokensUsed: tokens } }
      );
    }
  }

  async getFullUser(username: string): Promise<IUser | null> {
    return User.findById(username).lean();
  }

  async listUsers(search?: string): Promise<IUser[]> {
    const query: any = {};
    if (search) {
      query._id = { $regex: search, $options: 'i' };
    }
    return User.find(query)
      .select('-passwordHash -passwordSalt')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getUserStats(period: string = 'all'): Promise<{ total: number; byPlan: Record<string, number>; totalTokensUsed: number; totalCredits: number; totalInputTokens: number; totalOutputTokens: number; totalCreditsBurned: number }> {
    const total = await User.countDocuments();
    
    // Get user counts by plan
    const userAgg = await User.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          credits: { $sum: '$credits' },
        }
      }
    ]);
    const byPlan: Record<string, number> = {};
    let totalCredits = 0;
    userAgg.forEach((p) => {
      byPlan[p._id || 'free'] = p.count;
      totalCredits += p.credits || 0;
    });

    // Get token stats and credits burned - from request_logs if filtered, from users if 'all'
    let totalTokensUsed = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCreditsBurned = 0;

    if (period === 'all') {
      // Use lifetime totals from user collection
      const tokenAgg = await User.aggregate([
        {
          $group: {
            _id: null,
            tokensUsed: { $sum: '$tokensUsed' },
            inputTokens: { $sum: '$totalInputTokens' },
            outputTokens: { $sum: '$totalOutputTokens' },
          }
        }
      ]);
      if (tokenAgg.length > 0) {
        totalTokensUsed = tokenAgg[0].tokensUsed || 0;
        totalInputTokens = tokenAgg[0].inputTokens || 0;
        totalOutputTokens = tokenAgg[0].outputTokens || 0;
      }
      // Get all-time credits burned from request_logs
      const creditsAgg = await RequestLog.aggregate([
        { $group: { _id: null, total: { $sum: '$creditsCost' } } }
      ]);
      totalCreditsBurned = creditsAgg[0]?.total || 0;
    } else {
      // Aggregate from request_logs for the specified period
      let since: Date;
      switch (period) {
        case '1h':
          since = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '3h':
          since = new Date(Date.now() - 3 * 60 * 60 * 1000);
          break;
        case '8h':
          since = new Date(Date.now() - 8 * 60 * 60 * 1000);
          break;
        case '24h':
          since = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(0);
      }
      
      const logAgg = await RequestLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            tokensUsed: { $sum: '$tokensUsed' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            creditsBurned: { $sum: '$creditsCost' },
          }
        }
      ]);
      if (logAgg.length > 0) {
        totalTokensUsed = logAgg[0].tokensUsed || 0;
        totalInputTokens = logAgg[0].inputTokens || 0;
        totalOutputTokens = logAgg[0].outputTokens || 0;
        totalCreditsBurned = logAgg[0].creditsBurned || 0;
      }
    }

    return { total, byPlan, totalTokensUsed, totalCredits, totalInputTokens, totalOutputTokens, totalCreditsBurned };
  }

  async updateCredits(username: string, credits: number): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      username,
      { credits },
      { new: true }
    ).lean();
  }

  async updateRefCredits(username: string, refCredits: number): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      username,
      { refCredits },
      { new: true }
    ).lean();
  }

  async addCredits(username: string, amount: number): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      username,
      { $inc: { credits: amount } },
      { new: true }
    ).lean();
  }

  async resetExpiredPlan(username: string): Promise<IUser | null> {
    const user = await User.findById(username).lean();
    if (!user || !user.apiKey) return null;

    // Delete user_key entry from GoProxy collection
    await UserKey.deleteOne({ _id: user.apiKey });

    // Reset user to free plan
    return User.findByIdAndUpdate(
      username,
      {
        plan: 'free',
        planStartDate: null,
        planExpiresAt: null,
        credits: 0,
      },
      { new: true }
    ).lean();
  }

  async checkAndResetExpiredPlan(username: string): Promise<{ wasExpired: boolean; user: IUser | null }> {
    const user = await User.findById(username).lean();
    if (!user) return { wasExpired: false, user: null };
    
    if (isPlanExpired(user)) {
      const resetUser = await this.resetExpiredPlan(username);
      return { wasExpired: true, user: resetUser };
    }
    
    return { wasExpired: false, user };
  }

  // Referral methods
  async findByReferralCode(referralCode: string): Promise<IUser | null> {
    return User.findOne({ referralCode }).lean();
  }

  async addRefCredits(username: string, amount: number): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      username,
      { $inc: { refCredits: amount } },
      { new: true }
    ).lean();
  }

  async markReferralBonusAwarded(username: string): Promise<void> {
    await User.updateOne(
      { _id: username },
      { referralBonusAwarded: true }
    );
  }

  async getReferralStats(username: string): Promise<{
    totalReferrals: number;
    successfulReferrals: number;
    totalRefCreditsEarned: number;
    currentRefCredits: number;
  }> {
    const user = await User.findById(username).lean();
    if (!user) {
      return { totalReferrals: 0, successfulReferrals: 0, totalRefCreditsEarned: 0, currentRefCredits: 0 };
    }

    // Count all users referred by this user
    const totalReferrals = await User.countDocuments({ referredBy: username });
    
    // Count users who have paid (referralBonusAwarded = true means they completed payment)
    const successfulReferrals = await User.countDocuments({ 
      referredBy: username, 
      referralBonusAwarded: true 
    });

    // Calculate total refCredits earned (25 per dev, 50 per pro)
    const paidUsers = await User.find({ 
      referredBy: username, 
      referralBonusAwarded: true 
    }).select('plan').lean();
    
    let totalRefCreditsEarned = 0;
    for (const u of paidUsers) {
      totalRefCreditsEarned += u.plan === 'pro' ? 50 : 25;
    }

    return {
      totalReferrals,
      successfulReferrals,
      totalRefCreditsEarned,
      currentRefCredits: user.refCredits || 0,
    };
  }

  async getReferredUsers(username: string): Promise<Array<{
    username: string;
    status: 'registered' | 'paid';
    plan: string | null;
    bonusEarned: number;
    createdAt: Date;
  }>> {
    const referredUsers = await User.find({ referredBy: username })
      .select('_id plan referralBonusAwarded createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return referredUsers.map(u => ({
      username: u._id,
      status: u.referralBonusAwarded ? 'paid' : 'registered',
      plan: u.referralBonusAwarded ? u.plan : null,
      bonusEarned: u.referralBonusAwarded ? (u.plan === 'pro' ? 50 : 25) : 0,
      createdAt: u.createdAt,
    }));
  }

  async generateReferralCodeForExistingUsers(): Promise<number> {
    const usersWithoutCode = await User.find({ 
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' },
        { referralCode: 'undefined' }
      ]
    }).lean();

    let updated = 0;
    for (const user of usersWithoutCode) {
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (await User.exists({ referralCode }) && attempts < 10) {
        referralCode = generateReferralCode();
        attempts++;
      }
      await User.updateOne(
        { _id: user._id }, 
        { 
          $set: {
            referralCode,
            refCredits: (user as any).refCredits ?? 0,
            referralBonusAwarded: (user as any).referralBonusAwarded ?? false
          }
        }
      );
      updated++;
    }
    return updated;
  }
}

export const userRepository = new UserRepository();
