# Change: Add Credits Billing System

## Why
Currently when admin sets a user's plan to Dev or Pro, the user does not receive any credits. Also, while GoProxy calculates billing costs per request based on model pricing (input/output price per MTok from config.json), it only tracks token usage without deducting from user credits.

## What Changes
- **Auto-grant credits on plan upgrade**: When admin sets user plan to Dev → grant $225 credits, Pro → grant $500 credits
- **Deduct credits per request**: GoProxy should deduct credits based on actual cost calculated from model pricing in config.json
- **Update PLAN_LIMITS**: Change Pro valueUsd from 600 to 500

## Impact
- Affected specs: user-dashboard
- Affected code:
  - `backend/src/models/user.model.ts` - Update PLAN_LIMITS
  - `backend/src/repositories/user.repository.ts` - Auto-grant credits on plan change
  - `goproxy/internal/usage/usage.go` - Deduct credits after calculating cost
