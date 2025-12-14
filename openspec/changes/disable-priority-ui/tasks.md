## 1. Dashboard Page Changes
- [x] 1.1 Ẩn Priority Endpoint section trong API Key card (`dashboard/page.tsx:341-360`)
- [x] 1.2 Giữ state `priorityProviderCopied` và hàm `handleCopyPriorityProvider` (commented code vẫn reference)
- [x] 1.3 Ẩn tab filter "Priority" trong Request Logs section (`dashboard/page.tsx:639-649`)

## 2. Dashboard Models Page Changes
- [x] 2.1 Ẩn badge "Priority Only" trên các model có `isPriority: true` (`dashboard-models/page.tsx:454-464`)
- [x] 2.2 Ẩn badge "+Priority" trên các model có `priorityMultiplier` nhưng không phải isPriority (`dashboard-models/page.tsx:465-475`)
- [x] 2.3 Ẩn dòng "Hỗ trợ Priority Endpoint" trong model card footer (`dashboard-models/page.tsx:526-535`)
- [x] 2.4 Ẩn stat card "Other" trong Stats Cards grid (`dashboard-models/page.tsx:360-372`)
- [x] 2.5 Ẩn filter tab "Other" trong Filter Tabs section (`dashboard-models/page.tsx:417-426`)
- [x] 2.6 Filter out các model có type=openhands khỏi danh sách hiển thị

## 3. Validation
- [ ] 3.1 Test dashboard page hiển thị đúng sau thay đổi
- [ ] 3.2 Test dashboard-models page hiển thị đúng, filter tabs hoạt động
- [ ] 3.3 Đảm bảo không có broken references hoặc unused imports
