# Proposal: Fix Admin User Stats Display

## Status
Draft

## Why
Phần "User Stats" trên trang Admin Dashboard đang hiển thị sai:
- Hiển thị "Tokens" thay vì "Credits (USD)"
- Sử dụng field names cũ không khớp với API response

## What Changes

### Sửa phần User Stats để hiển thị:
1. **Total Credits** - Tổng credits (USD) còn lại của tất cả users
2. **Credits Burned** - Tổng credits (USD) đã sử dụng
3. **Total Input Tokens** - Tổng input tokens (giữ nguyên)
4. **Total Output Tokens** - Tổng output tokens (giữ nguyên)
5. **Ref Credits** - Tổng referral credits
6. **Total Users / Active Users** - Giữ nguyên

### API Response (đã có sẵn):
```json
{
  "total_users": number,
  "active_users": number,
  "total_credits_used": number,   // Credits đã burn (USD)
  "total_credits": number,        // Credits còn lại (USD)
  "total_ref_credits": number,    // Ref credits (USD)
  "total_input_tokens": number,
  "total_output_tokens": number
}
```

## Scope
- Frontend only: `frontend/src/app/(dashboard)/admin/page.tsx`
- Không cần thay đổi backend
