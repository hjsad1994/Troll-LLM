import { User, IUser, hashPassword, generateApiKey, PLAN_LIMITS, UserPlan } from '../models/user.model.js';
import { UserKey } from '../models/user-key.model.js';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'user';
  plan?: UserPlan;
}

function planToTier(plan: UserPlan): 'dev' | 'pro' {
  return plan === 'pro' ? 'pro' : 'dev';
}

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean();
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return User.findById(username).lean();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const { hash, salt } = hashPassword(data.password);
    const plan = data.plan || 'free';
    const planLimits = PLAN_LIMITS[plan];
    const apiKey = generateApiKey();
    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    
    const user = await User.create({
      _id: data.username,
      passwordHash: hash,
      passwordSalt: salt,
      role: data.role,
      isActive: true,
      apiKey,
      apiKeyCreatedAt: now,
      plan,
      totalTokens: planLimits.totalTokens,
      tokensUsed: 0,
      monthlyTokensUsed: 0,
      monthlyResetDate: firstDayOfMonth,
      credits: 0,
    });

    // Sync API key to user_keys collection for GoProxy (only for non-free plans)
    if (plan !== 'free') {
      await UserKey.create({
        _id: apiKey,
        name: data.username,
        tier: planToTier(plan),
        totalTokens: planLimits.totalTokens,
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
      const planLimits = PLAN_LIMITS[user.plan];
      await UserKey.create({
        _id: newApiKey,
        name: username,
        tier: planToTier(user.plan),
        totalTokens: planLimits.totalTokens,
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
    
    const updatedUser = await User.findByIdAndUpdate(
      username,
      { 
        plan, 
        totalTokens: planLimits.totalTokens,
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
          totalTokens: planLimits.totalTokens,
          tokensUsed: user.tokensUsed || 0,
          requestsCount: 0,
          isActive: true,
          createdAt: new Date(),
        });
      } else if (plan !== 'free') {
        // Change between paid plans: update tier and tokens
        await UserKey.updateOne(
          { _id: user.apiKey },
          { tier: planToTier(plan), totalTokens: planLimits.totalTokens }
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

  async getUserStats(): Promise<{ total: number; byPlan: Record<string, number> }> {
    const total = await User.countDocuments();
    const byPlanAgg = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);
    const byPlan: Record<string, number> = {};
    byPlanAgg.forEach((p) => {
      byPlan[p._id || 'free'] = p.count;
    });
    return { total, byPlan };
  }

  async updateCredits(username: string, credits: number): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      username,
      { credits },
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
}

export const userRepository = new UserRepository();
