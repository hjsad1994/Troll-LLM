# Change: Add Admin Dashboard UI

## Why
Hiện tại admin chỉ có thể quản lý qua API (curl/Postman). Cần trang web admin để:
- CRUD User API Keys (tạo, sửa, xóa, reset usage)
- CRUD Factory Keys (thêm, xóa, xem status)
- CRUD Proxies (tạo, sửa, xóa, bind keys)
- Xem tổng quan hệ thống

## What Changes
- Tạo trang admin dashboard (`/admin`)
- Trang quản lý User Keys (`/admin/keys`)
- Trang quản lý Factory Keys (`/admin/factory-keys`)
- Trang quản lý Proxies (`/admin/proxies`)
- UI đẹp, responsive, dễ sử dụng

## Impact
- Affected specs: api-proxy
- Affected code:
  - `backend/static/admin/` - Admin UI pages
  - `backend/src/index.ts` - Thêm routes cho admin pages

## Success Metrics
- Admin có thể CRUD keys/proxies qua web UI
- Không cần dùng curl/Postman nữa
- UI responsive, hoạt động trên mobile
