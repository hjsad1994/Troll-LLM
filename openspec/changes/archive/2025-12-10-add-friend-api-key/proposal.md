# Change: Add Friend API Key with Per-Model Limits

## Why
Users want to share API access with friends/testers without exposing their main API key. Currently, there's no way for users to create a secondary key with spending limits per model, which would allow controlled testing while protecting the user's main credits balance.

## What Changes
- Users can generate a **secondary "Friend API Key"** that can be shared with friends for testing
- Users can set **per-model spending limits** (e.g., Sonnet 4.5: $50, Opus 4.5: $10)
- When a model limit is hit, that specific model becomes unavailable for the Friend Key
- **RPM follows user's plan** (Dev plan = Dev RPM, Pro plan = Pro RPM)
- **Credits deducted** from user's main `credits` and `refCredits` when Friend Key is used
- New **Friend Key Management page** at `/dashboard/friend-key` for:
  - Generating/rotating Friend Key
  - Setting per-model limits
  - Monitoring usage (e.g., $5/$100 used for Opus 4.5)
  - Viewing Friend Key activity

## Impact
- Affected specs: `user-dashboard`, `api-proxy`
- Affected code:
  - Backend: New model `FriendKey`, new routes `/api/user/friend-key/*`, modify proxy auth logic
  - Frontend: New page `/dashboard/friend-key` with limit configuration and usage monitoring
  - GoProxy: Modify authentication to recognize Friend Keys and enforce per-model limits
