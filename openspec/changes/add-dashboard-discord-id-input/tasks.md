## 1. Backend Implementation
- [x] 1.1 Add `updateDiscordId` method to user-new.repository.ts
- [x] 1.2 Add `updateDiscordId` method to user.service.ts
- [x] 1.3 Add `PATCH /api/user/discord-id` endpoint to user.routes.ts
- [x] 1.4 Update `getProfile` to include discordId in response

## 2. Frontend Implementation
- [x] 2.1 Add `discordId` to UserProfile interface in api.ts
- [x] 2.2 Add `updateDiscordId` API function in api.ts
- [x] 2.3 Add Discord Integration UI section to dashboard page (below AI Provider)
- [x] 2.4 Add state management for discordId input and save functionality

## 3. Validation
- [x] 3.1 Test Discord ID validation (17-19 digits only)
- [x] 3.2 Test save/update functionality
- [x] 3.3 Test loading existing discordId on dashboard
