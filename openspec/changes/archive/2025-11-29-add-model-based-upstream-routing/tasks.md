## QUAN TRỌNG: Giữ code cũ bằng cách COMMENT, không xóa!
> Để sau này có thể disable tính năng này và dùng lại code cũ dễ dàng.

## 1. Configuration Changes

- [ ] 1.1 Cập nhật `config/config.go`:
  - Thêm trường `Upstream` vào struct `Model`
  - Thêm function `GetModelUpstream(modelID string) string`

- [ ] 1.2 Cập nhật `config.json`:
  - Thêm `upstream: "troll"` cho model `claude-opus-4-5-20251101`
  - Thêm `upstream: "main"` cho models `claude-sonnet-4-5-20250929` và `claude-haiku-4-5-20251001`

## 2. Environment Variables

- [ ] 2.1 Đọc `MAIN_TARGET_SERVER` và `MAIN_UPSTREAM_KEY` từ environment
- [ ] 2.2 Fallback về hardcoded values nếu không có env vars

## 3. Routing Logic (COMMENT code cũ, thêm code mới)

- [ ] 3.1 Tạo helper function `selectUpstreamConfig(modelID string)` trong `main.go`:
  - Trả về endpoint URL và API key dựa trên model's upstream setting
  - `main` -> sử dụng `MAIN_TARGET_SERVER` + `MAIN_UPSTREAM_KEY`
  - `troll` -> sử dụng troll-key pool như hiện tại

- [ ] 3.2 Cập nhật `chatCompletionsHandler`:
  - **COMMENT** đoạn code lấy trollAPIKey cũ
  - Thêm code mới gọi `selectUpstreamConfig()` sau khi xác định model
  - Sử dụng endpoint và key từ upstream config

- [ ] 3.3 Cập nhật `handleAnthropicRequest`:
  - **COMMENT** đoạn lấy endpoint cũ
  - Thêm code mới sử dụng upstream endpoint
  
- [ ] 3.4 Cập nhật `handleAnthropicMessagesEndpoint`:
  - **COMMENT** đoạn code lấy trollAPIKey và endpoint cũ
  - Thêm code mới gọi `selectUpstreamConfig()` sau khi xác định model
  - Sử dụng endpoint và key từ upstream config

## 4. Testing

- [ ] 4.1 Test routing Sonnet 4.5 -> Main Target Server
- [ ] 4.2 Test routing Haiku 4.5 -> Main Target Server  
- [ ] 4.3 Test routing Opus 4.5 -> Troll Key (Factory AI)
- [ ] 4.4 Verify credit calculation unchanged for all models

## 5. Cleanup

- [ ] 5.1 Add logging để track upstream selection
- [ ] 5.2 Update docs.html nếu cần

---

## Cách revert về code cũ (khi cần disable tính năng):
1. Uncomment các đoạn code cũ được đánh dấu `// OLD CODE - BEGIN` và `// OLD CODE - END`
2. Comment các đoạn code mới được đánh dấu `// NEW MODEL-BASED ROUTING - BEGIN` và `// NEW MODEL-BASED ROUTING - END`
3. Rebuild goproxy
