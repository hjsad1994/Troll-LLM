# Change: Update Checkout Discord Integration Text

## Why
The current Discord ID input description on the checkout page (`https://trollllm.xyz/checkout`) focuses only on automatic role assignment. Users should understand the broader benefits of joining Discord: fastest support, giveaways, and other exclusive offers.

## What Changes
- Update the `shortDesc` text in the checkout Discord section
- Provide bilingual support (English and Vietnamese)
- Change messaging from role-focused to benefit-focused

### Current Text
- **EN**: "Enter your Discord ID to receive Dev/Pro role automatically after payment"
- **VI**: "Nhập Discord ID để tự động nhận role Dev/Pro sau khi thanh toán"

### New Text
- **EN**: "Join to get the fastest support, giveaways, and exclusive offers"
- **VI**: "Tham gia để được hỗ trợ nhanh nhất, giveaway và các ưu đãi đặc biệt"

## Impact
- Affected specs: i18n/checkout translations
- Affected code: `frontend/src/lib/i18n.ts` (lines 738, 1923)
