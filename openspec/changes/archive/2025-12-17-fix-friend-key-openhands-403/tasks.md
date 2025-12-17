## 1. Investigation
- [ ] 1.1 Kiểm tra logs để xác định error message cụ thể user nhận được
- [ ] 1.2 Kiểm tra Friend Key owner's plan (free tier hay paid?)
- [ ] 1.3 Kiểm tra OpenHands pool status (số keys active, exhausted keys)
- [ ] 1.4 Reproduce lỗi với test Friend Key
- [ ] 1.5 **Kiểm tra `usersNew` collection**: Verify owner tồn tại và có đúng `plan` field

## 2. Diagnosis
- [ ] 2.1 Nếu error là "Friend Key owner must upgrade plan" → Kiểm tra `plan` field trong `usersNew`
- [ ] 2.2 Nếu error là "Access denied" → OpenHands keys exhausted, cần thêm keys
- [ ] 2.3 **Nếu owner không có trong `usersNew`** → Data migration issue
- [ ] 2.4 **Nếu `plan` field trong `usersNew` là empty/"free"** → Data sync issue từ collection migration

## 3. Fix Implementation (dựa trên diagnosis)
- [ ] 3.1 **Case: Owner Free Tier / Empty Plan** - Update `plan` field trong `usersNew` cho owner
- [ ] 3.2 **Case: Owner not in `usersNew`** - Migrate user data từ collection cũ sang `usersNew`
- [ ] 3.3 **Case: OpenHands 403** - Cải thiện key rotation logic hoặc thêm keys
- [ ] 3.4 **Case: Other** - Fix tùy theo nguyên nhân cụ thể

## 4. Data Verification Queries
```javascript
// 1. Find Friend Key
db.friend_keys.findOne({_id: "<friend-key-id>"})

// 2. Check owner in usersNew (use ownerId from step 1)
db.usersNew.findOne({_id: "<ownerId>"}, {plan: 1, isActive: 1, credits: 1, refCredits: 1})

// 3. If owner not found in usersNew, check old users collection
db.users.findOne({_id: "<ownerId>"})

// 4. Check all Friend Keys with their owners
db.friend_keys.aggregate([
  {$lookup: {from: "usersNew", localField: "ownerId", foreignField: "_id", as: "owner"}},
  {$match: {"owner.plan": {$in: ["", "free", null]}}},
  {$project: {_id: 1, ownerId: 1, "owner.plan": 1}}
])
```

## 5. Improvements
- [ ] 5.1 Thêm detailed logging cho Friend Key + OpenHands requests
- [ ] 5.2 Cải thiện error messages để user biết nguyên nhân cụ thể
- [ ] 5.3 Test Friend Key flow end-to-end với OpenHands upstream

## 6. Validation
- [ ] 6.1 Test Friend Key với OpenHands models thành công
- [ ] 6.2 Verify error messages rõ ràng và actionable
- [ ] 6.3 Kiểm tra không có regression với các flows khác
