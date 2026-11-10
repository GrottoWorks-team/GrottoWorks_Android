// Stack cho tab Hồ sơ: xem → chỉnh sửa / đóng góp / quyên góp / cho mượn.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ProfileViewScreen } from '../features/volunteer/profile/ProfileViewScreen';
import { ProfileEditScreen } from '../features/volunteer/profile/ProfileEditScreen';
import { MyContributionsScreen } from '../features/volunteer/profile/MyContributionsScreen';
import { PledgeScreen } from '../features/volunteer/profile/PledgeScreen';
import { LoanOfferScreen } from '../features/volunteer/profile/LoanOfferScreen';
import { NotificationSettingsScreen } from '../features/volunteer/profile/NotificationSettingsScreen';
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
      <Stack.Screen
        name="MyContributions"
        component={MyContributionsScreen}
        options={{ title: t('contrib.title') }}
      />
      <Stack.Screen
        name="Pledge"
        component={PledgeScreen}
        options={{ title: t('pledge.title') }}
      />
      <Stack.Screen
        name="LoanOffer"
        component={LoanOfferScreen}
        options={{ title: t('loan.title') }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: t('notifications.prefs') }}
      />
    </Stack.Navigator>
  );
}
