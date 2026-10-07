GrottoWorks Mobile

Ứng dụng di động cho **Tình nguyện viên (volunteer)** trong hệ thống GrottoWorks —
điều hành hang đá & cảnh tuyển Giáng sinh của giáo xứ.

Xây dựng bằng **Expo (SDK 57) + React Native + TypeScript + React Navigation**,
đồng bộ design token, domain types và i18n với webapp (`../grottoworks`).

## Tính năng (theo nghiệp vụ TNV)

| Tab | Chức năng |
| --- | --- |
| **Nhiệm vụ** | 2 sub-tab: **Việc của tôi** (lọc chờ/đang làm/xong, chi tiết, **nhận / từ chối kèm lý do**, gửi duyệt hoàn thành) và **Đang tuyển** (task mở đăng ký, sắp theo độ khớp kỹ năng, **gửi đơn đăng ký** + **rút đơn**) |
| **Chấm công** | **Lịch tháng** đánh dấu ngày có giờ công / có việc đến hạn; chọn ngày xem giờ công + việc cần làm; chấm công vào/ra ca, yêu cầu chỉnh giờ |
| **Trang chủ** (giữa) | **Giờ công tuần (nổi bật)**, lời mời đang chờ, đơn đăng ký của tôi, gợi ý nhiệm vụ đang tuyển, nhiệm vụ đang làm |
| **Thông báo** | Hoạt động liên quan tới TNV (mời phân công, **kết quả đăng ký**, ghi giờ…) |
| **Hồ sơ** | **Chế độ xem** (avatar theo màu riêng, tên/email, điểm & giờ công, kỹ năng, lịch rảnh, **thông tin phiên bản**) → nút **Chỉnh sửa** mở trang phụ để cập nhật kỹ năng/lịch rảnh; đăng xuất |

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
npm start            # khởi động Metro dev server
```

Sau đó:

- **Trên điện thoại:** mở **Expo Go** và quét mã QR hiện trong terminal.
- **Trên emulator:** nhấn `a` (Android) hoặc `i` (iOS, cần macOS).

## Tài khoản demo

Mật khẩu chung: **`grotto`**

| Email | Vai trò |
| --- | --- |
| `volunteer@grottoworks.vn` | TNV Gioan Bùi Văn Hùng — có 1 lời mời (PENDING), 2 việc đang làm, 1 việc đã từ chối |
| `volunteer2@grottoworks.vn` | TNV Agnês Trần Ngọc Anh |

## Kiểm tra chất lượng

```bash
npm run typecheck    # tsc --noEmit
npm run doctor       # kiểm tra cấu hình Expo
```

## Cấu trúc thư mục

```
src/
├── api/          # tầng dữ liệu mock (thay MSW) + React Query hooks
├── auth/         # AuthContext — phiên đăng nhập (AsyncStorage)
├── components/   # UI dùng chung (Button, Card, StatusTag, Calendar, Toast, Screen…)
├── features/     # theo vai trò: auth/ (login), volunteer/ (màn TNV)
├── lib/          # i18n, format
├── locales/      # vi.json (mặc định) + en.json
├── mocks/        # seed dữ liệu mẫu + mock DB (đồng bộ với webapp)
├── navigation/   # Root stack, tabs (5 tab, Home giữa), tasks stack + types
├── theme/        # design tokens Golden Winter
└── types/        # domain model (đồng bộ webapp)
```

## Ghi chú kỹ thuật

- **Dữ liệu:** app chạy **offline** với tầng mock trong `src/api` (seed ở
  `src/mocks`), persist thay đổi vào AsyncStorage. Khi có backend thật, chỉ cần
  thay ruột các hàm trong `src/api/index.ts` sang `fetch`.
- **Navigation:** React Navigation v7 (native-stack + bottom-tabs), không dùng
  Expo Router (theo yêu cầu).
- **i18n:** mặc định tiếng Việt, fallback tiếng Anh — dùng chung khoá với web.
- **Nghiệp vụ phân công:** logic `assignees` ⇄ `assignments` (PENDING/ACCEPTED/
  DECLINED) là **lời mời leader → TNV**; `VolunteerReg` (PENDING/APPROVED/
  REJECTED) là **đơn TNV → leader**. Cả hai ở `src/types/index.ts`.
- **Mở rộng backend:** để nối backend thật, thay ruột `src/api/index.ts` — giữ
  nguyên `VolunteerReg`/`TaskAssignment` và các hook trong `src/api/hooks.ts`.
