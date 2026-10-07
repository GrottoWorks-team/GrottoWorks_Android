// Stack cho tab Hồ sơ: xem → chỉnh sửa.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ProfileViewScreen } from '../features/volunteer/profile/ProfileViewScreen';
import { ProfileEditScreen } from '../features/volunteer/profile/ProfileEditScreen';
import { colors } from '../theme/tokens';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
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
      <Stack.Screen
        name="ProfileView"
        component={ProfileViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: t('profile.edit') }}
      />
    </Stack.Navigator>
  );
}
