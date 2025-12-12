# Tasks: Add Discord ID to Users

## Implementation Tasks

### 1. Update UserNew Model
- [x] **File**: `backend/src/models/user-new.model.ts`
- [x] Add `discordId?: string` to `IUserNew` interface
- [x] Add `discordId` field to mongoose schema
- **Validation**: Field accepts 17-19 digit string (Discord User ID format)

### 2. Update Payment Service
- [x] **File**: `backend/src/services/payment.service.ts`
- [x] In `addCredits()` method, add `discordId` to the `findByIdAndUpdate()` call
- [x] Only update `discordId` if payment has valid `discordId` (không xóa ID cũ)
- **Dependency**: Task 1 must complete first

### 3. Verify Webhook Functionality
- [x] Confirm Discord webhook continues to send `discordId` correctly
- [x] Test payment flow with and without `discordId`

## Testing Checklist
- [x] Payment with `discordId` -> saves to `usersNew`
- [x] Payment without `discordId` -> keeps existing `discordId` in user
- [x] Multiple payments -> updates `discordId` if new one provided
- [x] Discord webhook receives correct data
