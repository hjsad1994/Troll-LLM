# Test Commands for OhMyGPT Thinking Budget

## Method 1: Check Response Headers (Easiest)

Khi gửi request, response sẽ có `x-thinking-budget` header cho biết budget tokens.

```bash
# Test với Opus 4.5
curl -X POST http://localhost:8005/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "model": "claude-opus-4-5-20251101",
    "max_tokens": 4096,
    "messages": [{"role": "user", "content": "1+1=?"}]
  }' -v 2>&1 | grep -i "thinking"
```

Expected output in response headers:
```
< x-thinking-budget: 6000
```

## Method 2: Check Response Body (Detailed)

Response body sẽ chứa `thinking` field với budget tokens:

```bash
curl -X POST http://localhost:8005/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "model": "claude-opus-4-5-20251101",
    "max_tokens": 4096,
    "messages": [{"role": "user", "content": "Solve this step by step: What is 25 * 37?"}]
  }' | jq '.thinking'
```

Expected output:
```json
{
  "type": "enabled",
  "budget_tokens": 6000
}
```

## Method 3: Verify Max Tokens Auto-adjustment

Theo code (`goproxy/transformers/request.go:383-386`), nếu `max_tokens` <= `budgetTokens`, system sẽ tự động tăng `max_tokens` = `budgetTokens + 4000`.

```bash
# Test với max_tokens thấp hơn budget
curl -X POST http://localhost:8005/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "Hi"}]
  }' -v 2>&1 | grep "max_tokens"
```

Expected: Request sẽ được tự động adjust thành `max_tokens: 10000` (6000 + 4000)

## Method 4: Production Test

```bash
# Test trên production (ohmygpt endpoint)
curl -X POST https://chat.trollllm.xyz/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-trollllm-YOUR_KEY" \
  -d '{
    "model": "claude-opus-4-5-20251101",
    "max_tokens": 4096,
    "messages": [{"role": "user", "content": "Hello"}]
  }' | jq '.thinking'
```

## Verification Checklist

- [ ] `thinking.type` = "enabled"
- [ ] `thinking.budget_tokens` = 6000 (not 12000)
- [ ] Max tokens được auto-adjust khi cần
- [ ] Response trả về bình thường, không có lỗi

## Rollback nếu có vấn đề

```bash
# Revert changes
cd /e/testt/TrollLLM/goproxy
sed -i 's/"thinking_budget": 6000/"thinking_budget": 12000/g' config-ohmygpt-dev.json config-ohmygpt-prod.json

# Restart service
docker-compose restart goproxy
```
