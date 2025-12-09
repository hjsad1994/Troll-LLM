# Proposal: Convert UserNew Credits to New System

## Why
Chuyển đổi hệ quy chiếu credits trong UsersNew collection từ hệ cũ sang hệ mới:
- **Hệ cũ**: 1,250 credits = 180,000đ (1 credit ≈ 144đ)
- **Hệ mới**: $1 = 1,000đ

## What Changes
Tạo migration script để convert credits trong `usersNew` collection:

1. **Công thức quy đổi**:
   ```
   newCredits = ((credits + refCredits) * 144) / 1000
   ```
   - Làm tròn lên 0.5 (VD: 79.2 → 79.5)

2. **Cập nhật expiresAt** dựa trên số dư mới:
   - Số dư < $50: expiresAt = now + 7 ngày (1 tuần)
   - Số dư >= $50: expiresAt = now + 14 ngày (2 tuần)

3. **Reset refCredits về 0** sau khi đã cộng vào credits

## Scope
- **Backend**: Migration script `convert-usernew-credits.ts`
- Chỉ ảnh hưởng đến `usersNew` collection

## Example
User có 550 credits + 50 refCredits:
- Tổng: 600 credits
- Giá trị VNĐ: 600 × 144 = 86,400đ
- Quy đổi: 86,400 / 1,000 = $86.4 → làm tròn = $86.5
- Hạn sử dụng: 2 tuần (vì >= $50)

## Out of Scope
- Không thay đổi `users` collection gốc
- Không thay đổi logic business trong code

## Risks
- Data loss nếu script chạy lỗi → Cần backup trước khi chạy
