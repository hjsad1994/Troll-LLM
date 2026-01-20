# Tasks: Fix OhMyGPT Pricing Markup

## Overview
Config prices are ~10% higher than OhMyGPT's actual prices. Update config to match upstream pricing.

## Tasks

### 1. Verify OhMyGPT Actual Pricing
- Contact OhMyGPT or check their API documentation
- Confirm actual prices for Claude Sonnet 4.5:
  - input_price_per_mtok
  - output_price_per_mtok
  - cache_write_price_per_mtok
  - cache_hit_price_per_mtok

### 2. Update Config Prices
Edit `goproxy/config-ohmygpt-prod.json` and `goproxy/config-ohmygpt-dev.json`:

Current (example):
```json
"input_price_per_mtok": 3.30,
"output_price_per_mtok": 16.50,
"cache_write_price_per_mtok": 4.13,
"cache_hit_price_per_mtok": 0.33,
```

Should be (if OhMyGPT base is 10% lower):
```json
"input_price_per_mtok": 3.00,
"output_price_per_mtok": 15.00,
"cache_write_price_per_mtok": 3.75,
"cache_hit_price_per_mtok": 0.30,
```

Apply to all models:
- Claude Opus 4.5
- Claude Sonnet 4.5
- Claude Haiku 4.5

### 3. Validate Calculation
After update, verify:
- Base cost calculation matches OhMyGPT
- Only `billing_multiplier: 1.04` is applied
- No hidden markup exists (confirmed ✓)

### 4. Test with Request
Make a test request and verify:
```
Expected: OhMyGPT_base_price × 1.04 = final_price
```

## Notes
- Current billing_multiplier is correct (1.04)
- Only config prices need adjustment
- No code changes required
