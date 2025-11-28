import { z } from 'zod';

export const LoginDTO = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterDTO = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user']).default('user'),
});

export type LoginInput = z.infer<typeof LoginDTO>;
export type RegisterInput = z.infer<typeof RegisterDTO>;

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  expires_in: string;
}

export interface JwtPayload {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}
