# Change: Move Frontend from admin to frontend folder (Next.js + Tailwind CSS)

## Why
Admin panel hiện tại sử dụng HTML/CSS/JS tĩnh trong `backend/static/admin`. Cần chuyển sang kiến trúc Next.js với Tailwind CSS để:
- Cải thiện trải nghiệm phát triển (hot reload, TypeScript)
- Dễ dàng mở rộng và bảo trì
- Tối ưu performance với SSR/SSG
- UI nhất quán với Tailwind CSS utilities

## What Changes
- **BREAKING**: Di chuyển frontend từ `backend/static/admin/` sang folder `frontend/` mới
- Chuyển đổi static HTML/CSS/JS sang Next.js App Router
- Thay thế CSS thuần bằng Tailwind CSS
- Giữ nguyên tất cả chức năng hiện có:
  - Dashboard (index.html)
  - API Keys management (keys.html)
  - Factory Keys management (factory-keys.html)
  - Proxies management (proxies.html)
- Backend cần cập nhật để serve Next.js build output hoặc chạy riêng

## Impact
- **Affected specs**: frontend (new capability)
- **Affected code**:
  - `backend/static/admin/` - Sẽ bị xóa sau khi migrate
  - `backend/src/index.ts` - Cập nhật static file serving
  - `frontend/` - Folder mới chứa Next.js app
- **Dependencies mới**:
  - Next.js 14+
  - React 18+
  - Tailwind CSS 3+
  - TypeScript
