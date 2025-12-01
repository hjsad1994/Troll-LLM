# Change: Remove Troll-2 Proxy from Project

## Why
The Troll-2 proxy (MegaLLM upstream) is being removed from the project. This simplifies the codebase by removing an unused upstream provider and associated models.

## What Changes
- **BREAKING**: Remove entire `internal/troll2` package
- **BREAKING**: Remove 4 models that use Troll-2 upstream:
  - `deepseek-ai/DeepSeek-V3`
  - `moonshotai/kimi-k2-instruct-0905`
  - `openai-gpt-oss-20b`
  - `openai-gpt-oss-120b`
- Remove `handleTroll2Request` and `handleTroll2MessagesRequest` functions from main.go
- Remove Troll-2 routing logic from `selectUpstreamConfig`
- Remove `MEGALLM_SERVER` and `MEGALLM_API_KEY` environment variable handling
- Remove Troll-2 related OpenSpec requirement

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `goproxy/internal/troll2/` (delete entire directory)
  - `goproxy/main.go` (remove troll2 imports, handlers, routing)
  - `goproxy/config.json` (remove 4 models)
  - `goproxy/config.prod.json` (remove 4 models)
  - `goproxy/config/config.go` (remove troll-2 upstream handling)
- **User Impact**: Models using Troll-2 upstream will no longer be available
