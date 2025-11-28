import { User, IUser, hashPassword, generateApiKey, PLAN_LIMITS, UserPlan } from '../models/user.model.js';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'user';
  plan?: UserPlan;
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
    });
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
    const newApiKey = generateApiKey();
    await User.updateOne(
      { _id: username },
      { apiKey: newApiKey, apiKeyCreatedAt: new Date() }
    );
    return newApiKey;
  }

  async updatePlan(username: string, plan: UserPlan): Promise<IUser | null> {
    const planLimits = PLAN_LIMITS[plan];
    return User.findByIdAndUpdate(
      username,
      { plan, totalTokens: planLimits.totalTokens },
      { new: true }
    ).lean();
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
}

export const userRepository = new UserRepository();
