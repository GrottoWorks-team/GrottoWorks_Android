// Đưa thông báo của app ra KHAY THÔNG BÁO CỦA HỆ ĐIỀU HÀNH (Android/iOS).
//
// Bối cảnh: BE chưa có push server (chưa có endpoint lưu Expo push token và chưa
// bắn qua Expo Push API). Trong khi chờ, app tự theo dõi `GET /notifications`
// (xem `NotificationBridge`) rồi phát **notification cục bộ** — thông báo vẫn
// hiện trong khay hệ điều hành kể cả khi người dùng đã rời app, và vẫn còn đó
// khi mở lại. Khi BE có push thật: thay `presentInTray` bằng token đăng ký với
// BE (`expo-notifications` + `getExpoPushTokenAsync`) — phần hiển thị/khay giữ nguyên.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

export const ANDROID_CHANNEL_ID = 'grottoworks-default';

/** Bắt buộc gọi 1 lần khi app khởi động: quyết định notification có hiện banner/khay hay không. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android cần channel trước khi phát notification, nếu không thông báo bị rơi im lặng. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'GrottoWorks',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0A5C36',
  });
}

/** Xin quyền hiện thông báo; trả `false` nếu người dùng từ chối hoặc nền tảng không hỗ trợ. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

export interface TrayNotification {
  id: string;
  title: string;
  body: string;
}

/** Phát notification ngay (trigger null) → hiện ở khay/banner của hệ điều hành. */
export async function presentInTray(item: TrayNotification): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.body,
      sound: 'default',
      data: { notificationId: item.id },
    },
    trigger: null,
  });
}

/** Số trên icon app (iOS + Android launcher hỗ trợ). */
export async function setTrayBadge(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Một số launcher không hỗ trợ badge — bỏ qua.
  }
}
