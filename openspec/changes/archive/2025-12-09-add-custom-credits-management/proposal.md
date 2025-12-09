# Proposal: Add Custom Credits Management

## Status
Draft

## Summary
Thay thế các nút SET cố định +$20/+$40 trên trang Users bằng giao diện linh hoạt hơn với 2 input riêng biệt cho phép admin nhập số tiền tùy ý và thực hiện SET (đặt giá trị) hoặc ADD (cộng thêm) credits.

## Motivation
Hiện tại trang Users chỉ có 2 nút cố định +$20 và +$40 để SET credit package. Điều này hạn chế vì:
- Admin không thể set/add số tiền tùy ý (ví dụ: $5, $100, $15.50)
- Không có chức năng ADD (cộng thêm vào credits hiện có)
- Phải chọn đúng package thay vì nhập số cụ thể

## Proposed Changes

### UI Changes
Thay thế 2 nút +$20/+$40 bằng:
1. **Input SET**: Ô nhập số + nút "SET" - đặt credits về giá trị nhập
2. **Input ADD**: Ô nhập số + nút "ADD" - cộng thêm vào credits hiện có

### Behavior
- **SET**: Đặt credits = giá trị nhập (thay thế hoàn toàn)
- **ADD**: Credits mới = credits cũ + giá trị nhập

### Constraints
- Giá trị nhập phải >= 0
- Cho phép số thập phân (ví dụ: $15.50)
- Confirmation dialog trước khi thực hiện

## Scope
- Frontend: Cập nhật trang Users (`frontend/src/app/(dashboard)/users/page.tsx`)
- Backend: Sử dụng API endpoints có sẵn (`/admin/users/:username/credits` cho SET, `/admin/users/:username/credits/add` cho ADD)

## Dependencies
- Backend API đã có sẵn các endpoints cần thiết
- Không cần thay đổi backend
