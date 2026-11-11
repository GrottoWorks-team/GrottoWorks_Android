// GrottoWorks Mobile — app tình nguyện viên (Expo + React Navigation + TS).
import './src/lib/i18n'; // khởi tạo i18next trước khi render
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/auth/AuthContext';
import { ToastProvider } from './src/components/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationBridge } from './src/notifications/NotificationBridge';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// React Native không có sự kiện `focus` của trình duyệt: nối AppState để React
// Query refetch khi app quay lại foreground (vd. leader vừa duyệt trên web).
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });
    return () => subscription.remove();
  });
}
export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            {/* Thông báo in-app → khay thông báo của điện thoại (khi đã đăng nhập). */}
            <NotificationBridge />
            <StatusBar style="dark" />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

