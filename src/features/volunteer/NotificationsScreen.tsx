// Thông báo — danh sách hoạt động liên quan tới TNV.
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useActivity } from '../../api/hooks';
import { relTime } from '../../lib/format';
import { colors, spacing } from '../../theme/tokens';

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { data: logs = [] } = useActivity();

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenHeader title={t('notifications.title')} sub={t('notifications.sub')} />
      </View>
      <FlatList
        data={logs}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={t('notifications.empty')} />}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <AppText variant="body">
              <AppText variant="h2">{item.actor}</AppText> {item.action}
            </AppText>
            <AppText variant="sub" color={colors.faint}>
              {relTime(item.at, t)}
            </AppText>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.xs },
});
