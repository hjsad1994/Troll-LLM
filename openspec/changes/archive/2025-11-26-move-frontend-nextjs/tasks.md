# Tasks: Move Frontend to Next.js + Tailwind CSS

## 1. Setup Next.js Project
- [x] 1.1 Tạo folder `frontend/` với Next.js App Router
- [x] 1.2 Cài đặt và cấu hình Tailwind CSS
- [x] 1.3 Setup TypeScript
- [x] 1.4 Tạo cấu trúc folder chuẩn Next.js

## 2. Migrate Components
- [x] 2.1 Tạo layout component chung (header, sidebar, footer)
- [x] 2.2 Chuyển `index.html` → `app/page.tsx` (Dashboard)
- [x] 2.3 Chuyển `keys.html` → `app/keys/page.tsx` (API Keys)
- [x] 2.4 Chuyển `factory-keys.html` → `app/factory-keys/page.tsx`
- [x] 2.5 Chuyển `proxies.html` → `app/proxies/page.tsx`

## 3. Migrate Styles
- [x] 3.1 Chuyển `styles.css` sang Tailwind utilities
- [x] 3.2 Tạo custom Tailwind theme nếu cần
- [x] 3.3 Setup dark mode (optional) - Dark mode mặc định

## 4. Migrate JavaScript Logic
- [x] 4.1 Chuyển `admin.js` sang React hooks và services
- [x] 4.2 Setup API client (fetch/axios) cho backend calls
- [x] 4.3 Tạo state management (React Context hoặc Zustand) - Dùng React hooks

## 5. Integration
- [x] 5.1 Cấu hình CORS cho backend (thông qua next.config.js rewrites)
- [x] 5.2 Setup environment variables cho API URL
- [x] 5.3 Cấu hình build output (standalone mode)
- [ ] 5.4 Cập nhật backend để serve frontend build hoặc proxy

## 6. Testing & Cleanup
- [x] 6.1 Test tất cả tính năng hiện có (build successful)
- [ ] 6.2 Xóa `backend/static/admin/` sau khi migrate thành công
- [ ] 6.3 Cập nhật documentation
- [ ] 6.4 Cập nhật docker-compose nếu cần
