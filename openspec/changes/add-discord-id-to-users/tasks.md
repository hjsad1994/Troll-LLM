# Tasks: Add Discord ID to Users

## Implementation Tasks

### 1. Update UserNew Model
- [ ] **File**: `backend/src/models/user-new.model.ts`
- [ ] Add `discordId?: string` to `IUserNew` interface
- [ ] Add `discordId` field to mongoose schema
- **Validation**: Field accepts 17-19 digit string (Discord User ID format)

### 2. Update Payment Service
- [ ] **File**: `backend/src/services/payment.service.ts`
- [ ] In `addCredits()` method, add `discordId` to the `findByIdAndUpdate()` call
- [ ] Only update `discordId` if payment has valid `discordId` (không xóa ID cũ)
- **Dependency**: Task 1 must complete first

### 3. Verify Webhook Functionality
- [ ] Confirm Discord webhook continues to send `discordId` correctly
- [ ] Test payment flow with and without `discordId`

## Testing Checklist
- [ ] Payment with `discordId` -> saves to `usersNew`
- [ ] Payment without `discordId` -> keeps existing `discordId` in user
- [ ] Multiple payments -> updates `discordId` if new one provided
- [ ] Discord webhook receives correct data
