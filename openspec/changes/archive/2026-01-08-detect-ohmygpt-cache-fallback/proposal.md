# Proposal: Detect and Alert OhMyGPT Cache Fallback

## Change ID
`detect-ohmygpt-cache-fallback`

## Status
**PROPOSED**

## Why

OhMyGPT upstream frequently falls back to models that don't support prompt caching, causing significant cost increases (2-30x). Without notification, there's no way to know this is happening until reviewing billing logs.

## Problem Statement

OhMyGPT upstream thường xuyên fallback về model không hỗ trợ cache, khiến chi phí tăng cao:

- **Cache tokens** ($0.5-$6.25/MTok) thành **regular tokens** ($15/MTok)
- Không có thông báo khi điều này xảy ra
- User bị mất tiền mà không biết

## Proposed Solution

Giải đơn giản: Phát hiện **nhiều request không có cache** → Gửi email thông báo

### 1. Detection Logic (GoProxy)
- Kiểm tra response từ OhMyGPT
- Nếu model hỗ trợ cache (Opus 4.5, Sonnet 4.5, Haiku 4.5)
- Và input tokens > 1024
- Nhưng cache tokens = 0
- → Đếm là 1 cache fallback event

### 2. Threshold-based Alerting
- **Chỉ báo khi có nhiều request không cache** (tránh false positive)
- Mặc định: **5 requests không cache** trong **1 phút** → gửi email
- Có thể điều chỉnh ngưỡng qua config
- Reset bộ đếm sau khi gửi email

### 3. Email Alert (via Resend API)
- Gửi email đến: trantai306@gmail.com
- Sử dụng Resend API key: re_Qa5RkL7o_7PMxFKDpqrXwyBdQ7TjCyBtW
- Rate limit: tối đa 1 email/5 phút (tránh spam)
- Nội dung: Số lượng request không cache, thời gian, các model bị ảnh hưởng, tổng thiệt hại

### 4. Configuration
- Environment variable để bật/tắt
- Environment variable cho threshold (số request trigger alert)
- Environment variable cho time window (khoảng thời gian đếm)

## Success Criteria

1. Phát hiện đúng khi OhMyGPT không return cache tokens
2. Chỉ báo khi có N request không cache trong T phút (tránh báo 1 request lẻ)
3. Gửi email thông báo đến trantai306@gmail.com với đầy đủ thông tin
4. Rate limit hoạt động (không spam)

## Related Changes

- **request-logging** spec - cho usage tracking infrastructure

## Impact Assessment

**Scope:**
- GoProxy (cache detection logic + counter)
- GoProxy (Resend API integration)

**Risk Level:** LOW
- Không ảnh hưởng existing functionality
- Có thể bật/tắt qua config

**User Impact:** NONE (internal admin feature)

## Configuration

```bash
# Enable/disable cache fallback detection
CACHE_FALLBACK_DETECTION=true

# Resend API key
RESEND_API_KEY=re_Qa5RkL7o_7PMxFKDpqrXwyBdQ7TjCyBtW

# Email to notify
CACHE_FALLBACK_ALERT_EMAIL=trantai306@gmail.com

# Threshold: số request không cache để trigger alert
CACHE_FALLBACK_THRESHOLD_COUNT=5

# Time window: phút đếm số request không cache
CACHE_FALLBACK_TIME_WINDOW_MIN=1

# Rate limit: phút tối thiểu giữa các alert
CACHE_FALLBACK_ALERT_INTERVAL_MIN=5
```
