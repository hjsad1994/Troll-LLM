# Change: One-time Migration Script for User Credits (Rate 1000 → 2500)

## Why

Cần một script để migrate credits của users từ rate cũ (1000 VND/USD) sang rate mới (2500 VND/USD) cho những user chưa được migrate. Hiện tại đã có system migration trong codebase (migration: true/false), nhưng cần một script standalone để chạy one-time migration cho các users còn lại.

## What Changes

Tạo một script migration standalone với các tính năng:
- **Migrate credits từ rate 1000 lên 2500** cho users có `migration: false`
- **Dry-run mode** để preview trước khi thực sự migrate
- **Detailed logging** ra console với thông tin chi tiết về từng user
- **Error handling** tốt, không dừng khi gặp user thất bại
- **Create migration logs** trong collection `migration_logs` để audit
- **Update user migration status** từ `false` sang `true`

### Script Behavior

**Formula:**
```
newCredits = oldCredits / 2.5  (vì 2500/1000 = 2.5)
```

**Target Users:**
- Users có `migration: false` (chưa migrate)
- Có thể có `credits > 0` hoặc `credits = 0`

**Execution:**
```bash
# Dry run (preview)
npm run migrate-credits

# Apply changes
npm run migrate-credits -- --apply
```

### Output Format

Console output sẽ hiển thị:
1. **Summary**: Số users tìm thấy, số sẽ được migrate
2. **Details Table**: Username, oldCredits, newCredits cho mỗi user
3. **Results**: Số thành công, số thất bại
4. **Migration Logs**: Tạo records trong `migration_logs` collection

## Impact

- **Affected specs:** rate-migration (new capability: one-time migration script)
- **Affected code:**
  - New script: `backend/src/scripts/migrate-credits-1000-to-2500.ts`
  - Uses existing: `UserNew` model, `MigrationLog` model (hoặc tạo inline)
- **Database changes:**
  - Update `usersNew` collection: set `migration: true`, update `credits`
  - Insert into `migration_logs` collection
- **No frontend changes needed** (backend-only script)

## Migration Notes

- Script này là **one-time only**, chạy xong thì xóa hoặc archive
- Sau khi chạy, tất cả users sẽ có `migration: true`
- Nếu user đã có `migration: true`, script sẽ skip (không migrate lại)
- Admin users có thể được exclude nếu cần (optional)
- Script cần được chạy **OFF-HOURS** để tránh impact user experience

## Success Criteria

1. Script chạy thành công với dry-run mode
2. Script migrate đúng users (migration: false → true)
3. Credits được tính đúng theo formula / 2.5
4. Migration logs được tạo đúng trong database
5. Error handling hoạt động tốt (fail user này không ảnh hưởng user khác)
6. Console output rõ ràng, dễ debug
