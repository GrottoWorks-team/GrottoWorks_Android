// Hồ sơ TNV — CHẾ ĐỘ CHỈNH SỬA (mở từ ProfileViewScreen). Sửa kỹ năng & lịch rảnh.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../auth/AuthContext';
import { useUpdateProfile } from '../../../api/hooks';
import { SKILLS, WEEKDAYS } from '../../../types';
import type { Weekday } from '../../../types';
import { colors, radius, spacing } from '../../../theme/tokens';

export function ProfileEditScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const volunteerId = user?.id ?? '';
  const update = useUpdateProfile(volunteerId);

  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [availability, setAvailability] = useState<Weekday[]>(user?.availability ?? []);

  if (!user) return null;

  const toggleSkill = (s: string) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleDay = (d: Weekday) =>
    setAvailability((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = async () => {
    const updated = await update.mutateAsync({ skills, availability });
    setUser({ ...user, ...updated });
    toast(t('profile.saved'));
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('profile.edit')} sub={t('profile.editHint')} />

        <Card style={[styles.card, styles.idCard]}>
          <Avatar name={user.name} hue={user.avatarHue} size={64} />
          <AppText variant="h2" style={styles.center}>
            {user.name}
          </AppText>
          <AppText variant="sub" style={styles.center}>
            {user.email}
          </AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.skills')}</AppText>
          <AppText variant="sub">{t('profile.skillsHint')}</AppText>
          <View style={styles.chips}>
            {SKILLS.map((s) => {
              const on = skills.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleSkill(s)}
                  style={[styles.chip, on ? styles.chipOn : null]}
                >
                  <AppText variant="sub" color={on ? '#FFFFFF' : colors.ink}>
                    {s}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.availability')}</AppText>
          <AppText variant="sub">{t('profile.availabilityHint')}</AppText>
          <View style={styles.chips}>
            {WEEKDAYS.map((d) => {
              const on = availability.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[styles.day, on ? styles.dayOn : null]}
                >
                  <AppText variant="h2" color={on ? '#FFFFFF' : colors.ink}>
                    {d}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Button label={t('common.save')} onPress={save} loading={update.isPending} />
        <Button label={t('common.cancel')} variant="outline" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  idCard: { alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
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
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  dayOn: { backgroundColor: colors.pine, borderColor: colors.pine },
});
