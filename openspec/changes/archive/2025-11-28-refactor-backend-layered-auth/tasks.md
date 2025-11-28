# Tasks: Refactor Backend to Layered Architecture with JWT Authentication

## 1. Backend Directory Structure Setup
- [x] 1.1 Create `backend/src/controllers/` directory
- [x] 1.2 Create `backend/src/repositories/` directory
- [x] 1.3 Create `backend/src/dtos/` directory
- [x] 1.4 Create `backend/src/models/` directory
- [x] 1.5 Move Mongoose schemas from `db/mongodb.ts` to `models/`

## 2. Models Layer
- [x] 2.1 Create `models/user.model.ts` - User schema with roles
- [x] 2.2 Create `models/user-key.model.ts` - UserKey schema
- [x] 2.3 Create `models/factory-key.model.ts` - FactoryKey schema
- [x] 2.4 Create `models/request-log.model.ts` - RequestLog schema
- [x] 2.5 Create `models/proxy.model.ts` - Proxy schema
- [x] 2.6 Create `models/index.ts` - Export all models

## 3. DTOs Layer
- [x] 3.1 Create `dtos/auth.dto.ts` - LoginDTO, RegisterDTO, AuthResponseDTO
- [x] 3.2 Create `dtos/user-key.dto.ts` - CreateKeyDTO, UpdateKeyDTO, KeyResponseDTO
- [x] 3.3 Create `dtos/factory-key.dto.ts` - FactoryKey DTOs
- [x] 3.4 Create `dtos/index.ts` - Export all DTOs

## 4. Repositories Layer
- [x] 4.1 Create `repositories/user.repository.ts` - User CRUD operations
- [x] 4.2 Create `repositories/user-key.repository.ts` - UserKey CRUD operations
- [x] 4.3 Create `repositories/factory-key.repository.ts` - FactoryKey operations
- [x] 4.4 Create `repositories/request-log.repository.ts` - RequestLog operations
- [x] 4.5 Create `repositories/index.ts` - Export all repositories

## 5. Services Layer Refactor
- [x] 5.1 Create `services/auth.service.ts` - Register, Login, JWT generation
- [x] 5.2 Refactor `services/userkey.service.ts` - Use repository
- [x] 5.3 Refactor `services/factorykey.service.ts` - Use repository
- [x] 5.4 Refactor `services/metrics.service.ts` - Use repository

## 6. Controllers Layer
- [x] 6.1 Create `controllers/auth.controller.ts` - Login, Register endpoints
- [x] 6.2 Create `controllers/user-key.controller.ts` - Key management
- [x] 6.3 Create `controllers/factory-key.controller.ts` - Factory key management
- [x] 6.4 Create `controllers/metrics.controller.ts` - Metrics endpoints

## 7. Middleware Refactor
- [x] 7.1 Refactor `middleware/auth.middleware.ts` - JWT verification with roles
- [x] 7.2 Create `middleware/role.middleware.ts` - Role-based authorization

## 8. Routes Refactor
- [x] 8.1 Create `routes/auth.routes.ts` - Auth routes with controller
- [x] 8.2 Create `routes/admin.routes.ts` - Admin routes with controllers
- [x] 8.3 Update `index.ts` - Wire up new routes

## 9. Frontend Auth Pages
- [x] 9.1 Create `frontend/src/app/login/page.tsx` - Login page
- [x] 9.2 Create `frontend/src/app/register/page.tsx` - Register page
- [x] 9.3 Update `components/AuthProvider.tsx` - Handle JWT and roles
- [x] 9.4 Update `components/LoginForm.tsx` - Redirect to login page
- [x] 9.5 Update `lib/api.ts` - Handle JWT

## 10. Testing & Validation
- [x] 10.1 Build backend - PASSED
- [x] 10.2 Build frontend - PASSED
