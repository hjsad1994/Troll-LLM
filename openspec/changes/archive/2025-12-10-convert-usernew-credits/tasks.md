# Tasks: Convert UserNew Credits to New System

## Implementation Tasks

- [x] **1. Create credits conversion script** (`backend/src/scripts/convert-usernew-credits.ts`)
  - Connect to MongoDB
  - Fetch all users from `usersNew` collection
  - Apply conversion formula: `((credits + refCredits) * 144) / 1000`
  - Round up to nearest 0.5
  - Set expiresAt based on new balance (< $50 = 1 week, >= $50 = 2 weeks)
  - Set refCredits to 0 after merge
  - Update purchasedAt to now
  - Log conversion details for each user
  - Handle errors gracefully

- [ ] **2. Test conversion script**
  - Run script on usersNew collection
  - Verify conversion calculations are correct
  - Verify expiresAt is set correctly based on balance threshold

## Validation
- All users in `usersNew` have converted credits
- refCredits is 0 for all users
- expiresAt is set correctly (1 week if < $50, 2 weeks if >= $50)
- No data corruption or loss
