# Change: Add System-wide Metrics Dashboard

## Why
Admins cần xem tổng quan về hiệu suất và sử dụng của toàn hệ thống proxy, bao gồm tổng số requests, tokens đã sử dụng, latency trung bình và tỷ lệ thành công. Hiện tại chỉ có thể xem thông tin theo từng key/proxy riêng lẻ.

## What Changes
- Thêm API endpoint `GET /admin/metrics` trả về system-wide metrics
- Thêm metrics cards vào Dashboard frontend hiển thị:
  - **Total Requests**: Tổng số requests của toàn hệ thống
  - **Total Tokens**: Tổng tokens đã sử dụng
  - **Avg Latency**: Latency trung bình (ms)
  - **Success Rate**: Tỷ lệ requests thành công (%)
- Lưu thêm `latencyMs` vào `request_logs` collection để tính Avg Latency
- Cập nhật goproxy để log latency cho mỗi request

## Impact
- Affected specs: api-proxy
- Affected code:
  - `backend/src/routes/admin.ts` - Thêm metrics endpoint
  - `backend/src/services/` - Thêm metrics aggregation service
  - `backend/src/db/mongodb.ts` - Cập nhật RequestLog schema (thêm latencyMs)
  - `frontend/src/app/page.tsx` - Cập nhật Dashboard UI với metrics cards
  - `goproxy/main.go` - Log latency vào request_logs
