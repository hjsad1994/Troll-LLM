# Tasks: Copy User Document to UserNew

## Implementation Tasks

- [x] **1. Create UserNew model** (`backend/src/models/user-new.model.ts`)
  - Copy `IUser` interface as `IUserNew`
  - Copy `userSchema` as `userNewSchema`
  - Create `UserNew` mongoose model pointing to `usersNew` collection
  - Re-export helper functions from user.model.ts (avoid duplication)

- [x] **2. Create UserNew repository** (`backend/src/repositories/user-new.repository.ts`)
  - Copy structure from `user.repository.ts`
  - Update to use `UserNew` model

- [x] **3. Create UserNew service** (`backend/src/services/user-new.service.ts`)
  - Copy structure from `user.service.ts`
  - Update to use `UserNewRepository`

- [x] **4. Create migration script** (`backend/src/scripts/migrate-users-to-usernew.ts`)
  - Connect to MongoDB
  - Read all documents from `users` collection
  - Insert all documents into `usersNew` collection
  - Log migration progress and results
  - Handle errors gracefully

- [ ] **5. Test migration**
  - Run migration script
  - Verify data in `usersNew` collection matches `users`
  - Check document count matches

## Validation
- `usersNew` collection exists with correct schema
- All documents from `users` are copied to `usersNew`
- No data loss during migration
