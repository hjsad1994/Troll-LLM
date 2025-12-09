# Proposal: Copy User Document to UserNew

## Summary
Create a new MongoDB document `UserNew` with identical schema to `User` and migrate all existing user data from `users` collection to `usersNew` collection.

## Motivation
Data migration requirement to copy User document structure and data to a new UserNew collection.

## Scope
- **Backend**: Create `UserNew` model with same schema as `User`
- **Backend**: Create repository and service for `UserNew`
- **Backend**: Create migration script to copy data from `users` to `usersNew`

## Approach
1. Create new `user-new.model.ts` with identical schema to `user.model.ts`
2. Create corresponding repository and service files
3. Create migration script to copy all documents from `users` to `usersNew`
4. Export helper functions (hashPassword, verifyPassword, etc.) from shared location to avoid duplication

## Out of Scope
- Changes to existing User model/collection
- Changes to authentication flow
- Frontend changes

## Risks
- Data consistency during migration
- Duplicate helper functions if not properly refactored

## Dependencies
- MongoDB connection
- Existing User model structure
