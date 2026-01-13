# Design: Expose Image Dimension Validation Errors

## Context

TrollProxy sanitizes all upstream error messages to protect implementation details and prevent information leakage. This is currently done in:
- `goproxy/internal/openhands/types.go`: `SanitizeError()` and `SanitizeAnthropicError()`
- `goproxy/internal/maintarget/handler.go`: `sanitizeError()` and `sanitizeAnthropicError()`

The sanitization functions replace 400 errors with generic "Bad request" messages. However, some 400 errors contain actionable user-facing validation messages that should be preserved.

**Existing precedent:** The codebase already preserves "prompt too long" errors (see `ohmygpt-error-messages` spec). This change extends that pattern to image dimension validation errors.

**Upstream error format:**
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels"
  },
  "request_id": "req_011CX5uDfRKGCLDjdQNuZVNz"
}
```

## Goals / Non-Goals

**Goals:**
- Expose image dimension validation errors to OpenHands users
- Help users understand and fix image size issues
- Maintain consistency with existing "prompt too long" error handling pattern
- Continue protecting other upstream implementation details

**Non-Goals:**
- Change OpenAI format error handling (only Anthropic format affected)
- Modify MainTarget error sanitization (only OpenHands affected)
- Expose other 400 validation errors (only image dimension errors)
- Add image preprocessing or automatic resizing

## Decisions

### Decision 1: Pattern matching approach

Use substring matching to detect image dimension errors, similar to existing "prompt too long" detection.

**Detection indicators:**
- "image dimensions exceed"
- "exceed max allowed size"
- "image.source.base64.data"

**Rationale:**
- Consistent with existing pattern for prompt length errors
- Flexible to handle variations in error message format
- Simple to implement and maintain
- Low risk of false positives

**Alternatives considered:**
- Regex matching: More complex, unnecessary for this use case
- JSON path parsing: Too brittle, error format may change
- Error code matching: Anthropic doesn't provide distinct codes for this

### Decision 2: Error message format

Return the original Anthropic error message without modification.

**Rationale:**
- Anthropic's error message is already user-friendly and actionable
- Contains specific information (which field, what limit, actual violation)
- Follows Anthropic API conventions that OpenHands users expect
- No need to rewrite or sanitize further

**Example output:**
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels"
  }
}
```

### Decision 3: Only modify Anthropic format handler

Only modify `SanitizeAnthropicError()` in `goproxy/internal/openhands/types.go`.

**Rationale:**
- OpenHands Anthropic endpoint is the only path where this error occurs
- OpenAI format doesn't support Anthropic's native image format
- Maintains separation of concerns between format handlers
- No changes needed to OpenAI error handling or MainTarget

## Risks / Trade-offs

**Risk 1: Exposing field paths**
The error message includes JSON field paths like `messages.52.content.2.image.source.base64.data`.

**Mitigation:** This is standard Anthropic API behavior and doesn't expose TrollProxy implementation details. Users of the Anthropic API expect this format.

**Risk 2: Future upstream changes**
Anthropic might change the error message format or wording.

**Mitigation:** Pattern matching is flexible enough to handle minor variations. If Anthropic makes major changes, the worst case is that errors revert to generic "Bad request" until we update the detection logic.

**Risk 3: False positives**
Detection logic might match unintended error messages.

**Mitigation:** The detection keywords are specific to image dimension validation. False positives are unlikely and would only result in exposing an error that was meant to be sanitized (minimal security impact).

## Migration Plan

No migration required - this is a transparent enhancement to error handling.

**Deployment:**
1. Deploy code changes to staging
2. Test with oversized images via OpenHands Anthropic endpoint
3. Verify error message is exposed correctly
4. Verify other 400 errors remain sanitized
5. Deploy to production

**Rollback:**
Simple code revert if issues arise. No database or state changes.

## Open Questions

None - the change is straightforward and follows existing patterns.
