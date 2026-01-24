# User Payment History Dashboard

## Overview

Xây dựng giao diện UI cho user theo dõi lịch sử payment/nạp tiền, bao gồm thống kê tổng hợp và danh sách chi tiết các đơn hàng.

**Created:** 2026-01-24
**Status:** Ready for Implementation

---

## Requirements

| Feature | Decision |
|---------|----------|
| **Navigation** | Thêm menu "Payments" vào Sidebar cho user |
| **Stats** | Đầy đủ: Total $, Total VND, Số đơn success/pending/failed |
| **Filter** | Filter theo status + khoảng thời gian |
| **Pagination** | Có, 20 items/page |

---

## Technical Context

### Existing Payment Model

```typescript
// backend/src/models/payment.model.ts
interface IPayment {
  _id: ObjectId
  userId: string           // Link to user
  discordId?: string
  username?: string
  credits: number         // USD amount purchased
  amount: number          // VND amount paid
  currency: 'VND'
  orderCode?: string
  status: 'pending' | 'success' | 'failed' | 'expired'
  creditsBefore?: number
  creditsAfter?: number
  createdAt: Date
  expiresAt: Date
  completedAt?: Date
}
```

### Existing API Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/payment/history` | GET | Exists (basic, no pagination) |
| `/api/payment/:id/status` | GET | Exists |
| `/api/payment/checkout` | POST | Exists |

### Existing Frontend

- `getPaymentHistory()` in `lib/api.ts` - basic implementation
- Dashboard shows last 5 payments only
- No dedicated payment history page

---

## Implementation Plan

### Phase 1: Backend API Enhancement

#### Task 1.1: Add User Payment Stats Method to Repository

**File:** `backend/src/repositories/payment.repository.ts`

**Action:** ADD method `getUserPaymentStats(userId: string)`

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
        totalOrders: { $sum: 1 }
      }
    }
  ]);
  
  return stats || {
    totalCredits: 0,
    totalVND: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    totalOrders: 0
  };
}
```

#### Task 1.2: Add Paginated History Method to Repository

**File:** `backend/src/repositories/payment.repository.ts`

**Action:** ADD method `findByUserIdPaginated()`

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
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const [payments, total] = await Promise.all([
    Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(query)
  ]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}
```

#### Task 1.3: Add Service Methods

**File:** `backend/src/services/payment.service.ts`

**Action:** ADD methods

```typescript
async getUserPaymentStats(userId: string) {
  return paymentRepository.getUserPaymentStats(userId);
}

async getPaymentHistoryPaginated(
  userId: string,
  options: { page?: number; limit?: number; status?: string; from?: string; to?: string }
) {
  const { page, limit, status, from, to } = options;
  return paymentRepository.findByUserIdPaginated(userId, {
    page: page ? parseInt(String(page)) : 1,
    limit: limit ? parseInt(String(limit)) : 20,
    status: status as PaymentStatus | undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined
  });
}
```

#### Task 1.4: Add API Routes

**File:** `backend/src/routes/payment.routes.ts`

