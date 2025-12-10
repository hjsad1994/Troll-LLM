## 1. Create TrollProxy Module

- [x] 1.1 Create `goproxy/internal/trollproxy/types.go`
  - Provider interface definition
  - UsageCallback type for billing
  - Common error sanitization functions

- [x] 1.2 Create `goproxy/internal/trollproxy/registry.go`
  - Provider registry map
  - RegisterProvider() function
  - GetProvider(name) function
  - IsConfigured(name) function

- [x] 1.3 Create `goproxy/internal/trollproxy/ohmygpt.go`
  - OhmyGPT struct implementing Provider interface
  - Configure(apiKey) for initialization
  - ForwardRequest(body, stream) for request forwarding
  - HandleStreamResponse(w, resp, onUsage) for SSE streaming
  - HandleNonStreamResponse(w, resp, onUsage) for regular responses
  - Extract usage tokens from responses for billing
  - Endpoint: `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`

## 2. Integration

- [x] 2.1 Update `goproxy/config/config.go`
  - Add "ohmygpt" to valid upstream values in GetModelUpstream()

- [x] 2.2 Update `goproxy/main.go`
  - Import trollproxy package
  - Load OHMYGPT_API_KEY from environment
  - Call trollproxy.ConfigureOhmyGPT() on startup
  - Add routing case for upstream="ohmygpt" in selectUpstreamConfig()
  - Add handlers using trollproxy.GetProvider("ohmygpt")

- [ ] 2.3 Update model configuration
  - Add example model config with `upstream: "ohmygpt"` in config.json

## 3. Testing

- [ ] 3.1 Test streaming Claude request via OhmyGPT
- [ ] 3.2 Test non-streaming Claude request via OhmyGPT
- [ ] 3.3 Verify usage tracking and billing works
- [ ] 3.4 Verify error handling and sanitization

## 4. Documentation (Optional)
- [ ] 4.1 Add TrollProxy/OhmyGPT configuration to deployment docs
