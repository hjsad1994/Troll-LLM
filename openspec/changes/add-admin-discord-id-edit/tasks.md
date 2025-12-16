## 1. Backend Implementation
- [x] 1.1 Add `PATCH /admin/users/:username/discord-id` endpoint in `admin.routes.ts`
  - Validate discordId format (17-19 digits or null to clear)
  - Use existing `userRepository.updateDiscordId` method
  - Return success response with updated user info

## 2. Frontend API
- [x] 2.1 Add `updateUserDiscordId(username, discordId)` function in `api.ts`
- [x] 2.2 Add `discordId` field to `AdminUser` interface

## 3. Frontend UI
- [x] 3.1 Add Discord ID column to users table (desktop view)
- [x] 3.2 Add Discord ID display to mobile card view
- [x] 3.3 Add edit button for Discord ID in each user row
- [x] 3.4 Create edit modal for Discord ID input with validation
- [x] 3.5 Implement save functionality with loading state

## 4. Internationalization
- [x] 4.1 Add translation strings for Discord ID edit UI in `i18n.ts`
