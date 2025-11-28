# Implementation Tasks

## 1. Backend - User Model Updates
- [x] 1.1 Update User schema với fields: `apiKey`, `apiKeyCreatedAt`, `plan`, `monthlyTokensUsed`, `monthlyResetDate`
- [ ] 1.2 Create migration script để generate API keys cho existing users

## 2. Backend - API Endpoints
- [x] 2.1 Create `GET /api/user/me` - lấy thông tin user hiện tại (profile + API key masked)
- [x] 2.2 Create `GET /api/user/api-key` - lấy full API key (chỉ khi authenticated)
- [x] 2.3 Create `POST /api/user/api-key/rotate` - rotate API key, return new key
- [x] 2.4 Create `GET /api/user/billing` - lấy billing info (tokens remaining, used this month, plan)

## 3. Backend - Key Generation
- [x] 3.1 Implement key generator với format `sk-trollllm-{64-char-hex}`
- [x] 3.2 Update key validation để accept new format

## 4. Backend - Monthly Reset Logic
- [x] 4.1 Implement cron job hoặc check để reset `monthlyTokensUsed` vào đầu tháng
- [x] 4.2 Track `monthlyResetDate` để biết khi nào reset lần cuối

## 5. GoProxy - Key Validation Update
- [ ] 5.1 Update key validation để accept format `sk-trollllm-*`
- [ ] 5.2 Lookup user by API key để check quota

## 6. Frontend - Dashboard UI
- [x] 6.1 Create API Keys section component
  - [x] Hiển thị masked API key (sk-trollllm-****...****1b7d5)
  - [x] Button "Show" để reveal full key
  - [x] Button "Copy" để copy key
  - [x] Button "Rotate" với confirmation dialog
- [x] 6.2 Create Billing section component
  - [x] Card: Total tokens remaining
  - [x] Card: Tokens used this month
  - [x] Card: Current plan với badge (Free/Pro/Enterprise)
  - [x] Progress bar cho usage percentage

## 7. Testing
- [ ] 7.1 Test API key rotation flow
- [ ] 7.2 Test billing info display
- [ ] 7.3 Test monthly reset logic
- [ ] 7.4 Test GoProxy key validation với new format

## 8. Documentation
- [ ] 8.1 Update API docs với new endpoints
