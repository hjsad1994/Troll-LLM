# Change: Add TrollProxy - Unified Reverse Proxy Module

## Why
Create a unified `TrollProxy` module to manage all reverse proxy upstream providers (OhmyGPT, and future providers) in one centralized location, enabling better code organization, easier maintenance, and simplified addition of new upstream providers.

## What Changes
- Create new `goproxy/internal/trollproxy/` folder to contain all reverse proxy handlers
- Add `ohmygpt.go` - reverse proxy to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg` (Claude models)
- Add `registry.go` - central registry for managing multiple upstream providers
- Support Claude models routing to OhmyGPT via `upstream: "ohmygpt"` config
- Environment variables: `OHMYGPT_API_KEY` for authentication
- Passthrough both streaming and non-streaming requests
- Extract usage data for billing from responses

## Impact
- Affected specs: `api-proxy`
- Affected code: 
  - `goproxy/internal/trollproxy/` (new folder)
    - `registry.go` - upstream provider registry
    - `ohmygpt.go` - OhmyGPT handler
    - `types.go` - shared types and interfaces
  - `goproxy/main.go` (add routing logic)
  - `goproxy/config/config.go` (add ohmygpt upstream support)
  - `goproxy/config.json` / `goproxy/config.prod.json` (model upstream config)
