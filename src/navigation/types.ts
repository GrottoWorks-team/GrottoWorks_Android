// Định nghĩa route params cho toàn app — dùng cho typed navigation.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

// 5 tab, Trang chủ nằm chính giữa: Nhiệm vụ · Giờ đóng góp · Trang chủ · Thông báo · Hồ sơ.
// Tab Nhiệm vụ chứa stack lồng → khai báo NavigatorScreenParams để điều hướng
// tới TaskDetail/OpenDetail từ tab khác (ví dụ Trang chủ).
export type MainTabParamList = {
  Tasks: NavigatorScreenParams<TasksStackParamList>;
  Timesheets: undefined;
  Home: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Stack lồng trong tab Nhiệm vụ: danh sách (2 sub-tab: việc của tôi / đang
// tuyển) → chi tiết việc của mình, hoặc chi tiết việc đang tuyển (để đăng ký).
export type TasksStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  OpenDetail: { taskId: string };
};

// Stack lồng trong tab Hồ sơ: xem → chỉnh sửa / đóng góp / quyên góp / cho mượn.
export type ProfileStackParamList = {
  ProfileView: undefined;
  ProfileEdit: undefined;
  MyContributions: undefined;
  Pledge: undefined;
  LoanOffer: undefined;
};

declare global {
  namespace ReactNavigation {
    // Interface rỗng là chủ ý: phải merge vào khai báo sẵn có của React Navigation.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
