# Tasks: Fix Admin User Stats Display

## Implementation Tasks

- [x] **1. Update UserStats interface** `frontend`
  - Sửa interface để khớp với API response
  - Đổi `total_token_balance` → `total_credits`
  - Đổi `total_tokens_deducted` → `total_credits_used`
  - Đổi `total_ref_tokens` → `total_ref_credits`

- [x] **2. Update User Stats card UI** `frontend`
  - Đổi header từ "total tokens used" → "total credits burned"
  - Hiển thị Total Credits (USD) thay vì Token Balance
  - Hiển thị Credits Burned (USD) thay vì Tokens Deducted
  - Hiển thị Ref Credits (USD) thay vì Ref Tokens
  - Giữ nguyên Input/Output Tokens (đổi label thành Total Input/Output)
  - Thêm hàm formatUSD() để format số tiền với $ prefix
  - Đổi icon thành dollar sign

- [x] **3. i18n support** `frontend`
  - Bỏ qua - trang Admin chỉ dùng tiếng Anh

## Notes
- Backend API đã trả về đúng data (credits)
- TypeScript check passed
