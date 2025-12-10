# Change: Refactor OhmyGPT Handler to Match MainTarget Pattern

## Why
OhmyGPT handler hiện tại quá phức tạp với nhiều logic không cần thiết (cleanNulls, complex event parsing, Anthropic format support). OhmyGPT là external service đã xử lý hết backend, chỉ cần forward request và extract usage để tính tiền.

## What Changes
- **Simplify HandleStreamResponse**: Pure passthrough như MainTarget, chỉ extract usage
- **Simplify HandleNonStreamResponse**: Pure passthrough, chỉ extract usage  
- **Remove cleanNulls function**: Không cần transform response
- **Remove Anthropic format support**: OhmyGPT chỉ support OpenAI format
- **Remove ForwardMessagesRequest**: Không dùng Anthropic endpoint
- **Keep Key rotation logic**: Vẫn cần cho multi-key management
- **Keep Proxy pool logic**: Vẫn cần cho proxy support
- **Simplify logging**: Giảm debug logs, giữ essential logs

## Impact
- Affected code: `goproxy/internal/ohmygpt/ohmygpt.go`
- Affected code: `goproxy/main.go` (simplify OhmyGPT handlers)
- No breaking changes for API consumers
- Simpler codebase, easier maintenance

## Benefits
1. Code dễ đọc và maintain hơn
2. Performance tốt hơn (không parse/re-marshal JSON)
3. Consistent với MainTarget pattern
4. Giảm bugs từ complex transformations
