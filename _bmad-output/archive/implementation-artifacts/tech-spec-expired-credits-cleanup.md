# Tech-Spec: Expired Credits Auto-Reset System

**Tạo:** 2025-12-18
**Trạng thái:** Completed

## Tổng quan

### Mô tả vấn đề

Hệ thống hiện tại **KHÔNG** tự động reset credits về 0 khi user hết hạn (`expiresAt`). Việc reset chỉ xảy ra khi:
1. User login (auth.service.ts)
2. User gọi API qua goproxy (validator.go)

**Kết quả điều tra DB (2025-12-18):**
- Collection `usersNew`: **6 users** expired với tổng **$90.37** credits chưa cleanup:
  - 18h32n: $3.74 (expired 2025-12-18T07:08)
  - saitama: $20.17 (expired 2025-12-18T11:38)
  - hieule03: $33.42 (expired 2025-12-18T08:39)
  - jeff: $17.94 (expired 2025-12-18T07:16)
  - minh1212: $4.91 (expired 2025-12-18T04:35)
  - onkey111: $10.18 (expired 2025-12-18T11:13)

**Rủi ro:**
- Không kiểm soát được số credits "ảo" trong hệ thống
- Khó audit và báo cáo chính xác
- User expired vẫn giữ credits trong DB cho đến khi login hoặc gọi API
- Không có log để hỗ trợ user khi thắc mắc

### Giải pháp

Implement hệ thống **auto-reset** expired credits với:
1. **Event-driven scheduler** - tự động trigger đúng thời điểm user hết hạn
2. **Audit logging** - lưu lịch sử reset vào MongoDB để hỗ trợ user
3. **Admin endpoint** để reset manual hoặc xem logs
4. **Fallback cleanup** khi backend restart

### Phạm vi

**Trong scope:**
- Auto-reset service chạy trong backend Node.js
- Lưu logs vào collection `creditsResetLogs`
- Admin API endpoints (stats, manual cleanup)
- Cleanup expired users khi backend start

**Ngoài scope:**
- Admin UI xem logs (chỉ query DB khi cần)
- Notification cho user trước khi expire
- Xử lý refCredits (không expire)

---

## Thiết kế Auto-Reset System

### Architecture: Event-Driven Scheduler

