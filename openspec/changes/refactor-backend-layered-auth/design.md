# Design: Refactor Backend to Layered Architecture

## Context
Backend hien tai su dung cau truc don gian voi routes goi truc tiep services. Can chuyen sang layered architecture de tang kha nang bao tri va mo rong.

## Goals
- Tach biet concerns theo layers (Controller, Service, Repository, DTO, Model)
- Implement JWT authentication voi refresh token support
- Phan quyen theo role (admin, user)
- Giu backward compatibility voi API hien tai

## Non-Goals
- Khong thay doi GoProxy
- Khong thay doi database schema (chi refactor code)
- Khong implement OAuth/Social login

## Decisions

### 1. Directory Structure
```
backend/src/
├── controllers/      # HTTP handlers, input validation
├── services/         # Business logic
├── repositories/     # Data access layer
├── dtos/            # Request/Response DTOs with Zod
├── models/          # Mongoose schemas
├── middleware/      # Auth, validation middleware
├── routes/          # Express route definitions
├── db/              # Database connection
└── index.ts         # App entry point
```

**Rationale**: Standard layered architecture, clear separation of concerns.

### 2. JWT Configuration
```typescript
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || process.env.ADMIN_SECRET_KEY,
  accessTokenExpiry: '24h',
  algorithm: 'HS256'
}
```

**Rationale**: HS256 la du bao mat cho internal API. 24h expiry can bang giua UX va security.

### 3. Role-Based Access Control
```typescript
enum Role {
  ADMIN = 'admin',  // Full access to all endpoints
  USER = 'user'     // Read-only access, limited operations
}

// Permission matrix
const PERMISSIONS = {
  'admin': ['*'],
  'user': ['read:keys', 'read:usage', 'read:status']
}
```

**Rationale**: Simple role-based system, de mo rong them roles sau.

### 4. DTO Pattern with Zod
```typescript
// dtos/auth.dto.ts
export const LoginDTO = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

export const RegisterDTO = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']).default('user')
});

export type LoginInput = z.infer<typeof LoginDTO>;
export type RegisterInput = z.infer<typeof RegisterDTO>;
```

**Rationale**: Zod da duoc su dung trong project, validation tai controller layer.

### 5. Repository Pattern
```typescript
// repositories/user.repository.ts
export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }
  
  async create(data: CreateUserData): Promise<IUser> {
    return User.create(data);
  }
  
  async updateLastLogin(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { lastLoginAt: new Date() });
  }
}
```

**Rationale**: Abstract database operations, de test va thay doi data source.

### 6. Controller Pattern
```typescript
// controllers/auth.controller.ts
export class AuthController {
  constructor(private authService: AuthService) {}
  
  async login(req: Request, res: Response): Promise<void> {
    const input = LoginDTO.parse(req.body);
    const result = await this.authService.login(input);
    res.json(result);
  }
  
  async register(req: Request, res: Response): Promise<void> {
    const input = RegisterDTO.parse(req.body);
    const result = await this.authService.register(input);
    res.status(201).json(result);
  }
}
```

**Rationale**: Controllers chi xu ly HTTP concerns, delegate business logic cho services.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing API | Giu nguyen route paths, chi thay doi internal structure |
| Complex dependency injection | Su dung simple factory pattern, khong can DI container |
| Migration effort | Refactor tung layer mot, test ky truoc khi merge |

## Migration Plan

1. **Phase 1**: Tao structure moi (models, dtos, repositories)
2. **Phase 2**: Refactor services de su dung repositories
3. **Phase 3**: Tao controllers va wire up routes
4. **Phase 4**: Update frontend auth
5. **Phase 5**: Test end-to-end

## Open Questions
- Co can implement refresh token khong? (Hien tai: No, 24h access token la du)
- Co can rate limiting cho auth endpoints? (Hien tai: Co san trong middleware)
