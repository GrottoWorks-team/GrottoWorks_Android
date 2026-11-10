// Cài đặt nhận thông báo của TNV.
//
// BE đã có sẵn (NotificationAudit):
//   GET /api/v1/users/me/notification-preferences   (mọi role)
//   PUT /api/v1/users/me/notification-preferences   (gửi nguyên trạng thái 3 cờ)
// Trước đây mobile chưa dùng 2 endpoint này → thêm màn này để bổ sung.
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useToast } from '../../../components/Toast';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../../api/hooks';
import { colors, spacing } from '../../../theme/tokens';

type Prefs = { inAppEnabled: boolean; pushEnabled: boolean; emailEnabled: boolean };

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isPending } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  // Giá trị gốc từ BE + các thay đổi chưa lưu (không setState trong effect).
  const [draft, setDraft] = useState<Partial<Prefs>>({});
  const form: Prefs = {
    inAppEnabled: draft.inAppEnabled ?? data?.inAppEnabled ?? true,
    pushEnabled: draft.pushEnabled ?? data?.pushEnabled ?? true,
    emailEnabled: draft.emailEnabled ?? data?.emailEnabled ?? false,
  };
  const setFlag = (key: keyof Prefs, value: boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const rows: { key: keyof Prefs; label: string; hint: string }[] = [
    { key: 'inAppEnabled', label: t('notifications.prefInApp'), hint: t('notifications.prefInAppHint') },
    { key: 'pushEnabled', label: t('notifications.prefPush'), hint: t('notifications.prefPushHint') },
    { key: 'emailEnabled', label: t('notifications.prefEmail'), hint: t('notifications.prefEmailHint') },
  ];

  const save = async () => {
    try {
      await update.mutateAsync(form);
      setDraft({});
      toast(t('notifications.prefsSaved'));
    } catch {
      toast(t('common.error'), 'alert');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {isPending ? (
          <AppText variant="sub">{t('common.loading')}</AppText>
        ) : (
          <Card style={styles.card}>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View style={styles.rowText}>
                  <AppText variant="body">{row.label}</AppText>
                  <AppText variant="sub">{row.hint}</AppText>
                </View>
                <Switch
                  value={form[row.key]}
                  onValueChange={(next) => setFlag(row.key, next)}
                  trackColor={{ false: colors.hairline, true: colors.pine }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </Card>
        )}

        <Button
          label={t('common.save')}
          onPress={save}
          loading={update.isPending}
          disabled={isPending}
        />
        <AppText variant="sub" style={styles.note}>
          {t('notifications.prefsHint')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  note: { textAlign: 'center' },
});
