# Báo cáo gap BE ↔ Mobile (TNV) — 03/11/2026

Phạm vi: app `GrottoWokrs_Mobile` (Expo, vai trò VOLUNTEER) đối chiếu với
`GrottoWorks_Phan_Tich_Nghiep_Vu_Chi_Tiet_v1.2.md` §4.6 (quyền của TNV trên
mobile app), §8.2–8.4 (phân công / giờ đóng góp / tiến độ) và §14 (thông báo).

## 1. Đã nối với BE thật

| Chức năng (tài liệu) | Endpoint | Trạng thái kiểm chứng |
|---|---|---|
| Đăng nhập | `POST /auth/login` → `GET /users/me` | 200 |
| Hồ sơ: tên/SĐT/giới thiệu/cộng đoàn (§4.6 b1) | `PATCH /users/me` | 200 (phone/communityId); 422 `PROFILE_COMMUNITY_REQUIRED` khi lưu `introduction` mà chưa có cộng đoàn |
| Kỹ năng theo danh mục (§4.6 b1) | `GET /skills`, `PUT /users/me/skills` | 200 (đã seed 7 kỹ năng) |
| Thời gian tham gia (§4.6 b1) | `PUT /users/me/availability` | 200 (UTC range, `availableTo > availableFrom`) |
| Cộng đoàn trong giáo xứ | `GET /parishes/{parishId}/communities` | 200 (2 cộng đoàn demo) |
| Mùa + khu vực công tác | `GET /seasons`, `GET /seasons/{id}/work-areas` | 200 |
| Nhiệm vụ của tôi | `GET /users/me/tasks` | 200 (0 task với tài khoản demo) |
| Chi tiết nhiệm vụ | `GET /tasks/{id}` | 200 |
| Task theo khu vực (tab “Đang tuyển”) | `GET /work-areas/{id}/tasks` | 200 (6 task ở khu vực demo) |
| Đăng ký tham gia task (§8.2) | `POST /tasks/{id}/applications` | 201; trùng → 409 `ALREADY_REGISTERED` |
| Lịch sử giờ đóng góp | `GET /users/me/attendance` | 200 |
| Điểm ghi nhận (§4.6 b11) | `GET /users/me/recognition` | 200 (`totalPoints`, `contributions`) |
| Đóng góp của tôi (§4.6 b11) | `GET /users/me/contributions` | 200 |
| Nhu cầu vật tư còn thiếu | `GET /seasons/{id}/contribution-needs` | 200 (hiện rỗng do chưa có material requirement) |
| Cho mượn dụng cụ (§4.6 b10) | `POST /loan-offers` | 422 khi thiếu trường (route tồn tại) |
| Thông báo in-app (§14) | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | 200 / 204 (hiện chưa có bản ghi) |

## 2. Gap phía BE (chưa sửa BE — chỉ ghi nhận)

### 2.1. Không lấy được `assignmentId` ⇒ chặn 3 luồng của TNV 🔴

- `TaskDto` (`GET /users/me/tasks`, `GET /tasks/{id}`) không chứa assignment.
- `GET /tasks/{taskId}/assignments` chỉ cho `LEADER`.
- `POST /task-assignments/{id}/accept|decline` và
  `POST /task-assignments/{id}/attendance/check-in-requests|check-out`
  đều bắt buộc `assignmentId` (role VOLUNTEER).

Hệ quả trên mobile: **không thể** nhận/từ chối phân công, không thể check-in/out.

Đề xuất (1 trong 3):

1. Thêm `assignmentId` + `assignmentStatus` vào `TaskDto` của `GET /users/me/tasks`.
2. Thêm `GET /api/v1/users/me/assignments` (paged) trả assignment của chính TNV.
3. Cho `GET /tasks/{taskId}/assignments` trả assignment của chính người gọi khi role VOLUNTEER.

### 2.2. Chưa có endpoint cập nhật tiến độ / nộp minh chứng (§8.4) 🔴

