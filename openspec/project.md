# Project Context

## Purpose

TrollLLM is a full-stack LLM proxy and API management platform that provides:
- High-performance Go-based proxy service for routing LLM requests
- User authentication, authorization, and API key management
- Payment integration with SePay (Vietnam QR Banking)
- Admin dashboard for system management and analytics
- Request logging and usage tracking
- Referral system for user acquisition

The platform acts as an intermediary between users and Large Language Models (Claude, GPT, Gemini), with centralized billing, authentication, and routing logic.

## Tech Stack

**Frontend:**
- Next.js 14.2 (React 18.3)
- TypeScript 5.0
- Tailwind CSS 3.4
- Runs on port 8080 (dev) / trollllm.xyz (prod)

**Backend:**
- Node.js 20 with Express.js 4.18
- TypeScript 5.3
- MongoDB 8.0 with Mongoose ODM
- JWT for authentication
- Zod for validation
- Runs on port 3005 (dev) / api.trollllm.xyz (prod)

**LLM Proxy:**
- Go 1.25
- MongoDB driver for state management
- HTTP/2 support with connection pooling
- Custom rate limiting
- Runs on port 8003 (dev) / chat.trollllm.xyz (prod)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy with SSL/TLS)
- Certbot (Let's Encrypt certificates)
- MongoDB Atlas (cloud database)

## Project Conventions

### Code Style

**Backend (Node.js/TypeScript):**
- Strict TypeScript mode enabled
- File naming: `*.service.ts`, `*.routes.ts`, `*.model.ts`, `*.controller.ts`
- MVC pattern: Controllers → Services → Repositories
- Zod schemas for input validation

**Frontend (Next.js/React):**
- TypeScript throughout
- PascalCase for component names
- React Context for state management (AuthProvider)
- Tailwind CSS for styling
- Next.js App Router with server/client components

**Go (Proxy):**
- Modular package structure (`internal/`, `transformers/`)
- Configuration-driven behavior via JSON files
- Concurrent request handling with buffer pooling

### Architecture Patterns

- **Backend:** Repository pattern for database abstraction, middleware-based request processing
- **Frontend:** Component-based architecture with context providers
- **Proxy:** Multi-upstream routing with request/response transformation
- **Overall:** Microservices architecture with 3 main services (frontend, backend, proxy)

### Testing Strategy

- ESLint for code linting (`npm run lint`)
- Manual testing during development
- Seed scripts available for database initialization
- Health check endpoints for service monitoring (`/health`, `/api/health`)

### Git Workflow

- Main branch: `main`
- Feature branches for development
- Commit messages should describe the change concisely
- GitHub repository: `https://github.com/hjsad1994/Troll-LLM.git`

## Domain Context

**API Key Format:**
- User keys: `sk-trollllm-*`
- Factory keys for system use
- Friend/shared keys with usage limits

**Billing Model:**
- Credit-based system (20-100 USD per transaction)
- Credit expiration: 7 days from purchase
- Promotional bonus: 15% during active promo windows
- Referral system: 50% bonus credits (minimum $5)

**Supported LLM Providers:**
- Claude (Opus 4.5, Sonnet 4.5, Haiku 4.5)
- GPT models (GPT-5.1)
- Gemini models (Gemini 3 Pro Preview)

**Content Filtering:**
- Blocks Claude identity claims in responses
- Pattern-based content filtering

## Important Constraints

**Security:**
- JWT-based authentication with secret key management
- Password hashing: PBKDF2 (1000 iterations) with SHA-512
- API key masking in UI (first 15 + last 4 chars visible)
- TLS/SSL enforcement (HTTP → HTTPS redirect)

**Rate Limiting:**
- Nginx: 10 r/s general, 30 r/s API, 5 r/m login
- GoProxy: Custom rate limiter per user
- Connection limiting: 20 per IP

**Operational:**
- Services must be containerized via Docker
- Production requires SSL certificates
- MongoDB Atlas for database (no local DB in prod)

## External Dependencies

**Upstream LLM Providers:**
- Claude API (Anthropic) via factory.ai proxy
- OpenAI API
- Google Gemini API
- Custom upstream servers (Hash070, MegaLLM)

**Payment Processing:**
- SePay (Vietnam QR Banking)
- MB Bank account for transfers

**Notifications:**
- Discord webhooks for system alerts

**Infrastructure Services:**
- MongoDB Atlas (cloud database)
- Docker Hub (container registry)
- Let's Encrypt (SSL certificates)
