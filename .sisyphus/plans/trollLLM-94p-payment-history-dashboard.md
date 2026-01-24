# Plan: Epic trollLLM-94p - User Payment History Dashboard

## Overview

Xây dựng trang Payment History cho user, hiển thị thống kê thanh toán và lịch sử giao dịch với pagination + filters.

## Dependencies & Prerequisites

- Epic này bao gồm 2 sub-epics:
  - **trollLLM-dh2**: Backend API - Payment Stats & History
  - **trollLLM-9q4**: Frontend UI - Payment History Page
- Database: payments collection đã tồn tại với schema `IPayment`

## Task Execution Order

```
Phase 1 (Backend): trollLLM-0hk + trollLLM-rb0 (parallel)
    ↓
Phase 2 (Backend): trollLLM-c0j → trollLLM-5gd (sequential)
    ↓
Phase 3 (Frontend): trollLLM-1ca
    ↓
Phase 4 (Frontend): trollLLM-5p5 + trollLLM-9ez + trollLLM-cf1 + trollLLM-z89 (parallel)
    ↓
Phase 5: trollLLM-mke → trollLLM-6ed (translations then testing)
```

---

## Phase 1: Backend Repository Layer

### Task 1.1: trollLLM-0hk - Add findByUserIdPaginated() 
**File**: `backend/src/repositories/payment.repository.ts`
**Priority**: P1

**Implementation**:
```typescript
async findByUserIdPaginated(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    from?: Date;
    to?: Date;
  } = {}
): Promise<{ payments: IPayment[]; total: number; page: number; totalPages: number }> {
  const { page = 1, limit = 20, status, from, to } = options;
  const skip = (page - 1) * limit;

  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Pattern Reference**: Dựa trên `getAllPayments()` đã có ở dòng 87-142 trong file.

**Acceptance Criteria**:
- [x] Pagination hoạt động (skip, limit)
- [x] Filters có thể kết hợp (status + date range)
- [x] Sort by createdAt descending
- [x] Empty results trả về array rỗng với metadata đúng

---

### Task 1.2: trollLLM-rb0 - Add getUserPaymentStats()
**File**: `backend/src/repositories/payment.repository.ts`
**Priority**: P1

**Implementation**:
```typescript
async getUserPaymentStats(userId: string): Promise<{
  totalCredits: number;
  totalVND: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  totalOrders: number;
}> {
  const [stats] = await Payment.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalCredits: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$credits', 0] }
        },
        totalVND: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] }
        },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $in: ['$status', ['failed', 'expired']] }, 1, 0] }
        },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  return stats || {
    totalCredits: 0,
    totalVND: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    totalOrders: 0,
  };
}
```

**Pattern Reference**: Dựa trên `getPaymentStats()` đã có ở dòng 144-196.

**Acceptance Criteria**:
- [x] Method trả về stats đúng cho userId
- [x] Returns zeros cho users không có payments
- [x] Aggregation hiệu quả (single query)

---

## Phase 2: Backend Service & Routes Layer

### Task 2.1: trollLLM-c0j - Add payment service methods
**File**: `backend/src/services/payment.service.ts`
**Priority**: P1

**Implementation**:
```typescript
// Thêm vào PaymentService class

async getUserPaymentStats(userId: string) {
  return paymentRepository.getUserPaymentStats(userId);
}

