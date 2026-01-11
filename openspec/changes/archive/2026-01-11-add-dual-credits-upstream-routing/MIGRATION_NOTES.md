# Migration Notes: Dual Credits System

## Overview
This change introduces separate credit balances for OpenHands and OhMyGPT upstreams. **No migration script is required** as this is a backward-compatible additive change.

## What Changed

### Database Schema (usersNew collection)
Two new fields added:
- `creditsNew` (Number, default: 0) - OpenHands balance
- `tokensUserNew` (Number, default: 0) - OpenHands usage tracking

Existing fields remain unchanged:
- `credits` - OhMyGPT balance (existing)
- `creditsUsed` - OhMyGPT usage (existing)

### Payment Behavior
**NEW**: All payment credits now go to `creditsNew` (OpenHands) instead of `credits`.

### Billing Behavior
**NEW**: Requests are billed from different balances:
- OpenHands (port 8004) → deducts from `creditsNew`
- OhMyGPT (port 8005) → deducts from `credits`

## Impact on Existing Users

### For Users with Existing Credits
Users who have existing `credits` balance before this change:
1. ✅ **Can still use OhMyGPT** - existing `credits` balance works for OhMyGPT (port 8005)
2. ❌ **Cannot use OpenHands** - `creditsNew` defaults to 0, must purchase new credits
3. 💡 **Next payment** - goes to `creditsNew` for OpenHands use

### For New Users
New users starting after this change:
1. Purchase credits → goes to `creditsNew`
2. Can use OpenHands (port 8004) immediately
3. Cannot use OhMyGPT (port 8005) until they have `credits` balance

## Migration Strategy

### Option 1: No Action Required (Recommended)
**Best for**: Most users who primarily use one upstream

**What happens**:
- Existing credits work for OhMyGPT
- New purchases work for OpenHands
- Users naturally transition over time

### Option 2: Manual Credit Transfer (Future Enhancement)
**Status**: Not implemented in this change

**Potential feature**:
- Admin tool to transfer credits between fields
- Self-service UI for users to allocate credits
- This can be added later if needed

## Database Migration

**Migration Script**: ❌ Not required

**Reason**:
- New fields have default values (0)
- MongoDB automatically adds fields on first write
- No existing data needs modification
- Backward compatible

## Rollback Procedure

If rollback is needed:

### 1. Backend Rollback
```bash
cd backend
git revert <commit-hash>
npm run build
pm2 restart backend
```

### 2. GoProxy Rollback
```bash
cd goproxy
git revert <commit-hash>
go build -o goproxy.exe
# Restart goproxy service
```

### 3. Data Cleanup (Optional)
If you want to remove the new fields:
```javascript
// MongoDB shell
db.usersNew.updateMany(
  {},
  { $unset: { creditsNew: "", tokensUserNew: "" } }
)
```

**Note**: Rolling back does NOT restore credits that were added to `creditsNew`. Those credits will be inaccessible until the system is re-deployed.

## Testing Recommendations

### Before Deploy
1. ✅ Test payment flow in staging
2. ✅ Verify credits go to `creditsNew`
3. ✅ Test OpenHands request billing
4. ✅ Test OhMyGPT request billing

### After Deploy
1. Monitor error logs for insufficient credits errors
2. Check payment webhooks are working
3. Verify billing deductions from correct fields
4. Monitor user complaints about balance issues

## Support FAQ

**Q: Why is my OpenHands balance $0 after this update?**
A: OpenHands now uses a separate `creditsNew` balance. Your existing credits are still available for OhMyGPT. Purchase new credits to use OpenHands.

**Q: Can I transfer my existing credits to OpenHands?**
A: Not currently. This feature may be added in the future. For now, you can continue using OhMyGPT with existing credits or purchase new credits for OpenHands.

**Q: Will my credits expire?**
A: Yes, both `credits` and `creditsNew` share the same expiration date (7 days from purchase).

**Q: What happens if I run out of credits for one service?**
A: Each service has its own balance. If you run out of `creditsNew`, you cannot use OpenHands even if you have `credits` balance for OhMyGPT.

## Related Documentation
- See `DUAL_CREDITS_VERIFICATION.md` for technical implementation details
- See `design.md` for architectural decisions
- See `openspec/specs/billing/spec.md` for updated requirements
