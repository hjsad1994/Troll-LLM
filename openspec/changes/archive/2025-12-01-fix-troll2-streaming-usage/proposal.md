# Change: Fix Troll-2 Streaming Usage/Credits Tracking

## Why
Troll-2 streaming requests complete successfully (e.g., 736 events) but show `input=0, output=0` in final usage logs. This means credits are NOT being deducted for Troll-2 streaming requests, causing revenue loss and inaccurate user usage tracking.

**Root Cause**: MegaLLM upstream does NOT return usage data in streaming responses, even with `stream_options: {"include_usage": true}`. The SSE events only contain content deltas without token counts.

## What Changes
- Add `stream_options: {"include_usage": true}` to Troll-2 streaming requests (in case future upstream support)
- **Implement token estimation**: Capture streamed content and estimate output tokens (~4 chars/token)
- Both `HandleStreamResponse` and `HandleStreamResponseAnthropic` now estimate tokens from content
- Credits will be properly deducted based on estimated token usage

## Impact
- Affected specs: `api-proxy`
- Affected code: `goproxy/internal/troll2/handler.go`
- **Revenue Impact**: Now billing for all Troll-2 streaming requests (estimated)
- **User Impact**: Users will be charged based on estimated token usage
