import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './db/mongodb.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import usageRoutes from './routes/usage.js';
import proxyRoutes from './routes/proxy.js';
import statusRoutes from './routes/status.js';

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use('/static', express.static(path.join(process.cwd(), 'static')));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'fproxy-backend',
    timestamp: new Date().toISOString(),
  });
});

// Usage check page (public)
app.get('/usage', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'static/usage.html'));
});

// Status page (public)
app.get('/status', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'static/status.html'));
});

// Public API routes
app.use('/api', usageRoutes);
app.use('/api/status', statusRoutes);

// Auth routes (public)
app.use('/api', authRoutes);

// Admin routes (protected with JWT)
app.use('/admin', authMiddleware, adminRoutes);
app.use('/admin/proxies', authMiddleware, proxyRoutes);

// Admin static files (AFTER API routes)
app.use('/admin', express.static(path.join(process.cwd(), 'static/admin')));

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'F-Proxy Backend',
    version: '2.0.0',
    endpoints: {
      public: [
        'GET /health',
        'GET /usage',
        'GET /status',
        'GET /api/usage?key=xxx',
        'GET /api/status',
        'POST /api/login',
        'POST /api/register',
      ],
      admin: [
        'GET /admin/keys',
        'POST /admin/keys',
        'GET /admin/keys/:id',
        'PATCH /admin/keys/:id',
        'DELETE /admin/keys/:id',
        'POST /admin/keys/:id/reset',
        'GET /admin/factory-keys',
        'POST /admin/factory-keys',
        'DELETE /admin/factory-keys/:id',
        'POST /admin/factory-keys/:id/reset',
        'GET /admin/factory-keys/analytics',
        'GET /admin/metrics',
        'GET /admin/proxies',
        'POST /admin/proxies',
        'PATCH /admin/proxies/:id',
        'DELETE /admin/proxies/:id',
      ],
    },
    auth: {
      login: 'POST /api/login { "username": "...", "password": "..." }',
      register: 'POST /api/register { "username": "...", "password": "...", "role": "user|admin" }',
      usage: 'Authorization: Bearer <token>',
    },
    roles: {
      admin: 'Full access to all endpoints',
      user: 'Read-only access to admin endpoints',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function main() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`F-Proxy Backend started at http://localhost:${PORT}`);
      console.log(`Usage check: http://localhost:${PORT}/usage`);
      console.log(`Admin API: http://localhost:${PORT}/admin/keys`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
