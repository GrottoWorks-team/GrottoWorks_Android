// Cầu nối "thông báo trong app" → "thông báo trên điện thoại".
//
// • Chỉ chạy khi đã đăng nhập (TNV).
// • Poll `GET /notifications` mỗi 60s + refetch khi app quay lại foreground
//   (đã cấu hình `focusManager` trong App.tsx).
// • Thông báo CHƯA ĐỌC và CHƯA từng hiện sẽ được phát ra khay hệ điều hành.
// • Không phát lại thông báo cũ sau khi mở lại app: mốc thời gian lấy lúc khởi
//   động (`baselineAt`) và danh sách id đã phát được lưu ở AsyncStorage.
// • Tôn trọng tuỳ chọn `pushEnabled` trong `GET/PUT /users/me/notification-preferences`.
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { listNotifications } from '../api';
import { keys, useNotificationPreferences } from '../api/hooks';
import {
  configureNotificationHandler,
  ensureNotificationChannel,
  ensureNotificationPermission,
  presentInTray,
  setTrayBadge,
} from '../lib/notificationTray';

const SEEN_KEY = 'grotto:tray-notified';
const POLL_MS = 60_000;
const MAX_SEEN = 200;

export function NotificationBridge() {
  const { user } = useAuth();
  // Chỉ mount phần theo dõi khi đã đăng nhập (tránh gọi API 401 ở màn login).
  return user ? <NotificationWatcher /> : null;
}

function NotificationWatcher() {
  const { data: preferences } = useNotificationPreferences();
  const { data: notifications = [] } = useQuery({
    queryKey: keys.notifications,
    queryFn: listNotifications,
    refetchInterval: POLL_MS,
  });

  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);
  const baselineAt = useRef(new Date().toISOString());

  // Khởi tạo 1 lần: handler + channel + quyền + danh sách id đã phát.
  // Mọi bước đều nằm trong try/catch: trước 12/11/2026 `ensureNotificationChannel()`
  // ném lỗi native (NPE trên Expo Go) làm cả khối dừng giữa chừng → `ready` không
  // bao giờ bật và thông báo không ra khay. Nay lỗi chỉ được log, phần còn lại vẫn chạy.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        configureNotificationHandler();
        await ensureNotificationChannel();
        await ensureNotificationPermission();
        try {
          const raw = await AsyncStorage.getItem(SEEN_KEY);
          if (raw) seen.current = new Set(JSON.parse(raw) as string[]);
        } catch {
          // Dữ liệu hỏng → coi như chưa từng phát.
        }
      } catch (error) {
        console.warn('[notifications] khởi tạo thông báo lỗi:', error);
      } finally {
        if (!cancelled) ready.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    // Người dùng tắt "push" trong tuỳ chọn thông báo → không đẩy ra khay.
    if (preferences && !preferences.pushEnabled) return;

    const unread = notifications.filter((item) => !item.isRead);
    void setTrayBadge(unread.length);

    const baseline = baselineAt.current;
    const fresh = unread
      .filter((item) => !seen.current.has(item.id))
      // Bỏ qua thông báo có sẵn từ trước khi mở app để không dội một loạt.
      .filter((item) => item.createdAt >= baseline)
      .slice()
      .reverse(); // cũ → mới để thứ tự trong khay tự nhiên
    if (fresh.length === 0) return;

    void (async () => {
      for (const item of fresh) {
        await presentInTray({ id: item.id, title: item.title, body: item.body });
        seen.current.add(item.id);
      }
      const trimmed = Array.from(seen.current).slice(-MAX_SEEN);
      seen.current = new Set(trimmed);
      try {
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
      } catch {
        // Không lưu được thì lần sau có thể phát lại — chấp nhận được.
      }
    })();
  }, [notifications, preferences]);

  return null;
}
