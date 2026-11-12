GrottoWorks Mobile

Ứng dụng di động cho **Tình nguyện viên (volunteer)** trong hệ thống GrottoWorks —
điều hành hang đá & cảnh tuyển Giáng sinh của giáo xứ.

Xây dựng bằng **Expo (SDK 58) + React Native + TypeScript + React Navigation**,
đồng bộ design token, domain types và i18n với webapp (`../grottoworks`).

## Tính năng (theo nghiệp vụ TNV)

| Tab | Chức năng |
| --- | --- |
| **Nhiệm vụ** | 2 sub-tab: **Việc của tôi** (lọc chờ/đang làm/xong, chi tiết, **nhận / từ chối kèm lý do**, gửi duyệt hoàn thành, **xem lớp mô hình 3D gắn với nhiệm vụ**) và **Đang tuyển** (task mở đăng ký, sắp theo độ khớp kỹ năng, **gửi đơn đăng ký**, lọc **Khu vực của tôi** / **Khu vực khác** trong giáo xứ) |
| **Giờ đóng góp** | **Lịch tháng** đánh dấu ngày có giờ đóng góp / có việc đến hạn; chọn ngày xem giờ đóng góp + việc cần làm; **xin vào ca / kết thúc ca** (BE `check-in-requests` → trưởng khu duyệt), yêu cầu chỉnh giờ |
| **Trang chủ** | **Giờ đóng góp tuần (nổi bật)**, lời mời đang chờ, đơn đăng ký của tôi, gợi ý nhiệm vụ đang tuyển, nhiệm vụ đang làm |
| **Thông báo** | Thông báo in-app của TNV (mời phân công, **kết quả đăng ký**, ghi giờ…) |
| **Hồ sơ** | **Chế độ xem** (avatar theo màu riêng, tên/email, điểm & giờ đóng góp, kỹ năng, thời gian rảnh, **thông tin phiên bản**) → nút **Chỉnh sửa** mở trang phụ để cập nhật hồ sơ/kỹ năng/thời gian rảnh; đăng xuất |

## Flow đăng ký tình nguyện (TNV chủ động)

Mobile là **phía TNV** của flow "tự đăng ký task". Phía Leader duyệt nằm ở webapp
(`grottoworks/src/features/volunteerRegs/`) — webapp hiện chưa có role TNV, nên
nửa đầu của flow (xem task đang tuyển + gửi đơn) là **feature mới, nằm ở mobile**.

```
TNV xem "Đang tuyển" ──► gửi đăng ký (VolunteerReg PENDING)
        ▲                        │
        │                        ▼
   kết quả hiển thị ở    Leader kiểm tra kỹ năng, lịch, số chỗ
   tab Đang tuyển +              │
   Trang chủ + Thông báo         ▼
                        Duyệt (APPROVED) / Từ chối (REJECTED)
                                 │
                                 ▼
                    APPROVED → TNV vào task.assignees (đã tham gia)
```

- **`VolunteerReg`** (`PENDING` / `APPROVED` / `REJECTED`) = **đơn TNV gửi lên**.
- **`TaskAssignment`** (`PENDING` / `ACCEPTED` / `DECLINED`) = **lời mời leader gửi xuống**.
  Hai khái niệm này **tách biệt** — xem `src/types/index.ts`.
- Sau khi leader duyệt, TNV **đã tham gia** (nằm trong `assignees`), không phải
  bấm "Nhận việc" lại.

## Yêu cầu môi trường

- Node.js 18+ (đang phát triển trên v22)
- Điện thoại cài **Expo Go** (App Store / Google Play), hoặc emulator Android/iOS

## Cài đặt & chạy

```bash
cd grottoworks_mobile
npm install          # nếu chưa cài
cp .env.example .env # cấu hình theo máy (không commit)
npm start            # khởi động Metro dev server
```

Sau đó:

- **Trên điện thoại:** mở **Expo Go** và quét mã QR hiện trong terminal.
- **Trên emulator:** nhấn `a` (Android) hoặc `i` (iOS, cần macOS).
- **Trên web (xem nhanh):** `npm run web` (mặc định cổng 8081).

### Biến môi trường (`.env`)