async getPaymentHistoryPaginated(
  userId: string,
  options: {
    page?: string | number;
    limit?: string | number;
    status?: string;
    from?: string;
    to?: string;
  }
) {
  // Parse options
  const parsedOptions = {
    page: typeof options.page === 'string' ? parseInt(options.page, 10) || 1 : options.page || 1,
    limit: typeof options.limit === 'string' ? parseInt(options.limit, 10) || 20 : options.limit || 20,
    status: ['pending', 'success', 'failed', 'expired'].includes(options.status || '') 
      ? options.status as PaymentStatus 
      : undefined,
    from: options.from ? new Date(options.from) : undefined,
    to: options.to ? new Date(options.to) : undefined,
  };

  return paymentRepository.findByUserIdPaginated(userId, parsedOptions);
}
```

**Acceptance Criteria**:
- [x] Service methods delegate đúng tới repository
- [x] Input validation/parsing hoạt động

---

### Task 2.2: trollLLM-5gd - Add API routes
**File**: `backend/src/routes/payment.routes.ts`
**Priority**: P1

**Implementation** (thêm vào cuối file, trước `export default router`):
```typescript
// GET /api/payment/user-stats - Get user's payment statistics
router.get('/user-stats', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await paymentService.getUserPaymentStats(username);
    res.json(stats);
  } catch (error: any) {
    console.error('[Payment User Stats Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payment/history-paginated - Get paginated payment history with filters
router.get('/history-paginated', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page, limit, status, from, to } = req.query;
    const result = await paymentService.getPaymentHistoryPaginated(username, {
      page: page as string,
      limit: limit as string,
      status: status as string,
      from: from as string,
      to: to as string,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Payment History Paginated Error]', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Acceptance Criteria**:
- [x] Cả 2 endpoints yêu cầu authentication (jwtAuth)
- [x] Unauthorized trả về 401
- [x] Errors trả về 500 với message
- [x] Query params được parse đúng

---

## Phase 3: Frontend API Layer

### Task 3.1: trollLLM-1ca - Add frontend API types and functions
**File**: `frontend/src/lib/api.ts`
**Priority**: P1

**Implementation** (thêm vào cuối file):
```typescript
// Payment Stats
export interface PaymentStats {
  totalCredits: number
  totalVND: number
  successCount: number
  pendingCount: number
  failedCount: number
  totalOrders: number
}

export interface PaymentHistoryPaginatedResponse {
  payments: PaymentHistoryItem[]
  total: number
  page: number
  totalPages: number
}

export async function getUserPaymentStats(): Promise<PaymentStats> {
  const resp = await fetchWithAuth('/api/payment/user-stats')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get payment stats')
  }
  return resp.json()
}

export async function getPaymentHistoryPaginated(params?: {
  page?: number
  limit?: number
  status?: string
  from?: string
  to?: string
}): Promise<PaymentHistoryPaginatedResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.status) searchParams.set('status', params.status)
  if (params?.from) searchParams.set('from', params.from)
  if (params?.to) searchParams.set('to', params.to)

  const url = `/api/payment/history-paginated${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  const resp = await fetchWithAuth(url)
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get payment history')
  }
  return resp.json()
}
```

**Pattern Reference**: Dựa trên `getRequestHistory()` ở dòng 539-558 trong api.ts.

**Acceptance Criteria**:
- [x] Types khớp với backend response format
- [x] Functions xử lý errors đúng cách
- [x] Query params được build đúng

---

## Phase 4: Frontend UI Components

### Task 4.1: trollLLM-5p5 - Add payments navigation to Sidebar
**File**: `frontend/src/components/Sidebar.tsx`
**Priority**: P2

**Implementation**: Thêm nav item vào `userNavItems` array (sau dashboard, trước models):
```typescript
// Thêm vào userNavItems array, sau dashboard item (dòng ~150)
{
  href: '/payments',
  labelKey: 'payments',
  icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
},
```

**Acceptance Criteria**:
- [x] Nav item xuất hiện cho regular users
- [x] Nav item xuất hiện cho admin users (trong adminNavItems)
- [x] Active state highlight đúng khi ở /payments
- [x] Icon phù hợp (credit card)

---

### Task 4.2: trollLLM-9ez - Create Payment History page - Stats Cards
**File**: `frontend/src/app/(dashboard)/payments/page.tsx` (new file)
**Priority**: P1

**Implementation Structure**:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import { getUserPaymentStats, getPaymentHistoryPaginated, PaymentStats, PaymentHistoryPaginatedResponse } from '@/lib/api'

export default function PaymentsPage() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [history, setHistory] = useState<PaymentHistoryPaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const { t } = useLanguage()

  // Stats Cards - 4 cards in responsive grid
  // Grid: 1 col mobile, 2 col tablet, 4 col desktop
  // Cards: Total Credits ($), Total VND, Success Orders, Pending Orders
  // Styling: Match dashboard cards (borders, colors, hover effects)
  
  return (
    <div className="min-h-screen px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">
            {t.payments?.title || 'Payment History'}
          </h1>
          <p className="text-[var(--theme-text-subtle)] text-sm">
            {t.payments?.subtitle || 'View your payment statistics and transaction history'}
          </p>
        </header>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Credits */}
          {/* Card 2: Total VND */}
          {/* Card 3: Success Orders */}
          {/* Card 4: Pending Orders */}
        </div>

        {/* Filters Section */}
        {/* Table with Pagination */}
      </div>
    </div>
  )
}
```

**Styling Pattern Reference**: Dashboard page stats cards pattern từ `dashboard/page.tsx`

**Acceptance Criteria**:
- [x] Stats load và hiển thị đúng
- [x] Loading skeleton khi fetching
- [x] Numbers formatted đúng (VND với separators, USD với $)
- [x] Responsive layout hoạt động

---

### Task 4.3: trollLLM-cf1 - Create Payment History page - Table with Pagination
**Same File**: `frontend/src/app/(dashboard)/payments/page.tsx`
**Priority**: P1

**Table Columns**:
| Column | Field | Format |
|--------|-------|--------|
| Order Code | orderCode | Truncated, full on hover |
| Credits | credits | $XX |
| Amount (VND) | amount | XX,XXX VND |
| Status | status | Badge (green/yellow/red) |
| Created | createdAt | DD/MM/YYYY HH:mm |
| Completed | completedAt | DD/MM/YYYY HH:mm or "-" |

**Status Badge Colors**:
- `success` → green (bg-emerald-500/10 text-emerald-500)
- `pending` → yellow (bg-amber-500/10 text-amber-500)
- `failed`/`expired` → red (bg-red-500/10 text-red-500)

**Pagination**:
- Show: "Page X of Y"
- Previous/Next buttons
- Disabled states khi ở first/last page

**States**:
- Loading skeleton
- Empty state với message
- Error state

**Acceptance Criteria**:
- [x] Table hiển thị data đúng
- [x] Pagination navigation hoạt động
- [x] Loading/empty/error states hoạt động
- [x] Mobile: horizontal scroll cho table

---

### Task 4.4: trollLLM-z89 - Create Payment History page - Filters
**Same File**: `frontend/src/app/(dashboard)/payments/page.tsx`
**Priority**: P1

**Filters**:
1. **Status Dropdown**: All | Success | Pending | Failed
2. **Date Range**: From date input, To date input
3. **Clear Button**: Reset all filters

**State Management**:
```typescript
const [status, setStatus] = useState<string>('')
const [fromDate, setFromDate] = useState<string>('')
const [toDate, setToDate] = useState<string>('')

// Filters trigger API reload
useEffect(() => {
  loadHistory()
}, [page, status, fromDate, toDate])
```

**Acceptance Criteria**:
- [x] Filters hoạt động riêng lẻ và kết hợp
- [x] Clear reset tất cả filters
- [x] UI hiển thị current filter state
- [x] Date inputs dùng đúng format (YYYY-MM-DD cho input type="date")

---

## Phase 5: Translations & Testing

### Task 5.1: trollLLM-mke - Add payment history translations (EN/VI)
**File**: `frontend/src/lib/i18n.ts`
**Priority**: P2

**Add translations object** (trong cả `en` và `vi`):
```typescript
payments: {
  title: 'Payment History',           // 'Lịch sử thanh toán'
  subtitle: 'View your payment statistics and transaction history', // 'Xem thống kê và lịch sử giao dịch'
  stats: {
    totalCredits: 'Total Credits',    // 'Tổng Credits'
    totalVND: 'Total VND',            // 'Tổng VND'
    successOrders: 'Success Orders',  // 'Đơn thành công'
    pendingOrders: 'Pending Orders',  // 'Đơn chờ xử lý'
  },
  filters: {
    status: 'Status',                 // 'Trạng thái'
    all: 'All',                       // 'Tất cả'
    success: 'Success',               // 'Thành công'
    pending: 'Pending',               // 'Đang chờ'
    failed: 'Failed',                 // 'Thất bại'
    from: 'From',                     // 'Từ ngày'
    to: 'To',                         // 'Đến ngày'
    clear: 'Clear',                   // 'Xóa bộ lọc'
  },
  table: {
    orderCode: 'Order Code',          // 'Mã đơn'
    credits: 'Credits',               // 'Credits'
    amount: 'Amount',                 // 'Số tiền'
    status: 'Status',                 // 'Trạng thái'
    createdAt: 'Created',             // 'Ngày tạo'
    completedAt: 'Completed',         // 'Hoàn thành'
  },
  empty: {
    title: 'No payments found',       // 'Không có giao dịch'
    description: 'Your payment history will appear here', // 'Lịch sử thanh toán sẽ hiển thị ở đây'
  },
  pagination: {
    prev: 'Previous',                 // 'Trước'
    next: 'Next',                     // 'Sau'
    page: 'Page',                     // 'Trang'
    of: 'of',                         // 'của'
  },
},
```

**Also add to sidebar**:
```typescript
sidebar: {
  // ... existing keys
  payments: 'Payments',  // 'Thanh toán'
}
```

**Acceptance Criteria**:
- [x] Tất cả text trên payment page dùng translations
- [x] Language switcher hoạt động trên payment page
- [x] Không còn hardcoded strings

---

### Task 5.2: trollLLM-6ed - Integration testing
**Priority**: P2

**Manual Testing Checklist**:

**Backend Tests**:
- [ ] GET /api/payment/user-stats trả về stats đúng
- [ ] GET /api/payment/history-paginated trả về paginated results
- [ ] Filters hoạt động (status, date range)
- [ ] Pagination hoạt động đúng
- [ ] Unauthorized trả về 401

**Frontend Tests**:
- [ ] Stats cards hiển thị data đúng
- [ ] Table render payment list
- [ ] Status filter hoạt động
- [ ] Date range filter hoạt động
- [ ] Pagination navigation hoạt động
- [ ] Empty state hiển thị khi không có payments
- [ ] Loading states hiển thị đúng
- [ ] Mobile responsive hoạt động
- [ ] i18n translations hoạt động (EN/VI)

---

## File Changes Summary

| File | Action | Task |
|------|--------|------|
| `backend/src/repositories/payment.repository.ts` | Edit | 1.1, 1.2 |
| `backend/src/services/payment.service.ts` | Edit | 2.1 |
| `backend/src/routes/payment.routes.ts` | Edit | 2.2 |
| `frontend/src/lib/api.ts` | Edit | 3.1 |
| `frontend/src/components/Sidebar.tsx` | Edit | 4.1 |
| `frontend/src/app/(dashboard)/payments/page.tsx` | **Create** | 4.2, 4.3, 4.4 |
| `frontend/src/lib/i18n.ts` | Edit | 5.1 |

---

## Estimated Time

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1 | Repository methods | 15 min |
| Phase 2 | Service + Routes | 15 min |
| Phase 3 | Frontend API | 10 min |
| Phase 4 | Frontend UI | 45 min |
| Phase 5 | Translations + Testing | 20 min |
| **Total** | | **~1h 45min** |

---

## Risks & Notes

1. **PaymentHistoryItem** interface đã tồn tại trong api.ts (dòng 464-471) với fields: `id, orderCode, amount, status, createdAt, completedAt` - cần thêm `credits` field
2. Pattern UI nên follow dashboard page style để consistent
3. Date format: Backend nhận ISO string, frontend dùng `type="date"` input (YYYY-MM-DD)
4. `findByUserId` method đã tồn tại (dòng 70-75) nhưng không có pagination - task mới là `findByUserIdPaginated`
