## Context
TrollLLM currently supports two upstream providers:
- **troll**: Factory AI via proxy pool (default)
- **main**: External provider via MAIN_TARGET_SERVER

Adding a unified `TrollProxy` module enables:
- Centralized management of all reverse proxy upstream providers
- Easy addition of new upstream providers (OhmyGPT first, others later)
- Consistent interface and patterns across all providers
- Better code organization and maintainability

## Goals / Non-Goals
**Goals:**
- Create unified `TrollProxy` module in `goproxy/internal/trollproxy/`
- Implement OhmyGPT as first provider in TrollProxy
- Support Claude models only (as specified by endpoint)
- Maintain same billing and usage tracking as other upstreams
- Preserve error sanitization patterns
- Design for extensibility (easy to add more providers)

**Non-Goals:**
- Automatic failover between upstreams (future enhancement)
- Dynamic load balancing (out of scope)
- Non-Claude models on OhmyGPT
- Migrating existing `maintarget` to TrollProxy (can be done later)

## Decisions

### Decision 1: Unified TrollProxy Folder
Create `goproxy/internal/trollproxy/` with structured files:
```
trollproxy/
├── types.go      # Shared interfaces and types
├── registry.go   # Provider registry and routing
├── ohmygpt.go    # OhmyGPT handler implementation
└── (future providers...)
```

**Rationale:** Centralized location makes it easy to add/manage multiple providers.

### Decision 2: Provider Interface
Define common interface for all providers:
```go
type Provider interface {
    Name() string
    IsConfigured() bool
    ForwardRequest(body []byte, isStreaming bool) (*http.Response, error)
}
```

**Rationale:** Consistent API across all providers, easy to swap/add.

### Decision 3: OpenAI-Compatible Endpoint for OhmyGPT
OhmyGPT endpoint `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg` uses OpenAI format:
- POST requests with JSON body
- Authorization via Bearer token or x-api-key
- OpenAI response format with usage object

**Rationale:** Endpoint path suggests OpenAI compatibility.

### Decision 4: Environment-Based Configuration
Use `OHMYGPT_API_KEY` environment variable for API key:
- Consistent with MAIN_UPSTREAM_KEY pattern
- Easy deployment configuration
- No hardcoded secrets

## Architecture

```
Client Request
     │
     ▼
selectUpstreamConfig(model)
     │
     ├─ upstream="troll" → Factory AI (via proxy pool)
     │
     ├─ upstream="main" → MAIN_TARGET_SERVER (maintarget)
     │
     └─ upstream="ohmygpt" → TrollProxy Registry
                               │
                               ▼
                         trollproxy.GetProvider("ohmygpt")
                               │
                               ▼
                    https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg
```

### TrollProxy Module Structure
```
goproxy/internal/trollproxy/
├── types.go       # Provider interface, UsageCallback, common types
├── registry.go    # RegisterProvider(), GetProvider(), Configure()
├── ohmygpt.go     # OhmyGPT implementation
│   ├── Configure(apiKey)
│   ├── ForwardRequest(body, stream)
│   ├── HandleStreamResponse(w, resp, onUsage)
│   └── HandleNonStreamResponse(w, resp, onUsage)
└── (future: openrouter.go, anthropic_direct.go, etc.)
```

## Risks / Trade-offs
- **Risk:** OhmyGPT API format mismatch → Mitigation: Test with Claude models
- **Risk:** Different error response format → Mitigation: Apply same sanitization
- **Trade-off:** Adding abstraction layer adds complexity but improves extensibility

## Open Questions
- Does OhmyGPT support caching tokens? (Assume no initially)
- Rate limits on OhmyGPT endpoint? (Handle with standard 429 response)
- Should we migrate `maintarget` into TrollProxy? (Future consideration)
