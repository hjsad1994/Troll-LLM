# Hướng Dẫn Test GLM Failover Feature

## 📋 Mục Lục
1. [Cấu hình Environment](#1-cấu-hình-environment)
2. [Build và Chạy](#2-build-và-chạy)
3. [Test Cases](#3-test-cases)
4. [Kiểm tra Log](#4-kiểm-tra-log)
5. [Xử lý Lỗi](#5-xử-lý-lỗi)

---

## 1. Cấu hình Environment

### Thêm vào `.env` file:

```bash
# GLM Provider (bắt buộc để failover hoạt động)
GLM_API_KEY=c766e3323f504b5da5eaa9b2b971962d.g9e5mUzILgPPvTc7
GLM_ENDPOINT=https://open.bigmodel.cn/api/paas/v4/chat/completions

# Bật Cache Fallback Detection
CACHE_FALLBACK_DETECTION=true

# Bật Failover Manager
CACHE_FAILOVER_ENABLED=true

# Ngưỡng kích hoạt failover (mặc định: $1.50)
CACHE_FAILOVER_LOSS_THRESHOLD=1.50

# Thời gian cooldown (mặc định: 15 phút)
CACHE_FAILOVER_COOLDOWN_MINUTES=15

# Cache detection config (để test nhanh)
CACHE_FALLBACK_THRESHOLD_COUNT=1
CACHE_FALLBACK_TIME_WINDOW_MIN=1
```

---

## 2. Build và Chạy

```bash
# Vào thư mục goproxy
cd goproxy

# Build
go build -o goproxy.exe

# Chạy server
./goproxy.exe
```

### Kiểm tra Startup Log:

```
✅ GLM provider configured for failover
✅ Failover Manager Enabled: threshold=$1.50, cooldown=15 minutes
✅ Detection enabled: cache_threshold=1, error_threshold=6, window=1m
```

Nếu thấy:
- `⚠️ GLM configuration failed` → Kiểm tra `GLM_API_KEY`
- `🔕 Failover Manager Disabled` → Kiểm tra `CACHE_FAILOVER_ENABLED=true`

---

## 3. Test Cases

### Test 1: Request Thường (Normal Flow)

**Mục tiêu:** Verify request được route đến OhMyGPT bình thường

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

**Log mong đợi:**
```
🔀 [Model Routing] claude-sonnet-4-5-20250929 -> OhMyGPT (upstream=ohmygpt)
```

**Response:** Model name giữ nguyên `claude-sonnet-4-5-20250929`

---

### Test 2: Anthropic Format

```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

### Test 3: Trigger Failover Thủ Công

Để trigger failover, cần một request với:
- Cache miss: `cache_read = 0` VÀ `cache_creation = 0`
- Input tokens lớn (>6000)
- Estimated loss > $1.50

**Python Script Test:**

```python
import requests

# Large request (~10K tokens)
large_text = "Explain this: " + "word " * 8000

response = requests.post(
    "http://localhost:8080/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "model": "claude-sonnet-4-5-20250929",
        "messages": [{"role": "user", "content": large_text}],
        "max_tokens": 100
    }
)

print(response.json())
```

**Log khi failover kích hoạt:**
```
⚠️ [Cache Fallback] Event recorded: model=claude-sonnet-4-5-20250929 tokens=8200 loss=$1.8500
⚠️ [Cache Fallback] Trigger conditions met for claude-sonnet-4-5-20250929: cache_miss=true, loss=$1.85 (threshold=$1.50)
🔄 [Cache Fallback] Failover activated for claude-sonnet-4-5-20250929 due to cache loss threshold exceeded
🔄 [Failover Manager] Activated for claude-sonnet-4-5-20250929 (until 2025-01-09 15:30:00, trigger #1)
```

---

### Test 4: Verify Routing sau Failover

Sau khi failover được kích hoạt, các request tiếp theo sẽ route đến GLM:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Test"}],
    "max_tokens": 10
  }'
```

**Log mong đợi:**
```
🔄 [Model Routing] claude-sonnet-4-5-20250929 -> GLM (failover active until 15:30:05)
📤 [GLM-OpenAI] Forwarding /v1/chat/completions (model=claude-sonnet-4-5-20250929, stream=false, failover=true)
```

**Response:** Model name VẪN là `claude-sonnet-4-5-20250929` (đã được rewrite từ GLM response)

---

### Test 5: Auto-Recovery sau Cooldown

Sau 15 phút (hoặc chỉnh `CACHE_FAILOVER_COOLDOWN_MINUTES=1` để test nhanh), request đầu tiên sau cooldown sẽ:

1. Thử route lại OhMyGPT
2. Nếu cache OK →stay với OhMyGPT
3. Nếu cache vẫn fail → trigger lại failover

**Log khi auto-recovery:**
```
✅ [Failover Manager] Auto-recovered for claude-sonnet-4-5-20250929 (cooldown expired)
🔀 [Model Routing] claude-sonnet-4-5-20250929 -> OhMyGPT (upstream=ohmygpt)
```

---

## 4. Kiểm tra Log

### Success Indicators:

| Indicator | Log | Ý nghĩa |
|-----------|-----|---------|
| ✅ GLM configured | `GLM provider configured for failover` | GLM đã được init |
| ✅ Failover enabled | `Failover Manager Enabled: threshold=$1.50` | Failover manager đang chạy |
| ✅ Normal routing | `-> OhMyGPT (upstream=ohmygpt)` | Route bình thường |
| ✅ Failover active | `-> GLM (failover active until HH:MM:SS)` | Đang failover |
| ✅ Auto-recovered | `Auto-recovered for <model>` | Đã recovery |

### Warning/Error Indicators:

| Indicator | Log | Action |
|-----------|-----|--------|
| ⚠️ GLM not configured | `GLM configuration failed` | Check `GLM_API_KEY` |
| ⚠️ Failover disabled | `Failover Manager Disabled` | Set `CACHE_FAILOVER_ENABLED=true` |
| ⚠️ Fallback to OhMyGPT | `failover active but GLM not configured` | Configure GLM |

---

## 5. Xử lý Lỗi

### Error: `GLM not configured`

```
❌ [GLM-OpenAI] GLM not configured
```

**Fix:** Thêm vào `.env`
```bash
GLM_API_KEY=c766e3323f504b5da5eaa9b2b971962d.g9e5mUzILgPPvTc7
```

---

### Error: Failover không kích hoạt

**Kiểm tra:**
1. `CACHE_FALLBACK_DETECTION=true` ?
2. `CACHE_FAILOVER_ENABLED=true` ?
3. Cache miss detected? Check log:
   ```
   ⚠️ [Cache Fallback] Event recorded: model=... tokens=... loss=$...
   ```

---

### Error: Request timeout khi failover

**Nguyên nhân:** GLM API endpoint không ổn định

**Fix:** Thử endpoint khác:
```bash
GLM_ENDPOINT=https://api.z.ai/api/paas/v4/chat/completions
```

---

## 6. Quick Test Commands

```bash
# Test nhanh (copy-paste)
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}'
```

```python
# Python quick test
import requests
r = requests.post(
    "http://localhost:8080/v1/chat/completions",
    headers={"Authorization": "Bearer YOUR_KEY", "Content-Type": "application/json"},
    json={"model": "claude-sonnet-4-5-20250929", "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 10}
)
print(r.json())
```

---

## 7. Checklist Trước Production

- [ ] GLM API key đã có và hoạt động
- [ ] Test với request nhỏ → OK
- [ ] Test với request lớn → Trigger failover OK
- [ ] Verify model name preservation OK
- [ ] Test streaming OK
- [ ] Test Anthropic format OK
- [ ] Monitor logs cho 24h với staging traffic
- [ ] Adjust threshold nếu cần ($1.50 → $5.00 để conservative)

---

## 8. Monitoring trong Production

### Metrics cần theo dõi:

1. **Failover Activation Count:**
   ```
   grep "Failover activated" goproxy.log | wc -l
   ```

2. **Auto-Recovery Count:**
   ```
   grep "Auto-recovered" goproxy.log | wc -l
   ```

3. **GLM Request Success Rate:**
   ```
   grep "GLM-OpenAI" goproxy.log | grep -c "200"
   ```

4. **Cache Fallback Events:**
   ```
   grep "Cache Fallback.*Event recorded" goproxy.log
   ```

---

**Last Updated:** 2025-01-09
**Contact:** Development Team
