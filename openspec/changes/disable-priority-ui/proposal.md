# Change: Temporarily Disable Priority UI Elements

## Why
Priority endpoint feature cần được tạm thời ẩn đi khỏi giao diện người dùng. Các UI elements liên quan đến Priority sẽ được disabled/hidden trên 2 trang dashboard chính để đơn giản hóa trải nghiệm người dùng trong giai đoạn hiện tại.

## What Changes
- **dashboard page**: Ẩn Priority Endpoint section trong API Key card (phần hiển thị `https://priority-chat.trollllm.xyz`)
- **dashboard-models page**:
  - Ẩn badge "Priority Only" trên các model có `isPriority: true`
  - Ẩn badge "+Priority" trên các model có `priorityMultiplier`
  - Ẩn dòng thông tin "Hỗ trợ Priority Endpoint" ở cuối model card
  - Ẩn filter tab "Other" (models type=openhands)
  - Ẩn stat card "Other" count

## Impact
- Affected specs: frontend-dashboard
- Affected code:
  - `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - `frontend/src/app/(dashboard)/dashboard-models/page.tsx`
- No backend changes required
- No data model changes
- Easily reversible by removing conditional rendering

## Notes
- Đây là thay đổi tạm thời, có thể revert khi cần enable lại Priority feature
- Code sẽ được comment/conditional render thay vì xóa hoàn toàn để dễ dàng khôi phục
