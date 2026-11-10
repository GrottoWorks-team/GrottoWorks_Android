// Định nghĩa route params cho toàn app — dùng cho typed navigation.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

// 6 tab: Nhiệm vụ · Khu vực · Trang chủ · Giờ đóng góp · Thông báo · Hồ sơ.
// Tab Nhiệm vụ chứa stack lồng → khai báo NavigatorScreenParams để điều hướng
// tới TaskDetail/OpenDetail từ tab khác (ví dụ Trang chủ, Khu vực).
export type MainTabParamList = {
  Tasks: NavigatorScreenParams<TasksStackParamList>;
  Areas: NavigatorScreenParams<AreasStackParamList>;
  Timesheets: undefined;
  Home: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Stack lồng trong tab Khu vực: danh sách → chi tiết (read-only).
export type AreasStackParamList = {
  AreaList: undefined;
  AreaDetail: { areaId: string };
};

// Stack lồng trong tab Nhiệm vụ: danh sách (2 sub-tab: việc của tôi / đang
// tuyển) → chi tiết việc của mình, hoặc chi tiết việc đang tuyển (để đăng ký).
export type TasksStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  OpenDetail: { taskId: string };
  /** Mô hình 3D của khu vực (TNV xem lớp thi công gắn với nhiệm vụ đã nhận). */
  TaskModel: { taskId: string; areaId: string; areaName?: string; taskTitle?: string };
};

// Stack lồng trong tab Hồ sơ: xem → chỉnh sửa / đóng góp / quyên góp / cho mượn.
export type ProfileStackParamList = {
  ProfileView: undefined;
  ProfileEdit: undefined;
  MyContributions: undefined;
  Pledge: undefined;
  LoanOffer: undefined;
  NotificationSettings: undefined;
};

declare global {
  namespace ReactNavigation {
    // Interface rỗng là chủ ý: phải merge vào khai báo sẵn có của React Navigation.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
