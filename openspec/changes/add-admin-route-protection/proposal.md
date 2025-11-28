# Change: Add Admin Route Protection

## Why
Cần đảm bảo chỉ có Admin mới có thể truy cập các trang quản trị (admin pages). Hiện tại, người dùng thường (User) có thể truy cập vào các route của admin nếu họ biết URL.

## What Changes
- **Frontend**: Thêm middleware/guard kiểm tra role admin trước khi cho phép truy cập các trang admin
- **Frontend**: Redirect user không có quyền admin về dashboard
- **Frontend**: Hiển thị thông báo lỗi khi user cố truy cập trang admin

## Impact

### Affected Specs
- `specs/user-dashboard/spec.md` - Thêm yêu cầu bảo vệ route admin

### Affected Code
- `frontend/src/app/(dashboard)/admin/*` - Tất cả các trang admin
- `frontend/src/app/(dashboard)/users/*` - Trang quản lý users
- `frontend/src/components/AuthProvider.tsx` - Có thể cần cập nhật
- `frontend/src/app/(dashboard)/layout.tsx` - Thêm route protection

### Breaking Changes
- Không có breaking changes - chỉ thêm lớp bảo vệ
