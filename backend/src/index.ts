import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './db/mongodb.js';
import { adminAuth, loginHandler } from './middleware/admin-auth.js';
import adminRoutes from './routes/admin.js';
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

// NOTE: Admin static files moved AFTER API routes to avoid conflicts

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

// Login endpoint (public)
app.post('/api/login', loginHandler);

// Admin routes (protected)
app.use('/admin', adminAuth, adminRoutes);
app.use('/admin/proxies', adminAuth, proxyRoutes);

// Admin static files (AFTER API routes to avoid conflicts)
app.use('/admin', express.static(path.join(process.cwd(), 'static/admin')));

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'F-Proxy Backend',
    version: '1.0.0',
    endpoints: {
      public: [
        'GET /health',
        'GET /usage',
        'GET /status',
        'GET /api/usage?key=xxx',
        'GET /api/status',
        'POST /api/login',
      ],
      admin: [
        'GET /admin/keys',
        'POST /admin/keys',
        'GET /admin/keys/:id',
        'PATCH /admin/keys/:id',
        'DELETE /admin/keys/:id',
        'POST /admin/keys/:id/reset',
        'GET /admin/factory-keys',
        'POST /admin/factory-keys/:id/reset',
        'GET /admin/proxies',
        'POST /admin/proxies',
        'GET /admin/proxies/:id',
        'PATCH /admin/proxies/:id',
        'DELETE /admin/proxies/:id',
        'GET /admin/proxies/:id/keys',
        'POST /admin/proxies/:id/keys',
        'DELETE /admin/proxies/:id/keys/:keyId',
        'GET /admin/proxies/:id/health',
      ],
    },
    auth: {
      login: 'POST /api/login with { "username": "admin", "password": "admin" }',
      usage: 'Use Basic Auth header or X-Session-Token from login response',
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
    // Connect to MongoDB
    await connectDB();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 F-Proxy Backend started at http://localhost:${PORT}`);
      console.log(`📖 Usage check: http://localhost:${PORT}/usage`);
      console.log(`🔧 Admin API: http://localhost:${PORT}/admin/keys`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
