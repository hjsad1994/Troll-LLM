# Change: Fix Friend API Key 403 Error with OpenHands Upstream

## Status: IMPLEMENTED

## Why
Users đang gặp lỗi 403 khi sử dụng Friend API Key với các model có upstream là OpenHands. Nguyên nhân: code kiểm tra plan của owner, nếu plan là "free" hoặc empty thì trả về 403.

## What Changes
- **Đã bỏ kiểm tra free tier** - Chỉ cần owner có credits là được sử dụng Friend Key
- Xóa check `owner.Plan == "free" || owner.Plan == ""` trong `ValidateFriendKeyBasic()` và `ValidateFriendKey()`
- Xóa error handling cho `ErrFriendKeyOwnerFreeTier` trong `main.go` (cả 2 endpoints)

## Files Changed
1. `goproxy/internal/userkey/friendkey.go`:
   - `ValidateFriendKeyBasic()`: Bỏ step 5 check free tier, chỉ giữ check credits
   - `ValidateFriendKey()`: Bỏ step 5 check free tier, chỉ giữ check credits

2. `goproxy/main.go`:
   - OpenAI endpoint (`/v1/chat/completions`): Xóa case `ErrFriendKeyOwnerFreeTier`
   - Anthropic endpoint (`/v1/messages`): Xóa case `ErrFriendKeyOwnerFreeTier`

## Impact
- Affected specs: friend-key-api
- Affected code:
  - `goproxy/main.go` (Friend Key validation, OpenHands request handling)
  - `goproxy/internal/userkey/friendkey.go` (Friend Key validation logic)
  - `goproxy/internal/openhands/openhands.go` (Key rotation on 403)
  - `goproxy/db/mongodb.go` (Collection references)

## Investigation Findings

### Current 403 Error Sources (from codebase analysis)

| Source | Location | Condition | Error Message | Error Type |
|--------|----------|-----------|---------------|------------|
| Owner Free Tier | `main.go:584-587` (OpenAI) / `main.go:2671-2674` (Anthropic) | Owner's plan is "free" or empty | "Friend Key owner must upgrade plan" | `free_tier_restricted` |
| OpenHands 403 Sanitized | `main.go:1819-1820` (OpenAI) / `main.go:1842-1843` (Anthropic) | OpenHands returns 403, error gets sanitized | "Access denied" | `permission_error` |
| OpenHands Rotation | `openhands.go:309-311` | OpenHands returns 403 | Triggers key rotation, may fail silently | N/A |

### ⚠️ CRITICAL: Collection Migration Issue (`usersNew`)

**Phát hiện quan trọng:** Code hiện tại sử dụng collection `usersNew` thay vì `users` cũ.

**File:** `goproxy/db/mongodb.go:71-72`
```go
func UsersCollection() *mongo.Collection {
    return GetCollection("usersNew")
}
```

**Friend Key validation flow** (`friendkey.go:85`):
```go
err = db.UsersCollection().FindOne(ctx, bson.M{"_id": friendKey.OwnerID}).Decode(&owner)
```

**Potential Issues:**
1. **Owner not found in `usersNew`**: Nếu `ownerId` của Friend Key trỏ đến user tồn tại trong collection cũ (`users`) nhưng không có trong `usersNew` → Trả về `ErrFriendKeyNotFound` (401, không phải 403)

2. **Owner data mismatch**: Nếu owner tồn tại trong `usersNew` nhưng:
   - `plan` field là empty hoặc "free" → **403 "Friend Key owner must upgrade plan"**
   - `isActive` field là false → 401 "Friend Key owner account is inactive"
   - `credits` và `refCredits` đều ≤ 0 → 402 "Friend Key owner has insufficient tokens"

3. **Data schema difference**: Collection `usersNew` có thể có schema khác với collection cũ:
   - `_id` format có thể khác (username vs ObjectId)
   - `plan` field có thể không tồn tại hoặc có giá trị khác
   - `isActive` field có thể không tồn tại (default behavior khác)

