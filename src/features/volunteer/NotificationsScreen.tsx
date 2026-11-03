// Thông báo in-app của TNV — BE `GET /notifications` (kèm đánh dấu đã đọc).
// Offline: hiển thị log hoạt động cục bộ từ mock.
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../api/hooks';
import { relTime } from '../../lib/format';
import { colors, spacing } from '../../theme/tokens';

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenHeader title={t('notifications.title')} sub={t('notifications.sub')} />
        {unread > 0 ? (
          <Button
            size="sm"
            variant="outline"
            label={t('notifications.markAll')}
            onPress={() => markAll.mutate()}
            loading={markAll.isPending}
          />
        ) : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={t('notifications.empty')} />}
        renderItem={({ item }) => (
          <Card
            style={[styles.row, item.isRead ? null : styles.unread]}
            onPress={item.isRead ? undefined : () => markRead.mutate(item.id)}
          >
            <AppText variant="h2">{item.title}</AppText>
            <AppText variant="body">{item.body}</AppText>
            <AppText variant="sub" color={colors.faint}>
              {relTime(item.createdAt, t)}
              {item.isRead ? '' : ` · ${t('notifications.unreadTag')}`}
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
  unread: { borderLeftWidth: 3, borderLeftColor: colors.pine },
});
