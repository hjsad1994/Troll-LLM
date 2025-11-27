# Change: Add Proxy-Key Binding Support

## Why
Cần binding 1-2 Factory API keys cho mỗi proxy server để:
- Phân tải request qua nhiều proxy
- Mỗi proxy có pool keys riêng, tránh rate limit
- Khi 1 key bị exhaust, tự động chuyển sang key còn lại
- **Cần monitoring để biết khi proxy bị chặn/die**

## What Changes
- Thêm bảng `proxies` để lưu thông tin proxy (SOCKS5/HTTP)
- Thêm bảng `proxy_key_bindings` để mapping proxy ↔ factory keys
- Thêm bảng `proxy_health_logs` để lưu lịch sử health check
- Cập nhật key pool logic để chọn proxy + key theo round-robin
- Thêm admin API để quản lý proxies và bindings
- Cập nhật Go proxy để sử dụng proxy khi gọi upstream
- **Thêm health check scheduler chạy định kỳ**
- **Thêm status dashboard để xem trạng thái proxies**

## Impact
- Affected specs: api-proxy
- Affected code: 
  - `goproxy/internal/keypool/` - thêm proxy selection
  - `goproxy/internal/proxy/` - proxy pool & health check
  - `goproxy/db/mongodb.go` - thêm collections
  - `backend/src/db/mongodb.ts` - thêm schemas
  - `backend/src/routes/admin.ts` - thêm endpoints
  - `backend/static/status.html` - status dashboard

## Success Metrics
- Có thể cấu hình 4-5 proxies, mỗi proxy 1-2 keys
- Request được phân tải đều qua các proxy
- Khi key bị rate limit, tự động failover sang key khác trên cùng proxy
- **Dashboard hiển thị real-time status của tất cả proxies**
