# CreditsNew Management Page

## Trang mới đã được tạo thành công! ✅

### 📍 URL để truy cập:
```
http://localhost:8080/users-new
```

### 🎯 Tính năng:
- ✅ Xem danh sách tất cả users
- ✅ Hiển thị **CreditsNew** (OpenHands credits)
- ✅ Hiển thị **TokensUserNew** (đã sử dụng)
- ✅ **SET creditsNew** - Đặt giá trị tuyệt đối
- ✅ **ADD creditsNew** - Cộng thêm credits
- ✅ **Reset Expiration** - Đặt lại thời hạn 7 ngày
- ✅ Search users
- ✅ Filter by role (Admin/User)
- ✅ Filter by status (Active/Inactive)
- ✅ Sort by columns

### 🔑 Yêu cầu:
- **Admin role** - Chỉ admin mới truy cập được
- JWT token hợp lệ

### 📊 So sánh 2 trang:

| Tính năng | `/users` (Trang cũ) | `/users-new` (Trang mới) |
|-----------|---------------------|---------------------------|
| Quản lý | `credits` (OhMyGPT) | `creditsNew` (OpenHands) |
| Port | 8005 | 8004 |
| Màu theme | Indigo/Blue | Purple/Violet |
| SET endpoint | `/admin/users/:username/credits` | `/admin/users/:username/creditsNew` |
| ADD endpoint | `/admin/users/:username/credits/add` | `/admin/users/:username/creditsNew/add` |
| Hiển thị | credits, refCredits, creditsBurned | creditsNew, tokensUserNew |

### 🚀 Cách sử dụng:

#### 1. Truy cập trang
```
1. Mở browser
2. Đăng nhập với admin account
3. Vào: http://localhost:8080/users-new
```

#### 2. SET CreditsNew
```
1. Tìm user cần sửa
2. Nhập số tiền vào ô input màu vàng (SET)
3. Click button "SET"
4. Chọn "Reset Expiration" nếu cần đặt lại hạn 7 ngày
5. Click "Set CreditsNew" để confirm
```

#### 3. ADD CreditsNew
```
1. Tìm user cần cộng credits
2. Nhập số tiền vào ô input màu xanh (ADD)
3. Click button "ADD"
4. Chọn "Reset Expiration" nếu cần đặt lại hạn 7 ngày
5. Click "Add CreditsNew" để confirm
```

### 🎨 Giao diện:
- **Theme màu tím (Purple)** - Khác với trang `/users` màu xanh
- **Responsive** - Hoạt động tốt trên mobile và desktop
- **Dark mode** - Hỗ trợ chế độ tối
- **Sortable columns** - Click vào header để sắp xếp
- **Search bar** - Tìm kiếm users
- **Filter buttons** - Lọc theo role và status

### 📝 API Endpoints được sử dụng:
```typescript
// Backend API
PATCH /api/admin/users/:username/creditsNew
POST /api/admin/users/:username/creditsNew/add

// Frontend API functions
updateUserCreditsNew(username, creditsNew, resetExpiration)
addUserCreditsNew(username, amount, resetExpiration)
```

### 🔧 Files đã tạo:
1. `frontend/src/app/(dashboard)/users-new/layout.tsx` - Layout với AdminGuard
2. `frontend/src/app/(dashboard)/users-new/page.tsx` - Page component chính
3. `frontend/src/lib/api.ts` - Thêm 2 API functions mới

### ✅ Testing:
1. Backend API đã implement ✅
2. Frontend page đã tạo ✅
3. API functions đã thêm ✅
4. Ready to use ✅

### 🎯 Production URL (khi deploy):
```
https://trollllm.xyz/users-new
```

---

## 💡 Lưu ý:

1. **URL trực tiếp**: Vì chưa có navigation bar, bạn phải gõ URL trực tiếp vào browser
2. **Admin only**: Chỉ admin account mới truy cập được
3. **Backend phải chạy**: Backend server phải đang chạy ở port 3005
4. **Database**: Tất cả thay đổi sẽ lưu vào MongoDB collection `usersNew`

## 🔗 Quick Links:

- Trang quản lý Credits (OhMyGPT): `http://localhost:8080/users`
- Trang quản lý CreditsNew (OpenHands): `http://localhost:8080/users-new` ⭐ **MỚI**
- Dashboard: `http://localhost:8080/dashboard`
- Admin Dashboard: `http://localhost:8080/admin`

---

**Trang đã sẵn sàng sử dụng!** 🎉