```
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Node.js                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  ExpirationQueue │     │  Credits Service │                  │
│  │  (setTimeout Map)│────▶│  resetCredits()  │                  │
│  └────────┬─────────┘     └────────┬─────────┘                  │
│           │                        │                             │
│           │                        ▼                             │
│           │               ┌──────────────────┐                  │
│           │               │  creditsResetLogs│                  │
│           │               │  (MongoDB)       │                  │
│           │               └──────────────────┘                  │
│           │                                                      │
│  Triggers:                                                       │
│  1. Backend start → scheduleAll()                               │
│  2. User buys credits → scheduleOne(user, expiresAt)            │
│  3. setTimeout fires → resetAndLog(user)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cách hoạt động

1. **Khi backend start:**
   - Query tất cả users có `credits > 0` và `expiresAt != null`
   - Với mỗi user: tính `timeUntilExpiry = expiresAt - now`
   - Nếu `timeUntilExpiry <= 0`: reset ngay + log
   - Nếu `timeUntilExpiry > 0`: `setTimeout(resetAndLog, timeUntilExpiry)`

2. **Khi user mua credits:**
   - Gọi `scheduleExpiration(username, expiresAt)`
   - Hủy timeout cũ nếu có
   - Tạo timeout mới cho thời điểm hết hạn

3. **Khi timeout fires:**
   - Reset credits về 0
   - Set expiresAt = null
   - Ghi log vào `creditsResetLogs`

### Schema: creditsResetLogs

```typescript
interface ICreditsResetLog {
  _id: ObjectId;
  username: string;           // User bị reset
  creditsBefore: number;      // Credits trước khi reset
  expiresAt: Date;           // Ngày hết hạn gốc
  resetAt: Date;             // Thời điểm reset
  resetBy: 'auto' | 'admin' | 'login' | 'api';  // Nguồn trigger
  note?: string;             // Ghi chú (nếu admin reset manual)
}
```

**Indexes:**
- `{ username: 1, resetAt: -1 }` - query theo user
- `{ resetAt: -1 }` - query gần đây nhất

---

## Context cho Development

### Codebase Patterns

**Repository pattern:**
- `backend/src/repositories/user-new.repository.ts` - có sẵn `resetExpiredCredits()`

**Existing reset logic:**
```typescript
// backend/src/repositories/user-new.repository.ts
async resetExpiredCredits(username: string): Promise<IUserNew | null> {
    return UserNew.findByIdAndUpdate(username, {
        credits: 0,
        purchasedAt: null,
        expiresAt: null,
    });
}
```

### Files cần tham khảo

| File | Mục đích |
|------|----------|
| `backend/src/repositories/user-new.repository.ts` | Reset logic |
| `backend/src/services/payment.service.ts` | Nơi set expiresAt khi mua credits |
| `backend/src/routes/admin.ts` | Admin routes pattern |
| `backend/src/index.ts` hoặc `app.ts` | Entry point để init scheduler |

### Quyết định kỹ thuật

1. **Collection:** Chỉ `usersNew` (collection `users` là legacy)
2. **Logs collection:** `creditsResetLogs`
3. **Scheduler:** In-memory Map<username, NodeJS.Timeout>
4. **expiresAt: null:** Không schedule (đã expired hoặc không có credits)

---

## Kế hoạch Implementation

### Tasks

- [ ] **Task 1:** Tạo model `CreditsResetLog` và repository
  - File: `backend/src/models/credits-reset-log.model.ts`
  - File: `backend/src/repositories/credits-reset-log.repository.ts`

- [ ] **Task 2:** Tạo service `ExpirationSchedulerService`
  - File: `backend/src/services/expiration-scheduler.service.ts`
  - Methods:
    - `init()` - khởi tạo khi backend start
    - `scheduleExpiration(username, expiresAt)` - schedule cho 1 user
    - `cancelExpiration(username)` - hủy schedule
    - `resetAndLog(username, triggeredBy)` - reset + ghi log

- [ ] **Task 3:** Update `resetExpiredCredits()` để ghi log
  - Sửa `user-new.repository.ts`
  - Thêm parameter `triggeredBy: 'auto' | 'admin' | 'login' | 'api'`

- [ ] **Task 4:** Tích hợp scheduler vào payment flow
  - Khi user mua credits thành công → `scheduleExpiration()`
  - File: `backend/src/services/payment.service.ts`

- [ ] **Task 5:** Init scheduler khi backend start
  - File: `backend/src/index.ts`
  - Gọi `ExpirationSchedulerService.init()` sau khi connect DB

- [ ] **Task 6:** Thêm admin endpoint `GET /api/admin/expired-credits-stats`
  - Response: `{ count, totalCredits, users[] }`

- [ ] **Task 7:** Thêm admin endpoint `POST /api/admin/cleanup-expired-credits`
  - Body: `{ dryRun?: boolean }`
  - Reset manual + ghi log với `resetBy: 'admin'`

- [ ] **Task 8:** Thêm admin endpoint `GET /api/admin/credits-reset-logs`
  - Query params: `{ username?, limit?, offset? }`
  - Để tra cứu khi user thắc mắc

### Acceptance Criteria

- [ ] **AC 1:** Khi backend start, tất cả users expired được reset ngay và ghi log
- [ ] **AC 2:** Khi backend start, users chưa expired được schedule timeout đúng thời điểm
- [ ] **AC 3:** Khi user mua credits, timeout được schedule cho `expiresAt`
- [ ] **AC 4:** Khi timeout fires, credits reset về 0 và log được ghi vào `creditsResetLogs`
- [ ] **AC 5:** Log chứa đầy đủ: username, creditsBefore, expiresAt, resetAt, resetBy
- [ ] **AC 6:** Admin có thể query logs theo username để hỗ trợ user

---

## Additional Context

### Dependencies

- Không có dependency mới
- Sử dụng native `setTimeout` của Node.js
- MongoDB driver có sẵn

### Edge Cases

1. **Backend restart:** Init lại tất cả schedules từ DB
2. **User mua thêm credits:** Cancel timeout cũ, schedule timeout mới
3. **Timeout > 24 ngày:** setTimeout có giới hạn ~24.8 ngày (2^31 ms). Nếu expiresAt xa hơn, cần reschedule định kỳ
4. **Multiple backend instances:** Cần distributed lock hoặc chỉ chạy scheduler trên 1 instance

### Testing Strategy

1. **Unit test:**
   - `ExpirationSchedulerService` với mock timers
   - `CreditsResetLogRepository` với test DB

2. **Manual test:**
   - Tạo user với expiresAt = now + 1 minute
   - Verify auto reset sau 1 phút
   - Check log trong `creditsResetLogs`

### Notes

**Dữ liệu hiện tại cần cleanup (2025-12-18):**
```
Collection usersNew: 6 users với $90.37 credits
- 18h32n: $3.74
- saitama: $20.17
- hieule03: $33.42
- jeff: $17.94
- minh1212: $4.91
- onkey111: $10.18
```

**Logic expiresAt:**
- `null` → không schedule (đã expired hoặc chưa mua)
- `< now` → reset ngay khi backend start
- `>= now` → schedule timeout

**Lưu ý về scale:**
- Với ~200 users, in-memory Map là đủ
- Nếu scale lên 10k+ users, consider dùng job queue (Bull, Agenda)
