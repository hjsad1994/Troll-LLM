# Change: Add Model-Based Upstream Routing

## Why
Hiện tại GoProxy sử dụng Troll-Key (Factory AI) cho tất cả các model. Cần hỗ trợ routing dựa trên model để:
- Giảm chi phí bằng cách sử dụng upstream provider khác cho các model non-premium (Sonnet 4.5, Haiku 4.5)
- Giữ Opus 4.5 trên Factory AI để đảm bảo chất lượng cao nhất
- Người dùng vẫn sử dụng API key của họ, credit được tính y chang như hiện tại

## What Changes

### GoProxy Configuration
- **ADDED**: Thêm `main_target` endpoint mới trong `config.json` cho external provider
- **ADDED**: Thêm trường `upstream` cho mỗi model để chỉ định upstream provider (`troll` hoặc `main`)
- **ADDED**: Environment variables `MAIN_TARGET_SERVER` và `MAIN_UPSTREAM_KEY` từ ok.txt

### GoProxy Routing Logic
- **MODIFIED**: `chatCompletionsHandler` để route request dựa trên `model.Upstream`
- **MODIFIED**: `handleAnthropicMessagesEndpoint` để route request dựa trên `model.Upstream`
- **ADDED**: Hàm helper `selectUpstreamForModel()` để xác định upstream và API key

### Billing & Credits
- **NO CHANGE**: Credit calculation giữ nguyên, sử dụng cùng pricing và billing multiplier
- **NO CHANGE**: Token tracking và usage logging giữ nguyên

## Impact
- **Affected specs**: `specs/api-proxy`
- **Affected code**:
  - `goproxy/config/config.go` - Thêm struct và function cho upstream routing
  - `goproxy/config.json` - Thêm upstream config cho mỗi model
  - `goproxy/main.go` - Sửa routing logic trong handlers
