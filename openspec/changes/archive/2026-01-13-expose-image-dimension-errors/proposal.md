# Change: Expose Image Dimension Validation Errors to OpenHands Users

## Why

Currently, when OpenHands users submit images that exceed Anthropic's 8000 pixel dimension limit via the Anthropic API, they receive a generic "Bad request" error message. The actual error from Anthropic (`messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels`) is hidden by TrollProxy's error sanitization logic.

This prevents users from understanding why their request failed and how to fix it. Unlike other 400 errors that may expose implementation details, image dimension errors are:
- Actionable by the user (resize the image)
- Do not expose sensitive upstream details
- Standard validation errors expected in public APIs

The request is to expose these specific image dimension validation errors to OpenHands users while continuing to sanitize all other invalid request errors.

## What Changes

- Modify `SanitizeAnthropicError()` in `goproxy/internal/openhands/types.go` to detect and preserve image dimension validation errors
- Add detection logic to identify when a 400 error contains image dimension violations
- Return the original error message (or a cleaned version) for image dimension errors
- Continue sanitizing all other 400 errors to "Bad request"
- Log the original error for audit purposes

## Impact

- Affected specs: `openhands-error-messages` (new spec)
- Affected code: `goproxy/internal/openhands/types.go` (SanitizeAnthropicError function)
- Breaking: No - this adds transparency for a specific error class, other error handling remains unchanged
- Behavior: OpenHands users will now see specific error messages for image dimension violations instead of generic "Bad request"
