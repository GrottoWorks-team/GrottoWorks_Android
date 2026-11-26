// Thông báo in-app của TNV — BE `GET /notifications` (kèm đánh dấu đã đọc).
// M-07: rỗng → trạng thái rỗng có gợi ý; lỗi → thử lại; mở đúng việc liên quan.
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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
import type { MainTabParamList } from '../../navigation/types';
import type { NotificationItem } from '../../types';

type Nav = BottomTabNavigationProp<MainTabParamList>;

export function NotificationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { data: notifications = [], isPending, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = notifications.filter((n) => !n.isRead).length;

  // Mở đúng việc liên quan (BE trả referenceType/referenceId).
  const openTarget = (item: NotificationItem) => {
    if (item.referenceType === 'task' && item.referenceId) {
      navigation.navigate('Tasks', {
        screen: 'TaskDetail',
        params: { taskId: item.referenceId },
      });
    }
  };

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
        ListEmptyComponent={
          isError ? (
            <EmptyState
              text={t('notifications.loadError')}
              actionLabel={t('common.retry')}
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              text={isPending ? t('common.loading') : t('notifications.empty')}
              hint={isPending ? undefined : t('notifications.emptyHint')}
            />
          )
        }
        renderItem={({ item }) => (
          <Card
            style={[styles.row, item.isRead ? null : styles.unread]}
            onPress={() => {
              if (!item.isRead) markRead.mutate(item.id);
              openTarget(item);
            }}
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
