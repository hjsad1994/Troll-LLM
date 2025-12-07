## 1. Backend Implementation

### 1.1 Data Model
- [ ] 1.1.1 Create `friend-key.model.ts` with IFriendKey interface and Mongoose schema
- [ ] 1.1.2 Add index on `ownerId` for fast owner lookup
- [ ] 1.1.3 Add index on `_id` (API key) for authentication

### 1.2 DTOs and Validation
- [ ] 1.2.1 Create `friend-key.dto.ts` with Zod schemas for request validation
- [ ] 1.2.2 Define `CreateFriendKeyDto`, `UpdateModelLimitsDto`, `FriendKeyResponseDto`

### 1.3 Repository Layer
- [ ] 1.3.1 Create `friend-key.repository.ts` with CRUD operations
- [ ] 1.3.2 Implement `findByApiKey()`, `findByOwnerId()`, `updateModelUsage()`

### 1.4 Service Layer
- [ ] 1.4.1 Create `friend-key.service.ts` with business logic
- [ ] 1.4.2 Implement `generateFriendKey()` - creates key with sk-trollllm-friend- prefix
- [ ] 1.4.3 Implement `rotateFriendKey()` - generates new key, invalidates old
- [ ] 1.4.4 Implement `setModelLimits()` - validates limits, updates DB
- [ ] 1.4.5 Implement `getUsageByModel()` - returns usage breakdown
- [ ] 1.4.6 Implement `checkModelLimit()` - validates if model can be used

### 1.5 Controller Layer
- [ ] 1.5.1 Create `friend-key.controller.ts` with route handlers
- [ ] 1.5.2 Implement POST /api/user/friend-key (create)
- [ ] 1.5.3 Implement GET /api/user/friend-key (get info)
- [ ] 1.5.4 Implement POST /api/user/friend-key/rotate
- [ ] 1.5.5 Implement DELETE /api/user/friend-key
- [ ] 1.5.6 Implement PUT /api/user/friend-key/limits
- [ ] 1.5.7 Implement GET /api/user/friend-key/usage

### 1.6 Routes
- [ ] 1.6.1 Create `friend-key.routes.ts` and register in main router
- [ ] 1.6.2 Add JWT auth middleware to all friend-key routes

## 2. GoProxy Modifications

### 2.1 Authentication
- [ ] 2.1.1 Modify `authenticateUser()` to detect Friend Key by prefix `sk-trollllm-friend-`
- [ ] 2.1.2 Add `findFriendKeyOwner()` function to lookup owner from Friend Key
- [ ] 2.1.3 Cache Friend Key → Owner mapping for performance

### 2.2 Model Limit Enforcement
- [ ] 2.2.1 Add `checkFriendKeyModelLimit()` before processing request
- [ ] 2.2.2 Return 402 with error type "friend_key_model_limit_exceeded" when limit hit
- [ ] 2.2.3 Include model name and limit info in error response

### 2.3 Usage Tracking
- [ ] 2.3.1 After successful request, update `FriendKey.modelLimits[model].usedUsd`
- [ ] 2.3.2 Update `FriendKey.totalUsedUsd` and `requestsCount`
- [ ] 2.3.3 Deduct credits from owner's `credits` then `refCredits`

### 2.4 RPM Enforcement
- [ ] 2.4.1 Use owner's username for rate limiting when Friend Key is used
- [ ] 2.4.2 Apply owner's plan RPM (dev=150, pro=300, pro-troll=600)

## 3. Frontend Implementation

### 3.1 Friend Key Page
- [ ] 3.1.1 Create `/dashboard/friend-key/page.tsx`
- [ ] 3.1.2 Add Friend Key section with masked key display, copy, rotate buttons
- [ ] 3.1.3 Add "Generate Friend Key" button for users without one

### 3.2 Model Limits Configuration
- [ ] 3.2.1 Create ModelLimitsTable component
- [ ] 3.2.2 Show all available models with limit input fields
- [ ] 3.2.3 Display current usage per model (e.g., $5.00 / $50.00)
- [ ] 3.2.4 Add "Save Limits" button to update all limits at once

### 3.3 Usage Monitoring
- [ ] 3.3.1 Create UsageProgressBar component for each model
- [ ] 3.3.2 Show visual progress bar with used/limit percentage
- [ ] 3.3.3 Add color coding: green (<70%), yellow (70-90%), red (>90%)

### 3.4 Activity Section
- [ ] 3.4.1 Display recent requests made with Friend Key
- [ ] 3.4.2 Show timestamp, model, tokens, cost for each request
- [ ] 3.4.3 Add pagination for request history

### 3.5 Navigation
- [ ] 3.5.1 Add "Friend Key" menu item to dashboard sidebar
- [ ] 3.5.2 Add appropriate icon (e.g., users/share icon)

## 4. API Client
- [ ] 4.1 Add friend-key API functions to frontend lib/api.ts
- [ ] 4.2 Implement `getFriendKey()`, `createFriendKey()`, `rotateFriendKey()`
- [ ] 4.3 Implement `updateFriendKeyLimits()`, `getFriendKeyUsage()`

## 5. Testing
- [ ] 5.1 Test Friend Key generation and rotation
- [ ] 5.2 Test model limit enforcement in GoProxy
- [ ] 5.3 Test credit deduction from owner's balance
- [ ] 5.4 Test RPM limits with Friend Key
- [ ] 5.5 Test frontend limit configuration and usage display

## 6. Documentation
- [ ] 6.1 Update API docs with Friend Key endpoints
- [ ] 6.2 Add Friend Key section to user guide