Mọi cấu hình theo máy nằm trong `.env` (không commit — mẫu ở `.env.example`).
Expo chỉ nhúng các biến có tiền tố `EXPO_PUBLIC_`; **sửa env phải restart Metro
với `-c`** (`npx expo start -c`) để xoá cache.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `EXPO_PUBLIC_GATEWAY_PORT` | `6102` | Cổng Gateway dùng khi tự suy ra base URL (web / emulator / IP LAN của Metro). |
| `EXPO_PUBLIC_API_URL` | *(trống)* | Base URL đầy đủ, ghi đè hoàn toàn cách suy ra ở trên (vd `http://192.168.1.10:6102/api/v1`). |
| `EXPO_PUBLIC_DEMO_PASSWORD` | *(trống)* | Mật khẩu tài khoản seed để gợi ý ở màn đăng nhập. Trống ⇒ ẩn khối gợi ý. |
| `EXPO_PUBLIC_DEMO_EMAILS` | 2 email seed | Danh sách email gợi ý, phân tách bằng dấu phẩy. |
| `EXPO_PUBLIC_LOGIN_BG_URL` | *(trống)* | Ảnh nền màn đăng nhập; trống ⇒ dùng ảnh mặc định trong code. |

### Backend (API Gateway)

App gọi API thật qua Gateway `http://localhost:6102/api/v1` (bật bằng
`docker compose up -d` trong `GrottoWorks_BE`). **Không còn chế độ mock/offline**:
Gateway tắt thì app báo lỗi mất kết nối thay vì hiện dữ liệu mẫu.

- **Web:** dùng `localhost:6102` — nhớ thêm origin của Expo (`localhost:8081`,
  `localhost:8082`) vào `Cors:AllowedOrigins` của Gateway (đã có trong
  `appsettings.Development.json`), nếu không trình duyệt sẽ chặn request.
- **Điện thoại / emulator:** app tự lấy IP LAN của máy đang chạy Metro
  (`Constants.expoConfig.hostUri`) rồi trỏ tới cổng 6102 của máy đó — điện thoại
  và máy tính phải cùng một mạng LAN.
- **Khác mạng / BE ở máy khác:** chỉ định rõ base URL trong `.env`
  (`EXPO_PUBLIC_API_URL=http://192.168.1.10:6102/api/v1`) hoặc inline:

  ```bash
  EXPO_PUBLIC_API_URL=http://192.168.1.10:6102/api/v1 npx expo start
  ```

## Tài khoản demo

Mật khẩu chung: **`GxThanhTam@2026`** (khớp seed BE, đặt qua `EXPO_PUBLIC_DEMO_PASSWORD` trong `.env`).

| Email | Vai trò |
| --- | --- |
| `tram.do@giaoxuthanhtam.org.vn` | TNV — tài khoản seed của BE |
| `bao.huynh@giaoxuthanhtam.org.vn` | TNV — tài khoản seed của BE |

Các vai trò khác (ADMIN/PARISH/LEADER/MO) dùng trên webapp — xem `ACCOUNTS.md`.
Đơn đăng ký đã gửi được nhớ cục bộ (`src/api/applicationsCache.ts`) vì BE chưa có
API liệt kê/huỷ đơn của TNV.

## Kiểm tra chất lượng

```bash
npm run typecheck    # tsc --noEmit
npm run doctor       # kiểm tra cấu hình Expo
```

## Cấu trúc thư mục

```
src/
├── api/          # gọi BE thật (client + real.ts + hooks) + cache đơn đăng ký
├── auth/         # AuthContext — phiên đăng nhập (AsyncStorage)
├── components/   # UI dùng chung (Button, Card, StatusTag, Calendar, Toast, Screen…)
├── features/     # theo vai trò: auth/ (login), volunteer/ (màn TNV + TaskModelScreen)
├── lib/          # i18n, format, notificationTray (đẩy thông báo ra khay hệ điều hành)
├── locales/      # vi.json (mặc định) + en.json
├── navigation/   # Root stack, tabs (5 tab: Nhiệm vụ · Giờ · Trang chủ · Thông báo · Hồ sơ), tasks/profile stack + types
├── notifications/ # NotificationBridge — poll /notifications → phát notification ra khay
├── theme/        # design tokens Golden Winter
└── types/        # domain model (đồng bộ webapp)
```

## Thông báo trên khay hệ điều hành

- Khi đã đăng nhập, `NotificationBridge` (`src/notifications/NotificationBridge.tsx`) poll
  `GET /api/v1/notifications` mỗi 60s (và refetch khi app quay lại foreground). Thông báo
  **chưa đọc** chưa từng hiện sẽ được phát bằng `expo-notifications` → hiện trong khay
  thông báo của Android/iOS kèm badge số chưa đọc.
- Lần đầu mở app sẽ **không** dội lại thông báo cũ: mốc thời gian lấy lúc khởi động +
  danh sách id đã phát lưu ở `AsyncStorage` (`grotto:tray-notified`).
