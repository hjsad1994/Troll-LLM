# Change: Add Credits Burned Column to Users List

## Why
Admin cần biết mỗi user đã burn bao nhiêu credits để theo dõi usage và phân tích chi tiêu. Hiện tại endpoint `/admin/users` không trả về thông tin này.

## What Changes
- Thêm field `creditsBurned` vào response của `GET /admin/users`
- Field này hiển thị tổng số credits (USD) mà user đã sử dụng, aggregated từ `request_logs`

## Impact
- Affected specs: `admin-dashboard`
- Affected code:
  - `backend/src/routes/admin.routes.ts` - Users list endpoint
  - `backend/src/repositories/request-log.repository.ts` - Đã có method `getCreditsBurnedByUser()`
