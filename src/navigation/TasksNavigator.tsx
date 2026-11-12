// Stack cho tab Nhiệm vụ: danh sách (2 sub-tab) → chi tiết việc của mình
// hoặc chi tiết việc đang tuyển (để gửi đăng ký).
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { TaskListScreen } from '../features/volunteer/TaskListScreen';
import { TaskDetailScreen } from '../features/volunteer/TaskDetailScreen';
import { OpenTaskDetailScreen } from '../features/volunteer/OpenTaskDetailScreen';
import { TaskModelScreen } from '../features/volunteer/TaskModelScreen';
import { HeaderBack } from './HeaderBack';
import { colors } from '../theme/tokens';
import type { TasksStackParamList } from './types';

const Stack = createNativeStackNavigator<TasksStackParamList>();

// Màn chi tiết có thể là màn ĐẦU của stack (mở từ tab Trang chủ) → native-stack sẽ ẩn
// nút back mặc định. Dùng `headerLeft` riêng để luôn có lối quay lại.
const DETAIL_OPTIONS = {
  headerLeft: () => <HeaderBack />,
};

export function TasksNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.ink,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ ...DETAIL_OPTIONS, title: t('tasks.detail') }}
      />
      <Stack.Screen
        name="OpenDetail"
        component={OpenTaskDetailScreen}
        options={{ ...DETAIL_OPTIONS, title: t('open.detail') }}
      />
      <Stack.Screen
        name="TaskModel"
        component={TaskModelScreen}
        options={{ title: t('tasks.model3dTitle') }}
      />
    </Stack.Navigator>
  );
}
