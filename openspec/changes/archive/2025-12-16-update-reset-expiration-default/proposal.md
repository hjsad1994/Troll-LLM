# Change: Update Reset Expiration Checkbox Default to Unchecked

## Why
Admin hiện tại phải nhớ bỏ tick checkbox "Reset Expiration" mỗi khi không muốn reset thời hạn subscription. Việc mặc định là checked khiến admin dễ vô tình reset expiration khi chỉ muốn thêm/set credits. Thay đổi mặc định thành unchecked giúp admin kiểm soát chủ động hơn.

## What Changes
- Thay đổi giá trị mặc định của `resetExpiration` state từ `true` thành `false` trong Users page
- Checkbox "Reset Expiration" sẽ hiển thị unchecked khi trang được load
- Admin phải chủ động tick checkbox nếu muốn reset expiration date

## Impact
- Affected specs: `admin-dashboard`
- Affected code: `frontend/src/app/(dashboard)/users/page.tsx:75`
