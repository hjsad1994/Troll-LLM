import jwt from 'jsonwebtoken';
import { userRepository, isPlanExpired } from '../repositories/user.repository.js';
import { verifyPassword } from '../models/user.model.js';
import { LoginInput, RegisterInput, AuthResponse, JwtPayload } from '../dtos/auth.dto.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET_KEY || 'change-this-secret';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findById(input.username);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    if (!verifyPassword(input.password, user.passwordHash, user.passwordSalt)) {
      throw new Error('Invalid credentials');
    }

    // Check if plan has expired and reset if needed
    if (isPlanExpired(user)) {
      await userRepository.resetExpiredPlan(input.username);
    }

    await userRepository.updateLastLogin(input.username);

    const payload: JwtPayload = { username: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      username: user._id,
      role: user.role,
      expires_in: JWT_EXPIRES_IN,
    };
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const exists = await userRepository.exists(input.username);
    if (exists) {
      throw new Error('Username already exists');
    }

    const user = await userRepository.create({
      username: input.username,
      password: input.password,
      role: input.role || 'user',
      referredBy: input.ref,
    });

    const payload: JwtPayload = { username: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      username: user._id,
      role: user.role,
      expires_in: JWT_EXPIRES_IN,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService();
