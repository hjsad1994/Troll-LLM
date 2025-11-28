# Project Context

## Purpose
TrollLLM is a full-stack API proxy and management platform for AI services (Factory AI). It provides:
- Multi-model API proxy with OpenAI and Anthropic endpoint compatibility
- Admin dashboard for API key management, usage tracking, and proxy configuration
- User-facing usage dashboard
- Proxy pool management with health monitoring

## Architecture

### Components
1. **GoProxy** (`/goproxy`) - High-performance Go API proxy server
   - OpenAI-compatible `/v1/chat/completions` endpoint
   - Anthropic-native `/v1/messages` endpoint
   - Multi-model routing (Claude Opus, Sonnet, Haiku, GPT models)
   - Real-time SSE streaming with format transformation
   - Round-robin proxy selection with load balancing

2. **Backend** (`/backend`) - Node.js/Express admin API
   - API key CRUD and management
   - Usage tracking and statistics
   - Proxy pool management
   - Admin authentication

3. **Frontend** (`/frontend`) - Next.js admin dashboard
   - Keys management UI
   - Factory keys management
   - Proxy configuration
   - Usage dashboard

## Tech Stack

### GoProxy
- **Language**: Go 1.22
- **HTTP**: HTTP/2 with TLS 1.3 support
- **Compression**: Brotli and Gzip decompression
- **Database**: MongoDB (via `go.mongodb.org/mongo-driver`)
- **Dependencies**:
  - `github.com/andybalholm/brotli` - Brotli compression
  - `github.com/google/uuid` - UUID generation
  - `golang.org/x/net` - HTTP/2 support
  - `github.com/joho/godotenv` - Environment variables

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 4.x
- **Database**: MongoDB (via Mongoose 8.x)
- **Validation**: Zod
- **Authentication**: jsonwebtoken (JWT)
- **ID Generation**: nanoid
- **Dev Tools**: tsx, eslint

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 with Tailwind CSS 3.4
- **Language**: TypeScript 5.x
- **Port**: 8080

## Project Conventions

### Code Style

#### GoProxy (Go)
- Use `gofmt` for formatting
- Run `go vet` for static analysis
- golangci-lint with: errcheck, govet, unused, staticcheck, gosimple, ineffassign, typecheck
- Functions that return errors should handle them explicitly
- Use descriptive variable names in English
- Log messages use emoji prefixes for visual clarity (e.g., `✅`, `❌`, `📥`, `📤`)

#### Backend (TypeScript)
- TypeScript strict mode
- Express middleware pattern
- Zod for request validation
- Mongoose schemas for data modeling
- Use `.js` extension in imports (ES modules)

#### Frontend (React/Next.js)
- Next.js 14 App Router conventions
- Server components by default
- Tailwind CSS for styling
- TypeScript strict mode

### Architecture Patterns

#### GoProxy
- **Package Structure**:
  - `main.go` - Main server and HTTP handlers
  - `config/` - Configuration loading and model/endpoint management
  - `transformers/` - Request/response transformation between API formats
  - `internal/` - Internal utilities
  - `db/` - Database connections
- **Request Flow**: Client → Proxy Authentication → Transform Request → Upstream API → Transform Response → Client
- **Streaming**: SSE (Server-Sent Events) pass-through with format transformation
- **Configuration**: JSON-based config (`config.json`) with environment variable overrides

#### Backend
- **Structure**:
  - `src/index.ts` - Express app entry point
  - `src/routes/` - API route handlers
  - `src/controllers/` - Request/response handling
  - `src/services/` - Business logic
  - `src/repositories/` - Data access layer
  - `src/models/` - Mongoose schema definitions
  - `src/dtos/` - Data transfer objects and validation
  - `src/middleware/` - Auth and validation middleware
  - `src/db/` - MongoDB connection setup
  - `src/scripts/` - Utility scripts
- **API Pattern**: RESTful with admin-prefixed protected routes
- **Auth**: JWT-based authentication via jsonwebtoken, X-Session-Token header

#### Frontend
- **Structure**:
  - `src/app/` - Next.js App Router pages
  - `src/app/(dashboard)/` - Protected dashboard routes (route group)
  - `src/components/` - Reusable React components
  - `src/lib/` - Utilities and API clients
- **Pages**: 
  - Public: login, register, docs, models, usage
  - Dashboard: dashboard, keys, factory-keys, proxies, users, admin

### Testing Strategy
- **GoProxy**: Go standard testing with `go test -race`
- **Backend**: `npm run lint` for linting
- **Frontend**: `npm run lint` (Next.js ESLint)

### Git Workflow
- Main branch: `main`
- Commit style: Conventional commits (e.g., `docs:`, `feat:`, `fix:`)
- Keep commits focused and descriptive

## Domain Context
- **Factory AI**: Upstream AI provider that hosts Claude and GPT models
- **OpenAI Format**: Standard chat completion format with `messages` array
- **Anthropic Format**: Native format with `system` array and `messages` array
- **Streaming**: Both formats use SSE but with different event structures
- **API Keys**: User-facing keys for proxy access, Factory keys for upstream auth
- **Proxy Pool**: Multiple proxy endpoints for load balancing and failover

## Important Constraints

### GoProxy
- `FACTORY_API_KEY` environment variable is required
- `PROXY_API_KEY` is optional for client authentication
- Max token limits vary by model (Claude Opus 4.1: 32K, others: 64K-128K)
- HTTP client timeout: 120 seconds
- Server read timeout: 120s, write timeout: 300s

### Backend
- `MONGODB_URI` required for database connection
- `ADMIN_SECRET_KEY` for admin authentication
- Port configurable via `BACKEND_PORT` (default: 3000)

### Frontend
- Runs on port 8080
- Requires backend API at localhost:3000 (configurable)

## External Dependencies

### Services
- **MongoDB**: Shared database for keys, usage, and proxy configuration
- **Factory AI API**: Upstream AI provider

### Environment Variables
- `MONGODB_URI` - MongoDB connection string (all components)
- `FACTORY_API_KEY` - Upstream API authentication (goproxy)
- `PROXY_API_KEY` - Client authentication (goproxy, optional)
- `ADMIN_SECRET_KEY` - Admin auth (backend)
- `DEBUG` - Enable debug logging (goproxy)

## Running the Project
- **Docker**: `docker-compose -f docker-compose.new.yml up`
- **Backend**: `cd backend && npm run dev`
- **Frontend**: `cd frontend && npm run dev`
- **GoProxy**: `cd goproxy && go run main.go`