- Tôn trọng `pushEnabled` trong “Tuỳ chọn thông báo” (`/users/me/notification-preferences`).
- Hạn chế hiện tại: **chưa có push server** — app phải đang chạy (kể cả nền) để phát;
  nếu OS kill app thì không có thông báo. Khi BE có endpoint lưu Expo push token và
  gửi qua Expo Push API thì chỉ cần đổi phần gửi, UI/khay giữ nguyên.
- Kiểm thử tay: đăng nhập TNV → mở app → nhờ leader duyệt/đóng phiên trên web → trong
  ≤ 60s (hoặc khi đưa app về foreground) notification hiện ở khay.

## Ghi chú kỹ thuật

- **Dữ liệu:** app gọi **BE thật** cho toàn bộ domain TNV (auth, hồ sơ, khu vực, nhiệm vụ,
  phân công, ứng tuyển, chấm công, vật tư, quyên góp, thông báo, điểm). Không còn
  mock/seed trong `src/`; chỉ đơn đăng ký đã gửi được cache cục bộ vì BE chưa có API
  liệt kê/huỷ đơn của TNV.
- **Navigation:** React Navigation v7 (native-stack + bottom-tabs), không dùng
  Expo Router (theo yêu cầu).
- **i18n:** mặc định tiếng Việt, fallback tiếng Anh — dùng chung khoá với web.
- **Nghiệp vụ phân công:** logic `assignees` ⇄ `assignments` (PENDING/ACCEPTED/
  DECLINED) là **lời mời leader → TNV**; `VolunteerReg` (PENDING/APPROVED/
  REJECTED) là **đơn TNV → leader**. Cả hai ở `src/types/index.ts`.
- **Lọc khu vực khi tìm việc:** sub-tab "Đang tuyển" lọc **Khu vực của tôi** (khu thuộc cộng đoàn của tôi + khu tôi đã có việc) và **Khu vực khác** (cùng giáo xứ) — dùng `GET /seasons/{id}/work-areas` để map `areaId → communityId`.
- **Mô hình 3D của TNV:** màn `TaskModelScreen` chỉ hiển thị **(các) lớp có `taskIds` chứa nhiệm vụ đã nhận** (WebView + canvas 2D, scene mock trong `features/volunteer/mockScene.ts`) vì BE chưa có `GET /work-areas/{id}/design-scene` — xem `GrottoWorks_BE/docs/BE-TODO-demo-2026-11-10.md` §3.
- **Mở rộng backend:** thêm hàm trong `src/api/real.ts` rồi export qua `src/api/index.ts` — giữ nguyên `VolunteerReg`/`TaskAssignment` và các hook trong `src/api/hooks.ts`.
- **Vào ca / bắt đầu việc:** TNV bấm **Bắt đầu làm việc** (chi tiết nhiệm vụ) →
  `POST /task-assignments/{assignmentId}/attendance/check-in-requests` (kèm
  `Idempotency-Key`, `assignmentId` tra từ `GET /users/me/assignments`). BE tạo
  **đơn PENDING**; task chỉ chuyển `IN_PROGRESS` sau khi trưởng khu duyệt
  (`POST /attendance-requests/{id}/approve`). Vì vậy app đọc thêm
  `GET /users/me/attendance-requests` để hiển thị nhãn **"Chờ duyệt vào ca"**
  (kèm nút huỷ đơn `POST /attendance-requests/{id}/cancel`) và **"Đang trong ca"**
  — trạng thái *của việc* (`Chưa bắt đầu`/`Đang làm`) vẫn lấy từ BE. Kết thúc ca
  dùng `POST .../attendance/check-out` với `If-Match` version của phiên.
- **Làm mới dữ liệu:** kéo xuống để làm mới ở Trang chủ / Nhiệm vụ / Giờ đóng góp /
  Chi tiết nhiệm vụ (`RefreshControl` + `useRefreshControl`), đồng thời app tự
  refetch khi quay lại foreground (`focusManager` gắn `AppState` trong `App.tsx`).
- **Nộp duyệt hoàn thành (ảnh minh chứng):** upload 3 bước lên MinIO
  (`POST /files/upload-requests` → `PUT <presigned>` → `POST /files/{id}/complete`)
  rồi `POST /tasks/{id}/submit|resubmit`. Yêu cầu:
  - content type lấy từ **file thật** (web: `Blob.type`, native: `File.type`) — không
    đoán theo đuôi URI (`blob:` URL không có đuôi → BE trả `FILE_CONTENT_TYPE_MISMATCH`);
  - MinIO phải cho CORS origin của app (`MINIO_API_CORS_ALLOW_ORIGIN`);
  - điện thoại phải trỏ tới MinIO bằng IP LAN (`MINIO_PUBLIC_ENDPOINT`), vì presigned
    URL mặc định là `localhost:9000`. Lỗi upload hiện ngay trong modal, không im lặng.
