import { User, IUser, hashPassword } from '../models/user.model.js';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'user';
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
    const user = await User.create({
      _id: data.username,
      passwordHash: hash,
      passwordSalt: salt,
      role: data.role,
      isActive: true,
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
}

export const userRepository = new UserRepository();