**Action:** ADD 2 new endpoints

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
    console.error('[Payment Stats Error]', error);
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
      page: page as string | undefined,
      limit: limit as string | undefined,
      status: status as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined
    });
    res.json(result);
  } catch (error: any) {
    console.error('[Payment History Paginated Error]', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Phase 2: Frontend Implementation

#### Task 2.1: Add API Types and Functions

**File:** `frontend/src/lib/api.ts`

**Action:** ADD types and functions

```typescript
// Types
export interface PaymentStats {
  totalCredits: number;
  totalVND: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  totalOrders: number;
}

export interface PaymentHistoryPaginatedResponse {
  payments: PaymentHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

// Functions
export async function getUserPaymentStats(): Promise<PaymentStats> {
  const resp = await fetchWithAuth('/api/payment/user-stats')
  if (!resp.ok) {
    const data = await resp.json()
    throw new Error(data.error || 'Failed to get payment stats')
  }
  return resp.json()
}

export async function getPaymentHistoryPaginated(params?: {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
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

#### Task 2.2: Add Sidebar Navigation Item

**File:** `frontend/src/components/Sidebar.tsx`

**Action:** ADD to `userNavItems` array (after dashboard item)

```typescript
{
  href: '/payments',
  labelKey: 'payments',
  icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
```

**Also ADD:** Translation key `payments` to sidebar translations in `LanguageProvider.tsx`

#### Task 2.3: Create Payment History Page

**File:** `frontend/src/app/(dashboard)/payments/page.tsx`

**Action:** CREATE new page

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Payment History" with icon                             │
├─────────────────────────────────────────────────────────────────┤
│ Stats Cards Row (4 cards):                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│ │ Total $   │ │ Total VND │ │ Success   │ │ Pending   │        │
│ │ $150.00   │ │ 225,000đ  │ │ 5 orders  │ │ 1 order   │        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
├─────────────────────────────────────────────────────────────────┤
│ Filters Row:                                                    │
│ [Status: All ▼] [From: Date] [To: Date] [Clear Filters]        │
├─────────────────────────────────────────────────────────────────┤
│ Payment Table:                                                  │
│ Order Code │ Credits │ Amount (VND) │ Status │ Date │ Completed│
│ TROLL20D.. │ $20     │ 30,000đ      │ ✅     │ ...  │ ...     │
│ ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│ Pagination: [< Prev] Page 1 of 5 [Next >]                      │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Stats cards with icons and colors (matching existing dashboard style)
- Status filter dropdown: All, Success, Pending, Failed/Expired
- Date range filter with date inputs
- Responsive table with:
  - Order Code (truncated with tooltip)
  - Credits ($XX)
  - Amount (formatted VND)
  - Status badge (color-coded)
  - Created date
  - Completed date (if applicable)
- Pagination controls
- Loading skeleton states
- Empty state when no payments
- Mobile-responsive (cards stack, table scrolls)

---

### Phase 3: Translations (i18n)

#### Task 3.1: Add Translation Keys

**File:** `frontend/src/components/LanguageProvider.tsx`

**Action:** ADD translations for both EN and VI

```typescript
// English
payments: {
  title: 'Payment History',
  subtitle: 'View your purchase history and statistics',
  stats: {
    totalCredits: 'Total Credits',
    totalVND: 'Total Paid',
    successOrders: 'Successful',
    pendingOrders: 'Pending'
  },
  filters: {
    status: 'Status',
    all: 'All',
    success: 'Success',
    pending: 'Pending',
    failed: 'Failed',
    from: 'From',
    to: 'To',
    clear: 'Clear Filters'
  },
  table: {
    orderCode: 'Order Code',
    credits: 'Credits',
    amount: 'Amount',
    status: 'Status',
    createdAt: 'Created',
    completedAt: 'Completed'
  },
  empty: {
    title: 'No payments yet',
    description: 'Your payment history will appear here after your first purchase.'
  },
  pagination: {
    prev: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of'
  }
}

// Vietnamese
payments: {
  title: 'Lịch sử nạp tiền',
  subtitle: 'Xem lịch sử mua hàng và thống kê',
  stats: {
    totalCredits: 'Tổng Credits',
    totalVND: 'Tổng đã nạp',
    successOrders: 'Thành công',
    pendingOrders: 'Đang chờ'
  },
  filters: {
    status: 'Trạng thái',
    all: 'Tất cả',
    success: 'Thành công',
    pending: 'Đang chờ',
    failed: 'Thất bại',
    from: 'Từ ngày',
    to: 'Đến ngày',
    clear: 'Xóa bộ lọc'
  },
  table: {
    orderCode: 'Mã đơn hàng',
    credits: 'Credits',
    amount: 'Số tiền',
    status: 'Trạng thái',
    createdAt: 'Ngày tạo',
    completedAt: 'Hoàn thành'
  },
  empty: {
    title: 'Chưa có giao dịch',
    description: 'Lịch sử giao dịch sẽ xuất hiện sau khi bạn nạp tiền lần đầu.'
  },
  pagination: {
    prev: 'Trước',
    next: 'Sau',
    page: 'Trang',
    of: 'của'
  }
}

// Sidebar
sidebar: {
  // ... existing
  payments: 'Payments' // EN
  payments: 'Lịch sử nạp' // VI
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/src/repositories/payment.repository.ts` | EDIT | Add `getUserPaymentStats()` and `findByUserIdPaginated()` |
| `backend/src/services/payment.service.ts` | EDIT | Add `getUserPaymentStats()` and `getPaymentHistoryPaginated()` |
| `backend/src/routes/payment.routes.ts` | EDIT | Add `/user-stats` and `/history-paginated` endpoints |
| `frontend/src/lib/api.ts` | EDIT | Add types and API functions |
| `frontend/src/components/Sidebar.tsx` | EDIT | Add payments nav item to userNavItems |
| `frontend/src/components/LanguageProvider.tsx` | EDIT | Add translations |
| `frontend/src/app/(dashboard)/payments/page.tsx` | CREATE | New payment history page |

---

## Testing Checklist

### Backend Tests
- [ ] `/api/payment/user-stats` returns correct aggregated stats
- [ ] `/api/payment/history-paginated` returns paginated results
- [ ] Filters work correctly (status, date range)
- [ ] Pagination works correctly
- [ ] Unauthorized access returns 401

### Frontend Tests
- [ ] Stats cards display correct data
- [ ] Table renders payment list
- [ ] Status filter works
- [ ] Date range filter works
- [ ] Pagination navigation works
- [ ] Empty state shows when no payments
- [ ] Loading states display correctly
- [ ] Mobile responsive layout works
- [ ] Sidebar navigation shows for regular users
- [ ] i18n translations work (EN/VI)

---

## Estimated Time

| Phase | Estimate |
|-------|----------|
| Phase 1: Backend API | ~20 min |
| Phase 2: Frontend UI | ~40 min |
| Phase 3: Translations | ~10 min |
| Testing & Polish | ~15 min |
| **Total** | ~85 min |

---

## Success Criteria

1. User can access `/payments` page from sidebar
2. Stats cards show: Total $, Total VND, Success count, Pending count
3. Payment table shows all user's payments with pagination (20/page)
4. User can filter by status (All/Success/Pending/Failed)
5. User can filter by date range
6. Page is responsive on mobile
7. Page supports both EN and VI languages
8. Loading and empty states work correctly
