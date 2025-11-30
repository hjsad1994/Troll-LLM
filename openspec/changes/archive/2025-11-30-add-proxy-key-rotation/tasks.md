# Tasks

## 1. GoProxy - Round-robin per Proxy
- [x] 1.1 Sửa `SelectProxyWithKeyByClient()` để round-robin qua tất cả keys của proxy (không chỉ priority 1)
- [x] 1.2 Thêm `keyIndex` map để track current key index per proxy
- [x] 1.3 Thêm endpoint `GET /reload` để trigger reload bindings từ database
- [x] 1.4 Thêm background goroutine reload bindings mỗi 30s
- [ ] 1.5 Test round-robin hoạt động đúng với multiple keys

## 2. Backend - Extend Binding API
- [x] 2.1 Mở rộng `bindKeySchema` cho priority 1-10 (thay vì chỉ 1-2)
- [x] 2.2 Thêm endpoint `PATCH /admin/proxies/:id/keys/:keyId` để update priority
- [x] 2.3 Thêm endpoint `GET /admin/proxies/bindings` để list tất cả bindings (overview)
- [ ] 2.4 Thêm bulk operations: bind multiple keys to proxy (skipped - not required)

## 3. Frontend - Admin Bindings Page
- [x] 3.1 Tạo trang `/admin/bindings/page.tsx` với overview tất cả proxy-key bindings
- [x] 3.2 UI hiển thị dạng bảng: Proxy | Keys (sorted by priority) | Actions
- [x] 3.3 Modal để add/edit binding với priority selector (1-10)
- [ ] 3.4 Drag-drop để thay đổi priority order (optional - skipped)
- [x] 3.5 Thêm menu "Key Bindings" vào admin sidebar
- [x] 3.6 Nút "Reload GoProxy" để trigger hot reload

## 4. Testing & Documentation
- [ ] 4.1 Test end-to-end: thay đổi bindings → verify goproxy picks up changes
- [ ] 4.2 Test round-robin: 3 keys → verify requests rotate qua cả 3
- [ ] 4.3 Update README nếu cần
