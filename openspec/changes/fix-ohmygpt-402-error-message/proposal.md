# Proposal: fix-ohmygpt-402-error-message

## Summary

Fix the misleading error message returned to users when the upstream OhMyGPT API key runs out of quota. Currently, when OhMyGPT returns a 402 error (insufficient balance/quota), the proxy sanitizes this to "Insufficient credits. Please purchase credits to continue." which confuses users into thinking they need to buy more credits from TrollLLM, when actually the upstream provider key has been exhausted and the system is rotating to a backup key.

## Motivation

### Current Behavior
When an OhMyGPT API key is exhausted (402 error), users see:
```json
{"error":{"message":"Insufficient credits. Please purchase credits to continue.","type":"insufficient_quota","code":"insufficient_credits"}}
```

This message is confusing because:
1. Users think they need to purchase more credits from TrollLLM
2. The actual issue is that the upstream OhMyGPT key quota is exhausted
3. The system automatically rotates to backup keys, so the user's request is retried and succeeds
4. In Vietnamese: "hết tiền" (out of money) - misleading since it's the upstream key that's out of quota, not the user's account

### Logs from Production
```
goproxy-1  | 2026/01/07 06:17:31 🔒 [TrollProxy] Original error (hidden): {"error":{"message":"Insufficient balance. Please recharge your account at https://www.ohmygpt.com/billing to continue using our API Service.","type":"insufficient_balance_error"}}
goproxy-1  | 2026/01/07 06:17:31 ❌ [Troll-LLM] OhMyGPT Error 402
goproxy-1  | 2026/01/07 06:17:31 🔒 [TrollProxy] Original error (hidden): {"error":{"message":"Insufficient credits. Please purchase credits to continue.","type":"insufficient_quota","code":"insufficient_credits"}}
```

### Desired Behavior
Users should see a generic request error that:
1. Doesn't mention purchasing credits (which implies user action needed)
2. Doesn't expose upstream provider details (OhMyGPT billing link)
3. Indicates a temporary upstream issue that may resolve with retry
4. Is consistent with the fact that the system auto-rotates keys and retries

## Goals

1. Replace the 402 error message with a generic upstream error message
2. Avoid mentioning "purchase credits" or user billing actions
3. Maintain error sanitization (hide upstream provider details)
4. Ensure message is accurate: it's an upstream key quota issue, not a user credit issue

## Non-Goals

1. Changing the auto-rotation behavior (already works correctly)
2. Exposing upstream provider details to end users
3. Changing error handling for other status codes (400, 401, 403, 429, etc.)
4. Modifying the Anthropic format error handling (only OpenAI format for OhMyGPT)

## Related Changes

- Related to `ohmygpt-auto-recovery` spec (auto-recovery of rate-limited keys)
- Related to `ohmygpt-backup-keys-ui` spec (backup key rotation)
- Builds on existing error sanitization pattern in `goproxy/internal/ohmygpt/types.go`

## Impact Analysis

### User-Facing Changes
- **Before:** "Insufficient credits. Please purchase credits to continue." → User thinks they need to buy credits
- **After:** Generic error message indicating upstream service issue → User understands it's temporary

### Backend Changes
- Modify `SanitizeError()` function for 402 status code in `goproxy/internal/ohmygpt/types.go`
- Modify `SanitizeAnthropicError()` function for 402 status code (for consistency)

### Risk Assessment
- **Low Risk:** Simple string change in error response
- **No Breaking Changes:** Error format (JSON structure) remains the same
- **Backward Compatible:** Clients already handle error responses

## Success Criteria

1. When OhMyGPT returns 402 error, users see a generic error message not mentioning credit purchase
2. Error message still uses standard OpenAI error format with `type` and `code` fields
3. Original upstream error is still logged (hidden from users) for debugging
4. No changes to auto-rotation behavior (keys still rotate and retry)
