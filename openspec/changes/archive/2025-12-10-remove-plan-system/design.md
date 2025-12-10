## Context
Hệ thống hiện tại có 2 cơ chế kiểm soát quyền truy cập API:
1. **Plan-based**: free/dev/pro/pro-troll với các giới hạn khác nhau (RPM, credits ban đầu)
2. **Credits-based**: Kiểm tra credits > 0 hoặc refCredits > 0

Việc duy trì cả 2 cơ chế tạo ra sự phức tạp không cần thiết. Yêu cầu đơn giản hóa: chỉ cần credits là đủ.

## Goals / Non-Goals
### Goals:
- Loại bỏ hoàn toàn khái niệm Plan khỏi hệ thống
- Đơn giản hóa logic xác thực: có credits = có quyền truy cập
- Giữ nguyên cơ chế referral credits
- Giữ nguyên cơ chế credit deduction per request
- RPM mặc định cho tất cả users (300 RPM)

### Non-Goals:
- Không thay đổi cách tính giá model pricing
- Không thay đổi cơ chế payment webhook
- Không xóa dữ liệu credits hiện có của users

## Decisions
### Decision 1: Loại bỏ plan field
- Remove `plan` field từ IUser, IUserNew interfaces
- Remove `planStartDate`, `planExpiresAt` fields
- Tất cả users chỉ cần credits > 0 để truy cập API

### Decision 2: RPM mặc định
- Tất cả users có credits sẽ có RPM = 300 (hiện tại là DefaultUserRPM trong goproxy)
- Không còn phân biệt RPM theo plan

### Decision 3: Payment flow đơn giản
- Payment chỉ add credits trực tiếp, không thay đổi plan
- Loại bỏ plan selection trong checkout UI
- Giữ nguyên các gói credits (có thể cấu hình số credits nhận được)

### Decision 4: Admin UI
- Loại bỏ plan dropdown trong admin user management
- Chỉ hiển thị và edit credits/refCredits

## Alternatives Considered
1. **Giữ plan nhưng ẩn khỏi UI**: Phức tạp, không giải quyết vấn đề cốt lõi
2. **Chuyển plan thành "tier" dựa trên credits**: Không cần thiết, chỉ thêm logic

## Risks / Trade-offs
- **Risk**: Users hiện có plan nhưng 0 credits sẽ mất quyền truy cập
  - **Mitigation**: Admin cần review và cấp credits trước khi deploy
- **Risk**: Breaking change cho admin workflows
  - **Mitigation**: Cập nhật documentation và UI

## Migration Plan
1. Thêm credits cho users có plan != 'free' nhưng credits = 0
2. Deploy code changes
3. Remove plan fields từ database schema (optional cleanup)

## Open Questions
- Có cần thiết xóa plan fields khỏi database hay chỉ ignore trong code?
