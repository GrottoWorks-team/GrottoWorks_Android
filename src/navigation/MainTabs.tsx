// Tab bar chính của TNV (5 tab, Trang chủ ở giữa):
// Nhiệm vụ · Chấm công · Trang chủ · Thông báo · Hồ sơ.
// Dùng Ionicons (@expo/vector-icons) — icon vector đổi màu theo trạng thái focus.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../features/volunteer/HomeScreen';
import { TimesheetScreen } from '../features/volunteer/TimesheetScreen';
import { NotificationsScreen } from '../features/volunteer/NotificationsScreen';
import { TasksNavigator } from './TasksNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { colors } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Icon outline khi chưa chọn, icon đặc khi đang chọn — tương ứng từng tab.
const icons: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Tasks: { active: 'clipboard', inactive: 'clipboard-outline' },
  Timesheets: { active: 'time', inactive: 'time-outline' },
  Home: { active: 'home', inactive: 'home-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.hairline },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            name={focused ? icons[route.name].active : icons[route.name].inactive}
            size={size ?? 24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Tasks" component={TasksNavigator} options={{ title: t('tab.tasks') }} />
      <Tab.Screen
        name="Timesheets"
        component={TimesheetScreen}
        options={{ title: t('tab.timesheets') }}
      />
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('tab.notifications') }}
      />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: t('tab.profile') }} />
    </Tab.Navigator>
  );
}

