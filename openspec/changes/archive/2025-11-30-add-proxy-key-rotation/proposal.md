# Change: Add Proxy Key Rotation Management

## Why
Currently, khi proxy có nhiều keys thì chỉ sử dụng key primary (priority 1), key secondary (priority 2) chỉ dùng khi primary fail. Admin muốn:
1. Round-robin xoay đều tất cả keys trong 1 proxy
2. Cấu hình priority linh hoạt (nhiều hơn 2 levels)
3. Hot reload - thay đổi bindings được áp dụng ngay mà không cần restart goproxy

## What Changes
- **Frontend**: Thêm trang admin `/admin/bindings` để quản lý proxy key bindings với UI trực quan
- **Backend**: Mở rộng API để hỗ trợ nhiều priority levels và notification endpoint cho goproxy
- **GoProxy**: 
  - Round-robin qua tất cả keys của 1 proxy (không chỉ primary)
  - Thêm endpoint `/reload` để refresh bindings từ database
  - Background goroutine định kỳ reload bindings (30s interval)

## Impact
- Affected specs: proxy-management (new)
- Affected code:
  - `frontend/src/app/(dashboard)/admin/bindings/page.tsx` (new)
  - `frontend/src/app/(dashboard)/admin/layout.tsx` (add menu)
  - `backend/src/routes/proxy.ts` (extend binding API)
  - `goproxy/internal/proxy/pool.go` (round-robin per proxy, hot reload)
  - `goproxy/main.go` (add reload endpoint)