Tài liệu yêu cầu: nhập % hoàn thành + ghi chú + ảnh, mỗi lần là bản ghi mới,
gửi nghiệm thu → Leader approve/request revision. TaskExecution hiện chỉ có
`PATCH /tasks/{id}`, `POST /tasks/{id}/ready`, `PUT /tasks/{id}/completion-criteria`
(đều cho Leader) — **không có** endpoint cho VOLUNTEER gửi tiến độ/nghiệm thu.

Đề xuất: `POST /tasks/{taskId}/progress-updates` (percentage, note, fileIds) và
`POST /tasks/{taskId}/submit`; upload ảnh dùng NotificationAudit
(`POST /files/upload-requests` + `POST /files/{id}/complete`).

### 2.3. Gateway thiếu route pledge (§4.6 b9) 🟠

`Resource.Api` có `POST /api/v1/material-pledges` và `POST /api/v1/monetary-pledges`
(role VOLUNTEER) nhưng `ApiGateway/YarpApiGateway/appsettings.json` **không khai báo**
2 path này → gọi qua gateway trả **404**.

Đề xuất thêm 2 route (ClusterId `resource`, `AuthorizationPolicy: authenticated`):

```json
"resource-material-pledges-route": {
  "ClusterId": "resource",
  "AuthorizationPolicy": "authenticated",
  "Match": { "Path": "/api/v1/material-pledges" }
},
"resource-monetary-pledges-route": {
  "ClusterId": "resource",
  "AuthorizationPolicy": "authenticated",
  "Match": { "Path": "/api/v1/monetary-pledges" }
}
```

### 2.4. TNV không xem/huỷ được đơn đăng ký của mình (§8.2) 🟠

- `GET /tasks/{taskId}/applications` chỉ cho LEADER ⇒ TNV không biết đơn của
  mình đang `PENDING`/`APPROVED`/`REJECTED` (mobile phải lưu bản sao cục bộ).
- Không có endpoint huỷ đơn đăng ký đang `PENDING`.

Đề xuất: `GET /api/v1/users/me/applications` và
`POST /api/v1/task-applications/{id}/cancel`.

### 2.5. TNV không tạo được support request (§4.6 b2, §8.11) 🟡

`POST /api/v1/support-requests` yêu cầu role `LEADER`; tài liệu cho phép TNV
“yêu cầu hỗ trợ”. Cần mở role VOLUNTEER (hoặc endpoint riêng cho TNV).

### 2.6. Thiếu dữ liệu demo 🟡

- Danh mục kỹ năng ban đầu rỗng ⇒ đã seed 7 kỹ năng (Điện, Mộc, Hàn, Trang trí,
  Vận chuyển, Logistics, Sơn) qua `POST /skills` (admin).
- `contribution-needs` rỗng ⇒ màn Quyên góp (tab Vật tư) hiện “chưa có nhu cầu”.
  Cần seed `material-requirements` cho khu vực demo.

## 3. Hành vi tạm thời trên mobile

- Nút **Nhận/Từ chối**, **Check-in/Check-out**, **Gửi duyệt** bị ẩn khi đang dùng
  dữ liệu thật, kèm ghi chú “chờ BE bổ sung” (không giả lập thành công).
- Nút **Huỷ đơn đăng ký** ẩn khi online.
- Quyên góp báo lỗi rõ khi gateway trả 404.

## 4. Kiểm chứng

- `npm run typecheck` — sạch.
- `npm run lint` — 0 error, 0 warning.
- Các endpoint ở mục 1 đã gọi thật qua gateway `localhost:6102` bằng tài khoản
  `volunteer@grottoworks.vn`; dữ liệu test (1 đơn đăng ký) đã xoá khỏi `task_db`.

## 5. Đồng bộ từ ngữ với FE (FE là chuẩn)

Đã đối chiếu `src/locales/{vi,en}.json` của mobile với
`GrottoWorks_FE/src/locales/{vi,en}.json`. Sau khi đồng bộ, **chỉ còn 1 khoá
khác FE có chủ ý** (`notifications.sub` — nội dung feed của TNV khác feed
quản trị của FE).

Từ vựng lấy theo FE:

