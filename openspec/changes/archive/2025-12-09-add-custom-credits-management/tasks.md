# Tasks: Add Custom Credits Management

## Implementation Tasks

- [x] **1. Update Users page UI** `frontend`
  - Thay thế 2 nút +$20/+$40 bằng 2 input với nút SET và ADD
  - Input SET: Ô nhập số + nút "SET" (màu amber/warning)
  - Input ADD: Ô nhập số + nút "ADD" (màu emerald/success)
  - Validation: số >= 0, cho phép decimal
  - Confirmation dialog trước khi thực hiện

- [x] **2. Use existing API functions** `frontend`
  - Sử dụng function `updateUserCredits(username, credits)` cho SET
  - Sử dụng function `addUserCredits(username, amount)` cho ADD
  - (API functions đã có sẵn trong api.ts)

- [x] **3. Add handlers** `frontend`
  - `handleSetCredits(username)` - gọi updateUserCredits
  - `handleAddCredits(username)` - gọi addUserCredits
  - State management: setAmounts, addAmounts per user
  - Loading state riêng cho mỗi user
  - Error handling với alert

- [ ] **4. Test thủ công** `testing`
  - Test SET credits với các giá trị: 0, 10, 50.50, 100
  - Test ADD credits với các giá trị tương tự
  - Verify credits được cập nhật đúng trong database
  - Verify UI refresh sau khi thực hiện

## Notes
- Backend API đã có sẵn, không cần thay đổi
- TypeScript check passed
