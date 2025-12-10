# Proposal: migrate-credits-to-usersnew

## Summary
Chuyển việc tính credits từ collection `users` sang `usersNew` trong goproxy để đồng bộ với backend.

## Problem Statement
Hiện tại có sự không nhất quán trong việc xử lý credits:
- **Backend (Node.js)**: Sử dụng collection `usersNew` để quản lý users và credits
- **Goproxy (Go)**: Đang sử dụng collection `users` để trừ credits và validate API key

Điều này dẫn đến:
1. Credits bị trừ từ collection sai (`users` thay vì `usersNew`)
2. Dashboard hiển thị credits từ `usersNew` nhưng proxy trừ từ `users`
3. Users có thể thấy credits không giảm sau khi sử dụng API (vì trừ ở collection khác)

## Current Behavior
```
goproxy/db/mongodb.go:71-73:
func UsersCollection() *mongo.Collection {
    return GetCollection("users")  // <-- WRONG: Should be "usersNew"
}
```

## Proposed Solution
Đổi `UsersCollection()` trong goproxy để trỏ tới collection `usersNew` thay vì `users`.

## Impact Analysis
- **Files affected**:
  - `goproxy/db/mongodb.go` - Chỉ cần thay đổi 1 dòng
- **Risk**: Low - Chỉ là đổi tên collection
- **Dependencies**: Không có
- **Migration**: Không cần (dữ liệu đã tồn tại trong `usersNew`)

## Affected Components
| Component | Change Type | Description |
|-----------|-------------|-------------|
| goproxy/db/mongodb.go | MODIFIED | Đổi collection name từ "users" sang "usersNew" |

## Acceptance Criteria
1. Goproxy trừ credits từ collection `usersNew`
2. Dashboard và proxy sử dụng cùng một nguồn dữ liệu credits
3. Users thấy credits giảm đúng sau khi sử dụng API

## Status
**ARCHIVED** - Deployed on 2025-12-10
