# Tóm tắt Đề xuất: Thêm Endpoints Quản lý CreditsNew cho Admin

## 📋 Tổng quan
Đề xuất này thêm 2 API endpoint mới cho admin để quản lý `creditsNew` (credits OpenHands), giống như các endpoint hiện tại đang quản lý `credits` (credits OhMyGPT).

## 🎯 Mục đích
Hiện tại admin có thể quản lý `credits` (OhMyGPT) thông qua:
- `PATCH /admin/users/:username/credits` - đặt giá trị tuyệt đối
- `POST /admin/users/:username/credits/add` - cộng thêm credits

**Nhưng chưa có endpoint tương tự cho `creditsNew` (OpenHands).**

## ✨ Giải pháp đề xuất

### 1. **PATCH /admin/users/:username/creditsNew**
Đặt giá trị `creditsNew` tuyệt đối cho user.

**Request body:**
```json
{
  "creditsNew": 100,
  "resetExpiration": true  // optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Set creditsNew to $100 for alice",
  "user": {
    "username": "alice",
    "creditsNew": 100,
    "expiresAt": "2026-01-18T10:00:00.000Z"
  }
}
```

### 2. **POST /admin/users/:username/creditsNew/add**
Cộng thêm credits vào `creditsNew` hiện tại.

**Request body:**
```json
{
  "amount": 25,
  "resetExpiration": false  // optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added $25 creditsNew to bob",
  "user": {
    "username": "bob",
    "creditsNew": 125,  // 100 + 25
    "expiresAt": "2026-01-15T10:00:00.000Z"  // không đổi vì resetExpiration: false
  }
}
```

## 🔐 Bảo mật
- Cả 2 endpoint đều yêu cầu quyền admin (`requireAdmin` middleware)
- Validate input:
  - `creditsNew` phải là số không âm (>= 0)
  - `amount` phải là số dương (> 0)
- Trả về lỗi 400 nếu input không hợp lệ
- Trả về lỗi 404 nếu user không tồn tại

## 📦 Các file cần thay đổi

### Backend
1. **`backend/src/repositories/user.repository.ts`**
   - Thêm method `setCreditsNew(username, creditsNew, resetExpiration)`
   - Thêm method `addCreditsNew(username, amount, resetExpiration)`

2. **`backend/src/routes/admin.routes.ts`**
   - Thêm route `PATCH /users/:username/creditsNew`
   - Thêm route `POST /users/:username/creditsNew/add`

### Database
- **Không cần thay đổi schema**, field `creditsNew` đã tồn tại trong collection `usersNew`

## ✅ Tiêu chí thành công
- [x] Admin có thể set `creditsNew` qua `PATCH /admin/users/:username/creditsNew`
- [x] Admin có thể add `creditsNew` qua `POST /admin/users/:username/creditsNew/add`
- [x] Validate input đúng, trả về lỗi 400 nếu sai
- [x] Chỉ admin mới có quyền sử dụng (401/403 nếu không phải admin)
- [x] Response trả về đầy đủ thông tin: username, creditsNew, expiresAt
- [x] Logic expiration giống hệt endpoint `credits` hiện tại

## 🕐 Thời gian ước tính
- Implementation: 1-2 giờ
- Testing: 30 phút
- **Tổng cộng: 2-3 giờ**

## 📝 Ghi chú về `resetExpiration`

### Khi `resetExpiration: true` (mặc định)
- `expiresAt` được đặt lại thành **7 ngày kể từ bây giờ**
- `purchasedAt` được đặt thành thời điểm hiện tại
- Tương tự như khi user mua credits mới

### Khi `resetExpiration: false`
- `expiresAt` **không thay đổi**
- `purchasedAt` **không thay đổi**
- Chỉ cập nhật giá trị `creditsNew`

## 🔗 Liên quan đến các thay đổi khác
- `display-creditsnew-dashboard` - hiển thị creditsNew trên dashboard
- `fix-billing-routing-main-target` - routing billing logic
- `configure-dual-domain-deployment` - cấu hình dual domain

## 📚 File OpenSpec đã tạo
✅ `openspec/changes/add-creditsnew-admin-management/proposal.md`
✅ `openspec/changes/add-creditsnew-admin-management/design.md`
✅ `openspec/changes/add-creditsnew-admin-management/tasks.md`
✅ `openspec/changes/add-creditsnew-admin-management/specs/admin-creditsnew-endpoints/spec.md`

## ✨ Validation
```bash
openspec validate add-creditsnew-admin-management --strict
# ✅ Change 'add-creditsnew-admin-management' is valid
```

---

## 🚀 Bước tiếp theo
1. Review proposal này
2. Nếu đồng ý, implement theo `tasks.md`
3. Test thủ công với curl/Postman
4. Deploy lên production
5. (Optional) Cập nhật admin UI để hiển thị controls cho creditsNew
