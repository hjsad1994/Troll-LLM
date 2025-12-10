# Tasks: migrate-credits-to-usersnew

## Implementation Tasks

- [x] **Task 1**: Update `UsersCollection()` in goproxy
  - File: `goproxy/db/mongodb.go`
  - Change: `return GetCollection("users")` → `return GetCollection("usersNew")`
  - Verification: Inspect code change

- [x] **Task 2**: Build goproxy
  - Run `go build` to create new binary

## Verification Checklist
- [x] Code change applied correctly
- [x] Build successful
- [ ] API key authentication still works (pending deployment)
- [ ] Credits deduction from correct collection (pending deployment)
- [ ] Dashboard shows accurate credits balance (pending deployment)
- [ ] Referral credits (refCredits) work correctly (pending deployment)
- [ ] Token analytics (totalInputTokens, totalOutputTokens) recorded correctly (pending deployment)
