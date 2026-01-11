# Tasks for add-creditsnew-admin-management

## Backend Implementation

- [x] **Extend user repository with creditsNew methods**
  - Add `setCreditsNew(username, creditsNew, resetExpiration)` method to `userRepository`
  - Add `addCreditsNew(username, amount, resetExpiration)` method to `userRepository`
  - Both methods should handle expiration reset logic (7-day validity)
  - Return updated user document

- [x] **Add PATCH /admin/users/:username/creditsNew endpoint**
  - Add route handler in `backend/src/routes/admin.routes.ts`
  - Apply `requireAdmin` middleware
  - Validate request body: `creditsNew` must be non-negative number
  - Default `resetExpiration` to true if not provided
  - Call `userRepository.setCreditsNew()`
  - Return success response with updated user state
  - Handle errors (400 for validation, 404 for user not found)

- [x] **Add POST /admin/users/:username/creditsNew/add endpoint**
  - Add route handler in `backend/src/routes/admin.routes.ts`
  - Apply `requireAdmin` middleware
  - Validate request body: `amount` must be positive number
  - Default `resetExpiration` to true if not provided
  - Call `userRepository.addCreditsNew()`
  - Return success response with updated user state
  - Handle errors (400 for validation, 404 for user not found)

## Testing

- [x] **Manual API testing with curl or Postman**
  - Test set creditsNew with valid input
  - Test add creditsNew with valid input
  - Test validation errors (negative values, non-numbers)
  - Test user not found error
  - Test unauthorized access (non-admin)
  - Verify expiration reset behavior (with and without flag)

- [x] **Verify database state changes**
  - Confirm `creditsNew` field updates correctly
  - Confirm `expiresAt` field updates when `resetExpiration: true`
  - Confirm `expiresAt` field unchanged when `resetExpiration: false`
  - Verify `purchasedAt` field updates with expiration reset

## Documentation

- [x] **Update admin API documentation (if exists)**
  - Document new endpoints with request/response examples
  - Include validation rules and error responses
  - Add usage examples for common scenarios

## Validation

- [x] **Run OpenSpec validation**
  - Execute `openspec validate add-creditsnew-admin-management --strict`
  - Resolve any validation errors

- [x] **Code review checklist**
  - Verify implementation matches existing `credits` endpoint patterns
  - Confirm error handling is consistent
  - Check authorization middleware is applied
  - Validate expiration calculation matches `VALIDITY_DAYS` constant
