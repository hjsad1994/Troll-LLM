# Change: Refactor Backend to Layered Architecture with JWT Authentication

## Why
Backend hien tai co cau truc don gian (routes + services + middleware) nhung chua tuan theo layered architecture chuan. Can refactor de:
- Tang tinh bao tri va mo rong
- Tach biet ro rang cac concerns (Controller, Service, Repository, DTO, Model)
- Implement JWT authentication day du cho Register va Login
- Ho tro roles (admin, user) voi phan quyen ro rang

## What Changes

### Backend Architecture Refactor
- **Controllers**: Xu ly HTTP request/response, validation input
- **Services**: Business logic, khong phu thuoc HTTP
- **Repositories**: Data access layer, tuong tac voi MongoDB
- **DTOs**: Data Transfer Objects cho request/response
- **Models**: Mongoose schemas va interfaces

### Authentication Features
- **Register**: Endpoint dang ky user moi voi JWT token
- **Login**: Endpoint dang nhap tra ve JWT token
- **JWT Middleware**: Xac thuc va phan quyen theo role
- **Roles**: `admin` (full access) va `user` (limited access)

### Frontend Updates
- **Login Page**: Giao dien dang nhap
- **Register Page**: Giao dien dang ky
- **Auth Context**: Quan ly state authentication
- **Protected Routes**: Chi cho phep truy cap khi da dang nhap

## Impact
- Affected specs: api-proxy
- Affected code:
  - `backend/src/controllers/` - NEW: Auth, Keys, FactoryKeys, Proxy controllers
  - `backend/src/services/` - REFACTOR: Auth, User services
  - `backend/src/repositories/` - NEW: User, Keys repositories
  - `backend/src/dtos/` - NEW: Request/Response DTOs
  - `backend/src/models/` - REFACTOR: Mongoose models
  - `backend/src/middleware/` - REFACTOR: JWT auth middleware
  - `frontend/src/app/login/` - NEW: Login page
  - `frontend/src/app/register/` - NEW: Register page
  - `frontend/src/components/AuthProvider.tsx` - UPDATE: JWT handling
