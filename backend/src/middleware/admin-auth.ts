import { Request, Response, NextFunction } from 'express';
import { User, verifyPassword } from '../db/mongodb.js';

// Simple in-memory rate limiting for failed auth attempts
const failedAttempts: Map<string, { count: number; blockedUntil: number }> = new Map();

// Simple session store (in production, use Redis or JWT)
const sessions: Map<string, { username: string; role: string; expiresAt: number }> = new Map();

export async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Check if IP is blocked (only for repeated bad credentials, not missing auth)
  const attempt = failedAttempts.get(clientIP);
  if (attempt && attempt.blockedUntil > Date.now()) {
    const retryAfter = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
    res.status(429).json({
      error: 'Too many failed authentication attempts',
      retry_after: retryAfter,
    });
    return;
  }
  
  // If no auth headers at all, just return 401 without counting as failed attempt
  const sessionToken = req.headers['x-session-token'] as string;
  const authHeader = req.headers.authorization;
  if (!sessionToken && !authHeader) {
    res.status(401).json({ 
      error: 'Authentication required',
      hint: 'Use Basic Auth with username:password or X-Session-Token header'
    });
    return;
  }

  // Check session token first
  if (sessionToken) {
    const session = sessions.get(sessionToken);
    if (session && session.expiresAt > Date.now()) {
      failedAttempts.delete(clientIP);
      next();
      return;
    }
  }

  // Check Basic Auth (username:password)
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (username && password) {
      try {
        const user = await User.findById(username);
        if (user && user.isActive && verifyPassword(password, user.passwordHash, user.passwordSalt)) {
          // Update last login
          await User.updateOne({ _id: username }, { lastLoginAt: new Date() });
          failedAttempts.delete(clientIP);
          next();
          return;
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    }
  }

  recordFailedAttempt(clientIP);
  res.status(401).json({ 
    error: 'Authentication required',
    hint: 'Use Basic Auth with username:password or X-Session-Token header'
  });
}

// Login endpoint handler
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  try {
    const user = await User.findById(username);
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Create session token
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessions.set(token, { username, role: user.role, expiresAt });

    // Update last login
    await User.updateOne({ _id: username }, { lastLoginAt: new Date() });

    res.json({
      token,
      username,
      role: user.role,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function recordFailedAttempt(ip: string): void {
  const attempt = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  attempt.count++;

  // Block for 5 minutes after 10 failed attempts
  if (attempt.count >= 10) {
    attempt.blockedUntil = Date.now() + 5 * 60 * 1000;
    attempt.count = 0;
  }

  failedAttempts.set(ip, attempt);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  // Clean failed attempts
  for (const [ip, attempt] of failedAttempts.entries()) {
    if (attempt.blockedUntil < now && attempt.count === 0) {
      failedAttempts.delete(ip);
    }
  }
  // Clean expired sessions
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60000);