| Khái niệm | Từ dùng (FE) | Ghi chú |
|---|---|---|
| Task | Nhiệm vụ / việc | giữ nguyên |
| Timesheet | Giờ đóng góp (không dùng “giờ công”/“chấm công”), giờ vào/giờ ra | |
| Volunteer check-in | check-in / check-out | thay “vào ca/kết thúc đóng góp” |
| Donation | Quyên góp (danh từ), cam kết (pledge) | bỏ “đóng góp” cho nghĩa quyên góp |
| Status `PLEDGED` | Hứa tặng | |
| Status `PENDING` | Chờ duyệt | |
| Status `DRAFT` / `REJECTED` | Nháp / Từ chối | |
| Loan offer | chào cho mượn, đồ mượn, chủ cho mượn, hẹn trả | |
| Community (chọn cho user) | Giáo khu | FE dùng “Giáo khu” trong form tài khoản/TNV; “cộng đoàn” chỉ ở ngữ cảnh mùa/dashboard |
| Amount | Số tiền (VNĐ) | |
| Points | Điểm vinh danh | giữ nguyên |
| Skills | Kỹ năng cần có / Kỹ năng | giữ nguyên |

`login.demoAccounts` dùng template của FE (`{{password}}`) và màn đăng nhập
truyền `DEMO_PASSWORD` vào, không hardcode trong file dịch.

## 6. Rà soát luật nghiệp vụ (lần 2 — sau khi nối API)

Sau khi rà lại luồng nghiệp vụ so với §4.6, §8.2–8.4, §10.2–10.3, đã siết 6 điểm:

| # | Vấn đề phát hiện | Luật nghiệp vụ | Cách sửa |
|---|---|---|---|
| 1 | "Đang tuyển" gộp cả task `NOT_STARTED`/`IN_PROGRESS` | BE chỉ nhận đơn khi task `OPEN` (`EnsurePlanningCanBeUpdated` → 409 `TASK_INVALID_STATE`) | `openTasksReal` lọc theo **status gốc `OPEN`** trước khi map (dữ liệu demo: 6 → **3** task) |
| 2 | Lỗi khi nộp đơn chỉ hiện "Có lỗi xảy ra" | §8.2: hết chỗ → chặn; sai kỹ năng → chặn; task đã đóng → chặn | Dịch `code` của BE: `TASK_CAPACITY_EXCEEDED`/`TASK_SKILL_MISMATCH`/`TASK_INVALID_STATE`/`ALREADY_REGISTERED` thành 4 thông báo riêng |
| 3 | Tài khoản không phải TNV vẫn đăng nhập được | §4.6: app mobile dành cho TNV | Chặn ở `signIn` (và bỏ phiên cũ khi khôi phục): role ≠ `VOLUNTEER` → `login.notVolunteer` |
| 4 | Trang chủ luôn báo "chưa được phân công" dù BE trả task | `/users/me/tasks` chỉ trả task TNV đã có phân công | `myAssignmentStatus()`: ở chế độ thật coi là `ACCEPTED`; bộ lọc "Chờ duyệt" ẩn khi online (BE thiếu trạng thái phân công) |
| 5 | Trạng thái quyên góp sai enum | BE `DonationStatus` = `PLEDGED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED` | Sửa type + nhãn `status.*` + tone `StatusTag`, tiền dùng `vnd()` chung |
| 6 | Lưu hồ sơ có thể xoá trắng kỹ năng / 422 khi giới thiệu trống | `PUT /users/me/skills` thay thế toàn bộ; `introduction` cần cộng đoàn | Chỉ gửi `skillIds` khi danh mục có dữ liệu; chỉ gửi `introduction` khi có nội dung |

Kiểm chứng bằng API thật (mùa 2026): tổng 6 task → **3 `OPEN`** hiển thị ở
"Đang tuyển", 3 `NOT_STARTED` bị loại; nộp đơn vào `NOT_STARTED` trả
`409 TASK_INVALID_STATE` đúng như nhánh xử lý mới. `task_skill` hiện rỗng nên
nhánh `SKILL_MISMATCH` chưa kích hoạt trong dữ liệu demo (logic đã sẵn).


