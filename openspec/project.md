# Project Context

## Purpose
F-Proxy is a high-performance Go-based API proxy server for Factory AI. It provides:
- OpenAI-compatible `/v1/chat/completions` endpoint for any OpenAI SDK
- Anthropic-native `/v1/messages` endpoint for direct Anthropic SDK support
- Multi-model routing (Claude Opus, Sonnet, Haiku and GPT models)
- Real-time SSE streaming for both API formats
- Dual key authentication (proxy key + upstream Factory API key)

## Tech Stack
- **Language**: Go 1.22
- **HTTP**: HTTP/2 with TLS 1.3 support
- **Compression**: Brotli and Gzip decompression
- **Dependencies**:
  - `github.com/andybalholm/brotli` - Brotli compression
  - `github.com/google/uuid` - UUID generation
  - `golang.org/x/net` - HTTP/2 support

## Project Conventions

### Code Style
- Use `gofmt` for formatting
- Run `go vet` for static analysis
- golangci-lint with: errcheck, govet, unused, staticcheck, gosimple, ineffassign, typecheck
- Functions that return errors should handle them explicitly
- Use descriptive variable names in English
- Log messages use emoji prefixes for visual clarity (e.g., `✅`, `❌`, `📥`, `📤`)

### Architecture Patterns
- **Package Structure**:
  - `main_multimodel.go` - Main server and HTTP handlers
  - `config/` - Configuration loading and model/endpoint management
  - `transformers/` - Request/response transformation between API formats
- **Request Flow**: Client → Proxy Authentication → Transform Request → Upstream API → Transform Response → Client
- **Streaming**: SSE (Server-Sent Events) pass-through with format transformation
- **Configuration**: JSON-based config (`config.json`) with environment variable overrides

### Testing Strategy
- Go standard testing with `go test`
- Race detection enabled (`-race` flag)
- Coverage reporting (`-coverprofile=coverage.txt`)
- Build tags for conditional compilation (`openai` tag)
- Run tests: `make test` or `go test -v -race -coverprofile=coverage.txt -covermode=atomic ./...`

### Git Workflow
- Main branch: `main`
- Commit style: Conventional commits (e.g., `docs:`, `feat:`, `fix:`)
- Keep commits focused and descriptive

## Domain Context
- **Factory AI**: Upstream AI provider that hosts Claude and GPT models
- **OpenAI Format**: Standard chat completion format with `messages` array
- **Anthropic Format**: Native format with `system` array and `messages` array
- **Streaming**: Both formats use SSE but with different event structures
- **Thinking/Reasoning**: Claude models support extended thinking; GPT-5 requires reasoning parameter
- **Content Sanitization**: Some phrases are blocked by upstream and must be sanitized

## Important Constraints
- `FACTORY_API_KEY` environment variable is required
- `PROXY_API_KEY` is optional for client authentication
- Max token limits vary by model (Claude Opus 4.1: 32K, others: 64K-128K)
- System prompts from config take precedence; user system prompts are moved to conversation
- HTTP client timeout: 120 seconds
- Server read timeout: 120s, write timeout: 300s

## External Dependencies
- **Factory AI API**: `https://api.factory.ai` (Anthropic and OpenAI endpoints)
- **Configuration**: `config.json` for models, endpoints, and system prompts
- **Environment Variables**:
  - `FACTORY_API_KEY` - Upstream API authentication
  - `PROXY_API_KEY` - Client authentication (optional)
  - `CONFIG_PATH` - Config file path (default: `config.json`)
  - `DEBUG` - Enable debug logging (`true`/`false`)
