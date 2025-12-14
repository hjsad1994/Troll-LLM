# Testing Strategy for TrollLLM

Current State: No automated testing infrastructure detected in Backend, Frontend, or Go Proxy.

## 1. Backend Testing (Node.js/Express)
**Tooling:** Jest, Supertest, ts-jest
**Scope:**
- **Unit Tests:** Service layer logic (e.g., `payment.service.ts`, `auth.service.ts`).
- **Integration Tests:** API endpoints using Supertest to verify routes (e.g., `/api/auth/login`).
- **Database:** Use a separate MongoDB test database or `mongodb-memory-server` to avoid polluting development data.

## 2. Frontend Testing (Next.js)
**Tooling:** Jest, React Testing Library
**Scope:**
- **Component Tests:** Verify critical UI components render and behave correctly (e.g., `LoginForm`, `PaymentModal`).
- **Snapshot Tests:** Ensure UI does not regress unexpectedly.

**Optional (E2E):** Playwright or Cypress for end-to-end flows (Login -> Dashboard -> Generate Key).

## 3. Go Proxy Testing (Go)
**Tooling:** Standard Go `testing` package
**Scope:**
- **Unit Tests:** `internal/` packages (e.g., `keypool`, `ratelimit`).
- **Benchmarks:** Measure performance of the proxy handling request throughput.

## Proposed Implementation Plan

### Phase 1: Backend Infrastructure
- [ ] Install `jest`, `ts-jest`, `@types/jest`, `supertest`.
- [ ] Configure `jest.config.js`.
- [ ] Create `backend/src/__tests__` directory.
- [ ] Write smoke test for health check endpoint.

### Phase 2: Frontend Infrastructure
- [ ] Install `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`.
- [ ] Configure `jest.config.js` and `next.config.js` (if needed).
- [ ] Create basic render test for the Landing Page.

### Phase 3: Go Proxy Infrastructure
- [ ] Create `_test.go` files for core logic in `internal/keypool` and `internal/proxy`.
- [ ] Run `go test ./...` to verify.