// Hồ sơ TNV — CHẾ ĐỘ XEM (read-only). Chỉnh sửa nằm ở ProfileEditScreen.
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useAuth } from '../../../auth/AuthContext';
import { useMyTimesheets } from '../../../api/hooks';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { ProfileStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileViewScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<Nav>();
  const volunteerId = user?.id ?? '';
  const { data: timesheets = [] } = useMyTimesheets(volunteerId);

  if (!user) return null;

  const totalHours = Math.round(timesheets.reduce((s, ts) => s + ts.hours, 0) * 10) / 10;
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    (Constants.expoConfig?.android?.versionCode ??
      Constants.expoConfig?.ios?.buildNumber ??
      '—') as string | number;

  const confirmSignOut = () =>
    Alert.alert(t('common.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('profile.title')} sub={t('app.role.volunteer')} />

        {/* Thẻ nhận diện: avatar + tên + email */}
        <Card style={[styles.card, styles.idCard]}>
          <Avatar name={user.name} hue={user.avatarHue} size={84} />
          <AppText variant="h1" style={styles.center}>
            {user.name}
          </AppText>
          <AppText variant="sub" style={styles.center}>
            {user.email}
          </AppText>
          <View style={styles.stats}>
            <Stat label={t('profile.points')} value={String(user.points)} />
            <Stat label={t('profile.hours')} value={`${totalHours}${t('tasks.hours')}`} />
          </View>
          <Button
            label={t('profile.edit')}
            variant="outline"
            onPress={() => navigation.navigate('ProfileEdit')}
            style={styles.editBtn}
          />
        </Card>

        {/* Kỹ năng (chỉ xem) */}
        <Card style={styles.card}>
          <AppText variant="label">{t('profile.skills')}</AppText>
          {user.skills.length ? (
            <View style={styles.chips}>
              {user.skills.map((s) => (
                <View key={s} style={[styles.chip, styles.chipOn]}>
                  <AppText variant="sub" color="#FFFFFF">
                    {s}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="sub">{t('profile.noSkills')}</AppText>
          )}
        </Card>

        {/* Lịch rảnh (chỉ xem) */}
        <Card style={styles.card}>
          <AppText variant="label">{t('profile.availability')}</AppText>
          <View style={styles.chips}>
            {(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const).map((d) => {
              const on = (user.availability ?? []).includes(d);
              return (
                <View key={d} style={[styles.day, on ? styles.dayOn : null]}>
                  <AppText variant="h2" color={on ? '#FFFFFF' : colors.faint}>
                    {d}
                  </AppText>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Phiên bản ứng dụng */}
        <Card style={styles.card}>
          <AppText variant="label">{t('profile.about')}</AppText>
          <InfoRow label={t('profile.version')} value={String(version)} />
          <InfoRow label={t('profile.build')} value={String(build)} />
          <InfoRow label={t('profile.parish')} value={t('app.parish')} />
        </Card>

        <Button label={t('common.logout')} variant="outline" onPress={confirmSignOut} />
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h1">{value}</AppText>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="sub">{label}</AppText>
      <AppText variant="h2">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  idCard: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  editBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.panel,
  },
  chipOn: { backgroundColor: colors.pine, borderColor: colors.pine },
  day: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  dayOn: { backgroundColor: colors.pine, borderColor: colors.pine },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