**Check query để verify:**
```javascript
// Kiểm tra Friend Key và owner
db.friend_keys.findOne({_id: "<friend-key-id>"})
// Lấy ownerId từ kết quả trên

// Kiểm tra owner trong usersNew
db.usersNew.findOne({_id: "<ownerId>"})
// Kiểm tra các fields: plan, isActive, credits, refCredits
```

### Detailed Error Messages by Endpoint

**OpenAI endpoint `/v1/chat/completions`:**
- Free tier: `{"error": {"message": "Friend Key owner must upgrade plan", "type": "free_tier_restricted"}}`
- OpenHands 403: `{"error":{"message":"Access denied","type":"permission_error"}}`

**Anthropic endpoint `/v1/messages`:**
- Free tier: `{"type":"error","error":{"type":"free_tier_restricted","message":"Friend Key owner must upgrade plan"}}`
- OpenHands 403: `{"type":"error","error":{"type":"permission_error","message":"Access denied"}}`

### Authorization Flow
```
Friend Key Request
    ↓
ValidateFriendKeyBasic()
    ├─ Check key exists → 401 if not found
    ├─ Check key active → 401 if inactive
    ├─ Check owner active → 401 if inactive
    ├─ Check owner NOT free tier ← 403 POINT #1 ("Friend Key owner must upgrade plan")
    └─ Check owner has credits → 402 if no credits
    ↓
Select Upstream (OpenHands)
    ↓
Forward to OpenHands LLM Proxy (https://llm-proxy.app.all-hands.dev)
    ↓
If 403 from OpenHands:
    1. CheckAndRotateOnError() marks key as "forbidden" ← 403 POINT #2
    2. Try to rotate to backup key
    3. If retry fails or no backup → Return sanitized 403 "Access denied"
```

### OpenHands Key Rotation Logic
When OpenHands returns 403:
1. `CheckAndRotateOnError()` is called (`openhands.go:309-311`)
2. Checks for backup keys (`GetOpenHandsBackupKeyCount()`)
3. If backup exists: rotate key and log `✅ [OpenHands] Rotated: X -> Y`
4. If no backup: mark key exhausted and log `🚨 [OpenHands] No backup keys, X disabled`
5. For non-streaming: retry with new key (`main.go:1289-1318`)
6. If all retries fail: return sanitized error

### How to Debug

**Check logs for these patterns:**
```
❌ Friend Key validation failed     → Friend Key validation issue (check error type)
🚨 [OpenHands] Key X budget exceeded → OpenHands budget issue
🚫 [OpenHands] Key X error 403      → OpenHands returned 403
🚨 [OpenHands] No backup keys       → No backup keys available
⚠️ [OpenHands] Error response       → OpenHands error details (check original error in logs)
```

**Determine root cause by error message:**
- "Friend Key owner must upgrade plan" + `free_tier_restricted` → Owner needs to upgrade from free tier
- "Access denied" + `permission_error` → OpenHands issue (check OpenHands keys/budget)

## Recommended Next Steps

1. **Check goproxy logs** for specific error pattern to determine which 403 source
2. **If "Friend Key owner must upgrade plan"**:
   - Check owner's `plan` field in `usersNew` collection
   - Verify `ownerId` exists in `usersNew` (not just old `users` collection)
3. **If "Access denied"**: Check OpenHands pool status and key health
4. **Verify `usersNew` data integrity**:
   ```javascript
   // Find Friend Key
   db.friend_keys.findOne({_id: "<friend-key>"})

   // Check owner in usersNew
   db.usersNew.findOne({_id: "<ownerId>"}, {plan: 1, isActive: 1, credits: 1, refCredits: 1})

   // If plan is empty or "free" → 403 will occur
   // If owner not found → 401 will occur
   ```
5. **If collection migration issue**: Update owner's `plan` field in `usersNew` to correct value (e.g., "pro", "enterprise")
